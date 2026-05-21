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
  Lock,
  RefreshCw,
  Sparkles,
  Target,
  Trophy,
  X,
  Zap,
} from 'lucide-react'
import Preppi from '@/components/Preppi'
import { getImprovementTipForCriterion, getRootCauseForCriterion } from '@/lib/practice-bundles'

type Evidence = {
  question?: string
  question_id?: string
  excerpt?: string
  timestamp?: string
}

type SignalArea = {
  criterion?: string
  feedback?: string
  score?: number | string
  rootCause?: string
  evidence?: Evidence[]
  rewrite_method?: string
  rewritten_answer?: string
  rewrite_explanation?: string
  original_answer?: string
}

type SignalKind = 'strength' | 'repair'

type SignalCard = SignalArea & {
  kind: SignalKind
  criterion: string
}

interface HrFeedbackDeckProps {
  feedback: any
  currentSessionData?: any
  artifactContent?: ReactNode
  onPrintArtifact?: () => void
  onRetakeInterview?: () => void
  onUnlockNextStage?: () => void
  onExitToProfile?: () => void
  layout?: 'standalone' | 'embedded'
}

type DeckStep =
  | { key: 'outcome'; label: string; type: 'outcome' }
  | { key: 'strengths'; label: string; type: 'strengths' }
  | { key: 'weaknesses'; label: string; type: 'weaknesses' }
  | { key: string; label: string; type: 'repair'; repairIndex: number }
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

function getSixAreas(feedback: any) {
  return feedback?.hr_screen_six_areas || feedback?.full_rubric?.hr_screen_six_areas || {}
}

function getOverallScore(feedback: any) {
  return parseScore(feedback?.overall_score || feedback?.full_rubric?.overall_assessment?.overall_score || 0)
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

  return {
    ...source,
    kind,
    criterion: toDisplayText(source.criterion || source.title || source.area || area, defaultCriterion),
    feedback: toDisplayText(source.feedback || source.description || source.summary),
    rootCause: toDisplayText(source.rootCause || source.root_cause),
    evidence: asArray<any>(source.evidence).map(normalizeEvidence),
  }
}

function getPrimaryEvidence(area?: SignalArea | null) {
  return asArray<Evidence>(area?.evidence)[0]
}

function truncate(value: string | undefined, max = 150) {
  const text = toDisplayText(value)
  if (!text) return ''
  if (text.length <= max) return text
  return `${text.slice(0, max).trim()}...`
}

function getFallbackTeachingBullets(criterion: string) {
  return [
    `Name the ${criterion.toLowerCase()} signal directly instead of making the interviewer infer it.`,
    'Anchor the answer in one specific example with your action, decision, or tradeoff.',
    'Close with the result, lesson, or business impact so the answer feels finished.',
  ]
}

function compactTeachingBullet(value: string) {
  const text = toDisplayText(value)
  const [rawLabel, ...rest] = text.split(':')
  const detail = rest.join(':').trim()
  const label = detail ? rawLabel.trim() : ''
  const labelKey = label.toLowerCase()
  const preset: Record<string, string> = {
    present: 'Start with what you do now.',
    past: 'Prove the background that shaped you.',
    future: 'Connect the story to this role.',
    situation: 'Set the scene quickly.',
    task: 'Name what was expected.',
    action: 'Show the move you owned.',
    result: 'End with the outcome.',
  }

  if (label && preset[labelKey]) return `${label}: ${preset[labelKey]}`

  return detail || text
}

function getScoreTone(score?: number | string) {
  const numeric = parseScore(score)
  if (numeric >= 7) return 'border-violet-200 bg-violet-50 text-violet-700'
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
    <div className={`grid h-full min-h-0 grid-rows-[auto_minmax(0,1fr)] ${compact ? 'gap-2' : 'gap-3'} 2xl:grid-cols-[0.72fr_1fr] 2xl:grid-rows-none 2xl:gap-6`}>
      <div className={`flex min-h-0 flex-col justify-between overflow-hidden rounded-[1.5rem] border border-violet-100 bg-gradient-to-br from-white via-violet-50/80 to-slate-50 shadow-[0_22px_60px_rgba(76,29,149,0.10)] lg:rounded-[2rem] ${compact ? 'p-3 lg:p-4' : 'p-4 lg:p-5 2xl:p-7'}`}>
        <div>
          <p className="text-[11px] font-black uppercase tracking-[0.22em] text-violet-700">{eyebrow}</p>
          <h1 className={`mt-2 font-black leading-tight text-slate-950 ${compact ? 'text-xl lg:text-2xl' : 'text-2xl lg:mt-3 lg:text-3xl 2xl:text-5xl'}`}>{title}</h1>
          {body && !compact && <p className="mt-4 hidden text-base font-semibold leading-7 text-slate-600 2xl:block">{body}</p>}
        </div>
        {!compact && (
          <Preppi
            showOnDesktop
            size="lg"
            message={preppiMessage || 'One card at a time. No report swamp today.'}
            className="mt-4 hidden 2xl:flex"
          />
        )}
      </div>
      <div className="min-h-0 overflow-hidden rounded-[1.5rem] border border-slate-200 bg-white p-4 shadow-[0_22px_60px_rgba(15,23,42,0.08)] lg:rounded-[2rem] lg:p-6">
        {children}
      </div>
    </div>
  )
}

function ScoreOrb({ score }: { score: number }) {
  const percentage = Math.max(0, Math.min(score * 10, 100))

  return (
    <div className="relative flex h-28 w-28 shrink-0 items-center justify-center rounded-full bg-white shadow-[inset_0_0_0_10px_rgba(226,232,240,0.9)] 2xl:h-36 2xl:w-36 2xl:shadow-[inset_0_0_0_12px_rgba(226,232,240,0.9)]">
      <div
        className="absolute inset-0 rounded-full"
        style={{ background: `conic-gradient(#7c3aed ${percentage}%, transparent ${percentage}% 100%)` }}
      />
      <div className="relative flex h-[5.4rem] w-[5.4rem] flex-col items-center justify-center rounded-full bg-white 2xl:h-[7.2rem] 2xl:w-[7.2rem]">
        <span className="text-3xl font-black text-slate-950 2xl:text-4xl">{score ? score.toFixed(score % 1 ? 1 : 0) : '-'}</span>
        <span className="text-xs font-black uppercase tracking-[0.2em] text-slate-400">out of 10</span>
      </div>
    </div>
  )
}

function SignalEvidence({ area }: { area?: SignalArea | null }) {
  const evidence = getPrimaryEvidence(area)

  if (!evidence?.excerpt && !evidence?.question) {
    return (
      <div className="rounded-[1.4rem] border border-slate-200 bg-slate-50 p-4">
        <p className="text-xs font-black uppercase tracking-[0.2em] text-slate-400">Evidence</p>
        <p className="mt-2 text-sm font-semibold leading-6 text-slate-600">No transcript excerpt was attached to this signal.</p>
      </div>
    )
  }

  return (
    <div className="rounded-[1.4rem] border border-slate-200 bg-slate-50 p-3 sm:p-4">
      <div className="flex items-center justify-between gap-3">
        <p className="text-xs font-black uppercase tracking-[0.2em] text-slate-400">Transcript Proof</p>
        {evidence.timestamp && <span className="rounded-full bg-white px-2 py-1 text-xs font-black text-slate-500">{evidence.timestamp}</span>}
      </div>
      {evidence.question && <p className="mt-2 line-clamp-1 text-sm font-black text-slate-900 sm:mt-3 sm:line-clamp-none">{toDisplayText(evidence.question)}</p>}
      {evidence.excerpt && <p className="mt-2 line-clamp-2 text-sm font-semibold leading-6 text-slate-600 sm:line-clamp-none">"{truncate(evidence.excerpt, 230)}"</p>}
    </div>
  )
}

function SignalSummaryCard({ area, kind }: { area?: SignalArea | null; kind: SignalKind }) {
  if (!area) {
    return (
      <div className="flex h-full min-h-[20rem] items-center justify-center rounded-[1.5rem] border border-dashed border-slate-200 bg-slate-50 p-6 text-center">
        <p className="text-sm font-bold leading-6 text-slate-500">No {kind === 'strength' ? 'strength' : 'repair'} signal was found in this report.</p>
      </div>
    )
  }

  const criterion = toDisplayText(area.criterion, kind === 'strength' ? 'Strong Interview Signal' : 'Priority Repair')
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
      <div className="min-h-0 overflow-hidden rounded-[1.5rem] border border-slate-200 bg-white p-3 sm:p-4">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.2em] text-slate-400">{kind === 'strength' ? 'Repeat This' : 'Flagged Issue'}</p>
            <h2 className="mt-2 line-clamp-2 text-lg font-black leading-tight text-slate-950 sm:text-xl 2xl:text-2xl">{criterion}</h2>
          </div>
          {score > 0 && (
            <span className={`rounded-full border px-3 py-1 text-sm font-black ${getScoreTone(score)}`}>
              {score.toFixed(score % 1 ? 1 : 0)}/10
            </span>
          )}
        </div>
        <p className={`mt-3 text-sm font-semibold leading-6 text-slate-600 sm:mt-4 ${kind === 'repair' ? 'line-clamp-1' : 'line-clamp-2 sm:line-clamp-3 2xl:line-clamp-none'}`}>{feedbackText}</p>
        {kind === 'repair' && (evidence?.excerpt || evidence?.question) && (
          <p className="mt-2 line-clamp-2 rounded-2xl bg-slate-50 px-3 py-2 text-xs font-bold leading-5 text-slate-600">
            <span className="font-black uppercase tracking-[0.16em] text-slate-400">Proof: </span>
            {truncate(evidence.excerpt || evidence.question, 150)}
          </p>
        )}
      </div>

      {kind === 'strength' && <SignalEvidence area={area} />}

      {kind === 'repair' && (
        <div className="min-h-0 flex-1 overflow-hidden rounded-[1.5rem] border border-amber-200 bg-amber-50 p-3 sm:p-4">
          <p className="text-xs font-black uppercase tracking-[0.2em] text-amber-700">Coach Move</p>
          <h3 className="mt-2 line-clamp-1 text-base font-black text-slate-950 sm:text-lg">{tip.title}</h3>
          <p className="mt-1 line-clamp-1 text-sm font-semibold leading-6 text-slate-700 sm:mt-2 sm:line-clamp-3">{tip.summary}</p>
          <div className="mt-3 hidden gap-2 2xl:grid">
            {(tip.bullets.length ? tip.bullets : ['Name the situation briefly.', 'Show the action you owned.', 'End with the result.']).slice(0, 3).map((item) => (
              <div key={item} className="flex gap-2 rounded-2xl bg-white/80 p-2 text-xs font-bold leading-5 text-slate-700">
                <CheckCircle className="mt-0.5 h-4 w-4 shrink-0 text-violet-600" />
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
}: {
  repair?: SignalArea | null
  issueNumber: number
  totalIssues: number
}) {
  if (!repair) {
    return (
      <div className="flex h-full min-h-[24rem] items-center justify-center rounded-[1.5rem] border border-dashed border-slate-200 bg-white p-6 text-center shadow-[0_22px_60px_rgba(15,23,42,0.08)]">
        <div>
          <p className="text-xs font-black uppercase tracking-[0.22em] text-violet-700">No Weak Signals</p>
          <h1 className="mt-2 text-2xl font-black text-slate-950">No flagged issues were attached to this HR report.</h1>
          <p className="mt-3 text-sm font-semibold leading-6 text-slate-600">If this is a real session, open the Coach File to confirm the full rubric details.</p>
        </div>
      </div>
    )
  }

  const criterion = toDisplayText(repair.criterion, 'Priority Repair')
  const rootCause = getRootCauseForCriterion(criterion, repair.rootCause)
  const tip = getImprovementTipForCriterion(criterion, rootCause)
  const score = parseScore(repair.score)
  const feedbackText = toDisplayText(repair.feedback, 'This answer did not create enough interviewer confidence for the next round.')
  const evidence = getPrimaryEvidence(repair)
  const questionText = toDisplayText(evidence?.question)
  const proofText = toDisplayText(evidence?.excerpt)
  const teachingBullets = (tip.bullets.length ? tip.bullets : getFallbackTeachingBullets(criterion)).slice(0, 3)
  const rewrittenAnswer = toDisplayText(repair.rewritten_answer)
  const rewriteMethod = toDisplayText(repair.rewrite_method)
  const rewriteExplanation = toDisplayText(repair.rewrite_explanation)

  return (
    <div className="grid h-full min-h-0 grid-rows-[auto_minmax(0,1fr)] gap-3 overflow-hidden rounded-[1.6rem] border border-slate-200 bg-white p-3 shadow-[0_22px_60px_rgba(15,23,42,0.08)] lg:p-4">
      <section className="min-h-0">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="text-[11px] font-black uppercase tracking-[0.22em] text-violet-700">Issue {issueNumber} of {totalIssues}</p>
            <h1 className="mt-1 text-lg font-black leading-tight text-slate-950 lg:text-xl">{criterion}</h1>
          </div>
          {score > 0 && (
            <span className={`rounded-full border px-3 py-1 text-sm font-black ${getScoreTone(score)}`}>
              {score.toFixed(score % 1 ? 1 : 0)}/10
            </span>
          )}
        </div>

        <div className={`mt-3 grid gap-2 ${(questionText || proofText) ? 'sm:grid-cols-2' : ''}`}>
          <div className="rounded-[1.2rem] border border-rose-100 bg-rose-50/70 p-2.5">
            <p className="text-[11px] font-black uppercase tracking-[0.2em] text-rose-600">Why Flagged</p>
            <p className="mt-1.5 text-xs font-semibold leading-5 text-slate-800">{feedbackText}</p>
          </div>

          {(questionText || proofText) && (
            <div className="rounded-[1.2rem] border border-slate-200 bg-slate-50 p-2.5">
              <div className="flex items-center justify-between gap-3">
                <p className="text-[11px] font-black uppercase tracking-[0.2em] text-slate-500">{questionText ? 'Question / Evidence' : 'What The Interviewer Heard'}</p>
                {evidence?.timestamp && <span className="rounded-full bg-white px-2 py-1 text-[11px] font-black text-slate-500">{evidence.timestamp}</span>}
              </div>
              {questionText && <p className="mt-1.5 text-xs font-black leading-4 text-slate-900">{questionText}</p>}
              {proofText && <p className="mt-1.5 text-[11px] font-semibold leading-4 text-slate-700">"{proofText}"</p>}
            </div>
          )}
        </div>
      </section>

      <section className="min-h-0 overflow-y-auto rounded-[1.35rem] border border-violet-200 bg-violet-50 p-2.5">
        <div className="flex items-start gap-3">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-white text-violet-700 shadow-sm">
            <Zap className="h-4 w-4" />
          </div>
          <div>
            <p className="text-[11px] font-black uppercase tracking-[0.22em] text-violet-700">Mini Lesson</p>
            <p className="text-xs font-black leading-4 text-slate-950">{tip.title}</p>
          </div>
        </div>

        <div className={`mt-2 grid gap-2 ${rewrittenAnswer ? 'xl:grid-cols-[0.85fr_1.15fr] xl:items-start' : ''}`}>
          <div>
            <div className="grid gap-2 sm:grid-cols-3">
              {teachingBullets.map((item, index) => (
                <div key={`${item}-${index}`} className="flex gap-2 rounded-[1rem] bg-white px-2.5 py-1.5 shadow-sm sm:flex-col">
                  <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-violet-600 text-[11px] font-black text-white">
                    {index + 1}
                  </span>
                  <p className="text-xs font-bold leading-4 text-slate-800">{compactTeachingBullet(item)}</p>
                </div>
              ))}
            </div>

            {tip.retryPrompt && (
              <div className="mt-2 rounded-[1rem] border border-violet-200 bg-white/85 px-3 py-2">
                <p className="text-[11px] font-black uppercase tracking-[0.2em] text-violet-700">Try this next</p>
                <p className="mt-1 text-xs font-bold leading-5 text-slate-800 lg:text-sm">{tip.retryPrompt}</p>
              </div>
            )}
          </div>

          {rewrittenAnswer && (
            <div className="rounded-[1rem] border border-slate-200 bg-white px-3 py-2">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="text-[11px] font-black uppercase tracking-[0.2em] text-slate-500">Better Version</p>
                {rewriteMethod && <span className="rounded-full bg-violet-100 px-2 py-1 text-[10px] font-black uppercase tracking-[0.14em] text-violet-700">{rewriteMethod}</span>}
              </div>
              <p className="mt-2 text-xs font-semibold leading-5 text-slate-800">"{rewrittenAnswer}"</p>
              {rewriteExplanation && <p className="mt-2 text-[11px] font-bold leading-4 text-violet-700">{rewriteExplanation}</p>}
            </div>
          )}
        </div>
      </section>
    </div>
  )
}

function StrengthsOverview({ strengths }: { strengths: SignalCard[] }) {
  if (!strengths.length) {
    return (
      <div className="flex h-full min-h-[20rem] items-center justify-center rounded-[1.5rem] border border-dashed border-slate-200 bg-slate-50 p-6 text-center">
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
            <div key={`${strength.criterion}-${index}`} className="rounded-[1.35rem] border border-violet-100 bg-violet-50/55 p-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-[11px] font-black uppercase tracking-[0.2em] text-violet-600">Strong Signal</p>
                  <h3 className="mt-1 text-lg font-black leading-tight text-slate-950">{strength.criterion}</h3>
                </div>
                {score > 0 && (
                  <span className="rounded-full border border-violet-200 bg-white px-3 py-1 text-sm font-black text-violet-700">
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
      <div className="flex h-full min-h-[20rem] items-center justify-center rounded-[1.5rem] border border-dashed border-slate-200 bg-slate-50 p-6 text-center">
        <p className="text-sm font-bold leading-6 text-slate-500">No weak-signal details were attached to this report yet.</p>
      </div>
    )
  }

  return (
    <div className="h-full min-h-0 overflow-hidden">
      <div className="grid h-full min-h-0 grid-cols-2 content-start gap-2 sm:grid-cols-3">
        {repairs.map((repair, index) => {
          const score = parseScore(repair.score)

          return (
            <div key={`${repair.criterion}-${index}`} className="rounded-[1rem] border border-rose-100 bg-rose-50/55 p-2.5">
              <div className="flex items-center justify-between gap-1.5">
                <p className="text-[9px] font-black uppercase tracking-[0.16em] text-rose-600">Weak {index + 1}</p>
                {score > 0 && <span className="shrink-0 text-[10px] font-black text-rose-700">{score.toFixed(score % 1 ? 1 : 0)}/10</span>}
              </div>
              <h3 className="mt-1.5 text-xs font-black leading-tight text-slate-950">{repair.criterion}</h3>
            </div>
          )
        })}
      </div>
    </div>
  )
}

function MiniStat({ label, value, tone = 'slate' }: { label: string; value: string; tone?: 'brand' | 'amber' | 'slate' }) {
  const classes = {
    brand: 'border-violet-200 bg-violet-50 text-violet-700',
    amber: 'border-amber-200 bg-amber-50 text-amber-700',
    slate: 'border-slate-200 bg-slate-50 text-slate-700',
  }

  return (
    <div className={`rounded-[1.2rem] border p-3 ${classes[tone]}`}>
      <p className="text-[10px] font-black uppercase tracking-[0.18em] opacity-70">{label}</p>
      <p className="mt-1 text-lg font-black">{value}</p>
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
    <div className="fixed inset-0 z-50 bg-slate-950/55 p-0 backdrop-blur-sm sm:p-4">
      <div className="mx-auto flex h-full max-w-5xl flex-col overflow-hidden bg-white shadow-2xl sm:rounded-[2rem]">
        <div className="flex items-center justify-between gap-3 border-b border-slate-200 px-4 py-3 sm:px-6">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.22em] text-violet-700">Saved Report</p>
            <h2 className="text-xl font-black text-slate-950">Coach File</h2>
          </div>
          <div className="flex items-center gap-2">
            {onPrintArtifact && (
              <button
                type="button"
                onClick={onPrintArtifact}
                className="hidden rounded-full border border-slate-200 px-4 py-2 text-sm font-black text-slate-700 transition hover:bg-slate-50 sm:inline-flex"
              >
                Print
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
        <div className="min-h-0 flex-1 overflow-y-auto bg-slate-50 p-4 sm:p-6">
          {artifactContent || (
            <div className="rounded-[1.5rem] border border-dashed border-slate-300 bg-white p-6 text-center">
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
  onRetakeInterview,
  onUnlockNextStage,
  onExitToProfile,
  layout = 'standalone',
}: HrFeedbackDeckProps) {
  const [step, setStep] = useState(0)
  const [showCoachFile, setShowCoachFile] = useState(false)

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
    const sixAreas = getSixAreas(feedback)
    const rawStrengths = asArray<any>(sixAreas.what_went_well).map((area) => normalizeSignal(area, 'strength'))
    const rawRepairs = asArray<any>(sixAreas.what_needs_improve).map((area) => normalizeSignal(area, 'repair'))
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
      predictedQuestions: asArray<any>(nextStepsData.predicted_hiring_manager_questions).map((item) => toDisplayText(item)).filter(Boolean),
      studyAreas: asArray<any>(nextStepsData.areas_to_study).map((item) => toDisplayText(item)).filter(Boolean),
      role: context.role,
      company: context.company,
    }
  }, [currentSessionData, feedback])

  const deckSteps = useMemo<DeckStep[]>(() => {
    const issueSteps = repairs.length
      ? repairs.map((_, index) => ({
          key: `issue-${index}`,
          label: `Issue ${index + 1}`,
          type: 'repair' as const,
          repairIndex: index,
        }))
      : [{ key: 'issue-none', label: 'Issues', type: 'repair' as const, repairIndex: 0 }]

    return [
      { key: 'outcome', label: 'Outcome', type: 'outcome' },
      { key: 'strengths', label: 'Strong', type: 'strengths' },
      { key: 'weaknesses', label: 'Weak', type: 'weaknesses' },
      ...issueSteps,
      { key: 'preview', label: 'Next Round', type: 'preview' },
      { key: 'upgrade', label: 'Unlock', type: 'upgrade' },
    ]
  }, [repairs])

  useEffect(() => {
    if (step >= deckSteps.length) {
      setStep(Math.max(deckSteps.length - 1, 0))
    }
  }, [deckSteps.length, step])

  const activeStep = deckSteps[Math.min(step, Math.max(deckSteps.length - 1, 0))]
  const progressPercent = ((step + 1) / deckSteps.length) * 100
  const isLastStep = step === deckSteps.length - 1
  const readyForHm = nextSteps?.ready_for_hiring_manager ?? likelihood === 'likely'

  const goNext = () => {
    if (isLastStep) {
      onUnlockNextStage?.()
      return
    }
    setStep((value) => Math.min(value + 1, deckSteps.length - 1))
  }

  const goBack = () => setStep((value) => Math.max(value - 1, 0))

  const renderStep = () => {
    if (activeStep.type === 'outcome') {
      return (
        <StepShell
          eyebrow="HR Screen Result"
          title={verdict.title}
          body={verdict.body}
          preppiMessage="This is the whole point: quick enough to understand, specific enough to trust."
        >
          <div className="flex h-full min-h-0 flex-col justify-between gap-3 overflow-hidden lg:gap-5">
            <div className="flex flex-col items-center gap-4 text-center sm:flex-row sm:text-left">
              <ScoreOrb score={score} />
              <div className="min-w-0">
                <span className="inline-flex rounded-full bg-violet-100 px-3 py-1 text-xs font-black uppercase tracking-[0.18em] text-violet-700">
                  {verdict.badge}
                </span>
                <h2 className="mt-3 text-2xl font-black leading-tight text-slate-950 2xl:text-3xl">{scoreLabel(score)} HR signal</h2>
                <p className="mt-3 text-sm font-semibold leading-6 text-slate-600">
                  For {role} at {company}, the next interviewer will care less about polish and more about proof.
                </p>
              </div>
            </div>
            <div className="grid grid-cols-3 gap-3">
              <MiniStat label="Strong" value={`${strengths.length || 0}`} tone="brand" />
              <MiniStat label="Issues" value={`${repairs.length || 0}`} tone="amber" />
              <MiniStat label="HM Ready" value={readyForHm ? 'Yes' : 'Soon'} />
            </div>
            <div className="hidden rounded-[1.5rem] border border-violet-200 bg-violet-50 p-4 sm:block">
              <div className="flex items-start gap-3">
                <Sparkles className="mt-1 h-5 w-5 shrink-0 text-violet-700" />
                <div>
                  <p className="text-sm font-black text-slate-950">What this free report gives you</p>
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
          eyebrow="Weak Signals"
          title="Here is the weak stuff."
          body="These are the areas that could weaken the hiring manager round. Nothing is ranked or minimized; each one gets its own repair slide next."
          preppiMessage="Equal attention. No drama. We just fix them one at a time."
        >
          <WeaknessesOverview repairs={repairs} />
        </StepShell>
      )
    }

    if (activeStep.type === 'repair') {
      const repair = repairs[activeStep.repairIndex]
      const issueNumber = activeStep.repairIndex + 1
      const totalIssues = Math.max(repairs.length, 1)
      return <RepairLessonSlide repair={repair} issueNumber={issueNumber} totalIssues={totalIssues} />
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
          eyebrow="Hiring Manager Preview"
          title="The next round will test proof."
          body="HR screens ask if you are plausible. Hiring managers ask if you can actually do the work."
          preppiMessage="The boss level is less friendly. Helpful, but less friendly."
        >
          <div className="grid h-full min-h-0 gap-4 lg:grid-cols-2">
            <div className="min-h-0 overflow-hidden rounded-[1.5rem] border border-slate-200 bg-slate-50 p-4">
              <div className="flex items-center gap-2">
                <Briefcase className="h-5 w-5 text-violet-700" />
                <p className="text-xs font-black uppercase tracking-[0.2em] text-slate-500">Likely Questions</p>
              </div>
              <div className="mt-4 grid gap-3">
                {questions.map((question, index) => (
                  <div key={`${question}-${index}`} className={`rounded-[1.2rem] bg-white p-3 text-sm font-bold leading-6 text-slate-800 shadow-sm ${index > 1 ? 'hidden 2xl:block' : ''}`}>
                    {question}
                  </div>
                ))}
              </div>
            </div>
            <div className="min-h-0 overflow-hidden rounded-[1.5rem] border border-violet-200 bg-violet-50 p-4">
              <div className="flex items-center gap-2">
                <Target className="h-5 w-5 text-violet-700" />
                <p className="text-xs font-black uppercase tracking-[0.2em] text-violet-700">Study Focus</p>
              </div>
              <div className="mt-4 grid gap-3">
                {(studyAreas.length ? studyAreas.slice(0, 4) : [repairs[0]?.criterion || 'Specific examples', 'Role-specific accomplishments', 'Metrics and outcomes', 'Concise story structure']).map((area, index) => (
                  <div key={`${area}-${index}`} className={`gap-2 rounded-[1.2rem] bg-white/90 p-3 text-sm font-bold leading-6 text-slate-800 ${index > 1 ? 'hidden 2xl:flex' : 'flex'}`}>
                    <CheckCircle className="mt-0.5 h-4 w-4 shrink-0 text-violet-600" />
                    <span>{area}</span>
                  </div>
                ))}
              </div>
              <div className="mt-4 hidden rounded-[1.2rem] bg-white/70 p-3 2xl:block">
                <p className="text-sm font-black text-slate-950">Preppi read</p>
                <p className="mt-1 text-sm font-semibold leading-6 text-slate-700">
                  {nextSteps?.confidence_level ? `Confidence level: ${nextSteps.confidence_level}. ` : ''}
                  Your next unlock should turn these predictions into a live hiring manager simulation.
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
        body="The free HR report should feel complete, not cramped. The paid next step should feel obvious because the next interview is already visible."
        preppiMessage="If I were a tiny parrot career coach, I would absolutely charge for this next part."
      >
        <div className="flex h-full min-h-0 flex-col justify-between gap-4 overflow-hidden">
          <div className="rounded-[1.6rem] border border-slate-200 bg-slate-50 p-4">
            <div className="flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-950 text-white">
                <Lock className="h-5 w-5" />
              </div>
              <div>
                <p className="text-xs font-black uppercase tracking-[0.2em] text-slate-500">Unlock Next</p>
                <h2 className="text-2xl font-black text-slate-950">Hiring Manager Round</h2>
              </div>
            </div>
            <div className="mt-4 grid gap-3 sm:grid-cols-3">
              <div className="rounded-[1.2rem] bg-white p-3">
                <Zap className="h-5 w-5 text-violet-600" />
                <p className="mt-2 text-sm font-black text-slate-900">Role-specific pressure</p>
              </div>
              <div className="rounded-[1.2rem] bg-white p-3">
                <Trophy className="h-5 w-5 text-amber-600" />
                <p className="mt-2 text-sm font-black text-slate-900">Proof-first scoring</p>
              </div>
              <div className="rounded-[1.2rem] bg-white p-3">
                <Crown className="h-5 w-5 text-violet-600" />
                <p className="mt-2 text-sm font-black text-slate-900">Next-round coaching</p>
              </div>
            </div>
          </div>

          <div className="grid gap-3 lg:hidden 2xl:grid">
            <button
              type="button"
              onClick={onUnlockNextStage}
              className="group flex w-full items-center justify-center gap-3 rounded-[1.3rem] bg-violet-600 px-5 py-4 text-base font-black text-white shadow-[0_6px_0_#4c1d95] transition hover:bg-violet-700 active:translate-y-1 active:shadow-none"
            >
              Start Hiring Manager Round
              <ArrowRight className="h-5 w-5 transition group-hover:translate-x-1" />
            </button>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setShowCoachFile(true)}
                className="flex items-center justify-center gap-2 rounded-[1.1rem] border border-slate-200 bg-white px-4 py-3 text-sm font-black text-slate-700 transition hover:bg-slate-50"
              >
                <FileText className="h-4 w-4" />
                Coach File
              </button>
              <button
                type="button"
                onClick={onRetakeInterview}
                className="flex items-center justify-center gap-2 rounded-[1.1rem] border border-slate-200 bg-white px-4 py-3 text-sm font-black text-slate-700 transition hover:bg-slate-50"
              >
                <RefreshCw className="h-4 w-4" />
                Retake HR
              </button>
            </div>
          </div>
        </div>
      </StepShell>
    )
  }

  const isEmbedded = layout === 'embedded'
  const rootClass = isEmbedded
    ? 'relative flex h-[calc(100dvh-5rem)] min-h-0 overflow-hidden rounded-[2.25rem] border border-slate-200 bg-[#f8f7ff] text-slate-950 shadow-[0_24px_70px_rgba(15,23,42,0.10)]'
    : 'relative flex h-[100dvh] min-h-[100dvh] overflow-hidden bg-[#f8f7ff] text-slate-950'
  const contentClass = isEmbedded
    ? 'mx-auto flex h-full w-full max-w-6xl flex-col px-5 py-5'
    : 'mx-auto flex h-full w-full max-w-7xl flex-col px-4 py-3 sm:px-6 lg:px-8 lg:py-5'

  return (
    <main className={rootClass}>
      <div className="pointer-events-none absolute -left-24 top-16 h-64 w-64 rounded-full bg-violet-200/60 blur-3xl" />
      <div className="pointer-events-none absolute -right-28 bottom-16 h-72 w-72 rounded-full bg-sky-200/60 blur-3xl" />
      <div className={contentClass}>
        <div className="relative z-10 flex items-center justify-between gap-3">
          <div className="min-w-0">
            <p className="text-[11px] font-black uppercase tracking-[0.2em] text-violet-700">PrepMe Feedback</p>
            <p className="truncate text-sm font-black text-slate-900">HR Screen Report</p>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            {onExitToProfile && (
              <button
                type="button"
                onClick={onExitToProfile}
                className="flex items-center gap-2 rounded-full border border-violet-200 bg-white/90 px-3 py-2 text-xs font-black text-violet-700 shadow-sm transition hover:bg-white"
              >
                Exit
              </button>
            )}
            <button
              type="button"
              onClick={() => setShowCoachFile(true)}
              className="flex items-center gap-2 rounded-full border border-slate-200 bg-white/90 px-3 py-2 text-xs font-black text-slate-700 shadow-sm transition hover:bg-white"
            >
              <FileText className="h-4 w-4" />
              Coach File
            </button>
          </div>
        </div>

        <div className="relative z-10 mt-3">
          <div className="h-3 overflow-hidden rounded-full bg-white shadow-inner">
            <div className="h-full rounded-full bg-[linear-gradient(90deg,#8b5cf6_0%,#6d28d9_100%)] transition-all duration-500" style={{ width: `${progressPercent}%` }} />
          </div>
          <div className="mt-2 flex items-center justify-between text-[11px] font-black uppercase tracking-[0.18em] text-slate-500">
            <span>HR Screen · {activeStep.label}</span>
            <span>Step {step + 1}/{deckSteps.length}</span>
          </div>
          <div className="mt-2 grid grid-cols-4 gap-1 lg:hidden">
            {['HR', 'HM', 'Culture', 'Final'].map((stage, index) => (
              <div key={stage} className={`h-1.5 rounded-full ${index === 0 ? 'bg-violet-600' : 'bg-white shadow-inner'}`} />
            ))}
          </div>
        </div>

        <div className="relative z-10 mt-3 min-h-0 flex-1 overflow-hidden pb-3">
          {renderStep()}
        </div>

        <div className="relative z-10 grid grid-cols-[auto_1fr] gap-3 border-t border-slate-900/5 pt-3">
          <button
            type="button"
            onClick={goBack}
            disabled={step === 0}
            className="flex h-14 w-14 items-center justify-center rounded-[1.15rem] border border-slate-200 bg-white text-slate-700 shadow-sm transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
            aria-label="Previous card"
          >
            <ChevronLeft className="h-5 w-5" />
          </button>
          <button
            type="button"
            onClick={goNext}
            className="group flex h-14 items-center justify-center gap-3 rounded-[1.15rem] bg-violet-600 px-5 text-base font-black text-white shadow-[0_5px_0_#4c1d95] transition hover:bg-violet-700 active:translate-y-1 active:shadow-none"
          >
            {isLastStep ? 'Unlock Hiring Manager' : 'Continue'}
            {isLastStep ? <Crown className="h-5 w-5" /> : <ChevronRight className="h-5 w-5 transition group-hover:translate-x-1" />}
          </button>
        </div>
      </div>

      {showCoachFile && (
        <CoachFileModal
          artifactContent={artifactContent}
          onClose={() => setShowCoachFile(false)}
          onPrintArtifact={onPrintArtifact}
        />
      )}
    </main>
  )
}
