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
    const correct = index === correctIndex
    // Brief pause so user sees correct/wrong highlight, then bottom sheet appears
    setTimeout(() => onComplete(correct), 900)
  }

  return (
    <div className="w-full max-w-lg mx-auto">
      {/* Question */}
      <p className="text-base font-bold text-gray-900 leading-snug md:text-lg mb-5">
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
    </div>
  )
}
