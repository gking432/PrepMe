import { NextRequest, NextResponse } from 'next/server'
import OpenAI from 'openai'
import { supabaseAdmin } from '@/lib/supabase'
import { appendMessage, appendQuestion, calculateDuration, getStructuredTranscript } from '@/lib/interview-session'
import { getFixedHrAudioText, handleHrTurn, loadFixedHrAudio } from '@/lib/hr-screen-script'
import { getOrCreateCachedSpeech, synthesizePreferredSpeech } from '@/lib/interview-audio'

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
      model: 'whisper-1',
    })

    const userMessage = transcription.text?.trim() || ''

    const { data: sessionData, error: sessionError } = await supabaseAdmin
      .from('interview_sessions')
      .select('observer_notes, transcript, transcript_structured, created_at, duration_seconds')
      .eq('id', sessionId)
      .single()

    if (sessionError || !sessionData) {
      return NextResponse.json({ error: 'Interview session not found' }, { status: 404 })
    }

    const state = sessionData.observer_notes?.hr_script_state
    if (!state) {
      return NextResponse.json({ error: 'Scripted HR state not found for session' }, { status: 400 })
    }

    await appendMessage({
      sessionId,
      speaker: 'candidate',
      text: userMessage,
      questionId: state.currentQuestionId || undefined,
    })

    const decision = handleHrTurn(state, userMessage)

    if (decision.questionText && decision.questionId) {
      await appendQuestion({
        sessionId,
        questionId: decision.questionId,
        question: decision.questionText,
        assessmentAreas: ['answer_structure', 'pace_and_flow'],
      })
    }

    await appendMessage({
      sessionId,
      speaker: 'interviewer',
      text: decision.assistantText,
      questionId: decision.questionId || undefined,
    })

    const structured = await getStructuredTranscript(sessionId)
    const transcriptLines = structured.messages.map((message) => {
      const speaker = message.speaker === 'interviewer' ? 'Interviewer' : 'You'
      return `${speaker}: ${message.text}`
    })

    const durationSeconds = calculateDuration(sessionData.created_at)
    const existingObserverNotes = sessionData.observer_notes && typeof sessionData.observer_notes === 'object'
      ? sessionData.observer_notes
      : {}

    await supabaseAdmin
      .from('interview_sessions')
      .update({
        transcript: transcriptLines.join('\n'),
        transcript_structured: structured,
        observer_notes: {
          ...existingObserverNotes,
          hr_script_state: decision.nextState,
        },
        duration_seconds: durationSeconds,
      })
      .eq('id', sessionId)

    let audioBase64: string | null = null

    if (decision.usedAudioKey) {
      audioBase64 = await loadFixedHrAudio(decision.usedAudioKey)
      if (!audioBase64) {
        const fixedText = getFixedHrAudioText(decision.usedAudioKey)
        if (fixedText) {
          audioBase64 = await getOrCreateCachedSpeech({
            cacheKey: decision.usedAudioKey,
            text: fixedText,
          })
        }
      }
    }

    if (!audioBase64) {
      const speechText = decision.dynamicAudioText || decision.assistantText
      audioBase64 =
        (await getOrCreateCachedSpeech({ text: speechText })) ??
        (await synthesizePreferredSpeech(speechText))
    }

    return NextResponse.json({
      userMessage: `You: ${userMessage}`,
      assistantMessage: `Interviewer: ${decision.assistantText}`,
      audioBase64,
      complete: decision.complete,
      conversationPhase: decision.complete ? 'closing' : 'screening',
      scriptedMode: true,
    })
  } catch (error) {
    console.error('Error processing scripted HR turn:', error)
    return NextResponse.json({ error: 'Failed to process scripted HR turn' }, { status: 500 })
  }
}
