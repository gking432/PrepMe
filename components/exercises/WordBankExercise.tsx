'use client'

import { useState } from 'react'
import { CheckCircle, XCircle, ArrowRight } from 'lucide-react'

interface WordBankExerciseProps {
  instruction: string
  sentenceWithBlank: string // contains [___]
  options: string[]
  correctIndex: number
  explanation: string
  onComplete: (correct: boolean) => void
}

export default function WordBankExercise({
  instruction,
  sentenceWithBlank,
  options,
  correctIndex,
  explanation,
  onComplete,
}: WordBankExerciseProps) {
  const [selected, setSelected] = useState<number | null>(null)
  const [checked, setChecked] = useState(false)

  const parts = sentenceWithBlank.split('[___]')
  const correct = selected === correctIndex

  const handleSelect = (i: number) => {
    if (checked) return
    setSelected(i)
  }

  const handleCheck = () => {
    if (selected === null) return
    setChecked(true)
  }

  const handleContinue = () => {
    onComplete(correct)
  }

  return (
    <div className="w-full max-w-lg mx-auto space-y-5">
      <p className="text-base font-bold text-gray-900 leading-snug md:text-lg">{instruction}</p>

      {/* Sentence with blank */}
      <div className="bg-gray-50 border-2 border-gray-200 rounded-2xl px-5 py-4 text-base font-semibold text-gray-800 leading-relaxed">
        {parts[0]}
        <span
          className={`inline-flex items-center justify-center min-w-[80px] mx-1 px-3 py-0.5 rounded-lg border-b-4 text-sm font-extrabold transition-all duration-200 ${
            checked
              ? correct
                ? 'bg-[#d7f5b1] border-[#46a302] text-[#2a7a00]'
                : 'bg-[#ffdfe0] border-[#cc3c3c] text-[#9b1c1c]'
              : selected !== null
              ? 'bg-[#ddf4ff] border-[#1CB0F6] text-[#0369a1]'
              : 'bg-white border-gray-300 text-gray-400'
          }`}
        >
          {selected !== null ? options[selected] : '___'}
        </span>
        {parts[1]}
      </div>

      {/* Word bank */}
      <div>
        <p className="text-xs font-bold text-gray-400 uppercase tracking-wide mb-3">Word Bank</p>
        <div className="flex flex-wrap gap-2">
          {options.map((word, i) => {
            let cls =
              'px-4 py-2.5 rounded-xl border-2 border-b-4 text-sm font-bold transition-all duration-150 active:translate-y-[2px] active:border-b-2'
            if (checked) {
              if (i === correctIndex) {
                cls += ' bg-[#d7f5b1] border-[#46a302] text-[#2a7a00]'
              } else if (i === selected) {
                cls += ' bg-[#ffdfe0] border-[#cc3c3c] text-[#9b1c1c] line-through'
              } else {
                cls += ' bg-gray-50 border-gray-200 text-gray-300 cursor-default'
              }
            } else if (i === selected) {
              cls += ' bg-[#ddf4ff] border-[#1CB0F6] text-[#0369a1]'
            } else {
              cls += ' bg-white border-gray-200 text-gray-700 hover:border-[#1CB0F6] hover:bg-[#ddf4ff] cursor-pointer'
            }

            return (
              <button
                key={i}
                onClick={() => handleSelect(i)}
                disabled={checked}
                className={cls}
              >
                {word}
              </button>
            )
          })}
        </div>
      </div>

      {/* Post-check feedback */}
      {checked && (
        <div
          className={`rounded-xl border px-4 py-3 flex items-start gap-3 animate-slide-up ${
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

      {/* Action buttons */}
      {!checked && selected !== null && (
        <button onClick={handleCheck} className="w-full btn-coach-primary py-3">
          Check
        </button>
      )}

      {checked && (
        <button
          onClick={handleContinue}
          className="w-full btn-coach-primary flex items-center justify-center gap-2 py-3"
        >
          Continue <ArrowRight className="w-4 h-4" />
        </button>
      )}
    </div>
  )
}
