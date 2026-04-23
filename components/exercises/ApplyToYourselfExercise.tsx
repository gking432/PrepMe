'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
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
  title?: string
  context?: string
  instruction: string
  coachingTip: string
  evaluationType?: string
  criterion?: string
  fields: ApplyField[]
  originalQuestion?: string
  originalAnswer?: string
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

function getFieldChecks(field: ApplyField, value: string) {
  const checks: string[] = []

  if (!value.trim()) {
    checks.push('Add a draft here.')
    return checks
  }

  if (field.minWords && countWords(value) < field.minWords) {
    checks.push(`Add a bit more detail. Aim for at least ${field.minWords} words.`)
  }

  if (field.shouldIncludeNumber && !hasNumber(value)) {
    checks.push('Add a concrete number, percentage, time frame, or volume if you can.')
  }

  if (field.avoidWords?.length && containsAvoidWords(value, field.avoidWords)) {
    checks.push(`Cut soft language like: ${field.avoidWords.join(', ')}.`)
  }

  return checks
}

export default function ApplyToYourselfExercise({
  title,
  context,
  instruction,
  coachingTip,
  evaluationType,
  criterion,
  fields,
  originalQuestion,
  originalAnswer,
  onComplete,
}: ApplyToYourselfExerciseProps) {
  const [answers, setAnswers] = useState<Record<string, string>>(
    Object.fromEntries(fields.map((field) => [field.label, '']))
  )
  const [activeIndex, setActiveIndex] = useState(0)
  const [currentValue, setCurrentValue] = useState('')
  const [completedCount, setCompletedCount] = useState(0)
  const [reviewed, setReviewed] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [remoteFeedback, setRemoteFeedback] = useState<Record<string, string[]>>({})
  const [remotePassed, setRemotePassed] = useState<boolean | null>(null)

  const currentField = fields[activeIndex]

  useEffect(() => {
    setCurrentValue(answers[currentField.label] || '')
  }, [answers, currentField.label])

  const analysis = useMemo(() => {
    return fields.map((field) => {
      const value = answers[field.label] || ''
      const checks = getFieldChecks(field, value)
      return {
        field,
        value,
        passed: checks.length === 0,
        checks,
      }
    })
  }, [answers, fields])

  const localPassed = analysis.every((item) => item.passed)
  const allFilled = fields.every((field) => (answers[field.label] || '').trim().length > 0)
  const passed = remotePassed ?? localPassed
  const currentChecks = useMemo(() => getFieldChecks(currentField, currentValue), [currentField, currentValue])

  const builtParagraph = useMemo(() => {
    return fields
      .map((field) => (answers[field.label] || '').trim())
      .filter(Boolean)
      .join(' ')
  }, [answers, fields])

  const findFirstFieldToTighten = useCallback((feedback: Record<string, string[]>, fallbackLocalPassed: boolean) => {
    const remoteFirst = fields.findIndex((field) => (feedback[field.label] || []).length > 0)
    if (remoteFirst >= 0) return remoteFirst
    if (!fallbackLocalPassed) {
      return analysis.findIndex((item) => !item.passed)
    }
    return -1
  }, [analysis, fields])

  const reviewDraft = async (nextAnswers: Record<string, string>) => {
    if (!evaluationType || !originalQuestion) {
      setRemotePassed(localPassed)
      setRemoteFeedback({})
      setReviewed(true)
      return localPassed
    }

    setSubmitting(true)
    try {
      const response = await fetch('/api/interview/practice-draft', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          criterion,
          question: originalQuestion,
          evaluationType,
          answers: nextAnswers,
        }),
      })

      const data = await response.json()
      if (response.ok) {
        const nextPassed = Boolean(data.passed)
        const nextFeedback = data.fieldFeedback || {}
        setRemotePassed(nextPassed)
        setRemoteFeedback(nextFeedback)
        setReviewed(true)
        return nextPassed
      }

      setRemotePassed(false)
      setRemoteFeedback({ General: [data.error || 'Could not evaluate this draft yet.'] })
      setReviewed(true)
      return false
    } catch {
      setRemotePassed(false)
      setRemoteFeedback({ General: ['Could not evaluate this draft yet.'] })
      setReviewed(true)
      return false
    } finally {
      setSubmitting(false)
    }
  }

  const handleSubmit = async () => {
    if (!currentField || currentChecks.length > 0) return

    const nextAnswers = {
      ...answers,
      [currentField.label]: currentValue.trim(),
    }

    setAnswers(nextAnswers)
    setReviewed(false)
    setRemotePassed(null)
    setRemoteFeedback({})

    const nextCompletedCount = Math.max(completedCount, activeIndex + 1)
    setCompletedCount(nextCompletedCount)

    const isLastField = activeIndex === fields.length - 1

    if (!isLastField) {
      setActiveIndex(activeIndex + 1)
      return
    }

    const nextLocalAnalysis = fields.map((field) => ({
      field,
      checks: getFieldChecks(field, nextAnswers[field.label] || ''),
    }))
    const nextLocalPassed = nextLocalAnalysis.every((item) => item.checks.length === 0)

    if (!nextLocalPassed) {
      const firstLocalFail = nextLocalAnalysis.findIndex((item) => item.checks.length > 0)
      setActiveIndex(firstLocalFail >= 0 ? firstLocalFail : 0)
      setReviewed(true)
      return
    }

    const nextPassed = await reviewDraft(nextAnswers)
    const firstFailIndex = findFirstFieldToTighten(remoteFeedback, nextLocalPassed)
    if (!nextPassed && firstFailIndex >= 0) {
      setActiveIndex(firstFailIndex)
    }
  }

  useEffect(() => {
    if (!reviewed || passed) return
    const firstFailIndex = findFirstFieldToTighten(remoteFeedback, localPassed)
    if (firstFailIndex >= 0 && firstFailIndex !== activeIndex) {
      setActiveIndex(firstFailIndex)
    }
  }, [activeIndex, findFirstFieldToTighten, localPassed, passed, remoteFeedback, reviewed])

  const currentFieldRemoteFeedback = remoteFeedback[currentField.label] || []

  return (
    <div className="flex h-full w-full flex-col gap-5">
      <div className="shrink-0">
        {title ? (
          <p className="text-xs font-black uppercase tracking-[0.14em] text-violet-600">{title}</p>
        ) : null}
        {context ? (
          <div className="mt-3 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
            <p className="text-sm leading-6 text-slate-700 whitespace-pre-line">{context}</p>
          </div>
        ) : null}
        <p className="text-base font-bold leading-snug text-slate-900 md:text-lg">{instruction}</p>
        <div className="mt-4 rounded-2xl border border-violet-100 bg-violet-50/60 px-4 py-3">
          <div className="flex items-start gap-3">
            <Sparkles className="mt-0.5 h-4 w-4 shrink-0 text-violet-600" />
            <p className="text-sm leading-6 text-slate-700">{coachingTip}</p>
          </div>
        </div>
        {(originalQuestion || originalAnswer) && (
          <div className="mt-4 grid gap-3 md:grid-cols-2">
            {originalQuestion && (
              <div className="rounded-2xl border border-sky-200 bg-sky-50 px-4 py-3">
                <p className="text-xs font-black uppercase tracking-[0.14em] text-sky-700">Flagged Question</p>
                <p className="mt-2 text-sm leading-6 text-slate-800">{originalQuestion}</p>
              </div>
            )}
            {originalAnswer && (
              <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3">
                <p className="text-xs font-black uppercase tracking-[0.14em] text-rose-700">Your Original Answer</p>
                <p className="mt-2 text-sm leading-6 text-slate-800 italic">&ldquo;{originalAnswer}&rdquo;</p>
              </div>
            )}
          </div>
        )}
      </div>

      <div className="min-h-0 flex-1 space-y-4">
        <div className="rounded-2xl border border-slate-200 bg-white px-5 py-4 shadow-[0_10px_20px_rgba(15,23,42,0.04)]">
          <p className="text-xs font-black uppercase tracking-[0.14em] text-slate-500">Your draft</p>
          <div className="mt-3 min-h-[140px] rounded-xl border border-slate-200 bg-white px-4 py-4">
            {builtParagraph ? (
              <p className="text-base leading-8 text-slate-900">{builtParagraph}</p>
            ) : (
              <p className="text-sm italic leading-7 text-slate-400">
                Each section you submit will appear here as one built paragraph.
              </p>
            )}
          </div>
        </div>

        <div className="rounded-[1.4rem] border border-slate-200 bg-white px-5 py-4 shadow-[0_10px_20px_rgba(15,23,42,0.04)]">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-sm font-black uppercase tracking-[0.14em] text-violet-600">
                {currentField.label}
              </p>
              {currentField.helper && (
                <p className="mt-1 text-sm leading-6 text-slate-500">{currentField.helper}</p>
              )}
            </div>
            {completedCount > activeIndex && reviewed && passed && (
              <span className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-emerald-100 text-emerald-600">
                <CheckCircle className="h-4 w-4" />
              </span>
            )}
          </div>

          <textarea
            value={currentValue}
            onChange={(event) => setCurrentValue(event.target.value)}
            placeholder={currentField.placeholder}
            className="mt-3 min-h-[68px] w-full resize-none rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-medium leading-6 text-slate-800 outline-none transition focus:border-violet-300 focus:ring-4 focus:ring-violet-100"
          />

          {currentChecks.length > 0 && (
            <div className="mt-3 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3">
              <p className="text-xs font-black uppercase tracking-[0.14em] text-amber-700">Tighten this section</p>
              <ul className="mt-2 space-y-1">
                {currentChecks.map((check) => (
                  <li key={check} className="text-sm leading-6 text-amber-800">{check}</li>
                ))}
              </ul>
            </div>
          )}

          {reviewed && currentFieldRemoteFeedback.length > 0 && (
            <div className="mt-3 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3">
              <p className="text-xs font-black uppercase tracking-[0.14em] text-amber-700">Coach feedback</p>
              <ul className="mt-2 space-y-1">
                {currentFieldRemoteFeedback.map((check) => (
                  <li key={check} className="text-sm leading-6 text-amber-800">{check}</li>
                ))}
              </ul>
            </div>
          )}
        </div>

        {reviewed && remoteFeedback.General?.length ? (
          <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3">
            <p className="text-xs font-black uppercase tracking-[0.14em] text-amber-700">Coach feedback</p>
            <ul className="mt-2 space-y-1">
              {remoteFeedback.General.map((check) => (
                <li key={check} className="text-sm leading-6 text-amber-800">{check}</li>
              ))}
            </ul>
          </div>
        ) : null}
      </div>

      <div className="mt-auto shrink-0 flex items-end justify-end border-t border-slate-200/80 pt-5">
        <button
          onClick={reviewed && passed ? () => onComplete(true) : handleSubmit}
          disabled={submitting || currentChecks.length > 0}
          className="btn-coach-primary flex min-w-[184px] items-center justify-center gap-2 px-6 py-3 disabled:opacity-50"
        >
          {submitting ? 'Reviewing...' : reviewed && passed ? 'Continue' : 'Submit'}
          <ArrowRight className="h-4 w-4" />
        </button>
      </div>
    </div>
  )
}
