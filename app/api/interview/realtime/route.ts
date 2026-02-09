// API route to create a Realtime API session
import { NextRequest, NextResponse } from 'next/server'
import { supabase, supabaseAdmin } from '@/lib/supabase'
import OpenAI from 'openai'

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
})

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
- This is a 5-10 minute phone screen ONLY. Keep it brief and focused.
- Your primary goals: 1) Verify the candidate matches their resume, 2) Understand their motivations for the role.
- After 4-6 exchanges (when you have verified identity and confirmed motivations), you MUST naturally conclude the call.
- End with a closing statement like: "Perfect! I have your availability and I'll get something scheduled with the hiring manager. Thanks for your time today!" or similar.
- Do NOT continue asking questions after you have the information you need.
- The interview should feel natural and wrap up around 5-10 minutes total.
- Keep your responses very brief (30-40 words max) to maintain the quick screening pace.`
    }

    const optimizedSystemPrompt = `${basePrompt}

You are conducting a ${stage.replace('_', ' ')} interview.

Tone: ${toneGuidance[tone as keyof typeof toneGuidance] || toneGuidance.professional}
Depth Level: ${depthGuidance[depthLevel as keyof typeof depthGuidance] || depthGuidance.medium}

Interview Guidelines:
- Ask questions naturally based on the candidate's responses. Do not use predefined question lists.
- Keep responses under 60 words. Be concise and focused.
- Ask ONE question at a time. Wait for the candidate's answer before proceeding.
- Follow up on interesting points the candidate mentions.
- Give brief feedback only when the user explicitly asks "feedback" or session ends.
- Do not explain concepts, teach, or chat casually. Stay in role as the interviewer.
${stage === 'hr_screen' ? '' : '- End interview after 5-10 turns max unless user says continue.'}

${stageSpecificInstructions}

${(() => {
      const hasResume = interviewData?.resume_text && interviewData.resume_text.trim().length > 0
      const hasJobDescription = interviewData?.job_description_text && interviewData.job_description_text.trim().length > 0
      let companyName = 'the company'
      if (interviewData?.company_website) {
        try {
          const url = interviewData.company_website.startsWith('http') 
            ? new URL(interviewData.company_website)
            : new URL(`https://${interviewData.company_website}`)
          companyName = url.hostname.replace('www.', '').split('.')[0]
        } catch {
          // If URL parsing fails, try to extract from the string
          companyName = interviewData.company_website.replace(/^https?:\/\//, '').replace('www.', '').split('.')[0] || 'the company'
        }
      }
      
      // websiteContent is now fetched outside the IIFE, so we can use it here
      if (hasResume && hasJobDescription) {
        return `
CRITICAL: You have full access to the candidate's resume, the job description, and company information. You MUST:
1. Reference specific experiences, skills, and achievements from their resume
2. Ask about specific projects, roles, or accomplishments mentioned in their resume
3. Connect their background to the job requirements
4. If the candidate asks if you have their resume, confirm that you do and reference specific details
5. Take on the persona of an HR professional from ${companyName} - embody the company culture, values, and tone based on the company website
6. Use the company website information to understand the company's mission, values, and culture - reflect this in your questions and responses

CANDIDATE'S RESUME:
${interviewData.resume_text}

JOB DESCRIPTION:
${interviewData.job_description_text}

${websiteContent ? `COMPANY WEBSITE CONTENT (for persona and context):
${websiteContent}
` : `COMPANY WEBSITE: ${interviewData.company_website || 'Not provided'}
`}

When asking questions:
- Reference specific companies, roles, or projects from their resume
- Ask about gaps, transitions, or interesting experiences mentioned
- Connect their past experience to the role requirements
- Be specific: "I see you worked at [Company] as a [Role] - tell me about that experience"
- Do NOT ask generic questions when you have specific resume details available`
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

    // Try creating a client_secret first (for browser use)
    // Then create the session
    const clientSecretResponse = await fetch('https://api.openai.com/v1/realtime/client_secrets', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
        'Content-Type': 'application/json',
        'OpenAI-Beta': 'realtime=v1',
      },
    })

    let ephemeralClientSecret = null
    if (clientSecretResponse.ok) {
      const clientSecretData = await clientSecretResponse.json()
      ephemeralClientSecret = clientSecretData.client_secret?.value || clientSecretData.client_secret
      console.log('Created ephemeral client secret')
    } else {
      console.warn('Could not create ephemeral client secret, will try session method')
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
        model: 'gpt-realtime-mini',
        voice: 'alloy',
        instructions: optimizedSystemPrompt,
        input_audio_format: 'pcm16',
        output_audio_format: 'pcm16',
        turn_detection: {
          type: 'server_vad',
          threshold: 0.5,
          prefix_padding_ms: 300,
          silence_duration_ms: 500,
        },
        modalities: ['text', 'audio'],
        temperature: 0.7,
        max_response_output_tokens: 150,
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

    // Prefer ephemeral client secret, fallback to session client_secret
    const finalClientSecret = ephemeralClientSecret || clientSecret

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

