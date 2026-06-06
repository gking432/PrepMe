'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowLeft, CheckCircle2, ChevronRight, Lock, Mic, RotateCcw, Sparkles, X } from 'lucide-react'
import { getRootCauseForCriterion, getBundleForRootCause } from '@/lib/practice-bundles'
import GuidedBuilderWorkshop, { type WorkshopType } from '@/components/exercises/GuidedBuilderWorkshop'

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
  stageName?: string
  onClose?: () => void
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

function getWorkshopType(signal: WeakSignal): WorkshopType | null {
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

export default function PracticePath({ sessionId, weakSignals, stageName = 'HR Screen', onClose }: PracticePathProps) {
  const router = useRouter()
  const [drafts, setDrafts] = useState<Record<string, Draft>>({})
  const [loading, setLoading] = useState(true)
  const [activeIndex, setActiveIndex] = useState<number | null>(null)

  const nodes: Node[] = useMemo(() => {
    return weakSignals.map((signal, index) => {
      const workshopType = getWorkshopType(signal)
      const evidence = pickEvidence(signal, workshopType)
      const question = evidence?.question || ''
      const originalAnswer = signal.original_answer || evidence?.excerpt || ''
      const key = workshopType ? `${workshopType}:${hashQuestion(question || signal.criterion || String(index))}` : `none:${index}`
      return {
        index,
        signal,
        workshopType,
        question,
        originalAnswer,
        key,
      }
    })
  }, [weakSignals])

  const nodesWithDrafts = useMemo(
    () => nodes.map((node) => ({ ...node, draft: drafts[node.key] })),
    [nodes, drafts]
  )

  const loadDrafts = useCallback(async () => {
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
  }, [])

  useEffect(() => {
    loadDrafts()
  }, [loadDrafts])

  const completedCount = nodesWithDrafts.filter((n) => n.draft).length
  const totalCount = nodes.length

  function handleClose() {
    if (onClose) onClose()
    else router.push('/dashboard')
  }

  function openNode(index: number) {
    setActiveIndex(index)
  }

  function handleWorkshopComplete() {
    setActiveIndex(null)
    // Refetch drafts to show the new completion
    setTimeout(() => loadDrafts(), 250)
  }

  const activeNode = activeIndex !== null ? nodesWithDrafts[activeIndex] : null

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
      <div className="min-h-0 flex-1 overflow-y-auto px-4 pb-12 pt-6 sm:px-6">
        <div className="mx-auto max-w-xl">
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
            <ol className="relative space-y-3">
              {nodesWithDrafts.map((node, i) => {
                const completed = !!node.draft
                const avg = scoreLabel(node.draft?.meta?.scores)
                const isLast = i === nodesWithDrafts.length - 1

                return (
                  <li key={node.key} className="relative">
                    {/* Connector line to next node */}
                    {!isLast && (
                      <div
                        className={`absolute left-7 top-[5.5rem] h-6 w-1 ${
                          completed ? 'bg-emerald-300' : 'bg-slate-200'
                        }`}
                      />
                    )}
                    <button
                      type="button"
                      onClick={() => node.workshopType && openNode(i)}
                      disabled={!node.workshopType}
                      className={`group flex w-full items-center gap-3 rounded-2xl border-2 bg-white p-3 text-left transition active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-50 ${
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
            <div className="mt-8 rounded-2xl border border-slate-200 bg-slate-50/80 px-4 py-3 text-center">
              <div className="flex items-center justify-center gap-1.5">
                <Sparkles className="h-3.5 w-3.5 text-violet-600" />
                <p className="text-xs font-bold text-slate-700">Take your time</p>
              </div>
              <p className="mt-1 text-[11px] leading-5 text-slate-500">
                Close anytime — your progress and answers are saved to your profile. Come back here to pick up
                where you left off.
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Active workshop overlay */}
      {activeNode && activeNode.workshopType && (
        <div className="fixed inset-0 z-[60] flex flex-col bg-white">
          <div className="shrink-0 flex items-center justify-between border-b border-slate-200 px-3 py-2">
            <p className="text-xs font-bold text-slate-600">
              Workshop {activeNode.index + 1} of {totalCount}
            </p>
            <button
              type="button"
              onClick={() => setActiveIndex(null)}
              className="flex h-8 w-8 items-center justify-center rounded-full text-slate-500 hover:bg-slate-100 hover:text-slate-900"
              aria-label="Close workshop"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
          <div className="min-h-0 flex-1 overflow-hidden p-2 sm:p-4">
            <GuidedBuilderWorkshop
              workshopType={activeNode.workshopType}
              sessionId={sessionId}
              originalQuestion={activeNode.question || undefined}
              originalAnswer={activeNode.originalAnswer || undefined}
              onComplete={handleWorkshopComplete}
            />
          </div>
        </div>
      )}
    </div>
  )
}
