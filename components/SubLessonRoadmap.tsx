'use client'

import { useState, useEffect, useCallback } from 'react'
import { X, Star, CheckCircle, RotateCcw, Trophy } from 'lucide-react'
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
}

// 0,1,2 = sub-lessons; 3 = final voice
type ActiveSlot = 0 | 1 | 2 | 3 | null

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
}: SubLessonRoadmapProps) {
  const { ding } = useGameFeedback()

  const [activeSlot, setActiveSlot] = useState<ActiveSlot>(null)
  const [completedSet, setCompletedSet] = useState<Set<number>>(new Set())
  const [passedSet, setPassedSet] = useState<Set<number>>(new Set())
  const [sessionXp, setSessionXp] = useState(0)
  const [showConfetti, setShowConfetti] = useState(false)
  const [miniBurstIdx, setMiniBurstIdx] = useState<number | null>(null)
  const [preppiBadgeIdx, setPreppiBadgeIdx] = useState(0)

  const totalSlots = 4 // 3 sub-lessons + 1 final
  const allDone = completedSet.size === totalSlots

  const nextAvailable = [0, 1, 2, 3].find(i => !completedSet.has(i)) ?? null

  useEffect(() => { setPreppiBadgeIdx(0) }, [])

  const handleSlotComplete = useCallback((slotIdx: number, passed: boolean, xp: number) => {
    setActiveSlot(null)
    setCompletedSet(prev => { const n = new Set(prev); n.add(slotIdx); return n })
    if (passed) setPassedSet(prev => { const n = new Set(prev); n.add(slotIdx); return n })

    const newXp = sessionXp + xp
    setSessionXp(newXp)

    setMiniBurstIdx(slotIdx)
    ding()
    setTimeout(() => setMiniBurstIdx(null), 900)

    const nextIdx = [0, 1, 2, 3].find(i => i > slotIdx && !completedSet.has(i))
    if (nextIdx !== undefined) {
      setTimeout(() => setPreppiBadgeIdx(nextIdx), 500)
    }

    const newSize = completedSet.size + 1
    if (newSize === totalSlots) {
      setShowConfetti(true)
      setTimeout(() => setShowConfetti(false), 3500)
      setTimeout(() => onAllComplete(priorXp + newXp), 2800)
    }
  }, [sessionXp, completedSet, totalSlots, ding, onAllComplete, priorXp])

  // ── Render active lesson or voice challenge ────────────────────────────────

  if (activeSlot !== null && activeSlot < 3) {
    const subLesson = bundle.lessons[activeSlot]
    return (
      <PracticeLessonFlow
        subLesson={subLesson}
        lessonNumber={activeSlot + 1}
        totalLessons={3}
        onComplete={(passed, xp) => handleSlotComplete(activeSlot, passed, xp)}
        onClose={() => setActiveSlot(null)}
      />
    )
  }

  if (activeSlot === 3) {
    return (
      <FinalVoiceChallenge
        question={originalQuestion || 'Tell me about a challenge you overcame.'}
        originalAnswer={originalAnswer}
        sessionId={sessionId}
        currentStage={currentStage}
        criterion={criterion}
        onComplete={(passed, xp) => handleSlotComplete(3, passed, xp)}
        onClose={() => setActiveSlot(null)}
      />
    )
  }

  // ── Badge map ──────────────────────────────────────────────────────────────

  const SLOT_H = 138
  const BADGE_R = 48
  const W = 280
  const X_LEFT = 60
  const X_RIGHT = W - 60

  const centers = [0, 1, 2, 3].map(i => ({
    x: i % 2 === 0 ? X_LEFT : X_RIGHT,
    y: i * SLOT_H + BADGE_R,
  }))

  let pathD = `M ${centers[0].x} ${centers[0].y}`
  for (let i = 1; i < 4; i++) {
    const { x: x1, y: y1 } = centers[i - 1]
    const { x: x2, y: y2 } = centers[i]
    const midY = (y1 + y2) / 2
    pathD += ` C ${x1} ${midY} ${x2} ${midY} ${x2} ${y2}`
  }

  const buildSeg = (i: number) => {
    const { x: x1, y: y1 } = centers[i]
    const { x: x2, y: y2 } = centers[i + 1]
    const midY = (y1 + y2) / 2
    return `M ${x1} ${y1} C ${x1} ${midY} ${x2} ${midY} ${x2} ${y2}`
  }

  const slotLabels = bundle.lessons.map(l => l.title).concat(['Final Challenge'])
  const slotDifficulties = ['Easy', 'Medium', 'Hard', '🎤 Voice']

  const preppiMessage = allDone
    ? 'All four steps complete. You are ready to try it again.'
    : completedSet.size === 0
    ? 'Three focused drills, then one voice retry on the real question.'
    : `${totalSlots - completedSet.size} step${totalSlots - completedSet.size !== 1 ? 's' : ''} left. Stay with it.`

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-[linear-gradient(180deg,#f8fbff_0%,#eef5ff_100%)]">
      <Confetti active={showConfetti} />

      {/* Top bar */}
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

      {/* Scrollable badge path */}
      <div className="flex-1 overflow-y-auto">
        <div className="mx-auto max-w-sm px-4 py-8">

          {/* Preppi */}
          <div className="mb-10 text-center">
            <div className="mx-auto mb-4 flex h-20 w-20 items-center justify-center rounded-[1.7rem] bg-white/90 shadow-[0_18px_34px_rgba(15,23,42,0.08)] animate-preppi-bounce">
              <PreppiSVG />
            </div>
            <div className="inline-block max-w-[270px] rounded-[1.6rem] rounded-t-[0.45rem] border border-emerald-200/80 bg-white/96 px-4 py-3 shadow-[0_18px_34px_rgba(15,23,42,0.08)] animate-bubble-pop">
              <p className="text-sm font-bold leading-snug text-slate-800">{preppiMessage}</p>
            </div>
          </div>

          {/* Badge path */}
          <div className="relative mx-auto" style={{ width: W, height: 4 * SLOT_H + 60 }}>
            <svg className="absolute inset-0 pointer-events-none" width={W} height={4 * SLOT_H + 60} style={{ overflow: 'visible' }}>
              <path d={pathD} stroke="#d8e1ec" strokeWidth="8" strokeLinecap="round" fill="none" />
              {[0, 1, 2].map(i =>
                completedSet.has(i) ? (
                  <path key={i} d={buildSeg(i)} stroke="#2f7d32" strokeWidth="8" strokeLinecap="round" fill="none" className="transition-all duration-700" />
                ) : null
              )}
            </svg>

            {[0, 1, 2, 3].map(idx => {
              const isFinal = idx === 3
              const isCompleted = completedSet.has(idx)
              const isPassed = passedSet.has(idx)
              const isNext = idx === nextAvailable && !allDone
              const isMini = miniBurstIdx === idx
              const isPreppiHere = idx === preppiBadgeIdx && !allDone
              const cx = centers[idx].x
              const cy = centers[idx].y
              const isLocked = idx > 0 && !completedSet.has(idx - 1) && !isNext

              return (
                <div
                  key={idx}
                  className="absolute flex flex-col items-center"
                  style={{ left: cx - BADGE_R, top: cy - BADGE_R, width: BADGE_R * 2 }}
                >
                  <div className="absolute inset-0 pointer-events-none">
                    <MiniConfettiBurst active={isMini} />
                  </div>

                  {isPreppiHere && (
                    <div className={`absolute top-2 w-9 h-9 ${idx % 2 === 0 ? 'right-full -mr-1' : 'left-full -ml-1'}`}>
                      <PreppiSVG />
                    </div>
                  )}

                  <button
                    onClick={() => !isLocked && setActiveSlot(idx as ActiveSlot)}
                    disabled={isLocked}
                    className={`
                      w-24 h-24 rounded-full border-[5px] flex items-center justify-center
                      transition-all duration-500 relative overflow-hidden
                      ${!isLocked ? 'active:translate-y-1' : 'cursor-default'}
                      ${isCompleted && isPassed
                        ? 'bg-[#3f9a2b] border-[#26651c]'
                        : isCompleted
                        ? 'bg-amber-400 border-amber-600'
                        : isFinal && isNext
                        ? 'bg-amber-50 border-amber-400 shadow-[0_18px_28px_rgba(245,158,11,0.14)] animate-badge-pulse'
                        : isNext
                        ? 'bg-white border-[#3f9a2b] shadow-[0_18px_28px_rgba(63,154,43,0.12)] animate-badge-pulse'
                        : isLocked
                        ? 'bg-slate-200 border-slate-300 opacity-50'
                        : 'bg-white border-slate-300 hover:border-slate-400 hover:shadow-[0_14px_24px_rgba(15,23,42,0.08)]'
                      }
                    `}
                    style={{
                      boxShadow: isCompleted && isPassed
                        ? '0 6px 0 #174616, inset 0 2px 0 rgba(255,255,255,0.3)'
                        : isCompleted
                        ? '0 5px 0 #92400e, inset 0 2px 0 rgba(255,255,255,0.2)'
                        : isNext
                        ? '0 6px 0 #24561e'
                        : '0 4px 0 #94a3b8, inset 0 1px 0 rgba(255,255,255,0.55)',
                    }}
                  >
                    {isCompleted && isPassed ? (
                      <CheckCircle className="w-10 h-10 text-white drop-shadow-sm" />
                    ) : isCompleted ? (
                      <div className="flex flex-col items-center">
                        <RotateCcw className="w-5 h-5 text-amber-800" />
                        <span className="text-[9px] font-extrabold text-amber-800 mt-0.5">retry</span>
                      </div>
                    ) : isFinal ? (
                      <Trophy className="w-10 h-10 text-amber-600" />
                    ) : (
                      <span className="text-2xl font-extrabold text-slate-600">{idx + 1}</span>
                    )}
                  </button>

                  <p className={`mt-2 text-center text-[11px] font-extrabold leading-tight ${
                    isCompleted && isPassed ? 'text-emerald-700'
                    : isCompleted ? 'text-amber-700'
                    : isNext ? 'text-slate-800'
                    : 'text-slate-400'
                  }`}>
                    {slotLabels[idx]}
                  </p>
                  <p className="text-[10px] font-semibold text-slate-400">
                    {isCompleted && isPassed ? '✓ Done' : slotDifficulties[idx]}
                  </p>
                </div>
              )
            })}
          </div>
        </div>
      </div>
    </div>
  )
}
