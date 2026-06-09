'use client'

import { type ReactNode, useCallback, useEffect, useState } from 'react'
import {
  ArrowLeft,
  ArrowRight,
  Check,
  CheckCircle2,
  ChevronRight,
  Copy,
  Lightbulb,
  Lock,
  RefreshCw,
  Sparkles,
  Target,
} from 'lucide-react'
import {
  QUESTION_TYPE_OPTIONS,
  TONE_OPTIONS,
  LENGTH_OPTIONS,
  DEFAULT_AVOIDANCES,
  REWRITE_OPTIONS,
  PROGRESS_STEPS,
  FRAMEWORK_STEPS,
  type CareerAlignmentQuestionType,
  type CareerAlignmentTone,
  type CareerAlignmentLength,
  type CareerAlignmentRewriteInstruction,
  type CareerAlignmentOutput,
} from '@/lib/career-alignment-config'

interface CareerAlignmentBuilderProps {
  sessionId?: string
  originalQuestion?: string
  originalAnswer?: string
  onComplete: () => void
}

type Step =
  | 'intro'
  | 'method'
  | 'question_type'
  | 'tone_length'
  | 'notes'
  | 'generating'
  | 'output'

const STEP_TO_PROGRESS: Record<string, number> = {
  question_type: 0,
  tone_length: 1,
  notes: 1,
  generating: 2,
  output: 2,
}

const COLOR_MAP: Record<string, { bg: string; border: string; text: string; soft: string }> = {
  violet: { bg: 'bg-violet-500', border: 'border-violet-300', text: 'text-violet-700', soft: 'bg-violet-50' },
  emerald: { bg: 'bg-emerald-500', border: 'border-emerald-300', text: 'text-emerald-700', soft: 'bg-emerald-50' },
  sky: { bg: 'bg-sky-500', border: 'border-sky-300', text: 'text-sky-700', soft: 'bg-sky-50' },
  amber: { bg: 'bg-amber-500', border: 'border-amber-300', text: 'text-amber-700', soft: 'bg-amber-50' },
}

export default function CareerAlignmentBuilder({
  sessionId,
  originalQuestion,
  originalAnswer,
  onComplete,
}: CareerAlignmentBuilderProps) {
  const [step, setStep] = useState<Step>('intro')
  const [flippedCards, setFlippedCards] = useState<Set<number>>(new Set())

  const [questionType, setQuestionType] = useState<CareerAlignmentQuestionType | null>(null)
  const [tone, setTone] = useState<CareerAlignmentTone>('natural_confident')
  const [length, setLength] = useState<CareerAlignmentLength>('sixty_seconds')

  const [output, setOutput] = useState<CareerAlignmentOutput | null>(null)
  const [generateError, setGenerateError] = useState(false)
  const [copied, setCopied] = useState(false)
  const [activeOutputTab, setActiveOutputTab] = useState<'primary' | 'shorter' | 'conversational'>('primary')
  const [rewriteConfirm, setRewriteConfirm] = useState<CareerAlignmentRewriteInstruction | null>(null)
  const [rewriting, setRewriting] = useState(false)

  const allMethodFlipped = flippedCards.size >= FRAMEWORK_STEPS.length
  const progressIndex = STEP_TO_PROGRESS[step] ?? -1

  function flipCard(i: number) {
    setFlippedCards((prev) => { const next = new Set(prev); next.add(i); return next })
  }

  function canAdvance(): boolean {
    switch (step) {
      case 'question_type':
        return !!questionType
      case 'tone_length':
        return !!tone && !!length
      case 'notes':
        return true
      default:
        return true
    }
  }

  const nextStep = useCallback(() => {
    const flow: Step[] = ['intro', 'method', 'question_type', 'tone_length', 'notes', 'generating']
    const idx = flow.indexOf(step)
    if (idx >= 0 && idx < flow.length - 1) setStep(flow[idx + 1])
  }, [step])

  const prevStep = useCallback(() => {
    const flow: Step[] = ['intro', 'method', 'question_type', 'tone_length', 'notes']
    const idx = flow.indexOf(step)
    if (idx > 0) setStep(flow[idx - 1])
  }, [step])

  useEffect(() => {
    if (step !== 'generating' || rewriting) return
    let cancelled = false
    async function generate() {
      try {
        const res = await fetch('/api/interview/career-alignment', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            questionType,
            tone, length, avoidances: DEFAULT_AVOIDANCES, sessionId,
          }),
        })
        if (!res.ok) throw new Error('failed')
        const data = await res.json()
        if (cancelled) return
        if (data.primaryAnswer || data.roleObservation) { setOutput(data as CareerAlignmentOutput); setStep('output') }
        else { setGenerateError(true); setStep('notes') }
      } catch { if (!cancelled) { setGenerateError(true); setStep('notes') } }
    }
    generate()
    return () => { cancelled = true }
  }, [step, rewriting]) // eslint-disable-line react-hooks/exhaustive-deps

  async function handleRewrite(instruction: CareerAlignmentRewriteInstruction) {
    setRewriteConfirm(null)
    if (!output) return
    if (instruction === 'regenerate') { setGenerateError(false); setOutput(null); setStep('generating'); return }
    setRewriting(true)
    try {
      const res = await fetch('/api/interview/career-alignment', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rewriteInstruction: instruction, originalAnswer: output.primaryAnswer, originalOutput: output, questionType, sessionId }),
      })
      if (!res.ok) throw new Error('failed')
      const data = await res.json()
      if (data.primaryAnswer) { setOutput({ ...output, primaryAnswer: data.primaryAnswer }); setActiveOutputTab('primary') }
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
      <div className="space-y-2">
        {options.map((opt) => {
          const isSelected = selected === opt.id
          return (
            <button key={opt.id} type="button" onClick={() => onSelect(opt.id)}
              className={`group w-full rounded-2xl border-2 px-4 py-3 text-left transition active:scale-[0.98] ${isSelected ? 'border-violet-400 bg-violet-50 shadow-sm' : 'border-slate-200 bg-white hover:border-violet-300 hover:bg-violet-50/50'}`}>
              <div className="flex items-center gap-3">
                <div className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2 transition ${isSelected ? 'border-violet-500 bg-violet-500' : 'border-slate-300'}`}>
                  {isSelected && <Check className="h-3 w-3 text-white" />}
                </div>
                <div className="min-w-0 flex-1">
                  <p className={`text-sm font-bold ${isSelected ? 'text-violet-900' : 'text-slate-800'}`}>{opt.label}</p>
                  {opt.description && <p className="mt-0.5 text-xs leading-5 text-slate-500">{opt.description}</p>}
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
      <div className="flex h-full flex-col">
        {renderProgressBar()}
        <div className="border-b border-slate-200 bg-gradient-to-br from-violet-50 via-white to-sky-50 px-5 py-4">
          <h2 className="text-xl font-extrabold leading-tight text-slate-900">{title}</h2>
          <p className="mt-1 text-xs leading-5 text-slate-500">{subtitle}</p>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto px-5 py-5">{children}</div>
        <div className="shrink-0 border-t border-slate-200 px-5 py-3">
          {footer || (
            <div className="flex items-center gap-2">
              {step !== 'question_type' && (
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

  const activeAnswer = activeOutputTab === 'shorter' ? output?.shorterAnswer : activeOutputTab === 'conversational' ? output?.moreConversationalAnswer : output?.primaryAnswer

  return (
    <div className="flex h-full flex-col overflow-hidden rounded-[28px] border border-slate-200 bg-white">
      {step === 'intro' && (
        <div className="flex h-full flex-col">
          <div className="border-b border-slate-200 bg-gradient-to-br from-violet-50 via-white to-sky-50 px-5 py-4">
            <div className="flex items-center gap-2">
              <span className="rounded-full bg-violet-100 px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.16em] text-violet-700">Why this matters</span>
              <span className="rounded-full bg-slate-100 px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.14em] text-slate-600">OFT</span>
            </div>
            <h2 className="mt-3 text-xl font-extrabold leading-tight text-slate-900">&ldquo;Why this role?&rdquo; is where most people go generic.</h2>
          </div>
          <div className="min-h-0 flex-1 overflow-y-auto px-5 py-5">
            <div className="space-y-4">
              <div className="rounded-2xl border border-violet-100 bg-violet-50/60 px-4 py-4">
                <div className="flex items-start gap-3">
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-violet-500 text-white"><Lightbulb className="h-4 w-4" /></div>
                  <p className="text-sm leading-7 text-slate-800">Career alignment questions test whether you&apos;ve done your homework and whether your motivation is real. Most candidates give vague answers about &ldquo;great culture&rdquo; or &ldquo;exciting opportunity.&rdquo; A strong answer connects a specific observation about the role or company to your real skills and timing.</p>
                </div>
              </div>
              <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4">
                <div className="flex items-start gap-3">
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-slate-700 text-white"><Target className="h-4 w-4" /></div>
                  <div>
                    <p className="text-[10px] font-black uppercase tracking-[0.16em] text-slate-500">When to use it</p>
                    <p className="mt-1 text-sm leading-6 text-slate-800">Use this for &ldquo;why this role?&rdquo;, &ldquo;why our company?&rdquo;, &ldquo;what attracted you to this position?&rdquo;, or &ldquo;why are you looking to make a move?&rdquo;</p>
                  </div>
                </div>
              </div>
              {originalAnswer && (
                <div className="rounded-2xl border border-rose-100 bg-rose-50/50 px-4 py-4">
                  <p className="text-[10px] font-black uppercase tracking-[0.16em] text-rose-600">What you said in the interview</p>
                  {originalQuestion && <p className="mt-1 text-[11px] font-bold leading-5 text-rose-800">Q: {originalQuestion}</p>}
                  <p className="mt-2 text-sm italic leading-6 text-rose-900">&ldquo;{originalAnswer.length > 220 ? originalAnswer.slice(0, 220).trim() + '...' : originalAnswer}&rdquo;</p>
                  <p className="mt-3 text-xs font-bold text-rose-700">We&apos;ll build a better version using your real resume.</p>
                </div>
              )}
            </div>
          </div>
          <div className="shrink-0 border-t border-slate-200 px-5 py-3">
            <button onClick={() => setStep('method')} className="btn-coach-primary flex w-full items-center justify-center gap-2 py-3 text-sm font-bold">See the method <ArrowRight className="h-4 w-4" /></button>
          </div>
        </div>
      )}

      {step === 'method' && (
        <div className="flex h-full flex-col">
          <div className="border-b border-slate-200 bg-gradient-to-br from-sky-50 via-white to-violet-50 px-5 py-4">
            <span className="rounded-full bg-sky-100 px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.16em] text-sky-700">The Method</span>
            <h2 className="mt-2 text-xl font-extrabold leading-tight text-slate-900">Observation &middot; Fit &middot; Timing</h2>
            <p className="mt-1 text-xs font-bold text-slate-500">Flip each card in order to unlock the next.</p>
          </div>
          <div className="min-h-0 flex-1 overflow-y-auto px-5 py-5">
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
          <div className="shrink-0 border-t border-slate-200 px-5 py-3">
            <button onClick={() => setStep('question_type')} disabled={!allMethodFlipped} className="btn-coach-primary flex w-full items-center justify-center gap-2 py-3 text-sm font-bold disabled:opacity-50">
              {allMethodFlipped ? "Let's build yours" : 'Flip every card to continue'} <ArrowRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}

      {step === 'question_type' && renderStepShell('Which question are you answering?', 'Pick the type that best matches the question you were asked.',
        <div className="space-y-5">
          {renderCardSelect(QUESTION_TYPE_OPTIONS, questionType, (id) => setQuestionType(id as CareerAlignmentQuestionType))}
        </div>,
        <button onClick={nextStep} disabled={!canAdvance()} className="btn-coach-primary flex w-full items-center justify-center gap-2 py-3 text-sm font-bold disabled:opacity-50">Continue <ArrowRight className="h-4 w-4" /></button>
      )}

      {step === 'tone_length' && renderStepShell('Choose the tone', 'How should this sound in the interview?',
        <div className="space-y-6">
          <div>
            <p className="text-[10px] font-black uppercase tracking-[0.16em] text-slate-500 mb-3">Tone</p>
            {renderCardSelect(TONE_OPTIONS, tone, (id) => setTone(id as CareerAlignmentTone))}
          </div>
          <div>
            <p className="text-[10px] font-black uppercase tracking-[0.16em] text-slate-500 mb-3">Answer length</p>
            {renderCardSelect(LENGTH_OPTIONS, length, (id) => setLength(id as CareerAlignmentLength))}
          </div>
        </div>
      )}

      {step === 'notes' && renderStepShell('Build your answer', "Your resume and job description are already loaded. We'll pull from them automatically.",
        <div className="space-y-5">
          {generateError && (
            <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3">
              <p className="text-xs font-bold text-rose-700">Something went wrong generating your answer. Check your connection and try again.</p>
            </div>
          )}
          <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4">
            <p className="text-xs font-bold text-slate-700 mb-2">We&apos;ll create:</p>
            <ul className="space-y-1">
              <li className="text-xs leading-5 text-slate-600">&#8226; A primary answer</li>
              <li className="text-xs leading-5 text-slate-600">&#8226; A shorter version</li>
              <li className="text-xs leading-5 text-slate-600">&#8226; A more conversational version</li>
              <li className="text-xs leading-5 text-slate-600">&#8226; Observation / Fit / Timing breakdown</li>
              <li className="text-xs leading-5 text-slate-600">&#8226; Coaching notes</li>
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
          <p className="mt-5 text-sm font-bold text-slate-700">Building your career alignment answer...</p>
          <p className="mt-1 text-xs text-slate-500">Analyzing your resume and job description.</p>
        </div>
      )}

      {step === 'output' && output && (
        <div className="flex h-full flex-col">
          <div className="border-b border-slate-200 bg-gradient-to-br from-emerald-50 via-white to-violet-50 px-5 py-4">
            <span className="rounded-full bg-emerald-100 px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.16em] text-emerald-700">Your answer</span>
            <h2 className="mt-2 text-xl font-extrabold leading-tight text-slate-900">Here&apos;s what that sounds like.</h2>
          </div>
          <div className="min-h-0 flex-1 overflow-y-auto px-5 py-5">
            <div className="space-y-6">
              <div>
                <div className="flex items-center gap-2 mb-3">
                  {(['primary', 'shorter', 'conversational'] as const).map((tab) => (
                    <button key={tab} onClick={() => setActiveOutputTab(tab)} className={`rounded-full px-3 py-1 text-xs font-bold transition ${activeOutputTab === tab ? 'bg-violet-500 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}>
                      {tab === 'primary' ? 'Full' : tab === 'shorter' ? 'Shorter' : 'Conversational'}
                    </button>
                  ))}
                </div>
                <div className="rounded-2xl border-2 border-violet-300 bg-violet-50 px-4 py-4"><p className="text-sm leading-7 text-slate-900">{activeAnswer}</p></div>
                <div className="mt-2 flex items-center gap-2 flex-wrap">
                  <button onClick={() => copyToClipboard(activeAnswer || '')} className="flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-bold text-slate-600 hover:bg-slate-50">
                    {copied ? <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" /> : <Copy className="h-3.5 w-3.5" />} {copied ? 'Copied' : 'Copy'}
                  </button>
                  <button onClick={() => setRewriteConfirm('regenerate')} className="flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-bold text-slate-600 hover:bg-slate-50">
                    <RefreshCw className="h-3.5 w-3.5" /> Regenerate
                  </button>
                </div>
              </div>

              {output.roleObservation && (
                <div>
                  <p className="text-[10px] font-black uppercase tracking-[0.16em] text-slate-500 mb-2">How this answer is structured</p>
                  <div className="space-y-2">
                    <div className="rounded-xl border-2 border-sky-300 bg-sky-50 px-3 py-2.5">
                      <div className="flex items-start gap-2">
                        <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-sky-500 text-xs text-white">🔍</span>
                        <div className="min-w-0 flex-1">
                          <p className="text-[10px] font-black uppercase tracking-[0.14em] text-sky-700">Role Observation</p>
                          <p className="text-sm leading-6 text-slate-800">{output.roleObservation}</p>
                        </div>
                      </div>
                    </div>
                    {output.companyObservation && (
                      <div className="rounded-xl border-2 border-sky-300 bg-sky-50 px-3 py-2.5">
                        <div className="flex items-start gap-2">
                          <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-sky-500 text-xs text-white">🏢</span>
                          <div className="min-w-0 flex-1">
                            <p className="text-[10px] font-black uppercase tracking-[0.14em] text-sky-700">Company Observation</p>
                            <p className="text-sm leading-6 text-slate-800">{output.companyObservation}</p>
                          </div>
                        </div>
                      </div>
                    )}
                    <div className="rounded-xl border-2 border-amber-300 bg-amber-50 px-3 py-2.5">
                      <div className="flex items-start gap-2">
                        <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-amber-500 text-xs text-white">🎯</span>
                        <div className="min-w-0 flex-1">
                          <p className="text-[10px] font-black uppercase tracking-[0.14em] text-amber-700">Candidate Fit</p>
                          <p className="text-sm leading-6 text-slate-800">{output.candidateFit}</p>
                          {output.evidenceBullets && output.evidenceBullets.length > 0 && (
                            <ul className="mt-1 space-y-0.5">
                              {output.evidenceBullets.map((bullet, i) => (
                                <li key={i} className="text-xs leading-5 text-amber-800">&#8226; {bullet}</li>
                              ))}
                            </ul>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="rounded-xl border-2 border-violet-300 bg-violet-50 px-3 py-2.5">
                      <div className="flex items-start gap-2">
                        <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-violet-500 text-xs text-white">⏰</span>
                        <div className="min-w-0 flex-1">
                          <p className="text-[10px] font-black uppercase tracking-[0.14em] text-violet-700">Timing</p>
                          <p className="text-sm leading-6 text-slate-800">{output.whyNow}</p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {output.openingLineOptions?.length > 0 && (
                <div>
                  <p className="text-[10px] font-black uppercase tracking-[0.16em] text-slate-500 mb-2">Opening line options</p>
                  <div className="space-y-1.5">{output.openingLineOptions.map((line, i) => (<div key={i} className="flex items-start gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2"><ChevronRight className="mt-0.5 h-3.5 w-3.5 shrink-0 text-sky-400" /><p className="text-xs leading-5 text-slate-700">{line}</p></div>))}</div>
                </div>
              )}

              {output.closingLineOptions?.length > 0 && (
                <div>
                  <p className="text-[10px] font-black uppercase tracking-[0.16em] text-slate-500 mb-2">Closing line options</p>
                  <div className="space-y-1.5">{output.closingLineOptions.map((line, i) => (<div key={i} className="flex items-start gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2"><ChevronRight className="mt-0.5 h-3.5 w-3.5 shrink-0 text-violet-400" /><p className="text-xs leading-5 text-slate-700">{line}</p></div>))}</div>
                </div>
              )}

              {output.whyThisWorks?.length > 0 && (
                <div className="rounded-2xl border border-emerald-100 bg-emerald-50/60 px-4 py-3">
                  <p className="text-[10px] font-black uppercase tracking-[0.16em] text-emerald-600 mb-1">Why this works</p>
                  <ul className="space-y-1">{output.whyThisWorks.map((w, i) => (<li key={i} className="text-xs leading-5 text-emerald-800">&#8226; {w}</li>))}</ul>
                </div>
              )}

              {output.possibleWeakSpots?.length > 0 && (
                <div className="rounded-2xl border border-amber-100 bg-amber-50/60 px-4 py-3">
                  <p className="text-[10px] font-black uppercase tracking-[0.16em] text-amber-600 mb-1">Be careful with this</p>
                  <ul className="space-y-1">{output.possibleWeakSpots.map((w, i) => (<li key={i} className="text-xs leading-5 text-amber-800">&#8226; {w}</li>))}</ul>
                </div>
              )}

              <div>
                <p className="text-[10px] font-black uppercase tracking-[0.16em] text-slate-500 mb-2">Want a different version?</p>
                <div className="flex flex-wrap gap-1.5">
                  {REWRITE_OPTIONS.filter((r) => r.id !== 'regenerate').map((opt) => (
                    <button key={opt.id} onClick={() => setRewriteConfirm(opt.id)} disabled={rewriting} className="rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-[11px] font-bold text-slate-600 hover:bg-slate-50 disabled:opacity-50">{opt.label}</button>
                  ))}
                </div>
              </div>

              {rewriteConfirm && (
                <div className="rounded-2xl border-2 border-amber-300 bg-amber-50 px-4 py-4">
                  <p className="text-sm font-bold text-amber-900">Generate a new version?</p>
                  <p className="mt-1 text-xs text-amber-700">{rewriteConfirm === 'regenerate' ? 'This will create a completely new answer with the same settings.' : `This will rewrite your answer to: ${rewriteConfirm.replace(/_/g, ' ')}.`}</p>
                  <div className="mt-3 flex items-center gap-2">
                    <button onClick={() => setRewriteConfirm(null)} className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-bold text-slate-600 hover:bg-slate-50">Cancel</button>
                    <button onClick={() => handleRewrite(rewriteConfirm)} className="rounded-lg bg-violet-500 px-3 py-1.5 text-xs font-bold text-white hover:bg-violet-600">Generate new answer</button>
                  </div>
                </div>
              )}

              {rewriting && (
                <div className="flex items-center gap-3 rounded-2xl border border-violet-200 bg-violet-50 px-4 py-3">
                  <div className="h-5 w-5 animate-spin rounded-full border-2 border-violet-200 border-t-violet-500" />
                  <p className="text-xs font-bold text-violet-700">Rewriting your answer...</p>
                </div>
              )}
            </div>
          </div>
          <div className="shrink-0 border-t border-slate-200 px-5 py-3">
            <button onClick={onComplete} className="btn-coach-primary flex w-full items-center justify-center gap-2 py-3 text-sm font-bold">Finish workshop <CheckCircle2 className="h-4 w-4" /></button>
          </div>
        </div>
      )}
    </div>
  )
}
