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
  | 'role_depth'
  | 'problem_solving'

const STEP_GUIDANCE: Record<WorkshopType, Record<string, string>> = {
  star_proof: {
    situation: 'Pull 2-3 brief setting lines from the candidate resume that could plausibly anchor this answer. Prefer the MOST RECENT role (latest end date or "present"). Do not mix experiences across multiple jobs in a single suggestion. Each one names a real project/role/team in 1 sentence so they can pick the right scene. Must sound spoken aloud.',
    task: 'Given the picked situation, suggest 2-3 different ways to frame what was specifically at stake or what the candidate owned. Each must be a complete spoken sentence that flows after the situation — include a natural transition like "I was the one who...", "My piece of it was...", "I was responsible for...". One sentence each.',
    action: 'Given the situation and task, draft 2-3 action sentences describing concrete steps. Each must start with a natural spoken transition like "So I...", "What I did was...", "I ended up...". Sound like real ownership, not generic verbs.',
    result: 'Given everything chosen so far, draft 2-3 short result lines. Each must be a complete sentence with a natural closer feel — "We ended up...", "That got us...", "By the end of it,...". Prefer concrete outcomes from the resume. Never invent numbers.',
  },
  professional_story: {
    present: 'Use ONLY the candidate\'s MOST RECENT role — the one with the latest end date, or labeled "present"/"current". Do NOT pull from older roles for this step. Draft 2-3 short PRESENT lines (1-2 sentences each) naming the current role and a single defining skill or focus. Must sound like someone talking: "Right now I\'m...", "So these days I...", "I\'m currently...".',
    past: 'Use earlier roles, schooling, or skill arcs — NOT the current role (that was the previous step). Draft 2-3 PAST lines that explain the foundation. Each must include its own natural spoken transition like "Before that,", "I got into this through...", "That came from...", "Earlier on, I...". Keep it conversational — short sentences, contractions.',
    future: 'Given present + past + the job description, draft 2-3 FUTURE lines on why THIS specific role is the natural next step. Each names something concrete from the JD that matches the candidate\'s arc. Start with a natural spoken bridge like "So that\'s why...", "That\'s what got me interested in...", "And now I want to...".',
  },
  career_alignment: {
    observation: 'Pull 2-3 specific OBSERVATIONS about the role/team/company from the JD. Each one names a real responsibility, scope, or focus mentioned in the JD — not vague platitudes. Start each naturally, like you\'re talking to the interviewer.',
    fit: 'Given the chosen observation, draft 2-3 FIT statements pulling concrete experience from the resume that matches. Each must be a COMPLETE sentence that flows naturally after the observation — include its own transition (e.g. "That\'s actually what I did at...", "I\'ve been doing exactly that at..."). Do NOT repeat content from the observation — add new information about the candidate\'s experience.',
    timing: 'Given observation + fit, draft 2-3 TIMING statements on why now makes sense. Each must start with a natural spoken transition and explain why THIS role at THIS point in their career. Keep it personal and forward-looking.',
  },
  handling_uncertainty: {
    recovery: 'Draft 2-3 short RECOVERY openers — calm, steady, 1 sentence each. Must sound like a real person talking: "Honestly, let me think about that for a second", "Good question — give me a beat". No filler, no apologizing.',
    answer: 'Given the original question, draft 2-3 short ANSWER statements — direct positions or judgments. One sentence each, conversational. Pull from resume context where reasonable.',
    reason: 'Given the chosen answer, draft 2-3 short REASON lines — one sentence each. Each must be a complete spoken sentence that flows naturally after the answer. Use natural transitions like "I\'ve just seen that...", "In my experience,...", "What I\'ve learned is...".',
    example: 'Given answer + reason, pull 2-3 brief EXAMPLES from the resume. Each must start with a natural spoken bridge like "Like when...", "Actually, at [company],...", "A good example is...". One sentence.',
  },
  pace_delivery: {
    opener: 'Take the candidates original answer and draft 2-3 alternative OPENERS — each leads with the main point in 1 confident sentence. No warmup words. Must sound like a person talking, not writing.',
    main_point: 'Given the chosen opener, draft 2-3 MAIN BODY versions — 2-3 SHORT sentences each — restating the candidates same content with cleaner structure and zero filler. Conversational, with contractions. Do not invent facts.',
    landing: 'Draft 2-3 short LANDINGS — 1 sentence each — that close the answer cleanly. Must sound like a natural spoken ending: "That\'s the kind of...", "And that\'s why...", "So yeah, that\'s what I want to keep doing."',
  },
  preparation_curiosity: {
    what_you_know: 'Pull 2-3 short WHAT YOU KNOW statements — 1 sentence each — citing real specifics from the JD/company website. Must sound spoken: "I saw that...", "I noticed...", "One thing that stood out was...".',
    what_stood_out: 'Given what they know, draft 2-3 WHAT STOOD OUT statements — 1 sentence each. Each must flow naturally after the previous piece with its own transition: "What caught my attention was...", "The reason that stuck with me is...", "That hit home because...". Connect to the candidate\'s resume.',
    your_question: 'Given the above, draft 2-3 sharp QUESTIONS. Each must include a natural spoken bridge like "So I\'m curious —", "That makes me want to ask —", "I\'d love to know —". Reference the specific company/role context.',
  },
  role_depth: {
    context: 'Pull 2-3 real CONTEXT lines from the resume — each one names a specific project or situation. One sentence each, spoken aloud. Must sound conversational.',
    method: 'Given the chosen context, draft 2-3 METHOD statements. Each must be a complete sentence with a natural transition like "So I went with...", "My approach was...", "What I did was...". Name specific tools, frameworks, or thinking. One sentence each.',
    tradeoff: 'Given context and method, draft 2-3 TRADEOFF statements. Each must flow naturally: "The main tradeoff was...", "I had to weigh...", "The hard part was choosing between...". Ground in the specific role.',
    outcome: 'Given everything above, draft 2-3 OUTCOME statements. Each must start with a natural closer like "And it worked —", "That got us...", "By the end,...". Concrete results from the resume.',
  },
  problem_solving: {
    clarify: 'Draft 2-3 CLARIFY lines — each one names a real question or assumption the candidate checked first. Must sound spoken: "First thing I needed to figure out was...", "I started by asking...", "Before doing anything, I wanted to understand...". One sentence each.',
    approach: 'Given the clarifications, draft 2-3 APPROACH statements. Each must include a natural transition: "From there I...", "So I looked at a few options —", "My thinking was...". Describe the plan and reasoning. Keep it conversational.',
    execute: 'Given the approach, draft 2-3 EXECUTE statements. Each must start with a natural bridge: "So I...", "What I actually did was...", "I ended up...". Concrete steps, who was involved. Pull from resume.',
    reflect: 'Given everything above, draft 2-3 REFLECT statements. Must sound like genuine personal reflection: "Looking back,...", "If I did it again,...", "The biggest lesson was...". Honest, not scripted.',
  },
}

const WORKSHOP_CONTEXT: Record<WorkshopType, string> = {
  star_proof: 'Behavioral STAR answer (Situation → Task → Action → Result). The candidate needs a believable, specific example with clear ownership and a real outcome.',
  professional_story: '"Tell me about yourself" using Present → Past → Future. The candidate needs a clear professional arc, not a list of facts.',
  career_alignment: '"Why this role" using Observation → Fit → Timing. The candidate needs to show they researched the role and that their background matches.',
  handling_uncertainty: 'Recovering from an unexpected question using Recovery → Answer → Reason → Example. The candidate needs to avoid rambling.',
  pace_delivery: 'Rebuilding their existing answer with cleaner pacing — Opener → Main Point → Landing. Same content, sharper delivery, zero filler.',
  preparation_curiosity: 'Showing genuine company curiosity using What You Know → What Stood Out → Your Question. The candidate needs to sound informed, not generic.',
  role_depth: 'Demonstrating domain depth using Context → Method → Tradeoff → Outcome. The candidate needs to show they can think inside the role — naming real tools, weighing real tradeoffs, and talking like someone who does the work, not someone who read about it.',
  problem_solving: 'Walking through problem-solving using Clarify → Approach → Execute → Reflect. The candidate needs to show their reasoning process, not just the answer — clarifying assumptions, choosing deliberately, and reflecting honestly.',
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
  const tags = Array.isArray(body.tags)
    ? body.tags.map((t: unknown) => String(t || '').trim()).filter(Boolean).slice(0, 8)
    : []

  if (!workshopType || !STEP_GUIDANCE[workshopType] || !STEP_GUIDANCE[workshopType][stepKey]) {
    return NextResponse.json({ error: 'Invalid workshopType or stepKey' }, { status: 400 })
  }

  const { jobDescription, resumeText, companyWebsite } = await fetchUserContext(sessionId, session.user.id)

  const stepGuidance = STEP_GUIDANCE[workshopType][stepKey]
  const workshopContext = WORKSHOP_CONTEXT[workshopType]
  const tagHint = tags.length
    ? `The candidate self-described their voice/approach for this answer as: ${tags.join(', ')}. Let those subtly color tone and word choice — but never override what's actually in the resume.`
    : ''

  const system = `You are a sharp, no-nonsense interview coach helping a candidate build one part of one answer.

Workshop: ${workshopContext}
Current step: ${stepKey}
Step task: ${stepGuidance}
${tagHint}

Hard rules:
- SPOKEN LANGUAGE ONLY. The candidate will say this out loud in an interview. Write the way a confident, prepared person actually talks — short sentences, contractions, natural pauses. If it sounds like a cover letter or an essay, rewrite it.
- Use contractions ("I'm", "that's", "didn't", "I've") — nobody says "I have been" or "that is" in conversation.
- Keep sentences SHORT. Max 15-20 words per sentence. Break long compound sentences into two.
- Each suggestion must be a COMPLETE, standalone piece — it gets combined with other parts into a full answer, so include a natural transition or opener that makes it flow from the previous piece. Don't start with a bare noun or dangling clause.
- Pull specific details from the resume and job description provided.
- NEVER invent companies, titles, metrics, dates, clients, or accomplishments not visible in the context.
- If the resume is sparse, give options that the candidate can lightly personalize — use bracketed placeholders like [team size] or [project name] only when truly needed.
- Each suggestion is 1-3 sentences max. Distinct in angle, not slight variations.
- Do not use corporate cliches: "leveraged", "spearheaded", "passionate about", "team player", "navigate", "strategic alignment".
- Do not start suggestions with the same word as another suggestion in the set.
- Return ONLY valid JSON.`

  const userMessage = JSON.stringify({
    task: 'Generate 3 strong, distinct suggestions for this build step, grounded in the candidate\'s actual resume and the job they\'re applying for.',
    original_question: originalQuestion || '(not provided)',
    original_flagged_answer: originalAnswer || '(not provided)',
    previous_choices: previousChoices,
    candidate_voice_tags: tags,
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
