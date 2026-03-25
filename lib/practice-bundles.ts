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
    description: "Your answers were too generic. Let's make them concrete and memorable.",
    teach: {
      title: 'Concrete Examples + Metrics',
      explanation:
        "Interviewers want proof, not generalities. Use specific examples and quantify results whenever possible to make your impact clear.",
      example: {
        question: 'Tell me about a time you improved a process.',
        badAnswer: 'I helped improve a process at work and made things more efficient.',
        goodAnswer:
          'At my internship, I noticed our reporting process took hours each week. I automated data collection using a spreadsheet script, reducing reporting time by 40% and saving the team 5 hours weekly.',
        breakdown: {
          situation: 'Reporting process took hours each week.',
          task: 'Identify and improve efficiency.',
          action: 'Automated data collection using a script.',
          result: 'Reduced time by 40% and saved 5 hours weekly.',
        },
      },
    },
    exercises: [
      {
        type: 'multiple_choice',
        question: 'Which answer is more specific?',
        options: [
          'I improved team efficiency.',
          'I helped the team work better.',
          'I reduced reporting time by 40% by automating workflows.',
          'I supported process improvements.',
        ],
        correctIndex: 2,
        explanation: 'It includes both action and measurable impact.',
      },
      {
        type: 'multiple_choice',
        question: 'Why are metrics important in interview answers?',
        options: [
          'They make answers longer',
          'They impress without context',
          'They show measurable impact and credibility',
          'They replace storytelling',
        ],
        correctIndex: 2,
        explanation: 'Metrics provide clear evidence of your results.',
      },
      {
        type: 'label_sort',
        instruction: 'Identify which statements are specific vs generic',
        segments: [
          { text: 'I helped the team succeed.', correctLabel: 'generic' },
          { text: 'I increased sales by 25% in 3 months.', correctLabel: 'specific' },
          { text: 'I was involved in improvements.', correctLabel: 'generic' },
          { text: 'I reduced customer wait time from 8 minutes to 3 minutes.', correctLabel: 'specific' },
          { text: 'I made things more efficient.', correctLabel: 'generic' },
          { text: 'I automated 12 manual reports, saving 6 hours per week.', correctLabel: 'specific' },
        ],
      },
      {
        type: 'multiple_choice',
        question: "Which statement best adds specificity to 'I improved a process'?",
        options: [
          'I improved a process significantly.',
          'I improved the onboarding process by reducing steps from 12 to 5, cutting completion time by 60%.',
          'I improved a process and everyone liked it.',
          'I improved a really important process at my company.',
        ],
        correctIndex: 1,
        explanation: 'It names the process, the change, and the measurable result.',
      },
      {
        type: 'short_answer',
        prompt: "Rewrite this answer to be more specific: 'I improved a process at work.'",
        hint: 'Add what you did and at least one measurable result.',
        maxLength: 200,
      },
    ],
  },
  {
    rootCause: 'weak_communication',
    displayName: 'Clear Communication',
    description: "Your delivery lacked clarity and confidence. Let's tighten it up.",
    teach: {
      title: 'Clarity & Conciseness',
      explanation:
        'Strong communication is clear, direct, and confident. Cut filler words and focus on delivering your message in simple, structured sentences.',
      example: {
        question: 'Why are you interested in this role?',
        badAnswer:
          "Um, I think it's like a really interesting opportunity and I feel like I could maybe learn a lot and stuff.",
        goodAnswer:
          "I'm interested in this role because it combines analytics and product strategy, which I've developed through my internship experience. I'm excited to apply those skills while continuing to grow.",
        breakdown: {
          situation: 'Interest in role',
          task: 'Explain motivation clearly',
          action: 'Provide direct reasoning with evidence',
          result: 'Confident and concise answer',
        },
      },
    },
    exercises: [
      {
        type: 'multiple_choice',
        question: 'Which answer is clearer?',
        options: [
          'I think I kind of helped improve things.',
          'I improved onboarding by simplifying the 12-step process to 5 steps.',
          'I guess I worked on some improvements.',
          'I was maybe involved in changes.',
        ],
        correctIndex: 1,
        explanation: 'It is direct, specific, and free of filler words.',
      },
      {
        type: 'multiple_choice',
        question: 'What should you avoid in interview answers?',
        options: [
          'Clear examples',
          'Structured answers',
          "Filler words like 'um', 'like', 'sort of', and 'kind of'",
          'Confident tone',
        ],
        correctIndex: 2,
        explanation: 'Filler words reduce clarity and signal low confidence.',
      },
      {
        type: 'label_sort',
        instruction: 'Label each sentence as clear or unclear',
        segments: [
          { text: 'I kind of worked on improving things.', correctLabel: 'unclear' },
          { text: 'I redesigned the workflow to reduce delays by 2 days.', correctLabel: 'clear' },
          { text: "I think I maybe helped with, like, the project.", correctLabel: 'unclear' },
          { text: 'I led a 3-person team to ship the feature on time.', correctLabel: 'clear' },
          { text: "So basically I sort of did some stuff with the data.", correctLabel: 'unclear' },
          { text: 'I analyzed customer data and identified the top 3 churn drivers.', correctLabel: 'clear' },
        ],
      },
      {
        type: 'multiple_choice',
        question: "What's the best way to start an answer confidently?",
        options: [
          "Well, I think maybe...",
          "So basically what happened was...",
          "Yes — in my last role, I...",
          "I guess I would say...",
        ],
        correctIndex: 2,
        explanation: 'Start directly with a confident affirmation and context.',
      },
      {
        type: 'short_answer',
        prompt: "Rewrite this clearly: 'I was sort of involved in helping the team improve things.'",
        hint: "Be direct. Say exactly what you did and why it mattered. No filler words.",
        maxLength: 200,
      },
    ],
  },
  {
    rootCause: 'missing_knowledge',
    displayName: 'Role & Company Knowledge',
    description: "Your answers didn't reflect enough understanding of the role or company.",
    teach: {
      title: 'Targeted Research',
      explanation:
        'Strong candidates connect their answers to the role and company. Research key priorities and reference them naturally in your responses.',
      example: {
        question: 'Why do you want to work here?',
        badAnswer: "It seems like a great company and I'd love to work here.",
        goodAnswer:
          "I'm excited about this role because your focus on customer-first product design aligns with my experience improving user onboarding flows. I'm especially interested in how your team uses data to drive decisions.",
        breakdown: {
          situation: 'Company focus on customer-first design',
          task: 'Align personal experience with company priorities',
          action: 'Connect onboarding experience to their product philosophy',
          result: 'Stronger, tailored answer that shows genuine research',
        },
      },
    },
    exercises: [
      {
        type: 'multiple_choice',
        question: 'What makes an answer feel tailored to the company?',
        options: [
          "It's long",
          'It references the company or role specifically',
          'It uses buzzwords',
          'It avoids personal examples',
        ],
        correctIndex: 1,
        explanation: "Tailored answers show you've done your homework.",
      },
      {
        type: 'multiple_choice',
        question: 'Where should you research before an interview?',
        options: [
          'Company website, job description, and recent news',
          'Only social media',
          'Only the interviewer\'s LinkedIn',
          "Nowhere — it's better to seem spontaneous",
        ],
        correctIndex: 0,
        explanation: 'These sources give you the most relevant, reliable information.',
      },
      {
        type: 'label_sort',
        instruction: 'Identify which answers are tailored vs generic',
        segments: [
          { text: "I want to work here because it's a great company.", correctLabel: 'generic' },
          { text: "I'm excited about your recent expansion into the European market.", correctLabel: 'tailored' },
          { text: 'I think this would be a good fit for me.', correctLabel: 'generic' },
          { text: "Your focus on sustainability aligns with my work at GreenTech.", correctLabel: 'tailored' },
          { text: 'I heard good things about the company.', correctLabel: 'generic' },
          { text: "I noticed you're migrating to a microservices architecture, which I have experience with.", correctLabel: 'tailored' },
        ],
      },
      {
        type: 'multiple_choice',
        question: 'How should you handle a question about something you don\'t know about the company?',
        options: [
          'Make something up',
          'Say "I don\'t know" and move on',
          'Acknowledge the gap honestly and connect what you do know',
          'Change the subject',
        ],
        correctIndex: 2,
        explanation: 'Honesty + connecting to what you know shows self-awareness and adaptability.',
      },
      {
        type: 'short_answer',
        prompt: 'Write a tailored response to: Why are you interested in this company?',
        hint: 'Reference one specific thing about the company and connect it to your experience.',
        maxLength: 250,
      },
    ],
  },
  {
    rootCause: 'off_topic',
    displayName: 'Answering the Right Question',
    description: "Your answers didn't directly address what was asked.",
    teach: {
      title: 'Question Decomposition',
      explanation:
        'Break the question into key parts before answering. This ensures your response stays focused and directly addresses what the interviewer wants.',
      example: {
        question: 'Tell me about a time you handled conflict.',
        badAnswer: 'I usually work well with teams and try to avoid conflict.',
        goodAnswer:
          "In a group project, a teammate and I disagreed on direction. I addressed it by setting up a meeting to align on goals and find a compromise. As a result, we improved collaboration and completed the project successfully.",
        breakdown: {
          situation: 'Disagreement in group project',
          task: 'Resolve the conflict',
          action: 'Set up meeting to align on goals',
          result: 'Improved collaboration and project success',
        },
      },
    },
    exercises: [
      {
        type: 'multiple_choice',
        question: 'What is the first step before answering an interview question?',
        options: [
          'Start talking immediately',
          'Ignore part of the question',
          'Identify the key parts of what is being asked',
          'Give a general answer',
        ],
        correctIndex: 2,
        explanation: 'Breaking down the question ensures you answer what was actually asked.',
      },
      {
        type: 'multiple_choice',
        question: "The interviewer asks: 'Tell me about a time you handled conflict.' Which answer is on-topic?",
        options: [
          'I enjoy teamwork.',
          'I resolved a disagreement by scheduling a meeting to align on goals.',
          'I like working with others.',
          'I try to avoid conflict whenever possible.',
        ],
        correctIndex: 1,
        explanation: 'It directly describes a specific conflict situation and resolution.',
      },
      {
        type: 'label_sort',
        instruction: "For the question 'Describe a time you failed', label each response as on-topic or off-topic",
        segments: [
          { text: 'I missed a deadline because I underestimated scope. I learned to buffer timelines.', correctLabel: 'on-topic' },
          { text: "I'm a perfectionist, so I don't really fail.", correctLabel: 'off-topic' },
          { text: 'I launched a feature that had low adoption. I analyzed why and improved the next release.', correctLabel: 'on-topic' },
          { text: 'I work really hard and always give 100%.', correctLabel: 'off-topic' },
          { text: "I once hired the wrong person. I took responsibility and improved my interview process.", correctLabel: 'on-topic' },
          { text: 'Failure is a mindset. I try to stay positive.', correctLabel: 'off-topic' },
        ],
      },
      {
        type: 'multiple_choice',
        question: "If you realize mid-answer that you're going off-topic, what should you do?",
        options: [
          'Keep going and hope they don\'t notice',
          "Pause, acknowledge it, and redirect: 'Let me get back to your question —'",
          'Start a new story entirely',
          'Ask the interviewer to repeat the question',
        ],
        correctIndex: 1,
        explanation: 'Self-correcting shows awareness and professionalism.',
      },
      {
        type: 'short_answer',
        prompt: 'Answer: Tell me about a time you handled conflict.',
        hint: "Focus only on conflict. Describe a specific disagreement, what you did, and the outcome. Don't drift into general teamwork.",
        maxLength: 250,
      },
    ],
  },
  {
    rootCause: 'too_short',
    displayName: 'Depth & Elaboration',
    description: 'Your answers were too brief and lacked detail.',
    teach: {
      title: "The 'So What?' Test",
      explanation:
        "After each sentence, ask 'so what?' to add depth. This helps you expand answers with meaningful detail and impact.",
      example: {
        question: 'Tell me about a time you led a project.',
        badAnswer: 'I led a project at work.',
        goodAnswer:
          'I led a project to improve onboarding at my internship. I coordinated with designers and engineers to streamline the process. As a result, we reduced user drop-off by 20%.',
        breakdown: {
          situation: 'Led onboarding project at internship',
          task: 'Improve the onboarding process',
          action: 'Coordinated cross-functional team to streamline steps',
          result: 'Reduced drop-off by 20%',
        },
      },
    },
    exercises: [
      {
        type: 'multiple_choice',
        question: "What does the 'So What?' test help you do?",
        options: [
          'Make answers shorter',
          'Add meaningful detail and show impact',
          'Avoid giving examples',
          'End answers quickly',
        ],
        correctIndex: 1,
        explanation: "It pushes you to add depth after each statement — why does it matter?",
      },
      {
        type: 'multiple_choice',
        question: 'Which answer has the best depth?',
        options: [
          'I led a project.',
          'I worked on a team.',
          'I led a project that improved onboarding and reduced drop-off by 20%.',
          'I did some leadership work.',
        ],
        correctIndex: 2,
        explanation: 'It includes what was led, what was done, and the measurable result.',
      },
      {
        type: 'label_sort',
        instruction: 'Label each answer as too shallow or has good depth',
        segments: [
          { text: 'I improved a process.', correctLabel: 'shallow' },
          { text: 'I improved the reporting process by automating data pulls, saving 5 hours weekly.', correctLabel: 'depth' },
          { text: 'I helped my team.', correctLabel: 'shallow' },
          { text: 'I mentored 2 junior developers, helping them ship their first features within 3 weeks.', correctLabel: 'depth' },
          { text: 'I did a presentation.', correctLabel: 'shallow' },
          { text: 'I presented our quarterly results to 30 stakeholders, which led to budget approval for Q2.', correctLabel: 'depth' },
        ],
      },
      {
        type: 'multiple_choice',
        question: "Apply the 'So What?' test to: 'I helped my team meet a deadline.' What should come next?",
        options: [
          'Nothing — the answer is complete.',
          'I stayed late every night.',
          "I identified the bottleneck in our QA process, reassigned testing tasks, and we shipped 2 days early.",
          "It was a really important deadline.",
        ],
        correctIndex: 2,
        explanation: "The 'so what' reveals HOW you helped and WHAT the impact was.",
      },
      {
        type: 'short_answer',
        prompt: "Expand this answer: 'I helped my team meet a deadline.'",
        hint: 'Add what you did, how you did it, and the result. Apply the So What test after each sentence.',
        maxLength: 250,
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
