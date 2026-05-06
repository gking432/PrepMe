'use client'

import { useMemo, useState } from 'react'
import { ArrowRight, CheckCircle2 } from 'lucide-react'

interface StarProofWorkshopProps {
  originalQuestion?: string
  originalAnswer?: string
  onComplete: () => void
}

interface WorkshopState {
  setting: string
  problem: string
  ownership: string
  actions: string[]
  result: string
  proof: string
  missing_piece: string
  turn_count: number
}

interface WorkshopTurn {
  question: string
  answer: string
}

interface TurnResponse {
  updated_state?: Partial<WorkshopState>
  next_question?: string
  ready_for_final?: boolean
  final_options?: string[]
}

const MAX_TURNS = 7

const EMPTY_STATE: WorkshopState = {
  setting: '',
  problem: '',
  ownership: '',
  actions: [],
  result: '',
  proof: '',
  missing_piece: 'setting',
  turn_count: 0,
}

function cleanInput(value: string) {
  return value.trim().replace(/\s+/g, ' ')
}

function ensurePeriod(value: string) {
  const trimmed = cleanInput(value)
  if (!trimmed) return ''
  return /[.!?]$/.test(trimmed) ? trimmed : `${trimmed}.`
}

function summarizeAnswer(answer?: string) {
  const cleaned = cleanInput(answer || '')
  if (!cleaned) return ''
  if (cleaned.length <= 180) return ensurePeriod(cleaned)
  return ensurePeriod(`${cleaned.slice(0, 177).trim()}...`)
}

function uniqueOptions(options: string[]) {
  return Array.from(new Set(options.map((option) => ensurePeriod(option)).filter(Boolean)))
}

function mergeState(current: WorkshopState, incoming?: Partial<WorkshopState>) {
  if (!incoming) return current
  return {
    ...current,
    ...incoming,
    actions: incoming.actions ? incoming.actions.filter(Boolean) : current.actions,
    turn_count:
      typeof incoming.turn_count === 'number' ? incoming.turn_count : current.turn_count,
  }
}

function buildFallbackState(
  currentState: WorkshopState,
  question: string,
  latestAnswer: string
) {
  const answer = cleanInput(latestAnswer)
  const nextState = { ...currentState, turn_count: currentState.turn_count + 1 }

  switch (currentState.missing_piece) {
    case 'setting':
      nextState.setting = answer
      nextState.missing_piece = 'problem'
      return {
        state: nextState,
        nextQuestion: 'What specifically became difficult, unclear, or at risk in that situation?',
      }
    case 'problem':
      nextState.problem = answer
      nextState.missing_piece = 'ownership'
      return {
        state: nextState,
        nextQuestion: 'What part of that was yours to handle?',
      }
    case 'ownership':
      nextState.ownership = answer
      nextState.missing_piece = 'action'
      return {
        state: nextState,
        nextQuestion: 'What did you actually do first to move it forward?',
      }
    case 'action':
      nextState.actions = [...nextState.actions, answer].slice(0, 3)
      nextState.missing_piece = nextState.actions.length >= 2 ? 'result' : 'action_more'
      return {
        state: nextState,
        nextQuestion:
          nextState.actions.length >= 2
            ? 'What changed in the end because of your work?'
            : 'What else did you actually do that made the example believable?',
      }
    case 'action_more':
      nextState.actions = [...nextState.actions, answer].slice(0, 3)
      nextState.missing_piece = 'result'
      return {
        state: nextState,
        nextQuestion: 'What changed in the end because of your work?',
      }
    case 'result':
      nextState.result = answer
      nextState.missing_piece = 'proof'
      return {
        state: nextState,
        nextQuestion: 'What outcome made your contribution matter beyond just finishing it?',
      }
    default:
      nextState.proof = answer
      nextState.missing_piece = 'done'
      return {
        state: nextState,
        nextQuestion: '',
      }
  }
}

function buildFallbackFinalOptions(question: string, state: WorkshopState) {
  const opening = state.setting ? ensurePeriod(state.setting) : ''
  const problem = state.problem ? ensurePeriod(state.problem) : ''
  const ownership = state.ownership
    ? ensurePeriod(`I was responsible for ${cleanInput(state.ownership)}`)
    : ''
  const action = state.actions.length
    ? ensurePeriod(`What I actually did was ${state.actions.map(cleanInput).join(', ')}`)
    : ''
  const result = state.result ? ensurePeriod(`In the end, ${cleanInput(state.result)}`) : ''
  const proof = state.proof ? ensurePeriod(cleanInput(state.proof)) : ''

  return uniqueOptions([
    [opening, problem, ownership, action, result].filter(Boolean).join(' '),
    [`For a question like "${question},"`, opening, problem, ownership, action, result]
      .filter(Boolean)
      .join(' '),
    [opening, problem, ownership, action, result, proof].filter(Boolean).join(' '),
  ]).slice(0, 3)
}

export default function StarProofWorkshop({
  originalQuestion,
  originalAnswer,
  onComplete,
}: StarProofWorkshopProps) {
  const [phase, setPhase] = useState<'anchor' | 'question' | 'options' | 'practice'>('anchor')
  const [currentQuestion, setCurrentQuestion] = useState(
    'Describe a specific situation you could use for this answer.'
  )
  const [currentAnswer, setCurrentAnswer] = useState('')
  const [state, setState] = useState<WorkshopState>(EMPTY_STATE)
  const [turns, setTurns] = useState<WorkshopTurn[]>([])
  const [finalOptions, setFinalOptions] = useState<string[]>([])
  const [selectedOption, setSelectedOption] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')

  const questionLabel = originalQuestion || 'Tell me about a time when...'
  const answerSummary = useMemo(() => summarizeAnswer(originalAnswer), [originalAnswer])

  async function requestTurn(
    latestAnswer: string,
    currentState: WorkshopState,
    turnHistory: WorkshopTurn[],
    forceFinalize: boolean
  ) {
    const response = await fetch('/api/interview/star-workshop', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        question: originalQuestion || '',
        flagged_answer: originalAnswer || '',
        latest_answer: latestAnswer,
        state: currentState,
        turns: turnHistory,
        current_question: currentQuestion,
        force_finalize: forceFinalize,
      }),
    })

    if (!response.ok) {
      throw new Error('Workshop turn failed')
    }

    return (await response.json()) as TurnResponse
  }

  async function handleNext() {
    const answer = cleanInput(currentAnswer)
    if (!answer) return

    const nextTurns = [...turns, { question: currentQuestion, answer }]
    setTurns(nextTurns)
    setIsLoading(true)
    setError('')

    try {
      const forceFinalize = state.turn_count + 1 >= MAX_TURNS
      const ai = await requestTurn(answer, state, nextTurns, forceFinalize)
      const nextState = mergeState(state, ai.updated_state)
      setState(nextState)

      if (ai.ready_for_final || forceFinalize) {
        const options =
          ai.final_options?.length
            ? uniqueOptions(ai.final_options).slice(0, 3)
            : buildFallbackFinalOptions(questionLabel, nextState)
        setFinalOptions(options)
        setSelectedOption(options[0] || '')
        setPhase('options')
        setCurrentAnswer('')
        return
      }

      setCurrentQuestion(
        ai.next_question || 'What specifically became difficult, unclear, or at risk there?'
      )
      setCurrentAnswer('')
    } catch {
      setError('We hit a small generation issue, so we switched to a safer question path.')
      const fallback = buildFallbackState(state, questionLabel, answer)
      setState(fallback.state)

      if (fallback.state.missing_piece === 'done' || fallback.state.turn_count >= MAX_TURNS) {
        const options = buildFallbackFinalOptions(questionLabel, fallback.state)
        setFinalOptions(options)
        setSelectedOption(options[0] || '')
        setPhase('options')
      } else {
        setCurrentQuestion(fallback.nextQuestion)
        setCurrentAnswer('')
      }
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="flex h-full flex-col overflow-hidden rounded-[28px] border border-slate-200 bg-white">
      <div className="border-b border-slate-200 bg-[linear-gradient(180deg,#f8f5ff_0%,#fff_100%)] px-5 py-4">
        <p className="text-xs font-black uppercase tracking-[0.14em] text-violet-600">
          Specificity and proof workshop
        </p>
        <h3 className="mt-1 text-xl font-extrabold text-slate-900">
          Build a stronger example one question at a time
        </h3>
        {error ? <p className="mt-2 text-xs leading-5 text-amber-700">{error}</p> : null}
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto px-5 py-5">
        {phase === 'anchor' ? (
          <div className="flex h-full flex-col">
            <p className="text-[11px] font-black uppercase tracking-[0.14em] text-slate-500">
              Workshop
            </p>
            <h4 className="mt-2 text-lg font-extrabold text-slate-900">
              We’re rebuilding this answer
            </h4>
            <p className="mt-2 text-sm leading-6 text-slate-500">
              The last version stayed too general. This time we’ll build from one real situation.
            </p>

            <div className="mt-5 rounded-2xl border border-violet-200 bg-violet-50 px-4 py-4">
              <p className="text-xs font-black uppercase tracking-[0.14em] text-violet-700">
                Flagged question
              </p>
              <p className="mt-3 text-sm leading-7 text-slate-800">{questionLabel}</p>
            </div>

            {answerSummary ? (
              <div className="mt-4 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4">
                <p className="text-xs font-black uppercase tracking-[0.14em] text-slate-500">
                  Your flagged answer
                </p>
                <p className="mt-3 text-sm leading-7 text-slate-800">{answerSummary}</p>
              </div>
            ) : null}

            <div className="mt-auto flex items-end justify-end border-t border-slate-200/80 pt-5">
              <button
                onClick={() => setPhase('question')}
                className="btn-coach-primary flex min-w-[188px] items-center justify-center gap-2 px-6 py-3"
              >
                Start building
                <ArrowRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        ) : null}

        {phase === 'question' ? (
          <div className="flex h-full flex-col">
            <p className="text-[11px] font-black uppercase tracking-[0.14em] text-slate-500">
              Build the example
            </p>
            <h4 className="mt-2 text-lg font-extrabold text-slate-900">{currentQuestion}</h4>
            <p className="mt-2 text-sm leading-6 text-slate-500">
              Keep it plain. One real detail is enough.
            </p>

            {turns.length > 0 ? (
              <div className="mt-5 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4">
                <p className="text-xs font-black uppercase tracking-[0.14em] text-slate-500">
                  Notes so far
                </p>
                <div className="mt-3 space-y-2">
                  {turns.slice(-3).map((turn, index) => (
                    <p key={`${turn.question}-${index}`} className="text-sm leading-6 text-slate-700">
                      {turn.answer}
                    </p>
                  ))}
                </div>
              </div>
            ) : null}

            <div className="mt-5 rounded-2xl border border-slate-200 bg-white p-4">
              <textarea
                value={currentAnswer}
                onChange={(event) => setCurrentAnswer(event.target.value)}
                placeholder="Type your answer here."
                className="min-h-[132px] w-full resize-none border-0 bg-transparent text-sm leading-7 text-slate-800 outline-none placeholder:text-slate-400"
              />
            </div>

            <div className="mt-auto flex items-end justify-end border-t border-slate-200/80 pt-5">
              <button
                onClick={handleNext}
                disabled={isLoading || !cleanInput(currentAnswer)}
                className="btn-coach-primary flex min-w-[188px] items-center justify-center gap-2 px-6 py-3 disabled:opacity-50"
              >
                {isLoading ? 'Thinking...' : 'Next'}
                <ArrowRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        ) : null}

        {phase === 'options' ? (
          <div className="flex h-full flex-col">
            <p className="text-[11px] font-black uppercase tracking-[0.14em] text-slate-500">
              Final options
            </p>
            <h4 className="mt-2 text-lg font-extrabold text-slate-900">
              Choose the version you want to practice
            </h4>
            <p className="mt-2 text-sm leading-6 text-slate-500">
              Pick the one that sounds the most believable out loud.
            </p>

            <div className="mt-5 space-y-3">
              {finalOptions.map((option) => (
                <button
                  key={option}
                  onClick={() => setSelectedOption(option)}
                  className={`w-full rounded-2xl border px-4 py-4 text-left transition ${
                    selectedOption === option
                      ? 'border-violet-400 bg-violet-50 shadow-sm'
                      : 'border-slate-200 bg-white hover:border-violet-300 hover:bg-violet-50'
                  }`}
                >
                  <p className="text-sm leading-7 text-slate-800">{option}</p>
                </button>
              ))}
            </div>

            <div className="mt-auto flex items-end justify-end border-t border-slate-200/80 pt-5">
              <button
                onClick={() => setPhase('practice')}
                disabled={!selectedOption}
                className="btn-coach-primary flex min-w-[188px] items-center justify-center gap-2 px-6 py-3 disabled:opacity-50"
              >
                Practice this one
                <ArrowRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        ) : null}

        {phase === 'practice' ? (
          <div className="flex h-full flex-col">
            <p className="text-[11px] font-black uppercase tracking-[0.14em] text-slate-500">
              Ready to use
            </p>
            <h4 className="mt-2 text-lg font-extrabold text-slate-900">
              Here is your rebuilt answer
            </h4>
            <p className="mt-2 text-sm leading-6 text-slate-500">
              Say it out loud a few times. Then try it again without reading every word.
            </p>

            <div className="mt-5 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4">
              <p className="text-sm leading-7 text-slate-800">{selectedOption}</p>
            </div>

            <div className="mt-5 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-4">
              <div className="flex items-start gap-3">
                <CheckCircle2 className="mt-0.5 h-5 w-5 text-emerald-700" />
                <div>
                  <p className="text-sm font-bold text-emerald-900">What changed</p>
                  <p className="mt-1 text-sm leading-6 text-emerald-800">
                    This version is anchored to one real situation, shows what became difficult, and makes your role and actions easier to hear.
                  </p>
                </div>
              </div>
            </div>

            <div className="mt-auto flex items-end justify-end border-t border-slate-200/80 pt-5">
              <button
                onClick={onComplete}
                className="btn-coach-primary flex min-w-[188px] items-center justify-center gap-2 px-6 py-3"
              >
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
