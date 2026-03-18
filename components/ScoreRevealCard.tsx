'use client'

import { useState, useEffect } from 'react'
import { CheckCircle, AlertCircle, TrendingUp } from 'lucide-react'
import Preppi from './Preppi'

interface ScoreRevealCardProps {
  score: number // 1-10
  likelihood: 'likely' | 'unlikely' | null
  strengths?: string[]
  weaknesses?: string[]
}

function getPreppiMessage(score: number, likelihood: string | null): string {
  if (!likelihood) return "Your results are in. Let's see where you stand."
  if (score >= 9) return "That was impressive. Interviewers notice confidence like that."
  if (score >= 7) return "Solid performance. A few sharper answers and you're there."
  if (score >= 5) return "Good foundation. The practice section will sharpen the edges."
  return "This is exactly what practice is for. You'll see the difference."
}

function getScoreLabel(score: number): string {
  if (score >= 9) return 'Outstanding'
  if (score >= 7) return 'Strong'
  if (score >= 5) return 'Developing'
  return 'Needs Work'
}

function getScoreColor(score: number): { ring: string; fill: string; text: string; bg: string } {
  if (score >= 7) return { ring: 'stroke-emerald-500', fill: 'text-emerald-600', text: 'text-emerald-700', bg: 'bg-emerald-50' }
  if (score >= 5) return { ring: 'stroke-amber-500', fill: 'text-amber-600', text: 'text-amber-700', bg: 'bg-amber-50' }
  return { ring: 'stroke-orange-500', fill: 'text-orange-600', text: 'text-orange-700', bg: 'bg-orange-50' }
}

export default function ScoreRevealCard({ score, likelihood, strengths = [], weaknesses = [] }: ScoreRevealCardProps) {
  const [revealed, setRevealed] = useState(false)
  const [displayScore, setDisplayScore] = useState(0)
  const [showDetails, setShowDetails] = useState(false)

  const colors = getScoreColor(score)
  const circumference = 2 * Math.PI * 44 // r=44
  const progress = revealed ? ((score / 10) * circumference) : 0

  useEffect(() => {
    // Trigger reveal after mount
    const t1 = setTimeout(() => setRevealed(true), 300)
    return () => clearTimeout(t1)
  }, [])

  useEffect(() => {
    if (!revealed) return
    // Animate the number counting up
    let current = 0
    const step = score / 20
    const interval = setInterval(() => {
      current = Math.min(current + step, score)
      setDisplayScore(Math.round(current * 10) / 10)
      if (current >= score) {
        setDisplayScore(score)
        clearInterval(interval)
        setTimeout(() => setShowDetails(true), 200)
      }
    }, 40)
    return () => clearInterval(interval)
  }, [revealed, score])

  if (!likelihood && score === 0) return null

  return (
    <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
      {/* Preppi reaction header */}
      <div className="px-6 pt-6 pb-4 bg-gray-50 border-b border-gray-100">
        <Preppi
          message={getPreppiMessage(score, likelihood)}
          size="md"
          animate
        />
      </div>

      {/* Score reveal */}
      <div className="px-6 py-8">
        <div className="flex flex-col sm:flex-row items-center gap-8">
          {/* Circular score */}
          <div className="relative shrink-0">
            <svg width="120" height="120" className="-rotate-90">
              {/* Background ring */}
              <circle
                cx="60" cy="60" r="44"
                fill="none"
                stroke="#f3f4f6"
                strokeWidth="10"
              />
              {/* Score ring */}
              <circle
                cx="60" cy="60" r="44"
                fill="none"
                strokeWidth="10"
                strokeLinecap="round"
                className={`${colors.ring} transition-all duration-1000 ease-out`}
                style={{
                  strokeDasharray: circumference,
                  strokeDashoffset: circumference - progress,
                }}
              />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span className={`text-3xl font-bold tabular-nums ${colors.fill}`}>
                {displayScore.toFixed(displayScore % 1 !== 0 ? 1 : 0)}
              </span>
              <span className="text-xs text-gray-400 font-medium">/ 10</span>
            </div>
          </div>

          {/* Label + likelihood */}
          <div className="flex-1 text-center sm:text-left">
            <h3 className={`text-2xl font-bold mb-1 ${colors.fill}`}>{getScoreLabel(score)}</h3>
            <div className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium ${colors.bg} ${colors.text} mb-4`}>
              {likelihood === 'likely'
                ? <><CheckCircle className="w-4 h-4" />Likely to advance</>
                : <><AlertCircle className="w-4 h-4" />Needs improvement to advance</>
              }
            </div>
            <p className="text-sm text-gray-500 leading-relaxed">
              {likelihood === 'likely'
                ? 'You cleared the HR Screen. Review your report and start the Hiring Manager interview.'
                : 'Use the practice drill below to tighten your answers. Retakes are quick.'}
            </p>
          </div>
        </div>

        {/* Strengths & weaknesses */}
        {showDetails && (strengths.length > 0 || weaknesses.length > 0) && (
          <div className={`mt-6 grid sm:grid-cols-2 gap-4 transition-all duration-300`}>
            {strengths.length > 0 && (
              <div className="bg-emerald-50 rounded-xl p-4">
                <div className="flex items-center gap-2 mb-3">
                  <TrendingUp className="w-4 h-4 text-emerald-600" />
                  <span className="text-sm font-semibold text-emerald-700">What went well</span>
                </div>
                <ul className="space-y-1.5">
                  {strengths.slice(0, 3).map((s, i) => (
                    <li key={i} className="flex items-start gap-2 text-sm text-emerald-800">
                      <span className="text-emerald-500 mt-0.5 shrink-0">✓</span>
                      <span>{s}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
            {weaknesses.length > 0 && (
              <div className="bg-amber-50 rounded-xl p-4">
                <div className="flex items-center gap-2 mb-3">
                  <AlertCircle className="w-4 h-4 text-amber-600" />
                  <span className="text-sm font-semibold text-amber-700">Where to sharpen</span>
                </div>
                <ul className="space-y-1.5">
                  {weaknesses.slice(0, 3).map((w, i) => (
                    <li key={i} className="flex items-start gap-2 text-sm text-amber-800">
                      <span className="text-amber-500 mt-0.5 shrink-0">→</span>
                      <span>{w}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
