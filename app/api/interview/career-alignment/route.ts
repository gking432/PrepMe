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

function safeParseJson(raw: string): any {
  if (!raw) return null
  const match = raw.match(/```(?:json)?\s*(\{[\s\S]*\})\s*```/) || raw.match(/(\{[\s\S]*\})/)
  const body = match ? match[1] : raw
  try { return JSON.parse(body) } catch { return null }
}

async function fetchUserContext(sessionId?: string, userId?: string) {
  let jobDescription = '', resumeText = '', companyWebsite = '', companyName = '', roleTitle = ''
  try {
    if (sessionId) {
      const { data: sessionData } = await supabaseAdmin.from('interview_sessions').select('user_interview_data_id, user_id').eq('id', sessionId).single()
      if (sessionData?.user_interview_data_id) {
        const { data: interviewData } = await supabaseAdmin.from('user_interview_data').select('job_description_text, resume_text, company_website, company_name, role_title').eq('id', sessionData.user_interview_data_id).single()
        if (interviewData?.job_description_text) jobDescription = interviewData.job_description_text
        if (interviewData?.resume_text) resumeText = interviewData.resume_text
        if (interviewData?.company_website) companyWebsite = interviewData.company_website
        if ((interviewData as any)?.company_name) companyName = (interviewData as any).company_name
        if ((interviewData as any)?.role_title) roleTitle = (interviewData as any).role_title
      }
      if (!resumeText && sessionData?.user_id) {
        const { data: resumeRow } = await supabaseAdmin.from('user_resumes').select('resume_text').eq('user_id', sessionData.user_id).eq('is_active', true).limit(1).single()
        if (resumeRow?.resume_text) resumeText = resumeRow.resume_text
      }
    }
    if (!resumeText && userId) {
      const { data: resumeRow } = await supabaseAdmin.from('user_resumes').select('resume_text').eq('user_id', userId).eq('is_active', true).limit(1).single()
      if (resumeRow?.resume_text) resumeText = resumeRow.resume_text
    }
  } catch { /* best-effort */ }
  return { jobDescription: (jobDescription || '').slice(0, 4000), resumeText: (resumeText || '').slice(0, 4000), companyWebsite, companyName, roleTitle }
}

const GENERATE_SYSTEM_PROMPT = `You are helping a job candidate answer a career alignment interview question.

This module is for questions like:
- Why this role?
- Why this company?
- Why are you interested?
- Why now?
- Why should we hire you?
- What attracted you to this opportunity?
- Why are you a fit?

Use the Observation, Fit, Timing structure.

Observation:
Show that the candidate noticed something specific and meaningful about the role or company.

Fit:
Connect that observation to 1–2 relevant parts of the candidate's background.

Timing:
Explain why this opportunity makes sense as the candidate's next step.

Choose one primary role observation type:
- customer_closeness
- ownership
- execution
- problem_solving
- relationship_building
- technical_depth
- cross_functional_work
- process_improvement
- growth_or_sales
- service_or_care
- mission_alignment
- learning_opportunity
- leadership
- pace_or_ambiguity
- industry_specific_work

Important rules:

- Do not write a resume walkthrough.
- Do not list every job.
- Use no more than 2 resume experiences in the answer.
- Do not invent metrics, tools, users, company facts, or outcomes.
- Do not overstuff the answer with job description keywords.
- Avoid phrases like:
  - "perfect fit"
  - "uniquely qualified"
  - "full-stack muscle"
  - "synergy"
  - "at the intersection of"
  - "wear many hats"
  - "hit the ground running"
  - "fast-paced environment"
- Do not flatter the company generically.
- Do not say the company is innovative, mission-driven, industry-leading, or exciting unless the job description or provided context specifically supports it.
- The answer should sound like a real person speaking.
- The observation should be simple and believable.
- The fit should be specific but not overloaded.
- The timing should explain why this role makes sense now.
- If company-specific information is weak or missing, focus on the role instead of inventing company details.
- If the resume match is not direct, use transferable skills honestly.
- If the candidate is transitioning, explain the transition without apologizing.
- If the candidate is early-career, use education, internships, projects, service work, or relevant traits honestly.
- If the candidate has independent work, frame it clearly and only if relevant.
- Make the candidate sound interested, not desperate.
- Make the candidate sound aligned, not rehearsed.

If there is not enough company-specific evidence, omit companyObservation entirely rather than inventing it.

Return valid JSON only.

Use this exact shape:

{
  "questionType": "...",
  "roleObservation": {
    "observationType": "one of the 15 types",
    "observation": "...",
    "evidenceFromJobDescription": "..."
  },
  "companyObservation": {
    "observation": "...",
    "evidenceFromCompanyOrJobDescription": "..."
  },
  "candidateFit": {
    "fitSummary": "...",
    "evidenceFromResume": ["...", "..."]
  },
  "timing": {
    "timingSummary": "...",
    "whyNow": "..."
  },
  "primaryAnswer": "...",
  "shorterAnswer": "...",
  "moreConversationalAnswer": "...",
  "openingLineOptions": ["...", "...", "..."],
  "closingLineOptions": ["...", "...", "..."],
  "whyThisWorks": ["...", "...", "..."],
  "possibleWeakSpots": ["...", "..."]
}`

const REWRITE_SYSTEM_PROMPT = `Rewrite this career alignment answer based on the requested change.

Rules:

- Keep the Observation, Fit, Timing structure.
- Keep the same basic facts.
- Do not invent new metrics, tools, job titles, company facts, or outcomes.
- Do not add new experiences unless they are clearly supported by the resume.
- Do not make the answer a resume walkthrough.
- Use no more than 2 resume experiences.
- Keep it natural and spoken.
- Do not overstuff it with keywords.
- Do not flatter the company generically.
- Avoid phrases like:
  - "perfect fit"
  - "uniquely qualified"
  - "full-stack muscle"
  - "synergy"
  - "at the intersection of"
  - "wear many hats"
  - "hit the ground running"

Return valid JSON only:

{
  "primaryAnswer": "..."
}`

export async function POST(request: NextRequest) {
  const supabase = createRouteHandlerClient({ cookies })
  const { data: { session } } = await supabase.auth.getSession()
  if (!session?.user?.id) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })

  const body = await request.json().catch(() => ({}))
  const isRewrite = body.rewriteInstruction && body.originalAnswer
  const sessionId = body.sessionId ? String(body.sessionId) : undefined
  const { jobDescription, resumeText, companyWebsite, companyName, roleTitle } = await fetchUserContext(sessionId, session.user.id)

  if (isRewrite) return handleRewrite(body, resumeText, jobDescription, companyName, roleTitle)
  return handleGenerate(body, resumeText, jobDescription, companyName, roleTitle)
}

async function handleGenerate(body: any, resumeText: string, jobDescription: string, companyName: string, roleTitle: string) {
  const questionType = String(body.questionType || 'why_this_role')
  const tone = String(body.tone || 'natural_confident')
  const length = String(body.length || 'sixty_seconds')
  const avoidances: string[] = Array.isArray(body.avoidances) ? body.avoidances.map((a: unknown) => String(a || '').trim()).filter(Boolean) : []
  const lengthRules: Record<string, string> = { thirty_seconds: '70–100 words', sixty_seconds: '120–170 words', ninety_seconds: '180–240 words' }

  const userMessage = `The question type is:
${questionType.replace(/_/g, ' ')}

Resume:
${resumeText || '(resume not available)'}

Job description:
${jobDescription || '(JD not available)'}

Known role title:
${roleTitle || '(not provided)'}

Known company name:
${companyName || '(not provided)'}

Tone:
${tone.replace(/_/g, ' ')}

Length:
${length.replace(/_/g, ' ')} (${lengthRules[length] || '120–170 words'} for primaryAnswer)

Avoid:
${avoidances.length ? avoidances.map((a) => a.replace(/_/g, ' ')).join(', ') : '(none)'}

Tasks:

1. Identify one specific, believable observation about the role.
2. If there is enough company-specific information, identify one company observation. If not, omit companyObservation.
3. Identify 1–2 relevant parts of the candidate's background that fit the observation.
4. Explain why the timing makes sense now.
5. Generate a primary answer using Observation, Fit, Timing.
6. Generate a shorter version (55–85 words).
7. Generate a more conversational version (close to primaryAnswer length but more casual and spoken).
8. Generate opening line options (3).
9. Generate closing line options (3).
10. Explain why the answer works (3 bullets).
11. Identify possible weak spots or follow-up areas (2–3 bullets).

Generate the career alignment answer as JSON.`

  try {
    const message = await getAnthropic().messages.create({ model: 'claude-haiku-4-5-20251001', max_tokens: 2500, temperature: 0.5, system: GENERATE_SYSTEM_PROMPT, messages: [{ role: 'user', content: userMessage }] })
    const content = message.content[0]
    if (content.type !== 'text') return NextResponse.json({ error: 'generate_failed' }, { status: 200 })
    const parsed = safeParseJson(content.text)
    if (!parsed) { console.error('career-alignment: failed to parse JSON from model response'); return NextResponse.json({ error: 'generate_failed' }, { status: 200 }) }
    return NextResponse.json(parsed)
  } catch (error: any) {
    console.error('career-alignment generation failed:', error?.message || error)
    return NextResponse.json({ error: 'generate_failed' }, { status: 200 })
  }
}

async function handleRewrite(body: any, resumeText: string, jobDescription: string, companyName: string, roleTitle: string) {
  const rewriteInstruction = String(body.rewriteInstruction || '')
  const originalAnswer = String(body.originalAnswer || '')
  const originalOutput = body.originalOutput || {}
  const questionType = String(body.questionType || '')

  const userMessage = `Question type:
${questionType.replace(/_/g, ' ')}

Requested change:
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
    const message = await getAnthropic().messages.create({ model: 'claude-haiku-4-5-20251001', max_tokens: 1200, temperature: 0.4, system: REWRITE_SYSTEM_PROMPT, messages: [{ role: 'user', content: userMessage }] })
    const content = message.content[0]
    if (content.type !== 'text') return NextResponse.json({ error: 'rewrite_failed' }, { status: 200 })
    const parsed = safeParseJson(content.text)
    if (!parsed?.primaryAnswer) return NextResponse.json({ error: 'rewrite_failed' }, { status: 200 })
    return NextResponse.json(parsed)
  } catch (error: any) {
    console.error('career-alignment rewrite failed:', error?.message || error)
    return NextResponse.json({ error: 'rewrite_failed' }, { status: 200 })
  }
}
