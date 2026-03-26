'use client'

import { useState, useEffect, useCallback } from 'react'
import { X, FileText, CheckCircle, RotateCcw } from 'lucide-react'
import Confetti from '@/components/Confetti'
import { PreppiSVG } from '@/components/Preppi'
import { useGameFeedback } from '@/hooks/useGameFeedback'
import PracticeLessonFlow from '@/components/PracticeLessonFlow'
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
  /** XP already earned before entering this roadmap (e.g. from walkthrough) */
  priorXp?: number
  /** Called when every lesson has been completed */
  onAllComplete: (totalXp: number) => void
  onViewReport: () => void
  onClose: () => void
}

// ── Mini confetti burst ───────────────────────────────────────────────────────

function MiniConfettiBurst({ active }: { active: boolean }) {
  if (!active) return null
  const pieces = Array.from({ length: 18 }, (_, i) => ({
    id: i,
    color: ['#58CC02', '#FFC800', '#FF4B4B', '#1CB0F6', '#CE82FF'][i % 5],
    left: `${20 + Math.random() * 60}%`,
    delay: `${Math.random() * 0.3}s`,
    width: `${6 + Math.random() * 6}px`,
    height: `${6 + Math.random() * 6}px`,
  }))
  return (
    <div className="absolute inset-0 pointer-events-none overflow-hidden">
      {pieces.map(p => (
        <div
          key={p.id}
          className="mini-confetti-piece absolute top-0"
          style={{
            backgroundColor: p.color,
            left: p.left,
            animationDelay: p.delay,
            width: p.width,
            height: p.height,
          }}
        />
      ))}
    </div>
  )
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
}: LessonRoadmapProps) {
  const { ding } = useGameFeedback()

  // Which lesson is currently open in PracticeLessonFlow
  const [activeLessonIdx, setActiveLessonIdx] = useState<number | null>(null)

  // Which lessons are done (irrespective of pass/fail)
  const [completedSet, setCompletedSet] = useState<Set<number>>(new Set())
  // Which lessons were passed (score >= 7 on re-answer)
  const [passedSet, setPassedSet] = useState<Set<number>>(new Set())

  // XP earned inside the roadmap
  const [sessionXp, setSessionXp] = useState(0)

  // Full-screen confetti
  const [showConfetti, setShowConfetti] = useState(false)

  // Which badge just turned green (for animation trigger)
  const [justCompletedIdx, setJustCompletedIdx] = useState<number | null>(null)

  // Mini burst at a specific badge index
  const [miniBurstIdx, setMiniBurstIdx] = useState<number | null>(null)

  // Preppi hops to the next unfinished badge
  const [preppiBadgeIdx, setPreppiBadgeIdx] = useState(0)
  const [preppiHopping, setPreppiHopping] = useState(false)

  // All lessons done?
  const allDone = completedSet.size === weaknesses.length

  // Next unstarted lesson
  const nextAvailableIdx = weaknesses.findIndex((_, i) => !completedSet.has(i))

  // ── Start a lesson ─────────────────────────────────────────────────────────

  const handleStartLesson = useCallback((idx: number) => {
    setActiveLessonIdx(idx)
  }, [])

  // ── Lesson complete callback ───────────────────────────────────────────────

  const handleLessonComplete = useCallback(
    (passed: boolean, xp: number) => {
      if (activeLessonIdx === null) return
      const idx = activeLessonIdx

      setActiveLessonIdx(null)

      setCompletedSet(prev => {
        const next = new Set(prev)
        next.add(idx)
        return next
      })

      if (passed) {
        setPassedSet(prev => {
          const next = new Set(prev)
          next.add(idx)
          return next
        })
      }

      const newXp = sessionXp + xp
      setSessionXp(newXp)

      // Badge animation + mini burst
      setJustCompletedIdx(idx)
      setMiniBurstIdx(idx)
      ding()

      setTimeout(() => setMiniBurstIdx(null), 900)
      setTimeout(() => {
        setJustCompletedIdx(null)

        // Preppi hops to next badge
        const nextIdx = weaknesses.findIndex((_, i) => i > idx && !completedSet.has(i))
        if (nextIdx !== -1) {
          setPreppiHopping(true)
          setTimeout(() => {
            setPreppiBadgeIdx(nextIdx)
            setPreppiHopping(false)
          }, 500)
        }
      }, 800)

      // Full confetti if all done
      const newSize = completedSet.size + 1
      if (newSize === weaknesses.length) {
        setShowConfetti(true)
        setTimeout(() => setShowConfetti(false), 3500)
        setTimeout(() => onAllComplete(priorXp + newXp), 2800)
      }
    },
    [activeLessonIdx, completedSet, sessionXp, weaknesses, ding, onAllComplete, priorXp],
  )

  const handleLessonClose = useCallback(() => {
    setActiveLessonIdx(null)
  }, [])

  // Init: Preppi starts at first badge
  useEffect(() => {
    setPreppiBadgeIdx(0)
  }, [])

  // ── Render active lesson ───────────────────────────────────────────────────

  if (activeLessonIdx !== null) {
    const weakness = weaknesses[activeLessonIdx]
    const rootCause = getRootCauseForCriterion(weakness.criterion, weakness.rootCause)
    const bundle = getBundleForRootCause(rootCause)
    const evidence = weakness.evidence?.[0]

    return (
      <PracticeLessonFlow
        bundle={bundle}
        criterion={weakness.criterion}
        originalQuestion={evidence?.question}
        originalAnswer={evidence?.excerpt}
        sessionId={sessionId}
        currentStage={currentStage}
        onComplete={handleLessonComplete}
        onClose={handleLessonClose}
      />
    )
  }

  // ── Preppi message ─────────────────────────────────────────────────────────

  const preppiMessage = allDone
    ? "You've completed every skill! You're on fire! 🔥"
    : completedSet.size === 0
    ? 'Here are the skills to work on. Tap one to begin!'
    : `Great work! ${weaknesses.length - completedSet.size} skill${weaknesses.length - completedSet.size !== 1 ? 's' : ''} left — keep going!`

  // ── Render roadmap ─────────────────────────────────────────────────────────

  return (
    <div className="fixed inset-0 z-50 bg-white flex flex-col">
      <Confetti active={showConfetti} />

      {/* ── Top bar ── */}
      <div className="shrink-0 px-4 py-3 flex items-center justify-between border-b border-gray-100">
        <button
          onClick={onClose}
          className="p-1.5 text-gray-300 hover:text-gray-500 transition-colors"
          aria-label="Close"
        >
          <X className="w-5 h-5" />
        </button>
        <p className="text-xs font-extrabold uppercase tracking-widest text-gray-500">
          Practice Session
        </p>
        {sessionXp > 0 ? (
          <span className="text-sm font-extrabold text-amber-500 tabular-nums">+{sessionXp} XP</span>
        ) : (
          <div className="w-8" />
        )}
      </div>

      {/* ── Scrollable content ── */}
      <div className="flex-1 overflow-y-auto">
        <div className="max-w-xs mx-auto px-4 py-8">

          {/* Preppi */}
          <div className="text-center mb-10">
            <div className="w-20 h-20 mx-auto mb-3 animate-preppi-bounce">
              <PreppiSVG />
            </div>
            <div className="bg-gray-50 border border-gray-100 rounded-2xl rounded-t-sm px-4 py-3 inline-block max-w-[260px] animate-bubble-pop">
              <p className="text-sm text-gray-700 font-medium leading-snug">{preppiMessage}</p>
            </div>
          </div>

          {/* ── Badge path ── */}
          <div className="flex flex-col items-center">
            {weaknesses.map((weakness, idx) => {
              const rootCause = getRootCauseForCriterion(weakness.criterion, weakness.rootCause)
              const bundle = getBundleForRootCause(rootCause)
              const icon = ROOT_CAUSE_ICONS[rootCause] || '📋'
              const isCompleted = completedSet.has(idx)
              const isPassed = passedSet.has(idx)
              const isJustCompleted = justCompletedIdx === idx
              const isMini = miniBurstIdx === idx
              const isNext = idx === nextAvailableIdx && !allDone
              const isPreppiHere = idx === preppiBadgeIdx && !allDone
              const isLast = idx === weaknesses.length - 1
              const canStart = true // all available

              return (
                <div key={idx} className="flex flex-col items-center w-full">
                  {/* Badge row */}
                  <div className="relative flex items-center justify-center">
                    {/* Mini confetti burst */}
                    <div className="absolute inset-0">
                      <MiniConfettiBurst active={isMini} />
                    </div>

                    {/* Preppi hops here */}
                    {isPreppiHere && (
                      <div
                        className={`absolute right-full mr-4 w-10 h-10 ${
                          preppiHopping ? 'animate-preppi-hop' : ''
                        }`}
                      >
                        <PreppiSVG />
                      </div>
                    )}

                    {/* The badge */}
                    <button
                      onClick={() => canStart && handleStartLesson(idx)}
                      disabled={!canStart}
                      className={`
                        w-20 h-20 rounded-full border-4 flex items-center justify-center
                        transition-all duration-500 shadow-md relative overflow-hidden
                        ${
                          isCompleted && isPassed
                            ? `bg-[#58CC02] border-[#46a302] ${isJustCompleted ? 'animate-badge-fill-green' : ''}`
                            : isCompleted
                            ? 'bg-amber-400 border-amber-500'
                            : isNext
                            ? 'bg-white border-[#58CC02] animate-badge-pulse'
                            : 'bg-white border-gray-200 hover:border-[#58CC02]/50'
                        }
                      `}
                      style={{
                        boxShadow:
                          isCompleted && isPassed
                            ? '0 4px 14px rgba(88, 204, 2, 0.4)'
                            : isNext
                            ? '0 4px 14px rgba(88, 204, 2, 0.3)'
                            : '0 2px 8px rgba(0,0,0,0.08)',
                      }}
                    >
                      {isCompleted && isPassed ? (
                        <CheckCircle className="w-9 h-9 text-white" />
                      ) : isCompleted ? (
                        <div className="flex flex-col items-center">
                          <RotateCcw className="w-5 h-5 text-amber-700" />
                          <span className="text-[9px] font-bold text-amber-700 mt-0.5">retry</span>
                        </div>
                      ) : (
                        <span className="text-3xl">{icon}</span>
                      )}
                    </button>
                  </div>

                  {/* Label */}
                  <p
                    className={`text-xs font-extrabold mt-2 text-center ${
                      isCompleted && isPassed
                        ? 'text-green-600'
                        : isCompleted
                        ? 'text-amber-600'
                        : isNext
                        ? 'text-gray-800'
                        : 'text-gray-500'
                    }`}
                  >
                    {bundle.displayName}
                  </p>
                  {weakness.score != null && (
                    <p
                      className={`text-[11px] font-semibold mt-0.5 tabular-nums ${
                        isCompleted && isPassed
                          ? 'text-green-500'
                          : 'text-gray-400'
                      }`}
                    >
                      {isCompleted && isPassed ? '✓ Passed' : `${weakness.score}/10`}
                    </p>
                  )}

                  {/* Connector line */}
                  {!isLast && (
                    <div
                      className={`w-0.5 h-12 my-1 rounded-full transition-colors duration-700 ${
                        isCompleted ? 'bg-green-200' : 'bg-gray-200'
                      }`}
                    />
                  )}
                </div>
              )
            })}
          </div>

          {/* ── Bottom actions ── */}
          <div className="mt-10 space-y-3">
            {allDone && (
              <div className="text-center mb-2 animate-slide-up">
                <div className="inline-flex items-center gap-2 px-4 py-2 bg-green-50 border border-green-200 rounded-full">
                  <CheckCircle className="w-4 h-4 text-green-600" />
                  <span className="text-sm font-bold text-green-700">All skills completed!</span>
                </div>
              </div>
            )}
            <button
              onClick={onViewReport}
              className="w-full btn-duo-white flex items-center justify-center gap-2 py-3.5 text-sm"
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
