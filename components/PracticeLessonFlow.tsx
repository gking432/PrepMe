'use client'

import { useState, useRef, useCallback, useMemo } from 'react'
import {
  X,
  Zap,
  Trophy,
  Mic,
  MicOff,
  Send,
  ArrowRight,
  BookOpen,
  CheckCircle,
  Star,
  Sparkles,
} from 'lucide-react'
import Confetti from '@/components/Confetti'
import Preppi from '@/components/Preppi'
import { useGameFeedback } from '@/hooks/useGameFeedback'
import TeachCard from '@/components/exercises/TeachCard'
import MultipleChoiceExercise from '@/components/exercises/MultipleChoiceExercise'
import LabelSortExercise from '@/components/exercises/LabelSortExercise'
import ShortAnswerExercise from '@/components/exercises/ShortAnswerExercise'
import type { PracticeBundle, Exercise } from '@/lib/practice-bundles'

// ── Props ──────────────────────────────────────────────────────────────────────

interface PracticeLessonFlowProps {
  bundle: PracticeBundle
  criterion: string
  originalQuestion?: string
  originalAnswer?: string
  sessionId?: string
  currentStage?: string
  onComplete: (passed: boolean, xpEarned: number) => void
  onClose: () => void
}

// ── Flow state types ───────────────────────────────────────────────────────────

type FlowState =
  | 'intro'
  | 'teach'
  | `exercise_${number}`
  | 'reanswer'
  | 'complete'

// ── XP constants ───────────────────────────────────────────────────────────────

const XP_TEACH_VIEWED = 5
const XP_EXERCISE_ATTEMPT = 5
const XP_EXERCISE_CORRECT = 10
const XP_REANSWER_SUBMIT = 25
const XP_REANSWER_PASS_BONUS = 25
const PASS_THRESHOLD = 7

// ── Helpers ────────────────────────────────────────────────────────────────────

function scoreColor(score: number) {
  if (score >= 7) return { bar: 'bg-emerald-500', text: 'text-emerald-600', ring: 'ring-emerald-200' }
  if (score >= 5) return { bar: 'bg-amber-400', text: 'text-amber-600', ring: 'ring-amber-200' }
  return { bar: 'bg-red-400', text: 'text-red-500', ring: 'ring-red-200' }
}

const PREPPI_MESSAGES: Record<string, string> = {
  intro: "Let's get better together! I'll teach you a technique, then we'll practice.",
  teach: 'Read through this carefully -- it will help with the exercises!',
  exercise: "You've got this! Take your time.",
  exercise_correct: 'Nice work! Keep it up!',
  exercise_wrong: "That's okay, you'll get the next one!",
  reanswer: 'Now put it all together. Show me what you learned!',
  complete_pass: "Amazing job! You've really leveled up!",
  complete_fail: "Great effort! Review the lesson and try again when you're ready.",
}

// ── Component ──────────────────────────────────────────────────────────────────

export default function PracticeLessonFlow({
  bundle,
  criterion,
  originalQuestion,
  originalAnswer,
  sessionId,
  currentStage,
  onComplete,
  onClose,
}: PracticeLessonFlowProps) {
  const { ding } = useGameFeedback()

  // ── State ────────────────────────────────────────────────────────────────────
  const [flowState, setFlowState] = useState<FlowState>('intro')
  const [xp, setXp] = useState(0)
  const [lastXpGain, setLastXpGain] = useState(0)
  const [xpKey, setXpKey] = useState(0)
  const [exerciseResults, setExerciseResults] = useState<Record<number, boolean>>({})
  const [preppiMsg, setPreppiMsg] = useState(PREPPI_MESSAGES.intro)
  const [confettiActive, setConfettiActive] = useState(false)

  // Re-answer state
  const [reanswerText, setReanswerText] = useState('')
  const [reanswerSubmitting, setReanswerSubmitting] = useState(false)
  const [reanswerResult, setReanswerResult] = useState<{
    score: number
    passed: boolean
    feedback: string
  } | null>(null)
  const [inputMode, setInputMode] = useState<'text' | 'voice'>('text')
  const [recording, setRecording] = useState(false)
  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const audioChunksRef = useRef<Blob[]>([])

  // ── Derived values ───────────────────────────────────────────────────────────
  const exerciseCount = bundle.exercises.length
  const totalSteps = 1 + exerciseCount + 1 // teach + exercises + reanswer

  const currentStepIndex = useMemo(() => {
    if (flowState === 'intro') return -1
    if (flowState === 'teach') return 0
    if (flowState === 'reanswer') return 1 + exerciseCount
    if (flowState === 'complete') return totalSteps
    // exercise_N
    const match = flowState.match(/^exercise_(\d+)$/)
    if (match) return 1 + parseInt(match[1], 10)
    return 0
  }, [flowState, exerciseCount, totalSteps])

  // ── XP helpers ───────────────────────────────────────────────────────────────
  const addXp = useCallback((amount: number) => {
    setXp(prev => prev + amount)
    setLastXpGain(amount)
    setXpKey(k => k + 1)
  }, [])

  // ── Navigation ───────────────────────────────────────────────────────────────
  const advanceToTeach = useCallback(() => {
    setFlowState('teach')
    setPreppiMsg(PREPPI_MESSAGES.teach)
  }, [])

  const advanceFromTeach = useCallback(() => {
    addXp(XP_TEACH_VIEWED)
    ding()
    if (exerciseCount > 0) {
      setFlowState('exercise_0')
      setPreppiMsg(PREPPI_MESSAGES.exercise)
    } else {
      setFlowState('reanswer')
      setPreppiMsg(PREPPI_MESSAGES.reanswer)
    }
  }, [addXp, ding, exerciseCount])

  const advanceFromExercise = useCallback(
    (index: number, correct: boolean) => {
      setExerciseResults(prev => ({ ...prev, [index]: correct }))
      if (correct) {
        addXp(XP_EXERCISE_CORRECT)
        ding()
        setPreppiMsg(PREPPI_MESSAGES.exercise_correct)
      } else {
        addXp(XP_EXERCISE_ATTEMPT)
        setPreppiMsg(PREPPI_MESSAGES.exercise_wrong)
      }

      // Small delay so user can see the result before moving on
      setTimeout(() => {
        if (index + 1 < exerciseCount) {
          setFlowState(`exercise_${index + 1}`)
          setPreppiMsg(PREPPI_MESSAGES.exercise)
        } else {
          setFlowState('reanswer')
          setPreppiMsg(PREPPI_MESSAGES.reanswer)
        }
      }, 1200)
    },
    [addXp, ding, exerciseCount],
  )

  // ── Re-answer submission ─────────────────────────────────────────────────────
  const submitReanswer = useCallback(
    async (answer: string) => {
      if (!answer.trim()) return
      setReanswerSubmitting(true)
      addXp(XP_REANSWER_SUBMIT)

      try {
        const res = await fetch('/api/interview/practice', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            sessionId,
            questionId: 'reanswer',
            question: originalQuestion || bundle.teach.example.question,
            originalAnswer: originalAnswer || '',
            stage: currentStage,
            answer: answer.trim(),
          }),
        })
        const data = await res.json()

        const score = data.score ?? 5
        const passed = data.passed ?? score >= PASS_THRESHOLD
        const feedback = data.feedback || data.summary || ''

        setReanswerResult({ score, passed, feedback })

        if (passed) {
          addXp(XP_REANSWER_PASS_BONUS)
          ding()
          setPreppiMsg(PREPPI_MESSAGES.complete_pass)
          setTimeout(() => setConfettiActive(true), 300)
        } else {
          setPreppiMsg(PREPPI_MESSAGES.complete_fail)
        }

        setTimeout(() => setFlowState('complete'), 1500)
      } catch (err) {
        console.error('Re-answer submit error:', err)
        // Still advance on error so user isn't stuck
        setReanswerResult({ score: 5, passed: false, feedback: 'Scoring unavailable. Your answer was saved.' })
        setPreppiMsg(PREPPI_MESSAGES.complete_fail)
        setTimeout(() => setFlowState('complete'), 1500)
      } finally {
        setReanswerSubmitting(false)
      }
    },
    [sessionId, originalQuestion, originalAnswer, currentStage, bundle.teach.example.question, addXp, ding],
  )

  const submitReanswerText = useCallback(() => {
    submitReanswer(reanswerText)
  }, [reanswerText, submitReanswer])

  // ── Voice recording ──────────────────────────────────────────────────────────
  const startRecording = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      const mr = new MediaRecorder(stream, { mimeType: 'audio/webm' })
      mediaRecorderRef.current = mr
      audioChunksRef.current = []
      mr.ondataavailable = (e) => {
        if (e.data.size > 0) audioChunksRef.current.push(e.data)
      }
      mr.onstop = async () => {
        stream.getTracks().forEach((t) => t.stop())
        const blob = new Blob(audioChunksRef.current, { type: 'audio/webm' })
        await submitReanswerAudio(blob)
      }
      mr.start()
      setRecording(true)
    } catch {
      alert('Microphone access is required for voice input.')
    }
  }, [])

  const stopRecording = useCallback(() => {
    if (mediaRecorderRef.current?.state === 'recording') {
      mediaRecorderRef.current.stop()
      setRecording(false)
    }
  }, [])

  const submitReanswerAudio = useCallback(
    async (blob: Blob) => {
      setReanswerSubmitting(true)
      addXp(XP_REANSWER_SUBMIT)
      try {
        const fd = new FormData()
        fd.append('audio', blob, 'recording.webm')
        if (sessionId) fd.append('sessionId', sessionId)
        fd.append('questionId', 'reanswer')
        fd.append('question', originalQuestion || bundle.teach.example.question)
        fd.append('originalAnswer', originalAnswer || '')
        if (currentStage) fd.append('stage', currentStage)

        const res = await fetch('/api/interview/practice', { method: 'POST', body: fd })
        const data = await res.json()

        const score = data.score ?? 5
        const passed = data.passed ?? score >= PASS_THRESHOLD
        const feedback = data.feedback || data.summary || ''

        setReanswerResult({ score, passed, feedback })

        if (passed) {
          addXp(XP_REANSWER_PASS_BONUS)
          ding()
          setPreppiMsg(PREPPI_MESSAGES.complete_pass)
          setTimeout(() => setConfettiActive(true), 300)
        } else {
          setPreppiMsg(PREPPI_MESSAGES.complete_fail)
        }

        setTimeout(() => setFlowState('complete'), 1500)
      } catch {
        console.error('Audio submit error')
        setReanswerResult({ score: 5, passed: false, feedback: 'Scoring unavailable.' })
        setTimeout(() => setFlowState('complete'), 1500)
      } finally {
        setReanswerSubmitting(false)
      }
    },
    [sessionId, originalQuestion, originalAnswer, currentStage, bundle.teach.example.question, addXp, ding],
  )

  // ── Compute final XP for completion ──────────────────────────────────────────
  const finalPassed = reanswerResult?.passed ?? false

  // ── Render helpers ───────────────────────────────────────────────────────────

  const renderProgressBar = () => {
    const steps = Array.from({ length: totalSteps }, (_, i) => i)

    return (
      <div className="w-full">
        {/* Mobile: thin bar + dots */}
        <div className="md:hidden">
          <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden mb-3">
            <div
              className="h-full bg-accent-500 rounded-full transition-all duration-500 ease-out"
              style={{ width: `${Math.max(((currentStepIndex + 1) / totalSteps) * 100, 0)}%` }}
            />
          </div>
          <div className="flex justify-between px-1">
            {steps.map((i) => (
              <div
                key={i}
                className={`w-2.5 h-2.5 rounded-full transition-all duration-300 ${
                  i < currentStepIndex
                    ? 'bg-accent-500 scale-100'
                    : i === currentStepIndex
                    ? 'bg-accent-500 scale-125 ring-2 ring-accent-200'
                    : 'bg-gray-200'
                }`}
              />
            ))}
          </div>
        </div>

        {/* Desktop: segmented bar with labels */}
        <div className="hidden md:block">
          <div className="flex items-center gap-1">
            {steps.map((i) => {
              const isCompleted = i < currentStepIndex
              const isCurrent = i === currentStepIndex
              let label = ''
              if (i === 0) label = 'Learn'
              else if (i <= exerciseCount) label = `Q${i}`
              else label = 'Apply'

              return (
                <div key={i} className="flex-1 flex flex-col items-center gap-1.5">
                  <div
                    className={`w-full h-2 rounded-full transition-all duration-500 ${
                      isCompleted
                        ? 'bg-accent-500'
                        : isCurrent
                        ? 'bg-accent-400 animate-pulse'
                        : 'bg-gray-100'
                    }`}
                  />
                  <span
                    className={`text-[10px] font-semibold transition-colors ${
                      isCompleted
                        ? 'text-accent-600'
                        : isCurrent
                        ? 'text-accent-500'
                        : 'text-gray-300'
                    }`}
                  >
                    {label}
                  </span>
                </div>
              )
            })}
          </div>
        </div>
      </div>
    )
  }

  const renderXpCounter = () => (
    <div className="relative flex items-center gap-1.5">
      <Zap className="w-4 h-4 text-amber-500" />
      <span className="text-sm font-bold text-amber-600 tabular-nums">{xp} XP</span>
      {lastXpGain > 0 && (
        <span
          key={xpKey}
          className="absolute -top-4 right-0 text-xs font-extrabold text-amber-500 animate-fly-up pointer-events-none"
        >
          +{lastXpGain}
        </span>
      )}
    </div>
  )

  const renderHeader = () => (
    <div className="flex items-center justify-between gap-4 mb-4">
      <div className="flex-1 min-w-0">{flowState !== 'intro' && flowState !== 'complete' && renderProgressBar()}</div>
      <div className="flex items-center gap-3 shrink-0">
        {xp > 0 && renderXpCounter()}
        <button
          onClick={onClose}
          className="w-8 h-8 flex items-center justify-center rounded-full text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors"
          aria-label="Close lesson"
        >
          <X className="w-5 h-5" />
        </button>
      </div>
    </div>
  )

  // ── Render exercise by type ──────────────────────────────────────────────────

  const renderExercise = (exercise: Exercise, index: number) => {
    switch (exercise.type) {
      case 'multiple_choice':
        return (
          <MultipleChoiceExercise
            key={index}
            question={exercise.question}
            options={exercise.options}
            correctIndex={exercise.correctIndex}
            explanation={exercise.explanation}
            onComplete={(correct: boolean) => advanceFromExercise(index, correct)}
          />
        )
      case 'label_sort':
        return (
          <LabelSortExercise
            key={index}
            instruction={exercise.instruction}
            segments={exercise.segments}
            onComplete={(correct: boolean) => advanceFromExercise(index, correct)}
          />
        )
      case 'short_answer':
        return (
          <ShortAnswerExercise
            key={index}
            prompt={exercise.prompt}
            hint={exercise.hint}
            maxLength={exercise.maxLength}
            onComplete={() => advanceFromExercise(index, true)}
          />
        )
      case 'fill_in_blank':
        // Render fill_in_blank as a short answer fallback (component not built yet)
        return (
          <ShortAnswerExercise
            key={index}
            prompt={exercise.instruction}
            hint={`Fill in: ${exercise.blanks.join(', ')}`}
            maxLength={300}
            onComplete={() => advanceFromExercise(index, true)}
          />
        )
      default:
        return null
    }
  }

  // ── Flow state renders ───────────────────────────────────────────────────────

  const renderIntro = () => (
    <div className="flex flex-col items-center justify-center text-center px-6 py-12 md:py-16 min-h-[60vh] md:min-h-0">
      {/* Icon */}
      <div className="w-20 h-20 bg-accent-50 rounded-full flex items-center justify-center mb-6 animate-slide-up">
        <BookOpen className="w-10 h-10 text-accent-500" />
      </div>

      {/* Heading */}
      <h2 className="text-2xl md:text-3xl font-extrabold text-gray-900 mb-3 animate-slide-up">
        Let&apos;s work on{' '}
        <span className="text-accent-600">{bundle.displayName}</span>
      </h2>

      {/* Description */}
      <p className="text-gray-500 text-base leading-relaxed max-w-md mb-8 animate-slide-up">
        {bundle.description}
      </p>

      {/* Lesson outline */}
      <div className="w-full max-w-sm bg-gray-50 rounded-2xl p-5 mb-8 text-left space-y-3 animate-slide-up">
        <div className="flex items-center gap-3">
          <div className="w-7 h-7 bg-accent-100 rounded-full flex items-center justify-center shrink-0">
            <BookOpen className="w-3.5 h-3.5 text-accent-600" />
          </div>
          <div>
            <p className="text-sm font-semibold text-gray-800">Learn the technique</p>
            <p className="text-xs text-gray-400">Quick lesson with examples</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <div className="w-7 h-7 bg-primary-100 rounded-full flex items-center justify-center shrink-0">
            <Sparkles className="w-3.5 h-3.5 text-primary-600" />
          </div>
          <div>
            <p className="text-sm font-semibold text-gray-800">{exerciseCount} practice exercises</p>
            <p className="text-xs text-gray-400">Multiple choice, sorting, and more</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <div className="w-7 h-7 bg-emerald-100 rounded-full flex items-center justify-center shrink-0">
            <Star className="w-3.5 h-3.5 text-emerald-600" />
          </div>
          <div>
            <p className="text-sm font-semibold text-gray-800">Re-answer challenge</p>
            <p className="text-xs text-gray-400">Apply what you learned for bonus XP</p>
          </div>
        </div>
      </div>

      {/* Preppi (mobile only) */}
      <div className="mb-6">
        <Preppi message={preppiMsg} size="md" />
      </div>

      {/* Start button */}
      <button
        onClick={advanceToTeach}
        className="flex items-center gap-2 px-8 py-4 bg-accent-600 hover:bg-accent-700 text-white text-base font-bold rounded-2xl shadow-lg shadow-accent-200 active:scale-95 transition-all"
      >
        Start Lesson
        <ArrowRight className="w-5 h-5" />
      </button>
    </div>
  )

  const renderTeach = () => (
    <div className="animate-slide-up">
      <div className="mb-4">
        <Preppi message={preppiMsg} size="sm" />
      </div>
      <TeachCard
        title={bundle.teach.title}
        explanation={bundle.teach.explanation}
        example={bundle.teach.example}
        onContinue={advanceFromTeach}
      />
    </div>
  )

  const renderExerciseStep = (index: number) => {
    const exercise = bundle.exercises[index]
    if (!exercise) return null

    return (
      <div className="animate-slide-up">
        <div className="flex items-center justify-between mb-4">
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide">
            Exercise {index + 1} of {exerciseCount}
          </p>
          {exerciseResults[index] !== undefined && (
            <span
              className={`text-xs font-bold px-2 py-0.5 rounded-full ${
                exerciseResults[index]
                  ? 'bg-emerald-50 text-emerald-600'
                  : 'bg-amber-50 text-amber-600'
              }`}
            >
              {exerciseResults[index] ? 'Correct!' : 'Not quite'}
            </span>
          )}
        </div>
        <div className="mb-4">
          <Preppi message={preppiMsg} size="sm" />
        </div>
        {renderExercise(exercise, index)}
      </div>
    )
  }

  const renderReanswer = () => {
    const question = originalQuestion || bundle.teach.example.question

    return (
      <div className="animate-slide-up space-y-5">
        <div className="text-center mb-2">
          <div className="inline-flex items-center gap-2 px-3 py-1 bg-emerald-50 text-emerald-700 text-xs font-bold rounded-full mb-3">
            <Star className="w-3 h-3" />
            Final Challenge
          </div>
          <h3 className="text-lg font-extrabold text-gray-900">
            Put it all together
          </h3>
          <p className="text-sm text-gray-500 mt-1">
            Answer this question using what you just learned.
          </p>
        </div>

        <div className="mb-4">
          <Preppi message={preppiMsg} size="sm" />
        </div>

        {/* The question */}
        <div className="bg-primary-50 border border-primary-100 rounded-2xl p-5">
          <p className="text-xs font-semibold text-primary-400 uppercase tracking-wide mb-2">
            Interview Question
          </p>
          <p className="text-base font-semibold text-primary-800 leading-relaxed">
            {question}
          </p>
        </div>

        {/* Show original answer if available */}
        {originalAnswer && (
          <div className="bg-red-50 border border-red-100 rounded-xl p-4">
            <p className="text-xs font-semibold text-red-400 uppercase tracking-wide mb-1">
              Your original answer
            </p>
            <p className="text-sm text-red-700 italic leading-relaxed line-clamp-3">
              &ldquo;{originalAnswer}&rdquo;
            </p>
          </div>
        )}

        {/* Result from re-answer */}
        {reanswerResult && (
          <div
            className={`rounded-xl p-4 border animate-slide-up ${
              reanswerResult.passed
                ? 'bg-emerald-50 border-emerald-200'
                : 'bg-amber-50 border-amber-200'
            }`}
          >
            <div className="flex items-center gap-2 mb-1">
              <span
                className={`text-sm font-bold ${
                  reanswerResult.passed ? 'text-emerald-700' : 'text-amber-700'
                }`}
              >
                {reanswerResult.score}/10
              </span>
              <span
                className={`text-xs ${
                  reanswerResult.passed ? 'text-emerald-600' : 'text-amber-600'
                }`}
              >
                {reanswerResult.passed ? '-- Great improvement!' : '-- Keep practicing'}
              </span>
            </div>
            <p
              className={`text-xs leading-relaxed ${
                reanswerResult.passed ? 'text-emerald-800' : 'text-amber-800'
              }`}
            >
              {reanswerResult.feedback}
            </p>
          </div>
        )}

        {/* Input mode toggle */}
        {!reanswerResult && (
          <>
            <div className="flex rounded-xl border border-gray-200 overflow-hidden text-sm">
              <button
                onClick={() => setInputMode('text')}
                className={`flex-1 py-2.5 font-semibold transition-colors ${
                  inputMode === 'text'
                    ? 'bg-accent-600 text-white'
                    : 'text-gray-500 hover:bg-gray-50'
                }`}
              >
                Type
              </button>
              <button
                onClick={() => setInputMode('voice')}
                className={`flex-1 py-2.5 font-semibold transition-colors ${
                  inputMode === 'voice'
                    ? 'bg-accent-600 text-white'
                    : 'text-gray-500 hover:bg-gray-50'
                }`}
              >
                Voice
              </button>
            </div>

            {/* Text input */}
            {inputMode === 'text' && (
              <div className="space-y-3">
                <textarea
                  value={reanswerText}
                  onChange={(e) => setReanswerText(e.target.value)}
                  rows={5}
                  placeholder="Give a clear, structured answer. Use what you learned in this lesson."
                  className="w-full px-4 py-3 text-sm border-2 border-gray-200 rounded-xl focus:outline-none focus:border-accent-400 resize-none transition-colors"
                />
                <button
                  onClick={submitReanswerText}
                  disabled={!reanswerText.trim() || reanswerSubmitting}
                  className="w-full flex items-center justify-center gap-2 py-3.5 bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl text-sm font-bold disabled:opacity-40 active:scale-[0.98] transition-all"
                >
                  {reanswerSubmitting ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      Scoring your answer...
                    </>
                  ) : (
                    <>
                      <Send className="w-4 h-4" />
                      Submit Answer
                    </>
                  )}
                </button>
              </div>
            )}

            {/* Voice input */}
            {inputMode === 'voice' && (
              <div className="text-center py-6 space-y-3">
                {reanswerSubmitting ? (
                  <div className="flex flex-col items-center gap-3">
                    <div className="w-8 h-8 border-2 border-accent-500 border-t-transparent rounded-full animate-spin" />
                    <p className="text-sm text-gray-500">Scoring your answer...</p>
                  </div>
                ) : recording ? (
                  <>
                    <div className="w-20 h-20 bg-red-50 rounded-full flex items-center justify-center mx-auto">
                      <div className="w-6 h-6 bg-red-500 rounded-full animate-pulse" />
                    </div>
                    <p className="text-sm font-semibold text-red-600">Recording...</p>
                    <button
                      onClick={stopRecording}
                      className="flex items-center gap-2 px-8 py-3 bg-red-500 text-white rounded-xl font-semibold text-sm mx-auto active:scale-95 transition-all"
                    >
                      <MicOff className="w-4 h-4" />
                      Done
                    </button>
                  </>
                ) : (
                  <>
                    <button
                      onClick={startRecording}
                      className="w-20 h-20 bg-accent-50 rounded-full flex items-center justify-center mx-auto hover:bg-accent-100 active:scale-95 transition-all"
                    >
                      <Mic className="w-8 h-8 text-accent-600" />
                    </button>
                    <p className="text-sm text-gray-400">Tap to record your answer</p>
                  </>
                )}
              </div>
            )}
          </>
        )}
      </div>
    )
  }

  const renderComplete = () => {
    const correctCount = Object.values(exerciseResults).filter(Boolean).length

    return (
      <div className="flex flex-col items-center justify-center text-center px-6 py-12 md:py-16 min-h-[60vh] md:min-h-0 animate-slide-up">
        <Confetti active={confettiActive} />

        {/* Badge */}
        <div
          className={`w-24 h-24 rounded-full flex items-center justify-center mb-6 ${
            finalPassed
              ? 'bg-emerald-100 ring-4 ring-emerald-200'
              : 'bg-amber-100 ring-4 ring-amber-200'
          }`}
        >
          {finalPassed ? (
            <Trophy className="w-12 h-12 text-emerald-600" />
          ) : (
            <Star className="w-12 h-12 text-amber-600" />
          )}
        </div>

        {/* Title */}
        <h2 className="text-2xl md:text-3xl font-extrabold text-gray-900 mb-2">
          {finalPassed ? 'Lesson Complete!' : 'Nice Effort!'}
        </h2>

        {/* Score summary */}
        {reanswerResult && (
          <div className="mb-4">
            <div className="flex items-center justify-center gap-2 mb-1">
              <span className={`text-3xl font-extrabold ${scoreColor(reanswerResult.score).text}`}>
                {reanswerResult.score}/10
              </span>
            </div>
            <p className="text-sm text-gray-500">Re-answer score</p>
          </div>
        )}

        {/* Stats row */}
        <div className="flex items-center justify-center gap-6 mb-6">
          <div className="text-center">
            <p className="text-2xl font-extrabold text-amber-600">{xp}</p>
            <p className="text-xs text-gray-400 font-semibold">XP Earned</p>
          </div>
          <div className="w-px h-10 bg-gray-200" />
          <div className="text-center">
            <p className="text-2xl font-extrabold text-accent-600">
              {correctCount}/{exerciseCount}
            </p>
            <p className="text-xs text-gray-400 font-semibold">Correct</p>
          </div>
          {finalPassed && (
            <>
              <div className="w-px h-10 bg-gray-200" />
              <div className="text-center">
                <CheckCircle className="w-7 h-7 text-emerald-500 mx-auto" />
                <p className="text-xs text-gray-400 font-semibold mt-0.5">Mastered</p>
              </div>
            </>
          )}
        </div>

        {/* Mastery badge */}
        {finalPassed && (
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-50 border border-emerald-200 rounded-full mb-6">
            <CheckCircle className="w-4 h-4 text-emerald-600" />
            <span className="text-sm font-bold text-emerald-700">
              {bundle.displayName} Mastered
            </span>
          </div>
        )}

        {/* Feedback */}
        {reanswerResult?.feedback && (
          <p className="text-sm text-gray-500 leading-relaxed max-w-md mb-6">
            {reanswerResult.feedback}
          </p>
        )}

        {/* Preppi (mobile) */}
        <div className="mb-6">
          <Preppi message={preppiMsg} size="lg" />
        </div>

        {/* Done button */}
        <button
          onClick={() => onComplete(finalPassed, xp)}
          className={`flex items-center gap-2 px-8 py-4 text-white text-base font-bold rounded-2xl shadow-lg active:scale-95 transition-all ${
            finalPassed
              ? 'bg-emerald-500 hover:bg-emerald-600 shadow-emerald-200'
              : 'bg-accent-600 hover:bg-accent-700 shadow-accent-200'
          }`}
        >
          {finalPassed ? 'Continue' : 'Done'}
          <ArrowRight className="w-5 h-5" />
        </button>
      </div>
    )
  }

  // ── Main render ──────────────────────────────────────────────────────────────

  const renderCurrentStep = () => {
    if (flowState === 'intro') return renderIntro()
    if (flowState === 'teach') return renderTeach()
    if (flowState === 'reanswer') return renderReanswer()
    if (flowState === 'complete') return renderComplete()

    // exercise_N
    const match = flowState.match(/^exercise_(\d+)$/)
    if (match) return renderExerciseStep(parseInt(match[1], 10))

    return null
  }

  return (
    <>
      {/* Mobile: full-screen layout */}
      <div className="md:hidden fixed inset-0 z-40 bg-white flex flex-col overflow-hidden">
        <div className="px-4 pt-4 pb-2 shrink-0">{renderHeader()}</div>
        <div className="flex-1 overflow-y-auto px-4 pb-8">{renderCurrentStep()}</div>
      </div>

      {/* Desktop: centered modal overlay */}
      <div className="hidden md:flex fixed inset-0 z-40 items-center justify-center bg-black/30 backdrop-blur-sm">
        <div className="w-full max-w-2xl max-h-[90vh] bg-white rounded-2xl shadow-2xl flex flex-col overflow-hidden">
          <div className="px-6 pt-5 pb-3 shrink-0 border-b border-gray-100">
            {renderHeader()}
          </div>
          <div className="flex-1 overflow-y-auto px-6 py-6">{renderCurrentStep()}</div>
        </div>
      </div>
    </>
  )
}
