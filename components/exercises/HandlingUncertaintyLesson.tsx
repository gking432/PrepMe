'use client'

import { type ReactNode, useMemo, useState } from 'react'
import { ArrowRight, BookOpen, Check, Eye, Lightbulb, RotateCcw, Sparkles } from 'lucide-react'
import {
  type AnswerLane,
  type LaneInfo,
  type QuizDrill,
  buildQuiz,
  DIFFICULT_QUESTIONS,
  LANE_LABEL,
  LANE_OPTIONS,
  QUIZ_PASS_THRESHOLD,
  RESET_PHRASE_BANK,
} from '@/lib/handling-uncertainty-bank'

interface HandlingUncertaintyLessonProps {
  sessionId?: string
  originalQuestion?: string
  originalAnswer?: string
  onComplete: () => void
}

type Phase =
  | 'intro'
  | 'part1' | 'part1_check'
  | 'part2'
  | 'part3' | 'part3_check'
  | 'part4' | 'part4_check_1' | 'part4_check_2'
  | 'part5' | 'part5_check_1' | 'part5_check_2'
  | 'part6' | 'part6_check'
  | 'part7' | 'part7_check_1' | 'part7_check_2'
  | 'quiz_intro' | 'quiz_q1' | 'quiz_q2' | 'quiz_q3' | 'quiz_q4' | 'quiz_q5'
  | 'result'

const PHASE_ORDER: Phase[] = [
  'intro',
  'part1', 'part1_check',
  'part2',
  'part3', 'part3_check',
  'part4', 'part4_check_1', 'part4_check_2',
  'part5', 'part5_check_1', 'part5_check_2',
  'part6', 'part6_check',
  'part7', 'part7_check_1', 'part7_check_2',
  'quiz_intro', 'quiz_q1', 'quiz_q2', 'quiz_q3', 'quiz_q4', 'quiz_q5',
  'result',
]

const PART_STAGE: Record<string, number> = {
  intro: 0,
  part1: 1, part1_check: 1,
  part2: 2,
  part3: 3, part3_check: 3,
  part4: 4, part4_check_1: 4, part4_check_2: 4,
  part5: 5, part5_check_1: 5, part5_check_2: 5,
  part6: 6, part6_check: 6,
  part7: 7, part7_check_1: 7, part7_check_2: 7,
  quiz_intro: 8, quiz_q1: 8, quiz_q2: 8, quiz_q3: 8, quiz_q4: 8, quiz_q5: 8,
  result: 9,
}

// Convenience accessor — find a question in the bank by id (used for the
// teaching examples in parts 3–7 that reference specific bank questions).
function getQ(id: string) {
  const q = DIFFICULT_QUESTIONS.find((x) => x.id === id)
  if (!q) throw new Error(`Bank missing question: ${id}`)
  return q
}

export default function HandlingUncertaintyLesson({
  originalQuestion,
  originalAnswer,
  onComplete,
}: HandlingUncertaintyLessonProps) {
  const [phase, setPhase] = useState<Phase>('intro')
  const [quizKey, setQuizKey] = useState(0)
  const quiz = useMemo<QuizDrill[]>(() => buildQuiz(), [quizKey])
  const [quizCorrect, setQuizCorrect] = useState(0)
  const [showPhraseBank, setShowPhraseBank] = useState(false)

  const stage = PART_STAGE[phase] ?? 0

  function advance() {
    const idx = PHASE_ORDER.indexOf(phase)
    if (idx >= 0 && idx < PHASE_ORDER.length - 1) setPhase(PHASE_ORDER[idx + 1])
  }

  function answerQuiz(correct: boolean) {
    if (correct) setQuizCorrect((c) => c + 1)
    advance()
  }

  function retryQuiz() {
    setQuizCorrect(0)
    setQuizKey((k) => k + 1)
    setPhase('quiz_intro')
  }

  return (
    <div className="flex h-full flex-col overflow-y-auto">
      {phase !== 'intro' && phase !== 'result' && <ProgressBar stage={stage} />}
      <div className="mx-auto w-full max-w-2xl px-4 py-6">{renderPhase()}</div>
    </div>
  )

  function renderPhase(): ReactNode {
    switch (phase) {
      // ─── Intro ─────────────────────────────────────────────────────────────
      case 'intro':
        return (
          <div className="space-y-5">
            <div>
              <p className="text-[10px] font-black uppercase tracking-[0.16em] text-violet-600">
                The Reset Lesson
              </p>
              <h2 className="mt-1 text-lg font-black text-slate-900">
                What to do when your brain blanks in an interview
              </h2>
              <p className="mt-2 text-sm leading-6 text-slate-500">
                Most people don’t ramble because they have nothing to say. They ramble because they
                start talking before they know what kind of answer the question needs. Your first job
                isn’t to produce the perfect answer — it’s to slow the moment down.
              </p>
            </div>

            {(originalQuestion || originalAnswer) && (
              <div className="space-y-3 rounded-2xl border-2 border-slate-200 bg-slate-50 p-4">
                {originalQuestion && (
                  <div>
                    <p className="text-[10px] font-black uppercase tracking-[0.14em] text-slate-400">
                      The question that tripped you up
                    </p>
                    <p className="mt-1 text-sm font-semibold leading-6 text-slate-800">
                      {originalQuestion}
                    </p>
                  </div>
                )}
                {originalAnswer && (
                  <div>
                    <p className="text-[10px] font-black uppercase tracking-[0.14em] text-slate-400">
                      What you said
                    </p>
                    <p className="mt-1 text-sm leading-6 text-slate-600">{originalAnswer}</p>
                  </div>
                )}
              </div>
            )}

            <div className="rounded-2xl border-2 border-violet-200 bg-violet-50/50 p-4">
              <p className="text-[10px] font-black uppercase tracking-[0.14em] text-violet-600">
                What you’ll learn
              </p>
              <p className="mt-2 text-base font-black leading-7 text-slate-900">
                Rephrase → Pause → Cue Words → Pick a Lane → Start Clean
              </p>
              <p className="mt-2 text-xs leading-5 text-slate-500">
                Plus the emergency move: how to reset mid-answer when you’re already rambling.
              </p>
            </div>

            <PrimaryButton onClick={advance} icon={<Sparkles className="h-4 w-4" />}>
              Let’s go
            </PrimaryButton>
          </div>
        )

      // ─── Part 1: Why rambling happens ─────────────────────────────────────
      case 'part1':
        return (
          <PartLayout
            partNum={1}
            title="Why answers go sideways"
            body="Most people don’t ramble because they have nothing to say. They ramble because they start talking before they know what kind of answer the question needs. Tap each card to see what’s really happening."
          >
            <FlipCardRow
              cards={[
                {
                  front: 'The freeze',
                  back: 'You hear the question, but your brain doesn’t immediately find an example or answer.',
                  color: 'sky',
                },
                {
                  front: 'The panic response',
                  back: 'You start talking to avoid silence. That usually creates a vague, roundabout answer.',
                  color: 'amber',
                },
                {
                  front: 'The better move',
                  back: 'Pause, simplify the question, jot 2–3 cue words, then choose the kind of answer to give.',
                  color: 'emerald',
                },
              ]}
            />
            <PrimaryButton onClick={advance}>Continue</PrimaryButton>
          </PartLayout>
        )

      case 'part1_check':
        return (
          <PartLayout partNum={1} title="Quick check" body="What’s the real problem when someone starts rambling?">
            <CheckQuestion
              options={[
                'They’re not qualified for the role.',
                'They started talking before they had a lane.',
                'They need to give a longer answer.',
                'They should memorize more scripted answers.',
              ]}
              correctIndex={1}
              feedback="Exactly. Rambling usually means the answer started before the structure was chosen."
              onContinue={advance}
            />
          </PartLayout>
        )

      // ─── Part 2: The reset line ────────────────────────────────────────────
      case 'part2':
        return (
          <PartLayout
            partNum={2}
            title="The first sentence matters"
            body="When a question catches you off guard, don’t rush. A reset line buys you a few seconds and gives your brain a clearer search target."
          >
            <div className="rounded-2xl border-2 border-violet-300 bg-violet-50 p-4">
              <p className="text-[10px] font-black uppercase tracking-[0.14em] text-violet-600">
                The main formula
              </p>
              <p className="mt-2 text-sm font-bold leading-7 text-violet-900">
                “Yeah, so{' '}
                <span className="underline decoration-violet-400 decoration-2 underline-offset-2">
                  [simpler version of the question]
                </span>
                … let me think about that for a second.”
              </p>
            </div>

            <div className="rounded-2xl border-2 border-amber-200 bg-amber-50 p-4">
              <p className="text-[10px] font-black uppercase tracking-[0.14em] text-amber-700">
                Phone screen version
              </p>
              <p className="mt-2 text-sm leading-6 text-amber-900">
                “Yeah, so [simpler version]… let me jot that down for a second.” On a phone screen,
                keep a pen and paper next to you — writing 2–3 cue words stops the answer from
                drifting.
              </p>
            </div>

            <p className="text-xs font-bold uppercase tracking-[0.14em] text-slate-500">
              Why each piece works — tap to flip
            </p>
            <FlipCardRow
              cards={[
                {
                  front: 'Why say the question back?',
                  back: 'It turns a big formal question into a smaller search term your brain can actually work with.',
                  color: 'sky',
                },
                {
                  front: 'Why pause?',
                  back: 'A thoughtful 2-second pause sounds way better than 20 seconds of filler.',
                  color: 'violet',
                },
                {
                  front: 'Why jot notes?',
                  back: 'Two or three cue words anchor the answer so it doesn’t wander off-topic.',
                  color: 'emerald',
                },
              ]}
            />
            <PrimaryButton onClick={advance}>Continue</PrimaryButton>
          </PartLayout>
        )

      // ─── Part 3: Rephrase ──────────────────────────────────────────────────
      case 'part3':
        return (
          <PartLayout
            partNum={3}
            title="Make the question smaller"
            body="Interview questions sound big because they’re worded formally. Translate them into plain language and answer the simple version. Tap to reveal the simpler version of each."
          >
            <RevealList
              items={[
                {
                  hidden: 'Formal',
                  shown: 'Tell me about a time you had to influence someone without formal authority.',
                  plain: 'A time I had to get someone bought in even though I wasn’t their manager.',
                },
                {
                  hidden: 'Formal',
                  shown: 'What would you want to learn quickly if you started here?',
                  plain: 'What I’d want to get up to speed on first.',
                },
                {
                  hidden: 'Formal',
                  shown: 'What’s something on your resume you’d want to explain more clearly?',
                  plain: 'What part of my background might need more context.',
                },
              ]}
            />
            <PrimaryButton onClick={advance}>Continue</PrimaryButton>
          </PartLayout>
        )

      case 'part3_check':
        return (
          <PartLayout
            partNum={3}
            title="Quick check"
            body="This question is not asking what your favorite job was. It’s asking where your resume might create confusion or need context."
          >
            <QuestionContext question={getQ('resume_explain').question} />
            <p className="text-sm font-extrabold text-slate-700">What is this really asking?</p>
            <CheckQuestion
              options={[
                'Which job on my resume was my favorite?',
                'What part of my background might need more context?',
                'What part of my resume would I remove?',
                'Why is my resume better than other candidates’?',
              ]}
              correctIndex={1}
              feedback="Right. The interviewer is looking for where context would help — not what you’re proudest of."
              onContinue={advance}
            />
          </PartLayout>
        )

      // ─── Part 4: Cue words ────────────────────────────────────────────────
      case 'part4':
        return (
          <PartLayout
            partNum={4}
            title="Give your brain a place to search"
            body="When you freeze, don’t try to find the full answer immediately. Jot 2–3 cue words — the right cue words point your brain at a specific story, not a vague topic."
          >
            <div className="rounded-2xl border-2 border-slate-200 bg-white p-4">
              <p className="text-xs leading-5 text-slate-500">For the question:</p>
              <p className="mt-1 text-sm font-bold leading-6 text-slate-800">
                “Tell me about a time you disagreed with a coworker and how you handled it.”
              </p>
              <div className="mt-3 grid gap-2 sm:grid-cols-2">
                <CueChipRow label="Good" tone="amber" chips={['disagreed', 'coworker', 'handled it']} />
                <CueChipRow label="Better" tone="emerald" chips={['conflict', 'specific example', 'what I did']} />
              </div>
              <p className="mt-3 text-xs leading-5 text-slate-500">
                Both work, but the second set explicitly points to a real story and an action you took.
              </p>
            </div>
            <PrimaryButton onClick={advance}>Continue</PrimaryButton>
          </PartLayout>
        )

      case 'part4_check_1': {
        const q = getQ('disagree_coworker')
        return (
          <PartLayout partNum={4} title="Pick the cue words" body="Which set would help most for this question?">
            <QuestionContext question={q.question} />
            <CheckQuestion
              options={q.cueWordOptions.options}
              correctIndex={q.cueWordOptions.correctIndex}
              feedback={q.explanation}
              onContinue={advance}
            />
          </PartLayout>
        )
      }

      case 'part4_check_2': {
        const q = getQ('learn_quickly')
        return (
          <PartLayout
            partNum={4}
            title="Harder one"
            body="This question isn’t asking whether you’re a fast learner. It’s asking what you’d prioritize learning first."
          >
            <QuestionContext question={q.question} />
            <CheckQuestion
              options={q.cueWordOptions.options}
              correctIndex={q.cueWordOptions.correctIndex}
              feedback={q.explanation}
              onContinue={advance}
            />
          </PartLayout>
        )
      }

      // ─── Part 5: Pick the lane ────────────────────────────────────────────
      case 'part5':
        return (
          <PartLayout
            partNum={5}
            title="Choose the kind of answer"
            body="Once you’ve simplified the question, choose the lane. The lane tells you what kind of answer to give. Tap any lane to see when to use it and how to start."
          >
            <div className="grid gap-2 sm:grid-cols-2">
              {LANE_OPTIONS.map((lane) => (
                <LaneCard key={lane.id} lane={lane} />
              ))}
            </div>
            <PrimaryButton onClick={advance}>Continue</PrimaryButton>
          </PartLayout>
        )

      case 'part5_check_1': {
        const q = getQ('disagree_coworker')
        return (
          <PartLayout partNum={5} title="Pick the lane" body='“Tell me about a time…” usually points to one specific kind of answer.'>
            <QuestionContext question={q.question} />
            <LaneCheck correctLane={q.correctLane} feedback={q.explanation} onContinue={advance} />
          </PartLayout>
        )
      }

      case 'part5_check_2': {
        const q = getQ('learn_quickly')
        return (
          <PartLayout
            partNum={5}
            title="Harder lane"
            body="Same lane question — but this one’s easier to mis-route into a story."
          >
            <QuestionContext question={q.question} />
            <LaneCheck correctLane={q.correctLane} feedback={q.explanation} onContinue={advance} />
          </PartLayout>
        )
      }

      // ─── Part 6: Start clean ──────────────────────────────────────────────
      case 'part6':
        return (
          <PartLayout
            partNum={6}
            title="Don’t start with filler"
            body="A weak start is vague and general. A strong start points the answer in a specific direction. Tap to reveal the strong version of each."
          >
            <WeakStrongPair
              question={getQ('still_developing').question}
              weak="Honestly I work on everything. I’m always trying to improve."
              strong="Yeah, so one skill I’m actively working on improving… let me think about that for a second."
              why="The weak version is too broad. The strong version narrows the answer to one skill."
            />
            <WeakStrongPair
              question={getQ('learn_quickly').question}
              weak="I’m a fast learner, so I could pick up just about anything."
              strong="Yeah, so if I had to pick one thing I’d want to get up to speed on quickly… I’d probably start with how the team defines success in the first 90 days."
              why="The weak version talks about the candidate. The strong version answers the actual question."
            />
            <PrimaryButton onClick={advance}>Continue</PrimaryButton>
          </PartLayout>
        )

      case 'part6_check': {
        const q = getQ('learn_quickly')
        return (
          <PartLayout partNum={6} title="Choose the stronger start" body="Which start gives you the cleanest reset?">
            <QuestionContext question={q.question} />
            <CheckQuestion
              options={[
                '“I’m a fast learner, so honestly I could pick up just about anything.”',
                '“There’s probably a lot. It really depends on the team.”',
                '“Yeah, so if I had to pick one thing to learn quickly, I’d want to understand how success is measured in the first 90 days.”',
                '“I deal with new things all the time, so I’m not too worried about it.”',
              ]}
              correctIndex={2}
              feedback="It gives a direct priority instead of hiding behind “I’m a fast learner.”"
              onContinue={advance}
            />
          </PartLayout>
        )
      }

      // ─── Part 7: Mid-answer reset ─────────────────────────────────────────
      case 'part7':
        return (
          <PartLayout
            partNum={7}
            title="You can recover after you start rambling"
            body="Sometimes you’ll realize halfway through an answer that you’re not answering the question. Don’t keep digging. Use a reset phrase and return to the actual question."
          >
            <div className="rounded-2xl border-2 border-violet-200 bg-violet-50/40 p-4">
              <p className="text-[10px] font-black uppercase tracking-[0.14em] text-violet-600">
                Reset phrases
              </p>
              <ul className="mt-2 space-y-1.5">
                {[
                  '“Let me reset that more clearly.”',
                  '“The simpler answer is…”',
                  '“I’m giving too much context. The main point is…”',
                  '“Let me make sure I’m answering what you asked. You were asking about…”',
                ].map((phrase, i) => (
                  <li key={i} className="text-sm leading-6 text-slate-800">
                    {phrase}
                  </li>
                ))}
              </ul>
            </div>
            <PrimaryButton onClick={advance}>Continue</PrimaryButton>
          </PartLayout>
        )

      case 'part7_check_1':
        return (
          <PartLayout
            partNum={7}
            title="Pick the recovery"
            body="You realize you started answering a different question than the one you were asked."
          >
            <CheckQuestion
              options={[
                '“Anyway, that’s basically my answer.”',
                '“Let me make sure I’m actually answering what you asked. You were asking about…”',
                'Keep going so it doesn’t seem like a mistake.',
                '“Sorry, ignore all of that.”',
              ]}
              correctIndex={1}
              feedback="You don’t need to pretend the ramble didn’t happen. A clean reset sounds more composed than forcing the wrong answer to continue."
              onContinue={advance}
            />
          </PartLayout>
        )

      case 'part7_check_2':
        return (
          <PartLayout
            partNum={7}
            title="Harder recovery"
            body="You’re 30 seconds in and realize you’re giving general advice instead of the specific example they asked for."
          >
            <CheckQuestion
              options={[
                '“So yeah, communication is just really important.”',
                '“Let me make that more specific. The example that comes to mind is…”',
                '“That probably answers it.”',
                '“It really depends on the situation, but communication is the key.”',
              ]}
              correctIndex={1}
              feedback="This moves you cleanly from general talk back into the story lane."
              onContinue={advance}
            />
          </PartLayout>
        )

      // ─── Quiz ──────────────────────────────────────────────────────────────
      case 'quiz_intro':
        return (
          <PartLayout
            partNum={8}
            title="Final quiz"
            body="5 questions using real interview curveballs. You need 4 out of 5 to pass."
          >
            <div className="rounded-2xl border-2 border-violet-200 bg-violet-50/50 p-4">
              <ul className="space-y-1.5">
                {[
                  'Pick the better rephrase',
                  'Pick the best cue words',
                  'Pick the correct lane',
                  'Choose the stronger start',
                  'Choose the mid-answer reset',
                ].map((label, i) => (
                  <li key={i} className="flex items-center gap-2 text-sm font-bold text-slate-700">
                    <span className="flex h-5 w-5 items-center justify-center rounded-full bg-violet-200 text-[10px] font-black text-violet-800">
                      {i + 1}
                    </span>
                    {label}
                  </li>
                ))}
              </ul>
            </div>
            <PrimaryButton onClick={advance} icon={<Sparkles className="h-4 w-4" />}>
              Start the quiz
            </PrimaryButton>
          </PartLayout>
        )

      case 'quiz_q1':
      case 'quiz_q2':
      case 'quiz_q3':
      case 'quiz_q4':
      case 'quiz_q5': {
        const idx = Number(phase.replace('quiz_q', '')) - 1
        return (
          <PartLayout partNum={8} title={`Quiz · ${idx + 1} of 5`} body={QUIZ_PROMPT[quiz[idx].kind]}>
            <QuizScreen drill={quiz[idx]} onAnswer={answerQuiz} isLast={idx === 4} />
          </PartLayout>
        )
      }

      // ─── Result ────────────────────────────────────────────────────────────
      case 'result': {
        const passed = quizCorrect >= QUIZ_PASS_THRESHOLD
        return (
          <div className="space-y-5">
            <div className="rounded-2xl border-2 border-slate-200 bg-white p-5 text-center">
              <div
                className={`mx-auto flex h-16 w-16 items-center justify-center rounded-full ${
                  passed ? 'bg-emerald-100' : 'bg-amber-100'
                }`}
              >
                {passed ? (
                  <Check className="h-8 w-8 text-emerald-600" />
                ) : (
                  <RotateCcw className="h-8 w-8 text-amber-600" />
                )}
              </div>
              <h2 className="mt-3 text-lg font-black text-slate-900">
                {passed ? 'You’ve got the reset' : 'Almost there'}
              </h2>
              <p className="mt-1 text-sm font-bold text-slate-500">
                {quizCorrect} / {quiz.length} correct
              </p>
              <p className="mt-2 text-sm leading-6 text-slate-500">
                {passed
                  ? 'When a question catches you off guard, rephrase it, pause, pick a lane, and start. You don’t need the perfect answer — you need a clean start.'
                  : 'Review the reset and try the quiz again. You’re building muscle memory, not chasing a perfect score.'}
              </p>
            </div>

            <div className="rounded-2xl border-2 border-slate-200 bg-white">
              <button
                type="button"
                onClick={() => setShowPhraseBank((v) => !v)}
                className="flex w-full items-center justify-between px-4 py-3 text-left"
              >
                <span className="flex items-center gap-2 text-sm font-extrabold text-slate-800">
                  <BookOpen className="h-4 w-4 text-violet-500" />
                  Reset phrase bank
                </span>
                <ArrowRight
                  className={`h-4 w-4 text-slate-400 transition-transform ${showPhraseBank ? 'rotate-90' : ''}`}
                />
              </button>
              {showPhraseBank && (
                <div className="space-y-1.5 border-t border-slate-100 px-4 pb-4 pt-3">
                  {RESET_PHRASE_BANK.map((phrase, i) => (
                    <p key={i} className="text-sm leading-6 text-slate-600">
                      {phrase}
                    </p>
                  ))}
                </div>
              )}
            </div>

            <div className="flex gap-2">
              {!passed && (
                <button
                  type="button"
                  onClick={retryQuiz}
                  className="flex flex-1 items-center justify-center gap-2 rounded-2xl border-2 border-violet-300 bg-white px-5 py-3.5 text-sm font-extrabold text-violet-700 transition hover:bg-violet-50 active:scale-[0.98]"
                >
                  <RotateCcw className="h-4 w-4" />
                  Retry quiz
                </button>
              )}
              <button
                type="button"
                onClick={onComplete}
                className={`flex flex-1 items-center justify-center gap-2 rounded-2xl px-5 py-3.5 text-sm font-extrabold text-white shadow-md transition active:scale-[0.98] ${
                  passed ? 'bg-emerald-500 hover:bg-emerald-600' : 'bg-violet-600 hover:bg-violet-700'
                }`}
              >
                <Check className="h-4 w-4" />
                Done
              </button>
            </div>
          </div>
        )
      }
    }
  }
}

// ═══════════════════════════ Shared layout ══════════════════════════════════

function ProgressBar({ stage }: { stage: number }) {
  // 8 segments for parts 1–7 + quiz; intro/result handled by caller.
  return (
    <div className="shrink-0 border-b border-slate-200 bg-white px-4 py-3">
      <div className="mx-auto flex w-full max-w-2xl items-center gap-1.5">
        {Array.from({ length: 8 }, (_, i) => i + 1).map((n) => (
          <div
            key={n}
            className={`h-1.5 flex-1 rounded-full transition ${
              n < stage ? 'bg-violet-500' : n === stage ? 'bg-violet-300' : 'bg-slate-200'
            }`}
          />
        ))}
      </div>
    </div>
  )
}

function PartLayout({
  partNum,
  title,
  body,
  children,
}: {
  partNum: number
  title: string
  body?: string
  children: ReactNode
}) {
  return (
    <div className="space-y-5">
      <div>
        <p className="text-[10px] font-black uppercase tracking-[0.16em] text-violet-600">
          Part {partNum} of 8
        </p>
        <h2 className="mt-1 text-lg font-black text-slate-900">{title}</h2>
        {body && <p className="mt-2 text-sm leading-6 text-slate-500">{body}</p>}
      </div>
      {children}
    </div>
  )
}

function QuestionContext({ question }: { question: string }) {
  return (
    <div className="rounded-2xl border-2 border-slate-200 bg-slate-50 p-3">
      <p className="text-[10px] font-black uppercase tracking-[0.14em] text-slate-400">
        Interviewer asks
      </p>
      <p className="mt-1 text-sm font-bold leading-6 text-slate-800">“{question}”</p>
    </div>
  )
}

function PrimaryButton({
  onClick,
  children,
  icon,
  disabled = false,
}: {
  onClick: () => void
  children: ReactNode
  icon?: ReactNode
  disabled?: boolean
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className="flex w-full items-center justify-center gap-2 rounded-2xl bg-violet-600 px-5 py-3.5 text-sm font-extrabold text-white shadow-md transition hover:bg-violet-700 active:scale-[0.98] disabled:opacity-40"
    >
      {icon}
      {children}
    </button>
  )
}

// ═══════════════════════════ Interactions ═══════════════════════════════════

// ── Flip cards ──
const FLIP_COLORS: Record<string, { border: string; bg: string; text: string }> = {
  sky: { border: 'border-sky-300', bg: 'bg-sky-50', text: 'text-sky-700' },
  amber: { border: 'border-amber-300', bg: 'bg-amber-50', text: 'text-amber-700' },
  emerald: { border: 'border-emerald-300', bg: 'bg-emerald-50', text: 'text-emerald-700' },
  violet: { border: 'border-violet-300', bg: 'bg-violet-50', text: 'text-violet-700' },
}

interface FlipCardData {
  front: string
  back: string
  color: keyof typeof FLIP_COLORS
}

function FlipCardRow({ cards }: { cards: FlipCardData[] }) {
  return (
    <div className="grid gap-2 sm:grid-cols-3">
      {cards.map((card, i) => (
        <FlipCard key={i} {...card} />
      ))}
    </div>
  )
}

function FlipCard({ front, back, color }: FlipCardData) {
  const [flipped, setFlipped] = useState(false)
  const c = FLIP_COLORS[color] || FLIP_COLORS.violet
  return (
    <button
      type="button"
      onClick={() => setFlipped((f) => !f)}
      className={`group relative min-h-[7rem] rounded-2xl border-2 p-3 text-left transition active:scale-[0.98] ${
        flipped ? 'border-slate-300 bg-white' : `${c.border} ${c.bg} hover:shadow-md`
      }`}
    >
      {flipped ? (
        <p className="text-sm leading-6 text-slate-800">{back}</p>
      ) : (
        <>
          <p className={`text-base font-black ${c.text}`}>{front}</p>
          <p className="mt-2 text-[10px] font-bold uppercase tracking-[0.12em] text-slate-400">
            Tap to flip
          </p>
        </>
      )}
    </button>
  )
}

// ── Reveal list (formal → plain) ──
function RevealList({
  items,
}: {
  items: { hidden: string; shown: string; plain: string }[]
}) {
  return (
    <div className="space-y-2">
      {items.map((item, i) => (
        <Reveal key={i} {...item} />
      ))}
    </div>
  )
}

function Reveal({ shown, plain }: { hidden: string; shown: string; plain: string }) {
  const [open, setOpen] = useState(false)
  return (
    <div className="rounded-2xl border-2 border-slate-200 bg-white p-3">
      <p className="text-[10px] font-black uppercase tracking-[0.14em] text-slate-400">
        Formal question
      </p>
      <p className="mt-1 text-sm font-semibold leading-6 text-slate-800">“{shown}”</p>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className={`mt-3 flex items-center gap-1.5 rounded-xl border px-3 py-1.5 text-xs font-bold transition ${
          open
            ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
            : 'border-slate-200 bg-slate-50 text-slate-600 hover:bg-slate-100'
        }`}
      >
        <Eye className="h-3 w-3" />
        {open ? 'Plain version' : 'Show plain version'}
      </button>
      {open && (
        <p className="mt-2 rounded-xl border-2 border-emerald-200 bg-emerald-50 px-3 py-2 text-sm font-semibold leading-6 text-emerald-900">
          “{plain}”
        </p>
      )}
    </div>
  )
}

// ── Cue chip row ──
function CueChipRow({
  label,
  tone,
  chips,
}: {
  label: string
  tone: 'amber' | 'emerald'
  chips: string[]
}) {
  const palette =
    tone === 'emerald'
      ? { border: 'border-emerald-200', bg: 'bg-emerald-50', text: 'text-emerald-700', chip: 'bg-emerald-100 text-emerald-800' }
      : { border: 'border-amber-200', bg: 'bg-amber-50', text: 'text-amber-700', chip: 'bg-amber-100 text-amber-800' }
  return (
    <div className={`rounded-xl border ${palette.border} ${palette.bg} px-3 py-2.5`}>
      <p className={`text-[10px] font-black uppercase tracking-[0.14em] ${palette.text}`}>{label}</p>
      <div className="mt-1.5 flex flex-wrap gap-1.5">
        {chips.map((chip, i) => (
          <span key={i} className={`rounded-lg ${palette.chip} px-2 py-0.5 text-xs font-bold`}>
            {chip}
          </span>
        ))}
      </div>
    </div>
  )
}

// ── Lane card (tap to reveal "when to use" + starter line) ──
function LaneCard({ lane }: { lane: LaneInfo }) {
  const [open, setOpen] = useState(false)
  return (
    <button
      type="button"
      onClick={() => setOpen((v) => !v)}
      className={`rounded-2xl border-2 p-3 text-left transition active:scale-[0.98] ${
        open ? 'border-violet-400 bg-violet-50' : 'border-slate-200 bg-white hover:border-violet-300 hover:shadow-md'
      }`}
    >
      <p className="text-sm font-black text-slate-900">{lane.label}</p>
      {open ? (
        <div className="mt-2 space-y-1.5">
          <p className="text-xs leading-5 text-slate-600">{lane.whenToUse}</p>
          <p className="text-xs leading-5 font-semibold text-violet-700">{lane.starter}</p>
        </div>
      ) : (
        <p className="mt-1 text-[10px] font-bold uppercase tracking-[0.12em] text-slate-400">
          Tap to learn
        </p>
      )}
    </button>
  )
}

// ── Weak vs strong pair (tap to reveal strong + reasoning) ──
function WeakStrongPair({
  question,
  weak,
  strong,
  why,
}: {
  question: string
  weak: string
  strong: string
  why: string
}) {
  const [open, setOpen] = useState(false)
  return (
    <div className="rounded-2xl border-2 border-slate-200 bg-white p-3">
      <p className="text-[10px] font-black uppercase tracking-[0.14em] text-slate-400">Question</p>
      <p className="mt-1 text-sm font-bold leading-6 text-slate-800">“{question}”</p>

      <div className="mt-3 rounded-xl border border-red-200 bg-red-50 px-3 py-2">
        <p className="text-[10px] font-black uppercase tracking-[0.14em] text-red-600">Weak start</p>
        <p className="mt-0.5 text-sm leading-6 text-red-900">“{weak}”</p>
      </div>

      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className={`mt-2 flex items-center gap-1.5 rounded-xl border px-3 py-1.5 text-xs font-bold transition ${
          open
            ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
            : 'border-slate-200 bg-slate-50 text-slate-600 hover:bg-slate-100'
        }`}
      >
        <Eye className="h-3 w-3" />
        {open ? 'Strong start' : 'Show strong start'}
      </button>

      {open && (
        <>
          <div className="mt-2 rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2">
            <p className="text-[10px] font-black uppercase tracking-[0.14em] text-emerald-700">
              Strong start
            </p>
            <p className="mt-0.5 text-sm leading-6 text-emerald-900">“{strong}”</p>
          </div>
          <div className="mt-2 flex items-start gap-2 rounded-xl bg-violet-50 px-3 py-2">
            <Lightbulb className="mt-0.5 h-3.5 w-3.5 shrink-0 text-violet-500" />
            <p className="text-xs leading-5 text-violet-900">{why}</p>
          </div>
        </>
      )}
    </div>
  )
}

// ── Generic check question (string options) ──
function CheckQuestion({
  options,
  correctIndex,
  feedback,
  onContinue,
}: {
  options: string[]
  correctIndex: number
  feedback: string
  onContinue: () => void
}) {
  const [selected, setSelected] = useState<number | null>(null)
  const [checked, setChecked] = useState(false)
  const isCorrect = selected === correctIndex

  return (
    <div className="space-y-3">
      <div className="space-y-2">
        {options.map((opt, i) => {
          const showCorrect = checked && i === correctIndex
          const showWrong = checked && i === selected && i !== correctIndex
          const isSelected = selected === i
          return (
            <button
              key={i}
              type="button"
              disabled={checked}
              onClick={() => setSelected(i)}
              className={`w-full rounded-xl border-2 px-3 py-2.5 text-left text-sm leading-6 transition ${
                showCorrect
                  ? 'border-emerald-400 bg-emerald-50 text-emerald-900'
                  : showWrong
                    ? 'border-red-400 bg-red-50 text-red-900'
                    : isSelected
                      ? 'border-violet-400 bg-violet-50 text-slate-900'
                      : 'border-slate-200 bg-white text-slate-700 hover:border-violet-300'
              } ${checked ? 'cursor-default' : ''}`}
            >
              {opt}
            </button>
          )
        })}
      </div>

      {checked && <FeedbackBox isCorrect={isCorrect} feedback={feedback} />}

      {!checked ? (
        <PrimaryButton onClick={() => setChecked(true)} disabled={selected === null}>
          Check
        </PrimaryButton>
      ) : (
        <button
          type="button"
          onClick={onContinue}
          className="flex w-full items-center justify-center gap-2 rounded-2xl bg-slate-900 px-5 py-3 text-sm font-extrabold text-white shadow-md transition hover:bg-slate-800 active:scale-[0.98]"
        >
          Continue
          <ArrowRight className="h-4 w-4" />
        </button>
      )}
    </div>
  )
}

// ── Lane check (renders lane buttons, picks 3 distractor lanes) ──
function LaneCheck({
  correctLane,
  feedback,
  onContinue,
}: {
  correctLane: AnswerLane
  feedback: string
  onContinue: () => void
}) {
  // Stable per-mount randomized lane choices.
  const choices = useMemo(() => {
    const others = LANE_OPTIONS.filter((l) => l.id !== correctLane)
    const distractors = [...others].sort(() => Math.random() - 0.5).slice(0, 3)
    const all = [
      { label: LANE_LABEL[correctLane], laneId: correctLane },
      ...distractors.map((l) => ({ label: l.label, laneId: l.id })),
    ].sort(() => Math.random() - 0.5)
    return all
  }, [correctLane])

  const correctIndex = choices.findIndex((c) => c.laneId === correctLane)
  const [selected, setSelected] = useState<number | null>(null)
  const [checked, setChecked] = useState(false)
  const isCorrect = selected === correctIndex

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-2">
        {choices.map((c, i) => {
          const showCorrect = checked && i === correctIndex
          const showWrong = checked && i === selected && i !== correctIndex
          const isSelected = selected === i
          return (
            <button
              key={i}
              type="button"
              disabled={checked}
              onClick={() => setSelected(i)}
              className={`rounded-xl border-2 px-3 py-3 text-left text-sm font-bold transition ${
                showCorrect
                  ? 'border-emerald-400 bg-emerald-50 text-emerald-900'
                  : showWrong
                    ? 'border-red-400 bg-red-50 text-red-900'
                    : isSelected
                      ? 'border-violet-400 bg-violet-50 text-slate-900'
                      : 'border-slate-200 bg-white text-slate-700 hover:border-violet-300'
              } ${checked ? 'cursor-default' : ''}`}
            >
              {c.label}
            </button>
          )
        })}
      </div>

      {checked && <FeedbackBox isCorrect={isCorrect} feedback={feedback} />}

      {!checked ? (
        <PrimaryButton onClick={() => setChecked(true)} disabled={selected === null}>
          Check
        </PrimaryButton>
      ) : (
        <button
          type="button"
          onClick={onContinue}
          className="flex w-full items-center justify-center gap-2 rounded-2xl bg-slate-900 px-5 py-3 text-sm font-extrabold text-white shadow-md transition hover:bg-slate-800 active:scale-[0.98]"
        >
          Continue
          <ArrowRight className="h-4 w-4" />
        </button>
      )}
    </div>
  )
}

// ── Feedback box ──
function FeedbackBox({ isCorrect, feedback }: { isCorrect: boolean; feedback: string }) {
  return (
    <div
      className={`rounded-xl px-3 py-2.5 ${
        isCorrect ? 'bg-emerald-50 border border-emerald-200' : 'bg-amber-50 border border-amber-200'
      }`}
    >
      <p
        className={`text-xs font-black uppercase tracking-[0.12em] ${
          isCorrect ? 'text-emerald-600' : 'text-amber-600'
        }`}
      >
        {isCorrect ? 'Correct' : 'Not quite'}
      </p>
      <p className="mt-1 text-sm leading-6 text-slate-700">{feedback}</p>
    </div>
  )
}

// ═══════════════════════════ Quiz screens ═══════════════════════════════════

const QUIZ_PROMPT: Record<QuizDrill['kind'], string> = {
  rephrase: 'Which simpler version keeps you closest to the real question?',
  cue_words: 'Which notes would help you answer instead of ramble?',
  lane: 'What kind of answer does this need?',
  stronger_start: 'Which start gives you the cleanest reset?',
  mid_reset: 'What is the best recovery line?',
}

function QuizScreen({
  drill,
  onAnswer,
  isLast,
}: {
  drill: QuizDrill
  onAnswer: (correct: boolean) => void
  isLast: boolean
}) {
  const [selected, setSelected] = useState<number | null>(null)
  const [checked, setChecked] = useState(false)
  const isCorrect = selected === drill.correctIndex

  const labels = drill.kind === 'lane' ? drill.options.map((o) => o.label) : (drill.options as string[])

  return (
    <div className="space-y-3">
      {drill.kind === 'mid_reset' ? (
        <div className="rounded-2xl border-2 border-slate-200 bg-slate-50 p-3">
          <p className="text-[10px] font-black uppercase tracking-[0.14em] text-slate-400">Scenario</p>
          <p className="mt-1 text-sm leading-6 text-slate-800">{drill.scenario}</p>
        </div>
      ) : (
        <QuestionContext question={drill.question} />
      )}

      <div
        className={drill.kind === 'lane' ? 'grid grid-cols-2 gap-2' : 'space-y-2'}
      >
        {labels.map((label, i) => {
          const showCorrect = checked && i === drill.correctIndex
          const showWrong = checked && i === selected && i !== drill.correctIndex
          const isSelected = selected === i
          return (
            <button
              key={i}
              type="button"
              disabled={checked}
              onClick={() => setSelected(i)}
              className={`rounded-xl border-2 ${drill.kind === 'lane' ? 'px-3 py-3 text-center font-bold' : 'px-3 py-2.5 text-left'} text-sm leading-6 transition ${
                showCorrect
                  ? 'border-emerald-400 bg-emerald-50 text-emerald-900'
                  : showWrong
                    ? 'border-red-400 bg-red-50 text-red-900'
                    : isSelected
                      ? 'border-violet-400 bg-violet-50 text-slate-900'
                      : 'border-slate-200 bg-white text-slate-700 hover:border-violet-300'
              } ${checked ? 'cursor-default' : ''}`}
            >
              {label}
            </button>
          )
        })}
      </div>

      {checked && <FeedbackBox isCorrect={isCorrect} feedback={drill.feedback} />}

      {!checked ? (
        <PrimaryButton onClick={() => setChecked(true)} disabled={selected === null}>
          Check
        </PrimaryButton>
      ) : (
        <button
          type="button"
          onClick={() => onAnswer(isCorrect)}
          className="flex w-full items-center justify-center gap-2 rounded-2xl bg-slate-900 px-5 py-3 text-sm font-extrabold text-white shadow-md transition hover:bg-slate-800 active:scale-[0.98]"
        >
          {isLast ? 'See results' : 'Continue'}
          <ArrowRight className="h-4 w-4" />
        </button>
      )}
    </div>
  )
}
