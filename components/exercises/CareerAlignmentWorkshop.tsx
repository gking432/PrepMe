'use client'

import { type ReactNode, useEffect, useMemo, useState } from 'react'
import { ArrowRight, CheckCircle2, FileText, MessageSquareText, Sparkles, X } from 'lucide-react'
import { createClient } from '@/lib/supabase-client'

interface CareerAlignmentWorkshopProps {
  sessionId?: string
  originalQuestion?: string
  originalAnswer?: string
  onComplete: () => void
}

type WorkshopStep =
  | 'theme'
  | 'fit_anchor'
  | 'timing_anchor'
  | 'observation'
  | 'fit'
  | 'timing'
  | 'final'

interface ThemeOption {
  id: string
  title: string
  description: string
  focusPhrase: string
  sourceSnippet?: string
  keywords: string[]
  fitChoices: Array<{
    id: string
    label: string
    anchor: string
  }>
}

interface TimingChoice {
  id: string
  label: string
  anchor: string
}

const TIMING_CHOICES: TimingChoice[] = [
  {
    id: 'central',
    label: 'I want this kind of work to be more central to my role.',
    anchor: 'I am looking for a role where this kind of work is more central to what I do.',
  },
  {
    id: 'ownership',
    label: 'I want more direct ownership in this area.',
    anchor: 'I am looking for a role where I can take more direct ownership in that area.',
  },
  {
    id: 'deeper',
    label: 'I have a foundation here and want to go deeper.',
    anchor: 'I have built a foundation in this kind of work and now want to go deeper in it.',
  },
  {
    id: 'alignment',
    label: 'I want a role that lines up more directly with my strongest work.',
    anchor: 'I am looking for a role that lines up more directly with the work I do best.',
  },
  {
    id: 'closer',
    label: 'I want to move closer to the kind of work I enjoy most.',
    anchor: 'I want to move closer to the kind of work where I am strongest and most engaged.',
  },
]

const FALLBACK_THEMES: ThemeOption[] = [
  {
    id: 'cross_functional',
    title: 'Cross-functional coordination',
    description: 'Keeping work aligned across teams as priorities move.',
    focusPhrase: 'keeping cross-functional work aligned as priorities move',
    keywords: ['cross-functional', 'stakeholder', 'coordinate', 'team', 'alignment'],
    fitChoices: [
      { id: 'coordination', label: 'I have spent a lot of time keeping moving pieces aligned across teams.', anchor: 'a lot of my recent work has involved keeping moving pieces aligned across teams' },
      { id: 'followthrough', label: 'I am strongest when the work depends on follow-through and coordination.', anchor: 'my strongest work tends to be the kind that depends on follow-through and coordination' },
      { id: 'execution', label: 'A lot of my background is in helping work move cleanly from one team to the next.', anchor: 'a lot of my background has involved helping work move cleanly from one team to the next' },
      { id: 'priorities', label: 'I have built real strength in keeping priorities clear when several teams are involved.', anchor: 'I have built real strength in keeping priorities clear when several teams are involved' },
    ],
  },
  {
    id: 'execution',
    title: 'Execution and follow-through',
    description: 'Owning the work that keeps projects moving day to day.',
    focusPhrase: 'execution and follow-through, not just high-level planning',
    keywords: ['execute', 'execution', 'deliver', 'delivery', 'follow-through', 'project management'],
    fitChoices: [
      { id: 'daily_execution', label: 'A lot of my recent work has been close to execution and follow-through.', anchor: 'a lot of my recent work has been close to execution and follow-through' },
      { id: 'moving_work', label: 'I do my best work when I am helping real work move, not just discussing it.', anchor: 'I do my best work when I am helping real work move, not just discussing it' },
      { id: 'ownership', label: 'I have built experience in owning deadlines, handoffs, and next steps.', anchor: 'I have built experience in owning deadlines, handoffs, and next steps' },
      { id: 'reliable', label: 'A lot of my background is in the kind of work where consistency and follow-through matter.', anchor: 'a lot of my background is in the kind of work where consistency and follow-through matter' },
    ],
  },
  {
    id: 'client_stakeholder',
    title: 'Stakeholder and client communication',
    description: 'Working closely with clients, partners, or internal stakeholders.',
    focusPhrase: 'working closely with stakeholders and keeping communication clear as work moves forward',
    keywords: ['client', 'customer', 'stakeholder', 'partner', 'communication', 'relationship'],
    fitChoices: [
      { id: 'stakeholder_work', label: 'I already spend a lot of time working across stakeholders and keeping communication clear.', anchor: 'I already spend a lot of time working across stakeholders and keeping communication clear' },
      { id: 'translation', label: 'A lot of my background involves translating needs into clear next steps.', anchor: 'a lot of my background involves translating needs into clear next steps' },
      { id: 'external', label: 'I have built strength in work that depends on clear follow-up with clients or partners.', anchor: 'I have built strength in work that depends on clear follow-up with clients or partners' },
      { id: 'alignment', label: 'The work I have done most consistently has depended on keeping people aligned and informed.', anchor: 'the work I have done most consistently has depended on keeping people aligned and informed' },
    ],
  },
  {
    id: 'process',
    title: 'Process improvement',
    description: 'Improving the way work gets organized, handed off, or tracked.',
    focusPhrase: 'improving how work gets organized and handed off, not just maintaining the status quo',
    keywords: ['process', 'improve', 'workflow', 'efficiency', 'optimize', 'operations'],
    fitChoices: [
      { id: 'structure', label: 'I have done a lot of work that involved building more structure around messy processes.', anchor: 'I have done a lot of work that involved building more structure around messy processes' },
      { id: 'systems', label: 'I am strongest when I can improve the system, not just work inside it.', anchor: 'I am strongest when I can improve the system, not just work inside it' },
      { id: 'handoffs', label: 'A lot of my background is in finding cleaner ways to manage handoffs and execution.', anchor: 'a lot of my background is in finding cleaner ways to manage handoffs and execution' },
      { id: 'clarity', label: 'I have built real strength in making workflows clearer and easier to run.', anchor: 'I have built real strength in making workflows clearer and easier to run' },
    ],
  },
  {
    id: 'prioritization',
    title: 'Fast-moving priorities',
    description: 'Handling shifting work without losing clarity or momentum.',
    focusPhrase: 'handling shifting priorities while keeping the work organized and moving',
    keywords: ['fast-paced', 'priorities', 'deadline', 'ambiguity', 'urgent', 'pace'],
    fitChoices: [
      { id: 'pace', label: 'I have spent a lot of time working in fast-moving environments where priorities shift quickly.', anchor: 'I have spent a lot of time working in fast-moving environments where priorities shift quickly' },
      { id: 'pressure', label: 'A lot of my strongest work has been under pressure when clarity really matters.', anchor: 'a lot of my strongest work has been under pressure when clarity really matters' },
      { id: 'organization', label: 'I do well in roles that depend on staying organized as things change.', anchor: 'I do well in roles that depend on staying organized as things change' },
      { id: 'stability', label: 'I have built strength in keeping work steady when priorities start moving around.', anchor: 'I have built strength in keeping work steady when priorities start moving around' },
    ],
  },
  {
    id: 'analysis',
    title: 'Problem-solving and analytical work',
    description: 'Using judgment to work through issues, patterns, or decisions.',
    focusPhrase: 'using analysis and judgment to work through problems, not just execute a checklist',
    keywords: ['analyze', 'analysis', 'problem-solving', 'insights', 'data', 'decision'],
    fitChoices: [
      { id: 'judgment', label: 'A lot of my background involves using judgment to work through unclear situations.', anchor: 'a lot of my background involves using judgment to work through unclear situations' },
      { id: 'problem_solving', label: 'I am most engaged in work that requires real problem-solving, not just routine execution.', anchor: 'I am most engaged in work that requires real problem-solving, not just routine execution' },
      { id: 'patterns', label: 'I have built strength in spotting patterns and turning them into clear next steps.', anchor: 'I have built strength in spotting patterns and turning them into clear next steps' },
      { id: 'decision_support', label: 'A lot of my recent work has involved gathering information and helping decisions get made clearly.', anchor: 'a lot of my recent work has involved gathering information and helping decisions get made clearly' },
    ],
  },
]

function cleanText(value: string) {
  return value.trim().replace(/\s+/g, ' ')
}

function ensurePeriod(value: string) {
  const cleaned = cleanText(value)
  if (!cleaned) return ''
  return /[.!?]$/.test(cleaned) ? cleaned : `${cleaned}.`
}

function summarizeAnswer(answer?: string) {
  const cleaned = cleanText(answer || '')
  if (!cleaned) return ''
  if (cleaned.length <= 180) return ensurePeriod(cleaned)
  return ensurePeriod(`${cleaned.slice(0, 177).trim()}...`)
}

function stripHeaders(jobDescription: string) {
  return jobDescription
    .replace(/^Company:\s*.+$/gim, '')
    .replace(/^Position:\s*.+$/gim, '')
    .trim()
}

function cleanLine(line: string) {
  return cleanText(
    line
      .replace(/^[\-\u2022*•]+\s*/, '')
      .replace(/^(responsibilities|requirements|about the role|you will|in this role,?\s*you will)\s*:?\s*/i, '')
  )
}

function isUsefulJobLine(line: string) {
  const lowered = line.toLowerCase()
  if (line.length < 28 || line.length > 180) return false
  const blocked = [
    'equal opportunity',
    'eeo',
    'benefits',
    'salary',
    'compensation',
    'medical',
    'dental',
    'pto',
    '401',
    'years of experience',
    'bachelor',
    'master',
    'degree',
    'preferred qualification',
    'required qualification',
    'bonus points',
    'location',
    'remote',
    'hybrid',
  ]
  return !blocked.some((token) => lowered.includes(token))
}

function buildThemesFromJobDescription(jobDescription: string) {
  const body = stripHeaders(jobDescription)
  const lines = body
    .split('\n')
    .map(cleanLine)
    .filter((line) => line && isUsefulJobLine(line))

  const matches = FALLBACK_THEMES.map((theme) => {
    let bestSnippet = ''
    let bestScore = 0

    for (const line of lines) {
      const lowered = line.toLowerCase()
      const score = theme.keywords.reduce(
        (count, keyword) => count + (lowered.includes(keyword.toLowerCase()) ? 1 : 0),
        0
      )

      if (score > bestScore) {
        bestScore = score
        bestSnippet = line
      }
    }

    return {
      ...theme,
      sourceSnippet: bestSnippet || undefined,
      score: bestScore,
    }
  })
    .filter((theme) => theme.score > 0)
    .sort((a, b) => b.score - a.score)

  const deduped: ThemeOption[] = []

  for (const theme of matches) {
    if (deduped.some((item) => item.title === theme.title)) continue
    deduped.push({
      id: theme.id,
      title: theme.title,
      description: theme.description,
      focusPhrase: theme.focusPhrase,
      sourceSnippet: theme.sourceSnippet,
      keywords: theme.keywords,
      fitChoices: theme.fitChoices,
    })
    if (deduped.length >= 5) break
  }

  if (deduped.length >= 3) return deduped

  const fallbackAdditions = FALLBACK_THEMES.filter(
    (theme) => !deduped.some((item) => item.id === theme.id)
  ).slice(0, 5 - deduped.length)

  return [...deduped, ...fallbackAdditions]
}

function uniqueOptions(options: string[]) {
  return Array.from(new Set(options.map((option) => ensurePeriod(option)).filter(Boolean)))
}

function buildObservationOptions(theme: ThemeOption) {
  return uniqueOptions([
    `What stood out to me is how central this role is to ${theme.focusPhrase}`,
    `One thing that really caught my attention is that this role seems closely tied to ${theme.focusPhrase}`,
    `What interests me most is that this role sits close to ${theme.focusPhrase}`,
  ]).slice(0, 3)
}

function buildFitOptions(choice: { label: string; anchor: string }) {
  return uniqueOptions([
    `That fits well with my background, because ${choice.anchor}`,
    `That connects naturally to the work I have been doing, especially because ${choice.anchor}`,
    `That feels like a strong fit for me, since ${choice.anchor}`,
  ]).slice(0, 3)
}

function buildTimingOptions(choice: TimingChoice) {
  return uniqueOptions([
    `The timing makes sense because ${choice.anchor}`,
    `At this point, ${choice.anchor}`,
    `That is a big part of why this feels like a logical next step, because ${choice.anchor}`,
  ]).slice(0, 3)
}

function buildFinalAnswers(observation: string, fit: string, timing: string) {
  return uniqueOptions([
    [observation, fit, timing].join(' '),
    [observation, fit, `That is why ${timing.charAt(0).toLowerCase()}${timing.slice(1)}`].join(' '),
    [
      observation,
      `It feels like a strong fit because ${fit.replace(/^That (fits well with my background, because|connects naturally to the work I have been doing, especially because|feels like a strong fit for me, since)\s+/i, '')}`,
      timing,
    ].join(' '),
  ]).slice(0, 3)
}

function SelectionCard({
  title,
  description,
  snippet,
  selected,
  onClick,
}: {
  title: string
  description: string
  snippet?: string
  selected: boolean
  onClick: () => void
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={selected}
      className={`w-full rounded-3xl border px-4 py-4 text-left transition ${
        selected
          ? 'border-emerald-400 bg-emerald-50 shadow-[0_8px_20px_rgba(16,185,129,0.12)]'
          : 'border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50'
      }`}
    >
      <div className="min-w-0">
        <p className="font-semibold text-slate-900">{title}</p>
        <p className="mt-1 text-sm leading-6 text-slate-600">{description}</p>
        {snippet ? (
          <p className="mt-3 rounded-2xl bg-slate-50 px-3 py-2 text-xs leading-5 text-slate-500">
            From the job description: “{snippet}”
          </p>
        ) : null}
      </div>
    </button>
  )
}

function Modal({
  title,
  children,
  onClose,
}: {
  title: string
  children: ReactNode
  onClose: () => void
}) {
  return (
    <div className="absolute inset-0 z-20 flex items-center justify-center bg-slate-950/35 p-4">
      <div className="flex max-h-[80vh] w-full max-w-2xl flex-col overflow-hidden rounded-[2rem] bg-white shadow-2xl">
        <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4">
          <h4 className="text-lg font-bold text-slate-900">{title}</h4>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full p-2 text-slate-500 transition hover:bg-slate-100 hover:text-slate-800"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
        <div className="overflow-y-auto px-5 py-5 text-sm leading-6 text-slate-700">{children}</div>
      </div>
    </div>
  )
}

export default function CareerAlignmentWorkshop({
  sessionId,
  originalQuestion,
  originalAnswer,
  onComplete,
}: CareerAlignmentWorkshopProps) {
  const supabase = useMemo(() => createClient(), [])
  const [jobDescription, setJobDescription] = useState('')
  const [loadingJobDescription, setLoadingJobDescription] = useState(true)
  const [showJobDescription, setShowJobDescription] = useState(false)
  const [showFlaggedAnswer, setShowFlaggedAnswer] = useState(false)
  const [step, setStep] = useState<WorkshopStep>('theme')
  const [selectedThemeId, setSelectedThemeId] = useState('')
  const [selectedFitAnchorId, setSelectedFitAnchorId] = useState('')
  const [selectedTimingId, setSelectedTimingId] = useState('')
  const [selectedObservation, setSelectedObservation] = useState('')
  const [selectedFit, setSelectedFit] = useState('')
  const [selectedTiming, setSelectedTiming] = useState('')
  const [selectedFinal, setSelectedFinal] = useState('')

  useEffect(() => {
    let cancelled = false

    async function loadJobDescription() {
      setLoadingJobDescription(true)

      try {
        if (sessionId) {
          const { data: sessionData } = await supabase
            .from('interview_sessions')
            .select('user_interview_data_id')
            .eq('id', sessionId)
            .single()

          if (sessionData?.user_interview_data_id) {
            const { data: interviewData } = await supabase
              .from('user_interview_data')
              .select('job_description_text')
              .eq('id', sessionData.user_interview_data_id)
              .single()

            if (!cancelled && interviewData?.job_description_text) {
              setJobDescription(interviewData.job_description_text)
              setLoadingJobDescription(false)
              return
            }
          }
        }

        const { data: fallbackData } = await supabase
          .from('user_interview_data')
          .select('job_description_text')
          .not('job_description_text', 'is', null)
          .order('updated_at', { ascending: false })
          .limit(1)

        if (!cancelled) {
          setJobDescription(fallbackData?.[0]?.job_description_text || '')
        }
      } finally {
        if (!cancelled) {
          setLoadingJobDescription(false)
        }
      }
    }

    loadJobDescription()

    return () => {
      cancelled = true
    }
  }, [sessionId, supabase])

  const questionLabel = originalQuestion || 'Why are you interested in this role?'
  const answerSummary = useMemo(() => summarizeAnswer(originalAnswer), [originalAnswer])
  const themeOptions = useMemo(
    () => buildThemesFromJobDescription(jobDescription),
    [jobDescription]
  )
  const selectedTheme = useMemo(
    () => themeOptions.find((theme) => theme.id === selectedThemeId) || themeOptions[0],
    [selectedThemeId, themeOptions]
  )
  const fitAnchorOptions = useMemo(
    () => selectedTheme?.fitChoices || [],
    [selectedTheme]
  )
  const selectedFitAnchor = fitAnchorOptions.find((item) => item.id === selectedFitAnchorId) || fitAnchorOptions[0]
  const selectedTimingAnchor = TIMING_CHOICES.find((item) => item.id === selectedTimingId) || TIMING_CHOICES[0]

  const observationOptions = useMemo(
    () => (selectedTheme ? buildObservationOptions(selectedTheme) : []),
    [selectedTheme]
  )
  const fitOptions = useMemo(
    () => (selectedFitAnchor ? buildFitOptions(selectedFitAnchor) : []),
    [selectedFitAnchor]
  )
  const timingOptions = useMemo(
    () => (selectedTimingAnchor ? buildTimingOptions(selectedTimingAnchor) : []),
    [selectedTimingAnchor]
  )
  const finalOptions = useMemo(
    () =>
      selectedObservation && selectedFit && selectedTiming
        ? buildFinalAnswers(selectedObservation, selectedFit, selectedTiming)
        : [],
    [selectedFit, selectedObservation, selectedTiming]
  )

  useEffect(() => {
    if (!selectedThemeId && themeOptions[0]) {
      setSelectedThemeId(themeOptions[0].id)
    }
  }, [selectedThemeId, themeOptions])

  useEffect(() => {
    if (!selectedFitAnchorId || !fitAnchorOptions.some((item) => item.id === selectedFitAnchorId)) {
      setSelectedFitAnchorId(fitAnchorOptions[0].id)
    }
  }, [fitAnchorOptions, selectedFitAnchorId])

  useEffect(() => {
    if (!selectedTimingId && TIMING_CHOICES[0]) {
      setSelectedTimingId(TIMING_CHOICES[0].id)
    }
  }, [selectedTimingId])

  useEffect(() => {
    if (!selectedObservation || !observationOptions.includes(selectedObservation)) {
      setSelectedObservation(observationOptions[0])
    }
  }, [observationOptions, selectedObservation])

  useEffect(() => {
    if (!selectedFit || !fitOptions.includes(selectedFit)) {
      setSelectedFit(fitOptions[0])
    }
  }, [fitOptions, selectedFit])

  useEffect(() => {
    if (!selectedTiming || !timingOptions.includes(selectedTiming)) {
      setSelectedTiming(timingOptions[0])
    }
  }, [selectedTiming, timingOptions])

  useEffect(() => {
    if (!selectedFinal || !finalOptions.includes(selectedFinal)) {
      setSelectedFinal(finalOptions[0])
    }
  }, [finalOptions, selectedFinal])

  function handleNext() {
    if (step === 'theme') {
      setStep('fit_anchor')
      return
    }
    if (step === 'fit_anchor') {
      setStep('timing_anchor')
      return
    }
    if (step === 'timing_anchor') {
      setStep('observation')
      return
    }
    if (step === 'observation') {
      setStep('fit')
      return
    }
    if (step === 'fit') {
      setStep('timing')
      return
    }
    if (step === 'timing') {
      setStep('final')
      return
    }
    onComplete()
  }

  function handleBack() {
    if (step === 'fit_anchor') setStep('theme')
    else if (step === 'timing_anchor') setStep('fit_anchor')
    else if (step === 'observation') setStep('timing_anchor')
    else if (step === 'fit') setStep('observation')
    else if (step === 'timing') setStep('fit')
    else if (step === 'final') setStep('timing')
  }

  const isUsingJobDescription = Boolean(jobDescription.trim())

  return (
    <div className="relative flex h-full flex-col overflow-hidden rounded-[2rem] border border-slate-200 bg-[linear-gradient(180deg,#ffffff_0%,#f8fbff_100%)] shadow-[0_16px_30px_rgba(15,23,42,0.06)]">
      {showJobDescription ? (
        <Modal title="Job description" onClose={() => setShowJobDescription(false)}>
          <div className="whitespace-pre-wrap">{stripHeaders(jobDescription) || 'No job description saved yet.'}</div>
        </Modal>
      ) : null}
      {showFlaggedAnswer ? (
        <Modal title="Your flagged answer" onClose={() => setShowFlaggedAnswer(false)}>
          <p>{answerSummary || 'No flagged answer available for this question yet.'}</p>
        </Modal>
      ) : null}

      <div className="shrink-0 border-b border-slate-200 px-5 py-5">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="max-w-2xl">
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">
              Career Alignment Workshop
            </p>
            <h3 className="mt-2 text-xl font-extrabold text-slate-900 md:text-2xl">
              Build a stronger answer to this question
            </h3>
            <p className="mt-3 rounded-2xl bg-slate-50 px-4 py-3 text-sm leading-6 text-slate-700">
              {questionLabel}
            </p>
            <p className="mt-3 text-sm leading-6 text-slate-600">
              Start with the work itself, then connect it to your background and why the move makes sense now.
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => setShowJobDescription(true)}
              className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:border-slate-300 hover:text-slate-900"
            >
              <FileText className="h-4 w-4" />
              View job description
            </button>
            {answerSummary ? (
              <button
                type="button"
                onClick={() => setShowFlaggedAnswer(true)}
                className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:border-slate-300 hover:text-slate-900"
              >
                <MessageSquareText className="h-4 w-4" />
                View flagged answer
              </button>
            ) : null}
          </div>
        </div>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto px-5 py-5">
        {step === 'theme' ? (
          <div>
            <div className="mb-5">
              <h4 className="text-lg font-bold text-slate-900">What part of the role stands out most?</h4>
              <p className="mt-2 text-sm leading-6 text-slate-600">
                {loadingJobDescription
                  ? 'Loading your saved job description and pulling out the strongest role themes.'
                  : isUsingJobDescription
                    ? 'Pick one theme pulled from your saved job description. The answer should start from the work itself.'
                    : 'No saved job description showed up, so these are smart fallback themes you can use to anchor the answer.'}
              </p>
            </div>
            <div className="space-y-3">
              {themeOptions.map((theme) => (
                <SelectionCard
                  key={theme.id}
                  title={theme.title}
                  description={theme.description}
                  snippet={theme.sourceSnippet}
                  selected={selectedThemeId === theme.id}
                  onClick={() => setSelectedThemeId(theme.id)}
                />
              ))}
            </div>
          </div>
        ) : null}

        {step === 'fit_anchor' && selectedTheme ? (
          <div>
            <div className="mb-5">
              <h4 className="text-lg font-bold text-slate-900">What makes that a strong fit for your background?</h4>
              <p className="mt-2 text-sm leading-6 text-slate-600">
                Pick the line that feels closest to the work you have actually been doing.
              </p>
            </div>
            <div className="space-y-3">
              {fitAnchorOptions.map((choice) => (
                <SelectionCard
                  key={choice.id}
                  title={choice.label}
                  description="This will become the backbone of your Fit section."
                  selected={selectedFitAnchorId === choice.id}
                  onClick={() => setSelectedFitAnchorId(choice.id)}
                />
              ))}
            </div>
          </div>
        ) : null}

        {step === 'timing_anchor' ? (
          <div>
            <div className="mb-5">
              <h4 className="text-lg font-bold text-slate-900">Why does this move make sense now?</h4>
              <p className="mt-2 text-sm leading-6 text-slate-600">
                Choose the version that sounds most intentional, not just broadly job-seeking.
              </p>
            </div>
            <div className="space-y-3">
              {TIMING_CHOICES.map((choice) => (
                <SelectionCard
                  key={choice.id}
                  title={choice.label}
                  description="This will shape the Timing section at the end of the answer."
                  selected={selectedTimingId === choice.id}
                  onClick={() => setSelectedTimingId(choice.id)}
                />
              ))}
            </div>
          </div>
        ) : null}

        {step === 'observation' ? (
          <div>
            <div className="mb-5">
              <h4 className="text-lg font-bold text-slate-900">Choose your opening</h4>
              <p className="mt-2 text-sm leading-6 text-slate-600">
                Pick the line that sounds the most specific and natural out loud.
              </p>
            </div>
            <div className="space-y-3">
              {observationOptions.map((option) => (
                <SelectionCard
                  key={option}
                  title={option}
                  description="A strong Observation points to something real about the work, not generic praise."
                  selected={selectedObservation === option}
                  onClick={() => setSelectedObservation(option)}
                />
              ))}
            </div>
          </div>
        ) : null}

        {step === 'fit' ? (
          <div>
            <div className="mb-5">
              <h4 className="text-lg font-bold text-slate-900">Choose your fit line</h4>
              <p className="mt-2 text-sm leading-6 text-slate-600">
                Pick the line that connects the role most clearly to your background.
              </p>
            </div>
            <div className="space-y-3">
              {fitOptions.map((option) => (
                <SelectionCard
                  key={option}
                  title={option}
                  description="The strongest version should prove fit instead of just claiming it."
                  selected={selectedFit === option}
                  onClick={() => setSelectedFit(option)}
                />
              ))}
            </div>
          </div>
        ) : null}

        {step === 'timing' ? (
          <div>
            <div className="mb-5">
              <h4 className="text-lg font-bold text-slate-900">Choose your ending</h4>
              <p className="mt-2 text-sm leading-6 text-slate-600">
                Pick the ending that makes the move sound the most logical and intentional.
              </p>
            </div>
            <div className="space-y-3">
              {timingOptions.map((option) => (
                <SelectionCard
                  key={option}
                  title={option}
                  description="This should explain why the move makes sense now, not just why change sounds nice."
                  selected={selectedTiming === option}
                  onClick={() => setSelectedTiming(option)}
                />
              ))}
            </div>
          </div>
        ) : null}

        {step === 'final' ? (
          <div>
            <div className="mb-5">
              <h4 className="text-lg font-bold text-slate-900">Choose your final answer</h4>
              <p className="mt-2 text-sm leading-6 text-slate-600">
                Pick the version that sounds the most specific, connected, and intentional.
              </p>
            </div>
            <div className="space-y-4">
              {finalOptions.map((option, index) => (
                <button
                  key={option}
                  type="button"
                  onClick={() => setSelectedFinal(option)}
                  className={`w-full rounded-[1.75rem] border px-5 py-5 text-left transition ${
                    selectedFinal === option
                      ? 'border-emerald-400 bg-emerald-50 shadow-[0_10px_24px_rgba(16,185,129,0.13)]'
                      : 'border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50'
                  }`}
                >
                  <div className="mb-3 flex items-center gap-2">
                    <span className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-slate-900 text-sm font-bold text-white">
                      {index + 1}
                    </span>
                    <span className="text-sm font-semibold text-slate-600">
                      {index === 0 ? 'Most direct' : index === 1 ? 'Most polished' : 'Most natural'}
                    </span>
                  </div>
                  <p className="text-[15px] leading-7 text-slate-800">{option}</p>
                </button>
              ))}
            </div>

            <div className="mt-6 rounded-[1.75rem] border border-violet-200 bg-violet-50/80 px-5 py-4">
              <div className="flex items-start gap-3">
                <Sparkles className="mt-0.5 h-5 w-5 shrink-0 text-violet-600" />
                <div>
                  <p className="font-semibold text-violet-900">Why this version works</p>
                  <p className="mt-1 text-sm leading-6 text-violet-800">
                    It starts with the work itself, ties that work to your background, and ends with why the move makes sense now. That keeps the answer centered on fit instead of what you want to get from the role.
                  </p>
                </div>
              </div>
            </div>
          </div>
        ) : null}
      </div>

      <div className="shrink-0 border-t border-slate-200 px-5 py-4">
        {step !== 'theme' ? (
          <div className="mb-4 rounded-3xl bg-slate-50 px-4 py-4">
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-400">
              Answer so far
            </p>
            <p className="mt-2 text-sm leading-6 text-slate-700">
              {[selectedObservation, selectedFit, selectedTiming].filter(Boolean).join(' ')}
            </p>
          </div>
        ) : null}

        <div className="flex items-center justify-between gap-3">
          <button
            type="button"
            onClick={handleBack}
            disabled={step === 'theme'}
            className="inline-flex items-center rounded-full border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-600 transition hover:border-slate-300 hover:text-slate-900 disabled:cursor-not-allowed disabled:opacity-40"
          >
            Back
          </button>

          <button
            type="button"
            onClick={handleNext}
            className="btn-coach-primary inline-flex items-center gap-2 px-6 py-3"
          >
            {step === 'final' ? 'Finish workshop' : 'Next'}
            <ArrowRight className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  )
}
