'use client'

import { useState, useCallback } from 'react'
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

const ROOT_CAUSE_COLORS: Record<string, { bg: string; border: string; text: string; pill: string }> = {
  poor_structure:      { bg: 'bg-blue-50',   border: 'border-blue-200',   text: 'text-blue-700',   pill: 'bg-blue-100 text-blue-700' },
  lack_of_specificity: { bg: 'bg-purple-50', border: 'border-purple-200', text: 'text-purple-700', pill: 'bg-purple-100 text-purple-700' },
  weak_communication:  { bg: 'bg-orange-50', border: 'border-orange-200', text: 'text-orange-700', pill: 'bg-orange-100 text-orange-700' },
  missing_knowledge:   { bg: 'bg-cyan-50',   border: 'border-cyan-200',   text: 'text-cyan-700',   pill: 'bg-cyan-100 text-cyan-700' },
  off_topic:           { bg: 'bg-rose-50',   border: 'border-rose-200',   text: 'text-rose-700',   pill: 'bg-rose-100 text-rose-700' },
  too_short:           { bg: 'bg-emerald-50',border: 'border-emerald-200',text: 'text-emerald-700',pill: 'bg-emerald-100 text-emerald-700' },
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

  const [activeIdx, setActiveIdx] = useState<number | null>(null)
  const [completedSet, setCompletedSet] = useState<Set<number>>(new Set())
  const [passedSet, setPassedSet] = useState<Set<number>>(new Set())
  const [sessionXp, setSessionXp] = useState(0)
  const [showConfetti, setShowConfetti] = useState(false)

  const allDone = completedSet.size === weaknesses.length

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
      />
    )
  }

  const preppiMessage = allDone
    ? "You've completed every skill! You're on fire! 🔥"
    : completedSet.size === 0
    ? 'Here are your practice areas. Tap one to begin!'
    : `${weaknesses.length - completedSet.size} area${weaknesses.length - completedSet.size !== 1 ? 's' : ''} left — keep going!`

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-[linear-gradient(180deg,#fbfdff_0%,#f1f7ff_100%)]">
      <Confetti active={showConfetti} />

      {/* Top bar */}
      <div className="shrink-0 border-b border-slate-100 bg-white/80 px-4 py-3 backdrop-blur-xl">
        <div className="mx-auto flex w-full max-w-3xl items-center justify-between">
        <button onClick={onClose} className="p-1.5 text-gray-300 hover:text-gray-500 transition-colors">
          <X className="w-5 h-5" />
        </button>
        <p className="text-xs font-extrabold uppercase tracking-widest text-gray-500">Practice</p>
        {sessionXp > 0
          ? <span className="text-sm font-extrabold text-amber-500 tabular-nums">+{sessionXp} XP</span>
          : <div className="w-8" />
        }
        </div>
      </div>

      {/* Scrollable content */}
      <div className="flex-1 overflow-y-auto">
        <div className="max-w-sm mx-auto px-4 py-8">

          {/* Preppi */}
          <div className="text-center mb-8">
            <div className="w-20 h-20 mx-auto mb-3 animate-preppi-bounce">
              <PreppiSVG />
            </div>
            <div className="inline-block max-w-[260px] rounded-2xl rounded-t-sm border border-emerald-200 bg-white/96 px-4 py-3 shadow-[0_16px_30px_rgba(15,23,42,0.08)]">
              <p className="text-sm font-bold text-gray-800 leading-snug">{preppiMessage}</p>
            </div>
          </div>

          {/* Lesson list */}
          <div className="space-y-3">
            {weaknesses.map((weakness, idx) => {
              const rootCause = getRootCauseForCriterion(weakness.criterion, weakness.rootCause)
              const bundle = getBundleForRootCause(rootCause)
              const icon = ROOT_CAUSE_ICONS[rootCause] || '📋'
              const colors = ROOT_CAUSE_COLORS[rootCause] || ROOT_CAUSE_COLORS.poor_structure
              const isCompleted = completedSet.has(idx)
              const isPassed = passedSet.has(idx)
              const isLocked = idx > 0 && !completedSet.has(idx - 1)

              return (
                <button
                  key={idx}
                  onClick={() => !isLocked && setActiveIdx(idx)}
                  disabled={isLocked}
                  className={`
                    w-full rounded-[1.4rem] border p-4 text-left transition-all duration-200
                    ${isLocked ? 'opacity-50 cursor-default' : 'active:scale-[0.98] cursor-pointer hover:shadow-md'}
                    ${isCompleted && isPassed
                      ? 'bg-[#f0fdf4] border-[#86efac]'
                      : isCompleted
                      ? 'bg-amber-50 border-amber-200'
                      : colors.bg + ' ' + colors.border
                    }
                  `}
                >
                  <div className="flex items-center gap-4">
                    {/* Icon circle */}
                    <div className={`w-14 h-14 rounded-full flex items-center justify-center shrink-0 text-2xl ${
                      isCompleted && isPassed ? 'bg-[#58CC02]' : isCompleted ? 'bg-amber-400' : 'bg-white border-2 ' + colors.border
                    }`}
                      style={isCompleted && isPassed ? { boxShadow: '0 4px 0 #1a5e00' } : isCompleted ? { boxShadow: '0 4px 0 #92400e' } : {}}
                    >
                      {isCompleted && isPassed
                        ? <CheckCircle className="w-7 h-7 text-white" />
                        : <span>{icon}</span>
                      }
                    </div>

                    {/* Text */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-0.5">
                        <p className={`text-sm font-extrabold leading-tight ${
                          isCompleted && isPassed ? 'text-[#2a7a00]' : isCompleted ? 'text-amber-800' : 'text-gray-900'
                        }`}>
                          {bundle.displayName}
                        </p>
                        {isLocked && <Lock className="w-3.5 h-3.5 text-gray-400" />}
                      </div>
                      <p className="text-xs text-gray-500 leading-snug line-clamp-2">{weakness.criterion}</p>
                      <div className="flex items-center gap-2 mt-1.5">
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${colors.pill}`}>
                          3 lessons + final
                        </span>
                        {weakness.score != null && (
                          <span className="text-[10px] text-gray-400 font-semibold">Score {weakness.score}/10</span>
                        )}
                      </div>
                    </div>

                    {/* Arrow */}
                    {!isLocked && !isCompleted && (
                      <ChevronRight className="w-5 h-5 text-gray-400 shrink-0" />
                    )}
                    {isCompleted && (
                      <span className={`text-[10px] font-extrabold shrink-0 ${isPassed ? 'text-[#2a7a00]' : 'text-amber-700'}`}>
                        {isPassed ? 'Done ✓' : 'Retry'}
                      </span>
                    )}
                  </div>
                </button>
              )
            })}
          </div>

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
