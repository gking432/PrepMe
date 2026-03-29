'use client'

import { useState, useCallback, useEffect } from 'react'
import { X, FileText, CheckCircle, ChevronRight, Lock } from 'lucide-react'
import Confetti from '@/components/Confetti'
import { PreppiSVG } from '@/components/Preppi'
import { useGameFeedback } from '@/hooks/useGameFeedback'
import SubLessonRoadmap from '@/components/SubLessonRoadmap'
import { getBundleForRootCause, getRootCauseForCriterion } from '@/lib/practice-bundles'

// ── Icons per root cause ──────────────────────────────────────────────────────

const ROOT_CAUSE_ICONS: Record<string, string> = {
  poor_structure: '📋',
  lack_of_specificity: '🎯',
  weak_communication: '💬',
  missing_knowledge: '🔍',
  off_topic: '🧭',
  too_short: '📏',
}

// ── Types ─────────────────────────────────────────────────────────────────────

export interface WeaknessArea {
  criterion: string
  score?: number
  feedback?: string
  evidence?: Array<{ question?: string; excerpt?: string }>
  rootCause?: string
}

interface LessonRoadmapProps {
  weaknesses: WeaknessArea[]
  sessionId?: string
  currentStage?: string
  priorXp?: number
  onAllComplete: (totalXp: number) => void
  onViewReport: () => void
  onClose: () => void
  embeddedDesktop?: boolean
  onContextChange?: (context: {
    title: string
    items: Array<{
      label: string
      status?: 'current' | 'complete' | 'upcoming' | 'locked'
      meta?: string
    }>
  }) => void
}

// ── Component ─────────────────────────────────────────────────────────────────

export default function LessonRoadmap({
  weaknesses,
  sessionId,
  currentStage,
  priorXp = 0,
  onAllComplete,
  onViewReport,
  onClose,
  embeddedDesktop = false,
  onContextChange,
}: LessonRoadmapProps) {
  const { ding } = useGameFeedback()

  const [activeIdx, setActiveIdx] = useState<number | null>(null)
  const [completedSet, setCompletedSet] = useState<Set<number>>(new Set())
  const [passedSet, setPassedSet] = useState<Set<number>>(new Set())
  const [sessionXp, setSessionXp] = useState(0)
  const [showConfetti, setShowConfetti] = useState(false)

  const allDone = completedSet.size === weaknesses.length
  const nextIdx = weaknesses.findIndex((_, idx) => !completedSet.has(idx))

  const handleLessonComplete = useCallback((passed: boolean, xp: number) => {
    if (activeIdx === null) return
    const idx = activeIdx
    setActiveIdx(null)
    setCompletedSet(prev => { const n = new Set(prev); n.add(idx); return n })
    if (passed) setPassedSet(prev => { const n = new Set(prev); n.add(idx); return n })

    const newXp = sessionXp + xp
    setSessionXp(newXp)
    ding()

    const newSize = completedSet.size + 1
    if (newSize === weaknesses.length) {
      setShowConfetti(true)
      setTimeout(() => setShowConfetti(false), 3500)
      setTimeout(() => onAllComplete(priorXp + newXp), 2800)
    }
  }, [activeIdx, completedSet, sessionXp, weaknesses.length, ding, onAllComplete, priorXp])

  useEffect(() => {
    if (!onContextChange) return
    onContextChange({
      title: '',
      items: weaknesses.map((weakness, idx) => {
        const rootCause = getRootCauseForCriterion(weakness.criterion, weakness.rootCause)
        const bundle = getBundleForRootCause(rootCause)
        const isCompleted = completedSet.has(idx)
        const isCurrent = idx === nextIdx && !allDone
        return {
          label: bundle.displayName,
          status: isCompleted ? 'complete' as const : isCurrent ? 'current' as const : 'upcoming' as const,
          meta: weakness.score != null ? `${weakness.score}/10` : undefined,
        }
      }),
    })
  }, [allDone, completedSet, nextIdx, onContextChange, weaknesses])

  // ── Open sub-lesson roadmap ───────────────────────────────────────────────

  if (activeIdx !== null) {
    const weakness = weaknesses[activeIdx]
    const rootCause = getRootCauseForCriterion(weakness.criterion, weakness.rootCause)
    const bundle = getBundleForRootCause(rootCause)
    const evidence = weakness.evidence?.[0]

    return (
      <SubLessonRoadmap
        bundle={bundle}
        criterion={weakness.criterion}
        originalQuestion={evidence?.question}
        originalAnswer={evidence?.excerpt}
        sessionId={sessionId}
        currentStage={currentStage}
        priorXp={priorXp + sessionXp}
        onAllComplete={(totalXp) => handleLessonComplete(true, totalXp - priorXp - sessionXp)}
        onClose={() => setActiveIdx(null)}
        onContextChange={onContextChange}
      />
    )
  }

  const preppiMessage = allDone
    ? 'Every coaching path is complete. Review your feedback or retake the round.'
    : completedSet.size === 0
    ? 'Start with the highlighted module. You can come back here any time.'
    : `${weaknesses.length - completedSet.size} coaching path${weaknesses.length - completedSet.size !== 1 ? 's' : ''} left.`

  return (
    <div className={`${embeddedDesktop ? 'flex h-full flex-col bg-transparent' : 'fixed inset-0 z-50 flex flex-col bg-[linear-gradient(180deg,#faf7ff_0%,#f4f7ff_48%,#eef4fb_100%)]'}`}>
      <Confetti active={showConfetti} />

      {!embeddedDesktop && (
        <div className="shrink-0 border-b border-slate-100 bg-white/80 px-4 py-3 backdrop-blur-xl">
          <div className="mx-auto flex w-full max-w-3xl items-center justify-between">
            <button onClick={onClose} className="p-1.5 text-gray-300 hover:text-gray-500 transition-colors">
              <X className="w-5 h-5" />
            </button>
            <p className="text-xs font-extrabold uppercase tracking-[0.28em] text-slate-500">Practice</p>
            {sessionXp > 0
              ? <span className="text-sm font-extrabold text-amber-500 tabular-nums">+{sessionXp} XP</span>
              : <div className="w-8" />
            }
          </div>
        </div>
      )}

      <div className={`flex-1 ${embeddedDesktop ? 'overflow-hidden' : 'overflow-hidden'}`}>
        <div className={`mx-auto flex h-full max-w-6xl flex-col px-4 ${embeddedDesktop ? 'py-4 lg:px-8' : 'py-6'}`}>
          <div className="mb-5 flex items-center justify-between gap-4">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.24em] text-violet-600">Practice Hub</p>
              <h2 className="mt-2 text-3xl font-black text-slate-900">Pick a module and fix what held this round back.</h2>
            </div>
            <div className="rounded-[1.4rem] border border-violet-200 bg-white/80 px-5 py-3 shadow-[0_14px_28px_rgba(76,29,149,0.08)]">
              <p className="text-xs font-black uppercase tracking-[0.18em] text-violet-500">Progress</p>
              <p className="mt-1 text-sm font-bold text-slate-900">{completedSet.size} / {weaknesses.length} complete</p>
            </div>
          </div>

          <div className="grid flex-1 gap-5 lg:grid-cols-[1fr_320px]">
            <div className="relative rounded-[2rem] border border-violet-200/70 bg-[radial-gradient(circle_at_top,#ffffff_0%,#f6f0ff_38%,#eef4fb_100%)] p-6 shadow-[0_18px_36px_rgba(76,29,149,0.08)]">
              <div className="absolute inset-x-8 top-10 h-40 rounded-full bg-[radial-gradient(circle,#e9d8fd_0%,transparent_70%)] opacity-60" />
              <div className="relative grid h-full grid-cols-3 grid-rows-3 gap-4">
                {[0, 1, 2, 3, 4, 5].map((slot) => {
                  const weakness = weaknesses[slot]
                  if (!weakness) {
                    if (slot === 4) {
                      return (
                        <div key="preppi-hub" className="col-start-2 row-start-2 flex items-center justify-center">
                          <div className="flex h-40 w-40 flex-col items-center justify-center rounded-full border border-violet-200 bg-white/86 shadow-[0_20px_34px_rgba(76,29,149,0.12)]">
                            <div className="mb-3 flex h-20 w-20 items-center justify-center rounded-[1.7rem] bg-violet-50">
                              <PreppiSVG />
                            </div>
                            <p className="max-w-[11rem] text-center text-sm font-bold leading-6 text-slate-700">{preppiMessage}</p>
                          </div>
                        </div>
                      )
                    }
                    return <div key={`empty-${slot}`} />
                  }

                  const idx = slot
                  const rootCause = getRootCauseForCriterion(weakness.criterion, weakness.rootCause)
                  const bundle = getBundleForRootCause(rootCause)
                  const icon = ROOT_CAUSE_ICONS[rootCause] || '📋'
                  const isCompleted = completedSet.has(idx)
                  const isPassed = passedSet.has(idx)
                  const isRecommended = idx === nextIdx && !allDone
                  const slotClasses = ['col-start-1 row-start-1', 'col-start-3 row-start-1', 'col-start-1 row-start-2', 'col-start-3 row-start-2', 'col-start-1 row-start-3', 'col-start-3 row-start-3']

                  return (
                    <button
                      key={`${weakness.criterion}-${idx}`}
                      onClick={() => setActiveIdx(idx)}
                      className={`${slotClasses[slot]} relative rounded-[1.7rem] border p-5 text-left transition-all hover:-translate-y-1 hover:shadow-[0_24px_38px_rgba(15,23,42,0.12)] ${
                        isCompleted && isPassed
                          ? 'border-emerald-200 bg-emerald-50/92'
                          : isCompleted
                          ? 'border-amber-200 bg-amber-50/92'
                          : isRecommended
                          ? 'border-violet-300 bg-white ring-2 ring-violet-200/70 shadow-[0_20px_34px_rgba(109,40,217,0.12)]'
                          : 'border-slate-200/80 bg-white/92'
                      }`}
                    >
                      <div className="mb-4 flex items-center justify-between gap-3">
                        <div className="flex h-12 w-12 items-center justify-center rounded-[1rem] border border-violet-200 bg-violet-50 text-2xl text-violet-700">
                          <span>{icon}</span>
                        </div>
                        <span className={`rounded-full px-3 py-1 text-[10px] font-black uppercase tracking-[0.18em] ${
                          isCompleted && isPassed
                            ? 'bg-emerald-100 text-emerald-700'
                            : isCompleted
                            ? 'bg-amber-100 text-amber-700'
                            : isRecommended
                            ? 'bg-violet-100 text-violet-700'
                            : 'bg-slate-100 text-slate-500'
                        }`}>
                          {isCompleted ? (isPassed ? 'Mastered' : 'Retry') : isRecommended ? 'Recommended' : 'Module'}
                        </span>
                      </div>
                      <p className="text-base font-black text-slate-900">{bundle.displayName}</p>
                      <p className="mt-2 line-clamp-2 text-sm leading-6 text-slate-600">{weakness.criterion}</p>
                      <div className="mt-4 flex items-center justify-between">
                        {weakness.score != null && <span className="text-[11px] font-bold uppercase tracking-[0.18em] text-slate-400">{weakness.score}/10</span>}
                        <ChevronRight className="h-5 w-5 text-slate-400" />
                      </div>
                    </button>
                  )
                })}
              </div>
            </div>

            <div className="flex flex-col gap-4">
              <div className="rounded-[1.7rem] border border-violet-200 bg-white/90 p-5 shadow-[0_16px_30px_rgba(76,29,149,0.08)]">
                <p className="text-xs font-black uppercase tracking-[0.18em] text-violet-500">Start Here</p>
                <p className="mt-3 text-sm leading-7 text-slate-600">
                  The highlighted module is the fastest way to improve this round. Finish it first, then come back here for the rest.
                </p>
                <div className="mt-4 rounded-[1.2rem] border border-violet-200 bg-violet-50 px-4 py-3">
                  <p className="text-[11px] font-black uppercase tracking-[0.18em] text-violet-600">Recommended Module</p>
                  <p className="mt-1 text-sm font-bold text-slate-900">
                    {nextIdx >= 0 ? getBundleForRootCause(getRootCauseForCriterion(weaknesses[nextIdx]?.criterion, weaknesses[nextIdx]?.rootCause)).displayName : 'All modules complete'}
                  </p>
                </div>
              </div>
              <div className="rounded-[1.7rem] border border-slate-200 bg-white/90 p-5 shadow-[0_16px_30px_rgba(15,23,42,0.06)]">
                <p className="text-xs font-black uppercase tracking-[0.18em] text-slate-500">How Practice Works</p>
                <div className="mt-4 space-y-3">
                  <div className="rounded-[1.1rem] border border-slate-200 bg-slate-50/90 px-4 py-3 text-sm text-slate-700">
                    1. Learn the pattern
                  </div>
                  <div className="rounded-[1.1rem] border border-slate-200 bg-slate-50/90 px-4 py-3 text-sm text-slate-700">
                    2. Drill it three different ways
                  </div>
                  <div className="rounded-[1.1rem] border border-slate-200 bg-slate-50/90 px-4 py-3 text-sm text-slate-700">
                    3. Re-answer the original question out loud
                  </div>
                </div>
              </div>
              <div className="rounded-[1.7rem] border border-slate-200 bg-white/90 p-5 shadow-[0_16px_30px_rgba(15,23,42,0.06)]">
                <p className="text-xs font-black uppercase tracking-[0.18em] text-slate-500">Readiness</p>
                <div className="mt-4 h-3 overflow-hidden rounded-full bg-slate-100">
                  <div
                    className="h-full rounded-full bg-[linear-gradient(90deg,#8b5cf6_0%,#6d28d9_100%)]"
                    style={{ width: `${weaknesses.length ? (completedSet.size / weaknesses.length) * 100 : 0}%` }}
                  />
                </div>
                <p className="mt-3 text-sm font-semibold text-slate-700">
                  {allDone ? 'Every module is complete.' : `${Math.max(weaknesses.length - completedSet.size, 0)} modules still available.`}
                </p>
              </div>
              <div className="mt-auto space-y-3">
                {!embeddedDesktop && (
                  <button
                    onClick={onViewReport}
                    className="btn-coach-secondary flex w-full items-center justify-center gap-2 py-3.5 text-sm"
                  >
                    <FileText className="w-4 h-4" />
                    Back to Feedback
                  </button>
                )}
                {allDone && (
                  <div className="rounded-[1.4rem] border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-bold text-emerald-700">
                    All modules completed. You are ready for a retake or the next round.
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
