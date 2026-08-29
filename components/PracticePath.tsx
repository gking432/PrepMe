'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowLeft, CheckCircle2, ChevronRight, Lock, Mic, RotateCcw, Sparkles } from 'lucide-react'
import { getRootCauseForCriterion, getBundleForRootCause } from '@/lib/practice-bundles'
import GuidedBuilderWorkshop, { type WorkshopType } from '@/components/exercises/GuidedBuilderWorkshop'
import StarStoryBuilder from '@/components/exercises/StarStoryBuilder'
import ProfessionalStoryBuilder from '@/components/exercises/ProfessionalStoryBuilder'
import CareerAlignmentBuilder from '@/components/exercises/CareerAlignmentBuilder'
import HandlingUncertaintyLesson from '@/components/exercises/HandlingUncertaintyLesson'
import {
  PORTFOLIO_DEMO_MODE,
  getDemoPracticeProgress,
  markDemoPracticeComplete,
} from '@/lib/portfolio-demo'

interface Evidence {
  question?: string
  question_id?: string
  excerpt?: string
}

export interface WeakSignal {
  criterion?: string
  feedback?: string
  score?: number | string
  rootCause?: string
  practice_focus_id?: string
  evidence?: Evidence[]
  original_answer?: string
}

interface PracticePathProps {
  sessionId: string
  weakSignals: WeakSignal[]
  transcript?: any
  stageName?: string
  onClose?: () => void
}

function findQAFromTranscript(transcript: any, workshopType: WorkshopType | null): { question: string; answer: string } | null {
  if (!transcript || !workshopType) return null
  const patterns = QUESTION_PATTERNS_BY_WORKSHOP[workshopType]
  if (!patterns?.length) return null
  const questions: any[] = Array.isArray(transcript?.questions_asked) ? transcript.questions_asked : []
  const messages: any[] = Array.isArray(transcript?.messages) ? transcript.messages : []
  const matchedQ = questions.find((q) => {
    const text = String(q?.question || q?.text || '')
    return patterns.some((p) => p.test(text))
  })
  if (!matchedQ) return null
  const qId = String(matchedQ?.id || matchedQ?.question_id || '')
  const qText = String(matchedQ?.question || matchedQ?.text || '')
  const candidateMsgs = messages
    .filter((m) => m?.speaker === 'candidate' && typeof m?.text === 'string' && String(m?.question_id || '') === qId)
    .map((m) => String(m.text).trim())
    .filter(Boolean)
  return { question: qText, answer: candidateMsgs.join('\n\n') }
}

interface Draft {
  value: string
  meta?: {
    workshop_type?: string
    original_question?: string
    chosen_tags?: string[]
    scores?: { coverage: number; structure: number; delivery: number } | null
    timestamp?: string
  }
  updated_at?: string
}

const QUESTION_PATTERNS_BY_WORKSHOP: Record<WorkshopType, RegExp[]> = {
  professional_story: [/tell me about yourself/i, /walk me through.*(background|experience|resume)/i, /your (background|story)/i],
  star_proof: [/tell me about a time/i, /give me an example/i, /describe a time/i, /walk me through.*(time|when|how you)/i, /significant (challenge|accomplishment)/i],
  career_alignment: [/why (this|are you interested|do you want).*(role|company|position|here|us)/i, /what draws you/i, /what (interests|attracted) you/i],
  preparation_curiosity: [/what do you know about (us|the company)/i, /(any|do you have).*questions/i, /what (research|interests you) about/i],
  handling_uncertainty: [],
  pace_delivery: [],
  role_depth: [/how (would|do) you (approach|handle|think about)/i, /walk me through.*(process|approach|methodology)/i, /what('s| is) your (process|approach|framework)/i, /how do you (evaluate|decide|prioritize)/i, /what tools/i, /what methods/i],
  problem_solving: [/how would you (solve|handle|deal with|address)/i, /what would you do if/i, /imagine.*(scenario|situation)/i, /walk me through how you.*(solve|debug|diagnose|fix)/i, /biggest (challenge|problem|obstacle)/i, /how do you (break down|approach).*(problem|challenge)/i],
}

function pickEvidence(signal: WeakSignal, workshopType: WorkshopType | null): Evidence | undefined {
  const list = Array.isArray(signal.evidence) ? signal.evidence : []
  if (!list.length) return undefined
  if (!workshopType) return list[0]
  const patterns = QUESTION_PATTERNS_BY_WORKSHOP[workshopType]
  if (patterns?.length) {
    const matched = list.find((ev) => patterns.some((p) => p.test(ev?.question || '')))
    if (matched) return matched
  }
  return list[0]
}

const COACHING_BUCKET_TO_WORKSHOP: Record<string, WorkshopType> = {
  professional_story: 'professional_story',
  specificity_proof: 'star_proof',
  star_proof: 'star_proof',
  career_alignment: 'career_alignment',
  handling_uncertainty: 'handling_uncertainty',
  pace_natural_delivery: 'pace_delivery',
  pace_delivery: 'pace_delivery',
  preparation_curiosity: 'preparation_curiosity',
  role_depth: 'role_depth',
  problem_solving: 'problem_solving',
}

function getWorkshopType(signal: WeakSignal): WorkshopType | null {
  const candidates: Array<string | undefined> = [
    signal.practice_focus_id,
    signal.rootCause,
    (signal as any).mini_workshop?.practice_focus_id,
    (signal as any).mini_workshop?.area_id,
  ]
  for (const c of candidates) {
    if (c && COACHING_BUCKET_TO_WORKSHOP[c]) return COACHING_BUCKET_TO_WORKSHOP[c]
  }
  const rootCause = getRootCauseForCriterion(signal.criterion || '', signal.practice_focus_id || signal.rootCause)
  const bundle = getBundleForRootCause(rootCause)
  const first = bundle.lessons.find((lesson) => lesson.workshop?.type)
  return (first?.workshop?.type as WorkshopType) || null
}

function hashQuestion(question: string) {
  let h = 0
  for (let i = 0; i < question.length; i++) {
    h = (h << 5) - h + question.charCodeAt(i)
    h |= 0
  }
  return Math.abs(h).toString(36).slice(0, 8)
}

function scoreLabel(scores?: { coverage: number; structure: number; delivery: number } | null) {
  if (!scores) return null
  const avg = Math.round((scores.coverage + scores.structure + scores.delivery) / 3)
  return avg
}

interface Node {
  index: number
  signal: WeakSignal
  workshopType: WorkshopType | null
  question: string
  originalAnswer: string
  key: string
  draft?: Draft
}

export default function PracticePath({ sessionId, weakSignals, transcript, stageName = 'HR Screen', onClose }: PracticePathProps) {
  const router = useRouter()
  const [drafts, setDrafts] = useState<Record<string, Draft>>({})
  const [demoCompletedKeys, setDemoCompletedKeys] = useState<string[]>([])
  const [loading, setLoading] = useState(true)
  const [activeIndex, setActiveIndex] = useState<number | null>(null)

  const nodes: Node[] = useMemo(() => {
    const seenWorkshopTypes = new Set<WorkshopType>()
    return weakSignals
      .map((signal, index) => {
        const workshopType = getWorkshopType(signal)
        // Prefer the actual Q/A from the transcript by workshop type — the grader's
        // evidence array can be mis-attributed if a single signal covers multiple
        // failing questions. The transcript is the source of truth.
        const fromTranscript = findQAFromTranscript(transcript, workshopType)
        const evidence = pickEvidence(signal, workshopType)
        const question = fromTranscript?.question || evidence?.question || ''
        const originalAnswer = fromTranscript?.answer || signal.original_answer || evidence?.excerpt || ''
        const key = workshopType ? `${workshopType}:${hashQuestion(question || signal.criterion || String(index))}` : `none:${index}`
        return { index, signal, workshopType, question, originalAnswer, key }
      })
      // Dedupe by workshop type — if two signals both map to e.g. star_proof,
      // collapse them into one node so the user doesn't see duplicate workshops.
      .filter((node) => {
        if (!node.workshopType) return true
        if (seenWorkshopTypes.has(node.workshopType)) return false
        seenWorkshopTypes.add(node.workshopType)
        return true
      })
  }, [weakSignals, transcript])

  const nodesWithDrafts = useMemo(
    () => nodes.map((node) => ({ ...node, draft: drafts[node.key] })),
    [nodes, drafts]
  )

  const loadDrafts = useCallback(async () => {
    if (PORTFOLIO_DEMO_MODE) {
      setDemoCompletedKeys(getDemoPracticeProgress(sessionId))
      setLoading(false)
      return
    }

    try {
      const res = await fetch('/api/profile/practice-memory', { cache: 'no-store' })
      if (!res.ok) {
        setLoading(false)
        return
      }
      const data = await res.json()
      const safe = data?.drafts && typeof data.drafts === 'object' ? data.drafts : {}
      setDrafts(safe)
    } catch {
      // ignore
    } finally {
      setLoading(false)
    }
  }, [sessionId])

  useEffect(() => {
    loadDrafts()
  }, [loadDrafts])

  const completedKeySet = useMemo(() => new Set(demoCompletedKeys), [demoCompletedKeys])
  const completedCount = nodesWithDrafts.filter((n) => n.draft || completedKeySet.has(n.key)).length
  const totalCount = nodes.length

  function handleClose() {
    if (onClose) onClose()
    else router.push('/dashboard')
  }

  function openNode(index: number) {
    setActiveIndex(index)
  }

  function handleWorkshopComplete() {
    const completedNode = activeIndex !== null ? nodesWithDrafts[activeIndex] : null
    if (PORTFOLIO_DEMO_MODE && completedNode) {
      markDemoPracticeComplete(sessionId, completedNode.key)
      setDemoCompletedKeys((current) => current.includes(completedNode.key) ? current : [...current, completedNode.key])
    }
    setActiveIndex(null)
    if (!PORTFOLIO_DEMO_MODE) {
      // Refetch persisted drafts to show the new completion.
      setTimeout(() => loadDrafts(), 250)
    }
  }

  const activeNode = activeIndex !== null ? nodesWithDrafts[activeIndex] : null

  function renderActiveWorkshop(node: Node) {
    if (node.workshopType === 'star_proof') {
      return (
        <StarStoryBuilder
          sessionId={sessionId}
          originalQuestion={node.question || undefined}
          originalAnswer={node.originalAnswer || undefined}
          onComplete={handleWorkshopComplete}
        />
      )
    }

    if (node.workshopType === 'professional_story') {
      return (
        <ProfessionalStoryBuilder
          sessionId={sessionId}
          originalQuestion={node.question || undefined}
          originalAnswer={node.originalAnswer || undefined}
          onComplete={handleWorkshopComplete}
        />
      )
    }

    if (node.workshopType === 'career_alignment') {
      return (
        <CareerAlignmentBuilder
          sessionId={sessionId}
          originalQuestion={node.question || undefined}
          originalAnswer={node.originalAnswer || undefined}
          onComplete={handleWorkshopComplete}
        />
      )
    }

    if (node.workshopType === 'handling_uncertainty') {
      return (
        <HandlingUncertaintyLesson
          sessionId={sessionId}
          originalQuestion={node.question || undefined}
          originalAnswer={node.originalAnswer || undefined}
          onComplete={handleWorkshopComplete}
        />
      )
    }

    if (!node.workshopType) return null

    return (
      <GuidedBuilderWorkshop
        workshopType={node.workshopType}
        sessionId={sessionId}
        originalQuestion={node.question || undefined}
        originalAnswer={node.originalAnswer || undefined}
        onComplete={handleWorkshopComplete}
      />
    )
  }

  if (activeNode?.workshopType) {
    return (
      <div className="h-dvh overflow-hidden bg-gradient-to-b from-slate-50 to-white">
        <header className="border-b border-slate-200 bg-white">
          <div className="mx-auto flex h-14 max-w-3xl items-center justify-between px-4">
            <button
              type="button"
              onClick={() => setActiveIndex(null)}
              className="flex items-center gap-2 rounded-lg px-2 py-1 text-sm font-bold text-slate-600 hover:bg-slate-100 hover:text-slate-900"
            >
              <ArrowLeft className="h-4 w-4" />
              <span>Practice path</span>
            </button>
            <p className="text-xs font-bold text-slate-500">
              Workshop {activeNode.index + 1} of {totalCount}
            </p>
          </div>
        </header>
        <main className="mx-auto h-[calc(100dvh-3.5rem)] max-w-3xl p-2 sm:p-4">
          {renderActiveWorkshop(activeNode)}
        </main>
      </div>
    )
  }

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-gradient-to-b from-slate-50 to-white overflow-hidden">
      {/* Top bar */}
      <div className="shrink-0 flex items-center justify-between border-b border-slate-200 bg-white px-4 py-3 sm:px-6">
        <button
          type="button"
          onClick={handleClose}
          className="flex items-center gap-2 rounded-lg px-2 py-1 text-sm font-bold text-slate-600 hover:bg-slate-100"
        >
          <ArrowLeft className="h-4 w-4" />
          <span className="hidden sm:inline">Close</span>
        </button>
        <div className="text-center">
          <p className="text-[10px] font-black uppercase tracking-[0.16em] text-violet-700">Practice Path</p>
          <p className="text-sm font-bold text-slate-900">{stageName}</p>
        </div>
        <div className="text-right">
          <p className="text-xs font-bold text-slate-500">{completedCount}/{totalCount}</p>
          <p className="text-[10px] font-black uppercase tracking-[0.14em] text-emerald-600">Complete</p>
        </div>
      </div>

      {/* Progress bar */}
      <div className="shrink-0 px-4 pt-3 sm:px-6">
        <div className="h-2 w-full overflow-hidden rounded-full bg-slate-200">
          <div
            className="h-full rounded-full bg-gradient-to-r from-violet-500 to-emerald-500 transition-all duration-500"
            style={{ width: totalCount ? `${(completedCount / totalCount) * 100}%` : '0%' }}
          />
        </div>
      </div>

      {/* Path */}
      <div className="min-h-0 flex-1 overflow-hidden px-4 py-4 sm:px-6">
        <div className="mx-auto flex h-full max-w-3xl flex-col">
          {loading ? (
            <div className="space-y-3">
              {[0, 1, 2].map((i) => (
                <div key={i} className="h-24 animate-pulse rounded-2xl bg-slate-100" />
              ))}
            </div>
          ) : nodesWithDrafts.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-8 text-center">
              <p className="text-sm font-bold text-slate-600">No practice items for this interview.</p>
              <p className="mt-1 text-xs text-slate-500">Run another interview to unlock new workshops.</p>
            </div>
          ) : (
            <ol className="grid min-h-0 flex-1 grid-cols-2 gap-3">
              {nodesWithDrafts.map((node, i) => {
                const completed = !!node.draft || completedKeySet.has(node.key)
                const avg = scoreLabel(node.draft?.meta?.scores)

                return (
                  <li key={node.key} className="min-h-0">
                    <button
                      type="button"
                      onClick={() => node.workshopType && openNode(i)}
                      disabled={!node.workshopType}
                      className={`group flex h-full w-full items-center gap-3 rounded-2xl border-2 bg-white p-3 text-left transition active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-50 ${
                        completed
                          ? 'border-emerald-300 bg-emerald-50/40 hover:border-emerald-400 hover:shadow-md'
                          : 'border-slate-200 hover:border-violet-300 hover:shadow-md'
                      }`}
                    >
                      {/* Node badge */}
                      <div
                        className={`flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl text-xl text-white shadow-md ${
                          completed ? 'bg-emerald-500' : node.workshopType ? 'bg-violet-500' : 'bg-slate-300'
                        }`}
                      >
                        {completed ? (
                          <CheckCircle2 className="h-7 w-7" />
                        ) : !node.workshopType ? (
                          <Lock className="h-5 w-5" />
                        ) : (
                          <span className="text-lg font-black">{i + 1}</span>
                        )}
                      </div>

                      {/* Content */}
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <p className="text-[10px] font-black uppercase tracking-[0.16em] text-violet-700">
                            {node.workshopType ? node.workshopType.replace(/_/g, ' ') : 'no workshop'}
                          </p>
                          {completed && avg !== null && (
                            <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-black text-emerald-700">
                              {avg}/100
                            </span>
                          )}
                        </div>
                        <p className="mt-0.5 truncate text-sm font-extrabold text-slate-900">
                          {node.signal.criterion || 'Workshop'}
                        </p>
                        {node.question && (
                          <p className="mt-1 truncate text-xs leading-5 text-slate-500">
                            Q: {node.question}
                          </p>
                        )}
                      </div>

                      {/* Right action */}
                      <div className="shrink-0">
                        {completed ? (
                          <div className="flex items-center gap-1 text-xs font-bold text-emerald-700">
                            <RotateCcw className="h-3.5 w-3.5" />
                            <span className="hidden sm:inline">Redo</span>
                          </div>
                        ) : (
                          <div className="flex items-center gap-1 text-xs font-bold text-violet-700">
                            <Mic className="h-3.5 w-3.5" />
                            <span className="hidden sm:inline">Start</span>
                            <ChevronRight className="h-4 w-4" />
                          </div>
                        )}
                      </div>
                    </button>
                  </li>
                )
              })}
            </ol>
          )}

          {/* Footer message */}
          {totalCount > 0 && (
            <div className="mt-4 shrink-0 rounded-2xl border border-slate-200 bg-slate-50/80 px-4 py-2 text-center">
              <div className="flex items-center justify-center gap-1.5">
                <Sparkles className="h-3.5 w-3.5 text-violet-600" />
                <p className="text-xs font-bold text-slate-700">Take your time</p>
              </div>
              <p className="mt-1 text-[11px] leading-5 text-slate-500">
                {PORTFOLIO_DEMO_MODE
                  ? 'Completed workshops are saved in this browser for this demo session.'
                  : 'Close anytime — your progress and answers are saved to your profile.'}
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
