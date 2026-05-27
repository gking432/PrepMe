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
  mini_workshop?: {
    area?: string
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
  hiring_manager: 'culture_fit',
  culture_fit: 'final',
  final: null,
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
  stageKey?: StageKey
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

type IssueLesson = {
  title: string
  summary: string
  steps: Array<{ label: string; text: string }>
  tryThis: string
}

function getIssueLesson(criterion: string, rootCause?: string): IssueLesson {
  const text = `${criterion} ${rootCause || ''}`.toLowerCase()

  if (/professional story|professional_story|tell me about yourself|background/.test(text)) {
    return {
      title: 'Turn your background into a clear professional story',
      summary:
        'A strong answer explains what you do now, shows the foundation that shaped you, and makes it clear where you are headed next.',
      steps: [
        { label: 'Present', text: 'Start with what you do now and define your professional lane clearly.' },
        { label: 'Past', text: 'Show the foundation that shaped you. Use specific details when they explain meaning, not when they just add chronology.' },
        { label: 'Future', text: 'Explain where you want to go next in a way that sounds specific and logical.' },
      ],
      tryThis: 'Draft your answer using Present, Past, Future. Do not stop at the section label. Add a qualifier to each one.',
    }
  }

  if (/specific examples|specificity|proof|evidence|lack_of_specificity|star|example/.test(text)) {
    return {
      title: 'Fix weak proof with stronger STAR',
      summary:
        'A STAR answer can look organized and still fail if the Action is broad, the Result is thin, or the Situation stays too generic to mean anything.',
      steps: [
        { label: 'Situation', text: 'Give enough context to make the problem real, but do not stay broad or drift into a long setup.' },
        { label: 'Task', text: 'Make your responsibility clear so the interviewer knows what you owned inside the situation.' },
        { label: 'Action', text: 'This is where proof usually lives. Show the real moves you made, not just traits like “I stayed organized.”' },
        { label: 'Result', text: 'Close with what changed, improved, or got protected because of your actions.' },
      ],
      tryThis: 'Use STAR again, but put more weight into ownership, specific Action, and meaningful Result.',
    }
  }

  if (/alignment|career goals|career_alignment|position|why this role|why this position/.test(text)) {
    return {
      title: 'Use Observation, Fit, Timing',
      summary:
        'Do not just say you want the role. Explain what you noticed, why it fits, and why now makes sense.',
      steps: [
        { label: 'Observation', text: 'What specifically stood out to you about the role or company?' },
        { label: 'Fit', text: 'Why does that connect to your background?' },
        { label: 'Timing', text: 'Why does this move make sense now?' },
      ],
      tryThis: 'Use Observation, Fit, Timing to explain what stands out, why it connects to you, and why the move makes sense now.',
    }
  }

  if (/uncertain|difficult|handling_uncertainty|off_topic|gap|bluff|deflect/.test(text)) {
    return {
      title: 'Use Answer, Reason, Example when you are unsure',
      summary:
        'Sometimes the question is fine, but you do not have a strong answer immediately. In that moment, do not ramble while you search.',
      steps: [
        { label: 'Pause', text: 'Pause, choose one grounded answer, explain why, and then support it with a short real example.' },
        { label: 'Answer', text: 'Give one clear answer early so the interviewer knows where the response is going.' },
        { label: 'Reason', text: 'Explain why that answer makes sense instead of circling the topic.' },
        { label: 'Example', text: 'Ground it with a short real example so the answer sounds credible and lived-in.' },
      ],
      tryThis: 'The recovery move is not to keep talking while you think. Pause, choose a direct answer, explain it, and ground it briefly.',
    }
  }

  if (/pace|flow|natural delivery|weak_communication|conversation/.test(text)) {
    return {
      title: 'Make the conversation feel natural and easy to follow',
      summary:
        'A strong interview does not just depend on what you say. It also depends on how the conversation feels.',
      steps: [
        { label: 'Rhythm', text: 'A strong answer should sound calm and easy to track.' },
        { label: 'Transition', text: 'One simple transition helps the answer begin naturally.' },
        { label: 'Flow', text: 'The ideas should build clearly instead of piling up too fast.' },
      ],
      tryThis: 'Use one simple transition, focus on one main point first, and make the answer easier to follow out loud.',
    }
  }

  if (/preparation|curiosity|questions_about_company|company|question/.test(text)) {
    return {
      title: 'Show you did enough homework to sound informed',
      summary:
        'In an HR screen, the interviewer is usually checking whether you did basic homework and whether your interest feels real.',
      steps: [
        { label: 'Basics', text: 'Know what the company does, who it serves, and one thing that stood out.' },
        { label: 'No generic praise', text: 'Saying the company seems great is not the same as showing preparation.' },
        { label: 'Connect interest', text: 'Say what stood out, then explain why it matters to you.' },
        { label: 'Better questions', text: 'Strong questions focus on the role, team, culture, or company priorities.' },
      ],
      tryThis: 'Keep it short. You only need the basics plus one real point of interest.',
    }
  }

  return {
    title: `${criterion} repair`,
    summary: 'Use the flagged feedback to make the answer clearer, more specific, and easier for the interviewer to trust.',
    steps: getFallbackTeachingBullets(criterion).map((text, index) => ({ label: `Step ${index + 1}`, text })),
    tryThis: 'Try answering again with more ownership, more specificity, and a clearer result.',
  }
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
}: {
  repair?: SignalArea | null
  issueNumber: number
  totalIssues: number
}) {
  const storageCriterion = toDisplayText(repair?.criterion, 'Priority Repair')
  const storageEvidence = getPrimaryEvidence(repair)
  const draftStorageKey = `prepme_hr_mini_workshop_${storageCriterion}_${storageEvidence?.question_id || issueNumber}`
  const [draft, setDraft] = useState('')

  useEffect(() => {
    if (typeof window === 'undefined') return
    setDraft(localStorage.getItem(draftStorageKey) || '')
  }, [draftStorageKey])

  useEffect(() => {
    if (!draft.trim()) return
    const timer = window.setTimeout(() => {
      fetch('/api/profile/practice-memory', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          key: draftStorageKey,
          value: draft,
          meta: {
            source: 'hr_screen_mini_workshop',
            criterion: storageCriterion,
            question_id: storageEvidence?.question_id || null,
            question: storageEvidence?.question || null,
            framework: repair?.mini_workshop?.framework || null,
            prompt: repair?.mini_workshop?.prompt || null,
          },
        }),
      }).catch(() => {
        // Local storage remains the fallback for anonymous users and offline exits.
      })
    }, 800)

    return () => window.clearTimeout(timer)
  }, [draft, draftStorageKey, repair?.mini_workshop?.framework, repair?.mini_workshop?.prompt, storageCriterion, storageEvidence?.question, storageEvidence?.question_id])

  const saveDraft = (value: string) => {
    setDraft(value)
    if (typeof window !== 'undefined') {
      localStorage.setItem(draftStorageKey, value)
    }
  }

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
  const rootCause = getRootCauseForCriterion(criterion, repair.rootCause)
  const lesson = getIssueLesson(criterion, rootCause)
  const score = parseScore(repair.score)
  const feedbackText = toDisplayText(repair.feedback, 'This answer did not create enough interviewer confidence for the next round.')
  const evidence = getPrimaryEvidence(repair)
  const questionText = toDisplayText(evidence?.question)
  const proofText = toDisplayText(evidence?.excerpt)
  const miniWorkshop = repair.mini_workshop
  const framework = toDisplayText(miniWorkshop?.framework, lesson.steps.map((step) => step.label).join(', '))
  const diagnosis = toDisplayText(miniWorkshop?.diagnosis, lesson.summary)
  const example = toDisplayText(miniWorkshop?.example)
  const draftPrompt = toDisplayText(miniWorkshop?.prompt, lesson.tryThis)

  return (
    <div className="grid h-full min-h-0 grid-rows-[auto_minmax(0,1fr)] gap-3 overflow-hidden rounded-2xl border border-slate-200 bg-white p-3 shadow-sm lg:p-4">
      <section className="min-h-0">
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

        <div className={`mt-3 grid gap-2 ${(questionText || proofText) ? 'sm:grid-cols-2' : ''}`}>
          <div className="rounded-xl border border-rose-100 bg-rose-50/70 p-2.5">
            <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-rose-600">Why Flagged</p>
            <p className="mt-1.5 text-xs font-semibold leading-5 text-slate-800">{feedbackText}</p>
          </div>

          {(questionText || proofText) && (
            <div className="rounded-xl border border-slate-200 bg-slate-50 p-2.5">
              <div className="flex items-center justify-between gap-3">
                <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-slate-500">{questionText ? 'Question / Evidence' : 'What The Interviewer Heard'}</p>
                {evidence?.timestamp && <span className="rounded-full bg-white px-2 py-1 text-[11px] font-bold text-slate-500">{evidence.timestamp}</span>}
              </div>
              {questionText && <p className="mt-1.5 text-xs font-bold leading-4 text-slate-900">{questionText}</p>}
              {proofText && <p className="mt-1.5 text-[11px] font-semibold leading-4 text-slate-700">"{proofText}"</p>}
            </div>
          )}
        </div>
      </section>

      <section className="min-h-0 overflow-y-auto rounded-xl border border-accent-200 bg-accent-50 p-2.5">
        <div className="flex items-start gap-3">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-white text-accent-700 shadow-sm">
            <Zap className="h-4 w-4" />
          </div>
          <div>
            <p className="text-[11px] font-bold uppercase tracking-[0.22em] text-accent-700">Mini Lesson</p>
            <p className="text-xs font-bold leading-4 text-slate-950">{lesson.title}</p>
          </div>
        </div>
        <p className="mt-2 text-xs font-semibold leading-5 text-slate-700">{lesson.summary}</p>

        <div className="mt-2 grid gap-2">
          <div>
            <div className={`grid gap-2 ${lesson.steps.length >= 4 ? 'sm:grid-cols-2 2xl:grid-cols-4' : 'sm:grid-cols-3'}`}>
              {lesson.steps.map((item, index) => (
                <div key={`${item}-${index}`} className="flex gap-2 rounded-lg bg-white px-2.5 py-1.5 shadow-sm sm:flex-col">
                  <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-accent-600 text-[11px] font-bold text-white">
                    {index + 1}
                  </span>
                  <div>
                    <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-accent-700">{item.label}</p>
                    <p className="text-xs font-bold leading-4 text-slate-800">{item.text}</p>
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-2 rounded-lg border border-accent-200 bg-white/85 px-3 py-2">
              <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-accent-700">Try this next</p>
              <p className="mt-1 text-xs font-bold leading-5 text-slate-800 lg:text-sm">{lesson.tryThis}</p>
            </div>
          </div>

          <div className="rounded-lg border border-slate-200 bg-white px-3 py-2">
            <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-slate-500">Mini Workshop</p>
            <p className="mt-1 text-xs font-bold leading-5 text-slate-900">Framework: {framework}</p>
            <p className="mt-1 text-xs font-semibold leading-5 text-slate-700">{diagnosis}</p>
            {example ? (
              <div className="mt-2 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2">
                <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-slate-500">Example</p>
                <p className="mt-1 text-xs font-semibold leading-5 text-slate-800">"{example}"</p>
              </div>
            ) : null}
            <label className="mt-2 block">
              <span className="text-[11px] font-bold uppercase tracking-[0.18em] text-accent-700">{draftPrompt}</span>
              <textarea
                value={draft}
                onChange={(event) => saveDraft(event.target.value)}
                placeholder="Write your version here. This saves on this device."
                className="mt-2 min-h-[6.5rem] w-full resize-y rounded-xl border border-accent-200 bg-accent-50/40 px-3 py-2 text-sm font-semibold leading-6 text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-accent-400 focus:bg-white"
              />
            </label>
          </div>
        </div>
      </section>
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
    <div className="h-full min-h-0 overflow-hidden">
      <div className="grid h-full min-h-0 grid-cols-2 content-start gap-2 sm:grid-cols-3">
        {repairs.map((repair, index) => {
          const score = parseScore(repair.score)

          return (
            <div key={`${repair.criterion}-${index}`} className="rounded-lg border border-rose-100 bg-rose-50/55 p-2.5">
              <div className="flex items-center justify-between gap-1.5">
                <p className="text-[9px] font-bold uppercase tracking-[0.16em] text-rose-600">Weak {index + 1}</p>
                {score > 0 && <span className="shrink-0 text-[10px] font-bold text-rose-700">{score.toFixed(score % 1 ? 1 : 0)}/10</span>}
              </div>
              <h3 className="mt-1.5 text-xs font-bold leading-tight text-slate-950">{repair.criterion}</h3>
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
    <div className="fixed inset-0 z-50 bg-slate-950/55 p-0 backdrop-blur-sm sm:p-4">
      <div className="mx-auto flex h-full max-w-5xl flex-col overflow-hidden bg-white shadow-2xl sm:rounded-2xl">
        <div className="flex items-center justify-between gap-3 border-b border-slate-200 px-4 py-3 sm:px-6">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.22em] text-accent-700">Saved Report</p>
            <h2 className="text-xl font-bold text-slate-950">Coach File</h2>
          </div>
          <div className="flex items-center gap-2">
            {onPrintArtifact && (
              <button
                type="button"
                onClick={onPrintArtifact}
                className="hidden rounded-full border border-slate-200 px-4 py-2 text-sm font-bold text-slate-700 transition hover:bg-slate-50 sm:inline-flex"
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
  onRetakeInterview,
  onUnlockNextStage,
  onExitToProfile,
  layout = 'standalone',
  stageKey = 'hr_screen',
}: HrFeedbackDeckProps) {
  const [step, setStep] = useState(0)
  const [showCoachFile, setShowCoachFile] = useState(false)
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
      ? repairs.map((_, index) => ({
          key: `issue-${index}`,
          label: `Issue ${index + 1}`,
          type: 'repair' as const,
          repairIndex: index,
        }))
      : [{ key: 'issue-none', label: 'Issues', type: 'repair' as const, repairIndex: 0 }]

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
                onClick={() => setShowCoachFile(true)}
                className="flex items-center justify-center gap-2 rounded-lg border border-slate-200 bg-white px-4 py-3 text-sm font-bold text-slate-700 transition hover:bg-slate-50"
              >
                <FileText className="h-4 w-4" />
                Coach File
              </button>
              <button
                type="button"
                onClick={onRetakeInterview}
                className="flex items-center justify-center gap-2 rounded-lg border border-slate-200 bg-white px-4 py-3 text-sm font-bold text-slate-700 transition hover:bg-slate-50"
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

  return (
    <div className="flex h-full min-h-0 flex-col bg-white">
      {/* App top bar: close + story progress */}
      <div className="flex shrink-0 items-center gap-3 px-4 pt-4 sm:px-6">
        <button
          type="button"
          onClick={onExitToProfile}
          aria-label="Close"
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-slate-500 transition hover:bg-slate-100 hover:text-slate-900"
        >
          <X className="h-5 w-5" />
        </button>
        <div className="flex flex-1 gap-1.5">
          {deckSteps.map((s, index) => (
            <div key={s.key} className="h-1.5 flex-1 overflow-hidden rounded-full bg-slate-200">
              <div className={`h-full rounded-full bg-accent-600 transition-all duration-300 ${index <= step ? 'w-full' : 'w-0'}`} />
            </div>
          ))}
        </div>
      </div>

      {/* Slide */}
      <div key={activeStep.key} className="slide-in-bottom min-h-0 flex-1 overflow-hidden px-4 py-5 sm:px-6 sm:py-6">
        {renderStep()}
      </div>

      {/* App bottom bar */}
      <div className="flex shrink-0 items-center gap-3 border-t border-slate-100 px-4 py-4 sm:px-6">
        {step > 0 && (
          <button
            type="button"
            onClick={goBack}
            className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-600 transition hover:bg-slate-50"
            aria-label="Back"
          >
            <ChevronLeft className="h-5 w-5" />
          </button>
        )}
        <button
          type="button"
          onClick={goNext}
          className="group flex h-12 flex-1 items-center justify-center gap-2 rounded-xl bg-accent-600 text-base font-semibold text-white transition hover:bg-accent-700"
        >
          {isLastStep ? (nextStageName ? `Unlock ${nextStageName}` : 'Done') : 'Continue'}
          {isLastStep ? <Crown className="h-5 w-5" /> : <ChevronRight className="h-5 w-5 transition group-hover:translate-x-1" />}
        </button>
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
