/**
 * Practice bundles for adaptive post-interview training.
 * Each bundle targets a specific root cause of poor interview answers
 * and provides teach + exercises to build the underlying skill.
 *
 * Exercise types:
 * - multiple_choice: 4 options, one correct
 * - label_sort: categorize segments into buckets
 * - fill_in_blank: complete a template with blanks
 * - short_answer: free-text response (bridges to full AI re-answer)
 */

export interface MultipleChoiceExercise {
  type: 'multiple_choice'
  question: string
  options: string[]
  correctIndex: number
  explanation: string
}

export interface LabelSortExercise {
  type: 'label_sort'
  instruction: string
  segments: { text: string; correctLabel: string }[]
}

export interface FillInBlankExercise {
  type: 'fill_in_blank'
  instruction: string
  template: string
  blanks: string[]
}

export interface ShortAnswerExercise {
  type: 'short_answer'
  prompt: string
  hint: string
  maxLength: number
}

export type Exercise = MultipleChoiceExercise | LabelSortExercise | FillInBlankExercise | ShortAnswerExercise

export interface PracticeBundle {
  rootCause: string
  displayName: string
  description: string
  teach: {
    title: string
    explanation: string
    example: {
      question: string
      badAnswer: string
      goodAnswer: string
      breakdown: Record<string, string>
    }
  }
  exercises: Exercise[]
}

export const PRACTICE_BUNDLES: PracticeBundle[] = [
  {
    rootCause: 'poor_structure',
    displayName: 'Answer Structure',
    description: "Your answers lacked clear organization. Let's learn a framework.",
    teach: {
      title: 'The STAR Method',
      explanation:
        'Strong answers follow a clear story: Situation, Task, Action, Result. This keeps your response focused and easy to follow while showing impact.',
      example: {
        question: 'Tell me about a time you solved a problem.',
        badAnswer:
          "Yeah, I've solved a lot of problems. One time there was an issue with a project timeline and I worked with the team to fix it and we got things back on track.",
        goodAnswer:
          'At my previous internship, our team fell behind on a product launch due to unclear responsibilities. I was responsible for coordinating communication across teams. I created a shared task tracker and held short daily check-ins to align everyone. As a result, we caught up within a week and launched on time.',
        breakdown: {
          situation: 'Our team fell behind on a product launch due to unclear responsibilities.',
          task: 'I was responsible for coordinating communication across teams.',
          action: 'I created a shared task tracker and held short daily check-ins.',
          result: 'We caught up within a week and launched on time.',
        },
      },
    },
    exercises: [
      {
        type: 'multiple_choice',
        question: 'What is the main purpose of using the STAR method?',
        options: [
          'To make answers longer',
          'To organize answers clearly and show impact',
          'To memorize responses',
          'To avoid giving examples',
        ],
        correctIndex: 1,
        explanation: 'STAR helps structure answers clearly and demonstrate results.',
      },
      {
        type: 'multiple_choice',
        question: 'Which part of STAR focuses on what you actually did?',
        options: ['Situation', 'Task', 'Action', 'Result'],
        correctIndex: 2,
        explanation: 'Action is where you explain your specific steps.',
      },
      {
        type: 'label_sort',
        instruction: 'Label each part of this answer as S, T, A, or R',
        segments: [
          { text: 'Our team was missing deadlines due to unclear ownership.', correctLabel: 'situation' },
          { text: 'I was asked to improve team coordination.', correctLabel: 'task' },
          { text: 'I introduced a weekly planning meeting and task assignments.', correctLabel: 'action' },
          { text: 'We improved delivery speed by 30%.', correctLabel: 'result' },
        ],
      },
      {
        type: 'multiple_choice',
        question: 'Which of these is the strongest "Result" statement?',
        options: [
          'Things got better after that.',
          'The project was completed.',
          'We reduced delivery time by 30% and received positive client feedback.',
          'Everyone was happy with the outcome.',
        ],
        correctIndex: 2,
        explanation: 'Strong results are specific and measurable.',
      },
      {
        type: 'short_answer',
        prompt: 'Write a full STAR response to: Tell me about a time you handled a tight deadline.',
        hint: 'Include all 4 parts: situation, task, action, result. Keep it under 5 sentences.',
        maxLength: 300,
      },
    ],
  },
  {
    rootCause: 'lack_of_specificity',
    displayName: 'Specificity & Impact',
    description: "Your answers were too vague. Let's make every claim provable.",
    teach: {
      title: 'The Specificity Ladder',
      explanation:
        'Vague answers lose credibility. Climb three rungs: (1) Name the exact thing. (2) Say what you did to it. (3) Quantify what changed. "More efficient" means nothing — "cut reporting time by 80%" is unforgettable.',
      example: {
        question: 'Tell me about a time you improved a process.',
        badAnswer:
          'I helped streamline a process at work and made things more efficient for everyone.',
        goodAnswer:
          'Our team spent 4 hours every Friday generating client reports by hand. I wrote a script that pulled the data automatically — reducing report time from 4 hours to 15 minutes. The team reinvested that time into actual analysis.',
        breakdown: {
          claim: 'Name the thing: "client reports"',
          specifics: 'Name what you did: "wrote a script to automate data pulls"',
          metric: 'Quantify it: "4 hours → 15 minutes"',
          impact: 'State why it mattered: "team reinvested time into higher-value work"',
        },
      },
    },
    exercises: [
      {
        type: 'multiple_choice',
        question: 'Which statement passes the specificity test?',
        options: [
          'I improved team efficiency.',
          'I helped the team work better together.',
          'I cut our deployment time from 45 minutes to 8 minutes by parallelizing the build steps.',
          'I made significant improvements to our processes.',
        ],
        correctIndex: 2,
        explanation: 'It names the thing, says what was done, and quantifies the change.',
      },
      {
        type: 'multiple_choice',
        question: "Why is 'I reduced onboarding from 12 steps to 4' stronger than 'I simplified onboarding'?",
        options: [
          "It's longer",
          'It proves the claim with a measurable before and after',
          'It uses more impressive vocabulary',
          'It shows more effort',
        ],
        correctIndex: 1,
        explanation: 'Numbers are proof. Adjectives are just claims anyone can make.',
      },
      {
        type: 'label_sort',
        instruction: 'Specific (provable) or Vague (unverifiable)?',
        segments: [
          { text: 'I made things more efficient.', correctLabel: 'vague' },
          { text: 'I reduced customer wait time from 8 minutes to 3 minutes.', correctLabel: 'specific' },
          { text: 'I was involved in improving team performance.', correctLabel: 'vague' },
          { text: 'I automated 12 weekly reports, saving 6 hours per week.', correctLabel: 'specific' },
          { text: 'I helped grow revenue.', correctLabel: 'vague' },
          { text: 'I redesigned the checkout flow, increasing conversion by 14%.', correctLabel: 'specific' },
        ],
      },
      {
        type: 'multiple_choice',
        question: "Best way to add specificity to 'I improved a process'?",
        options: [
          'I significantly improved an important process.',
          'I improved the onboarding process — reducing steps from 12 to 4 and cutting completion time by 60%.',
          'I improved a process and the team was very happy.',
          'I worked hard to improve a key process at the company.',
        ],
        correctIndex: 1,
        explanation: 'It names the process, the change, and the measurable result.',
      },
      {
        type: 'short_answer',
        prompt: "Climb the Specificity Ladder on this answer: 'I improved a process at work.'",
        hint: 'Name the exact process, what you did to it, and at least one number that proves it.',
        maxLength: 200,
      },
    ],
  },
  {
    rootCause: 'weak_communication',
    displayName: 'Confident Delivery',
    description: "Hedge words are killing your credibility. Let's cut them.",
    teach: {
      title: 'Cut the Hedges',
      explanation:
        "Hedge words — 'I think', 'kind of', 'sort of', 'I guess', 'maybe' — make you sound unsure of your own experience. You were there. You did it. Every hedge word transfers doubt to the interviewer. Lead with your answer, then support it.",
      example: {
        question: 'Why are you interested in this role?',
        badAnswer:
          "Um, so I guess I kind of feel like this could be a really good opportunity and I think I could maybe learn a lot and grow, you know?",
        goodAnswer:
          "I'm interested because this role combines data analysis and product strategy — two areas I've been building in parallel. I ran A/B tests and built dashboards in my last internship. I want to apply that at the product decision level.",
        breakdown: {
          hedge_count: '8 hedges in the weak answer: um, so, I guess, kind of, feel like, could be, I think, maybe',
          lead_strong: 'Lead with the direct answer: "I\'m interested because..."',
          evidence: 'Back it with concrete proof: A/B tests, dashboards — real things',
          forward: 'End with what you want to do, not what you "hope" might happen',
        },
      },
    },
    exercises: [
      {
        type: 'multiple_choice',
        question: 'Which sentence has zero hedge words?',
        options: [
          "I think I kind of helped improve the process.",
          "I guess I was sort of responsible for the project.",
          "I redesigned the onboarding flow and cut drop-off by 35%.",
          "I maybe contributed to some improvements.",
        ],
        correctIndex: 2,
        explanation: "It states what happened directly, with no uncertainty injected.",
      },
      {
        type: 'label_sort',
        instruction: 'Hedge word or confident language?',
        segments: [
          { text: 'I think I was involved in...', correctLabel: 'hedge' },
          { text: 'I led the redesign of...', correctLabel: 'confident' },
          { text: 'I kind of helped improve...', correctLabel: 'hedge' },
          { text: 'I reduced churn by 20% by...', correctLabel: 'confident' },
          { text: 'I guess I sort of managed...', correctLabel: 'hedge' },
          { text: 'I owned the project end-to-end.', correctLabel: 'confident' },
        ],
      },
      {
        type: 'multiple_choice',
        question: "How should you start an answer to 'Tell me about yourself'?",
        options: [
          "Well, so basically I'm like a pretty good generalist I guess...",
          "Um, I think I would describe myself as kind of a problem-solver...",
          "I'm a product analyst with 2 years of experience building data pipelines.",
          "I guess you could say I'm someone who likes to learn new things.",
        ],
        correctIndex: 2,
        explanation: 'Lead with a direct, concrete statement of who you are and what you do.',
      },
      {
        type: 'multiple_choice',
        question: "Best clean rewrite of: 'I think I sort of helped the team maybe improve their process.'",
        options: [
          "I helped improve things for the team.",
          "I streamlined the team's QA process, cutting review cycles from 3 days to 1.",
          "I was involved in some process improvements.",
          "I contributed to making the team more efficient.",
        ],
        correctIndex: 1,
        explanation: 'No hedges, names the process, and quantifies the result.',
      },
      {
        type: 'short_answer',
        prompt: "Remove ALL hedge words and rewrite this directly: 'I think I sort of helped my team become maybe a bit more organized.'",
        hint: 'Say exactly what you did. Name the thing you improved. No "I think", "kind of", "sort of", "maybe".',
        maxLength: 150,
      },
    ],
  },
  {
    rootCause: 'missing_knowledge',
    displayName: 'Research That Lands',
    description: "Generic answers signal zero prep. Let's make yours impossible to ignore.",
    teach: {
      title: 'The Research Bridge',
      explanation:
        "The Research Bridge connects three things: their priority → your evidence → how you'd bring it. 'Great culture' flatters no one. Naming what they actually care about and proving you can deliver it is what gets you hired.",
      example: {
        question: 'Why do you want to work here?',
        badAnswer:
          "It seems like a great company with a lot of opportunities to grow and learn.",
        goodAnswer:
          "Your shift to ML-powered recommendations caught my attention. I built a collaborative filtering model for a course project that improved recommendation accuracy by 18%. I want to work on that problem at scale — with real user data behind it.",
        breakdown: {
          their_priority: 'What they care about: ML-powered recommendations (from product blog)',
          your_evidence: 'What you\'ve done: collaborative filtering model, 18% accuracy improvement',
          the_bridge: 'The connection: "I\'ve done this in small-scale — I want to do it at yours"',
          no_flattery: 'Notice: zero generic praise. Every word earns credibility.',
        },
      },
    },
    exercises: [
      {
        type: 'multiple_choice',
        question: 'What makes "Why this company?" feel tailored vs generic?',
        options: [
          "It's enthusiastic",
          'It names something specific about the company and connects it to your experience',
          'It uses industry terminology',
          "It's longer than average",
        ],
        correctIndex: 1,
        explanation: "Specificity proves research. Enthusiasm proves nothing.",
      },
      {
        type: 'label_sort',
        instruction: 'Tailored (shows research) or Generic (could be about any company)?',
        segments: [
          { text: "I want to work here because it's a great company.", correctLabel: 'generic' },
          { text: "Your push into B2B SaaS aligns with the enterprise sales work I did at my internship.", correctLabel: 'tailored' },
          { text: 'I think I would learn a lot here.', correctLabel: 'generic' },
          { text: "I read your CTO's post on event-driven architecture — that's the pattern I've been using.", correctLabel: 'tailored' },
          { text: 'I heard good things about the culture.', correctLabel: 'generic' },
          { text: "You're one of three companies using this tech stack at scale — that's exactly where I want to grow.", correctLabel: 'tailored' },
        ],
      },
      {
        type: 'multiple_choice',
        question: 'Best places to research before an interview?',
        options: [
          "Only the interviewer's personal Twitter",
          "Company website, job description, recent news, and the engineering/product blog",
          "Only Glassdoor reviews",
          "The company's Wikipedia page only",
        ],
        correctIndex: 1,
        explanation: 'These sources give you the priorities, language, and context you need.',
      },
      {
        type: 'multiple_choice',
        question: "You're asked about a recent initiative you didn't know about. Best move?",
        options: [
          'Make something up that sounds plausible',
          'Say you have no idea and move on',
          'Be honest about the gap, then connect to something adjacent you do know',
          'Change the subject to your strengths',
        ],
        correctIndex: 2,
        explanation: "Honesty + resourcefulness beats bluffing or silence. 'I hadn't seen that specifically — but it sounds similar to [X], which I have experience with' shows genuine engagement.",
      },
      {
        type: 'short_answer',
        prompt: "Write a Research Bridge answer to: 'Why do you want to work here?'",
        hint: 'Pick one specific thing about a company (real or hypothetical) and bridge it to something you\'ve actually done. No generic praise.',
        maxLength: 250,
      },
    ],
  },
  {
    rootCause: 'off_topic',
    displayName: 'Answering the Real Question',
    description: "You're answering what you want to say, not what was actually asked.",
    teach: {
      title: 'Decode the Hidden Question',
      explanation:
        "Every interview question has a surface question and a hidden question. 'Tell me about a failure' isn't about failure — it's about self-awareness and growth. 'Tell me about a conflict' is about collaboration and professionalism. Hear the real question. Answer that.",
      example: {
        question: 'Tell me about a time you failed.',
        badAnswer:
          "I'm a perfectionist, so I don't really fail. I see every setback as a learning opportunity and I always try my best.",
        goodAnswer:
          "I missed a product launch deadline because I underestimated QA time. I told my manager immediately, reprioritized testing, and we shipped 4 days late. I now build buffer into every timeline — it hasn't happened again.",
        breakdown: {
          surface: 'Surface question: "Tell me about a failure"',
          hidden: 'Hidden question: "Are you self-aware? Do you own mistakes? Can you course-correct?"',
          what_failed: 'Bad answer hears: "describe failure" → deflects with "I don\'t fail"',
          what_worked: 'Good answer hears hidden question → specific failure + ownership + change = yes to all three',
        },
      },
    },
    exercises: [
      {
        type: 'multiple_choice',
        question: "The hidden question beneath 'Tell me about a conflict with a coworker' is:",
        options: [
          'How confrontational are you?',
          'Can you work with difficult people professionally and collaboratively?',
          'What kinds of people do you dislike?',
          'Have you ever been in a fight at work?',
        ],
        correctIndex: 1,
        explanation: "Interviewers want to see emotional intelligence and professionalism — not whether conflict happened.",
      },
      {
        type: 'label_sort',
        instruction: "For 'Describe a time you failed' — on-topic or off-topic?",
        segments: [
          { text: "I missed a deadline because I underestimated the scope. I learned to buffer my estimates.", correctLabel: 'on-topic' },
          { text: "I'm a perfectionist, so I don't really fail.", correctLabel: 'off-topic' },
          { text: "I launched a feature with low adoption. I ran user interviews, found the gap, and improved the next version.", correctLabel: 'on-topic' },
          { text: "I work really hard and always give 100% effort.", correctLabel: 'off-topic' },
          { text: "I gave a poorly prepared presentation. I got direct feedback, rewrote the deck, and re-presented the next week.", correctLabel: 'on-topic' },
          { text: "Failure is just a mindset. I prefer to think of them as stepping stones.", correctLabel: 'off-topic' },
        ],
      },
      {
        type: 'multiple_choice',
        question: "What's your biggest weakness? Which answer actually addresses the question?",
        options: [
          "I work too hard and care too much.",
          "I don't really have major weaknesses.",
          "I tend to over-communicate on projects. I'm working on being more concise in written updates.",
          "I'm a perfectionist.",
        ],
        correctIndex: 2,
        explanation: "Names a real pattern, shows self-awareness, and demonstrates active improvement.",
      },
      {
        type: 'multiple_choice',
        question: "You're mid-answer and realize you've drifted off-topic. Best move?",
        options: [
          "Keep going — they might not notice",
          "Stop, pause, and say 'Let me refocus — to actually answer your question...'",
          "Start a completely new story",
          "Ask the interviewer to repeat the question",
        ],
        correctIndex: 1,
        explanation: "Self-correcting in real time shows meta-awareness and professionalism. Most interviewers respect it.",
      },
      {
        type: 'short_answer',
        prompt: "Answer this directly: 'Tell me about a time you failed.'",
        hint: 'Name the specific failure. Own it fully. Say what changed because of it. No deflection, no "I see failures as opportunities" framing.',
        maxLength: 250,
      },
    ],
  },
  {
    rootCause: 'too_short',
    displayName: 'Depth & Substance',
    description: "Your answers are too thin. Let's build them into something memorable.",
    teach: {
      title: 'The 5-Layer Answer',
      explanation:
        "A complete answer has five layers: Claim → Context → Action → Outcome → Reflection. Most people give 1–2 layers and stop. Interviewers want to understand your thinking, not just what happened. Each layer adds a dimension the previous one left out.",
      example: {
        question: 'Tell me about a time you led a project.',
        badAnswer:
          'I led a project at work and it went really well.',
        goodAnswer:
          "I led our team's migration to a new project management tool at my internship. The team was using email threads to track work, which caused things to slip through. I evaluated 3 tools, ran a 2-week pilot with 5 teammates, then rolled it out to the full team of 20. We went from 4 missed handoffs per sprint to zero. I also learned how hard it is to change habits — getting buy-in was harder than the tool itself.",
        breakdown: {
          claim: '1 — Claim: "I led a project migration"',
          context: '2 — Context: email threads causing handoff failures — why it mattered',
          action: '3 — Action: evaluated 3 tools, ran pilot, rolled out — the what and how',
          outcome: '4 — Outcome: 4 missed handoffs → zero — measurable change',
          reflection: '5 — Reflection: "buy-in was harder than the tool" — what you learned',
        },
      },
    },
    exercises: [
      {
        type: 'multiple_choice',
        question: "Which layer do most people skip, making their answer feel incomplete?",
        options: [
          'The Claim',
          'The Context (why it mattered)',
          'The Action',
          'Whether they succeeded',
        ],
        correctIndex: 1,
        explanation: "Without context, the interviewer doesn't know why this story was worth telling.",
      },
      {
        type: 'label_sort',
        instruction: 'Thin (1-2 layers) or Substantial (4-5 layers)?',
        segments: [
          { text: 'I improved a process.', correctLabel: 'thin' },
          { text: "I automated our reporting process — it took 4 hours manually, now takes 15 minutes. The team redirected that time to analysis. I learned that automation without documentation creates its own problems.", correctLabel: 'substantial' },
          { text: 'I helped my team.', correctLabel: 'thin' },
          { text: "I mentored 2 new analysts who had never written SQL. They shipped their first dashboards in 3 weeks. It changed how I think about knowledge transfer — showing beats explaining.", correctLabel: 'substantial' },
          { text: 'I gave a presentation.', correctLabel: 'thin' },
          { text: "I presented our churn analysis to 30 stakeholders. The model pointed to a pricing tier nobody expected. It directly led to a pricing experiment the next quarter.", correctLabel: 'substantial' },
        ],
      },
      {
        type: 'multiple_choice',
        question: "Apply the Reflection layer to: 'I led a project that shipped on time.' What fits best?",
        options: [
          'I was really happy it worked out.',
          "Nothing — the outcome is enough.",
          "I realized scope creep had nearly derailed us. I now define done before we start, every time.",
          "The team was impressed by my leadership.",
        ],
        correctIndex: 2,
        explanation: "Reflection shows growth and self-awareness — two things interviewers weight heavily.",
      },
      {
        type: 'multiple_choice',
        question: "What's the strongest version of the Context layer for: 'I redesigned our onboarding'?",
        options: [
          "The previous onboarding was old.",
          "Our onboarding completion rate was 34% — industry average is 60%+. Users churned before ever seeing the core feature.",
          "People didn't like the old onboarding.",
          "The team wanted a better onboarding experience.",
        ],
        correctIndex: 1,
        explanation: "A strong context gives the interviewer stakes — why did this matter?",
      },
      {
        type: 'short_answer',
        prompt: "Build a 5-layer answer to: 'Tell me about a time you improved something.'",
        hint: 'Hit all 5: Claim → Context (why it mattered) → Action (what you did) → Outcome (what changed) → Reflection (what you learned).',
        maxLength: 300,
      },
    ],
  },
]

/**
 * Maps a six-area criterion/rootCause to the matching practice bundle.
 * Falls back to poor_structure if no match found.
 */
export function getBundleForRootCause(rootCause: string): PracticeBundle {
  return (
    PRACTICE_BUNDLES.find((b) => b.rootCause === rootCause) ||
    PRACTICE_BUNDLES[0] // fallback to poor_structure
  )
}

/**
 * Root cause mapping: maps six-area criterion names to root causes.
 * Used when the grading rubric doesn't explicitly tag a rootCause.
 */
export const CRITERION_TO_ROOT_CAUSE: Record<string, string> = {
  // HR Screen criteria
  'Answer Structure and Conciseness': 'poor_structure',
  'Specific Examples and Evidence': 'lack_of_specificity',
  'Pace and Conversation Flow': 'weak_communication',
  'Questions Asked About Role/Company': 'missing_knowledge',
  'Alignment of Career Goals with Position': 'missing_knowledge',
  'Handling Uncertain/Difficult Questions': 'off_topic',

  // Hiring Manager criteria
  'Technical Depth': 'lack_of_specificity',
  'Problem-Solving': 'poor_structure',
  'Experience Storytelling (STAR)': 'poor_structure',
  'Role Competencies': 'missing_knowledge',
  'Critical Thinking': 'off_topic',

  // Culture Fit criteria
  'Teamwork': 'lack_of_specificity',
  'Communication Style': 'weak_communication',
  'Values Alignment': 'missing_knowledge',
  'Adaptability': 'off_topic',
  'Feedback/Growth Mindset': 'too_short',
  'Conflict Resolution': 'off_topic',
}

export function getRootCauseForCriterion(criterion: string, explicitRootCause?: string): string {
  if (explicitRootCause) return explicitRootCause
  return CRITERION_TO_ROOT_CAUSE[criterion] || 'poor_structure'
}
