import { NextRequest, NextResponse } from 'next/server'
import crypto from 'crypto'
import { supabaseAdmin } from '@/lib/supabase'
import { appendMessage, appendQuestion } from '@/lib/interview-session'
import { loadStoredInterviewAudioBase64 } from '@/lib/interview-audio'

export const dynamic = 'force-dynamic'

function looksLikeQuestion(text: string) {
  const normalized = text.trim().toLowerCase()
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
    normalized.startsWith('i see you') ||
    normalized.includes('tell me about')
  )
}

function textHash(text: string) {
  return crypto.createHash('sha1').update(text).digest('hex').slice(0, 12)
}

function getSourceQuestions(sourceSession: any) {
  const structuredQuestions = Array.isArray(sourceSession?.transcript_structured?.questions_asked)
    ? sourceSession.transcript_structured.questions_asked
    : []

  if (structuredQuestions.length) {
    return structuredQuestions
      .map((question: any, index: number) => ({
        id: question.id || question.question_id || `q${index + 1}`,
        question: String(question.question || question.text || '').trim(),
        audio_cache: question.audio_cache || question.audioCache || null,
      }))
      .filter((question: any) => question.question)
  }

  const transcript = String(sourceSession?.transcript || '')
  return transcript
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => /^Interviewer:/i.test(line))
    .map((line) => line.replace(/^Interviewer:\s*/i, '').trim())
    .filter(looksLikeQuestion)
    .map((question, index) => ({ id: `q${index + 1}`, question }))
}

export async function POST(request: NextRequest) {
  try {
    const { sessionId, sourceSessionId } = await request.json()

    if (!sessionId || !sourceSessionId) {
      return NextResponse.json({ error: 'Missing sessionId or sourceSessionId' }, { status: 400 })
    }

    const { data: sourceSession, error: sourceError } = await supabaseAdmin
      .from('interview_sessions')
      .select('id, stage, transcript, transcript_structured')
      .eq('id', sourceSessionId)
      .single()

    if (sourceError || !sourceSession || sourceSession.stage !== 'hr_screen') {
      return NextResponse.json({ error: 'Source HR screen session not found' }, { status: 404 })
    }

    const questions = getSourceQuestions(sourceSession)
    if (!questions.length) {
      return NextResponse.json({ error: 'Source session has no saved interviewer questions' }, { status: 400 })
    }

    const scriptPrompts = await Promise.all(
      questions.map(async (question: any) => {
        const cacheKey = `retake-${sourceSessionId}-${question.id}-${textHash(question.question)}`
        const storedRealtimeAudio = await loadStoredInterviewAudioBase64(question.audio_cache)

        if (!storedRealtimeAudio) {
          return {
            questionId: question.id,
            text: question.question,
            audioBase64: null,
            audioSource: 'missing_realtime_audio',
            audioCache: question.audio_cache || null,
            cacheKey,
          }
        }

        return {
          questionId: question.id,
          text: question.question,
          audioBase64: storedRealtimeAudio,
          audioSource: 'realtime_audio_cache',
          audioCache: question.audio_cache || null,
          cacheKey,
        }
      })
    )

    const missingAudioPrompts = scriptPrompts.filter((prompt) => !prompt.audioBase64)
    if (missingAudioPrompts.length) {
      return NextResponse.json(
        {
          error: 'This HR screen does not have saved realtime audio for every retake question. Please run a new HR screen before using same-voice retakes.',
          code: 'RETAKE_AUDIO_CACHE_MISSING',
          missingQuestionIds: missingAudioPrompts.map((prompt) => prompt.questionId),
        },
        { status: 409 }
      )
    }

    const firstPrompt = scriptPrompts[0]

    await appendQuestion({
      sessionId,
      questionId: firstPrompt.questionId,
      question: firstPrompt.text,
      timestamp: '0:00',
    })

    await appendMessage({
      sessionId,
      speaker: 'interviewer',
      text: firstPrompt.text,
      questionId: firstPrompt.questionId,
      timestamp: '0:00',
    })

    const { data: targetSession } = await supabaseAdmin
      .from('interview_sessions')
      .select('observer_notes')
      .eq('id', sessionId)
      .single()

    await supabaseAdmin
      .from('interview_sessions')
      .update({
        transcript: `Interviewer: ${firstPrompt.text}`,
        observer_notes: {
          ...(targetSession?.observer_notes && typeof targetSession.observer_notes === 'object' ? targetSession.observer_notes : {}),
          hr_retake: {
            source_session_id: sourceSessionId,
            mode: 'cached_questions_audio',
            script_question_ids: scriptPrompts.map((prompt) => prompt.questionId),
            script_prompts: scriptPrompts.map((prompt) => ({
              questionId: prompt.questionId,
              text: prompt.text,
              audioSource: prompt.audioSource,
              audio_cache: prompt.audioCache,
            })),
            current_prompt_index: 0,
          },
        },
      })
      .eq('id', sessionId)

    return NextResponse.json({
      message: firstPrompt.text,
      audioBase64: firstPrompt.audioBase64,
      scriptPrompts: scriptPrompts.map((prompt) => ({
        questionId: prompt.questionId,
        text: prompt.text,
        audioSource: prompt.audioSource,
        audio_cache: prompt.audioCache,
      })),
      conversationPhase: 'screening',
      cachedRetakeMode: true,
    })
  } catch (error: any) {
    console.error('hr-retake start error:', error)
    return NextResponse.json({ error: error.message || 'Failed to start HR retake' }, { status: 500 })
  }
}
