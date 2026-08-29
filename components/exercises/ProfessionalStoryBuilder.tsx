'use client'

import { type ReactNode, useCallback, useEffect, useState } from 'react'
import {
  ArrowLeft,
  ArrowRight,
  Check,
  CheckCircle2,
  Copy,
  Lightbulb,
  Lock,
  RefreshCw,
  Sparkles,
  Target,
} from 'lucide-react'
import {
  CURRENT_SITUATION_OPTIONS,
  PROFESSIONAL_IDENTITY_STYLE_OPTIONS,
  TONE_OPTIONS,
  LENGTH_OPTIONS,
  DEFAULT_AVOIDANCES,
  REWRITE_OPTIONS,
  PROGRESS_STEPS,
  FRAMEWORK_STEPS,
  type CurrentSituation,
  type ProfessionalIdentityStyle,
  type TonePreference,
  type LengthPreference,
  type RewriteInstruction,
  type ProfessionalIntroductionOutput,
} from '@/lib/professional-story-config'
import { PORTFOLIO_DEMO_MODE, getDemoContextPayload } from '@/lib/portfolio-demo'

interface ProfessionalStoryBuilderProps {
  sessionId?: string
  originalQuestion?: string
  originalAnswer?: string
  onComplete: () => void
}

type Step =
  | 'intro'
  | 'method'
  | 'situation'
  | 'identity_style'
  | 'tone_length'
  | 'notes'
  | 'generating'
  | 'output'

type OutputPanel = 'answer' | 'structure' | 'refine'
type StructurePart = 'present' | 'past' | 'future'

const STEP_TO_PROGRESS: Record<string, number> = {
  situation: 0,
  identity_style: 1,
  tone_length: 2,
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

  const [currentSituation, setCurrentSituation] = useState<CurrentSituation | null>(null)
  const [currentSituationDetail, setCurrentSituationDetail] = useState('')
  const [identityStyle, setIdentityStyle] = useState<ProfessionalIdentityStyle | null>(null)
  const [customIdentity, setCustomIdentity] = useState('')
  const [tone, setTone] = useState<TonePreference>('natural_confident')
  const [length, setLength] = useState<LengthPreference>('sixty_seconds')

  const [output, setOutput] = useState<ProfessionalIntroductionOutput | null>(null)
  const [generateError, setGenerateError] = useState(false)
  const [copied, setCopied] = useState(false)
  const [activeOutputTab, setActiveOutputTab] = useState<'primary' | 'casual' | 'short'>('primary')
  const [activeOutputPanel, setActiveOutputPanel] = useState<OutputPanel>('answer')
  const [activeStructurePart, setActiveStructurePart] = useState<StructurePart>('present')
  const [rewriteConfirm, setRewriteConfirm] = useState<RewriteInstruction | null>(null)
  const [rewriting, setRewriting] = useState(false)

  const allMethodFlipped = flippedCards.size >= FRAMEWORK_STEPS.length
  const progressIndex = STEP_TO_PROGRESS[step] ?? -1

  function flipCard(i: number) {
    setFlippedCards((prev) => { const next = new Set(prev); next.add(i); return next })
  }

  function canAdvance(): boolean {
    switch (step) {
      case 'situation':
        if (!currentSituation) return false
        if (currentSituation === 'other' && !currentSituationDetail.trim()) return false
        return true
      case 'identity_style':
        if (!identityStyle) return false
        if (identityStyle === 'custom' && !customIdentity.trim()) return false
        return true
      case 'tone_length':
        return !!tone && !!length
      case 'notes':
        return true
      default:
        return true
    }
  }

  const nextStep = useCallback(() => {
    const flow: Step[] = ['intro', 'method', 'situation', 'identity_style', 'tone_length', 'notes', 'generating']
    const idx = flow.indexOf(step)
    if (idx >= 0 && idx < flow.length - 1) setStep(flow[idx + 1])
  }, [step])

  const prevStep = useCallback(() => {
    const flow: Step[] = ['intro', 'method', 'situation', 'identity_style', 'tone_length', 'notes']
    const idx = flow.indexOf(step)
    if (idx > 0) setStep(flow[idx - 1])
  }, [step])

  useEffect(() => {
    if (step !== 'generating' || rewriting) return
    let cancelled = false
    async function generate() {
      try {
        const res = await fetch('/api/interview/professional-story', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            currentSituation,
            currentSituationDetail: currentSituation === 'other' ? currentSituationDetail.trim() : undefined,
            professionalIdentityStyle: identityStyle,
            customProfessionalIdentity: identityStyle === 'custom' ? customIdentity.trim() : undefined,
            tone, length, avoidances: DEFAULT_AVOIDANCES, sessionId,
            ...(PORTFOLIO_DEMO_MODE ? getDemoContextPayload() : {}),
          }),
        })
        if (!res.ok) throw new Error('failed')
        const data = await res.json()
        if (cancelled) return
        if (data.primaryAnswer || data.structureUsed) { setOutput(data as ProfessionalIntroductionOutput); setStep('output') }
        else { setGenerateError(true); setStep('notes') }
      } catch { if (!cancelled) { setGenerateError(true); setStep('notes') } }
    }
    generate()
    return () => { cancelled = true }
  }, [step, rewriting]) // eslint-disable-line react-hooks/exhaustive-deps

  async function handleRewrite(instruction: RewriteInstruction) {
    setRewriteConfirm(null)
    if (!output) return
    if (instruction === 'regenerate') {
      setGenerateError(false)
      setOutput(null)
      setActiveOutputPanel('answer')
      setStep('generating')
      return
    }
    setRewriting(true)
    try {
      const res = await fetch('/api/interview/professional-story', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          rewriteInstruction: instruction,
          originalAnswer: output.primaryAnswer,
          originalOutput: output,
          sessionId,
          ...(PORTFOLIO_DEMO_MODE ? getDemoContextPayload() : {}),
        }),
      })
      if (!res.ok) throw new Error('failed')
      const data = await res.json()
      if (data.primaryAnswer) {
        setOutput({ ...output, primaryAnswer: data.primaryAnswer })
        setActiveOutputTab('primary')
        setActiveOutputPanel('answer')
      }
    } catch { /* silently fail */ } finally { setRewriting(false) }
  }

  function copyToClipboard(text: string) {
    navigator.clipboard.writeText(text).then(() => { setCopied(true); setTimeout(() => setCopied(false), 2000) })
  }

  function renderProgressBar() {
    if (progressIndex < 0) return null
    return (
      <div className="flex items-center gap-1 px-5 py-2 border-b border-slate-100 bg-white">
        {PROGRESS_STEPS.map((label, i) => (
          <div key={label} className="flex items-center gap-1 flex-1">
            <div className={`h-1.5 flex-1 rounded-full transition-all ${i < progressIndex ? 'bg-violet-500' : i === progressIndex ? 'bg-violet-400' : 'bg-slate-200'}`} />
          </div>
        ))}
      </div>
    )
  }

  function renderCardSelect(
    options: readonly { readonly id: string; readonly label: string; readonly description?: string }[],
    selected: string | null, onSelect: (id: string) => void,
  ) {
    return (
      <div className="workshop-choice-grid">
        {options.map((opt) => {
          const isSelected = selected === opt.id
          return (
            <button key={opt.id} type="button" onClick={() => onSelect(opt.id)}
              className={`workshop-choice-card group ${isSelected ? 'border-violet-400 bg-violet-50 shadow-sm' : 'border-slate-200 bg-white hover:border-violet-300 hover:bg-violet-50/50'}`}>
              <div className="flex items-start gap-2">
                <div className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2 transition ${isSelected ? 'border-violet-500 bg-violet-500' : 'border-slate-300'}`}>
                  {isSelected && <Check className="h-3 w-3 text-white" />}
                </div>
                <div className="min-w-0 flex-1">
                  <p className={`text-xs font-bold leading-4 ${isSelected ? 'text-violet-900' : 'text-slate-800'}`}>{opt.label}</p>
                  {opt.description && <p className="mt-0.5 text-[10px] leading-4 text-slate-500">{opt.description}</p>}
                </div>
              </div>
            </button>
          )
        })}
      </div>
    )
  }

  function renderStepShell(title: string, subtitle: string, children: ReactNode, footer?: ReactNode) {
    return (
      <div className="workshop-screen">
        {renderProgressBar()}
        <div className="workshop-header bg-gradient-to-br from-violet-50 via-white to-sky-50">
          <h2 className="text-xl font-extrabold leading-tight text-slate-900">{title}</h2>
          <p className="mt-1 text-xs leading-5 text-slate-500">{subtitle}</p>
        </div>
        <div className="workshop-body">{children}</div>
        <div className="workshop-footer">
          {footer || (
            <div className="flex items-center gap-2">
              {step !== 'situation' && (
                <button onClick={prevStep} className="flex items-center gap-1 rounded-xl border border-slate-200 bg-white px-4 py-3 text-xs font-bold text-slate-600 hover:bg-slate-50">
                  <ArrowLeft className="h-3.5 w-3.5" /> Back
                </button>
              )}
              <button onClick={nextStep} disabled={!canAdvance()} className="btn-coach-primary flex flex-1 items-center justify-center gap-2 py-3 text-sm font-bold disabled:opacity-50">
                Continue <ArrowRight className="h-4 w-4" />
              </button>
            </div>
          )}
        </div>
      </div>
    )
  }

  const activeAnswer = activeOutputTab === 'casual' ? output?.casualAnswer : activeOutputTab === 'short' ? output?.shortAnswer : output?.primaryAnswer
  const structureParts = (['present', 'past', 'future'] as const).filter((part) => output?.structureUsed?.[part])
  const visibleStructurePart = structureParts.includes(activeStructurePart) ? activeStructurePart : structureParts[0]

  return (
    <div className="workshop-frame">
      {step === 'intro' && (
        <div className="workshop-screen">
          <div className="workshop-header bg-gradient-to-br from-violet-50 via-white to-sky-50">
            <div className="flex items-center gap-2">
              <span className="rounded-full bg-violet-100 px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.16em] text-violet-700">Why this matters</span>
              <span className="rounded-full bg-slate-100 px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.14em] text-slate-600">Present · Past · Future</span>
            </div>
            <h2 className="mt-3 text-xl font-extrabold leading-tight text-slate-900">&ldquo;Tell me about yourself&rdquo; is your first impression.</h2>
          </div>
          <div className="workshop-body">
            <div className="space-y-4">
              <div className="rounded-2xl border border-violet-100 bg-violet-50/60 px-4 py-4">
                <div className="flex items-start gap-3">
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-violet-500 text-white"><Lightbulb className="h-4 w-4" /></div>
                  <p className="text-sm leading-7 text-slate-800">Most people walk through their resume. A stronger answer gives the interviewer a clear through-line: where you are professionally now, the selected past that explains it, and why this role is the logical next step.</p>
                </div>
              </div>
              <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4">
                <div className="flex items-start gap-3">
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-slate-700 text-white"><Target className="h-4 w-4" /></div>
                  <div>
                    <p className="text-[10px] font-black uppercase tracking-[0.16em] text-slate-500">When to use it</p>
                    <p className="mt-1 text-sm leading-6 text-slate-800">Use this for &ldquo;tell me about yourself&rdquo;, &ldquo;walk me through your background&rdquo;, or &ldquo;so, what brings you here?&rdquo;</p>
                  </div>
                </div>
              </div>
              {originalAnswer && (
                <div className="rounded-2xl border border-rose-100 bg-rose-50/50 px-4 py-4">
                  <p className="text-[10px] font-black uppercase tracking-[0.16em] text-rose-600">What you said in the interview</p>
                  {originalQuestion && <p className="mt-1 text-[11px] font-bold leading-5 text-rose-800">Q: {originalQuestion}</p>}
                  <p className="mt-2 text-sm italic leading-6 text-rose-900">&ldquo;{originalAnswer.length > 220 ? originalAnswer.slice(0, 220).trim() + '…' : originalAnswer}&rdquo;</p>
                  <p className="mt-3 text-xs font-bold text-rose-700">We&apos;ll build a better version using the supplied resume.</p>
                </div>
              )}
            </div>
          </div>
          <div className="workshop-footer">
            <button onClick={() => setStep('method')} className="btn-coach-primary flex w-full items-center justify-center gap-2 py-3 text-sm font-bold">See the method <ArrowRight className="h-4 w-4" /></button>
          </div>
        </div>
      )}

      {step === 'method' && (
        <div className="workshop-screen">
          <div className="workshop-header bg-gradient-to-br from-sky-50 via-white to-violet-50">
            <span className="rounded-full bg-sky-100 px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.16em] text-sky-700">The Method</span>
            <h2 className="mt-2 text-xl font-extrabold leading-tight text-slate-900">Present · Past · Future</h2>
            <p className="mt-1 text-xs font-bold text-slate-500">Flip each card in order to unlock the next.</p>
          </div>
          <div className="workshop-body">
            <div className="space-y-3">
              {FRAMEWORK_STEPS.map((fs, i) => {
                const colors = COLOR_MAP[fs.color]; const flipped = flippedCards.has(i); const previousFlipped = i === 0 || flippedCards.has(i - 1)
                const isNext = !flipped && previousFlipped; const locked = !flipped && !previousFlipped
                return (
                  <div key={fs.key} className={`flip-card relative ${flipped ? 'flipped' : ''}`} style={{ height: '92px' }}>
                    <div className="flip-card-inner">
                      <button type="button" onClick={() => isNext && flipCard(i)} disabled={!isNext}
                        className={`flip-card-face w-full rounded-2xl border-2 px-4 py-3 text-left transition ${locked ? 'border-slate-200 bg-slate-100 opacity-50 cursor-not-allowed' : `border-dashed ${colors.border} ${colors.soft} ${isNext ? 'animate-wiggle cursor-pointer hover:shadow-md' : ''}`}`}>
                        <div className="flex h-full items-center gap-3">
                          <div className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-xl text-xl ${locked ? 'bg-slate-200 text-slate-400' : `${colors.bg} text-white`}`}>{locked ? <Lock className="h-5 w-5" /> : i + 1}</div>
                          <div className="min-w-0 flex-1">
                            <p className={`text-sm font-extrabold ${locked ? 'text-slate-400' : colors.text}`}>Step {i + 1}</p>
                            <p className={`text-xs font-bold ${locked ? 'text-slate-400' : 'text-slate-600'}`}>{locked ? 'Flip the previous card first' : 'Tap to flip'}</p>
                          </div>
                        </div>
                      </button>
                      <div className={`flip-card-face flip-card-back w-full rounded-2xl border-2 ${colors.border} ${colors.soft} px-4 py-3 shadow-sm`}>
                        <div className="flex h-full items-start gap-3">
                          <div className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-xl ${colors.bg} text-xl text-white`}>{fs.emoji}</div>
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
            <p className="mt-4 text-center text-[11px] font-bold uppercase tracking-[0.16em] text-slate-400">{flippedCards.size}/{FRAMEWORK_STEPS.length} flipped</p>
          </div>
          <div className="workshop-footer">
            <button onClick={() => setStep('situation')} disabled={!allMethodFlipped} className="btn-coach-primary flex w-full items-center justify-center gap-2 py-3 text-sm font-bold disabled:opacity-50">
              {allMethodFlipped ? "Let's build yours" : 'Flip every card to continue'} <ArrowRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}

      {step === 'situation' && renderStepShell('How should we describe where you are now?', "This helps us explain your current chapter without making it awkward.",
        <div className="space-y-5">
          {renderCardSelect(CURRENT_SITUATION_OPTIONS, currentSituation, (id) => setCurrentSituation(id as CurrentSituation))}
          {currentSituation === 'other' && (
            <div>
              <label className="block text-xs font-bold text-slate-600">How should we describe your current situation?</label>
              <input type="text" value={currentSituationDetail} onChange={(e) => setCurrentSituationDetail(e.target.value.slice(0, 180))} placeholder="Describe your current situation in one sentence." className="mt-1.5 w-full rounded-xl border-2 border-slate-200 bg-white px-3 py-2.5 text-sm leading-6 text-slate-800 placeholder:text-slate-400 focus:border-violet-400 focus:outline-none focus:ring-2 focus:ring-violet-200" />
            </div>
          )}
        </div>,
        <button onClick={nextStep} disabled={!canAdvance()} className="btn-coach-primary flex w-full items-center justify-center gap-2 py-3 text-sm font-bold disabled:opacity-50">Continue <ArrowRight className="h-4 w-4" /></button>
      )}

      {step === 'identity_style' && renderStepShell('What is your present professional lane?', 'Choose the clearest, truthful way to describe the work you do now.',
        <div className="space-y-5">
          {renderCardSelect(PROFESSIONAL_IDENTITY_STYLE_OPTIONS, identityStyle, (id) => setIdentityStyle(id as ProfessionalIdentityStyle))}
          {identityStyle === 'custom' && (
            <div>
              <label className="block text-xs font-bold text-slate-600">Write your opening identity</label>
              <textarea value={customIdentity} onChange={(e) => setCustomIdentity(e.target.value.slice(0, 220))} placeholder="Write one truthful sentence describing your professional lane." rows={3} className="mt-1.5 w-full rounded-xl border-2 border-slate-200 bg-white px-3 py-2.5 text-sm leading-6 text-slate-800 placeholder:text-slate-400 focus:border-violet-400 focus:outline-none focus:ring-2 focus:ring-violet-200" />
              <p className="mt-1 text-right text-[11px] text-slate-400">{customIdentity.length}/220</p>
            </div>
          )}
        </div>
      )}

      {step === 'tone_length' && renderStepShell('Choose the tone', 'How should this sound in the interview?',
        <div className="space-y-6">
          <div>
            <p className="text-[10px] font-black uppercase tracking-[0.16em] text-slate-500 mb-3">Tone</p>
            {renderCardSelect(TONE_OPTIONS, tone, (id) => setTone(id as TonePreference))}
          </div>
          <div>
            <p className="text-[10px] font-black uppercase tracking-[0.16em] text-slate-500 mb-3">Answer length</p>
            {renderCardSelect(LENGTH_OPTIONS, length, (id) => setLength(id as LengthPreference))}
          </div>
        </div>
      )}

      {step === 'notes' && renderStepShell('Build your introduction', "Your resume and job description are already loaded. We'll pull from them automatically.",
        <div className="space-y-5">
          {generateError && (
            <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3">
              <p className="text-xs font-bold text-rose-700">Something went wrong generating your answer. Check your connection and try again.</p>
            </div>
          )}
          <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4">
            <p className="text-xs font-bold text-slate-700 mb-2">We&apos;ll create:</p>
            <ul className="space-y-1">
              <li className="text-xs leading-5 text-slate-600">• A primary answer</li>
              <li className="text-xs leading-5 text-slate-600">• A casual version</li>
              <li className="text-xs leading-5 text-slate-600">• A short version</li>
              <li className="text-xs leading-5 text-slate-600">• Present / Past / Future breakdown</li>
              <li className="text-xs leading-5 text-slate-600">• Coaching notes</li>
            </ul>
          </div>
        </div>,
        <div className="flex items-center gap-2">
          <button onClick={prevStep} className="flex items-center gap-1 rounded-xl border border-slate-200 bg-white px-4 py-3 text-xs font-bold text-slate-600 hover:bg-slate-50"><ArrowLeft className="h-3.5 w-3.5" /> Back</button>
          <button onClick={() => { setGenerateError(false); setStep('generating') }} className="btn-coach-primary flex flex-1 items-center justify-center gap-2 py-3 text-sm font-bold"><Sparkles className="h-4 w-4" /> Generate answer</button>
        </div>
      )}

      {step === 'generating' && (
        <div className="flex h-full flex-col items-center justify-center px-5 text-center">
          <div className="h-12 w-12 animate-spin rounded-full border-4 border-violet-200 border-t-violet-500" />
          <p className="mt-5 text-sm font-bold text-slate-700">Building your professional introduction…</p>
          <p className="mt-1 text-xs text-slate-500">Analyzing your resume and job description.</p>
        </div>
      )}

      {step === 'output' && output && (
        <div className="workshop-screen">
          <div className="workshop-header bg-gradient-to-br from-emerald-50 via-white to-violet-50">
            <span className="rounded-full bg-emerald-100 px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.16em] text-emerald-700">Your answer</span>
            <h2 className="mt-2 text-lg font-extrabold leading-tight text-slate-900 sm:text-xl">Here&apos;s what that sounds like.</h2>
          </div>
          <div className="workshop-body">
            <div className="flex h-full min-h-0 flex-col">
              <div className="workshop-tabs" role="tablist" aria-label="Answer tools">
                {([
                  ['answer', 'Answer'],
                  ['structure', 'Breakdown'],
                  ['refine', 'Refine'],
                ] as const).map(([panel, label]) => (
                  <button
                    key={panel}
                    type="button"
                    role="tab"
                    aria-selected={activeOutputPanel === panel}
                    onClick={() => setActiveOutputPanel(panel)}
                    className={`workshop-tab ${activeOutputPanel === panel ? 'bg-white text-violet-700 shadow-sm' : 'text-slate-500 hover:text-slate-800'}`}
                  >
                    {label}
                  </button>
                ))}
              </div>

              {activeOutputPanel === 'answer' && (
                <div className="flex min-h-0 flex-1 flex-col pt-3">
                  <div className="flex shrink-0 items-center gap-2">
                    {(['primary', 'casual', 'short'] as const).map((tab) => (
                      <button
                        key={tab}
                        type="button"
                        onClick={() => setActiveOutputTab(tab)}
                        className={`rounded-full px-3 py-1 text-xs font-bold transition ${activeOutputTab === tab ? 'bg-violet-500 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}
                      >
                        {tab === 'primary' ? 'Full' : tab === 'casual' ? 'Casual' : 'Short'}
                      </button>
                    ))}
                  </div>

                  <div className="my-3 flex min-h-0 flex-1 items-center rounded-2xl border-2 border-violet-300 bg-violet-50 px-4 py-3 sm:px-5 sm:py-4">
                    <p className="text-[13px] leading-6 text-slate-900 sm:text-sm sm:leading-7">{activeAnswer}</p>
                  </div>

                  <div className="flex shrink-0 items-center gap-2">
                    <button onClick={() => copyToClipboard(activeAnswer || '')} className="flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-bold text-slate-600 hover:bg-slate-50">
                      {copied ? <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" /> : <Copy className="h-3.5 w-3.5" />} {copied ? 'Copied' : 'Copy answer'}
                    </button>
                  </div>
                </div>
              )}

              {activeOutputPanel === 'structure' && (
                <div className="flex min-h-0 flex-1 flex-col pt-3">
                  {visibleStructurePart ? (() => {
                    const framework = FRAMEWORK_STEPS.find((item) => item.key === visibleStructurePart)
                    const colors = framework ? COLOR_MAP[framework.color] : COLOR_MAP.violet
                    const labels: Record<StructurePart, string> = { present: 'Present', past: 'Past', future: 'Future' }
                    return (
                      <>
                        <div className="grid shrink-0 grid-cols-3 gap-2">
                          {structureParts.map((part) => (
                            <button key={part} type="button" onClick={() => setActiveStructurePart(part)} className={`rounded-xl border-2 px-2 py-2 text-xs font-extrabold transition ${activeStructurePart === part ? `${colors.border} ${colors.soft} ${colors.text}` : 'border-slate-200 bg-white text-slate-500'}`}>
                              {labels[part]}
                            </button>
                          ))}
                        </div>
                        <div className={`my-3 flex min-h-0 flex-1 items-center rounded-2xl border-2 ${colors.border} ${colors.soft} px-5 py-4`}>
                          <div className="mx-auto max-w-xl text-center">
                            <span className={`mx-auto flex h-10 w-10 items-center justify-center rounded-xl ${colors.bg} text-lg text-white`}>{framework?.emoji || '📝'}</span>
                            <p className={`mt-3 text-[10px] font-black uppercase tracking-[0.16em] ${colors.text}`}>{labels[visibleStructurePart]}</p>
                            <p className="mt-2 text-sm leading-7 text-slate-800">{output.structureUsed?.[visibleStructurePart]}</p>
                          </div>
                        </div>
                        <p className="shrink-0 text-center text-[11px] font-bold text-slate-400">One part at a time. Tap a tab to see the next piece.</p>
                      </>
                    )
                  })() : (
                    <div className="flex flex-1 items-center justify-center text-center text-sm font-bold text-slate-500">No breakdown was generated for this answer.</div>
                  )}
                </div>
              )}

              {activeOutputPanel === 'refine' && (
                <div className="flex min-h-0 flex-1 flex-col justify-center pt-3">
                  {rewriting ? (
                    <div className="flex flex-col items-center justify-center text-center">
                      <div className="h-9 w-9 animate-spin rounded-full border-4 border-violet-200 border-t-violet-500" />
                      <p className="mt-3 text-sm font-bold text-violet-700">Rewriting your answer…</p>
                    </div>
                  ) : rewriteConfirm ? (
                    <div className="mx-auto w-full max-w-lg rounded-2xl border-2 border-amber-300 bg-amber-50 px-4 py-4 text-center">
                      <p className="text-sm font-extrabold text-amber-900">Generate a new version?</p>
                      <p className="mt-1 text-xs leading-5 text-amber-700">{rewriteConfirm === 'regenerate' ? 'This creates a fresh answer with the same settings.' : `Rewrite it to ${rewriteConfirm.replace(/_/g, ' ')}.`}</p>
                      <div className="mt-4 grid grid-cols-2 gap-2">
                        <button onClick={() => setRewriteConfirm(null)} className="rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-xs font-bold text-slate-600 hover:bg-slate-50">Cancel</button>
                        <button onClick={() => handleRewrite(rewriteConfirm)} className="rounded-xl bg-violet-500 px-3 py-2.5 text-xs font-bold text-white hover:bg-violet-600">Generate</button>
                      </div>
                    </div>
                  ) : (
                    <div className="mx-auto w-full max-w-lg">
                      <p className="text-center text-sm font-extrabold text-slate-900">What should change?</p>
                      <p className="mt-1 text-center text-xs text-slate-500">Pick one adjustment. You can always come back.</p>
                      <div className="mt-4 grid grid-cols-2 gap-2">
                        {REWRITE_OPTIONS.filter((item) => item.id !== 'regenerate').slice(0, 6).map((option) => (
                          <button key={option.id} onClick={() => setRewriteConfirm(option.id)} className="rounded-xl border-2 border-slate-200 bg-white px-3 py-3 text-xs font-bold text-slate-700 transition hover:border-violet-300 hover:bg-violet-50">{option.label}</button>
                        ))}
                      </div>
                      <button onClick={() => setRewriteConfirm('regenerate')} className="mt-3 flex w-full items-center justify-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-xs font-bold text-slate-600 hover:bg-slate-100">
                        <RefreshCw className="h-3.5 w-3.5" /> Start over with a new answer
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
          <div className="workshop-footer">
            <button onClick={onComplete} className="btn-coach-primary flex w-full items-center justify-center gap-2 py-3 text-sm font-bold">Finish workshop <CheckCircle2 className="h-4 w-4" /></button>
          </div>
        </div>
      )}
    </div>
  )
}
