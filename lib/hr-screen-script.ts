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
  personalizedQuestions: string[]
}): HrScriptState {
  const interviewerName = INTERVIEWER_NAMES[Math.floor(Math.random() * INTERVIEWER_NAMES.length)]

  const opening = `Hi, this is ${interviewerName} calling from ${args.companyName} about the ${args.roleTitle} position. Thanks for taking the time to chat today. I have a few quick questions, and then we’ll wrap up. To start, can you tell me a bit about yourself?`
  const companyKnowledge = 'Okay, and then, what do you know about our company so far?'
  const roleMotivation = 'Got it. So then, what interests you about this role specifically?'
  const salary = 'Gotcha. So then, I know this can be a little awkward to talk about early on, but what are you expecting salary-wise?'
  const availability = 'Right. So then, if we did decide to move forward with your application, when would you be available to start?'
  const close = 'Alright, that covers everything I wanted to ask today. Thanks again for your time.'

  const prompts: HrScriptPrompt[] = []
  let questionNumber = 1

  prompts.push(
    buildPrompt({
      key: 'opening',
      questionId: `q${questionNumber++}`,
      text: opening,
      audioSegments: [
        {
          type: 'dynamic',
          text: opening,
          cacheKey: `opening-${interviewerName}-${args.companyName}-${args.roleTitle}`.toLowerCase().replace(/[^a-z0-9-]+/g, '-'),
        },
      ],
    })
  )

  prompts.push(
    buildPrompt({
      key: 'company_knowledge',
      questionId: `q${questionNumber++}`,
      text: companyKnowledge,
      audioSegments: [
        { type: 'fixed', key: 'okay_and' },
        { type: 'fixed', key: 'company_knowledge' },
      ],
    })
  )

  prompts.push(
    buildPrompt({
      key: 'role_motivation',
      questionId: `q${questionNumber++}`,
      text: roleMotivation,
      audioSegments: [
        { type: 'fixed', key: 'got_it' },
        { type: 'fixed', key: 'so_then' },
        { type: 'fixed', key: 'role_motivation' },
      ],
    })
  )

  if (args.personalizedQuestions[0]) {
    prompts.push(
      buildPrompt({
        key: 'personalized_experience_1',
        questionId: `q${questionNumber++}`,
        text: `That makes sense. So then, ${args.personalizedQuestions[0]}`,
        audioSegments: [
          { type: 'fixed', key: 'that_makes_sense' },
          { type: 'fixed', key: 'so_then' },
          {
            type: 'dynamic',
            text: args.personalizedQuestions[0],
            cacheKey: `personalized-q1-${args.personalizedQuestions[0]}`.toLowerCase().replace(/[^a-z0-9-]+/g, '-'),
          },
        ],
      })
    )
  }

  if (args.personalizedQuestions[1]) {
    prompts.push(
      buildPrompt({
        key: 'personalized_experience_2',
        questionId: `q${questionNumber++}`,
        text: `Okay, understood. So then, ${args.personalizedQuestions[1]}`,
        audioSegments: [
          { type: 'fixed', key: 'understood' },
          { type: 'fixed', key: 'so_then' },
          {
            type: 'dynamic',
            text: args.personalizedQuestions[1],
            cacheKey: `personalized-q2-${args.personalizedQuestions[1]}`.toLowerCase().replace(/[^a-z0-9-]+/g, '-'),
          },
        ],
      })
    )
  }

  prompts.push(
    buildPrompt({
      key: 'salary_expectations',
      questionId: `q${questionNumber++}`,
      text: salary,
      audioSegments: [
        { type: 'fixed', key: 'gotcha' },
        { type: 'fixed', key: 'so_then' },
        { type: 'fixed', key: 'salary_expectations' },
      ],
    })
  )

  prompts.push(
    buildPrompt({
      key: 'availability',
      questionId: `q${questionNumber++}`,
      text: availability,
      audioSegments: [
        { type: 'fixed', key: 'right' },
        { type: 'fixed', key: 'so_then' },
        { type: 'fixed', key: 'availability' },
      ],
    })
  )

  prompts.push(
    buildPrompt({
      key: 'close',
      questionId: `q${questionNumber++}`,
      text: close,
      audioSegments: [{ type: 'fixed', key: 'close' }],
    })
  )

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

export function buildPersonalizedQuestions(resumeText: string, roleTitle: string): string[] {
  const roles = extractResumeRoles(resumeText)
  const prompts: string[] = []

  if (roles[0]) {
    prompts.push(
      `I saw your experience with ${roles[0].company} as a ${roles[0].title}. Could you tell me a bit more about that role and how it would help you in the ${roleTitle} position?`
    )
  }

  if (roles[1]) {
    prompts.push(
      `I also noticed you worked at ${roles[1].company} as a ${roles[1].title}. How do you think that experience would help you in this position?`
    )
  }

  return prompts
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

export function extractResumeRoles(resumeText: string): Array<{ title: string; company: string }> {
  const lines = resumeText
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => line.length > 0 && line.length < 120)
    .filter((line) => !/^[•*-]\s*/.test(line))
    .filter((line) => !/\b(20\d{2}|19\d{2}|present)\b/i.test(line))

  const roles: Array<{ title: string; company: string }> = []

  const clean = (value: string) => value.replace(/\s+/g, ' ').trim()

  for (const line of lines) {
    let match = line.match(/^(.+?)\s+at\s+(.+)$/i)
    if (match) {
      roles.push({ title: clean(match[1]), company: clean(match[2]) })
      continue
    }

    match = line.match(/^(.+?)\s+\|\s+(.+)$/)
    if (match) {
      roles.push({ title: clean(match[1]), company: clean(match[2]) })
      continue
    }

    match = line.match(/^(.+?)\s+[–—-]\s+(.+)$/)
    if (match) {
      const left = clean(match[1])
      const right = clean(match[2])
      const leftLooksLikeCompany = /\b(inc|llc|corp|corporation|company|co\.|group|labs|systems|technologies|university|school|hospital|health|bank|studio|agency)\b/i.test(left)
      const rightLooksLikeCompany = /\b(inc|llc|corp|corporation|company|co\.|group|labs|systems|technologies|university|school|hospital|health|bank|studio|agency)\b/i.test(right)

      if (leftLooksLikeCompany && !rightLooksLikeCompany) {
        roles.push({ title: right, company: left })
      } else if (!leftLooksLikeCompany && rightLooksLikeCompany) {
        roles.push({ title: left, company: right })
      }
    }
  }

  return roles.filter(
    (role, index, all) =>
      role.title.length > 1 &&
      role.company.length > 1 &&
      all.findIndex(
        (candidate) =>
          candidate.title.toLowerCase() === role.title.toLowerCase() &&
          candidate.company.toLowerCase() === role.company.toLowerCase()
      ) === index
  ).slice(0, 2)
}
