export const PORTFOLIO_DEMO_MODE = true

export const DEMO_SESSION_KEY = 'prepme_demo_session'
export const DEMO_FEEDBACK_KEY = 'prepme_demo_feedback'
export const DEMO_PRACTICE_PROGRESS_KEY = 'prepme_demo_practice_progress'

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
