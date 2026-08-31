import { NextRequest, NextResponse } from 'next/server'
import OpenAI from 'openai'
import { Anthropic } from '@anthropic-ai/sdk/client'
import { supabaseAdmin } from '@/lib/supabase'
import { enforceRateLimit } from '@/lib/demo-guard'
import { AI_MODELS } from '@/lib/ai-models'

let _openai: OpenAI | null = null
function getOpenAI() {
  if (!_openai) _openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })
  return _openai
}

let _anthropic: Anthropic | null = null
function getAnthropic() {
  if (!_anthropic) _anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY || '' })
  return _anthropic
}

function safeParseJson(raw: string): any {
  if (!raw) return null
  const match = raw.match(/```(?:json)?\s*(\{[\s\S]*\})\s*```/) || raw.match(/(\{[\s\S]*\})/)
  const body = match ? match[1] : raw
  try {
    return JSON.parse(body)
  } catch {
    return null
  }
}

export async function POST(request: NextRequest) {
  try {
    const rateLimited = enforceRateLimit(request, 'workshop-voice', { limit: 12, windowMs: 60 * 60 * 1000 })
    if (rateLimited) return rateLimited
    const formData = await request.formData()
    const audioFile = formData.get('audio') as File | null
    if (audioFile && audioFile.size > 8 * 1024 * 1024) {
      return NextResponse.json({ error: 'Audio is too large. Keep recordings under 8 MB.' }, { status: 413 })
    }
    const builtAnswer = String(formData.get('built_answer') || '').slice(0, 4000)
    const workshopType = String(formData.get('workshop_type') || '')
    const sessionId = String(formData.get('session_id') || '')
    const demoMode = String(formData.get('demo_mode') || '') === 'true'

    if (!audioFile || !builtAnswer || !sessionId) {
      return NextResponse.json({ error: 'Missing audio, built_answer, or session_id' }, { status: 400 })
    }

    if (!demoMode) {
      const { data: interviewSession } = await supabaseAdmin
        .from('interview_sessions')
        .select('id')
        .eq('id', sessionId)
        .maybeSingle()
      if (!interviewSession) {
        return NextResponse.json({ error: 'Interview session not found' }, { status: 404 })
      }
    }

    // 1) Transcribe with Whisper (~$0.006/min, typically $0.001-0.002 per answer)
    const transcription = await getOpenAI().audio.transcriptions.create({
      file: audioFile,
      model: AI_MODELS.legacyTranscription,
    })
    const transcript = (transcription.text || '').trim()

    if (!transcript) {
      return NextResponse.json({
        transcript: '',
        scores: { coverage: 0, structure: 0, delivery: 0 },
        feedback: 'We could not hear anything clearly. Try again in a quieter spot.',
        kept: [],
        dropped: [],
      })
    }

    // 2) Score the attempt with Haiku (~$0.002 per call)
    const system = `You score a candidate's practice recall of an interview answer. They tried to say their prepared answer from memory.

You score three things 0-100:
- coverage: did they hit the key points and content from the target answer?
- structure: did they keep the same order/framework as the target?
- delivery: did they sound clean (low filler "um/like/so", no rambling, finished cleanly)?

Be honest but kind. Most attempts should score 50-85, perfect recall is rare. Below 40 means they missed most of it.

Return ONLY valid JSON.`

    const userMessage = JSON.stringify({
      workshop_type: workshopType,
      target_answer: builtAnswer,
      what_they_said: transcript,
      output_shape: {
        coverage: 75,
        structure: 80,
        delivery: 70,
        feedback: 'One sentence of warm, specific coaching on what to tighten next time.',
        kept: ['a key phrase they got right', 'another key beat they hit'],
        dropped: ['a key beat they missed', 'another piece that fell out'],
      },
    })

    let scores = { coverage: 70, structure: 70, delivery: 70 }
    let feedback = ''
    let kept: string[] = []
    let dropped: string[] = []

    try {
      const message = await getAnthropic().messages.create({
        model: AI_MODELS.coachingGeneration,
        max_tokens: 700,
        temperature: 0.2,
        system,
        messages: [{ role: 'user', content: userMessage }],
      })
      const content = message.content[0]
      if (content.type === 'text') {
        const parsed = safeParseJson(content.text) || {}
        scores = {
          coverage: Math.max(0, Math.min(100, Number(parsed.coverage) || 0)),
          structure: Math.max(0, Math.min(100, Number(parsed.structure) || 0)),
          delivery: Math.max(0, Math.min(100, Number(parsed.delivery) || 0)),
        }
        feedback = typeof parsed.feedback === 'string' ? parsed.feedback.trim() : ''
        kept = Array.isArray(parsed.kept) ? parsed.kept.map((s: unknown) => String(s || '').trim()).filter(Boolean).slice(0, 4) : []
        dropped = Array.isArray(parsed.dropped) ? parsed.dropped.map((s: unknown) => String(s || '').trim()).filter(Boolean).slice(0, 4) : []
      }
    } catch (evalError: any) {
      console.error('voice-eval scoring failed:', evalError?.message || evalError)
      feedback = 'Scoring is offline right now — but you said it out loud, which is the part that matters.'
    }

    return NextResponse.json({ transcript, scores, feedback, kept, dropped })
  } catch (error: any) {
    console.error('voice-eval failed:', error?.message || error)
    return NextResponse.json({ error: 'Voice eval failed', details: error?.message }, { status: 500 })
  }
}
