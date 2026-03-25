'use client'

import { ArrowRight, ThumbsDown, ThumbsUp } from 'lucide-react'
import Preppi from '@/components/Preppi'

interface TeachCardProps {
  title: string
  explanation: string
  example: {
    question: string
    badAnswer: string
    goodAnswer: string
    breakdown: Record<string, string>
  }
  onContinue: () => void
}

// Map common breakdown keys to short display labels
function formatBreakdownKey(key: string): string {
  const map: Record<string, string> = {
    situation: 'S',
    task: 'T',
    action: 'A',
    result: 'R',
  }
  return map[key.toLowerCase()] || key.charAt(0).toUpperCase()
}

function breakdownKeyLabel(key: string): string {
  return key.charAt(0).toUpperCase() + key.slice(1)
}

export default function TeachCard({
  title,
  explanation,
  example,
  onContinue,
}: TeachCardProps) {
  return (
    <div className="w-full max-w-2xl mx-auto space-y-6">
      {/* Preppi encouragement — mobile only */}
      <Preppi message="Let me teach you something useful!" size="sm" />

      {/* Title */}
      <div>
        <h2 className="text-xl font-extrabold text-gray-900 md:text-2xl">
          {title}
        </h2>
        <p className="mt-2 text-sm text-gray-600 leading-relaxed md:text-base">
          {explanation}
        </p>
      </div>

      {/* Example question */}
      <div className="bg-gray-50 rounded-xl px-4 py-3 border border-gray-100">
        <p className="text-xs font-bold uppercase tracking-wide text-gray-400 mb-1">
          Interview question
        </p>
        <p className="text-sm font-semibold text-gray-900 leading-snug">
          {example.question}
        </p>
      </div>

      {/* Bad answer */}
      <div className="rounded-2xl border-2 border-red-200 bg-red-50/60 overflow-hidden shadow-lg">
        <div className="flex items-center gap-2 px-4 py-2.5 bg-red-100/80 border-b border-red-200">
          <ThumbsDown className="w-4 h-4 text-red-500" />
          <span className="text-xs font-bold text-red-600 uppercase tracking-wide">
            Weak answer
          </span>
        </div>
        <div className="px-4 py-3">
          <p className="text-sm text-red-800 leading-relaxed italic">
            &ldquo;{example.badAnswer}&rdquo;
          </p>
        </div>
      </div>

      {/* Good answer */}
      <div className="rounded-2xl border-2 border-emerald-200 bg-emerald-50/60 overflow-hidden shadow-lg">
        <div className="flex items-center gap-2 px-4 py-2.5 bg-emerald-100/80 border-b border-emerald-200">
          <ThumbsUp className="w-4 h-4 text-emerald-500" />
          <span className="text-xs font-bold text-emerald-600 uppercase tracking-wide">
            Strong answer
          </span>
        </div>
        <div className="px-4 py-3">
          <p className="text-sm text-emerald-800 leading-relaxed">
            &ldquo;{example.goodAnswer}&rdquo;
          </p>
        </div>
      </div>

      {/* Breakdown */}
      <div className="space-y-2">
        <p className="text-xs font-bold uppercase tracking-wide text-gray-400">
          Breakdown
        </p>
        <div className="space-y-2">
          {Object.entries(example.breakdown).map(([key, value]) => (
            <div
              key={key}
              className="flex items-start gap-3 rounded-xl bg-white border border-gray-100 px-4 py-3 shadow-sm"
            >
              <span className="shrink-0 w-8 h-8 rounded-full bg-accent-100 flex items-center justify-center text-xs font-extrabold text-accent-700">
                {formatBreakdownKey(key)}
              </span>
              <div className="min-w-0">
                <p className="text-xs font-bold text-accent-600 uppercase tracking-wide">
                  {breakdownKeyLabel(key)}
                </p>
                <p className="text-sm text-gray-700 leading-relaxed">
                  {value}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Continue button */}
      <button
        onClick={onContinue}
        className="w-full flex items-center justify-center gap-2 py-3 bg-accent-600 text-white rounded-xl text-sm font-bold hover:bg-accent-700 active:scale-[0.98] transition-all duration-200 shadow-lg shadow-accent-200"
      >
        Got it — Let&apos;s practice
        <ArrowRight className="w-4 h-4" />
      </button>
    </div>
  )
}
