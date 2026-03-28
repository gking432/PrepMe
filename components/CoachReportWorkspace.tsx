'use client'

import { useMemo, useState } from 'react'
import { ArrowRight, CheckCircle, ChevronLeft, ChevronRight, AlertTriangle, Target, Trophy, FileText } from 'lucide-react'

type ReportSection = 'overview' | 'strengths' | 'issues' | 'criteria' | 'next_steps'

interface ReportWorkspaceProps {
  feedback: any
  currentSessionData: any
  currentStage: string
  onStartPractice: () => void
}

const SECTION_CONFIG: Array<{ key: ReportSection; label: string }> = [
  { key: 'overview', label: 'Overview' },
  { key: 'strengths', label: 'Strengths' },
  { key: 'issues', label: 'Issues' },
  { key: 'criteria', label: 'Criteria' },
  { key: 'next_steps', label: 'Next Steps' },
]

const STAGE_LABELS: Record<string, string> = {
  hr_screen: 'HR Screen',
  hiring_manager: 'Hiring Manager',
  culture_fit: 'Culture Fit',
  final_round: 'Final Round',
  final: 'Final Round',
}

function getSixAreas(feedback: any, stage: string) {
  switch (stage) {
    case 'hiring_manager': return feedback?.hiring_manager_six_areas
    case 'culture_fit': return feedback?.culture_fit_six_areas
    case 'final_round': return feedback?.final_round_six_areas
    default: return feedback?.hr_screen_six_areas
  }
}

function normalizeCriteria(fullRubric: any) {
  const criteria = fullRubric?.traditional_hr_criteria
  if (!criteria) return []

  const entries = [
    ['Communication', criteria.communication_skills],
    ['Professionalism', criteria.professionalism],
    ['Qualifications', criteria.basic_qualifications || criteria.basic_qualifications_match],
    ['Interest', criteria.interest_enthusiasm || criteria.interest_and_enthusiasm],
    ['Culture Fit', criteria.culture_fit || criteria.culture_fit_indicators],
    ['Response Quality', criteria.response_quality],
  ]

  return entries
    .filter(([, value]) => value)
    .map(([label, value]: any) => {
      const rawScore =
        typeof value.score === 'number'
          ? value.score
          : typeof value.max === 'number' && typeof value.score === 'number'
          ? value.score
          : value.passed === true
          ? 1
          : value.passed === false
          ? 0
          : 0
      const rawMax =
        typeof value.max === 'number'
          ? value.max
          : typeof value.scale === 'string' && value.scale.includes('5')
          ? 5
          : typeof value.scale === 'string' && value.scale.includes('10')
          ? 10
          : value.passed !== undefined
          ? 1
          : 5

      return {
        label,
        score: rawScore,
        max: rawMax,
        feedback: value.feedback || value.notes || 'No additional notes.',
      }
    })
}

export default function CoachReportWorkspace({
  feedback,
  currentSessionData,
  currentStage,
  onStartPractice,
}: ReportWorkspaceProps) {
  const [section, setSection] = useState<ReportSection>('overview')
  const [issueIndex, setIssueIndex] = useState(0)
  const [criteriaPage, setCriteriaPage] = useState(0)

  const sixAreas = useMemo(() => getSixAreas(feedback, currentStage), [feedback, currentStage])
  const strengths = sixAreas?.what_went_well || []
  const issues = sixAreas?.what_needs_improve || []
  const fullRubric = useMemo(() => feedback?.full_rubric || {}, [feedback])
  const criteria = useMemo(() => normalizeCriteria(fullRubric), [fullRubric])
  const criteriaPages = Math.max(1, Math.ceil(criteria.length / 4))
  const visibleCriteria = criteria.slice(criteriaPage * 4, criteriaPage * 4 + 4)
  const stageLabel = STAGE_LABELS[currentStage] || 'Interview Round'
  const overallAssessment = fullRubric?.overall_assessment || {}
  const overallScore = feedback?.overall_score || overallAssessment?.overall_score || 0
  const likelihood = overallAssessment?.likelihood_to_advance || feedback?.likelihood || 'marginal'
  const currentIssue = issues[Math.min(issueIndex, Math.max(issues.length - 1, 0))]
  const studyAreas = fullRubric?.next_steps_preparation?.areas_to_study || []
  const predictedQuestions = fullRubric?.next_steps_preparation?.predicted_hiring_manager_questions || []

  const renderSection = () => {
    if (section === 'overview') {
      return (
        <div className="grid h-full gap-5 lg:grid-cols-[1.15fr_0.85fr]">
          <div className="rounded-[1.8rem] border border-violet-200/80 bg-white/90 p-6 shadow-[0_18px_34px_rgba(76,29,149,0.08)]">
            <p className="text-xs font-black uppercase tracking-[0.24em] text-violet-500">Overall Assessment</p>
            <div className="mt-5 flex items-end gap-5">
              <div className="flex h-28 w-28 items-center justify-center rounded-full border-[10px] border-violet-100 bg-violet-50">
                <div className="text-center">
                  <p className="text-4xl font-black text-violet-700">{overallScore}</p>
                  <p className="text-xs font-bold text-slate-500">/10</p>
                </div>
              </div>
              <div>
                <p className="rounded-full bg-violet-100 px-3 py-1 text-xs font-black uppercase tracking-[0.18em] text-violet-700">{stageLabel}</p>
                <h2 className="mt-3 text-3xl font-black text-slate-900">
                  {likelihood === 'likely' ? 'Ready to advance with refinement.' : likelihood === 'unlikely' ? 'Not ready yet.' : 'Close, but not consistent enough yet.'}
                </h2>
              </div>
            </div>
            <p className="mt-6 max-w-3xl text-sm leading-7 text-slate-600">
              {overallAssessment?.summary || overallAssessment?.executive_summary || feedback?.detailed_feedback}
            </p>
          </div>

          <div className="grid gap-5">
            <div className="rounded-[1.6rem] border border-emerald-200 bg-emerald-50/90 p-5">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-emerald-100">
                  <CheckCircle className="h-5 w-5 text-emerald-600" />
                </div>
                <div>
                  <p className="text-xs font-black uppercase tracking-[0.18em] text-emerald-600">Strong Signals</p>
                  <p className="text-2xl font-black text-emerald-800">{strengths.length}</p>
                </div>
              </div>
            </div>
            <div className="rounded-[1.6rem] border border-amber-200 bg-amber-50/90 p-5">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-amber-100">
                  <AlertTriangle className="h-5 w-5 text-amber-600" />
                </div>
                <div>
                  <p className="text-xs font-black uppercase tracking-[0.18em] text-amber-600">Flagged Issues</p>
                  <p className="text-2xl font-black text-amber-800">{issues.length}</p>
                </div>
              </div>
            </div>
            <div className="rounded-[1.6rem] border border-slate-200 bg-white/92 p-5">
              <p className="text-xs font-black uppercase tracking-[0.18em] text-slate-500">Interview Context</p>
              <div className="mt-3 space-y-2 text-sm text-slate-600">
                <p><span className="font-bold text-slate-800">Candidate:</span> {currentSessionData?.candidate_name || 'Candidate'}</p>
                <p><span className="font-bold text-slate-800">Company:</span> {currentSessionData?.company_name || 'Target Company'}</p>
                <p><span className="font-bold text-slate-800">Role:</span> {currentSessionData?.job_title || 'Target Role'}</p>
              </div>
            </div>
          </div>
        </div>
      )
    }

    if (section === 'strengths') {
      return (
        <div className="grid h-full gap-5 lg:grid-cols-3">
          {strengths.slice(0, 3).map((item: any, idx: number) => (
            <div key={`${item.criterion}-${idx}`} className="rounded-[1.7rem] border border-emerald-200 bg-white/92 p-6 shadow-[0_16px_30px_rgba(15,23,42,0.06)]">
              <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-[1rem] bg-emerald-100">
                <CheckCircle className="h-6 w-6 text-emerald-600" />
              </div>
              <p className="text-lg font-black text-slate-900">{item.criterion}</p>
              <p className="mt-3 text-sm leading-7 text-slate-600">{item.feedback}</p>
            </div>
          ))}
        </div>
      )
    }

    if (section === 'issues') {
      return currentIssue ? (
        <div className="grid h-full gap-5 lg:grid-cols-[1.15fr_0.85fr]">
          <div className="rounded-[1.8rem] border border-amber-200 bg-white/92 p-6 shadow-[0_16px_30px_rgba(15,23,42,0.06)]">
            <div className="flex items-center justify-between gap-4">
              <p className="rounded-full bg-amber-100 px-3 py-1 text-xs font-black uppercase tracking-[0.18em] text-amber-700">
                Issue {issueIndex + 1} of {issues.length}
              </p>
              {currentIssue.score != null && <span className="text-sm font-black text-amber-700">{currentIssue.score}/10</span>}
            </div>
            <h2 className="mt-5 text-3xl font-black text-slate-900">{currentIssue.criterion}</h2>
            <p className="mt-4 text-sm leading-7 text-slate-600">{currentIssue.feedback}</p>
            {currentIssue.evidence?.[0]?.question && (
              <div className="mt-5 rounded-[1.3rem] border border-slate-200 bg-slate-50/90 p-4">
                <p className="text-xs font-black uppercase tracking-[0.18em] text-slate-500">Flagged Question</p>
                <p className="mt-2 text-sm font-semibold text-slate-900">{currentIssue.evidence[0].question}</p>
                {currentIssue.evidence[0].excerpt && (
                  <p className="mt-3 text-sm leading-6 text-slate-600">
                    &ldquo;{String(currentIssue.evidence[0].excerpt).slice(0, 220)}{String(currentIssue.evidence[0].excerpt).length > 220 ? '…' : ''}&rdquo;
                  </p>
                )}
              </div>
            )}
          </div>

          <div className="flex h-full flex-col justify-between rounded-[1.8rem] border border-violet-200 bg-violet-50/80 p-6">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.18em] text-violet-600">Why This Matters</p>
              <p className="mt-3 text-sm leading-7 text-slate-600">
                This is one of the reasons the interviewer would hesitate to advance you. Fixing it raises the quality of the entire round, not just one answer.
              </p>
            </div>
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => setIssueIndex((value) => Math.max(0, value - 1))}
                disabled={issueIndex === 0}
                className="flex h-12 w-12 items-center justify-center rounded-2xl border border-slate-200 bg-white text-slate-600 disabled:opacity-40"
              >
                <ChevronLeft className="h-5 w-5" />
              </button>
              <button
                type="button"
                onClick={() => setIssueIndex((value) => Math.min(issues.length - 1, value + 1))}
                disabled={issueIndex >= issues.length - 1}
                className="flex h-12 w-12 items-center justify-center rounded-2xl border border-slate-200 bg-white text-slate-600 disabled:opacity-40"
              >
                <ChevronRight className="h-5 w-5" />
              </button>
            </div>
          </div>
        </div>
      ) : null
    }

    if (section === 'criteria') {
      return (
        <div className="flex h-full flex-col">
          <div className="grid flex-1 gap-5 md:grid-cols-2">
            {visibleCriteria.map((item) => (
              <div key={item.label} className="rounded-[1.7rem] border border-slate-200 bg-white/92 p-5 shadow-[0_16px_30px_rgba(15,23,42,0.06)]">
                <div className="flex items-start justify-between gap-3">
                  <p className="text-lg font-black text-slate-900">{item.label}</p>
                  <span className="rounded-full bg-violet-100 px-3 py-1 text-xs font-black text-violet-700">
                    {item.score}/{item.max}
                  </span>
                </div>
                <div className="mt-4 h-3 overflow-hidden rounded-full bg-slate-100">
                  <div
                    className="h-full rounded-full bg-[linear-gradient(90deg,#8b5cf6_0%,#6d28d9_100%)]"
                    style={{ width: `${Math.max(0, Math.min(100, (item.score / item.max) * 100))}%` }}
                  />
                </div>
                <p className="mt-4 text-sm leading-7 text-slate-600">{item.feedback}</p>
              </div>
            ))}
          </div>
          {criteriaPages > 1 && (
            <div className="mt-5 flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={() => setCriteriaPage((value) => Math.max(0, value - 1))}
                disabled={criteriaPage === 0}
                className="rounded-2xl border border-slate-200 bg-white px-4 py-2 text-sm font-bold text-slate-600 disabled:opacity-40"
              >
                Previous
              </button>
              <span className="text-sm font-bold text-slate-500">{criteriaPage + 1} / {criteriaPages}</span>
              <button
                type="button"
                onClick={() => setCriteriaPage((value) => Math.min(criteriaPages - 1, value + 1))}
                disabled={criteriaPage >= criteriaPages - 1}
                className="rounded-2xl border border-slate-200 bg-white px-4 py-2 text-sm font-bold text-slate-600 disabled:opacity-40"
              >
                Next
              </button>
            </div>
          )}
        </div>
      )
    }

    return (
      <div className="grid h-full gap-5 lg:grid-cols-[1fr_1fr]">
        <div className="rounded-[1.8rem] border border-violet-200 bg-white/92 p-6 shadow-[0_16px_30px_rgba(15,23,42,0.06)]">
          <div className="mb-4 flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-[1rem] bg-violet-100">
              <Target className="h-6 w-6 text-violet-700" />
            </div>
            <div>
              <p className="text-xs font-black uppercase tracking-[0.18em] text-violet-600">Practice Direction</p>
              <p className="text-lg font-black text-slate-900">What to work on next</p>
            </div>
          </div>
          <div className="space-y-3">
            {studyAreas.slice(0, 3).map((area: any, idx: number) => (
              <div key={`${area.topic}-${idx}`} className="rounded-[1.15rem] border border-slate-200 bg-slate-50/90 p-4">
                <p className="text-sm font-black text-slate-900">{area.topic}</p>
                <p className="mt-2 text-sm leading-6 text-slate-600">{area.reason}</p>
              </div>
            ))}
          </div>
        </div>
        <div className="flex h-full flex-col justify-between rounded-[1.8rem] border border-slate-200 bg-white/92 p-6 shadow-[0_16px_30px_rgba(15,23,42,0.06)]">
          <div>
            <div className="mb-4 flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-[1rem] bg-amber-100">
                <Trophy className="h-6 w-6 text-amber-700" />
              </div>
              <div>
                <p className="text-xs font-black uppercase tracking-[0.18em] text-amber-600">Predicted Follow-Ups</p>
                <p className="text-lg font-black text-slate-900">Be ready for these next</p>
              </div>
            </div>
            <div className="space-y-3">
              {predictedQuestions.slice(0, 3).map((question: string, idx: number) => (
                <div key={`${question}-${idx}`} className="rounded-[1.15rem] border border-amber-200 bg-amber-50/70 p-4 text-sm font-semibold leading-6 text-slate-700">
                  {question}
                </div>
              ))}
            </div>
          </div>
          <button
            type="button"
            onClick={onStartPractice}
            className="btn-coach-primary mt-6 flex items-center justify-center gap-2 px-6 py-4 text-base"
          >
            Start Practice
            <ArrowRight className="h-5 w-5" />
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="flex h-full flex-col px-6 py-6 lg:px-8 lg:py-8">
      <div className="mb-5 flex items-center justify-between gap-4">
        <div>
          <p className="text-xs font-black uppercase tracking-[0.24em] text-violet-500">Detailed Report</p>
          <h1 className="mt-2 text-3xl font-black text-slate-900">Serious coaching, organized like a workspace.</h1>
        </div>
        <div className="rounded-[1.4rem] border border-slate-200 bg-white/90 px-5 py-3 shadow-[0_10px_22px_rgba(15,23,42,0.06)]">
          <p className="text-xs font-black uppercase tracking-[0.18em] text-slate-500">Section</p>
          <p className="mt-1 text-sm font-bold text-slate-900">{SECTION_CONFIG.find((item) => item.key === section)?.label}</p>
        </div>
      </div>

      <div className="mb-5 grid grid-cols-5 gap-3">
        {SECTION_CONFIG.map((item) => (
          <button
            key={item.key}
            type="button"
            onClick={() => setSection(item.key)}
            className={`rounded-[1.2rem] border px-3 py-3 text-sm font-black transition-all ${
              section === item.key
                ? 'border-violet-300 bg-violet-600 text-white shadow-[0_12px_24px_rgba(109,40,217,0.22)]'
                : 'border-slate-200 bg-white/88 text-slate-600 hover:border-violet-200 hover:text-slate-900'
            }`}
          >
            {item.label}
          </button>
        ))}
      </div>

      <div className="flex-1 overflow-hidden">{renderSection()}</div>
    </div>
  )
}
