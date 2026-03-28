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
  | 'summary_card'
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
  intro: "Your interview results are ready. Let's walk through what mattered.",
  scoreHigh: "Strong showing. A few refinements will make this more repeatable.",
  scoreMid:  "Good foundation. There are a few areas worth tightening right away.",
  scoreLow:  "This is useful signal. We can target the gaps and improve the next round.",
  strength:  (criterion: string) => `This held up well: ${criterion}.`,
  weakness:  "This is the right place to practice before you try it again.",
  fork:      "Practice is the fastest way to improve while the interview is still fresh. The full report stays available.",
  complete:  "You finished the coaching path. Let's carry that into the next attempt.",
}

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
            <div className="rounded-2xl rounded-tl-sm border border-slate-200 bg-white px-4 py-3 shadow-lg">
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
            <div className="rounded-2xl rounded-tr-sm border border-amber-200 bg-amber-50 px-4 py-3 shadow-md">
              <p className="text-sm text-gray-700 italic leading-relaxed">
                &ldquo;{excerpt.length > 200 ? excerpt.substring(0, 200) + '…' : excerpt}&rdquo;
              </p>
            </div>
          </div>
        </div>

        {/* Got it button */}
        <button
          onClick={onClose}
          className="btn-coach-primary w-full py-4 text-base animate-slide-up"
          style={{ animationDelay: '0.5s' }}
        >
          Back to review
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
  const [animKey, setAnimKey]               = useState(0)

  // Score reveal
  const [scoreRevealed, setScoreRevealed]   = useState(false)
  const [displayScore, setDisplayScore]     = useState(0)

  // Confetti
  const [confettiActive, setConfettiActive] = useState(false)

  // Transcript overlay
  const [showTranscript, setShowTranscript] = useState(false)

  // Practice tracking (used in complete screen)
  const [passedAreas, setPassedAreas]       = useState<string[]>([])
  const [practicedCount, setPracticedCount] = useState(0)

  // Data
  const sixAreas      = useMemo(() => getSixAreas(feedback, currentStage), [feedback, currentStage])
  const strengths     = useMemo(() => sixAreas?.what_went_well || [], [sixAreas])
  const weaknesses    = useMemo(() => sixAreas?.what_needs_improve || [], [sixAreas])
  const overallScore  = feedback?.overall_score || 0
  const scoreColors   = getScoreColor(overallScore)
  const interviewerGender = useMemo(() => getInterviewerGender(sessionId), [sessionId])
  const primaryStrength = strengths[0]
  const primaryWeakness = weaknesses[0]
  const additionalWeaknessCount = Math.max(0, weaknesses.length - 1)

  // Progress (only for the report walkthrough, not the practice phase)
  const totalSteps    = 4
  const currentStep   = useMemo(() => {
    switch (state) {
      case 'intro':          return 0
      case 'score_reveal':   return 1
      case 'summary_card':   return 2
      case 'fork':           return 3
      default:               return totalSteps
    }
  }, [state, totalSteps])

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
        setState('summary_card')
        break
      case 'summary_card':
        setState('fork')
        break
      case 'fork':
        break
    }
  }, [state])

  // When LessonRoadmap completes all practice
  const handleAllPracticeComplete = useCallback((totalXp: number) => {
    setConfettiActive(true)
    setTimeout(() => setConfettiActive(false), 3500)
    ding()
    setPassedAreas([primaryWeakness?.criterion || 'Recommended path'])
    setPracticedCount(1)
    setState('complete')
  }, [ding, primaryWeakness])

  // Preppi message
  const preppiMessage = useMemo(() => {
    switch (state) {
      case 'intro':        return PREPPI_MESSAGES.intro
      case 'score_reveal':
        if (!scoreRevealed)   return 'Drumroll please…'
        if (overallScore >= 7) return PREPPI_MESSAGES.scoreHigh
        if (overallScore >= 5) return PREPPI_MESSAGES.scoreMid
        return PREPPI_MESSAGES.scoreLow
      case 'summary_card': return primaryWeakness ? PREPPI_MESSAGES.weakness : PREPPI_MESSAGES.fork
      case 'fork':          return PREPPI_MESSAGES.fork
      case 'complete':      return PREPPI_MESSAGES.complete
      default:              return ''
    }
  }, [state, scoreRevealed, overallScore, primaryWeakness])

  // ── Lesson Roadmap takeover ────────────────────────────────────────────────

  if (state === 'lesson_roadmap') {
    return (
      <LessonRoadmap
        weaknesses={weaknesses}
        sessionId={sessionId}
        currentStage={currentStage}
        priorXp={0}
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

  const currentWeakness     = primaryWeakness
  const transcriptQuestion  = currentWeakness?.evidence?.[0]?.question || ''
  const transcriptExcerpt   = currentWeakness?.evidence?.[0]?.excerpt  || ''
  const hasTranscriptData   = !!(transcriptQuestion && transcriptExcerpt)

  // ── Main render ────────────────────────────────────────────────────────────

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-[linear-gradient(180deg,#faf7ff_0%,#f4f7ff_48%,#eef4fb_100%)]">
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
      <div className="shrink-0 border-b border-slate-100 bg-white/80 px-4 py-3 backdrop-blur-xl">
        <div className="mx-auto flex w-full max-w-3xl items-center gap-3">
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
            style={{ width: `${progressPercent}%`, background: 'linear-gradient(90deg,#8b5cf6 0%,#6d28d9 100%)' }}
          />
        </div>

        <div className="w-6 shrink-0" />
        </div>
      </div>

      {/* ── Main Content ── */}
      <div className="flex-1 overflow-y-auto">
        <div className="flex min-h-full flex-col items-center justify-center px-5 py-8 md:px-12 md:py-12">

            {/* Mobile Preppi */}
            <div className="mb-6" key={`preppi-${animKey}`}>
              <Preppi message={preppiMessage} size="lg" showOnDesktop className="animate-preppi-bounce justify-center" />
            </div>

            {/* ── INTRO ── */}
            {state === 'intro' && (
              <div className="w-full max-w-md text-center animate-slide-up" key={`intro-${animKey}`}>
                <h1 className="text-2xl md:text-3xl font-extrabold text-gray-900 mb-3">
                  Your Results Are In!
                </h1>
                <p className="text-gray-500 text-sm md:text-base mb-2">
                  A quick review of what landed well, what needs work, and what to do next.
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

            {/* ── SUMMARY CARD ── */}
            {state === 'summary_card' && (
              <div className="w-full max-w-2xl animate-slide-in-right" key={`summary-${animKey}`}>
                <div className="premium-panel p-6 md:p-7">
                  <div className="mb-5">
                    <p className="text-xs font-black uppercase tracking-[0.24em] text-violet-500">What mattered most</p>
                    <h3 className="mt-2 text-2xl font-black text-slate-900">Here is the fastest path to a better next round.</h3>
                  </div>

                  <div className="grid gap-4 md:grid-cols-2">
                    <div className="rounded-[1.4rem] border border-emerald-200 bg-emerald-50/80 p-5">
                      <div className="mb-3 flex items-center gap-2">
                        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-emerald-100">
                          <CheckCircle className="h-5 w-5 text-emerald-600" />
                        </div>
                        <p className="text-xs font-black uppercase tracking-wide text-emerald-600">What helped</p>
                      </div>
                      <h4 className="text-base font-black text-slate-900">{primaryStrength?.criterion || 'You had at least one solid area.'}</h4>
                      <p className="mt-2 text-sm leading-6 text-slate-600">
                        {primaryStrength?.feedback || 'The interview showed some credible signal. Keep that part stable while you improve the weaker answer.'}
                      </p>
                    </div>

                    <div className="rounded-[1.4rem] border border-amber-200 bg-amber-50/80 p-5">
                      <div className="mb-3 flex items-center gap-2">
                        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-amber-100">
                          <AlertTriangle className="h-5 w-5 text-amber-600" />
                        </div>
                        <p className="text-xs font-black uppercase tracking-wide text-amber-600">Fix first</p>
                      </div>
                      <h4 className="text-base font-black text-slate-900">{currentWeakness?.criterion || 'No major practice area surfaced.'}</h4>
                      <p className="mt-2 text-sm leading-6 text-slate-600">
                        {currentWeakness?.feedback || 'If there is no major weakness here, move to the full report and review the details.'}
                      </p>
                      {hasTranscriptData && (
                        <button
                          onClick={() => setShowTranscript(true)}
                          className="mt-3 flex items-center gap-2 text-xs font-semibold text-violet-700 transition-colors hover:text-violet-800"
                        >
                          <MessageSquare className="w-3.5 h-3.5" />
                          See what you said
                        </button>
                      )}
                    </div>
                  </div>

                  {additionalWeaknessCount > 0 && (
                    <div className="mt-4 rounded-[1.2rem] border border-slate-200 bg-slate-50 px-4 py-3">
                      <p className="text-sm text-slate-600">
                        There {additionalWeaknessCount === 1 ? 'is' : 'are'} also {additionalWeaknessCount} more area{additionalWeaknessCount === 1 ? '' : 's'} in the full report. Practice will start with the highest-priority one.
                      </p>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* ── FORK ── */}
            {state === 'fork' && (
              <div className="w-full max-w-md text-center animate-slide-up" key={`fork-${animKey}`}>
                <div className="mx-auto mb-5 flex h-20 w-20 items-center justify-center rounded-full bg-violet-100">
                  <Star className="w-10 h-10 text-violet-700" />
                </div>
                <h2 className="text-xl md:text-2xl font-extrabold text-gray-900 mb-2">
                  Choose the next step.
                </h2>
                <p className="text-sm text-gray-500 mb-8 max-w-xs mx-auto">
                  Start with one recommended coaching path now, or open the full report.
                </p>

                {weaknesses.length > 0 && (
                  <button
                    onClick={() => { markSeen(); setState('lesson_roadmap') }}
                    className="btn-coach-primary mb-3 flex w-full items-center justify-center gap-2 py-4 text-base"
                  >
                    <Zap className="w-5 h-5" />
                    Start Recommended Practice
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
                  You finished the recommended coaching path for this round.
                </p>

                {/* Stats */}
                <div className="mb-6 flex items-center justify-center gap-6">
                  <div className="text-center">
                    <p className="text-2xl font-extrabold text-emerald-600">
                      {Math.max(passedAreas.length, 1)}
                    </p>
                    <p className="text-xs font-semibold text-gray-400">Path Completed</p>
                  </div>
                  <div className="h-10 w-px bg-gray-200" />
                  <div className="text-center">
                    <p className="text-2xl font-extrabold text-violet-700">{practicedCount || 1}</p>
                    <p className="text-xs font-semibold text-gray-400">Area Practiced</p>
                  </div>
                </div>

                {/* Actions */}
                <div className="space-y-3">
                  <button
                    onClick={() => { markSeen(); onOpenDetailedReport() }}
                    className="btn-coach-primary flex w-full items-center justify-center gap-2 py-4 text-base"
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
                      className="btn-coach-secondary w-full py-3.5 text-sm flex items-center justify-center gap-2"
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

      {/* ── Bottom-anchored Continue Button ── */}
      {state !== 'fork' && state !== 'complete' && (
        <div className="shrink-0 px-5 py-4 md:px-12 border-t border-gray-100 bg-white">
          <div className="max-w-md mx-auto">
            <button
              onClick={advance}
              className="btn-coach-primary flex w-full items-center justify-center gap-2 py-4 text-base"
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
