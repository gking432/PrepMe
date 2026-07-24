'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { ArrowLeft, Check, Lock, Phone } from 'lucide-react'
import { createClient } from '@/lib/supabase-client'
import { isInterviewStageLocked } from '@/lib/interview-stage-access'

type StageKey = 'hr_screen' | 'hiring_manager' | 'culture_fit' | 'final'

const ORDER: StageKey[] = ['hr_screen']

const META: Record<StageKey, { name: string; icon: any; price?: string; optional?: boolean }> = {
  hr_screen: { name: 'HR Screen', icon: Phone },
  hiring_manager: { name: 'Hiring Manager', icon: Phone },
  culture_fit: { name: 'Culture Fit', icon: Phone },
  final: { name: 'Final Round', icon: Phone },
}

interface StageState {
  done: boolean
  score: number | null
  sessionId: string | null
}

type Status = 'complete' | 'current' | 'available' | 'locked'

interface Props {
  currentStageKey: StageKey
  currentSessionData?: any
  onPurchase?: (stage: StageKey) => void
}

function readJobMeta(currentSessionData: any) {
  const jobText = currentSessionData?.job_description_text || currentSessionData?.user_interview_data?.job_description_text || ''
  const company =
    currentSessionData?.company_name ||
    (typeof jobText === 'string' ? jobText.match(/^Company:\s*(.+)$/m)?.[1]?.trim() : '') || ''
  const role =
    currentSessionData?.job_title ||
    currentSessionData?.position_title ||
    (typeof jobText === 'string' ? jobText.match(/^Position:\s*(.+)$/m)?.[1]?.trim() : '') || ''
  return { company, role }
}

export default function ProcessSidebar({ currentStageKey, currentSessionData, onPurchase }: Props) {
  const router = useRouter()
  const [stages, setStages] = useState<Record<StageKey, StageState> | null>(null)
  const [interviewDataId, setInterviewDataId] = useState<string | null>(null)
  const [stageAccess, setStageAccess] = useState<Record<string, { hasAccess?: boolean }>>({})
  const [meta, setMeta] = useState<{ company: string; role: string }>({ company: '', role: '' })

  useEffect(() => {
    let cancelled = false
    const load = async () => {
      const supabase = createClient()
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) return

      fetch('/api/payments/status')
        .then((r) => (r.ok ? r.json() : null))
        .then((d) => { if (d && !cancelled) setStageAccess(d.stageAccess || {}) })
        .catch(() => {})

      const m = readJobMeta(currentSessionData)
      if (!cancelled) setMeta(m)

      const { data: sessions } = await supabase
        .from('interview_sessions')
        .select(`id, stage, status, completed_at, user_interview_data_id, user_interview_data(job_description_text), interview_feedback(id, overall_score, created_at)`)
        .eq('user_id', session.user.id)
        .eq('status', 'completed')
        .order('created_at', { ascending: false })

      if (cancelled) return

      const next: Record<StageKey, StageState> = {
        hr_screen: { done: false, score: null, sessionId: null },
        hiring_manager: { done: false, score: null, sessionId: null },
        culture_fit: { done: false, score: null, sessionId: null },
        final: { done: false, score: null, sessionId: null },
      }
      let dataId: string | null = null

      ;(sessions || []).forEach((row: any) => {
        if (!row.interview_feedback?.length) return
        const t = row.user_interview_data?.job_description_text || ''
        const rc = (typeof t === 'string' ? t.match(/^Company:\s*(.+)$/m)?.[1]?.trim() : '') || ''
        const rr = (typeof t === 'string' ? t.match(/^Position:\s*(.+)$/m)?.[1]?.trim() : '') || ''
        if ((m.company && rc !== m.company) || (m.role && rr !== m.role)) return
        const sk: StageKey =
          row.stage === 'team_interview' ? 'culture_fit' : row.stage === 'final_interview' ? 'final' : row.stage
        if (!ORDER.includes(sk)) return
        if (!dataId && row.user_interview_data_id) dataId = row.user_interview_data_id
        if (!next[sk].sessionId) {
          const latestFb = [...row.interview_feedback].sort((a: any, b: any) =>
            new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime()
          )[0]
          next[sk] = { done: true, score: latestFb?.overall_score ?? null, sessionId: row.id }
        }
      })

      setStages(next)
      setInterviewDataId(dataId)
    }
    load()
    return () => { cancelled = true }
  }, [currentSessionData])

  const completedCount = stages ? ORDER.filter((s) => stages[s].done).length : 0

  const statusOf = (stage: StageKey): Status => {
    if (stage === currentStageKey) return 'current'
    if (!stages) return 'available'
    if (stages[stage].done) return 'complete'
    if (isInterviewStageLocked(stageAccess?.[stage]?.hasAccess, stage)) return 'locked'
    return 'available'
  }

  const click = (stage: StageKey, status: Status) => {
    if (status === 'current') return
    if (status === 'complete' && stages?.[stage].sessionId) {
      router.push(`/interview/feedback?sessionId=${stages[stage].sessionId}&stage=${stage}`)
      return
    }
    if (status === 'locked') { onPurchase?.(stage); return }
    if (status === 'available') {
      if (interviewDataId) localStorage.setItem('prepme_retake_interview_data_id', interviewDataId)
      router.push(`/interview?stage=${stage}`)
    }
  }

  const headline = [meta.role, meta.company].filter(Boolean).join(' at ') || 'Current prep'

  return (
    <aside className="flex h-full min-h-0 flex-col rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      <Link
        href="/dashboard"
        className="inline-flex w-fit items-center gap-1.5 text-sm font-medium text-slate-500 transition-colors hover:text-slate-900"
      >
        <ArrowLeft className="h-4 w-4" /> My Preps
      </Link>

      <div className="mt-3">
        <p className="text-xs font-semibold uppercase tracking-wider text-accent-600">Interview Prep</p>
        <h2 className="mt-1 line-clamp-2 text-base font-bold tracking-tight text-slate-900">{headline}</h2>
        <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-slate-200">
          <div className="h-full rounded-full bg-accent-600 transition-all" style={{ width: `${(completedCount / ORDER.length) * 100}%` }} />
        </div>
        <p className="mt-1.5 text-[11px] font-semibold uppercase tracking-wider text-slate-500">{completedCount} of 1 complete</p>
      </div>

      <div className="mt-4 -mx-1.5 space-y-1">
        {ORDER.map((stage) => {
          const m = META[stage]
          const st = stages?.[stage]
          const status = statusOf(stage)
          const Icon = m.icon
          const isCurrent = status === 'current'
          const isComplete = status === 'complete'
          const isLocked = status === 'locked'

          const row = isCurrent
            ? 'bg-accent-50 ring-1 ring-accent-200 cursor-default'
            : 'hover:bg-slate-50'

          const ring = isComplete
            ? 'bg-emerald-100 text-emerald-700'
            : isCurrent
            ? 'bg-accent-600 text-white'
            : isLocked
            ? 'bg-slate-100 text-slate-400'
            : 'bg-slate-100 text-slate-500'

          return (
            <button
              key={stage}
              type="button"
              onClick={() => click(stage, status)}
              disabled={isCurrent}
              className={`flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left transition-colors ${row}`}
            >
              <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full ${ring}`}>
                {isComplete ? <Check className="h-4 w-4" /> : isLocked ? <Lock className="h-4 w-4" /> : <Icon className="h-4 w-4" />}
              </div>
              <div className="min-w-0 flex-1">
                <p className={`truncate text-sm font-semibold ${isCurrent ? 'text-accent-700' : 'text-slate-900'}`}>
                  {m.name}
                  {m.optional && <span className="ml-1.5 text-[10px] font-medium text-slate-400">· optional</span>}
                </p>
                <p className="truncate text-xs text-slate-500">
                  {isCurrent
                    ? 'Reviewing now'
                    : isComplete && st?.score != null
                    ? `Score ${st.score}/10`
                    : isLocked
                    ? `Locked · ${m.price}`
                    : 'Not started'}
                </p>
              </div>
            </button>
          )
        })}
      </div>
    </aside>
  )
}
