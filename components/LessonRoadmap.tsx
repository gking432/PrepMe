'use client'

import { useState, useCallback, useEffect, useMemo } from 'react'
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
  questions_about_company: '🏢',
  handling_uncertainty: '🧩',
  career_alignment: '🧭',
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

  const roadmapWeaknesses = useMemo(() => {
    const byRootCause = new Map<string, WeaknessArea>()

    weaknesses.forEach((weakness) => {
      const rootCause = getRootCauseForCriterion(weakness.criterion, weakness.rootCause)
      const existing = byRootCause.get(rootCause)

      if (!existing) {
        byRootCause.set(rootCause, { ...weakness, rootCause })
        return
      }

      const existingScore = existing.score ?? Number.POSITIVE_INFINITY
      const currentScore = weakness.score ?? Number.POSITIVE_INFINITY

      if (currentScore < existingScore) {
        byRootCause.set(rootCause, {
          ...weakness,
          rootCause,
          evidence: [
            ...(existing.evidence || []),
            ...(weakness.evidence || []),
          ].filter((item, index, array) => {
            const key = `${item.question || ''}::${item.excerpt || ''}`
            return array.findIndex((candidate) => `${candidate.question || ''}::${candidate.excerpt || ''}` === key) === index
          }),
        })
        return
      }

      byRootCause.set(rootCause, {
        ...existing,
        rootCause,
        evidence: [
          ...(existing.evidence || []),
          ...(weakness.evidence || []),
        ].filter((item, index, array) => {
          const key = `${item.question || ''}::${item.excerpt || ''}`
          return array.findIndex((candidate) => `${candidate.question || ''}::${candidate.excerpt || ''}` === key) === index
        }),
      })
    })

    return Array.from(byRootCause.values())
  }, [weaknesses])

  const [activeIdx, setActiveIdx] = useState<number | null>(null)
  const [completedSet, setCompletedSet] = useState<Set<number>>(new Set())
  const [passedSet, setPassedSet] = useState<Set<number>>(new Set())
  const [sessionXp, setSessionXp] = useState(0)
  const [showConfetti, setShowConfetti] = useState(false)

  const allDone = completedSet.size === roadmapWeaknesses.length
  const nextIdx = roadmapWeaknesses.findIndex((_, idx) => !completedSet.has(idx))

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
    if (newSize === roadmapWeaknesses.length) {
      setShowConfetti(true)
      setTimeout(() => setShowConfetti(false), 3500)
      setTimeout(() => onAllComplete(priorXp + newXp), 2800)
    }
  }, [activeIdx, completedSet, sessionXp, roadmapWeaknesses.length, ding, onAllComplete, priorXp])

  useEffect(() => {
    if (!onContextChange) return
    onContextChange({
      title: '',
      items: roadmapWeaknesses.map((weakness, idx) => {
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
  }, [allDone, completedSet, nextIdx, onContextChange, roadmapWeaknesses])

  // ── Open sub-lesson roadmap ───────────────────────────────────────────────

  if (activeIdx !== null) {
    const weakness = roadmapWeaknesses[activeIdx]
    const rootCause = getRootCauseForCriterion(weakness.criterion, weakness.rootCause)
    const bundle = getBundleForRootCause(rootCause)
    const evidence = weakness.evidence?.[0]

    return (
      <SubLessonRoadmap
        bundle={bundle}
        criterion={weakness.criterion}
        originalQuestion={evidence?.question}
        originalAnswer={evidence?.excerpt}
        evidenceItems={weakness.evidence}
        sessionId={sessionId}
        currentStage={currentStage}
        priorXp={priorXp + sessionXp}
        onAllComplete={(totalXp) => handleLessonComplete(true, totalXp - priorXp - sessionXp)}
        onClose={() => setActiveIdx(null)}
        embeddedDesktop={embeddedDesktop}
        onContextChange={onContextChange}
      />
    )
  }

  const preppiMessage = allDone
    ? 'Every coaching path is complete. Review your feedback or retake the round.'
    : completedSet.size === 0
    ? 'Start with the highlighted module. You can come back here any time.'
    : `${roadmapWeaknesses.length - completedSet.size} coaching path${roadmapWeaknesses.length - completedSet.size !== 1 ? 's' : ''} left.`

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

      <div className="flex-1 overflow-hidden">
        <div className={`mx-auto flex h-full ${embeddedDesktop ? 'max-w-[1240px] px-6 py-4' : 'max-w-6xl px-4 py-6'} flex-col`}>
          <div className={`mx-auto w-full ${embeddedDesktop ? 'max-w-5xl' : ''}`}>
            <div className="mb-5 flex items-start justify-between gap-4">
              <div>
                <p className="text-xs font-black uppercase tracking-[0.24em] text-violet-600">Practice Hub</p>
                <h2 className="mt-2 text-3xl font-black tracking-tight text-slate-900">
                  Pick the next module and keep moving.
                </h2>
                <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-500">
                  {preppiMessage}
                </p>
              </div>
              <div className="rounded-[1.4rem] border border-slate-200 bg-white/88 px-5 py-3 shadow-[0_14px_28px_rgba(15,23,42,0.06)]">
                <p className="text-xs font-black uppercase tracking-[0.18em] text-slate-500">Progress</p>
                <p className="mt-1 text-sm font-bold text-slate-900">{completedSet.size} / {roadmapWeaknesses.length} complete</p>
              </div>
            </div>
          </div>

          <div className={`mx-auto flex min-h-0 w-full ${embeddedDesktop ? 'max-w-5xl flex-1' : ''}`}>
            <div className={`relative w-full overflow-hidden rounded-[2rem] border ${embeddedDesktop ? 'border-slate-200/80 bg-[linear-gradient(180deg,#ffffff_0%,#f8fbff_100%)] px-8 py-7 shadow-[0_20px_44px_rgba(15,23,42,0.08)]' : 'border-violet-200/70 bg-[radial-gradient(circle_at_top,#ffffff_0%,#f6f0ff_38%,#eef4fb_100%)] p-6 shadow-[0_18px_36px_rgba(76,29,149,0.08)]'}`}>
              <div className={`${embeddedDesktop ? 'relative h-full min-h-[620px] [perspective:1400px]' : 'relative min-h-[540px]'}`}>
                <div className={`${embeddedDesktop ? 'absolute left-1/2 top-20 h-[66%] w-[184px] -translate-x-1/2 rounded-[999px] border border-slate-200/80 bg-[linear-gradient(180deg,#ffffff_0%,#f5f7fb_100%)] shadow-[inset_0_10px_24px_rgba(255,255,255,0.9),0_22px_40px_rgba(15,23,42,0.06)] [transform:translateX(-50%)_rotateX(58deg)]' : 'absolute left-1/2 top-12 h-[72%] w-[180px] -translate-x-1/2 rounded-[999px] bg-white/60'}`} />

                <div className={`${embeddedDesktop ? 'absolute left-1/2 top-20 h-[62%] w-1 -translate-x-1/2 rounded-full bg-[linear-gradient(180deg,#d8ccff_0%,#dbe3ef_100%)] opacity-90' : 'absolute left-1/2 top-14 h-[68%] w-1 -translate-x-1/2 rounded-full bg-[linear-gradient(180deg,#c4b5fd_0%,#e2e8f0_100%)]'}`} />

                {roadmapWeaknesses.map((weakness, idx) => {
                  const rootCause = getRootCauseForCriterion(weakness.criterion, weakness.rootCause)
                  const bundle = getBundleForRootCause(rootCause)
                  const icon = ROOT_CAUSE_ICONS[rootCause] || '📋'
                  const isCompleted = completedSet.has(idx)
                  const isPassed = passedSet.has(idx)
                  const isRecommended = idx === nextIdx && !allDone
                  const side = idx % 2 === 0 ? 'left' : 'right'
                  const topPercent = roadmapWeaknesses.length > 1 ? 12 + (idx * (56 / Math.max(roadmapWeaknesses.length - 1, 1))) : 28

                  return (
                    <div
                      key={`${weakness.criterion}-${idx}`}
                      className="absolute left-1/2 w-[calc(100%-2rem)] max-w-[720px] -translate-x-1/2"
                      style={{ top: `${topPercent}%` }}
                    >
                      <div className={`relative flex items-center ${side === 'left' ? 'justify-start pr-[43%]' : 'justify-end pl-[43%]'}`}>
                        <button
                          onClick={() => setActiveIdx(idx)}
                          className={`group relative w-full max-w-[236px] rounded-[1.35rem] border px-4 py-3.5 text-left transition-all duration-200 hover:-translate-y-1 hover:shadow-[0_18px_30px_rgba(15,23,42,0.10)] ${
                            isCompleted && isPassed
                              ? 'border-emerald-200 bg-emerald-50/96'
                              : isCompleted
                              ? 'border-amber-200 bg-amber-50/96'
                              : isRecommended
                              ? 'border-violet-300 bg-white ring-2 ring-violet-200/70 shadow-[0_20px_34px_rgba(109,40,217,0.12)]'
                              : 'border-slate-200 bg-white/96'
                          }`}
                          title={bundle.displayName}
                        >
                          <div className="flex items-center gap-3">
                            <div className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-[0.95rem] border text-xl ${
                              isCompleted && isPassed
                                ? 'border-emerald-200 bg-emerald-100/90'
                                : isCompleted
                                ? 'border-amber-200 bg-amber-100/90'
                                : isRecommended
                                ? 'border-violet-200 bg-violet-50'
                                : 'border-slate-200 bg-slate-50'
                            }`}>
                              <span>{icon}</span>
                            </div>
                            <div className="min-w-0 flex-1">
                              <p className="truncate text-sm font-black text-slate-900">{bundle.displayName}</p>
                              <div className="mt-1 flex items-center gap-2">
                                {weakness.score != null && (
                                  <span className="text-[10px] font-bold uppercase tracking-[0.16em] text-slate-400">
                                    {weakness.score}/10
                                  </span>
                                )}
                                <span className={`rounded-full px-2.5 py-1 text-[9px] font-black uppercase tracking-[0.16em] ${
                                  isCompleted && isPassed
                                    ? 'bg-emerald-100 text-emerald-700'
                                    : isCompleted
                                    ? 'bg-amber-100 text-amber-700'
                                    : isRecommended
                                    ? 'bg-violet-100 text-violet-700'
                                    : 'bg-slate-100 text-slate-500'
                                }`}>
                                  {isCompleted ? (isPassed ? 'Done' : 'Retry') : isRecommended ? 'Next' : 'Open'}
                                </span>
                              </div>
                            </div>
                          </div>
                        </button>

                        <div className="pointer-events-none absolute left-1/2 top-1/2 flex -translate-x-1/2 -translate-y-1/2 flex-col items-center">
                          <div className={`flex h-20 w-20 items-center justify-center rounded-full border-4 shadow-[0_16px_30px_rgba(15,23,42,0.12)] ${
                            isCompleted && isPassed
                              ? 'border-emerald-300 bg-emerald-500 text-white'
                              : isCompleted
                              ? 'border-amber-300 bg-amber-400 text-white'
                              : isRecommended
                              ? 'border-violet-300 bg-violet-600 text-white'
                              : 'border-slate-200 bg-white text-slate-400'
                          }`}>
                            {isCompleted && isPassed ? (
                              <CheckCircle className="h-9 w-9" />
                            ) : isCompleted ? (
                              <CheckCircle className="h-9 w-9" />
                            ) : (
                              <span className="text-3xl">{icon}</span>
                            )}
                          </div>
                          {isRecommended && (
                            <div className={`absolute ${side === 'left' ? '-left-20' : 'left-16'} top-1 flex items-center gap-2 rounded-full border border-violet-200 bg-white px-2.5 py-2 shadow-[0_16px_30px_rgba(109,40,217,0.12)]`}>
                              <div className="h-9 w-9 rounded-full bg-violet-50 p-1.5">
                                <PreppiSVG />
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  )
                })}

                {allDone && (
                  <div className="absolute bottom-4 left-1/2 w-full max-w-[420px] -translate-x-1/2">
                    <div className="rounded-[1.6rem] border border-emerald-200 bg-emerald-50/96 px-5 py-4 text-center shadow-[0_18px_36px_rgba(16,185,129,0.12)]">
                      <p className="text-xs font-black uppercase tracking-[0.2em] text-emerald-700">Ready</p>
                      <p className="mt-2 text-sm font-bold leading-7 text-emerald-800">
                        Every module is complete. You can retake this round or move forward.
                      </p>
                    </div>
                  </div>
                )}
              </div>

              {!embeddedDesktop && (
                <div className="mt-6">
                  <button
                    onClick={onViewReport}
                    className="btn-coach-secondary flex w-full items-center justify-center gap-2 py-3.5 text-sm"
                  >
                    <FileText className="w-4 h-4" />
                    Back to Feedback
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
