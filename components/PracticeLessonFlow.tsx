'use client'

import { useState, useCallback, useMemo } from 'react'
import { X, Zap, CheckCircle, BookOpen, Sparkles, ArrowRight } from 'lucide-react'
import Preppi from '@/components/Preppi'
import TeachCard from '@/components/exercises/TeachCard'
import MultipleChoiceExercise from '@/components/exercises/MultipleChoiceExercise'
import LabelSortExercise from '@/components/exercises/LabelSortExercise'
import WordBankExercise from '@/components/exercises/WordBankExercise'
import TapSelectExercise from '@/components/exercises/TapSelectExercise'
import type { SubLesson, Exercise } from '@/lib/practice-bundles'

// ── Props ──────────────────────────────────────────────────────────────────────

interface PracticeLessonFlowProps {
  subLesson: SubLesson
  lessonNumber: number   // 1, 2, or 3
  totalLessons: number   // always 3
  onComplete: (passed: boolean, xpEarned: number) => void
  onClose: () => void
}

// ── Flow state ─────────────────────────────────────────────────────────────────

type FlowState = 'intro' | 'teach' | `exercise_${number}` | 'complete'

// ── XP constants ───────────────────────────────────────────────────────────────

const XP_TEACH = 5
const XP_CORRECT = 10
const XP_ATTEMPT = 2

// ── Mini confetti burst ────────────────────────────────────────────────────────

function MiniStepBurst({ active }: { active: boolean }) {
  if (!active) return null
  const pieces = Array.from({ length: 14 }, (_, i) => ({
    id: i,
    color: ['#58CC02', '#FFC800', '#1CB0F6', '#CE82FF', '#FF4B4B'][i % 5],
    left: `${15 + Math.random() * 70}%`,
    delay: `${Math.random() * 0.2}s`,
    size: `${5 + Math.random() * 5}px`,
  }))
  return (
    <div className="fixed inset-x-0 top-0 pointer-events-none overflow-hidden h-32 z-50">
      {pieces.map(p => (
        <div
          key={p.id}
          className="mini-confetti-piece absolute"
          style={{ backgroundColor: p.color, left: p.left, top: '10%', animationDelay: p.delay, width: p.size, height: p.size }}
        />
      ))}
    </div>
  )
}

// ── Feedback bottom sheet ─────────────────────────────────────────────────────

function CorrectSheet({ xpGained, onContinue }: { xpGained: number; onContinue: () => void }) {
  return (
    <>
      <div className="fixed inset-0 z-50" onClick={onContinue} />
      <div className="fixed bottom-0 left-0 right-0 z-50 rounded-t-3xl px-5 pt-6 pb-10 bg-[#d7f5b1] animate-sheet-slide-up">
        <div className="max-w-lg mx-auto">
          <div className="flex items-center gap-4 mb-5">
            <div className="w-14 h-14 rounded-full bg-[#58CC02] flex items-center justify-center shrink-0">
              <CheckCircle className="w-7 h-7 text-white" />
            </div>
            <div>
              <p className="text-2xl font-extrabold text-[#2a7a00]">Correct!</p>
              <p className="text-sm font-bold text-[#2a7a00] opacity-80">+{xpGained} XP</p>
            </div>
          </div>
          <button
            onClick={onContinue}
            className="w-full py-4 rounded-2xl font-extrabold text-white text-base bg-[#58CC02] border-b-4 border-[#46a302] active:border-b-0 active:translate-y-[3px] transition-transform"
          >
            Continue
          </button>
        </div>
      </div>
    </>
  )
}

// ── Component ──────────────────────────────────────────────────────────────────

export default function PracticeLessonFlow({
  subLesson,
  lessonNumber,
  totalLessons,
  onComplete,
  onClose,
}: PracticeLessonFlowProps) {
  const [flowState, setFlowState] = useState<FlowState>('intro')
  const [xp, setXp] = useState(0)
  const [lastXpGain, setLastXpGain] = useState(0)
  const [xpKey, setXpKey] = useState(0)
  const [correctCount, setCorrectCount] = useState(0)
  const [stepBurst, setStepBurst] = useState(false)
  const [retryKey, setRetryKey] = useState(0) // forces exercise remount on retry
  const [correctSheet, setCorrectSheet] = useState<{ xpGained: number; onContinue: () => void } | null>(null)

  const exerciseCount = subLesson.exercises.length

  const currentStepIndex = useMemo(() => {
    if (flowState === 'intro') return -1
    if (flowState === 'teach') return 0
    if (flowState === 'complete') return 1 + exerciseCount
    const m = flowState.match(/^exercise_(\d+)$/)
    return m ? 1 + parseInt(m[1], 10) : 0
  }, [flowState, exerciseCount])

  const addXp = useCallback((amount: number) => {
    setXp(prev => prev + amount)
    setLastXpGain(amount)
    setXpKey(k => k + 1)
  }, [])

  const triggerBurst = useCallback(() => {
    setStepBurst(true)
    setTimeout(() => setStepBurst(false), 900)
  }, [])

  const advanceFromTeach = useCallback(() => {
    addXp(XP_TEACH)
    triggerBurst()
    setFlowState('exercise_0')
  }, [addXp, triggerBurst])

  const advanceFromExercise = useCallback((index: number, correct: boolean) => {
    if (!correct) {
      // Wrong: force exercise remount so user retries — no sheet shown here,
      // the exercise component itself shows red feedback + Try Again
      addXp(XP_ATTEMPT)
      setRetryKey(k => k + 1)
      return
    }

    // Correct
    addXp(XP_CORRECT)
    setCorrectCount(prev => prev + 1)
    triggerBurst()

    const doAdvance = () => {
      setCorrectSheet(null)
      if (index + 1 < exerciseCount) {
        setFlowState(`exercise_${index + 1}`)
        setRetryKey(k => k + 1)
      } else {
        setFlowState('complete')
      }
    }
    setCorrectSheet({ xpGained: XP_CORRECT, onContinue: doAdvance })
  }, [addXp, exerciseCount, triggerBurst])

  // ── Progress bar ─────────────────────────────────────────────────────────────

  const renderProgress = () => {
    const totalSteps = 1 + exerciseCount
    const pct = flowState === 'complete'
      ? 100
      : currentStepIndex < 0
      ? 0
      : Math.round((currentStepIndex / totalSteps) * 100)

    return (
      <div className="flex items-center gap-3 w-full">
        <div className="flex-1 h-4 bg-gray-100 rounded-full overflow-hidden">
          <div
            className="h-full rounded-full transition-all duration-500 ease-out"
            style={{
              width: `${pct}%`,
              background: pct > 0 ? 'linear-gradient(90deg,#58CC02 0%,#7ade1a 100%)' : 'transparent',
              boxShadow: pct > 0 ? 'inset 0 -3px 0 rgba(0,0,0,0.15)' : 'none',
            }}
          />
        </div>
        {xp > 0 && (
          <div className="relative flex items-center gap-1 shrink-0">
            <Zap className="w-4 h-4 text-amber-500" />
            <span className="text-sm font-extrabold text-amber-600 tabular-nums">{xp}</span>
            {lastXpGain > 0 && (
              <span key={xpKey} className="absolute -top-4 right-0 text-xs font-extrabold text-amber-500 animate-fly-up pointer-events-none">
                +{lastXpGain}
              </span>
            )}
          </div>
        )}
      </div>
    )
  }

  const renderHeader = () => (
    <div className="flex items-center gap-3 mb-4">
      <button
        onClick={onClose}
        className="w-8 h-8 flex items-center justify-center rounded-full text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors shrink-0"
      >
        <X className="w-5 h-5" />
      </button>
      {flowState !== 'intro' && flowState !== 'complete' && (
        <div className="flex-1 min-w-0">{renderProgress()}</div>
      )}
    </div>
  )

  // ── Exercise renderer ─────────────────────────────────────────────────────────

  const renderExercise = (exercise: Exercise, index: number) => {
    const key = `${index}-${retryKey}`
    switch (exercise.type) {
      case 'multiple_choice':
        return (
          <MultipleChoiceExercise
            key={key}
            question={exercise.question}
            options={exercise.options}
            correctIndex={exercise.correctIndex}
            explanation={exercise.explanation}
            onComplete={(correct) => advanceFromExercise(index, correct)}
          />
        )
      case 'label_sort':
        return (
          <LabelSortExercise
            key={key}
            instruction={exercise.instruction}
            segments={exercise.segments}
            onComplete={(correct) => advanceFromExercise(index, correct)}
          />
        )
      case 'word_bank':
        return (
          <WordBankExercise
            key={key}
            instruction={exercise.instruction}
            sentenceWithBlank={exercise.sentenceWithBlank}
            options={exercise.options}
            correctIndex={exercise.correctIndex}
            explanation={exercise.explanation}
            onComplete={(correct) => advanceFromExercise(index, correct)}
          />
        )
      case 'tap_select':
        return (
          <TapSelectExercise
            key={key}
            instruction={exercise.instruction}
            items={exercise.items}
            correctIndices={exercise.correctIndices}
            explanation={exercise.explanation}
            onComplete={(correct) => advanceFromExercise(index, correct)}
          />
        )
      default:
        return null
    }
  }

  // ── Screens ───────────────────────────────────────────────────────────────────

  const renderIntro = () => (
    <div className="flex flex-col items-center justify-center text-center px-6 py-12 min-h-[60vh] md:min-h-0">
      <div className="w-16 h-16 bg-[#d7f5b1] rounded-full flex items-center justify-center mb-5 animate-slide-up">
        <span className="text-2xl font-extrabold text-[#2a7a00]">{lessonNumber}</span>
      </div>
      <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-1">
        Lesson {lessonNumber} of {totalLessons}
      </p>
      <h2 className="text-2xl font-extrabold text-gray-900 mb-2 animate-slide-up">{subLesson.title}</h2>
      <p className="text-sm text-gray-400 mb-8 capitalize">{subLesson.difficulty} level</p>

      <div className="w-full max-w-sm bg-gray-50 rounded-2xl p-5 mb-8 text-left space-y-3 animate-slide-up">
        <div className="flex items-center gap-3">
          <div className="w-7 h-7 bg-[#d7f5b1] rounded-full flex items-center justify-center shrink-0">
            <BookOpen className="w-3.5 h-3.5 text-[#58CC02]" />
          </div>
          <div>
            <p className="text-sm font-semibold text-gray-800">Technique card</p>
            <p className="text-xs text-gray-400">Learn the method</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <div className="w-7 h-7 bg-[#dbeafe] rounded-full flex items-center justify-center shrink-0">
            <Sparkles className="w-3.5 h-3.5 text-[#1CB0F6]" />
          </div>
          <div>
            <p className="text-sm font-semibold text-gray-800">{exerciseCount} exercises</p>
            <p className="text-xs text-gray-400">Multiple choice, sorting, word bank & more</p>
          </div>
        </div>
      </div>

      <div className="mb-6">
        <Preppi message="Let's do this! Read the lesson, then ace the exercises." size="md" />
      </div>

      <button onClick={() => { setFlowState('teach') }} className="btn-duo-green flex items-center gap-2 px-8 py-4">
        Start <ArrowRight className="w-5 h-5" />
      </button>
    </div>
  )

  const renderTeach = () => (
    <div className="animate-slide-up">
      <div className="mb-4">
        <Preppi message="Read through this carefully — the exercises are based on it!" size="sm" />
      </div>
      <TeachCard
        title={subLesson.teach.title}
        explanation={subLesson.teach.explanation}
        example={subLesson.teach.example}
        onContinue={advanceFromTeach}
      />
    </div>
  )

  const renderExerciseStep = (index: number) => {
    const exercise = subLesson.exercises[index]
    if (!exercise) return null
    return (
      <div className="animate-slide-up">
        <div className="flex items-center justify-between mb-4">
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide">
            Question {index + 1} of {exerciseCount}
          </p>
        </div>
        <div className="mb-4">
          <Preppi message="You've got this! Take your time." size="sm" />
        </div>
        {renderExercise(exercise, index)}
      </div>
    )
  }

  const renderComplete = () => (
    <div className="flex flex-col items-center justify-center text-center px-6 py-12 min-h-[60vh] md:min-h-0 animate-slide-up">
      <div className="w-20 h-20 rounded-full bg-[#58CC02] border-[5px] border-[#2d8f00] flex items-center justify-center mb-5 animate-badge-reveal"
        style={{ boxShadow: '0 6px 0 #1a5e00' }}>
        <CheckCircle className="w-10 h-10 text-white" />
      </div>
      <h2 className="text-2xl font-extrabold text-gray-900 mb-2">Lesson {lessonNumber} Complete!</h2>
      <div className="flex items-center gap-6 mb-8">
        <div className="text-center">
          <p className="text-2xl font-extrabold text-amber-600">{xp}</p>
          <p className="text-xs text-gray-400 font-semibold">XP Earned</p>
        </div>
        <div className="w-px h-10 bg-gray-200" />
        <div className="text-center">
          <p className="text-2xl font-extrabold text-[#1CB0F6]">{correctCount}/{exerciseCount}</p>
          <p className="text-xs text-gray-400 font-semibold">Correct</p>
        </div>
      </div>
      <div className="mb-6">
        <Preppi message={lessonNumber < totalLessons ? "Great work! Next lesson is waiting." : "That's all 3 lessons! Time for the final challenge."} size="lg" />
      </div>
      <button
        onClick={() => onComplete(true, xp)}
        className="w-full max-w-xs btn-duo-green flex items-center justify-center gap-2 px-8 py-4"
      >
        {lessonNumber < totalLessons ? 'Next Lesson' : 'Final Challenge'}
        <ArrowRight className="w-5 h-5" />
      </button>
    </div>
  )

  const renderStep = () => {
    if (flowState === 'intro') return renderIntro()
    if (flowState === 'teach') return renderTeach()
    if (flowState === 'complete') return renderComplete()
    const m = flowState.match(/^exercise_(\d+)$/)
    if (m) return renderExerciseStep(parseInt(m[1], 10))
    return null
  }

  return (
    <>
      <MiniStepBurst active={stepBurst} />

      {/* Mobile */}
      <div className="md:hidden fixed inset-0 z-40 bg-white flex flex-col overflow-hidden">
        <div className="px-4 pt-4 pb-2 shrink-0">{renderHeader()}</div>
        <div className="flex-1 overflow-y-auto px-4 pb-8">{renderStep()}</div>
      </div>

      {/* Desktop */}
      <div className="hidden md:flex fixed inset-0 z-40 items-center justify-center bg-black/30 backdrop-blur-sm">
        <div className="w-full max-w-2xl max-h-[90vh] bg-white rounded-2xl shadow-2xl flex flex-col overflow-hidden">
          <div className="px-6 pt-5 pb-3 shrink-0 border-b border-gray-100">{renderHeader()}</div>
          <div className="flex-1 overflow-y-auto px-6 py-6">{renderStep()}</div>
        </div>
      </div>

      {correctSheet && (
        <CorrectSheet xpGained={correctSheet.xpGained} onContinue={correctSheet.onContinue} />
      )}
    </>
  )
}
