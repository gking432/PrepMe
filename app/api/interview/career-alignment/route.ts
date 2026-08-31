import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'
import { Anthropic } from '@anthropic-ai/sdk/client'
import { DEFAULT_TONE, DEFAULT_LENGTH } from '@/lib/career-alignment-config'
import { enforceRateLimit, rejectOversizedRequest } from '@/lib/demo-guard'
import { answerRewriteSchema, careerAlignmentOutputSchema, parseModelOutput } from '@/lib/ai-contracts'
import { AI_MODELS } from '@/lib/ai-models'

let _anthropic: Anthropic | null = null
function getAnthropic() {
  if (!_anthropic) _anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY || '' })
  return _anthropic
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

const LENGTH_RULES: Record<string, string> = {
  thirty_seconds: '70–100 words',
  sixty_seconds: '120–170 words',
  ninety_seconds: '180–240 words',
}

export async function POST(request: NextRequest) {
  const rateLimited = enforceRateLimit(request, 'career-alignment', { limit: 20, windowMs: 60 * 60 * 1000 })
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

  const { jobDescription, resumeText, companyName, roleTitle } = await fetchUserContext(sessionId, session?.user?.id)
  if (!resumeText && !jobDescription) {
    return NextResponse.json({ error: 'Interview context not found' }, { status: 404 })
  }

  if (isRewrite) return handleRewrite(body, resumeText, jobDescription, companyName, roleTitle)
  return handleGenerate(body, resumeText, jobDescription, companyName, roleTitle)
}

async function handleGenerate(body: any, resumeText: string, jobDescription: string, companyName: string, roleTitle: string) {
  const flaggedQuestion = String(body.flaggedQuestion || '')
  const userOriginalAnswer = String(body.userOriginalAnswer || '')
  const tone = String(body.tone || DEFAULT_TONE)
  const length = String(body.length || DEFAULT_LENGTH)

  const candidateProfileSummary = body.candidateProfileSummary
    ? JSON.stringify(body.candidateProfileSummary, null, 2)
    : '(not available)'
  const jobDescriptionSummary = body.jobDescriptionSummary
    ? JSON.stringify(body.jobDescriptionSummary, null, 2)
    : '(not available)'

  const systemPrompt = `You are helping a candidate improve a flagged interview answer.

The interviewer asked:
${flaggedQuestion}

The candidate originally answered:
${userOriginalAnswer || '(original answer not available)'}

The goal is to produce a stronger career alignment answer using this framework:

Observation → Evidence of Fit → Timing

This framework should work for questions like:
- Why this role?
- Why this company?
- Why now?
- Why are you interested?
- Why are you a fit?
- What attracted you to this opportunity?

Observation:
Start by naming something specific the candidate noticed about the role, company, industry, business problem, customer problem, or timing.

Evidence of Fit:
Connect that observation to 1–2 concrete pieces of the candidate's background.

Timing:
Explain why this opportunity makes sense as the candidate's next step.

Use this context:

Candidate profile summary:
${candidateProfileSummary}

Resume:
${resumeText || '(not available)'}

Job description summary:
${jobDescriptionSummary}

Job description:
${jobDescription || '(not available)'}

Role title:
${roleTitle || '(not provided)'}

Company:
${companyName || '(not provided)'}

Tone:
${tone.replace(/_/g, ' ')}

Length:
${length.replace(/_/g, ' ')} (${LENGTH_RULES[length] || '120–170 words'} for primaryAnswer)

Important rules:

1. The primary answer must begin with an Observation, not the candidate's background.
2. The observation should be simple, specific, and believable.
3. Do not start the primary answer with:
   - "I've spent..."
   - "My background is..."
   - "I started my career..."
   - "Right now, I'm..."
4. Do not write a resume walkthrough.
5. Use no more than 2 candidate evidence points in the primary answer.
6. The Evidence of Fit section must use concrete evidence from the resume, profile summary, or original answer.
7. The Timing section must explain why this opportunity makes sense now.
8. Do not invent company facts, metrics, users, tools, outcomes, job responsibilities, or industry research.
9. If company-specific information is weak, make the observation about the role instead of the company.
10. Do not mention missing job description, missing company information, or weak evidence in the user-facing answer.
11. Avoid phrases like:
    - "perfect fit"
    - "uniquely qualified"
    - "at the intersection of"
    - "full-stack muscle"
    - "synergy"
    - "wear many hats"
    - "hit the ground running"
    - "fast-paced environment"
12. The answer should sound like a real person speaking.
13. If the candidate is transitioning, explain the transition without apologizing.
14. If the candidate has independent work, frame it as relevant evidence only if it supports the role.
15. Make the candidate sound aligned and intentional, not desperate or overly rehearsed.

Choose one inferred question intent:
- why_role
- why_company
- why_now
- why_interested
- why_fit
- mixed

Choose one observation anchor:
- role_responsibility
- company_mission_or_model
- industry_or_space
- customer_problem
- business_problem
- working_style
- growth_stage
- career_timing

The shorterAnswer should be 55–85 words.

The conversationalAnswer should be close to the selected primaryAnswer length, but sound more casual and spoken.

Return valid JSON only.

Use this exact shape:

{
  "answerType": "career_alignment",
  "inferredQuestionIntent": "why_role | why_company | why_now | why_interested | why_fit | mixed",
  "observationAnchor": "role_responsibility | company_mission_or_model | industry_or_space | customer_problem | business_problem | working_style | growth_stage | career_timing",
  "structureUsed": {
    "observation": "...",
    "evidenceOfFit": "...",
    "timing": "..."
  },
  "primaryAnswer": "...",
  "shorterAnswer": "...",
  "conversationalAnswer": "...",
  "whyThisWorks": [
    "...",
    "...",
    "..."
  ],
  "followUpPrep": [
    "...",
    "...",
    "..."
  ]
}`

  try {
    const message = await getAnthropic().messages.create({
      model: AI_MODELS.coachingGeneration,
      max_tokens: 2500,
      temperature: 0.5,
      system: systemPrompt,
      messages: [{ role: 'user', content: 'Generate the career alignment answer as JSON.' }],
    })
    const content = message.content[0]
    if (content.type !== 'text') return NextResponse.json({ error: 'generate_failed' }, { status: 200 })
    const parsed = parseModelOutput(content.text, careerAlignmentOutputSchema)
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
  const flaggedQuestion = String(body.flaggedQuestion || '')
  const userOriginalAnswer = String(body.userOriginalAnswer || '')

  const candidateProfileSummary = body.candidateProfileSummary
    ? JSON.stringify(body.candidateProfileSummary, null, 2)
    : '(not available)'
  const jobDescriptionSummary = body.jobDescriptionSummary
    ? JSON.stringify(body.jobDescriptionSummary, null, 2)
    : '(not available)'

  const systemPrompt = `Rewrite this career alignment answer based on the requested change.

The interviewer asked:
${flaggedQuestion}

Requested change:
${rewriteInstruction.replace(/_/g, ' ')}

Original answer:
${originalAnswer}

Original structured output:
${JSON.stringify(originalOutput, null, 2)}

Candidate profile summary:
${candidateProfileSummary}

Resume:
${resumeText || '(not available)'}

Job description summary:
${jobDescriptionSummary}

Job description:
${jobDescription || '(not available)'}

Role title:
${roleTitle || '(not provided)'}

Company:
${companyName || '(not provided)'}

Rules:

- Keep the Observation → Evidence of Fit → Timing structure.
- Begin with an observation, not the candidate's background.
- Keep the same basic facts.
- Do not invent new metrics, tools, company facts, job responsibilities, or outcomes.
- Do not add new experiences unless clearly supported by the resume/profile.
- Use no more than 2 candidate evidence points.
- Keep it natural and spoken.
- Do not make it a resume walkthrough.
- Avoid phrases like:
  - "perfect fit"
  - "uniquely qualified"
  - "at the intersection of"
  - "full-stack muscle"
  - "synergy"
  - "wear many hats"
  - "hit the ground running"

Return valid JSON only:

{
  "primaryAnswer": "..."
}`

  try {
    const message = await getAnthropic().messages.create({
      model: AI_MODELS.coachingGeneration,
      max_tokens: 1200,
      temperature: 0.4,
      system: systemPrompt,
      messages: [{ role: 'user', content: 'Rewrite the answer based on the requested change. Return valid JSON only.' }],
    })
    const content = message.content[0]
    if (content.type !== 'text') return NextResponse.json({ error: 'rewrite_failed' }, { status: 200 })
    const parsed = parseModelOutput(content.text, answerRewriteSchema)
    return NextResponse.json(parsed)
  } catch (error: any) {
    console.error('career-alignment rewrite failed:', error?.message || error)
    return NextResponse.json({ error: 'rewrite_failed' }, { status: 200 })
  }
}
