'use client'

import { useMemo, useState } from 'react'
import { ArrowRight, CheckCircle2 } from 'lucide-react'

type WorkshopPhase =
  | 'situation_context'
  | 'situation_problem'
  | 'situation_choose'
  | 'task'
  | 'task_choose'
  | 'task_preview'
  | 'action_main'
  | 'action_detail'
  | 'action_choose'
  | 'action_preview'
  | 'result_outcome'
  | 'result_evidence'
  | 'result_choose'
  | 'result_preview'
  | 'practice'

interface WorkshopAnswers {
  situationContext: string
  situationProblem: string
  taskOwnership: string
  actionMain: string
  actionDetail: string
  resultOutcome: string
  resultEvidence: string
}

interface StarProofWorkshopProps {
  onComplete: () => void
}

const EMPTY_ANSWERS: WorkshopAnswers = {
  situationContext: '',
  situationProblem: '',
  taskOwnership: '',
  actionMain: '',
  actionDetail: '',
  resultOutcome: '',
  resultEvidence: '',
}

function cleanInput(value: string) {
  return value.trim().replace(/\s+/g, ' ').replace(/[.]+$/g, '')
}

function lowerFirst(value: string) {
  if (!value) return value
  return value.charAt(0).toLowerCase() + value.slice(1)
}

function ensurePeriod(value: string) {
  const trimmed = value.trim()
  if (!trimmed) return ''
  return /[.!?]$/.test(trimmed) ? trimmed : `${trimmed}.`
}

function withOnePrefix(value: string) {
  const trimmed = cleanInput(value)
  if (!trimmed) return ''
  const lowered = trimmed.toLowerCase()
  if (
    lowered.startsWith('a ') ||
    lowered.startsWith('an ') ||
    lowered.startsWith('the ') ||
    lowered.startsWith('this ') ||
    lowered.startsWith('that ') ||
    lowered.startsWith('our ') ||
    lowered.startsWith('my ')
  ) {
    return trimmed
  }
  return `one ${trimmed}`
}

function joinWithAnd(items: string[]) {
  const cleaned = items.map(cleanInput).filter(Boolean)
  if (cleaned.length === 0) return ''
  if (cleaned.length === 1) return cleaned[0]
  if (cleaned.length === 2) return `${cleaned[0]} and ${cleaned[1]}`
  return `${cleaned.slice(0, -1).join(', ')}, and ${cleaned[cleaned.length - 1]}`
}

function splitCommaList(value: string) {
  return value
    .split(',')
    .map(cleanInput)
    .filter(Boolean)
}

function buildSituationOptions(answers: WorkshopAnswers) {
  const context = cleanInput(answers.situationContext)
  const problem = cleanInput(answers.situationProblem)
  if (!context || !problem) return []

  const options = [
    `In ${lowerFirst(context)}, ${lowerFirst(problem)}.`,
    `${context} was the setting, and ${lowerFirst(problem)}.`,
    `I was in ${lowerFirst(context)} when ${lowerFirst(problem)}.`,
    `One example that stands out was ${lowerFirst(context)}, where ${lowerFirst(problem)}.`,
  ]

  return uniqueOptions(options)
}

function buildTaskOptions(answers: WorkshopAnswers) {
  const task = cleanInput(answers.taskOwnership)
  if (!task) return []

  const options = [
    `My job was to ${lowerFirst(task)}.`,
    `I was responsible for ${lowerFirst(task)}.`,
    `What I owned there was ${lowerFirst(task)}.`,
    `I needed to ${lowerFirst(task)}.`,
  ]

  return uniqueOptions(options)
}

function buildActionOptions(answers: WorkshopAnswers) {
  const actionItems = splitCommaList(answers.actionMain)
  const detailItems = splitCommaList(answers.actionDetail)
  if (actionItems.length === 0 || detailItems.length === 0) return []

  const actionText = joinWithAnd(actionItems)
  const detailText = joinWithAnd(detailItems.map(withOnePrefix))

  const options = [
    `I ${actionText}, using ${detailText} so the work stayed visible and blockers surfaced early.`,
    `To move it forward, I ${actionText}, and I used ${detailText} to keep owners aligned and next steps clear.`,
    `The biggest thing I did was ${actionText}. I supported that with ${detailText}, which made the process much easier to manage.`,
    `I ${actionText}, then backed that up with ${detailText} so the team could work from one clear process instead of scattered updates.`,
  ]

  return uniqueOptions(options)
}

function buildResultOptions(answers: WorkshopAnswers) {
  const outcome = cleanInput(answers.resultOutcome)
  const evidence = cleanInput(answers.resultEvidence)
  if (!outcome || !evidence) return []

  const options = [
    `${outcome}, and ${lowerFirst(evidence)}.`,
    `${outcome}. It also meant ${lowerFirst(evidence)}.`,
    `Because of that, ${lowerFirst(outcome)}, and ${lowerFirst(evidence)}.`,
    `The result was that ${lowerFirst(outcome)}, with ${lowerFirst(evidence)}.`,
  ]

  return uniqueOptions(options)
}

function uniqueOptions(options: string[]) {
  return Array.from(new Set(options.map((option) => ensurePeriod(option)))).slice(0, 4)
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

function TextStep({
  stepLabel,
  title,
  description,
  placeholder,
  helper,
  value,
  onChange,
  onNext,
}: {
  stepLabel: string
  title: string
  description: string
  placeholder: string
  helper: string
  value: string
  onChange: (value: string) => void
  onNext: () => void
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
          className="min-h-[132px] w-full resize-none border-0 bg-transparent text-sm leading-7 text-slate-800 outline-none placeholder:text-slate-400"
        />
        <p className="mt-3 text-xs leading-5 text-slate-500">{helper}</p>
      </div>
      <div className="mt-auto flex items-end justify-end border-t border-slate-200/80 pt-5">
        <button
          onClick={onNext}
          disabled={!cleanInput(value)}
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
  const [phase, setPhase] = useState<WorkshopPhase>('situation_context')
  const [answers, setAnswers] = useState<WorkshopAnswers>(EMPTY_ANSWERS)
  const [selectedSituation, setSelectedSituation] = useState('')
  const [selectedTask, setSelectedTask] = useState('')
  const [selectedAction, setSelectedAction] = useState('')
  const [selectedResult, setSelectedResult] = useState('')

  const situationOptions = useMemo(() => buildSituationOptions(answers), [answers])
  const taskOptions = useMemo(() => buildTaskOptions(answers), [answers])
  const actionOptions = useMemo(() => buildActionOptions(answers), [answers])
  const resultOptions = useMemo(() => buildResultOptions(answers), [answers])

  const fullAnswer = [selectedSituation, selectedTask, selectedAction, selectedResult]
    .filter(Boolean)
    .join(' ')

  const setAnswer = (key: keyof WorkshopAnswers, value: string) => {
    setAnswers((current) => ({ ...current, [key]: value }))
  }

  return (
    <div className="flex h-full flex-col overflow-hidden rounded-[28px] border border-slate-200 bg-white">
      <div className="border-b border-slate-200 bg-[linear-gradient(180deg,#f8f5ff_0%,#fff_100%)] px-5 py-4">
        <p className="text-xs font-black uppercase tracking-[0.14em] text-violet-600">STAR proof workshop</p>
        <h3 className="mt-1 text-xl font-extrabold text-slate-900">Build a STAR answer that actually proves something</h3>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto px-5 py-5">
        {phase === 'situation_context' ? (
          <TextStep
            stepLabel="Step 1 of 5"
            title="Start with the moment"
            description="Give the raw setup. Name the project, launch, deadline, client issue, or team situation. Keep it rough."
            placeholder="Example: a launch week with lots of last-minute scheduling changes across teams"
            helper="Do not polish this. We just need enough context to make the story real."
            value={answers.situationContext}
            onChange={(value) => setAnswer('situationContext', value)}
            onNext={() => setPhase('situation_problem')}
          />
        ) : null}

        {phase === 'situation_problem' ? (
          <TextStep
            stepLabel="Step 1 of 5"
            title="What made it difficult?"
            description="Now add the pressure or problem inside that situation."
            placeholder="Example: requests were being tracked in different places and handoffs were starting to slip"
            helper="This is what turns the setup into a real interview example."
            value={answers.situationProblem}
            onChange={(value) => {
              setSelectedSituation('')
              setAnswer('situationProblem', value)
            }}
            onNext={() => setPhase('situation_choose')}
          />
        ) : null}

        {phase === 'situation_choose' ? (
          <div className="flex h-full flex-col">
            <p className="text-[11px] font-black uppercase tracking-[0.14em] text-slate-500">Step 1 of 5</p>
            <h4 className="mt-2 text-lg font-extrabold text-slate-900">Choose your Situation</h4>
            <p className="mt-2 text-sm leading-6 text-slate-500">Pick the version that gives enough context without eating the whole answer.</p>
            <div className="mt-5 space-y-3">
              {situationOptions.map((option) => (
                <ChoiceCard key={option} option={option} selected={selectedSituation === option} onSelect={() => setSelectedSituation(option)} />
              ))}
            </div>
            <div className="mt-auto flex items-end justify-end border-t border-slate-200/80 pt-5">
              <button
                onClick={() => setPhase('task')}
                disabled={!selectedSituation}
                className="btn-coach-primary flex min-w-[188px] items-center justify-center gap-2 px-6 py-3 disabled:opacity-50"
              >
                Next
                <ArrowRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        ) : null}

        {phase === 'task' ? (
          <TextStep
            stepLabel="Step 2 of 5"
            title="What did you own?"
            description="State your responsibility in simple terms."
            placeholder="Example: keep the requests organized and make sure urgent changes moved first"
            helper="This is where we make ownership clear before we get into Action."
            value={answers.taskOwnership}
            onChange={(value) => {
              setSelectedTask('')
              setAnswer('taskOwnership', value)
            }}
            onNext={() => setPhase('task_choose')}
          />
        ) : null}

        {phase === 'task_choose' ? (
          <div className="flex h-full flex-col">
            <p className="text-[11px] font-black uppercase tracking-[0.14em] text-slate-500">Step 2 of 5</p>
            <h4 className="mt-2 text-lg font-extrabold text-slate-900">Choose your Task</h4>
            <p className="mt-2 text-sm leading-6 text-slate-500">Pick the line that makes your ownership easiest to understand.</p>
            <div className="mt-5 space-y-3">
              {taskOptions.map((option) => (
                <ChoiceCard key={option} option={option} selected={selectedTask === option} onSelect={() => setSelectedTask(option)} />
              ))}
            </div>
            <div className="mt-auto flex items-end justify-end border-t border-slate-200/80 pt-5">
              <button
                onClick={() => setPhase('task_preview')}
                disabled={!selectedTask}
                className="btn-coach-primary flex min-w-[188px] items-center justify-center gap-2 px-6 py-3 disabled:opacity-50"
              >
                Preview ST
                <ArrowRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        ) : null}

        {phase === 'task_preview' ? (
          <div className="flex h-full flex-col">
            <p className="text-[11px] font-black uppercase tracking-[0.14em] text-slate-500">Step 2 of 5</p>
            <h4 className="mt-2 text-lg font-extrabold text-slate-900">Here is your setup so far</h4>
            <p className="mt-2 text-sm leading-6 text-slate-500">This is enough context. Now we put most of the weight into Action.</p>
            <div className="mt-5 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-4">
              <p className="text-xs font-black uppercase tracking-[0.14em] text-emerald-700">Your Situation and Task</p>
              <p className="mt-3 text-sm leading-7 text-slate-800">{[selectedSituation, selectedTask].join(' ')}</p>
            </div>
            <div className="mt-auto flex items-end justify-end border-t border-slate-200/80 pt-5">
              <button
                onClick={() => setPhase('action_main')}
                className="btn-coach-primary flex min-w-[188px] items-center justify-center gap-2 px-6 py-3"
              >
                Build Action
                <ArrowRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        ) : null}

        {phase === 'action_main' ? (
          <TextStep
            stepLabel="Step 3 of 5"
            title="What did you actually do?"
            description="List the moves you made. Short phrases are great. Separate with commas."
            placeholder="Example: pulled all requests into one tracker, reset owners and deadlines, set short check-ins"
            helper="Use visible actions, not traits like 'stayed organized' or 'worked closely with everyone.'"
            value={answers.actionMain}
            onChange={(value) => {
              setSelectedAction('')
              setAnswer('actionMain', value)
            }}
            onNext={() => setPhase('action_detail')}
          />
        ) : null}

        {phase === 'action_detail' ? (
          <TextStep
            stepLabel="Step 3 of 5"
            title="What detail makes that believable?"
            description="Add the tools, cadence, system, or concrete detail that makes the Action feel real. Separate with commas."
            placeholder="Example: one shared tracker, twice-daily check-ins, updated owners list"
            helper="This is where vague STAR answers usually get stronger."
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
            <p className="mt-2 text-sm leading-6 text-slate-500">All of these are acceptable. Pick the one that sounds strongest and most natural out loud.</p>
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
              <button
                onClick={() => setPhase('result_outcome')}
                className="btn-coach-primary flex min-w-[188px] items-center justify-center gap-2 px-6 py-3"
              >
                Build Result
                <ArrowRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        ) : null}

        {phase === 'result_outcome' ? (
          <TextStep
            stepLabel="Step 4 of 5"
            title="What happened because of your work?"
            description="Name the main outcome first."
            placeholder="Example: we got through the launch week without missing any critical handoffs"
            helper="Do not default to 'it went well' or 'it was successful.'"
            value={answers.resultOutcome}
            onChange={(value) => {
              setSelectedResult('')
              setAnswer('resultOutcome', value)
            }}
            onNext={() => setPhase('result_evidence')}
          />
        ) : null}

        {phase === 'result_evidence' ? (
          <TextStep
            stepLabel="Step 4 of 5"
            title="What makes that result more meaningful?"
            description="Add one more concrete layer: reuse, speed, numbers, avoided risk, or visible impact."
            placeholder="Example: the tracker process was reused for the next rollout"
            helper="This helps the Result prove value instead of just ending the story."
            value={answers.resultEvidence}
            onChange={(value) => {
              setSelectedResult('')
              setAnswer('resultEvidence', value)
            }}
            onNext={() => setPhase('result_choose')}
          />
        ) : null}

        {phase === 'result_choose' ? (
          <div className="flex h-full flex-col">
            <p className="text-[11px] font-black uppercase tracking-[0.14em] text-slate-500">Step 4 of 5</p>
            <h4 className="mt-2 text-lg font-extrabold text-slate-900">Choose your Result</h4>
            <p className="mt-2 text-sm leading-6 text-slate-500">Pick the ending that actually shows value.</p>
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
            <p className="mt-2 text-sm leading-6 text-slate-500">This is the difference between a STAR answer that sounds tidy and one that actually proves something.</p>
            <div className="mt-5 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-4">
              <p className="text-xs font-black uppercase tracking-[0.14em] text-rose-700">Your Result</p>
              <p className="mt-3 text-sm leading-7 text-slate-800">{selectedResult}</p>
            </div>
            <div className="mt-auto flex items-end justify-end border-t border-slate-200/80 pt-5">
              <button
                onClick={() => setPhase('practice')}
                className="btn-coach-primary flex min-w-[188px] items-center justify-center gap-2 px-6 py-3"
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
            <p className="mt-2 text-sm leading-6 text-slate-500">Say it out loud a few times, then try it again without staring at every word.</p>

            <div className="mt-5 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4">
              <p className="text-sm leading-7 text-slate-800">{fullAnswer}</p>
            </div>

            <div className="mt-5 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-4">
              <p className="text-xs font-black uppercase tracking-[0.14em] text-emerald-700">Final reminder</p>
              <div className="mt-3 space-y-3">
                {[
                  'Keep Situation and Task tight.',
                  'Let Action do most of the proving.',
                  'End with a Result that shows real value, not just “it went well.”',
                  'Do not memorize this word for word. Paraphrase it naturally.',
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
