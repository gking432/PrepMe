export const PORTFOLIO_DEMO_MODE = process.env.NEXT_PUBLIC_PORTFOLIO_DEMO_MODE !== 'false'

export const PORTFOLIO_SAMPLE_SETUP: Required<
  Pick<DemoInterviewSetup, 'resumeText' | 'jobDescriptionText' | 'companyName' | 'positionTitle'>
> = {
  companyName: 'Moonrise Wildlife Sanctuary',
  positionTitle: 'Animal Care Operations Coordinator',
  resumeText: `Elena Park — FICTIONAL SAMPLE CANDIDATE
Wildlife Intake Coordinator, Bramble Creek Rescue — FICTIONAL ORGANIZATION

Six years of animal-care operations experience supporting wildlife intake, rehabilitation records, volunteer scheduling, and safe transfers.

• Coordinated daily intake for injured birds and small mammals across a rotating care team.
• Rebuilt medication and feeding logs so caretakers could spot missed checks before shift changes.
• Organized volunteer coverage during seasonal intake surges and emergency transport days.
• Introduced a supply-count routine that reduced last-minute shortages in treatment rooms.

Earlier experience:
Animal Care Assistant, Larkspur Field Hospital — FICTIONAL ORGANIZATION`,
  jobDescriptionText: `FICTIONAL DEMO JOB POSTING — not affiliated with a real employer

Company: Moonrise Wildlife Sanctuary
Position: Animal Care Operations Coordinator

Moonrise Wildlife Sanctuary is a fictional rehabilitation center hiring an Animal Care Operations Coordinator to keep animal intake, treatment records, volunteer coverage, and transport schedules running safely.

Responsibilities:
• Coordinate animal intake, care schedules, and safe transfers between facilities.
• Maintain accurate treatment, feeding, and medication records.
• Schedule volunteers and communicate coverage changes to the care team.
• Track critical supplies and prepare operations for seasonal intake surges.

Qualifications:
• Three or more years in animal care, wildlife rehabilitation, or shelter operations.
• Strong scheduling, recordkeeping, and calm communication skills.
• Experience improving safety-critical routines in a hands-on environment.`,
}

export const DEMO_SESSION_KEY = 'prepme_demo_session'
export const DEMO_FEEDBACK_KEY = 'prepme_demo_feedback'
export const DEMO_PRACTICE_PROGRESS_KEY = 'prepme_demo_practice_progress'
export const PORTFOLIO_SAMPLE_SESSION_ID = 'portfolio-completed-sample'

export type DemoInterviewSetup = {
  resumeText?: string
  jobDescriptionText?: string
  companyName?: string
  positionTitle?: string
  companyWebsite?: string
  notes?: string
  extractedUserInfo?: unknown
}

export type DemoInterviewSession = {
  id: string
  stage: 'hr_screen'
  status: 'in_progress' | 'completed' | 'cancelled'
  created_at: string
  completed_at?: string
  duration_seconds?: number
  transcript?: string
  transcript_structured?: ReturnType<typeof buildStructuredTranscript>
  company_name?: string
  job_title?: string
  job_description_text?: string
  candidate_name?: string
  demo_mode: true
  setup: DemoInterviewSetup
}

export type DemoFeedbackRecord = {
  sessionId: string
  feedback: Record<string, any>
  savedAt: string
}

function readJson<T>(key: string): T | null {
  if (typeof window === 'undefined') return null
  try {
    const raw = window.localStorage.getItem(key)
    return raw ? JSON.parse(raw) as T : null
  } catch {
    return null
  }
}

export function getDemoSetup(): DemoInterviewSetup | null {
  return readJson<DemoInterviewSetup>('temp_interview_data')
}

export function getDemoSession(): DemoInterviewSession | null {
  return readJson<DemoInterviewSession>(DEMO_SESSION_KEY)
}

export function saveDemoSession(session: DemoInterviewSession): void {
  if (typeof window === 'undefined') return
  window.localStorage.setItem(DEMO_SESSION_KEY, JSON.stringify(session))
  window.localStorage.setItem('last_interview_session_id', session.id)
}

export function updateDemoSession(
  updates: Partial<Omit<DemoInterviewSession, 'id' | 'stage' | 'demo_mode' | 'setup'>>,
): DemoInterviewSession | null {
  const existing = getDemoSession()
  if (!existing) return null
  const updated = { ...existing, ...updates }
  saveDemoSession(updated)
  return updated
}

export function saveDemoFeedback(sessionId: string, feedback: Record<string, any>): void {
  if (typeof window === 'undefined') return
  const record: DemoFeedbackRecord = {
    sessionId,
    feedback,
    savedAt: new Date().toISOString(),
  }
  window.localStorage.setItem(DEMO_FEEDBACK_KEY, JSON.stringify(record))
}

export function getDemoFeedback(sessionId?: string): DemoFeedbackRecord | null {
  const record = readJson<DemoFeedbackRecord>(DEMO_FEEDBACK_KEY)
  if (!record || (sessionId && record.sessionId !== sessionId)) return null
  return record
}

export function seedPortfolioSampleResult(
  feedback: Record<string, any>,
  transcriptStructured: {
    messages?: Array<{ speaker?: string; text?: string }>
    questions_asked?: unknown[]
    [key: string]: unknown
  },
): DemoInterviewSession {
  const completedAt = new Date()
  const session: DemoInterviewSession = {
    id: PORTFOLIO_SAMPLE_SESSION_ID,
    stage: 'hr_screen',
    status: 'completed',
    created_at: new Date(completedAt.getTime() - 14 * 60 * 1000).toISOString(),
    completed_at: completedAt.toISOString(),
    duration_seconds: 840,
    transcript: (transcriptStructured.messages || [])
      .map((message) => `${message.speaker === 'candidate' ? 'You' : 'Interviewer'}: ${message.text || ''}`)
      .join('\n'),
    transcript_structured: transcriptStructured as ReturnType<typeof buildStructuredTranscript>,
    company_name: PORTFOLIO_SAMPLE_SETUP.companyName,
    job_title: PORTFOLIO_SAMPLE_SETUP.positionTitle,
    job_description_text: PORTFOLIO_SAMPLE_SETUP.jobDescriptionText,
    candidate_name: 'Elena Park',
    demo_mode: true,
    setup: PORTFOLIO_SAMPLE_SETUP,
  }

  saveDemoSession(session)
  saveDemoFeedback(session.id, feedback)
  return session
}

export function getDemoPracticeProgress(sessionId: string): string[] {
  const progress = readJson<Record<string, string[]>>(DEMO_PRACTICE_PROGRESS_KEY)
  const completed = progress?.[sessionId]
  return Array.isArray(completed) ? completed.filter((key) => typeof key === 'string') : []
}

export function markDemoPracticeComplete(sessionId: string, practiceKey: string): void {
  if (typeof window === 'undefined') return
  const progress = readJson<Record<string, string[]>>(DEMO_PRACTICE_PROGRESS_KEY) || {}
  const completed = new Set(progress[sessionId] || [])
  completed.add(practiceKey)
  window.localStorage.setItem(
    DEMO_PRACTICE_PROGRESS_KEY,
    JSON.stringify({ ...progress, [sessionId]: Array.from(completed) }),
  )
}

export function buildStructuredTranscript(transcript: string) {
  const messages: Array<{
    speaker: 'candidate' | 'interviewer'
    text: string
    timestamp: string
    question_id?: string
  }> = []
  const questions_asked: Array<{ id: string; question: string; timestamp: string }> = []
  let elapsedSeconds = 0
  let questionCount = 0

  for (const rawLine of transcript.split('\n')) {
    const line = rawLine.trim()
    if (!line) continue
    const isCandidate = /^You:/i.test(line)
    const isInterviewer = /^Interviewer:/i.test(line)
    if (!isCandidate && !isInterviewer) continue

    const text = line.replace(/^(You|Interviewer):\s*/i, '').trim()
    if (!text) continue

    const timestamp = `${Math.floor(elapsedSeconds / 60)}:${String(elapsedSeconds % 60).padStart(2, '0')}`
    const looksLikeQuestion = isInterviewer && (
      text.includes('?') ||
      /^(tell me|what|why|how|can you|could you|would you|walk me)/i.test(text)
    )
    const questionId = looksLikeQuestion ? `q${++questionCount}` : undefined

    messages.push({
      speaker: isCandidate ? 'candidate' : 'interviewer',
      text,
      timestamp,
      ...(questionId ? { question_id: questionId } : {}),
    })

    if (questionId) {
      questions_asked.push({ id: questionId, question: text, timestamp })
    }

    elapsedSeconds += isCandidate ? 30 : 15
  }

  return {
    messages,
    questions_asked,
    start_time: new Date().toISOString(),
  }
}

export function getDemoContextPayload() {
  const session = getDemoSession()
  const setup = session?.setup || getDemoSetup()
  return {
    demoMode: true,
    demoContext: {
      resumeText: setup?.resumeText || '',
      jobDescriptionText: setup?.jobDescriptionText || '',
      companyWebsite: setup?.companyWebsite || '',
      companyName: setup?.companyName || '',
      roleTitle: setup?.positionTitle || '',
      transcript: session?.transcript || '',
      structuredTranscript: session?.transcript_structured || null,
      durationSeconds: session?.duration_seconds || null,
    },
  }
}
