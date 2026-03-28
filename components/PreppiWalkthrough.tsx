'use client'

import { useState, useEffect, useCallback, useMemo } from 'react'
import {
  X,
  ArrowRight,
  CheckCircle,
  AlertTriangle,
  MessageSquare,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react'
import Confetti from '@/components/Confetti'
import Preppi from '@/components/Preppi'
import { useGameFeedback } from '@/hooks/useGameFeedback'

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
  onStartPractice: () => void
  embeddedDesktop?: boolean
}

// ── Flow states ──────────────────────────────────────────────────────────────

type WalkthroughState =
  | 'intro'
  | 'score_reveal'
  | 'review_all'

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
  onStartPractice,
  embeddedDesktop = false,
}: PreppiWalkthroughProps) {
  const { ding } = useGameFeedback()

  // Flow state
  const [state, setState]                   = useState<WalkthroughState>('intro')
  const [animKey, setAnimKey]               = useState(0)

  // Score reveal
  const [scoreRevealed, setScoreRevealed]   = useState(false)
  const [displayScore, setDisplayScore]     = useState(0)

  // Transcript overlay
  const [showTranscript, setShowTranscript] = useState(false)
  const [reviewIndex, setReviewIndex] = useState(0)

  // Data
  const sixAreas      = useMemo(() => getSixAreas(feedback, currentStage), [feedback, currentStage])
  const strengths     = useMemo(() => sixAreas?.what_went_well || [], [sixAreas])
  const weaknesses    = useMemo(() => sixAreas?.what_needs_improve || [], [sixAreas])
  const overallScore  = feedback?.overall_score || 0
  const scoreColors   = getScoreColor(overallScore)
  const interviewerGender = useMemo(() => getInterviewerGender(sessionId), [sessionId])
  const primaryStrength = strengths[0]
  const primaryWeakness = weaknesses[0]
  const reviewItems = useMemo(
    () => [
      ...strengths.map((item: any) => ({ type: 'strength' as const, item })),
      ...weaknesses.map((item: any) => ({ type: 'issue' as const, item })),
    ],
    [strengths, weaknesses]
  )
  const activeReview = reviewItems[reviewIndex]

  const totalSteps    = Math.max(3, reviewItems.length + 2)
  const currentStep   = useMemo(() => {
    switch (state) {
      case 'intro':          return 0
      case 'score_reveal':   return 1
      case 'review_all':     return 2 + reviewIndex
      default:               return totalSteps
    }
  }, [reviewIndex, state, totalSteps])

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
        setState('review_all')
        setReviewIndex(0)
        break
      case 'review_all':
        if (reviewIndex < reviewItems.length - 1) {
          setReviewIndex((value) => value + 1)
        } else {
          markSeen()
          onOpenDetailedReport()
        }
        break
    }
  }, [markSeen, onOpenDetailedReport, reviewIndex, reviewItems.length, state])

  // Preppi message
  const preppiMessage = useMemo(() => {
    switch (state) {
      case 'intro':        return PREPPI_MESSAGES.intro
      case 'score_reveal':
        if (!scoreRevealed)   return 'Drumroll please…'
        if (overallScore >= 7) return PREPPI_MESSAGES.scoreHigh
        if (overallScore >= 5) return PREPPI_MESSAGES.scoreMid
        return PREPPI_MESSAGES.scoreLow
      case 'review_all':
        if (activeReview?.type === 'strength') return PREPPI_MESSAGES.strength(activeReview.item.criterion)
        if (activeReview?.type === 'issue') return PREPPI_MESSAGES.weakness
        return 'Here is the full review before you move into practice.'
      default:              return ''
    }
  }, [activeReview, overallScore, scoreRevealed, state])

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
    <div className={`fixed inset-0 z-50 flex flex-col bg-[linear-gradient(180deg,#faf7ff_0%,#f4f7ff_48%,#eef4fb_100%)] ${
      embeddedDesktop ? 'lg:relative lg:inset-auto lg:min-h-full' : ''
    }`}>
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
      <div className="flex-1 overflow-hidden">
        <div className="flex h-full flex-col items-center justify-center px-5 py-8 md:px-12 md:py-12">

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

            {/* ── FULL REVIEW ── */}
            {state === 'review_all' && (
              <div className="w-full max-w-3xl animate-slide-in-right" key={`review-${animKey}`}>
                <div className={`premium-panel p-7 ${activeReview?.type === 'strength' ? 'border-emerald-200/80' : 'border-amber-200/80'}`}>
                  <div className="mb-5 flex items-center justify-between gap-4">
                    <div>
                      <p className={`text-xs font-black uppercase tracking-[0.24em] ${activeReview?.type === 'strength' ? 'text-emerald-600' : 'text-amber-600'}`}>
                        {activeReview?.type === 'strength' ? 'What Helped' : 'Needs Work'}
                      </p>
                      <h3 className="mt-2 text-2xl font-black text-slate-900">
                        {activeReview?.item?.criterion || 'Interview review'}
                      </h3>
                    </div>
                    <div className={`rounded-full px-4 py-2 text-xs font-black uppercase tracking-[0.18em] ${
                      activeReview?.type === 'strength'
                        ? 'bg-emerald-100 text-emerald-700'
                        : 'bg-amber-100 text-amber-700'
                    }`}>
                      {reviewIndex + 1} / {reviewItems.length}
                    </div>
                  </div>

                  <div className={`rounded-[1.5rem] border p-6 ${
                    activeReview?.type === 'strength'
                      ? 'border-emerald-200 bg-emerald-50/70'
                      : 'border-amber-200 bg-amber-50/70'
                  }`}>
                    <div className="flex items-start justify-between gap-3">
                      <div className={`flex h-12 w-12 items-center justify-center rounded-[1rem] ${
                        activeReview?.type === 'strength' ? 'bg-emerald-100' : 'bg-amber-100'
                      }`}>
                        {activeReview?.type === 'strength'
                          ? <CheckCircle className="h-6 w-6 text-emerald-600" />
                          : <AlertTriangle className="h-6 w-6 text-amber-600" />}
                      </div>
                      {activeReview?.item?.score != null && (
                        <span className={`text-sm font-black ${activeReview?.type === 'strength' ? 'text-emerald-700' : 'text-amber-700'}`}>
                          {activeReview.item.score}/10
                        </span>
                      )}
                    </div>
                    <p className="mt-5 text-base leading-8 text-slate-700">
                      {activeReview?.item?.feedback || 'No details available.'}
                    </p>
                    {activeReview?.type === 'issue' && activeReview?.item?.evidence?.[0]?.excerpt && (
                      <div className="mt-5 rounded-[1.3rem] border border-slate-200 bg-white/80 p-4">
                        <p className="text-xs font-black uppercase tracking-[0.18em] text-slate-500">Flagged Evidence</p>
                        <p className="mt-2 text-sm leading-7 text-slate-600">
                          &ldquo;{String(activeReview.item.evidence[0].excerpt).slice(0, 220)}{String(activeReview.item.evidence[0].excerpt).length > 220 ? '…' : ''}&rdquo;
                        </p>
                        {hasTranscriptData && reviewIndex === strengths.length && (
                          <button
                            onClick={() => setShowTranscript(true)}
                            className="mt-3 flex items-center gap-2 text-xs font-semibold text-violet-700 transition-colors hover:text-violet-800"
                          >
                            <MessageSquare className="h-3.5 w-3.5" />
                            See what you said here
                          </button>
                        )}
                      </div>
                    )}
                  </div>

                  <div className="mt-6 flex items-center justify-between">
                    <button
                      type="button"
                      onClick={() => setReviewIndex((value) => Math.max(0, value - 1))}
                      disabled={reviewIndex === 0}
                      className="flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-bold text-slate-600 disabled:opacity-40"
                    >
                      <ChevronLeft className="h-4 w-4" />
                      Previous
                    </button>
                    <div className="text-center">
                      <p className="text-xs font-black uppercase tracking-[0.18em] text-slate-400">Reviewing</p>
                      <p className="text-sm font-bold text-slate-700">{activeReview?.type === 'strength' ? 'Strong signal' : 'Flagged issue'}</p>
                    </div>
                    <button
                      type="button"
                      onClick={advance}
                      className="btn-coach-primary flex items-center gap-2 px-5 py-3 text-sm"
                    >
                      {reviewIndex === reviewItems.length - 1 ? 'Open Full Report' : 'Next'}
                      <ChevronRight className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
      </div>

      {/* ── Bottom-anchored Continue Button ── */}
      {state !== 'review_all' && (
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
