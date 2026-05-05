'use client'

import { useState } from 'react'
import { ArrowRight, CheckCircle2 } from 'lucide-react'

type WorkshopPhase =
  | 'example'
  | 'pressure'
  | 'responsibility'
  | 'situation_task_follow_up'
  | 'situation_choose'
  | 'task_choose'
  | 'setup_preview'
  | 'action_types'
  | 'action_detail'
  | 'action_follow_up'
  | 'action_choose'
  | 'action_preview'
  | 'result_types'
  | 'result_detail'
  | 'proof_types'
  | 'result_landing_follow_up'
  | 'result_choose'
  | 'result_preview'
  | 'proof_choose'
  | 'practice'

type AiStage = 'situation_task' | 'action' | 'result_landing'

interface StarProofWorkshopProps {
  onComplete: () => void
}

interface WorkshopAnswers {
  example: string
  responsibility: string
  actionDetail: string
  resultDetail: string
}

interface AiResponse {
  normalized_input?: Record<string, string>
  options?: {
    situation?: string[]
    task?: string[]
    action?: string[]
    result?: string[]
    landing?: string[]
  }
  should_ask_follow_up?: boolean
  follow_up_question?: string
  weakness_tag?: string
}

const EMPTY_ANSWERS: WorkshopAnswers = {
  example: '',
  responsibility: '',
  actionDetail: '',
  resultDetail: '',
}

const PRESSURE_OPTIONS = [
  'deadline at risk',
  'competing priorities',
  'unclear ownership',
  'cross-team coordination',
  'high volume of work',
  'unexpected change',
  'client pressure',
  'process confusion',
  'limited time',
  'missing information',
]

const ACTION_OPTIONS = [
  'created structure',
  'clarified priorities',
  'assigned ownership',
  'improved communication',
  'flagged blockers early',
  'built a tracker',
  'solved a process issue',
  'coordinated across teams',
  'escalated when needed',
  'simplified the workflow',
  'checked in regularly',
  'fixed a handoff problem',
]

const RESULT_OPTIONS = [
  'met the deadline',
  'reduced confusion',
  'improved turnaround time',
  'avoided delays',
  'improved the process',
  'prevented escalation',
  'kept the project moving',
  'improved communication',
  'created a repeatable system',
  'solved the immediate issue',
]

const PROOF_OPTIONS = [
  'organized under pressure',
  'proactive',
  'strong communicator',
  'good at creating structure',
  'calm under pressure',
  'strong follow-through',
  'adaptable',
  'reliable',
  'good at solving problems',
  'effective across teams',
]

const PRESSURE_PHRASES: Record<string, string> = {
  'deadline at risk': 'the deadline was starting to slip',
  'competing priorities': 'competing priorities were pulling the work in different directions',
  'unclear ownership': 'ownership was not clear',
  'cross-team coordination': 'several teams needed to stay aligned',
  'high volume of work': 'the volume of work spiked quickly',
  'unexpected change': 'plans shifted unexpectedly',
  'client pressure': 'there was pressure from the client side',
  'process confusion': 'the process was causing confusion',
  'limited time': 'there was very little time to reset the work',
  'missing information': 'key information was still missing',
}

const ACTION_PHRASES: Record<string, string> = {
  'created structure': 'created more structure around the work',
  'clarified priorities': 'clarified what needed to happen first',
  'assigned ownership': 'made ownership more explicit',
  'improved communication': 'tightened communication across the people involved',
  'flagged blockers early': 'flagged blockers before they slowed the work',
  'built a tracker': 'built one tracker for the moving pieces',
  'solved a process issue': 'fixed the process issue that was slowing the team down',
  'coordinated across teams': 'coordinated the work across teams',
  'escalated when needed': 'escalated the right issues early',
  'simplified the workflow': 'simplified the workflow',
  'checked in regularly': 'used short regular check-ins',
  'fixed a handoff problem': 'fixed the handoff gap between teams',
}

const RESULT_PHRASES: Record<string, string> = {
  'met the deadline': 'we still met the deadline',
  'reduced confusion': 'the team had much less confusion',
  'improved turnaround time': 'turnaround time improved',
  'avoided delays': 'we avoided further delays',
  'improved the process': 'the process worked better afterward',
  'prevented escalation': 'the issue did not escalate further',
  'kept the project moving': 'the project kept moving',
  'improved communication': 'communication was much clearer',
  'created a repeatable system': 'the team ended up with a repeatable system',
  'solved the immediate issue': 'the immediate issue got resolved',
}

const PROOF_PHRASES: Record<string, string> = {
  'organized under pressure': 'That is a good example of how I stay organized when a lot is moving at once.',
  proactive: 'That example shows that I try to solve the problem early instead of waiting for it to get worse.',
  'strong communicator': 'That is a good example of how I keep communication clear when a situation gets messy.',
  'good at creating structure': 'That experience shows how I create structure when the process is not working.',
  'calm under pressure': 'That is a good example of how I stay steady when timelines tighten.',
  'strong follow-through': 'That example shows that I stay close to the work until the important pieces are actually done.',
  adaptable: 'That experience shows how I adjust quickly when the situation changes.',
  reliable: 'That is a good example of how I help keep the work dependable when things get complicated.',
  'good at solving problems': 'That example shows how I work through problems in a practical way.',
  'effective across teams': 'That is a good example of how I keep work moving across teams when a lot of people are involved.',
}

function cleanInput(value: string) {
  return value.trim().replace(/\s+/g, ' ').replace(/[.]+$/g, '')
}

function lowerFirst(value: string) {
  if (!value) return value
  return value.charAt(0).toLowerCase() + value.slice(1)
}

function upperFirst(value: string) {
  if (!value) return value
  return value.charAt(0).toUpperCase() + value.slice(1)
}

function ensurePeriod(value: string) {
  const trimmed = value.trim()
  if (!trimmed) return ''
  return /[.!?]$/.test(trimmed) ? trimmed : `${trimmed}.`
}

function uniqueOptions(options: string[]) {
  return Array.from(new Set(options.map((option) => ensurePeriod(option)))).filter(Boolean)
}

function joinWithAnd(items: string[]) {
  if (items.length === 0) return ''
  if (items.length === 1) return items[0]
  if (items.length === 2) return `${items[0]} and ${items[1]}`
  return `${items.slice(0, -1).join(', ')}, and ${items[items.length - 1]}`
}

function normalizeActionDetail(value: string) {
  const cleaned = cleanInput(value)
  if (!cleaned) return null
  const lowered = cleaned.toLowerCase()
  if (lowered.split(' ').length < 2) return null
  if (/^(got|met|made it|result|outcome)/.test(lowered)) return null
  return cleaned
}

function normalizeResultDetail(value: string) {
  const cleaned = cleanInput(value)
  if (!cleaned) return null
  const lowered = cleaned.toLowerCase()
  if (lowered.split(' ').length < 2) return null
  if (/^(built|created|assigned|communicated|tracked|checked)/.test(lowered)) return null
  if (!/^(we|it|the|they|this|that|got|met|cut|reduced|improved|avoided|used|prevented|kept|submitted)/.test(lowered)) {
    return `we ${lowerFirst(cleaned)}`
  }
  return cleaned
}

function buildSituationOptions(example: string, pressureSelections: string[]) {
  const exampleText = cleanInput(example)
  const pressureText = pressureSelections.map((item) => PRESSURE_PHRASES[item]).filter(Boolean)
  if (!exampleText || pressureText.length === 0) return []
  const pressureSummary = joinWithAnd(pressureText.slice(0, 3))
  return uniqueOptions([
    `In one role, we were dealing with ${lowerFirst(exampleText)}, and ${pressureSummary}.`,
    `At one point, ${lowerFirst(exampleText)} became more difficult because ${pressureSummary}.`,
    `One example that stands out was ${lowerFirst(exampleText)}, where ${pressureSummary}.`,
  ]).slice(0, 3)
}

function buildTaskOptions(responsibility: string) {
  const responsibilityText = cleanInput(responsibility)
  if (!responsibilityText) return []
  return uniqueOptions([
    `I was responsible for ${lowerFirst(responsibilityText)}.`,
    `My job there was to ${lowerFirst(responsibilityText)}.`,
    `What I owned in that situation was ${lowerFirst(responsibilityText)}.`,
  ]).slice(0, 3)
}

function buildActionOptions(selections: string[], detail: string) {
  const actionPhrases = selections.map((item) => ACTION_PHRASES[item]).filter(Boolean)
  if (actionPhrases.length === 0) return []
  const detailText = normalizeActionDetail(detail)
  const actionSummary = joinWithAnd(actionPhrases.slice(0, 2))

  if (!detailText) {
    return uniqueOptions([
      `I ${actionSummary} so the work was clearer and easier to manage.`,
      `To keep things on track, I ${actionSummary} and made the next steps easier to follow.`,
      `I moved the work forward by ${actionSummary} so issues surfaced earlier instead of later.`,
      `A key part of my approach was that I ${actionSummary}, which helped stabilize the situation.`,
    ]).slice(0, 4)
  }

  return uniqueOptions([
    `To keep things on track, I ${actionSummary}. A key part of that was ${lowerFirst(detailText)}.`,
    `I ${actionPhrases[0]}${actionPhrases[1] ? ` and ${actionPhrases[1]}` : ''}, and I grounded that by ${lowerFirst(detailText)}.`,
    `A big part of how I moved it forward was ${lowerFirst(detailText)}, alongside ${actionSummary}.`,
    `I created more structure around the situation by ${actionSummary}, especially by ${lowerFirst(detailText)}.`,
  ]).slice(0, 4)
}

function buildResultOptions(selections: string[], detail: string) {
  const resultPhrases = selections.map((item) => RESULT_PHRASES[item]).filter(Boolean)
  if (resultPhrases.length === 0) return []
  const resultSummary = joinWithAnd(resultPhrases.slice(0, 2))
  const detailText = normalizeResultDetail(detail)
  if (!detailText) {
    return uniqueOptions([
      `${upperFirst(resultSummary)}.`,
      `As a result, ${resultSummary}.`,
      `${upperFirst(resultSummary)}, which helped stabilize the work.`,
    ]).slice(0, 3)
  }
  return uniqueOptions([
    `${upperFirst(resultSummary)}, and ${lowerFirst(detailText)}.`,
    `As a result, ${resultSummary}, and ${lowerFirst(detailText)}.`,
    `The end result was that ${resultSummary}, and ${lowerFirst(detailText)}.`,
  ]).slice(0, 3)
}

function buildProofOptions(selections: string[]) {
  return uniqueOptions(selections.slice(0, 3).map((item) => PROOF_PHRASES[item]).filter(Boolean)).slice(0, 3)
}

function ChoiceCard({
  option,
  selected,
  onSelect,
}: {
  option: string
  selected: boolean
  onSelect: () => void
}) {
  return (
    <button
      onClick={onSelect}
      className={`w-full rounded-2xl border px-4 py-4 text-left transition ${
        selected
          ? 'border-violet-400 bg-violet-50 shadow-sm'
          : 'border-slate-200 bg-white hover:border-violet-300 hover:bg-violet-50'
      }`}
    >
      <p className="text-sm leading-7 text-slate-800">{option}</p>
    </button>
  )
}

function ToggleChip({
  label,
  selected,
  onToggle,
}: {
  label: string
  selected: boolean
  onToggle: () => void
}) {
  return (
    <button
      onClick={onToggle}
      className={`rounded-full border px-3 py-2 text-sm font-semibold transition ${
        selected
          ? 'border-violet-400 bg-violet-50 text-violet-700'
          : 'border-slate-200 bg-white text-slate-700 hover:border-violet-300 hover:bg-violet-50'
      }`}
    >
      {label}
    </button>
  )
}

function TextPrompt({
  stepLabel,
  title,
  description,
  placeholder,
  helper,
  value,
  onChange,
  onNext,
  optional = false,
  isLoading = false,
}: {
  stepLabel: string
  title: string
  description: string
  placeholder: string
  helper: string
  value: string
  onChange: (value: string) => void
  onNext: () => void
  optional?: boolean
  isLoading?: boolean
}) {
  return (
    <div className="flex h-full flex-col">
      <p className="text-[11px] font-black uppercase tracking-[0.14em] text-slate-500">{stepLabel}</p>
      <h4 className="mt-2 text-lg font-extrabold text-slate-900">{title}</h4>
      <p className="mt-2 text-sm leading-6 text-slate-500">{description}</p>
      <div className="mt-5 rounded-2xl border border-slate-200 bg-white p-4">
        <textarea
          value={value}
          onChange={(event) => onChange(event.target.value)}
          placeholder={placeholder}
          className="min-h-[116px] w-full resize-none border-0 bg-transparent text-sm leading-7 text-slate-800 outline-none placeholder:text-slate-400"
        />
        <p className="mt-3 text-xs leading-5 text-slate-500">{helper}</p>
      </div>
      <div className="mt-auto flex items-end justify-end border-t border-slate-200/80 pt-5">
        <button
          onClick={onNext}
          disabled={isLoading || (!optional && !cleanInput(value))}
          className="btn-coach-primary flex min-w-[188px] items-center justify-center gap-2 px-6 py-3 disabled:opacity-50"
        >
          {isLoading ? 'Thinking...' : 'Next'}
          <ArrowRight className="h-4 w-4" />
        </button>
      </div>
    </div>
  )
}

function SelectionPrompt({
  stepLabel,
  title,
  description,
  helper,
  options,
  selections,
  onToggle,
  onNext,
  minSelected = 1,
  isLoading = false,
}: {
  stepLabel: string
  title: string
  description: string
  helper?: string
  options: string[]
  selections: string[]
  onToggle: (label: string) => void
  onNext: () => void
  minSelected?: number
  isLoading?: boolean
}) {
  return (
    <div className="flex h-full flex-col">
      <p className="text-[11px] font-black uppercase tracking-[0.14em] text-slate-500">{stepLabel}</p>
      <h4 className="mt-2 text-lg font-extrabold text-slate-900">{title}</h4>
      <p className="mt-2 text-sm leading-6 text-slate-500">{description}</p>
      {helper ? <p className="mt-2 text-xs leading-5 text-slate-500">{helper}</p> : null}
      <div className="mt-5 flex flex-wrap gap-2">
        {options.map((option) => (
          <ToggleChip key={option} label={option} selected={selections.includes(option)} onToggle={() => onToggle(option)} />
        ))}
      </div>
      <div className="mt-auto flex items-end justify-end border-t border-slate-200/80 pt-5">
        <button
          onClick={onNext}
          disabled={isLoading || selections.length < minSelected}
          className="btn-coach-primary flex min-w-[188px] items-center justify-center gap-2 px-6 py-3 disabled:opacity-50"
        >
          {isLoading ? 'Thinking...' : 'Next'}
          <ArrowRight className="h-4 w-4" />
        </button>
      </div>
    </div>
  )
}

export default function StarProofWorkshop({ onComplete }: StarProofWorkshopProps) {
  const [phase, setPhase] = useState<WorkshopPhase>('example')
  const [answers, setAnswers] = useState<WorkshopAnswers>(EMPTY_ANSWERS)
  const [selectedPressure, setSelectedPressure] = useState<string[]>([])
  const [selectedActionTypes, setSelectedActionTypes] = useState<string[]>([])
  const [selectedResultTypes, setSelectedResultTypes] = useState<string[]>([])
  const [selectedProofTypes, setSelectedProofTypes] = useState<string[]>([])
  const [selectedSituation, setSelectedSituation] = useState('')
  const [selectedTask, setSelectedTask] = useState('')
  const [selectedAction, setSelectedAction] = useState('')
  const [selectedResult, setSelectedResult] = useState('')
  const [selectedProof, setSelectedProof] = useState('')
  const [situationOptions, setSituationOptions] = useState<string[]>([])
  const [taskOptions, setTaskOptions] = useState<string[]>([])
  const [actionOptions, setActionOptions] = useState<string[]>([])
  const [resultOptions, setResultOptions] = useState<string[]>([])
  const [proofOptions, setProofOptions] = useState<string[]>([])
  const [followUpQuestion, setFollowUpQuestion] = useState('')
  const [followUpAnswer, setFollowUpAnswer] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')

  const fullAnswer = [selectedSituation, selectedTask, selectedAction, selectedResult, selectedProof].filter(Boolean).join(' ')

  function setAnswer<K extends keyof WorkshopAnswers>(key: K, value: WorkshopAnswers[K]) {
    setAnswers((current) => ({ ...current, [key]: value }))
  }

  function toggleSelection(value: string, selected: string[], setter: (values: string[]) => void) {
    setter(selected.includes(value) ? selected.filter((item) => item !== value) : [...selected, value])
  }

  async function requestStage(stage: AiStage, state: Record<string, unknown>) {
    const response = await fetch('/api/interview/star-workshop', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ stage, state }),
    })

    if (!response.ok) {
      throw new Error('AI step failed')
    }

    return (await response.json()) as AiResponse
  }

  async function generateSituationAndTask(withFollowUpAnswer?: string) {
    setIsLoading(true)
    setError('')
    try {
      const ai = await requestStage('situation_task', {
        example: answers.example,
        pressure_tags: selectedPressure,
        responsibility: answers.responsibility,
        follow_up_answer: withFollowUpAnswer || undefined,
      })

      if (ai.normalized_input?.example) {
        setAnswer('example', ai.normalized_input.example)
      }
      if (ai.normalized_input?.responsibility) {
        setAnswer('responsibility', ai.normalized_input.responsibility)
      }

      if (ai.should_ask_follow_up && ai.follow_up_question && !withFollowUpAnswer) {
        setFollowUpQuestion(ai.follow_up_question)
        setFollowUpAnswer('')
        setPhase('situation_task_follow_up')
        return
      }

      setSituationOptions(
        ai.options?.situation?.length ? ai.options.situation.slice(0, 3) : buildSituationOptions(answers.example, selectedPressure)
      )
      setTaskOptions(
        ai.options?.task?.length ? ai.options.task.slice(0, 3) : buildTaskOptions(answers.responsibility)
      )
      setPhase('situation_choose')
    } catch {
      setError('We hit a small generation issue, so we used a safe fallback.')
      setSituationOptions(buildSituationOptions(answers.example, selectedPressure))
      setTaskOptions(buildTaskOptions(answers.responsibility))
      setPhase('situation_choose')
    } finally {
      setIsLoading(false)
    }
  }

  async function generateAction(withFollowUpAnswer?: string) {
    setIsLoading(true)
    setError('')
    try {
      const ai = await requestStage('action', {
        situation: selectedSituation,
        task: selectedTask,
        action_tags: selectedActionTypes,
        action_detail: answers.actionDetail,
        follow_up_answer: withFollowUpAnswer || undefined,
      })

      if (ai.normalized_input?.action_detail) {
        setAnswer('actionDetail', ai.normalized_input.action_detail)
      }

      if (ai.should_ask_follow_up && ai.follow_up_question && !withFollowUpAnswer) {
        setFollowUpQuestion(ai.follow_up_question)
        setFollowUpAnswer('')
        setPhase('action_follow_up')
        return
      }

      setActionOptions(
        ai.options?.action?.length ? ai.options.action.slice(0, 4) : buildActionOptions(selectedActionTypes, answers.actionDetail)
      )
      setPhase('action_choose')
    } catch {
      setError('We hit a small generation issue, so we used a safe fallback.')
      setActionOptions(buildActionOptions(selectedActionTypes, answers.actionDetail))
      setPhase('action_choose')
    } finally {
      setIsLoading(false)
    }
  }

  async function generateResultAndLanding(withFollowUpAnswer?: string) {
    setIsLoading(true)
    setError('')
    try {
      const ai = await requestStage('result_landing', {
        situation: selectedSituation,
        task: selectedTask,
        action: selectedAction,
        result_tags: selectedResultTypes,
        result_detail: answers.resultDetail,
        proof_tags: selectedProofTypes,
        follow_up_answer: withFollowUpAnswer || undefined,
      })

      if (ai.normalized_input?.result_detail) {
        setAnswer('resultDetail', ai.normalized_input.result_detail)
      }

      if (ai.should_ask_follow_up && ai.follow_up_question && !withFollowUpAnswer) {
        setFollowUpQuestion(ai.follow_up_question)
        setFollowUpAnswer('')
        setPhase('result_landing_follow_up')
        return
      }

      setResultOptions(
        ai.options?.result?.length ? ai.options.result.slice(0, 3) : buildResultOptions(selectedResultTypes, answers.resultDetail)
      )
      setProofOptions(
        ai.options?.landing?.length ? ai.options.landing.slice(0, 3) : buildProofOptions(selectedProofTypes)
      )
      setPhase('result_choose')
    } catch {
      setError('We hit a small generation issue, so we used a safe fallback.')
      setResultOptions(buildResultOptions(selectedResultTypes, answers.resultDetail))
      setProofOptions(buildProofOptions(selectedProofTypes))
      setPhase('result_choose')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="flex h-full flex-col overflow-hidden rounded-[28px] border border-slate-200 bg-white">
      <div className="border-b border-slate-200 bg-[linear-gradient(180deg,#f8f5ff_0%,#fff_100%)] px-5 py-4">
        <p className="text-xs font-black uppercase tracking-[0.14em] text-violet-600">STAR proof workshop</p>
        <h3 className="mt-1 text-xl font-extrabold text-slate-900">Build a stronger STAR with guided coaching</h3>
        {error ? <p className="mt-2 text-xs leading-5 text-amber-700">{error}</p> : null}
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto px-5 py-5">
        {phase === 'example' ? (
          <TextPrompt
            stepLabel="Step 1 of 5"
            title="What specific work situation are you going to use for this answer?"
            description="Pick one real moment where something was difficult, unclear, or at risk."
            placeholder="e.g. shifting customer lead times"
            helper="Examples: a delayed launch, a client escalation, shifting customer lead times, confusion across teams, a deadline that was at risk, a process that kept breaking."
            value={answers.example}
            onChange={(value) => setAnswer('example', value)}
            onNext={() => setPhase('pressure')}
          />
        ) : null}

        {phase === 'pressure' ? (
          <SelectionPrompt
            stepLabel="Step 1 of 5"
            title="What made that situation difficult?"
            description="Select all that apply."
            options={PRESSURE_OPTIONS}
            selections={selectedPressure}
            onToggle={(value) => toggleSelection(value, selectedPressure, setSelectedPressure)}
            onNext={() => setPhase('responsibility')}
            minSelected={2}
          />
        ) : null}

        {phase === 'responsibility' ? (
          <TextPrompt
            stepLabel="Step 2 of 5"
            title="What were you responsible for in that situation?"
            description="Keep it short. Focus on what you needed to fix, own, or deliver."
            placeholder="e.g. get the project back on track"
            helper="Examples: get the project back on track, reduce confusion across teams, keep the client updated, make sure the deadline did not slip, create a clearer handoff process."
            value={answers.responsibility}
            onChange={(value) => setAnswer('responsibility', value)}
            onNext={() => generateSituationAndTask()}
            isLoading={isLoading}
          />
        ) : null}

        {phase === 'situation_task_follow_up' ? (
          <TextPrompt
            stepLabel="Step 2 of 5"
            title={followUpQuestion}
            description="Keep it short. We are sharpening the ownership before we build options."
            placeholder="e.g. make sure our side stayed on schedule"
            helper="This is a quick clarifying step so the next options are more useful."
            value={followUpAnswer}
            onChange={setFollowUpAnswer}
            onNext={() => generateSituationAndTask(followUpAnswer)}
            isLoading={isLoading}
          />
        ) : null}

        {phase === 'situation_choose' ? (
          <div className="flex h-full flex-col">
            <p className="text-[11px] font-black uppercase tracking-[0.14em] text-slate-500">Step 1 of 5</p>
            <h4 className="mt-2 text-lg font-extrabold text-slate-900">Choose your Situation</h4>
            <p className="mt-2 text-sm leading-6 text-slate-500">Pick the version that gives enough context without turning into a long setup.</p>
            <div className="mt-5 space-y-3">
              {situationOptions.map((option) => (
                <ChoiceCard key={option} option={option} selected={selectedSituation === option} onSelect={() => setSelectedSituation(option)} />
              ))}
            </div>
            <div className="mt-auto flex items-end justify-end border-t border-slate-200/80 pt-5">
              <button
                onClick={() => setPhase('task_choose')}
                disabled={!selectedSituation}
                className="btn-coach-primary flex min-w-[188px] items-center justify-center gap-2 px-6 py-3 disabled:opacity-50"
              >
                Next
                <ArrowRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        ) : null}

        {phase === 'task_choose' ? (
          <div className="flex h-full flex-col">
            <p className="text-[11px] font-black uppercase tracking-[0.14em] text-slate-500">Step 2 of 5</p>
            <h4 className="mt-2 text-lg font-extrabold text-slate-900">Choose your Task</h4>
            <p className="mt-2 text-sm leading-6 text-slate-500">Pick the version that makes your ownership easiest to understand.</p>
            <div className="mt-5 space-y-3">
              {taskOptions.map((option) => (
                <ChoiceCard key={option} option={option} selected={selectedTask === option} onSelect={() => setSelectedTask(option)} />
              ))}
            </div>
            <div className="mt-auto flex items-end justify-end border-t border-slate-200/80 pt-5">
              <button
                onClick={() => setPhase('setup_preview')}
                disabled={!selectedTask}
                className="btn-coach-primary flex min-w-[188px] items-center justify-center gap-2 px-6 py-3 disabled:opacity-50"
              >
                Preview setup
                <ArrowRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        ) : null}

        {phase === 'setup_preview' ? (
          <div className="flex h-full flex-col">
            <p className="text-[11px] font-black uppercase tracking-[0.14em] text-slate-500">Step 2 of 5</p>
            <h4 className="mt-2 text-lg font-extrabold text-slate-900">Here is your setup so far</h4>
            <p className="mt-2 text-sm leading-6 text-slate-500">This gives enough context. Now we put most of the weight into Action.</p>
            <div className="mt-5 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-4">
              <p className="text-xs font-black uppercase tracking-[0.14em] text-emerald-700">Your Situation and Task</p>
              <p className="mt-3 text-sm leading-7 text-slate-800">{[selectedSituation, selectedTask].join(' ')}</p>
            </div>
            <div className="mt-auto flex items-end justify-end border-t border-slate-200/80 pt-5">
              <button onClick={() => setPhase('action_types')} className="btn-coach-primary flex min-w-[188px] items-center justify-center gap-2 px-6 py-3">
                Build Action
                <ArrowRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        ) : null}

        {phase === 'action_types' ? (
          <SelectionPrompt
            stepLabel="Step 3 of 5"
            title="What kinds of moves did you make?"
            description="Select all that apply."
            helper="Pick the actions that best reflect what you actually did, not just the outcome."
            options={ACTION_OPTIONS}
            selections={selectedActionTypes}
            onToggle={(value) => toggleSelection(value, selectedActionTypes, setSelectedActionTypes)}
            onNext={() => setPhase('action_detail')}
            minSelected={2}
          />
        ) : null}

        {phase === 'action_detail' ? (
          <TextPrompt
            stepLabel="Step 3 of 5"
            title="What is one specific thing you actually did?"
            description="Use a short action phrase, like a resume bullet."
            placeholder="e.g. built one tracker for open requests"
            helper="Examples: built one tracker for open requests, reassigned open items to clear owners, set short check-ins for blockers, created a new handoff checklist, flagged risks before the deadline."
            value={answers.actionDetail}
            onChange={(value) => setAnswer('actionDetail', value)}
            onNext={() => generateAction()}
            isLoading={isLoading}
          />
        ) : null}

        {phase === 'action_follow_up' ? (
          <TextPrompt
            stepLabel="Step 3 of 5"
            title={followUpQuestion}
            description="Keep it short. We are just tightening the proof."
            placeholder="e.g. set short check-ins for blockers"
            helper="This helps turn a vague action into something the interviewer can picture."
            value={followUpAnswer}
            onChange={setFollowUpAnswer}
            onNext={() => generateAction(followUpAnswer)}
            isLoading={isLoading}
          />
        ) : null}

        {phase === 'action_choose' ? (
          <div className="flex h-full flex-col">
            <p className="text-[11px] font-black uppercase tracking-[0.14em] text-slate-500">Step 3 of 5</p>
            <h4 className="mt-2 text-lg font-extrabold text-slate-900">Choose your Action</h4>
            <p className="mt-2 text-sm leading-6 text-slate-500">Pick the version that sounds strongest and most believable out loud.</p>
            <div className="mt-5 space-y-3">
              {actionOptions.map((option) => (
                <ChoiceCard key={option} option={option} selected={selectedAction === option} onSelect={() => setSelectedAction(option)} />
              ))}
            </div>
            <div className="mt-auto flex items-end justify-end border-t border-slate-200/80 pt-5">
              <button
                onClick={() => setPhase('action_preview')}
                disabled={!selectedAction}
                className="btn-coach-primary flex min-w-[188px] items-center justify-center gap-2 px-6 py-3 disabled:opacity-50"
              >
                Preview Action
                <ArrowRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        ) : null}

        {phase === 'action_preview' ? (
          <div className="flex h-full flex-col">
            <p className="text-[11px] font-black uppercase tracking-[0.14em] text-slate-500">Step 3 of 5</p>
            <h4 className="mt-2 text-lg font-extrabold text-slate-900">Here is where the proof starts to land</h4>
            <p className="mt-2 text-sm leading-6 text-slate-500">Action usually carries the most weight in a strong STAR answer.</p>
            <div className="mt-5 rounded-2xl border border-violet-200 bg-violet-50 px-4 py-4">
              <p className="text-xs font-black uppercase tracking-[0.14em] text-violet-700">Your Action</p>
              <p className="mt-3 text-sm leading-7 text-slate-800">{selectedAction}</p>
            </div>
            <div className="mt-auto flex items-end justify-end border-t border-slate-200/80 pt-5">
              <button onClick={() => setPhase('result_types')} className="btn-coach-primary flex min-w-[188px] items-center justify-center gap-2 px-6 py-3">
                Build Result
                <ArrowRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        ) : null}

        {phase === 'result_types' ? (
          <SelectionPrompt
            stepLabel="Step 4 of 5"
            title="What happened in the end?"
            description="Select all that apply."
            helper="Pick the clearest outcomes from the situation."
            options={RESULT_OPTIONS}
            selections={selectedResultTypes}
            onToggle={(value) => toggleSelection(value, selectedResultTypes, setSelectedResultTypes)}
            onNext={() => setPhase('result_detail')}
          />
        ) : null}

        {phase === 'result_detail' ? (
          <TextPrompt
            stepLabel="Step 4 of 5"
            title="What was the clearest visible outcome?"
            description="Optional, but strong if you have one. Use a short outcome phrase."
            placeholder="e.g. got the order out on time"
            helper="Examples: got the order out on time, used again on future projects, cut response time by 20%, kept the launch on schedule, reduced missed handoffs."
            value={answers.resultDetail}
            onChange={(value) => setAnswer('resultDetail', value)}
            onNext={() => setPhase('proof_types')}
            optional
          />
        ) : null}

        {phase === 'proof_types' ? (
          <SelectionPrompt
            stepLabel="Step 5 of 5"
            title="What does this example best prove about you?"
            description="Select all that apply."
            helper="Pick the qualities this example actually proves, not just what sounds good."
            options={PROOF_OPTIONS}
            selections={selectedProofTypes}
            onToggle={(value) => toggleSelection(value, selectedProofTypes, setSelectedProofTypes)}
            onNext={() => generateResultAndLanding()}
            isLoading={isLoading}
          />
        ) : null}

        {phase === 'result_landing_follow_up' ? (
          <TextPrompt
            stepLabel="Step 5 of 5"
            title={followUpQuestion}
            description="Keep it short. We are just tightening the outcome so the payoff is clearer."
            placeholder="e.g. we finished the launch on schedule"
            helper="This is optional in spirit, but it helps if the result is still too broad."
            value={followUpAnswer}
            onChange={setFollowUpAnswer}
            onNext={() => generateResultAndLanding(followUpAnswer)}
            isLoading={isLoading}
          />
        ) : null}

        {phase === 'result_choose' ? (
          <div className="flex h-full flex-col">
            <p className="text-[11px] font-black uppercase tracking-[0.14em] text-slate-500">Step 4 of 5</p>
            <h4 className="mt-2 text-lg font-extrabold text-slate-900">Choose your Result</h4>
            <p className="mt-2 text-sm leading-6 text-slate-500">Pick the ending that makes the value easiest to hear.</p>
            <div className="mt-5 space-y-3">
              {resultOptions.map((option) => (
                <ChoiceCard key={option} option={option} selected={selectedResult === option} onSelect={() => setSelectedResult(option)} />
              ))}
            </div>
            <div className="mt-auto flex items-end justify-end border-t border-slate-200/80 pt-5">
              <button
                onClick={() => setPhase('result_preview')}
                disabled={!selectedResult}
                className="btn-coach-primary flex min-w-[188px] items-center justify-center gap-2 px-6 py-3 disabled:opacity-50"
              >
                Preview Result
                <ArrowRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        ) : null}

        {phase === 'result_preview' ? (
          <div className="flex h-full flex-col">
            <p className="text-[11px] font-black uppercase tracking-[0.14em] text-slate-500">Step 4 of 5</p>
            <h4 className="mt-2 text-lg font-extrabold text-slate-900">Now the value is visible</h4>
            <p className="mt-2 text-sm leading-6 text-slate-500">This is where the answer stops sounding tidy and starts sounding believable.</p>
            <div className="mt-5 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-4">
              <p className="text-xs font-black uppercase tracking-[0.14em] text-rose-700">Your Result</p>
              <p className="mt-3 text-sm leading-7 text-slate-800">{selectedResult}</p>
            </div>
            <div className="mt-auto flex items-end justify-end border-t border-slate-200/80 pt-5">
              <button onClick={() => setPhase('proof_choose')} className="btn-coach-primary flex min-w-[188px] items-center justify-center gap-2 px-6 py-3">
                Next
                <ArrowRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        ) : null}

        {phase === 'proof_choose' ? (
          <div className="flex h-full flex-col">
            <p className="text-[11px] font-black uppercase tracking-[0.14em] text-slate-500">Step 5 of 5</p>
            <h4 className="mt-2 text-lg font-extrabold text-slate-900">Choose your landing line</h4>
            <p className="mt-2 text-sm leading-6 text-slate-500">Pick the short payoff line that best explains what the story proves.</p>
            <div className="mt-5 space-y-3">
              {proofOptions.map((option) => (
                <ChoiceCard key={option} option={option} selected={selectedProof === option} onSelect={() => setSelectedProof(option)} />
              ))}
            </div>
            <div className="mt-auto flex items-end justify-end border-t border-slate-200/80 pt-5">
              <button
                onClick={() => setPhase('practice')}
                disabled={!selectedProof}
                className="btn-coach-primary flex min-w-[188px] items-center justify-center gap-2 px-6 py-3 disabled:opacity-50"
              >
                Assemble full answer
                <ArrowRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        ) : null}

        {phase === 'practice' ? (
          <div className="flex h-full flex-col">
            <p className="text-[11px] font-black uppercase tracking-[0.14em] text-slate-500">Step 5 of 5</p>
            <h4 className="mt-2 text-lg font-extrabold text-slate-900">Here is your full STAR answer</h4>
            <p className="mt-2 text-sm leading-6 text-slate-500">Say it out loud a few times. Then try it again without staring at every word.</p>
            <div className="mt-5 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4">
              <p className="text-sm leading-7 text-slate-800">{fullAnswer}</p>
            </div>
            <div className="mt-5 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-4">
              <p className="text-xs font-black uppercase tracking-[0.14em] text-emerald-700">Final reminder</p>
              <div className="mt-3 space-y-3">
                {[
                  'Keep Situation and Task tight.',
                  'Let Action do most of the proving.',
                  'Use Result to make the value visible.',
                  'Do not memorize this word for word. Keep the logic and paraphrase naturally.',
                ].map((item) => (
                  <div key={item} className="flex items-start gap-3">
                    <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" />
                    <p className="text-sm leading-6 text-emerald-900">{item}</p>
                  </div>
                ))}
              </div>
            </div>
            <div className="mt-auto flex items-end justify-end border-t border-slate-200/80 pt-5">
              <button onClick={onComplete} className="btn-coach-primary flex min-w-[188px] items-center justify-center gap-2 px-6 py-3">
                Finish workshop
                <ArrowRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        ) : null}
      </div>
    </div>
  )
}
