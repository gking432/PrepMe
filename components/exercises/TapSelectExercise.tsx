'use client'

import { useState } from 'react'
import { CheckCircle, XCircle, ArrowRight } from 'lucide-react'

interface TapSelectExerciseProps {
  instruction: string
  items: string[]
  correctIndices: number[]
  explanation: string
  onComplete: (correct: boolean) => void
}

export default function TapSelectExercise({
  instruction,
  items,
  correctIndices,
  explanation,
  onComplete,
}: TapSelectExerciseProps) {
  const [selected, setSelected] = useState<Set<number>>(new Set())
  const [checked, setChecked] = useState(false)

  const correctSet = new Set(correctIndices)

  const toggle = (i: number) => {
    if (checked) return
    setSelected(prev => {
      const next = new Set(prev)
      if (next.has(i)) next.delete(i)
      else next.add(i)
      return next
    })
  }

  const handleCheck = () => {
    if (selected.size === 0) return
    setChecked(true)
  }

  const allCorrect =
    correctIndices.every(i => selected.has(i)) &&
    [...selected].every(i => correctSet.has(i))

  const handleContinue = () => onComplete(allCorrect)

  const handleRetry = () => {
    setSelected(new Set())
    setChecked(false)
  }

  return (
    <div className="w-full max-w-lg mx-auto space-y-5">
      <p className="text-base font-bold text-gray-900 leading-snug md:text-lg">{instruction}</p>

      {/* Tap items */}
      <div className="flex flex-wrap gap-2">
        {items.map((item, i) => {
          const isSelected = selected.has(i)
          const isCorrect = correctSet.has(i)

          let cls =
            'px-4 py-2.5 rounded-xl border-2 border-b-4 text-sm font-bold transition-all duration-150 active:translate-y-[2px] active:border-b-2 '

          if (checked) {
            if (isCorrect && isSelected) {
              cls += 'bg-[#d7f5b1] border-[#46a302] text-[#2a7a00]'
            } else if (isCorrect && !isSelected) {
              // missed — show as correct but unfilled
              cls += 'bg-amber-50 border-amber-400 text-amber-700'
            } else if (!isCorrect && isSelected) {
              // wrong tap
              cls += 'bg-[#ffdfe0] border-[#cc3c3c] text-[#9b1c1c] line-through'
            } else {
              cls += 'bg-gray-50 border-gray-200 text-gray-400 cursor-default'
            }
          } else if (isSelected) {
            cls += 'bg-[#ddf4ff] border-[#1CB0F6] text-[#0369a1]'
          } else {
            cls += 'bg-white border-gray-200 text-gray-700 hover:border-[#1CB0F6] hover:bg-[#ddf4ff] cursor-pointer'
          }

          return (
            <button key={i} onClick={() => toggle(i)} disabled={checked} className={cls}>
              {checked && isCorrect && isSelected && <CheckCircle className="w-3.5 h-3.5 inline mr-1" />}
              {checked && !isCorrect && isSelected && <XCircle className="w-3.5 h-3.5 inline mr-1" />}
              {item}
            </button>
          )
        })}
      </div>

      <p className="text-xs text-gray-400">Tap all that apply, then hit Check.</p>

      {/* Post-check feedback */}
      {checked && (
        <div
          className={`rounded-xl border px-4 py-3 flex items-start gap-3 animate-slide-up ${
            allCorrect ? 'bg-emerald-50 border-emerald-200' : 'bg-red-50 border-red-200'
          }`}
        >
          {allCorrect
            ? <CheckCircle className="w-5 h-5 text-emerald-500 shrink-0 mt-0.5" />
            : <XCircle className="w-5 h-5 text-red-500 shrink-0 mt-0.5" />
          }
          <div>
            {!allCorrect && (
              <p className="text-xs font-bold text-red-700 mb-0.5">
                Correct: {correctIndices.map(i => items[i]).join(', ')}
              </p>
            )}
            <p className={`text-xs leading-relaxed ${allCorrect ? 'text-emerald-700' : 'text-red-700'}`}>
              {explanation}
            </p>
          </div>
        </div>
      )}

      {/* Action buttons */}
      {!checked && selected.size > 0 && (
        <button onClick={handleCheck} className="w-full btn-duo-green py-3">
          Check
        </button>
      )}

      {checked && allCorrect && (
        <button
          onClick={handleContinue}
          className="w-full btn-duo-green flex items-center justify-center gap-2 py-3"
        >
          Continue <ArrowRight className="w-4 h-4" />
        </button>
      )}

      {checked && !allCorrect && (
        <button
          onClick={handleRetry}
          className="w-full py-3 rounded-2xl font-extrabold text-white text-base bg-[#FF4B4B] border-b-4 border-[#cc3c3c] active:border-b-0 active:translate-y-[3px] transition-transform"
        >
          Try Again
        </button>
      )}
    </div>
  )
}
