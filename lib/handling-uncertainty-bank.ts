// ---------------------------------------------------------------------------
// Handling Uncertainty Lesson — Question Bank + Drill Generation
//
// Teaches the in-the-moment recovery move: Rephrase → Pause → Pick a Lane → Start
// This is a lesson/drill, not an answer builder. Fully deterministic, no AI calls.
//
// The 7 difficult questions are seeded from the real HR-screen curveball pool
// (lib/interview-prompts/hr_screen.ts), so the drills mirror what the AI
// interviewer actually asks, plus one classic behavioral story question.
// ---------------------------------------------------------------------------

export type AnswerLane =
  | 'story_lane'
  | 'career_alignment_lane'
  | 'professional_intro_lane'
  | 'process_lane'
  | 'direct_answer_lane'
  | 'honest_gap_lane'
  | 'clarifying_lane'

export const LANE_OPTIONS: { id: AnswerLane; label: string; definition: string }[] = [
  { id: 'story_lane', label: 'A specific story', definition: 'A real past example. Point your brain at one concrete situation.' },
  { id: 'career_alignment_lane', label: 'Why this role/company', definition: 'What you noticed and why it fits you.' },
  { id: 'professional_intro_lane', label: 'Who you are professionally', definition: 'A clear framing of your background and direction.' },
  { id: 'process_lane', label: 'How you would handle it', definition: 'Your step-by-step approach, not a past story.' },
  { id: 'direct_answer_lane', label: 'A clear pick or opinion', definition: 'Choose one thing and commit to it.' },
  { id: 'honest_gap_lane', label: 'An honest "I’m working on it"', definition: 'Name a real gap and show you’re developing it.' },
  { id: 'clarifying_lane', label: 'A clarifying question', definition: 'Make sure you’re answering what was actually asked.' },
]

export const LANE_LABEL: Record<AnswerLane, string> = LANE_OPTIONS.reduce(
  (acc, lane) => ({ ...acc, [lane.id]: lane.label }),
  {} as Record<AnswerLane, string>
)

export interface DifficultQuestion {
  id: string
  question: string
  simplifiedRephrase: string
  correctLane: AnswerLane
  weakStarts: string[]
  strongStarts: string[]
  distractorRephrases: string[]
  explanation: string
}

// 7 questions: the 6 real HR curveball questions + 1 classic behavioral story Q.
export const DIFFICULT_QUESTIONS: DifficultQuestion[] = [
  {
    id: 'learn_quickly',
    question: 'What would you want to learn quickly if you started here?',
    simplifiedRephrase: 'what I’d want to get up to speed on fast if I started here',
    correctLane: 'direct_answer_lane',
    weakStarts: [
      'I’m a fast learner, so honestly I could pick up just about anything.',
      'There’s probably a lot — it really depends on the team.',
      'I deal with new things all the time, so I’m not too worried about it.',
    ],
    strongStarts: [
      'Yeah, so if I had to pick one thing I’d want to get up to speed on fast… I’d say…',
    ],
    distractorRephrases: [
      'why I’m a quick learner',
      'what I already know how to do',
      'why I want to work here',
    ],
    explanation: 'This wants a clear pick, not a story. Name one concrete thing you’d prioritize learning.',
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
      'Yeah, so one skill I’m actively working on improving… let me think about that for a second.',
    ],
    distractorRephrases: [
      'why I’m great at my job',
      'a time someone else struggled',
      'what my biggest strength is',
    ],
    explanation: 'Name one real area honestly, then show you’re working on it. Don’t dodge with a fake weakness.',
  },
  {
    id: 'resume_explain',
    question: 'What’s something on your resume you’d want to explain more clearly?',
    simplifiedRephrase: 'one thing on my resume I’d want to give more context on',
    correctLane: 'direct_answer_lane',
    weakStarts: [
      'Everything on there is pretty self-explanatory, I think.',
      'I’m not sure — it all makes sense to me.',
      'My whole resume tells a pretty clear story, honestly.',
    ],
    strongStarts: [
      'Yeah, so one thing on my resume I’d want to give a bit more context on… is…',
    ],
    distractorRephrases: [
      'why my resume is strong',
      'what my favorite job was',
      'a part of my resume I’d remove',
    ],
    explanation: 'Pick one specific line and add context. Treating it as "nothing to explain" wastes the opening.',
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
    explanation: 'Describe your actual system. A real process beats "I’m just naturally organized."',
  },
  {
    id: 'disagree_coworker',
    question: 'Tell me about a time you disagreed with a coworker and how you handled it.',
    simplifiedRephrase: 'a real example where I disagreed with a coworker and what I did',
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
    explanation: 'This asks for a specific past example. Point your brain at one real story instead of talking in general.',
  },
]

export interface RecoveryMoveDrill {
  id: string
  scenario: string
  options: string[]
  correctIndex: number
  feedback: string
}

export const RECOVERY_MOVE_DRILLS: RecoveryMoveDrill[] = [
  {
    id: 'mid_ramble',
    scenario: 'You’re halfway through an answer and realize you’re rambling. What should you say?',
    options: [
      'Sorry, I’m bad at explaining this.',
      'Let me reset that more clearly. The main point is…',
      'Anyway, like I was saying, there are a lot of things to consider.',
      'I hope that answers your question.',
    ],
    correctIndex: 1,
    feedback: 'You can recover mid-answer. A clean reset beats continuing to ramble.',
  },
  {
    id: 'blank_mind',
    scenario: 'The interviewer asks a question and your mind goes blank. What’s the best move?',
    options: [
      'I’m not sure, sorry.',
      'That’s a good question — let me take a second to think about it.',
      'Can we come back to that one later?',
      'Um… well… it depends, I guess.',
    ],
    correctIndex: 1,
    feedback: 'A short, calm pause reads as thoughtful. You don’t need to apologize or stall.',
  },
  {
    id: 'wrong_question',
    scenario: 'You realize you started answering a different question than the one you were asked. What do you do?',
    options: [
      'Keep going so it doesn’t seem like a mistake.',
      'Let me make sure I’m actually answering what you asked — you wanted…',
      'Sorry, ignore all of that.',
      'Anyway, that’s basically my answer.',
    ],
    correctIndex: 1,
    feedback: 'Redirecting cleanly shows self-awareness. Steering back beats barreling on.',
  },
]

export const RESET_PHRASE_BANK: string[] = [
  '“Yeah, so you’re asking…”',
  '“Let me think about the best example.”',
  '“That’s a good question. I want to answer that clearly.”',
  '“I don’t have a perfect example, but the closest one is…”',
  '“The way I’d approach that is…”',
  '“If I had to pick one, I’d say…”',
  '“Let me reset that more clearly.”',
  '“The main point is…”',
]

// Generic weak starts used to round out distractors in "fix the weak start" drills.
const GENERIC_WEAK_STARTS = [
  'I think it really just depends on the situation.',
  'That’s a hard one — there are so many ways to answer it.',
  'I’m honestly not totally sure, but I’ll try.',
  'I’m good at that kind of thing in general.',
]

// ========================== DRILL GENERATION ==========================

export type Drill =
  | { kind: 'best_reset'; id: string; question: string; options: string[]; correctIndex: number; feedback: string }
  | { kind: 'match_rephrase'; id: string; question: string; options: string[]; correctIndex: number; feedback: string }
  | { kind: 'pick_lane'; id: string; question: string; options: { label: string; laneId: AnswerLane }[]; correctIndex: number; feedback: string }
  | { kind: 'fix_weak_start'; id: string; question: string; weakStart: string; options: string[]; correctIndex: number; feedback: string }
  | { kind: 'complete_line'; id: string; question: string; tiles: string[]; correctOrder: string[]; feedback: string }
  | { kind: 'recovery_move'; id: string; scenario: string; options: string[]; correctIndex: number; feedback: string }

const QUESTION_DRILL_KINDS = ['best_reset', 'match_rephrase', 'pick_lane', 'fix_weak_start', 'complete_line'] as const
type QuestionDrillKind = (typeof QUESTION_DRILL_KINDS)[number]

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

function buildQuestionDrill(kind: QuestionDrillKind, q: DifficultQuestion): Drill {
  switch (kind) {
    case 'best_reset': {
      const { options, correctIndex } = buildOptionsWithCorrect(q.strongStarts[0], sample(q.weakStarts, 3))
      return { kind, id: q.id, question: q.question, options, correctIndex, feedback: q.explanation }
    }
    case 'match_rephrase': {
      const { options, correctIndex } = buildOptionsWithCorrect(q.simplifiedRephrase, sample(q.distractorRephrases, 3))
      return {
        kind,
        id: q.id,
        question: q.question,
        options,
        correctIndex,
        feedback: 'The rephrase should make the question easier to search in your memory.',
      }
    }
    case 'pick_lane': {
      const distractorLanes = sample(
        LANE_OPTIONS.filter((lane) => lane.id !== q.correctLane),
        3
      )
      const laneEntries = shuffle([
        { label: LANE_LABEL[q.correctLane], laneId: q.correctLane },
        ...distractorLanes.map((lane) => ({ label: lane.label, laneId: lane.id })),
      ])
      return {
        kind,
        id: q.id,
        question: q.question,
        options: laneEntries,
        correctIndex: laneEntries.findIndex((entry) => entry.laneId === q.correctLane),
        feedback: q.explanation,
      }
    }
    case 'fix_weak_start': {
      const weakStart = q.weakStarts[0]
      const otherWeak = q.weakStarts.slice(1)
      const distractors = [...otherWeak, ...sample(GENERIC_WEAK_STARTS, 3 - otherWeak.length)].slice(0, 3)
      const { options, correctIndex } = buildOptionsWithCorrect(q.strongStarts[0], distractors)
      return {
        kind,
        id: q.id,
        question: q.question,
        weakStart,
        options,
        correctIndex,
        feedback: 'The weak start talks in general. The better start pushes you toward something specific.',
      }
    }
    case 'complete_line': {
      const correctOrder = ['Yeah, so', q.simplifiedRephrase, 'let me think about that for a second.']
      const distractorTiles = sample(
        ['because communication matters', 'and I’m a quick learner', 'a time I handled conflict', 'what makes this role interesting'],
        2
      )
      const tiles = shuffle([...correctOrder, ...distractorTiles])
      return {
        kind,
        id: q.id,
        question: q.question,
        tiles,
        correctOrder,
        feedback: 'Good. This turns the question into something simpler your brain can answer.',
      }
    }
  }
}

function buildRecoveryDrill(): Drill {
  const base = sample(RECOVERY_MOVE_DRILLS, 1)[0]
  const correct = base.options[base.correctIndex]
  const options = shuffle(base.options)
  return {
    kind: 'recovery_move',
    id: base.id,
    scenario: base.scenario,
    options,
    correctIndex: options.indexOf(correct),
    feedback: base.feedback,
  }
}

// Build one lesson attempt: 4 question-based drills (distinct kinds + distinct
// questions) plus 1 recovery-move drill, in randomized order. Each attempt pulls
// a fresh random slice so the sequence is rarely the same twice.
export function buildLessonDrills(): Drill[] {
  const kinds = sample([...QUESTION_DRILL_KINDS], 4)
  const questions = sample(DIFFICULT_QUESTIONS, 4)
  const questionDrills = kinds.map((kind, i) => buildQuestionDrill(kind, questions[i]))
  return shuffle([...questionDrills, buildRecoveryDrill()])
}

export const LESSON_PASS_THRESHOLD = 4 // out of 5
