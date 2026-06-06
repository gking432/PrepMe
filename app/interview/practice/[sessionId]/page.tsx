'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase-client'
import PracticePath, { type WeakSignal } from '@/components/PracticePath'

const STAGE_LABEL: Record<string, string> = {
  hr_screen: 'HR Screen',
  hiring_manager: 'Hiring Manager',
  culture_fit: 'Culture Fit',
  final_interview: 'Final Round',
  final: 'Final Round',
}

export default function PracticeForSessionPage() {
  const params = useParams<{ sessionId: string }>()
  const router = useRouter()
  const sessionId = params?.sessionId
  const [weakSignals, setWeakSignals] = useState<WeakSignal[]>([])
  const [transcript, setTranscript] = useState<any>(null)
  const [stage, setStage] = useState<string>('hr_screen')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string>('')

  useEffect(() => {
    if (!sessionId) {
      setError('Missing session')
      setLoading(false)
      return
    }

    const supabase = createClient()
    let cancelled = false

    async function load() {
      try {
        const { data: sessionRow, error: sessionErr } = await supabase
          .from('interview_sessions')
          .select('*')
          .eq('id', sessionId)
          .maybeSingle()

        if (sessionErr) console.error('practice-path: session load error', sessionErr)
        if (sessionRow?.stage) setStage(sessionRow.stage)
        const ts =
          (sessionRow as any)?.transcript_structured ||
          (sessionRow as any)?.structured_transcript ||
          null
        if (!cancelled && ts) setTranscript(ts)

        const { data: feedbackRows, error: feedbackErr } = await supabase
          .from('interview_feedback')
          .select('*')
          .eq('interview_session_id', sessionId)
          .order('created_at', { ascending: false })

        if (feedbackErr) console.error('practice-path: feedback load error', feedbackErr)
        const feedback = feedbackRows?.[0]
        const sixAreas =
          feedback?.hr_screen_six_areas ||
          feedback?.full_rubric?.hr_screen_six_areas ||
          feedback?.full_rubric?.hiring_manager_six_areas ||
          feedback?.hiring_manager_six_areas
        const list = Array.isArray(sixAreas?.what_needs_improve) ? sixAreas.what_needs_improve : []

        if (!cancelled) {
          setWeakSignals(list as WeakSignal[])
        }
      } catch (e: any) {
        console.error('practice-path: load failed', e)
        if (!cancelled) setError(e?.message || 'Failed to load practice items')
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    load()
    return () => {
      cancelled = true
    }
  }, [sessionId])

  if (!sessionId) return null

  if (loading) {
    return (
      <div className="fixed inset-0 flex items-center justify-center bg-slate-50">
        <div className="text-center">
          <div className="mx-auto h-10 w-10 animate-spin rounded-full border-4 border-violet-200 border-t-violet-600" />
          <p className="mt-4 text-sm font-bold text-slate-700">Loading your practice path…</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="fixed inset-0 flex items-center justify-center bg-slate-50 p-6">
        <div className="max-w-sm rounded-2xl border border-rose-200 bg-white p-6 text-center shadow-sm">
          <p className="text-sm font-bold text-rose-700">{error}</p>
          <button
            onClick={() => router.push('/dashboard')}
            className="mt-4 rounded-xl bg-slate-900 px-4 py-2 text-sm font-bold text-white"
          >
            Back to dashboard
          </button>
        </div>
      </div>
    )
  }

  return (
    <PracticePath
      sessionId={sessionId}
      weakSignals={weakSignals}
      transcript={transcript}
      stageName={STAGE_LABEL[stage] || 'Practice'}
      onClose={() => router.push(`/interview/feedback?sessionId=${sessionId}`)}
    />
  )
}
