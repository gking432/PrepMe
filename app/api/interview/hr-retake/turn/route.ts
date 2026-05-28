import { NextRequest, NextResponse } from 'next/server'
import OpenAI from 'openai'
import { supabaseAdmin } from '@/lib/supabase'
import { appendMessage, appendQuestion, calculateDuration, getStructuredTranscript } from '@/lib/interview-session'
import { loadStoredInterviewAudioBase64 } from '@/lib/interview-audio'

export const dynamic = 'force-dynamic'

let _openai: OpenAI | null = null
function getOpenAI() {
  if (!_openai) _openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })
  return _openai
}

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData()
    const audioFile = formData.get('audio') as File | null
    const sessionId = formData.get('sessionId') as string | null

    if (!audioFile || !sessionId) {
      return NextResponse.json({ error: 'Missing audio or sessionId' }, { status: 400 })
    }

    const transcription = await getOpenAI().audio.transcriptions.create({
      file: audioFile,
      model: 'gpt-4o-mini-transcribe',
    })

    const userMessage = transcription.text?.trim() || ''

    const { data: sessionData, error: sessionError } = await supabaseAdmin
      .from('interview_sessions')
      .select('observer_notes, created_at')
      .eq('id', sessionId)
      .single()

    if (sessionError || !sessionData) {
      return NextResponse.json({ error: 'Interview session not found' }, { status: 404 })
    }

    const existingObserverNotes = sessionData.observer_notes && typeof sessionData.observer_notes === 'object'
      ? sessionData.observer_notes
      : {}
    const retakeState = existingObserverNotes.hr_retake

    const isCachedRetakeMode =
      retakeState?.mode === 'cached_questions_tts' ||
      retakeState?.mode === 'cached_questions_audio'

    if (!isCachedRetakeMode || !Array.isArray(retakeState.script_prompts)) {
      return NextResponse.json({ error: 'Cached retake state not found' }, { status: 400 })
    }

    const currentIndex = Number(retakeState.current_prompt_index || 0)
    const currentPrompt = retakeState.script_prompts[currentIndex]

    await appendMessage({
      sessionId,
      speaker: 'candidate',
      text: userMessage,
      questionId: currentPrompt?.questionId,
    })

    const nextIndex = currentIndex + 1
    const nextPrompt = retakeState.script_prompts[nextIndex]
    let assistantText = 'That covers everything. Thanks for taking the time today.'
    let audioBase64: string | null = null
    let complete = true

    if (nextPrompt) {
      assistantText = nextPrompt.text
      complete = false

      await appendQuestion({
        sessionId,
        questionId: nextPrompt.questionId,
        question: nextPrompt.text,
      })
    }

    await appendMessage({
      sessionId,
      speaker: 'interviewer',
      text: assistantText,
      questionId: nextPrompt?.questionId,
    })

    if (nextPrompt) {
      audioBase64 = nextPrompt.audio_cache
        ? await loadStoredInterviewAudioBase64(nextPrompt.audio_cache)
        : null

      if (!audioBase64) {
        return NextResponse.json(
          {
            error: 'Saved realtime audio was missing for the next retake question.',
            code: 'RETAKE_AUDIO_CACHE_MISSING',
            questionId: nextPrompt.questionId,
          },
          { status: 409 }
        )
      }
    }

    const structured = await getStructuredTranscript(sessionId)
    const transcriptLines = structured.messages.map((message) => {
      const speaker = message.speaker === 'interviewer' ? 'Interviewer' : 'You'
      return `${speaker}: ${message.text}`
    })
    const durationSeconds = calculateDuration(sessionData.created_at)

    await supabaseAdmin
      .from('interview_sessions')
      .update({
        transcript: transcriptLines.join('\n'),
        transcript_structured: structured,
        duration_seconds: durationSeconds,
        observer_notes: {
          ...existingObserverNotes,
          hr_retake: {
            ...retakeState,
            current_prompt_index: nextIndex,
          },
        },
      })
      .eq('id', sessionId)

    return NextResponse.json({
      userMessage: `You: ${userMessage}`,
      assistantMessage: `Interviewer: ${assistantText}`,
      audioBase64,
      complete,
      conversationPhase: complete ? 'closing' : 'screening',
      cachedRetakeMode: true,
    })
  } catch (error: any) {
    console.error('hr-retake turn error:', error)
    return NextResponse.json({ error: error.message || 'Failed to process HR retake turn' }, { status: 500 })
  }
}
