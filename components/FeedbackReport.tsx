'use client'

import { ReactNode, useMemo, useState } from 'react'
import Link from 'next/link'
import {
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  ChevronRight,
  FileText,
  Lightbulb,
  Lock,
  Quote,
  RefreshCw,
  Target,
  TrendingUp,
} from 'lucide-react'
import { getImprovementTipForCriterion, getRootCauseForCriterion } from '@/lib/practice-bundles'

interface FeedbackReportProps {
  feedback: any
  currentSessionData?: any
  onRetakeInterview?: () => void
  onUnlockNextStage?: () => void
  artifactContent?: ReactNode
  onPrintArtifact?: () => void
}

function parseScore(value: any): number {
  if (typeof value === 'number') return value
  if (typeof value === 'string') {
    const n = Number.parseFloat(value)
    return Number.isFinite(n) ? n : 0
  }
  return 0
}

function text(value: any, fallback = ''): string {
  if (value == null) return fallback
  if (typeof value === 'string') return value
  if (typeof value === 'number' || typeof value === 'boolean') return String(value)
  if (Array.isArray(value)) return value.map((v) => text(v)).filter(Boolean).join(', ') || fallback
  if (typeof value === 'object') {
    return text(value.title || value.label || value.question || value.text || value.description || value.summary || value.name || value.area, fallback)
  }
  return fallback
}

function asArray<T>(v: any): T[] {
  return Array.isArray(v) ? v : []
}

function fmt(score: number) {
  return score % 1 ? score.toFixed(1) : `${score}`
}

function scoreColor(score: number) {
  if (score >= 7) return { text: 'text-emerald-700', bg: 'bg-emerald-50', border: 'border-emerald-200', ring: 'text-emerald-500' }
  if (score >= 5) return { text: 'text-amber-700', bg: 'bg-amber-50', border: 'border-amber-200', ring: 'text-amber-500' }
  return { text: 'text-rose-700', bg: 'bg-rose-50', border: 'border-rose-200', ring: 'text-rose-500' }
}

function getRaw(currentSessionData: any) {
  const jobText = currentSessionData?.job_description_text || currentSessionData?.user_interview_data?.job_description_text || ''
  const company = currentSessionData?.company_name || (typeof jobText === 'string' ? jobText.match(/^Company:\s*(.+)$/m)?.[1]?.trim() : '') || ''
  const role = currentSessionData?.job_title || currentSessionData?.position_title || (typeof jobText === 'string' ? jobText.match(/^Position:\s*(.+)$/m)?.[1]?.trim() : '') || ''
  return { company, role }
}

function ScoreRing({ score }: { score: number }) {
  const pct = Math.max(0, Math.min(score * 10, 100))
  const c = scoreColor(score)
  return (
    <div className="relative flex h-24 w-24 shrink-0 items-center justify-center">
      <svg viewBox="0 0 36 36" className="h-24 w-24 -rotate-90">
        <circle cx="18" cy="18" r="15.5" fill="none" stroke="#e2e8f0" strokeWidth="3" />
        <circle
          cx="18" cy="18" r="15.5" fill="none" strokeWidth="3" strokeLinecap="round"
          className={c.ring} stroke="currentColor"
          strokeDasharray={`${(pct / 100) * 97.4} 97.4`}
        />
      </svg>
      <div className="absolute flex flex-col items-center">
        <span className="text-2xl font-bold text-slate-900">{score ? fmt(score) : '–'}</span>
        <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">/ 10</span>
      </div>
    </div>
  )
}

function Evidence({ area }: { area: any }) {
  const ev = asArray<any>(area?.evidence)[0]
  const question = text(ev?.question)
  const excerpt = text(ev?.excerpt || ev?.text || ev?.answer || ev?.quote)
  if (!question && !excerpt) return null
  return (
    <div className="mt-3 rounded-lg border border-slate-200 bg-slate-50 p-3">
      {question && <p className="text-sm font-semibold text-slate-700">{question}</p>}
      {excerpt && (
        <p className="mt-1 flex gap-1.5 text-sm leading-relaxed text-slate-500">
          <Quote className="mt-0.5 h-3.5 w-3.5 shrink-0 text-slate-300" />
          <span className="italic">{excerpt}</span>
        </p>
      )}
    </div>
  )
}

export default function FeedbackReport({
  feedback,
  currentSessionData,
  onRetakeInterview,
  onUnlockNextStage,
  artifactContent,
  onPrintArtifact,
}: FeedbackReportProps) {
  const [showReport, setShowReport] = useState(false)

  const data = useMemo(() => {
    const fullRubric = feedback?.full_rubric || {}
    const six = feedback?.hr_screen_six_areas || fullRubric?.hr_screen_six_areas || {}
    const strengths = asArray<any>(six.what_went_well)
    const repairs = asArray<any>(six.what_needs_improve)
    const score = parseScore(feedback?.overall_score || fullRubric?.overall_assessment?.overall_score || 0)
    const likelihood = fullRubric?.overall_assessment?.likelihood_to_advance || feedback?.likelihood || (score >= 6 ? 'likely' : 'unlikely')
    const summary = text(feedback?.detailed_feedback || fullRubric?.overall_assessment?.summary)
    const nextSteps = feedback?.next_steps_preparation || fullRubric?.next_steps_preparation || {}
    const predicted = asArray<any>(nextSteps.predicted_hiring_manager_questions).map((q) => text(q)).filter(Boolean)
    const study = asArray<any>(nextSteps.areas_to_study).map((q) => text(q)).filter(Boolean)
    const readyForHm = nextSteps?.ready_for_hiring_manager ?? likelihood === 'likely'
    const { company, role } = getRaw(currentSessionData)
    return { strengths, repairs, score, likelihood, summary, predicted, study, readyForHm, company, role }
  }, [feedback, currentSessionData])

  const { strengths, repairs, score, summary, predicted, study, readyForHm, company, role } = data
  const sc = scoreColor(score)
  const verdict = score >= 7 ? 'Strong screen' : score >= 5 ? 'Close — needs polish' : 'Needs work before round two'
  const processHref = company || role ? `/process/${encodeURIComponent(`${company}::${role}`)}` : '/dashboard'
  const headline = [role, company].filter(Boolean).join(' at ') || 'HR Screen'

  return (
    <div className="space-y-5">
      {/* Breadcrumb */}
      <Link href={processHref} className="inline-flex items-center gap-1.5 text-sm font-medium text-slate-500 transition-colors hover:text-slate-900">
        <ArrowLeft className="h-4 w-4" /> Back to prep
      </Link>

      {/* Score banner */}
      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="flex flex-col gap-5 p-5 sm:flex-row sm:items-center sm:gap-6 sm:p-6">
          <ScoreRing score={score} />
          <div className="min-w-0 flex-1">
            <p className="text-xs font-semibold uppercase tracking-wider text-accent-600">HR Screen Result</p>
            <h1 className="mt-1 text-xl font-bold tracking-tight text-slate-900 sm:text-2xl">{headline}</h1>
            <div className="mt-2 flex flex-wrap items-center gap-2">
              <span className={`rounded-full border px-2.5 py-0.5 text-xs font-semibold ${sc.border} ${sc.bg} ${sc.text}`}>{verdict}</span>
              <span className="text-sm text-slate-500">
                {strengths.length} strong · {repairs.length} to improve
              </span>
            </div>
          </div>
          <div className="flex shrink-0 flex-col gap-2 sm:w-56">
            <button
              type="button"
              onClick={onUnlockNextStage}
              className="btn-coach-primary inline-flex items-center justify-center gap-2 px-4 py-2.5 text-sm"
            >
              Continue to Hiring Manager
              <ArrowRight className="h-4 w-4" />
            </button>
            <button
              type="button"
              onClick={onRetakeInterview}
              className="btn-coach-secondary inline-flex items-center justify-center gap-2 px-4 py-2.5 text-sm"
            >
              <RefreshCw className="h-4 w-4" /> Retake HR screen
            </button>
          </div>
        </div>
        {summary && (
          <div className="border-t border-slate-100 bg-slate-50/60 px-5 py-4 sm:px-6">
            <p className="text-sm leading-relaxed text-slate-600">{summary}</p>
          </div>
        )}
      </div>

      {/* Strengths */}
      {strengths.length > 0 && (
        <section className="rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="flex items-center gap-2 border-b border-slate-100 px-5 py-4 sm:px-6">
            <CheckCircle2 className="h-5 w-5 text-emerald-600" />
            <h2 className="text-base font-bold text-slate-900">What you did well</h2>
          </div>
          <div className="divide-y divide-slate-100">
            {strengths.map((area, i) => {
              const s = parseScore(area?.score)
              return (
                <div key={i} className="px-5 py-4 sm:px-6">
                  <div className="flex items-start justify-between gap-3">
                    <h3 className="font-semibold text-slate-900">{text(area?.criterion, 'Strength')}</h3>
                    {s > 0 && <span className="shrink-0 rounded-full bg-emerald-50 px-2 py-0.5 text-xs font-semibold text-emerald-700">{fmt(s)}/10</span>}
                  </div>
                  {text(area?.feedback) && <p className="mt-1 text-sm leading-relaxed text-slate-600">{text(area?.feedback)}</p>}
                  <Evidence area={area} />
                </div>
              )
            })}
          </div>
        </section>
      )}

      {/* Areas to improve */}
      {repairs.length > 0 && (
        <section className="rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="flex items-center gap-2 border-b border-slate-100 px-5 py-4 sm:px-6">
            <TrendingUp className="h-5 w-5 text-accent-600" />
            <h2 className="text-base font-bold text-slate-900">Areas to improve</h2>
          </div>
          <div className="divide-y divide-slate-100">
            {repairs.map((area, i) => {
              const s = parseScore(area?.score)
              const criterion = text(area?.criterion, 'Area to improve')
              const rootCause = getRootCauseForCriterion(criterion, text(area?.rootCause || area?.root_cause))
              const tip = getImprovementTipForCriterion(criterion, rootCause)
              const rewrite = text(area?.rewritten_answer)
              return (
                <div key={i} className="px-5 py-5 sm:px-6">
                  <div className="flex items-start justify-between gap-3">
                    <h3 className="font-semibold text-slate-900">{criterion}</h3>
                    {s > 0 && <span className="shrink-0 rounded-full bg-rose-50 px-2 py-0.5 text-xs font-semibold text-rose-700">{fmt(s)}/10</span>}
                  </div>
                  {text(area?.feedback) && <p className="mt-1 text-sm leading-relaxed text-slate-600">{text(area?.feedback)}</p>}
                  <Evidence area={area} />

                  {tip?.title && (
                    <div className="mt-3 rounded-lg border border-accent-100 bg-accent-50/60 p-3.5">
                      <div className="flex items-center gap-2">
                        <Lightbulb className="h-4 w-4 text-accent-600" />
                        <p className="text-sm font-semibold text-slate-900">{tip.title}</p>
                      </div>
                      {tip.summary && <p className="mt-1 text-sm leading-relaxed text-slate-600">{tip.summary}</p>}
                      {asArray<string>(tip.bullets).length > 0 && (
                        <ul className="mt-2 space-y-1.5">
                          {asArray<string>(tip.bullets).slice(0, 3).map((b, bi) => (
                            <li key={bi} className="flex gap-2 text-sm text-slate-600">
                              <ChevronRight className="mt-0.5 h-3.5 w-3.5 shrink-0 text-accent-400" />
                              <span>{b}</span>
                            </li>
                          ))}
                        </ul>
                      )}
                    </div>
                  )}

                  {rewrite && (
                    <div className="mt-3 rounded-lg border border-slate-200 bg-white p-3.5">
                      <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">Stronger version</p>
                      <p className="mt-1.5 text-sm leading-relaxed text-slate-700">{rewrite}</p>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </section>
      )}

      {/* Next round */}
      <section className="rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="flex items-center gap-2 border-b border-slate-100 px-5 py-4 sm:px-6">
          <Target className="h-5 w-5 text-accent-600" />
          <h2 className="text-base font-bold text-slate-900">Your next round: Hiring Manager</h2>
        </div>
        <div className="grid gap-5 px-5 py-5 sm:grid-cols-2 sm:px-6">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">Likely questions</p>
            <ul className="mt-2 space-y-2">
              {(predicted.length ? predicted.slice(0, 4) : ['Walk me through a project where you drove measurable impact.', 'How would your experience apply to this specific role?', 'Where would you need to ramp up quickly?']).map((q, i) => (
                <li key={i} className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm font-medium text-slate-700">{q}</li>
              ))}
            </ul>
          </div>
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">Focus on</p>
            <ul className="mt-2 space-y-2">
              {(study.length ? study.slice(0, 4) : [repairs[0] ? text(repairs[0]?.criterion) : 'Specific examples', 'Metrics and outcomes', 'Concise structure']).filter(Boolean).map((a, i) => (
                <li key={i} className="flex gap-2 text-sm text-slate-600">
                  <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-accent-500" />
                  <span>{a}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
        <div className="border-t border-slate-100 bg-slate-50/60 px-5 py-4 sm:px-6">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-sm text-slate-600">
              {readyForHm ? 'You’re ready. Run the hiring manager round to pressure-test your proof.' : 'Sharpen the areas above, then run the hiring manager round.'}
            </p>
            <button type="button" onClick={onUnlockNextStage} className="btn-coach-primary inline-flex shrink-0 items-center justify-center gap-2 px-4 py-2.5 text-sm">
              <Lock className="h-4 w-4" /> Unlock Hiring Manager
            </button>
          </div>
        </div>
      </section>

      {/* Full report */}
      {artifactContent && (
        <button
          type="button"
          onClick={() => setShowReport(true)}
          className="flex w-full items-center justify-between rounded-2xl border border-slate-200 bg-white px-5 py-4 text-left shadow-sm transition-colors hover:border-slate-300 sm:px-6"
        >
          <div className="flex items-center gap-3">
            <FileText className="h-5 w-5 text-slate-400" />
            <div>
              <p className="font-semibold text-slate-900">Full detailed report</p>
              <p className="text-sm text-slate-500">Every criterion, score, and transcript reference.</p>
            </div>
          </div>
          <ChevronRight className="h-5 w-5 text-slate-400" />
        </button>
      )}

      {showReport && artifactContent && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 p-0 sm:p-4" onClick={() => setShowReport(false)}>
          <div className="mx-auto flex h-full max-w-4xl flex-col overflow-hidden bg-white shadow-2xl sm:rounded-2xl" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between border-b border-slate-200 px-5 py-3">
              <h2 className="text-base font-bold text-slate-900">Detailed report</h2>
              <div className="flex items-center gap-2">
                {onPrintArtifact && (
                  <button type="button" onClick={onPrintArtifact} className="rounded-lg border border-slate-200 px-3 py-1.5 text-sm font-medium text-slate-600 hover:bg-slate-50">Print</button>
                )}
                <button type="button" onClick={() => setShowReport(false)} className="rounded-lg px-3 py-1.5 text-sm font-medium text-slate-600 hover:bg-slate-100">Close</button>
              </div>
            </div>
            <div className="min-h-0 flex-1 overflow-y-auto bg-slate-50 p-4 sm:p-6">{artifactContent}</div>
          </div>
        </div>
      )}
    </div>
  )
}
