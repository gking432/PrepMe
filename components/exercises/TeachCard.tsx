'use client'

import { useMemo, useState } from 'react'
import { ArrowRight, ThumbsDown, ThumbsUp } from 'lucide-react'
import Preppi from '@/components/Preppi'

interface TeachCardProps {
  criterion: string
  title: string
  explanation: string
  example: {
    question: string
    badAnswer: string
    goodAnswer: string
    breakdown: Record<string, string>
    annotatedStrongAnswer?: Array<{
      label: string
      text: string
      detail?: string
    }>
  }
  originalQuestion?: string
  originalAnswer?: string
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

function summarizeExplanation(explanation: string) {
  const [firstSentence] = explanation
    .split(/(?<=[.!?])\s+/)
    .map((sentence) => sentence.trim())
    .filter(Boolean)

  return firstSentence || explanation
}

function annotationColors(label: string) {
  const key = label.toLowerCase()
  if (key === 'lead') return {
    text: 'text-sky-900',
    bg: 'bg-sky-100',
    border: 'border-sky-200',
    chip: 'bg-sky-100 text-sky-700',
    highlight: 'bg-sky-100/80',
  }
  if (key === 'situation') return {
    text: 'text-emerald-900',
    bg: 'bg-emerald-100',
    border: 'border-emerald-200',
    chip: 'bg-emerald-100 text-emerald-700',
    highlight: 'bg-emerald-100/80',
  }
  if (key === 'task') return {
    text: 'text-amber-900',
    bg: 'bg-amber-100',
    border: 'border-amber-200',
    chip: 'bg-amber-100 text-amber-700',
    highlight: 'bg-amber-100/80',
  }
  if (key === 'action') return {
    text: 'text-violet-900',
    bg: 'bg-violet-100',
    border: 'border-violet-200',
    chip: 'bg-violet-100 text-violet-700',
    highlight: 'bg-violet-100/80',
  }
  if (key === 'result') return {
    text: 'text-rose-900',
    bg: 'bg-rose-100',
    border: 'border-rose-200',
    chip: 'bg-rose-100 text-rose-700',
    highlight: 'bg-rose-100/80',
  }
  return {
    text: 'text-slate-900',
    bg: 'bg-slate-100',
    border: 'border-slate-200',
    chip: 'bg-slate-100 text-slate-700',
    highlight: 'bg-slate-100',
  }
}

function normalizeQuestion(text?: string) {
  return (text || '')
    .trim()
    .replace(/[^\w\s]/g, '')
    .replace(/\s+/g, ' ')
    .toLowerCase()
}

function extractPlaceholderQuestion(answer?: string) {
  if (!answer) return null
  const match = answer.match(/No response provided to:\s*['"](.+?)['"]/i)
  return match?.[1] || null
}

export default function TeachCard({
  criterion,
  title,
  explanation,
  example,
  originalQuestion,
  originalAnswer,
  onContinue,
}: TeachCardProps) {
  const [step, setStep] = useState(0)
  const summary = useMemo(() => summarizeExplanation(explanation), [explanation])
  const frameworkRows = useMemo(() => Object.entries(example.breakdown), [example.breakdown])
  const placeholderQuestion = useMemo(() => extractPlaceholderQuestion(originalAnswer), [originalAnswer])
  const originalAnswerMissing = useMemo(() => /^No response provided to:/i.test((originalAnswer || '').trim()), [originalAnswer])
  const placeholderMatchesQuestion = useMemo(() => {
    if (!placeholderQuestion) return false
    return normalizeQuestion(placeholderQuestion) === normalizeQuestion(originalQuestion || example.question)
  }, [example.question, originalQuestion, placeholderQuestion])
  const hasMatchingOriginalAnswer = useMemo(() => {
    if (!originalAnswer) return false
    if (placeholderQuestion) {
      return placeholderMatchesQuestion
    }
    return true
  }, [originalAnswer, placeholderQuestion, placeholderMatchesQuestion])
  const safeOriginalAnswer = hasMatchingOriginalAnswer ? originalAnswer : undefined

  const whyMissed = useMemo(() => {
    if (originalAnswerMissing && placeholderMatchesQuestion) {
      return 'This was flagged because you did not give a usable answer to this question. The first fix is to answer the exact question directly instead of pausing, restarting, or leaving it blank.'
    }
    if (originalAnswerMissing && placeholderQuestion && !placeholderMatchesQuestion) {
      return 'This was flagged because the interview transcript does not contain a usable answer for this exact question. That usually means you answered a different question, got interrupted, or never got a clean response out.'
    }
    if (!safeOriginalAnswer) {
      return 'This was flagged because we do not have a clean matching answer excerpt for this question. We should still practice the right move, but we should not pretend we have a real answer to critique.'
    }

    const key = criterion.toLowerCase()
    if (key.includes('answer structure')) {
      return 'This answer likely got flagged because it takes too long to get to the point, packs in too many side details, and does not land cleanly at the end.'
    }
    if (key.includes('specific examples')) {
      return 'This answer likely got flagged because it stays general. The interviewer hears claims, but not enough proof.'
    }
    if (key.includes('company')) {
      return 'This answer likely got flagged because it does not show real preparation or good judgment about the company and role.'
    }
    if (key.includes('uncertain')) {
      return 'This answer likely got flagged because it does not show a calm first step, a decision process, or what happened next.'
    }
    if (key.includes('career goals') || key.includes('alignment')) {
      return 'This answer likely got flagged because it does not clearly explain why this role makes sense for you now.'
    }
    if (key.includes('pace') || key.includes('conversation')) {
      return 'This answer likely got flagged because the delivery does not feel clean and controlled yet.'
    }
    return 'This answer likely got flagged because the interviewer could not clearly hear the move you wanted them to hear.'
  }, [criterion, originalAnswerMissing, placeholderMatchesQuestion, placeholderQuestion, safeOriginalAnswer])

  const cards = useMemo(() => ([
    {
      eyebrow: 'Your Flagged Answer',
      title: originalQuestion || example.question,
      preppi: 'We should start with the exact miss first, not generic advice.',
      content: (
        <div className="space-y-4">
          {safeOriginalAnswer ? (
            <div className="overflow-hidden rounded-2xl border border-rose-200 bg-rose-50/80 shadow-sm">
              <div className="border-b border-rose-200 bg-rose-100/80 px-4 py-3">
                <p className="text-xs font-bold uppercase tracking-wide text-rose-600">
                  Your original answer
                </p>
              </div>
              <div className="px-4 py-4">
                <p className="text-sm leading-relaxed text-rose-900 md:text-[15px]">
                  &ldquo;{safeOriginalAnswer}&rdquo;
                </p>
              </div>
            </div>
          ) : (
            <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4">
              <p className="text-sm leading-relaxed text-slate-600 md:text-base">
                We do not have a clean matching transcript excerpt for this flagged answer, so we will use the flagged question and rebuild the move from there.
              </p>
            </div>
          )}

          <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-4">
            <p className="text-xs font-bold uppercase tracking-wide text-amber-700">
              Why it got flagged
            </p>
            <p className="mt-2 text-sm leading-relaxed text-amber-900 md:text-[15px]">
              {whyMissed}
            </p>
          </div>
        </div>
      ),
    },
    {
      eyebrow: 'The Fix',
      title,
      preppi: 'Here is the repeatable move to use the next time this kind of question comes up.',
      content: (
        <div className="space-y-4">
          <p className="text-sm leading-relaxed text-slate-600 md:text-base">
            {summary}
          </p>

          <div className="space-y-3">
            {frameworkRows.map(([key, value], index) => (
              <div
                key={key}
                className="flex items-start gap-3 rounded-2xl border border-slate-200 bg-slate-50/80 px-4 py-4"
              >
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-violet-100 text-sm font-extrabold text-violet-700">
                  {formatBreakdownKey(key, index)}
                </span>
                <div className="min-w-0">
                  <p className="text-xs font-bold uppercase tracking-wide text-violet-600">
                    {breakdownKeyLabel(key)}
                  </p>
                  <p className="mt-1 text-sm leading-relaxed text-slate-700 md:text-[15px]">
                    {value}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      ),
    },
    {
      eyebrow: 'Compare',
      title: 'See the difference',
      preppi: 'This is where the fix becomes obvious. First the weak version, then the stronger one.',
      content: (
        <div className="space-y-4">
          <div className="overflow-hidden rounded-2xl border-2 border-rose-200 bg-rose-50/70 shadow-sm">
            <div className="flex items-center gap-2 border-b border-rose-200 bg-rose-100/80 px-4 py-3">
              <ThumbsDown className="h-4 w-4 text-rose-500" />
              <span className="text-xs font-bold uppercase tracking-wide text-rose-600">
                Weak version
              </span>
            </div>
            <div className="px-4 py-4">
              <p className="text-base italic leading-relaxed text-rose-900">
                &ldquo;{example.badAnswer}&rdquo;
              </p>
            </div>
          </div>
          <div className="overflow-hidden rounded-2xl border-2 border-emerald-200 bg-emerald-50/70 shadow-sm">
            <div className="flex items-center gap-2 border-b border-emerald-200 bg-emerald-100/80 px-4 py-3">
              <ThumbsUp className="h-4 w-4 text-emerald-500" />
              <span className="text-xs font-bold uppercase tracking-wide text-emerald-600">
                Stronger version
              </span>
            </div>
            <div className="px-4 py-4">
              <p className="text-base leading-relaxed text-emerald-900">
                &ldquo;{example.goodAnswer}&rdquo;
              </p>
            </div>
          </div>
        </div>
      ),
    },
    ...(example.annotatedStrongAnswer ? [{
      eyebrow: 'Label The Strong Answer',
      title: 'See exactly where each part lives',
      preppi: 'If we teach a structure, we should be able to point to each piece inside the stronger answer.',
      content: (
        <div className="space-y-4">
          <div className="overflow-hidden rounded-2xl border-2 border-emerald-200 bg-emerald-50/70 shadow-sm">
            <div className="flex items-center gap-2 border-b border-emerald-200 bg-emerald-100/80 px-4 py-3">
              <ThumbsUp className="h-4 w-4 text-emerald-500" />
              <span className="text-xs font-bold uppercase tracking-wide text-emerald-600">
                Stronger version
              </span>
            </div>
            <div className="px-4 py-4">
              <p className="text-base leading-relaxed text-slate-900">
                &ldquo;
                {example.annotatedStrongAnswer.map((part, index) => {
                  const colors = annotationColors(part.label)
                  return (
                    <span
                      key={`${part.label}-${index}`}
                      className={`rounded px-1.5 py-0.5 ${colors.highlight}`}
                    >
                      {part.text}
                      {index < example.annotatedStrongAnswer!.length - 1 ? ' ' : ''}
                    </span>
                  )
                })}
                &rdquo;
              </p>
            </div>
          </div>

          <div className="grid gap-3 md:grid-cols-2">
            {example.annotatedStrongAnswer.map((part) => {
              const colors = annotationColors(part.label)
              return (
                <div
                  key={`${part.label}-legend`}
                  className={`rounded-2xl border ${colors.border} bg-white px-4 py-4 shadow-sm`}
                >
                  <span className={`inline-flex rounded-full px-2.5 py-1 text-[11px] font-black uppercase tracking-[0.14em] ${colors.chip}`}>
                    {part.label}
                  </span>
                  {part.detail && (
                    <p className="mt-3 text-sm leading-relaxed text-slate-700">
                      {part.detail}
                    </p>
                  )}
                </div>
              )
            })}
          </div>
        </div>
      ),
    }] : []),
  ]), [example, frameworkRows, originalQuestion, safeOriginalAnswer, summary, title, whyMissed])

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
        {(step === 0 || step === 2) && (
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
