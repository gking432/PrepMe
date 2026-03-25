'use client'

import { useState } from 'react'
import { CheckCircle, XCircle, ArrowRight } from 'lucide-react'

interface MultipleChoiceExerciseProps {
  question: string
  options: string[]
  correctIndex: number
  explanation: string
  onComplete: (correct: boolean) => void
}

export default function MultipleChoiceExercise({
  question,
  options,
  correctIndex,
  explanation,
  onComplete,
}: MultipleChoiceExerciseProps) {
  const [selected, setSelected] = useState<number | null>(null)
  const answered = selected !== null

  const handleSelect = (index: number) => {
    if (answered) return
    setSelected(index)
  }

  const isCorrect = selected === correctIndex

  return (
    <div className="w-full max-w-lg mx-auto space-y-5">
      {/* Question */}
      <p className="text-base font-semibold text-gray-900 leading-snug md:text-lg">
        {question}
      </p>

      {/* Options */}
      <div className="space-y-3">
        {options.map((option, i) => {
          let borderClass = 'border-gray-200 hover:border-primary-300 hover:bg-primary-50'
          let bgClass = 'bg-white'
          let textClass = 'text-gray-800'
          let icon = null

          if (answered) {
            if (i === correctIndex) {
              borderClass = 'border-emerald-400'
              bgClass = 'bg-emerald-50'
              textClass = 'text-emerald-800'
              icon = <CheckCircle className="w-5 h-5 text-emerald-500 shrink-0" />
            } else if (i === selected) {
              borderClass = 'border-red-400'
              bgClass = 'bg-red-50'
              textClass = 'text-red-800'
              icon = <XCircle className="w-5 h-5 text-red-500 shrink-0" />
            } else {
              borderClass = 'border-gray-100'
              bgClass = 'bg-gray-50'
              textClass = 'text-gray-400'
            }
          }

          return (
            <button
              key={i}
              onClick={() => handleSelect(i)}
              disabled={answered}
              className={`w-full min-h-12 flex items-center gap-3 px-4 py-3 border-2 rounded-xl text-left transition-all duration-200 ${borderClass} ${bgClass} ${
                !answered ? 'active:scale-[0.98] cursor-pointer' : 'cursor-default'
              }`}
            >
              {/* Option letter */}
              <span
                className={`shrink-0 w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold ${
                  answered && i === correctIndex
                    ? 'bg-emerald-500 text-white'
                    : answered && i === selected
                    ? 'bg-red-500 text-white'
                    : 'bg-gray-100 text-gray-500'
                } transition-colors duration-200`}
              >
                {String.fromCharCode(65 + i)}
              </span>
              <span className={`flex-1 text-sm font-medium leading-snug ${textClass} transition-colors duration-200`}>
                {option}
              </span>
              {icon}
            </button>
          )
        })}
      </div>

      {/* Explanation */}
      {answered && (
        <div
          className={`rounded-xl border p-4 transition-all duration-300 ${
            isCorrect
              ? 'bg-emerald-50 border-emerald-200'
              : 'bg-red-50 border-red-200'
          }`}
        >
          <p className={`text-xs font-bold uppercase tracking-wide mb-1 ${isCorrect ? 'text-emerald-600' : 'text-red-600'}`}>
            {isCorrect ? 'Correct!' : 'Not quite'}
          </p>
          <p className={`text-sm leading-relaxed ${isCorrect ? 'text-emerald-800' : 'text-red-800'}`}>
            {explanation}
          </p>
        </div>
      )}

      {/* Continue button */}
      {answered && (
        <button
          onClick={() => onComplete(isCorrect)}
          className="w-full flex items-center justify-center gap-2 py-3 bg-accent-600 text-white rounded-xl text-sm font-bold hover:bg-accent-700 active:scale-[0.98] transition-all duration-200 shadow-lg shadow-accent-200"
        >
          Continue
          <ArrowRight className="w-4 h-4" />
        </button>
      )}
    </div>
  )
}
