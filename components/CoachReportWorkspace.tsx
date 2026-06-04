'use client'

import { ReactNode, useEffect, useMemo, useState } from 'react'
import { CheckCircle, ChevronLeft, ChevronRight, AlertTriangle, Target, Trophy, FileText, Download, X } from 'lucide-react'
import { getImprovementTipForCriterion } from '@/lib/practice-bundles'

type ReportSection = 'overview' | 'strengths' | 'issues' | 'criteria' | 'next_steps'

interface ReportWorkspaceProps {
  feedback: any
  currentSessionData: any
  currentStage: string
  onRetakeInterview?: () => void
  onUnlockNextStage?: () => void
  artifactContent?: ReactNode
  onPrintArtifact?: () => void
  tutorialActive?: boolean
  onDismissTutorial?: () => void
}

const SECTION_CONFIG: Array<{ key: ReportSection; label: string }> = [
  { key: 'overview', label: 'Overview' },
  { key: 'strengths', label: 'Strong Signals' },
  { key: 'issues', label: 'Improve' },
  { key: 'criteria', label: 'Comparison' },
  { key: 'next_steps', label: 'Next Steps' },
]

const STAGE_LABELS: Record<string, string> = {
  hr_screen: 'HR Screen',
  hiring_manager: 'Hiring Manager',
  culture_fit: 'Culture Fit',
  final_round: 'Final Round',
  final: 'Final Round',
}

function percentileInterpretation(percentile: number) {
  if (percentile >= 80) return 'Strong benchmark result for this stage.'
  if (percentile >= 60) return 'Competitive, with a few areas still worth sharpening.'
  if (percentile >= 40) return 'Around the middle of the pack right now.'
  return 'Below benchmark right now, but coachable with targeted practice.'
}

function getSixAreas(feedback: any, stage: string) {
  switch (stage) {
    case 'hiring_manager': return feedback?.hiring_manager_six_areas
    case 'culture_fit': return feedback?.culture_fit_six_areas
    case 'final_round': return feedback?.final_round_six_areas
    default: return feedback?.hr_screen_six_areas
  }
}

type InsightTone = 'emerald' | 'amber' | 'slate' | 'violet'

const INSIGHT_TONE_CLASSES: Record<InsightTone, { card: string; icon: string; label: string }> = {
  emerald: {
    card: 'border-emerald-200 bg-emerald-50/75',
    icon: 'bg-emerald-100 text-emerald-700',
    label: 'text-emerald-700',
  },
  amber: {
    card: 'border-amber-200 bg-amber-50/75',
    icon: 'bg-amber-100 text-amber-700',
    label: 'text-amber-700',
  },
  slate: {
    card: 'border-slate-200 bg-slate-50/85',
    icon: 'bg-slate-100 text-slate-700',
    label: 'text-slate-600',
  },
  violet: {
    card: 'border-violet-200 bg-violet-50/75',
    icon: 'bg-violet-100 text-violet-700',
    label: 'text-violet-700',
  },
}

function InsightBlock({
  icon: Icon,
  eyebrow,
  title,
  children,
  tone = 'slate',
}: {
  icon: typeof Target
  eyebrow: string
  title: string
  children: ReactNode
  tone?: InsightTone
}) {
  const classes = INSIGHT_TONE_CLASSES[tone]

  return (
    <div className={`rounded-[1.25rem] border p-4 ${classes.card}`}>
      <div className="flex items-start gap-3">
        <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-2xl ${classes.icon}`}>
          <Icon className="h-4 w-4" />
        </div>
        <div>
          <p className={`text-[11px] font-black uppercase tracking-[0.18em] ${classes.label}`}>{eyebrow}</p>
          <h3 className="mt-1 text-base font-black text-slate-950">{title}</h3>
        </div>
      </div>
      <div className="mt-3 text-sm leading-7 text-slate-700">{children}</div>
    </div>
  )
}

function getPrimaryEvidence(item: any) {
  const evidence = Array.isArray(item?.evidence) ? item.evidence[0] : null
  if (!evidence) return null

  return {
    question: typeof evidence.question === 'string' ? evidence.question : '',
    excerpt: typeof evidence.excerpt === 'string' ? evidence.excerpt : '',
  }
}

function truncateText(value: any, maxLength = 260) {
  const text = typeof value === 'string' ? value.trim() : ''
  if (!text) return ''
  return text.length > maxLength ? `${text.slice(0, maxLength).trim()}...` : text
}

function scoreBadge(score: any) {
  if (score == null) return null
  return `${score}/10`
}

function repeatSignalGuidance(item: any) {
  const criterion = typeof item?.criterion === 'string' ? item.criterion.toLowerCase() : 'this signal'
  return `Repeat this by making ${criterion} visible early, grounding it in a concrete example, and tying the point back to the role.`
}

function defaultRepairPattern(criterion: string) {
  return [
    `Answer the ${criterion.toLowerCase()} concern directly in the first sentence.`,
    'Add one specific example with your role, action, and result.',
    'Close by connecting the example to what this job needs next.',
  ]
}

function normalizeCriteria(fullRubric: any, overallScoreRef: number) {
  const criteria = fullRubric?.traditional_hr_criteria
  if (!criteria) return []
  const overallTen = typeof overallScoreRef === 'number' ? overallScoreRef : fullRubric?.overall_assessment?.overall_score || 0

  if (criteria?.scores && criteria?.feedback) {
    const labelMap: Array<[string, string, number, string]> = [
      ['Communication', 'communication_skills', 10, 'How clearly and credibly you communicated in the interview.'],
      ['Professionalism', 'professionalism', 10, 'How polished and serious your interview presence felt.'],
      ['Qualifications', 'basic_qualifications_match', 10, 'How well your background matched the role on paper and in your answers.'],
      ['Interest', 'interest_and_enthusiasm', 10, 'How much genuine interest and preparation you showed.'],
      ['Culture Fit', 'culture_fit_indicators', 10, 'How well your answers suggested you would fit the team and working style.'],
      ['Response Quality', 'response_quality', 10, 'How specific, structured, and convincing your answers were.'],
      ['Risk Flags', 'red_flags', 10, 'This reflects absence of concern, not a positive achievement score.'],
    ]

    return labelMap
      .filter(([, key]) => criteria.scores[key] != null || criteria.feedback[key])
      .map(([label, key, max, helper]) => {
        const score10 = typeof criteria.scores[key] === 'number' ? criteria.scores[key] : 0
        const isRiskMetric = key === 'red_flags'
        const delta = score10 - overallTen
        const impact = isRiskMetric
          ? score10 >= 7
            ? 'clear'
            : score10 >= 5
            ? 'watch'
            : 'risk'
          : delta >= 1.5
          ? 'supporting'
          : delta <= -1
          ? 'dragging'
          : 'mixed'

        return {
          label,
          score: score10,
          max,
          feedback: criteria.feedback[key] || 'No additional notes.',
          helper,
          isRiskMetric,
          impact,
          score10,
        }
      })
  }

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
        helper: '',
        isRiskMetric: false,
        impact:
          ((rawMax ? (rawScore / rawMax) * 10 : 0) - overallTen) >= 1.5
            ? 'supporting'
            : ((rawMax ? (rawScore / rawMax) * 10 : 0) - overallTen) <= -1
            ? 'dragging'
            : 'mixed',
        score10: rawMax ? (rawScore / rawMax) * 10 : 0,
      }
    })
}

export default function CoachReportWorkspace({
  feedback,
  currentSessionData,
  currentStage,
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
  const [selectedStrengthIndex, setSelectedStrengthIndex] = useState(0)
  const [selectedIssueIndex, setSelectedIssueIndex] = useState(0)

  const sixAreas = useMemo(() => getSixAreas(feedback, currentStage), [feedback, currentStage])
  const strengths = sixAreas?.what_went_well || []
  const issues = sixAreas?.what_needs_improve || []
  const fullRubric = useMemo(() => feedback?.full_rubric || {}, [feedback])
  const stageLabel = STAGE_LABELS[currentStage] || 'Interview Round'
  const overallAssessment = fullRubric?.overall_assessment || {}
  const overallScore = feedback?.overall_score || overallAssessment?.overall_score || 0
  const criteria = useMemo(() => normalizeCriteria(fullRubric, overallScore), [fullRubric, overallScore])
  const comparativeAnalysis = fullRubric?.comparative_analysis || {}
  const likelihood = overallAssessment?.likelihood_to_advance || feedback?.likelihood || 'marginal'
  const studyAreas = fullRubric?.next_steps_preparation?.areas_to_study || []
  const predictedQuestions = fullRubric?.next_steps_preparation?.predicted_hiring_manager_questions || []
  const sectionIndex = SECTION_CONFIG.findIndex((item) => item.key === section)
  const topStrengths = strengths
  const topIssues = issues
  const activeStrengthIndex = topStrengths.length ? Math.min(selectedStrengthIndex, topStrengths.length - 1) : 0
  const activeIssueIndex = topIssues.length ? Math.min(selectedIssueIndex, topIssues.length - 1) : 0
  const selectedStrength = topStrengths[activeStrengthIndex]
  const selectedIssue = topIssues[activeIssueIndex]
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
      title: 'Flagged issues are where you tighten your next attempt',
      body: 'Use each flagged area to understand what weakened the answer, review the quick tip, then craft a stronger version before you retry.',
    },
    {
      section: 'next_steps' as ReportSection,
      title: 'This is how you move forward',
      body: 'From Next Steps you can review what to improve, retake the round, or move on when the feedback says you are ready.',
    },
  ]
  const activeTutorial = tutorialSteps[Math.min(tutorialStep, tutorialSteps.length - 1)]

  useEffect(() => {
    if (!tutorialActive) return
    setSection(activeTutorial.section)
  }, [activeTutorial.section, tutorialActive])

  useEffect(() => {
    if (selectedStrengthIndex >= topStrengths.length) setSelectedStrengthIndex(0)
  }, [selectedStrengthIndex, topStrengths.length])

  useEffect(() => {
    if (selectedIssueIndex >= topIssues.length) setSelectedIssueIndex(0)
  }, [selectedIssueIndex, topIssues.length])

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
                <p className="mt-1 text-sm font-bold text-slate-900">{issues.length} flagged area{issues.length === 1 ? '' : 's'}</p>
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
      const evidence = getPrimaryEvidence(selectedStrength)
      const score = scoreBadge(selectedStrength?.score)

      return (
        <div className="grid h-full min-h-0 gap-4 overflow-hidden xl:grid-cols-[320px_1fr]">
          <div className="flex min-h-0 flex-col rounded-[1.8rem] border border-emerald-200 bg-gradient-to-br from-emerald-50 via-white to-teal-50 p-5 shadow-[0_18px_34px_rgba(15,118,110,0.08)]">
            <p className="text-xs font-black uppercase tracking-[0.2em] text-emerald-700">Strong Signals</p>
            <h2 className="mt-3 text-2xl font-black leading-tight text-slate-950">Choose a signal to inspect</h2>
            <p className="mt-3 text-sm leading-6 text-slate-700">
              The goal here is repeatability. Pick a strong signal and see why it worked.
            </p>
            <div className="mt-4 grid grid-cols-2 gap-3">
              <div className="rounded-[1rem] border border-emerald-200 bg-white/80 p-3">
                <p className="text-[11px] font-black uppercase tracking-[0.18em] text-emerald-700">Found</p>
                <p className="mt-1 text-2xl font-black text-emerald-800">{topStrengths.length}</p>
              </div>
              <div className="rounded-[1rem] border border-slate-200 bg-white/80 p-3">
                <p className="text-[11px] font-black uppercase tracking-[0.18em] text-slate-500">Viewing</p>
                <p className="mt-1 text-2xl font-black text-slate-900">{topStrengths.length ? activeStrengthIndex + 1 : 0}</p>
              </div>
            </div>
            <p className="mt-4 text-[11px] font-black uppercase tracking-[0.18em] text-slate-500">All signals</p>
            <div className="mt-2 grid flex-1 content-start gap-2">
              {topStrengths.map((item: any, idx: number) => (
                <button
                  key={`${item.criterion}-quick-${idx}`}
                  type="button"
                  onClick={() => setSelectedStrengthIndex(idx)}
                  className={`rounded-[1rem] border px-3 py-2 text-left text-sm font-black transition ${
                    activeStrengthIndex === idx
                      ? 'border-emerald-300 bg-emerald-600 text-white shadow-[0_10px_18px_rgba(5,150,105,0.22)]'
                      : 'border-emerald-200 bg-white/80 text-slate-700 hover:border-emerald-300'
                  }`}
                >
                  <span className="line-clamp-1">{item.criterion}</span>
                </button>
              ))}
            </div>
          </div>

          {selectedStrength ? (
            <div className="grid h-full min-h-0 grid-rows-[auto_1fr] gap-4 overflow-hidden">
              <div className="rounded-[1.6rem] border border-emerald-200 bg-white/95 p-5 shadow-[0_14px_30px_rgba(15,23,42,0.06)]">
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div>
                    <p className="text-[11px] font-black uppercase tracking-[0.2em] text-emerald-700">Selected strong signal</p>
                    <h3 className="mt-1 text-2xl font-black leading-tight text-slate-950">{selectedStrength.criterion}</h3>
                  </div>
                  {score && (
                    <span className="rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs font-black text-emerald-700">
                      {score}
                    </span>
                  )}
                </div>
              </div>

              <div className="grid min-h-0 gap-4 lg:grid-cols-2">
                <InsightBlock icon={CheckCircle} eyebrow="What worked" title="This landed well" tone="emerald">
                  <p className="line-clamp-5">{selectedStrength.feedback || 'This answer created a positive signal the interviewer could use.'}</p>
                </InsightBlock>
                <InsightBlock icon={Trophy} eyebrow="Why it mattered" title="It reduced doubt" tone="violet">
                  <p className="line-clamp-5">
                    This gave the interviewer a clearer reason to believe you can do the work, communicate cleanly, or fit the stage expectations.
                  </p>
                </InsightBlock>
                <InsightBlock icon={Target} eyebrow="Repeat it next time" title="Turn it into a habit" tone="slate">
                  <p className="line-clamp-5">{repeatSignalGuidance(selectedStrength)}</p>
                </InsightBlock>
                <InsightBlock icon={FileText} eyebrow="Evidence" title={evidence?.question ? 'Where it showed up' : 'No quote captured'} tone="emerald">
                  {evidence?.question || evidence?.excerpt ? (
                    <div className="space-y-2">
                      {evidence.question && <p className="line-clamp-2 font-bold text-slate-900">{evidence.question}</p>}
                      {evidence.excerpt && <p className="line-clamp-3 text-slate-600">&ldquo;{truncateText(evidence.excerpt, 240)}&rdquo;</p>}
                    </div>
                  ) : (
                    <p>No supporting excerpt was attached to this signal.</p>
                  )}
                </InsightBlock>
              </div>
            </div>
          ) : (
            <div className="flex h-full items-center justify-center rounded-[1.5rem] border border-slate-200 bg-white/92 p-6 text-sm leading-7 text-slate-600">
              No strong signals were returned for this report yet. Once the grader identifies repeatable wins, they will show up here with coaching notes.
            </div>
          )}
        </div>
      )
    }

    if (section === 'issues') {
      const tip = selectedIssue ? getImprovementTipForCriterion(selectedIssue.criterion || 'Response Quality', selectedIssue.rootCause) : null
      const evidence = getPrimaryEvidence(selectedIssue)
      const score = scoreBadge(selectedIssue?.score)
      const rewrittenAnswer = typeof selectedIssue?.rewritten_answer === 'string' ? selectedIssue.rewritten_answer.trim() : ''
      const rewriteMethod = typeof selectedIssue?.rewrite_method === 'string' ? selectedIssue.rewrite_method.trim() : ''
      const repairPattern = tip
        ? tip.bullets?.length
          ? tip.bullets
          : defaultRepairPattern(selectedIssue?.criterion || 'response quality')
        : []

      return (
        <div className="grid h-full min-h-0 gap-4 overflow-hidden xl:grid-cols-[320px_1fr]">
          <div className="flex min-h-0 flex-col rounded-[1.8rem] border border-amber-200 bg-gradient-to-br from-amber-50 via-white to-orange-50 p-5 shadow-[0_18px_34px_rgba(180,83,9,0.08)]">
            <p className="text-xs font-black uppercase tracking-[0.2em] text-amber-700">Answer Repair</p>
            <h2 className="mt-3 text-2xl font-black leading-tight text-slate-950">Pick a flagged area</h2>
            <p className="mt-3 text-sm leading-6 text-slate-700">
              The page stays still. The user drills into one improvement at a time.
            </p>
            <div className="mt-4 grid grid-cols-2 gap-3">
              <div className="rounded-[1rem] border border-amber-200 bg-white/80 p-3">
                <p className="text-[11px] font-black uppercase tracking-[0.18em] text-amber-700">Flagged</p>
                <p className="mt-1 text-2xl font-black text-amber-800">{topIssues.length}</p>
              </div>
              <div className="rounded-[1rem] border border-slate-200 bg-white/80 p-3">
                <p className="text-[11px] font-black uppercase tracking-[0.18em] text-slate-500">Viewing</p>
                <p className="mt-1 text-2xl font-black text-slate-900">{topIssues.length ? activeIssueIndex + 1 : 0}</p>
              </div>
            </div>
            <p className="mt-4 text-[11px] font-black uppercase tracking-[0.18em] text-slate-500">All flagged areas</p>
            <div className="mt-2 grid flex-1 content-start gap-2">
              {topIssues.map((item: any, idx: number) => (
                <button
                  key={`${item.criterion}-issue-quick-${idx}`}
                  type="button"
                  onClick={() => setSelectedIssueIndex(idx)}
                  className={`rounded-[1rem] border px-3 py-2 text-left text-sm font-black transition ${
                    activeIssueIndex === idx
                      ? 'border-amber-300 bg-amber-500 text-white shadow-[0_10px_18px_rgba(217,119,6,0.22)]'
                      : 'border-amber-200 bg-white/80 text-slate-700 hover:border-amber-300'
                  }`}
                >
                  <span className="line-clamp-1">{item.criterion}</span>
                </button>
              ))}
            </div>
          </div>

          {selectedIssue && tip ? (
            <div className="grid h-full min-h-0 grid-rows-[auto_1fr] gap-4 overflow-hidden">
              <div className="rounded-[1.6rem] border border-amber-200 bg-white/95 p-5 shadow-[0_14px_30px_rgba(15,23,42,0.06)]">
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div>
                    <p className="text-[11px] font-black uppercase tracking-[0.2em] text-amber-700">Selected improvement</p>
                    <h3 className="mt-1 text-2xl font-black leading-tight text-slate-950">{selectedIssue.criterion}</h3>
                  </div>
                  {score && (
                    <span className="rounded-full border border-amber-200 bg-amber-50 px-3 py-1 text-xs font-black text-amber-700">
                      {score}
                    </span>
                  )}
                </div>
              </div>

              <div className="grid min-h-0 gap-4 lg:grid-cols-2">
                <InsightBlock icon={AlertTriangle} eyebrow="What hurt it" title="The missing signal" tone="amber">
                  <p className="line-clamp-5">{selectedIssue.feedback || 'The answer did not give the interviewer enough usable evidence.'}</p>
                </InsightBlock>
                <InsightBlock icon={Target} eyebrow="Tip for improvement" title={tip.title} tone="emerald">
                  <p className="line-clamp-3">{tip.summary}</p>
                  <div className="mt-2 rounded-xl border border-emerald-200 bg-white/80 px-3 py-2">
                    <p className="text-[11px] font-black uppercase tracking-[0.16em] text-emerald-700">Try this next</p>
                    <p className="mt-1 font-bold leading-6 text-slate-800">{tip.retryPrompt}</p>
                  </div>
                  <div className="mt-3 rounded-xl border border-violet-200 bg-white px-3 py-2">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <p className="text-[11px] font-black uppercase tracking-[0.16em] text-violet-700">Better Version</p>
                      {rewriteMethod ? (
                        <span className="rounded-full bg-violet-50 px-2 py-1 text-[10px] font-black uppercase tracking-[0.12em] text-violet-700">
                          {rewriteMethod}
                        </span>
                      ) : null}
                    </div>
                    {rewrittenAnswer ? (
                      <p className="mt-2 text-sm font-semibold leading-6 text-slate-800">&ldquo;{rewrittenAnswer}&rdquo;</p>
                    ) : (
                      <p className="mt-2 text-sm font-semibold leading-6 text-slate-700">
                        Not enough candidate answer text was captured to rewrite this without inventing details.
                      </p>
                    )}
                  </div>
                </InsightBlock>
                <InsightBlock icon={FileText} eyebrow="Better answer pattern" title="Draft this next" tone="violet">
                  <div className="grid gap-2">
                    {repairPattern.slice(0, 3).map((step: string, stepIdx: number) => (
                      <div key={`${selectedIssue.criterion}-compact-pattern-${stepIdx}`} className="rounded-xl border border-violet-200 bg-white/80 px-3 py-2">
                        <p className="text-[11px] font-black uppercase tracking-[0.16em] text-violet-600">Step {stepIdx + 1}</p>
                        <p className="mt-1 line-clamp-2 text-sm font-semibold leading-5 text-slate-700">{step}</p>
                      </div>
                    ))}
                  </div>
                </InsightBlock>
                <InsightBlock icon={FileText} eyebrow="Evidence" title={evidence?.question ? 'Where it showed up' : 'No quote captured'} tone="slate">
                  {evidence?.question || evidence?.excerpt ? (
                    <div className="space-y-2">
                      {evidence.question && <p className="line-clamp-2 font-bold text-slate-900">{evidence.question}</p>}
                      {evidence.excerpt && <p className="line-clamp-3 text-slate-600">&ldquo;{truncateText(evidence.excerpt, 240)}&rdquo;</p>}
                    </div>
                  ) : (
                    <p>No supporting excerpt was attached to this issue.</p>
                  )}
                </InsightBlock>
              </div>
            </div>
          ) : (
            <div className="flex h-full items-center justify-center rounded-[1.5rem] border border-emerald-200 bg-emerald-50/80 p-6 text-sm leading-7 text-emerald-900">
              No flagged issues were returned for this report. If this looks wrong, retake the interview and the grader will rebuild this coaching workspace.
            </div>
          )}
        </div>
      )
    }

    if (section === 'criteria') {
      const percentile = typeof comparativeAnalysis?.percentile_estimate === 'number'
        ? comparativeAnalysis.percentile_estimate
        : null
      const standoutQualities = (comparativeAnalysis?.standout_qualities || []).slice(0, 2)
      const avoidedWeaknesses = (comparativeAnalysis?.common_weaknesses_avoided || []).slice(0, 2)
      const requirementGaps = (comparativeAnalysis?.job_requirements_gaps || []).slice(0, 2)
      const resumeVsInterview = comparativeAnalysis?.resume_vs_interview || ''

      if (percentile != null) {
        return (
          <div className="grid h-full gap-4 xl:grid-cols-[320px_1fr]">
            <div className="flex flex-col gap-4">
              <div className="rounded-[1.7rem] border border-violet-200 bg-violet-50/90 p-5">
                <p className="text-xs font-black uppercase tracking-[0.18em] text-violet-600">Comparison</p>
                <div className="mt-4 flex items-end justify-between gap-3">
                  <div>
                    <h2 className="text-4xl font-black text-slate-900">{percentile}th</h2>
                    <p className="text-sm font-bold text-slate-500">percentile</p>
                  </div>
                  <div className="rounded-full bg-white px-3 py-1 text-[11px] font-black uppercase tracking-[0.18em] text-violet-700">
                    {stageLabel}
                  </div>
                </div>
                <p className="mt-4 text-sm leading-6 text-slate-700">
                  You performed better than {percentile}% of candidates interviewing for similar roles at this stage.
                </p>
                <p className="mt-3 text-sm font-bold leading-6 text-violet-800">
                  {percentileInterpretation(percentile)}
                </p>
              </div>

              {resumeVsInterview ? (
                <div className="rounded-[1.6rem] border border-violet-200 bg-white/92 p-5 shadow-[0_16px_30px_rgba(15,23,42,0.06)]">
                  <p className="text-xs font-black uppercase tracking-[0.18em] text-violet-600">Resume vs Interview</p>
                  <p className="mt-3 line-clamp-6 text-sm leading-6 text-slate-700">{resumeVsInterview}</p>
                </div>
              ) : (
                <div className="rounded-[1.6rem] border border-slate-200 bg-white/92 p-5 shadow-[0_16px_30px_rgba(15,23,42,0.06)]">
                  <p className="text-xs font-black uppercase tracking-[0.18em] text-slate-500">Benchmark Note</p>
                  <p className="mt-3 text-sm leading-6 text-slate-600">
                    Benchmarks are based on current PrepMe interview data and will get tighter as more candidates complete this stage.
                  </p>
                </div>
              )}
            </div>

            <div className="grid gap-4">
              <div className="rounded-[1.7rem] border border-slate-200 bg-white/92 p-5 shadow-[0_16px_30px_rgba(15,23,42,0.06)]">
                <div className="flex items-center justify-between text-xs font-black uppercase tracking-[0.18em] text-slate-500">
                  <span>Current benchmark estimate</span>
                  <span>You</span>
                </div>
                <div className="mt-4 rounded-[1.2rem] border border-slate-200 bg-slate-50 p-4">
                  <div className="relative h-3 rounded-full bg-slate-200">
                    <div className="absolute inset-0 rounded-full bg-gradient-to-r from-rose-400 via-amber-400 to-emerald-500" />
                    <div
                      className="absolute h-5 w-1.5 rounded-full bg-violet-700"
                      style={{ left: `${percentile}%`, top: '-4px', boxShadow: '0 0 0 4px white' }}
                    />
                  </div>
                  <div className="mt-3 flex items-center justify-between text-xs font-bold text-slate-500">
                    <span>Bottom 25%</span>
                    <span>Average</span>
                    <span>Top 25%</span>
                  </div>
                </div>
              </div>

              <div className="grid gap-4 lg:grid-cols-3">
                <div className="rounded-[1.6rem] border border-emerald-200 bg-emerald-50/80 p-5">
                  <p className="text-xs font-black uppercase tracking-[0.18em] text-emerald-700">Standout</p>
                  <div className="mt-4 space-y-3">
                    {standoutQualities.length > 0 ? standoutQualities.map((item: string, idx: number) => (
                      <div key={`${item}-${idx}`} className="rounded-[1.1rem] border border-emerald-200 bg-white/85 px-4 py-3 text-sm font-semibold leading-6 text-slate-700 line-clamp-3">
                        {item}
                      </div>
                    )) : (
                      <p className="text-sm leading-6 text-slate-600">No standout benchmark notes yet.</p>
                    )}
                  </div>
                </div>

                <div className="rounded-[1.6rem] border border-amber-200 bg-amber-50/80 p-5">
                  <p className="text-xs font-black uppercase tracking-[0.18em] text-amber-700">Mistakes Avoided</p>
                  <div className="mt-4 space-y-3">
                    {avoidedWeaknesses.length > 0 ? avoidedWeaknesses.map((item: string, idx: number) => (
                      <div key={`${item}-${idx}`} className="rounded-[1.1rem] border border-amber-200 bg-white/85 px-4 py-3 text-sm font-semibold leading-6 text-slate-700 line-clamp-3">
                        {item}
                      </div>
                    )) : (
                      <p className="text-sm leading-6 text-slate-600">No benchmark comparison notes yet.</p>
                    )}
                  </div>
                </div>

                <div className="rounded-[1.6rem] border border-slate-200 bg-white/92 p-5 shadow-[0_16px_30px_rgba(15,23,42,0.06)]">
                  <p className="text-xs font-black uppercase tracking-[0.18em] text-slate-500">Role Match</p>
                  <div className="mt-4 space-y-3">
                    {requirementGaps.length > 0 ? requirementGaps.map((item: string, idx: number) => (
                      <div key={`${item}-${idx}`} className="rounded-[1.1rem] border border-slate-200 bg-slate-50 px-4 py-3 text-sm leading-6 text-slate-700 line-clamp-3">
                        {item}
                      </div>
                    )) : (
                      <p className="text-sm leading-6 text-slate-600">No major benchmark gaps were called out here.</p>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )
      }

      return (
        <div className="flex h-full flex-col gap-4">
          <div className="grid gap-4 xl:grid-cols-[320px_1fr]">
            <div className="rounded-[1.7rem] border border-violet-200 bg-violet-50/90 p-5">
              <p className="text-xs font-black uppercase tracking-[0.18em] text-violet-600">Score Drivers</p>
              <h2 className="mt-3 text-3xl font-black text-slate-900">{Math.round(overallScore * 10)}/100</h2>
              <p className="mt-3 text-sm leading-6 text-slate-700">
                This is the only score that matters. The dimensions on the right show what most strongly supported or dragged down that result.
              </p>
            </div>
            <div className="rounded-[1.7rem] border border-slate-200 bg-white/92 p-5 shadow-[0_16px_30px_rgba(15,23,42,0.06)]">
              <div className="grid gap-3 md:grid-cols-3">
                <div className="rounded-[1.1rem] border border-emerald-200 bg-emerald-50 px-4 py-3">
                  <p className="text-[11px] font-black uppercase tracking-[0.18em] text-emerald-700">Supports Score</p>
                  <p className="mt-1 text-sm font-bold text-slate-900">Meaningfully above your overall result</p>
                </div>
                <div className="rounded-[1.1rem] border border-amber-200 bg-amber-50 px-4 py-3">
                  <p className="text-[11px] font-black uppercase tracking-[0.18em] text-amber-700">Dragged Score</p>
                  <p className="mt-1 text-sm font-bold text-slate-900">Meaningfully below your overall result</p>
                </div>
                <div className="rounded-[1.1rem] border border-slate-200 bg-slate-50 px-4 py-3">
                  <p className="text-[11px] font-black uppercase tracking-[0.18em] text-slate-600">Mixed / Risk</p>
                  <p className="mt-1 text-sm font-bold text-slate-900">Neutral, mixed, or concern-oriented signal</p>
                </div>
              </div>
            </div>
          </div>
          <div className="grid flex-1 content-start gap-4 md:grid-cols-2 xl:grid-cols-3">
            {criteria.map((item) => {
              const toneClass =
                item.impact === 'supporting'
                  ? 'border-emerald-200 bg-emerald-50/70'
                  : item.impact === 'dragging'
                  ? 'border-amber-200 bg-amber-50/70'
                  : item.impact === 'risk'
                  ? 'border-rose-200 bg-rose-50/70'
                  : 'border-slate-200 bg-white/92'
              const chipClass =
                item.impact === 'supporting'
                  ? 'bg-emerald-100 text-emerald-700'
                  : item.impact === 'dragging'
                  ? 'bg-amber-100 text-amber-700'
                  : item.impact === 'risk'
                  ? 'bg-rose-100 text-rose-700'
                  : item.impact === 'watch'
                  ? 'bg-slate-100 text-slate-700'
                  : 'bg-slate-100 text-slate-700'
              const label =
                item.impact === 'supporting'
                  ? 'Supports score'
                  : item.impact === 'dragging'
                  ? 'Dragged score'
                  : item.impact === 'risk'
                  ? 'Risk flag'
                  : item.impact === 'watch'
                  ? 'Watch'
                  : 'Mixed'

              return (
                <div key={item.label} className={`rounded-[1.4rem] border p-4 shadow-[0_12px_24px_rgba(15,23,42,0.05)] ${toneClass}`}>
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-base font-black text-slate-900">{item.label}</p>
                      {item.helper ? (
                        <p className="mt-1 text-xs leading-5 text-slate-500">{item.helper}</p>
                      ) : null}
                    </div>
                    <span className={`shrink-0 rounded-full px-3 py-1 text-[11px] font-black ${chipClass}`}>
                      {label}
                    </span>
                  </div>
                  <p className="mt-3 line-clamp-3 text-sm leading-6 text-slate-600">{item.feedback}</p>
                </div>
              )
            })}
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
              <p className="text-xs font-black uppercase tracking-[0.18em] text-violet-600">Improvement Direction</p>
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
          <div className="mt-6 rounded-[1.2rem] border border-violet-200 bg-violet-50/80 p-4">
            <p className="text-xs font-black uppercase tracking-[0.18em] text-violet-700">Retry Advice</p>
            <p className="mt-2 text-sm leading-6 text-slate-700">
              Pick the highest-leverage flagged area, craft a stronger version of that answer on your own, then either retake this round or continue if the feedback already says you are ready.
            </p>
          </div>
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
          onClick={() => setSection(SECTION_CONFIG[(sectionIndex + 1) % SECTION_CONFIG.length].key)}
          className="btn-coach-primary flex items-center gap-2 px-4 py-3 text-sm"
        >
          {sectionIndex === SECTION_CONFIG.length - 1 ? 'Back to Overview' : 'Next'}
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
        <div className="report-artifact-print-root fixed inset-0 z-[70] flex items-center justify-center bg-black/40 p-6 backdrop-blur-sm">
          <style>{`
            @media print {
              body * {
                visibility: hidden !important;
              }

              .report-artifact-print-root,
              .report-artifact-print-root * {
                visibility: visible !important;
              }

              .report-artifact-print-root {
                position: static !important;
                display: block !important;
                width: 100% !important;
                height: auto !important;
                overflow: visible !important;
                background: #ffffff !important;
                padding: 0 !important;
                backdrop-filter: none !important;
              }

              .report-artifact-print-panel {
                width: 100% !important;
                max-width: none !important;
                height: auto !important;
                max-height: none !important;
                overflow: visible !important;
                border: 0 !important;
                border-radius: 0 !important;
                box-shadow: none !important;
              }

              .report-artifact-print-scroll {
                height: auto !important;
                max-height: none !important;
                overflow: visible !important;
                background: #ffffff !important;
                padding: 0 !important;
              }

              .report-artifact-no-print {
                display: none !important;
              }

              @page {
                margin: 0.5in;
              }
            }
          `}</style>
          <div className="report-artifact-print-panel relative flex h-[90vh] w-full max-w-6xl flex-col overflow-hidden rounded-[1.8rem] border border-slate-200 bg-white shadow-[0_32px_80px_rgba(15,23,42,0.24)]">
            <div className="report-artifact-no-print flex items-center justify-between border-b border-slate-200 px-6 py-4">
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
            <div className="report-artifact-print-scroll min-h-0 flex-1 overflow-y-auto bg-slate-100 p-4">
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
