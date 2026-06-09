'use client'

import { useEffect, useMemo, useState } from 'react'
import { ArrowRight, CheckCircle2, MessageSquareText } from 'lucide-react'

interface HandlingUncertaintyWorkshopProps {
  originalQuestion?: string
  originalAnswer?: string
  onComplete: () => void
}

type WorkshopStep =
  | 'direction'
  | 'reason_anchor'
  | 'example_anchor'
  | 'opening'
  | 'reason'
  | 'example'
  | 'final'

interface AnswerDirection {
  id: string
  label: string
  answerCore: string
  description: string
  reasons: Array<{
    id: string
    label: string
    line: string
  }>
  examples: Array<{
    id: string
    label: string
    line: string
  }>
}

const PRACTICE_QUESTION = 'Tell me about an area where you are still developing professionally.'

const ANSWER_DIRECTIONS: AnswerDirection[] = [
  {
    id: 'decisions',
    label: 'Making decisions faster when the path is not fully clear',
    answerCore: 'One area I am still developing is getting faster at making decisions when the path is not fully clear.',
    description: 'A strong choice if you tend to over-process before making the clearest available call.',
    reasons: [
      {
        id: 'improved',
        label: 'I have improved a lot, but I still push myself to get to a clear call faster instead of over-processing.',
        line: 'I have improved a lot there, but I still push myself to get to a clear call faster instead of over-processing.',
      },
      {
        id: 'drag',
        label: 'I learned that waiting too long for perfect certainty can create drag for other people.',
        line: 'I learned that waiting too long for perfect certainty can create drag for other people, so I work on being more decisive when the key facts are clear enough.',
      },
      {
        id: 'thoughtful',
        label: 'Being thoughtful is useful, but overthinking can slow down the work if I do not make the call soon enough.',
        line: 'Being thoughtful is useful, but overthinking can slow down the work if I do not make the call soon enough.',
      },
    ],
    examples: [
      {
        id: 'reset_plan',
        label: 'Resetting a project plan when information was still incomplete',
        line: 'For example, in one role I had to reset a project plan with incomplete information, and I learned that clarifying the key decision first was more useful than waiting for perfect certainty.',
      },
      {
        id: 'deadline_shift',
        label: 'Making a call when a deadline shifted late and not everything was confirmed yet',
        line: 'For example, when a deadline shifted late on a project and not every dependency was confirmed yet, I learned that making the clearest available call was better than stalling the whole team.',
      },
      {
        id: 'owner_gap',
        label: 'Moving forward when ownership was unclear and someone had to define the next step',
        line: 'For example, in one situation ownership was unclear and the work was starting to stall, so I learned that identifying the real decision and next owner mattered more than waiting for every detail to settle first.',
      },
    ],
  },
  {
    id: 'speak_up',
    label: 'Speaking up earlier instead of over-processing first',
    answerCore: 'One area I am still developing is speaking up earlier when I see a risk or concern.',
    description: 'Useful if you sometimes wait too long to raise an issue because you want to be fully sure first.',
    reasons: [
      {
        id: 'fully_sure',
        label: 'I used to wait until I felt fully sure, and I have learned that earlier signal is often more helpful.',
        line: 'I used to wait until I felt fully sure, and I have learned that raising the concern earlier is often more helpful.',
      },
      {
        id: 'early_context',
        label: 'I have learned that sharing context earlier gives other people more room to respond well.',
        line: 'I have learned that sharing context earlier gives other people more room to respond well instead of hearing about an issue too late.',
      },
      {
        id: 'confidence',
        label: 'I am more confident there now, but I still work on saying the thing sooner when it matters.',
        line: 'I am much more confident there now, but I still work on saying the thing sooner when it matters.',
      },
    ],
    examples: [
      {
        id: 'late_risk',
        label: 'A project where calling out a risk earlier would have helped',
        line: 'For example, on one project I realized a handoff risk was growing, and I learned that flagging it earlier would have helped the team adjust sooner.',
      },
      {
        id: 'stakeholder',
        label: 'A time when a stakeholder needed to hear a concern earlier',
        line: 'For example, in one role I waited too long to raise a concern with a stakeholder, and that taught me that earlier, clearer communication usually serves the work better.',
      },
      {
        id: 'team_signal',
        label: 'A situation where giving the team an earlier signal changed the outcome',
        line: 'For example, once I raised a concern earlier than I normally would, and it helped the team fix the issue before it became a bigger problem.',
      },
    ],
  },
  {
    id: 'delegate',
    label: 'Delegating sooner instead of holding too much myself',
    answerCore: 'One area I am still developing is delegating sooner instead of trying to hold too much myself.',
    description: 'Good if your instinct is to protect the work by taking too much on personally.',
    reasons: [
      {
        id: 'ownership_instinct',
        label: 'My instinct is to protect the work by taking too much on myself, and I have had to get better at sharing ownership sooner.',
        line: 'My instinct is to protect the work by taking too much on myself, and I have had to get better at sharing ownership sooner.',
      },
      {
        id: 'scale',
        label: 'I learned that holding too much can actually slow the work down instead of helping it.',
        line: 'I learned that holding too much myself can actually slow the work down instead of helping it.',
      },
      {
        id: 'team_growth',
        label: 'I am better at it now, but I still work on trusting the team earlier and more clearly.',
        line: 'I am better at it now, but I still work on trusting the team earlier and more clearly.',
      },
    ],
    examples: [
      {
        id: 'handoff',
        label: 'A project where clearer delegation would have helped execution',
        line: 'For example, on one project I held onto too many follow-ups myself, and that taught me that earlier delegation would have made the work run more smoothly.',
      },
      {
        id: 'owners',
        label: 'A time when assigning owners sooner improved the outcome',
        line: 'For example, in one role I learned that assigning owners sooner led to faster execution than trying to personally carry every open thread.',
      },
      {
        id: 'capacity',
        label: 'A moment when capacity became the signal to delegate differently',
        line: 'For example, when the volume of work spiked on a project, I learned that delegating more clearly and earlier was more effective than trying to absorb the extra load myself.',
      },
    ],
  },
  {
    id: 'prioritize',
    label: 'Prioritizing faster when several things move at once',
    answerCore: 'One area I am still developing is prioritizing faster when several things start moving at once.',
    description: 'Good if your challenge is not effort, but deciding what matters first under pressure.',
    reasons: [
      {
        id: 'too_even',
        label: 'I used to spend too much time trying to give everything equal attention instead of making the clearest priority call.',
        line: 'I used to spend too much time trying to give everything equal attention instead of making the clearest priority call.',
      },
      {
        id: 'tradeoff',
        label: 'I have learned that good prioritization is really about tradeoffs, and I still work on making those calls faster.',
        line: 'I have learned that good prioritization is really about tradeoffs, and I still work on making those calls faster.',
      },
      {
        id: 'speed',
        label: 'I am better at it now, but I still push myself to identify the true priority earlier.',
        line: 'I am better at it now, but I still push myself to identify the true priority earlier when several things move at once.',
      },
    ],
    examples: [
      {
        id: 'competing_requests',
        label: 'A time when competing requests forced a real priority decision',
        line: 'For example, in one role I had several competing requests come in at once, and I learned that getting clear on the highest-impact item first kept the rest of the work from spiraling.',
      },
      {
        id: 'launch_week',
        label: 'A launch week where several priorities shifted at the same time',
        line: 'For example, during one launch week priorities shifted quickly across teams, and I learned that the clearest first move was to identify what truly could not slip.',
      },
      {
        id: 'multiple_owners',
        label: 'A situation where several open threads needed to be ranked quickly',
        line: 'For example, in one project several open threads were moving at once, and I learned that making the priority ranking explicit early saved time later.',
      },
    ],
  },
]

const OPENING_OPTIONS = [
  {
    id: 'direct',
    label: 'Start directly',
    build: (answerCore: string) => answerCore,
  },
  {
    id: 'good_question',
    label: 'Use a short recovery line first',
    build: (answerCore: string) => `Good question. ${answerCore}`,
  },
  {
    id: 'if_i_had',
    label: 'Give yourself one beat, then answer',
    build: (answerCore: string) => `If I had to pick one area, it would be this: ${answerCore.charAt(0).toLowerCase()}${answerCore.slice(1)}`,
  },
]

function ensurePeriod(value: string) {
  const cleaned = value.trim().replace(/\s+/g, ' ')
  if (!cleaned) return ''
  return /[.!?]$/.test(cleaned) ? cleaned : `${cleaned}.`
}

function summarizeAnswer(answer?: string) {
  const cleaned = answer?.trim().replace(/\s+/g, ' ') || ''
  if (!cleaned) return ''
  if (cleaned.length <= 180) return ensurePeriod(cleaned)
  return ensurePeriod(`${cleaned.slice(0, 177).trim()}...`)
}

function uniqueOptions(options: string[]) {
  return Array.from(new Set(options.map((option) => ensurePeriod(option)).filter(Boolean)))
}

function SelectionCard({
  title,
  description,
  selected,
  onClick,
}: {
  title: string
  description: string
  selected: boolean
  onClick: () => void
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`w-full rounded-3xl border px-4 py-4 text-left transition ${
        selected
          ? 'border-emerald-400 bg-emerald-50 shadow-[0_8px_20px_rgba(16,185,129,0.12)]'
          : 'border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50'
      }`}
    >
      <div className="flex items-start gap-3">
        <div
          className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full border ${
            selected ? 'border-emerald-500 bg-emerald-500 text-white' : 'border-slate-300 bg-white'
          }`}
        >
          {selected ? <CheckCircle2 className="h-3.5 w-3.5" /> : null}
        </div>
        <div className="min-w-0">
          <p className="font-semibold text-slate-900">{title}</p>
          <p className="mt-1 text-sm leading-6 text-slate-600">{description}</p>
        </div>
      </div>
    </button>
  )
}

export default function HandlingUncertaintyWorkshop({
  originalQuestion,
  originalAnswer,
  onComplete,
}: HandlingUncertaintyWorkshopProps) {
  const [step, setStep] = useState<WorkshopStep>('direction')
  const [directionId, setDirectionId] = useState(ANSWER_DIRECTIONS[0].id)
  const [reasonAnchorId, setReasonAnchorId] = useState(ANSWER_DIRECTIONS[0].reasons[0].id)
  const [exampleAnchorId, setExampleAnchorId] = useState(ANSWER_DIRECTIONS[0].examples[0].id)
  const [openingId, setOpeningId] = useState(OPENING_OPTIONS[0].id)
  const [selectedOpening, setSelectedOpening] = useState('')
  const [selectedReason, setSelectedReason] = useState('')
  const [selectedExample, setSelectedExample] = useState('')
  const [selectedFinal, setSelectedFinal] = useState('')

  const direction = useMemo(
    () => ANSWER_DIRECTIONS.find((item) => item.id === directionId) || ANSWER_DIRECTIONS[0],
    [directionId]
  )
  const reasonChoices = direction.reasons
  const exampleChoices = direction.examples
  const reasonAnchor = reasonChoices.find((item) => item.id === reasonAnchorId) || reasonChoices[0]
  const exampleAnchor = exampleChoices.find((item) => item.id === exampleAnchorId) || exampleChoices[0]

  const openingOptions = useMemo(
    () =>
      OPENING_OPTIONS.map((option) => ({
        id: option.id,
        label: option.label,
        line: ensurePeriod(option.build(direction.answerCore)),
      })),
    [direction.answerCore]
  )
  const reasonOptions = useMemo(
    () =>
      uniqueOptions([
        reasonAnchor.line,
        reasonAnchor.line.replace('I have ', 'I have really ').replace('I am ', 'I am definitely '),
        reasonAnchor.line.replace('I learned that', 'Over time, I learned that'),
      ]).slice(0, 3),
    [reasonAnchor.line]
  )
  const exampleOptions = useMemo(
    () =>
      uniqueOptions([
        exampleAnchor.line,
        exampleAnchor.line.replace('For example, ', 'For instance, '),
        exampleAnchor.line.replace('and I learned that', 'which taught me that'),
      ]).slice(0, 3),
    [exampleAnchor.line]
  )
  const finalOptions = useMemo(
    () =>
      uniqueOptions([
        [selectedOpening, selectedReason, selectedExample].filter(Boolean).join(' '),
        [selectedOpening, selectedReason, selectedExample.replace(/^For (example|instance),\s*/i, 'For example, ')].filter(Boolean).join(' '),
        [selectedOpening, selectedReason.replace(/^Over time,\s*/i, ''), selectedExample].filter(Boolean).join(' '),
      ]).slice(0, 3),
    [selectedExample, selectedOpening, selectedReason]
  )

  useEffect(() => {
    if (!reasonChoices.some((item) => item.id === reasonAnchorId)) {
      setReasonAnchorId(reasonChoices[0].id)
    }
  }, [reasonAnchorId, reasonChoices])

  useEffect(() => {
    if (!exampleChoices.some((item) => item.id === exampleAnchorId)) {
      setExampleAnchorId(exampleChoices[0].id)
    }
  }, [exampleAnchorId, exampleChoices])

  useEffect(() => {
    const opening = openingOptions.find((item) => item.id === openingId)?.line || openingOptions[0]?.line || ''
    setSelectedOpening(opening)
  }, [openingId, openingOptions])

  useEffect(() => {
    if (!selectedReason || !reasonOptions.includes(selectedReason)) {
      setSelectedReason(reasonOptions[0] || '')
    }
  }, [reasonOptions, selectedReason])

  useEffect(() => {
    if (!selectedExample || !exampleOptions.includes(selectedExample)) {
      setSelectedExample(exampleOptions[0] || '')
    }
  }, [exampleOptions, selectedExample])

  useEffect(() => {
    if (!selectedFinal || !finalOptions.includes(selectedFinal)) {
      setSelectedFinal(finalOptions[0] || '')
    }
  }, [finalOptions, selectedFinal])

  function handleBack() {
    if (step === 'reason_anchor') setStep('direction')
    else if (step === 'example_anchor') setStep('reason_anchor')
    else if (step === 'opening') setStep('example_anchor')
    else if (step === 'reason') setStep('opening')
    else if (step === 'example') setStep('reason')
    else if (step === 'final') setStep('example')
  }

  function handleNext() {
    if (step === 'direction') setStep('reason_anchor')
    else if (step === 'reason_anchor') setStep('example_anchor')
    else if (step === 'example_anchor') setStep('opening')
    else if (step === 'opening') setStep('reason')
    else if (step === 'reason') setStep('example')
    else if (step === 'example') setStep('final')
    else onComplete()
  }

  const flaggedSummary = summarizeAnswer(originalAnswer)

  return (
    <div className="flex h-full flex-col overflow-hidden rounded-[2rem] border border-slate-200 bg-[linear-gradient(180deg,#ffffff_0%,#f8fbff_100%)] shadow-[0_16px_30px_rgba(15,23,42,0.06)]">
      <div className="shrink-0 border-b border-slate-200 px-5 py-5">
        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">
          Handling Uncertainty Workshop
        </p>
        <h3 className="mt-2 text-xl font-extrabold text-slate-900 md:text-2xl">
          Practice recovering into a strong answer
        </h3>
        <p className="mt-3 rounded-2xl bg-slate-50 px-4 py-3 text-sm leading-6 text-slate-700">
          {PRACTICE_QUESTION}
        </p>
        <p className="mt-3 text-sm leading-6 text-slate-600">
          This workshop uses one common HR screen question so you can practice the recovery move with control: pause, frame, answer, support.
        </p>
        {originalQuestion || flaggedSummary ? (
          <div className="mt-4 rounded-2xl border border-slate-200 bg-white px-4 py-4">
            <div className="flex items-start gap-3">
              <MessageSquareText className="mt-0.5 h-5 w-5 shrink-0 text-slate-500" />
              <div>
                <p className="text-xs font-bold uppercase tracking-wide text-slate-500">Your flagged moment</p>
                {originalQuestion ? (
                  <p className="mt-1 text-sm font-semibold text-slate-800">{originalQuestion}</p>
                ) : null}
                {flaggedSummary ? (
                  <p className="mt-2 text-sm leading-6 text-slate-600">{flaggedSummary}</p>
                ) : null}
              </div>
            </div>
          </div>
        ) : null}
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto px-5 py-5">
        {step === 'direction' ? (
          <div>
            <h4 className="text-lg font-bold text-slate-900">Which answer direction feels most true for you?</h4>
            <p className="mt-2 text-sm leading-6 text-slate-600">
              Pick one clear development area. The goal is to choose an answer quickly instead of thinking out loud.
            </p>
            <div className="mt-5 space-y-3">
              {ANSWER_DIRECTIONS.map((option) => (
                <SelectionCard
                  key={option.id}
                  title={option.label}
                  description={option.description}
                  selected={directionId === option.id}
                  onClick={() => setDirectionId(option.id)}
                />
              ))}
            </div>
          </div>
        ) : null}

        {step === 'reason_anchor' ? (
          <div>
            <h4 className="text-lg font-bold text-slate-900">Why is that still something you are working on?</h4>
            <p className="mt-2 text-sm leading-6 text-slate-600">
              Pick the explanation that feels most true. This will become the backbone of your Reason.
            </p>
            <div className="mt-5 space-y-3">
              {reasonChoices.map((option) => (
                <SelectionCard
                  key={option.id}
                  title={option.label}
                  description="This helps the answer sound thoughtful instead of abrupt."
                  selected={reasonAnchorId === option.id}
                  onClick={() => setReasonAnchorId(option.id)}
                />
              ))}
            </div>
          </div>
        ) : null}

        {step === 'example_anchor' ? (
          <div>
            <h4 className="text-lg font-bold text-slate-900">Which kind of example best supports that answer?</h4>
            <p className="mt-2 text-sm leading-6 text-slate-600">
              Pick the example angle that makes the answer sound most believable.
            </p>
            <div className="mt-5 space-y-3">
              {exampleChoices.map((option) => (
                <SelectionCard
                  key={option.id}
                  title={option.label}
                  description="This gives the answer real proof without turning it into a long story."
                  selected={exampleAnchorId === option.id}
                  onClick={() => setExampleAnchorId(option.id)}
                />
              ))}
            </div>
          </div>
        ) : null}

        {step === 'opening' ? (
          <div>
            <h4 className="text-lg font-bold text-slate-900">Choose your opening</h4>
            <p className="mt-2 text-sm leading-6 text-slate-600">
              Pick the version that sounds most natural out loud if you need a second before answering.
            </p>
            <div className="mt-5 space-y-3">
              {openingOptions.map((option) => (
                <SelectionCard
                  key={option.id}
                  title={option.line}
                  description={option.id === 'direct' ? 'Most direct' : option.id === 'good_question' ? 'Short recovery line first' : 'A slightly softer transition before the answer'}
                  selected={openingId === option.id}
                  onClick={() => setOpeningId(option.id)}
                />
              ))}
            </div>
          </div>
        ) : null}

        {step === 'reason' ? (
          <div>
            <h4 className="text-lg font-bold text-slate-900">Choose your Reason</h4>
            <p className="mt-2 text-sm leading-6 text-slate-600">
              Pick the line that best explains why this answer is true for you.
            </p>
            <div className="mt-5 space-y-3">
              {reasonOptions.map((option) => (
                <SelectionCard
                  key={option}
                  title={option}
                  description="This should sound specific enough to explain the answer, but still natural to say out loud."
                  selected={selectedReason === option}
                  onClick={() => setSelectedReason(option)}
                />
              ))}
            </div>
          </div>
        ) : null}

        {step === 'example' ? (
          <div>
            <h4 className="text-lg font-bold text-slate-900">Choose your Example</h4>
            <p className="mt-2 text-sm leading-6 text-slate-600">
              Pick the short example that proves the answer without turning it into a long story.
            </p>
            <div className="mt-5 space-y-3">
              {exampleOptions.map((option) => (
                <SelectionCard
                  key={option}
                  title={option}
                  description="The strongest example is short, real, and clearly tied to the answer."
                  selected={selectedExample === option}
                  onClick={() => setSelectedExample(option)}
                />
              ))}
            </div>
          </div>
        ) : null}

        {step === 'final' ? (
          <div>
            <h4 className="text-lg font-bold text-slate-900">Choose your final answer</h4>
            <p className="mt-2 text-sm leading-6 text-slate-600">
              Pick the version that sounds the most direct, thoughtful, and believable.
            </p>
            <div className="mt-5 space-y-4">
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
          </div>
        ) : null}
      </div>

      <div className="shrink-0 border-t border-slate-200 px-5 py-4">
        {step !== 'direction' ? (
          <div className="mb-4 rounded-3xl bg-slate-50 px-4 py-4">
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-400">
              Answer so far
            </p>
            <p className="mt-2 text-sm leading-6 text-slate-700">
              {[selectedOpening, selectedReason, selectedExample].filter(Boolean).join(' ')}
            </p>
          </div>
        ) : null}

        <div className="flex items-center justify-between gap-3">
          <button
            type="button"
            onClick={handleBack}
            disabled={step === 'direction'}
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
