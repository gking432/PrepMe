'use client'

import { useMemo, useState } from 'react'
import { ArrowRight, CheckCircle, RotateCcw, XCircle } from 'lucide-react'

interface SentenceBuilderExerciseProps {
  instruction: string
  slotLabels: string[]
  options: string[]
  correctOrder: string[]
  explanation: string
  displayMode?: 'slots' | 'sequence'
  onComplete: (correct: boolean) => void
}

function shuffle<T>(items: T[]) {
  const clone = [...items]
  for (let i = clone.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[clone[i], clone[j]] = [clone[j], clone[i]]
  }
  return clone
}

export default function SentenceBuilderExercise({
  instruction,
  slotLabels,
  options,
  correctOrder,
  explanation,
  displayMode = 'slots',
  onComplete,
}: SentenceBuilderExerciseProps) {
  const shuffledOptions = useMemo(() => shuffle(options), [options])
  const [selectedParts, setSelectedParts] = useState<string[]>([])
  const [checked, setChecked] = useState(false)

  const availableOptions = shuffledOptions.filter((option) => !selectedParts.includes(option))
  const allFilled = selectedParts.length === correctOrder.length
  const correct = allFilled && selectedParts.every((part, index) => part === correctOrder[index])

  const addPart = (part: string) => {
    if (checked || allFilled) return
    setSelectedParts((prev) => [...prev, part])
  }

  const removePart = (index: number) => {
    if (checked) return
    setSelectedParts((prev) => prev.filter((_, i) => i !== index))
  }

  const reset = () => {
    if (checked) return
    setSelectedParts([])
  }

  const handleCheck = () => {
    if (!allFilled) return
    setChecked(true)
  }

  return (
    <div className="flex h-full w-full flex-col gap-5">
      <p className="shrink-0 text-base font-bold leading-snug text-gray-900 md:text-lg">
        {instruction}
      </p>

      {displayMode === 'sequence' ? (
        <div className={`rounded-2xl border-2 px-4 py-4 transition ${
          checked
            ? correct
              ? 'border-emerald-300 bg-emerald-50'
              : 'border-amber-300 bg-amber-50'
            : 'border-slate-200 bg-white'
        }`}>
          <p className="text-[11px] font-black uppercase tracking-[0.14em] text-slate-500">
            Build the answer
          </p>
          <div className="mt-3 flex min-h-[160px] flex-wrap content-start gap-2 rounded-xl border border-dashed border-slate-300 bg-slate-50 px-3 py-3">
            {selectedParts.length === 0 ? (
              <p className="text-sm italic text-slate-400">
                Select six fragments to build your answer.
              </p>
            ) : (
              selectedParts.map((part, index) => {
                const isCorrect = checked && part === correctOrder[index]
                const isWrong = checked && part !== correctOrder[index]
                return (
                  <button
                    key={`${part}-${index}`}
                    onClick={() => removePart(index)}
                    disabled={checked}
                    className={`rounded-xl px-3 py-2 text-left text-sm font-semibold transition ${
                      checked
                        ? isCorrect
                          ? 'bg-emerald-100 text-emerald-900'
                          : isWrong
                          ? 'bg-red-100 text-red-900'
                          : 'bg-slate-100 text-slate-800'
                        : 'bg-violet-100 text-violet-900 hover:bg-violet-200'
                    }`}
                  >
                    {part}
                  </button>
                )
              })
            )}
          </div>
        </div>
      ) : (
        <div className="space-y-3">
          {slotLabels.map((label, index) => {
            const chosen = selectedParts[index]
            const isCorrect = checked && chosen === correctOrder[index]
            const isWrong = checked && chosen && chosen !== correctOrder[index]

            return (
              <button
                key={label}
                onClick={() => chosen && removePart(index)}
                disabled={!chosen || checked}
                className={`w-full rounded-2xl border-2 px-4 py-4 text-left transition ${
                  checked
                    ? isCorrect
                      ? 'border-emerald-300 bg-emerald-50'
                      : isWrong
                      ? 'border-red-300 bg-red-50'
                      : 'border-slate-200 bg-slate-50'
                    : chosen
                    ? 'border-violet-300 bg-violet-50 hover:border-violet-400'
                    : 'border-slate-200 bg-white'
                }`}
              >
                <p className="text-[11px] font-black uppercase tracking-[0.14em] text-slate-500">
                  {label}
                </p>
                <div className="mt-2 flex items-start gap-2">
                  {checked && isCorrect ? <CheckCircle className="mt-0.5 h-4 w-4 shrink-0 text-emerald-500" /> : null}
                  {checked && isWrong ? <XCircle className="mt-0.5 h-4 w-4 shrink-0 text-red-500" /> : null}
                  <p className={`text-sm leading-relaxed ${chosen ? 'text-slate-900' : 'text-slate-400 italic'}`}>
                    {chosen || 'Choose the best fragment for this slot'}
                  </p>
                </div>
              </button>
            )
          })}
        </div>
      )}

      <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4">
        <div className="mb-3 flex items-center justify-between">
          <p className="text-xs font-black uppercase tracking-[0.14em] text-slate-500">Available pieces</p>
          {!checked && (
            <button
              onClick={reset}
              disabled={selectedParts.length === 0}
              className="inline-flex items-center gap-1 text-xs font-bold text-slate-500 transition hover:text-slate-700 disabled:opacity-40"
            >
              <RotateCcw className="h-3.5 w-3.5" />
              Reset
            </button>
          )}
        </div>
        <div className="flex flex-wrap gap-2">
          {availableOptions.map((option) => (
            <button
              key={option}
              onClick={() => addPart(option)}
              disabled={checked || allFilled}
              className="rounded-xl border border-slate-300 bg-white px-3 py-2 text-left text-sm font-semibold text-slate-700 transition hover:border-violet-300 hover:bg-violet-50 disabled:opacity-40"
            >
              {option}
            </button>
          ))}
        </div>
      </div>

      {checked && (
        <div className={`rounded-xl border px-4 py-3 ${correct ? 'border-emerald-200 bg-emerald-50' : 'border-amber-200 bg-amber-50'}`}>
          <p className={`text-sm font-bold ${correct ? 'text-emerald-700' : 'text-amber-700'}`}>
            {correct ? 'Nice. You built a stronger version.' : 'Not quite. Review the order and the detail choices.'}
          </p>
          <p className={`mt-1 text-xs leading-relaxed ${correct ? 'text-emerald-700' : 'text-amber-700'}`}>
            {explanation}
          </p>
        </div>
      )}

      <div className="mt-auto shrink-0 flex items-end justify-end border-t border-slate-200/80 pt-5">
        {!checked ? (
          <button
            onClick={handleCheck}
            disabled={!allFilled}
            className="btn-coach-primary min-w-[168px] px-6 py-3 disabled:opacity-50"
          >
            Check answer
          </button>
        ) : (
          <button
            onClick={() => onComplete(correct)}
            className="btn-coach-primary flex min-w-[168px] items-center justify-center gap-2 px-6 py-3"
          >
            Continue
            <ArrowRight className="h-4 w-4" />
          </button>
        )}
      </div>
    </div>
  )
}
