import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'
import { Anthropic } from '@anthropic-ai/sdk/client'

let _anthropic: Anthropic | null = null
function getAnthropic() {
  if (!_anthropic) _anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY || '' })
  return _anthropic
}

type WorkshopType =
  | 'professional_story'
  | 'star_proof'
  | 'career_alignment'
  | 'handling_uncertainty'
  | 'pace_delivery'
  | 'preparation_curiosity'

const STEP_GUIDANCE: Record<WorkshopType, Record<string, string>> = {
  star_proof: {
    situation: 'Pull 2-3 brief setting lines from the candidate resume that could plausibly anchor this answer. Each one names a real project/role/team in 1 sentence so they can pick the right scene.',
    task: 'Given the picked situation, suggest 2-3 different ways to frame what was specifically at stake or what the candidate owned. Keep each to one sentence and make ownership clear.',
    action: 'Given the picked situation and task, draft 2-3 different action-first sentences describing concrete steps the candidate likely took. Use the resume to ground the actions. Each one should sound like real ownership, not generic verbs.',
    result: 'Given everything chosen so far, draft 2-3 short result lines. Prefer concrete outcomes hinted at in the resume (numbers, scope, time saved, decision made). If no metric exists, use a vivid qualitative outcome — never invent numbers.',
  },
  professional_story: {
    present: 'Pull 2-3 short PRESENT lines from the resume - what the candidate currently does or most recently did. Each in 1-2 sentences, naming the role and a single defining skill or focus.',
    past: 'Given the chosen present, draft 2-3 PAST lines explaining the foundation - early roles, education, projects, or skill arcs that connect logically to the present. Pull directly from resume.',
    future: 'Given present + past + the job description, draft 2-3 FUTURE lines on why this specific role is the natural next step. Each one names something concrete from the JD that matches the arc.',
  },
  career_alignment: {
    observation: 'Pull 2-3 specific OBSERVATIONS about the role/team/company from the JD. Each one names a real responsibility, scope, or focus mentioned in the JD — not vague platitudes.',
    fit: 'Given the chosen observation, draft 2-3 FIT statements pulling concrete experience from the resume that matches. Each connects a specific resume detail to the chosen observation.',
    timing: 'Given observation + fit, draft 2-3 TIMING statements on why now makes sense in the candidate arc. Reference resume momentum or skill direction — never invent personal life details.',
  },
  handling_uncertainty: {
    recovery: 'Draft 2-3 short RECOVERY openers — calm, steady, 1 sentence each. Patterns like "Honestly, I want to think about that for a second", "Good question — let me think through it cleanly". No filler, no apologizing.',
    answer: 'Given the original question, draft 2-3 short ANSWER statements — direct positions or judgments the candidate can take. One sentence each. Pull from resume context where reasonable.',
    reason: 'Given the chosen answer, draft 2-3 short REASON lines — one sentence each — explaining why that answer makes sense. Ground in resume experience when relevant.',
    example: 'Given answer + reason, pull 2-3 brief EXAMPLES from the resume that back it up. Each one names a concrete project/situation in 1 sentence.',
  },
  pace_delivery: {
    opener: 'Take the candidates original answer and draft 2-3 alternative OPENERS — each leads with the main point in 1 sentence. No "so", "um", "I guess", "kind of". Confident, declarative.',
    main_point: 'Given the chosen opener, draft 2-3 MAIN BODY versions — 2-3 sentences each — restating the candidates same content with cleaner structure and zero filler. Do not invent facts.',
    landing: 'Draft 2-3 short LANDINGS — 1 sentence each — that close the answer cleanly without trailing off. Patterns: tie back to the role, name what it taught them, or state next intent.',
  },
  preparation_curiosity: {
    what_you_know: 'Pull 2-3 short WHAT YOU KNOW statements — 1 sentence each — citing real specifics from the JD/company website (team, mission, product, recent direction). No fluff.',
    what_stood_out: 'Given what they know, draft 2-3 WHAT STOOD OUT statements — 1 sentence each — naming a specific aspect that genuinely connects to the candidates resume arc.',
    your_question: 'Given the above, draft 2-3 sharp QUESTIONS the candidate could ask. Each one references the specific company/role context, not generic "what is the culture like".',
  },
}

const WORKSHOP_CONTEXT: Record<WorkshopType, string> = {
  star_proof: 'Behavioral STAR answer (Situation → Task → Action → Result). The candidate needs a believable, specific example with clear ownership and a real outcome.',
  professional_story: '"Tell me about yourself" using Present → Past → Future. The candidate needs a clear professional arc, not a list of facts.',
  career_alignment: '"Why this role" using Observation → Fit → Timing. The candidate needs to show they researched the role and that their background matches.',
  handling_uncertainty: 'Recovering from an unexpected question using Recovery → Answer → Reason → Example. The candidate needs to avoid rambling.',
  pace_delivery: 'Rebuilding their existing answer with cleaner pacing — Opener → Main Point → Landing. Same content, sharper delivery, zero filler.',
  preparation_curiosity: 'Showing genuine company curiosity using What You Know → What Stood Out → Your Question. The candidate needs to sound informed, not generic.',
}

async function fetchUserContext(sessionId?: string, userId?: string) {
  let jobDescription = ''
  let resumeText = ''
  let companyWebsite = ''

  try {
    if (sessionId) {
      const { data: sessionData } = await supabaseAdmin
        .from('interview_sessions')
        .select('user_interview_data_id, user_id')
        .eq('id', sessionId)
        .single()

      if (sessionData?.user_interview_data_id) {
        const { data: interviewData } = await supabaseAdmin
          .from('user_interview_data')
          .select('job_description_text, resume_text, company_website')
          .eq('id', sessionData.user_interview_data_id)
          .single()
        if (interviewData?.job_description_text) jobDescription = interviewData.job_description_text
        if (interviewData?.resume_text) resumeText = interviewData.resume_text
        if (interviewData?.company_website) companyWebsite = interviewData.company_website
      }

      if (!resumeText && sessionData?.user_id) {
        const { data: resumeRow } = await supabaseAdmin
          .from('user_resumes')
          .select('resume_text')
          .eq('user_id', sessionData.user_id)
          .eq('is_active', true)
          .limit(1)
          .single()
        if (resumeRow?.resume_text) resumeText = resumeRow.resume_text
      }
    }

    if (!resumeText && userId) {
      const { data: resumeRow } = await supabaseAdmin
        .from('user_resumes')
        .select('resume_text')
        .eq('user_id', userId)
        .eq('is_active', true)
        .limit(1)
        .single()
      if (resumeRow?.resume_text) resumeText = resumeRow.resume_text
    }
  } catch {
    // best-effort context
  }

  return {
    jobDescription: (jobDescription || '').slice(0, 4000),
    resumeText: (resumeText || '').slice(0, 4000),
    companyWebsite,
  }
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
  const supabase = createRouteHandlerClient({ cookies })
  const { data: { session } } = await supabase.auth.getSession()
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
  }

  const body = await request.json().catch(() => ({}))
  const workshopType = body.workshopType as WorkshopType
  const stepKey = String(body.stepKey || '')
  const sessionId = body.sessionId ? String(body.sessionId) : undefined
  const originalQuestion = String(body.originalQuestion || '').slice(0, 2000)
  const originalAnswer = String(body.originalAnswer || '').slice(0, 4000)
  const previousChoices = (body.previousChoices && typeof body.previousChoices === 'object') ? body.previousChoices : {}

  if (!workshopType || !STEP_GUIDANCE[workshopType] || !STEP_GUIDANCE[workshopType][stepKey]) {
    return NextResponse.json({ error: 'Invalid workshopType or stepKey' }, { status: 400 })
  }

  const { jobDescription, resumeText, companyWebsite } = await fetchUserContext(sessionId, session.user.id)

  const stepGuidance = STEP_GUIDANCE[workshopType][stepKey]
  const workshopContext = WORKSHOP_CONTEXT[workshopType]

  const system = `You are a sharp, no-nonsense interview coach helping a candidate build one part of one answer.

Workshop: ${workshopContext}
Current step: ${stepKey}
Step task: ${stepGuidance}

Hard rules:
- Suggestions must sound natural spoken aloud. Conversational. Confident.
- Pull specific details from the resume and job description provided.
- NEVER invent companies, titles, metrics, dates, clients, or accomplishments not visible in the context.
- If the resume is sparse, give options that the candidate can lightly personalize — use bracketed placeholders like [team size] or [project name] only when truly needed.
- Each suggestion is 1-3 sentences max. Distinct in angle, not slight variations.
- Do not use corporate cliches: "leveraged", "spearheaded", "passionate about", "team player".
- Do not start suggestions with the same word as another suggestion in the set.
- Return ONLY valid JSON.`

  const userMessage = JSON.stringify({
    task: 'Generate 3 strong, distinct suggestions for this build step, grounded in the candidate\'s actual resume and the job they\'re applying for.',
    original_question: originalQuestion || '(not provided)',
    original_flagged_answer: originalAnswer || '(not provided)',
    previous_choices: previousChoices,
    candidate_resume: resumeText || '(resume not available — use generic patterns)',
    job_description: jobDescription || '(JD not available — use general best practices)',
    company_website: companyWebsite || '',
    output_shape: {
      suggestions: ['option 1 text', 'option 2 text', 'option 3 text'],
      hint: 'One sentence telling the candidate what to look for when picking, or what makes one choice stronger than another.',
    },
  })

  try {
    const message = await getAnthropic().messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 900,
      temperature: 0.4,
      system,
      messages: [{ role: 'user', content: userMessage }],
    })

    const content = message.content[0]
    if (content.type !== 'text') {
      return NextResponse.json({ suggestions: [], hint: '' })
    }

    const parsed = safeParseJson(content.text) || {}
    const suggestions = Array.isArray(parsed.suggestions)
      ? parsed.suggestions.map((s: unknown) => String(s || '').trim()).filter(Boolean).slice(0, 3)
      : []
    const hint = typeof parsed.hint === 'string' ? parsed.hint.trim() : ''

    return NextResponse.json({ suggestions, hint })
  } catch (error: any) {
    console.error('guided-workshop suggest failed:', error?.message || error)
    return NextResponse.json({ suggestions: [], hint: '', error: 'suggest_failed' }, { status: 200 })
  }
}
