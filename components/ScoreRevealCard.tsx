'use client'

import { useState, useEffect } from 'react'
import { CheckCircle, AlertCircle, TrendingUp, Target, Zap } from 'lucide-react'
import Preppi from './Preppi'

interface ScoreRevealCardProps {
  score: number
  likelihood: 'likely' | 'unlikely' | null
  strengths?: string[]
  weaknesses?: string[]
  role?: string
  company?: string
  strongCount?: number
  flaggedCount?: number
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

function getVerdict(score: number, likelihood: string | null): string {
  if (likelihood === 'likely' || score >= 7)
    return "You'd likely advance past this round. Carry forward your strengths and patch the gaps before the next interviewer."
  if (score >= 5)
    return "Close to passing, but the flagged issues would make a real interviewer hesitate. Tighten those answers first."
  return "This round needs repair before moving forward. The good news: every issue below is fixable with practice."
}

function getScoreColor(score: number): { ring: string; fill: string; text: string; bg: string; gradient: string } {
  if (score >= 7) return { ring: 'stroke-emerald-500', fill: 'text-emerald-600', text: 'text-emerald-700', bg: 'bg-emerald-50', gradient: 'from-emerald-500 to-teal-600' }
  if (score >= 5) return { ring: 'stroke-amber-500', fill: 'text-amber-600', text: 'text-amber-700', bg: 'bg-amber-50', gradient: 'from-amber-400 to-orange-500' }
  return { ring: 'stroke-red-500', fill: 'text-red-500', text: 'text-red-700', bg: 'bg-red-50', gradient: 'from-red-400 to-rose-500' }
}

export default function ScoreRevealCard({
  score,
  likelihood,
  strengths = [],
  weaknesses = [],
  role,
  company,
  strongCount,
  flaggedCount,
}: ScoreRevealCardProps) {
  const [revealed, setRevealed] = useState(false)
  const [displayScore, setDisplayScore] = useState(0)
  const [showDetails, setShowDetails] = useState(false)

  const colors = getScoreColor(score)
  const circumference = 2 * Math.PI * 44
  const progress = revealed ? ((score / 10) * circumference) : 0

  const resolvedStrongCount = strongCount ?? strengths.length
  const resolvedFlaggedCount = flaggedCount ?? weaknesses.length

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

  const contextLine = role && company
    ? `${role} at ${company}`
    : role || company || null

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

          {/* Label + verdict */}
          <div className="flex-1 text-center sm:text-left">
            {contextLine && (
              <p className="text-[11px] font-bold uppercase tracking-widest text-slate-400 mb-1">{contextLine}</p>
            )}
            <h3 className={`mb-2 text-3xl font-black ${colors.fill}`}>{getScoreLabel(score)}</h3>
            <div className={`mb-3 inline-flex items-center gap-1.5 rounded-xl px-3.5 py-2 text-sm font-bold ${colors.bg} ${colors.text}`}>
              {likelihood === 'likely'
                ? <><CheckCircle className="w-4 h-4" />Likely to advance</>
                : <><AlertCircle className="w-4 h-4" />Needs improvement to advance</>
              }
            </div>
            <p className="text-sm leading-6 text-slate-500">
              {getVerdict(score, likelihood)}
            </p>
          </div>
        </div>

        {/* Stats row */}
        {showDetails && (resolvedStrongCount > 0 || resolvedFlaggedCount > 0) && (
          <div className="mt-6 grid grid-cols-3 gap-3">
            <div className="rounded-xl border border-emerald-100 bg-emerald-50/60 px-4 py-3 text-center">
              <div className="flex items-center justify-center gap-1.5 mb-1">
                <TrendingUp className="w-3.5 h-3.5 text-emerald-600" />
                <span className="text-[10px] font-bold uppercase tracking-widest text-emerald-600">Strong</span>
              </div>
              <span className="text-2xl font-black text-emerald-700">{resolvedStrongCount}</span>
            </div>
            <div className="rounded-xl border border-amber-100 bg-amber-50/60 px-4 py-3 text-center">
              <div className="flex items-center justify-center gap-1.5 mb-1">
                <Target className="w-3.5 h-3.5 text-amber-600" />
                <span className="text-[10px] font-bold uppercase tracking-widest text-amber-600">Flagged</span>
              </div>
              <span className="text-2xl font-black text-amber-700">{resolvedFlaggedCount}</span>
            </div>
            <div className="rounded-xl border border-slate-200 bg-slate-50/60 px-4 py-3 text-center">
              <div className="flex items-center justify-center gap-1.5 mb-1">
                <Zap className="w-3.5 h-3.5 text-accent-600" />
                <span className="text-[10px] font-bold uppercase tracking-widest text-accent-600">Ready</span>
              </div>
              <span className={`text-2xl font-black ${likelihood === 'likely' ? 'text-emerald-700' : 'text-amber-700'}`}>
                {likelihood === 'likely' ? 'Yes' : 'Soon'}
              </span>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
