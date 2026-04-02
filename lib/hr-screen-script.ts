type HrStepKey =
  | 'opening'
  | 'company_knowledge'
  | 'role_motivation'
  | 'personalized_experience_1'
  | 'personalized_experience_2'
  | 'salary_expectations'
  | 'availability'
  | 'close'

type InterviewMode = 'normal' | 'terminate'

export type HrAudioSegment =
  | { type: 'fixed'; key: string }
  | { type: 'dynamic'; text: string; cacheKey?: string }

export interface HrScriptPrompt {
  key: HrStepKey
  text: string
  questionId: string
  audioSegments: HrAudioSegment[]
}

export interface HrScriptState {
  interviewerName: string
  companyName: string
  roleTitle: string
  prompts: HrScriptPrompt[]
  currentPromptIndex: number
  mode: InterviewMode
  interviewComplete: boolean
}

export interface HrTurnDecision {
  assistantText: string
  questionText?: string
  questionId?: string | null
  nextState: HrScriptState
  complete: boolean
  audioSegments: HrAudioSegment[]
}

const INTERVIEWER_NAMES = [
  'Sarah',
  'Michael',
  'Jessica',
  'David',
  'Emily',
  'James',
  'Amanda',
  'Christopher',
  'Jennifer',
  'Daniel',
  'Lisa',
  'Matthew',
]

const TERMINATION_LINES = [
  'Alright, I think we’ll wrap up here. Thanks for your time.',
  'I’m going to end the interview here. Thank you for your time.',
]

function buildPrompt(args: {
  key: HrStepKey
  questionId: string
  text: string
  audioSegments: HrAudioSegment[]
}): HrScriptPrompt {
  return {
    key: args.key,
    questionId: args.questionId,
    text: args.text,
    audioSegments: args.audioSegments,
  }
}

export function buildInitialHrState(args: {
  companyName: string
  roleTitle: string
  personalizedQuestions: [string, string]
}): HrScriptState {
  const interviewerName = INTERVIEWER_NAMES[Math.floor(Math.random() * INTERVIEWER_NAMES.length)]

  const opening = `Hi, this is ${interviewerName} calling from ${args.companyName} about the ${args.roleTitle} position. Thanks for taking the time to chat today. I have a few quick questions, and then we’ll wrap up. To start, can you tell me a bit about yourself?`
  const companyKnowledge = 'Okay, and then, what do you know about our company so far?'
  const roleMotivation = 'Got it. So then, what interests you about this role specifically?'
  const personalizedOne = `That makes sense. So then, ${args.personalizedQuestions[0]}`
  const personalizedTwo = `Okay, understood. So then, ${args.personalizedQuestions[1]}`
  const salary = 'Gotcha. So then, I know this can be a little awkward to talk about early on, but what are you expecting salary-wise?'
  const availability = 'Right. So then, if we did decide to move forward with your application, when would you be available to start?'
  const close = 'Alright, that covers everything I wanted to ask today. Thanks again for your time.'

  const prompts: HrScriptPrompt[] = [
    buildPrompt({
      key: 'opening',
      questionId: 'q1',
      text: opening,
      audioSegments: [
        {
          type: 'dynamic',
          text: opening,
          cacheKey: `opening-${interviewerName}-${args.companyName}-${args.roleTitle}`.toLowerCase().replace(/[^a-z0-9-]+/g, '-'),
        },
      ],
    }),
    buildPrompt({
      key: 'company_knowledge',
      questionId: 'q2',
      text: companyKnowledge,
      audioSegments: [
        { type: 'fixed', key: 'okay_and' },
        { type: 'fixed', key: 'company_knowledge' },
      ],
    }),
    buildPrompt({
      key: 'role_motivation',
      questionId: 'q3',
      text: roleMotivation,
      audioSegments: [
        { type: 'fixed', key: 'got_it' },
        { type: 'fixed', key: 'so_then' },
        { type: 'fixed', key: 'role_motivation' },
      ],
    }),
    buildPrompt({
      key: 'personalized_experience_1',
      questionId: 'q4',
      text: personalizedOne,
      audioSegments: [
        { type: 'fixed', key: 'that_makes_sense' },
        { type: 'fixed', key: 'so_then' },
        {
          type: 'dynamic',
          text: args.personalizedQuestions[0],
          cacheKey: `personalized-q1-${args.personalizedQuestions[0]}`.toLowerCase().replace(/[^a-z0-9-]+/g, '-'),
        },
      ],
    }),
    buildPrompt({
      key: 'personalized_experience_2',
      questionId: 'q5',
      text: personalizedTwo,
      audioSegments: [
        { type: 'fixed', key: 'understood' },
        { type: 'fixed', key: 'so_then' },
        {
          type: 'dynamic',
          text: args.personalizedQuestions[1],
          cacheKey: `personalized-q2-${args.personalizedQuestions[1]}`.toLowerCase().replace(/[^a-z0-9-]+/g, '-'),
        },
      ],
    }),
    buildPrompt({
      key: 'salary_expectations',
      questionId: 'q6',
      text: salary,
      audioSegments: [
        { type: 'fixed', key: 'gotcha' },
        { type: 'fixed', key: 'so_then' },
        { type: 'fixed', key: 'salary_expectations' },
      ],
    }),
    buildPrompt({
      key: 'availability',
      questionId: 'q7',
      text: availability,
      audioSegments: [
        { type: 'fixed', key: 'right' },
        { type: 'fixed', key: 'so_then' },
        { type: 'fixed', key: 'availability' },
      ],
    }),
    buildPrompt({
      key: 'close',
      questionId: 'q8',
      text: close,
      audioSegments: [{ type: 'fixed', key: 'close' }],
    }),
  ]

  return {
    interviewerName,
    companyName: args.companyName,
    roleTitle: args.roleTitle,
    prompts,
    currentPromptIndex: 0,
    mode: 'normal',
    interviewComplete: false,
  }
}

export function buildOpeningLine(state: HrScriptState): string {
  return state.prompts[0]?.text || ''
}

export function getCurrentPrompt(state: HrScriptState): HrScriptPrompt {
  return state.prompts[state.currentPromptIndex]
}

export function getPrewarmDynamicSegments(
  state: HrScriptState
): Extract<HrAudioSegment, { type: 'dynamic' }>[] {
  return state.prompts
    .flatMap((prompt) => prompt.audioSegments)
    .filter((segment): segment is Extract<HrAudioSegment, { type: 'dynamic' }> => segment.type === 'dynamic')
}

export function buildPersonalizedQuestions(resumeText: string, roleTitle: string): [string, string] {
  const topics = extractPersonalizedTopics(resumeText)
  const firstTopic = topics[0] || 'the part of your background that feels most relevant here'
  const secondTopic = topics[1] || 'the strongest part of your recent experience'

  return [
    `I noticed your background includes ${firstTopic}. Could you walk me through that experience and how it would help you in the ${roleTitle} role?`,
    `I also saw experience with ${secondTopic}. What did you learn from that work, and how would it translate to this position?`,
  ]
}

export function classifyHrResponse(text: string): InterviewMode | 'vague' {
  const normalized = text.toLowerCase().trim()
  if (!normalized) return 'vague'

  const terminatePatterns = [
    /\bfuck you\b/,
    /\bbitch\b/,
    /\basshole\b/,
    /\bgo to hell\b/,
    /\bstupid\b/,
    /\bidiot\b/,
  ]
  if (terminatePatterns.some((pattern) => pattern.test(normalized))) {
    return 'terminate'
  }

  const wordCount = normalized.split(/\s+/).filter(Boolean).length
  if (wordCount < 2) return 'vague'

  return 'normal'
}

export function handleHrTurn(state: HrScriptState, userMessage: string): HrTurnDecision {
  const disposition = classifyHrResponse(userMessage)

  if (disposition === 'terminate') {
    const line = TERMINATION_LINES[Math.floor(Math.random() * TERMINATION_LINES.length)]
    return {
      assistantText: line,
      nextState: {
        ...state,
        mode: 'terminate',
        interviewComplete: true,
      },
      complete: true,
      audioSegments: [
        {
          type: 'dynamic',
          text: line,
          cacheKey: `termination-${line}`.toLowerCase().replace(/[^a-z0-9-]+/g, '-'),
        },
      ],
    }
  }

  const nextPromptIndex = state.currentPromptIndex + 1
  const nextPrompt = state.prompts[nextPromptIndex]

  if (!nextPrompt) {
    const closePrompt = state.prompts[state.prompts.length - 1]
    return {
      assistantText: closePrompt?.text || 'Thanks again for your time.',
      nextState: {
        ...state,
        interviewComplete: true,
      },
      complete: true,
      questionText: closePrompt?.text,
      questionId: closePrompt?.questionId,
      audioSegments: closePrompt?.audioSegments || [],
    }
  }

  const nextState: HrScriptState = {
    ...state,
    currentPromptIndex: nextPromptIndex,
    interviewComplete: nextPrompt.key === 'close',
  }

  return {
    assistantText: nextPrompt.text,
    questionText: nextPrompt.text,
    questionId: nextPrompt.questionId,
    nextState,
    complete: nextPrompt.key === 'close',
    audioSegments: nextPrompt.audioSegments,
  }
}

export function extractCompanyName(companyWebsite: string | null | undefined): string {
  if (!companyWebsite) return 'our company'
  try {
    const url = companyWebsite.startsWith('http')
      ? new URL(companyWebsite)
      : new URL(`https://${companyWebsite}`)
    const hostname = url.hostname.replace('www.', '').split('.')[0] || 'our company'
    return hostname.charAt(0).toUpperCase() + hostname.slice(1)
  } catch {
    const hostname = companyWebsite.replace(/^https?:\/\//, '').replace('www.', '').split('.')[0] || 'our company'
    return hostname.charAt(0).toUpperCase() + hostname.slice(1)
  }
}

export function extractRoleTitle(jobDescription: string): string {
  const match = jobDescription.match(/^Position:\s*(.+)$/m)
  if (match?.[1]) return match[1].trim()
  const firstLine = jobDescription.split('\n').map((line) => line.trim()).find(Boolean)
  if (firstLine && firstLine.length < 100 && (!firstLine.endsWith('.') || /^(Position|Role|Title):/i.test(firstLine))) {
    return firstLine.replace(/^(Position|Role|Title):\s*/i, '').trim()
  }
  return 'this position'
}

export function extractPersonalizedTopics(resumeText: string): string[] {
  const lines = resumeText
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => line.length > 0)

  const actionLines = lines
    .map((line) => line.replace(/^[•*-]\s*/, ''))
    .filter((line) => /^(led|managed|built|created|owned|developed|improved|launched|designed|implemented|coordinated|supported|drove|scaled)/i.test(line))
    .map((line) => line.split(/[.;]/)[0].trim())
    .filter((line) => line.length > 18)

  const uniqueLines = actionLines.filter(
    (line, index, all) => all.findIndex((candidate) => candidate.toLowerCase() === line.toLowerCase()) === index
  )

  if (uniqueLines.length >= 2) {
    return uniqueLines.slice(0, 2)
  }

  const phraseMatches = Array.from(
    new Set(
      Array.from(
        resumeText.matchAll(/\b(customer retention|inventory management|project coordination|operations planning|b2b sales|process improvement|data analysis|team leadership|cross-functional collaboration|account management|process automation|stakeholder management)\b/gi)
      ).map((match) => match[1])
    )
  )

  const combined = [...uniqueLines, ...phraseMatches].filter(
    (line, index, all) => all.findIndex((candidate) => candidate.toLowerCase() === line.toLowerCase()) === index
  )

  if (combined.length >= 2) {
    return combined.slice(0, 2)
  }

  if (combined.length === 1) {
    return [combined[0], 'working closely with teams and stakeholders']
  }

  const fallback = lines.find((line) => line.length > 24)?.split(/[.,;:]/)[0].slice(0, 90)
  return [fallback || 'the work most relevant to this position', 'the strongest part of your recent experience']
}
