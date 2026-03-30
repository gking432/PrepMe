'use client'

import { useMemo, useState } from 'react'
import { ArrowRight, CheckCircle, Sparkles } from 'lucide-react'

interface ApplyField {
  label: string
  placeholder: string
  helper?: string
  minWords?: number
  shouldIncludeNumber?: boolean
  avoidWords?: string[]
}

interface ApplyToYourselfExerciseProps {
  instruction: string
  coachingTip: string
  fields: ApplyField[]
  onComplete: (correct: boolean) => void
}

function countWords(text: string) {
  return text.trim().split(/\s+/).filter(Boolean).length
}

function hasNumber(text: string) {
  return /\d/.test(text)
}

function containsAvoidWords(text: string, avoidWords: string[]) {
  const lower = text.toLowerCase()
  return avoidWords.some((word) => lower.includes(word.toLowerCase()))
}

export default function ApplyToYourselfExercise({
  instruction,
  coachingTip,
  fields,
  onComplete,
}: ApplyToYourselfExerciseProps) {
  const [answers, setAnswers] = useState<Record<string, string>>(
    Object.fromEntries(fields.map((field) => [field.label, '']))
  )
  const [reviewed, setReviewed] = useState(false)

  const analysis = useMemo(() => {
    return fields.map((field) => {
      const value = answers[field.label] || ''
      const checks: string[] = []
      let score = 0
      let total = 0

      total += 1
      if (value.trim().length > 0) {
        score += 1
      } else {
        checks.push('Add a draft here.')
      }

      if (field.minWords) {
        total += 1
        if (countWords(value) >= field.minWords) {
          score += 1
        } else {
          checks.push(`Add a bit more detail. Aim for at least ${field.minWords} words.`)
        }
      }

      if (field.shouldIncludeNumber) {
        total += 1
        if (hasNumber(value)) {
          score += 1
        } else {
          checks.push('Add a concrete number, percentage, time frame, or volume if you can.')
        }
      }

      if (field.avoidWords?.length) {
        total += 1
        if (!containsAvoidWords(value, field.avoidWords)) {
          score += 1
        } else {
          checks.push(`Cut soft language like: ${field.avoidWords.join(', ')}.`)
        }
      }

      return {
        field,
        value,
        passed: total > 0 ? score / total >= 0.7 : true,
        checks,
      }
    })
  }, [answers, fields])

  const allFilled = fields.every((field) => (answers[field.label] || '').trim().length > 0)
  const passed = analysis.every((item) => item.passed)

  const handlePrimary = () => {
    if (!reviewed) {
      setReviewed(true)
      return
    }
    onComplete(passed)
  }

  return (
    <div className="flex h-full w-full flex-col gap-5">
      <div className="shrink-0">
        <p className="text-base font-bold leading-snug text-slate-900 md:text-lg">{instruction}</p>
        <div className="mt-4 rounded-2xl border border-violet-100 bg-violet-50/60 px-4 py-3">
          <div className="flex items-start gap-3">
            <Sparkles className="mt-0.5 h-4 w-4 shrink-0 text-violet-600" />
            <p className="text-sm leading-6 text-slate-700">{coachingTip}</p>
          </div>
        </div>
      </div>

      <div className="min-h-0 flex-1 space-y-4">
        {fields.map((field) => {
          const item = analysis.find((entry) => entry.field.label === field.label)
          return (
            <div key={field.label} className="rounded-[1.4rem] border border-slate-200 bg-white px-5 py-4 shadow-[0_10px_20px_rgba(15,23,42,0.04)]">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-sm font-black uppercase tracking-[0.14em] text-violet-600">{field.label}</p>
                  {field.helper && <p className="mt-1 text-sm leading-6 text-slate-500">{field.helper}</p>}
                </div>
                {reviewed && item?.passed && (
                  <span className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-emerald-100 text-emerald-600">
                    <CheckCircle className="h-4 w-4" />
                  </span>
                )}
              </div>
              <textarea
                value={answers[field.label] || ''}
                onChange={(event) => {
                  setAnswers((prev) => ({ ...prev, [field.label]: event.target.value }))
                  if (reviewed) setReviewed(false)
                }}
                placeholder={field.placeholder}
                className="mt-3 min-h-[92px] w-full resize-none rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-medium leading-6 text-slate-800 outline-none transition focus:border-violet-300 focus:bg-white focus:ring-4 focus:ring-violet-100"
              />
              {reviewed && item && item.checks.length > 0 && (
                <div className="mt-3 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3">
                  <p className="text-xs font-black uppercase tracking-[0.14em] text-amber-700">Tighten this section</p>
                  <ul className="mt-2 space-y-1">
                    {item.checks.map((check) => (
                      <li key={check} className="text-sm leading-6 text-amber-800">{check}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )
        })}
      </div>

      <div className="mt-auto shrink-0 flex items-end justify-end border-t border-slate-200/80 pt-5">
        <button
          onClick={handlePrimary}
          disabled={!allFilled}
          className="btn-coach-primary flex min-w-[184px] items-center justify-center gap-2 px-6 py-3 disabled:opacity-50"
        >
          {reviewed ? 'Continue' : 'Analyze draft'}
          <ArrowRight className="h-4 w-4" />
        </button>
      </div>
    </div>
  )
}
