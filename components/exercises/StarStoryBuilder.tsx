'use client'

import { type ReactNode, useCallback, useEffect, useMemo, useState } from 'react'
import {
  ArrowLeft,
  ArrowRight,
  Check,
  CheckCircle2,
  ChevronRight,
  Lightbulb,
  Lock,
  Sparkles,
  Target,
} from 'lucide-react'
import {
  STORY_TYPES,
  STORY_SETTINGS,
  STAKES,
  USER_ROLES,
  ACTIONS_TAKEN,
  ACTION_DETAIL_PROMPTS,
  RESULT_TYPES,
  HAS_METRIC_OPTIONS,
  METRIC_TYPES,
  NON_METRIC_PROOFS,
  COMPETENCIES,
  DEFAULT_COMPETENCIES_BY_STORY_TYPE,
  SITUATION_DETAIL_PLACEHOLDERS,
  PROGRESS_STEPS,
  getSituationOptions,
  type StoryType,
  type StarStoryOutput,
} from '@/lib/star-story-config'
import { PORTFOLIO_DEMO_MODE, getDemoContextPayload } from '@/lib/portfolio-demo'

interface StarStoryBuilderProps {
  sessionId?: string
  originalQuestion?: string
  originalAnswer?: string
  onComplete: () => void
}

type Step =
  | 'intro'
  | 'method'
  | 'story_type'
  | 'setting'
  | 'situation'
  | 'situation_detail'
  | 'stakes'
  | 'role'
  | 'actions'
  | 'action_details'
  | 'result_type'
  | 'result_detail'
  | 'competencies'
  | 'notes'
  | 'generating'
  | 'output'

const STEP_TO_PROGRESS: Record<string, number> = {
  story_type: 0,
  setting: 1,
  situation: 2,
  situation_detail: 2,
  stakes: 3,
  role: 4,
  actions: 5,
  action_details: 5,
  result_type: 6,
  result_detail: 6,
  competencies: 7,
  notes: 8,
  generating: 8,
  output: 8,
}

const FRAMEWORK_STEPS = [
  { key: 'situation', label: 'Situation', description: 'Set the scene in 1-2 sentences. Who, where, when. Just enough to follow.', color: 'sky', emoji: '🎬' },
  { key: 'task', label: 'Task', description: 'What was specifically at stake or yours to own?', color: 'amber', emoji: '🎯' },
  { key: 'action', label: 'Action', description: 'The biggest weight goes here. What did you actually do?', color: 'violet', emoji: '⚡' },
  { key: 'result', label: 'Result', description: 'Close with what changed. Numbers if you have them, real outcome if you don\'t.', color: 'emerald', emoji: '✅' },
]

const COLOR_MAP: Record<string, { bg: string; border: string; text: string; soft: string }> = {
  violet: { bg: 'bg-violet-500', border: 'border-violet-300', text: 'text-violet-700', soft: 'bg-violet-50' },
  emerald: { bg: 'bg-emerald-500', border: 'border-emerald-300', text: 'text-emerald-700', soft: 'bg-emerald-50' },
  sky: { bg: 'bg-sky-500', border: 'border-sky-300', text: 'text-sky-700', soft: 'bg-sky-50' },
  amber: { bg: 'bg-amber-500', border: 'border-amber-300', text: 'text-amber-700', soft: 'bg-amber-50' },
}

export default function StarStoryBuilder({
  sessionId,
  originalQuestion,
  originalAnswer,
  onComplete,
}: StarStoryBuilderProps) {
  const [step, setStep] = useState<Step>('intro')
  const [flippedCards, setFlippedCards] = useState<Set<number>>(new Set())

  // Story input state
  const [storyType, setStoryType] = useState<StoryType | null>(null)
  const [setting, setSetting] = useState<string | null>(null)
  const [contextName, setContextName] = useState('')
  const [situationType, setSituationType] = useState<string | null>(null)
  const [situationDetail, setSituationDetail] = useState('')
  const [stakes, setStakes] = useState<string[]>([])
  const [stakeOtherDetail, setStakeOtherDetail] = useState('')
  const [userRole, setUserRole] = useState<string | null>(null)
  const [roleOtherDetail, setRoleOtherDetail] = useState('')
  const [roleDetail, setRoleDetail] = useState('')
  const [actionsTaken, setActionsTaken] = useState<string[]>([])
  const [actionDetails, setActionDetails] = useState<Record<string, string>>({})
  const [resultTypes, setResultTypes] = useState<string[]>([])
  const [hasMetric, setHasMetric] = useState<string | null>(null)
  const [metricType, setMetricType] = useState<string | null>(null)
  const [metricValue, setMetricValue] = useState('')
  const [metricContext, setMetricContext] = useState('')
  const [nonMetricProofs, setNonMetricProofs] = useState<string[]>([])
  const [proofDetail, setProofDetail] = useState('')
  const [competencies, setCompetencies] = useState<string[]>([])
  const [additionalNotes, setAdditionalNotes] = useState('')

  // Output
  const [output, setOutput] = useState<StarStoryOutput | null>(null)
  const [generateError, setGenerateError] = useState(false)
  const [outputPanel, setOutputPanel] = useState<'answer' | 'breakdown' | 'follow_up'>('answer')
  const [answerLength, setAnswerLength] = useState<'sixty' | 'thirty'>('sixty')

  // Auto-select default competencies when story type changes
  useEffect(() => {
    if (storyType && competencies.length === 0) {
      const defaults = DEFAULT_COMPETENCIES_BY_STORY_TYPE[storyType] || []
      setCompetencies(defaults)
    }
  }, [storyType]) // eslint-disable-line react-hooks/exhaustive-deps

  const situationOptions = useMemo(
    () => (storyType ? getSituationOptions(storyType) : []),
    [storyType]
  )

  const allMethodFlipped = flippedCards.size >= FRAMEWORK_STEPS.length
  const progressIndex = STEP_TO_PROGRESS[step] ?? -1

  function flipCard(i: number) {
    setFlippedCards((prev) => {
      const next = new Set(prev)
      next.add(i)
      return next
    })
  }

  function toggleMulti(list: string[], item: string, setter: (v: string[]) => void, max: number) {
    if (list.includes(item)) {
      setter(list.filter((x) => x !== item))
    } else if (list.length < max) {
      setter([...list, item])
    }
  }

  // Validation per step
  function canAdvance(): boolean {
    switch (step) {
      case 'story_type': return !!storyType
      case 'setting': return !!setting
      case 'situation': return !!situationType
      case 'situation_detail': return situationType !== 'other' || situationDetail.trim().length > 0
      case 'stakes':
        if (stakes.length < 1) return false
        if (stakes.includes('other') && !stakeOtherDetail.trim()) return false
        return true
      case 'role':
        if (!userRole) return false
        if (userRole === 'other' && !roleOtherDetail.trim()) return false
        return true
      case 'actions': return actionsTaken.length >= 2
      case 'action_details':
        if (actionsTaken.includes('other') && !actionDetails['other']?.trim()) return false
        return true
      case 'result_type': return resultTypes.length >= 1
      case 'result_detail':
        if (hasMetric === null) return false
        if (hasMetric === 'yes' && (!metricType || !metricValue.trim())) return false
        if ((hasMetric === 'no' || hasMetric === 'not_sure') && nonMetricProofs.length < 1) return false
        return true
      case 'competencies': return competencies.length >= 1
      case 'notes': return true
      default: return true
    }
  }

  const nextStep = useCallback(() => {
    const flow: Step[] = [
      'intro', 'method', 'story_type', 'setting', 'situation', 'situation_detail',
      'stakes', 'role', 'actions', 'action_details', 'result_type', 'result_detail',
      'competencies', 'notes', 'generating',
    ]
    const idx = flow.indexOf(step)
    if (idx >= 0 && idx < flow.length - 1) {
      setStep(flow[idx + 1])
    }
  }, [step])

  const prevStep = useCallback(() => {
    const flow: Step[] = [
      'intro', 'method', 'story_type', 'setting', 'situation', 'situation_detail',
      'stakes', 'role', 'actions', 'action_details', 'result_type', 'result_detail',
      'competencies', 'notes',
    ]
    const idx = flow.indexOf(step)
    if (idx > 0) {
      setStep(flow[idx - 1])
    }
  }, [step])

  // Generate STAR answer
  useEffect(() => {
    if (step !== 'generating') return
    let cancelled = false

    async function generate() {
      try {
        const res = await fetch('/api/interview/star-story', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            sessionId,
            storyType,
            setting,
            contextName: contextName.trim() || undefined,
            situationType,
            situationDetail: situationDetail.trim() || undefined,
            stakes,
            stakeOtherDetail: stakes.includes('other') ? stakeOtherDetail.trim() : undefined,
            userRole,
            roleOtherDetail: userRole === 'other' ? roleOtherDetail.trim() : undefined,
            roleDetail: roleDetail.trim() || undefined,
            actionsTaken,
            actionDetails: actionsTaken.map((id) => ({ actionId: id, detail: actionDetails[id]?.trim() || undefined })),
            resultTypes,
            hasMetric,
            metricType: hasMetric === 'yes' ? metricType : undefined,
            metricValue: hasMetric === 'yes' ? metricValue.trim() : undefined,
            metricContext: hasMetric === 'yes' ? metricContext.trim() : undefined,
            nonMetricProofs: hasMetric !== 'yes' ? nonMetricProofs : undefined,
            proofDetail: hasMetric !== 'yes' ? proofDetail.trim() : undefined,
            competencies,
            additionalNotes: additionalNotes.trim() || undefined,
            ...(PORTFOLIO_DEMO_MODE ? getDemoContextPayload() : {}),
          }),
        })
        if (!res.ok) throw new Error('failed')
        const data = await res.json()
        if (cancelled) return
        if (data.starBreakdown) {
          setOutput(data as StarStoryOutput)
          setStep('output')
        } else {
          setGenerateError(true)
          setStep('notes')
        }
      } catch {
        if (cancelled) return
        setGenerateError(true)
        setStep('notes')
      }
    }

    generate()
    return () => { cancelled = true }
  }, [step]) // eslint-disable-line react-hooks/exhaustive-deps

  // Render helpers
  function renderProgressBar() {
    if (progressIndex < 0) return null
    return (
      <div className="flex items-center gap-1 px-5 py-2 border-b border-slate-100 bg-white">
        {PROGRESS_STEPS.map((label, i) => (
          <div key={label} className="flex items-center gap-1 flex-1">
            <div
              className={`h-1.5 flex-1 rounded-full transition-all ${
                i < progressIndex ? 'bg-violet-500' : i === progressIndex ? 'bg-violet-400' : 'bg-slate-200'
              }`}
            />
          </div>
        ))}
      </div>
    )
  }

  function renderCardSelect(
    options: readonly { readonly id: string; readonly label: string; readonly description?: string }[],
    selected: string | null,
    onSelect: (id: string) => void,
    autoAdvance = false
  ) {
    return (
      <div className="workshop-choice-grid">
        {options.map((opt) => {
          const isSelected = selected === opt.id
          return (
            <button
              key={opt.id}
              type="button"
              onClick={() => {
                onSelect(opt.id)
                if (autoAdvance) {
                  setTimeout(nextStep, 200)
                }
              }}
              className={`workshop-choice-card group ${
                isSelected
                  ? 'border-violet-400 bg-violet-50 shadow-sm'
                  : 'border-slate-200 bg-white hover:border-violet-300 hover:bg-violet-50/50'
              }`}
            >
              <div className="flex items-center gap-3">
                <div
                  className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2 transition ${
                    isSelected ? 'border-violet-500 bg-violet-500' : 'border-slate-300'
                  }`}
                >
                  {isSelected && <Check className="h-3 w-3 text-white" />}
                </div>
                <div className="min-w-0 flex-1">
                  <p className={`text-sm font-bold ${isSelected ? 'text-violet-900' : 'text-slate-800'}`}>{opt.label}</p>
                  {opt.description && (
                    <p className="mt-0.5 text-xs leading-5 text-slate-500">{opt.description}</p>
                  )}
                </div>
              </div>
            </button>
          )
        })}
      </div>
    )
  }

  function renderChipSelect(
    options: readonly { readonly id: string; readonly label: string }[],
    selected: string[],
    toggle: (id: string) => void,
    min: number,
    max: number
  ) {
    return (
      <div>
        <div className="flex flex-wrap gap-2">
          {options.map((opt) => {
            const isSelected = selected.includes(opt.id)
            const atMax = selected.length >= max && !isSelected
            return (
              <button
                key={opt.id}
                type="button"
                onClick={() => toggle(opt.id)}
                disabled={atMax}
                className={`rounded-full border-2 px-3.5 py-1.5 text-sm font-bold transition active:scale-95 ${
                  isSelected
                    ? 'border-violet-400 bg-violet-500 text-white shadow-sm'
                    : atMax
                    ? 'border-slate-100 bg-slate-50 text-slate-300 cursor-not-allowed'
                    : 'border-slate-200 bg-white text-slate-700 hover:border-violet-300 hover:bg-violet-50'
                }`}
              >
                {isSelected && <Check className="mr-1 -ml-1 inline h-3.5 w-3.5" />}
                {opt.label}
              </button>
            )
          })}
        </div>
        <p className="mt-3 text-xs font-bold text-slate-500">
          {selected.length} selected · {selected.length < min ? `need at least ${min}` : `max ${max}`}
        </p>
      </div>
    )
  }

  function renderStepShell(
    title: string,
    subtitle: string,
    children: ReactNode,
    footer?: ReactNode
  ) {
    return (
      <div className="workshop-screen">
        {renderProgressBar()}
        <div className="workshop-header bg-gradient-to-br from-violet-50 via-white to-sky-50">
          <h2 className="text-xl font-extrabold leading-tight text-slate-900">{title}</h2>
          <p className="mt-1 text-xs leading-5 text-slate-500">{subtitle}</p>
        </div>
        <div className="workshop-body">
          {children}
        </div>
        <div className="workshop-footer">
          {footer || (
            <div className="flex items-center gap-2">
              {step !== 'story_type' && (
                <button
                  onClick={prevStep}
                  className="flex items-center gap-1 rounded-xl border border-slate-200 bg-white px-4 py-3 text-xs font-bold text-slate-600 hover:bg-slate-50"
                >
                  <ArrowLeft className="h-3.5 w-3.5" />
                  Back
                </button>
              )}
              <button
                onClick={nextStep}
                disabled={!canAdvance()}
                className="btn-coach-primary flex flex-1 items-center justify-center gap-2 py-3 text-sm font-bold disabled:opacity-50"
              >
                Continue
                <ArrowRight className="h-4 w-4" />
              </button>
            </div>
          )}
        </div>
      </div>
    )
  }

  return (
    <div className="workshop-frame">
      {/* INTRO */}
      {step === 'intro' && (
        <div className="workshop-screen">
          <div className="workshop-header bg-gradient-to-br from-violet-50 via-white to-sky-50">
            <div className="flex items-center gap-2">
              <span className="rounded-full bg-violet-100 px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.16em] text-violet-700">
                Why this matters
              </span>
              <span className="rounded-full bg-slate-100 px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.14em] text-slate-600">
                STAR
              </span>
            </div>
            <h2 className="mt-3 text-xl font-extrabold leading-tight text-slate-900">
              Interviewers want proof, not opinions.
            </h2>
          </div>

          <div className="workshop-body">
            <div className="workshop-intro-stack">
              <div className="workshop-intro-card border border-violet-100 bg-violet-50/60">
                <div className="flex items-start gap-3">
                  <div className="workshop-intro-icon bg-violet-500 text-white">
                    <Lightbulb className="h-4 w-4" />
                  </div>
                  <p className="workshop-intro-copy text-sm leading-7 text-slate-800">
                    A vague example sounds like talk. A specific one sounds like evidence.
                    STAR forces you to show the work: the scene, the stakes, the moves, the outcome.
                  </p>
                </div>
              </div>

              <div className="workshop-intro-card border border-slate-200 bg-slate-50">
                <div className="flex items-start gap-3">
                  <div className="workshop-intro-icon bg-slate-700 text-white">
                    <Target className="h-4 w-4" />
                  </div>
                  <div>
                    <p className="text-[10px] font-black uppercase tracking-[0.16em] text-slate-500">When to use it</p>
                    <p className="workshop-intro-copy mt-1 text-sm leading-6 text-slate-800">
                      Use it any time you hear &ldquo;tell me about a time&rdquo;, &ldquo;give me an example&rdquo;,
                      or &ldquo;walk me through how you handled...&rdquo;
                    </p>
                  </div>
                </div>
              </div>

              {originalAnswer && (
                <div className="workshop-intro-card border border-rose-100 bg-rose-50/50">
                  <p className="text-[10px] font-black uppercase tracking-[0.16em] text-rose-600">
                    What you said in the interview
                  </p>
                  {originalQuestion && (
                    <p className="mt-1 text-[11px] font-bold leading-5 text-rose-800">
                      Q: {originalQuestion}
                    </p>
                  )}
                  <p className="workshop-intro-copy mt-2 text-sm italic leading-6 text-rose-900">
                    &ldquo;{originalAnswer.length > 220 ? originalAnswer.slice(0, 220).trim() + '…' : originalAnswer}&rdquo;
                  </p>
                  <p className="mt-3 text-xs font-bold text-rose-700">
                    We&apos;re going to build a better version using the experience in the interview context.
                  </p>
                </div>
              )}
            </div>
          </div>

          <div className="workshop-footer">
            <button
              onClick={() => setStep('method')}
              className="btn-coach-primary flex w-full items-center justify-center gap-2 py-3 text-sm font-bold"
            >
              See the method
              <ArrowRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}

      {/* METHOD — flip cards */}
      {step === 'method' && (
        <div className="workshop-screen">
          <div className="workshop-header bg-gradient-to-br from-sky-50 via-white to-violet-50">
            <span className="rounded-full bg-sky-100 px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.16em] text-sky-700">
              The Method
            </span>
            <h2 className="mt-2 text-xl font-extrabold leading-tight text-slate-900">
              Situation · Task · Action · Result
            </h2>
            <p className="mt-1 text-xs font-bold text-slate-500">
              Flip each card in order to unlock the next.
            </p>
          </div>

          <div className="workshop-body">
            <div className="space-y-2">
              {FRAMEWORK_STEPS.map((fs, i) => {
                const colors = COLOR_MAP[fs.color]
                const flipped = flippedCards.has(i)
                const previousFlipped = i === 0 || flippedCards.has(i - 1)
                const isNext = !flipped && previousFlipped
                const locked = !flipped && !previousFlipped

                return (
                  <div
                    key={fs.key}
                    className={`flip-card relative ${flipped ? 'flipped' : ''}`}
                    style={{ height: '84px' }}
                  >
                    <div className="flip-card-inner">
                      <button
                        type="button"
                        onClick={() => isNext && flipCard(i)}
                        disabled={!isNext}
                        className={`flip-card-face w-full rounded-2xl border-2 px-4 py-3 text-left transition ${
                          locked
                            ? 'border-slate-200 bg-slate-100 opacity-50 cursor-not-allowed'
                            : `border-dashed ${colors.border} ${colors.soft} ${isNext ? 'animate-wiggle cursor-pointer hover:shadow-md' : ''}`
                        }`}
                      >
                        <div className="flex h-full items-center gap-3">
                          <div
                            className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-xl text-xl ${
                              locked ? 'bg-slate-200 text-slate-400' : `${colors.bg} text-white`
                            }`}
                          >
                            {locked ? <Lock className="h-5 w-5" /> : i + 1}
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className={`text-sm font-extrabold ${locked ? 'text-slate-400' : colors.text}`}>
                              Step {i + 1}
                            </p>
                            <p className={`text-xs font-bold ${locked ? 'text-slate-400' : 'text-slate-600'}`}>
                              {locked ? 'Flip the previous card first' : 'Tap to flip'}
                            </p>
                          </div>
                        </div>
                      </button>

                      <div className={`flip-card-face flip-card-back w-full rounded-2xl border-2 ${colors.border} ${colors.soft} px-4 py-3 shadow-sm`}>
                        <div className="flex h-full items-start gap-3">
                          <div className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-xl ${colors.bg} text-xl text-white`}>
                            {fs.emoji}
                          </div>
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center justify-between gap-2">
                              <p className={`text-sm font-extrabold ${colors.text}`}>{fs.label}</p>
                              <Check className={`h-4 w-4 ${colors.text}`} />
                            </div>
                            <p className="mt-0.5 text-xs leading-5 text-slate-700">{fs.description}</p>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>

            <p className="mt-2 text-center text-[11px] font-bold uppercase tracking-[0.16em] text-slate-400">
              {flippedCards.size}/{FRAMEWORK_STEPS.length} flipped
            </p>
          </div>

          <div className="workshop-footer">
            <button
              onClick={() => setStep('story_type')}
              disabled={!allMethodFlipped}
              className="btn-coach-primary flex w-full items-center justify-center gap-2 py-3 text-sm font-bold disabled:opacity-50"
            >
              {allMethodFlipped ? 'Choose a real example' : 'Flip every card to continue'}
              <ArrowRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}

      {/* STEP 1: Story Type */}
      {step === 'story_type' &&
        renderStepShell(
          'Choose a real example',
          'Pick the kind of moment you want to turn into an interview answer. You don\'t need to write the answer yet.',
          renderCardSelect(STORY_TYPES, storyType, (id) => setStoryType(id as StoryType)),
          <button
            onClick={nextStep}
            disabled={!canAdvance()}
            className="btn-coach-primary flex w-full items-center justify-center gap-2 py-3 text-sm font-bold disabled:opacity-50"
          >
            Continue
            <ArrowRight className="h-4 w-4" />
          </button>
        )
      }

      {/* STEP 2: Setting */}
      {step === 'setting' &&
        renderStepShell(
          'Where did this happen?',
          'Pick the setting. You can add a company, project, or context name if you remember it.',
          <div className="space-y-5">
            {renderCardSelect(
              STORY_SETTINGS.map((s) => ({ ...s, description: undefined })),
              setting,
              setSetting
            )}
            <div>
              <label className="block text-xs font-bold text-slate-600">
                Company, project, or context name
                <span className="ml-1 font-normal text-slate-400">(optional)</span>
              </label>
              <input
                type="text"
                value={contextName}
                onChange={(e) => setContextName(e.target.value.slice(0, 80))}
                placeholder="Name the setting without using a real employer name."
                className="mt-1.5 w-full rounded-xl border-2 border-slate-200 bg-white px-3 py-2.5 text-sm leading-6 text-slate-800 placeholder:text-slate-400 focus:border-violet-400 focus:outline-none focus:ring-2 focus:ring-violet-200"
              />
            </div>
          </div>
        )
      }

      {/* STEP 3: Situation Type */}
      {step === 'situation' &&
        renderStepShell(
          'What was happening?',
          'Pick the option that best describes the situation.',
          renderCardSelect(
            situationOptions.map((s) => ({ ...s, description: undefined })),
            situationType,
            setSituationType
          )
        )
      }

      {/* STEP 4: Situation Detail */}
      {step === 'situation_detail' &&
        renderStepShell(
          'Add one specific detail',
          'Keep this short. Just say what the actual situation was.',
          <div>
            <label className="block text-sm font-bold text-slate-800">
              What was the actual issue?
              {situationType !== 'other' && (
                <span className="ml-1 font-normal text-slate-400">(optional but encouraged)</span>
              )}
            </label>
            <textarea
              value={situationDetail}
              onChange={(e) => setSituationDetail(e.target.value.slice(0, 180))}
              placeholder={storyType ? SITUATION_DETAIL_PLACEHOLDERS[storyType] || '' : ''}
              rows={3}
              className="mt-2 w-full rounded-xl border-2 border-slate-200 bg-white px-3 py-2.5 text-sm leading-6 text-slate-800 placeholder:text-slate-400 focus:border-violet-400 focus:outline-none focus:ring-2 focus:ring-violet-200"
            />
            <p className="mt-1 text-right text-[11px] text-slate-400">{situationDetail.length}/180</p>
          </div>
        )
      }

      {/* STEP 5: Stakes */}
      {step === 'stakes' &&
        renderStepShell(
          'What was at stake?',
          'Pick what could have gone wrong if you didn\'t handle it.',
          <div className="space-y-4">
            {renderChipSelect(
              STAKES,
              stakes,
              (id) => toggleMulti(stakes, id, setStakes, 3),
              1,
              3
            )}
            {stakes.includes('other') && (
              <div>
                <label className="block text-xs font-bold text-slate-600">What else was at stake?</label>
                <input
                  type="text"
                  value={stakeOtherDetail}
                  onChange={(e) => setStakeOtherDetail(e.target.value.slice(0, 120))}
                  className="mt-1.5 w-full rounded-xl border-2 border-slate-200 bg-white px-3 py-2.5 text-sm leading-6 text-slate-800 placeholder:text-slate-400 focus:border-violet-400 focus:outline-none focus:ring-2 focus:ring-violet-200"
                />
              </div>
            )}
          </div>
        )
      }

      {/* STEP 6: Role */}
      {step === 'role' &&
        renderStepShell(
          'What was your role?',
          'Pick the best description of your responsibility.',
          <div className="space-y-5">
            {renderCardSelect(
              USER_ROLES.map((r) => ({ ...r, description: undefined })),
              userRole,
              setUserRole
            )}
            {userRole === 'other' && (
              <div>
                <label className="block text-xs font-bold text-slate-600">Describe your role</label>
                <input
                  type="text"
                  value={roleOtherDetail}
                  onChange={(e) => setRoleOtherDetail(e.target.value.slice(0, 120))}
                  className="mt-1.5 w-full rounded-xl border-2 border-slate-200 bg-white px-3 py-2.5 text-sm leading-6 text-slate-800 placeholder:text-slate-400 focus:border-violet-400 focus:outline-none focus:ring-2 focus:ring-violet-200"
                />
              </div>
            )}
            <div>
              <label className="block text-xs font-bold text-slate-600">
                Add one detail about your responsibility
                <span className="ml-1 font-normal text-slate-400">(optional)</span>
              </label>
              <input
                type="text"
                value={roleDetail}
                onChange={(e) => setRoleDetail(e.target.value.slice(0, 180))}
                placeholder="Describe what you personally owned in this situation."
                className="mt-1.5 w-full rounded-xl border-2 border-slate-200 bg-white px-3 py-2.5 text-sm leading-6 text-slate-800 placeholder:text-slate-400 focus:border-violet-400 focus:outline-none focus:ring-2 focus:ring-violet-200"
              />
            </div>
          </div>
        )
      }

      {/* STEP 7: Actions */}
      {step === 'actions' &&
        renderStepShell(
          'What did you actually do?',
          'Pick 2–4 actions you personally took. These become the "Action" part of your answer.',
          renderChipSelect(
            ACTIONS_TAKEN,
            actionsTaken,
            (id) => toggleMulti(actionsTaken, id, setActionsTaken, 4),
            2,
            4
          )
        )
      }

      {/* STEP 8: Action Details */}
      {step === 'action_details' &&
        renderStepShell(
          'Add a little detail',
          'Give one short detail for each action. One sentence or phrase is enough.',
          <div className="space-y-4">
            {actionsTaken.map((id) => {
              const prompt = ACTION_DETAIL_PROMPTS[id] || { label: 'What did you do?', placeholder: '' }
              return (
                <div key={id}>
                  <label className="block text-sm font-bold text-slate-800">
                    {prompt.label}
                    {id !== 'other' && <span className="ml-1 font-normal text-slate-400">(optional)</span>}
                  </label>
                  <input
                    type="text"
                    value={actionDetails[id] || ''}
                    onChange={(e) => setActionDetails((prev) => ({ ...prev, [id]: e.target.value.slice(0, 160) }))}
                    placeholder={prompt.placeholder}
                    className="mt-1.5 w-full rounded-xl border-2 border-slate-200 bg-white px-3 py-2.5 text-sm leading-6 text-slate-800 placeholder:text-slate-400 focus:border-violet-400 focus:outline-none focus:ring-2 focus:ring-violet-200"
                  />
                </div>
              )
            })}
          </div>
        )
      }

      {/* STEP 9: Result Types */}
      {step === 'result_type' &&
        renderStepShell(
          'What changed because of what you did?',
          'Pick the best outcome. You don\'t need a perfect number.',
          renderChipSelect(
            RESULT_TYPES,
            resultTypes,
            (id) => toggleMulti(resultTypes, id, setResultTypes, 3),
            1,
            3
          )
        )
      }

      {/* STEP 10: Result Detail */}
      {step === 'result_detail' &&
        renderStepShell(
          'Add proof that it worked',
          'Add a number if you have one. If not, choose another kind of proof.',
          <div className="space-y-5">
            <div className="space-y-2">
              {HAS_METRIC_OPTIONS.map((opt) => {
                const isSelected = hasMetric === opt.id
                return (
                  <button
                    key={opt.id}
                    type="button"
                    onClick={() => setHasMetric(opt.id)}
                    className={`w-full rounded-2xl border-2 px-4 py-3 text-left transition ${
                      isSelected
                        ? 'border-violet-400 bg-violet-50 shadow-sm'
                        : 'border-slate-200 bg-white hover:border-violet-300'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div
                        className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2 ${
                          isSelected ? 'border-violet-500 bg-violet-500' : 'border-slate-300'
                        }`}
                      >
                        {isSelected && <Check className="h-3 w-3 text-white" />}
                      </div>
                      <p className={`text-sm font-bold ${isSelected ? 'text-violet-900' : 'text-slate-800'}`}>
                        {opt.label}
                      </p>
                    </div>
                  </button>
                )
              })}
            </div>

            {hasMetric === 'yes' && (
              <div className="space-y-4 rounded-2xl border border-emerald-200 bg-emerald-50 p-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700">What kind of number?</label>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {METRIC_TYPES.map((mt) => {
                      const isSelected = metricType === mt.id
                      return (
                        <button
                          key={mt.id}
                          type="button"
                          onClick={() => setMetricType(mt.id)}
                          className={`rounded-full border-2 px-3 py-1 text-xs font-bold transition ${
                            isSelected
                              ? 'border-emerald-400 bg-emerald-500 text-white'
                              : 'border-slate-200 bg-white text-slate-700 hover:border-emerald-300'
                          }`}
                        >
                          {mt.label}
                        </button>
                      )
                    })}
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700">What was the number?</label>
                  <input
                    type="text"
                    value={metricValue}
                    onChange={(e) => setMetricValue(e.target.value.slice(0, 80))}
                    placeholder="Enter a number only if it is truthful and supported."
                    className="mt-1.5 w-full rounded-xl border-2 border-slate-200 bg-white px-3 py-2.5 text-sm leading-6 text-slate-800 placeholder:text-slate-400 focus:border-emerald-400 focus:outline-none focus:ring-2 focus:ring-emerald-200"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700">
                    What did that number mean?
                    <span className="ml-1 font-normal text-slate-400">(optional)</span>
                  </label>
                  <input
                    type="text"
                    value={metricContext}
                    onChange={(e) => setMetricContext(e.target.value.slice(0, 160))}
                    placeholder="Describe the measurable change in one sentence."
                    className="mt-1.5 w-full rounded-xl border-2 border-slate-200 bg-white px-3 py-2.5 text-sm leading-6 text-slate-800 placeholder:text-slate-400 focus:border-emerald-400 focus:outline-none focus:ring-2 focus:ring-emerald-200"
                  />
                </div>
              </div>
            )}

            {(hasMetric === 'no' || hasMetric === 'not_sure') && (
              <div className="space-y-4 rounded-2xl border border-amber-200 bg-amber-50 p-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700">What showed that it worked?</label>
                  {renderChipSelect(
                    NON_METRIC_PROOFS,
                    nonMetricProofs,
                    (id) => toggleMulti(nonMetricProofs, id, setNonMetricProofs, 3),
                    1,
                    3
                  )}
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700">
                    Add detail
                    <span className="ml-1 font-normal text-slate-400">(optional)</span>
                  </label>
                  <input
                    type="text"
                    value={proofDetail}
                    onChange={(e) => setProofDetail(e.target.value.slice(0, 180))}
                    placeholder="Describe the observable outcome in one sentence."
                    className="mt-1.5 w-full rounded-xl border-2 border-amber-200 bg-white px-3 py-2.5 text-sm leading-6 text-slate-800 placeholder:text-slate-400 focus:border-amber-400 focus:outline-none focus:ring-2 focus:ring-amber-200"
                  />
                </div>
              </div>
            )}
          </div>
        )
      }

      {/* STEP 11: Competencies */}
      {step === 'competencies' &&
        renderStepShell(
          'What should this answer prove?',
          'Pick the qualities you want the interviewer to hear.',
          renderChipSelect(
            COMPETENCIES,
            competencies,
            (id) => toggleMulti(competencies, id, setCompetencies, 4),
            1,
            4
          )
        )
      }

      {/* STEP 12: Optional Notes */}
      {step === 'notes' &&
        renderStepShell(
          'Anything else?',
          'Optional. Add any detail you want the answer to include.',
          <div>
            {generateError && (
              <div className="mb-4 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3">
                <p className="text-xs font-bold text-rose-700">
                  Something went wrong generating your answer. Check your connection and try again.
                </p>
              </div>
            )}
            <textarea
              value={additionalNotes}
              onChange={(e) => setAdditionalNotes(e.target.value.slice(0, 500))}
              placeholder="Add only context that is truthful and necessary to understand the story."
              rows={4}
              className="w-full rounded-xl border-2 border-slate-200 bg-white px-3 py-2.5 text-sm leading-6 text-slate-800 placeholder:text-slate-400 focus:border-violet-400 focus:outline-none focus:ring-2 focus:ring-violet-200"
            />
            <p className="mt-1 text-right text-[11px] text-slate-400">{additionalNotes.length}/500</p>
          </div>,
          <div className="flex items-center gap-2">
            <button
              onClick={prevStep}
              className="flex items-center gap-1 rounded-xl border border-slate-200 bg-white px-4 py-3 text-xs font-bold text-slate-600 hover:bg-slate-50"
            >
              <ArrowLeft className="h-3.5 w-3.5" />
              Back
            </button>
            <button
              onClick={() => {
                setGenerateError(false)
                setStep('generating')
              }}
              className="btn-coach-primary flex flex-1 items-center justify-center gap-2 py-3 text-sm font-bold"
            >
              <Sparkles className="h-4 w-4" />
              Generate my STAR answer
            </button>
          </div>
        )
      }

      {/* GENERATING */}
      {step === 'generating' && (
        <div className="flex h-full flex-col items-center justify-center px-5 text-center">
          <div className="h-12 w-12 animate-spin rounded-full border-4 border-violet-200 border-t-violet-500" />
          <p className="mt-5 text-sm font-bold text-slate-700">Building your STAR answer…</p>
          <p className="mt-1 text-xs text-slate-500">This takes about 5 seconds.</p>
        </div>
      )}

      {/* OUTPUT */}
      {step === 'output' && output && (
        <div className="workshop-screen">
          <div className="workshop-header bg-gradient-to-br from-emerald-50 via-white to-violet-50">
            <span className="rounded-full bg-emerald-100 px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.16em] text-emerald-700">
              Your STAR answer
            </span>
            <h2 className="mt-2 text-xl font-extrabold leading-tight text-slate-900">
              Here&apos;s what that sounds like.
            </h2>
          </div>

          <div className="workshop-body">
            <div className="flex h-full min-h-0 flex-col">
              <div className="workshop-tabs" role="tablist" aria-label="STAR answer tools">
                {([
                  ['answer', 'Answer'],
                  ['breakdown', 'Breakdown'],
                  ['follow_up', 'Follow-up'],
                ] as const).map(([panel, label]) => (
                  <button key={panel} type="button" role="tab" aria-selected={outputPanel === panel} onClick={() => setOutputPanel(panel)} className={`workshop-tab ${outputPanel === panel ? 'bg-white text-violet-700 shadow-sm' : 'text-slate-500 hover:text-slate-800'}`}>
                    {label}
                  </button>
                ))}
              </div>

              {outputPanel === 'answer' && (
                <div className="flex min-h-0 flex-1 flex-col pt-3">
                  <div className="flex gap-2">
                    <button type="button" onClick={() => setAnswerLength('sixty')} className={`rounded-full px-3 py-1 text-xs font-bold ${answerLength === 'sixty' ? 'bg-violet-500 text-white' : 'bg-slate-100 text-slate-600'}`}>60 seconds</button>
                    <button type="button" onClick={() => setAnswerLength('thirty')} className={`rounded-full px-3 py-1 text-xs font-bold ${answerLength === 'thirty' ? 'bg-violet-500 text-white' : 'bg-slate-100 text-slate-600'}`}>30 seconds</button>
                  </div>
                  <div className="my-3 flex min-h-0 flex-1 items-center rounded-2xl border-2 border-violet-300 bg-violet-50 px-5 py-4">
                    <p className="text-sm leading-7 text-slate-900">{answerLength === 'sixty' ? output.sixtySecondAnswer : output.thirtySecondAnswer}</p>
                  </div>
                  {output.storySummary && <p className="shrink-0 text-xs leading-5 text-slate-500">{output.storySummary}</p>}
                </div>
              )}

              {outputPanel === 'breakdown' && (
                <div className="grid min-h-0 flex-1 grid-cols-2 gap-2 pt-3">
                  {(['situation', 'task', 'action', 'result'] as const).map((part) => {
                    const fs = FRAMEWORK_STEPS.find((item) => item.key === part)
                    const colors = fs ? COLOR_MAP[fs.color] : COLOR_MAP.violet
                    return (
                      <div key={part} className={`flex items-center rounded-xl border-2 ${colors.border} ${colors.soft} px-3 py-3`}>
                        <div className="flex items-start gap-2">
                          <span className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-md ${colors.bg} text-xs text-white`}>{fs?.emoji || '📝'}</span>
                          <div className="min-w-0 flex-1">
                            <p className={`text-[10px] font-black uppercase tracking-[0.14em] ${colors.text}`}>{part}</p>
                            <p className="mt-1 text-xs leading-5 text-slate-800">{output.starBreakdown[part]}</p>
                          </div>
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}

              {outputPanel === 'follow_up' && (
                <div className="grid min-h-0 flex-1 content-center gap-2 pt-3">
                  {output.followUpQuestions?.length ? output.followUpQuestions.map((question, index) => (
                    <div key={index} className="flex items-start gap-2 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3">
                      <ChevronRight className="mt-0.5 h-4 w-4 shrink-0 text-violet-500" />
                      <p className="text-sm leading-6 text-slate-700">{question}</p>
                    </div>
                  )) : <p className="text-center text-sm font-bold text-slate-500">No follow-up questions were generated.</p>}
                </div>
              )}
            </div>
          </div>

          <div className="workshop-footer">
            <button
              onClick={onComplete}
              className="btn-coach-primary flex w-full items-center justify-center gap-2 py-3 text-sm font-bold"
            >
              Finish workshop
              <CheckCircle2 className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
