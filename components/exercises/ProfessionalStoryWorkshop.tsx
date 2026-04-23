'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { ArrowRight, CheckCircle2 } from 'lucide-react'

type WorkshopPhase = 'collect' | 'refine' | 'practice'
type StorySection = 'present' | 'past' | 'future'

interface WorkshopAnswers {
  title: string
  focus: string
  problems: string
  pastRoles: string
  pattern: string
  foundation: string
  nextWork: string
  logicalStep: string
}

interface Question {
  key: keyof WorkshopAnswers
  section: StorySection
  text: string
  placeholder: string
  hint: string
}

interface ProfessionalStoryWorkshopProps {
  onComplete: () => void
}

const SECTION_STYLES: Record<StorySection, { text: string; bg: string; border: string; dot: string; label: string }> = {
  present: {
    text: 'text-amber-700',
    bg: 'bg-amber-50',
    border: 'border-amber-200',
    dot: 'bg-amber-500',
    label: 'Present',
  },
  past: {
    text: 'text-emerald-700',
    bg: 'bg-emerald-50',
    border: 'border-emerald-200',
    dot: 'bg-emerald-500',
    label: 'Past',
  },
  future: {
    text: 'text-rose-700',
    bg: 'bg-rose-50',
    border: 'border-rose-200',
    dot: 'bg-rose-500',
    label: 'Future',
  },
}

const QUESTIONS: Question[] = [
  {
    key: 'title',
    section: 'present',
    text: 'What is your current job title?',
    placeholder: 'e.g. Operations Coordinator',
    hint: 'Just the title for now.',
  },
  {
    key: 'focus',
    section: 'present',
    text: 'What does most of your work actually focus on?',
    placeholder: 'e.g. coordinating projects across teams and keeping priorities aligned',
    hint: 'Not your title. What do you actually spend your time doing?',
  },
  {
    key: 'problems',
    section: 'present',
    text: 'What kind of problems or decisions does your work center on?',
    placeholder: 'e.g. making sure work keeps moving when priorities shift',
    hint: 'Optional. Include it only if it sharpens the sentence.',
  },
  {
    key: 'pastRoles',
    section: 'past',
    text: 'List your 2–3 most relevant past roles.',
    placeholder: 'e.g. Project Coordinator at Grainger, Support Lead at Cintas',
    hint: 'Do not worry about order. Just name them.',
  },
  {
    key: 'pattern',
    section: 'past',
    text: 'What kept showing up across those roles?',
    placeholder: 'e.g. staying organized, communicating clearly, adapting when plans changed',
    hint: 'What did those jobs keep requiring you to do well?',
  },
  {
    key: 'foundation',
    section: 'past',
    text: 'In one sentence, what foundation did those experiences build?',
    placeholder: 'e.g. a foundation in coordination work that depends on follow-through',
    hint: 'Think pattern, not resume.',
  },
  {
    key: 'nextWork',
    section: 'future',
    text: 'What kind of work do you want more of in your next role?',
    placeholder: 'e.g. operations and coordination work with more ownership',
    hint: 'Be specific. Avoid “I want to grow” or “I want a new challenge.”',
  },
  {
    key: 'logicalStep',
    section: 'future',
    text: 'Why does this next move feel like a logical step, not just a change?',
    placeholder: 'e.g. it builds directly on the coordination pattern I’ve developed',
    hint: 'What connects where you have been to where you are going?',
  },
]

const EMPTY_ANSWERS: WorkshopAnswers = {
  title: '',
  focus: '',
  problems: '',
  pastRoles: '',
  pattern: '',
  foundation: '',
  nextWork: '',
  logicalStep: '',
}

function buildStory(answers: WorkshopAnswers) {
  const present = answers.focus
    ? `Right now, most of my work is focused on ${answers.focus}${answers.problems ? `, especially ${answers.problems}` : ''}.`
    : answers.title
      ? `Right now, I work as a ${answers.title}.`
      : ''

  const past = answers.foundation
    ? `Before that, I built my foundation in roles where ${answers.foundation}.`
    : answers.pattern
      ? `Before that, I built my foundation in roles where I had to ${answers.pattern}.`
      : ''

  const future = answers.nextWork
    ? `Going forward, I want to keep building in ${answers.nextWork}${answers.logicalStep ? ` because ${answers.logicalStep}` : ''}.`
    : ''

  return { present, past, future }
}

function joinFullAnswer(story: ReturnType<typeof buildStory>) {
  return [story.present, story.past, story.future].filter(Boolean).join(' ')
}

export default function ProfessionalStoryWorkshop({
  onComplete,
}: ProfessionalStoryWorkshopProps) {
  const [phase, setPhase] = useState<WorkshopPhase>('collect')
  const [questionIndex, setQuestionIndex] = useState(0)
  const [answers, setAnswers] = useState<WorkshopAnswers>(EMPTY_ANSWERS)
  const [inputValue, setInputValue] = useState('')
  const [draft, setDraft] = useState(buildStory(EMPTY_ANSWERS))
  const textAreaRef = useRef<HTMLTextAreaElement | null>(null)

  const currentQuestion = QUESTIONS[questionIndex]

  useEffect(() => {
    if (phase === 'collect') {
      textAreaRef.current?.focus()
    }
  }, [phase, questionIndex])

  const liveAnswers = useMemo(() => {
    if (phase !== 'collect') return answers
    return {
      ...answers,
      [currentQuestion.key]: inputValue,
    }
  }, [answers, currentQuestion.key, inputValue, phase])

  const liveStory = useMemo(() => buildStory(liveAnswers), [liveAnswers])
  const currentStory = phase === 'collect' ? liveStory : draft
  const fullAnswer = joinFullAnswer(currentStory)

  const canAdvance = inputValue.trim().length > 0

  const handleAdvance = () => {
    if (!canAdvance) return

    const nextAnswers = {
      ...answers,
      [currentQuestion.key]: inputValue.trim(),
    }

    setAnswers(nextAnswers)
    setInputValue('')

    if (questionIndex < QUESTIONS.length - 1) {
      setQuestionIndex(questionIndex + 1)
      return
    }

    setDraft(buildStory(nextAnswers))
    setPhase('refine')
  }

  return (
    <div className="flex h-full flex-col gap-5">
      <div className="shrink-0">
        <p className="text-xs font-black uppercase tracking-[0.14em] text-violet-600">Workshop</p>
        <h3 className="mt-2 text-xl font-extrabold text-slate-900 md:text-2xl">Build your Professional Story</h3>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600">
          We&apos;re going to collect the raw material first, then shape it into a stronger draft. No grading yet. The goal here is to help you see your answer take form in real time.
        </p>
      </div>

      <div className="grid min-h-0 flex-1 gap-5 md:grid-cols-[0.9fr,1.1fr]">
        <div className="flex min-h-0 flex-col rounded-[1.6rem] border border-slate-200 bg-white px-5 py-5 shadow-[0_12px_24px_rgba(15,23,42,0.05)]">
          {phase === 'collect' ? (
            <>
              <div className="mb-5 flex gap-2">
                {QUESTIONS.map((question, index) => (
                  <div
                    key={`${question.key}-${index}`}
                    className={`h-2 flex-1 rounded-full transition-colors ${
                      index <= questionIndex ? SECTION_STYLES[question.section].dot : 'bg-slate-200'
                    }`}
                  />
                ))}
              </div>

              <p className="text-[11px] font-black uppercase tracking-[0.14em] text-slate-500">Step 1 of 3</p>
              <h4 className="mt-2 text-lg font-extrabold text-slate-900">Build your raw material</h4>
              <div className={`mt-4 inline-flex w-fit items-center gap-2 rounded-full border px-3 py-1 ${SECTION_STYLES[currentQuestion.section].bg} ${SECTION_STYLES[currentQuestion.section].border}`}>
                <span className={`h-2.5 w-2.5 rounded-full ${SECTION_STYLES[currentQuestion.section].dot}`} />
                <span className={`text-xs font-black uppercase tracking-[0.14em] ${SECTION_STYLES[currentQuestion.section].text}`}>
                  {SECTION_STYLES[currentQuestion.section].label}
                </span>
              </div>

              <p className="mt-5 text-base font-bold leading-snug text-slate-900">{currentQuestion.text}</p>
              <p className="mt-2 text-sm leading-6 text-slate-500">{currentQuestion.hint}</p>

              <textarea
                ref={textAreaRef}
                value={inputValue}
                onChange={(event) => setInputValue(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === 'Enter' && !event.shiftKey && canAdvance) {
                    event.preventDefault()
                    handleAdvance()
                  }
                }}
                placeholder={currentQuestion.placeholder}
                className="mt-4 min-h-[112px] w-full resize-none rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm leading-6 text-slate-800 outline-none transition focus:border-violet-300 focus:ring-4 focus:ring-violet-100"
              />

              <div className="mt-auto flex items-end justify-end border-t border-slate-200/80 pt-5">
                <button
                  onClick={handleAdvance}
                  disabled={!canAdvance}
                  className="btn-coach-primary flex min-w-[188px] items-center justify-center gap-2 px-6 py-3 disabled:opacity-50"
                >
                  {questionIndex < QUESTIONS.length - 1 ? 'Next' : 'Build my draft'}
                  <ArrowRight className="h-4 w-4" />
                </button>
              </div>
            </>
          ) : null}

          {phase === 'refine' ? (
            <>
              <p className="text-[11px] font-black uppercase tracking-[0.14em] text-slate-500">Step 2 of 3</p>
              <h4 className="mt-2 text-lg font-extrabold text-slate-900">Refine your three sentences</h4>
              <p className="mt-2 text-sm leading-6 text-slate-500">
                Keep the logic clean: present first, past as a through-line, future as a logical next step.
              </p>

              <div className="mt-5 space-y-4">
                {(['present', 'past', 'future'] as StorySection[]).map((section) => (
                  <div key={section} className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4">
                    <p className={`text-xs font-black uppercase tracking-[0.14em] ${SECTION_STYLES[section].text}`}>
                      {SECTION_STYLES[section].label}
                    </p>
                    <textarea
                      value={draft[section]}
                      onChange={(event) => setDraft((current) => ({ ...current, [section]: event.target.value }))}
                      placeholder={
                        section === 'present'
                          ? 'Right now, most of my work is focused on...'
                          : section === 'past'
                            ? 'Before that, I built my foundation in roles where...'
                            : 'Going forward, I want to keep building in...'
                      }
                      className="mt-3 min-h-[90px] w-full resize-none rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm leading-6 text-slate-800 outline-none transition focus:border-violet-300 focus:ring-4 focus:ring-violet-100"
                    />
                  </div>
                ))}
              </div>

              <div className="mt-auto flex items-end justify-end border-t border-slate-200/80 pt-5">
                <button
                  onClick={() => setPhase('practice')}
                  disabled={!fullAnswer.trim()}
                  className="btn-coach-primary flex min-w-[188px] items-center justify-center gap-2 px-6 py-3 disabled:opacity-50"
                >
                  I&apos;m ready to practice it
                  <ArrowRight className="h-4 w-4" />
                </button>
              </div>
            </>
          ) : null}

          {phase === 'practice' ? (
            <>
              <p className="text-[11px] font-black uppercase tracking-[0.14em] text-slate-500">Step 3 of 3</p>
              <h4 className="mt-2 text-lg font-extrabold text-slate-900">Say it out loud</h4>
              <p className="mt-2 text-sm leading-6 text-slate-500">
                This is where the draft turns into something usable. Read it a few times, then say it again without staring at every word.
              </p>

              <div className="mt-5 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-4">
                <p className="text-xs font-black uppercase tracking-[0.14em] text-emerald-700">Practice checklist</p>
                <div className="mt-3 space-y-3">
                  {[
                    'Lead with what you do now.',
                    'Keep the past focused on a pattern, not a timeline.',
                    'Make the future sound specific and logical.',
                    'Say it like you are in the room, not reading a script.',
                  ].map((item) => (
                    <div key={item} className="flex items-start gap-3">
                      <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" />
                      <p className="text-sm leading-6 text-emerald-900">{item}</p>
                    </div>
                  ))}
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
            </>
          ) : null}
        </div>

        <div className="min-h-0 rounded-[1.6rem] border border-slate-200 bg-white px-5 py-5 shadow-[0_12px_24px_rgba(15,23,42,0.05)]">
          <p className="text-[11px] font-black uppercase tracking-[0.14em] text-slate-500">
            {phase === 'collect' ? 'Your story is forming' : 'Your draft'}
          </p>

          <div className="mt-5 space-y-5">
            {(['present', 'past', 'future'] as StorySection[]).map((section) => (
              <div key={section}>
                <p className={`text-xs font-black uppercase tracking-[0.14em] ${SECTION_STYLES[section].text}`}>
                  {SECTION_STYLES[section].label}
                </p>
                <div className={`mt-2 rounded-2xl border px-4 py-4 ${SECTION_STYLES[section].bg} ${SECTION_STYLES[section].border}`}>
                  <p className={`text-sm leading-7 ${currentStory[section] ? 'text-slate-800' : 'text-slate-400 italic'}`}>
                    {currentStory[section] || `Your ${SECTION_STYLES[section].label.toLowerCase()} sentence will appear here as you build it.`}
                  </p>
                </div>
              </div>
            ))}
          </div>

          <div className="mt-5 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4">
            <p className="text-xs font-black uppercase tracking-[0.14em] text-slate-500">Full answer</p>
            <p className={`mt-3 text-sm leading-7 ${fullAnswer ? 'text-slate-800' : 'text-slate-400 italic'}`}>
              {fullAnswer || 'As you answer the prompts, your full professional story will build here in real time.'}
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
