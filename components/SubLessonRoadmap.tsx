'use client'

import { useState, useCallback, useEffect } from 'react'
import { X, CheckCircle, RotateCcw, Trophy, ChevronRight, Mic, ArrowLeft, ChevronRight as CrumbChevron } from 'lucide-react'
import Confetti from '@/components/Confetti'
import { PreppiSVG } from '@/components/Preppi'
import { useGameFeedback } from '@/hooks/useGameFeedback'
import PracticeLessonFlow from '@/components/PracticeLessonFlow'
import FinalVoiceChallenge from '@/components/FinalVoiceChallenge'
import type { PracticeBundle } from '@/lib/practice-bundles'

// ── Mini confetti burst ───────────────────────────────────────────────────────

function MiniConfettiBurst({ active }: { active: boolean }) {
  if (!active) return null
  const pieces = Array.from({ length: 16 }, (_, i) => ({
    id: i,
    color: ['#58CC02', '#FFC800', '#FF4B4B', '#1CB0F6', '#CE82FF'][i % 5],
    left: `${20 + Math.random() * 60}%`,
    delay: `${Math.random() * 0.3}s`,
    size: `${6 + Math.random() * 6}px`,
  }))
  return (
    <div className="absolute inset-0 pointer-events-none overflow-hidden">
      {pieces.map(p => (
        <div
          key={p.id}
          className="mini-confetti-piece absolute top-0"
          style={{ backgroundColor: p.color, left: p.left, animationDelay: p.delay, width: p.size, height: p.size }}
        />
      ))}
    </div>
  )
}

// ── Types ─────────────────────────────────────────────────────────────────────

interface SubLessonRoadmapProps {
  bundle: PracticeBundle
  criterion: string
  originalQuestion?: string
  originalAnswer?: string
  sessionId?: string
  currentStage?: string
  priorXp?: number
  onAllComplete: (totalXp: number) => void
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

// 0,1,2 = sub-lessons; 3 = final voice
type ActiveSlot = 0 | 1 | 2 | 3 | null

const SLOT_DIFFICULTIES = ['Lesson 1', 'Lesson 2', 'Lesson 3', 'Final'] as const

// ── Component ─────────────────────────────────────────────────────────────────

export default function SubLessonRoadmap({
  bundle,
  criterion,
  originalQuestion,
  originalAnswer,
  sessionId,
  currentStage,
  priorXp = 0,
  onAllComplete,
  onClose,
  embeddedDesktop = false,
  onContextChange,
}: SubLessonRoadmapProps) {
  const { ding } = useGameFeedback()

  const [activeSlot, setActiveSlot] = useState<ActiveSlot>(null)
  const [completedSet, setCompletedSet] = useState<Set<number>>(new Set())
  const [passedSet, setPassedSet] = useState<Set<number>>(new Set())
  const [sessionXp, setSessionXp] = useState(0)
  const [showConfetti, setShowConfetti] = useState(false)
  const [miniBurstIdx, setMiniBurstIdx] = useState<number | null>(null)
  const totalSlots = 4 // 3 sub-lessons + 1 final
  const allDone = completedSet.size === totalSlots

  const nextAvailable = [0, 1, 2, 3].find(i => !completedSet.has(i)) ?? null
  const slotLabels = bundle.lessons.map(l => l.title).concat(['Voice Re-Answer'])

  const handleSlotComplete = useCallback((slotIdx: number, passed: boolean, xp: number) => {
    setActiveSlot(null)
    setCompletedSet(prev => { const n = new Set(prev); n.add(slotIdx); return n })
    if (passed) setPassedSet(prev => { const n = new Set(prev); n.add(slotIdx); return n })

    const newXp = sessionXp + xp
    setSessionXp(newXp)

    setMiniBurstIdx(slotIdx)
    ding()
    setTimeout(() => setMiniBurstIdx(null), 900)

    const newSize = completedSet.size + 1
    if (newSize === totalSlots) {
      setShowConfetti(true)
      setTimeout(() => setShowConfetti(false), 3500)
      setTimeout(() => onAllComplete(priorXp + newXp), 2800)
    }
  }, [sessionXp, completedSet, totalSlots, ding, onAllComplete, priorXp])

  useEffect(() => {
    if (!onContextChange) return
    onContextChange({
      title: bundle.displayName,
      items: [0, 1, 2, 3].map((idx) => {
        const isCompleted = completedSet.has(idx)
        const isCurrent = activeSlot === idx || (activeSlot === null && idx === nextAvailable && !allDone)
        const isLocked = idx > 0 && !completedSet.has(idx - 1) && !isCurrent
        return {
          label: slotLabels[idx],
          status: isCompleted ? 'complete' as const : isCurrent ? 'current' as const : isLocked ? 'locked' as const : 'upcoming' as const,
          meta: SLOT_DIFFICULTIES[idx],
        }
      }),
    })
  }, [activeSlot, allDone, bundle.displayName, completedSet, nextAvailable, onContextChange, slotLabels])

  // ── Render active lesson or voice challenge ────────────────────────────────

  if (activeSlot !== null && activeSlot < 3) {
    const subLesson = bundle.lessons[activeSlot]
    return (
      <div className={`mx-auto h-full max-w-4xl px-4 ${embeddedDesktop ? 'py-4 lg:px-8' : 'py-8'}`}>
        {embeddedDesktop && (
          <div className="mb-4 rounded-[1.6rem] border border-white/70 bg-white/78 px-5 py-4 shadow-[0_14px_28px_rgba(15,23,42,0.06)] backdrop-blur">
            <div className="flex items-start justify-between gap-4">
              <div className="min-w-0">
                <div className="flex items-center gap-2 text-[11px] font-black uppercase tracking-[0.18em] text-violet-500">
                  <span>{bundle.displayName}</span>
                  <CrumbChevron className="h-3.5 w-3.5 text-slate-300" />
                  <span>{subLesson.title}</span>
                </div>
                <h2 className="mt-2 text-2xl font-black text-slate-900">{subLesson.title}</h2>
                <p className="mt-1 text-sm text-slate-500">
                  Lesson {activeSlot + 1} of 3 in {bundle.displayName.toLowerCase()}.
                </p>
              </div>
              <button
                onClick={() => setActiveSlot(null)}
                className="inline-flex shrink-0 items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-2 text-xs font-bold text-slate-600 transition hover:border-slate-300 hover:text-slate-800"
              >
                <ArrowLeft className="h-3.5 w-3.5" />
                Back to Path
              </button>
            </div>
            <div className="mt-4 flex items-center gap-3">
              <div className="h-3 flex-1 overflow-hidden rounded-full bg-slate-100">
                <div
                  className="h-full rounded-full bg-[linear-gradient(90deg,#8b5cf6_0%,#6d28d9_100%)]"
                  style={{ width: `${((activeSlot + 1) / 4) * 100}%` }}
                />
              </div>
              <span className="text-xs font-bold uppercase tracking-[0.16em] text-slate-400">
                Step {activeSlot + 1} / 4
              </span>
            </div>
          </div>
        )}
        <PracticeLessonFlow
          subLesson={subLesson}
          lessonNumber={activeSlot + 1}
          totalLessons={3}
          onComplete={(passed, xp) => handleSlotComplete(activeSlot, passed, xp)}
          onClose={() => setActiveSlot(null)}
          embeddedDesktop={embeddedDesktop}
        />
      </div>
    )
  }

  if (activeSlot === 3) {
    return (
      <div className={`mx-auto h-full max-w-4xl px-4 ${embeddedDesktop ? 'py-4 lg:px-8' : 'py-8'}`}>
        {embeddedDesktop && (
          <div className="mb-4 rounded-[1.6rem] border border-white/70 bg-white/78 px-5 py-4 shadow-[0_14px_28px_rgba(15,23,42,0.06)] backdrop-blur">
            <div className="flex items-start justify-between gap-4">
              <div className="min-w-0">
                <div className="flex items-center gap-2 text-[11px] font-black uppercase tracking-[0.18em] text-violet-500">
                  <span>{bundle.displayName}</span>
                  <CrumbChevron className="h-3.5 w-3.5 text-slate-300" />
                  <span>Voice Re-Answer</span>
                </div>
                <h2 className="mt-2 text-2xl font-black text-slate-900">Voice Re-Answer</h2>
                <p className="mt-1 text-sm text-slate-500">
                  Final step. Re-answer the original question with the improved structure.
                </p>
              </div>
              <button
                onClick={() => setActiveSlot(null)}
                className="inline-flex shrink-0 items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-2 text-xs font-bold text-slate-600 transition hover:border-slate-300 hover:text-slate-800"
              >
                <ArrowLeft className="h-3.5 w-3.5" />
                Back to Path
              </button>
            </div>
            <div className="mt-4 flex items-center gap-3">
              <div className="h-3 flex-1 overflow-hidden rounded-full bg-slate-100">
                <div
                  className="h-full rounded-full bg-[linear-gradient(90deg,#8b5cf6_0%,#6d28d9_100%)]"
                  style={{ width: '100%' }}
                />
              </div>
              <span className="text-xs font-bold uppercase tracking-[0.16em] text-slate-400">
                Step 4 / 4
              </span>
            </div>
          </div>
        )}
        <FinalVoiceChallenge
          question={originalQuestion || 'Tell me about a challenge you overcame.'}
          originalAnswer={originalAnswer}
          sessionId={sessionId}
          currentStage={currentStage}
          criterion={criterion}
          onComplete={(passed, xp) => handleSlotComplete(3, passed, xp)}
          onClose={() => setActiveSlot(null)}
          embeddedDesktop={embeddedDesktop}
        />
      </div>
    )
  }

  const preppiMessage = allDone
    ? 'All four steps complete. You are ready to try it again.'
    : completedSet.size === 0
    ? 'Three focused drills, then one voice retry on the real question.'
    : `${totalSlots - completedSet.size} step${totalSlots - completedSet.size !== 1 ? 's' : ''} left. Stay with it.`

  return (
    <div className={`${embeddedDesktop ? 'flex h-full flex-col bg-transparent' : 'fixed inset-0 z-50 flex flex-col bg-[linear-gradient(180deg,#faf7ff_0%,#f4f7ff_48%,#eef4fb_100%)]'}`}>
      <Confetti active={showConfetti} />

      {!embeddedDesktop && (
        <div className="shrink-0 border-b border-slate-100 bg-white/82 px-4 py-3 backdrop-blur-xl">
          <div className="mx-auto flex w-full max-w-3xl items-center justify-between">
            <button onClick={onClose} className="p-1.5 text-gray-300 transition-colors hover:text-gray-500">
              <X className="w-5 h-5" />
            </button>
            <p className="text-xs font-extrabold uppercase tracking-[0.28em] text-slate-500">
              {bundle.displayName}
            </p>
            {sessionXp > 0
              ? <span className="text-sm font-extrabold text-amber-500 tabular-nums">+{sessionXp} XP</span>
              : <div className="w-8" />
            }
          </div>
        </div>
      )}

      <div className="flex-1 overflow-hidden">
        <div className={`mx-auto h-full max-w-4xl px-4 ${embeddedDesktop ? 'py-4 lg:px-8' : 'py-8'}`}>

          {/* Preppi */}
          <div className="mb-8 text-center">
            <div className="mx-auto mb-4 flex h-20 w-20 items-center justify-center rounded-[1.7rem] bg-white/92 shadow-[0_18px_34px_rgba(76,29,149,0.08)] animate-preppi-bounce">
              <PreppiSVG />
            </div>
            <div className="inline-block max-w-[320px] rounded-[1.6rem] rounded-t-[0.45rem] border border-violet-200/80 bg-white/96 px-4 py-3 shadow-[0_18px_34px_rgba(76,29,149,0.08)] animate-bubble-pop">
              <p className="text-sm font-bold leading-snug text-slate-800">{preppiMessage}</p>
            </div>
          </div>

          <div className="premium-panel overflow-hidden p-5 sm:p-6">
            <div className="mb-5 flex items-center justify-between">
              <div>
                <p className="text-xs font-black uppercase tracking-[0.24em] text-violet-500">Coaching Path</p>
                <h3 className="mt-1 text-xl font-black text-slate-900">{criterion}</h3>
                <p className="mt-1 text-sm text-slate-500">{bundle.displayName}</p>
              </div>
              <div className="rounded-full border border-violet-200 bg-violet-50 px-3 py-1 text-xs font-bold text-violet-700">
                4 steps
              </div>
            </div>

            <div className="space-y-4">
              {[0, 1, 2, 3].map(idx => {
                const isFinal = idx === 3
                const isCompleted = completedSet.has(idx)
                const isPassed = passedSet.has(idx)
                const isNext = idx === nextAvailable && !allDone
                const isMini = miniBurstIdx === idx
                const isLocked = idx > 0 && !completedSet.has(idx - 1) && !isNext

                return (
                  <div key={idx} className="relative">
                    {idx < 3 && (
                      <div className={`absolute left-6 top-14 h-[calc(100%+0.75rem)] w-[2px] ${
                        completedSet.has(idx) ? 'bg-emerald-400' : 'bg-slate-200'
                      }`} />
                    )}

                    <div className="absolute inset-0 pointer-events-none">
                      <MiniConfettiBurst active={isMini} />
                    </div>

                    <button
                      onClick={() => !isLocked && setActiveSlot(idx as ActiveSlot)}
                      disabled={isLocked}
                      className={`flex w-full items-start gap-4 rounded-[1.5rem] border p-4 text-left transition-all ${
                        isLocked ? 'cursor-default opacity-55' : 'cursor-pointer active:scale-[0.99] hover:shadow-[0_18px_30px_rgba(15,23,42,0.08)]'
                      } ${
                        isCompleted && isPassed
                          ? 'border-emerald-200 bg-emerald-50/90'
                          : isCompleted
                          ? 'border-amber-200 bg-amber-50'
                          : isNext
                          ? 'border-violet-200 bg-violet-50/85 shadow-[0_16px_28px_rgba(109,40,217,0.08)]'
                          : 'border-slate-200/80 bg-white/96'
                      }`}
                    >
                      <div className={`relative z-10 flex h-12 w-12 shrink-0 items-center justify-center rounded-[1rem] ${
                        isCompleted && isPassed
                          ? 'bg-emerald-500 text-white'
                          : isCompleted
                          ? 'bg-amber-400 text-amber-900'
                          : isFinal
                          ? 'bg-violet-100 text-violet-700'
                          : 'bg-white text-violet-700 ring-1 ring-violet-200'
                      }`}>
                        {isCompleted && isPassed ? (
                          <CheckCircle className="h-6 w-6" />
                        ) : isCompleted ? (
                          <RotateCcw className="h-5 w-5" />
                        ) : isFinal ? (
                          <Mic className="h-5 w-5" />
                        ) : (
                          <span className="text-sm font-black">{idx + 1}</span>
                        )}
                      </div>

                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <p className="text-sm font-black text-slate-900">{slotLabels[idx]}</p>
                          <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${
                            isCompleted && isPassed
                              ? 'bg-emerald-100 text-emerald-700'
                              : isCompleted
                              ? 'bg-amber-100 text-amber-700'
                              : isFinal
                              ? 'bg-violet-100 text-violet-700'
                              : 'bg-slate-100 text-slate-500'
                          }`}>
                            {isCompleted && isPassed ? 'Passed' : SLOT_DIFFICULTIES[idx]}
                          </span>
                        </div>
                        <p className="mt-1 text-sm leading-6 text-slate-600">
                          {idx < 3
                            ? 'Learn the tactic, drill it, then move to the next coaching step.'
                            : 'Answer the original flagged question again with the new approach.'}
                        </p>
                      </div>

                      {!isLocked && !isCompleted && <ChevronRight className="mt-1 h-5 w-5 shrink-0 text-slate-400" />}
                    </button>
                  </div>
                )
              })}
            </div>

            {allDone && (
              <div className="mt-6 rounded-[1.4rem] border border-emerald-200 bg-emerald-50 px-4 py-4 text-center">
                <div className="mb-2 inline-flex items-center gap-2 rounded-full bg-white px-3 py-1 text-xs font-bold text-emerald-700 shadow-sm">
                  <Trophy className="h-3.5 w-3.5" />
                  Practice complete
                </div>
                <p className="text-sm font-semibold text-emerald-800">You have completed all four coaching steps for this skill.</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
