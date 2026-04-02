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

export interface HrScriptPrompt {
  key: HrStepKey
  text: string
  questionId: string
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
  dynamicAudioText: string
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

const TRANSITIONS = {
  company_knowledge: 'Okay, yeah. And then,',
  role_motivation: 'Got it. So then,',
  personalized_experience_1: 'That makes a lot of sense. So,',
  personalized_experience_2: 'Okay, understood. So,',
  salary_expectations: 'Gotcha. And then,',
  availability: 'Right, that makes sense. So,',
} as const

const TERMINATION_LINES = [
  'Alright, I think we’ll wrap up here. Thanks for your time.',
  'I’m going to end the interview here. Thank you for your time.',
]

export function buildInitialHrState(args: {
  companyName: string
  roleTitle: string
  personalizedQuestions: [string, string]
}): HrScriptState {
  const interviewerName = INTERVIEWER_NAMES[Math.floor(Math.random() * INTERVIEWER_NAMES.length)]
  const opening = `Hi, this is ${interviewerName} calling from ${args.companyName} about the ${args.roleTitle} position. Thanks for taking the time to chat today. I have a few quick questions, and then we’ll wrap up. To start, can you tell me a bit about yourself?`

  const prompts: HrScriptPrompt[] = [
    {
      key: 'opening',
      text: opening,
      questionId: 'q1',
    },
    {
      key: 'company_knowledge',
      text: `${TRANSITIONS.company_knowledge} What do you know about our company so far?`,
      questionId: 'q2',
    },
    {
      key: 'role_motivation',
      text: `${TRANSITIONS.role_motivation} What interests you about this role specifically?`,
      questionId: 'q3',
    },
    {
      key: 'personalized_experience_1',
      text: `${TRANSITIONS.personalized_experience_1} ${args.personalizedQuestions[0]}`,
      questionId: 'q4',
    },
    {
      key: 'personalized_experience_2',
      text: `${TRANSITIONS.personalized_experience_2} ${args.personalizedQuestions[1]}`,
      questionId: 'q5',
    },
    {
      key: 'salary_expectations',
      text: `${TRANSITIONS.salary_expectations} I know this can be a little awkward to talk about early on, but what are you expecting salary-wise?`,
      questionId: 'q6',
    },
    {
      key: 'availability',
      text: `${TRANSITIONS.availability} If we did decide to move forward with your application, when would you be available to start?`,
      questionId: 'q7',
    },
    {
      key: 'close',
      text: 'Alright, that covers everything I wanted to ask today. Thanks again for your time.',
      questionId: 'q8',
    },
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

export function buildPersonalizedQuestions(resumeText: string, roleTitle: string): [string, string] {
  const topics = extractPersonalizedTopics(resumeText)
  const firstTopic = topics[0] || 'the work in your background that feels most relevant here'
  const secondTopic = topics[1] || 'the strongest part of your recent experience'

  return [
    `I noticed your background includes ${firstTopic}. Could you walk me through that experience and how it would help you in the ${roleTitle} role?`,
    `I also saw experience with ${secondTopic}. What did you learn from that work, and how would it translate to this position?`,
  ]
}

export function getAllPromptTexts(state: HrScriptState): string[] {
  return state.prompts.map((prompt) => prompt.text)
}

export function getCurrentPrompt(state: HrScriptState): HrScriptPrompt {
  return state.prompts[state.currentPromptIndex]
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
      dynamicAudioText: line,
    }
  }

  const nextPromptIndex = state.currentPromptIndex + 1
  const nextPrompt = state.prompts[nextPromptIndex]

  if (!nextPrompt) {
    const closeLine = state.prompts[state.prompts.length - 1]?.text || 'Thanks again for your time.'
    return {
      assistantText: closeLine,
      nextState: {
        ...state,
        interviewComplete: true,
      },
      complete: true,
      dynamicAudioText: closeLine,
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
    dynamicAudioText: nextPrompt.text,
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

export function buildDefaultOpeningAudioText(state: HrScriptState): string {
  return buildOpeningLine(state)
}
