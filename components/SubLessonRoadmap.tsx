'use client'

import { useState, useCallback, useEffect, useMemo } from 'react'
import { X, CheckCircle, RotateCcw, Trophy, ChevronRight, ArrowLeft, ChevronRight as CrumbChevron } from 'lucide-react'
import Confetti from '@/components/Confetti'
import { useGameFeedback } from '@/hooks/useGameFeedback'
import PracticeLessonFlow from '@/components/PracticeLessonFlow'
import FinalVoiceChallenge from '@/components/FinalVoiceChallenge'
import {
  detectAnswerStructureTemplate,
  getContextualPracticeBundle,
  type PracticeBundle,
} from '@/lib/practice-bundles'

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

interface SubLessonRoadmapProps {
  bundle: PracticeBundle
  criterion: string
  originalQuestion?: string
  originalAnswer?: string
  evidenceItems?: Array<{ question?: string; excerpt?: string }>
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

type ActiveSlot = number | null
type RequiredStepPhase = 'lesson' | 'voice'

export default function SubLessonRoadmap({
  bundle,
  criterion,
  originalQuestion,
  originalAnswer,
  evidenceItems,
  sessionId,
  currentStage,
  priorXp = 0,
  onAllComplete,
  onClose,
  embeddedDesktop = false,
  onContextChange,
}: SubLessonRoadmapProps) {
  const { ding } = useGameFeedback()

  const canonicalStructureQuestions = useMemo(
    () => ({
      present_past_future: 'Can you tell me about yourself and walk me through your background briefly?',
      star: 'Tell me about a project you are proud of.',
      noticed_fit_now: 'Why are you interested in this role?',
      answer_reason_example: 'How do you prioritize when everything feels urgent?',
    }),
    []
  )

  const structureStepNames = useMemo(
    () => ({
      present_past_future: 'Present, Past, Future',
      star: 'STAR',
      noticed_fit_now: 'Observation, Fit, Timing',
      answer_reason_example: 'Answer, Reason, Example',
    }),
    []
  )

  const [activeSlot, setActiveSlot] = useState<ActiveSlot>(null)
  const [activeRequiredPhase, setActiveRequiredPhase] = useState<RequiredStepPhase>('lesson')
  const [completedSet, setCompletedSet] = useState<Set<number>>(new Set())
  const [passedSet, setPassedSet] = useState<Set<number>>(new Set())
  const [optionalCompletedSet, setOptionalCompletedSet] = useState<Set<number>>(new Set())
  const [optionalPassedSet, setOptionalPassedSet] = useState<Set<number>>(new Set())
  const [sessionXp, setSessionXp] = useState(0)
  const [showConfetti, setShowConfetti] = useState(false)
  const [miniBurstIdx, setMiniBurstIdx] = useState<number | null>(null)
  const questionRepairs = useMemo(() => {
    const base = (evidenceItems && evidenceItems.length > 0
      ? evidenceItems
      : [{ question: originalQuestion, excerpt: originalAnswer }]
    ).filter((item) => item.question || item.excerpt)

    const normalizedBase = base.length > 0 ? base : [{ question: originalQuestion, excerpt: originalAnswer }]

    if (bundle.rootCause !== 'poor_structure') return normalizedBase

    const hasAnyUsableAnswer = normalizedBase.some((item) => {
      const excerpt = (item.excerpt || '').trim().toLowerCase()
      return Boolean(
        excerpt &&
        !excerpt.startsWith('no response provided') &&
        excerpt !== 'hello' &&
        excerpt !== 'hi'
      )
    })

    if (hasAnyUsableAnswer) return normalizedBase

    const templates: Array<'present_past_future' | 'star' | 'noticed_fit_now' | 'answer_reason_example'> = [
      'present_past_future',
      'star',
      'noticed_fit_now',
      'answer_reason_example',
    ]

    return templates.map((template) => {
      const existing = normalizedBase.find(
        (item) => detectAnswerStructureTemplate(item.question) === template
      )

      if (existing) return existing

      return {
        question: canonicalStructureQuestions[template],
        excerpt: '',
      }
    })
  }, [bundle.rootCause, canonicalStructureQuestions, evidenceItems, originalAnswer, originalQuestion])

  const contextualBundles = useMemo(
    () => questionRepairs.map((item) => getContextualPracticeBundle(bundle.rootCause, item.question)),
    [bundle.rootCause, questionRepairs]
  )

  const requiredSteps = useMemo(() => (
    questionRepairs.map((item, index) => {
      const template = detectAnswerStructureTemplate(item.question)
      return {
        label: structureStepNames[template] || contextualBundles[index]?.lessons[0]?.title || `Repair ${index + 1}`,
        description: `Write and then re-answer: ${item.question || 'this flagged question'}`,
        meta: `Question ${index + 1}`,
        evidenceIndex: index,
      }
    })
  ), [contextualBundles, questionRepairs, structureStepNames])
  const optionalLessons = bundle.rootCause === 'poor_structure' ? [] : bundle.lessons.slice(1)
  const totalSlots = requiredSteps.length
  const allDone = completedSet.size === totalSlots

  const nextAvailable = requiredSteps.findIndex((_, i) => !completedSet.has(i))
  const nextRequired = nextAvailable >= 0 ? nextAvailable : null

  const handleSlotComplete = useCallback((slotIdx: number, passed: boolean, xp: number) => {
    setActiveSlot(null)
    setActiveRequiredPhase('lesson')
    setCompletedSet(prev => { const n = new Set(prev); n.add(slotIdx); return n })
    if (passed) setPassedSet(prev => { const n = new Set(prev); n.add(slotIdx); return n })

    const newXp = sessionXp + xp
    setSessionXp(newXp)

    setMiniBurstIdx(slotIdx)
    ding()
    setTimeout(() => setMiniBurstIdx(null), 900)

    const newSize = completedSet.size + 1
    if (slotIdx < totalSlots && newSize === totalSlots) {
      setShowConfetti(true)
      setTimeout(() => setShowConfetti(false), 3500)
      setTimeout(() => onAllComplete(priorXp + newXp), 2800)
    }
  }, [sessionXp, completedSet, totalSlots, ding, onAllComplete, priorXp])

  const handleOptionalComplete = useCallback((lessonIdx: number, passed: boolean, xp: number) => {
    setActiveSlot(null)
    setActiveRequiredPhase('lesson')
    setOptionalCompletedSet(prev => { const n = new Set(prev); n.add(lessonIdx); return n })
    if (passed) setOptionalPassedSet(prev => { const n = new Set(prev); n.add(lessonIdx); return n })

    setSessionXp(prev => prev + xp)
    setMiniBurstIdx(totalSlots + lessonIdx)
    ding()
    setTimeout(() => setMiniBurstIdx(null), 900)
  }, [ding, totalSlots])

  useEffect(() => {
    if (!onContextChange) return
    onContextChange({
      title: bundle.displayName,
      items: requiredSteps.map((step, idx) => {
        const isCompleted = completedSet.has(idx)
        const isCurrent = activeSlot === idx || (activeSlot === null && idx === nextRequired && !allDone)
        const isLocked = false
        return {
          label: step.label,
          status: isCompleted ? 'complete' as const : isCurrent ? 'current' as const : isLocked ? 'locked' as const : 'upcoming' as const,
          meta: step.meta,
        }
      }),
    })
  }, [activeSlot, allDone, bundle.displayName, completedSet, nextRequired, onContextChange, requiredSteps])

  if (activeSlot !== null) {
    const isOptional = activeSlot >= totalSlots
    const requiredStep = !isOptional ? requiredSteps[activeSlot] : null
    const optionalLessonIndex = isOptional ? activeSlot - totalSlots + 1 : null
    const currentEvidence = requiredStep ? questionRepairs[requiredStep.evidenceIndex] : questionRepairs[0]
    const activeBundle = isOptional
      ? bundle
      : contextualBundles[requiredStep.evidenceIndex] || getContextualPracticeBundle(bundle.rootCause, currentEvidence?.question)
    const subLesson = isOptional
      ? bundle.lessons[optionalLessonIndex as number]
      : activeRequiredPhase === 'lesson'
        ? activeBundle.lessons[0]
        : null

    if (subLesson) {
      return (
      <div className={`${embeddedDesktop ? 'flex h-full flex-col px-8 pb-7 pt-3' : 'mx-auto h-full max-w-4xl px-4 py-8'}`}>
        {embeddedDesktop && (
          <div className="mx-auto mb-6 w-full max-w-5xl px-1">
            <div className="flex items-start justify-between gap-4">
              <div className="min-w-0">
                <div className="flex items-center gap-2 text-[11px] font-black uppercase tracking-[0.18em] text-violet-500">
                  <span>{activeBundle.displayName}</span>
                  <CrumbChevron className="h-3.5 w-3.5 text-slate-300" />
                  <span>{activeRequiredPhase === 'lesson' ? subLesson.title : 'Voice Re-Answer'}</span>
                </div>
                <div className="mt-4 flex items-center gap-3">
                  <h2 className="text-[2.3rem] font-black leading-none tracking-tight text-slate-900">
                    {activeRequiredPhase === 'lesson' ? subLesson.title : 'Voice Re-Answer'}
                  </h2>
                  <span className="rounded-full border border-violet-200 bg-violet-50 px-3 py-1 text-[11px] font-black uppercase tracking-[0.16em] text-violet-700">
                    {isOptional ? `Optional ${optionalLessonIndex}` : 'Draft + voice'}
                  </span>
                </div>
                <p className="mt-3 max-w-2xl text-base leading-7 text-slate-500">
                  {isOptional
                    ? 'Extra reps if you want to keep sharpening the skill after the main retry.'
                    : activeRequiredPhase === 'lesson'
                      ? 'We will use your flagged answer, teach the fix, and build the script for the retry.'
                      : 'Now say the repaired version out loud while it is still fresh.'}
                </p>
              </div>
              <button
                onClick={() => {
                  setActiveSlot(null)
                  setActiveRequiredPhase('lesson')
                }}
                className="inline-flex shrink-0 items-center gap-2 rounded-full border border-slate-200 bg-white px-4 py-2.5 text-sm font-bold text-slate-600 transition hover:border-slate-300 hover:text-slate-800"
              >
                <ArrowLeft className="h-3.5 w-3.5" />
                Back to Path
              </button>
            </div>
            <div className="mt-6 flex items-center gap-4">
              <div className="h-3 flex-1 overflow-hidden rounded-full bg-slate-100">
                <div
                  className="h-full rounded-full bg-[linear-gradient(90deg,#8b5cf6_0%,#6d28d9_100%)]"
                  style={{ width: `${isOptional ? 100 : ((activeSlot + 1) / totalSlots) * 100}%` }}
                />
              </div>
              <span className="text-xs font-bold uppercase tracking-[0.16em] text-slate-400">
                {isOptional ? 'Optional practice' : `Step ${activeSlot + 1} / ${totalSlots}`}
              </span>
            </div>
          </div>
        )}
        <div className={`${embeddedDesktop ? 'mx-auto min-h-0 w-full max-w-5xl flex-1 rounded-[2rem] border border-slate-200/80 bg-white/92 px-7 py-6 shadow-[0_16px_34px_rgba(15,23,42,0.06)] backdrop-blur-sm' : ''}`}>
          <PracticeLessonFlow
            subLesson={subLesson}
            lessonNumber={isOptional ? optionalLessonIndex as number : 1}
            totalLessons={isOptional ? optionalLessons.length : 1}
            criterion={criterion}
            originalQuestion={currentEvidence?.question}
            originalAnswer={currentEvidence?.excerpt}
            onComplete={(passed, xp) => {
              if (isOptional) {
                handleOptionalComplete(optionalLessonIndex as number, passed, xp)
                return
              }
              setSessionXp((prev) => prev + xp)
              setActiveRequiredPhase('voice')
            }}
            onClose={() => {
              setActiveSlot(null)
              setActiveRequiredPhase('lesson')
            }}
            embeddedDesktop={embeddedDesktop}
            mode={isOptional ? 'optional' : 'core'}
          />
        </div>
      </div>
      )
    }
    if (!isOptional && activeRequiredPhase === 'voice' && requiredStep) {
      const currentEvidence = questionRepairs[requiredStep.evidenceIndex]
      return (
      <div className={`${embeddedDesktop ? 'flex h-full flex-col px-8 pb-7 pt-3' : 'mx-auto h-full max-w-4xl px-4 py-8'}`}>
        {embeddedDesktop && (
          <div className="mx-auto mb-6 w-full max-w-5xl px-1">
            <div className="flex items-start justify-between gap-4">
              <div className="min-w-0">
                <div className="flex items-center gap-2 text-[11px] font-black uppercase tracking-[0.18em] text-violet-500">
                  <span>{contextualBundles[requiredStep.evidenceIndex]?.displayName || bundle.displayName}</span>
                  <CrumbChevron className="h-3.5 w-3.5 text-slate-300" />
                  <span>Voice Re-Answer</span>
                </div>
                <div className="mt-4 flex items-center gap-3">
                  <h2 className="text-[2.3rem] font-black leading-none tracking-tight text-slate-900">Voice Re-Answer</h2>
                  <span className="rounded-full border border-violet-200 bg-violet-50 px-3 py-1 text-[11px] font-black uppercase tracking-[0.16em] text-violet-700">
                    Step {activeSlot + 1} of {totalSlots}
                  </span>
                </div>
                <p className="mt-3 max-w-2xl text-base leading-7 text-slate-500">
                  Re-answer the original question using the stronger structure you just practiced.
                </p>
              </div>
              <button
                onClick={() => {
                  setActiveSlot(null)
                  setActiveRequiredPhase('lesson')
                }}
                className="inline-flex shrink-0 items-center gap-2 rounded-full border border-slate-200 bg-white px-4 py-2.5 text-sm font-bold text-slate-600 transition hover:border-slate-300 hover:text-slate-800"
              >
                <ArrowLeft className="h-3.5 w-3.5" />
                Back to Path
              </button>
            </div>
            <div className="mt-6 flex items-center gap-4">
              <div className="h-3 flex-1 overflow-hidden rounded-full bg-slate-100">
                <div
                  className="h-full rounded-full bg-[linear-gradient(90deg,#8b5cf6_0%,#6d28d9_100%)]"
                  style={{ width: '100%' }}
                />
              </div>
              <span className="text-xs font-bold uppercase tracking-[0.16em] text-slate-400">
                Step {activeSlot + 1} / {totalSlots}
              </span>
            </div>
          </div>
        )}
        <div className={`${embeddedDesktop ? 'mx-auto min-h-0 w-full max-w-5xl flex-1 rounded-[2rem] border border-slate-200/80 bg-white/92 px-7 py-6 shadow-[0_16px_34px_rgba(15,23,42,0.06)] backdrop-blur-sm' : ''}`}>
          <FinalVoiceChallenge
            question={currentEvidence?.question || 'Tell me about a challenge you overcame.'}
            originalAnswer={currentEvidence?.excerpt}
            sessionId={sessionId}
            currentStage={currentStage}
            criterion={criterion}
            onComplete={(passed, xp) => handleSlotComplete(activeSlot, passed, xp)}
            onClose={() => {
              setActiveSlot(null)
              setActiveRequiredPhase('lesson')
            }}
            embeddedDesktop={embeddedDesktop}
          />
        </div>
      </div>
      )
    }
  }

  const pathSummary = allDone
    ? 'Core path complete. You can stop here or keep going with optional practice.'
    : completedSet.size === 0
    ? `${questionRepairs.length} flagged question${questionRepairs.length === 1 ? '' : 's'} to repair. Each one gets one repair loop: draft, then voice retry.`
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
        <div className={`${embeddedDesktop ? 'h-full px-0 pb-0 pt-3' : 'mx-auto h-full max-w-4xl px-4 py-8'}`}>
          {embeddedDesktop && (
            <div className="mx-auto mb-6 w-full max-w-5xl px-1">
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0">
                  <div className="flex items-center gap-2 text-[11px] font-black uppercase tracking-[0.18em] text-violet-500">
                    <span>{criterion}</span>
                    <CrumbChevron className="h-3.5 w-3.5 text-slate-300" />
                    <span>{bundle.displayName}</span>
                  </div>
                  <div className="mt-4 flex items-center gap-3">
                    <h2 className="text-[2.3rem] font-black leading-none tracking-tight text-slate-900">{bundle.displayName}</h2>
                    <span className="rounded-full border border-violet-200 bg-violet-50 px-3 py-1 text-[11px] font-black uppercase tracking-[0.16em] text-violet-700">
                      {totalSlots} steps
                    </span>
                  </div>
                  <p className="mt-3 max-w-2xl text-base leading-7 text-slate-500">
                    {pathSummary}
                  </p>
                </div>
                <button
                  onClick={onClose}
                  className="inline-flex shrink-0 items-center gap-2 rounded-full border border-slate-200 bg-white px-4 py-2.5 text-sm font-bold text-slate-600 transition hover:border-slate-300 hover:text-slate-800"
                >
                  <ArrowLeft className="h-3.5 w-3.5" />
                  Back to Practice
                </button>
              </div>
              <div className="mt-6 flex items-center gap-4">
                <div className="h-3 flex-1 overflow-hidden rounded-full bg-slate-100">
                  <div
                    className="h-full rounded-full bg-[linear-gradient(90deg,#8b5cf6_0%,#6d28d9_100%)]"
                    style={{ width: `${(completedSet.size / totalSlots) * 100}%` }}
                  />
                </div>
                <span className="text-xs font-bold uppercase tracking-[0.16em] text-slate-400">
                  {completedSet.size} / {totalSlots} complete
                </span>
              </div>
            </div>
          )}

            <div className={`${embeddedDesktop ? 'mx-auto min-h-0 w-full max-w-5xl overflow-hidden rounded-[2rem] border border-slate-200/80 bg-white/92 px-7 py-6 shadow-[0_16px_34px_rgba(15,23,42,0.06)] backdrop-blur-sm' : 'premium-panel overflow-hidden p-5 sm:p-6'}`}>
            <div className={`${embeddedDesktop ? '' : ''}`}>
              <div className="mb-5 flex items-center justify-between">
                <div>
                  <p className="text-xs font-black uppercase tracking-[0.24em] text-violet-500">Coaching Path</p>
                  <h3 className="mt-1 text-xl font-black text-slate-900">{criterion}</h3>
                  <p className="mt-1 text-sm text-slate-500">{bundle.displayName}</p>
                </div>
                <div className="rounded-full border border-violet-200 bg-violet-50 px-3 py-1 text-xs font-bold text-violet-700">
                  {totalSlots} steps
                </div>
              </div>

              <div className="space-y-4">
                {requiredSteps.map((step, idx) => {
                  const isCompleted = completedSet.has(idx)
                  const isPassed = passedSet.has(idx)
                  const isNext = idx === nextRequired && !allDone
                  const isMini = miniBurstIdx === idx
                  const isLocked = false

                  return (
                    <div key={idx} className="relative">
                      {idx < totalSlots - 1 && (
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
                            : 'bg-white text-violet-700 ring-1 ring-violet-200'
                        }`}>
                          {isCompleted && isPassed ? (
                            <CheckCircle className="h-6 w-6" />
                          ) : isCompleted ? (
                            <RotateCcw className="h-5 w-5" />
                          ) : (
                            <span className="text-sm font-black">{idx + 1}</span>
                          )}
                        </div>

                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2">
                            <p className="text-sm font-black text-slate-900">{step.label}</p>
                            <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${
                              isCompleted && isPassed
                                ? 'bg-emerald-100 text-emerald-700'
                                : isCompleted
                                ? 'bg-amber-100 text-amber-700'
                                : 'bg-slate-100 text-slate-500'
                            }`}>
                              {isCompleted && isPassed ? 'Passed' : step.meta}
                            </span>
                          </div>
                          <p className="mt-1 text-sm leading-6 text-slate-600">
                            {step.description}
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
                  <p className="text-sm font-semibold text-emerald-800">You completed the core path. If you want more reps, the optional lessons are below.</p>
                </div>
              )}

              {allDone && optionalLessons.length > 0 && (
                <div className="mt-6 rounded-[1.6rem] border border-slate-200 bg-slate-50/80 p-4">
                  <div className="mb-4">
                    <p className="text-xs font-black uppercase tracking-[0.2em] text-slate-400">Optional practice</p>
                    <h4 className="mt-1 text-lg font-black text-slate-900">More reps if you want them</h4>
                    <p className="mt-1 text-sm leading-6 text-slate-500">
                      These are extra drills. Helpful if you want more reps, but not required to finish the module.
                    </p>
                  </div>
                  <div className="space-y-3">
                    {optionalLessons.map((lesson, idx) => {
                      const optionalKey = idx + 1
                      const isCompleted = optionalCompletedSet.has(optionalKey)
                      const isPassed = optionalPassedSet.has(optionalKey)
                      const isMini = miniBurstIdx === totalSlots + optionalKey
                      return (
                        <div key={lesson.title} className="relative">
                          <div className="absolute inset-0 pointer-events-none">
                            <MiniConfettiBurst active={isMini} />
                          </div>
                          <button
                            onClick={() => setActiveSlot(totalSlots + idx)}
                            className={`flex w-full items-start gap-4 rounded-[1.35rem] border p-4 text-left transition-all hover:shadow-[0_18px_30px_rgba(15,23,42,0.08)] ${
                              isCompleted && isPassed
                                ? 'border-emerald-200 bg-emerald-50/90'
                                : 'border-slate-200/80 bg-white/96'
                            }`}
                          >
                            <div className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-[1rem] ${
                              isCompleted && isPassed ? 'bg-emerald-500 text-white' : 'bg-white text-violet-700 ring-1 ring-violet-200'
                            }`}>
                              {isCompleted && isPassed ? <CheckCircle className="h-6 w-6" /> : <span className="text-sm font-black">{optionalKey + 1}</span>}
                            </div>
                            <div className="min-w-0 flex-1">
                              <div className="flex items-center gap-2">
                                <p className="text-sm font-black text-slate-900">{lesson.title}</p>
                                <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-bold text-slate-500">
                                  Optional
                                </span>
                              </div>
                              <p className="mt-1 text-sm leading-6 text-slate-600">
                                Extra pattern work if you want more reps before your next interview.
                              </p>
                            </div>
                            <ChevronRight className="mt-1 h-5 w-5 shrink-0 text-slate-400" />
                          </button>
                        </div>
                      )
                    })}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
