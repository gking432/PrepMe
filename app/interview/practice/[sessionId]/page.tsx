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
        const { data: sessionRow } = await supabase
          .from('interview_sessions')
          .select('id, stage')
          .eq('id', sessionId)
          .maybeSingle()

        if (sessionRow?.stage) setStage(sessionRow.stage)

        const { data: feedbackRows } = await supabase
          .from('interview_feedback')
          .select('hr_screen_six_areas, full_rubric')
          .eq('interview_session_id', sessionId)
          .order('created_at', { ascending: false })
          .limit(1)

        const feedback = feedbackRows?.[0]
        const sixAreas =
          feedback?.hr_screen_six_areas || feedback?.full_rubric?.hr_screen_six_areas
        const list = Array.isArray(sixAreas?.what_needs_improve) ? sixAreas.what_needs_improve : []

        if (!cancelled) {
          setWeakSignals(list as WeakSignal[])
        }
      } catch (e: any) {
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
      stageName={STAGE_LABEL[stage] || 'Practice'}
      onClose={() => router.push(`/interview/feedback?sessionId=${sessionId}`)}
    />
  )
}
