'use client'

import { useMemo, useState } from 'react'
import { ArrowRight, CheckCircle2 } from 'lucide-react'

type WorkshopPhase = 'anchor' | 'story' | 'coach' | 'options' | 'practice'
type AiStage = 'story' | 'follow_up' | 'finalize'

interface StarProofWorkshopProps {
  originalQuestion?: string
  originalAnswer?: string
  onComplete: () => void
}

interface DraftShape {
  situation?: string
  task?: string
  action?: string
  result?: string
  proof?: string
}

interface CoachingTurn {
  question: string
  answer: string
}

interface AiResponse {
  normalized?: {
    story?: string
    latest_answer?: string
  }
  reflection?: string
  weakness_focus?: string
  next_question?: string
  should_continue?: boolean
  draft?: DraftShape
  final_options?: string[]
}

const MAX_FOLLOW_UPS = 3

function cleanInput(value: string) {
  return value.trim().replace(/\s+/g, ' ')
}

function ensurePeriod(value: string) {
  const trimmed = value.trim()
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

function buildFallbackDraft(story: string, turns: CoachingTurn[]): DraftShape {
  const [firstTurn, secondTurn, thirdTurn] = turns
  return {
    situation: story ? ensurePeriod(cleanInput(story)) : '',
    task: firstTurn?.answer ? ensurePeriod(`I was responsible for ${cleanInput(firstTurn.answer)}`) : '',
    action: secondTurn?.answer ? ensurePeriod(`What I actually did was ${cleanInput(secondTurn.answer)}`) : '',
    result: thirdTurn?.answer ? ensurePeriod(`In the end, ${cleanInput(thirdTurn.answer)}`) : '',
    proof: thirdTurn?.answer
      ? 'That example is stronger because the outcome is easier to hear.'
      : 'The goal is to make your role, action, and result easier to picture.',
  }
}

function buildFallbackOptions(question: string, story: string, turns: CoachingTurn[]) {
  const draft = buildFallbackDraft(story, turns)
  const opening = question ? `For a question like "${question}", one example that fits is this:` : 'One example that fits is this:'
  const base = [draft.situation, draft.task, draft.action, draft.result].filter(Boolean).join(' ')

  return uniqueOptions([
    `${opening} ${base}`,
    `${draft.situation || ''} ${draft.task || ''} ${draft.action || ''} ${draft.result || ''}`.trim(),
    `${draft.situation || ''} ${draft.task || ''} ${draft.action || ''} ${draft.result || ''} ${draft.proof || ''}`.trim(),
  ]).slice(0, 3)
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

function TextPrompt({
  stepLabel,
  title,
  description,
  placeholder,
  helper,
  value,
  onChange,
  onNext,
  buttonLabel = 'Next',
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
  buttonLabel?: string
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
          className="min-h-[132px] w-full resize-none border-0 bg-transparent text-sm leading-7 text-slate-800 outline-none placeholder:text-slate-400"
        />
        <p className="mt-3 text-xs leading-5 text-slate-500">{helper}</p>
      </div>
      <div className="mt-auto flex items-end justify-end border-t border-slate-200/80 pt-5">
        <button
          onClick={onNext}
          disabled={isLoading || !cleanInput(value)}
          className="btn-coach-primary flex min-w-[188px] items-center justify-center gap-2 px-6 py-3 disabled:opacity-50"
        >
          {isLoading ? 'Thinking...' : buttonLabel}
          <ArrowRight className="h-4 w-4" />
        </button>
      </div>
    </div>
  )
}

function DraftPreview({ draft }: { draft: DraftShape }) {
  const sections = [
    { label: 'Situation', value: draft.situation },
    { label: 'Your role', value: draft.task },
    { label: 'Action', value: draft.action },
    { label: 'Result', value: draft.result },
  ].filter((section) => section.value)

  if (!sections.length) return null

  return (
    <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4">
      <p className="text-xs font-black uppercase tracking-[0.14em] text-slate-500">Draft so far</p>
      <div className="mt-3 space-y-3">
        {sections.map((section) => (
          <div key={section.label}>
            <p className="text-[11px] font-black uppercase tracking-[0.14em] text-slate-500">{section.label}</p>
            <p className="mt-1 text-sm leading-6 text-slate-800">{section.value}</p>
          </div>
        ))}
      </div>
    </div>
  )
}

export default function StarProofWorkshop({
  originalQuestion,
  originalAnswer,
  onComplete,
}: StarProofWorkshopProps) {
  const [phase, setPhase] = useState<WorkshopPhase>('anchor')
  const [story, setStory] = useState('')
  const [currentPrompt, setCurrentPrompt] = useState('')
  const [currentAnswer, setCurrentAnswer] = useState('')
  const [reflection, setReflection] = useState('')
  const [weaknessFocus, setWeaknessFocus] = useState('')
  const [draft, setDraft] = useState<DraftShape>({})
  const [turns, setTurns] = useState<CoachingTurn[]>([])
  const [finalOptions, setFinalOptions] = useState<string[]>([])
  const [selectedOption, setSelectedOption] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')

  const questionLabel = originalQuestion || 'Tell me about a time when...'
  const answerSummary = useMemo(() => summarizeAnswer(originalAnswer), [originalAnswer])

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

  async function handleStorySubmit() {
    const cleanedStory = cleanInput(story)
    if (!cleanedStory) return

    setIsLoading(true)
    setError('')

    try {
      const ai = await requestStage('story', {
        question: originalQuestion || '',
        flagged_answer: originalAnswer || '',
        story: cleanedStory,
      })

      if (ai.normalized?.story) {
        setStory(ai.normalized.story)
      }

      setReflection(
        ai.reflection ||
          'This sounds like a real example. Now we need to make your role and actions easier to hear.'
      )
      setWeaknessFocus(ai.weakness_focus || 'specificity')
      setDraft(ai.draft || {})

      if (ai.should_continue === false || !ai.next_question) {
        const fallbackOptions = ai.final_options?.length
          ? ai.final_options.slice(0, 3)
          : buildFallbackOptions(questionLabel, cleanedStory, [])
        setFinalOptions(fallbackOptions)
        setSelectedOption(fallbackOptions[0] || '')
        setPhase('options')
        return
      }

      setCurrentPrompt(ai.next_question)
      setCurrentAnswer('')
      setPhase('coach')
    } catch {
      setError('We hit a small generation issue, so we switched to a safer coaching path.')
      setReflection('This sounds like a usable example. Let’s make your role clearer first.')
      setWeaknessFocus('ownership')
      setDraft({ situation: ensurePeriod(cleanedStory) })
      setCurrentPrompt('What were you personally responsible for in that moment?')
      setCurrentAnswer('')
      setPhase('coach')
    } finally {
      setIsLoading(false)
    }
  }

  async function handleFollowUpSubmit() {
    const cleanedAnswer = cleanInput(currentAnswer)
    if (!cleanedAnswer) return

    const nextTurns = [...turns, { question: currentPrompt, answer: cleanedAnswer }]
    setTurns(nextTurns)
    setIsLoading(true)
    setError('')

    try {
      const shouldFinalize = nextTurns.length >= MAX_FOLLOW_UPS
      const ai = await requestStage(shouldFinalize ? 'finalize' : 'follow_up', {
        question: originalQuestion || '',
        flagged_answer: originalAnswer || '',
        story,
        turns: nextTurns,
        draft,
      })

      if (ai.normalized?.latest_answer) {
        nextTurns[nextTurns.length - 1] = {
          question: currentPrompt,
          answer: ai.normalized.latest_answer,
        }
        setTurns([...nextTurns])
      }

      setReflection(
        ai.reflection ||
          'That helps. The story is getting clearer, but we still want the proof to be easier to picture.'
      )
      setWeaknessFocus(ai.weakness_focus || weaknessFocus)
      setDraft(ai.draft || buildFallbackDraft(story, nextTurns))

      if (shouldFinalize || ai.should_continue === false || ai.final_options?.length) {
        const options = ai.final_options?.length
          ? uniqueOptions(ai.final_options).slice(0, 3)
          : buildFallbackOptions(questionLabel, story, nextTurns)
        setFinalOptions(options)
        setSelectedOption(options[0] || '')
        setPhase('options')
        return
      }

      setCurrentPrompt(
        ai.next_question || 'What is one specific thing you actually did that makes this story believable?'
      )
      setCurrentAnswer('')
    } catch {
      setError('We hit a small generation issue, so we used a simpler coaching path.')
      const fallbackDraft = buildFallbackDraft(story, nextTurns)
      setDraft(fallbackDraft)

      if (nextTurns.length >= MAX_FOLLOW_UPS) {
        const options = buildFallbackOptions(questionLabel, story, nextTurns)
        setFinalOptions(options)
        setSelectedOption(options[0] || '')
        setPhase('options')
      } else {
        const fallbackQuestions = [
          'What were you personally responsible for in that moment?',
          'What did you actually do first to move it forward?',
          'What changed in the end because of your work?',
        ]
        setCurrentPrompt(fallbackQuestions[nextTurns.length] || fallbackQuestions[2])
        setCurrentAnswer('')
      }
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="flex h-full flex-col overflow-hidden rounded-[28px] border border-slate-200 bg-white">
      <div className="border-b border-slate-200 bg-[linear-gradient(180deg,#f8f5ff_0%,#fff_100%)] px-5 py-4">
        <p className="text-xs font-black uppercase tracking-[0.14em] text-violet-600">Specificity and proof workshop</p>
        <h3 className="mt-1 text-xl font-extrabold text-slate-900">Turn a vague example into a believable answer</h3>
        {error ? <p className="mt-2 text-xs leading-5 text-amber-700">{error}</p> : null}
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto px-5 py-5">
        {phase === 'anchor' ? (
          <div className="flex h-full flex-col">
            <p className="text-[11px] font-black uppercase tracking-[0.14em] text-slate-500">Step 1 of 4</p>
            <h4 className="mt-2 text-lg font-extrabold text-slate-900">We’re rebuilding this answer</h4>
            <p className="mt-2 text-sm leading-6 text-slate-500">
              Your last answer was too vague. Let’s anchor this to one real situation and build from there.
            </p>

            <div className="mt-5 rounded-2xl border border-violet-200 bg-violet-50 px-4 py-4">
              <p className="text-xs font-black uppercase tracking-[0.14em] text-violet-700">Flagged question</p>
              <p className="mt-3 text-sm leading-7 text-slate-800">{questionLabel}</p>
            </div>

            {answerSummary ? (
              <div className="mt-4 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4">
                <p className="text-xs font-black uppercase tracking-[0.14em] text-slate-500">Your flagged answer</p>
                <p className="mt-3 text-sm leading-7 text-slate-800">{answerSummary}</p>
              </div>
            ) : null}

            <div className="mt-auto flex items-end justify-end border-t border-slate-200/80 pt-5">
              <button
                onClick={() => setPhase('story')}
                className="btn-coach-primary flex min-w-[188px] items-center justify-center gap-2 px-6 py-3"
              >
                Find a specific example
                <ArrowRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        ) : null}

        {phase === 'story' ? (
          <TextPrompt
            stepLabel="Step 2 of 4"
            title="Come up with a specific situation you can use for this answer. Describe it below."
            description="Pick one real moment, not a general pattern."
            placeholder="e.g. During a product launch, timelines shifted and work across teams started slipping."
            helper="Keep it rough. Do not try to polish it yet. We’ll help you shape it into a stronger answer."
            value={story}
            onChange={setStory}
            onNext={handleStorySubmit}
            buttonLabel="Use this situation"
            isLoading={isLoading}
          />
        ) : null}

        {phase === 'coach' ? (
          <div className="flex h-full flex-col">
            <p className="text-[11px] font-black uppercase tracking-[0.14em] text-slate-500">
              Step 3 of 4
            </p>
            <h4 className="mt-2 text-lg font-extrabold text-slate-900">Let’s sharpen the story</h4>
            <p className="mt-2 text-sm leading-6 text-slate-500">
              Each question is trying to make the proof stronger and easier to picture.
            </p>

            {reflection ? (
              <div className="mt-5 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-4">
                <p className="text-xs font-black uppercase tracking-[0.14em] text-emerald-700">What I’m hearing</p>
                <p className="mt-3 text-sm leading-7 text-slate-800">{reflection}</p>
                {weaknessFocus ? (
                  <p className="mt-2 text-xs leading-5 text-emerald-800">
                    Current focus: <span className="font-semibold">{weaknessFocus}</span>
                  </p>
                ) : null}
              </div>
            ) : null}

            <div className="mt-4">
              <DraftPreview draft={draft} />
            </div>

            <div className="mt-4 rounded-2xl border border-slate-200 bg-white p-4">
              <p className="text-xs font-black uppercase tracking-[0.14em] text-slate-500">Next question</p>
              <p className="mt-2 text-sm leading-6 text-slate-800">{currentPrompt}</p>
              <textarea
                value={currentAnswer}
                onChange={(event) => setCurrentAnswer(event.target.value)}
                placeholder="Answer in plain language. We’ll shape it from there."
                className="mt-4 min-h-[116px] w-full resize-none border-0 bg-transparent text-sm leading-7 text-slate-800 outline-none placeholder:text-slate-400"
              />
            </div>

            <div className="mt-auto flex items-end justify-end border-t border-slate-200/80 pt-5">
              <button
                onClick={handleFollowUpSubmit}
                disabled={isLoading || !cleanInput(currentAnswer)}
                className="btn-coach-primary flex min-w-[188px] items-center justify-center gap-2 px-6 py-3 disabled:opacity-50"
              >
                {isLoading ? 'Thinking...' : 'Keep building'}
                <ArrowRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        ) : null}

        {phase === 'options' ? (
          <div className="flex h-full flex-col">
            <p className="text-[11px] font-black uppercase tracking-[0.14em] text-slate-500">Step 4 of 4</p>
            <h4 className="mt-2 text-lg font-extrabold text-slate-900">Choose your stronger answer</h4>
            <p className="mt-2 text-sm leading-6 text-slate-500">
              Pick the version that sounds the most believable and natural out loud.
            </p>

            {reflection ? (
              <div className="mt-5 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4">
                <p className="text-xs font-black uppercase tracking-[0.14em] text-slate-500">Coaching note</p>
                <p className="mt-3 text-sm leading-7 text-slate-800">{reflection}</p>
              </div>
            ) : null}

            <div className="mt-5 space-y-3">
              {finalOptions.map((option) => (
                <ChoiceCard
                  key={option}
                  option={option}
                  selected={selectedOption === option}
                  onSelect={() => setSelectedOption(option)}
                />
              ))}
            </div>

            <div className="mt-auto flex items-end justify-end border-t border-slate-200/80 pt-5">
              <button
                onClick={() => setPhase('practice')}
                disabled={!selectedOption}
                className="btn-coach-primary flex min-w-[188px] items-center justify-center gap-2 px-6 py-3 disabled:opacity-50"
              >
                Use this answer
                <ArrowRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        ) : null}

        {phase === 'practice' ? (
          <div className="flex h-full flex-col">
            <p className="text-[11px] font-black uppercase tracking-[0.14em] text-slate-500">Ready to practice</p>
            <h4 className="mt-2 text-lg font-extrabold text-slate-900">Here is your rebuilt answer</h4>
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
                  <p className="text-sm font-bold text-emerald-900">What improved</p>
                  <p className="mt-1 text-sm leading-6 text-emerald-800">
                    The answer is now anchored to one real situation, makes your role clearer, and gives the interviewer stronger proof of what you actually did.
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
