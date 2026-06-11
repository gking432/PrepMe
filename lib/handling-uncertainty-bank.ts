// ---------------------------------------------------------------------------
// Handling Uncertainty Lesson — Question Bank + Static Content
//
// Teaches the in-the-moment recovery move: Rephrase → Pause → Cue Words →
// Pick a Lane → Start Clean (plus the emergency mid-answer reset).
//
// Fully deterministic — no AI calls. The 7 difficult questions are seeded
// from the real HR-screen curveball pool (lib/interview-prompts/hr_screen.ts)
// plus one classic behavioral story question for lane diversity.
// ---------------------------------------------------------------------------

export type AnswerLane =
  | 'story_lane'
  | 'career_alignment_lane'
  | 'professional_intro_lane'
  | 'process_lane'
  | 'direct_answer_lane'
  | 'honest_gap_lane'
  | 'clarifying_lane'

export interface LaneInfo {
  id: AnswerLane
  label: string
  shortLabel: string
  whenToUse: string
  starter: string
}

export const LANE_OPTIONS: LaneInfo[] = [
  {
    id: 'story_lane',
    label: 'Story',
    shortLabel: 'Story',
    whenToUse: 'When the question asks for a past example.',
    starter: '“The example that comes to mind is…”',
  },
  {
    id: 'career_alignment_lane',
    label: 'Career alignment',
    shortLabel: 'Career alignment',
    whenToUse: 'When the question asks why this role, why this company, or why now.',
    starter: '“What stood out to me is…”',
  },
  {
    id: 'professional_intro_lane',
    label: 'Professional intro',
    shortLabel: 'Pro intro',
    whenToUse: 'When the question asks about your background or who you are professionally.',
    starter: '“The clearest way to describe my background is…”',
  },
  {
    id: 'process_lane',
    label: 'Process',
    shortLabel: 'Process',
    whenToUse: 'When the question asks what you would do or how you would handle something.',
    starter: '“The way I’d approach that is…”',
  },
  {
    id: 'direct_answer_lane',
    label: 'Direct answer',
    shortLabel: 'Direct',
    whenToUse: 'When the question asks for a preference, strength, weakness, or opinion.',
    starter: '“If I had to pick one, I’d say…”',
  },
  {
    id: 'honest_gap_lane',
    label: 'Honest gap',
    shortLabel: 'Honest gap',
    whenToUse: 'When you don’t have a perfect example or don’t fully know the answer.',
    starter: '“I don’t have a perfect example, but the closest one is…”',
  },
  {
    id: 'clarifying_lane',
    label: 'Clarifying',
    shortLabel: 'Clarify',
    whenToUse: 'When the question is too broad or ambiguous to answer cleanly.',
    starter: '“I want to make sure I’m answering that the right way. Are you asking more about…?”',
  },
]

export const LANE_LABEL: Record<AnswerLane, string> = LANE_OPTIONS.reduce(
  (acc, lane) => ({ ...acc, [lane.id]: lane.label }),
  {} as Record<AnswerLane, string>
)

export interface CueWordOptions {
  options: string[]
  correctIndex: number
}

export interface DifficultQuestion {
  id: string
  question: string
  simplifiedRephrase: string
  correctLane: AnswerLane
  weakStarts: string[]
  strongStarts: string[]
  distractorRephrases: string[]
  cueWordOptions: CueWordOptions
  explanation: string
}

// 7 questions: the 6 real HR curveball questions + 1 classic behavioral story Q.
export const DIFFICULT_QUESTIONS: DifficultQuestion[] = [
  {
    id: 'learn_quickly',
    question: 'What would you want to learn quickly if you started here?',
    simplifiedRephrase: 'what I’d want to get up to speed on first',
    correctLane: 'process_lane',
    weakStarts: [
      'I’m a fast learner, so honestly I could pick up just about anything.',
      'There’s probably a lot — it really depends on the team.',
      'I deal with new things all the time, so I’m not too worried about it.',
    ],
    strongStarts: [
      'Yeah, so if I had to pick one thing to learn quickly, I’d want to understand how success is measured in the first 90 days.',
    ],
    distractorRephrases: [
      'why I’m a quick learner',
      'what I already know how to do',
      'why I want to work here',
    ],
    cueWordOptions: {
      options: [
        'fast learner / adaptable / excited',
        'systems / customers / team expectations',
        'company / role / opportunity',
        'everything / anything / whatever helps',
      ],
      correctIndex: 1,
    },
    explanation: 'This is asking how you’d approach ramping up, not whether you’re generally a fast learner.',
  },
  {
    id: 'still_developing',
    question: 'Tell me about an area where you’re still developing professionally.',
    simplifiedRephrase: 'one skill I’m actively working on improving',
    correctLane: 'honest_gap_lane',
    weakStarts: [
      'Honestly I work on everything — I’m always trying to improve.',
      'I’d say I’m a perfectionist, so that’s probably my weakness.',
      'Nothing major comes to mind, I’m pretty well-rounded.',
    ],
    strongStarts: [
      'Yeah, so one skill I’m actively working on improving… let me think about the clearest example.',
    ],
    distractorRephrases: [
      'why I’m great at my job',
      'a time someone else struggled',
      'what my biggest strength is',
    ],
    cueWordOptions: {
      options: [
        'one skill / actively / how I’m improving',
        'strengths / weaknesses / balance',
        'perfectionist / detail-oriented / overthinking',
        'hard worker / improvement / growth',
      ],
      correctIndex: 0,
    },
    explanation: 'Name one real area honestly, then show you’re working on it. Don’t dodge with a fake weakness.',
  },
  {
    id: 'resume_explain',
    question: 'What’s something on your resume you’d want to explain more clearly?',
    simplifiedRephrase: 'what part of my background might need more context',
    correctLane: 'direct_answer_lane',
    weakStarts: [
      'Everything on there is pretty self-explanatory, I think.',
      'I’m not sure — it all makes sense to me.',
      'My whole resume tells a pretty clear story, honestly.',
    ],
    strongStarts: [
      'Yeah, so one line on my resume I’d want to give a bit more context on… is…',
    ],
    distractorRephrases: [
      'which job on my resume was my favorite',
      'why my resume is strong for this role',
      'what experience I wish I had more of',
    ],
    cueWordOptions: {
      options: [
        'favorite job / proudest moment / best experience',
        'one line / more context / why I included it',
        'removing / regretting / changing',
        'strongest / impressive / standout',
      ],
      correctIndex: 1,
    },
    explanation: 'They’re asking where your resume might create confusion or deserve more context — not what you’re proudest of.',
  },
  {
    id: 'missing_context',
    question: 'If you joined a team and realized you were missing context, how would you handle that?',
    simplifiedRephrase: 'how I’d handle realizing I was missing context on a new team',
    correctLane: 'process_lane',
    weakStarts: [
      'I’d just figure it out — I’m pretty resourceful.',
      'That happens all the time, you just adapt.',
      'I’m good with ambiguity, so it wouldn’t really be an issue.',
    ],
    strongStarts: [
      'Yeah, so how I’d approach realizing I was missing context… the way I’d handle that is…',
    ],
    distractorRephrases: [
      'a time I joined a new team',
      'why I’m good under pressure',
      'why I want to join this team',
    ],
    cueWordOptions: {
      options: [
        'resourceful / adaptive / quick',
        'what I’d ask / who I’d talk to / how I’d catch up',
        'confused / behind / overwhelmed',
        'leadership / mentorship / training',
      ],
      correctIndex: 1,
    },
    explanation: 'This is a "how would you" question — give your process, step by step, not a vague claim that you’d "adapt."',
  },
  {
    id: 'handle_stress',
    question: 'How do you handle stressful situations?',
    simplifiedRephrase: 'how I deal with stress',
    correctLane: 'process_lane',
    weakStarts: [
      'Honestly I don’t really get stressed, I stay pretty calm.',
      'Stress is just part of the job — you deal with it.',
      'I work well under pressure, so it’s not really a problem.',
    ],
    strongStarts: [
      'Yeah, so the way I handle stress… my approach is…',
    ],
    distractorRephrases: [
      'a time I was stressed',
      'why I’m calm under pressure',
      'why stress is bad',
    ],
    cueWordOptions: {
      options: [
        'calm / cool / collected',
        'what I do / my approach / steps I take',
        'deadlines / pressure / chaos',
        'never stressed / love pressure / thrive on it',
      ],
      correctIndex: 1,
    },
    explanation: 'Walk through what you actually do when stress hits. "I just stay calm" tells the interviewer nothing.',
  },
  {
    id: 'stay_organized',
    question: 'How do you stay organized?',
    simplifiedRephrase: 'how I keep myself organized',
    correctLane: 'process_lane',
    weakStarts: [
      'I’m just a naturally organized person.',
      'I use a to-do list and stuff like that.',
      'I don’t really have a system, I just remember things.',
    ],
    strongStarts: [
      'Yeah, so the way I keep myself organized… what I do is…',
    ],
    distractorRephrases: [
      'a time I was disorganized',
      'why organization matters',
      'what tools my company uses',
    ],
    cueWordOptions: {
      options: [
        'naturally organized / detail-oriented / disciplined',
        'my system / tools I use / how I prioritize',
        'messy desk / chaotic / structured',
        'focused / efficient / fast',
      ],
      correctIndex: 1,
    },
    explanation: 'Describe your actual system. A real process beats "I’m just naturally organized."',
  },
  {
    id: 'disagree_coworker',
    question: 'Tell me about a time you disagreed with a coworker and how you handled it.',
    simplifiedRephrase: 'a specific example where I disagreed with a coworker and what I did',
    correctLane: 'story_lane',
    weakStarts: [
      'I deal with disagreements all the time — communication is really important to me.',
      'I usually just hear the other person out and we figure it out.',
      'I try to avoid conflict whenever I can, honestly.',
    ],
    strongStarts: [
      'Yeah, so a specific time I disagreed with a coworker… let me think of the best example.',
    ],
    distractorRephrases: [
      'why I’m good at communication',
      'how I generally deal with people',
      'a time someone disagreed with my manager',
    ],
    cueWordOptions: {
      options: [
        'coworker / disagreement / what I did',
        'teamwork / communication / respect',
        'conflict / people / workplace',
        'manager / feedback / performance',
      ],
      correctIndex: 0,
    },
    explanation: 'This asks for a specific past example. Point your brain at one real story instead of talking in general.',
  },
]

export interface RecoveryScenario {
  id: string
  scenario: string
  options: string[]
  correctIndex: number
  feedback: string
}

export const RECOVERY_SCENARIOS: RecoveryScenario[] = [
  {
    id: 'wrong_question',
    scenario: 'You realize you started answering a different question than the one you were asked.',
    options: [
      '“Anyway, that’s basically my answer.”',
      '“Let me make sure I’m actually answering what you asked. You were asking about…”',
      'Keep going so it doesn’t seem like a mistake.',
      '“Sorry, ignore all of that.”',
    ],
    correctIndex: 1,
    feedback: 'You don’t need to pretend the ramble didn’t happen. A clean reset sounds more composed than forcing the wrong answer to continue.',
  },
  {
    id: 'too_general',
    scenario: 'You’re 30 seconds in and realize you’re giving general advice instead of the specific example they asked for.',
    options: [
      '“So yeah, communication is just really important.”',
      '“Let me make that more specific. The example that comes to mind is…”',
      '“That probably answers it.”',
      '“I guess it depends on the situation.”',
    ],
    correctIndex: 1,
    feedback: 'This moves from general talk back into the story lane.',
  },
  {
    id: 'blank_mid',
    scenario: 'Mid-sentence, you lose the thread completely. What’s the best move?',
    options: [
      '“Um… anyway…”',
      '“Let me reset that more clearly. The main point is…”',
      '“Can you repeat the question?”',
      'Trail off and hope they ask a follow-up.',
    ],
    correctIndex: 1,
    feedback: 'A short, calm reset reads as composed. Trailing off or bouncing the question back reads as flustered.',
  },
]

export const RESET_PHRASE_BANK: string[] = [
  '“Let me reset that more clearly.”',
  '“The simpler answer is…”',
  '“I’m giving too much context. The main point is…”',
  '“Let me make sure I’m answering what you asked. You were asking about…”',
  '“The example that comes to mind is…”',
  '“If I had to pick one, I’d say…”',
  '“Let me jot that down for a second.”',
  '“Good question. I want to answer that clearly.”',
]

// ========================== QUIZ GENERATION ==========================

export type QuizDrill =
  | { kind: 'rephrase'; questionId: string; question: string; options: string[]; correctIndex: number; feedback: string }
  | { kind: 'cue_words'; questionId: string; question: string; options: string[]; correctIndex: number; feedback: string }
  | { kind: 'lane'; questionId: string; question: string; options: { label: string; laneId: AnswerLane }[]; correctIndex: number; feedback: string }
  | { kind: 'stronger_start'; questionId: string; question: string; options: string[]; correctIndex: number; feedback: string }
  | { kind: 'mid_reset'; questionId: string; scenario: string; options: string[]; correctIndex: number; feedback: string }

function shuffle<T>(items: T[]): T[] {
  const clone = [...items]
  for (let i = clone.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[clone[i], clone[j]] = [clone[j], clone[i]]
  }
  return clone
}

function sample<T>(items: T[], n: number): T[] {
  return shuffle(items).slice(0, n)
}

function buildOptionsWithCorrect(correct: string, distractors: string[]): { options: string[]; correctIndex: number } {
  const options = shuffle([correct, ...distractors])
  return { options, correctIndex: options.indexOf(correct) }
}

// Build the 5-question final quiz: one of each format (rephrase, cue words,
// lane, stronger start, mid-answer reset). Each pulls a distinct random
// question from the bank where possible, so the quiz rarely repeats verbatim.
export function buildQuiz(): QuizDrill[] {
  const bankSample = sample(DIFFICULT_QUESTIONS, 4)
  const [qRephrase, qCueWords, qLane, qStart] = bankSample

  const rephrase: QuizDrill = (() => {
    const { options, correctIndex } = buildOptionsWithCorrect(
      qRephrase.simplifiedRephrase,
      sample(qRephrase.distractorRephrases, 3)
    )
    return {
      kind: 'rephrase',
      questionId: qRephrase.id,
      question: qRephrase.question,
      options,
      correctIndex,
      feedback: qRephrase.explanation,
    }
  })()

  const cueWords: QuizDrill = {
    kind: 'cue_words',
    questionId: qCueWords.id,
    question: qCueWords.question,
    options: qCueWords.cueWordOptions.options,
    correctIndex: qCueWords.cueWordOptions.correctIndex,
    feedback: qCueWords.explanation,
  }

  const lane: QuizDrill = (() => {
    const distractorLanes = sample(
      LANE_OPTIONS.filter((l) => l.id !== qLane.correctLane),
      3
    )
    const correctOption = { label: LANE_LABEL[qLane.correctLane], laneId: qLane.correctLane }
    const allOptions = shuffle([
      correctOption,
      ...distractorLanes.map((l) => ({ label: l.label, laneId: l.id })),
    ])
    return {
      kind: 'lane',
      questionId: qLane.id,
      question: qLane.question,
      options: allOptions,
      correctIndex: allOptions.findIndex((o) => o.laneId === qLane.correctLane),
      feedback: qLane.explanation,
    }
  })()

  const strongerStart: QuizDrill = (() => {
    const { options, correctIndex } = buildOptionsWithCorrect(
      qStart.strongStarts[0],
      sample(qStart.weakStarts, 3)
    )
    return {
      kind: 'stronger_start',
      questionId: qStart.id,
      question: qStart.question,
      options,
      correctIndex,
      feedback: 'The strong start narrows the answer toward something specific instead of talking in general.',
    }
  })()

  const midReset: QuizDrill = (() => {
    const base = sample(RECOVERY_SCENARIOS, 1)[0]
    const correct = base.options[base.correctIndex]
    const options = shuffle(base.options)
    return {
      kind: 'mid_reset',
      questionId: base.id,
      scenario: base.scenario,
      options,
      correctIndex: options.indexOf(correct),
      feedback: base.feedback,
    }
  })()

  return [rephrase, cueWords, lane, strongerStart, midReset]
}

export const QUIZ_PASS_THRESHOLD = 4 // out of 5
