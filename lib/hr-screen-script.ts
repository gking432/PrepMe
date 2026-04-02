import fs from 'fs/promises'
import path from 'path'

type HrStepKey =
  | 'opening'
  | 'company_knowledge'
  | 'role_motivation'
  | 'personalized_experience_1'
  | 'personalized_experience_2'
  | 'salary_expectations'
  | 'availability'
  | 'close'

type InterviewMode = 'normal' | 'guarded' | 'terminate'

export interface HrScriptState {
  interviewerName: string
  companyName: string
  roleTitle: string
  personalizedQuestions: [string, string]
  promptPlan: Record<HrStepKey, string>
  stepOrder: HrStepKey[]
  currentStepIndex: number
  currentQuestionId: string | null
  mode: InterviewMode
  followUpUsedForStep: boolean
  interviewComplete: boolean
}

export interface HrTurnDecision {
  assistantText: string
  questionText?: string
  questionId?: string | null
  nextState: HrScriptState
  complete: boolean
  usedAudioKey?: string
  dynamicAudioText?: string
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

const QUESTION_AUDIO_KEYS: Partial<Record<HrStepKey, string>> = {
  company_knowledge: 'company_knowledge',
  role_motivation: 'role_motivation',
  salary_expectations: 'salary_expectations',
  availability: 'availability',
  close: 'close',
}

const STATIC_QUESTIONS: Record<Exclude<HrStepKey, 'opening' | 'personalized_experience_1' | 'personalized_experience_2'>, string> = {
  company_knowledge: 'What do you know about our company so far?',
  role_motivation: 'What interests you about this role specifically?',
  salary_expectations: 'I know this can be a little awkward to talk about early on, but what are you expecting salary-wise?',
  availability: 'If we did decide to move forward with your application, when would you be available to start?',
  close: 'Alright, that covers everything I wanted to ask today. Thanks again for your time.',
}

const STEP_TRANSITIONS: Record<
  Exclude<HrStepKey, 'opening' | 'close'>,
  string
> = {
  company_knowledge: 'Okay, yeah. And then,',
  role_motivation: 'Got it. So then,',
  personalized_experience_1: 'That makes a lot of sense. So,',
  personalized_experience_2: 'Okay, understood. So,',
  salary_expectations: 'Gotcha. And then,',
  availability: 'Right, that makes sense. So,',
}

const GENERIC_FOLLOW_UPS = [
  {
    text: 'Can you be a bit more specific about that?',
    audioKey: 'followup_specific',
  },
  {
    text: 'Can you tell me a little more about your specific role there?',
    audioKey: 'followup_role',
  },
] as const

const COMPANY_FOLLOW_UP = {
  text: 'What have you learned about us so far?',
  audioKey: 'followup_company',
}

const ROLE_FOLLOW_UP = {
  text: 'What about this role stands out to you most?',
  audioKey: 'followup_role_interest',
}

const GUARDED_MOVE_ON = {
  text: 'Alright. Let’s move on.',
  audioKey: 'guarded_move_on',
}

const GUARDED_NEXT = {
  text: 'Got it. Next question.',
  audioKey: 'guarded_next',
}

const GUARDED_CLOSE = {
  text: 'Alright, I have what I need. Thanks for your time today.',
  audioKey: 'guarded_close',
}

const TERMINATION_LINES = [
  {
    text: 'Alright, I think we’ll wrap up here. Thanks for your time.',
    audioKey: 'terminate_wrap_up',
  },
  {
    text: 'I’m going to end the interview here. Thank you for your time.',
    audioKey: 'terminate_end',
  },
] as const

const FIXED_AUDIO_TEXT: Record<string, string> = {
  opening: 'Hi, this is the recruiter calling about the position. Thanks for taking the time to chat today. I have a few quick questions, and then we’ll wrap up. To start, can you tell me a bit about yourself?',
  company_knowledge: STATIC_QUESTIONS.company_knowledge,
  role_motivation: STATIC_QUESTIONS.role_motivation,
  salary_expectations: STATIC_QUESTIONS.salary_expectations,
  availability: STATIC_QUESTIONS.availability,
  close: STATIC_QUESTIONS.close,
  okay: 'Okay.',
  mhm: 'Mm-hm.',
  got_it: 'Got it.',
  i_see: 'I see.',
  understood: 'Understood.',
  right: 'Right.',
  that_makes_sense: 'That makes sense.',
  gotcha: 'Gotcha.',
  okay_and: 'Okay, and...',
  so_then: 'So then...',
  alright: 'Alright.',
  oh_okay: 'Oh, okay.',
  followup_specific: GENERIC_FOLLOW_UPS[0].text,
  followup_role: GENERIC_FOLLOW_UPS[1].text,
  followup_company: COMPANY_FOLLOW_UP.text,
  followup_role_interest: ROLE_FOLLOW_UP.text,
  guarded_move_on: GUARDED_MOVE_ON.text,
  guarded_next: GUARDED_NEXT.text,
  guarded_close: GUARDED_CLOSE.text,
  terminate_wrap_up: TERMINATION_LINES[0].text,
  terminate_end: TERMINATION_LINES[1].text,
}

export async function loadFixedHrAudio(audioKey: string): Promise<string | null> {
  const audioPath = path.join(process.cwd(), 'public', 'audio', 'hr-screen', `${audioKey}.mp3`)
  try {
    const buffer = await fs.readFile(audioPath)
    return buffer.toString('base64')
  } catch {
    return null
  }
}

export function getFixedHrAudioText(audioKey: string): string | null {
  return FIXED_AUDIO_TEXT[audioKey] || null
}

export function buildInitialHrState(args: {
  companyName: string
  roleTitle: string
  personalizedQuestions: [string, string]
}): HrScriptState {
  const interviewerName = INTERVIEWER_NAMES[Math.floor(Math.random() * INTERVIEWER_NAMES.length)]
  const opening = `Hi, this is ${interviewerName} calling from ${args.companyName} about the ${args.roleTitle} position. Thanks for taking the time to chat today. I have a few quick questions, and then we’ll wrap up. To start, can you tell me a bit about yourself?`
  const promptPlan: Record<HrStepKey, string> = {
    opening,
    company_knowledge: `${STEP_TRANSITIONS.company_knowledge} ${STATIC_QUESTIONS.company_knowledge}`,
    role_motivation: `${STEP_TRANSITIONS.role_motivation} ${STATIC_QUESTIONS.role_motivation}`,
    personalized_experience_1: `${STEP_TRANSITIONS.personalized_experience_1} ${args.personalizedQuestions[0]}`,
    personalized_experience_2: `${STEP_TRANSITIONS.personalized_experience_2} ${args.personalizedQuestions[1]}`,
    salary_expectations: `${STEP_TRANSITIONS.salary_expectations} ${STATIC_QUESTIONS.salary_expectations}`,
    availability: `${STEP_TRANSITIONS.availability} ${STATIC_QUESTIONS.availability}`,
    close: STATIC_QUESTIONS.close,
  }

  return {
    interviewerName,
    companyName: args.companyName,
    roleTitle: args.roleTitle,
    personalizedQuestions: args.personalizedQuestions,
    promptPlan,
    stepOrder: [
      'opening',
      'company_knowledge',
      'role_motivation',
      'personalized_experience_1',
      'personalized_experience_2',
      'salary_expectations',
      'availability',
      'close',
    ],
    currentStepIndex: 0,
    currentQuestionId: 'q1',
    mode: 'normal',
    followUpUsedForStep: false,
    interviewComplete: false,
  }
}

export function buildOpeningLine(state: HrScriptState): string {
  return state.promptPlan.opening
}

export function buildPersonalizedQuestions(resumeText: string, roleTitle: string): [string, string] {
  const topics = extractPersonalizedTopics(resumeText)
  const firstTopic = topics[0] || 'work that is most relevant to this position'
  const secondTopic = topics[1] || 'the strongest part of your recent experience'

  return [
    `I noticed your background includes ${firstTopic}. Could you walk me through that experience and how it would help you in the ${roleTitle} role?`,
    `I also saw experience with ${secondTopic}. What did you learn from that work, and how would it translate to this position?`,
  ]
}

export function getCurrentQuestionText(state: HrScriptState): string {
  const step = state.stepOrder[state.currentStepIndex]
  if (step === 'opening') return buildOpeningLine(state)
  if (step === 'personalized_experience_1') return state.personalizedQuestions[0]
  if (step === 'personalized_experience_2') return state.personalizedQuestions[1]
  return STATIC_QUESTIONS[step as keyof typeof STATIC_QUESTIONS]
}

export function getCurrentAudioKey(state: HrScriptState): string | undefined {
  const step = state.stepOrder[state.currentStepIndex]
  if (step === 'opening') return undefined
  if (step === 'personalized_experience_1') return undefined
  if (step === 'personalized_experience_2') return undefined
  return QUESTION_AUDIO_KEYS[step]
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

  const offPuttingPatterns = [
    /\bmy boss was an idiot\b/,
    /\bthey were idiots\b/,
    /\bi just need a job\b/,
    /\bi don't really care\b/,
    /\bwhatever pays\b/,
    /\bi hate\b/,
  ]
  if (offPuttingPatterns.some((pattern) => pattern.test(normalized))) {
    return 'guarded'
  }

  const wordCount = normalized.split(/\s+/).filter(Boolean).length
  if (wordCount < 3) return 'vague'

  const vaguePatterns = [
    'not sure',
    'i dont know',
    "i don't know",
    'kind of',
    'sort of',
    'whatever',
    'i guess',
  ]
  if (vaguePatterns.some((phrase) => normalized.includes(phrase))) {
    return 'vague'
  }

  return 'normal'
}

function nextQuestionId(questionId: string | null): string {
  if (!questionId) return 'q1'
  const current = Number(questionId.replace(/^q/, '')) || 1
  return `q${current + 1}`
}

export function handleHrTurn(state: HrScriptState, userMessage: string): HrTurnDecision {
  const disposition = classifyHrResponse(userMessage)

  if (disposition === 'terminate') {
    const line = TERMINATION_LINES[Math.floor(Math.random() * TERMINATION_LINES.length)]
    return {
      assistantText: line.text,
      nextState: {
        ...state,
        mode: 'terminate',
        interviewComplete: true,
      },
      complete: true,
      usedAudioKey: line.audioKey,
    }
  }

  const currentStep = state.stepOrder[state.currentStepIndex]

  if (disposition === 'vague' && !state.followUpUsedForStep && currentStep !== 'close') {
    const followUp =
      currentStep === 'company_knowledge'
        ? COMPANY_FOLLOW_UP
        : currentStep === 'role_motivation'
          ? ROLE_FOLLOW_UP
          : GENERIC_FOLLOW_UPS[Math.floor(Math.random() * GENERIC_FOLLOW_UPS.length)]

    return {
      assistantText: followUp.text,
      questionText: followUp.text,
      questionId: state.currentQuestionId,
      nextState: {
        ...state,
        followUpUsedForStep: true,
      },
      complete: false,
      usedAudioKey: followUp.audioKey,
    }
  }

  const nextMode: InterviewMode = disposition === 'guarded' ? 'guarded' : state.mode === 'guarded' ? 'guarded' : 'normal'
  let nextIndex = state.currentStepIndex + 1

  if (nextMode === 'guarded' && state.stepOrder[nextIndex] === 'availability') {
    // guarded path already almost done, continue as normal
  }

  if (nextMode === 'guarded' && state.stepOrder[nextIndex] === 'salary_expectations') {
    // keep salary, then availability, but do not add any extra branching later
  }

  if (nextIndex >= state.stepOrder.length) {
    return {
      assistantText: GUARDED_CLOSE.text,
      nextState: {
        ...state,
        mode: nextMode,
        interviewComplete: true,
      },
      complete: true,
      usedAudioKey: GUARDED_CLOSE.audioKey,
    }
  }

  const nextStep = state.stepOrder[nextIndex]
  const interimTransition =
    nextMode === 'guarded'
      ? (Math.random() > 0.5 ? GUARDED_MOVE_ON : GUARDED_NEXT)
      : null

  const nextState: HrScriptState = {
    ...state,
    currentStepIndex: nextIndex,
    currentQuestionId: nextQuestionId(state.currentQuestionId),
    mode: nextMode,
    followUpUsedForStep: false,
    interviewComplete: nextStep === 'close',
  }

  const questionText = getCurrentQuestionText(nextState)
  const assistantText = interimTransition
    ? `${interimTransition.text} ${questionText}`.trim()
    : nextState.promptPlan[nextStep]
  const shouldGenerateFullLine = true

  return {
    assistantText,
    questionText,
    questionId: nextState.currentQuestionId,
    nextState,
    complete: nextStep === 'close',
    usedAudioKey: shouldGenerateFullLine ? undefined : getCurrentAudioKey(nextState),
    dynamicAudioText: shouldGenerateFullLine ? assistantText : undefined,
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

  const normalized = actionLines
    .map((line) => line.replace(/\s+/g, ' ').slice(0, 90))
    .filter((line, index, all) => all.findIndex((candidate) => candidate.toLowerCase() === line.toLowerCase()) === index)

  if (normalized.length >= 2) {
    return normalized.slice(0, 2)
  }

  const strongPhrases = Array.from(
    new Set(
      Array.from(
        resumeText.matchAll(/\b(customer retention|inventory management|project coordination|operations planning|b2b sales|process improvement|data analysis|team leadership|cross-functional collaboration|account management|process automation|stakeholder management)\b/gi)
      ).map((match) => match[1])
    )
  )

  const combined = [
    ...normalized,
    ...strongPhrases,
  ].filter((line, index, all) => all.findIndex((candidate) => candidate.toLowerCase() === line.toLowerCase()) === index)

  if (combined.length >= 2) {
    return combined.slice(0, 2)
  }

  if (combined.length === 1) {
    return [combined[0], 'working closely with teams and stakeholders']
  }

  const sentence = lines.find((line) => line.length > 20)
  const fallback = sentence ? sentence.split(/[.,;:]/)[0].slice(0, 80) : 'relevant experience'
  return [fallback, 'the most relevant part of your background']
}

export function buildDefaultOpeningAudioText(state: HrScriptState): string {
  return buildOpeningLine(state)
}

export function pickTransitionAudioKey(): string {
  return 'got_it'
}
