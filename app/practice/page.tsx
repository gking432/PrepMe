'use client'

export const dynamic = 'force-dynamic'

import { useState, useEffect, useRef, useCallback } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase-client'
import Header from '@/components/Header'
import Preppi from '@/components/Preppi'
import Confetti from '@/components/Confetti'
import { useGameFeedback } from '@/hooks/useGameFeedback'
import { Mic, MicOff, Send, ChevronRight, RotateCcw, Trophy, Zap, CheckCircle, X } from 'lucide-react'

interface DrillQuestion {
  id: string
  question: string
  originalAnswer: string
  criterion: string
  sessionId: string
}

interface DrillResult {
  question: string
  criterion: string
  score: number // 1-10
  passed: boolean
  feedbackSummary: string
}

const XP_PER_PASS = 50
const XP_PER_ATTEMPT = 15

// Animated score circle that counts up
function ScoreAnimation({ score, passed }: { score: number; passed: boolean }) {
  const [displayed, setDisplayed] = useState(0)

  useEffect(() => {
    setDisplayed(0)
    const duration = 700
    const start = performance.now()
    const tick = (now: number) => {
      const t = Math.min((now - start) / duration, 1)
      const eased = 1 - Math.pow(1 - t, 3) // easeOutCubic
      setDisplayed(Math.round(eased * score * 10) / 10)
      if (t < 1) requestAnimationFrame(tick)
    }
    requestAnimationFrame(tick)
  }, [score])

  return (
    <div className="flex items-center justify-center flex-col gap-3 py-6">
      <div className={`w-24 h-24 rounded-full flex items-center justify-center text-3xl font-bold animate-score-pop ${
        passed
          ? 'bg-emerald-100 text-emerald-600 ring-4 ring-emerald-200'
          : 'bg-amber-100 text-amber-600 ring-4 ring-amber-200'
      }`}>
        {displayed}/10
      </div>
      <div className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm font-bold animate-slide-up ${
        passed ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-700'
      }`}>
        {passed
          ? <><CheckCircle className="w-4 h-4" />Nice answer!</>
          : <><RotateCcw className="w-4 h-4" />Keep practicing</>
        }
      </div>
    </div>
  )
}

function XPBar({ xp, maxXp, gained, xpKey }: { xp: number; maxXp: number; gained: number; xpKey: number }) {
  const pct = Math.min((xp / maxXp) * 100, 100)
  return (
    <div className="flex items-center gap-3 relative">
      <div className="flex items-center gap-1.5">
        <Zap className="w-4 h-4 text-amber-500" />
        <span className="text-sm font-bold text-amber-600 tabular-nums">{xp} XP</span>
      </div>
      <div className="flex-1 h-3 bg-gray-100 rounded-full overflow-hidden">
        <div
          className="h-full bg-amber-400 rounded-full transition-all duration-700 ease-out"
          style={{ width: `${pct}%` }}
        />
      </div>
      {gained > 0 && (
        <span
          key={xpKey}
          className="absolute right-0 text-sm font-extrabold text-amber-500 animate-fly-up"
        >
          +{gained} XP
        </span>
      )}
    </div>
  )
}

export default function PracticeDrillPage() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const supabase = createClient()
  const { ding } = useGameFeedback()

  const [loading, setLoading] = useState(true)
  const [questions, setQuestions] = useState<DrillQuestion[]>([])
  const [currentIndex, setCurrentIndex] = useState(-1) // -1 = intro screen
  const [phase, setPhase] = useState<'intro' | 'question' | 'result' | 'summary'>('intro')
  const [textAnswer, setTextAnswer] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [result, setResult] = useState<DrillResult | null>(null)
  const [sessionResults, setSessionResults] = useState<DrillResult[]>([])
  const [xp, setXp] = useState(0)
  const [lastXpGain, setLastXpGain] = useState(0)
  const [xpKey, setXpKey] = useState(0)
  const [recording, setRecording] = useState(false)
  const [inputMode, setInputMode] = useState<'text' | 'voice'>('text')
  const [showCorrectFlash, setShowCorrectFlash] = useState(false)
  const [confettiActive, setConfettiActive] = useState(false)
  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const audioChunksRef = useRef<Blob[]>([])

  const sessionId = searchParams?.get('sessionId') || ''
  const currentQuestion = questions[currentIndex]
  const totalXp = questions.length * XP_PER_PASS

  useEffect(() => {
    if (sessionId) loadDrillQuestions()
    else setLoading(false)
  }, [sessionId])

  const loadDrillQuestions = async () => {
    try {
      const [feedbackRes, sessionRes] = await Promise.all([
        supabase.from('interview_feedback').select('*').eq('interview_session_id', sessionId).order('created_at', { ascending: false }).limit(1),
        supabase.from('interview_sessions').select('transcript_structured, stage').eq('id', sessionId).single(),
      ])

      const feedbackData = feedbackRes.data?.[0]
      const sessionData = sessionRes.data

      if (!feedbackData || !sessionData) {
        setLoading(false)
        return
      }

      const drillItems: DrillQuestion[] = []
      const rubric = feedbackData.full_rubric

      const extractWeakAreas = (areas: any) => {
        if (!areas) return
        Object.entries(areas).forEach(([criterion, data]: [string, any]) => {
          if (data?.score <= 6 && data?.evidence?.length > 0) {
            const evidence = data.evidence[0]
            const questionText = sessionData.transcript_structured?.questions_asked?.find(
              (q: any) => q.id === evidence.question_id
            )?.question || evidence.question || criterion

            drillItems.push({
              id: `${criterion}-0`,
              question: questionText,
              originalAnswer: evidence.excerpt || '',
              criterion,
              sessionId,
            })
          }
        })
      }

      if (rubric?.hr_screen_six_areas) extractWeakAreas(rubric.hr_screen_six_areas)
      if (rubric?.hiring_manager_six_areas) extractWeakAreas(rubric.hiring_manager_six_areas)
      if (rubric?.traditional_hr_criteria?.scores) {
        Object.entries(rubric.traditional_hr_criteria.scores).forEach(([criterion, score]: [string, any]) => {
          if (score <= 6) {
            drillItems.push({
              id: `trad-${criterion}`,
              question: `Let's practice: ${criterion.replace(/_/g, ' ')}`,
              originalAnswer: '',
              criterion,
              sessionId,
            })
          }
        })
      }

      if (drillItems.length === 0 && feedbackData.weaknesses) {
        feedbackData.weaknesses.slice(0, 5).forEach((weakness: string, i: number) => {
          drillItems.push({
            id: `weakness-${i}`,
            question: `Tell me more about: ${weakness}`,
            originalAnswer: '',
            criterion: weakness,
            sessionId,
          })
        })
      }

      setQuestions(drillItems.slice(0, 7))
    } catch (err) {
      console.error('Error loading drill questions:', err)
    } finally {
      setLoading(false)
    }
  }

  const handleResult = useCallback((drillResult: DrillResult, gain: number) => {
    setResult(drillResult)
    setXp(prev => prev + gain)
    setLastXpGain(gain)
    setXpKey(k => k + 1)
    setPhase('result')

    if (drillResult.passed) {
      ding()
      setShowCorrectFlash(true)
      setTimeout(() => setShowCorrectFlash(false), 700)
    }
  }, [ding])

  const startDrill = () => {
    setCurrentIndex(0)
    setPhase('question')
  }

  const submitTextAnswer = async () => {
    if (!textAnswer.trim() || !currentQuestion) return
    setSubmitting(true)
    try {
      const res = await fetch('/api/interview/practice', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessionId: currentQuestion.sessionId,
          questionId: currentQuestion.id,
          question: currentQuestion.question,
          originalAnswer: currentQuestion.originalAnswer,
          stage: sessionId,
          answer: textAnswer,
        }),
      })
      const data = await res.json()
      if (data.success) {
        const drillResult: DrillResult = {
          question: currentQuestion.question,
          criterion: currentQuestion.criterion,
          score: data.score || 5,
          passed: data.passed || false,
          feedbackSummary: data.feedback || data.summary || '',
        }
        const gain = data.passed ? XP_PER_PASS : XP_PER_ATTEMPT
        setSessionResults(prev => [...prev, drillResult])
        handleResult(drillResult, gain)
      }
    } catch (err) {
      console.error('Practice submit error:', err)
    } finally {
      setSubmitting(false)
    }
  }

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      const mediaRecorder = new MediaRecorder(stream, { mimeType: 'audio/webm' })
      mediaRecorderRef.current = mediaRecorder
      audioChunksRef.current = []
      mediaRecorder.ondataavailable = (e) => { if (e.data.size > 0) audioChunksRef.current.push(e.data) }
      mediaRecorder.onstop = async () => {
        stream.getTracks().forEach(t => t.stop())
        await submitAudioAnswer(new Blob(audioChunksRef.current, { type: 'audio/webm' }))
      }
      mediaRecorder.start()
      setRecording(true)
    } catch (err) {
      alert('Microphone access required for voice mode.')
    }
  }

  const stopRecording = () => {
    if (mediaRecorderRef.current?.state === 'recording') {
      mediaRecorderRef.current.stop()
      setRecording(false)
    }
  }

  const submitAudioAnswer = async (audioBlob: Blob) => {
    if (!currentQuestion) return
    setSubmitting(true)
    try {
      const formData = new FormData()
      formData.append('audio', audioBlob, 'recording.webm')
      formData.append('sessionId', currentQuestion.sessionId)
      formData.append('questionId', currentQuestion.id)
      formData.append('question', currentQuestion.question)
      formData.append('originalAnswer', currentQuestion.originalAnswer)
      formData.append('stage', currentQuestion.sessionId)

      const res = await fetch('/api/interview/practice', { method: 'POST', body: formData })
      const data = await res.json()
      if (data.success) {
        const drillResult: DrillResult = {
          question: currentQuestion.question,
          criterion: currentQuestion.criterion,
          score: data.score || 5,
          passed: data.passed || false,
          feedbackSummary: data.feedback || data.summary || '',
        }
        const gain = data.passed ? XP_PER_PASS : XP_PER_ATTEMPT
        setSessionResults(prev => [...prev, drillResult])
        handleResult(drillResult, gain)
      }
    } catch (err) {
      console.error('Audio submit error:', err)
    } finally {
      setSubmitting(false)
    }
  }

  const nextQuestion = () => {
    setTextAnswer('')
    setResult(null)
    setLastXpGain(0)
    const next = currentIndex + 1
    if (next >= questions.length) {
      const passed = sessionResults.filter(r => r.passed).length + (result?.passed ? 0 : 0)
      // sessionResults already includes the last result at this point
      const passRate = sessionResults.length > 0
        ? sessionResults.filter(r => r.passed).length / sessionResults.length
        : 0
      if (passRate >= 0.5) setConfettiActive(true)
      setPhase('summary')
    } else {
      setCurrentIndex(next)
      setPhase('question')
    }
  }

  if (loading) {
    return (
      <div className="app-shell flex min-h-screen items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary-500 border-t-transparent" />
      </div>
    )
  }

  if (questions.length === 0) {
    return (
      <div className="app-shell">
        <Header />
        <div className="page-container max-w-lg py-16 text-center">
          <Preppi message="Nothing to drill right now — that's actually a good sign." size="lg" />
          <p className="mt-6 text-gray-500 text-sm">Complete an interview first, and we'll build your drill session from the feedback.</p>
          <button onClick={() => router.push('/dashboard')} className="btn-coach-primary mt-6 px-6 py-3">
            Go to Dashboard
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="app-shell">
      <Header />

      {/* CORRECT! flash overlay */}
      {showCorrectFlash && (
        <div className="fixed inset-0 z-40 flex items-center justify-center pointer-events-none animate-correct-flash">
          <div className="bg-emerald-500 text-white text-4xl font-extrabold px-10 py-6 rounded-3xl shadow-2xl tracking-wide">
            CORRECT!
          </div>
        </div>
      )}

      {/* Confetti */}
      <Confetti active={confettiActive} />

      <div className="page-container max-w-2xl py-8">

        {/* XP bar — always visible during drill */}
        {phase !== 'intro' && phase !== 'summary' && (
          <div className="mb-6">
            <div className="flex items-center justify-between text-xs text-gray-400 mb-2">
              <span>Question {currentIndex + 1} of {questions.length}</span>
              <span>{questions.length - currentIndex - 1} remaining</span>
            </div>
            <div className="mb-3 h-2 w-full rounded-full bg-slate-200">
              <div
                className="h-2 rounded-full bg-[linear-gradient(90deg,#2563eb_0%,#1d4ed8_100%)] transition-all duration-500"
                style={{ width: `${((currentIndex) / questions.length) * 100}%` }}
              />
            </div>
            <XPBar xp={xp} maxXp={totalXp} gained={lastXpGain} xpKey={xpKey} />
          </div>
        )}

        {/* Intro screen */}
        {phase === 'intro' && (
          <div className="text-center">
            <Preppi
              message={`${questions.length} questions to drill. Your answers from the interview are already loaded — just improve on them.`}
              size="lg"
              animate
              className="justify-center mb-8"
            />
            <h1 className="text-2xl font-bold text-gray-900 mb-2">Practice Drill</h1>
            <p className="text-gray-500 mb-2">{questions.length} questions · {questions.length * 3}–{questions.length * 5} min</p>
            <div className="flex items-center justify-center gap-4 mb-8">
              <div className="flex items-center gap-1.5 text-sm text-amber-600 font-medium">
                <Zap className="w-4 h-4" />
                <span>Up to {totalXp} XP</span>
              </div>
              <div className="w-px h-4 bg-gray-200" />
              <div className="flex items-center gap-1.5 text-sm text-gray-500">
                <Mic className="w-4 h-4" />
                <span>Voice or text</span>
              </div>
            </div>
            <button
              onClick={startDrill}
              className="btn-coach-primary px-8 py-4 text-lg"
            >
              Start Drilling
            </button>
          </div>
        )}

        {/* Question screen */}
        {phase === 'question' && currentQuestion && (
          <div className="animate-slide-up">
            <div className="premium-panel mb-4 overflow-hidden border border-slate-200/80">
              <div className="px-5 pt-5 pb-3">
                <span className="inline-block rounded-full bg-primary-50 px-2.5 py-1 text-xs font-semibold uppercase tracking-wide text-primary-700">
                  {currentQuestion.criterion.replace(/_/g, ' ')}
                </span>
              </div>

              <div className="px-5 pb-5">
                <p className="text-lg font-semibold text-gray-900 leading-snug">{currentQuestion.question}</p>
              </div>

              {currentQuestion.originalAnswer && (
                <div className="px-5 pb-5 border-t border-gray-100">
                  <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">Your original answer</p>
                  <p className="text-sm text-gray-500 italic leading-relaxed line-clamp-3">
                    "{currentQuestion.originalAnswer}"
                  </p>
                </div>
              )}
            </div>

            <div className="mb-4 flex overflow-hidden rounded-2xl border border-slate-200 bg-white">
              <button
                onClick={() => setInputMode('text')}
                className={`flex-1 py-2.5 text-sm font-semibold transition-colors ${inputMode === 'text' ? 'bg-primary-600 text-white' : 'text-gray-500 hover:bg-gray-50'}`}
              >
                Type answer
              </button>
              <button
                onClick={() => setInputMode('voice')}
                className={`flex-1 py-2.5 text-sm font-semibold transition-colors ${inputMode === 'voice' ? 'bg-primary-600 text-white' : 'text-gray-500 hover:bg-gray-50'}`}
              >
                Voice answer
              </button>
            </div>

            {inputMode === 'text' && (
              <div className="premium-panel overflow-hidden border border-slate-200/80">
                <textarea
                  value={textAnswer}
                  onChange={e => setTextAnswer(e.target.value)}
                  rows={5}
                  placeholder="Give a clear, specific answer. Use a real example if you can."
                  className="w-full px-5 py-4 text-sm text-gray-800 placeholder-gray-400 resize-none focus:outline-none"
                />
                <div className="px-5 py-3 border-t border-gray-100 flex justify-end">
                  <button
                    onClick={submitTextAnswer}
                    disabled={!textAnswer.trim() || submitting}
                    className="btn-coach-primary flex items-center gap-2 px-5 py-2.5 text-sm disabled:opacity-40"
                  >
                    {submitting ? (
                      <><div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />Scoring...</>
                    ) : (
                      <><Send className="w-4 h-4" />Submit</>
                    )}
                  </button>
                </div>
              </div>
            )}

            {inputMode === 'voice' && (
              <div className="premium-panel border border-slate-200/80 p-8 text-center">
                {submitting ? (
                  <div className="flex flex-col items-center gap-3">
                    <div className="w-8 h-8 border-2 border-primary-500 border-t-transparent rounded-full animate-spin" />
                    <p className="text-sm text-gray-500">Scoring your answer...</p>
                  </div>
                ) : recording ? (
                  <div className="flex flex-col items-center gap-4">
                    <div className="w-16 h-16 bg-red-50 rounded-full flex items-center justify-center">
                      <div className="w-4 h-4 bg-red-500 rounded-full animate-pulse" />
                    </div>
                    <p className="text-sm font-semibold text-red-600">Recording...</p>
                    <button
                      onClick={stopRecording}
                      className="flex items-center gap-2 px-6 py-3 bg-red-500 text-white rounded-xl font-semibold text-sm hover:bg-red-600 active:scale-95 transition-all"
                    >
                      <MicOff className="w-4 h-4" />Done — submit answer
                    </button>
                  </div>
                ) : (
                  <div className="flex flex-col items-center gap-4">
                    <button
                      onClick={startRecording}
                      className="flex h-16 w-16 items-center justify-center rounded-full bg-primary-50 transition-all hover:bg-primary-100 active:scale-95"
                    >
                      <Mic className="w-7 h-7 text-primary-500" />
                    </button>
                    <p className="text-sm text-gray-500">Tap to start recording your answer</p>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* Result screen */}
        {phase === 'result' && result && (
          <div className="animate-slide-up">
            <div className="premium-panel mb-4 overflow-hidden border border-slate-200/80">
              <ScoreAnimation score={result.score} passed={result.passed} />
              {result.feedbackSummary && (
                <div className="px-5 pb-5 border-t border-gray-100">
                  <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">Feedback</p>
                  <p className="text-sm text-gray-700 leading-relaxed">{result.feedbackSummary}</p>
                </div>
              )}
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => { setPhase('question'); setTextAnswer(''); setResult(null) }}
                className="flex-1 flex items-center justify-center gap-2 py-3 border border-gray-200 rounded-xl text-sm font-semibold text-gray-600 hover:bg-gray-50 active:scale-95 transition-all"
              >
                <RotateCcw className="w-4 h-4" />Try again
              </button>
              <button
                onClick={nextQuestion}
                className="btn-coach-primary flex-1 justify-center gap-2 py-3 text-sm"
              >
                {currentIndex + 1 >= questions.length ? 'See results' : 'Next question'}
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {/* Summary screen */}
        {phase === 'summary' && (
          <div className="text-center animate-slide-up">
            <div className="mb-6">
              <Preppi
                message={
                  sessionResults.filter(r => r.passed).length >= sessionResults.length * 0.6
                    ? "That's the kind of session that moves the needle. Come back tomorrow."
                    : "Good work putting in the reps. That's what it takes."
                }
                size="lg"
                animate
                className="justify-center"
              />
            </div>

            <div className="premium-panel mb-6 border border-slate-200/80 p-6">
              <div className="flex items-center justify-center gap-2 mb-1">
                <Trophy className="w-6 h-6 text-amber-500" />
                <span className="text-3xl font-extrabold text-amber-500 tabular-nums animate-pop-in">{xp} XP</span>
              </div>
              <p className="text-xs text-gray-400 mb-5">earned this session</p>

              <div className="grid grid-cols-3 gap-4 mb-6">
                <div className="text-center">
                  <div className="text-2xl font-bold text-gray-900">{sessionResults.length}</div>
                  <div className="text-xs text-gray-400 mt-0.5">Questions</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-emerald-600">{sessionResults.filter(r => r.passed).length}</div>
                  <div className="text-xs text-gray-400 mt-0.5">Passed</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-gray-900">
                    {sessionResults.length > 0
                      ? Math.round((sessionResults.reduce((sum, r) => sum + r.score, 0) / sessionResults.length) * 10) / 10
                      : 0}
                  </div>
                  <div className="text-xs text-gray-400 mt-0.5">Avg score</div>
                </div>
              </div>

              <div className="space-y-2 text-left">
                {sessionResults.map((r, i) => (
                  <div key={i} className={`flex items-center gap-3 px-4 py-3 rounded-xl ${r.passed ? 'bg-emerald-50' : 'bg-gray-50'}`}>
                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-sm font-bold shrink-0 ${r.passed ? 'bg-emerald-100 text-emerald-700' : 'bg-gray-200 text-gray-600'}`}>
                      {r.score}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-semibold text-gray-500 truncate">{r.criterion.replace(/_/g, ' ')}</p>
                      <p className="text-xs text-gray-400 truncate">{r.question.slice(0, 60)}...</p>
                    </div>
                    {r.passed ? <CheckCircle className="w-4 h-4 text-emerald-500 shrink-0" /> : <X className="w-4 h-4 text-gray-300 shrink-0" />}
                  </div>
                ))}
              </div>
            </div>

            <div className="flex flex-col gap-3">
              <button
                onClick={() => { setCurrentIndex(0); setPhase('intro'); setSessionResults([]); setXp(0); setConfettiActive(false) }}
                className="flex items-center justify-center gap-2 py-3 border border-gray-200 rounded-xl text-sm font-semibold text-gray-600 hover:bg-gray-50 active:scale-95 transition-all"
              >
                <RotateCcw className="w-4 h-4" />Drill again
              </button>
              <button
                onClick={() => router.push(sessionId ? `/interview/feedback?sessionId=${sessionId}` : '/dashboard')}
                className="btn-coach-primary flex items-center justify-center gap-2 py-3 text-sm"
              >
                Back to report
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
