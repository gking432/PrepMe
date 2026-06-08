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
          .select('job_description_text, resume_text, company_website, company_name')
          .eq('id', sessionData.user_interview_data_id)
          .single()
        if (interviewData?.job_description_text) jobDescription = interviewData.job_description_text
        if (interviewData?.resume_text) resumeText = interviewData.resume_text
        if (interviewData?.company_website) companyWebsite = interviewData.company_website
        if ((interviewData as any)?.company_name) companyName = (interviewData as any).company_name
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
  }
}

const SYSTEM_PROMPT = `You are a sharp interview coach helping a candidate build a strong "tell me about yourself" answer using Present → Past → Future.

This is NOT a resume walkthrough. It's a professional identity statement.

Structure:
- PRESENT: Who they are now. Current role, what they spend their time on. 1-2 sentences.
- PAST: The relevant background that explains their strengths. Pick 1-2 things, NOT their whole career.
- FUTURE: Why this role, why now. Connect their arc to the specific job.

You will do ALL of the following in a SINGLE response:
1. Analyze the job description to understand what the interviewer cares about
2. Analyze the resume to find the strongest relevant background
3. Choose the best narrative angle from 8 types
4. Generate the full PPF answer + shorter + conversational versions
5. Generate alternate angles, opening/closing lines, coaching notes

Narrative angle types (pick 3 distinct ones — 1 recommended, 2 alternates):
- function_based: Leads with what they DO (role/function continuity)
- industry_based: Leads with INDUSTRY knowledge and context
- skill_cluster: Leads with a GROUP OF SKILLS that transfer
- problem_solver: Leads with the TYPE OF PROBLEMS they solve
- progression: Leads with their GROWTH ARC (each role built on the last)
- transition: Leads with WHY THEY'RE CHANGING (for career changers)
- mission_fit: Leads with ALIGNMENT to company mission/values
- operator: Leads with HOW THEY WORK (process, systems, execution style)

Rules:
1. First person. Contractions. Short sentences. This will be spoken out loud.
2. NEVER invent companies, titles, metrics, dates, clients, or accomplishments.
3. Pull all facts from the resume and job description.
4. No buzzwords: "leveraged", "spearheaded", "passionate about", "team player", "navigate", "strategic alignment".
5. The shorter version should be roughly half the full answer.
6. The conversational version should sound like talking to a friend who asked what you do.
7. Opening lines and closing lines are standalone swappable alternatives.
8. "whyItWorks" explains the strategic reasoning behind the recommended angle.
9. "watchOuts" are delivery pitfalls to avoid.
10. Generate custom labels for each angle — not just the type name.

Return ONLY valid JSON matching this exact shape:
{
  "roleUnderstanding": {
    "roleTitle": "extracted or inferred role title",
    "companyName": "company name if known",
    "interviewerLikelyCaresAbout": ["thing 1", "thing 2", "thing 3"]
  },
  "resumeFitSummary": {
    "strongestRelevantBackground": ["strength 1", "strength 2"],
    "backgroundToMinimize": ["thing to downplay 1"],
    "possibleConcern": "optional concern the interviewer might have"
  },
  "recommendedAngle": {
    "type": "one of the 8 NarrativeAngleType values",
    "label": "Custom human-readable label for this angle",
    "description": "Why this angle works for this specific candidate and role"
  },
  "alternateAngles": [
    { "type": "...", "label": "...", "description": "..." },
    { "type": "...", "label": "...", "description": "..." }
  ],
  "ppfBreakdown": {
    "present": "The present portion of the answer",
    "past": "The past portion",
    "future": "The future portion"
  },
  "fullAnswer": "The complete Present → Past → Future answer stitched together",
  "shorterVersion": "A compressed version, roughly half the length",
  "conversationalVersion": "An even more casual version",
  "openingLines": ["Alt opening 1", "Alt opening 2", "Alt opening 3"],
  "closingLines": ["Alt closing 1", "Alt closing 2", "Alt closing 3"],
  "whyItWorks": "One sentence on why this angle is strategically smart for this candidate",
  "watchOuts": ["Delivery pitfall 1", "Delivery pitfall 2"],
  "followUpQuestions": ["Likely follow-up 1", "Likely follow-up 2", "Likely follow-up 3"]
}`

export async function POST(request: NextRequest) {
  const supabase = createRouteHandlerClient({ cookies })
  const { data: { session } } = await supabase.auth.getSession()
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
  }

  const body = await request.json().catch(() => ({}))

  const currentPositioning = String(body.currentPositioning || '')
  const currentPositioningOtherDetail = String(body.currentPositioningOtherDetail || '')
  const tone = String(body.tone || 'natural_confident')
  const length = String(body.length || 'sixty_seconds')
  const avoidEmphasis: string[] = Array.isArray(body.avoidEmphasis)
    ? body.avoidEmphasis.map((t: unknown) => String(t || '').trim()).filter(Boolean)
    : []
  const additionalNotes = String(body.additionalNotes || '').slice(0, 2000)
  const sessionId = body.sessionId ? String(body.sessionId) : undefined
  const alternateAngleType = body.alternateAngleType ? String(body.alternateAngleType) : undefined

  const { jobDescription, resumeText, companyWebsite, companyName } = await fetchUserContext(sessionId, session.user.id)

  const avoidBlock = avoidEmphasis.length
    ? `\nThings to AVOID in the answer:\n${avoidEmphasis.map((t) => `- ${t.replace(/_/g, ' ')}`).join('\n')}`
    : ''

  const alternateBlock = alternateAngleType
    ? `\nIMPORTANT: The candidate wants to try a "${alternateAngleType.replace(/_/g, ' ')}" narrative angle. Make THIS the recommended angle. Generate two different alternates.`
    : ''

  const positioningDetail = currentPositioning === 'other' && currentPositioningOtherDetail
    ? ` (${currentPositioningOtherDetail})`
    : ''

  const lengthGuidance: Record<string, string> = {
    thirty_seconds: '70–100 words. Quick and tight.',
    sixty_seconds: '130–180 words. Standard interview length.',
    ninety_seconds: '190–260 words. Full version.',
  }

  const userMessage = `Current positioning: ${currentPositioning.replace(/_/g, ' ')}${positioningDetail}
Preferred tone: ${tone.replace(/_/g, ' ')}
Target length: ${length.replace(/_/g, ' ')} (${lengthGuidance[length] || '130–180 words'})
${avoidBlock}
Additional notes: ${additionalNotes || '(none)'}
${alternateBlock}

CANDIDATE RESUME:
${resumeText || '(resume not available — use generic patterns with bracketed placeholders)'}

JOB DESCRIPTION:
${jobDescription || '(JD not available — generate a general-purpose professional story)'}

${companyName ? `Company: ${companyName}` : ''}
${companyWebsite ? `Company website: ${companyWebsite}` : ''}

Generate the professional story answer as JSON.`

  try {
    const message = await getAnthropic().messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 2500,
      temperature: 0.5,
      system: SYSTEM_PROMPT,
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
