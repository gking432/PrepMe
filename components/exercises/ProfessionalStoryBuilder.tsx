'use client'

import { type ReactNode, useCallback, useEffect, useState } from 'react'
import {
  ArrowLeft,
  ArrowRight,
  Check,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  ChevronUp,
  Copy,
  Lightbulb,
  Lock,
  RefreshCw,
  Sparkles,
  Target,
} from 'lucide-react'
import {
  CURRENT_POSITIONING_OPTIONS,
  TONE_OPTIONS,
  LENGTH_OPTIONS,
  AVOID_OPTIONS,
  DEFAULT_AVOID_EMPHASIS,
  PROGRESS_STEPS,
  FRAMEWORK_STEPS,
  type CurrentPositioning,
  type TonePreference,
  type LengthPreference,
  type AvoidEmphasis,
  type ProfessionalStoryOutput,
  type NarrativeAngle,
} from '@/lib/professional-story-config'

interface ProfessionalStoryBuilderProps {
  sessionId?: string
  originalQuestion?: string
  originalAnswer?: string
  onComplete: () => void
}

type Step =
  | 'intro'
  | 'method'
  | 'positioning'
  | 'tone_length'
  | 'avoidances'
  | 'notes'
  | 'generating'
  | 'output'

const STEP_TO_PROGRESS: Record<string, number> = {
  positioning: 0,
  tone_length: 1,
  avoidances: 2,
  notes: 2,
  generating: 3,
  output: 3,
}

const COLOR_MAP: Record<string, { bg: string; border: string; text: string; soft: string }> = {
  violet: { bg: 'bg-violet-500', border: 'border-violet-300', text: 'text-violet-700', soft: 'bg-violet-50' },
  emerald: { bg: 'bg-emerald-500', border: 'border-emerald-300', text: 'text-emerald-700', soft: 'bg-emerald-50' },
  sky: { bg: 'bg-sky-500', border: 'border-sky-300', text: 'text-sky-700', soft: 'bg-sky-50' },
  amber: { bg: 'bg-amber-500', border: 'border-amber-300', text: 'text-amber-700', soft: 'bg-amber-50' },
}

export default function ProfessionalStoryBuilder({
  sessionId,
  originalQuestion,
  originalAnswer,
  onComplete,
}: ProfessionalStoryBuilderProps) {
  const [step, setStep] = useState<Step>('intro')
  const [flippedCards, setFlippedCards] = useState<Set<number>>(new Set())

  // Input state
  const [positioning, setPositioning] = useState<CurrentPositioning | null>(null)
  const [positioningOtherDetail, setPositioningOtherDetail] = useState('')
  const [tone, setTone] = useState<TonePreference>('natural_confident')
  const [length, setLength] = useState<LengthPreference>('sixty_seconds')
  const [avoidEmphasis, setAvoidEmphasis] = useState<AvoidEmphasis[]>([...DEFAULT_AVOID_EMPHASIS])
  const [showAvoidances, setShowAvoidances] = useState(false)
  const [additionalNotes, setAdditionalNotes] = useState('')

  // Output state
  const [output, setOutput] = useState<ProfessionalStoryOutput | null>(null)
  const [generateError, setGenerateError] = useState(false)
  const [copied, setCopied] = useState(false)
  const [activeOutputTab, setActiveOutputTab] = useState<'full' | 'shorter' | 'conversational'>('full')
  const [generatingAlternate, setGeneratingAlternate] = useState(false)
  const [showAlternateConfirm, setShowAlternateConfirm] = useState<NarrativeAngle | null>(null)

  const allMethodFlipped = flippedCards.size >= FRAMEWORK_STEPS.length
  const progressIndex = STEP_TO_PROGRESS[step] ?? -1

  function flipCard(i: number) {
    setFlippedCards((prev) => {
      const next = new Set(prev)
      next.add(i)
      return next
    })
  }

  function toggleAvoid(id: AvoidEmphasis) {
    if (avoidEmphasis.includes(id)) {
      setAvoidEmphasis(avoidEmphasis.filter((x) => x !== id))
    } else if (avoidEmphasis.length < 3) {
      setAvoidEmphasis([...avoidEmphasis, id])
    }
  }

  function canAdvance(): boolean {
    switch (step) {
      case 'positioning':
        if (!positioning) return false
        if (positioning === 'other' && !positioningOtherDetail.trim()) return false
        return true
      case 'tone_length':
        return !!tone && !!length
      case 'avoidances':
      case 'notes':
        return true
      default:
        return true
    }
  }

  const nextStep = useCallback(() => {
    const flow: Step[] = [
      'intro', 'method', 'positioning', 'tone_length', 'notes', 'generating',
    ]
    const idx = flow.indexOf(step)
    if (idx >= 0 && idx < flow.length - 1) {
      setStep(flow[idx + 1])
    }
  }, [step])

  const prevStep = useCallback(() => {
    const flow: Step[] = [
      'intro', 'method', 'positioning', 'tone_length', 'notes',
    ]
    const idx = flow.indexOf(step)
    if (idx > 0) {
      setStep(flow[idx - 1])
    }
  }, [step])

  // Generate professional story
  useEffect(() => {
    if (step !== 'generating') return
    if (generatingAlternate) return
    let cancelled = false

    async function generate() {
      try {
        const res = await fetch('/api/interview/professional-story', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            currentPositioning: positioning,
            currentPositioningOtherDetail: positioning === 'other' ? positioningOtherDetail.trim() : undefined,
            tone,
            length,
            avoidEmphasis,
            additionalNotes: additionalNotes.trim() || undefined,
            sessionId,
          }),
        })
        if (!res.ok) throw new Error('failed')
        const data = await res.json()
        if (cancelled) return
        if (data.fullAnswer || data.ppfBreakdown) {
          setOutput(data as ProfessionalStoryOutput)
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
  }, [step, generatingAlternate]) // eslint-disable-line react-hooks/exhaustive-deps

  // Generate with alternate angle
  async function generateWithAlternateAngle(angle: NarrativeAngle) {
    setShowAlternateConfirm(null)
    setGeneratingAlternate(true)
    setStep('generating')

    try {
      const res = await fetch('/api/interview/professional-story', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          currentPositioning: positioning,
          currentPositioningOtherDetail: positioning === 'other' ? positioningOtherDetail.trim() : undefined,
          tone,
          length,
          avoidEmphasis,
          additionalNotes: additionalNotes.trim() || undefined,
          sessionId,
          alternateAngleType: angle.type,
        }),
      })
      if (!res.ok) throw new Error('failed')
      const data = await res.json()
      if (data.fullAnswer || data.ppfBreakdown) {
        setOutput(data as ProfessionalStoryOutput)
        setActiveOutputTab('full')
      } else {
        setGenerateError(true)
      }
    } catch {
      setGenerateError(true)
    } finally {
      setGeneratingAlternate(false)
      setStep('output')
    }
  }

  function copyToClipboard(text: string) {
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    })
  }

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
  ) {
    return (
      <div className="space-y-2">
        {options.map((opt) => {
          const isSelected = selected === opt.id
          return (
            <button
              key={opt.id}
              type="button"
              onClick={() => onSelect(opt.id)}
              className={`group w-full rounded-2xl border-2 px-4 py-3 text-left transition active:scale-[0.98] ${
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

  function renderStepShell(
    title: string,
    subtitle: string,
    children: ReactNode,
    footer?: ReactNode
  ) {
    return (
      <div className="flex h-full flex-col">
        {renderProgressBar()}
        <div className="border-b border-slate-200 bg-gradient-to-br from-violet-50 via-white to-sky-50 px-5 py-4">
          <h2 className="text-xl font-extrabold leading-tight text-slate-900">{title}</h2>
          <p className="mt-1 text-xs leading-5 text-slate-500">{subtitle}</p>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto px-5 py-5">
          {children}
        </div>
        <div className="shrink-0 border-t border-slate-200 px-5 py-3">
          {footer || (
            <div className="flex items-center gap-2">
              {step !== 'positioning' && (
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

  const activeAnswer =
    activeOutputTab === 'shorter'
      ? output?.shorterVersion
      : activeOutputTab === 'conversational'
      ? output?.conversationalVersion
      : output?.fullAnswer

  return (
    <div className="flex h-full flex-col overflow-hidden rounded-[28px] border border-slate-200 bg-white">
      {/* INTRO */}
      {step === 'intro' && (
        <div className="flex h-full flex-col">
          <div className="border-b border-slate-200 bg-gradient-to-br from-violet-50 via-white to-sky-50 px-5 py-4">
            <div className="flex items-center gap-2">
              <span className="rounded-full bg-violet-100 px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.16em] text-violet-700">
                Why this matters
              </span>
              <span className="rounded-full bg-slate-100 px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.14em] text-slate-600">
                PPF
              </span>
            </div>
            <h2 className="mt-3 text-xl font-extrabold leading-tight text-slate-900">
              &ldquo;Tell me about yourself&rdquo; is your first impression.
            </h2>
          </div>

          <div className="min-h-0 flex-1 overflow-y-auto px-5 py-5">
            <div className="space-y-4">
              <div className="rounded-2xl border border-violet-100 bg-violet-50/60 px-4 py-4">
                <div className="flex items-start gap-3">
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-violet-500 text-white">
                    <Lightbulb className="h-4 w-4" />
                  </div>
                  <p className="text-sm leading-7 text-slate-800">
                    Most people walk through their resume. The interviewer tunes out after 10 seconds.
                    A strong answer tells a story: who you are now, what shaped you, and why you&apos;re here.
                  </p>
                </div>
              </div>

              <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4">
                <div className="flex items-start gap-3">
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-slate-700 text-white">
                    <Target className="h-4 w-4" />
                  </div>
                  <div>
                    <p className="text-[10px] font-black uppercase tracking-[0.16em] text-slate-500">When to use it</p>
                    <p className="mt-1 text-sm leading-6 text-slate-800">
                      Use this for &ldquo;tell me about yourself&rdquo;, &ldquo;walk me through your background&rdquo;,
                      or &ldquo;so, what brings you here?&rdquo;
                    </p>
                  </div>
                </div>
              </div>

              {originalAnswer && (
                <div className="rounded-2xl border border-rose-100 bg-rose-50/50 px-4 py-4">
                  <p className="text-[10px] font-black uppercase tracking-[0.16em] text-rose-600">
                    What you said in the interview
                  </p>
                  {originalQuestion && (
                    <p className="mt-1 text-[11px] font-bold leading-5 text-rose-800">
                      Q: {originalQuestion}
                    </p>
                  )}
                  <p className="mt-2 text-sm italic leading-6 text-rose-900">
                    &ldquo;{originalAnswer.length > 220 ? originalAnswer.slice(0, 220).trim() + '…' : originalAnswer}&rdquo;
                  </p>
                  <p className="mt-3 text-xs font-bold text-rose-700">
                    We&apos;re going to build a better version — using your real resume.
                  </p>
                </div>
              )}
            </div>
          </div>

          <div className="shrink-0 border-t border-slate-200 px-5 py-3">
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
        <div className="flex h-full flex-col">
          <div className="border-b border-slate-200 bg-gradient-to-br from-sky-50 via-white to-violet-50 px-5 py-4">
            <span className="rounded-full bg-sky-100 px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.16em] text-sky-700">
              The Method
            </span>
            <h2 className="mt-2 text-xl font-extrabold leading-tight text-slate-900">
              Present · Past · Future
            </h2>
            <p className="mt-1 text-xs font-bold text-slate-500">
              Flip each card in order to unlock the next.
            </p>
          </div>

          <div className="min-h-0 flex-1 overflow-y-auto px-5 py-5">
            <div className="space-y-3">
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
                    style={{ height: '92px' }}
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

            <p className="mt-4 text-center text-[11px] font-bold uppercase tracking-[0.16em] text-slate-400">
              {flippedCards.size}/{FRAMEWORK_STEPS.length} flipped
            </p>
          </div>

          <div className="shrink-0 border-t border-slate-200 px-5 py-3">
            <button
              onClick={() => setStep('positioning')}
              disabled={!allMethodFlipped}
              className="btn-coach-primary flex w-full items-center justify-center gap-2 py-3 text-sm font-bold disabled:opacity-50"
            >
              {allMethodFlipped ? "Let's build yours" : 'Flip every card to continue'}
              <ArrowRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}

      {/* STEP 1: Current Positioning */}
      {step === 'positioning' &&
        renderStepShell(
          "Where are you right now?",
          "This helps shape the story. Pick what best describes your current situation.",
          <div className="space-y-5">
            {renderCardSelect(
              CURRENT_POSITIONING_OPTIONS,
              positioning,
              (id) => setPositioning(id as CurrentPositioning),
            )}
            {positioning === 'other' && (
              <div>
                <label className="block text-xs font-bold text-slate-600">Describe your situation briefly</label>
                <input
                  type="text"
                  value={positioningOtherDetail}
                  onChange={(e) => setPositioningOtherDetail(e.target.value.slice(0, 120))}
                  placeholder="Example: I'm wrapping up a contract and looking for a full-time role."
                  className="mt-1.5 w-full rounded-xl border-2 border-slate-200 bg-white px-3 py-2.5 text-sm leading-6 text-slate-800 placeholder:text-slate-400 focus:border-violet-400 focus:outline-none focus:ring-2 focus:ring-violet-200"
                />
              </div>
            )}
          </div>,
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

      {/* STEP 2: Tone + Length */}
      {step === 'tone_length' &&
        renderStepShell(
          'How should it sound?',
          'Pick a tone and target length. These shape the style and pacing.',
          <div className="space-y-6">
            <div>
              <p className="text-[10px] font-black uppercase tracking-[0.16em] text-slate-500 mb-3">Tone</p>
              {renderCardSelect(
                TONE_OPTIONS,
                tone,
                (id) => setTone(id as TonePreference),
              )}
            </div>
            <div>
              <p className="text-[10px] font-black uppercase tracking-[0.16em] text-slate-500 mb-3">Length</p>
              {renderCardSelect(
                LENGTH_OPTIONS,
                length,
                (id) => setLength(id as LengthPreference),
              )}
            </div>
          </div>
        )
      }

      {/* STEP 3: Notes + optional avoidances */}
      {step === 'notes' &&
        renderStepShell(
          'Anything else?',
          "Optional notes and things to avoid. Your resume and JD are already loaded — we'll pull from them automatically.",
          <div className="space-y-5">
            {generateError && (
              <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3">
                <p className="text-xs font-bold text-rose-700">
                  Something went wrong generating your answer. Check your connection and try again.
                </p>
              </div>
            )}

            <div>
              <label className="block text-sm font-bold text-slate-800">
                Additional notes
                <span className="ml-1 font-normal text-slate-400">(optional)</span>
              </label>
              <textarea
                value={additionalNotes}
                onChange={(e) => setAdditionalNotes(e.target.value.slice(0, 500))}
                placeholder="Example: Emphasize my sales experience. Don't mention my time at Company X."
                rows={3}
                className="mt-2 w-full rounded-xl border-2 border-slate-200 bg-white px-3 py-2.5 text-sm leading-6 text-slate-800 placeholder:text-slate-400 focus:border-violet-400 focus:outline-none focus:ring-2 focus:ring-violet-200"
              />
              <p className="mt-1 text-right text-[11px] text-slate-400">{additionalNotes.length}/500</p>
            </div>

            {/* Collapsible avoidances */}
            <div className="rounded-2xl border border-slate-200 bg-slate-50">
              <button
                type="button"
                onClick={() => setShowAvoidances(!showAvoidances)}
                className="flex w-full items-center justify-between px-4 py-3"
              >
                <span className="text-xs font-bold text-slate-600">
                  Things to avoid {avoidEmphasis.length > 0 && `(${avoidEmphasis.length})`}
                </span>
                {showAvoidances ? (
                  <ChevronUp className="h-4 w-4 text-slate-400" />
                ) : (
                  <ChevronDown className="h-4 w-4 text-slate-400" />
                )}
              </button>
              {showAvoidances && (
                <div className="border-t border-slate-200 px-4 py-3">
                  <div className="flex flex-wrap gap-2">
                    {AVOID_OPTIONS.map((opt) => {
                      const isSelected = avoidEmphasis.includes(opt.id)
                      const atMax = avoidEmphasis.length >= 3 && !isSelected
                      return (
                        <button
                          key={opt.id}
                          type="button"
                          onClick={() => toggleAvoid(opt.id)}
                          disabled={atMax}
                          className={`rounded-full border-2 px-3 py-1.5 text-xs font-bold transition active:scale-95 ${
                            isSelected
                              ? 'border-rose-300 bg-rose-500 text-white shadow-sm'
                              : atMax
                              ? 'border-slate-100 bg-slate-50 text-slate-300 cursor-not-allowed'
                              : 'border-slate-200 bg-white text-slate-700 hover:border-rose-300 hover:bg-rose-50'
                          }`}
                        >
                          {isSelected && <Check className="mr-1 -ml-1 inline h-3 w-3" />}
                          {opt.label}
                        </button>
                      )
                    })}
                  </div>
                  <p className="mt-2 text-[11px] font-bold text-slate-400">
                    {avoidEmphasis.length}/3 selected
                  </p>
                </div>
              )}
            </div>
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
              Generate my story
            </button>
          </div>
        )
      }

      {/* GENERATING */}
      {step === 'generating' && (
        <div className="flex h-full flex-col items-center justify-center px-5 text-center">
          <div className="h-12 w-12 animate-spin rounded-full border-4 border-violet-200 border-t-violet-500" />
          <p className="mt-5 text-sm font-bold text-slate-700">
            {generatingAlternate ? 'Rebuilding with a new angle…' : 'Building your professional story…'}
          </p>
          <p className="mt-1 text-xs text-slate-500">Analyzing your resume and job description.</p>
        </div>
      )}

      {/* OUTPUT */}
      {step === 'output' && output && (
        <div className="flex h-full flex-col">
          <div className="border-b border-slate-200 bg-gradient-to-br from-emerald-50 via-white to-violet-50 px-5 py-4">
            <span className="rounded-full bg-emerald-100 px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.16em] text-emerald-700">
              Your professional story
            </span>
            <h2 className="mt-2 text-xl font-extrabold leading-tight text-slate-900">
              Here&apos;s what that sounds like.
            </h2>
          </div>

          <div className="min-h-0 flex-1 overflow-y-auto px-5 py-5">
            <div className="space-y-6">

              {/* 1. Answer tabs + copy */}
              <div>
                <div className="flex items-center gap-2 mb-3">
                  {(['full', 'shorter', 'conversational'] as const).map((tab) => (
                    <button
                      key={tab}
                      onClick={() => setActiveOutputTab(tab)}
                      className={`rounded-full px-3 py-1 text-xs font-bold transition ${
                        activeOutputTab === tab
                          ? 'bg-violet-500 text-white'
                          : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                      }`}
                    >
                      {tab === 'full' ? 'Full' : tab === 'shorter' ? 'Shorter' : 'Casual'}
                    </button>
                  ))}
                </div>
                <div className="rounded-2xl border-2 border-violet-300 bg-violet-50 px-4 py-4">
                  <p className="text-sm leading-7 text-slate-900">{activeAnswer}</p>
                </div>
                <div className="mt-2 flex items-center gap-2">
                  <button
                    onClick={() => copyToClipboard(activeAnswer || '')}
                    className="flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-bold text-slate-600 hover:bg-slate-50"
                  >
                    {copied ? <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" /> : <Copy className="h-3.5 w-3.5" />}
                    {copied ? 'Copied' : 'Copy'}
                  </button>
                </div>
              </div>

              {/* 2. PPF Breakdown */}
              <div>
                <p className="text-[10px] font-black uppercase tracking-[0.16em] text-slate-500 mb-2">
                  Present · Past · Future breakdown
                </p>
                <div className="space-y-2">
                  {(['present', 'past', 'future'] as const).map((part) => {
                    const fs = FRAMEWORK_STEPS.find((f) => f.key === part)
                    const colors = fs ? COLOR_MAP[fs.color] : COLOR_MAP.violet
                    return (
                      <div key={part} className={`rounded-xl border-2 ${colors.border} ${colors.soft} px-3 py-2.5`}>
                        <div className="flex items-start gap-2">
                          <span className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-md ${colors.bg} text-xs text-white`}>
                            {fs?.emoji || '📝'}
                          </span>
                          <div className="min-w-0 flex-1">
                            <p className={`text-[10px] font-black uppercase tracking-[0.14em] ${colors.text}`}>{part}</p>
                            <p className="text-sm leading-6 text-slate-800">{output.ppfBreakdown[part]}</p>
                          </div>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>

              {/* 3. Recommended Angle */}
              {output.recommendedAngle && (
                <div>
                  <p className="text-[10px] font-black uppercase tracking-[0.16em] text-slate-500 mb-2">
                    Recommended angle
                  </p>
                  <div className="rounded-2xl border-2 border-emerald-200 bg-emerald-50 px-4 py-3">
                    <p className="text-sm font-bold text-emerald-800">{output.recommendedAngle.label}</p>
                    <p className="mt-1 text-xs leading-5 text-emerald-700">{output.recommendedAngle.description}</p>
                    <span className="mt-2 inline-block rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-bold text-emerald-600">
                      {output.recommendedAngle.type.replace(/_/g, ' ')}
                    </span>
                  </div>
                </div>
              )}

              {/* 4. Alternate Angles */}
              {output.alternateAngles?.length > 0 && (
                <div>
                  <p className="text-[10px] font-black uppercase tracking-[0.16em] text-slate-500 mb-2">
                    Other ways to tell your story
                  </p>
                  <div className="space-y-2">
                    {output.alternateAngles.map((angle, i) => (
                      <div key={i} className="rounded-2xl border border-slate-200 bg-white px-4 py-3">
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0 flex-1">
                            <p className="text-sm font-bold text-slate-800">{angle.label}</p>
                            <p className="mt-1 text-xs leading-5 text-slate-600">{angle.description}</p>
                            <span className="mt-1 inline-block rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-bold text-slate-500">
                              {angle.type.replace(/_/g, ' ')}
                            </span>
                          </div>
                          <button
                            onClick={() => setShowAlternateConfirm(angle)}
                            className="shrink-0 rounded-lg border border-violet-200 bg-violet-50 px-2.5 py-1.5 text-[11px] font-bold text-violet-700 hover:bg-violet-100"
                          >
                            <RefreshCw className="mr-1 inline h-3 w-3" />
                            Try this
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Alternate angle confirmation dialog */}
              {showAlternateConfirm && (
                <div className="rounded-2xl border-2 border-amber-300 bg-amber-50 px-4 py-4">
                  <p className="text-sm font-bold text-amber-900">
                    Generate with &ldquo;{showAlternateConfirm.label}&rdquo;?
                  </p>
                  <p className="mt-1 text-xs text-amber-700">
                    This will rebuild your answer using a different narrative angle. Your settings stay the same.
                  </p>
                  <div className="mt-3 flex items-center gap-2">
                    <button
                      onClick={() => setShowAlternateConfirm(null)}
                      className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-bold text-slate-600 hover:bg-slate-50"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={() => generateWithAlternateAngle(showAlternateConfirm)}
                      className="rounded-lg bg-violet-500 px-3 py-1.5 text-xs font-bold text-white hover:bg-violet-600"
                    >
                      Generate
                    </button>
                  </div>
                </div>
              )}

              {/* 5. Opening Line Options */}
              {output.openingLines?.length > 0 && (
                <div>
                  <p className="text-[10px] font-black uppercase tracking-[0.16em] text-slate-500 mb-2">
                    Opening line options
                  </p>
                  <div className="space-y-1.5">
                    {output.openingLines.map((line, i) => (
                      <div key={i} className="flex items-start gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2">
                        <ChevronRight className="mt-0.5 h-3.5 w-3.5 shrink-0 text-sky-400" />
                        <p className="text-xs leading-5 text-slate-700">{line}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* 6. Closing Line Options */}
              {output.closingLines?.length > 0 && (
                <div>
                  <p className="text-[10px] font-black uppercase tracking-[0.16em] text-slate-500 mb-2">
                    Closing line options
                  </p>
                  <div className="space-y-1.5">
                    {output.closingLines.map((line, i) => (
                      <div key={i} className="flex items-start gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2">
                        <ChevronRight className="mt-0.5 h-3.5 w-3.5 shrink-0 text-violet-400" />
                        <p className="text-xs leading-5 text-slate-700">{line}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* 7. Why It Works */}
              {output.whyItWorks && (
                <div className="rounded-2xl border border-emerald-100 bg-emerald-50/60 px-4 py-3">
                  <p className="text-[10px] font-black uppercase tracking-[0.16em] text-emerald-600 mb-1">
                    Why this works
                  </p>
                  <p className="text-xs leading-5 text-emerald-800">{output.whyItWorks}</p>
                </div>
              )}

              {/* 8. Watch Outs */}
              {output.watchOuts?.length > 0 && (
                <div className="rounded-2xl border border-amber-100 bg-amber-50/60 px-4 py-3">
                  <p className="text-[10px] font-black uppercase tracking-[0.16em] text-amber-600 mb-1">
                    Watch out for
                  </p>
                  <ul className="space-y-1">
                    {output.watchOuts.map((w, i) => (
                      <li key={i} className="text-xs leading-5 text-amber-800">• {w}</li>
                    ))}
                  </ul>
                </div>
              )}

              {/* 9. Follow-up Questions */}
              {output.followUpQuestions?.length > 0 && (
                <div>
                  <p className="text-[10px] font-black uppercase tracking-[0.16em] text-slate-500 mb-2">
                    They might ask next
                  </p>
                  <div className="space-y-1.5">
                    {output.followUpQuestions.map((q, i) => (
                      <div key={i} className="flex items-start gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2">
                        <ChevronRight className="mt-0.5 h-3.5 w-3.5 shrink-0 text-slate-400" />
                        <p className="text-xs leading-5 text-slate-700">{q}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* 10. Role Understanding + Resume Fit (collapsible) */}
              {(output.roleUnderstanding || output.resumeFitSummary) && (
                <details className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-2">
                  <summary className="cursor-pointer text-[11px] font-bold uppercase tracking-[0.14em] text-slate-600">
                    How we read your resume + job description
                  </summary>
                  <div className="mt-3 space-y-3 pb-2">
                    {output.roleUnderstanding?.interviewerLikelyCaresAbout?.length > 0 && (
                      <div>
                        <p className="text-[10px] font-black uppercase tracking-[0.14em] text-slate-500">
                          Interviewer likely cares about
                        </p>
                        <ul className="mt-1 space-y-0.5">
                          {output.roleUnderstanding.interviewerLikelyCaresAbout.map((item, i) => (
                            <li key={i} className="text-xs leading-5 text-slate-700">• {item}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                    {output.resumeFitSummary?.strongestRelevantBackground?.length > 0 && (
                      <div>
                        <p className="text-[10px] font-black uppercase tracking-[0.14em] text-emerald-600">
                          Strongest relevant background
                        </p>
                        <ul className="mt-1 space-y-0.5">
                          {output.resumeFitSummary.strongestRelevantBackground.map((item, i) => (
                            <li key={i} className="text-xs leading-5 text-slate-700">• {item}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                    {output.resumeFitSummary?.backgroundToMinimize?.length > 0 && (
                      <div>
                        <p className="text-[10px] font-black uppercase tracking-[0.14em] text-amber-600">
                          Background to minimize
                        </p>
                        <ul className="mt-1 space-y-0.5">
                          {output.resumeFitSummary.backgroundToMinimize.map((item, i) => (
                            <li key={i} className="text-xs leading-5 text-slate-700">• {item}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                    {output.resumeFitSummary?.possibleConcern && (
                      <div>
                        <p className="text-[10px] font-black uppercase tracking-[0.14em] text-rose-600">
                          Possible concern
                        </p>
                        <p className="mt-0.5 text-xs leading-5 text-slate-700">{output.resumeFitSummary.possibleConcern}</p>
                      </div>
                    )}
                  </div>
                </details>
              )}
            </div>
          </div>

          <div className="shrink-0 border-t border-slate-200 px-5 py-3">
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
