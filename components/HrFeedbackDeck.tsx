'use client'

import { ReactNode, useEffect, useMemo, useState } from 'react'
import {
  ArrowRight,
  Briefcase,
  CheckCircle,
  ChevronLeft,
  ChevronRight,
  Crown,
  FileText,
  HelpCircle,
  Lock,
  RefreshCw,
  Sparkles,
  SkipForward,
  Target,
  Trophy,
  X,
  Zap,
} from 'lucide-react'
import { getImprovementTipForCriterion, getRootCauseForCriterion, getBundleForRootCause } from '@/lib/practice-bundles'
import GuidedBuilderWorkshop from '@/components/exercises/GuidedBuilderWorkshop'

type WorkshopType = 'professional_story' | 'star_proof' | 'career_alignment' | 'handling_uncertainty' | 'pace_delivery' | 'preparation_curiosity'

function getWorkshopTypeForRepair(repair?: SignalArea | null): WorkshopType | null {
  if (!repair) return null
  const rootCause = getRootCauseForCriterion(repair.criterion || '', repair.practice_focus_id || repair.rootCause)
  const bundle = getBundleForRootCause(rootCause)
  const firstLessonWithWorkshop = bundle.lessons.find((lesson) => lesson.workshop?.type)
  return (firstLessonWithWorkshop?.workshop?.type as WorkshopType) || null
}

function WORKSHOP_INTRO(type: WorkshopType): string {
  switch (type) {
    case 'professional_story':
      return "Let's reshape your background into a clear professional story — present, past, future."
    case 'star_proof':
      return "Let's turn your vague example into one that actually proves something. Build the situation, then put weight on Action and Result."
    case 'career_alignment':
      return "Let's make 'why this role' feel specific and intentional — start with the work, then build fit and timing."
    case 'handling_uncertainty':
      return "Let's practice recovering cleanly. Build a clean Answer, Reason, Example so you don't ramble."
    case 'pace_delivery':
      return "Let's trim filler, tighten the structure, and make the answer easy to follow."
    case 'preparation_curiosity':
      return "Let's turn generic interest into specific, informed questions that show you did the homework."
  }
}

type Evidence = {
  question?: string
  question_id?: string
  excerpt?: string
  timestamp?: string
}

export type SignalArea = {
  criterion?: string
  feedback?: string
  score?: number | string
  rootCause?: string
  score_area?: string
  score_area_id?: string
  practice_focus?: string
  practice_focus_id?: string
  evidence?: Evidence[]
  source_question_ids?: string[]
  rewrite_method?: string
  rewritten_answer?: string
  rewrite_explanation?: string
  original_answer?: string
  mini_workshop?: {
    area?: string
    area_id?: string
    score_area?: string
    score_area_id?: string
    practice_focus?: string
    practice_focus_id?: string
    framework?: string
    diagnosis?: string
    example?: string
    prompt?: string
  }
}

type SignalKind = 'strength' | 'repair'

type SignalCard = SignalArea & {
  kind: SignalKind
  criterion: string
}

type StageKey = 'hr_screen' | 'hiring_manager' | 'culture_fit' | 'final'

const SIX_AREAS_KEY: Record<StageKey, string> = {
  hr_screen: 'hr_screen_six_areas',
  hiring_manager: 'hiring_manager_six_areas',
  culture_fit: 'culture_fit_six_areas',
  final: 'final_round_six_areas',
}

const STAGE_NAME: Record<StageKey, string> = {
  hr_screen: 'HR Screen',
  hiring_manager: 'Hiring Manager',
  culture_fit: 'Culture Fit',
  final: 'Final Round',
}

const NEXT_STAGE: Record<StageKey, StageKey | null> = {
  hr_screen: 'hiring_manager',
  hiring_manager: 'final',
  culture_fit: 'final',
  final: null,
}

interface HrFeedbackDeckProps {
  feedback: any
  currentSessionData?: any
  artifactContent?: ReactNode
  onPrintArtifact?: () => void
  onReportAction?: () => void
  reportButtonLabel?: string
  reportLocked?: boolean
  reportLoading?: boolean
  reportHelpText?: string
  reportHelpSecondaryText?: string
  onRetakeInterview?: () => void
  onUnlockNextStage?: () => void
  onExitToProfile?: () => void
  onPractice?: (repair: SignalArea) => void
  layout?: 'standalone' | 'embedded'
  stageKey?: StageKey
}

type DeckStep =
  | { key: 'outcome'; label: string; type: 'outcome' }
  | { key: 'strengths'; label: string; type: 'strengths' }
  | { key: 'weaknesses'; label: string; type: 'weaknesses' }
  | { key: string; label: string; type: 'workshop'; repairIndex: number; workshopType: WorkshopType | null }
  | { key: 'preview'; label: string; type: 'preview' }
  | { key: 'upgrade'; label: string; type: 'upgrade' }

function asArray<T>(value: any): T[] {
  return Array.isArray(value) ? value : []
}

function parseScore(value: any) {
  if (typeof value === 'number') return value
  if (typeof value === 'string') {
    const parsed = Number.parseFloat(value)
    return Number.isFinite(parsed) ? parsed : 0
  }
  return 0
}

function toDisplayText(value: any, fallback = ''): string {
  if (value == null) return fallback
  if (typeof value === 'string') return value
  if (typeof value === 'number' || typeof value === 'boolean') return String(value)
  if (Array.isArray(value)) {
    const text = value.map((item) => toDisplayText(item)).filter(Boolean).join(', ')
    return text || fallback
  }
  if (typeof value === 'object') {
    const preferred =
      value.title ||
      value.label ||
      value.question ||
      value.text ||
      value.description ||
      value.summary ||
      value.name ||
      value.area ||
      value.focus

    if (preferred) return toDisplayText(preferred, fallback)

    try {
      return JSON.stringify(value)
    } catch {
      return fallback
    }
  }

  return fallback
}

function getSixAreas(feedback: any, stageKey: StageKey = 'hr_screen') {
  const key = SIX_AREAS_KEY[stageKey]
  return feedback?.[key] || feedback?.full_rubric?.[key] || feedback?.hr_screen_six_areas || feedback?.full_rubric?.hr_screen_six_areas || {}
}

function getOverallScore(feedback: any) {
  return parseScore(feedback?.overall_score ?? feedback?.full_rubric?.overall_assessment?.overall_score ?? 0)
}

function getLikelihood(feedback: any, score: number) {
  return feedback?.full_rubric?.overall_assessment?.likelihood_to_advance || feedback?.likelihood || (score >= 6 ? 'likely' : 'unlikely')
}

function getStageContext(currentSessionData: any) {
  const jobText = currentSessionData?.job_description_text || currentSessionData?.user_interview_data?.job_description_text || ''
  const companyMatch = typeof jobText === 'string' ? jobText.match(/^Company:\s*(.+)$/m) : null
  const positionMatch = typeof jobText === 'string' ? jobText.match(/^Position:\s*(.+)$/m) : null

  return {
    role: currentSessionData?.job_title || currentSessionData?.position_title || positionMatch?.[1]?.trim() || 'the role',
    company: currentSessionData?.company_name || companyMatch?.[1]?.trim() || 'this company',
  }
}

function normalizeEvidence(evidence: any): Evidence {
  if (typeof evidence === 'string') return { excerpt: evidence }
  if (!evidence || typeof evidence !== 'object' || Array.isArray(evidence)) return {}

  return {
    question: toDisplayText(evidence.question),
    question_id: toDisplayText(evidence.question_id),
    excerpt: toDisplayText(evidence.excerpt || evidence.text || evidence.answer || evidence.quote),
    timestamp: toDisplayText(evidence.timestamp || evidence.time),
  }
}

function normalizeSignal(area: any, kind: SignalKind): SignalCard {
  const source = area && typeof area === 'object' && !Array.isArray(area) ? area : {}
  const defaultCriterion = kind === 'strength' ? 'Strong Interview Signal' : 'Flagged Issue'
  const scoreArea = toDisplayText(source.score_area || source.scoreArea || source.grading_area || source.mini_workshop?.score_area)
  const practiceFocus = toDisplayText(source.practice_focus || source.practiceFocus || source.mini_workshop?.practice_focus || source.mini_workshop?.area)

  return {
    ...source,
    kind,
    criterion: toDisplayText((kind === 'repair' && scoreArea) || source.criterion || source.title || source.area || area, defaultCriterion),
    feedback: toDisplayText(source.feedback || source.description || source.summary),
    rootCause: toDisplayText(source.rootCause || source.root_cause),
    score_area: scoreArea,
    score_area_id: toDisplayText(source.score_area_id || source.scoreAreaId || source.grading_area_id || source.mini_workshop?.score_area_id),
    practice_focus: practiceFocus,
    practice_focus_id: toDisplayText(source.practice_focus_id || source.practiceFocusId || source.mini_workshop?.practice_focus_id || source.mini_workshop?.area_id),
    evidence: asArray<any>(source.evidence).map(normalizeEvidence),
  }
}

function questionIdsForRepair(source: any) {
  const directIds = asArray<any>(source?.source_question_ids).map((id) => toDisplayText(id)).filter(Boolean)
  const evidenceIds = asArray<any>(source?.evidence).map((item) => toDisplayText(item?.question_id)).filter(Boolean)
  return [...new Set([...directIds, ...evidenceIds])]
}

function buildRepairSignals(sixAreas: any, fullRubric: any) {
  const rawRepairs = asArray<any>(sixAreas.what_needs_improve)
  const hrScoreAreas = asArray<any>(fullRubric?.hr_score_areas)

  if (fullRubric?.grading_mode !== 'v2_question_level' || !hrScoreAreas.length) {
    return rawRepairs.map((area) => normalizeSignal(area, 'repair'))
  }

  const failedScoreAreas = hrScoreAreas.filter((area) => area?.status === 'fail')
  if (!failedScoreAreas.length) {
    return rawRepairs.map((area) => normalizeSignal(area, 'repair'))
  }

  const failedQuestionIdsByArea = new Map<string, string[]>()
  for (const evaluation of asArray<any>(fullRubric?.question_evaluations)) {
    if (evaluation?.vote !== 'fail' || !evaluation?.hr_area) continue
    const existing = failedQuestionIdsByArea.get(evaluation.hr_area) || []
    failedQuestionIdsByArea.set(evaluation.hr_area, [...existing, toDisplayText(evaluation.question_id)])
  }

  return failedScoreAreas.map((scoreArea, index) => {
    const areaId = toDisplayText(scoreArea.id)
    const areaLabel = toDisplayText(scoreArea.label || scoreArea.score_area || scoreArea.id, 'Flagged Issue')
    const failedQuestionIds = new Set(failedQuestionIdsByArea.get(areaId) || [])
    const matchedRepair =
      rawRepairs.find((repair) => toDisplayText(repair.score_area_id || repair.mini_workshop?.score_area_id) === areaId) ||
      rawRepairs.find((repair) => toDisplayText(repair.score_area || repair.mini_workshop?.score_area) === areaLabel) ||
      rawRepairs.find((repair) => questionIdsForRepair(repair).some((id) => failedQuestionIds.has(id))) ||
      rawRepairs[index] ||
      {}

    return normalizeSignal({
      ...matchedRepair,
      criterion: areaLabel,
      score_area: areaLabel,
      score_area_id: areaId,
      feedback: toDisplayText(matchedRepair.feedback, toDisplayText(scoreArea.feedback)),
      evidence: asArray<any>(matchedRepair.evidence).length ? matchedRepair.evidence : scoreArea.evidence,
      practice_focus: matchedRepair.practice_focus || matchedRepair.mini_workshop?.practice_focus || matchedRepair.mini_workshop?.area || matchedRepair.criterion,
      practice_focus_id: matchedRepair.practice_focus_id || matchedRepair.mini_workshop?.practice_focus_id || matchedRepair.mini_workshop?.area_id || matchedRepair.rootCause,
    }, 'repair')
  })
}

function getPrimaryEvidence(area?: SignalArea | null) {
  return asArray<Evidence>(area?.evidence)[0]
}

const QUESTION_PATTERNS_BY_WORKSHOP: Record<WorkshopType, RegExp[]> = {
  professional_story: [/tell me about yourself/i, /walk me through.*(background|experience|resume)/i, /your (background|story)/i],
  star_proof: [/tell me about a time/i, /give me an example/i, /describe a time/i, /walk me through.*(time|when|how you)/i, /significant (challenge|accomplishment)/i],
  career_alignment: [/why (this|are you interested|do you want).*(role|company|position|here|us)/i, /what draws you/i, /what (interests|attracted) you/i],
  preparation_curiosity: [/what do you know about (us|the company)/i, /(any|do you have).*questions/i, /what (research|interests you) about/i],
  handling_uncertainty: [],
  pace_delivery: [],
}

function getEvidenceForWorkshop(area: SignalArea | null | undefined, workshopType: WorkshopType | null): Evidence | undefined {
  const list = asArray<Evidence>(area?.evidence)
  if (!list.length) return undefined
  if (!workshopType) return list[0]
  const patterns = QUESTION_PATTERNS_BY_WORKSHOP[workshopType]
  if (patterns?.length) {
    const matched = list.find((ev) => patterns.some((p) => p.test(ev?.question || '')))
    if (matched) return matched
  }
  return list[0]
}

function truncate(value: string | undefined, max = 150) {
  const text = toDisplayText(value)
  if (!text) return ''
  if (text.length <= max) return text
  return `${text.slice(0, max).trim()}...`
}


function getScoreTone(score?: number | string) {
  const numeric = parseScore(score)
  if (numeric >= 7) return 'border-accent-200 bg-accent-50 text-accent-700'
  if (numeric >= 5) return 'border-amber-200 bg-amber-50 text-amber-700'
  return 'border-rose-200 bg-rose-50 text-rose-700'
}

function getVerdictCopy(likelihood: string, score: number) {
  if (likelihood === 'likely' || score >= 7) {
    return {
      title: 'You passed the HR vibe check.',
      body: 'Now the next round will ask for proof. Your best move is to carry the strongest signals forward and repair every answer pattern that would make a hiring manager hesitate.',
      badge: 'Ready with polish',
    }
  }

  if (score >= 5) {
    return {
      title: 'You are close, not finished.',
      body: 'The foundation is there, but the flagged signals are still too fuzzy. Each one gets its own repair plan before the hiring manager round.',
      badge: 'Almost there',
    }
  }

  return {
    title: 'This needs repair before round two.',
    body: 'Good news: the problem is specific. We can show exactly where the answer lost trust, what to change, and what the next interviewer will test.',
    badge: 'Repair first',
  }
}

function scoreLabel(score: number) {
  if (score >= 8) return 'Strong'
  if (score >= 6) return 'Passing'
  if (score >= 4) return 'Repairable'
  return 'Risky'
}

function StepShell({
  eyebrow,
  title,
  body,
  children,
  preppiMessage,
  compact = false,
}: {
  eyebrow: string
  title: string
  body?: string
  children: ReactNode
  preppiMessage?: string
  compact?: boolean
}) {
  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="shrink-0">
        <p className="text-xs font-semibold uppercase tracking-wider text-accent-600">{eyebrow}</p>
        <h1 className={`mt-1.5 font-bold leading-tight tracking-tight text-slate-900 ${compact ? 'text-xl' : 'text-2xl sm:text-3xl'}`}>{title}</h1>
        {body && !compact && <p className="mt-2 text-sm leading-relaxed text-slate-500">{body}</p>}
      </div>
      <div className="mt-5 min-h-0 flex-1 overflow-hidden">{children}</div>
    </div>
  )
}

function ScoreOrb({ score }: { score: number }) {
  const percentage = Math.max(0, Math.min(score * 10, 100))

  return (
    <div className="relative flex h-28 w-28 shrink-0 items-center justify-center rounded-full bg-white shadow-[inset_0_0_0_10px_rgba(226,232,240,0.9)] 2xl:h-36 2xl:w-36 2xl:shadow-[inset_0_0_0_12px_rgba(226,232,240,0.9)]">
      <div
        className="absolute inset-0 rounded-full"
        style={{ background: `conic-gradient(#2563eb ${percentage}%, transparent ${percentage}% 100%)` }}
      />
      <div className="relative flex h-[5.4rem] w-[5.4rem] flex-col items-center justify-center rounded-full bg-white 2xl:h-[7.2rem] 2xl:w-[7.2rem]">
        <span className="text-3xl font-bold text-slate-950 2xl:text-4xl">{Number.isFinite(score) ? score.toFixed(score % 1 ? 1 : 0) : '-'}</span>
        <span className="text-xs font-bold uppercase tracking-[0.2em] text-slate-400">out of 10</span>
      </div>
    </div>
  )
}

function SignalEvidence({ area }: { area?: SignalArea | null }) {
  const evidence = getPrimaryEvidence(area)

  if (!evidence?.excerpt && !evidence?.question) {
    return (
      <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
        <p className="text-xs font-bold uppercase tracking-[0.2em] text-slate-400">Evidence</p>
        <p className="mt-2 text-sm font-semibold leading-6 text-slate-600">No transcript excerpt was attached to this signal.</p>
      </div>
    )
  }

  return (
    <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 sm:p-4">
      <div className="flex items-center justify-between gap-3">
        <p className="text-xs font-bold uppercase tracking-[0.2em] text-slate-400">Transcript Proof</p>
        {evidence.timestamp && <span className="rounded-full bg-white px-2 py-1 text-xs font-bold text-slate-500">{evidence.timestamp}</span>}
      </div>
      {evidence.question && <p className="mt-2 line-clamp-1 text-sm font-bold text-slate-900 sm:mt-3 sm:line-clamp-none">{toDisplayText(evidence.question)}</p>}
      {evidence.excerpt && <p className="mt-2 line-clamp-2 text-sm font-semibold leading-6 text-slate-600 sm:line-clamp-none">"{truncate(evidence.excerpt, 230)}"</p>}
    </div>
  )
}

function SignalSummaryCard({ area, kind }: { area?: SignalArea | null; kind: SignalKind }) {
  if (!area) {
    return (
      <div className="flex h-full min-h-[20rem] items-center justify-center rounded-2xl border border-dashed border-slate-200 bg-slate-50 p-6 text-center">
        <p className="text-sm font-bold leading-6 text-slate-500">No {kind === 'strength' ? 'strength' : 'repair'} signal was found in this report.</p>
      </div>
    )
  }

  const criterion = toDisplayText(area.criterion, kind === 'strength' ? 'Strong Interview Signal' : 'Priority Repair')
  const practiceFocus = toDisplayText(area.practice_focus || area.mini_workshop?.practice_focus || area.mini_workshop?.area)
  const rootCause = getRootCauseForCriterion(criterion, area.rootCause)
  const tip = getImprovementTipForCriterion(criterion, rootCause)
  const score = parseScore(area.score)
  const feedbackText = toDisplayText(area.feedback, 'Feedback details were not available for this signal.')
  const evidence = getPrimaryEvidence(area)

  return (
    <div className={kind === 'repair'
      ? 'grid h-full min-h-0 grid-rows-[auto_minmax(8.5rem,1fr)] gap-3 overflow-y-auto pr-1 lg:pr-0'
      : 'flex h-full min-h-0 flex-col gap-3 overflow-y-auto pr-1 lg:gap-4 lg:overflow-hidden lg:pr-0'
    }>
      <div className="min-h-0 overflow-hidden rounded-2xl border border-slate-200 bg-white p-3 sm:p-4">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.2em] text-slate-400">{kind === 'strength' ? 'Repeat This' : 'Flagged Issue'}</p>
            <h2 className="mt-2 line-clamp-2 text-lg font-bold leading-tight text-slate-950 sm:text-xl 2xl:text-2xl">{criterion}</h2>
            {kind === 'repair' && practiceFocus && (
              <p className="mt-1 text-xs font-bold uppercase tracking-[0.16em] text-accent-700">Practice focus: {practiceFocus}</p>
            )}
          </div>
          {score > 0 && (
            <span className={`rounded-full border px-3 py-1 text-sm font-bold ${getScoreTone(score)}`}>
              {score.toFixed(score % 1 ? 1 : 0)}/10
            </span>
          )}
        </div>
        <p className={`mt-3 text-sm font-semibold leading-6 text-slate-600 sm:mt-4 ${kind === 'repair' ? 'line-clamp-1' : 'line-clamp-2 sm:line-clamp-3 2xl:line-clamp-none'}`}>{feedbackText}</p>
        {kind === 'repair' && (evidence?.excerpt || evidence?.question) && (
          <p className="mt-2 line-clamp-2 rounded-2xl bg-slate-50 px-3 py-2 text-xs font-bold leading-5 text-slate-600">
            <span className="font-bold uppercase tracking-[0.16em] text-slate-400">Proof: </span>
            {truncate(evidence.excerpt || evidence.question, 150)}
          </p>
        )}
      </div>

      {kind === 'strength' && <SignalEvidence area={area} />}

      {kind === 'repair' && (
        <div className="min-h-0 flex-1 overflow-hidden rounded-2xl border border-amber-200 bg-amber-50 p-3 sm:p-4">
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-amber-700">Coach Move</p>
          <h3 className="mt-2 line-clamp-1 text-base font-bold text-slate-950 sm:text-lg">{tip.title}</h3>
          <p className="mt-1 line-clamp-1 text-sm font-semibold leading-6 text-slate-700 sm:mt-2 sm:line-clamp-3">{tip.summary}</p>
          <div className="mt-3 hidden gap-2 2xl:grid">
            {(tip.bullets.length ? tip.bullets : ['Name the situation briefly.', 'Show the action you owned.', 'End with the result.']).slice(0, 3).map((item) => (
              <div key={item} className="flex gap-2 rounded-2xl bg-white/80 p-2 text-xs font-bold leading-5 text-slate-700">
                <CheckCircle className="mt-0.5 h-4 w-4 shrink-0 text-accent-600" />
                <span className="line-clamp-2">{item}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

function RepairLessonSlide({
  repair,
  issueNumber,
  totalIssues,
  onPractice,
}: {
  repair?: SignalArea | null
  issueNumber: number
  totalIssues: number
  onPractice?: (repair: SignalArea) => void
}) {
  const [showStronger, setShowStronger] = useState(false)

  if (!repair) {
    return (
      <div className="flex h-full min-h-[24rem] items-center justify-center rounded-2xl border border-dashed border-slate-200 bg-white p-6 text-center shadow-sm">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.22em] text-accent-700">No Weak Signals</p>
          <h1 className="mt-2 text-2xl font-bold text-slate-950">No flagged issues were attached to this HR report.</h1>
          <p className="mt-3 text-sm font-semibold leading-6 text-slate-600">If this is a real session, open the Coach File to confirm the full rubric details.</p>
        </div>
      </div>
    )
  }

  const criterion = toDisplayText(repair.criterion, 'Priority Repair')
  const miniWorkshop = repair.mini_workshop
  const practiceFocus = toDisplayText(repair.practice_focus || miniWorkshop?.practice_focus || miniWorkshop?.area)
  const score = parseScore(repair.score)
  const feedbackText = toDisplayText(repair.feedback, 'This answer did not create enough interviewer confidence for the next round.')
  const evidence = getPrimaryEvidence(repair)
  const questionText = toDisplayText(evidence?.question)
  const proofText = toDisplayText(evidence?.excerpt)
  const rewrittenAnswer = toDisplayText(repair.rewritten_answer)
  const rewriteExplanation = toDisplayText(repair.rewrite_explanation)
  const rewriteMethod = toDisplayText(repair.rewrite_method)
  const originalAnswer = toDisplayText(repair.original_answer)
  const diagnosis = toDisplayText(miniWorkshop?.diagnosis)
  const rootCause = getRootCauseForCriterion(criterion, repair.practice_focus_id || repair.rootCause)
  const tip = getImprovementTipForCriterion(criterion, rootCause)

  const hasRewrite = !!rewrittenAnswer
  const displayOriginal = originalAnswer || proofText

  return (
    <div className="flex h-full min-h-0 flex-col gap-3 overflow-hidden rounded-2xl border border-slate-200 bg-white p-3 shadow-sm lg:p-4">
      {/* Header */}
      <div className="shrink-0">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="text-[11px] font-bold uppercase tracking-[0.22em] text-accent-700">Issue {issueNumber} of {totalIssues}</p>
            <h1 className="mt-1 text-lg font-bold leading-tight text-slate-950 lg:text-xl">{criterion}</h1>
          </div>
          {score > 0 && (
            <span className={`rounded-full border px-3 py-1 text-sm font-bold ${getScoreTone(score)}`}>
              {score.toFixed(score % 1 ? 1 : 0)}/10
            </span>
          )}
        </div>
      </div>

      {/* Scrollable content */}
      <div className="min-h-0 flex-1 overflow-y-auto space-y-3 pr-1">
        {/* Why flagged */}
        <div className="rounded-xl border border-rose-100 bg-rose-50/70 p-3">
          <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-rose-600">Why This Was Flagged</p>
          <p className="mt-1.5 text-sm font-semibold leading-6 text-slate-800">{feedbackText}</p>
        </div>

        {/* What the interviewer heard */}
        {(questionText || proofText) && (
          <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
            <div className="flex items-center justify-between gap-3">
              <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-slate-500">What The Interviewer Heard</p>
              {evidence?.timestamp && <span className="rounded-full bg-white px-2 py-1 text-[11px] font-bold text-slate-500">{evidence.timestamp}</span>}
            </div>
            {questionText && <p className="mt-2 text-sm font-bold text-slate-900">{questionText}</p>}
            {proofText && <p className="mt-1.5 text-sm font-semibold leading-6 text-slate-600">&ldquo;{proofText}&rdquo;</p>}
          </div>
        )}

        {/* Stronger version comparison */}
        {hasRewrite && (
          <div className="rounded-xl border border-emerald-200 bg-emerald-50/70 p-3">
            <button
              type="button"
              onClick={() => setShowStronger(!showStronger)}
              className="flex w-full items-center justify-between gap-2"
            >
              <div className="flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-emerald-600" />
                <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-emerald-700">
                  {showStronger ? 'Stronger Version' : 'See A Stronger Version'}
                </p>
              </div>
              <ChevronRight className={`h-4 w-4 text-emerald-600 transition-transform ${showStronger ? 'rotate-90' : ''}`} />
            </button>
            {showStronger && (
              <div className="mt-3 space-y-3 animate-slide-up">
                {rewriteMethod && (
                  <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-emerald-700">Method: {rewriteMethod}</p>
                )}
                {displayOriginal && (
                  <div className="rounded-lg bg-white/60 p-2.5">
                    <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-slate-400">Your version</p>
                    <p className="mt-1 text-xs font-semibold leading-5 text-slate-600 line-through decoration-rose-300">{truncate(displayOriginal, 300)}</p>
                  </div>
                )}
                <div className="rounded-lg bg-white p-2.5 shadow-sm">
                  <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-emerald-600">Rewritten</p>
                  <p className="mt-1 text-sm font-semibold leading-6 text-slate-900">{rewrittenAnswer}</p>
                </div>
                {rewriteExplanation && (
                  <p className="text-xs font-semibold leading-5 text-emerald-800">{rewriteExplanation}</p>
                )}
              </div>
            )}
          </div>
        )}

        {/* Coach diagnosis — only show when no rewrite available */}
        {!hasRewrite && (diagnosis || tip.summary) && (
          <div className="rounded-xl border border-accent-200 bg-accent-50/70 p-3">
            <div className="flex items-center gap-2">
              <Zap className="h-4 w-4 text-accent-700" />
              <p className="text-[11px] font-bold uppercase tracking-[0.22em] text-accent-700">Coach Note</p>
            </div>
            <p className="mt-2 text-sm font-semibold leading-6 text-slate-800">{diagnosis || tip.summary}</p>
            {tip.bullets.length > 0 && (
              <div className="mt-2 space-y-1.5">
                {tip.bullets.slice(0, 3).map((bullet) => (
                  <div key={bullet} className="flex gap-2 text-xs font-semibold leading-5 text-slate-700">
                    <CheckCircle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-accent-600" />
                    <span>{bullet}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* When rewrite IS available, show a compact coach note */}
        {hasRewrite && (diagnosis || tip.summary) && (
          <div className="rounded-xl border border-accent-200 bg-accent-50/70 p-3">
            <div className="flex items-center gap-2">
              <Zap className="h-4 w-4 text-accent-700" />
              <p className="text-[11px] font-bold uppercase tracking-[0.22em] text-accent-700">What To Practice</p>
            </div>
            <p className="mt-1.5 text-sm font-semibold leading-6 text-slate-800">{diagnosis || tip.summary}</p>
          </div>
        )}
      </div>

      {/* Practice CTA */}
      {onPractice && (
        <button
          type="button"
          onClick={() => onPractice(repair)}
          className="shrink-0 flex items-center justify-center gap-2 rounded-xl bg-accent-600 px-4 py-3 text-sm font-bold text-white transition hover:bg-accent-700"
        >
          <Target className="h-4 w-4" />
          Practice This Area
        </button>
      )}
    </div>
  )
}

function WorkshopSlide({
  repair,
  issueNumber,
  totalIssues,
  workshopType,
  sessionId,
  isComplete,
  onWorkshopComplete,
}: {
  repair?: SignalArea | null
  issueNumber: number
  totalIssues: number
  workshopType: WorkshopType | null
  sessionId?: string
  isComplete: boolean
  onWorkshopComplete: () => void
}) {
  const [showContextDrawer, setShowContextDrawer] = useState(false)

  if (!repair) {
    return (
      <div className="flex h-full min-h-[20rem] items-center justify-center rounded-2xl border border-dashed border-slate-200 bg-white p-6 text-center shadow-sm">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.22em] text-accent-700">No Workshops</p>
          <h1 className="mt-2 text-2xl font-bold text-slate-950">No flagged issues to workshop.</h1>
        </div>
      </div>
    )
  }

  const criterion = toDisplayText(repair.criterion, 'Priority Repair')
  const score = parseScore(repair.score)
  const evidence = getEvidenceForWorkshop(repair, workshopType)
  const questionText = toDisplayText(evidence?.question)
  // Only use stored original_answer if the matched evidence is the same as the primary one
  // (otherwise the enriched original_answer was captured against a different question)
  const primaryEvidence = getPrimaryEvidence(repair)
  const storedOriginalAnswerSafe = evidence?.question_id && primaryEvidence?.question_id && evidence.question_id === primaryEvidence.question_id
    ? toDisplayText(repair.original_answer)
    : ''
  const originalAnswerText = storedOriginalAnswerSafe || toDisplayText(evidence?.excerpt)
  const hasContext = !!(questionText || originalAnswerText)

  const renderWorkshop = () => {
    if (!workshopType) {
      return (
        <div className="flex h-full items-center justify-center rounded-2xl border border-dashed border-slate-200 bg-slate-50 p-6 text-center">
          <p className="text-sm font-bold leading-6 text-slate-500">No interactive workshop is wired for this issue yet. Click Continue to move on.</p>
        </div>
      )
    }

    return (
      <GuidedBuilderWorkshop
        workshopType={workshopType}
        sessionId={sessionId}
        originalQuestion={questionText || undefined}
        originalAnswer={originalAnswerText || undefined}
        onComplete={onWorkshopComplete}
      />
    )
  }

  return (
    <div className="relative flex h-full min-h-0 flex-col overflow-hidden">
      {/* Floating context drawer (overlay, no layout cost) */}
      {showContextDrawer && hasContext && (
        <div
          className="absolute inset-0 z-30 flex items-start justify-center bg-slate-950/40 backdrop-blur-sm p-4 animate-slide-up"
          onClick={() => setShowContextDrawer(false)}
        >
          <div
            className="relative mt-12 max-w-xl rounded-2xl border border-slate-200 bg-white p-4 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              type="button"
              onClick={() => setShowContextDrawer(false)}
              className="absolute right-2 top-2 flex h-7 w-7 items-center justify-center rounded-full text-slate-400 hover:bg-slate-100 hover:text-slate-700"
              aria-label="Close"
            >
              <X className="h-4 w-4" />
            </button>
            <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-slate-400">What you said in your interview</p>
            {questionText && <p className="mt-2 text-sm font-bold leading-5 text-slate-900">{questionText}</p>}
            {originalAnswerText && <p className="mt-2 text-sm font-semibold leading-6 text-slate-600">&ldquo;{originalAnswerText}&rdquo;</p>}
          </div>
        </div>
      )}

      {/* Ultra-compact header bar (~32px) */}
      <div className="shrink-0 flex items-center justify-between gap-2 px-1 pb-2">
        <div className="flex items-center gap-2 min-w-0 flex-1">
          <span className="shrink-0 rounded-full bg-accent-100 px-2 py-0.5 text-[10px] font-bold uppercase tracking-[0.16em] text-accent-700">
            {issueNumber}/{totalIssues}
          </span>
          <h2 className="truncate text-sm font-bold leading-tight text-slate-900">{criterion}</h2>
          {isComplete && <CheckCircle className="shrink-0 h-4 w-4 text-emerald-600" />}
        </div>
        <div className="shrink-0 flex items-center gap-1.5">
          {score > 0 && (
            <span className={`hidden sm:inline-flex rounded-full border px-2 py-0.5 text-[11px] font-bold ${getScoreTone(score)}`}>
              {score.toFixed(score % 1 ? 1 : 0)}/10
            </span>
          )}
          {hasContext && (
            <button
              type="button"
              onClick={() => setShowContextDrawer(true)}
              className="flex items-center gap-1 rounded-full border border-slate-200 bg-white px-2 py-0.5 text-[10px] font-bold uppercase tracking-[0.14em] text-slate-600 transition hover:border-slate-300 hover:text-slate-900"
            >
              <FileText className="h-3 w-3" />
              <span className="hidden sm:inline">Your answer</span>
            </button>
          )}
        </div>
      </div>

      {/* Workshop takes ALL remaining space */}
      <div className="min-h-0 flex-1 overflow-hidden">
        {renderWorkshop()}
      </div>
    </div>
  )
}

function StrengthsOverview({ strengths }: { strengths: SignalCard[] }) {
  if (!strengths.length) {
    return (
      <div className="flex h-full min-h-[20rem] items-center justify-center rounded-2xl border border-dashed border-slate-200 bg-slate-50 p-6 text-center">
        <p className="text-sm font-bold leading-6 text-slate-500">No strong-signal details were attached to this report yet.</p>
      </div>
    )
  }

  return (
    <div className="h-full min-h-0 overflow-y-auto pr-1">
      <div className="grid gap-3">
        {strengths.map((strength, index) => {
          const score = parseScore(strength.score)
          const evidence = getPrimaryEvidence(strength)

          return (
            <div key={`${strength.criterion}-${index}`} className="rounded-xl border border-accent-100 bg-accent-50/55 p-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-accent-600">Strong Signal</p>
                  <h3 className="mt-1 text-lg font-bold leading-tight text-slate-950">{strength.criterion}</h3>
                </div>
                {score > 0 && (
                  <span className="rounded-full border border-accent-200 bg-white px-3 py-1 text-sm font-bold text-accent-700">
                    {score.toFixed(score % 1 ? 1 : 0)}/10
                  </span>
                )}
              </div>
              {strength.feedback && <p className="mt-3 line-clamp-2 text-sm font-semibold leading-6 text-slate-700">{strength.feedback}</p>}
              {evidence?.excerpt && (
                <p className="mt-3 rounded-2xl bg-white/80 p-3 text-xs font-bold leading-5 text-slate-600">
                  "{truncate(evidence.excerpt, 150)}"
                </p>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}

function WeaknessesOverview({ repairs }: { repairs: SignalCard[] }) {
  if (!repairs.length) {
    return (
      <div className="flex h-full min-h-[20rem] items-center justify-center rounded-2xl border border-dashed border-slate-200 bg-slate-50 p-6 text-center">
        <p className="text-sm font-bold leading-6 text-slate-500">No weak-signal details were attached to this report yet.</p>
      </div>
    )
  }

  return (
    <div className="h-full min-h-0 overflow-y-auto pr-1">
      <div className="rounded-2xl border border-accent-200 bg-accent-50/60 p-3 mb-3">
        <p className="text-xs font-bold leading-5 text-accent-900">
          We will workshop these one at a time — no reading, no clicking through tips. You will rebuild each answer hands-on.
        </p>
      </div>
      <div className="grid gap-2 sm:grid-cols-2">
        {repairs.map((repair, index) => {
          const score = parseScore(repair.score)
          const workshopType = getWorkshopTypeForRepair(repair)
          return (
            <div key={`${repair.criterion}-${index}`} className="rounded-xl border border-rose-100 bg-white p-3 shadow-sm">
              <div className="flex items-center justify-between gap-1.5">
                <div className="flex items-center gap-1.5">
                  <span className="flex h-5 w-5 items-center justify-center rounded-full bg-rose-100 text-[10px] font-bold text-rose-700">{index + 1}</span>
                  <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-rose-600">Workshop {index + 1}</p>
                </div>
                {score > 0 && <span className="shrink-0 text-[10px] font-bold text-rose-700">{score.toFixed(score % 1 ? 1 : 0)}/10</span>}
              </div>
              <h3 className="mt-1.5 text-sm font-bold leading-tight text-slate-950">{repair.criterion}</h3>
              {workshopType && (
                <div className="mt-2 flex items-center gap-1 text-[10px] font-bold uppercase tracking-[0.14em] text-accent-700">
                  <Sparkles className="h-3 w-3" />
                  {workshopType.replace('_', ' ')}
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}

function MiniStat({ label, value, tone = 'slate' }: { label: string; value: string; tone?: 'brand' | 'amber' | 'slate' }) {
  const classes = {
    brand: 'border-accent-200 bg-accent-50 text-accent-700',
    amber: 'border-amber-200 bg-amber-50 text-amber-700',
    slate: 'border-slate-200 bg-slate-50 text-slate-700',
  }

  return (
    <div className={`rounded-xl border p-3 ${classes[tone]}`}>
      <p className="text-[10px] font-bold uppercase tracking-[0.18em] opacity-70">{label}</p>
      <p className="mt-1 text-lg font-bold">{value}</p>
    </div>
  )
}

function CoachFileModal({
  artifactContent,
  onClose,
  onPrintArtifact,
}: {
  artifactContent?: ReactNode
  onClose: () => void
  onPrintArtifact?: () => void
}) {
  return (
    <div className="coach-file-print-root fixed inset-0 z-50 bg-slate-950/55 p-0 backdrop-blur-sm sm:p-4">
      <style>{`
        @media print {
          body * {
            visibility: hidden !important;
          }

          .coach-file-print-root,
          .coach-file-print-root * {
            visibility: visible !important;
          }

          .coach-file-print-root {
            position: static !important;
            inset: auto !important;
            width: 100% !important;
            height: auto !important;
            overflow: visible !important;
            background: #ffffff !important;
            padding: 0 !important;
            backdrop-filter: none !important;
          }

          .coach-file-print-panel {
            width: 100% !important;
            max-width: none !important;
            height: auto !important;
            overflow: visible !important;
            box-shadow: none !important;
            border-radius: 0 !important;
          }

          .coach-file-print-scroll {
            height: auto !important;
            max-height: none !important;
            overflow: visible !important;
            background: #ffffff !important;
            padding: 0 !important;
          }

          .coach-file-no-print {
            display: none !important;
          }

          @page {
            margin: 0.5in;
          }
        }
      `}</style>
      <div className="coach-file-print-panel mx-auto flex h-full max-w-5xl flex-col overflow-hidden bg-white shadow-2xl sm:rounded-2xl">
        <div className="coach-file-no-print flex items-center justify-between gap-3 border-b border-slate-200 px-4 py-3 sm:px-6">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.22em] text-accent-700">Saved Report</p>
            <h2 className="text-xl font-bold text-slate-950">Detailed Interview Report</h2>
          </div>
          <div className="flex items-center gap-2">
            {onPrintArtifact && (
              <button
                type="button"
                onClick={onPrintArtifact}
                className="hidden rounded-full border border-slate-200 px-4 py-2 text-sm font-bold text-slate-700 transition hover:bg-slate-50 sm:inline-flex"
              >
                Print / Save PDF
              </button>
            )}
            <button
              type="button"
              onClick={onClose}
              className="flex h-10 w-10 items-center justify-center rounded-full bg-slate-100 text-slate-700 transition hover:bg-slate-200"
              aria-label="Close Coach File"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>
        <div className="coach-file-print-scroll min-h-0 flex-1 overflow-y-auto bg-slate-50 p-4 sm:p-6">
          {artifactContent || (
            <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-6 text-center">
              <FileText className="mx-auto h-8 w-8 text-slate-400" />
              <p className="mt-3 text-sm font-bold text-slate-600">The full rubric report is still being prepared for this session.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default function HrFeedbackDeck({
  feedback,
  currentSessionData,
  artifactContent,
  onPrintArtifact,
  onReportAction,
  reportButtonLabel = 'View Report',
  reportLocked = false,
  reportLoading = false,
  reportHelpText,
  reportHelpSecondaryText,
  onRetakeInterview,
  onUnlockNextStage,
  onExitToProfile,
  onPractice,
  layout = 'standalone',
  stageKey = 'hr_screen',
}: HrFeedbackDeckProps) {
  const [step, setStep] = useState(0)
  const [showCoachFile, setShowCoachFile] = useState(false)
  const [completedWorkshops, setCompletedWorkshops] = useState<Set<number>>(new Set())
  const nextStageKey = NEXT_STAGE[stageKey]
  const stageName = STAGE_NAME[stageKey]
  const nextStageName = nextStageKey ? STAGE_NAME[nextStageKey] : null

  const {
    score,
    likelihood,
    verdict,
    strengths,
    repairs,
    nextSteps,
    predictedQuestions,
    studyAreas,
    role,
    company,
  } = useMemo(() => {
    const fullRubric = feedback?.full_rubric || {}
    const sixAreas = getSixAreas(feedback, stageKey)
    const rawStrengths = asArray<any>(sixAreas.what_went_well).map((area) => normalizeSignal(area, 'strength'))
    const rawRepairs = buildRepairSignals(sixAreas, fullRubric)
    const overallScore = getOverallScore(feedback)
    const derivedLikelihood = getLikelihood(feedback, overallScore)
    const context = getStageContext(currentSessionData)
    const nextStepsData = feedback?.next_steps_preparation || fullRubric?.next_steps_preparation || {}
    const sortedRepairs = rawRepairs
    const sortedStrengths = rawStrengths

    return {
      score: overallScore,
      likelihood: derivedLikelihood,
      verdict: getVerdictCopy(derivedLikelihood, overallScore),
      strengths: sortedStrengths,
      repairs: sortedRepairs,
      nextSteps: nextStepsData,
      predictedQuestions: asArray<any>(
        nextStepsData.predicted_next_round_questions ||
        nextStepsData.predicted_hiring_manager_questions
      ).map((item) => toDisplayText(item)).filter(Boolean),
      studyAreas: asArray<any>(nextStepsData.areas_to_study).map((item) => toDisplayText(item)).filter(Boolean),
      role: context.role,
      company: context.company,
    }
  }, [currentSessionData, feedback, stageKey])

  const deckSteps = useMemo<DeckStep[]>(() => {
    const issueSteps = repairs.length
      ? repairs.map((repair, index) => ({
          key: `issue-${index}`,
          label: `Workshop ${index + 1}`,
          type: 'workshop' as const,
          repairIndex: index,
          workshopType: getWorkshopTypeForRepair(repair),
        }))
      : [{ key: 'issue-none', label: 'Workshops', type: 'workshop' as const, repairIndex: 0, workshopType: null }]

    const base: DeckStep[] = [
      { key: 'outcome', label: 'Outcome', type: 'outcome' },
      { key: 'strengths', label: 'Strong', type: 'strengths' },
      { key: 'weaknesses', label: 'Weak', type: 'weaknesses' },
      ...issueSteps,
    ]
    if (nextStageKey) {
      base.push({ key: 'preview', label: 'Next Round', type: 'preview' })
      base.push({ key: 'upgrade', label: 'Unlock', type: 'upgrade' })
    }
    return base
  }, [repairs, nextStageKey])

  useEffect(() => {
    if (step >= deckSteps.length) {
      setStep(Math.max(deckSteps.length - 1, 0))
    }
  }, [deckSteps.length, step])

  const activeStep = deckSteps[Math.min(step, Math.max(deckSteps.length - 1, 0))]
  const progressPercent = ((step + 1) / deckSteps.length) * 100
  const isLastStep = step === deckSteps.length - 1
  const readyForHm = nextSteps?.ready_for_hiring_manager ?? likelihood === 'likely'
  const retakeLabel = `Retake ${stageName.split(' ')[0]}`

  const handleReportClick = () => {
    if (reportLocked) {
      onReportAction?.()
      return
    }
    setShowCoachFile(true)
  }

  const goNext = () => {
    if (isLastStep) {
      if (nextStageKey) {
        onUnlockNextStage?.()
      } else {
        onExitToProfile?.()
      }
      return
    }
    setStep((value) => Math.min(value + 1, deckSteps.length - 1))
  }

  const goBack = () => setStep((value) => Math.max(value - 1, 0))

  const renderStep = () => {
    if (activeStep.type === 'outcome') {
      return (
        <StepShell
          eyebrow={`${stageName} Result`}
          title={verdict.title}
          body={verdict.body}
          preppiMessage="This is the whole point: quick enough to understand, specific enough to trust."
        >
          <div className="flex h-full min-h-0 flex-col justify-between gap-3 overflow-hidden lg:gap-5">
            <div className="flex flex-col items-center gap-4 text-center sm:flex-row sm:text-left">
              <ScoreOrb score={score} />
              <div className="min-w-0">
                <span className="inline-flex rounded-full bg-accent-100 px-3 py-1 text-xs font-bold uppercase tracking-[0.18em] text-accent-700">
                  {verdict.badge}
                </span>
                <h2 className="mt-3 text-2xl font-bold leading-tight text-slate-950 2xl:text-3xl">{scoreLabel(score)} {stageName.toLowerCase()} signal</h2>
                <p className="mt-3 text-sm font-semibold leading-6 text-slate-600">
                  For {role} at {company}, the next interviewer will care less about polish and more about proof.
                </p>
              </div>
            </div>
            <div className="grid grid-cols-3 gap-3">
              <MiniStat label="Strong" value={`${strengths.length || 0}`} tone="brand" />
              <MiniStat label="Issues" value={`${repairs.length || 0}`} tone="amber" />
              <MiniStat label={nextStageName ? `${nextStageName.split(' ')[0]} Ready` : 'Ready'} value={readyForHm ? 'Yes' : 'Soon'} />
            </div>
            <div className="hidden rounded-2xl border border-accent-200 bg-accent-50 p-4 sm:block">
              <div className="flex items-start gap-3">
                <Sparkles className="mt-1 h-5 w-5 shrink-0 text-accent-700" />
                <div>
                  <p className="text-sm font-bold text-slate-950">What this free report gives you</p>
                  <p className="mt-1 text-sm font-semibold leading-6 text-slate-700">
                    The signals to repeat, every flagged issue to repair, and the hiring manager questions likely to come next.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </StepShell>
      )
    }

    if (activeStep.type === 'strengths') {
      return (
        <StepShell
          eyebrow="Strong Signals"
          title="Here is the strong stuff."
          body="These are the signals worth repeating in the next round. Keep the behavior, not a memorized script."
          preppiMessage="Keep these. They are doing useful work for you."
        >
          <StrengthsOverview strengths={strengths} />
        </StepShell>
      )
    }

    if (activeStep.type === 'weaknesses') {
      return (
        <StepShell
          eyebrow="What We'll Workshop"
          title={`${repairs.length} ${repairs.length === 1 ? 'workshop' : 'workshops'} to rebuild these answers.`}
          body="Each weak area has its own interactive workshop. You'll rebuild the answer step-by-step — no reading, no quizzes, just doing."
          preppiMessage="Workshop = do, not read. Let's go."
        >
          <WeaknessesOverview repairs={repairs} />
        </StepShell>
      )
    }

    if (activeStep.type === 'workshop') {
      const repair = repairs[activeStep.repairIndex]
      const issueNumber = activeStep.repairIndex + 1
      const totalIssues = Math.max(repairs.length, 1)
      const isComplete = completedWorkshops.has(activeStep.repairIndex)
      return (
        <WorkshopSlide
          repair={repair}
          issueNumber={issueNumber}
          totalIssues={totalIssues}
          workshopType={activeStep.workshopType}
          sessionId={currentSessionData?.id}
          isComplete={isComplete}
          onWorkshopComplete={() => {
            setCompletedWorkshops((prev) => {
              const next = new Set(prev)
              next.add(activeStep.repairIndex)
              return next
            })
            // Auto-advance to next step shortly after completion
            window.setTimeout(() => {
              setStep((value) => Math.min(value + 1, deckSteps.length - 1))
            }, 600)
          }}
        />
      )
    }

    if (activeStep.type === 'preview') {
      const questions = predictedQuestions.length
        ? predictedQuestions.slice(0, 3)
        : [
            'Walk me through a project where you created measurable impact.',
            'How would your background help you succeed in this specific role?',
            'What would you need to learn quickly if you joined this team?',
          ]

      return (
        <StepShell
          eyebrow={`${nextStageName} Preview`}
          title="The next round will test proof."
          body={`What this ${stageName.toLowerCase()} signaled, and what the ${nextStageName?.toLowerCase() || 'next round'} will press on next.`}
          preppiMessage="The boss level is less friendly. Helpful, but less friendly."
        >
          <div className="grid h-full min-h-0 gap-4 lg:grid-cols-2">
            <div className="min-h-0 overflow-hidden rounded-2xl border border-slate-200 bg-slate-50 p-4">
              <div className="flex items-center gap-2">
                <Briefcase className="h-5 w-5 text-accent-700" />
                <p className="text-xs font-bold uppercase tracking-[0.2em] text-slate-500">Likely Questions</p>
              </div>
              <div className="mt-4 grid gap-3">
                {questions.map((question, index) => (
                  <div key={`${question}-${index}`} className={`rounded-xl bg-white p-3 text-sm font-bold leading-6 text-slate-800 shadow-sm ${index > 1 ? 'hidden 2xl:block' : ''}`}>
                    {question}
                  </div>
                ))}
              </div>
            </div>
            <div className="min-h-0 overflow-hidden rounded-2xl border border-accent-200 bg-accent-50 p-4">
              <div className="flex items-center gap-2">
                <Target className="h-5 w-5 text-accent-700" />
                <p className="text-xs font-bold uppercase tracking-[0.2em] text-accent-700">Study Focus</p>
              </div>
              <div className="mt-4 grid gap-3">
                {(studyAreas.length ? studyAreas.slice(0, 4) : [repairs[0]?.criterion || 'Specific examples', 'Role-specific accomplishments', 'Metrics and outcomes', 'Concise story structure']).map((area, index) => (
                  <div key={`${area}-${index}`} className={`gap-2 rounded-xl bg-white/90 p-3 text-sm font-bold leading-6 text-slate-800 ${index > 1 ? 'hidden 2xl:flex' : 'flex'}`}>
                    <CheckCircle className="mt-0.5 h-4 w-4 shrink-0 text-accent-600" />
                    <span>{area}</span>
                  </div>
                ))}
              </div>
              <div className="mt-4 hidden rounded-xl border border-slate-200 bg-slate-50 p-3 2xl:block">
                <p className="text-xs font-bold uppercase tracking-[0.16em] text-slate-500">Coach note</p>
                <p className="mt-1 text-sm font-medium leading-6 text-slate-600">
                  {nextSteps?.confidence_level ? `Confidence level: ${nextSteps.confidence_level}. ` : ''}
                  The next round turns these predictions into a live hiring manager simulation.
                </p>
              </div>
            </div>
          </div>
        </StepShell>
      )
    }

    return (
      <StepShell
        eyebrow="Next Stage"
        title="You have the diagnosis. Now rehearse the harder round."
        body={`You have the diagnosis from this ${stageName.toLowerCase()}. The ${nextStageName?.toLowerCase() || 'next round'} is what stands between you and the offer.`}
        preppiMessage="If I were a tiny parrot career coach, I would absolutely charge for this next part."
      >
        <div className="flex h-full min-h-0 flex-col justify-between gap-4 overflow-hidden">
          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
            <div className="flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-950 text-white">
                <Lock className="h-5 w-5" />
              </div>
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.2em] text-slate-500">Unlock Next</p>
                <h2 className="text-2xl font-bold text-slate-950">{nextStageName} Round</h2>
              </div>
            </div>
            <div className="mt-4 grid gap-3 sm:grid-cols-3">
              <div className="rounded-xl bg-white p-3">
                <Zap className="h-5 w-5 text-accent-600" />
                <p className="mt-2 text-sm font-bold text-slate-900">Role-specific pressure</p>
              </div>
              <div className="rounded-xl bg-white p-3">
                <Trophy className="h-5 w-5 text-amber-600" />
                <p className="mt-2 text-sm font-bold text-slate-900">Proof-first scoring</p>
              </div>
              <div className="rounded-xl bg-white p-3">
                <Crown className="h-5 w-5 text-accent-600" />
                <p className="mt-2 text-sm font-bold text-slate-900">Next-round coaching</p>
              </div>
            </div>
          </div>

          <div className="grid gap-3 lg:hidden 2xl:grid">
            <button
              type="button"
              onClick={onUnlockNextStage}
              className="group flex w-full items-center justify-center gap-3 rounded-xl bg-accent-600 px-5 py-4 text-base font-bold text-white shadow-sm transition hover:bg-accent-700"
            >
              Start {nextStageName} Round
              <ArrowRight className="h-5 w-5 transition group-hover:translate-x-1" />
            </button>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={handleReportClick}
                disabled={reportLoading}
                className="flex items-center justify-center gap-2 rounded-lg border border-slate-200 bg-white px-4 py-3 text-sm font-bold text-slate-700 transition hover:bg-slate-50"
              >
                {reportLocked ? <Lock className="h-4 w-4" /> : <FileText className="h-4 w-4" />}
                {reportLoading ? 'Preparing...' : reportButtonLabel}
              </button>
              <button
                type="button"
                onClick={onRetakeInterview}
                className="flex items-center justify-center gap-2 rounded-lg border border-slate-200 bg-white px-4 py-3 text-sm font-bold text-slate-700 transition hover:bg-slate-50"
              >
                <RefreshCw className="h-4 w-4" />
                {retakeLabel}
              </button>
            </div>
          </div>
        </div>
      </StepShell>
    )
  }

  return (
    <div className="flex h-full min-h-0 flex-col bg-white">
      {/* App top bar: close + story progress */}
        <div className={`flex shrink-0 items-center gap-3 px-4 sm:px-6 ${activeStep.type === 'workshop' ? 'pt-2' : 'pt-4'}`}>
          <button
            type="button"
            onClick={onExitToProfile}
          aria-label="Close"
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-slate-500 transition hover:bg-slate-100 hover:text-slate-900"
        >
          <X className="h-5 w-5" />
        </button>
        <div className="flex flex-1 gap-1.5">
          {deckSteps.map((s, index) => {
            const isWorkshopComplete = s.type === 'workshop' && completedWorkshops.has(s.repairIndex)
            const fillColor = isWorkshopComplete ? 'bg-emerald-500' : 'bg-accent-600'
            return (
              <div key={s.key} className="h-1.5 flex-1 overflow-hidden rounded-full bg-slate-200">
                <div className={`h-full rounded-full ${fillColor} transition-all duration-300 ${index <= step || isWorkshopComplete ? 'w-full' : 'w-0'}`} />
              </div>
            )
          })}
        </div>
        <div className="flex shrink-0 items-center gap-1.5">
          {reportHelpText && (
            <div className="group relative">
              <button
                type="button"
                aria-label="Report details"
                className="flex h-9 w-9 items-center justify-center rounded-full text-slate-500 transition hover:bg-slate-100 hover:text-slate-900"
              >
                <HelpCircle className="h-4 w-4" />
              </button>
              <div className="pointer-events-none absolute right-0 top-11 z-20 hidden w-72 rounded-2xl border border-slate-200 bg-white p-4 text-left shadow-xl group-hover:block">
                <p className="text-sm font-bold leading-5 text-slate-900">{reportHelpText}</p>
                {reportHelpSecondaryText && (
                  <p className="mt-2 text-xs font-semibold leading-5 text-slate-600">{reportHelpSecondaryText}</p>
                )}
              </div>
            </div>
          )}
          <button
            type="button"
            onClick={handleReportClick}
            disabled={reportLoading}
            className={`hidden h-9 items-center gap-2 rounded-full border px-3 text-xs font-bold transition sm:flex ${
              reportLocked
                ? 'border-amber-200 bg-amber-50 text-amber-800 hover:bg-amber-100'
                : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
            } disabled:cursor-wait disabled:opacity-70`}
          >
            {reportLocked ? <Lock className="h-3.5 w-3.5" /> : <FileText className="h-3.5 w-3.5" />}
            {reportLoading ? 'Preparing...' : reportButtonLabel}
          </button>
          <button
            type="button"
            onClick={handleReportClick}
            disabled={reportLoading}
            aria-label={reportButtonLabel}
            className={`flex h-9 w-9 items-center justify-center rounded-full border transition sm:hidden ${
              reportLocked
                ? 'border-amber-200 bg-amber-50 text-amber-800'
                : 'border-slate-200 bg-white text-slate-700'
            } disabled:cursor-wait disabled:opacity-70`}
          >
            {reportLocked ? <Lock className="h-4 w-4" /> : <FileText className="h-4 w-4" />}
          </button>
        </div>
      </div>

      {/* Slide */}
      <div
        key={activeStep.key}
        className={`slide-in-bottom min-h-0 flex-1 overflow-hidden ${
          activeStep.type === 'workshop'
            ? 'px-3 pt-2 pb-1 sm:px-4 sm:pt-3 sm:pb-2'
            : 'px-4 py-5 sm:px-6 sm:py-6'
        }`}
      >
        {renderStep()}
      </div>

      {/* App bottom bar */}
      <div
        className={`flex shrink-0 items-center gap-3 border-t border-slate-100 px-4 sm:px-6 ${
          activeStep.type === 'workshop' ? 'py-2' : 'py-4'
        }`}
      >
        {step > 0 && (
          <button
            type="button"
            onClick={goBack}
            className={`flex shrink-0 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-600 transition hover:bg-slate-50 ${
              activeStep.type === 'workshop' ? 'h-9 w-9' : 'h-12 w-12'
            }`}
            aria-label="Back"
          >
            <ChevronLeft className={activeStep.type === 'workshop' ? 'h-4 w-4' : 'h-5 w-5'} />
          </button>
        )}
        {activeStep.type === 'workshop' && !completedWorkshops.has(activeStep.repairIndex) ? (
          <button
            type="button"
            onClick={goNext}
            className="group flex h-9 flex-1 items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white text-sm font-semibold text-slate-500 transition hover:border-slate-300 hover:text-slate-700"
          >
            <SkipForward className="h-3.5 w-3.5" />
            Skip this workshop
          </button>
        ) : (
          <button
            type="button"
            onClick={goNext}
            className={`group flex flex-1 items-center justify-center gap-2 rounded-xl bg-accent-600 font-semibold text-white transition hover:bg-accent-700 ${
              activeStep.type === 'workshop' ? 'h-9 text-sm' : 'h-12 text-base'
            }`}
          >
            {isLastStep ? (nextStageName ? `Unlock ${nextStageName}` : 'Done') : (activeStep.type === 'workshop' ? 'Next Workshop' : 'Continue')}
            {isLastStep ? <Crown className={activeStep.type === 'workshop' ? 'h-4 w-4' : 'h-5 w-5'} /> : <ChevronRight className={`transition group-hover:translate-x-1 ${activeStep.type === 'workshop' ? 'h-4 w-4' : 'h-5 w-5'}`} />}
          </button>
        )}
      </div>

      {showCoachFile && (
        <CoachFileModal
          artifactContent={artifactContent}
          onClose={() => setShowCoachFile(false)}
          onPrintArtifact={onPrintArtifact}
        />
      )}
    </div>
  )
}
