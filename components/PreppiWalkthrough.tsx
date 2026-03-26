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
} from 'lucide-react'
import Confetti from '@/components/Confetti'
import Preppi, { PreppiSVG } from '@/components/Preppi'
import { useGameFeedback } from '@/hooks/useGameFeedback'
import PracticeLessonFlow from '@/components/PracticeLessonFlow'
import { getBundleForRootCause, getRootCauseForCriterion } from '@/lib/practice-bundles'

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
  | 'practicing'
  | 'practice_transition'
  | 'complete'

// ── Helpers ──────────────────────────────────────────────────────────────────

function getSixAreas(feedback: any, stage: string) {
  switch (stage) {
    case 'hiring_manager': return feedback?.hiring_manager_six_areas
    case 'culture_fit': return feedback?.culture_fit_six_areas
    case 'final_round': return feedback?.final_round_six_areas
    default: return feedback?.hr_screen_six_areas
  }
}

function getScoreColor(score: number) {
  if (score >= 7) return { ring: '#10b981', text: 'text-emerald-600', bg: 'bg-emerald-50', border: 'border-emerald-200' }
  if (score >= 5) return { ring: '#f59e0b', text: 'text-amber-600', bg: 'bg-amber-50', border: 'border-amber-200' }
  return { ring: '#f97316', text: 'text-orange-600', bg: 'bg-orange-50', border: 'border-orange-200' }
}

function getScoreLabel(score: number) {
  if (score >= 9) return 'Outstanding!'
  if (score >= 7) return 'Strong!'
  if (score >= 5) return 'Getting There!'
  return 'Room to Grow!'
}

const PREPPI_MESSAGES = {
  intro: "Hey! I've got your results! Let's see how you did!",
  scoreHigh: "Wow, great job! You really showed up for this one!",
  scoreMid: "Nice work! A few areas to sharpen and you'll be crushing it!",
  scoreLow: "This is exactly what practice is for. I've got you covered!",
  strength: (criterion: string) => `You nailed ${criterion}! Keep that energy!`,
  weakness: "Don't worry — I have the perfect practice for this!",
  fork: "I'd recommend jumping into practice while it's fresh! Your detailed report is always saved.",
  practiceTransition: "Great work! Ready for the next skill?",
  complete: "Look at you go! You've leveled up big time!",
}

// ── Badge definitions ────────────────────────────────────────────────────────

interface Badge {
  id: string
  name: string
  icon: string
  description: string
}

const BADGES: Badge[] = [
  { id: 'first_steps', name: 'First Steps', icon: '🎯', description: 'Completed your first walkthrough' },
  { id: 'quick_learner', name: 'Quick Learner', icon: '⚡', description: 'Passed a practice on first try' },
  { id: 'perfect_run', name: 'Perfect Run', icon: '🌟', description: 'All exercises correct in a lesson' },
  { id: 'comeback_kid', name: 'Comeback Kid', icon: '🔥', description: 'Improved a weak area' },
]

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
  const [state, setState] = useState<WalkthroughState>('intro')
  const [strengthIndex, setStrengthIndex] = useState(0)
  const [weaknessIndex, setWeaknessIndex] = useState(0)
  const [practiceIndex, setPracticeIndex] = useState(0)
  const [animKey, setAnimKey] = useState(0) // Forces re-animation on card change

  // Score reveal
  const [scoreRevealed, setScoreRevealed] = useState(false)
  const [displayScore, setDisplayScore] = useState(0)

  // XP
  const [xp, setXp] = useState(0)
  const [xpDelta, setXpDelta] = useState<number | null>(null)

  // Confetti
  const [confettiActive, setConfettiActive] = useState(false)

  // Practice tracking
  const [practicedAreas, setPracticedAreas] = useState<string[]>([])
  const [passedAreas, setPassedAreas] = useState<string[]>([])
  const [practiceXp, setPracticeXp] = useState(0)

  // Badges earned this session
  const [earnedBadges, setEarnedBadges] = useState<Badge[]>([])

  // Data
  const sixAreas = useMemo(() => getSixAreas(feedback, currentStage), [feedback, currentStage])
  const strengths = useMemo(() => sixAreas?.what_went_well || [], [sixAreas])
  const weaknesses = useMemo(() => sixAreas?.what_needs_improve || [], [sixAreas])
  const overallScore = feedback?.overall_score || 0
  const scoreColors = getScoreColor(overallScore)

  // Progress calculation
  const totalSteps = 1 + 1 + strengths.length + weaknesses.length + 1 // intro + score + strengths + weaknesses + fork
  const currentStep = useMemo(() => {
    switch (state) {
      case 'intro': return 0
      case 'score_reveal': return 1
      case 'strength_card': return 2 + strengthIndex
      case 'weakness_card': return 2 + strengths.length + weaknessIndex
      case 'fork': return totalSteps - 1
      default: return totalSteps
    }
  }, [state, strengthIndex, weaknessIndex, strengths.length, totalSteps])

  const progressPercent = totalSteps > 0 ? (currentStep / totalSteps) * 100 : 0

  // Check localStorage for skip
  useEffect(() => {
    if (sessionId) {
      const seen = localStorage.getItem(`walkthrough_seen_${sessionId}`)
      if (seen === 'true') {
        onSkipToResults()
      }
    }
  }, [sessionId, onSkipToResults])

  // Score reveal animation
  useEffect(() => {
    if (state !== 'score_reveal') return
    const t = setTimeout(() => {
      setScoreRevealed(true)
      // Count up
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

  // Mark walkthrough as seen
  const markSeen = useCallback(() => {
    if (sessionId) {
      localStorage.setItem(`walkthrough_seen_${sessionId}`, 'true')
    }
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
          setState('strength_card')
          setStrengthIndex(0)
        } else if (weaknesses.length > 0) {
          setState('weakness_card')
          setWeaknessIndex(0)
        } else {
          setState('fork')
        }
        break

      case 'strength_card':
        awardXp(5)
        if (strengthIndex < strengths.length - 1) {
          setStrengthIndex(i => i + 1)
        } else if (weaknesses.length > 0) {
          setState('weakness_card')
          setWeaknessIndex(0)
        } else {
          setState('fork')
        }
        break

      case 'weakness_card':
        awardXp(5)
        if (weaknessIndex < weaknesses.length - 1) {
          setWeaknessIndex(i => i + 1)
        } else {
          setState('fork')
          markSeen()
        }
        break

      case 'fork':
        // Handled by specific button clicks
        break

      case 'practice_transition':
        setState('practicing')
        break

      case 'complete':
        markSeen()
        break
    }
  }, [state, strengthIndex, weaknessIndex, strengths.length, weaknesses.length, awardXp, markSeen])

  // Start practicing
  const startPractice = useCallback(() => {
    setPracticeIndex(0)
    setState('practicing')
    markSeen()
  }, [markSeen])

  // Handle practice lesson completion
  const handlePracticeComplete = useCallback((passed: boolean, lessonXp: number) => {
    const area = weaknesses[practiceIndex]
    if (area) {
      setPracticedAreas(prev => [...prev, area.criterion])
      if (passed) {
        setPassedAreas(prev => [...prev, area.criterion])
        if (!earnedBadges.find(b => b.id === 'quick_learner')) {
          setEarnedBadges(prev => [...prev, BADGES.find(b => b.id === 'quick_learner')!])
        }
      }
    }
    setPracticeXp(prev => prev + lessonXp)
    awardXp(lessonXp)

    // Move to next weak area or complete
    if (practiceIndex < weaknesses.length - 1) {
      setPracticeIndex(i => i + 1)
      setState('practice_transition')
    } else {
      // All practice done
      setConfettiActive(true)
      setTimeout(() => setConfettiActive(false), 3000)
      ding()
      setEarnedBadges(prev => {
        if (!prev.find(b => b.id === 'first_steps')) {
          return [...prev, BADGES.find(b => b.id === 'first_steps')!]
        }
        return prev
      })
      setState('complete')
    }
  }, [practiceIndex, weaknesses, awardXp, ding, earnedBadges])

  // Get current Preppi message
  const preppiMessage = useMemo(() => {
    switch (state) {
      case 'intro': return PREPPI_MESSAGES.intro
      case 'score_reveal':
        if (!scoreRevealed) return "Drumroll please..."
        if (overallScore >= 7) return PREPPI_MESSAGES.scoreHigh
        if (overallScore >= 5) return PREPPI_MESSAGES.scoreMid
        return PREPPI_MESSAGES.scoreLow
      case 'strength_card':
        return PREPPI_MESSAGES.strength(strengths[strengthIndex]?.criterion || 'this area')
      case 'weakness_card':
        return PREPPI_MESSAGES.weakness
      case 'fork': return PREPPI_MESSAGES.fork
      case 'practice_transition': return PREPPI_MESSAGES.practiceTransition
      case 'complete': return PREPPI_MESSAGES.complete
      default: return ''
    }
  }, [state, scoreRevealed, overallScore, strengthIndex, strengths])

  // ── Render: Practice Mode (full takeover) ──────────────────────────────────

  if (state === 'practicing') {
    const area = weaknesses[practiceIndex]
    if (!area) return null
    const rootCause = getRootCauseForCriterion(area.criterion, area.rootCause)
    const bundle = getBundleForRootCause(rootCause)
    const evidence = area.evidence?.[0]

    return (
      <PracticeLessonFlow
        bundle={bundle}
        criterion={area.criterion}
        originalQuestion={evidence?.question}
        originalAnswer={evidence?.excerpt}
        sessionId={sessionId}
        currentStage={currentStage}
        onComplete={handlePracticeComplete}
        onClose={() => {
          // If they close mid-practice, go to complete
          setState('complete')
        }}
      />
    )
  }

  // ── Score ring SVG ─────────────────────────────────────────────────────────

  const circumference = 2 * Math.PI * 44
  const scoreProgress = scoreRevealed ? (overallScore / 10) * circumference : 0

  // ── Render: Walkthrough Steps ──────────────────────────────────────────────

  return (
    <div className="fixed inset-0 z-50 bg-white flex flex-col">
      <Confetti active={confettiActive} />

      {/* ── Top Bar (Duolingo-style) ── */}
      <div className="shrink-0 px-4 py-3 flex items-center gap-3 border-b border-gray-100">
        {/* Skip / Close button — tiny, subtle */}
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
            className="h-full rounded-full transition-all duration-700 ease-out"
            style={{
              width: `${progressPercent}%`,
              backgroundColor: '#58CC02',
            }}
          />
        </div>

        {/* XP counter */}
        <div className="flex items-center gap-1.5 shrink-0">
          <Flame className="w-5 h-5 text-orange-400" />
          <span className={`text-sm font-extrabold text-orange-500 tabular-nums ${xpDelta ? 'animate-xp-glow' : ''}`}>
            {xp}
          </span>
          {xpDelta && (
            <span className="animate-fly-up text-xs font-bold text-orange-400 absolute ml-8">
              +{xpDelta}
            </span>
          )}
        </div>
      </div>

      {/* ── Main Content Area ── */}
      <div className="flex-1 overflow-y-auto">
        <div className="flex min-h-full">
          {/* Desktop: Preppi companion sidebar */}
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
            {/* Mobile: Preppi with speech bubble */}
            <div className="md:hidden mb-6" key={`preppi-${animKey}`}>
              <Preppi
                message={preppiMessage}
                size="lg"
                showOnDesktop={false}
                className="animate-preppi-bounce"
              />
            </div>

            {/* ── INTRO ── */}
            {state === 'intro' && (
              <div className="w-full max-w-md text-center animate-slide-up" key={`intro-${animKey}`}>
                <div className="w-32 h-32 mx-auto mb-6 hidden md:block">
                  {/* Desktop shows Preppi in sidebar, so show a greeting illustration here */}
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
                {/* Score Ring */}
                <div className="relative inline-flex items-center justify-center mb-6">
                  <svg className="w-36 h-36 md:w-44 md:h-44 -rotate-90" viewBox="0 0 100 100">
                    <circle cx="50" cy="50" r="44" stroke="#e5e7eb" strokeWidth="8" fill="none" />
                    <circle
                      cx="50" cy="50" r="44"
                      stroke={scoreColors.ring}
                      strokeWidth="8" fill="none"
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
                    ? feedback.detailed_feedback.substring(0, 120) + '...'
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
                  <div>
                    <p className="text-xs font-bold uppercase tracking-wide text-emerald-500">
                      Strength {strengthIndex + 1} of {strengths.length}
                    </p>
                  </div>
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
                        &ldquo;{strengths[strengthIndex].evidence[0].excerpt.substring(0, 150)}...&rdquo;
                      </p>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* ── WEAKNESS CARD ── */}
            {state === 'weakness_card' && weaknesses[weaknessIndex] && (
              <div className="w-full max-w-md animate-slide-in-right" key={`weak-${weaknessIndex}-${animKey}`}>
                <div className="flex items-center gap-2 mb-4">
                  <div className="w-8 h-8 bg-amber-100 rounded-full flex items-center justify-center">
                    <AlertTriangle className="w-5 h-5 text-amber-600" />
                  </div>
                  <div>
                    <p className="text-xs font-bold uppercase tracking-wide text-amber-500">
                      Area to Improve {weaknessIndex + 1} of {weaknesses.length}
                    </p>
                  </div>
                </div>

                <div className="bg-white border-2 border-amber-200 rounded-2xl p-6 shadow-lg">
                  <h3 className="text-lg font-extrabold text-gray-900 mb-2">
                    {weaknesses[weaknessIndex].criterion}
                  </h3>

                  {weaknesses[weaknessIndex].score != null && (
                    <div className="flex items-center gap-2 mb-3">
                      <div className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden">
                        <div
                          className={`h-full rounded-full transition-all duration-700 ${
                            weaknesses[weaknessIndex].score >= 5 ? 'bg-amber-400' : 'bg-orange-400'
                          }`}
                          style={{ width: `${weaknesses[weaknessIndex].score * 10}%` }}
                        />
                      </div>
                      <span className="text-xs font-bold text-amber-600 tabular-nums">
                        {weaknesses[weaknessIndex].score}/10
                      </span>
                    </div>
                  )}

                  <p className="text-sm text-gray-600 leading-relaxed mb-4">
                    {weaknesses[weaknessIndex].feedback}
                  </p>

                  {/* Practice preview teaser */}
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

            {/* ── FORK: Report vs Practice ── */}
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

                {/* Primary: Start Practicing */}
                {weaknesses.length > 0 && (
                  <button
                    onClick={startPractice}
                    className="w-full btn-duo-green py-4 text-base mb-3 flex items-center justify-center gap-2"
                  >
                    <Zap className="w-5 h-5" />
                    Let&apos;s Start Practicing!
                  </button>
                )}

                {/* Secondary: View Report */}
                <button
                  onClick={() => {
                    markSeen()
                    onOpenDetailedReport()
                  }}
                  className="w-full py-3.5 text-sm font-bold text-gray-500 border-2 border-gray-200 rounded-2xl hover:bg-gray-50 transition-all flex items-center justify-center gap-2"
                >
                  <FileText className="w-4 h-4" />
                  View Detailed Report
                </button>

                {weaknesses.length === 0 && (
                  <button
                    onClick={() => {
                      markSeen()
                      onSkipToResults()
                    }}
                    className="w-full mt-3 py-3.5 text-sm font-bold text-primary-600 border-2 border-primary-200 rounded-2xl hover:bg-primary-50 transition-all flex items-center justify-center gap-2"
                  >
                    <ArrowRight className="w-4 h-4" />
                    Continue
                  </button>
                )}
              </div>
            )}

            {/* ── PRACTICE TRANSITION ── */}
            {state === 'practice_transition' && (
              <div className="w-full max-w-md text-center animate-slide-up" key={`trans-${animKey}`}>
                <div className="w-20 h-20 mx-auto mb-5 bg-emerald-100 rounded-full flex items-center justify-center animate-badge-reveal">
                  <CheckCircle className="w-10 h-10 text-emerald-600" />
                </div>

                <h2 className="text-xl font-extrabold text-gray-900 mb-2">
                  Skill {practiceIndex + 1} Complete!
                </h2>
                <p className="text-sm text-gray-500 mb-2">
                  Ready for the next one?
                </p>
                <p className="text-xs text-accent-500 font-semibold mb-6">
                  {weaknesses[practiceIndex + 1]?.criterion}
                </p>
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
                    <p className="text-2xl font-extrabold text-emerald-600">{passedAreas.length}/{weaknesses.length}</p>
                    <p className="text-xs text-gray-400 font-semibold">Skills Passed</p>
                  </div>
                  <div className="w-px h-10 bg-gray-200" />
                  <div className="text-center">
                    <p className="text-2xl font-extrabold text-accent-600">{practicedAreas.length}</p>
                    <p className="text-xs text-gray-400 font-semibold">Practiced</p>
                  </div>
                </div>

                {/* Badges earned */}
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
                    onClick={() => {
                      markSeen()
                      onOpenDetailedReport()
                    }}
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

      {/* ── Bottom-anchored Continue Button (Duolingo-style) ── */}
      {state !== 'fork' && state !== 'complete' && state !== 'practice_transition' && (
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

      {/* ── Practice Transition Continue Button ── */}
      {state === 'practice_transition' && (
        <div className="shrink-0 px-5 py-4 md:px-12 border-t border-gray-100 bg-white">
          <div className="max-w-md mx-auto">
            <button
              onClick={advance}
              className="w-full btn-duo-green py-4 text-base flex items-center justify-center gap-2"
            >
              Next Skill
              <ArrowRight className="w-5 h-5" />
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
