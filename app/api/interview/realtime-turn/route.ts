import { NextRequest, NextResponse } from 'next/server'
import { appendMessage, appendQuestion, getNextQuestionId, getStructuredTranscript, type Question } from '@/lib/interview-session'

export const dynamic = 'force-dynamic'

function looksLikeInterviewerQuestion(text: string) {
  const normalized = text.trim().toLowerCase()
  if (!normalized) return false
  return (
    normalized.includes('?') ||
    normalized.startsWith('tell me') ||
    normalized.startsWith('walk me') ||
    normalized.startsWith('describe') ||
    normalized.startsWith('what') ||
    normalized.startsWith('why') ||
    normalized.startsWith('how') ||
    normalized.startsWith('can you') ||
    normalized.startsWith('could you') ||
    normalized.startsWith('would you') ||
    normalized.startsWith('i see you') ||
    normalized.includes('tell me about')
  )
}

function getLatestQuestionId(questions: Question[]) {
  return questions.length ? questions[questions.length - 1].id : undefined
}

export async function POST(request: NextRequest) {
  try {
    const { sessionId, speaker, text } = await request.json()

    if (!sessionId || !speaker || typeof text !== 'string') {
      return NextResponse.json({ error: 'Missing sessionId, speaker, or text' }, { status: 400 })
    }

    if (speaker !== 'interviewer' && speaker !== 'candidate') {
      return NextResponse.json({ error: 'Invalid speaker' }, { status: 400 })
    }

    const cleanedText = text.trim()
    if (!cleanedText) {
      return NextResponse.json({ success: true, skipped: true })
    }

    const structured = await getStructuredTranscript(sessionId)
    const lastMessage = structured.messages[structured.messages.length - 1]

    if (lastMessage?.speaker === speaker && lastMessage.text.trim() === cleanedText) {
      return NextResponse.json({ success: true, duplicate: true, transcript_structured: structured })
    }

    let questionId: string | undefined

    if (speaker === 'interviewer' && looksLikeInterviewerQuestion(cleanedText)) {
      questionId = getNextQuestionId(structured)
    } else if (speaker === 'candidate') {
      questionId = getLatestQuestionId(structured.questions_asked)
    }

    const timestamp = new Date().toISOString()

    if (questionId && speaker === 'interviewer') {
      await appendQuestion({
        sessionId,
        questionId,
        question: cleanedText,
        timestamp,
      })
    }

    await appendMessage({
      sessionId,
      speaker,
      text: cleanedText,
      questionId,
      timestamp,
    })

    const updatedStructured = await getStructuredTranscript(sessionId)

    return NextResponse.json({
      success: true,
      questionId,
      transcript_structured: updatedStructured,
    })
  } catch (error: any) {
    console.error('realtime-turn error:', error)
    return NextResponse.json({ error: error.message || 'Failed to save realtime turn' }, { status: 500 })
  }
}
