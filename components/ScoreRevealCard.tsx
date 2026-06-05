'use client'

import { useState, useEffect } from 'react'
import { CheckCircle, AlertCircle, TrendingUp } from 'lucide-react'
import Preppi from './Preppi'

interface ScoreRevealCardProps {
  score: number
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

function getScoreGradient(score: number): string {
  if (score >= 7) return 'from-emerald-500 to-teal-600'
  if (score >= 5) return 'from-amber-400 to-orange-500'
  return 'from-red-400 to-rose-500'
}

function getScoreColor(score: number): { ring: string; fill: string; text: string; bg: string } {
  if (score >= 7) return { ring: 'stroke-emerald-500', fill: 'text-emerald-600', text: 'text-emerald-700', bg: 'bg-emerald-50' }
  if (score >= 5) return { ring: 'stroke-amber-500', fill: 'text-amber-600', text: 'text-amber-700', bg: 'bg-amber-50' }
  return { ring: 'stroke-red-500', fill: 'text-red-500', text: 'text-red-700', bg: 'bg-red-50' }
}

export default function ScoreRevealCard({ score, likelihood, strengths = [], weaknesses = [] }: ScoreRevealCardProps) {
  const [revealed, setRevealed] = useState(false)
  const [displayScore, setDisplayScore] = useState(0)
  const [showDetails, setShowDetails] = useState(false)

  const colors = getScoreColor(score)
  const circumference = 2 * Math.PI * 44
  const progress = revealed ? ((score / 10) * circumference) : 0

  useEffect(() => {
    const t1 = setTimeout(() => setRevealed(true), 300)
    return () => clearTimeout(t1)
  }, [])

  useEffect(() => {
    if (!revealed) return
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
    <div className="overflow-hidden rounded-2xl border border-slate-200/60 bg-white shadow-[0_8px_30px_rgba(0,0,0,0.04)]">
      {/* Preppi reaction header — mobile only */}
      <div className="border-b border-slate-100 bg-slate-50/60 px-6 pb-4 pt-6 md:hidden">
        <Preppi
          message={getPreppiMessage(score, likelihood)}
          size="md"
          animate
        />
      </div>

      {/* Score reveal */}
      <div className="px-6 py-8 sm:px-8">
        <div className="flex flex-col sm:flex-row items-center gap-8">
          {/* Circular score */}
          <div className="relative shrink-0 rounded-2xl bg-slate-50/80 px-5 py-5">
            <svg width="120" height="120" className="-rotate-90">
              <circle
                cx="60" cy="60" r="44"
                fill="none"
                stroke="#f1f5f9"
                strokeWidth="8"
              />
              <circle
                cx="60" cy="60" r="44"
                fill="none"
                strokeWidth="8"
                strokeLinecap="round"
                className={`${colors.ring} transition-all duration-1000 ease-out`}
                style={{
                  strokeDasharray: circumference,
                  strokeDashoffset: circumference - progress,
                }}
              />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span className={`text-4xl font-black tabular-nums ${colors.fill}`}>
                {displayScore.toFixed(displayScore % 1 !== 0 ? 1 : 0)}
              </span>
              <span className="text-xs text-slate-400 font-bold">/ 10</span>
            </div>
          </div>

          {/* Label + likelihood */}
          <div className="flex-1 text-center sm:text-left">
            <p className="text-[11px] font-bold uppercase tracking-widest text-slate-400 mb-2">Round outcome</p>
            <h3 className={`mb-2 text-3xl font-black ${colors.fill}`}>{getScoreLabel(score)}</h3>
            <div className={`mb-4 inline-flex items-center gap-1.5 rounded-xl px-3.5 py-2 text-sm font-bold ${colors.bg} ${colors.text}`}>
              {likelihood === 'likely'
                ? <><CheckCircle className="w-4 h-4" />Likely to advance</>
                : <><AlertCircle className="w-4 h-4" />Needs improvement to advance</>
              }
            </div>
            <p className="text-sm leading-6 text-slate-500">
              {likelihood === 'likely'
                ? 'You cleared the HR Screen. Review your report and start the Hiring Manager interview.'
                : 'Use the practice drill below to tighten your answers. Retakes are quick.'}
            </p>
          </div>
        </div>

        {/* Strengths & weaknesses */}
        {showDetails && (strengths.length > 0 || weaknesses.length > 0) && (
          <div className="mt-6 grid gap-4 transition-all duration-300 sm:grid-cols-2">
            {strengths.length > 0 && (
              <div className="rounded-2xl border border-emerald-100 bg-gradient-to-br from-emerald-50 to-teal-50/50 p-5">
                <div className="flex items-center gap-2 mb-3">
                  <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-emerald-500 text-white">
                    <TrendingUp className="w-4 h-4" />
                  </div>
                  <span className="text-sm font-black text-emerald-800">What went well</span>
                </div>
                <ul className="space-y-2">
                  {strengths.slice(0, 3).map((s, i) => (
                    <li key={i} className="flex items-start gap-2 text-sm text-emerald-800">
                      <span className="text-emerald-500 mt-0.5 shrink-0 font-black">+</span>
                      <span>{s}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
            {weaknesses.length > 0 && (
              <div className="rounded-2xl border border-amber-100 bg-gradient-to-br from-amber-50 to-orange-50/50 p-5">
                <div className="flex items-center gap-2 mb-3">
                  <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-amber-500 text-white">
                    <AlertCircle className="w-4 h-4" />
                  </div>
                  <span className="text-sm font-black text-amber-800">Where to sharpen</span>
                </div>
                <ul className="space-y-2">
                  {weaknesses.slice(0, 3).map((w, i) => (
                    <li key={i} className="flex items-start gap-2 text-sm text-amber-800">
                      <span className="text-amber-500 mt-0.5 shrink-0 font-black">&rarr;</span>
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
