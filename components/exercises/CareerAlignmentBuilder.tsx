'use client'

import { useState } from 'react'
import { Check, Copy, RefreshCw, Sparkles } from 'lucide-react'
import {
  type CareerAlignmentOutput,
  type CareerAlignmentRewriteInstruction,
  FRAMEWORK_STEPS,
  REWRITE_OPTIONS,
} from '@/lib/career-alignment-config'
import { PORTFOLIO_DEMO_MODE, getDemoContextPayload } from '@/lib/portfolio-demo'

interface CareerAlignmentBuilderProps {
  sessionId?: string
  originalQuestion?: string
  originalAnswer?: string
  onComplete: () => void
}

type Screen = 'review' | 'generating' | 'output'
type AnswerTab = 'primary' | 'shorter' | 'conversational'
type OutputPanel = 'answer' | 'breakdown' | 'refine'

export default function CareerAlignmentBuilder({
  sessionId,
  originalQuestion,
  originalAnswer,
  onComplete,
}: CareerAlignmentBuilderProps) {
  const [screen, setScreen] = useState<Screen>('review')
  const [output, setOutput] = useState<CareerAlignmentOutput | null>(null)
  const [error, setError] = useState('')
  const [activeTab, setActiveTab] = useState<AnswerTab>('primary')
  const [outputPanel, setOutputPanel] = useState<OutputPanel>('answer')
  const [copied, setCopied] = useState(false)
  const [rewriting, setRewriting] = useState(false)
  const [confirmRewrite, setConfirmRewrite] = useState<CareerAlignmentRewriteInstruction | null>(null)
  async function handleGenerate() {
    setScreen('generating')
    setError('')
    try {
      const res = await fetch('/api/interview/career-alignment', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          flaggedQuestion: originalQuestion || '',
          userOriginalAnswer: originalAnswer || '',
          sessionId,
          ...(PORTFOLIO_DEMO_MODE ? getDemoContextPayload() : {}),
        }),
      })
      const data = await res.json()
      if (data.error) {
        setError('Could not generate a stronger answer. Please try again.')
        setScreen('review')
        return
      }
      setOutput(data as CareerAlignmentOutput)
      setScreen('output')
    } catch {
      setError('Something went wrong. Please try again.')
      setScreen('review')
    }
  }

  async function handleRewrite(instruction: CareerAlignmentRewriteInstruction) {
    if (!output) return
    setRewriting(true)
    setConfirmRewrite(null)
    try {
      const res = await fetch('/api/interview/career-alignment', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          rewriteInstruction: instruction,
          originalAnswer: output.primaryAnswer,
          originalOutput: output,
          flaggedQuestion: originalQuestion || '',
          userOriginalAnswer: originalAnswer || '',
          sessionId,
          ...(PORTFOLIO_DEMO_MODE ? getDemoContextPayload() : {}),
        }),
      })
      const data = await res.json()
      if (data.primaryAnswer) {
        setOutput((prev) => (prev ? { ...prev, primaryAnswer: data.primaryAnswer } : prev))
        setActiveTab('primary')
      }
    } catch {
      // silent fail — user can retry
    } finally {
      setRewriting(false)
    }
  }

  function handleCopy() {
    if (!output) return
    const text =
      activeTab === 'shorter'
        ? output.shorterAnswer
        : activeTab === 'conversational'
          ? output.conversationalAnswer
          : output.primaryAnswer
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    })
  }

  // ─── Screen 1: Flagged Answer Review ───────────────────────────────────────

  if (screen === 'review') {
    return (
      <div className="workshop-frame">
        <div className="workshop-screen">
          <div className="workshop-header bg-gradient-to-br from-violet-50 via-white to-sky-50">
            <span className="rounded-full bg-violet-100 px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.16em] text-violet-700">
              The method
            </span>
            <h2 className="mt-2 text-xl font-extrabold leading-tight text-slate-900">
              Build a clear career-alignment answer
            </h2>
            <p className="mt-1 text-xs font-semibold text-slate-500">
              Connect what you noticed, why you fit, and why this move makes sense now.
            </p>
          </div>

          <div className="workshop-body">
            <div className="grid h-full min-h-0 grid-rows-[auto_1fr] gap-2 sm:grid-cols-[1.05fr_0.95fr] sm:grid-rows-none sm:gap-3">
              <div className="grid min-h-0 grid-cols-2 gap-3 rounded-2xl border-2 border-slate-200 bg-slate-50 p-3 sm:flex sm:flex-col sm:p-4">
                <p className="col-span-2 text-[10px] font-black uppercase tracking-[0.14em] text-slate-400">Starting point</p>
                {originalQuestion && (
                  <div className="sm:mt-3">
                    <p className="text-[10px] font-black uppercase tracking-[0.14em] text-slate-400">Question</p>
                    <p className="mt-1 text-sm font-semibold leading-6 text-slate-800">{originalQuestion}</p>
                  </div>
                )}
                <div className="min-h-0 flex-1 overflow-hidden sm:mt-3">
                  <p className="text-[10px] font-black uppercase tracking-[0.14em] text-slate-400">Your interview answer</p>
                  <p className="mt-1 text-sm leading-6 text-slate-600">{originalAnswer || 'No answer was captured. We can still build one from your demo context.'}</p>
                </div>
              </div>

              <div className="min-h-0 rounded-2xl border-2 border-violet-200 bg-violet-50/60 p-3 sm:p-4">
                <p className="text-[10px] font-black uppercase tracking-[0.14em] text-violet-600">Observation → Fit → Timing</p>
                <div className="mt-2 grid h-[calc(100%-1.5rem)] min-h-0 grid-rows-3 gap-2 sm:mt-3 sm:h-auto">
                  {FRAMEWORK_STEPS.map((step) => (
                    <div key={step.key} className="flex min-h-0 items-center gap-2.5 rounded-xl bg-white/80 px-3 py-2 sm:items-start sm:py-2.5">
                      <span className="text-base">{step.emoji}</span>
                      <div>
                        <p className="text-xs font-extrabold text-slate-800">{step.label}</p>
                        <p className="text-xs leading-5 text-slate-500">{step.description}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          <div className="workshop-footer">
            {error && <p className="mb-2 rounded-xl bg-red-50 px-3 py-2 text-xs font-bold text-red-600">{error}</p>}
          <button
            type="button"
            onClick={handleGenerate}
            className="btn-coach-primary flex w-full items-center justify-center gap-2 py-3 text-sm font-bold"
          >
            <Sparkles className="h-4 w-4" />
            Generate stronger answer
          </button>
          </div>
        </div>
      </div>
    )
  }

  // ─── Generating spinner ────────────────────────────────────────────────────

  if (screen === 'generating') {
    return (
      <div className="workshop-frame items-center justify-center">
        <div className="text-center">
          <div className="mx-auto mb-4 h-10 w-10 animate-spin rounded-full border-4 border-violet-200 border-t-violet-600" />
          <p className="text-sm font-bold text-slate-600">
            Building a stronger answer&hellip;
          </p>
          <p className="mt-1 text-xs text-slate-400">
            Using the supplied resume, job description, and the Observation → Evidence of Fit → Timing framework
          </p>
        </div>
      </div>
    )
  }

  // ─── Screen 2: Results ─────────────────────────────────────────────────────

  if (!output) return null

  const activeText =
    activeTab === 'shorter'
      ? output.shorterAnswer
      : activeTab === 'conversational'
        ? output.conversationalAnswer
        : output.primaryAnswer

  return (
    <div className="workshop-frame">
      <div className="workshop-screen">
        <div className="workshop-header bg-gradient-to-br from-emerald-50 via-white to-violet-50">
          <span className="rounded-full bg-emerald-100 px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.16em] text-emerald-700">Your answer</span>
          <h2 className="mt-2 text-xl font-extrabold leading-tight text-slate-900">Here&apos;s what that sounds like.</h2>
        </div>

        <div className="workshop-body">
          <div className="flex h-full min-h-0 flex-col">
            <div className="workshop-tabs" role="tablist" aria-label="Career alignment answer tools">
              {([
                ['answer', 'Answer'],
                ['breakdown', 'Breakdown'],
                ['refine', 'Refine'],
              ] as const).map(([panel, label]) => (
                <button key={panel} type="button" role="tab" aria-selected={outputPanel === panel} onClick={() => setOutputPanel(panel)} className={`workshop-tab ${outputPanel === panel ? 'bg-white text-violet-700 shadow-sm' : 'text-slate-500 hover:text-slate-800'}`}>
                  {label}
                </button>
              ))}
            </div>

            {outputPanel === 'answer' && (
              <div className="flex min-h-0 flex-1 flex-col pt-3">
                <div className="flex gap-2">
                  {([
                    { id: 'primary' as const, label: 'Full' },
                    { id: 'shorter' as const, label: 'Shorter' },
                    { id: 'conversational' as const, label: 'Casual' },
                  ]).map((tab) => (
                    <button key={tab.id} type="button" onClick={() => setActiveTab(tab.id)} className={`rounded-full px-3 py-1 text-xs font-bold transition ${activeTab === tab.id ? 'bg-violet-600 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}>
                      {tab.label}
                    </button>
                  ))}
                </div>
                <div className="my-3 flex min-h-0 flex-1 items-center rounded-2xl border-2 border-violet-300 bg-violet-50 px-5 py-4">
                  <p className="text-sm leading-7 text-slate-800">{activeText}</p>
                </div>
                <button type="button" onClick={handleCopy} className="flex w-fit items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-bold text-slate-600 transition hover:bg-slate-50">
                  {copied ? <Check className="h-3.5 w-3.5 text-emerald-500" /> : <Copy className="h-3.5 w-3.5" />}
                  {copied ? 'Copied' : 'Copy'}
                </button>
              </div>
            )}

            {outputPanel === 'breakdown' && (
              <div className="flex min-h-0 flex-1 flex-col gap-2 pt-3">
                <div className="grid min-h-0 flex-1 grid-cols-3 gap-2">
                  <FrameworkCard emoji="👁️" label="Observation" color="sky" text={output.structureUsed.observation} />
                  <FrameworkCard emoji="🔗" label="Evidence of Fit" color="amber" text={output.structureUsed.evidenceOfFit} />
                  <FrameworkCard emoji="⏱️" label="Timing" color="violet" text={output.structureUsed.timing} />
                </div>
                <div className="grid shrink-0 grid-cols-3 gap-2 rounded-xl bg-slate-50 px-3 py-2">
                  {output.whyThisWorks.slice(0, 3).map((item, i) => (
                    <p key={i} className="flex items-start gap-1.5 text-[11px] leading-4 text-slate-600">
                      <Check className="mt-0.5 h-3 w-3 shrink-0 text-emerald-500" />
                      {item}
                    </p>
                  ))}
                </div>
              </div>
            )}

            {outputPanel === 'refine' && (
              <div className="grid min-h-0 flex-1 grid-cols-[1fr_0.9fr] gap-3 pt-3">
                <div className="rounded-2xl border-2 border-slate-200 bg-white p-4">
                  <p className="text-[10px] font-black uppercase tracking-[0.14em] text-slate-400">Adjust this answer</p>
                  <div className="mt-3 grid grid-cols-2 gap-2">
                    {REWRITE_OPTIONS.map((opt) => (
                      <button key={opt.id} type="button" disabled={rewriting} onClick={() => setConfirmRewrite(opt.id)} className="flex items-center justify-center gap-1 rounded-xl border border-slate-200 bg-slate-50 px-2.5 py-2 text-[11px] font-bold text-slate-600 transition hover:border-violet-300 hover:bg-violet-50 hover:text-violet-700 disabled:opacity-40">
                        {opt.id === 'regenerate' && <RefreshCw className="h-3 w-3" />}
                        {opt.label}
                      </button>
                    ))}
                  </div>
                  {confirmRewrite && (
                    <div className="mt-3 rounded-xl border border-amber-200 bg-amber-50 p-3">
                      <p className="text-xs font-bold text-amber-800">Generate a new version?</p>
                      <div className="mt-2 flex gap-2">
                        <button type="button" onClick={() => setConfirmRewrite(null)} className="rounded-lg px-2.5 py-1 text-xs font-bold text-slate-500">Cancel</button>
                        <button type="button" onClick={() => handleRewrite(confirmRewrite)} disabled={rewriting} className="rounded-lg bg-violet-600 px-3 py-1 text-xs font-bold text-white disabled:opacity-50">Generate</button>
                      </div>
                    </div>
                  )}
                </div>
                <div className="rounded-2xl border-2 border-emerald-200 bg-emerald-50/70 p-4">
                  <p className="text-[10px] font-black uppercase tracking-[0.14em] text-emerald-700">Be ready for this</p>
                  <ul className="mt-3 space-y-2">
                    {output.followUpPrep.slice(0, 4).map((item, i) => (
                      <li key={i} className="flex items-start gap-2 text-xs leading-5 text-slate-700"><Check className="mt-0.5 h-3.5 w-3.5 shrink-0 text-emerald-500" />{item}</li>
                    ))}
                  </ul>
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="workshop-footer">
          <button type="button" onClick={onComplete} className="btn-coach-primary flex w-full items-center justify-center gap-2 py-3 text-sm font-bold">
            Finish workshop
            <Check className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── Framework Card ────────────────────────────────────────────────────────

const CARD_COLORS: Record<string, { border: string; bg: string; label: string }> = {
  sky: { border: 'border-sky-300', bg: 'bg-sky-50', label: 'text-sky-700' },
  amber: { border: 'border-amber-300', bg: 'bg-amber-50', label: 'text-amber-700' },
  violet: { border: 'border-violet-300', bg: 'bg-violet-50', label: 'text-violet-700' },
}

function FrameworkCard({
  emoji,
  label,
  color,
  text,
}: {
  emoji: string
  label: string
  color: string
  text: string
}) {
  const c = CARD_COLORS[color] || CARD_COLORS.sky
  return (
    <div className={`rounded-xl border-2 ${c.border} ${c.bg} px-3 py-2.5`}>
      <div className="flex items-start gap-2">
        <span className="mt-0.5 text-base">{emoji}</span>
        <div className="min-w-0 flex-1">
          <p className={`text-[10px] font-black uppercase tracking-[0.14em] ${c.label}`}>
            {label}
          </p>
          <p className="mt-0.5 text-sm leading-6 text-slate-800">{text}</p>
        </div>
      </div>
    </div>
  )
}
