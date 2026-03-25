'use client'

import { useState } from 'react'
import { Send } from 'lucide-react'

interface ShortAnswerExerciseProps {
  prompt: string
  hint: string
  maxLength: number
  onComplete: (answer: string) => void
}

export default function ShortAnswerExercise({
  prompt,
  hint,
  maxLength,
  onComplete,
}: ShortAnswerExerciseProps) {
  const [answer, setAnswer] = useState('')
  const [submitted, setSubmitted] = useState(false)

  const trimmed = answer.trim()
  const charCount = trimmed.length
  const isEmpty = charCount === 0
  const isOverLimit = charCount > maxLength
  const nearLimit = charCount > maxLength * 0.85

  const handleSubmit = () => {
    if (isEmpty || isOverLimit || submitted) return
    setSubmitted(true)
    onComplete(trimmed)
  }

  return (
    <div className="w-full max-w-lg mx-auto space-y-5">
      {/* Prompt */}
      <p className="text-base font-semibold text-gray-900 leading-snug md:text-lg">
        {prompt}
      </p>

      {/* Hint */}
      {hint && (
        <p className="text-sm text-gray-400 leading-relaxed">
          {hint}
        </p>
      )}

      {/* Textarea */}
      <div className="relative">
        <textarea
          value={answer}
          onChange={(e) => setAnswer(e.target.value)}
          disabled={submitted}
          rows={5}
          placeholder="Type your answer here..."
          className={`w-full px-4 py-3 text-sm md:text-base border-2 rounded-xl resize-none transition-all duration-200 focus:outline-none ${
            submitted
              ? 'border-gray-200 bg-gray-50 text-gray-500 cursor-default'
              : isOverLimit
              ? 'border-red-300 focus:border-red-400 bg-red-50/30'
              : 'border-gray-200 focus:border-accent-400 bg-white'
          }`}
        />

        {/* Character count */}
        <div className="flex items-center justify-end mt-1.5 px-1">
          <span
            className={`text-xs font-medium tabular-nums transition-colors duration-200 ${
              isOverLimit
                ? 'text-red-500 font-bold'
                : nearLimit
                ? 'text-amber-500'
                : 'text-gray-300'
            }`}
          >
            {charCount}/{maxLength}
          </span>
        </div>
      </div>

      {/* Submit button */}
      <button
        onClick={handleSubmit}
        disabled={isEmpty || isOverLimit || submitted}
        className={`w-full flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-bold transition-all duration-200 ${
          submitted
            ? 'bg-emerald-500 text-white cursor-default'
            : 'bg-accent-600 text-white hover:bg-accent-700 active:scale-[0.98] shadow-lg shadow-accent-200 disabled:opacity-40 disabled:shadow-none disabled:cursor-not-allowed'
        }`}
      >
        {submitted ? (
          <>Submitted</>
        ) : (
          <>
            <Send className="w-4 h-4" />
            Submit
          </>
        )}
      </button>
    </div>
  )
}
