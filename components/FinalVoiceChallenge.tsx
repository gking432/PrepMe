'use client'

import { useState, useRef, useCallback } from 'react'
import { Mic, MicOff, Star, RotateCcw, ArrowRight } from 'lucide-react'
import Preppi from '@/components/Preppi'
import Confetti from '@/components/Confetti'
import { useGameFeedback } from '@/hooks/useGameFeedback'

interface FinalVoiceChallengeProps {
  question: string
  originalAnswer?: string
  sessionId?: string
  currentStage?: string
  criterion: string
  onComplete: (passed: boolean, xpEarned: number) => void
  onClose: () => void
  embeddedDesktop?: boolean
}

const PASS_THRESHOLD = 7
const XP_SUBMIT = 25
const XP_PASS = 25

function scoreColor(score: number) {
  if (score >= 7) return { bg: 'bg-emerald-50', border: 'border-emerald-200', text: 'text-emerald-700' }
  if (score >= 5) return { bg: 'bg-amber-50', border: 'border-amber-200', text: 'text-amber-700' }
  return { bg: 'bg-red-50', border: 'border-red-200', text: 'text-red-700' }
}

export default function FinalVoiceChallenge({
  question,
  originalAnswer,
  sessionId,
  currentStage,
  criterion,
  onComplete,
  onClose,
  embeddedDesktop = false,
}: FinalVoiceChallengeProps) {
  const { ding } = useGameFeedback()
  const [recording, setRecording] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [result, setResult] = useState<{ score: number; passed: boolean; feedback: string } | null>(null)
  const [confetti, setConfetti] = useState(false)
  const [xp, setXp] = useState(0)

  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const audioChunksRef = useRef<Blob[]>([])

  const submitAudio = useCallback(async (blob: Blob) => {
    setSubmitting(true)
    const earned = XP_SUBMIT
    setXp(earned)
    try {
      const fd = new FormData()
      fd.append('audio', blob, 'recording.webm')
      if (sessionId) fd.append('sessionId', sessionId)
      fd.append('questionId', 'final_voice')
      fd.append('question', question)
      fd.append('originalAnswer', originalAnswer || '')
      if (currentStage) fd.append('stage', currentStage)
      fd.append('criterion', criterion)

      const res = await fetch('/api/interview/practice', { method: 'POST', body: fd })
      const data = await res.json()

      const score = data.score ?? 5
      const passed = data.passed ?? score >= PASS_THRESHOLD
      const feedback = data.feedback || ''

      setResult({ score, passed, feedback })
      if (passed) {
        setXp(XP_SUBMIT + XP_PASS)
        ding()
        setConfetti(true)
        setTimeout(() => setConfetti(false), 3000)
      }
    } catch {
      setResult({ score: 5, passed: false, feedback: 'Scoring unavailable. Keep practicing!' })
    } finally {
      setSubmitting(false)
    }
  }, [sessionId, question, originalAnswer, currentStage, criterion, ding])

  const startRecording = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      const mr = new MediaRecorder(stream, { mimeType: 'audio/webm' })
      mediaRecorderRef.current = mr
      audioChunksRef.current = []
      mr.ondataavailable = (e) => { if (e.data.size > 0) audioChunksRef.current.push(e.data) }
      mr.onstop = async () => {
        stream.getTracks().forEach(t => t.stop())
        await submitAudio(new Blob(audioChunksRef.current, { type: 'audio/webm' }))
      }
      mr.start()
      setRecording(true)
    } catch {
      alert('Microphone access is required.')
    }
  }, [submitAudio])

  const stopRecording = useCallback(() => {
    if (mediaRecorderRef.current?.state === 'recording') {
      mediaRecorderRef.current.stop()
      setRecording(false)
    }
  }, [])

  const handleRetry = () => {
    setResult(null)
    setXp(0)
  }

  return (
    <>
      <Confetti active={confetti} />

      {/* Mobile: full-screen */}
      <div className="md:hidden fixed inset-0 z-40 bg-white flex flex-col overflow-hidden">
        <div className="px-4 pt-4 pb-2 shrink-0 flex items-center gap-3">
          <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-full text-gray-400 hover:text-gray-600 shrink-0">
            ✕
          </button>
          <div className="flex-1 h-4 bg-gray-100 rounded-full overflow-hidden">
            <div className="h-full w-full rounded-full" style={{ background: 'linear-gradient(90deg,#58CC02,#7ade1a)', boxShadow: 'inset 0 -3px 0 rgba(0,0,0,0.15)' }} />
          </div>
        </div>
        <div className="flex-1 overflow-y-auto px-4 pb-8">
          <Inner
            question={question}
            originalAnswer={originalAnswer}
            result={result}
            recording={recording}
            submitting={submitting}
            xp={xp}
            onStart={startRecording}
            onStop={stopRecording}
            onRetry={handleRetry}
            onComplete={() => onComplete(result?.passed ?? false, xp)}
          />
        </div>
      </div>

      {/* Desktop: modal */}
      <div className={`hidden md:flex ${embeddedDesktop ? 'md:relative md:inset-auto md:min-h-[720px] md:items-stretch md:justify-start md:bg-transparent md:backdrop-blur-0' : 'fixed inset-0 z-40 items-center justify-center bg-black/30 backdrop-blur-sm'}`}>
        <div className="flex max-h-[90vh] w-full max-w-2xl flex-col overflow-hidden rounded-2xl bg-white shadow-2xl md:max-h-none">
          <div className="px-6 pt-5 pb-3 shrink-0 border-b border-gray-100 flex items-center gap-3">
            <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-full text-gray-400 hover:text-gray-600 shrink-0">✕</button>
            <div className="flex-1 h-4 bg-gray-100 rounded-full overflow-hidden">
              <div className="h-full w-full rounded-full" style={{ background: 'linear-gradient(90deg,#58CC02,#7ade1a)', boxShadow: 'inset 0 -3px 0 rgba(0,0,0,0.15)' }} />
            </div>
          </div>
          <div className="flex-1 overflow-y-auto px-6 py-6">
            <Inner
              question={question}
              originalAnswer={originalAnswer}
              result={result}
              recording={recording}
              submitting={submitting}
              xp={xp}
              onStart={startRecording}
              onStop={stopRecording}
              onRetry={handleRetry}
              onComplete={() => onComplete(result?.passed ?? false, xp)}
            />
          </div>
        </div>
      </div>
    </>
  )
}

function Inner({
  question, originalAnswer, result, recording, submitting, xp,
  onStart, onStop, onRetry, onComplete,
}: {
  question: string
  originalAnswer?: string
  result: { score: number; passed: boolean; feedback: string } | null
  recording: boolean
  submitting: boolean
  xp: number
  onStart: () => void
  onStop: () => void
  onRetry: () => void
  onComplete: () => void
}) {
  const colors = result ? scoreColor(result.score) : null

  return (
    <div className="space-y-5 py-4 animate-slide-up">
      {/* Badge */}
      <div className="text-center">
        <div className="inline-flex items-center gap-2 px-3 py-1 bg-amber-50 text-amber-700 text-xs font-bold rounded-full mb-3">
          <Star className="w-3 h-3" />
          Final Challenge
        </div>
        <h3 className="text-xl font-extrabold text-gray-900">Put it all together</h3>
        <p className="text-sm text-gray-500 mt-1">Answer out loud using everything you&apos;ve learned.</p>
      </div>

      <Preppi
        message={
          result
            ? result.passed
              ? 'Amazing! You nailed it! 🌟'
              : "Good effort! Review and try again when you're ready."
            : 'This is the real question that was flagged. Show me what you learned!'
        }
        size="sm"
      />

      {/* Question */}
      <div className="bg-[#eff6ff] border border-[#bfdbfe] rounded-2xl p-5">
        <p className="text-xs font-semibold text-[#1CB0F6] uppercase tracking-wide mb-2">Interview Question</p>
        <p className="text-base font-semibold text-gray-900 leading-relaxed">{question}</p>
      </div>

      {/* Original answer */}
      {originalAnswer && (
        <div className="bg-red-50 border border-red-100 rounded-xl p-4">
          <p className="text-xs font-semibold text-red-400 uppercase tracking-wide mb-1">Your original answer</p>
          <p className="text-sm text-red-700 italic leading-relaxed line-clamp-3">&ldquo;{originalAnswer}&rdquo;</p>
        </div>
      )}

      {/* Score result */}
      {result && colors && (
        <div className={`rounded-xl p-4 border animate-slide-up ${colors.bg} ${colors.border}`}>
          <div className="flex items-center gap-2 mb-1">
            <span className={`text-sm font-bold ${colors.text}`}>{result.score}/10</span>
            <span className={`text-xs ${colors.text}`}>
              {result.passed ? '— Great improvement!' : '— Keep practicing'}
            </span>
          </div>
          <p className={`text-xs leading-relaxed ${colors.text}`}>{result.feedback}</p>
          {xp > 0 && (
            <p className="text-xs font-bold text-amber-600 mt-2">+{xp} XP earned</p>
          )}
        </div>
      )}

      {/* Recorder */}
      {!result && (
        <div className="text-center py-6 space-y-3">
          {submitting ? (
            <div className="flex flex-col items-center gap-3">
              <div className="w-8 h-8 border-2 border-[#58CC02] border-t-transparent rounded-full animate-spin" />
              <p className="text-sm text-gray-500">Scoring your answer…</p>
            </div>
          ) : recording ? (
            <>
              <div className="w-20 h-20 bg-red-50 rounded-full flex items-center justify-center mx-auto">
                <div className="w-6 h-6 bg-red-500 rounded-full animate-pulse" />
              </div>
              <p className="text-sm font-semibold text-red-600">Recording…</p>
              <button
                onClick={onStop}
                className="flex items-center gap-2 px-8 py-3 bg-red-500 text-white rounded-xl font-semibold text-sm mx-auto active:scale-95 transition-all"
              >
                <MicOff className="w-4 h-4" /> Done
              </button>
            </>
          ) : (
            <>
              <button
                onClick={onStart}
                className="w-20 h-20 bg-[#d7f5b1] rounded-full flex items-center justify-center mx-auto hover:bg-[#c3f093] active:scale-95 transition-all shadow-lg"
              >
                <Mic className="w-8 h-8 text-[#58CC02]" />
              </button>
              <p className="text-sm text-gray-500 font-medium">Tap to record your answer</p>
              <p className="text-xs text-gray-400">Speak clearly — just like in the real interview</p>
            </>
          )}
        </div>
      )}

      {/* Actions after result */}
      {result && (
        <div className="space-y-3">
          <button
            onClick={onComplete}
            className="w-full btn-duo-green flex items-center justify-center gap-2 py-4"
          >
            {result.passed ? 'Continue' : 'Done for now'}
            <ArrowRight className="w-5 h-5" />
          </button>
          {!result.passed && (
            <button
              onClick={onRetry}
              className="w-full btn-duo-white flex items-center justify-center gap-2 py-3.5 text-sm"
            >
              <RotateCcw className="w-4 h-4" /> Try Again
            </button>
          )}
        </div>
      )}
    </div>
  )
}
