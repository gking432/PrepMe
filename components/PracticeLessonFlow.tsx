'use client'

import { useState, useCallback, useMemo } from 'react'
import { X, Zap, CheckCircle, BookOpen, Sparkles, ArrowRight, RotateCcw } from 'lucide-react'
import Preppi from '@/components/Preppi'
import TeachCard from '@/components/exercises/TeachCard'
import MultipleChoiceExercise from '@/components/exercises/MultipleChoiceExercise'
import LabelSortExercise from '@/components/exercises/LabelSortExercise'
import WordBankExercise from '@/components/exercises/WordBankExercise'
import TapSelectExercise from '@/components/exercises/TapSelectExercise'
import type { SubLesson, Exercise } from '@/lib/practice-bundles'

interface PracticeLessonFlowProps {
  subLesson: SubLesson
  lessonNumber: number
  totalLessons: number
  onComplete: (passed: boolean, xpEarned: number) => void
  onClose: () => void
  embeddedDesktop?: boolean
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
    case 'label_sort':
      return {
        ...exercise,
        segments: exercise.segments.map(segment => ({
          ...segment,
          text: neutralizeSegmentText(segment.text),
        })),
      }
    default:
      return exercise
  }
}

export default function PracticeLessonFlow({
  subLesson,
  lessonNumber,
  totalLessons,
  onComplete,
  onClose,
  embeddedDesktop = false,
}: PracticeLessonFlowProps) {
  const randomizedExercises = useMemo(
    () => subLesson.exercises.map(randomizeExercise),
    [subLesson.exercises]
  )

  const exerciseCount = randomizedExercises.length

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
    : randomizedExercises.map((_, index) => index)

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
      : randomizedExercises.map((_, index) => index)
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
  }, [addXp, randomizedExercises, retryExerciseIndices, round, triggerBurst])

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
      default:
        return null
    }
  }

  const renderIntro = () => (
    <div className="flex h-full flex-col">
      <div className="mx-auto flex w-full max-w-3xl flex-1 flex-col px-1 pb-2 pt-2">
        <div className="space-y-6">
          <div className="flex items-start gap-4">
            <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-[1.2rem] bg-violet-100">
              <span className="text-xl font-extrabold text-violet-700">{lessonNumber}</span>
            </div>
            <div className="min-w-0">
              <p className="text-xs font-black uppercase tracking-[0.2em] text-slate-400">
                Lesson {lessonNumber} of {totalLessons}
              </p>
              <h3 className="mt-2 text-3xl font-black tracking-tight text-slate-900">{subLesson.title}</h3>
              <p className="mt-2 text-sm capitalize text-slate-500">{subLesson.difficulty} level</p>
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div className="rounded-[1.6rem] border border-violet-100 bg-white/95 p-5 shadow-[0_18px_36px_rgba(15,23,42,0.06)]">
              <div className="flex items-center gap-3">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-violet-100">
                  <BookOpen className="h-4 w-4 text-violet-700" />
                </div>
                <div>
                  <p className="text-sm font-bold text-slate-900">4-step walkthrough</p>
                  <p className="text-xs text-slate-500">Learn the pattern before you answer anything</p>
                </div>
              </div>
            </div>
            <div className="rounded-[1.6rem] border border-violet-100 bg-white/95 p-5 shadow-[0_18px_36px_rgba(15,23,42,0.06)]">
              <div className="flex items-center gap-3">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-indigo-100">
                  <Sparkles className="h-4 w-4 text-indigo-600" />
                </div>
                <div>
                  <p className="text-sm font-bold text-slate-900">{exerciseCount} drills + a retry round</p>
                  <p className="text-xs text-slate-500">Misses come back after the full set, not immediately</p>
                </div>
              </div>
            </div>
          </div>

          <Preppi
            message="We will learn the pattern first, then do the full round, then come back to anything you missed."
            size="md"
          />
        </div>

        <div className="mt-auto flex items-center justify-end pt-6">
          <button onClick={() => setFlowState('teach')} className="btn-coach-primary flex items-center gap-2 px-8 py-4">
            Start
            <ArrowRight className="h-5 w-5" />
          </button>
        </div>
      </div>
    </div>
  )

  const renderTeach = () => (
    <div className="animate-slide-up">
      <TeachCard
        title={subLesson.teach.title}
        explanation={subLesson.teach.explanation}
        example={subLesson.teach.example}
        onContinue={advanceFromTeach}
      />
    </div>
  )

  const renderRetryIntro = () => (
    <div className="flex h-full flex-col animate-slide-up">
      <div className="mx-auto flex w-full max-w-3xl flex-1 flex-col px-1 pb-2 pt-2">
        <div className="space-y-6">
          <div className="flex items-start gap-4">
            <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-full bg-violet-100">
              <RotateCcw className="h-8 w-8 text-violet-700" />
            </div>
            <div className="min-w-0">
              <p className="text-xs font-black uppercase tracking-[0.2em] text-slate-400">Review round</p>
              <h3 className="mt-2 text-3xl font-black tracking-tight text-slate-900">Let&apos;s try those again</h3>
              <p className="mt-3 max-w-2xl text-sm leading-7 text-slate-500 md:text-base">
                You made it through the full set. Now we&apos;ll bring back the {retryExerciseIndices.length} question{retryExerciseIndices.length === 1 ? '' : 's'} that still need work.
              </p>
            </div>
          </div>

          <Preppi
            message="This is the Duolingo rhythm. Keep moving through the round first, then revisit the misses with a clearer pattern in mind."
            size="md"
          />
        </div>

        <div className="mt-auto flex items-center justify-end pt-6">
          <button
            onClick={startRetryRound}
            className="btn-coach-primary flex items-center gap-2 px-8 py-4"
          >
            Retry missed questions
            <ArrowRight className="h-5 w-5" />
          </button>
        </div>
      </div>
    </div>
  )

  const renderExerciseStep = (queuePosition: number) => {
    const exerciseIndex = activeExerciseIndices[queuePosition]
    const exercise = randomizedExercises[exerciseIndex]
    if (!exercise) return null

    return (
      <div className="mx-auto flex h-full w-full max-w-3xl flex-col animate-slide-up px-1 pb-2 pt-2">
        <div className="mb-4 flex items-center justify-between gap-3">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">
            {round === 'retry' ? 'Retry' : 'Question'} {queuePosition + 1} of {activeExerciseIndices.length}
          </p>
        </div>
        <div className="mb-5 shrink-0">
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
    <div className="flex h-full flex-col animate-slide-up">
      <div className="mx-auto flex w-full max-w-3xl flex-1 flex-col px-1 pb-2 pt-2">
        <div className="space-y-6">
          <div className="flex items-start gap-4">
            <div
              className="flex h-16 w-16 shrink-0 items-center justify-center rounded-full border-[5px] border-[#166534] bg-[#22c55e] animate-badge-reveal"
              style={{ boxShadow: '0 6px 0 #1a5e00' }}
            >
              <CheckCircle className="h-8 w-8 text-white" />
            </div>
            <div>
              <p className="text-xs font-black uppercase tracking-[0.2em] text-slate-400">Lesson complete</p>
              <h3 className="mt-2 text-3xl font-black tracking-tight text-slate-900">Lesson {lessonNumber} complete</h3>
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div className="rounded-[1.6rem] border border-amber-200 bg-amber-50/70 p-5">
              <p className="text-xs font-black uppercase tracking-[0.18em] text-amber-700">XP earned</p>
              <p className="mt-2 text-3xl font-black text-amber-600">{xp}</p>
            </div>
            <div className="rounded-[1.6rem] border border-violet-200 bg-violet-50/70 p-5">
              <p className="text-xs font-black uppercase tracking-[0.18em] text-violet-700">Solved</p>
              <p className="mt-2 text-3xl font-black text-violet-700">{correctCount}/{exerciseCount}</p>
            </div>
          </div>

          <Preppi
            message={lessonNumber < totalLessons ? 'Good. Move to the next coaching step.' : 'The drills are done. Next is the voice re-answer.'}
            size="lg"
          />
        </div>

        <div className="mt-auto flex items-center justify-end pt-6">
          <button
            onClick={() => onComplete(true, xp)}
            className="btn-coach-primary flex w-full max-w-xs items-center justify-center gap-2 px-8 py-4"
          >
            {lessonNumber < totalLessons ? 'Next Lesson' : 'Final Challenge'}
            <ArrowRight className="h-5 w-5" />
          </button>
        </div>
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
