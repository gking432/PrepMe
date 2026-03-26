'use client'

import { useState, useEffect, useCallback, useMemo } from 'react'
import {
  X,
  Zap,
  Trophy,
  Star,
  ArrowRight,
  CheckCircle,
  AlertTriangle,
  FileText,
  RotateCcw,
  Crown,
  Flame,
  MessageSquare,
} from 'lucide-react'
import Confetti from '@/components/Confetti'
import Preppi, { PreppiSVG } from '@/components/Preppi'
import { useGameFeedback } from '@/hooks/useGameFeedback'
import LessonRoadmap from '@/components/LessonRoadmap'

// ── Props ────────────────────────────────────────────────────────────────────

interface PreppiWalkthroughProps {
  feedback: any
  structuredTranscript: any
  currentSessionData: any
  currentStage: string
  isPremium: boolean
  sessionId?: string
  onOpenDetailedReport: () => void
  onRetakeInterview: () => void
  onUnlockNextStage: () => void
  onSkipToResults: () => void
}

// ── Flow states ──────────────────────────────────────────────────────────────

type WalkthroughState =
  | 'intro'
  | 'score_reveal'
  | 'strength_card'
  | 'weakness_card'
  | 'fork'
  | 'lesson_roadmap'
  | 'complete'

// ── Helpers ──────────────────────────────────────────────────────────────────

function getSixAreas(feedback: any, stage: string) {
  switch (stage) {
    case 'hiring_manager': return feedback?.hiring_manager_six_areas
    case 'culture_fit':    return feedback?.culture_fit_six_areas
    case 'final_round':    return feedback?.final_round_six_areas
    default:               return feedback?.hr_screen_six_areas
  }
}

function getScoreColor(score: number) {
  if (score >= 7) return { ring: '#10b981', text: 'text-emerald-600', bg: 'bg-emerald-50', border: 'border-emerald-200' }
  if (score >= 5) return { ring: '#f59e0b', text: 'text-amber-600',   bg: 'bg-amber-50',   border: 'border-amber-200'   }
  return               { ring: '#f97316', text: 'text-orange-600',  bg: 'bg-orange-50',  border: 'border-orange-200'  }
}

function getScoreLabel(score: number) {
  if (score >= 9) return 'Outstanding!'
  if (score >= 7) return 'Strong!'
  if (score >= 5) return 'Getting There!'
  return 'Room to Grow!'
}

/** Deterministic male/female from sessionId — consistent per interview */
function getInterviewerGender(sessionId?: string): 'male' | 'female' {
  if (!sessionId) return 'male'
  const sum = sessionId.split('').reduce((acc, c) => acc + c.charCodeAt(0), 0)
  return sum % 2 === 0 ? 'female' : 'male'
}

const PREPPI_MESSAGES = {
  intro: "Hey! I've got your results! Let's see how you did!",
  scoreHigh: "Wow, great job! You really showed up for this one!",
  scoreMid:  "Nice work! A few areas to sharpen and you'll be crushing it!",
  scoreLow:  "This is exactly what practice is for. I've got you covered!",
  strength:  (criterion: string) => `You nailed ${criterion}! Keep that energy!`,
  weakness:  "Don't worry — I have the perfect practice for this!",
  fork:      "I'd recommend jumping into practice while it's fresh! Your detailed report is always saved.",
  complete:  "Look at you go! You've leveled up big time!",
}

// ── Badge definitions ────────────────────────────────────────────────────────

interface Badge {
  id: string
  name: string
  icon: string
  description: string
}

const BADGES: Badge[] = [
  { id: 'first_steps',   name: 'First Steps',   icon: '🎯', description: 'Completed your first walkthrough' },
  { id: 'quick_learner', name: 'Quick Learner', icon: '⚡', description: 'Passed a practice on first try' },
  { id: 'perfect_run',   name: 'Perfect Run',   icon: '🌟', description: 'All exercises correct in a lesson' },
  { id: 'comeback_kid',  name: 'Comeback Kid',  icon: '🔥', description: 'Improved a weak area' },
]

// ── Transcript Overlay ────────────────────────────────────────────────────────

interface TranscriptOverlayProps {
  question: string
  excerpt: string
  gender: 'male' | 'female'
  onClose: () => void
}

function TranscriptOverlay({ question, excerpt, gender, onClose }: TranscriptOverlayProps) {
  return (
    <div className="fixed inset-0 z-[60] bg-black/60 flex flex-col items-center justify-center px-5 py-8">
      <div className="w-full max-w-md">
        {/* Interviewer bubble — slides in from top */}
        <div className="flex items-start gap-3 mb-6 animate-slide-in-top">
          {/* Avatar */}
          <div
            className={`w-12 h-12 rounded-full flex items-center justify-center shrink-0 text-xl border-2 ${
              gender === 'female'
                ? 'bg-purple-100 border-purple-300'
                : 'bg-blue-100 border-blue-300'
            }`}
          >
            {gender === 'female' ? '👩' : '👨'}
          </div>
          <div className="flex-1">
            <p className={`text-xs font-bold uppercase tracking-wide mb-1 ${
              gender === 'female' ? 'text-purple-400' : 'text-blue-400'
            }`}>
              Interviewer
            </p>
            <div className="bg-white rounded-2xl rounded-tl-sm px-4 py-3 shadow-lg">
              <p className="text-sm text-gray-800 font-medium leading-relaxed">{question}</p>
            </div>
          </div>
        </div>

        {/* User bubble — slides in from bottom (delayed) */}
        <div className="flex items-start gap-3 flex-row-reverse mb-8 animate-slide-in-bottom">
          {/* Avatar */}
          <div className="w-12 h-12 rounded-full bg-gray-200 border-2 border-gray-300 flex items-center justify-center shrink-0 text-xl">
            🙂
          </div>
          <div className="flex-1">
            <p className="text-xs font-bold uppercase tracking-wide mb-1 text-right text-gray-400">
              You said
            </p>
            <div className="bg-amber-50 border border-amber-200 rounded-2xl rounded-tr-sm px-4 py-3 shadow-md">
              <p className="text-sm text-gray-700 italic leading-relaxed">
                &ldquo;{excerpt.length > 200 ? excerpt.substring(0, 200) + '…' : excerpt}&rdquo;
              </p>
            </div>
          </div>
        </div>

        {/* Got it button */}
        <button
          onClick={onClose}
          className="w-full btn-duo-green py-4 text-base animate-slide-up"
          style={{ animationDelay: '0.5s' }}
        >
          Got it — back to review
        </button>
      </div>
    </div>
  )
}

// ── Component ────────────────────────────────────────────────────────────────

export default function PreppiWalkthrough({
  feedback,
  structuredTranscript,
  currentSessionData,
  currentStage,
  isPremium,
  sessionId,
  onOpenDetailedReport,
  onRetakeInterview,
  onUnlockNextStage,
  onSkipToResults,
}: PreppiWalkthroughProps) {
  const { ding } = useGameFeedback()

  // Flow state
  const [state, setState]                   = useState<WalkthroughState>('intro')
  const [strengthIndex, setStrengthIndex]   = useState(0)
  const [weaknessIndex, setWeaknessIndex]   = useState(0)
  const [animKey, setAnimKey]               = useState(0)

  // Score reveal
  const [scoreRevealed, setScoreRevealed]   = useState(false)
  const [displayScore, setDisplayScore]     = useState(0)

  // XP
  const [xp, setXp]                         = useState(0)
  const [xpDelta, setXpDelta]               = useState<number | null>(null)

  // Confetti
  const [confettiActive, setConfettiActive] = useState(false)

  // Transcript overlay
  const [showTranscript, setShowTranscript] = useState(false)

  // Practice tracking (used in complete screen)
  const [passedAreas, setPassedAreas]       = useState<string[]>([])
  const [practicedCount, setPracticedCount] = useState(0)
  const [earnedBadges, setEarnedBadges]     = useState<Badge[]>([])
  const [totalXpFromPractice, setTotalXpFromPractice] = useState(0)

  // Data
  const sixAreas      = useMemo(() => getSixAreas(feedback, currentStage), [feedback, currentStage])
  const strengths     = useMemo(() => sixAreas?.what_went_well   || [], [sixAreas])
  const weaknesses    = useMemo(() => sixAreas?.what_needs_improve || [], [sixAreas])
  const overallScore  = feedback?.overall_score || 0
  const scoreColors   = getScoreColor(overallScore)
  const interviewerGender = useMemo(() => getInterviewerGender(sessionId), [sessionId])

  // Progress (only for the report walkthrough, not the practice phase)
  const totalSteps    = 1 + 1 + strengths.length + weaknesses.length + 1
  const currentStep   = useMemo(() => {
    switch (state) {
      case 'intro':          return 0
      case 'score_reveal':   return 1
      case 'strength_card':  return 2 + strengthIndex
      case 'weakness_card':  return 2 + strengths.length + weaknessIndex
      case 'fork':           return totalSteps - 1
      default:               return totalSteps
    }
  }, [state, strengthIndex, weaknessIndex, strengths.length, totalSteps])

  const progressPercent = totalSteps > 0 ? (currentStep / totalSteps) * 100 : 0

  // Check localStorage for skip
  useEffect(() => {
    if (sessionId) {
      const seen = localStorage.getItem(`walkthrough_seen_${sessionId}`)
      if (seen === 'true') onSkipToResults()
    }
  }, [sessionId, onSkipToResults])

  // Score reveal animation
  useEffect(() => {
    if (state !== 'score_reveal') return
    const t = setTimeout(() => {
      setScoreRevealed(true)
      let current = 0
      const step = overallScore / 20
      const interval = setInterval(() => {
        current = Math.min(current + step, overallScore)
        setDisplayScore(Math.round(current * 10) / 10)
        if (current >= overallScore) {
          setDisplayScore(overallScore)
          clearInterval(interval)
          ding()
        }
      }, 40)
      return () => clearInterval(interval)
    }, 400)
    return () => clearTimeout(t)
  }, [state, overallScore, ding])

  // Award XP with animation
  const awardXp = useCallback((amount: number) => {
    setXp(prev => prev + amount)
    setXpDelta(amount)
    setTimeout(() => setXpDelta(null), 1100)
  }, [])

  const markSeen = useCallback(() => {
    if (sessionId) localStorage.setItem(`walkthrough_seen_${sessionId}`, 'true')
  }, [sessionId])

  // Advance to next state
  const advance = useCallback(() => {
    setAnimKey(k => k + 1)
    switch (state) {
      case 'intro':
        setState('score_reveal')
        break
      case 'score_reveal':
        awardXp(10)
        if (strengths.length > 0) {
          setState('strength_card'); setStrengthIndex(0)
        } else if (weaknesses.length > 0) {
          setState('weakness_card'); setWeaknessIndex(0)
        } else {
          setState('fork')
        }
        break
      case 'strength_card':
        awardXp(5)
        if (strengthIndex < strengths.length - 1) {
          setStrengthIndex(i => i + 1)
        } else if (weaknesses.length > 0) {
          setState('weakness_card'); setWeaknessIndex(0)
        } else {
          setState('fork')
        }
        break
      case 'weakness_card':
        awardXp(5)
        if (weaknessIndex < weaknesses.length - 1) {
          setWeaknessIndex(i => i + 1)
        } else {
          setState('fork'); markSeen()
        }
        break
      case 'fork':
        break
    }
  }, [state, strengthIndex, weaknessIndex, strengths.length, weaknesses.length, awardXp, markSeen])

  // When LessonRoadmap completes all practice
  const handleAllPracticeComplete = useCallback((totalXp: number) => {
    setTotalXpFromPractice(totalXp - xp)
    setConfettiActive(true)
    setTimeout(() => setConfettiActive(false), 3500)
    ding()
    setEarnedBadges(prev => {
      const next = [...prev]
      if (!next.find(b => b.id === 'first_steps')) next.push(BADGES.find(b => b.id === 'first_steps')!)
      return next
    })
    setState('complete')
    awardXp(totalXp - xp > 0 ? totalXp - xp : 0)
  }, [xp, ding, awardXp])

  // Preppi message
  const preppiMessage = useMemo(() => {
    switch (state) {
      case 'intro':        return PREPPI_MESSAGES.intro
      case 'score_reveal':
        if (!scoreRevealed)   return 'Drumroll please…'
        if (overallScore >= 7) return PREPPI_MESSAGES.scoreHigh
        if (overallScore >= 5) return PREPPI_MESSAGES.scoreMid
        return PREPPI_MESSAGES.scoreLow
      case 'strength_card': return PREPPI_MESSAGES.strength(strengths[strengthIndex]?.criterion || 'this area')
      case 'weakness_card': return PREPPI_MESSAGES.weakness
      case 'fork':          return PREPPI_MESSAGES.fork
      case 'complete':      return PREPPI_MESSAGES.complete
      default:              return ''
    }
  }, [state, scoreRevealed, overallScore, strengthIndex, strengths])

  // ── Lesson Roadmap takeover ────────────────────────────────────────────────

  if (state === 'lesson_roadmap') {
    return (
      <LessonRoadmap
        weaknesses={weaknesses}
        sessionId={sessionId}
        currentStage={currentStage}
        priorXp={xp}
        onAllComplete={handleAllPracticeComplete}
        onViewReport={() => { markSeen(); onOpenDetailedReport() }}
        onClose={() => setState('fork')}
      />
    )
  }

  // ── Score ring math ────────────────────────────────────────────────────────

  const circumference = 2 * Math.PI * 44
  const scoreProgress = scoreRevealed ? (overallScore / 10) * circumference : 0

  // ── Current weakness for transcript ───────────────────────────────────────

  const currentWeakness     = weaknesses[weaknessIndex]
  const transcriptQuestion  = currentWeakness?.evidence?.[0]?.question || ''
  const transcriptExcerpt   = currentWeakness?.evidence?.[0]?.excerpt  || ''
  const hasTranscriptData   = !!(transcriptQuestion && transcriptExcerpt)

  // ── Main render ────────────────────────────────────────────────────────────

  return (
    <div className="fixed inset-0 z-50 bg-white flex flex-col">
      <Confetti active={confettiActive} />

      {/* Transcript overlay */}
      {showTranscript && hasTranscriptData && (
        <TranscriptOverlay
          question={transcriptQuestion}
          excerpt={transcriptExcerpt}
          gender={interviewerGender}
          onClose={() => setShowTranscript(false)}
        />
      )}

      {/* ── Top Bar ── */}
      <div className="shrink-0 px-4 py-3 flex items-center gap-3 border-b border-gray-100">
        <button
          onClick={onSkipToResults}
          className="text-gray-300 hover:text-gray-500 transition-colors p-1"
          aria-label="Skip walkthrough"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Progress bar */}
        <div className="flex-1 h-3 bg-gray-100 rounded-full overflow-hidden">
          <div
            className="h-full rounded-full transition-all duration-700 ease-out animate-progress-fill"
            style={{ width: `${progressPercent}%`, backgroundColor: '#58CC02' }}
          />
        </div>

        {/* XP counter */}
        <div className="relative flex items-center gap-1.5 shrink-0">
          <Flame className="w-5 h-5 text-orange-400" />
          <span className={`text-sm font-extrabold text-orange-500 tabular-nums ${xpDelta ? 'animate-xp-glow' : ''}`}>
            {xp}
          </span>
          {xpDelta && (
            <span className="animate-fly-up text-xs font-bold text-orange-400 absolute ml-8 pointer-events-none">
              +{xpDelta}
            </span>
          )}
        </div>
      </div>

      {/* ── Main Content ── */}
      <div className="flex-1 overflow-y-auto">
        <div className="flex min-h-full">

          {/* Desktop sidebar */}
          <div className="hidden md:flex flex-col items-center justify-center w-48 lg:w-56 shrink-0 bg-gradient-to-b from-accent-50 to-white border-r border-accent-100 p-6">
            <div className="w-24 h-24 lg:w-32 lg:h-32 animate-preppi-bounce">
              <PreppiSVG />
            </div>
            <div className="mt-4 bg-white border border-gray-200 rounded-2xl rounded-bl-sm px-4 py-3 shadow-sm animate-bubble-pop max-w-[180px]">
              <p className="text-xs text-gray-700 leading-snug">{preppiMessage}</p>
            </div>
          </div>

          {/* Content column */}
          <div className="flex-1 flex flex-col items-center justify-center px-5 py-8 md:px-12 md:py-12">

            {/* Mobile Preppi */}
            <div className="md:hidden mb-6" key={`preppi-${animKey}`}>
              <Preppi message={preppiMessage} size="lg" showOnDesktop={false} className="animate-preppi-bounce" />
            </div>

            {/* ── INTRO ── */}
            {state === 'intro' && (
              <div className="w-full max-w-md text-center animate-slide-up" key={`intro-${animKey}`}>
                <div className="w-32 h-32 mx-auto mb-6 hidden md:block">
                  <div className="w-full h-full bg-accent-100 rounded-full flex items-center justify-center">
                    <span className="text-5xl">👋</span>
                  </div>
                </div>
                <h1 className="text-2xl md:text-3xl font-extrabold text-gray-900 mb-3">
                  Your Results Are In!
                </h1>
                <p className="text-gray-500 text-sm md:text-base mb-2">
                  Let&apos;s walk through how you did and get you ready for the next round.
                </p>
              </div>
            )}

            {/* ── SCORE REVEAL ── */}
            {state === 'score_reveal' && (
              <div className="w-full max-w-md text-center animate-slide-up" key={`score-${animKey}`}>
                <div className="relative inline-flex items-center justify-center mb-6">
                  <svg className="w-36 h-36 md:w-44 md:h-44 -rotate-90" viewBox="0 0 100 100">
                    <circle cx="50" cy="50" r="44" stroke="#e5e7eb" strokeWidth="8" fill="none" />
                    <circle
                      cx="50" cy="50" r="44"
                      stroke={scoreColors.ring} strokeWidth="8" fill="none"
                      strokeLinecap="round"
                      strokeDasharray={circumference}
                      strokeDashoffset={circumference - scoreProgress}
                      style={{ transition: 'stroke-dashoffset 1.5s ease-out' }}
                    />
                  </svg>
                  <div className="absolute inset-0 flex flex-col items-center justify-center">
                    <span className={`text-4xl md:text-5xl font-extrabold ${scoreColors.text}`}>
                      {displayScore}
                    </span>
                    <span className="text-xs text-gray-400 font-semibold">/10</span>
                  </div>
                </div>
                <h2 className={`text-xl md:text-2xl font-extrabold mb-2 ${scoreColors.text}`}>
                  {getScoreLabel(overallScore)}
                </h2>
                <p className="text-sm text-gray-500 max-w-xs mx-auto">
                  {feedback?.detailed_feedback
                    ? feedback.detailed_feedback.substring(0, 120) + '…'
                    : 'Your performance has been analyzed across multiple areas.'}
                </p>
              </div>
            )}

            {/* ── STRENGTH CARD ── */}
            {state === 'strength_card' && strengths[strengthIndex] && (
              <div className="w-full max-w-md animate-slide-in-right" key={`str-${strengthIndex}-${animKey}`}>
                <div className="flex items-center gap-2 mb-4">
                  <div className="w-8 h-8 bg-emerald-100 rounded-full flex items-center justify-center">
                    <CheckCircle className="w-5 h-5 text-emerald-600" />
                  </div>
                  <p className="text-xs font-bold uppercase tracking-wide text-emerald-500">
                    Strength {strengthIndex + 1} of {strengths.length}
                  </p>
                </div>
                <div className="bg-white border-2 border-emerald-200 rounded-2xl p-6 shadow-lg">
                  <h3 className="text-lg font-extrabold text-gray-900 mb-2">
                    {strengths[strengthIndex].criterion}
                  </h3>
                  {strengths[strengthIndex].score != null && (
                    <div className="flex items-center gap-2 mb-3">
                      <div className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-emerald-500 rounded-full transition-all duration-700"
                          style={{ width: `${strengths[strengthIndex].score * 10}%` }}
                        />
                      </div>
                      <span className="text-xs font-bold text-emerald-600 tabular-nums">
                        {strengths[strengthIndex].score}/10
                      </span>
                    </div>
                  )}
                  <p className="text-sm text-gray-600 leading-relaxed">
                    {strengths[strengthIndex].feedback}
                  </p>
                  {strengths[strengthIndex].evidence?.[0]?.excerpt && (
                    <div className="mt-4 bg-emerald-50 rounded-xl p-3 border border-emerald-100">
                      <p className="text-xs text-emerald-600 font-semibold mb-1">What you said</p>
                      <p className="text-xs text-emerald-800 italic leading-relaxed">
                        &ldquo;{strengths[strengthIndex].evidence[0].excerpt.substring(0, 150)}…&rdquo;
                      </p>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* ── WEAKNESS CARD ── */}
            {state === 'weakness_card' && currentWeakness && (
              <div className="w-full max-w-md animate-slide-in-right" key={`weak-${weaknessIndex}-${animKey}`}>
                <div className="flex items-center gap-2 mb-4">
                  <div className="w-8 h-8 bg-amber-100 rounded-full flex items-center justify-center">
                    <AlertTriangle className="w-5 h-5 text-amber-600" />
                  </div>
                  <p className="text-xs font-bold uppercase tracking-wide text-amber-500">
                    Area to Improve {weaknessIndex + 1} of {weaknesses.length}
                  </p>
                </div>

                <div className="bg-white border-2 border-amber-200 rounded-2xl p-6 shadow-lg">
                  <h3 className="text-lg font-extrabold text-gray-900 mb-2">
                    {currentWeakness.criterion}
                  </h3>

                  {currentWeakness.score != null && (
                    <div className="flex items-center gap-2 mb-3">
                      <div className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden">
                        <div
                          className={`h-full rounded-full transition-all duration-700 ${
                            currentWeakness.score >= 5 ? 'bg-amber-400' : 'bg-orange-400'
                          }`}
                          style={{ width: `${currentWeakness.score * 10}%` }}
                        />
                      </div>
                      <span className="text-xs font-bold text-amber-600 tabular-nums">
                        {currentWeakness.score}/10
                      </span>
                    </div>
                  )}

                  <p className="text-sm text-gray-600 leading-relaxed mb-4">
                    {currentWeakness.feedback}
                  </p>

                  {/* View Transcript button */}
                  {hasTranscriptData && (
                    <button
                      onClick={() => setShowTranscript(true)}
                      className="flex items-center gap-2 text-xs font-semibold text-primary-600 hover:text-primary-700 mb-4 transition-colors"
                    >
                      <MessageSquare className="w-3.5 h-3.5" />
                      See what you said
                    </button>
                  )}

                  {/* Practice teaser */}
                  <div className="bg-accent-50 rounded-xl p-3 border border-accent-100">
                    <div className="flex items-center gap-2">
                      <Zap className="w-4 h-4 text-accent-500" />
                      <p className="text-xs text-accent-700 font-semibold">
                        Practice lesson ready for this skill!
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* ── FORK ── */}
            {state === 'fork' && (
              <div className="w-full max-w-md text-center animate-slide-up" key={`fork-${animKey}`}>
                <div className="w-20 h-20 mx-auto mb-5 bg-accent-100 rounded-full flex items-center justify-center">
                  <Star className="w-10 h-10 text-accent-600" />
                </div>
                <h2 className="text-xl md:text-2xl font-extrabold text-gray-900 mb-2">
                  Review Complete!
                </h2>
                <p className="text-sm text-gray-500 mb-8 max-w-xs mx-auto">
                  Your detailed report is saved. Ready to level up your weak areas?
                </p>

                {weaknesses.length > 0 && (
                  <button
                    onClick={() => { markSeen(); setState('lesson_roadmap') }}
                    className="w-full btn-duo-green py-4 text-base mb-3 flex items-center justify-center gap-2"
                  >
                    <Zap className="w-5 h-5" />
                    Let&apos;s Start Practicing!
                  </button>
                )}

                <button
                  onClick={() => { markSeen(); onOpenDetailedReport() }}
                  className="w-full py-3.5 text-sm font-bold text-gray-500 border-2 border-gray-200 rounded-2xl hover:bg-gray-50 transition-all flex items-center justify-center gap-2"
                >
                  <FileText className="w-4 h-4" />
                  View Detailed Report
                </button>

                {weaknesses.length === 0 && (
                  <button
                    onClick={() => { markSeen(); onSkipToResults() }}
                    className="w-full mt-3 py-3.5 text-sm font-bold text-primary-600 border-2 border-primary-200 rounded-2xl hover:bg-primary-50 transition-all flex items-center justify-center gap-2"
                  >
                    <ArrowRight className="w-4 h-4" />
                    Continue
                  </button>
                )}
              </div>
            )}

            {/* ── COMPLETE ── */}
            {state === 'complete' && (
              <div className="w-full max-w-md text-center animate-slide-up" key={`complete-${animKey}`}>
                <div className="w-24 h-24 mx-auto mb-5 bg-emerald-100 rounded-full flex items-center justify-center ring-4 ring-emerald-200 animate-badge-reveal">
                  <Trophy className="w-12 h-12 text-emerald-600" />
                </div>
                <h2 className="text-2xl md:text-3xl font-extrabold text-gray-900 mb-2">
                  Session Complete!
                </h2>
                <p className="text-sm text-gray-500 mb-6">
                  You&apos;ve reviewed your feedback and practiced your weak areas.
                </p>

                {/* Stats */}
                <div className="flex items-center justify-center gap-6 mb-6">
                  <div className="text-center">
                    <p className="text-2xl font-extrabold text-orange-500">{xp}</p>
                    <p className="text-xs text-gray-400 font-semibold">Total XP</p>
                  </div>
                  <div className="w-px h-10 bg-gray-200" />
                  <div className="text-center">
                    <p className="text-2xl font-extrabold text-emerald-600">
                      {passedAreas.length}/{weaknesses.length}
                    </p>
                    <p className="text-xs text-gray-400 font-semibold">Skills Passed</p>
                  </div>
                  <div className="w-px h-10 bg-gray-200" />
                  <div className="text-center">
                    <p className="text-2xl font-extrabold text-accent-600">{practicedCount || weaknesses.length}</p>
                    <p className="text-xs text-gray-400 font-semibold">Practiced</p>
                  </div>
                </div>

                {/* Badges */}
                {earnedBadges.length > 0 && (
                  <div className="mb-6">
                    <p className="text-xs font-bold uppercase tracking-wide text-gray-400 mb-3">Badges Earned</p>
                    <div className="flex items-center justify-center gap-3">
                      {earnedBadges.map((badge, i) => (
                        <div
                          key={badge.id}
                          className="flex flex-col items-center animate-badge-reveal"
                          style={{ animationDelay: `${i * 200}ms` }}
                        >
                          <div className="w-14 h-14 bg-amber-50 border-2 border-amber-200 rounded-full flex items-center justify-center text-2xl shadow-sm">
                            {badge.icon}
                          </div>
                          <span className="text-[10px] font-bold text-gray-500 mt-1">{badge.name}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Actions */}
                <div className="space-y-3">
                  <button
                    onClick={() => { markSeen(); onOpenDetailedReport() }}
                    className="w-full btn-duo-green py-4 text-base flex items-center justify-center gap-2"
                  >
                    <FileText className="w-5 h-5" />
                    View Detailed Report
                  </button>
                  <button
                    onClick={onRetakeInterview}
                    className="w-full py-3.5 text-sm font-bold text-gray-500 border-2 border-gray-200 rounded-2xl hover:bg-gray-50 transition-all flex items-center justify-center gap-2"
                  >
                    <RotateCcw className="w-4 h-4" />
                    Retake Interview
                  </button>
                  {!isPremium && (
                    <button
                      onClick={onUnlockNextStage}
                      className="w-full py-3.5 text-sm font-bold text-primary-600 border-2 border-primary-200 rounded-2xl hover:bg-primary-50 transition-all flex items-center justify-center gap-2"
                    >
                      <Crown className="w-4 h-4" />
                      Unlock Next Stage
                    </button>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ── Bottom-anchored Continue Button ── */}
      {state !== 'fork' && state !== 'complete' && (
        <div className="shrink-0 px-5 py-4 md:px-12 border-t border-gray-100 bg-white">
          <div className="max-w-md mx-auto">
            <button
              onClick={advance}
              className="w-full btn-duo-green py-4 text-base flex items-center justify-center gap-2"
            >
              {state === 'intro' ? "Let's Go!" : 'Continue'}
              <ArrowRight className="w-5 h-5" />
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
