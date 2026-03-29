'use client'

import { useState, useMemo, useEffect } from 'react'
import { CheckCircle, XCircle, ArrowRight, Tag } from 'lucide-react'

interface Segment {
  text: string
  correctLabel: string
}

interface LabelSortExerciseProps {
  instruction: string
  segments: Segment[]
  labels?: string[]
  onComplete: (correct: boolean) => void
}

export default function LabelSortExercise({
  instruction,
  segments,
  labels: labelsProp,
  onComplete,
}: LabelSortExerciseProps) {
  const shuffledSegments = useMemo(() => {
    const clone = [...segments]
    for (let i = clone.length - 1; i > 0; i -= 1) {
      const j = Math.floor(Math.random() * (i + 1))
      ;[clone[i], clone[j]] = [clone[j], clone[i]]
    }
    return clone
  }, [segments])

  // Derive unique labels from segments if not provided
  const labels = useMemo(() => {
    if (labelsProp && labelsProp.length > 0) return labelsProp
    const unique: string[] = []
    shuffledSegments.forEach((s) => {
      if (!unique.includes(s.correctLabel)) unique.push(s.correctLabel)
    })
    return unique
  }, [labelsProp, shuffledSegments])

  const shuffledLabels = useMemo(() => {
    const clone = [...labels]
    for (let i = clone.length - 1; i > 0; i -= 1) {
      const j = Math.floor(Math.random() * (i + 1))
      ;[clone[i], clone[j]] = [clone[j], clone[i]]
    }
    return clone
  }, [labels])

  const [selections, setSelections] = useState<Record<number, string>>({})
  const [checked, setChecked] = useState(false)

  const allLabeled = shuffledSegments.every((_, i) => selections[i] !== undefined)

  const handleLabel = (segmentIndex: number, label: string) => {
    if (checked) return
    setSelections((prev) => ({ ...prev, [segmentIndex]: label }))
  }

  useEffect(() => {
    if (checked) return
    if (!allLabeled) return

    const timer = setTimeout(() => setChecked(true), 180)
    return () => clearTimeout(timer)
  }, [allLabeled, checked])

  const correctCount = checked
    ? shuffledSegments.filter((seg, i) => selections[i] === seg.correctLabel).length
    : 0
  const score = correctCount / shuffledSegments.length
  const passed = score >= 0.8

  // Label color palette for visual distinction
  const labelColorMap = useMemo(() => {
    const palettes = [
      { bg: 'bg-primary-50', border: 'border-primary-200', text: 'text-primary-600', activeBg: 'bg-primary-500', activeBorder: 'border-primary-500', activeText: 'text-white' },
      { bg: 'bg-accent-50', border: 'border-accent-200', text: 'text-accent-600', activeBg: 'bg-accent-500', activeBorder: 'border-accent-500', activeText: 'text-white' },
      { bg: 'bg-amber-50', border: 'border-amber-200', text: 'text-amber-600', activeBg: 'bg-amber-500', activeBorder: 'border-amber-500', activeText: 'text-white' },
      { bg: 'bg-cyan-50', border: 'border-cyan-200', text: 'text-cyan-600', activeBg: 'bg-cyan-500', activeBorder: 'border-cyan-500', activeText: 'text-white' },
      { bg: 'bg-rose-50', border: 'border-rose-200', text: 'text-rose-600', activeBg: 'bg-rose-500', activeBorder: 'border-rose-500', activeText: 'text-white' },
      { bg: 'bg-emerald-50', border: 'border-emerald-200', text: 'text-emerald-600', activeBg: 'bg-emerald-500', activeBorder: 'border-emerald-500', activeText: 'text-white' },
    ]
    const map: Record<string, typeof palettes[0]> = {}
    shuffledLabels.forEach((label, i) => {
      map[label] = palettes[i % palettes.length]
    })
    return map
  }, [shuffledLabels])

  return (
    <div className="flex h-full w-full flex-col gap-5">
      {/* Instruction */}
      <p className="shrink-0 text-base font-semibold text-gray-900 leading-snug md:text-lg">
        {instruction}
      </p>

      {/* Legend */}
      <div className="flex flex-wrap gap-2">
        {shuffledLabels.map((label) => {
          const c = labelColorMap[label]
          return (
            <span
              key={label}
              className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-bold border ${c.bg} ${c.border} ${c.text}`}
            >
              <Tag className="w-3 h-3" />
              {label}
            </span>
          )
        })}
      </div>

      {/* Segment cards */}
      <div className="space-y-4">
        {shuffledSegments.map((segment, i) => {
          const selected = selections[i]
          const isCorrect = checked && selected === segment.correctLabel
          const isWrong = checked && selected !== segment.correctLabel

          return (
            <div
              key={i}
              className={`rounded-xl border-2 p-4 transition-all duration-200 ${
                checked
                  ? isCorrect
                    ? 'border-emerald-300 bg-emerald-50/50'
                    : 'border-red-300 bg-red-50/50'
                  : selected
                  ? 'border-[#1CB0F6] bg-white shadow-md'
                  : 'border-[#e5e5e5] bg-white'
              }`}
            >
              {/* Segment text */}
              <div className="flex items-start gap-2 mb-3">
                {checked && isCorrect && <CheckCircle className="w-5 h-5 text-emerald-500 shrink-0 mt-0.5" />}
                {checked && isWrong && <XCircle className="w-5 h-5 text-red-500 shrink-0 mt-0.5" />}
                <p className="text-sm text-gray-800 leading-relaxed">{segment.text}</p>
              </div>

              {/* Label buttons */}
              <div className="flex flex-wrap gap-2">
                {shuffledLabels.map((label) => {
                  const c = labelColorMap[label]
                  const isSelected = selected === label
                  const isThisCorrect = checked && label === segment.correctLabel

                  let btnClass: string
                  if (checked) {
                    if (isThisCorrect) {
                      btnClass = 'bg-emerald-500 border-emerald-500 text-white'
                    } else if (isSelected && !isThisCorrect) {
                      btnClass = 'bg-red-100 border-red-300 text-red-600 line-through'
                    } else {
                      btnClass = 'bg-gray-50 border-gray-100 text-gray-300'
                    }
                  } else if (isSelected) {
                    btnClass = `${c.activeBg} ${c.activeBorder} ${c.activeText}`
                  } else {
                    btnClass = `${c.bg} ${c.border} ${c.text} hover:opacity-80`
                  }

                  return (
                    <button
                      key={label}
                      onClick={() => handleLabel(i, label)}
                      disabled={checked}
                      className={`px-3 py-1.5 rounded-lg text-xs font-bold border transition-all duration-200 ${btnClass} ${
                        !checked ? 'active:scale-95 cursor-pointer' : 'cursor-default'
                      }`}
                    >
                      {label}
                    </button>
                  )
                })}
              </div>

              {/* Show correct label when wrong */}
              {isWrong && (
                <p className="mt-2 text-xs text-red-600">
                  Correct: <span className="font-bold">{segment.correctLabel}</span>
                </p>
              )}
            </div>
          )
        })}
      </div>

      {/* Score result */}
      {checked && (
        <div
          className={`shrink-0 rounded-xl border p-4 transition-all duration-300 ${
            passed ? 'bg-emerald-50 border-emerald-200' : 'bg-amber-50 border-amber-200'
          }`}
        >
          <p className={`text-sm font-bold ${passed ? 'text-emerald-700' : 'text-amber-700'}`}>
            {correctCount} of {shuffledSegments.length} correct
            {passed ? ' — Great job!' : ' — We will revisit the misses at the end.'}
          </p>
        </div>
      )}

      <div className="mt-auto shrink-0 flex items-end justify-end border-t border-slate-200/80 pt-5">
      {checked && (
        <button
          onClick={() => onComplete(passed)}
          className="btn-coach-primary flex min-w-[168px] items-center justify-center gap-2 px-6 py-3"
        >
          Continue
          <ArrowRight className="w-4 h-4" />
        </button>
      )}
      </div>
    </div>
  )
}
