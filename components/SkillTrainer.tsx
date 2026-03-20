'use client'

import { useState, useRef, useCallback } from 'react'
import { CheckCircle, ChevronDown, ChevronUp, RotateCcw, Send, Zap, Mic, MicOff, Trophy } from 'lucide-react'
import Confetti from './Confetti'
import { useGameFeedback } from '@/hooks/useGameFeedback'

interface SkillCard {
  id: string
  criterion: string
  score: number
  feedback: string
  question: string
  originalAnswer: string
}

interface CardResult {
  score: number
  passed: boolean
  feedbackSummary: string
}

interface SkillTrainerProps {
  feedback: any
  sessionId?: string
  currentStage?: string
  structuredTranscript: any
}

const XP_PASS = 50
const XP_ATTEMPT = 15

function scoreColor(score: number) {
  if (score >= 7) return { bar: 'bg-emerald-500', text: 'text-emerald-600', bg: 'bg-emerald-50', border: 'border-emerald-200' }
  if (score >= 5) return { bar: 'bg-amber-400', text: 'text-amber-600', bg: 'bg-amber-50', border: 'border-amber-200' }
  return { bar: 'bg-red-400', text: 'text-red-500', bg: 'bg-red-50', border: 'border-red-200' }
}

function ScoreBar({ score }: { score: number }) {
  const c = scoreColor(score)
  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden">
        <div className={`h-full ${c.bar} rounded-full transition-all duration-700`} style={{ width: `${score * 10}%` }} />
      </div>
      <span className={`text-xs font-bold tabular-nums ${c.text}`}>{score}/10</span>
    </div>
  )
}

export default function SkillTrainer({ feedback, sessionId, currentStage, structuredTranscript }: SkillTrainerProps) {
  const { ding } = useGameFeedback()

  // ── Build skill cards from feedback data ───────────────────────────────────
  const buildCards = (): SkillCard[] => {
    const cards: SkillCard[] = []

    // Primary source: six_areas (what_needs_improve)
    const sixAreas = feedback?.hr_screen_six_areas || feedback?.hiring_manager_six_areas ||
      feedback?.full_rubric?.hr_screen_six_areas || feedback?.full_rubric?.hiring_manager_six_areas
    if (sixAreas?.what_needs_improve?.length > 0) {
      sixAreas.what_needs_improve.forEach((area: any, i: number) => {
        const firstEvidence = area.evidence?.[0]
        const question = structuredTranscript?.questions_asked?.find(
          (q: any) => q.id === firstEvidence?.question_id
        )?.question || firstEvidence?.question || `Tell me about your ${area.criterion}`
        cards.push({
          id: `six-${i}`,
          criterion: area.criterion,
          score: area.score ?? 5,
          feedback: area.feedback,
          question,
          originalAnswer: firstEvidence?.excerpt || '',
        })
      })
      return cards.slice(0, 6)
    }

    // Fallback: areaScores where score < 7
    if (feedback?.area_scores) {
      Object.entries(feedback.area_scores).forEach(([criterion, score]: [string, any]) => {
        if (score <= 6) {
          const fb = feedback.area_feedback?.[criterion] || ''
          cards.push({
            id: `area-${criterion}`,
            criterion: criterion.replace(/_/g, ' '),
            score: score,
            feedback: fb,
            question: `Let's work on: ${criterion.replace(/_/g, ' ')}`,
            originalAnswer: '',
          })
        }
      })
      return cards.slice(0, 6)
    }

    // Fallback: weaknesses list
    if (feedback?.weaknesses?.length > 0) {
      feedback.weaknesses.slice(0, 5).forEach((weakness: string, i: number) => {
        cards.push({
          id: `weak-${i}`,
          criterion: weakness.slice(0, 40),
          score: 5,
          feedback: weakness,
          question: `Tell me about: ${weakness}`,
          originalAnswer: '',
        })
      })
    }

    return cards
  }

  const initialCards = buildCards()

  // ── Component state ────────────────────────────────────────────────────────
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [answers, setAnswers] = useState<Record<string, string>>({})
  const [submitting, setSubmitting] = useState<Record<string, boolean>>({})
  const [results, setResults] = useState<Record<string, CardResult>>({})
  const [xpKey, setXpKey] = useState(0)
  const [totalXp, setTotalXp] = useState(0)
  const [lastXpGain, setLastXpGain] = useState(0)
  const [confetti, setConfetti] = useState(false)
  const [correctFlash, setCorrectFlash] = useState(false)
  const [inputMode, setInputMode] = useState<'text' | 'voice'>('text')
  const [recording, setRecording] = useState<Record<string, boolean>>({})
  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const audioChunksRef = useRef<Blob[]>([])

  const passedIds = Object.entries(results).filter(([, r]) => (r as CardResult).passed).map(([id]) => id)
  const allPassed = initialCards.length > 0 && passedIds.length >= initialCards.length

  const handleSubmitText = useCallback(async (card: SkillCard) => {
    const answer = answers[card.id]?.trim()
    if (!answer) return
    setSubmitting(s => ({ ...s, [card.id]: true }))
    try {
      const res = await fetch('/api/interview/practice', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessionId,
          questionId: card.id,
          question: card.question,
          originalAnswer: card.originalAnswer,
          stage: currentStage,
          answer,
        }),
      })
      const data = await res.json()
      if (data.success) {
        const result: CardResult = {
          score: data.score ?? 5,
          passed: data.passed ?? false,
          feedbackSummary: data.feedback || data.summary || '',
        }
        setResults(r => ({ ...r, [card.id]: result }))
        const gain = result.passed ? XP_PASS : XP_ATTEMPT
        setTotalXp(x => x + gain)
        setLastXpGain(gain)
        setXpKey(k => k + 1)
        if (result.passed) {
          ding()
          setCorrectFlash(true)
          setTimeout(() => setCorrectFlash(false), 700)
          const newPassed = passedIds.length + 1
          if (newPassed >= initialCards.length && initialCards.length > 0) {
            setTimeout(() => setConfetti(true), 300)
          }
        }
      }
    } catch (err) {
      console.error('Practice submit error:', err)
    } finally {
      setSubmitting(s => ({ ...s, [card.id]: false }))
    }
  }, [answers, sessionId, currentStage, ding, passedIds.length, initialCards.length])

  const startRecording = async (cardId: string) => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      const mr = new MediaRecorder(stream, { mimeType: 'audio/webm' })
      mediaRecorderRef.current = mr
      audioChunksRef.current = []
      mr.ondataavailable = e => { if (e.data.size > 0) audioChunksRef.current.push(e.data) }
      mr.onstop = async () => {
        stream.getTracks().forEach(t => t.stop())
        const blob = new Blob(audioChunksRef.current, { type: 'audio/webm' })
        await submitAudio(cardId, blob)
      }
      mr.start()
      setRecording(r => ({ ...r, [cardId]: true }))
    } catch { alert('Microphone access required.') }
  }

  const stopRecording = (cardId: string) => {
    if (mediaRecorderRef.current?.state === 'recording') {
      mediaRecorderRef.current.stop()
      setRecording(r => ({ ...r, [cardId]: false }))
    }
  }

  const submitAudio = async (cardId: string, blob: Blob) => {
    const card = initialCards.find(c => c.id === cardId)
    if (!card) return
    setSubmitting(s => ({ ...s, [cardId]: true }))
    try {
      const fd = new FormData()
      fd.append('audio', blob, 'recording.webm')
      if (sessionId) fd.append('sessionId', sessionId)
      fd.append('questionId', card.id)
      fd.append('question', card.question)
      fd.append('originalAnswer', card.originalAnswer)
      if (currentStage) fd.append('stage', currentStage)
      const res = await fetch('/api/interview/practice', { method: 'POST', body: fd })
      const data = await res.json()
      if (data.success) {
        const result: CardResult = {
          score: data.score ?? 5,
          passed: data.passed ?? false,
          feedbackSummary: data.feedback || data.summary || '',
        }
        setResults(r => ({ ...r, [cardId]: result }))
        const gain = result.passed ? XP_PASS : XP_ATTEMPT
        setTotalXp(x => x + gain)
        setLastXpGain(gain)
        setXpKey(k => k + 1)
        if (result.passed) {
          ding()
          setCorrectFlash(true)
          setTimeout(() => setCorrectFlash(false), 700)
        }
      }
    } catch { console.error('Audio submit error') }
    finally { setSubmitting(s => ({ ...s, [cardId]: false })) }
  }

  // ── Empty state ────────────────────────────────────────────────────────────
  if (initialCards.length === 0) {
    return (
      <div className="text-center py-16 px-4">
        <div className="text-5xl mb-4">🎯</div>
        <h3 className="text-xl font-bold text-gray-900 mb-2">All areas looking strong</h3>
        <p className="text-gray-500 max-w-sm mx-auto">
          No weak spots to drill from this session. That's a good sign — consider leveling up to the next round.
        </p>
      </div>
    )
  }

  // ── All passed ─────────────────────────────────────────────────────────────
  if (allPassed) {
    return (
      <div className="text-center py-16 px-4">
        <Confetti active={confetti} />
        <div className="inline-flex items-center justify-center w-20 h-20 bg-emerald-100 rounded-full mb-4">
          <Trophy className="w-10 h-10 text-emerald-600" />
        </div>
        <h3 className="text-2xl font-extrabold text-gray-900 mb-2">All areas mastered!</h3>
        <p className="text-gray-500 mb-4">You earned <span className="font-bold text-amber-600">{totalXp} XP</span> this session.</p>
        <p className="text-sm text-gray-400">You're ready to level up to the next interview round.</p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* CORRECT! flash */}
      {correctFlash && (
        <div className="fixed inset-0 z-40 flex items-center justify-center pointer-events-none animate-correct-flash">
          <div className="bg-emerald-500 text-white text-4xl font-extrabold px-10 py-6 rounded-3xl shadow-2xl tracking-wide">
            CORRECT!
          </div>
        </div>
      )}

      <Confetti active={confetti} />

      {/* XP + progress header */}
      {totalXp > 0 && (
        <div className="flex items-center gap-3 px-1 py-2 relative">
          <Zap className="w-4 h-4 text-amber-500 shrink-0" />
          <div className="flex-1 h-2.5 bg-gray-100 rounded-full overflow-hidden">
            <div
              className="h-full bg-amber-400 rounded-full transition-all duration-700"
              style={{ width: `${Math.min((passedIds.length / initialCards.length) * 100, 100)}%` }}
            />
          </div>
          <span className="text-sm font-bold text-amber-600 tabular-nums">{totalXp} XP</span>
          {lastXpGain > 0 && (
            <span key={xpKey} className="absolute right-0 text-sm font-extrabold text-amber-500 animate-fly-up">
              +{lastXpGain} XP
            </span>
          )}
        </div>
      )}

      <p className="text-xs text-gray-400 px-1">
        {passedIds.length} of {initialCards.length} areas mastered · tap a card to practice
      </p>

      {/* Skill cards */}
      {initialCards.map(card => {
        const isPassed = results[card.id]?.passed
        const hasResult = !!results[card.id]
        const isExpanded = expandedId === card.id
        const isSubmitting = submitting[card.id]
        const isRecording = recording[card.id]
        const c = scoreColor(isPassed ? (results[card.id]?.score ?? card.score) : card.score)

        return (
          <div
            key={card.id}
            className={`bg-white rounded-2xl border-2 overflow-hidden transition-all ${
              isPassed
                ? 'border-emerald-300'
                : isExpanded
                ? 'border-violet-400 shadow-lg shadow-violet-50'
                : 'border-gray-200'
            }`}
          >
            {/* Card header — always visible */}
            <button
              className="w-full text-left px-5 py-4"
              onClick={() => setExpandedId(isExpanded ? null : card.id)}
              disabled={isPassed}
            >
              <div className="flex items-start justify-between gap-3 mb-2">
                <div className="flex items-center gap-2 min-w-0">
                  {isPassed
                    ? <CheckCircle className="w-5 h-5 text-emerald-500 shrink-0" />
                    : <div className={`w-2 h-2 rounded-full shrink-0 mt-1 ${c.bar}`} />
                  }
                  <p className={`font-bold text-sm truncate ${isPassed ? 'text-emerald-700' : 'text-gray-900'}`}>
                    {card.criterion}
                  </p>
                </div>
                {isPassed
                  ? <span className="text-xs font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full shrink-0">MASTERED</span>
                  : isExpanded ? <ChevronUp className="w-4 h-4 text-gray-400 shrink-0" /> : <ChevronDown className="w-4 h-4 text-gray-400 shrink-0" />
                }
              </div>
              <ScoreBar score={isPassed ? (results[card.id]?.score ?? card.score) : card.score} />
              {!isExpanded && !isPassed && (
                <p className="text-xs text-gray-400 mt-2 line-clamp-2">{card.feedback}</p>
              )}
            </button>

            {/* Expanded practice area */}
            {isExpanded && !isPassed && (
              <div className="border-t border-gray-100 px-5 pb-5 space-y-4">
                {/* Feedback from report */}
                <div className="bg-gray-50 rounded-xl p-3">
                  <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-1">From your report</p>
                  <p className="text-sm text-gray-700 leading-relaxed">{card.feedback}</p>
                </div>

                {/* Question */}
                <div>
                  <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-1.5">Practice question</p>
                  <p className="text-sm font-semibold text-gray-900 leading-snug">{card.question}</p>
                </div>

                {/* Original answer if exists */}
                {card.originalAnswer && (
                  <div>
                    <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-1.5">Your original answer</p>
                    <p className="text-xs text-gray-400 italic leading-relaxed line-clamp-3">"{card.originalAnswer}"</p>
                  </div>
                )}

                {/* Result from previous attempt */}
                {hasResult && !results[card.id].passed && (
                  <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 animate-slide-up">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-sm font-bold text-amber-700">{results[card.id].score}/10</span>
                      <span className="text-xs text-amber-600">— keep going</span>
                    </div>
                    <p className="text-xs text-amber-800 leading-relaxed">{results[card.id].feedbackSummary}</p>
                  </div>
                )}

                {/* Input mode toggle */}
                <div className="flex rounded-xl border border-gray-200 overflow-hidden text-sm">
                  <button
                    onClick={() => setInputMode('text')}
                    className={`flex-1 py-2 font-semibold transition-colors ${inputMode === 'text' ? 'bg-violet-600 text-white' : 'text-gray-500 hover:bg-gray-50'}`}
                  >
                    Type
                  </button>
                  <button
                    onClick={() => setInputMode('voice')}
                    className={`flex-1 py-2 font-semibold transition-colors ${inputMode === 'voice' ? 'bg-violet-600 text-white' : 'text-gray-500 hover:bg-gray-50'}`}
                  >
                    Voice
                  </button>
                </div>

                {/* Text input */}
                {inputMode === 'text' && (
                  <div className="space-y-2">
                    <textarea
                      value={answers[card.id] || ''}
                      onChange={e => setAnswers(a => ({ ...a, [card.id]: e.target.value }))}
                      rows={4}
                      placeholder="Give a clear, specific answer. Use a real example (STAR format)."
                      className="w-full px-4 py-3 text-sm border-2 border-gray-200 rounded-xl focus:outline-none focus:border-violet-400 resize-none transition-colors"
                    />
                    <div className="flex gap-2">
                      <button
                        onClick={() => { setExpandedId(null); setAnswers(a => ({ ...a, [card.id]: '' })) }}
                        className="flex-1 py-2.5 border border-gray-200 rounded-xl text-sm font-semibold text-gray-500 hover:bg-gray-50 active:scale-95 transition-all"
                      >
                        Cancel
                      </button>
                      <button
                        onClick={() => handleSubmitText(card)}
                        disabled={!answers[card.id]?.trim() || isSubmitting}
                        className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-violet-600 text-white rounded-xl text-sm font-bold disabled:opacity-40 hover:bg-violet-700 active:scale-95 transition-all"
                      >
                        {isSubmitting
                          ? <><div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />Scoring...</>
                          : <><Send className="w-4 h-4" />Submit</>
                        }
                      </button>
                    </div>
                  </div>
                )}

                {/* Voice input */}
                {inputMode === 'voice' && (
                  <div className="text-center py-4 space-y-3">
                    {isSubmitting ? (
                      <div className="flex flex-col items-center gap-2">
                        <div className="w-8 h-8 border-2 border-violet-500 border-t-transparent rounded-full animate-spin" />
                        <p className="text-sm text-gray-500">Scoring your answer…</p>
                      </div>
                    ) : isRecording ? (
                      <>
                        <div className="w-16 h-16 bg-red-50 rounded-full flex items-center justify-center mx-auto">
                          <div className="w-5 h-5 bg-red-500 rounded-full animate-pulse" />
                        </div>
                        <p className="text-sm font-semibold text-red-600">Recording…</p>
                        <button
                          onClick={() => stopRecording(card.id)}
                          className="flex items-center gap-2 px-6 py-3 bg-red-500 text-white rounded-xl font-semibold text-sm mx-auto active:scale-95 transition-all"
                        >
                          <MicOff className="w-4 h-4" />Done
                        </button>
                      </>
                    ) : (
                      <>
                        <button
                          onClick={() => startRecording(card.id)}
                          className="w-16 h-16 bg-violet-50 rounded-full flex items-center justify-center mx-auto hover:bg-violet-100 active:scale-95 transition-all"
                        >
                          <Mic className="w-7 h-7 text-violet-600" />
                        </button>
                        <p className="text-sm text-gray-400">Tap to record your answer</p>
                      </>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* Passed result footer */}
            {isPassed && results[card.id] && (
              <div className="border-t border-emerald-100 bg-emerald-50 px-5 py-3">
                <p className="text-xs text-emerald-700 leading-relaxed">{results[card.id].feedbackSummary}</p>
              </div>
            )}
          </div>
        )
      })}

      {/* Retry hint */}
      {Object.keys(results).length > 0 && passedIds.length < initialCards.length && (
        <button
          onClick={() => {
            setResults({})
            setAnswers({})
            setExpandedId(null)
            setTotalXp(0)
            setLastXpGain(0)
          }}
          className="flex items-center gap-2 text-sm text-gray-400 hover:text-gray-600 py-2 mx-auto"
        >
          <RotateCcw className="w-4 h-4" />Reset all
        </button>
      )}
    </div>
  )
}
