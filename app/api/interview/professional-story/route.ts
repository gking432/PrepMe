import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'
import { Anthropic } from '@anthropic-ai/sdk/client'
import { enforceRateLimit, rejectOversizedRequest } from '@/lib/demo-guard'

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

async function fetchUserContext(sessionId?: string, userId?: string) {
  let jobDescription = ''
  let resumeText = ''
  let companyWebsite = ''
  let companyName = ''
  let roleTitle = ''

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
          .select('job_description_text, resume_text, company_website, company_name, role_title')
          .eq('id', sessionData.user_interview_data_id)
          .single()
        if (interviewData?.job_description_text) jobDescription = interviewData.job_description_text
        if (interviewData?.resume_text) resumeText = interviewData.resume_text
        if (interviewData?.company_website) companyWebsite = interviewData.company_website
        if ((interviewData as any)?.company_name) companyName = (interviewData as any).company_name
        if ((interviewData as any)?.role_title) roleTitle = (interviewData as any).role_title
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
    companyName,
    roleTitle,
  }
}

const GENERATE_SYSTEM_PROMPT = `You are helping a job candidate answer the first interview question:

"Tell me about yourself."

This should sound like a natural first answer in a live interview.

Use the Present / Past / Future structure:

1. Present: the candidate's professional lane now and the relevant work or strength they focus on.
2. Past: one or two selected experiences that explain how they built that lane.
3. Future: why this specific role and company are a logical next step now.

The candidate does not need to say the words "present," "past," or "future." The structure should feel like a natural spoken answer, not a formula.

Important rules:

- This is the first answer in the interview.
- Establish a clear professional through-line in the opening sentence.
- Do not start with side projects, independent work, or current unemployment unless the user specifically chose that as their identity.
- Do not write a chronological resume walkthrough.
- Do not list every job.
- Mention no more than 1–2 past experiences.
- Make the final connection specific to the target role rather than a generic desire to grow.
- Do not invent metrics, users, revenue, company names, tools, certifications, job titles, or outcomes.
- Do not exaggerate the candidate's experience.
- Do not sound like a cover letter.
- Do not sound like a LinkedIn summary.
- Do not overstuff the answer with job description keywords.
- Keep it natural and spoken.
- If the candidate has independent work, frame it as recent focus or skill development, not as the entire identity unless appropriate.
- If the candidate is transitioning, explain the transition simply without apologizing.
- If the candidate is early-career, emphasize education, internships, projects, service work, work ethic, and relevant exposure honestly.
- If the candidate has a nonlinear background, create a through-line instead of explaining every turn.
- Make the candidate sound focused, credible, and self-aware.
- Avoid vague phrases like:
  - "at the intersection of"
  - "wear many hats"
  - "hit the ground running"
  - "full-stack"
  - "synergy"
  - "uniquely qualified"
  - "perfect fit"

Return valid JSON only.

Use this exact shape:

{
  "answerType": "professional_introduction",
  "structureUsed": {
    "present": "...",
    "past": "...",
    "future": "..."
  },
  "primaryAnswer": "...",
  "casualAnswer": "...",
  "shortAnswer": "...",
  "openingLineOptions": ["...", "...", "..."],
  "closingLineOptions": ["...", "...", "..."],
  "whyThisWorks": ["...", "...", "..."],
  "possibleWeakSpots": ["...", "..."],
  "likelyFollowUpQuestions": ["...", "...", "..."]
}`

const REWRITE_SYSTEM_PROMPT = `Rewrite this "Tell me about yourself" answer based on the requested change.

Rules:

- Keep the Present, Past, Future structure.
- Keep the same basic facts.
- Do not invent new metrics, tools, job titles, certifications, company facts, or outcomes.
- Do not add new experiences unless they are clearly supported by the resume/profile.
- Do not make it a chronological resume walkthrough.
- Mention no more than 1–2 past experiences.
- Keep it natural and spoken.
- Do not overstuff it with keywords.
- Do not sound like a cover letter.
- Do not start with side projects unless specifically asked.
- Avoid vague phrases like:
  - "at the intersection of"
  - "wear many hats"
  - "hit the ground running"
  - "full-stack"
  - "synergy"
  - "uniquely qualified"
  - "perfect fit"

Return valid JSON only:

{
  "primaryAnswer": "..."
}`

export async function POST(request: NextRequest) {
  const rateLimited = enforceRateLimit(request, 'professional-story', { limit: 20, windowMs: 60 * 60 * 1000 })
  if (rateLimited) return rateLimited
  const oversized = rejectOversizedRequest(request, 96 * 1024)
  if (oversized) return oversized

  const body = await request.json().catch(() => ({}))
  const isRewrite = body.rewriteInstruction && body.originalAnswer
  const sessionId = body.sessionId ? String(body.sessionId) : undefined

  if (body.demoMode) {
    const resumeText = String(body.demoContext?.resumeText || '').slice(0, 4000)
    const jobDescription = String(body.demoContext?.jobDescriptionText || '').slice(0, 4000)
    const companyName = String(body.demoContext?.companyName || '')
    const roleTitle = String(body.demoContext?.roleTitle || '')
    if (!resumeText && !jobDescription) {
      return NextResponse.json({ error: 'Interview context not found' }, { status: 404 })
    }
    return isRewrite
      ? handleRewrite(body, resumeText, jobDescription, companyName, roleTitle)
      : handleGenerate(body, resumeText, jobDescription, companyName, roleTitle)
  }

  const supabase = createRouteHandlerClient({ cookies })
  const { data: { session } } = await supabase.auth.getSession()

  if (!sessionId && !session?.user?.id) {
    return NextResponse.json({ error: 'Interview session required' }, { status: 400 })
  }

  const { jobDescription, resumeText, companyWebsite, companyName, roleTitle } =
    await fetchUserContext(sessionId, session?.user?.id)

  if (!resumeText && !jobDescription) {
    return NextResponse.json({ error: 'Interview context not found' }, { status: 404 })
  }

  if (isRewrite) {
    return handleRewrite(body, resumeText, jobDescription, companyName, roleTitle)
  }

  return handleGenerate(body, resumeText, jobDescription, companyName, roleTitle)
}

async function handleGenerate(
  body: any,
  resumeText: string,
  jobDescription: string,
  companyName: string,
  roleTitle: string,
) {
  const currentSituation = String(body.currentSituation || '')
  const currentSituationDetail = String(body.currentSituationDetail || '')
  const professionalIdentityStyle = String(body.professionalIdentityStyle || '')
  const customProfessionalIdentity = String(body.customProfessionalIdentity || '')
  const emphasis: string[] = Array.isArray(body.emphasis)
    ? body.emphasis.map((e: unknown) => String(e || '').trim()).filter(Boolean)
    : []
  const tone = String(body.tone || 'natural_confident')
  const length = String(body.length || 'sixty_seconds')
  const avoidances: string[] = Array.isArray(body.avoidances)
    ? body.avoidances.map((a: unknown) => String(a || '').trim()).filter(Boolean)
    : []

  const lengthRules: Record<string, string> = {
    forty_five_seconds: '90–120 words',
    sixty_seconds: '130–180 words',
    ninety_seconds: '190–260 words',
  }

  const userMessage = `Resume:
${resumeText || '(resume not available)'}

Job description:
${jobDescription || '(JD not available)'}

Known role title:
${roleTitle || '(not provided)'}

Known company name:
${companyName || '(not provided)'}

Current situation:
${currentSituation.replace(/_/g, ' ')}

Current situation detail:
${currentSituationDetail || '(none)'}

Professional identity style:
${professionalIdentityStyle.replace(/_/g, ' ')}

Custom professional identity:
${customProfessionalIdentity || '(none)'}

Emphasis:
${emphasis.length ? emphasis.map((e) => e.replace(/_/g, ' ')).join(', ') : '(none — infer from resume and JD)'}

Tone:
${tone.replace(/_/g, ' ')}

Length:
${length.replace(/_/g, ' ')} (${lengthRules[length] || '130–180 words'} for primaryAnswer)

Avoid:
${avoidances.length ? avoidances.map((a) => a.replace(/_/g, ' ')).join(', ') : '(none)'}

Tasks:

1. Define a truthful present professional lane using the candidate's strongest relevant work or skill.
2. Choose 1–2 past experiences that best explain how the candidate built that lane; do not summarize the whole resume.
3. Connect that through-line to the specific target role and company, explaining why the move makes sense now.
4. Generate a primary answer.
5. Generate a more casual version.
6. Generate a short version (60–90 words).
7. Generate opening line options (3).
8. Generate closing line options (3).
9. Explain why the answer works (3 bullets).
10. Identify possible weak spots (2–3 bullets).
11. Generate likely follow-up questions (3–5).

The casualAnswer should be similar in length to the primaryAnswer but more conversational.
The shortAnswer should be 60–90 words.

Generate the professional introduction answer as JSON.`

  try {
    const message = await getAnthropic().messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 2500,
      temperature: 0.5,
      system: GENERATE_SYSTEM_PROMPT,
      messages: [{ role: 'user', content: userMessage }],
    })

    const content = message.content[0]
    if (content.type !== 'text') {
      return NextResponse.json({ error: 'generate_failed' }, { status: 200 })
    }

    const parsed = safeParseJson(content.text)
    if (!parsed) {
      console.error('professional-story: failed to parse JSON from model response')
      return NextResponse.json({ error: 'generate_failed' }, { status: 200 })
    }

    return NextResponse.json(parsed)
  } catch (error: any) {
    console.error('professional-story generation failed:', error?.message || error)
    return NextResponse.json({ error: 'generate_failed' }, { status: 200 })
  }
}

async function handleRewrite(
  body: any,
  resumeText: string,
  jobDescription: string,
  companyName: string,
  roleTitle: string,
) {
  const rewriteInstruction = String(body.rewriteInstruction || '')
  const originalAnswer = String(body.originalAnswer || '')
  const originalOutput = body.originalOutput || {}

  const userMessage = `Requested change:
${rewriteInstruction.replace(/_/g, ' ')}

Original answer:
${originalAnswer}

Original structured output:
${JSON.stringify(originalOutput, null, 2)}

Resume:
${resumeText || '(not available)'}

Job description:
${jobDescription || '(not available)'}

Role title:
${roleTitle || '(not provided)'}

Company:
${companyName || '(not provided)'}

Rewrite the answer based on the requested change. Return valid JSON only.`

  try {
    const message = await getAnthropic().messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 1200,
      temperature: 0.4,
      system: REWRITE_SYSTEM_PROMPT,
      messages: [{ role: 'user', content: userMessage }],
    })

    const content = message.content[0]
    if (content.type !== 'text') {
      return NextResponse.json({ error: 'rewrite_failed' }, { status: 200 })
    }

    const parsed = safeParseJson(content.text)
    if (!parsed?.primaryAnswer) {
      return NextResponse.json({ error: 'rewrite_failed' }, { status: 200 })
    }

    return NextResponse.json(parsed)
  } catch (error: any) {
    console.error('professional-story rewrite failed:', error?.message || error)
    return NextResponse.json({ error: 'rewrite_failed' }, { status: 200 })
  }
}
