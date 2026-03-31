'use client'

import { ReactNode, useEffect, useMemo, useState } from 'react'
import { ArrowRight, CheckCircle, ChevronLeft, ChevronRight, AlertTriangle, Target, Trophy, FileText, Download, X } from 'lucide-react'

type ReportSection = 'overview' | 'strengths' | 'issues' | 'criteria' | 'next_steps'

interface ReportWorkspaceProps {
  feedback: any
  currentSessionData: any
  currentStage: string
  onStartPractice: () => void
  onRetakeInterview?: () => void
  onUnlockNextStage?: () => void
  artifactContent?: ReactNode
  onPrintArtifact?: () => void
  tutorialActive?: boolean
  onDismissTutorial?: () => void
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
  onRetakeInterview,
  onUnlockNextStage,
  artifactContent,
  onPrintArtifact,
  tutorialActive = false,
  onDismissTutorial,
}: ReportWorkspaceProps) {
  const [section, setSection] = useState<ReportSection>('overview')
  const [showArtifact, setShowArtifact] = useState(false)
  const [tutorialStep, setTutorialStep] = useState(0)

  const sixAreas = useMemo(() => getSixAreas(feedback, currentStage), [feedback, currentStage])
  const strengths = sixAreas?.what_went_well || []
  const issues = sixAreas?.what_needs_improve || []
  const fullRubric = useMemo(() => feedback?.full_rubric || {}, [feedback])
  const criteria = useMemo(() => normalizeCriteria(fullRubric), [fullRubric])
  const stageLabel = STAGE_LABELS[currentStage] || 'Interview Round'
  const overallAssessment = fullRubric?.overall_assessment || {}
  const overallScore = feedback?.overall_score || overallAssessment?.overall_score || 0
  const likelihood = overallAssessment?.likelihood_to_advance || feedback?.likelihood || 'marginal'
  const studyAreas = fullRubric?.next_steps_preparation?.areas_to_study || []
  const predictedQuestions = fullRubric?.next_steps_preparation?.predicted_hiring_manager_questions || []
  const sectionIndex = SECTION_CONFIG.findIndex((item) => item.key === section)
  const topStrengths = strengths.slice(0, 4)
  const topIssues = issues.slice(0, 4)
  const tutorialSteps = [
    {
      section: 'overview' as ReportSection,
      title: 'This is your stage feedback workspace',
      body: 'Start here after every interview. This screen shows the score, context, artifact access, and where to go next.',
    },
    {
      section: 'strengths' as ReportSection,
      title: 'Keep what already works',
      body: 'Use Strengths to see the signals worth repeating in the next round instead of overcorrecting everything.',
    },
    {
      section: 'issues' as ReportSection,
      title: 'Flagged issues are where practice comes from',
      body: 'Each issue here can turn into a coaching module. Fix the highest-leverage problems first.',
    },
    {
      section: 'next_steps' as ReportSection,
      title: 'This is how you move forward',
      body: 'From Next Steps you can launch practice, retake the round, or move on when the feedback says you are ready.',
    },
  ]
  const activeTutorial = tutorialSteps[Math.min(tutorialStep, tutorialSteps.length - 1)]

  useEffect(() => {
    if (!tutorialActive) return
    setSection(activeTutorial.section)
  }, [activeTutorial.section, tutorialActive])

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
            <div className="mt-6 grid grid-cols-3 gap-3">
              <div className="rounded-[1.2rem] border border-violet-200 bg-violet-50 p-3">
                <p className="text-[11px] font-black uppercase tracking-[0.18em] text-violet-600">Achievement</p>
                <p className="mt-1 text-sm font-bold text-slate-900">Report Unlocked</p>
              </div>
              <div className="rounded-[1.2rem] border border-emerald-200 bg-emerald-50 p-3">
                <p className="text-[11px] font-black uppercase tracking-[0.18em] text-emerald-600">Progress</p>
                <p className="mt-1 text-sm font-bold text-slate-900">{strengths.length} strengths found</p>
              </div>
              <div className="rounded-[1.2rem] border border-amber-200 bg-amber-50 p-3">
                <p className="text-[11px] font-black uppercase tracking-[0.18em] text-amber-600">Focus</p>
                <p className="mt-1 text-sm font-bold text-slate-900">{issues.length} modules available</p>
              </div>
            </div>
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
            <div className="rounded-[1.6rem] border border-violet-200 bg-violet-50/90 p-5">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-violet-100">
                  <FileText className="h-5 w-5 text-violet-700" />
                </div>
                <div>
                  <p className="text-xs font-black uppercase tracking-[0.18em] text-violet-600">Saved Artifact</p>
                  <p className="text-sm font-bold text-slate-900">Detailed performance rubric</p>
                </div>
              </div>
              <p className="mt-3 text-sm leading-6 text-slate-600">
                Your formal coaching artifact is saved to the profile and ready to print or save as PDF.
              </p>
              <div className="mt-4 flex gap-3">
                <button
                  type="button"
                  onClick={() => setShowArtifact(true)}
                  className="btn-coach-primary flex items-center gap-2 px-4 py-2.5 text-sm"
                >
                  <FileText className="h-4 w-4" />
                  Open Artifact
                </button>
                <button
                  type="button"
                  onClick={onPrintArtifact}
                  className="rounded-2xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-bold text-slate-700"
                >
                  Print / Save
                </button>
              </div>
            </div>
          </div>
        </div>
      )
    }

    if (section === 'strengths') {
      return (
        <div className="grid h-full gap-5 lg:grid-cols-[0.72fr_1.28fr]">
          <div className="rounded-[1.8rem] border border-emerald-200 bg-emerald-50/90 p-6">
            <p className="text-xs font-black uppercase tracking-[0.18em] text-emerald-600">Strength Summary</p>
            <h2 className="mt-3 text-3xl font-black text-emerald-900">{strengths.length} strong signals</h2>
            <p className="mt-4 text-sm leading-7 text-slate-700">
              These are the parts of the interview that already sounded credible, structured, and worth carrying into the next round.
            </p>
            <div className="mt-6 space-y-3">
              {topStrengths.map((item: any, idx: number) => (
                <div key={`${item.criterion}-summary-${idx}`} className="rounded-[1.2rem] border border-emerald-200 bg-white/80 px-4 py-3">
                  <p className="text-sm font-black text-slate-900">{item.criterion}</p>
                </div>
              ))}
            </div>
          </div>
          <div className="grid h-full gap-4 lg:grid-cols-2">
            {topStrengths.map((item: any, idx: number) => (
              <div key={`${item.criterion}-${idx}`} className="rounded-[1.5rem] border border-emerald-200 bg-white/92 p-5 shadow-[0_14px_28px_rgba(15,23,42,0.06)]">
                <div className="mb-3 flex items-center gap-3">
                  <div className="flex h-11 w-11 items-center justify-center rounded-[1rem] bg-emerald-100">
                    <CheckCircle className="h-5 w-5 text-emerald-600" />
                  </div>
                  <p className="text-base font-black text-slate-900">{item.criterion}</p>
                </div>
                <p className="text-sm leading-7 text-slate-600">{item.feedback}</p>
              </div>
            ))}
          </div>
        </div>
      )
    }

    if (section === 'issues') {
      return (
        <div className="grid h-full gap-5 lg:grid-cols-[0.72fr_1.28fr]">
          <div className="rounded-[1.8rem] border border-amber-200 bg-amber-50/90 p-6">
            <p className="text-xs font-black uppercase tracking-[0.18em] text-amber-600">Issue Summary</p>
            <h2 className="mt-3 text-3xl font-black text-amber-900">{issues.length} flagged issues</h2>
            <p className="mt-4 text-sm leading-7 text-slate-700">
              These are the places where the interview lost signal. This is the work that feeds your practice modules and the next retake.
            </p>
            <div className="mt-6 space-y-3">
              {topIssues.map((item: any, idx: number) => (
                <div key={`${item.criterion}-summary-${idx}`} className="rounded-[1.2rem] border border-amber-200 bg-white/80 px-4 py-3">
                  <div className="flex items-center justify-between gap-3">
                    <p className="text-sm font-black text-slate-900">{item.criterion}</p>
                    {item.score != null && (
                      <span className="text-[11px] font-bold uppercase tracking-[0.18em] text-amber-700">
                        {item.score}/10
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
          <div className="grid h-full gap-4 lg:grid-cols-2">
            {topIssues.map((item: any, idx: number) => (
              <div key={`${item.criterion}-${idx}`} className="rounded-[1.5rem] border border-amber-200 bg-white/92 p-5 shadow-[0_14px_28px_rgba(15,23,42,0.06)]">
                <div className="mb-3 flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className="flex h-11 w-11 items-center justify-center rounded-[1rem] bg-amber-100">
                      <AlertTriangle className="h-5 w-5 text-amber-600" />
                    </div>
                    <p className="text-base font-black text-slate-900">{item.criterion}</p>
                  </div>
                  {item.score != null && (
                    <span className="rounded-full bg-amber-100 px-3 py-1 text-xs font-black text-amber-700">
                      {item.score}/10
                    </span>
                  )}
                </div>
                <p className="text-sm leading-7 text-slate-600">{item.feedback}</p>
                {item.evidence?.[0]?.question && (
                  <div className="mt-4 space-y-3">
                    <div className="rounded-[1.1rem] border border-slate-200 bg-slate-50/90 p-4">
                      <p className="text-xs font-black uppercase tracking-[0.18em] text-slate-500">Flagged Question</p>
                      <p className="mt-2 text-sm font-semibold leading-6 text-slate-900">{item.evidence[0].question}</p>
                    </div>
                    {item.evidence?.[0]?.excerpt && (
                      <div className="rounded-[1.1rem] border border-slate-200 bg-slate-50/90 p-4">
                        <p className="text-xs font-black uppercase tracking-[0.18em] text-slate-500">Your Answer</p>
                        <p className="mt-2 text-sm leading-6 text-slate-600">
                          &ldquo;{String(item.evidence[0].excerpt).slice(0, 220)}{String(item.evidence[0].excerpt).length > 220 ? '…' : ''}&rdquo;
                        </p>
                      </div>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )
    }

    if (section === 'criteria') {
      return (
        <div className="grid h-full gap-5 lg:grid-cols-[0.72fr_1.28fr]">
          <div className="rounded-[1.8rem] border border-violet-200 bg-violet-50/90 p-6">
            <p className="text-xs font-black uppercase tracking-[0.18em] text-violet-600">Rubric Summary</p>
            <h2 className="mt-3 text-3xl font-black text-slate-900">{criteria.length} scored dimensions</h2>
            <p className="mt-4 text-sm leading-7 text-slate-700">
              This is the formal scoring view behind the interview. It is useful for understanding how your performance translated into actual evaluator signal.
            </p>
          </div>
          <div className="grid h-full gap-4 md:grid-cols-2 xl:grid-cols-3">
            {criteria.map((item) => (
              <div key={item.label} className="rounded-[1.7rem] border border-slate-200 bg-white/92 p-5 shadow-[0_16px_30px_rgba(15,23,42,0.06)]">
                <div className="flex items-start justify-between gap-3">
                  <p className="text-base font-black text-slate-900">{item.label}</p>
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
                <p className="mt-4 text-sm leading-6 text-slate-600">{item.feedback}</p>
              </div>
            ))}
          </div>
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
          <div className="mt-4 grid gap-3">
            <button
              type="button"
              onClick={onRetakeInterview}
              className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-bold text-slate-700"
            >
              Retake This Interview
            </button>
            <button
              type="button"
              onClick={onUnlockNextStage}
              className="rounded-2xl border border-violet-200 bg-violet-50 px-4 py-3 text-sm font-bold text-violet-700"
            >
              Move to the Next Interview
            </button>
          </div>
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
      <div className="mt-5 flex items-center justify-between">
        <button
          type="button"
          onClick={() => setSection(SECTION_CONFIG[Math.max(0, sectionIndex - 1)].key)}
          disabled={sectionIndex === 0}
          className="flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-bold text-slate-600 disabled:opacity-40"
        >
          <ChevronLeft className="h-4 w-4" />
          Previous
        </button>
        <div className="flex items-center gap-2">
          {SECTION_CONFIG.map((item, idx) => (
            <div
              key={item.key}
              className={`h-2.5 w-10 rounded-full ${idx <= sectionIndex ? 'bg-violet-600' : 'bg-slate-200'}`}
            />
          ))}
        </div>
        <button
          type="button"
          onClick={() => setSection(SECTION_CONFIG[Math.min(SECTION_CONFIG.length - 1, sectionIndex + 1)].key)}
          disabled={sectionIndex === SECTION_CONFIG.length - 1}
          className="btn-coach-primary flex items-center gap-2 px-4 py-3 text-sm disabled:opacity-40"
        >
          Next
          <ChevronRight className="h-4 w-4" />
        </button>
      </div>

      {tutorialActive && (
        <div className="fixed inset-0 z-[65] flex items-center justify-center bg-[rgba(15,23,42,0.18)] p-6 backdrop-blur-[1px]">
          <div className="w-full max-w-xl rounded-[1.8rem] border border-violet-200 bg-white p-6 shadow-[0_32px_80px_rgba(15,23,42,0.18)]">
            <p className="text-xs font-black uppercase tracking-[0.2em] text-violet-500">Preppi Guide</p>
            <h2 className="mt-3 text-3xl font-black text-slate-900">{activeTutorial.title}</h2>
            <p className="mt-4 text-base leading-8 text-slate-600">{activeTutorial.body}</p>
            <div className="mt-6 flex items-center gap-2">
              {tutorialSteps.map((step, idx) => (
                <div key={step.title} className={`h-2.5 flex-1 rounded-full ${idx <= tutorialStep ? 'bg-violet-600' : 'bg-slate-200'}`} />
              ))}
            </div>
            <div className="mt-6 flex items-center justify-between">
              <button
                type="button"
                onClick={onDismissTutorial}
                className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-bold text-slate-600"
              >
                Skip guide
              </button>
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => setTutorialStep((value) => Math.max(0, value - 1))}
                  disabled={tutorialStep === 0}
                  className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-bold text-slate-600 disabled:opacity-40"
                >
                  Back
                </button>
                <button
                  type="button"
                  onClick={() => {
                    if (tutorialStep >= tutorialSteps.length - 1) {
                      onDismissTutorial?.()
                      return
                    }
                    setTutorialStep((value) => value + 1)
                  }}
                  className="btn-coach-primary px-5 py-3 text-sm"
                >
                  {tutorialStep >= tutorialSteps.length - 1 ? 'Got it' : 'Next'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {showArtifact && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/40 p-6 backdrop-blur-sm">
          <div className="relative flex h-[90vh] w-full max-w-6xl flex-col overflow-hidden rounded-[1.8rem] border border-slate-200 bg-white shadow-[0_32px_80px_rgba(15,23,42,0.24)]">
            <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4">
              <div>
                <p className="text-xs font-black uppercase tracking-[0.18em] text-violet-500">Performance Artifact</p>
                <h2 className="mt-1 text-2xl font-black text-slate-900">Detailed performance rubric</h2>
              </div>
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={onPrintArtifact}
                  className="btn-coach-primary flex items-center gap-2 px-4 py-2.5 text-sm"
                >
                  <Download className="h-4 w-4" />
                  Print / Save PDF
                </button>
                <button
                  type="button"
                  onClick={() => setShowArtifact(false)}
                  className="rounded-2xl border border-slate-200 bg-white p-2 text-slate-600"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
            </div>
            <div className="min-h-0 flex-1 overflow-y-auto bg-slate-100 p-4">
              {artifactContent || (
                <div className="flex h-full items-center justify-center text-sm text-slate-500">
                  Detailed artifact unavailable for this round.
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
