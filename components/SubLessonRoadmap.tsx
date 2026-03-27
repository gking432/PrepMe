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
    ? 'All done! You crushed it! 🔥'
    : completedSet.size === 0
    ? `Three lessons, then the real thing. Start with Lesson 1!`
    : `Keep going — ${totalSlots - completedSet.size} left!`

  return (
    <div className="fixed inset-0 z-50 bg-white flex flex-col">
      <Confetti active={showConfetti} />

      {/* Top bar */}
      <div className="shrink-0 px-4 py-3 flex items-center justify-between border-b border-gray-100">
        <button onClick={onClose} className="p-1.5 text-gray-300 hover:text-gray-500 transition-colors">
          <X className="w-5 h-5" />
        </button>
        <p className="text-xs font-extrabold uppercase tracking-widest text-gray-500">
          {bundle.displayName}
        </p>
        {sessionXp > 0
          ? <span className="text-sm font-extrabold text-amber-500 tabular-nums">+{sessionXp} XP</span>
          : <div className="w-8" />
        }
      </div>

      {/* Scrollable badge path */}
      <div className="flex-1 overflow-y-auto bg-[#f0fdf4]">
        <div className="max-w-sm mx-auto px-4 py-8">

          {/* Preppi */}
          <div className="text-center mb-10">
            <div className="w-20 h-20 mx-auto mb-3 animate-preppi-bounce">
              <PreppiSVG />
            </div>
            <div className="bg-white border border-[#86efac] rounded-2xl rounded-t-sm px-4 py-3 inline-block max-w-[260px] animate-bubble-pop shadow-sm">
              <p className="text-sm font-bold text-gray-800 leading-snug">{preppiMessage}</p>
            </div>
          </div>

          {/* Badge path */}
          <div className="relative mx-auto" style={{ width: W, height: 4 * SLOT_H + 60 }}>
            <svg className="absolute inset-0 pointer-events-none" width={W} height={4 * SLOT_H + 60} style={{ overflow: 'visible' }}>
              <path d={pathD} stroke="#d1d5db" strokeWidth="8" strokeLinecap="round" fill="none" />
              {[0, 1, 2].map(i =>
                completedSet.has(i) ? (
                  <path key={i} d={buildSeg(i)} stroke="#58CC02" strokeWidth="8" strokeLinecap="round" fill="none" className="transition-all duration-700" />
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
                        ? 'bg-[#58CC02] border-[#2d8f00]'
                        : isCompleted
                        ? 'bg-amber-400 border-amber-600'
                        : isFinal && isNext
                        ? 'bg-amber-50 border-amber-400 animate-badge-pulse'
                        : isNext
                        ? 'bg-white border-[#58CC02] animate-badge-pulse'
                        : isLocked
                        ? 'bg-[#e5e5e5] border-[#c0c0c0] opacity-50'
                        : 'bg-[#e5e5e5] border-[#c0c0c0]'
                      }
                    `}
                    style={{
                      boxShadow: isCompleted && isPassed
                        ? '0 6px 0 #1a5e00, inset 0 2px 0 rgba(255,255,255,0.3)'
                        : isCompleted
                        ? '0 5px 0 #92400e, inset 0 2px 0 rgba(255,255,255,0.2)'
                        : isNext
                        ? '0 6px 0 #46a302'
                        : '0 4px 0 #a0a0a0, inset 0 1px 0 rgba(255,255,255,0.5)',
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
                      <span className="text-2xl font-extrabold text-gray-600">{idx + 1}</span>
                    )}
                  </button>

                  <p className={`text-[11px] font-extrabold mt-2 text-center leading-tight ${
                    isCompleted && isPassed ? 'text-green-600'
                    : isCompleted ? 'text-amber-600'
                    : isNext ? 'text-gray-800'
                    : 'text-gray-400'
                  }`}>
                    {slotLabels[idx]}
                  </p>
                  <p className="text-[10px] text-gray-400 font-semibold">
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
