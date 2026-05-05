'use client'

import { useMemo, useState } from 'react'
import { ArrowRight, CheckCircle2 } from 'lucide-react'

type WorkshopPhase =
  | 'example'
  | 'pressure'
  | 'situation_choose'
  | 'responsibility'
  | 'task_choose'
  | 'setup_preview'
  | 'action_types'
  | 'action_detail'
  | 'action_choose'
  | 'action_preview'
  | 'result_types'
  | 'result_detail'
  | 'result_choose'
  | 'result_preview'
  | 'proof_types'
  | 'proof_choose'
  | 'practice'

interface StarProofWorkshopProps {
  onComplete: () => void
}

interface WorkshopAnswers {
  example: string
  responsibility: string
  actionDetail: string
  resultDetail: string
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
  return Array.from(new Set(options.map((option) => ensurePeriod(option)))).filter(Boolean).slice(0, 4)
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
  if (
    lowered.startsWith('got ') ||
    lowered.startsWith('met ') ||
    lowered.startsWith('made it ') ||
    lowered.startsWith('result ') ||
    lowered.startsWith('outcome ')
  ) {
    return null
  }
  if (
    lowered.startsWith('a ') ||
    lowered.startsWith('an ') ||
    lowered.startsWith('the ') ||
    lowered.startsWith('one ') ||
    lowered.startsWith('my ')
  ) {
    return cleaned
  }
  return cleaned
}

function normalizeResultDetail(value: string) {
  const cleaned = cleanInput(value)
  if (!cleaned) return null
  const lowered = cleaned.toLowerCase()
  if (lowered.split(' ').length < 2) return null
  if (
    lowered.startsWith('built ') ||
    lowered.startsWith('created ') ||
    lowered.startsWith('assigned ') ||
    lowered.startsWith('communicated ') ||
    lowered.startsWith('tracked ') ||
    lowered.startsWith('checked ')
  ) {
    return null
  }
  if (!/^(we|it|the|they|this|that|got|met|cut|reduced|improved|avoided|used|prevented|kept|submitted)/.test(lowered)) {
    return `we ${lowerFirst(cleaned)}`
  }
  return cleaned
}

function formatActionDetailForSentence(value: string | null) {
  if (!value) return null
  const lowered = value.toLowerCase()
  if (
    lowered.startsWith('a ') ||
    lowered.startsWith('an ') ||
    lowered.startsWith('the ') ||
    lowered.startsWith('one ') ||
    lowered.startsWith('my ')
  ) {
    return value
  }
  return `one ${value}`
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
    `I was in a situation involving ${lowerFirst(exampleText)}, and the main issue was that ${pressureSummary}.`,
  ])
}

function buildTaskOptions(responsibility: string) {
  const responsibilityText = cleanInput(responsibility)
  if (!responsibilityText) return []

  return uniqueOptions([
    `I was responsible for ${lowerFirst(responsibilityText)}.`,
    `My job there was to ${lowerFirst(responsibilityText)}.`,
    `What I owned in that situation was ${lowerFirst(responsibilityText)}.`,
    `I needed to ${lowerFirst(responsibilityText)}.`,
  ])
}

function buildActionOptions(selections: string[], detail: string) {
  const actionPhrases = selections.map((item) => ACTION_PHRASES[item]).filter(Boolean)
  const normalizedDetail = normalizeActionDetail(detail)
  const detailText = formatActionDetailForSentence(normalizedDetail)
  if (actionPhrases.length === 0) return []

  const actionSummary = joinWithAnd(actionPhrases.slice(0, 2))
  const leadAction = actionPhrases[0]
  const supportAction = actionPhrases[1]

  if (!detailText) {
    return uniqueOptions([
      `I ${actionSummary} so the work was clearer and easier to manage.`,
      `To keep things on track, I ${actionSummary} and made the next steps easier to follow.`,
      `A key part of my approach was that I ${actionSummary}, which helped stabilize the situation.`,
      `I moved the work forward by ${actionSummary} so issues surfaced earlier instead of later.`,
    ])
  }

  return uniqueOptions([
    `To keep things on track, I ${actionSummary}. A key part of that was ${lowerFirst(normalizedDetail!)}.`,
    `I ${leadAction}${supportAction ? ` and ${supportAction}` : ''}, and I grounded that by ${lowerFirst(normalizedDetail!)}.`,
    `A big part of how I moved it forward was ${lowerFirst(normalizedDetail!)}, alongside ${actionSummary}.`,
    `I created more structure around the situation by ${actionSummary}, especially by ${lowerFirst(normalizedDetail!)}.`,
  ])
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
      `The end result was that ${resultSummary}.`,
    ])
  }

  return uniqueOptions([
    `${upperFirst(resultSummary)}, and ${lowerFirst(detailText)}.`,
    `As a result, ${resultSummary}, and ${lowerFirst(detailText)}.`,
    `${upperFirst(resultSummary)}. It also meant ${lowerFirst(detailText)}.`,
    `The end result was that ${resultSummary}, and ${lowerFirst(detailText)}.`,
  ])
}

function buildProofOptions(selections: string[]) {
  const options = selections.slice(0, 4).map((item) => PROOF_PHRASES[item]).filter(Boolean)
  return uniqueOptions(options)
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
          disabled={!optional && !cleanInput(value)}
          className="btn-coach-primary flex min-w-[188px] items-center justify-center gap-2 px-6 py-3 disabled:opacity-50"
        >
          Next
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
  options,
  selections,
  onToggle,
  onNext,
  minSelected = 1,
}: {
  stepLabel: string
  title: string
  description: string
  options: string[]
  selections: string[]
  onToggle: (label: string) => void
  onNext: () => void
  minSelected?: number
}) {
  return (
    <div className="flex h-full flex-col">
      <p className="text-[11px] font-black uppercase tracking-[0.14em] text-slate-500">{stepLabel}</p>
      <h4 className="mt-2 text-lg font-extrabold text-slate-900">{title}</h4>
      <p className="mt-2 text-sm leading-6 text-slate-500">{description}</p>
      <div className="mt-5 flex flex-wrap gap-2">
        {options.map((option) => (
          <ToggleChip
            key={option}
            label={option}
            selected={selections.includes(option)}
            onToggle={() => onToggle(option)}
          />
        ))}
      </div>
      <div className="mt-auto flex items-end justify-end border-t border-slate-200/80 pt-5">
        <button
          onClick={onNext}
          disabled={selections.length < minSelected}
          className="btn-coach-primary flex min-w-[188px] items-center justify-center gap-2 px-6 py-3 disabled:opacity-50"
        >
          Next
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

  const situationOptions = useMemo(
    () => buildSituationOptions(answers.example, selectedPressure),
    [answers.example, selectedPressure]
  )
  const taskOptions = useMemo(() => buildTaskOptions(answers.responsibility), [answers.responsibility])
  const actionOptions = useMemo(
    () => buildActionOptions(selectedActionTypes, answers.actionDetail),
    [answers.actionDetail, selectedActionTypes]
  )
  const resultOptions = useMemo(
    () => buildResultOptions(selectedResultTypes, answers.resultDetail),
    [answers.resultDetail, selectedResultTypes]
  )
  const proofOptions = useMemo(() => buildProofOptions(selectedProofTypes), [selectedProofTypes])

  const fullAnswer = [selectedSituation, selectedTask, selectedAction, selectedResult, selectedProof]
    .filter(Boolean)
    .join(' ')

  function setAnswer<K extends keyof WorkshopAnswers>(key: K, value: WorkshopAnswers[K]) {
    setAnswers((current) => ({ ...current, [key]: value }))
  }

  function toggleSelection(value: string, selected: string[], setter: (values: string[]) => void) {
    setter(selected.includes(value) ? selected.filter((item) => item !== value) : [...selected, value])
  }

  return (
    <div className="flex h-full flex-col overflow-hidden rounded-[28px] border border-slate-200 bg-white">
      <div className="border-b border-slate-200 bg-[linear-gradient(180deg,#f8f5ff_0%,#fff_100%)] px-5 py-4">
        <p className="text-xs font-black uppercase tracking-[0.14em] text-violet-600">STAR proof workshop</p>
        <h3 className="mt-1 text-xl font-extrabold text-slate-900">Build a stronger STAR with less typing</h3>
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
            onChange={(value) => {
              setSelectedSituation('')
              setAnswer('example', value)
            }}
            onNext={() => setPhase('pressure')}
          />
        ) : null}

        {phase === 'pressure' ? (
          <SelectionPrompt
            stepLabel="Step 1 of 5"
            title="What made this situation difficult?"
            description="Select all that apply."
            options={PRESSURE_OPTIONS}
            selections={selectedPressure}
            onToggle={(value) => {
              setSelectedSituation('')
              toggleSelection(value, selectedPressure, setSelectedPressure)
            }}
            onNext={() => setPhase('situation_choose')}
            minSelected={2}
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
                onClick={() => setPhase('responsibility')}
                disabled={!selectedSituation}
                className="btn-coach-primary flex min-w-[188px] items-center justify-center gap-2 px-6 py-3 disabled:opacity-50"
              >
                Next
                <ArrowRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        ) : null}

        {phase === 'responsibility' ? (
          <TextPrompt
            stepLabel="Step 2 of 5"
            title="What were you responsible for in that situation?"
            description="Keep it short. Focus on what you needed to fix, own, or deliver."
            placeholder="e.g. get the project back on track"
            helper="Examples: get the project back on track, reduce confusion across teams, keep the client updated, make sure the deadline did not slip, create a clearer handoff process."
            value={answers.responsibility}
            onChange={(value) => {
              setSelectedTask('')
              setAnswer('responsibility', value)
            }}
            onNext={() => setPhase('task_choose')}
          />
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
            <p className="mt-2 text-sm leading-6 text-slate-500">This gives the interviewer enough context. Now we put the real weight into Action.</p>
            <div className="mt-5 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-4">
              <p className="text-xs font-black uppercase tracking-[0.14em] text-emerald-700">Your Situation and Task</p>
              <p className="mt-3 text-sm leading-7 text-slate-800">{[selectedSituation, selectedTask].join(' ')}</p>
            </div>
            <div className="mt-auto flex items-end justify-end border-t border-slate-200/80 pt-5">
              <button
                onClick={() => setPhase('action_types')}
                className="btn-coach-primary flex min-w-[188px] items-center justify-center gap-2 px-6 py-3"
              >
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
            options={ACTION_OPTIONS}
            selections={selectedActionTypes}
            onToggle={(value) => {
              setSelectedAction('')
              toggleSelection(value, selectedActionTypes, setSelectedActionTypes)
            }}
            onNext={() => setPhase('action_detail')}
            minSelected={2}
          />
        ) : null}

        {phase === 'action_detail' ? (
          <TextPrompt
            stepLabel="Step 3 of 5"
            title="What is one specific action you took?"
            description="Use a short action phrase, like a resume bullet."
            placeholder="e.g. built one tracker for open requests"
            helper="This should sound like something you did, not just a fragment or outcome."
            value={answers.actionDetail}
            onChange={(value) => {
              setSelectedAction('')
              setAnswer('actionDetail', value)
            }}
            onNext={() => setPhase('action_choose')}
          />
        ) : null}

        {phase === 'action_choose' ? (
          <div className="flex h-full flex-col">
            <p className="text-[11px] font-black uppercase tracking-[0.14em] text-slate-500">Step 3 of 5</p>
            <h4 className="mt-2 text-lg font-extrabold text-slate-900">Choose your Action</h4>
            <p className="mt-2 text-sm leading-6 text-slate-500">Pick the version that sounds strongest and most natural out loud.</p>
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
            <p className="mt-2 text-sm leading-6 text-slate-500">Action is usually the most important part of a strong STAR answer.</p>
            <div className="mt-5 rounded-2xl border border-violet-200 bg-violet-50 px-4 py-4">
              <p className="text-xs font-black uppercase tracking-[0.14em] text-violet-700">Your Action</p>
              <p className="mt-3 text-sm leading-7 text-slate-800">{selectedAction}</p>
            </div>
            <div className="mt-auto flex items-end justify-end border-t border-slate-200/80 pt-5">
              <button
                onClick={() => setPhase('result_types')}
                className="btn-coach-primary flex min-w-[188px] items-center justify-center gap-2 px-6 py-3"
              >
                Build Result
                <ArrowRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        ) : null}

        {phase === 'result_types' ? (
          <SelectionPrompt
            stepLabel="Step 4 of 5"
            title="What happened as a result?"
            description="Select all that apply."
            options={RESULT_OPTIONS}
            selections={selectedResultTypes}
            onToggle={(value) => {
              setSelectedResult('')
              toggleSelection(value, selectedResultTypes, setSelectedResultTypes)
            }}
            onNext={() => setPhase('result_detail')}
            minSelected={1}
          />
        ) : null}

        {phase === 'result_detail' ? (
          <TextPrompt
            stepLabel="Step 4 of 5"
            title="What was the clearest visible outcome?"
            description="Optional, but strong if you have one."
            placeholder="e.g. got the order out on time"
            helper="Use a short outcome phrase. If it does not fit cleanly, we will leave it out."
            value={answers.resultDetail}
            onChange={(value) => {
              setSelectedResult('')
              setAnswer('resultDetail', value)
            }}
            onNext={() => setPhase('result_choose')}
            optional
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
              <button
                onClick={() => setPhase('proof_types')}
                className="btn-coach-primary flex min-w-[188px] items-center justify-center gap-2 px-6 py-3"
              >
                Add the payoff
                <ArrowRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        ) : null}

        {phase === 'proof_types' ? (
          <SelectionPrompt
            stepLabel="Step 5 of 5"
            title="What does this example best prove about you?"
            description="Select all that apply."
            options={PROOF_OPTIONS}
            selections={selectedProofTypes}
            onToggle={(value) => {
              setSelectedProof('')
              toggleSelection(value, selectedProofTypes, setSelectedProofTypes)
            }}
            onNext={() => setPhase('proof_choose')}
            minSelected={1}
          />
        ) : null}

        {phase === 'proof_choose' ? (
          <div className="flex h-full flex-col">
            <p className="text-[11px] font-black uppercase tracking-[0.14em] text-slate-500">Step 5 of 5</p>
            <h4 className="mt-2 text-lg font-extrabold text-slate-900">Choose your landing line</h4>
            <p className="mt-2 text-sm leading-6 text-slate-500">Pick the short payoff line that lands what the story proves.</p>
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
