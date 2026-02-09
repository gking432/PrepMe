// Interview session state management helper
// Centralizes transcript and structured state management

import { supabaseAdmin } from './supabase'

export interface Message {
  speaker: 'interviewer' | 'candidate'
  text: string
  timestamp: string
  question_id?: string
}

export interface Question {
  id: string
  question: string
  timestamp: string
  assessment_areas?: string[]
}

export interface StructuredTranscript {
  messages: Message[]
  questions_asked: Question[]
  start_time: string
}

export interface AppendMessageParams {
  sessionId: string
  speaker: 'interviewer' | 'candidate'
  text: string
  questionId?: string
  timestamp?: string
}

export interface AppendQuestionParams {
  sessionId: string
  questionId: string
  question: string
  assessmentAreas?: string[]
  timestamp?: string
}

/**
 * Get or initialize structured transcript for a session
 */
export async function getStructuredTranscript(
  sessionId: string
): Promise<StructuredTranscript> {
  const { data: sessionData, error } = await supabaseAdmin
    .from('interview_sessions')
    .select('transcript_structured, created_at')
    .eq('id', sessionId)
    .single()

  if (error && error.code !== 'PGRST116') {
    // PGRST116 = no rows returned, which is fine for new sessions
    throw new Error(`Failed to fetch session: ${error.message}`)
  }

  const existingStructured = sessionData?.transcript_structured

  if (existingStructured && existingStructured.messages && existingStructured.questions_asked) {
    return existingStructured as StructuredTranscript
  }

  // Initialize new structured transcript
  return {
    messages: [],
    questions_asked: [],
    start_time: sessionData?.created_at || new Date().toISOString(),
  }
}

/**
 * Append a message to the structured transcript
 */
export async function appendMessage({
  sessionId,
  speaker,
  text,
  questionId,
  timestamp,
}: AppendMessageParams): Promise<void> {
  const structuredTranscript = await getStructuredTranscript(sessionId)
  const messageTimestamp = timestamp || new Date().toISOString()

  const message: Message = {
    speaker,
    text,
    timestamp: messageTimestamp,
  }

  if (questionId) {
    message.question_id = questionId
  }

  structuredTranscript.messages.push(message)

  await supabaseAdmin
    .from('interview_sessions')
    .update({ transcript_structured: structuredTranscript })
    .eq('id', sessionId)
}

/**
 * Append a question to the questions_asked array
 */
export async function appendQuestion({
  sessionId,
  questionId,
  question,
  assessmentAreas,
  timestamp,
}: AppendQuestionParams): Promise<void> {
  const structuredTranscript = await getStructuredTranscript(sessionId)
  const questionTimestamp = timestamp || new Date().toISOString()

  const questionObj: Question = {
    id: questionId,
    question,
    timestamp: questionTimestamp,
  }

  if (assessmentAreas && assessmentAreas.length > 0) {
    questionObj.assessment_areas = assessmentAreas
  }

  structuredTranscript.questions_asked.push(questionObj)

  await supabaseAdmin
    .from('interview_sessions')
    .update({ transcript_structured: structuredTranscript })
    .eq('id', sessionId)
}

/**
 * Update session duration
 */
export async function updateDuration(sessionId: string, durationSeconds: number): Promise<void> {
  await supabaseAdmin
    .from('interview_sessions')
    .update({ duration_seconds: durationSeconds })
    .eq('id', sessionId)
}

/**
 * Get the next question ID based on existing questions
 */
export function getNextQuestionId(structuredTranscript: StructuredTranscript): string {
  const questionCounter = structuredTranscript.questions_asked.length + 1
  return `q${questionCounter}`
}

/**
 * Calculate duration from start time to now (or provided end time)
 */
export function calculateDuration(
  startTime: string,
  endTime?: string
): number {
  const start = new Date(startTime).getTime()
  const end = endTime ? new Date(endTime).getTime() : Date.now()
  return Math.floor((end - start) / 1000) // Return seconds
}

