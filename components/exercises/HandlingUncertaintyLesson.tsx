'use client'

import { type ReactNode, useMemo, useState } from 'react'
import { ArrowLeft, ArrowRight, BookOpen, Check, ChevronRight, Lightbulb, RotateCcw, Sparkles } from 'lucide-react'
import {
  type AnswerLane,
  type QuizDrill,
  buildQuiz,
  CUE_WORD_PRACTICE_PROMPTS,
  DIFFICULT_QUESTIONS,
  LANE_LABEL,
  LANE_OPTIONS,
  QUIZ_PASS_THRESHOLD,
  RECOVERY_STRATEGIES,
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
  // Half 1: Before You Answer
  | 'pause'
  | 'reframe' | 'reframe_check'
  | 'cue_words' | 'cue_words_practice'
  | 'cue_words_check'
  | 'lane' | 'lane_check'
  | 'start_clean' | 'start_clean_check'
  // Half 2: After Already Rambling
  | 'recovery_intro'
  | 'recovery_direct' | 'recovery_direct_check'
  | 'recovery_honest' | 'recovery_honest_check'
  | 'recovery_clarifying' | 'recovery_clarifying_check'
  // Quiz
  | 'quiz_intro' | 'quiz_q1' | 'quiz_q2' | 'quiz_q3' | 'quiz_q4' | 'quiz_q5'
  | 'result'

const PHASE_ORDER: Phase[] = [
  'intro',
  'pause',
  'reframe', 'reframe_check',
  'cue_words', 'cue_words_practice', 'cue_words_check',
  'lane', 'lane_check',
  'start_clean', 'start_clean_check',
  'recovery_intro',
  'recovery_direct', 'recovery_direct_check',
  'recovery_honest', 'recovery_honest_check',
  'recovery_clarifying', 'recovery_clarifying_check',
  'quiz_intro', 'quiz_q1', 'quiz_q2', 'quiz_q3', 'quiz_q4', 'quiz_q5',
  'result',
]

const HALF_1_PHASES: Phase[] = ['pause', 'reframe', 'reframe_check', 'cue_words', 'cue_words_practice', 'cue_words_check', 'lane', 'lane_check', 'start_clean', 'start_clean_check']
const HALF_2_PHASES: Phase[] = ['recovery_intro', 'recovery_direct', 'recovery_direct_check', 'recovery_honest', 'recovery_honest_check', 'recovery_clarifying', 'recovery_clarifying_check']

function getProgressSegment(phase: Phase): number {
  if (phase === 'intro') return 0
  if (HALF_1_PHASES.includes(phase)) return 1 + HALF_1_PHASES.indexOf(phase)
  if (HALF_2_PHASES.includes(phase)) return HALF_1_PHASES.length + 1 + HALF_2_PHASES.indexOf(phase)
  if (phase.startsWith('quiz')) return HALF_1_PHASES.length + HALF_2_PHASES.length + 1
  return HALF_1_PHASES.length + HALF_2_PHASES.length + 2
}

const TOTAL_SEGMENTS = HALF_1_PHASES.length + HALF_2_PHASES.length + 1

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

  const progress = getProgressSegment(phase)

  function advance() {
    const idx = PHASE_ORDER.indexOf(phase)
    if (idx >= 0 && idx < PHASE_ORDER.length - 1) setPhase(PHASE_ORDER[idx + 1])
  }

  function goBack() {
    const idx = PHASE_ORDER.indexOf(phase)
    if (idx > 0) setPhase(PHASE_ORDER[idx - 1])
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

  const showBack = phase !== 'intro' && phase !== 'result'
  const showProgress = phase !== 'intro' && phase !== 'result'

  return (
    <div className="workshop-frame">
      {showProgress && <ProgressBar current={progress} total={TOTAL_SEGMENTS} onBack={showBack ? goBack : undefined} />}
      <div className="workshop-body">
        <div className="mx-auto flex h-full w-full max-w-2xl flex-col justify-center">{renderPhase()}</div>
      </div>
    </div>
  )

  function renderPhase(): ReactNode {
    switch (phase) {
      // ─── Intro ─────────────────────────────────────────────────────────────
      case 'intro':
        return (
          <div className="space-y-3 sm:space-y-5">
            <div>
              <p className="text-[10px] font-black uppercase tracking-[0.16em] text-violet-600">
                Handling Uncertainty
              </p>
              <h2 className="mt-1 text-base font-black text-slate-900 sm:text-lg">
                What to do when your brain blanks in an interview
              </h2>
              <p className="mt-2 text-xs leading-5 text-slate-600 sm:mt-3 sm:text-sm sm:leading-6">
                Most people don't ramble because they have nothing to say. They ramble because they
                start talking before they know what kind of answer the question needs.
              </p>
              <p className="mt-1.5 text-xs leading-5 text-slate-600 sm:mt-2 sm:text-sm sm:leading-6">
                This lesson teaches two things: how to buy yourself time <em>before</em> you start answering,
                and how to recover <em>after</em> you've already started rambling. Both are learnable skills,
                and interviewers respect both when they're done well.
              </p>
            </div>

            {(originalQuestion || originalAnswer) && (
              <Callout color="slate" label="The question that tripped you up">
                {originalQuestion && (
                  <p className="text-xs font-semibold leading-5 text-slate-800 sm:text-sm sm:leading-6">{originalQuestion}</p>
                )}
                {originalAnswer && (
                  <p className="mt-1.5 text-xs leading-5 text-slate-600 sm:mt-2 sm:text-sm sm:leading-6">{originalAnswer}</p>
                )}
              </Callout>
            )}

            <Callout color="violet" label="What you'll learn">
              <div className="space-y-1.5 sm:space-y-2">
                <p className="text-xs font-bold text-slate-800 sm:text-sm">Part 1 — Before you answer</p>
                <p className="text-xs leading-5 text-slate-600 sm:text-sm sm:leading-6">
                  Pause, reframe the question, pick cue words, choose a lane, start clean.
                </p>
                <p className="mt-1 text-xs font-bold text-slate-800 sm:text-sm">Part 2 — After you've already started rambling</p>
                <p className="text-xs leading-5 text-slate-600 sm:text-sm sm:leading-6">
                  Three recovery strategies: the direct reset, the honest gap, and the clarifying reset.
                </p>
              </div>
            </Callout>

            <PrimaryButton onClick={advance} icon={<Sparkles className="h-4 w-4" />}>
              Let's go
            </PrimaryButton>
          </div>
        )

      // ═══════════════════════════════════════════════════════════════════════
      // HALF 1: Before You Answer
      // ═══════════════════════════════════════════════════════════════════════

      // ─── Pause ─────────────────────────────────────────────────────────────
      case 'pause':
        return (
          <SectionLayout
            half={1}
            title="Pause before you speak"
            subtitle="The most underused move in interviewing"
          >
            <p className="text-sm leading-6 text-slate-600">
              When a question catches you off guard, the instinct is to start talking immediately.
              That instinct is almost always wrong. Starting before you have a direction is how
              answers turn into rambles.
            </p>
            <p className="text-sm leading-6 text-slate-600">
              Instead, take 5–10 seconds. Say something like:
            </p>

            <ExampleBox>
              "That's a great question — let me think about that for a second."
            </ExampleBox>

            <p className="text-sm leading-6 text-slate-600">
              Five seconds of silence feels long to you. To the interviewer, it reads as thoughtful.
              Twenty seconds of rambling, on the other hand, reads as unprepared. The pause is always
              the better trade.
            </p>

            <Callout color="amber" label="If it's a phone screen">
              <p className="text-sm leading-6 text-slate-700">
                Keep a pen and paper next to you. When a hard question lands, say "let me jot that
                down for a second" and write 2–3 cue words. This anchors your answer before you
                open your mouth. Nobody can see you writing — use that advantage.
              </p>
            </Callout>

            <Insight>
              The goal of the pause isn't to find the perfect answer. It's to stop yourself from
              starting with filler. Even 5 seconds of silence is better than "So, that's a really
              interesting question, and I think there are a lot of ways to think about it…"
            </Insight>

            <PrimaryButton onClick={advance}>Continue</PrimaryButton>
          </SectionLayout>
        )

      // ─── Reframe ───────────────────────────────────────────────────────────
      case 'reframe':
        return (
          <SectionLayout
            half={1}
            title="Reframe the question in plain language"
            subtitle="Turn a formal question into a smaller search term"
          >
            <p className="text-sm leading-6 text-slate-600">
              Interview questions sound intimidating because they're worded formally. But underneath
              the polish, most questions are asking something simple. Your job is to find the simple
              version and answer that.
            </p>
            <p className="text-sm leading-6 text-slate-600">
              You can even say the reframe out loud — it buys time and shows you're thinking clearly:
            </p>

            <ExampleBox>
              "Yeah, so [simpler version of the question]… let me think about that for a second."
            </ExampleBox>

            <p className="mt-1 text-sm leading-6 text-slate-600">
              Here are a few examples of what reframing looks like:
            </p>

            <ComparisonBox
              label="Example 1"
              left={{ tag: 'Formal', text: 'Tell me about a time you had to influence someone without formal authority.' }}
              right={{ tag: 'Reframed', text: "A time I had to get someone bought in even though I wasn't their boss." }}
            />
            <ComparisonBox
              label="Example 2"
              left={{ tag: 'Formal', text: 'What would you want to learn quickly if you started here?' }}
              right={{ tag: 'Reframed', text: "What I'd want to get up to speed on first." }}
            />
            <ComparisonBox
              label="Example 3"
              left={{ tag: 'Formal', text: "What's something on your resume you'd want to explain more clearly?" }}
              right={{ tag: 'Reframed', text: 'What part of my background might need more context.' }}
            />

            <Insight>
              The reframe isn't about dumbing the question down. It's about translating it into
              language your brain can actually search against. "Influence without formal authority"
              is abstract. "Get someone bought in even though I wasn't their boss" — your brain
              immediately starts scanning for a real memory.
            </Insight>

            <PrimaryButton onClick={advance}>Continue</PrimaryButton>
          </SectionLayout>
        )

      case 'reframe_check': {
        const q = getQ('resume_explain')
        return (
          <SectionLayout half={1} title="Quick check" subtitle="Which reframe captures what this question is really asking?">
            <QuestionContext question={q.question} />
            <CheckQuestion
              options={[
                'Which job on my resume was my favorite?',
                'What part of my background might need more context?',
                'What part of my resume would I remove?',
                "Why is my resume better than other candidates'?",
              ]}
              correctIndex={1}
              feedback="The interviewer wants to know where your resume might create confusion — not what you're proudest of."
              onContinue={advance}
            />
          </SectionLayout>
        )
      }

      // ─── Cue Words ────────────────────────────────────────────────────────
      case 'cue_words':
        return (
          <SectionLayout
            half={1}
            title="Write cue words, not full sentences"
            subtitle="Give your brain a specific place to search"
          >
            <p className="text-sm leading-6 text-slate-600">
              After you reframe the question, jot 2–3 cue words (or hold them in your head if
              you're on video). The right cue words point your brain at a specific story or
              process — the wrong ones leave you drifting.
            </p>

            <p className="text-sm leading-6 text-slate-600">
              Here's the difference:
            </p>

            <div className="rounded-2xl border-2 border-slate-200 bg-white p-4">
              <p className="text-xs leading-5 text-slate-500">For the question:</p>
              <p className="mt-1 text-sm font-bold leading-6 text-slate-800">
                "Tell me about a time you disagreed with a coworker and how you handled it."
              </p>
              <div className="mt-3 space-y-2">
                <div className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-2.5">
                  <p className="text-[10px] font-black uppercase tracking-[0.14em] text-amber-700">
                    Vague cue words
                  </p>
                  <div className="mt-1.5 flex flex-wrap gap-1.5">
                    {['disagreed', 'coworker', 'handled it'].map((c) => (
                      <span key={c} className="rounded-lg bg-amber-100 px-2 py-0.5 text-xs font-bold text-amber-800">{c}</span>
                    ))}
                  </div>
                  <p className="mt-2 text-xs leading-5 text-amber-800">
                    These are just the question's own words. They don't point your brain anywhere new.
                  </p>
                </div>
                <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2.5">
                  <p className="text-[10px] font-black uppercase tracking-[0.14em] text-emerald-700">
                    Specific cue words
                  </p>
                  <div className="mt-1.5 flex flex-wrap gap-1.5">
                    {['design review', 'pushed back on timeline', 'brought data'].map((c) => (
                      <span key={c} className="rounded-lg bg-emerald-100 px-2 py-0.5 text-xs font-bold text-emerald-800">{c}</span>
                    ))}
                  </div>
                  <p className="mt-2 text-xs leading-5 text-emerald-800">
                    These point at a real incident. Now your brain is loading a specific memory, not searching the void.
                  </p>
                </div>
              </div>
            </div>

            {/* Cue words → full answer example */}
            {(() => {
              const q = getQ('learn_quickly')
              if (!q.cueToAnswer) return null
              return (
                <div className="rounded-2xl border-2 border-violet-200 bg-violet-50/30 p-4">
                  <p className="text-[10px] font-black uppercase tracking-[0.14em] text-violet-600">
                    How cue words become an answer
                  </p>
                  <p className="mt-2 text-xs leading-5 text-slate-500">
                    Question: "{q.question}"
                  </p>
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {q.cueToAnswer.cueWords.map((w) => (
                      <span key={w} className="rounded-lg bg-violet-100 px-2 py-0.5 text-xs font-bold text-violet-800">{w}</span>
                    ))}
                  </div>
                  <div className="mt-2 border-t border-violet-200 pt-2">
                    <p className="text-[10px] font-black uppercase tracking-[0.14em] text-violet-600">
                      Becomes
                    </p>
                    <p className="mt-1 text-sm leading-6 text-slate-700">
                      "{q.cueToAnswer.fullAnswer}"
                    </p>
                  </div>
                </div>
              )
            })()}

            <PrimaryButton onClick={advance}>Continue</PrimaryButton>
          </SectionLayout>
        )

      case 'cue_words_practice':
        return (
          <SectionLayout
            half={1}
            title="Your turn"
            subtitle="Practice writing cue words for real questions"
          >
            <p className="text-sm leading-6 text-slate-600">
              For each question below, write 2–3 cue words that would point your brain at a
              specific story or process. Don't overthink it — this is ungraded practice.
            </p>

            {CUE_WORD_PRACTICE_PROMPTS.map((prompt, i) => (
              <CueWordPracticeField key={i} prompt={prompt} index={i} />
            ))}

            <Insight>
              There's no single right answer here. The test is: do your cue words point at something
              specific? If you wrote "communication" or "teamwork," try again with something that
              reminds you of a real moment.
            </Insight>

            <PrimaryButton onClick={advance}>Continue</PrimaryButton>
          </SectionLayout>
        )

      case 'cue_words_check': {
        const q = getQ('learn_quickly')
        return (
          <SectionLayout half={1} title="Quick check" subtitle="Which cue words would actually help you answer instead of ramble?">
            <QuestionContext question={q.question} />
            <CheckQuestion
              options={q.cueWordOptions.options}
              correctIndex={q.cueWordOptions.correctIndex}
              feedback={q.explanation}
              onContinue={advance}
            />
          </SectionLayout>
        )
      }

      // ─── Lane ──────────────────────────────────────────────────────────────
      case 'lane':
        return (
          <SectionLayout
            half={1}
            title="Choose the kind of answer"
            subtitle="Every interview answer falls into one of a few lanes"
          >
            <p className="text-sm leading-6 text-slate-600">
              Once you've reframed the question and picked cue words, decide what <em>kind</em> of
              answer the question needs. This is the lane. Knowing the lane keeps you from wandering
              between answer types mid-sentence.
            </p>

            <div className="space-y-1.5">
              {LANE_OPTIONS.slice(0, 5).map((lane) => (
                <div key={lane.id} className="rounded-xl border border-slate-200 bg-white px-3 py-2.5">
                  <p className="text-sm font-bold text-slate-900">{lane.label}</p>
                  <p className="mt-0.5 text-xs leading-5 text-slate-500">{lane.whenToUse}</p>
                </div>
              ))}
            </div>

            <Insight>
              You don't need to memorize these. The point is to make a conscious choice — "this is a
              story question" or "this is a process question" — before you start talking. That one
              decision eliminates most rambling.
            </Insight>

            <PrimaryButton onClick={advance}>Continue</PrimaryButton>
          </SectionLayout>
        )

      case 'lane_check': {
        const q = getQ('disagree_coworker')
        return (
          <SectionLayout half={1} title="Pick the lane" subtitle='"Tell me about a time…" usually points to one specific kind of answer.'>
            <QuestionContext question={q.question} />
            <LaneCheck correctLane={q.correctLane} feedback={q.explanation} onContinue={advance} />
          </SectionLayout>
        )
      }

      // ─── Start Clean ──────────────────────────────────────────────────────
      case 'start_clean':
        return (
          <SectionLayout
            half={1}
            title="Start with direction, not filler"
            subtitle="Your first sentence sets the trajectory for the whole answer"
          >
            <p className="text-sm leading-6 text-slate-600">
              A weak start is vague and general — it doesn't commit to anything. A strong start
              points the answer in a specific direction from the first sentence. The rest of
              the answer follows naturally.
            </p>

            <ComparisonBox
              label={getQ('still_developing').question}
              left={{
                tag: 'Weak start',
                text: "Honestly I work on everything. I'm always trying to improve.",
                color: 'red',
              }}
              right={{
                tag: 'Strong start',
                text: "One skill I'm actively working on is presenting complex ideas more concisely.",
                color: 'emerald',
              }}
            />

            <ComparisonBox
              label={getQ('learn_quickly').question}
              left={{
                tag: 'Weak start',
                text: "I'm a fast learner, so I could pick up just about anything.",
                color: 'red',
              }}
              right={{
                tag: 'Strong start',
                text: "If I had to pick one thing, I'd want to understand how the team defines success in the first 90 days.",
                color: 'emerald',
              }}
            />

            <Insight>
              Notice the pattern: the weak starts talk about the candidate ("I'm a fast learner,"
              "I'm always trying to improve"). The strong starts answer the actual question. If your
              first sentence is about yourself as a person rather than the specific thing they asked,
              you're probably in filler territory.
            </Insight>

            <PrimaryButton onClick={advance}>Continue</PrimaryButton>
          </SectionLayout>
        )

      case 'start_clean_check': {
        return (
          <SectionLayout half={1} title="Choose the stronger start" subtitle="Which first sentence gives you the cleanest direction?">
            <QuestionContext question={getQ('learn_quickly').question} />
            <CheckQuestion
              options={[
                "\"I'm a fast learner, so honestly I could pick up just about anything.\"",
                "\"There's probably a lot. It really depends on the team.\"",
                "\"If I had to pick one thing to learn quickly, I'd want to understand how success is measured in the first 90 days.\"",
                "\"I deal with new things all the time, so I'm not too worried about it.\"",
              ]}
              correctIndex={2}
              feedback="It gives a direct priority instead of hiding behind 'I'm a fast learner.' The interviewer now knows exactly where the answer is headed."
              onContinue={advance}
            />
          </SectionLayout>
        )
      }

      // ═══════════════════════════════════════════════════════════════════════
      // HALF 2: After Already Rambling
      // ═══════════════════════════════════════════════════════════════════════

      case 'recovery_intro':
        return (
          <SectionLayout
            half={2}
            title="When you're already rambling"
            subtitle="Three ways to recover mid-answer"
          >
            <p className="text-sm leading-6 text-slate-600">
              Everything above works when you catch yourself <em>before</em> you start talking. But
              sometimes you'll be 20 seconds into an answer and realize it's going nowhere. That's
              normal — and it's recoverable.
            </p>
            <p className="text-sm leading-6 text-slate-600">
              The key insight: <strong>interviewers notice when you reset cleanly far more than they
              notice the initial ramble.</strong> A candidate who catches themselves and course-corrects
              shows self-awareness. A candidate who keeps going shows they can't read the room.
            </p>
            <p className="text-sm leading-6 text-slate-600">
              There are three recovery strategies, and which one you use depends on <em>why</em> you're
              rambling:
            </p>

            <div className="space-y-2">
              {RECOVERY_STRATEGIES.map((s) => (
                <div key={s.id} className="rounded-xl border border-slate-200 bg-white px-4 py-3">
                  <p className="text-sm font-bold text-slate-900">{s.name}</p>
                  <p className="mt-0.5 text-xs leading-5 text-slate-500">{s.whenToUse}</p>
                </div>
              ))}
            </div>

            <PrimaryButton onClick={advance}>Continue</PrimaryButton>
          </SectionLayout>
        )

      // ─── Recovery: Direct Reset ────────────────────────────────────────────
      case 'recovery_direct': {
        const strategy = RECOVERY_STRATEGIES[0]
        return (
          <SectionLayout
            half={2}
            title={strategy.name}
            subtitle={strategy.whenToUse}
          >
            <p className="text-sm leading-6 text-slate-600">
              This is the most common recovery. You know the answer, you just started explaining it
              badly — too much context, wrong entry point, or you got sidetracked into a tangent.
              The fix is simple: stop, name what you're doing, and restart the point more clearly.
            </p>

            <div className="space-y-1.5">
              <p className="text-[10px] font-black uppercase tracking-[0.14em] text-slate-500">
                Phrases that work
              </p>
              {strategy.phrases.map((phrase, i) => (
                <div key={i} className="rounded-xl border border-violet-200 bg-violet-50/50 px-3 py-2 text-sm leading-6 text-slate-800">
                  {phrase}
                </div>
              ))}
            </div>

            <RecoveryExample example={strategy.example} />

            <Insight>
              The direct reset works because it turns a ramble into a revision. Instead of the
              interviewer wondering "where is this going?", they hear you self-correct — which is
              actually a signal of clear thinking.
            </Insight>

            <PrimaryButton onClick={advance}>Continue</PrimaryButton>
          </SectionLayout>
        )
      }

      case 'recovery_direct_check':
        return (
          <SectionLayout half={2} title="Quick check" subtitle="You realize you've been giving too much backstory. What do you say?">
            <CheckQuestion
              options={[
                "\"Anyway, that's basically my answer.\"",
                '"I\'m giving too much context. The main point is…"',
                "Keep going so it doesn't seem like a mistake.",
                '"Sorry, ignore all of that."',
              ]}
              correctIndex={1}
              feedback="Naming the problem ('too much context') and pivoting to the point is exactly the direct reset. It sounds composed, not flustered."
              onContinue={advance}
            />
          </SectionLayout>
        )

      // ─── Recovery: Honest Gap ──────────────────────────────────────────────
      case 'recovery_honest': {
        const strategy = RECOVERY_STRATEGIES[1]
        return (
          <SectionLayout
            half={2}
            title={strategy.name}
            subtitle={strategy.whenToUse}
          >
            <p className="text-sm leading-6 text-slate-600">
              Sometimes you're rambling because you genuinely don't have a good answer and you're
              stalling, hoping something comes to you. The honest gap reset is more impressive
              than you'd think — interviewers can tell when someone is stalling, and they respect
              a candidate who pivots to what they <em>can</em> speak to instead.
            </p>

            <div className="space-y-1.5">
              <p className="text-[10px] font-black uppercase tracking-[0.14em] text-slate-500">
                Phrases that work
              </p>
              {strategy.phrases.map((phrase, i) => (
                <div key={i} className="rounded-xl border border-violet-200 bg-violet-50/50 px-3 py-2 text-sm leading-6 text-slate-800">
                  {phrase}
                </div>
              ))}
            </div>

            <RecoveryExample example={strategy.example} />

            <Insight>
              The honest gap is not admitting defeat — it's redirecting. You're saying "I don't have
              exactly what you asked for, but here's the closest real thing I've got." That's always
              better than inventing something vague and hoping they don't notice.
            </Insight>

            <PrimaryButton onClick={advance}>Continue</PrimaryButton>
          </SectionLayout>
        )
      }

      case 'recovery_honest_check':
        return (
          <SectionLayout half={2} title="Quick check" subtitle="You're asked about managing a cross-functional team, but you've never formally done that. You're 15 seconds into a vague answer about 'collaboration.' What's the move?">
            <CheckQuestion
              options={[
                '"I haven\'t done that exact thing, but the closest experience is…"',
                '"I\'m a strong collaborator, so I think I could figure it out."',
                '"That probably answers it."',
                'Keep talking about collaboration in general.',
              ]}
              correctIndex={0}
              feedback="Redirecting to the closest real experience is always stronger than stretching a vague claim. The interviewer gets a concrete example, and you look honest."
              onContinue={advance}
            />
          </SectionLayout>
        )

      // ─── Recovery: Clarifying Reset ────────────────────────────────────────
      case 'recovery_clarifying': {
        const strategy = RECOVERY_STRATEGIES[2]
        return (
          <SectionLayout
            half={2}
            title={strategy.name}
            subtitle={strategy.whenToUse}
          >
            <p className="text-sm leading-6 text-slate-600">
              Sometimes you're rambling because the question was too broad and you're trying to
              cover all the angles at once. "What's your leadership style?" could mean day-to-day
              management, handling conflict, strategic decision-making, or half a dozen other
              things. When you try to answer all of them, you end up answering none of them.
            </p>
            <p className="text-sm leading-6 text-slate-600">
              The clarifying reset stops the sprawl by narrowing the question. It also shows the
              interviewer you're thinking about what they actually want to know — which is itself
              a signal of communication skill.
            </p>

            <div className="space-y-1.5">
              <p className="text-[10px] font-black uppercase tracking-[0.14em] text-slate-500">
                Phrases that work
              </p>
              {strategy.phrases.map((phrase, i) => (
                <div key={i} className="rounded-xl border border-violet-200 bg-violet-50/50 px-3 py-2 text-sm leading-6 text-slate-800">
                  {phrase}
                </div>
              ))}
            </div>

            <RecoveryExample example={strategy.example} />

            <Insight>
              You might worry that asking the interviewer to clarify makes you look confused.
              It doesn't. It makes you look like someone who cares about giving a precise answer
              instead of a vague one. Most interviewers will actually appreciate being asked.
            </Insight>

            <PrimaryButton onClick={advance}>Continue</PrimaryButton>
          </SectionLayout>
        )
      }

      case 'recovery_clarifying_check':
        return (
          <SectionLayout half={2} title="Quick check" subtitle={`You're asked "How do you handle feedback?" and you've started rambling about positive feedback, negative feedback, peer feedback, and manager feedback all at once. What do you say?`}>
            <CheckQuestion
              options={[
                '"I handle all feedback well."',
                '"I want to make sure I\'m answering what you\'re looking for — are you asking more about how I receive critical feedback, or how I give feedback to others?"',
                '"Anyway, feedback is really important to me."',
                '"Can you ask me something else?"',
              ]}
              correctIndex={1}
              feedback="Narrowing the question shows clarity, not confusion. Now you can give one focused answer instead of five shallow ones."
              onContinue={advance}
            />
          </SectionLayout>
        )

      // ─── Quiz ──────────────────────────────────────────────────────────────
      case 'quiz_intro':
        return (
          <SectionLayout
            half={0}
            title="Final quiz"
            subtitle="5 questions using real interview curveballs. You need 4 out of 5 to pass."
          >
            <div className="rounded-2xl border-2 border-violet-200 bg-violet-50/50 p-4">
              <ul className="space-y-1.5">
                {[
                  'Pick the better reframe',
                  'Pick the best cue words',
                  'Pick the correct lane',
                  'Choose the stronger start',
                  'Choose the mid-answer recovery',
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
          </SectionLayout>
        )

      case 'quiz_q1':
      case 'quiz_q2':
      case 'quiz_q3':
      case 'quiz_q4':
      case 'quiz_q5': {
        const idx = Number(phase.replace('quiz_q', '')) - 1
        return (
          <SectionLayout half={0} title={`Quiz · ${idx + 1} of 5`} subtitle={QUIZ_PROMPT[quiz[idx].kind]}>
            <QuizScreen drill={quiz[idx]} onAnswer={answerQuiz} isLast={idx === 4} />
          </SectionLayout>
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
                {passed ? "You've got the reset" : 'Almost there'}
              </h2>
              <p className="mt-1 text-sm font-bold text-slate-500">
                {quizCorrect} / {quiz.length} correct
              </p>
              <p className="mt-2 text-sm leading-6 text-slate-500">
                {passed
                  ? 'When a question catches you off guard: pause, reframe, pick cue words, choose a lane, start clean. And if you\'re already rambling — reset directly, admit the gap, or narrow the question.'
                  : 'Review the lesson and try the quiz again. You\'re building the habit, not chasing a score.'}
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
                <ChevronRight
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

// ═══════════════════════════ Layout & UI Primitives ═════════════════════════

function ProgressBar({ current, total, onBack }: { current: number; total: number; onBack?: () => void }) {
  return (
    <div className="workshop-header bg-white">
      <div className="mx-auto flex w-full max-w-2xl items-center gap-3">
        {onBack && (
          <button
            type="button"
            onClick={onBack}
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-slate-400 transition hover:bg-slate-100 hover:text-slate-600"
          >
            <ArrowLeft className="h-4 w-4" />
          </button>
        )}
        <div className="flex flex-1 items-center gap-1">
          {Array.from({ length: total }, (_, i) => i + 1).map((n) => (
            <div
              key={n}
              className={`h-1.5 flex-1 rounded-full transition ${
                n < current ? 'bg-violet-500' : n === current ? 'bg-violet-300' : 'bg-slate-200'
              }`}
            />
          ))}
        </div>
      </div>
    </div>
  )
}

function SectionLayout({
  half,
  title,
  subtitle,
  children,
}: {
  half: 0 | 1 | 2
  title: string
  subtitle?: string
  children: ReactNode
}) {
  const halfLabel = half === 1 ? 'Before You Answer' : half === 2 ? 'After Already Rambling' : null
  return (
    <div className="space-y-5">
      <div>
        {halfLabel && (
          <p className="text-[10px] font-black uppercase tracking-[0.16em] text-violet-600">
            {halfLabel}
          </p>
        )}
        <h2 className={`${halfLabel ? 'mt-1' : ''} text-lg font-black text-slate-900`}>{title}</h2>
        {subtitle && <p className="mt-1 text-sm leading-6 text-slate-500">{subtitle}</p>}
      </div>
      {children}
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
      className="flex w-full items-center justify-center gap-2 rounded-xl bg-violet-600 px-5 py-3 text-sm font-extrabold text-white shadow-md transition hover:bg-violet-700 active:scale-[0.98] disabled:opacity-40 sm:rounded-2xl sm:py-3.5"
    >
      {icon}
      {children}
    </button>
  )
}

function Callout({ color, label, children }: { color: 'violet' | 'amber' | 'slate' | 'emerald'; label: string; children: ReactNode }) {
  const styles: Record<string, { border: string; bg: string; label: string }> = {
    violet: { border: 'border-violet-200', bg: 'bg-violet-50/50', label: 'text-violet-600' },
    amber: { border: 'border-amber-200', bg: 'bg-amber-50/50', label: 'text-amber-700' },
    slate: { border: 'border-slate-200', bg: 'bg-slate-50', label: 'text-slate-400' },
    emerald: { border: 'border-emerald-200', bg: 'bg-emerald-50/50', label: 'text-emerald-700' },
  }
  const s = styles[color]
  return (
    <div className={`rounded-xl border-2 ${s.border} ${s.bg} p-3 sm:rounded-2xl sm:p-4`}>
      <p className={`text-[10px] font-black uppercase tracking-[0.14em] ${s.label}`}>{label}</p>
      <div className="mt-1.5 sm:mt-2">{children}</div>
    </div>
  )
}

function ExampleBox({ children }: { children: ReactNode }) {
  return (
    <div className="rounded-2xl border-2 border-violet-300 bg-violet-50 px-4 py-3">
      <p className="text-sm font-bold leading-7 text-violet-900">{children}</p>
    </div>
  )
}

function Insight({ children }: { children: ReactNode }) {
  return (
    <div className="flex items-start gap-2.5 rounded-xl bg-slate-50 px-3 py-2.5">
      <Lightbulb className="mt-0.5 h-3.5 w-3.5 shrink-0 text-violet-500" />
      <p className="text-xs leading-5 text-slate-600">{children}</p>
    </div>
  )
}

function ComparisonBox({
  label,
  left,
  right,
}: {
  label: string
  left: { tag: string; text: string; color?: 'red' | 'amber' | 'slate' }
  right: { tag: string; text: string; color?: 'emerald' | 'violet' }
}) {
  const leftColor = left.color || 'slate'
  const rightColor = right.color || 'emerald'
  const leftStyles: Record<string, { border: string; bg: string; tag: string; text: string }> = {
    red: { border: 'border-red-200', bg: 'bg-red-50', tag: 'text-red-600', text: 'text-red-900' },
    amber: { border: 'border-amber-200', bg: 'bg-amber-50', tag: 'text-amber-700', text: 'text-amber-900' },
    slate: { border: 'border-slate-200', bg: 'bg-slate-50', tag: 'text-slate-400', text: 'text-slate-800' },
  }
  const rightStyles: Record<string, { border: string; bg: string; tag: string; text: string }> = {
    emerald: { border: 'border-emerald-200', bg: 'bg-emerald-50', tag: 'text-emerald-700', text: 'text-emerald-900' },
    violet: { border: 'border-violet-200', bg: 'bg-violet-50', tag: 'text-violet-600', text: 'text-violet-900' },
  }
  const ls = leftStyles[leftColor]
  const rs = rightStyles[rightColor]
  return (
    <div className="rounded-2xl border-2 border-slate-200 bg-white p-3">
      <p className="text-xs font-bold leading-5 text-slate-700">"{label}"</p>
      <div className="mt-2 space-y-2">
        <div className={`rounded-xl border ${ls.border} ${ls.bg} px-3 py-2`}>
          <p className={`text-[10px] font-black uppercase tracking-[0.14em] ${ls.tag}`}>{left.tag}</p>
          <p className={`mt-0.5 text-sm leading-6 ${ls.text}`}>"{left.text}"</p>
        </div>
        <div className={`rounded-xl border ${rs.border} ${rs.bg} px-3 py-2`}>
          <p className={`text-[10px] font-black uppercase tracking-[0.14em] ${rs.tag}`}>{right.tag}</p>
          <p className={`mt-0.5 text-sm leading-6 ${rs.text}`}>"{right.text}"</p>
        </div>
      </div>
    </div>
  )
}

function RecoveryExample({ example }: { example: { setup: string; ramble: string; recovery: string; continuation: string } }) {
  return (
    <div className="rounded-2xl border-2 border-slate-200 bg-white p-4">
      <p className="text-[10px] font-black uppercase tracking-[0.14em] text-slate-400">Example</p>
      <p className="mt-2 text-xs font-bold text-slate-500">Interviewer asks:</p>
      <p className="text-sm font-semibold leading-6 text-slate-800">{example.setup}</p>

      <div className="mt-3 rounded-xl border border-red-200 bg-red-50 px-3 py-2">
        <p className="text-[10px] font-black uppercase tracking-[0.14em] text-red-600">The ramble</p>
        <p className="mt-0.5 text-sm leading-6 text-red-900">{example.ramble}</p>
      </div>

      <div className="mt-2 rounded-xl border border-violet-300 bg-violet-50 px-3 py-2">
        <p className="text-[10px] font-black uppercase tracking-[0.14em] text-violet-700">The recovery</p>
        <p className="mt-0.5 text-sm font-bold leading-6 text-violet-900">{example.recovery}</p>
      </div>

      <div className="mt-2 rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2">
        <p className="text-[10px] font-black uppercase tracking-[0.14em] text-emerald-700">Then continue</p>
        <p className="mt-0.5 text-sm leading-6 text-emerald-900">{example.continuation}</p>
      </div>
    </div>
  )
}

function QuestionContext({ question }: { question: string }) {
  return (
    <div className="rounded-2xl border-2 border-slate-200 bg-slate-50 p-3">
      <p className="text-[10px] font-black uppercase tracking-[0.14em] text-slate-400">
        Interviewer asks
      </p>
      <p className="mt-1 text-sm font-bold leading-6 text-slate-800">"{question}"</p>
    </div>
  )
}

// ═══════════════════════════ Interactive Elements ═══════════════════════════

function CueWordPracticeField({ prompt, index }: { prompt: { question: string; hint: string }; index: number }) {
  const [value, setValue] = useState('')
  return (
    <div className="rounded-2xl border-2 border-slate-200 bg-white p-4">
      <p className="text-xs font-bold text-slate-500">Prompt {index + 1}</p>
      <p className="mt-1 text-sm font-semibold leading-6 text-slate-800">"{prompt.question}"</p>
      <p className="mt-1 text-xs leading-5 text-slate-400">{prompt.hint}</p>
      <input
        type="text"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        placeholder="Your 2–3 cue words…"
        className="mt-2 w-full rounded-xl border-2 border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-800 placeholder:text-slate-300 focus:border-violet-300 focus:outline-none focus:ring-1 focus:ring-violet-200"
      />
    </div>
  )
}

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

function LaneCheck({
  correctLane,
  feedback,
  onContinue,
}: {
  correctLane: AnswerLane
  feedback: string
  onContinue: () => void
}) {
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

function FeedbackBox({ isCorrect, feedback }: { isCorrect: boolean; feedback: string }) {
  return (
    <div
      className={`rounded-xl px-3 py-2.5 ${
        isCorrect ? 'border border-emerald-200 bg-emerald-50' : 'border border-amber-200 bg-amber-50'
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

// ═══════════════════════════ Quiz Screens ═══════════════════════════════════

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

      <div className={drill.kind === 'lane' ? 'grid grid-cols-2 gap-2' : 'space-y-2'}>
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
