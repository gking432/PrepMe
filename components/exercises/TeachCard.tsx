'use client'

import { useMemo, useState } from 'react'
import { ArrowRight, ThumbsDown, ThumbsUp } from 'lucide-react'
import Preppi from '@/components/Preppi'

interface TeachCardProps {
  title: string
  explanation: string
  example: {
    question: string
    badAnswer: string
    goodAnswer: string
    breakdown: Record<string, string>
  }
  onContinue: () => void
}

// For STAR keys show S/T/A/R badge; for other keys show the number (1,2,3...) based on index
// Label is always the human-readable key (underscores → spaces, title case)
function formatBreakdownKey(key: string, index: number): string {
  const star: Record<string, string> = {
    situation: 'S', task: 'T', action: 'A', result: 'R',
  }
  return star[key.toLowerCase()] ?? String(index + 1)
}

function breakdownKeyLabel(key: string): string {
  // Convert snake_case / camelCase to readable label
  return key
    .replace(/_/g, ' ')
    .replace(/([A-Z])/g, ' $1')
    .replace(/^\w/, c => c.toUpperCase())
    .trim()
}

function splitExplanation(explanation: string) {
  const sentences = explanation
    .split(/(?<=[.!?])\s+/)
    .map((sentence) => sentence.trim())
    .filter(Boolean)

  if (sentences.length <= 1) {
    return {
      intro: explanation,
      outro: '',
    }
  }

  return {
    intro: sentences.slice(0, 2).join(' '),
    outro: sentences.slice(2).join(' '),
  }
}

function breakdownLead(key: string): string | null {
  const leads: Record<string, string> = {
    situation: 'Situation gives context.',
    task: 'Task states the goal.',
    action: 'Action shows what you did.',
    result: 'Result proves it worked.',
    nameit: 'Name it clearly.',
    quantifyit: 'Quantify the change.',
    showimpact: 'Show why it mattered.',
    nohedges: 'Cut the hedge words.',
    leadwithanswer: 'Lead with the answer.',
    activevoice: 'Use active voice.',
    theirpriority: 'Start with their priority.',
    yourevidence: 'Then show your evidence.',
    theconnection: 'Finish the connection.',
    surfacequestion: 'Answer the surface question.',
    hiddenquestion: 'Also answer the hidden question.',
    whybadfails: 'This is why the weak version misses.',
    whygoodworks: 'This is why the strong version lands.',
  }

  return leads[key.toLowerCase().replace(/[^a-z]/g, '')] || null
}

export default function TeachCard({
  title,
  explanation,
  example,
  onContinue,
}: TeachCardProps) {
  const [step, setStep] = useState(0)
  const { intro, outro } = useMemo(() => splitExplanation(explanation), [explanation])

  const cards = useMemo(() => ([
    {
      eyebrow: 'Technique',
      title,
      preppi: 'Start with the pattern. Then we will compare weak and strong answers.',
      content: (
        <div className="space-y-5">
          <p className="text-base leading-relaxed text-slate-700 md:text-lg">
            {intro}
          </p>

          <div className="space-y-3">
            {Object.entries(example.breakdown).map(([key, value], index) => (
              <div
                key={key}
                className="rounded-2xl border border-slate-200 bg-slate-50/80 px-4 py-4 shadow-sm"
              >
                <div className="flex items-start gap-3">
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-violet-100 text-sm font-extrabold text-violet-700">
                    {formatBreakdownKey(key, index)}
                  </span>
                  <div className="min-w-0">
                    <p className="text-xs font-bold uppercase tracking-wide text-violet-600">
                      {breakdownKeyLabel(key)}
                    </p>
                    {breakdownLead(key) && (
                      <p className="mt-1 text-sm font-semibold text-slate-900 md:text-base">
                        {breakdownLead(key)}
                      </p>
                    )}
                    <p className="mt-1 text-sm leading-relaxed text-slate-700 md:text-base">
                      {value}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {outro && (
            <p className="text-base leading-relaxed text-slate-700 md:text-lg">
              {outro}
            </p>
          )}

        </div>
      ),
    },
    {
      eyebrow: 'Interview Question',
      title: example.question,
      preppi: 'First, notice what a weak version sounds like.',
      content: (
        <div className="overflow-hidden rounded-2xl border-2 border-rose-200 bg-rose-50/70 shadow-sm">
          <div className="flex items-center gap-2 border-b border-rose-200 bg-rose-100/80 px-4 py-3">
            <ThumbsDown className="h-4 w-4 text-rose-500" />
            <span className="text-xs font-bold uppercase tracking-wide text-rose-600">
              Weak answer
            </span>
          </div>
          <div className="px-4 py-4">
            <p className="text-base italic leading-relaxed text-rose-900">
              &ldquo;{example.badAnswer}&rdquo;
            </p>
          </div>
        </div>
      ),
    },
    {
      eyebrow: 'Stronger Version',
      title: 'Here is the same idea answered well',
      preppi: 'Now compare it with a stronger version that actually proves what happened.',
      content: (
        <div className="overflow-hidden rounded-2xl border-2 border-emerald-200 bg-emerald-50/70 shadow-sm">
          <div className="flex items-center gap-2 border-b border-emerald-200 bg-emerald-100/80 px-4 py-3">
            <ThumbsUp className="h-4 w-4 text-emerald-500" />
            <span className="text-xs font-bold uppercase tracking-wide text-emerald-600">
              Strong answer
            </span>
          </div>
          <div className="px-4 py-4">
            <p className="text-base leading-relaxed text-emerald-900">
              &ldquo;{example.goodAnswer}&rdquo;
            </p>
          </div>
        </div>
      ),
    },
    {
      eyebrow: 'Breakdown',
      title: 'Why the stronger answer works',
      preppi: 'Last step. See how each part earns its place before you try it yourself.',
      content: (
        <div className="space-y-3">
          {Object.entries(example.breakdown).map(([key, value], index) => (
            <div
              key={key}
              className="flex items-start gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-4 shadow-sm"
            >
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-violet-100 text-sm font-extrabold text-violet-700">
                {formatBreakdownKey(key, index)}
              </span>
              <div className="min-w-0">
                <p className="text-xs font-bold uppercase tracking-wide text-violet-600">
                  {breakdownKeyLabel(key)}
                </p>
                <p className="mt-1 text-sm leading-relaxed text-slate-700 md:text-base">
                  {value}
                </p>
              </div>
            </div>
          ))}
        </div>
      ),
    },
  ]), [example, intro, outro, title])

  const currentCard = cards[step]
  const isLastStep = step === cards.length - 1

  return (
    <div className="flex h-full w-full flex-col gap-5">
      <div className="shrink-0 space-y-4">
        <Preppi message={currentCard.preppi} size="sm" />

        <div className="flex items-center justify-between text-xs font-bold uppercase tracking-[0.2em] text-slate-400">
          <span>{currentCard.eyebrow}</span>
          <span>{step + 1} / {cards.length}</span>
        </div>
      </div>

      <div className="min-h-0 flex-1 rounded-[2rem] border border-violet-100 bg-white/95 p-6 shadow-[0_20px_40px_rgba(15,23,42,0.08)] md:p-7">
        <h2 className="text-xl font-extrabold text-slate-900 md:text-2xl">
          {currentCard.title}
        </h2>
        {(step === 1 || step === 2) && (
          <div className="mt-4 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
            <p className="text-xs font-bold uppercase tracking-wide text-slate-400">
              Interview question
            </p>
            <p className="mt-1 text-sm font-semibold leading-snug text-slate-900 md:text-base">
              {example.question}
            </p>
          </div>
        )}
        <div className="mt-5">{currentCard.content}</div>
      </div>

      <div className="mt-auto shrink-0 flex items-end justify-between gap-3 border-t border-slate-200/80 pt-5">
        <button
          onClick={() => setStep(prev => Math.max(0, prev - 1))}
          disabled={step === 0}
          className="rounded-2xl border border-slate-200 px-5 py-3 text-sm font-extrabold text-slate-500 transition hover:border-slate-300 hover:text-slate-700 disabled:cursor-default disabled:opacity-40"
        >
          Back
        </button>
        <button
          onClick={() => {
            if (isLastStep) {
              onContinue()
              return
            }
            setStep(prev => prev + 1)
          }}
          className="btn-coach-primary flex items-center justify-center gap-2 px-6 py-3.5"
        >
          {isLastStep ? 'Start practice' : 'Next'}
          <ArrowRight className="h-4 w-4" />
        </button>
      </div>
    </div>
  )
}
