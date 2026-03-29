'use client'

import { useState } from 'react'
import { CheckCircle, XCircle } from 'lucide-react'

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

  const correct = selected === correctIndex

  return (
    <div className="flex h-full w-full max-w-3xl flex-col gap-5">
      {/* Question */}
      <p className="shrink-0 text-base font-bold text-gray-900 leading-snug md:text-lg">
        {question}
      </p>

      {/* Options */}
      <div className="space-y-3">
        {options.map((option, i) => {
          let borderClass = 'border-[#e5e5e5] hover:border-[#1CB0F6] hover:bg-[#ddf4ff]'
          let bgClass = 'bg-white'
          let textClass = 'text-gray-800'
          let badgeClass = 'bg-[#e5e5e5] text-gray-600'
          let icon = null

          if (answered) {
            if (i === correctIndex) {
              borderClass = 'border-[#58CC02]'
              bgClass = 'bg-[#d7f5b1]'
              textClass = 'text-gray-900'
              badgeClass = 'bg-[#58CC02] text-white'
              icon = <CheckCircle className="w-5 h-5 text-[#58CC02] shrink-0" />
            } else if (i === selected) {
              borderClass = 'border-[#FF4B4B]'
              bgClass = 'bg-[#ffdfe0]'
              textClass = 'text-gray-900'
              badgeClass = 'bg-[#FF4B4B] text-white'
              icon = <XCircle className="w-5 h-5 text-[#FF4B4B] shrink-0" />
            } else {
              borderClass = 'border-[#e5e5e5]'
              bgClass = 'bg-[#f7f7f7]'
              textClass = 'text-gray-400'
              badgeClass = 'bg-[#e5e5e5] text-gray-400'
            }
          }

          return (
            <button
              key={i}
              onClick={() => handleSelect(i)}
              disabled={answered}
              className={`w-full min-h-[64px] flex items-center gap-3 px-4 py-4 border-2 rounded-2xl text-left transition-all duration-150 ${borderClass} ${bgClass} ${
                !answered ? 'active:scale-[0.98] cursor-pointer' : 'cursor-default'
              }`}
            >
              <span
                className={`shrink-0 w-8 h-8 rounded-full flex items-center justify-center text-sm font-extrabold transition-colors duration-150 ${badgeClass}`}
              >
                {String.fromCharCode(65 + i)}
              </span>
              <span className={`flex-1 text-sm font-bold leading-snug ${textClass} transition-colors duration-150`}>
                {option}
              </span>
              {icon}
            </button>
          )
        })}
      </div>

      {selected !== null && (
        <div
          className={`shrink-0 rounded-xl border px-4 py-3 flex items-start gap-3 animate-slide-up ${
            correct ? 'bg-emerald-50 border-emerald-200' : 'bg-red-50 border-red-200'
          }`}
        >
          {correct
            ? <CheckCircle className="w-5 h-5 text-emerald-500 shrink-0 mt-0.5" />
            : <XCircle className="w-5 h-5 text-red-500 shrink-0 mt-0.5" />
          }
          <div>
            {!correct && (
              <p className="text-xs font-bold text-red-700 mb-0.5">
                Correct answer: <span className="font-extrabold">{options[correctIndex]}</span>
              </p>
            )}
            <p className={`text-xs leading-relaxed ${correct ? 'text-emerald-700' : 'text-red-700'}`}>
              {correct ? explanation : `${explanation} We&apos;ll bring this one back at the end.`}
            </p>
          </div>
        </div>
      )}

      <div className="mt-auto shrink-0">
      {selected !== null && (
        <button
          onClick={() => onComplete(correct)}
          className="w-full btn-coach-primary py-3"
        >
          Continue
        </button>
      )}
      </div>
    </div>
  )
}
