'use client'

import { useMemo, useState } from 'react'
import { ArrowRight, CheckCircle2, Scissors, Volume2 } from 'lucide-react'

interface PaceDeliveryWorkshopProps {
  originalQuestion?: string
  originalAnswer?: string
  onComplete: () => void
}

type WorkshopStep = 'trim_intro' | 'trim' | 'reorder' | 'preview' | 'done'

const FILLER_PATTERNS = [
  { pattern: /\b(I think|I guess|I mean|you know|kind of|sort of|basically|actually|honestly|literally|like,)\b/gi, label: 'filler / hedge' },
  { pattern: /\b(very|really|just|so|quite|pretty much)\b/gi, label: 'softener' },
]

const OPENING_PHRASES = [
  { id: 'direct', label: 'Lead with the core point', template: 'The key thing here is' },
  { id: 'context', label: 'Set context first, then answer', template: 'In my last role,' },
  { id: 'reframe', label: 'Reframe the question briefly', template: "That's something I've dealt with directly —" },
]

const CLOSING_PHRASES = [
  { id: 'result', label: 'End with the result', template: 'The result was' },
  { id: 'lesson', label: 'End with the lesson', template: 'What I learned from that was' },
  { id: 'connect', label: 'Connect back to the role', template: "That's why I'm drawn to this kind of work —" },
]

function countWords(text: string) {
  return text.trim().split(/\s+/).filter(Boolean).length
}

function findFillers(text: string) {
  const matches: Array<{ word: string; label: string }> = []
  for (const { pattern, label } of FILLER_PATTERNS) {
    const copy = new RegExp(pattern.source, pattern.flags)
    let match: RegExpExecArray | null
    while ((match = copy.exec(text)) !== null) {
      matches.push({ word: match[0], label })
    }
  }
  return matches
}

function highlightFillers(text: string): Array<{ text: string; isFiller: boolean }> {
  const allPatterns = FILLER_PATTERNS.map(p => new RegExp(p.pattern.source, p.pattern.flags))
  const combined = new RegExp(`(${allPatterns.map(p => p.source).join('|')})`, 'gi')
  const parts: Array<{ text: string; isFiller: boolean }> = []
  let lastIndex = 0
  let match: RegExpExecArray | null
  while ((match = combined.exec(text)) !== null) {
    if (match.index > lastIndex) {
      parts.push({ text: text.slice(lastIndex, match.index), isFiller: false })
    }
    parts.push({ text: match[0], isFiller: true })
    lastIndex = match.index + match[0].length
  }
  if (lastIndex < text.length) {
    parts.push({ text: text.slice(lastIndex), isFiller: false })
  }
  return parts
}

export default function PaceDeliveryWorkshop({
  originalQuestion,
  originalAnswer,
  onComplete,
}: PaceDeliveryWorkshopProps) {
  const [step, setStep] = useState<WorkshopStep>('trim_intro')
  const [trimmedAnswer, setTrimmedAnswer] = useState(originalAnswer || '')
  const [selectedOpening, setSelectedOpening] = useState<string | null>(null)
  const [selectedClosing, setSelectedClosing] = useState<string | null>(null)

  const originalWords = countWords(originalAnswer || '')
  const trimmedWords = countWords(trimmedAnswer)
  const fillers = useMemo(() => findFillers(originalAnswer || ''), [originalAnswer])
  const highlightedOriginal = useMemo(() => highlightFillers(originalAnswer || ''), [originalAnswer])

  const openingText = OPENING_PHRASES.find(p => p.id === selectedOpening)?.template || ''
  const closingText = CLOSING_PHRASES.find(p => p.id === selectedClosing)?.template || ''
  const assembledAnswer = [openingText, trimmedAnswer.trim(), closingText].filter(Boolean).join(' ')

  const questionLabel = originalQuestion || 'Your flagged interview question'

  function handleNext() {
    if (step === 'trim_intro') { setStep('trim'); return }
    if (step === 'trim') { setStep('reorder'); return }
    if (step === 'reorder') { setStep('preview'); return }
    if (step === 'preview') { setStep('done'); return }
    onComplete()
  }

  function handleBack() {
    if (step === 'trim') setStep('trim_intro')
    else if (step === 'reorder') setStep('trim')
    else if (step === 'preview') setStep('reorder')
    else if (step === 'done') setStep('preview')
  }

  return (
    <div className="relative flex h-full flex-col overflow-hidden rounded-[2rem] border border-slate-200 bg-[linear-gradient(180deg,#ffffff_0%,#f8fbff_100%)] shadow-[0_16px_30px_rgba(15,23,42,0.06)]">
      <div className="shrink-0 border-b border-slate-200 px-5 py-5">
        <div className="max-w-2xl">
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">
            Pace &amp; Delivery Workshop
          </p>
          <h3 className="mt-2 text-xl font-extrabold text-slate-900 md:text-2xl">
            Make your answer shorter, cleaner, and easier to follow
          </h3>
          <p className="mt-3 rounded-2xl bg-slate-50 px-4 py-3 text-sm leading-6 text-slate-700">
            {questionLabel}
          </p>
          <p className="mt-3 text-sm leading-6 text-slate-600">
            Interviewers lose focus when answers run long or drift. We will cut the filler, tighten the structure, and give the answer a clear start and finish.
          </p>
        </div>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto px-5 py-5">
        {step === 'trim_intro' && (
          <div className="space-y-5 animate-slide-up">
            <div>
              <p className="text-xs font-bold uppercase tracking-widest text-slate-400 mb-2">Your original answer</p>
              <div className="rounded-2xl border border-slate-200 bg-white px-4 py-4">
                <p className="text-sm leading-7 text-slate-800">
                  {highlightedOriginal.map((part, i) =>
                    part.isFiller ? (
                      <span key={i} className="rounded bg-amber-100 px-0.5 text-amber-800 font-bold">{part.text}</span>
                    ) : (
                      <span key={i}>{part.text}</span>
                    )
                  )}
                </p>
              </div>
              <div className="mt-3 flex items-center gap-4">
                <span className="rounded-lg bg-slate-100 px-3 py-1 text-xs font-bold text-slate-600">{originalWords} words</span>
                {fillers.length > 0 && (
                  <span className="rounded-lg bg-amber-50 px-3 py-1 text-xs font-bold text-amber-700">{fillers.length} filler{fillers.length !== 1 ? 's' : ''} detected</span>
                )}
              </div>
            </div>
            <div className="rounded-2xl border border-accent-200 bg-accent-50/60 px-4 py-3">
              <p className="text-sm font-bold text-slate-900">Why this matters</p>
              <p className="mt-1 text-sm leading-6 text-slate-600">
                Long answers signal uncertainty. Filler words undermine credibility. The goal is to say the same thing in fewer, stronger words.
              </p>
            </div>
          </div>
        )}

        {step === 'trim' && (
          <div className="space-y-4 animate-slide-up">
            <div>
              <p className="text-xs font-bold uppercase tracking-widest text-slate-400 mb-1">Edit your answer</p>
              <p className="text-sm text-slate-600 mb-3">Cut filler words and unnecessary sentences. Try to get under {Math.max(Math.round(originalWords * 0.7), 30)} words.</p>
            </div>
            <textarea
              value={trimmedAnswer}
              onChange={(e) => setTrimmedAnswer(e.target.value)}
              className="min-h-[160px] w-full resize-none rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-medium leading-7 text-slate-800 outline-none transition focus:border-accent-300 focus:ring-4 focus:ring-accent-100"
            />
            <div className="flex items-center gap-4">
              <span className={`rounded-lg px-3 py-1 text-xs font-bold ${trimmedWords < originalWords ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-600'}`}>
                {trimmedWords} words {trimmedWords < originalWords ? `(−${originalWords - trimmedWords})` : ''}
              </span>
              {trimmedWords <= Math.round(originalWords * 0.7) && (
                <span className="flex items-center gap-1 text-xs font-bold text-emerald-600">
                  <CheckCircle2 className="w-3.5 h-3.5" /> Target reached
                </span>
              )}
            </div>
          </div>
        )}

        {step === 'reorder' && (
          <div className="space-y-5 animate-slide-up">
            <div>
              <p className="text-xs font-bold uppercase tracking-widest text-slate-400 mb-1">Pick a strong opening</p>
              <p className="text-sm text-slate-600 mb-3">How you start sets the interviewer&apos;s expectations for the whole answer.</p>
              <div className="grid gap-2">
                {OPENING_PHRASES.map((phrase) => (
                  <button
                    key={phrase.id}
                    type="button"
                    onClick={() => setSelectedOpening(phrase.id)}
                    className={`rounded-xl border px-4 py-3 text-left text-sm transition ${
                      selectedOpening === phrase.id
                        ? 'border-accent-300 bg-accent-50 text-accent-800 font-bold'
                        : 'border-slate-200 bg-white text-slate-700 hover:border-slate-300'
                    }`}
                  >
                    <span className="font-bold">{phrase.label}</span>
                    <span className="mt-1 block text-xs text-slate-500 italic">&ldquo;{phrase.template}...&rdquo;</span>
                  </button>
                ))}
              </div>
            </div>
            <div>
              <p className="text-xs font-bold uppercase tracking-widest text-slate-400 mb-1">Pick a strong close</p>
              <p className="text-sm text-slate-600 mb-3">A clean ending tells the interviewer the answer is complete.</p>
              <div className="grid gap-2">
                {CLOSING_PHRASES.map((phrase) => (
                  <button
                    key={phrase.id}
                    type="button"
                    onClick={() => setSelectedClosing(phrase.id)}
                    className={`rounded-xl border px-4 py-3 text-left text-sm transition ${
                      selectedClosing === phrase.id
                        ? 'border-accent-300 bg-accent-50 text-accent-800 font-bold'
                        : 'border-slate-200 bg-white text-slate-700 hover:border-slate-300'
                    }`}
                  >
                    <span className="font-bold">{phrase.label}</span>
                    <span className="mt-1 block text-xs text-slate-500 italic">&ldquo;{phrase.template}...&rdquo;</span>
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {step === 'preview' && (
          <div className="space-y-4 animate-slide-up">
            <div>
              <p className="text-xs font-bold uppercase tracking-widest text-slate-400 mb-1">Your rebuilt answer</p>
              <p className="text-sm text-slate-600 mb-3">Read it out loud once. Does it flow naturally?</p>
            </div>
            <div className="rounded-2xl border border-emerald-200 bg-emerald-50/60 px-5 py-4">
              <p className="text-sm font-bold leading-7 text-slate-900">{assembledAnswer}</p>
            </div>
            <div className="flex items-center gap-4">
              <span className="rounded-lg bg-emerald-50 px-3 py-1 text-xs font-bold text-emerald-700">
                {countWords(assembledAnswer)} words (was {originalWords})
              </span>
              <div className="flex items-center gap-1.5 text-xs font-bold text-accent-600">
                <Volume2 className="w-3.5 h-3.5" />
                Read this aloud before continuing
              </div>
            </div>
          </div>
        )}

        {step === 'done' && (
          <div className="flex flex-col items-center justify-center text-center py-8 animate-slide-up">
            <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-emerald-100">
              <Scissors className="h-8 w-8 text-emerald-600" />
            </div>
            <h3 className="text-xl font-extrabold text-slate-900">Answer tightened</h3>
            <p className="mt-2 max-w-sm text-sm leading-6 text-slate-600">
              You cut {Math.max(originalWords - countWords(assembledAnswer), 0)} words, added structure, and gave the answer a clear start and finish. The next step is to say it out loud.
            </p>
          </div>
        )}
      </div>

      <div className="shrink-0 border-t border-slate-200 px-5 py-4 flex items-center justify-between gap-3">
        {step !== 'trim_intro' ? (
          <button
            type="button"
            onClick={handleBack}
            className="rounded-full border border-slate-200 bg-white px-5 py-3 text-sm font-semibold text-slate-600 transition hover:border-slate-300"
          >
            Back
          </button>
        ) : <div />}
        <button
          type="button"
          onClick={handleNext}
          className="btn-coach-primary flex items-center gap-2 px-6 py-3"
        >
          {step === 'done' ? 'Continue' : 'Next'}
          <ArrowRight className="h-4 w-4" />
        </button>
      </div>
    </div>
  )
}
