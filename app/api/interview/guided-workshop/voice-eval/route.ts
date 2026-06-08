import { NextRequest, NextResponse } from 'next/server'
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'
import OpenAI from 'openai'
import { Anthropic } from '@anthropic-ai/sdk/client'

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

function estimateCostCents(inputText: string, outputText: string, usage?: { input_tokens?: number; output_tokens?: number }) {
  const inputTokens = usage?.input_tokens || Math.ceil(inputText.length / 4)
  const outputTokens = usage?.output_tokens || Math.ceil(outputText.length / 4)
  const usd = (inputTokens * 1 + outputTokens * 5) / 1_000_000
  return {
    model: 'claude-haiku-4-5-20251001',
    input_tokens: inputTokens,
    output_tokens: outputTokens,
    estimated_cents: Number((usd * 100).toFixed(4)),
  }
}

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData()
    const audioFile = formData.get('audio') as File | null
    const builtAnswer = String(formData.get('built_answer') || '').slice(0, 4000)
    const workshopType = String(formData.get('workshop_type') || '')
    const confirmedBeats = String(formData.get('confirmed_beats') || '').slice(0, 6000)
    const originalAnswer = String(formData.get('original_answer') || '').slice(0, 3000)
    const repairFeedback = String(formData.get('repair_feedback') || '').slice(0, 1500)
    const sessionId = String(formData.get('session_id') || '')

    if (sessionId === 'mock-session-preview') {
      return NextResponse.json({
        transcript: builtAnswer || 'Preview spoken attempt.',
        scores: { coverage: 82, structure: 84, delivery: 78 },
        feedback: 'Preview pass: the repaired answer keeps the core beats and is ready enough to retake.',
        kept: ['clear framework', 'specific answer beats'],
        dropped: [],
        ready_for_retake: true,
        fixed_score_area: true,
        remaining_gap: 'Keep it concise when saying it out loud.',
        breakdown_phase: 'spoken_delivery',
        next_action: 'Use the answer with the script hidden once, then retake.',
        cost_estimate: {
          model: 'mock-preview',
          input_tokens: 0,
          output_tokens: 0,
          estimated_cents: 0,
        },
      })
    }

    const supabase = createRouteHandlerClient({ cookies })
    const { data: { session } } = await supabase.auth.getSession()
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
    }

    if (!audioFile || !builtAnswer) {
      return NextResponse.json({ error: 'Missing audio or built_answer' }, { status: 400 })
    }

    // 1) Transcribe with Whisper (~$0.006/min, typically $0.001-0.002 per answer)
    const transcription = await getOpenAI().audio.transcriptions.create({
      file: audioFile,
      model: 'whisper-1',
    })
    const transcript = (transcription.text || '').trim()

    if (!transcript) {
      return NextResponse.json({
        transcript: '',
        scores: { coverage: 0, structure: 0, delivery: 0 },
        feedback: 'We could not hear anything clearly. Try again in a quieter spot.',
        kept: [],
        dropped: [],
        ready_for_retake: false,
        fixed_score_area: false,
        remaining_gap: 'The audio was not clear enough to tell whether the repair worked.',
        breakdown_phase: 'spoken_delivery',
        next_action: 'Record it again in a quieter spot.',
      })
    }

    // 2) Score the attempt with Haiku (~$0.002 per call)
    const system = `You score whether a candidate's repaired interview answer holds up when spoken.

You score three things 0-100:
- coverage: did they hit the confirmed raw beats and avoid losing the important substance?
- structure: did they preserve the workshop framework and make the answer easy to follow?
- delivery: did they sound clean (low filler, no rambling, finished cleanly)?

Judge whether this would likely improve the flagged HR screen issue in a retake. Be honest but practical.
If the confirmed raw beats were weak, set breakdown_phase to "source_material".
If the written answer was solid but spoken version lost structure, set breakdown_phase to "spoken_delivery".
If the content was there but arranged poorly, set breakdown_phase to "answer_structure".

Return ONLY valid JSON.`

    const userMessage = JSON.stringify({
      workshop_type: workshopType,
      original_weak_answer: originalAnswer,
      flagged_feedback: repairFeedback,
      confirmed_raw_beats: confirmedBeats ? safeParseJson(confirmedBeats) || confirmedBeats : {},
      target_answer: builtAnswer,
      what_they_said: transcript,
      output_shape: {
        coverage: 75,
        structure: 80,
        delivery: 70,
        feedback: 'One sentence of warm, specific coaching on whether the repair held up.',
        kept: ['a key phrase they got right', 'another key beat they hit'],
        dropped: ['a key beat they missed', 'another piece that fell out'],
        ready_for_retake: true,
        fixed_score_area: true,
        remaining_gap: 'The one thing still limiting the answer.',
        breakdown_phase: 'source_material | answer_structure | spoken_delivery',
        next_action: 'One concrete next action before retake.',
      },
    })

    let scores = { coverage: 70, structure: 70, delivery: 70 }
    let feedback = ''
    let kept: string[] = []
    let dropped: string[] = []
    let readyForRetake = false
    let fixedScoreArea = false
    let remainingGap = ''
    let breakdownPhase: 'source_material' | 'answer_structure' | 'spoken_delivery' = 'spoken_delivery'
    let nextAction = ''
    let costEstimate: any = null

    try {
      const message = await getAnthropic().messages.create({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 850,
        temperature: 0.2,
        system,
        messages: [{ role: 'user', content: userMessage }],
      })
      const content = message.content[0]
      const rawText = content.type === 'text' ? content.text : ''
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
        readyForRetake = Boolean(parsed.ready_for_retake)
        fixedScoreArea = Boolean(parsed.fixed_score_area)
        remainingGap = typeof parsed.remaining_gap === 'string' ? parsed.remaining_gap.trim() : ''
        breakdownPhase = ['source_material', 'answer_structure', 'spoken_delivery'].includes(parsed.breakdown_phase)
          ? parsed.breakdown_phase
          : breakdownPhase
        nextAction = typeof parsed.next_action === 'string' ? parsed.next_action.trim() : ''
      }
      costEstimate = estimateCostCents(userMessage, rawText, (message as any).usage)
    } catch (evalError: any) {
      console.error('voice-eval scoring failed:', evalError?.message || evalError)
      feedback = 'Scoring is offline right now — but you said it out loud, which is the part that matters.'
    }

    if (!feedback) feedback = 'You completed the spoken pass. Tighten any missing beats before the retake.'
    if (!remainingGap) remainingGap = dropped[0] || 'Keep the answer specific and close it cleanly.'
    if (!nextAction) nextAction = readyForRetake ? 'Use this version in the retake.' : 'Practice once more with the answer hidden.'

    return NextResponse.json({
      transcript,
      scores,
      feedback,
      kept,
      dropped,
      ready_for_retake: readyForRetake || ((scores.coverage + scores.structure + scores.delivery) / 3 >= 75),
      fixed_score_area: fixedScoreArea || (scores.coverage >= 70 && scores.structure >= 70),
      remaining_gap: remainingGap,
      breakdown_phase: breakdownPhase,
      next_action: nextAction,
      cost_estimate: costEstimate,
    })
  } catch (error: any) {
    console.error('voice-eval failed:', error?.message || error)
    return NextResponse.json({ error: 'Voice eval failed', details: error?.message }, { status: 500 })
  }
}
