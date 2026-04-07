// API route to create a Realtime API session
import { NextRequest, NextResponse } from 'next/server'
import { supabase, supabaseAdmin } from '@/lib/supabase'
import { buildSystemPrompt as buildHrScreenPrompt } from '@/lib/interview-prompts/hr_screen'
import OpenAI from 'openai'

let _openai: OpenAI | null = null
function getOpenAI() {
  if (!_openai) _openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })
  return _openai
}

export async function POST(request: NextRequest) {
  try {
    const { stage, sessionId } = await request.json()

    // Get interview prompt
    const { data: promptData } = await supabaseAdmin
      .from('interview_prompts')
      .select('*')
      .eq('stage', stage)
      .single()

    // Get user interview data for context
    // First try to get from session, but also get the latest interview data as fallback
    // Use supabaseAdmin to bypass RLS since we're filtering by user_id
    let interviewData = null
    if (sessionId) {
      const { data: sessionData } = await supabaseAdmin
        .from('interview_sessions')
        .select('user_interview_data_id, user_id')
        .eq('id', sessionId)
        .single()

      // Try to get interview data from session link first
      if (sessionData?.user_interview_data_id) {
        const { data: interviewDataResult, error: dataError } = await supabaseAdmin
          .from('user_interview_data')
          .select('*')
          .eq('id', sessionData.user_interview_data_id)
          .single()
        
        if (!dataError && interviewDataResult) {
          interviewData = interviewDataResult
          console.log('Got interview data from session link')
        }
      }
      
      // If no data from session link, get the latest interview data for this user
      if (!interviewData && sessionData?.user_id) {
        const { data: latestInterviewData, error: latestError } = await supabaseAdmin
          .from('user_interview_data')
          .select('*')
          .eq('user_id', sessionData.user_id)
          .order('created_at', { ascending: false })
          .maybeSingle()
        
        if (latestError) {
          console.error('Error fetching latest interview data:', latestError)
          console.error('Full error details:', JSON.stringify(latestError, null, 2))
        } else if (latestInterviewData) {
          interviewData = latestInterviewData
          console.log('Got latest interview data for user')
          
          // Update the session to link to this data
          await supabaseAdmin
            .from('interview_sessions')
            .update({ user_interview_data_id: latestInterviewData.id })
            .eq('id', sessionId)
        } else {
          console.log('No interview data found for user:', sessionData.user_id)
        }
      }
      
      console.log('Interview data retrieved:', {
        hasData: !!interviewData,
        hasResume: !!interviewData?.resume_text && interviewData.resume_text.trim().length > 0,
        hasJobDescription: !!interviewData?.job_description_text && interviewData.job_description_text.trim().length > 0,
        companyWebsite: interviewData?.company_website,
        resumeTextLength: interviewData?.resume_text?.length || 0,
        jobDescriptionLength: interviewData?.job_description_text?.length || 0,
        resumeTextPreview: interviewData?.resume_text?.substring(0, 100) || 'N/A',
      })
    }

    // Fetch company website content for persona context (do this BEFORE the IIFE)
    let websiteContent = null
    if (interviewData?.company_website) {
      try {
        const websiteResponse = await fetch(`${request.nextUrl.origin}/api/scrape-website`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ url: interviewData.company_website }),
        })
        
        if (websiteResponse.ok) {
          const websiteData = await websiteResponse.json()
          if (websiteData.success && websiteData.content) {
            websiteContent = websiteData.content
            console.log('Fetched website content for realtime, length:', websiteContent.length)
          }
        }
      } catch (error) {
        console.error('Error fetching website content:', error)
        // Continue without website content
      }
    }

    const hasResume = !!interviewData?.resume_text && interviewData.resume_text.trim().length > 0
    const hasJobDescription = !!interviewData?.job_description_text && interviewData.job_description_text.trim().length > 0

    let companyName = 'the company'
    if (interviewData?.company_website) {
      try {
        const url = interviewData.company_website.startsWith('http')
          ? new URL(interviewData.company_website)
          : new URL(`https://${interviewData.company_website}`)
        companyName = url.hostname.replace('www.', '').split('.')[0]
      } catch {
        companyName = interviewData.company_website.replace(/^https?:\/\//, '').replace('www.', '').split('.')[0] || 'the company'
      }
    }

    const sharedDataSection = `=== CANDIDATE INFORMATION - READ THIS FIRST ===

CANDIDATE'S RESUME:
${interviewData?.resume_text || 'Not provided'}

JOB DESCRIPTION:
${interviewData?.job_description_text || 'Not provided'}

${websiteContent ? `COMPANY WEBSITE CONTENT:
${websiteContent}
` : `COMPANY WEBSITE: ${interviewData?.company_website || 'Not provided'}
`}

=== END CANDIDATE INFORMATION ===

`

    // Build enhanced system prompt with tone and depth level
    const basePrompt = promptData?.system_prompt || 'You are conducting a job interview.'
    
    // Tone guidance
    const toneGuidance = {
      professional: 'Maintain a formal, business-like tone. Be respectful and courteous.',
      friendly: 'Use a warm, approachable, and conversational tone. Be encouraging and supportive.',
      challenging: 'Be direct and probing. Ask tough questions and push for detailed answers. Challenge assumptions when appropriate.'
    }
    
    // Depth level guidance
    const depthGuidance = {
      basic: 'Ask surface-level questions about experience and background. Keep questions straightforward and easy to answer.',
      medium: 'Ask follow-up questions to understand the candidate\'s thought process. Probe into their experience and decision-making.',
      deep: 'Ask challenging, in-depth questions that require critical thinking. Explore edge cases, trade-offs, and deeper technical or behavioral insights.'
    }
    
    const tone = promptData?.tone || 'professional'
    const depthLevel = promptData?.depth_level || 'medium'
    
    // HR Screen specific instructions
    let stageSpecificInstructions = ''
    if (stage === 'hr_screen') {
      stageSpecificInstructions = `
CRITICAL HR SCREEN INSTRUCTIONS:
- This is a 5-10 minute phone screen ONLY. You are a gatekeeper, not an evaluator.
- You're on your 10th call of the day. Pleasant but efficient. Mildly skeptical by default — not hostile, just doing your job.
- Your goals: 1) Verify the candidate roughly matches their resume, 2) Check motivation and interest, 3) Confirm logistics (salary, availability).
- After 4-6 exchanges, naturally conclude the call.
- Keep responses very brief (15-35 words max). Use filler like "Mm-hm." / "Okay." / "Got it." — never "Wow!" or "That's amazing!"
- Do NOT ask deep technical or domain-specific questions. Keep everything surface-level.
- Core questions: background walk-through, what they know about the company, why this role, brief experience verification, why leaving, salary, availability.
- Maximum ONE follow-up per topic, surface-level only.

TONE & EMOTIONAL STATE:
- Default: professionally neutral. Not warm, not cold.
- After vague answers: no validation, neutral pivot.
- After off-putting answers: cooler tone, shorter responses, move faster. This persists.
- After hostile/abusive language: end the interview immediately and professionally.
- You do NOT gush, praise, or validate. You acknowledge and move on.

- End with: "Alright, I'll pass my notes along and someone will be in touch about next steps. Thanks for your time."
- Do NOT continue asking questions after you have the information you need.`
    }

    let optimizedSystemPrompt = `${basePrompt}

You are conducting a ${stage.replace('_', ' ')} interview.

Tone: ${toneGuidance[tone as keyof typeof toneGuidance] || toneGuidance.professional}
Depth Level: ${depthGuidance[depthLevel as keyof typeof depthGuidance] || depthGuidance.medium}

OPENING: You always speak first. Begin the call immediately with a natural phone-screen greeting. Example: "Hi, this is [your name] calling from [company] — thanks for taking the time to chat today. I wanted to ask you a few questions about your background, and then leave some time for any questions you might have for me. To start, can you give me a quick overview of your background?" Adapt the intro to match the company name, your persona, and the stage. Do NOT wait for the candidate to speak first.

Interview Guidelines:
- Ask questions naturally based on the candidate's responses. Do not use predefined question lists.
- Keep responses under 60 words. Be concise and focused.
- Ask ONE question at a time. Wait for the candidate's answer before proceeding.
- Do not explain concepts, teach, or chat casually. Stay in role as the interviewer.
- Do NOT praise, gush, or over-validate answers. Acknowledge briefly and move on.
- Use neutral filler: "Mm-hm." / "Okay." / "Got it." — not "Wow!" or "That's incredible!"
${stage === 'hr_screen' ? '' : '- End interview after 5-10 turns max unless user says continue.'}

${stageSpecificInstructions}

${(() => {
      // websiteContent is now fetched outside the IIFE, so we can use it here
      if (hasResume && hasJobDescription) {
        const isHrScreen = stage === 'hr_screen'
        return `
CRITICAL: You have the candidate's resume and job description in front of you.
${isHrScreen ? `As an HR screener, you use this to VERIFY, not to deep-dive. You've glanced at the resume and know the basics.` : `You MUST reference specific experiences, skills, and achievements from their resume and connect their background to the job requirements.`}
1. If the candidate asks if you have their resume, confirm yes and reference a detail from it
2. ${isHrScreen ? 'Use resume details to frame high-level questions: "I see you were at [Company] — tell me a bit about that"' : 'Ask about specific projects, roles, or accomplishments mentioned in their resume'}
3. ${isHrScreen ? 'You are an HR generalist from ' + companyName + ' — you are NOT a domain expert' : 'Take on the persona of a professional from ' + companyName + ' and embody the company culture'}
4. DO NOT make up companies, roles, or experiences not in the resume

CANDIDATE'S RESUME:
${interviewData.resume_text}

JOB DESCRIPTION:
${interviewData.job_description_text}

${websiteContent ? `COMPANY WEBSITE CONTENT (for persona and context):
${websiteContent}
` : `COMPANY WEBSITE: ${interviewData.company_website || 'Not provided'}
`}

${isHrScreen ? `When asking questions:
- Keep questions surface-level. You are checking boxes, not evaluating domain skills.
- Good: "I see you were at [Company] — tell me a bit about that"
- Bad: "What specific methodologies did you use to optimize conversion rates?" (too deep)
- Do NOT ask questions that require domain expertise to evaluate the answer` : `When asking questions:
- Reference specific companies, roles, or projects from their resume
- Ask about gaps, transitions, or interesting experiences mentioned
- Connect their past experience to the role requirements
- Be specific: "I see you worked at [Company] as a [Role] - tell me about that experience"`}`
      } else if (hasResume) {
        return `
CRITICAL: You have access to the candidate's resume. You MUST:
1. Reference specific experiences and achievements from their resume
2. Ask about specific projects, roles, or accomplishments mentioned
3. If the candidate asks if you have their resume, confirm that you do

CANDIDATE'S RESUME:
${interviewData.resume_text}`
      } else if (hasJobDescription) {
        return `
CRITICAL: You have access to the job description${websiteContent ? ' and company website' : ''}. You MUST:
1. Reference specific requirements from the job description
2. Ask questions relevant to the role requirements
3. Take on the persona of an HR professional from ${companyName}
${websiteContent ? `4. Use the company website information to understand the company's mission, values, and culture - reflect this in your questions and responses` : ''}

JOB DESCRIPTION:
${interviewData.job_description_text}

${websiteContent ? `COMPANY WEBSITE CONTENT (for persona and context):
${websiteContent}
` : `COMPANY WEBSITE: ${interviewData.company_website || 'Not provided'}
`}`
      } else {
        return `
    Context about the candidate:
Resume: Not provided
Job Description: Not provided
Company: Not provided`
      }
    })()}`

    if (stage === 'hr_screen') {
      optimizedSystemPrompt = buildHrScreenPrompt({
        dataSection: sharedDataSection,
        conversationContext: `
REALTIME HR SCREEN RULES:
- Keep this to roughly 6-8 total questions.
- Stay surface-level even if the candidate says something impressive or unusual.
- Ask at most ONE brief follow-up on any topic, then move on.
- Do NOT do technical evaluation, problem-solving, or long behavioral deep-dives.
- Use the resume to verify background at a high level, not to interrogate.
- Prioritize these topics: background, company knowledge, role interest, one or two resume checks, why leaving, salary, availability.
- After the core questions, invite the candidate to ask questions.
- Allow up to three candidate questions and answer them briefly.
- If they say they have no questions, close right away.
`,
        phaseInstructions: `
OPENING:
- You speak first.
- Start with a short recruiter phone-screen intro.
- Say you have a few quick questions.
- Begin with "Can you tell me a bit about yourself?"

QUESTION BOUNDARIES:
- Do not ask "how would you..." questions.
- Do not ask methodology questions.
- Do not ask for detailed STAR stories unless the candidate naturally answers that way.
- After salary and availability, invite candidate questions before closing.
- If you already have enough information, wrap up instead of inventing more questions.
`,
      })
    }

    // Create Realtime API session
    const response = await fetch('https://api.openai.com/v1/realtime/sessions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
        'Content-Type': 'application/json',
        'OpenAI-Beta': 'realtime=v1',
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini-realtime-preview',
        voice: 'marin',
        instructions: optimizedSystemPrompt,
        input_audio_format: 'pcm16',
        output_audio_format: 'pcm16',
        turn_detection: {
          type: 'server_vad',
          threshold: 0.68,
          prefix_padding_ms: 300,
          silence_duration_ms: 900,
        },
        modalities: ['text', 'audio'],
        temperature: 0.7,
        max_response_output_tokens: 400,
      }),
    })

    if (!response.ok) {
      const errorText = await response.text()
      console.error('OpenAI API error:', response.status, errorText)
      throw new Error(`Failed to create session: ${response.status} - ${errorText}`)
    }

    const session = await response.json()
    console.log('Session created:', JSON.stringify(session, null, 2))

    // Handle different possible response formats
    const clientSecret = session.client_secret?.value || 
                        session.client_secret || 
                        session.client_secret_value ||
                        session.data?.client_secret

    const finalClientSecret = clientSecret

    if (!finalClientSecret) {
      console.error('No client_secret available. Session response:', JSON.stringify(session, null, 2))
      return NextResponse.json({
        error: 'No client_secret available',
        sessionData: session,
        sessionId: session.id,
        instructions: optimizedSystemPrompt,
      }, { status: 500 })
    }

    console.log('Returning client secret for WebSocket connection')
    
    // For testing: also return a temporary token that can be used in WebSocket URL
    // NOTE: This is NOT secure for production - API key should never be exposed to frontend
    // This is only for testing the WebSocket connection
    return NextResponse.json({
      clientSecret: finalClientSecret,
      sessionId: session.id,
      instructions: optimizedSystemPrompt,
      // Temporary: For testing WebSocket connection (REMOVE IN PRODUCTION)
      // The WebSocket might need the API key in the connection, not the client_secret
      testMode: process.env.NODE_ENV === 'development',
    })
  } catch (error) {
    console.error('Error creating Realtime session:', error)
    return NextResponse.json(
      { error: 'Failed to create Realtime session' },
      { status: 500 }
    )
  }
}
