'use client'

import { useEffect, useMemo, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import {
  ArrowLeft,
  ArrowRight,
  Briefcase,
  Check,
  ChevronRight,
  Crown,
  ExternalLink,
  FileText,
  Lock,
  Phone,
  Play,
  TrendingDown,
  TrendingUp,
  Users,
} from 'lucide-react'
import { createClient } from '@/lib/supabase-client'
import PurchaseFlow from '@/components/PurchaseFlow'
import AppChrome from '@/components/AppChrome'
import { isInterviewStageLocked } from '@/lib/interview-stage-access'

type StageKey = 'hr_screen' | 'hiring_manager' | 'culture_fit' | 'final'

const STAGE_ORDER: StageKey[] = ['hr_screen', 'hiring_manager', 'culture_fit', 'final']

const STAGE_META: Record<StageKey, { name: string; shortName: string; blurb: string; price?: string; icon: any; optional?: boolean; color: string; gradient: string }> = {
  hr_screen: { name: 'HR Screen', shortName: 'HR', blurb: 'Recruiter phone screen — get past the gate.', icon: Phone, color: 'emerald', gradient: 'from-emerald-500 to-teal-600' },
  hiring_manager: { name: 'Hiring Manager', shortName: 'HM', blurb: 'Your future boss demands proof.', price: '$4.99', icon: Briefcase, color: 'blue', gradient: 'from-blue-500 to-indigo-600' },
  culture_fit: { name: 'Culture Fit', shortName: 'CF', blurb: 'Values, judgment, working style.', price: '$3.99', icon: Users, optional: true, color: 'violet', gradient: 'from-violet-500 to-purple-600' },
  final: { name: 'Final Round', shortName: 'Final', blurb: 'Executive pressure and strategy.', price: '$5.99', icon: Crown, color: 'amber', gradient: 'from-amber-500 to-orange-600' },
}

interface StageState {
  done: boolean
  score: number | null
  sessionId: string | null
  stageParam: string
  attempts: number
  reportReady: boolean
  completedAt: string | null
  strengths: { criterion: string; score: number }[]
  weaknesses: { criterion: string; score: number }[]
}

interface ProcessData {
  companyName: string | null
  positionTitle: string | null
  interviewDataId: string | null
  jobDescriptionText: string
  resumeText: string
  stages: Record<StageKey, StageState>
}

type NodeStatus = 'complete' | 'available' | 'locked' | 'upcoming'

function groupKeyOf(companyName: string | null, positionTitle: string | null) {
  return `${companyName ?? ''}::${positionTitle ?? ''}`
}

function normalizeProcessKey(value: string) {
  return value.trim().replace(/\s+/g, ' ').toLowerCase()
}

function emptyStages(): Record<StageKey, StageState> {
  return {
    hr_screen: { done: false, score: null, sessionId: null, stageParam: 'hr_screen', attempts: 0, reportReady: false, completedAt: null, strengths: [], weaknesses: [] },
    hiring_manager: { done: false, score: null, sessionId: null, stageParam: 'hiring_manager', attempts: 0, reportReady: false, completedAt: null, strengths: [], weaknesses: [] },
    culture_fit: { done: false, score: null, sessionId: null, stageParam: 'culture_fit', attempts: 0, reportReady: false, completedAt: null, strengths: [], weaknesses: [] },
    final: { done: false, score: null, sessionId: null, stageParam: 'final', attempts: 0, reportReady: false, completedAt: null, strengths: [], weaknesses: [] },
  }
}

function fmtScore(score: number | null) {
  if (score == null) return null
  return Number.isInteger(score) ? `${score}` : score.toFixed(1)
}

function previewText(text: string, maxLength = 1200) {
  const trimmed = text.trim()
  if (trimmed.length <= maxLength) return trimmed
  return `${trimmed.slice(0, maxLength).trim()}...`
}

function timeAgo(dateStr: string | null): string {
  if (!dateStr) return ''
  const diff = Date.now() - new Date(dateStr).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 60) return `${mins}m ago`
  const hours = Math.floor(mins / 60)
  if (hours < 24) return `${hours}h ago`
  const days = Math.floor(hours / 24)
  if (days === 1) return 'yesterday'
  if (days < 7) return `${days}d ago`
  return new Date(dateStr).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

function ScoreRing({ score, size = 72, strokeWidth = 5 }: { score: number; size?: number; strokeWidth?: number }) {
  const radius = (size - strokeWidth) / 2
  const circumference = 2 * Math.PI * radius
  const progress = (score / 10) * circumference
  const tone = score >= 7 ? 'text-emerald-500' : score >= 5 ? 'text-amber-500' : 'text-red-400'

  return (
    <div className="relative" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={radius} fill="none" stroke="currentColor" strokeWidth={strokeWidth} className="text-slate-100" />
        <circle cx={size / 2} cy={size / 2} r={radius} fill="none" stroke="currentColor" strokeWidth={strokeWidth} strokeDasharray={circumference} strokeDashoffset={circumference - progress} strokeLinecap="round" className={tone} style={{ transition: 'stroke-dashoffset 1s ease-out' }} />
      </svg>
      <div className="absolute inset-0 flex items-center justify-center">
        <span className={`text-lg font-black ${tone}`}>{fmtScore(score)}</span>
      </div>
    </div>
  )
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
  const [viewingModal, setViewingModal] = useState<'job' | 'resume' | null>(null)
  const [feedbackSeen, setFeedbackSeen] = useState<Record<string, boolean>>({})
  const [practiceCount, setPracticeCount] = useState<number>(0)
  const [selectedStage, setSelectedStage] = useState<StageKey | null>(null)

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

      fetch('/api/payments/status')
        .then((res) => (res.ok ? res.json() : null))
        .then((data) => { if (data && !cancelled) setStageAccess(data.stageAccess || {}) })
        .catch(() => {})

      const { data: sessions } = await supabase
        .from('interview_sessions')
        .select(`
          id, stage, status, created_at, completed_at, user_interview_data_id,
          user_interview_data ( job_description_text, resume_text ),
          interview_feedback ( id, overall_score, created_at, full_rubric )
        `)
        .eq('user_id', session.user.id)
        .eq('status', 'completed')
        .order('created_at', { ascending: false })

      if (cancelled) return

      let found: ProcessData | null = null
      const normalizedDecodedKey = normalizeProcessKey(decodedKey)
      ;(sessions || []).forEach((row: any) => {
        if (!row.interview_feedback?.length) return
        const interviewData = Array.isArray(row.user_interview_data)
          ? row.user_interview_data[0]
          : row.user_interview_data
        const text = interviewData?.job_description_text || ''
        const companyName = text.match(/^Company:\s*(.+)$/m)?.[1]?.trim() || null
        const positionTitle = text.match(/^Position:\s*(.+)$/m)?.[1]?.trim() || null
        if (normalizeProcessKey(groupKeyOf(companyName, positionTitle)) !== normalizedDecodedKey) return

        const stageKey: StageKey = row.stage === 'team_interview'
          ? 'culture_fit'
          : row.stage === 'final_interview'
          ? 'final'
          : row.stage
        if (!STAGE_ORDER.includes(stageKey)) return

        const proc: ProcessData = found ?? {
          companyName,
          positionTitle,
          interviewDataId: null,
          jobDescriptionText: text,
          resumeText: interviewData?.resume_text || '',
          stages: emptyStages(),
        }
        found = proc
        if (!proc.interviewDataId && row.user_interview_data_id) {
          proc.interviewDataId = row.user_interview_data_id
        }
        if (!proc.jobDescriptionText && text) proc.jobDescriptionText = text
        if (!proc.resumeText && interviewData?.resume_text) proc.resumeText = interviewData.resume_text

        const st = proc.stages[stageKey]
        st.attempts += 1
        const latestFb = [...row.interview_feedback].sort((a: any, b: any) =>
          new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime()
        )[0]
        const rowCompletedAt = row.completed_at || row.created_at || null
        const isNewer = !st.completedAt ||
          new Date(rowCompletedAt || 0).getTime() > new Date(st.completedAt || 0).getTime()

        if (isNewer) {
          st.done = true
          st.score = latestFb?.overall_score ?? null
          st.sessionId = row.id
          st.completedAt = rowCompletedAt
          st.reportReady = !!latestFb?.full_rubric
          const rubric = latestFb?.full_rubric
          const sixAreas = rubric?.hr_screen_six_areas || rubric?.hiring_manager_six_areas || rubric?.culture_fit_six_areas || rubric?.final_six_areas
          st.strengths = (sixAreas?.what_went_well || []).map((s: any) => ({ criterion: s.criterion, score: s.score }))
          st.weaknesses = (sixAreas?.what_needs_improve || []).map((s: any) => ({ criterion: s.criterion, score: s.score }))
        }
      })

      setProcess(found)
      setLoading(false)
    }
    load()
    return () => { cancelled = true }
  }, [decodedKey, router])

  useEffect(() => {
    if (!process) return
    const seen: Record<string, boolean> = {}
    for (const stage of STAGE_ORDER) {
      const sid = process.stages[stage].sessionId
      if (sid) {
        seen[stage] = localStorage.getItem(`feedback_tutorial_seen_${sid}`) === 'true'
      }
    }
    setFeedbackSeen(seen)
    fetch('/api/profile/practice-memory', { cache: 'no-store' })
      .then((r) => r.ok ? r.json() : null)
      .then((data) => {
        const drafts = data?.drafts && typeof data.drafts === 'object' ? data.drafts : {}
        setPracticeCount(Object.keys(drafts).length)
      })
      .catch(() => {})
  }, [process])

  const computed = useMemo(() => {
    if (!process) return null
    const isLocked = (stage: StageKey) => isInterviewStageLocked(stageAccess?.[stage]?.hasAccess, stage)
    const statusOf = (stage: StageKey): NodeStatus => {
      if (process.stages[stage].done) return 'complete'
      if (isLocked(stage)) return 'locked'
      return 'available'
    }
    const completedCount = STAGE_ORDER.filter((s) => process.stages[s].done).length
    const nextStage = STAGE_ORDER.find((s) => !process.stages[s].done) || null

    const mostRecentStage = [...STAGE_ORDER].reverse().find((s) => process.stages[s].done) || null

    return { isLocked, statusOf, completedCount, nextStage, mostRecentStage }
  }, [process, stageAccess])

  function getSmartCta(stage: StageKey): { label: string; action: () => void; style: 'primary' | 'accent' } | null {
    const st = process?.stages[stage]
    if (!st?.done) return null
    if (!feedbackSeen[stage]) {
      return { label: 'View feedback', action: () => openFeedback(stage), style: 'primary' }
    }
    if (practiceCount === 0) {
      return { label: 'Start practicing', action: () => openPractice(stage), style: 'accent' }
    }
    return { label: 'Retake interview', action: () => launchStage(stage), style: 'primary' }
  }

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

  const openPractice = (stage: StageKey) => {
    const st = process?.stages[stage]
    if (st?.sessionId) router.push(`/interview/practice/${st.sessionId}`)
  }

  const handleNodeClick = (stage: StageKey) => {
    const status = statusOf(stage)
    if (status === 'locked') {
      setPurchaseStage(stage)
      return
    }
    setSelectedStage(stage)
  }

  if (loading) {
    return (
      <AppChrome active="preps">
        <div className="flex min-h-[50vh] flex-col items-center justify-center gap-3">
          <div className="h-9 w-9 animate-spin rounded-full border-4 border-slate-200 border-t-accent-600" />
          <p className="text-sm font-medium text-slate-500">Loading your prep...</p>
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

  const { statusOf, completedCount, nextStage, mostRecentStage } = computed
  const title = [process.positionTitle, process.companyName].filter(Boolean).join(' at ') || 'Interview Process'
  const jobDescriptionPreview = previewText(process.jobDescriptionText)
  const resumePreview = previewText(process.resumeText)

  const activeStage = selectedStage || mostRecentStage || nextStage || STAGE_ORDER[0]
  const activeSt = process.stages[activeStage]
  const activeMeta = STAGE_META[activeStage]
  const activeStatus = statusOf(activeStage)

  return (
    <AppChrome active="preps" maxWidth="max-w-7xl">

      {/* Desktop: sidebar + main */}
      <div className="lg:grid lg:grid-cols-[280px_minmax(0,1fr)] lg:items-start lg:gap-8">

        {/* ── Sidebar (desktop only) ── */}
        <aside className="hidden lg:block">
          <div className="sticky top-20 space-y-4">
            {/* Progress + stage nav card */}
            <div className="rounded-2xl border border-slate-200/80 bg-white shadow-sm">
              <div className="flex items-center gap-4 border-b border-slate-100 p-4">
                <div className="relative h-12 w-12 shrink-0">
                  <svg width="48" height="48" className="-rotate-90">
                    <circle cx="24" cy="24" r="20" fill="none" stroke="#f1f5f9" strokeWidth="4" />
                    <circle cx="24" cy="24" r="20" fill="none" stroke="currentColor" strokeWidth="4" strokeDasharray={2 * Math.PI * 20} strokeDashoffset={2 * Math.PI * 20 * (1 - completedCount / 4)} strokeLinecap="round" className="text-accent-500" style={{ transition: 'stroke-dashoffset 0.8s ease-out' }} />
                  </svg>
                  <span className="absolute inset-0 flex items-center justify-center text-xs font-black text-slate-900">{completedCount}/4</span>
                </div>
                <div className="min-w-0">
                  <p className="truncate text-sm font-bold text-slate-900">{process.positionTitle || 'Interview'}</p>
                  <p className="truncate text-xs text-slate-500">{process.companyName || 'Company'}</p>
                </div>
              </div>

              <div className="p-3">
                <p className="mb-2 px-2 text-[11px] font-bold uppercase tracking-widest text-slate-400">Stages</p>
                <div className="space-y-0.5">
                  {STAGE_ORDER.map((stage) => {
                    const meta = STAGE_META[stage]
                    const st = process.stages[stage]
                    const status = statusOf(stage)
                    const isActive = stage === activeStage
                    const score = fmtScore(st.score)

                    return (
                      <button
                        key={stage}
                        type="button"
                        onClick={() => handleNodeClick(stage)}
                        className={`flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left transition-all ${
                          isActive
                            ? 'bg-accent-50 ring-1 ring-accent-200'
                            : 'hover:bg-slate-50'
                        }`}
                      >
                        <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-sm ${
                          status === 'complete'
                            ? 'bg-emerald-100 text-emerald-600'
                            : status === 'locked'
                            ? 'bg-slate-100 text-slate-400'
                            : 'bg-slate-100 text-slate-500'
                        }`}>
                          {status === 'complete' ? <Check className="h-4 w-4" /> : status === 'locked' ? <Lock className="h-3.5 w-3.5" /> : <meta.icon className="h-4 w-4" />}
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className={`text-sm font-semibold ${isActive ? 'text-accent-700' : 'text-slate-800'}`}>{meta.name}</p>
                          {status === 'complete' && score && (
                            <p className="text-xs font-medium text-emerald-600">{score}/10</p>
                          )}
                          {status === 'locked' && (
                            <p className="text-xs text-slate-400">{meta.price}</p>
                          )}
                        </div>
                        <ChevronRight className={`h-4 w-4 shrink-0 ${isActive ? 'text-accent-400' : 'text-slate-300'}`} />
                      </button>
                    )
                  })}
                </div>
              </div>
            </div>

            {/* Details buttons (open modals) */}
            <div className="rounded-2xl border border-slate-200/80 bg-white p-3 shadow-sm">
              <p className="mb-2 px-2 text-[11px] font-bold uppercase tracking-widest text-slate-400">Details</p>
              <button
                type="button"
                onClick={() => setViewingModal('job')}
                className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm font-semibold text-slate-700 transition-colors hover:bg-slate-50"
              >
                <Briefcase className="h-4 w-4 text-slate-400" />
                <span className="flex-1">Job description</span>
                <ExternalLink className="h-3.5 w-3.5 text-slate-300" />
              </button>
              <button
                type="button"
                onClick={() => setViewingModal('resume')}
                className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm font-semibold text-slate-700 transition-colors hover:bg-slate-50"
              >
                <FileText className="h-4 w-4 text-slate-400" />
                <span className="flex-1">Resume</span>
                <ExternalLink className="h-3.5 w-3.5 text-slate-300" />
              </button>
            </div>

            <Link href="/dashboard" className="flex items-center gap-2 rounded-xl px-3 py-2.5 text-sm font-medium text-slate-400 transition-colors hover:text-slate-700">
              <ArrowLeft className="h-4 w-4" /> Back to interviews
            </Link>
          </div>
        </aside>

        {/* ── Main content — driven by activeStage ── */}
        <div className="min-w-0 space-y-5">

          {/* Mobile: back link + title */}
          <div className="lg:hidden">
            <Link href="/dashboard" className="mb-4 inline-flex w-fit items-center gap-1.5 text-sm font-medium text-slate-400 transition-colors hover:text-slate-700">
              <ArrowLeft className="h-4 w-4" /> Back to interviews
            </Link>
            <h1 className="text-2xl font-black tracking-tight text-slate-900">{title}</h1>
            {/* Mobile stage picker */}
            <div className="mt-4 flex gap-1.5 overflow-x-auto">
              {STAGE_ORDER.map((stage) => {
                const st = process.stages[stage]
                const status = statusOf(stage)
                const isActive = stage === activeStage
                return (
                  <button
                    key={stage}
                    type="button"
                    onClick={() => handleNodeClick(stage)}
                    className={`flex shrink-0 items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-bold transition ${
                      isActive
                        ? 'bg-accent-600 text-white'
                        : status === 'complete'
                        ? 'bg-emerald-50 text-emerald-700'
                        : 'bg-slate-100 text-slate-500'
                    }`}
                  >
                    {status === 'complete' && <Check className="h-3 w-3" />}
                    {status === 'locked' && <Lock className="h-3 w-3" />}
                    {STAGE_META[stage].shortName}
                    {st.score != null && <span className="ml-0.5">{fmtScore(st.score)}</span>}
                  </button>
                )
              })}
            </div>
          </div>

          {/* ── Stage header ── */}
          <div className="overflow-hidden rounded-2xl border border-slate-200/60 bg-white shadow-[0_8px_30px_rgba(0,0,0,0.04)]">
            <div className={`bg-gradient-to-r ${activeMeta.gradient} px-6 py-5 sm:px-8 sm:py-6`}>
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h1 className="hidden text-lg font-bold text-white/80 lg:block">{title}</h1>
                  <h2 className="mt-1 text-xl font-black text-white sm:text-2xl lg:mt-3">{activeMeta.name}</h2>
                  {activeStatus === 'complete' && activeSt.completedAt && (
                    <p className="mt-1 text-xs font-medium text-white/50">
                      {timeAgo(activeSt.completedAt)}{activeSt.attempts > 1 ? ` · ${activeSt.attempts} attempts` : ''}
                    </p>
                  )}
                  {activeStatus !== 'complete' && (
                    <p className="mt-1 text-sm text-white/60">{activeMeta.blurb}</p>
                  )}
                </div>
                {activeStatus === 'complete' && activeSt.score != null && (
                  <div className="flex flex-col items-center">
                    <ScoreRing score={activeSt.score} size={80} strokeWidth={6} />
                    <span className="mt-1 text-[11px] font-bold text-white/50">out of 10</span>
                  </div>
                )}
                {activeStatus === 'locked' && (
                  <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-white/10">
                    <Lock className="h-7 w-7 text-white/60" />
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* ── Completed stage: flow + results ── */}
          {activeStatus === 'complete' && (() => {
            const smart = getSmartCta(activeStage)
            const flowSteps = [
              { label: 'Interview', done: true },
              { label: 'Review feedback', done: feedbackSeen[activeStage], action: () => openFeedback(activeStage) },
              { label: 'Practice', done: practiceCount > 0, action: () => openPractice(activeStage) },
              { label: 'Retake', done: activeSt.attempts > 1, action: () => launchStage(activeStage) },
            ]
            const currentStepIdx = flowSteps.findIndex((s) => !s.done)

            return (
              <>
                {/* Flow progress */}
                <div className="rounded-2xl border border-slate-200/60 bg-white p-5 shadow-sm sm:p-6">
                  <p className="mb-4 text-xs font-black uppercase tracking-[0.16em] text-slate-400">Your progress</p>

                  <div className="flex items-start">
                    {flowSteps.map((step, i) => {
                      const isCurrent = i === currentStepIdx
                      const isDone = step.done
                      return (
                        <div key={step.label} className="flex flex-1 flex-col items-center">
                          {/* Connector + dot */}
                          <div className="flex w-full items-center">
                            {i > 0 && (
                              <div className={`h-0.5 flex-1 ${isDone || isCurrent ? 'bg-accent-400' : 'bg-slate-200'}`} />
                            )}
                            <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-sm font-bold ${
                              isDone
                                ? 'bg-emerald-500 text-white'
                                : isCurrent
                                ? 'bg-accent-600 text-white ring-4 ring-accent-100'
                                : 'bg-slate-200 text-slate-400'
                            }`}>
                              {isDone ? <Check className="h-4 w-4" /> : i + 1}
                            </div>
                            {i < flowSteps.length - 1 && (
                              <div className={`h-0.5 flex-1 ${isDone ? 'bg-emerald-400' : 'bg-slate-200'}`} />
                            )}
                          </div>
                          <p className={`mt-2 text-center text-xs font-semibold ${
                            isDone ? 'text-emerald-600' : isCurrent ? 'text-accent-700' : 'text-slate-400'
                          }`}>
                            {step.label}
                          </p>
                        </div>
                      )
                    })}
                  </div>

                  {/* Single CTA */}
                  {smart && (
                    <button
                      type="button"
                      onClick={smart.action}
                      className="group mt-6 flex w-full items-center justify-center gap-2 rounded-xl bg-accent-600 px-5 py-3.5 text-base font-bold text-white transition hover:bg-accent-700"
                    >
                      {smart.label}
                      <ArrowRight className="h-5 w-5 transition group-hover:translate-x-1" />
                    </button>
                  )}
                </div>

                {/* Strengths & weaknesses */}
                {(activeSt.strengths.length > 0 || activeSt.weaknesses.length > 0) && (
                  <div className="rounded-2xl border border-slate-200/60 bg-white p-5 shadow-sm sm:p-6">
                    {activeSt.strengths.length > 0 && (
                      <div>
                        <div className="mb-2 flex items-center gap-2">
                          <TrendingUp className="h-4 w-4 text-emerald-500" />
                          <p className="text-xs font-bold uppercase tracking-widest text-slate-500">Strengths</p>
                        </div>
                        <div className="space-y-1.5">
                          {activeSt.strengths.map((s) => (
                            <div key={s.criterion} className="flex items-center justify-between rounded-lg bg-emerald-50/60 px-3 py-2">
                              <span className="text-sm font-medium text-slate-700">{s.criterion}</span>
                              <span className="text-sm font-black text-emerald-600">{fmtScore(s.score)}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                    {activeSt.weaknesses.length > 0 && (
                      <div className={activeSt.strengths.length > 0 ? 'mt-5' : ''}>
                        <div className="mb-2 flex items-center gap-2">
                          <TrendingDown className="h-4 w-4 text-red-400" />
                          <p className="text-xs font-bold uppercase tracking-widest text-slate-500">Areas to improve</p>
                        </div>
                        <div className="space-y-1.5">
                          {activeSt.weaknesses.map((w) => (
                            <div key={w.criterion} className="flex items-center justify-between rounded-lg bg-red-50/60 px-3 py-2">
                              <span className="text-sm font-medium text-slate-700">{w.criterion}</span>
                              <span className="text-sm font-black text-red-500">{fmtScore(w.score)}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </>
            )
          })()}

          {/* ── Available stage: start CTA ── */}
          {activeStatus === 'available' && (
            <div className="rounded-2xl border border-slate-200/60 bg-white p-6 text-center shadow-sm">
              <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-accent-500 to-accent-700 text-white shadow-lg shadow-accent-500/20">
                <Play className="h-7 w-7" />
              </div>
              <p className="mt-4 text-lg font-black text-slate-900">Ready to start</p>
              <p className="mt-1 text-sm text-slate-500">{activeMeta.blurb}</p>
              <button
                type="button"
                onClick={() => launchStage(activeStage)}
                className="group mt-5 inline-flex items-center gap-2 rounded-xl bg-accent-600 px-8 py-3.5 text-base font-bold text-white transition hover:bg-accent-700"
              >
                Start {activeMeta.name}
                <ArrowRight className="h-5 w-5 transition group-hover:translate-x-1" />
              </button>
            </div>
          )}

          {/* ── Locked stage: unlock CTA ── */}
          {activeStatus === 'locked' && (
            <div className="rounded-2xl border border-slate-200/60 bg-white p-6 text-center shadow-sm">
              <p className="text-lg font-black text-slate-900">Unlock {activeMeta.name}</p>
              <p className="mt-1 text-sm text-slate-500">{activeMeta.blurb}</p>
              {activeMeta.price && (
                <button
                  type="button"
                  onClick={() => setPurchaseStage(activeStage)}
                  className="group mt-5 inline-flex items-center gap-2 rounded-xl bg-accent-600 px-8 py-3.5 text-base font-bold text-white transition hover:bg-accent-700"
                >
                  Unlock for {activeMeta.price}
                  <ArrowRight className="h-5 w-5 transition group-hover:translate-x-1" />
                </button>
              )}
            </div>
          )}

          {/* ── Mobile: Details ── */}
          <div className="flex gap-3 lg:hidden">
            <button
              type="button"
              onClick={() => setViewingModal('job')}
              className="flex flex-1 items-center gap-2 rounded-2xl border border-slate-200/80 bg-white px-4 py-3 text-sm font-bold text-slate-700 shadow-sm transition-all hover:bg-slate-50"
            >
              <Briefcase className="h-4 w-4 text-slate-400" />
              Job description
            </button>
            <button
              type="button"
              onClick={() => setViewingModal('resume')}
              className="flex flex-1 items-center gap-2 rounded-2xl border border-slate-200/80 bg-white px-4 py-3 text-sm font-bold text-slate-700 shadow-sm transition-all hover:bg-slate-50"
            >
              <FileText className="h-4 w-4 text-slate-400" />
              Resume
            </button>
          </div>

        </div>
      </div>

      {/* Details modal */}
      {viewingModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4" onClick={() => setViewingModal(null)}>
          <div className="relative max-h-[80vh] w-full max-w-2xl overflow-hidden rounded-2xl bg-white shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4">
              <div className="flex items-center gap-3">
                {viewingModal === 'job' ? <Briefcase className="h-5 w-5 text-slate-400" /> : <FileText className="h-5 w-5 text-slate-400" />}
                <h3 className="text-lg font-black text-slate-900">{viewingModal === 'job' ? 'Job Description' : 'Resume'}</h3>
              </div>
              <button type="button" onClick={() => setViewingModal(null)} className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-700">
                <span className="text-lg">&times;</span>
              </button>
            </div>
            <div className="max-h-[65vh] overflow-auto px-6 py-4">
              {viewingModal === 'job' ? (
                jobDescriptionPreview ? (
                  <pre className="whitespace-pre-wrap text-sm leading-6 text-slate-700">{jobDescriptionPreview}</pre>
                ) : (
                  <p className="text-sm text-slate-400">No job description was saved for this process.</p>
                )
              ) : (
                resumePreview ? (
                  <pre className="whitespace-pre-wrap text-sm leading-6 text-slate-700">{resumePreview}</pre>
                ) : (
                  <p className="text-sm text-slate-400">No resume was saved for this process.</p>
                )
              )}
            </div>
          </div>
        </div>
      )}

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
