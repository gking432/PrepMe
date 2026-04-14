'use client'

import { useState, useCallback, useMemo } from 'react'
import { X, Zap, CheckCircle, BookOpen, Sparkles, ArrowRight, RotateCcw } from 'lucide-react'
import Preppi from '@/components/Preppi'
import TeachCard from '@/components/exercises/TeachCard'
import MultipleChoiceExercise from '@/components/exercises/MultipleChoiceExercise'
import LabelSortExercise from '@/components/exercises/LabelSortExercise'
import WordBankExercise from '@/components/exercises/WordBankExercise'
import TapSelectExercise from '@/components/exercises/TapSelectExercise'
import ApplyToYourselfExercise from '@/components/exercises/ApplyToYourselfExercise'
import SentenceBuilderExercise from '@/components/exercises/SentenceBuilderExercise'
import type { SubLesson, Exercise } from '@/lib/practice-bundles'

interface PracticeLessonFlowProps {
  subLesson: SubLesson
  lessonNumber: number
  totalLessons: number
  criterion: string
  originalQuestion?: string
  originalAnswer?: string
  onComplete: (passed: boolean, xpEarned: number) => void
  onClose: () => void
  embeddedDesktop?: boolean
  mode?: 'core' | 'optional'
}

type FlowState = 'intro' | 'teach' | 'retry_intro' | `exercise_${number}` | 'complete'

const XP_TEACH = 5
const XP_CORRECT = 10
const XP_ATTEMPT = 2

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
    <div className="fixed inset-x-0 top-0 h-32 pointer-events-none overflow-hidden z-50">
      {pieces.map(piece => (
        <div
          key={piece.id}
          className="mini-confetti-piece absolute"
          style={{
            backgroundColor: piece.color,
            left: piece.left,
            top: '10%',
            animationDelay: piece.delay,
            width: piece.size,
            height: piece.size,
          }}
        />
      ))}
    </div>
  )
}

function shuffle<T>(items: T[]) {
  const clone = [...items]
  for (let i = clone.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[clone[i], clone[j]] = [clone[j], clone[i]]
  }
  return clone
}

function neutralizeSegmentText(text: string) {
  return text.trim().replace(/[.!?]+$/g, '').toLowerCase()
}

function randomizeExercise(exercise: Exercise): Exercise {
  switch (exercise.type) {
    case 'multiple_choice': {
      const optionEntries = shuffle(exercise.options.map((option, index) => ({ option, index })))
      return {
        ...exercise,
        options: optionEntries.map(entry => entry.option),
        correctIndex: optionEntries.findIndex(entry => entry.index === exercise.correctIndex),
      }
    }
    case 'word_bank': {
      const optionEntries = shuffle(exercise.options.map((option, index) => ({ option, index })))
      return {
        ...exercise,
        options: optionEntries.map(entry => entry.option),
        correctIndex: optionEntries.findIndex(entry => entry.index === exercise.correctIndex),
      }
    }
    case 'tap_select': {
      const itemEntries = shuffle(exercise.items.map((item, index) => ({ item, index })))
      return {
        ...exercise,
        items: itemEntries.map(entry => entry.item),
        correctIndices: itemEntries
          .map((entry, index) => (exercise.correctIndices.includes(entry.index) ? index : -1))
          .filter(index => index >= 0),
      }
    }
    case 'sentence_builder':
      return {
        ...exercise,
        options: shuffle(exercise.options),
      }
    case 'label_sort':
      return {
        ...exercise,
        segments: exercise.segments.map(segment => ({
          ...segment,
          text: neutralizeSegmentText(segment.text),
        })),
      }
    case 'apply_to_yourself':
      return exercise
    default:
      return exercise
  }
}

export default function PracticeLessonFlow({
  subLesson,
  lessonNumber,
  totalLessons,
  criterion,
  originalQuestion,
  originalAnswer,
  onComplete,
  onClose,
  embeddedDesktop = false,
  mode = 'optional',
}: PracticeLessonFlowProps) {
  const randomizedExercises = useMemo(
    () => subLesson.exercises.map(randomizeExercise),
    [subLesson.exercises]
  )

  const coreExercises = useMemo(() => {
    const quickDrills = randomizedExercises.filter((exercise) => exercise.type !== 'apply_to_yourself')
    const applyExercise = randomizedExercises.find((exercise) => exercise.type === 'apply_to_yourself')
    return applyExercise ? [...quickDrills, applyExercise] : quickDrills
  }, [randomizedExercises])

  const activeExercises = mode === 'core' ? coreExercises : randomizedExercises
  const exerciseCount = activeExercises.length

  const [flowState, setFlowState] = useState<FlowState>('intro')
  const [round, setRound] = useState<'main' | 'retry'>('main')
  const [xp, setXp] = useState(0)
  const [lastXpGain, setLastXpGain] = useState(0)
  const [xpKey, setXpKey] = useState(0)
  const [stepBurst, setStepBurst] = useState(false)
  const [solvedExerciseIndices, setSolvedExerciseIndices] = useState<number[]>([])
  const [retryExerciseIndices, setRetryExerciseIndices] = useState<number[]>([])

  const activeExerciseIndices = round === 'retry'
    ? retryExerciseIndices
    : activeExercises.map((_, index) => index)

  const currentStepIndex = useMemo(() => {
    if (flowState === 'intro') return -1
    if (flowState === 'teach') return 0
    if (flowState === 'retry_intro') return 1 + exerciseCount
    if (flowState === 'complete') return 1 + exerciseCount + (retryExerciseIndices.length > 0 ? retryExerciseIndices.length + 1 : 0)
    const match = flowState.match(/^exercise_(\d+)$/)
    if (!match) return 0
    const stepWithinRound = parseInt(match[1], 10)
    return round === 'retry' ? 2 + exerciseCount + stepWithinRound : 1 + stepWithinRound
  }, [exerciseCount, flowState, retryExerciseIndices.length, round])

  const addXp = useCallback((amount: number) => {
    setXp(prev => prev + amount)
    setLastXpGain(amount)
    setXpKey(prev => prev + 1)
  }, [])

  const triggerBurst = useCallback(() => {
    setStepBurst(true)
    setTimeout(() => setStepBurst(false), 900)
  }, [])

  const advanceFromTeach = useCallback(() => {
    addXp(XP_TEACH)
    triggerBurst()
    setRound('main')
    setFlowState('exercise_0')
  }, [addXp, triggerBurst])

  const advanceFromExercise = useCallback((queuePosition: number, correct: boolean) => {
    const queue = round === 'retry'
      ? retryExerciseIndices
      : activeExercises.map((_, index) => index)
    const exerciseIndex = queue[queuePosition]

    if (correct) {
      addXp(XP_CORRECT)
      triggerBurst()
      setSolvedExerciseIndices(prev => (prev.includes(exerciseIndex) ? prev : [...prev, exerciseIndex]))
    } else {
      addXp(XP_ATTEMPT)
      if (round === 'main') {
        setRetryExerciseIndices(prev => (prev.includes(exerciseIndex) ? prev : [...prev, exerciseIndex]))
      }
    }

    if (queuePosition + 1 < queue.length) {
      setFlowState(`exercise_${queuePosition + 1}`)
      return
    }

    if (round === 'main') {
      const pendingRetryCount = retryExerciseIndices.length + (correct ? 0 : 1)
      if (pendingRetryCount > 0) {
        setFlowState('retry_intro')
        return
      }
    }

    setFlowState('complete')
  }, [activeExercises, addXp, retryExerciseIndices, round, triggerBurst])

  const startRetryRound = useCallback(() => {
    if (retryExerciseIndices.length === 0) {
      setFlowState('complete')
      return
    }
    setRound('retry')
    setFlowState('exercise_0')
  }, [retryExerciseIndices.length])

  const correctCount = solvedExerciseIndices.length

  const renderProgress = () => {
    const totalSteps = 1 + exerciseCount + (retryExerciseIndices.length > 0 ? retryExerciseIndices.length + 1 : 0)
    const pct = flowState === 'complete'
      ? 100
      : currentStepIndex < 0
        ? 0
        : Math.round((currentStepIndex / totalSteps) * 100)

    return (
      <div className="flex w-full items-center gap-3">
        <div className="h-4 flex-1 overflow-hidden rounded-full bg-slate-100">
          <div
            className="h-full rounded-full transition-all duration-500 ease-out"
            style={{
              width: `${pct}%`,
              background: pct > 0 ? 'linear-gradient(90deg,#8b5cf6 0%,#6d28d9 100%)' : 'transparent',
              boxShadow: pct > 0 ? 'inset 0 -3px 0 rgba(0,0,0,0.15)' : 'none',
            }}
          />
        </div>
        {xp > 0 && (
          <div className="relative flex shrink-0 items-center gap-1">
            <Zap className="h-4 w-4 text-amber-500" />
            <span className="tabular-nums text-sm font-extrabold text-amber-600">{xp}</span>
            {lastXpGain > 0 && (
              <span key={xpKey} className="pointer-events-none absolute -top-4 right-0 animate-fly-up text-xs font-extrabold text-amber-500">
                +{lastXpGain}
              </span>
            )}
          </div>
        )}
      </div>
    )
  }

  const renderHeader = () => (
    <div className="mb-4 flex items-center gap-3">
      {!embeddedDesktop && (
        <button
          onClick={onClose}
          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-600"
        >
          <X className="h-5 w-5" />
        </button>
      )}
      {flowState !== 'intro' && flowState !== 'complete' && (
        <div className="min-w-0 flex-1">{renderProgress()}</div>
      )}
    </div>
  )

  const renderExercise = (exercise: Exercise, queuePosition: number) => {
    const exerciseIndex = activeExerciseIndices[queuePosition]
    const key = `${round}-${queuePosition}-${exerciseIndex}`

    switch (exercise.type) {
      case 'multiple_choice':
        return (
          <MultipleChoiceExercise
            key={key}
            question={exercise.question}
            options={exercise.options}
            correctIndex={exercise.correctIndex}
            explanation={exercise.explanation}
            onComplete={(correct) => advanceFromExercise(queuePosition, correct)}
          />
        )
      case 'label_sort':
        return (
          <LabelSortExercise
            key={key}
            instruction={exercise.instruction}
            segments={exercise.segments}
            onComplete={(correct) => advanceFromExercise(queuePosition, correct)}
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
            onComplete={(correct) => advanceFromExercise(queuePosition, correct)}
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
            onComplete={(correct) => advanceFromExercise(queuePosition, correct)}
          />
        )
      case 'sentence_builder':
        return (
          <SentenceBuilderExercise
            key={key}
            instruction={exercise.instruction}
            slotLabels={exercise.slotLabels}
            options={exercise.options}
            correctOrder={exercise.correctOrder}
            explanation={exercise.explanation}
            displayMode={exercise.displayMode}
            onComplete={(correct) => advanceFromExercise(queuePosition, correct)}
          />
        )
      case 'apply_to_yourself':
        return (
          <ApplyToYourselfExercise
            key={key}
            instruction={exercise.instruction}
            coachingTip={exercise.coachingTip}
            evaluationType={exercise.evaluationType}
            criterion={criterion}
            fields={exercise.fields}
            originalQuestion={originalQuestion}
            originalAnswer={originalAnswer}
            onComplete={(correct) => advanceFromExercise(queuePosition, correct)}
          />
        )
      default:
        return null
    }
  }

  const renderIntro = () => (
    <div className="flex h-full flex-col px-6 py-6 text-center">
      <div className="flex flex-1 flex-col items-center justify-center">
        <div className="mb-5 flex h-16 w-16 items-center justify-center rounded-[1.3rem] bg-violet-100 animate-slide-up">
          <span className="text-2xl font-extrabold text-violet-700">{lessonNumber}</span>
        </div>
        <p className="mb-1 text-xs font-bold uppercase tracking-widest text-gray-400">
          Lesson {lessonNumber} of {totalLessons}
        </p>
        <h2 className="mb-2 animate-slide-up text-2xl font-extrabold text-gray-900">{subLesson.title}</h2>
        <p className="mb-8 text-sm capitalize text-gray-400">{subLesson.difficulty} level</p>

        <div className="coach-card mb-8 w-full max-w-sm space-y-3 p-5 text-left animate-slide-up">
          <div className="flex items-center gap-3">
            <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-violet-100">
              <BookOpen className="h-3.5 w-3.5 text-violet-700" />
            </div>
            <div>
              <p className="text-sm font-semibold text-gray-800">
                {mode === 'core' ? 'Real miss -> real fix' : 'Full lesson walkthrough'}
              </p>
              <p className="text-xs text-gray-400">
                {mode === 'core'
                  ? 'We will start from the flagged answer and rebuild it.'
                  : 'Learn the pattern before you answer anything'}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-indigo-100">
              <Sparkles className="h-3.5 w-3.5 text-indigo-600" />
            </div>
            <div>
              <p className="text-sm font-semibold text-gray-800">
                {mode === 'core' ? `${exerciseCount} focused drill${exerciseCount === 1 ? '' : 's'}` : `${exerciseCount} drills + a retry round`}
              </p>
              <p className="text-xs text-gray-400">
                {mode === 'core'
                  ? 'Short on purpose so you can apply the fix right away.'
                  : 'Misses come back after the full set, not immediately'}
              </p>
            </div>
          </div>
        </div>

        <div className="mb-6">
          <Preppi
            message={mode === 'core'
              ? 'First we will look at the exact answer that got flagged. Then we will rebuild it into something you can actually say in a real interview.'
              : 'We will learn the pattern first, then do the full round, then come back to anything you missed.'}
            size="md"
          />
        </div>
      </div>

      <div className="shrink-0 flex items-end justify-end border-t border-slate-200/80 pt-5">
        <button onClick={() => setFlowState('teach')} className="btn-coach-primary flex items-center gap-2 px-8 py-4">
          Start
          <ArrowRight className="h-5 w-5" />
        </button>
      </div>
    </div>
  )

  const renderTeach = () => (
    <div className="h-full animate-slide-up">
      <TeachCard
        criterion={criterion}
        title={subLesson.teach.title}
        explanation={subLesson.teach.explanation}
        example={subLesson.teach.example}
        originalQuestion={originalQuestion}
        originalAnswer={originalAnswer}
        onContinue={advanceFromTeach}
      />
    </div>
  )

  const renderRetryIntro = () => (
    <div className="flex h-full flex-col px-6 py-6 text-center animate-slide-up">
      <div className="flex flex-1 flex-col items-center justify-center">
        <div className="mb-5 flex h-20 w-20 items-center justify-center rounded-full bg-violet-100">
          <RotateCcw className="h-10 w-10 text-violet-700" />
        </div>
        <p className="text-xs font-bold uppercase tracking-[0.2em] text-slate-400">
          Review round
        </p>
        <h2 className="mt-2 text-2xl font-extrabold text-slate-900">
          Let&apos;s try those again
        </h2>
        <p className="mt-3 max-w-md text-sm leading-relaxed text-slate-500 md:text-base">
          You made it through the full set. Now we&apos;ll bring back the {retryExerciseIndices.length} question{retryExerciseIndices.length === 1 ? '' : 's'} that still need work.
        </p>

        <div className="mb-8 mt-8">
          <Preppi
            message="This is the Duolingo rhythm. Keep moving through the round first, then revisit the misses with a clearer pattern in mind."
            size="md"
          />
        </div>
      </div>

      <div className="shrink-0 flex items-end justify-end border-t border-slate-200/80 pt-5">
        <button
          onClick={startRetryRound}
          className="btn-coach-primary flex items-center gap-2 px-8 py-4"
        >
          Retry missed questions
          <ArrowRight className="h-5 w-5" />
        </button>
      </div>
    </div>
  )

  const renderExerciseStep = (queuePosition: number) => {
    const exerciseIndex = activeExerciseIndices[queuePosition]
    const exercise = activeExercises[exerciseIndex]
    if (!exercise) return null

    return (
      <div className="flex h-full flex-col animate-slide-up">
        <div className="mb-4 flex items-center justify-between">
          <p className="text-xs font-semibold uppercase tracking-wide text-gray-400">
            {round === 'retry' ? 'Retry' : 'Question'} {queuePosition + 1} of {activeExerciseIndices.length}
          </p>
        </div>
        <div className="mb-4">
          <Preppi
            message={round === 'retry'
              ? 'You have seen this once already. Read carefully and give it another shot.'
              : 'Take your time. Accuracy matters more than speed here.'}
            size="sm"
          />
        </div>
        <div className="min-h-0 flex-1">
          {renderExercise(exercise, queuePosition)}
        </div>
      </div>
    )
  }

  const renderComplete = () => (
    <div className="flex h-full flex-col px-6 py-6 text-center animate-slide-up">
      <div className="flex flex-1 flex-col items-center justify-center">
        <div
          className="mb-5 flex h-20 w-20 items-center justify-center rounded-full border-[5px] border-[#166534] bg-[#22c55e] animate-badge-reveal"
          style={{ boxShadow: '0 6px 0 #1a5e00' }}
        >
          <CheckCircle className="h-10 w-10 text-white" />
        </div>
        <h2 className="mb-2 text-2xl font-extrabold text-gray-900">
          {mode === 'core' ? 'Core lesson complete' : `Lesson ${lessonNumber} Complete!`}
        </h2>
        <div className="mb-8 flex items-center gap-6">
          <div className="text-center">
            <p className="text-2xl font-extrabold text-amber-600">{xp}</p>
            <p className="text-xs font-semibold text-gray-400">XP Earned</p>
          </div>
          <div className="h-10 w-px bg-gray-200" />
          <div className="text-center">
            <p className="text-2xl font-extrabold text-violet-700">{correctCount}/{exerciseCount}</p>
            <p className="text-xs font-semibold text-gray-400">Solved</p>
          </div>
        </div>
        <div className="mb-6">
          <Preppi
            message={mode === 'core'
              ? 'Good. The next step is to answer the original interview question again out loud.'
              : lessonNumber < totalLessons
                ? 'Good. Move to the next coaching step.'
                : 'The drills are done. Next is the voice re-answer.'}
            size="lg"
          />
        </div>
      </div>

      <div className="shrink-0 flex items-end justify-end border-t border-slate-200/80 pt-5">
        <button
          onClick={() => onComplete(true, xp)}
          className="btn-coach-primary flex w-full max-w-xs items-center justify-center gap-2 px-8 py-4"
        >
          {mode === 'core' ? 'Voice Re-Answer' : lessonNumber < totalLessons ? 'Next Lesson' : 'Final Challenge'}
          <ArrowRight className="h-5 w-5" />
        </button>
      </div>
    </div>
  )

  const renderStep = () => {
    if (flowState === 'intro') return renderIntro()
    if (flowState === 'teach') return renderTeach()
    if (flowState === 'retry_intro') return renderRetryIntro()
    if (flowState === 'complete') return renderComplete()
    const match = flowState.match(/^exercise_(\d+)$/)
    if (match) return renderExerciseStep(parseInt(match[1], 10))
    return null
  }

  if (embeddedDesktop) {
    return (
      <>
        <MiniStepBurst active={stepBurst} />
        <div className="flex h-full flex-col">
          <div className="min-h-0 flex-1 overflow-hidden">{renderStep()}</div>
        </div>
      </>
    )
  }

  return (
    <>
      <MiniStepBurst active={stepBurst} />

      <div className="fixed inset-0 z-40 flex flex-col overflow-hidden bg-[linear-gradient(180deg,#faf7ff_0%,#f4f7ff_48%,#eef4fb_100%)] md:hidden">
        <div className="shrink-0 px-4 pb-2 pt-4">{renderHeader()}</div>
        <div className="flex-1 overflow-hidden px-4 pb-8">{renderStep()}</div>
      </div>

      <div className="hidden md:flex fixed inset-0 z-40 items-center justify-center bg-black/30 backdrop-blur-sm">
        <div className="premium-panel flex max-h-[90vh] w-full max-w-2xl flex-col overflow-hidden md:max-h-none">
          <div className="shrink-0 border-b border-gray-100 px-6 pb-3 pt-5">{renderHeader()}</div>
          <div className="flex-1 overflow-hidden px-6 py-6">{renderStep()}</div>
        </div>
      </div>
    </>
  )
}
