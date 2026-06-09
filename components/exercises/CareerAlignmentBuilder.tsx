'use client'

import { useState } from 'react'
import { ArrowRight, Check, ChevronDown, ChevronUp, Copy, RefreshCw, Sparkles } from 'lucide-react'
import {
  type CareerAlignmentOutput,
  type CareerAlignmentRewriteInstruction,
  FRAMEWORK_STEPS,
  REWRITE_OPTIONS,
} from '@/lib/career-alignment-config'

interface CareerAlignmentBuilderProps {
  sessionId?: string
  originalQuestion?: string
  originalAnswer?: string
  onComplete: () => void
}

type Screen = 'review' | 'generating' | 'output'
type AnswerTab = 'primary' | 'shorter' | 'conversational'

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
  const [copied, setCopied] = useState(false)
  const [rewriting, setRewriting] = useState(false)
  const [confirmRewrite, setConfirmRewrite] = useState<CareerAlignmentRewriteInstruction | null>(null)
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({
    breakdown: true,
    shorter: false,
    conversational: false,
    whyWorks: false,
    followUp: false,
  })

  const toggleSection = (key: string) =>
    setExpandedSections((prev) => ({ ...prev, [key]: !prev[key] }))

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
      <div className="flex h-full flex-col overflow-y-auto">
        <div className="mx-auto w-full max-w-2xl space-y-5 px-4 py-6">
          {/* Header */}
          <div>
            <h2 className="text-lg font-black text-slate-900">
              Let&apos;s strengthen your alignment answer
            </h2>
            <p className="mt-1 text-sm leading-6 text-slate-500">
              This type of question is asking whether you understand the opportunity,
              whether your background connects to it, and why it makes sense now.
            </p>
          </div>

          {/* Flagged question + original answer */}
          {(originalQuestion || originalAnswer) && (
            <div className="space-y-3 rounded-2xl border-2 border-slate-200 bg-slate-50 p-4">
              {originalQuestion && (
                <div>
                  <p className="text-[10px] font-black uppercase tracking-[0.14em] text-slate-400">
                    Question
                  </p>
                  <p className="mt-1 text-sm font-semibold leading-6 text-slate-800">
                    {originalQuestion}
                  </p>
                </div>
              )}
              {originalAnswer && (
                <div>
                  <p className="text-[10px] font-black uppercase tracking-[0.14em] text-slate-400">
                    Your answer
                  </p>
                  <p className="mt-1 text-sm leading-6 text-slate-600">{originalAnswer}</p>
                </div>
              )}
            </div>
          )}

          {/* Framework preview */}
          <div className="rounded-2xl border-2 border-violet-200 bg-violet-50/50 p-4">
            <p className="text-[10px] font-black uppercase tracking-[0.14em] text-violet-600">
              We&apos;ll rebuild it using
            </p>
            <div className="mt-3 space-y-2.5">
              {FRAMEWORK_STEPS.map((step) => (
                <div key={step.key} className="flex items-start gap-2.5">
                  <span className="mt-0.5 text-base">{step.emoji}</span>
                  <div>
                    <p className="text-xs font-extrabold text-slate-800">{step.label}</p>
                    <p className="text-xs leading-5 text-slate-500">{step.description}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {error && (
            <p className="rounded-xl bg-red-50 px-3 py-2 text-sm font-bold text-red-600">
              {error}
            </p>
          )}

          {/* Generate button */}
          <button
            type="button"
            onClick={handleGenerate}
            className="flex w-full items-center justify-center gap-2 rounded-2xl bg-violet-600 px-5 py-3.5 text-sm font-extrabold text-white shadow-md transition hover:bg-violet-700 active:scale-[0.98]"
          >
            <Sparkles className="h-4 w-4" />
            Generate stronger answer
          </button>
        </div>
      </div>
    )
  }

  // ─── Generating spinner ────────────────────────────────────────────────────

  if (screen === 'generating') {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="text-center">
          <div className="mx-auto mb-4 h-10 w-10 animate-spin rounded-full border-4 border-violet-200 border-t-violet-600" />
          <p className="text-sm font-bold text-slate-600">
            Building a stronger answer&hellip;
          </p>
          <p className="mt-1 text-xs text-slate-400">
            Using your resume, the job description, and the Observation → Evidence of Fit → Timing framework
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
    <div className="flex h-full flex-col overflow-y-auto">
      <div className="mx-auto w-full max-w-2xl space-y-5 px-4 py-6">
        {/* Section 1: Stronger answer */}
        <div>
          <h2 className="text-lg font-black text-slate-900">Stronger answer</h2>

          {/* Tab row */}
          <div className="mt-3 flex gap-1.5">
            {([
              { id: 'primary' as const, label: 'Full' },
              { id: 'shorter' as const, label: 'Shorter' },
              { id: 'conversational' as const, label: 'Casual' },
            ]).map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id)}
                className={`rounded-full px-3 py-1 text-xs font-bold transition ${
                  activeTab === tab.id
                    ? 'bg-violet-600 text-white'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Answer text */}
          <div className="mt-3 rounded-2xl border-2 border-slate-200 bg-white p-4">
            <p className="text-sm leading-7 text-slate-800">{activeText}</p>
          </div>

          {/* Action buttons */}
          <div className="mt-3 flex flex-wrap gap-2">
            <button
              type="button"
              onClick={handleCopy}
              className="flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-bold text-slate-600 transition hover:bg-slate-50"
            >
              {copied ? <Check className="h-3.5 w-3.5 text-emerald-500" /> : <Copy className="h-3.5 w-3.5" />}
              {copied ? 'Copied' : 'Copy'}
            </button>
            <button
              type="button"
              onClick={onComplete}
              className="flex items-center gap-1.5 rounded-xl bg-violet-600 px-3 py-2 text-xs font-bold text-white transition hover:bg-violet-700"
            >
              <ArrowRight className="h-3.5 w-3.5" />
              Practice this answer
            </button>
          </div>
        </div>

        {/* Section 2: OFT Breakdown */}
        <CollapsibleSection
          title="Observation → Evidence of Fit → Timing"
          expanded={expandedSections.breakdown}
          onToggle={() => toggleSection('breakdown')}
        >
          <div className="space-y-2.5">
            {/* Observation */}
            <FrameworkCard
              emoji="👁️"
              label="Observation"
              color="sky"
              text={output.structureUsed.observation}
            />
            {/* Evidence of Fit */}
            <FrameworkCard
              emoji="🔗"
              label="Evidence of Fit"
              color="amber"
              text={output.structureUsed.evidenceOfFit}
            />
            {/* Timing */}
            <FrameworkCard
              emoji="⏱️"
              label="Timing"
              color="violet"
              text={output.structureUsed.timing}
            />
          </div>
        </CollapsibleSection>

        {/* Section 3: Shorter version */}
        <CollapsibleSection
          title="Shorter version"
          expanded={expandedSections.shorter}
          onToggle={() => toggleSection('shorter')}
        >
          <p className="text-sm leading-7 text-slate-700">{output.shorterAnswer}</p>
        </CollapsibleSection>

        {/* Section 4: More conversational version */}
        <CollapsibleSection
          title="More conversational version"
          expanded={expandedSections.conversational}
          onToggle={() => toggleSection('conversational')}
        >
          <p className="text-sm leading-7 text-slate-700">{output.conversationalAnswer}</p>
        </CollapsibleSection>

        {/* Section 5: Why this works */}
        <CollapsibleSection
          title="Why this works"
          expanded={expandedSections.whyWorks}
          onToggle={() => toggleSection('whyWorks')}
        >
          <ul className="space-y-1.5">
            {output.whyThisWorks.map((item, i) => (
              <li key={i} className="flex items-start gap-2 text-sm leading-6 text-slate-700">
                <Check className="mt-0.5 h-4 w-4 shrink-0 text-emerald-500" />
                {item}
              </li>
            ))}
          </ul>
        </CollapsibleSection>

        {/* Section 6: Be ready for this */}
        <CollapsibleSection
          title="Be ready for this"
          expanded={expandedSections.followUp}
          onToggle={() => toggleSection('followUp')}
        >
          <ul className="space-y-1.5">
            {output.followUpPrep.map((item, i) => (
              <li key={i} className="flex items-start gap-2 text-sm leading-6 text-slate-700">
                <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-slate-400" />
                {item}
              </li>
            ))}
          </ul>
        </CollapsibleSection>

        {/* Rewrite options */}
        <div className="rounded-2xl border-2 border-slate-200 bg-white p-4">
          <p className="text-[10px] font-black uppercase tracking-[0.14em] text-slate-400">
            Adjust this answer
          </p>
          <div className="mt-2.5 flex flex-wrap gap-1.5">
            {REWRITE_OPTIONS.map((opt) => (
              <button
                key={opt.id}
                type="button"
                disabled={rewriting}
                onClick={() => setConfirmRewrite(opt.id)}
                className="flex items-center gap-1 rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-[11px] font-bold text-slate-600 transition hover:border-violet-300 hover:bg-violet-50 hover:text-violet-700 disabled:opacity-40"
              >
                {opt.id === 'regenerate' && <RefreshCw className="h-3 w-3" />}
                {opt.label}
              </button>
            ))}
          </div>

          {/* Confirmation gate */}
          {confirmRewrite && (
            <div className="mt-3 flex items-center gap-2 rounded-xl bg-amber-50 px-3 py-2.5 border border-amber-200">
              <p className="flex-1 text-xs font-bold text-amber-800">Generate a new version?</p>
              <button
                type="button"
                onClick={() => setConfirmRewrite(null)}
                className="rounded-lg px-2.5 py-1 text-xs font-bold text-slate-500 hover:bg-slate-100"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => handleRewrite(confirmRewrite)}
                disabled={rewriting}
                className="flex items-center gap-1 rounded-lg bg-violet-600 px-3 py-1 text-xs font-bold text-white hover:bg-violet-700 disabled:opacity-50"
              >
                {rewriting && (
                  <div className="h-3 w-3 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                )}
                Generate new answer
              </button>
            </div>
          )}
        </div>

        {/* Done */}
        <button
          type="button"
          onClick={onComplete}
          className="flex w-full items-center justify-center gap-2 rounded-2xl bg-emerald-500 px-5 py-3.5 text-sm font-extrabold text-white shadow-md transition hover:bg-emerald-600 active:scale-[0.98]"
        >
          <Check className="h-4 w-4" />
          Done
        </button>
      </div>
    </div>
  )
}

// ─── Collapsible Section ───────────────────────────────────────────────────

function CollapsibleSection({
  title,
  expanded,
  onToggle,
  children,
}: {
  title: string
  expanded: boolean
  onToggle: () => void
  children: React.ReactNode
}) {
  return (
    <div className="rounded-2xl border-2 border-slate-200 bg-white">
      <button
        type="button"
        onClick={onToggle}
        className="flex w-full items-center justify-between px-4 py-3 text-left"
      >
        <p className="text-sm font-extrabold text-slate-800">{title}</p>
        {expanded ? (
          <ChevronUp className="h-4 w-4 text-slate-400" />
        ) : (
          <ChevronDown className="h-4 w-4 text-slate-400" />
        )}
      </button>
      {expanded && <div className="border-t border-slate-100 px-4 pb-4 pt-3">{children}</div>}
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
