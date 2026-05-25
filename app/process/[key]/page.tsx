'use client'

import { useEffect, useMemo, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import {
  ArrowLeft,
  ArrowRight,
  Briefcase,
  Check,
  Crown,
  FileText,
  Lock,
  Phone,
  RotateCcw,
  Sparkles,
  Users,
} from 'lucide-react'
import { createClient } from '@/lib/supabase-client'
import PurchaseFlow from '@/components/PurchaseFlow'
import AppChrome from '@/components/AppChrome'

type StageKey = 'hr_screen' | 'hiring_manager' | 'culture_fit' | 'final'

const STAGE_ORDER: StageKey[] = ['hr_screen', 'hiring_manager', 'culture_fit', 'final']

const STAGE_META: Record<StageKey, { name: string; blurb: string; price?: string; icon: any; optional?: boolean }> = {
  hr_screen: { name: 'HR Screen', blurb: 'Recruiter phone screen — get past the gate.', icon: Phone },
  hiring_manager: { name: 'Hiring Manager', blurb: 'Your future boss demands proof.', price: '$4.99', icon: Briefcase },
  culture_fit: { name: 'Culture Fit', blurb: 'Values, judgment, working style.', price: '$3.99', icon: Users, optional: true },
  final: { name: 'Final Round', blurb: 'Executive pressure and strategy.', price: '$5.99', icon: Crown },
}

interface StageState {
  done: boolean
  score: number | null
  sessionId: string | null
  stageParam: string
}

interface ProcessData {
  companyName: string | null
  positionTitle: string | null
  interviewDataId: string | null
  stages: Record<StageKey, StageState>
}

type NodeStatus = 'complete' | 'available' | 'locked' | 'upcoming'

function groupKeyOf(companyName: string | null, positionTitle: string | null) {
  return `${companyName ?? ''}::${positionTitle ?? ''}`
}

function emptyStages(): Record<StageKey, StageState> {
  return {
    hr_screen: { done: false, score: null, sessionId: null, stageParam: 'hr_screen' },
    hiring_manager: { done: false, score: null, sessionId: null, stageParam: 'hiring_manager' },
    culture_fit: { done: false, score: null, sessionId: null, stageParam: 'culture_fit' },
    final: { done: false, score: null, sessionId: null, stageParam: 'final' },
  }
}

function fmtScore(score: number | null) {
  if (score == null) return null
  return Number.isInteger(score) ? `${score}` : score.toFixed(1)
}

export default function ProcessSpinePage() {
  const router = useRouter()
  const params = useParams<{ key: string }>()
  const decodedKey = useMemo(() => {
    try {
      return decodeURIComponent(Array.isArray(params.key) ? params.key[0] : params.key)
    } catch {
      return Array.isArray(params.key) ? params.key[0] : params.key
    }
  }, [params.key])

  const [loading, setLoading] = useState(true)
  const [process, setProcess] = useState<ProcessData | null>(null)
  const [stageAccess, setStageAccess] = useState<Record<string, { hasAccess?: boolean }>>({})
  const [purchaseStage, setPurchaseStage] = useState<StageKey | null>(null)
  const [userEmail, setUserEmail] = useState<string | undefined>(undefined)

  useEffect(() => {
    let cancelled = false
    const load = async () => {
      const supabase = createClient()
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) {
        router.push('/auth/login')
        return
      }
      if (!cancelled) setUserEmail(session.user.email || undefined)

      // Payment access (non-blocking)
      fetch('/api/payments/status')
        .then((res) => (res.ok ? res.json() : null))
        .then((data) => { if (data && !cancelled) setStageAccess(data.stageAccess || {}) })
        .catch(() => {})

      const { data: sessions } = await supabase
        .from('interview_sessions')
        .select(`
          id, stage, status, created_at, completed_at, user_interview_data_id,
          user_interview_data ( job_description_text ),
          interview_feedback ( id, overall_score )
        `)
        .eq('user_id', session.user.id)
        .eq('status', 'completed')
        .order('created_at', { ascending: false })

      if (cancelled) return

      let found: ProcessData | null = null
      ;(sessions || []).forEach((row: any) => {
        if (!row.interview_feedback?.length) return
        const text = row.user_interview_data?.job_description_text || ''
        const companyName = text.match(/^Company:\s*(.+)$/m)?.[1]?.trim() || null
        const positionTitle = text.match(/^Position:\s*(.+)$/m)?.[1]?.trim() || null
        if (groupKeyOf(companyName, positionTitle) !== decodedKey) return

        const stageKey: StageKey = row.stage === 'team_interview'
          ? 'culture_fit'
          : row.stage === 'final_interview'
          ? 'final'
          : row.stage
        if (!STAGE_ORDER.includes(stageKey)) return

        const proc: ProcessData = found ?? { companyName, positionTitle, interviewDataId: null, stages: emptyStages() }
        found = proc
        if (!proc.interviewDataId && row.user_interview_data_id) {
          proc.interviewDataId = row.user_interview_data_id
        }
        const st = proc.stages[stageKey]
        if (!st.sessionId) {
          st.done = true
          st.score = row.interview_feedback[0]?.overall_score ?? null
          st.sessionId = row.id
        }
      })

      setProcess(found)
      setLoading(false)
    }
    load()
    return () => { cancelled = true }
  }, [decodedKey, router])

  const computed = useMemo(() => {
    if (!process) return null
    const isLocked = (stage: StageKey) => stage !== 'hr_screen' && !stageAccess?.[stage]?.hasAccess
    const statusOf = (stage: StageKey): NodeStatus => {
      if (process.stages[stage].done) return 'complete'
      if (isLocked(stage)) return 'locked'
      return 'available'
    }
    const completedCount = STAGE_ORDER.filter((s) => process.stages[s].done).length
    // Natural next step: earliest stage not yet done.
    const nextStage = STAGE_ORDER.find((s) => !process.stages[s].done) || null
    return { isLocked, statusOf, completedCount, nextStage }
  }, [process, stageAccess])

  const launchStage = (stage: StageKey) => {
    if (process?.interviewDataId) {
      localStorage.setItem('prepme_retake_interview_data_id', process.interviewDataId)
    }
    router.push(`/interview?stage=${stage}`)
  }

  const openFeedback = (stage: StageKey) => {
    const st = process?.stages[stage]
    if (st?.sessionId) router.push(`/interview/feedback?sessionId=${st.sessionId}&stage=${stage}`)
  }

  const handleNodeClick = (stage: StageKey, status: NodeStatus) => {
    if (status === 'complete') openFeedback(stage)
    else if (status === 'locked') setPurchaseStage(stage)
    else launchStage(stage)
  }

  if (loading) {
    return (
      <AppChrome active="preps">
        <div className="flex min-h-[50vh] flex-col items-center justify-center gap-3">
          <div className="h-9 w-9 animate-spin rounded-full border-4 border-slate-200 border-t-accent-600" />
          <p className="text-sm font-medium text-slate-500">Loading your prep…</p>
        </div>
      </AppChrome>
    )
  }

  if (!process || !computed) {
    return (
      <AppChrome active="preps">
        <div className="flex min-h-[50vh] flex-col items-center justify-center gap-4 text-center">
          <Briefcase className="h-10 w-10 text-slate-300" />
          <h1 className="text-xl font-bold text-slate-900">We couldn&apos;t find that prep.</h1>
          <p className="max-w-sm text-sm text-slate-500">It may have been archived, or the link is out of date.</p>
          <Link href="/dashboard" className="btn-coach-primary mt-1 inline-flex items-center gap-2 px-5 py-2.5 text-sm">
            <ArrowLeft className="h-4 w-4" /> Back to My Preps
          </Link>
        </div>
      </AppChrome>
    )
  }

  const { statusOf, completedCount, nextStage } = computed
  const title = [process.positionTitle, process.companyName].filter(Boolean).join(' at ') || 'Interview Process'
  const nextStatus = nextStage ? statusOf(nextStage) : null

  return (
    <AppChrome active="preps" maxWidth="max-w-2xl">
      <div className="flex flex-col">
        {/* Header */}
        <Link href="/dashboard" className="inline-flex w-fit items-center gap-1.5 text-sm font-medium text-slate-500 transition-colors hover:text-slate-900">
          <ArrowLeft className="h-4 w-4" /> My Preps
        </Link>

        <div className="mt-4 flex items-end justify-between gap-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-accent-600">Interview Prep</p>
            <h1 className="mt-1 text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">{title}</h1>
          </div>
          <span className="shrink-0 rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-600">
            {completedCount}/4 done
          </span>
        </div>
        <div className="mt-4 h-2 overflow-hidden rounded-full bg-slate-200">
          <div
            className="h-full rounded-full bg-accent-600 transition-all duration-500"
            style={{ width: `${(completedCount / 4) * 100}%` }}
          />
        </div>

        {/* The path */}
        <div className="relative mt-7">
          <div className="pointer-events-none absolute bottom-6 left-[31px] top-6 w-0.5 bg-[linear-gradient(180deg,#dbe6fe_0%,#e2e8f0_100%)]" />
          <div className="space-y-3">
            {STAGE_ORDER.map((stage) => {
              const meta = STAGE_META[stage]
              const st = process.stages[stage]
              const status = statusOf(stage)
              const isNext = stage === nextStage
              const Icon = meta.icon
              const score = fmtScore(st.score)

              const ring =
                status === 'complete'
                  ? 'border-emerald-500 bg-emerald-500 text-white'
                  : isNext
                  ? 'border-accent-500 bg-accent-600 text-white shadow-[0_0_0_6px_rgba(37,99,235,0.16)]'
                  : status === 'locked'
                  ? 'border-slate-300 bg-white text-slate-400'
                  : 'border-slate-300 bg-white text-slate-500'

              const cardTone =
                status === 'complete'
                  ? 'border-emerald-200 bg-emerald-50/70'
                  : isNext
                  ? 'border-accent-300 bg-white shadow-[0_16px_40px_rgba(37,99,235,0.10)]'
                  : 'border-slate-200 bg-white/70'

              return (
                <button
                  key={stage}
                  type="button"
                  onClick={() => handleNodeClick(stage, status)}
                  className={`relative flex w-full items-center gap-4 rounded-2xl border p-3.5 text-left transition-all hover:-translate-y-0.5 ${cardTone}`}
                >
                  <div className={`relative z-10 flex h-16 w-16 shrink-0 items-center justify-center rounded-full border-4 ${ring}`}>
                    {status === 'complete' ? (
                      <Check className="h-7 w-7" />
                    ) : status === 'locked' ? (
                      <Lock className="h-6 w-6" />
                    ) : (
                      <Icon className="h-6 w-6" />
                    )}
                  </div>

                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="text-base font-bold text-slate-900">{meta.name}</p>
                      {meta.optional && (
                        <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-bold uppercase tracking-[0.14em] text-slate-500">
                          Optional
                        </span>
                      )}
                      {status === 'complete' && score && (
                        <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[11px] font-bold text-emerald-700">{score}/10</span>
                      )}
                      {isNext && status !== 'complete' && (
                        <span className="rounded-full bg-accent-100 px-2 py-0.5 text-[10px] font-bold uppercase tracking-[0.14em] text-accent-700">
                          Next step
                        </span>
                      )}
                    </div>
                    <p className="mt-0.5 truncate text-sm font-semibold text-slate-500">
                      {status === 'complete'
                        ? 'Completed — tap to review feedback'
                        : status === 'locked'
                        ? `Locked · ${meta.price}`
                        : meta.blurb}
                    </p>
                  </div>

                  <div className="shrink-0 text-slate-400">
                    {status === 'complete' ? (
                      <FileText className="h-5 w-5" />
                    ) : status === 'locked' ? (
                      <span className="text-sm font-bold text-accent-700">{meta.price}</span>
                    ) : (
                      <ArrowRight className="h-5 w-5" />
                    )}
                  </div>
                </button>
              )
            })}
          </div>
        </div>

        {/* The single next step */}
        <div className="mt-6">
          {nextStage ? (
            <button
              type="button"
              onClick={() => handleNodeClick(nextStage, nextStatus as NodeStatus)}
              className="group flex w-full items-center justify-center gap-3 rounded-xl bg-accent-600 px-5 py-4 text-base font-bold text-white shadow-sm transition hover:bg-accent-700"
            >
              {nextStatus === 'locked' ? (
                <>
                  <Lock className="h-5 w-5" />
                  Unlock {STAGE_META[nextStage].name} · {STAGE_META[nextStage].price}
                </>
              ) : (
                <>
                  Start {STAGE_META[nextStage].name}
                  <ArrowRight className="h-5 w-5 transition group-hover:translate-x-1" />
                </>
              )}
            </button>
          ) : (
            <div className="flex items-center justify-center gap-3 rounded-xl border border-emerald-200 bg-emerald-50 px-5 py-4 text-base font-bold text-emerald-800">
              <Sparkles className="h-5 w-5" />
              Every round complete — go get the offer.
            </div>
          )}
          {completedCount > 0 && (
            <button
              type="button"
              onClick={() => {
                const lastDone = [...STAGE_ORDER].reverse().find((s) => process.stages[s].done)
                if (lastDone) launchStage(lastDone)
              }}
              className="mt-2 flex w-full items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white/90 px-4 py-2.5 text-sm font-bold text-slate-600 transition hover:bg-white"
            >
              <RotateCcw className="h-4 w-4" />
              Retake last round
            </button>
          )}
        </div>
      </div>

      {purchaseStage && (
        <PurchaseFlow
          onClose={() => setPurchaseStage(null)}
          highlightStage={purchaseStage}
          userEmail={userEmail}
        />
      )}
    </AppChrome>
  )
}
