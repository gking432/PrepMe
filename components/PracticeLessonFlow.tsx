'use client'

import { useState, useRef, useCallback, useMemo } from 'react'
import type { ReactNode } from 'react'
import {
  X,
  Zap,
  Trophy,
  Mic,
  MicOff,
  ArrowRight,
  BookOpen,
  CheckCircle,
  Star,
  Sparkles,
  RotateCcw,
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

const XP_TEACH_VIEWED     = 5
const XP_EXERCISE_CORRECT = 10
const XP_EXERCISE_ATTEMPT = 5
const XP_REANSWER_SUBMIT  = 25
const XP_REANSWER_PASS    = 25
const PASS_THRESHOLD      = 7

// ── Helpers ────────────────────────────────────────────────────────────────────

function scoreColor(score: number) {
  if (score >= 7) return { bar: 'bg-emerald-500', text: 'text-emerald-600', ring: 'ring-emerald-200' }
  if (score >= 5) return { bar: 'bg-amber-400',   text: 'text-amber-600',   ring: 'ring-amber-200'   }
  return               { bar: 'bg-red-400',     text: 'text-red-500',     ring: 'ring-red-200'     }
}

const PREPPI_MESSAGES: Record<string, string> = {
  intro:            "Let's get better together! I'll teach you a technique, then we'll practice.",
  teach:            'Read through this carefully — it will help with the exercises!',
  exercise:         "You've got this! Take your time.",
  exercise_correct: 'Nice work! Keep it up! 🎉',
  exercise_wrong:   "That's okay — keep going!",
  reanswer:         'Now put it all together. Show me what you learned!',
  complete_pass:    "Amazing! You nailed it! 🌟",
  complete_fail:    "Good effort! Review the tips and give it another shot when you're ready.",
}

// ── Feedback bottom sheet (correct / wrong) ────────────────────────────────────

function FeedbackBottomSheet({
  correct,
  xpGained,
  onContinue,
}: {
  correct: boolean
  xpGained: number
  onContinue: () => void
}) {
  return (
    <>
      {/* Invisible backdrop — tap anywhere to continue */}
      <div className="fixed inset-0 z-50" onClick={onContinue} />
      {/* Sheet */}
      <div
        className={`fixed bottom-0 left-0 right-0 z-50 rounded-t-3xl px-5 pt-6 pb-10 animate-sheet-slide-up ${
          correct ? 'bg-[#d7f5b1]' : 'bg-[#ffdfe0]'
        }`}
      >
        <div className="max-w-lg mx-auto">
          {/* Header row */}
          <div className="flex items-center gap-4 mb-5">
            <div
              className={`w-14 h-14 rounded-full flex items-center justify-center shrink-0 ${
                correct ? 'bg-[#58CC02]' : 'bg-[#FF4B4B]'
              }`}
            >
              {correct
                ? <CheckCircle className="w-7 h-7 text-white" />
                : <X className="w-7 h-7 text-white" />
              }
            </div>
            <div>
              <p className={`text-2xl font-extrabold leading-tight ${correct ? 'text-[#2a7a00]' : 'text-[#9b1c1c]'}`}>
                {correct ? 'Correct!' : 'Not quite!'}
              </p>
              {correct && (
                <p className="text-sm font-bold text-[#2a7a00] opacity-80">+{xpGained} XP</p>
              )}
            </div>
          </div>
          {/* 3D press Continue button */}
          <button
            onClick={onContinue}
            className={`w-full py-4 rounded-2xl font-extrabold text-white text-base transition-transform active:translate-y-[3px] ${
              correct
                ? 'bg-[#58CC02] border-b-4 border-[#46a302] active:border-b-0'
                : 'bg-[#FF4B4B] border-b-4 border-[#cc3c3c] active:border-b-0'
            }`}
          >
            Continue
          </button>
        </div>
      </div>
    </>
  )
}

// ── Mini confetti burst (used per-step) ───────────────────────────────────────

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
          style={{
            backgroundColor: p.color,
            left: p.left,
            top: '10%',
            animationDelay: p.delay,
            width: p.size,
            height: p.size,
          }}
        />
      ))}
    </div>
  )
}

// ── Step badge (task-level progress) ──────────────────────────────────────────

interface StepBadgeProps {
  label: string
  icon: ReactNode
  state: 'done' | 'active' | 'upcoming'
  justCompleted?: boolean
}

function StepBadge({ label, icon, state, justCompleted }: StepBadgeProps) {
  return (
    <div className="flex flex-col items-center gap-1">
      <div
        className={`
          w-10 h-10 rounded-full border-2 flex items-center justify-center transition-all duration-500
          ${state === 'done'
            ? `bg-[#58CC02] border-[#46a302] shadow-sm shadow-green-200 ${justCompleted ? 'animate-task-badge-complete' : ''}`
            : state === 'active'
            ? 'bg-white border-[#58CC02] shadow-sm shadow-green-100 animate-badge-pulse'
            : 'bg-gray-100 border-gray-200'
          }
        `}
      >
        {state === 'done' ? (
          <CheckCircle className="w-5 h-5 text-white" />
        ) : (
          <span className={state === 'active' ? 'text-[#58CC02]' : 'text-gray-300'}>
            {icon}
          </span>
        )}
      </div>
      <span className={`text-[9px] font-bold uppercase tracking-wide ${
        state === 'done' ? 'text-[#46a302]' : state === 'active' ? 'text-[#58CC02]' : 'text-gray-300'
      }`}>
        {label}
      </span>
    </div>
  )
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
  const [flowState, setFlowState]           = useState<FlowState>('intro')
  const [xp, setXp]                         = useState(0)
  const [lastXpGain, setLastXpGain]         = useState(0)
  const [xpKey, setXpKey]                   = useState(0)
  const [exerciseResults, setExerciseResults] = useState<Record<number, boolean>>({})
  const [preppiMsg, setPreppiMsg]           = useState(PREPPI_MESSAGES.intro)
  const [confettiActive, setConfettiActive] = useState(false)
  const [stepBurst, setStepBurst]           = useState(false)
  const [justCompletedStep, setJustCompletedStep] = useState<number | null>(null)

  // Feedback bottom sheet
  const [feedbackSheet, setFeedbackSheet] = useState<{
    correct: boolean
    xpGained: number
    onContinue: () => void
  } | null>(null)

  // Re-answer state
  const [reanswerSubmitting, setReanswerSubmitting] = useState(false)
  const [reanswerResult, setReanswerResult] = useState<{
    score: number
    passed: boolean
    feedback: string
  } | null>(null)
  const [recording, setRecording]           = useState(false)
  const mediaRecorderRef                    = useRef<MediaRecorder | null>(null)
  const audioChunksRef                      = useRef<Blob[]>([])

  // ── Derived values ───────────────────────────────────────────────────────────
  const exerciseCount = bundle.exercises.length
  const totalSteps    = 1 + exerciseCount + 1 // teach + exercises + reanswer

  // Step index: 0=teach, 1..N=exercises, N+1=reanswer
  const currentStepIndex = useMemo(() => {
    if (flowState === 'intro')    return -1
    if (flowState === 'teach')    return 0
    if (flowState === 'reanswer') return 1 + exerciseCount
    if (flowState === 'complete') return totalSteps
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

  // ── Mini burst helper ────────────────────────────────────────────────────────
  const triggerStepBurst = useCallback(() => {
    setStepBurst(true)
    setTimeout(() => setStepBurst(false), 900)
  }, [])

  // ── Navigation ───────────────────────────────────────────────────────────────
  const advanceToTeach = useCallback(() => {
    setFlowState('teach')
    setPreppiMsg(PREPPI_MESSAGES.teach)
  }, [])

  const advanceFromTeach = useCallback(() => {
    addXp(XP_TEACH_VIEWED)
    ding()
    setJustCompletedStep(0)
    triggerStepBurst()
    setTimeout(() => setJustCompletedStep(null), 700)
    if (exerciseCount > 0) {
      setFlowState('exercise_0')
      setPreppiMsg(PREPPI_MESSAGES.exercise)
    } else {
      setFlowState('reanswer')
      setPreppiMsg(PREPPI_MESSAGES.reanswer)
    }
  }, [addXp, ding, exerciseCount, triggerStepBurst])

  const advanceFromExercise = useCallback(
    (index: number, correct: boolean) => {
      const xpGained = correct ? XP_EXERCISE_CORRECT : XP_EXERCISE_ATTEMPT
      setExerciseResults(prev => ({ ...prev, [index]: correct }))
      if (correct) {
        addXp(xpGained)
        ding()
        setJustCompletedStep(1 + index)
        triggerStepBurst()
        setTimeout(() => setJustCompletedStep(null), 700)
      } else {
        addXp(xpGained)
      }
      setPreppiMsg(correct ? PREPPI_MESSAGES.exercise_correct : PREPPI_MESSAGES.exercise_wrong)

      // Show Duolingo-style feedback bottom sheet; advance on tap
      const doAdvance = () => {
        setFeedbackSheet(null)
        if (index + 1 < exerciseCount) {
          setFlowState(`exercise_${index + 1}`)
          setPreppiMsg(PREPPI_MESSAGES.exercise)
        } else {
          setFlowState('reanswer')
          setPreppiMsg(PREPPI_MESSAGES.reanswer)
        }
      }
      setFeedbackSheet({ correct, xpGained, onContinue: doAdvance })
    },
    [addXp, ding, exerciseCount, triggerStepBurst],
  )

  // ── Re-answer: voice submission ──────────────────────────────────────────────
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

        const res  = await fetch('/api/interview/practice', { method: 'POST', body: fd })
        const data = await res.json()

        const score    = data.score ?? 5
        const passed   = data.passed ?? score >= PASS_THRESHOLD
        const feedback = data.feedback || ''

        setReanswerResult({ score, passed, feedback })

        if (passed) {
          addXp(XP_REANSWER_PASS)
          ding()
          setPreppiMsg(PREPPI_MESSAGES.complete_pass)
          setJustCompletedStep(1 + exerciseCount)
          triggerStepBurst()
          setTimeout(() => {
            setConfettiActive(true)
            setTimeout(() => setConfettiActive(false), 3000)
          }, 300)
        } else {
          setPreppiMsg(PREPPI_MESSAGES.complete_fail)
        }

        setTimeout(() => setFlowState('complete'), 1500)
      } catch {
        setReanswerResult({ score: 5, passed: false, feedback: 'Scoring unavailable. Keep practicing!' })
        setTimeout(() => setFlowState('complete'), 1500)
      } finally {
        setReanswerSubmitting(false)
      }
    },
    [sessionId, originalQuestion, originalAnswer, currentStage, bundle.teach.example.question, addXp, ding, exerciseCount, triggerStepBurst],
  )

  const startRecording = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      const mr     = new MediaRecorder(stream, { mimeType: 'audio/webm' })
      mediaRecorderRef.current  = mr
      audioChunksRef.current    = []
      mr.ondataavailable = (e) => { if (e.data.size > 0) audioChunksRef.current.push(e.data) }
      mr.onstop = async () => {
        stream.getTracks().forEach(t => t.stop())
        const blob = new Blob(audioChunksRef.current, { type: 'audio/webm' })
        await submitReanswerAudio(blob)
      }
      mr.start()
      setRecording(true)
    } catch {
      alert('Microphone access is required for voice input.')
    }
  }, [submitReanswerAudio])

  const stopRecording = useCallback(() => {
    if (mediaRecorderRef.current?.state === 'recording') {
      mediaRecorderRef.current.stop()
      setRecording(false)
    }
  }, [])

  // ── Retry (reset re-answer state) ────────────────────────────────────────────
  const handleRetry = useCallback(() => {
    setReanswerResult(null)
    setFlowState('reanswer')
    setPreppiMsg(PREPPI_MESSAGES.reanswer)
  }, [])

  const finalPassed = reanswerResult?.passed ?? false

  // ── Badge progress bar ────────────────────────────────────────────────────────

  const renderBadgeProgress = () => {
    const steps = Array.from({ length: totalSteps }, (_, i) => {
      const isTeach    = i === 0
      const isReanswer = i === totalSteps - 1
      let label = isTeach ? 'Learn' : isReanswer ? 'Apply' : `Q${i}`
      let icon: ReactNode = isTeach
        ? <BookOpen className="w-4 h-4" />
        : isReanswer
        ? <Mic className="w-4 h-4" />
        : <span className="text-xs font-bold">{i}</span>

      const isDone   = i < currentStepIndex
      const isActive = i === currentStepIndex
      const state: 'done' | 'active' | 'upcoming' = isDone ? 'done' : isActive ? 'active' : 'upcoming'

      return (
        <div key={i} className="flex items-center">
          <StepBadge
            label={label}
            icon={icon}
            state={state}
            justCompleted={justCompletedStep === i}
          />
          {i < totalSteps - 1 && (
            <div className={`h-0.5 w-4 md:w-6 transition-colors duration-500 ${isDone ? 'bg-green-300' : 'bg-gray-200'}`} />
          )}
        </div>
      )
    })

    return (
      <div className="flex items-start justify-center gap-0 overflow-x-auto pb-1">
        {steps}
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
      <div className="flex-1 min-w-0">
        {flowState !== 'intro' && flowState !== 'complete' && renderBadgeProgress()}
      </div>
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

  // ── Flow renders ──────────────────────────────────────────────────────────────

  const renderIntro = () => (
    <div className="flex flex-col items-center justify-center text-center px-6 py-12 md:py-16 min-h-[60vh] md:min-h-0">
      <div className="w-20 h-20 bg-[#d7f5b1] rounded-full flex items-center justify-center mb-6 animate-slide-up">
        <BookOpen className="w-10 h-10 text-[#58CC02]" />
      </div>
      <h2 className="text-2xl md:text-3xl font-extrabold text-gray-900 mb-3 animate-slide-up">
        Let&apos;s work on <span className="text-[#58CC02]">{bundle.displayName}</span>
      </h2>
      <p className="text-gray-500 text-base leading-relaxed max-w-md mb-8 animate-slide-up">
        {bundle.description}
      </p>

      {/* Lesson outline */}
      <div className="w-full max-w-sm bg-gray-50 rounded-2xl p-5 mb-8 text-left space-y-3 animate-slide-up">
        <div className="flex items-center gap-3">
          <div className="w-7 h-7 bg-[#d7f5b1] rounded-full flex items-center justify-center shrink-0">
            <BookOpen className="w-3.5 h-3.5 text-[#58CC02]" />
          </div>
          <div>
            <p className="text-sm font-semibold text-gray-800">Learn the technique</p>
            <p className="text-xs text-gray-400">Quick lesson with examples</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <div className="w-7 h-7 bg-[#dbeafe] rounded-full flex items-center justify-center shrink-0">
            <Sparkles className="w-3.5 h-3.5 text-[#1CB0F6]" />
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
            <p className="text-sm font-semibold text-gray-800">Voice re-answer challenge</p>
            <p className="text-xs text-gray-400">Apply what you learned for bonus XP</p>
          </div>
        </div>
      </div>

      <div className="mb-6">
        <Preppi message={preppiMsg} size="md" />
      </div>

      <button
        onClick={advanceToTeach}
        className="btn-duo-green flex items-center gap-2 px-8 py-4"
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
            <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${
              exerciseResults[index] ? 'bg-emerald-50 text-emerald-600' : 'bg-amber-50 text-amber-600'
            }`}>
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
          <h3 className="text-lg font-extrabold text-gray-900">Put it all together</h3>
          <p className="text-sm text-gray-500 mt-1">Answer this question using what you just learned.</p>
        </div>

        <div className="mb-4">
          <Preppi message={preppiMsg} size="sm" />
        </div>

        {/* The question */}
        <div className="bg-[#eff6ff] border border-[#bfdbfe] rounded-2xl p-5">
          <p className="text-xs font-semibold text-[#1CB0F6] uppercase tracking-wide mb-2">Interview Question</p>
          <p className="text-base font-semibold text-gray-900 leading-relaxed">{question}</p>
        </div>

        {/* Original answer */}
        {originalAnswer && (
          <div className="bg-red-50 border border-red-100 rounded-xl p-4">
            <p className="text-xs font-semibold text-red-400 uppercase tracking-wide mb-1">Your original answer</p>
            <p className="text-sm text-red-700 italic leading-relaxed line-clamp-3">&ldquo;{originalAnswer}&rdquo;</p>
          </div>
        )}

        {/* Score result */}
        {reanswerResult && (
          <div className={`rounded-xl p-4 border animate-slide-up ${
            reanswerResult.passed ? 'bg-emerald-50 border-emerald-200' : 'bg-amber-50 border-amber-200'
          }`}>
            <div className="flex items-center gap-2 mb-1">
              <span className={`text-sm font-bold ${reanswerResult.passed ? 'text-emerald-700' : 'text-amber-700'}`}>
                {reanswerResult.score}/10
              </span>
              <span className={`text-xs ${reanswerResult.passed ? 'text-emerald-600' : 'text-amber-600'}`}>
                {reanswerResult.passed ? '— Great improvement!' : '— Keep practicing'}
              </span>
            </div>
            <p className={`text-xs leading-relaxed ${reanswerResult.passed ? 'text-emerald-800' : 'text-amber-800'}`}>
              {reanswerResult.feedback}
            </p>
          </div>
        )}

        {/* Voice recorder */}
        {!reanswerResult && (
          <div className="text-center py-6 space-y-3">
            {reanswerSubmitting ? (
              <div className="flex flex-col items-center gap-3">
                <div className="w-8 h-8 border-2 border-[#58CC02] border-t-transparent rounded-full animate-spin" />
                <p className="text-sm text-gray-500">Scoring your answer…</p>
              </div>
            ) : recording ? (
              <>
                <div className="w-20 h-20 bg-red-50 rounded-full flex items-center justify-center mx-auto">
                  <div className="w-6 h-6 bg-red-500 rounded-full animate-pulse" />
                </div>
                <p className="text-sm font-semibold text-red-600">Recording…</p>
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
                  className="w-20 h-20 bg-[#d7f5b1] rounded-full flex items-center justify-center mx-auto hover:bg-[#c3f093] active:scale-95 transition-all shadow-lg"
                >
                  <Mic className="w-8 h-8 text-[#58CC02]" />
                </button>
                <p className="text-sm text-gray-500 font-medium">Tap to record your answer</p>
                <p className="text-xs text-gray-400">Speak clearly — just like in the real interview</p>
              </>
            )}
          </div>
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
        <div className={`w-24 h-24 rounded-full flex items-center justify-center mb-6 ${
          finalPassed ? 'bg-emerald-100 ring-4 ring-emerald-200 animate-badge-reveal' : 'bg-amber-100 ring-4 ring-amber-200'
        }`}>
          {finalPassed
            ? <Trophy className="w-12 h-12 text-emerald-600" />
            : <Star className="w-12 h-12 text-amber-600" />
          }
        </div>

        <h2 className="text-2xl md:text-3xl font-extrabold text-gray-900 mb-2">
          {finalPassed ? 'Lesson Complete! 🎉' : 'Good effort!'}
        </h2>

        {reanswerResult && (
          <div className="mb-4">
            <span className={`text-3xl font-extrabold ${scoreColor(reanswerResult.score).text}`}>
              {reanswerResult.score}/10
            </span>
            <p className="text-sm text-gray-500 mt-1">Re-answer score</p>
          </div>
        )}

        {/* Stats */}
        <div className="flex items-center justify-center gap-6 mb-6">
          <div className="text-center">
            <p className="text-2xl font-extrabold text-amber-600">{xp}</p>
            <p className="text-xs text-gray-400 font-semibold">XP Earned</p>
          </div>
          <div className="w-px h-10 bg-gray-200" />
          <div className="text-center">
            <p className="text-2xl font-extrabold text-[#1CB0F6]">{correctCount}/{exerciseCount}</p>
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

        {finalPassed && (
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-50 border border-emerald-200 rounded-full mb-4">
            <CheckCircle className="w-4 h-4 text-emerald-600" />
            <span className="text-sm font-bold text-emerald-700">{bundle.displayName} Mastered</span>
          </div>
        )}

        {reanswerResult?.feedback && (
          <p className="text-sm text-gray-500 leading-relaxed max-w-md mb-6">
            {reanswerResult.feedback}
          </p>
        )}

        <div className="mb-6">
          <Preppi message={preppiMsg} size="lg" />
        </div>

        <div className="w-full max-w-xs space-y-3">
          {/* Primary action */}
          <button
            onClick={() => onComplete(finalPassed, xp)}
            className="w-full btn-duo-green flex items-center justify-center gap-2 px-8 py-4"
          >
            {finalPassed ? 'Continue' : 'Done for now'}
            <ArrowRight className="w-5 h-5" />
          </button>

          {/* Retry button when failed */}
          {!finalPassed && (
            <button
              onClick={handleRetry}
              className="w-full btn-duo-white flex items-center justify-center gap-2 py-3.5 text-sm"
            >
              <RotateCcw className="w-4 h-4" />
              Try Again
            </button>
          )}
        </div>
      </div>
    )
  }

  // ── Main render ──────────────────────────────────────────────────────────────

  const renderCurrentStep = () => {
    if (flowState === 'intro')    return renderIntro()
    if (flowState === 'teach')    return renderTeach()
    if (flowState === 'reanswer') return renderReanswer()
    if (flowState === 'complete') return renderComplete()
    const match = flowState.match(/^exercise_(\d+)$/)
    if (match) return renderExerciseStep(parseInt(match[1], 10))
    return null
  }

  return (
    <>
      <MiniStepBurst active={stepBurst} />

      {/* Mobile: full-screen */}
      <div className="md:hidden fixed inset-0 z-40 bg-white flex flex-col overflow-hidden">
        <div className="px-4 pt-4 pb-2 shrink-0">{renderHeader()}</div>
        <div className="flex-1 overflow-y-auto px-4 pb-8">{renderCurrentStep()}</div>
      </div>

      {/* Desktop: centered modal */}
      <div className="hidden md:flex fixed inset-0 z-40 items-center justify-center bg-black/30 backdrop-blur-sm">
        <div className="w-full max-w-2xl max-h-[90vh] bg-white rounded-2xl shadow-2xl flex flex-col overflow-hidden">
          <div className="px-6 pt-5 pb-3 shrink-0 border-b border-gray-100">{renderHeader()}</div>
          <div className="flex-1 overflow-y-auto px-6 py-6">{renderCurrentStep()}</div>
        </div>
      </div>

      {/* Duolingo-style feedback bottom sheet */}
      {feedbackSheet && (
        <FeedbackBottomSheet
          correct={feedbackSheet.correct}
          xpGained={feedbackSheet.xpGained}
          onContinue={feedbackSheet.onContinue}
        />
      )}
    </>
  )
}
