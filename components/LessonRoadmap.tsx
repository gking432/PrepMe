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
      title: 'Practice Modules',
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
    ? 'Every coaching path is complete. Review your report or retake the round.'
    : completedSet.size === 0
    ? 'Pick a module and work through it. You can always come back to this map.'
    : `${weaknesses.length - completedSet.size} coaching path${weaknesses.length - completedSet.size !== 1 ? 's' : ''} left.`

  return (
    <div className={`fixed inset-0 z-50 flex flex-col bg-[linear-gradient(180deg,#faf7ff_0%,#f4f7ff_48%,#eef4fb_100%)] ${
      embeddedDesktop ? 'lg:relative lg:inset-auto lg:min-h-full' : ''
    }`}>
      <Confetti active={showConfetti} />

      {/* Top bar */}
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

      {/* Scrollable content */}
      <div className="flex-1 overflow-y-auto">
        <div className="mx-auto max-w-4xl px-4 py-8">

          {/* Preppi */}
          <div className="mb-8 text-center">
            <div className="mx-auto mb-4 flex h-20 w-20 items-center justify-center rounded-[1.7rem] bg-white/90 shadow-[0_16px_30px_rgba(76,29,149,0.08)] animate-preppi-bounce">
              <PreppiSVG />
            </div>
            <div className="inline-block max-w-[280px] rounded-[1.6rem] rounded-t-[0.45rem] border border-violet-200/80 bg-white/96 px-4 py-3 shadow-[0_16px_30px_rgba(76,29,149,0.08)]">
              <p className="text-sm font-bold text-gray-800 leading-snug">{preppiMessage}</p>
            </div>
          </div>

          <div className="mb-5 rounded-[1.5rem] border border-violet-200/70 bg-white/78 p-4 shadow-[0_16px_30px_rgba(76,29,149,0.08)]">
            <p className="text-xs font-black uppercase tracking-[0.24em] text-violet-600">Practice Home Base</p>
            <p className="mt-2 text-sm leading-6 text-slate-600">
              Every flagged area lives here as its own module. Start with the recommended one, but you can return to this map anytime.
            </p>
          </div>

          {weaknesses.length > 0 && (
            <div className="grid gap-4 md:grid-cols-2">
              {weaknesses.map((weakness, idx) => {
                const rootCause = getRootCauseForCriterion(weakness.criterion, weakness.rootCause)
                const bundle = getBundleForRootCause(rootCause)
                const icon = ROOT_CAUSE_ICONS[rootCause] || '📋'
                const isCompleted = completedSet.has(idx)
                const isPassed = passedSet.has(idx)
                const isRecommended = idx === nextIdx && !allDone

                return (
                  <button
                    key={`${weakness.criterion}-${idx}`}
                    onClick={() => setActiveIdx(idx)}
                    className={`w-full rounded-[1.6rem] border p-5 text-left shadow-[0_18px_30px_rgba(15,23,42,0.08)] transition-all hover:shadow-[0_24px_38px_rgba(15,23,42,0.1)] active:scale-[0.99] ${
                      isCompleted && isPassed
                        ? 'border-emerald-200 bg-emerald-50/90'
                        : isCompleted
                        ? 'border-amber-200 bg-amber-50/90'
                        : isRecommended
                        ? 'border-violet-300 bg-white/98 ring-2 ring-violet-200/70'
                        : 'border-slate-200/80 bg-white/96'
                    }`}
                  >
                    <div className="mb-4 flex items-center justify-between gap-3">
                      <span className={`rounded-full px-3 py-1 text-[10px] font-black uppercase tracking-[0.18em] ${
                        isCompleted && isPassed
                          ? 'bg-emerald-100 text-emerald-700'
                          : isCompleted
                          ? 'bg-amber-100 text-amber-700'
                          : isRecommended
                          ? 'bg-violet-100 text-violet-700'
                          : 'bg-slate-100 text-slate-500'
                      }`}>
                        {isCompleted ? (isPassed ? 'Completed' : 'Retry') : isRecommended ? 'Recommended First' : 'Module'}
                      </span>
                      <ChevronRight className="h-5 w-5 text-slate-400" />
                    </div>
                    <div className="flex items-start gap-4">
                      <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-[1.15rem] border border-violet-200 bg-violet-50 text-2xl text-violet-700">
                        <span>{icon}</span>
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-lg font-black text-slate-900">{bundle.displayName}</p>
                        <p className="mt-1 text-sm leading-6 text-slate-600">{weakness.criterion}</p>
                        <div className="mt-3 flex flex-wrap items-center gap-2">
                          <span className="rounded-full bg-violet-100 px-2.5 py-1 text-[10px] font-bold text-violet-700">
                            4-step coaching path
                          </span>
                          {weakness.score != null && (
                            <span className="text-[10px] font-semibold text-gray-400">Score {weakness.score}/10</span>
                          )}
                        </div>
                      </div>
                    </div>
                  </button>
                )
              })}
            </div>
          )}

          {completedSet.size > 0 && (
            <div className="mt-5">
              <p className="mb-3 text-xs font-black uppercase tracking-[0.22em] text-slate-400">Completed So Far</p>
              <div className="space-y-3">
                {weaknesses.map((weakness, idx) => {
                  if (!completedSet.has(idx)) return null
                  const rootCause = getRootCauseForCriterion(weakness.criterion, weakness.rootCause)
                  const bundle = getBundleForRootCause(rootCause)
                  const isPassed = passedSet.has(idx)
                  return (
                    <div key={idx} className={`flex items-center gap-3 rounded-[1.2rem] border px-4 py-3 ${
                      isPassed ? 'border-emerald-200 bg-emerald-50/80' : 'border-amber-200 bg-amber-50'
                    }`}>
                      <div className={`flex h-9 w-9 items-center justify-center rounded-xl ${isPassed ? 'bg-emerald-500' : 'bg-amber-400'}`}>
                        {isPassed ? <CheckCircle className="h-4 w-4 text-white" /> : <Lock className="h-4 w-4 text-amber-900" />}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-bold text-slate-900">{bundle.displayName}</p>
                        <p className="text-xs text-slate-500 line-clamp-1">{weakness.criterion}</p>
                      </div>
                      <span className={`text-xs font-bold ${isPassed ? 'text-emerald-700' : 'text-amber-700'}`}>
                        {isPassed ? 'Done' : 'Retry'}
                      </span>
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          {/* Bottom actions */}
          <div className="mt-8">
            {allDone && (
              <div className="text-center mb-4 animate-slide-up">
                <div className="inline-flex items-center gap-2 px-4 py-2 bg-green-50 border border-green-200 rounded-full">
                  <CheckCircle className="w-4 h-4 text-green-600" />
                  <span className="text-sm font-bold text-green-700">All skills completed!</span>
                </div>
              </div>
            )}
            <button
              onClick={onViewReport}
              className="btn-coach-secondary flex w-full items-center justify-center gap-2 py-3.5 text-sm"
            >
              <FileText className="w-4 h-4" />
              View Detailed Report
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
