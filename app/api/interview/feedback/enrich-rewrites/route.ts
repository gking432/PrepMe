import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { Anthropic } from '@anthropic-ai/sdk/client'
import { parseModelOutput, rewriteBatchSchema } from '@/lib/ai-contracts'
import { AI_MODELS } from '@/lib/ai-models'

let _anthropic: Anthropic | null = null
function getAnthropic() {
  if (!_anthropic) _anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY || '' })
  return _anthropic
}

const HR_REWRITE_METHODS = [
  { id: 'present_past_future', label: 'Present, Past, Future', instruction: 'Rewrite as Present -> Past -> Future: what they do now, the foundation that shaped them, and where they are headed next.' },
  { id: 'star', label: 'STAR', instruction: 'Rewrite as Situation -> Task -> Action -> Result. Keep Situation short, make Task/ownership clear, put the most weight into Action, and close with Result.' },
  { id: 'answer_reason_example', label: 'Answer, Reason, Example', instruction: 'Rewrite as direct Answer -> brief Reason -> short Example or proof. Use this for judgment, preference, approach, or non-story questions.' },
  { id: 'observation_fit_timing', label: 'Observation, Fit, Timing', instruction: 'Rewrite as Observation -> Fit -> Timing: what stood out about the role/company, why that connects to their background, and why the move makes sense now.' },
  { id: 'uncertainty_recovery', label: 'Recovery + Answer, Reason, Example', instruction: 'Rewrite as a brief recovery answer: pause/steady opening, one clear Answer, a Reason, and a short Example. Do not ramble while searching.' },
  { id: 'pace_delivery', label: 'Delivery Workshop', instruction: 'Rewrite the saved answer for better delivery: one simple transition, one clear main point first, smoother flow, and a settled ending. Do not change the substance.' },
  { id: 'research_questions', label: 'Research + Question-Building', instruction: 'Rewrite as a stronger preparation/curiosity response: basic company knowledge, one real point of interest, why it matters, and one thoughtful role/team/company question if relevant.' },
]

function questionLooksBehavioral(question?: string) {
  return /tell me about a time|give me an example|describe a time|walk me through a time|significant challenge|accomplishment|worked on|handled|managed|solved|dealt with/.test((question || '').toLowerCase())
}

function getMethod(criterion?: string, rootCause?: string, question?: string) {
  const text = `${criterion || ''} ${rootCause || ''}`.toLowerCase()
  if (/professional story|professional_story|tell me about yourself|background/.test(text)) return HR_REWRITE_METHODS[0]
  if (/answer structure|conciseness|structure/.test(text)) {
    if (/tell me about yourself|background|walk me through your experience/i.test(question || '')) return HR_REWRITE_METHODS[0]
    return questionLooksBehavioral(question) ? HR_REWRITE_METHODS[1] : HR_REWRITE_METHODS[2]
  }
  if (/specific examples|specificity|proof|evidence|lack_of_specificity|star|example/.test(text)) return questionLooksBehavioral(question) ? HR_REWRITE_METHODS[1] : HR_REWRITE_METHODS[2]
  if (/uncertain|difficult|off_topic|gap|bluff|deflect/.test(text)) return HR_REWRITE_METHODS[4]
  if (/alignment|career goals|career_alignment|position|why this role/.test(text)) return HR_REWRITE_METHODS[3]
  if (/pace|flow|natural delivery|weak_communication|conversation/.test(text)) return HR_REWRITE_METHODS[5]
  if (/preparation|curiosity|questions_about_company|company|question/.test(text)) return HR_REWRITE_METHODS[6]
  return null
}

function getCandidateAnswer(questionId: string | undefined, evidence: any, transcript: any) {
  const messages = Array.isArray(transcript?.messages) ? transcript.messages : []
  if (questionId) {
    const matched = messages
      .filter((m: any) => m?.speaker === 'candidate' && m?.question_id === questionId && typeof m?.text === 'string')
      .map((m: any) => m.text.trim())
      .filter(Boolean)
    if (matched.length) return matched.join('\n\n')
  }
  const excerpt = typeof evidence?.excerpt === 'string' ? evidence.excerpt.trim() : ''
  if (excerpt) {
    const found = messages.find((m: any) => m?.speaker === 'candidate' && typeof m?.text === 'string' && (m.text.includes(excerpt) || excerpt.includes(m.text.slice(0, 80))))
    if (found?.text) return found.text.trim()
  }
  return excerpt
}

export async function POST(request: NextRequest) {
  const { sessionId } = await request.json()
  if (!sessionId) {
    return NextResponse.json({ error: 'sessionId required' }, { status: 400 })
  }

  const { data: feedbackRow } = await supabaseAdmin
    .from('interview_feedback')
    .select('id, full_rubric')
    .eq('interview_session_id', sessionId)
    .single()

  if (!feedbackRow?.full_rubric) {
    return NextResponse.json({ error: 'No feedback found' }, { status: 404 })
  }

  const rubric = feedbackRow.full_rubric as any
  const weakSignals = Array.isArray(rubric?.hr_screen_six_areas?.what_needs_improve)
    ? rubric.hr_screen_six_areas.what_needs_improve
    : []

  const alreadyHasRewrites = weakSignals.some((s: any) => s.rewritten_answer)
  if (alreadyHasRewrites) {
    return NextResponse.json({ status: 'already_enriched', count: weakSignals.filter((s: any) => s.rewritten_answer).length })
  }

  const { data: sessionRow } = await supabaseAdmin
    .from('interview_sessions')
    .select('structured_transcript')
    .eq('id', sessionId)
    .single()

  const transcript = sessionRow?.structured_transcript

  const items = weakSignals
    .map((signal: any, index: number) => {
      const evidence = Array.isArray(signal?.evidence) ? signal.evidence[0] : null
      const questionId = evidence?.question_id
      const question = typeof evidence?.question === 'string' ? evidence.question : ''
      const originalAnswer = getCandidateAnswer(questionId, evidence, transcript)
      const method = getMethod(signal?.criterion, signal?.rootCause || signal?.root_cause, question)
      if (!method || !question || !originalAnswer || originalAnswer.length < 20) return null
      return { id: `issue_${index}`, index, criterion: signal.criterion, feedback: signal.feedback, question, original_answer: originalAnswer, method }
    })
    .filter(Boolean) as any[]

  if (!items.length) {
    return NextResponse.json({ status: 'no_rewritable_items', count: 0 })
  }

  try {
    const message = await getAnthropic().messages.create({
      model: AI_MODELS.coachingGeneration,
      max_tokens: 2800,
      temperature: 0.2,
      system: `You rewrite interview answers cheaply and safely.\n\nRules:\n- Preserve only details the candidate already provided.\n- Do not invent metrics, company facts, seniority, accomplishments, tools, clients, or outcomes.\n- Do not reverse the meaning of a weak answer.\n- For company/research rewrites, use bracketed placeholders for missing research details.\n- If a needed detail is missing, use a short bracketed placeholder like [specific result].\n- Keep each rewrite interview-natural, concise, and spoken aloud.\n- Target 80-120 words per rewritten answer.\n- Return valid JSON only.`,
      messages: [{
        role: 'user',
        content: JSON.stringify({
          task: 'Rewrite each flagged HR-screen answer using the assigned method.',
          output_shape: { rewrites: [{ id: 'issue_0', method: 'STAR', rewritten_answer: 'Better answer here.', why_this_works: 'One sentence explaining the improvement.' }] },
          items: items.slice(0, 6).map((item) => ({ id: item.id, criterion: item.criterion, rubric_feedback: item.feedback, question: item.question, original_answer: item.original_answer, method: item.method.label, method_instruction: item.method.instruction })),
        }),
      }],
    })

    const content = message.content[0]
    if (content.type !== 'text') {
      return NextResponse.json({ error: 'Unexpected response type' }, { status: 500 })
    }

    const parsed = parseModelOutput(content.text, rewriteBatchSchema)
    const rewrites = parsed.rewrites

    let enrichedCount = 0
    for (const rewrite of rewrites) {
      const source = items.find((item) => item.id === rewrite?.id)
      if (!source || !rewrite?.rewritten_answer) continue
      weakSignals[source.index] = {
        ...weakSignals[source.index],
        rewrite_method: rewrite.method || source.method.label,
        rewritten_answer: String(rewrite.rewritten_answer).trim(),
        rewrite_explanation: rewrite.why_this_works ? String(rewrite.why_this_works).trim() : '',
        original_answer: source.original_answer,
      }
      enrichedCount++
    }

    if (enrichedCount > 0) {
      rubric.hr_screen_six_areas.what_needs_improve = weakSignals
      await supabaseAdmin
        .from('interview_feedback')
        .update({ full_rubric: rubric })
        .eq('id', feedbackRow.id)
    }

    return NextResponse.json({ status: 'enriched', count: enrichedCount })
  } catch (error: any) {
    console.error('Enrich rewrites failed:', error)
    return NextResponse.json({ error: 'Enrichment failed', details: error?.message }, { status: 500 })
  }
}
