// API route to handle text input and generate responses
import { NextRequest, NextResponse } from 'next/server'
import { supabase, supabaseAdmin } from '@/lib/supabase'
import OpenAI from 'openai'

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
})

export async function POST(request: NextRequest) {
  try {
    const { stage, sessionId, userMessage, transcript } = await request.json()

    if (!userMessage) {
      return NextResponse.json({ error: 'No message provided' }, { status: 400 })
    }

    // Get interview prompt
    const { data: promptData } = await supabaseAdmin
      .from('interview_prompts')
      .select('*')
      .eq('stage', stage)
      .single()

    // Get user interview data for context
    // First try to get from session, but also get the latest interview data as fallback
    // Use supabaseAdmin to bypass RLS since we're filtering by user_id
    const { data: sessionData } = await supabaseAdmin
      .from('interview_sessions')
      .select('user_interview_data_id, user_id')
      .eq('id', sessionId)
      .single()

    let interviewData = null
    
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

    // Fetch company website content for persona context
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
            console.log('Fetched website content, length:', websiteContent.length)
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
    
    // Extract company name from job description or website
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
    
    const hasResume = interviewData?.resume_text && interviewData.resume_text.trim().length > 0
    const hasJobDescription = interviewData?.job_description_text && interviewData.job_description_text.trim().length > 0
    
    const contextSection = hasResume && hasJobDescription ? `
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
- Use company culture and values from the website to inform your tone and questions
- Do NOT ask generic questions when you have specific resume details available
` : hasResume ? `
CRITICAL: You have access to the candidate's resume. You MUST:
1. Reference specific experiences and achievements from their resume
2. Ask about specific projects, roles, or accomplishments mentioned
3. If the candidate asks if you have their resume, confirm that you do

CANDIDATE'S RESUME:
${interviewData.resume_text}
` : hasJobDescription ? `
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
`}
` : `
Context about the candidate:
Resume: Not provided
Job Description: Not provided
Company: Not provided
`
    
    // Build conversation context
    const messages: OpenAI.Chat.Completions.ChatCompletionMessageParam[] = [
      {
        role: 'system',
        content: `${basePrompt}

You are conducting a ${stage.replace('_', ' ')} interview.

Tone: ${toneGuidance[tone as keyof typeof toneGuidance] || toneGuidance.professional}
Depth Level: ${depthGuidance[depthLevel as keyof typeof depthGuidance] || depthGuidance.medium}

Interview Guidelines:
- Ask questions naturally based on the candidate's responses. Do not use predefined question lists.
- Keep responses concise and natural for voice conversation (under 60 words).
- Ask follow-up questions when appropriate based on the candidate's answers.

${contextSection}`,
      },
      ...(transcript || []).map((msg: string) => ({
        role: msg.startsWith('You:') ? 'user' : 'assistant',
        content: msg.replace(/^(You:|Interviewer:)\s*/, ''),
      })),
      {
        role: 'user',
        content: userMessage,
      },
    ]

    // Generate response using ChatGPT (using gpt-4o-mini for cost efficiency)
    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages,
      temperature: 0.7,
      max_tokens: 200,
    })

    const assistantMessage = completion.choices[0]?.message?.content || 'I see. Can you tell me more?'

    // Generate speech audio using OpenAI TTS
    let audioBase64 = null
    try {
      const mp3 = await openai.audio.speech.create({
        model: 'tts-1',
        voice: 'alloy', // Options: alloy, echo, fable, onyx, nova, shimmer
        input: assistantMessage,
      })

      const buffer = Buffer.from(await mp3.arrayBuffer())
      audioBase64 = buffer.toString('base64')
    } catch (error) {
      console.error('Error generating speech:', error)
      // Continue without audio if TTS fails
    }

    // Check if we should move to next stage or end interview
    let nextStage = null
    let complete = false

    const messageCount = (transcript || []).length
    if (stage === 'hr_screen' && messageCount >= 6) {
      nextStage = 'hiring_manager'
    } else if (stage === 'hiring_manager' && messageCount >= 8) {
      nextStage = 'team_interview'
    } else if (stage === 'team_interview' && messageCount >= 10) {
      if (assistantMessage.toLowerCase().includes('questions for us')) {
        complete = true
      }
    }

    // For HR screen: Build structured transcript with question tracking
    let structuredTranscript = null
    let questionId = null
    if (stage === 'hr_screen' && sessionId) {
      // Get existing structured transcript or initialize new one
      const { data: sessionData } = await supabaseAdmin
        .from('interview_sessions')
        .select('transcript_structured, created_at')
        .eq('id', sessionId)
        .single()
      
      const existingStructured = sessionData?.transcript_structured || {
        messages: [],
        questions_asked: [],
        start_time: sessionData?.created_at || new Date().toISOString()
      }
      
      // Calculate timestamp (relative to interview start)
      const startTime = new Date(existingStructured.start_time || sessionData?.created_at || new Date().toISOString())
      const currentTime = new Date()
      const elapsedSeconds = Math.floor((currentTime.getTime() - startTime.getTime()) / 1000)
      const minutes = Math.floor(elapsedSeconds / 60)
      const seconds = elapsedSeconds % 60
      const timestamp = `${minutes}:${seconds.toString().padStart(2, '0')}`
      
      // Add user message to structured transcript
      existingStructured.messages.push({
        speaker: 'candidate',
        text: userMessage,
        timestamp: timestamp
      })
      
      // Check if assistant message is a question
      const assistantLower = assistantMessage.toLowerCase().trim()
      const isQuestion = assistantLower.includes('?') ||
        assistantLower.startsWith('tell me') ||
        assistantLower.startsWith('what') ||
        assistantLower.startsWith('why') ||
        assistantLower.startsWith('how') ||
        assistantLower.startsWith('can you') ||
        assistantLower.startsWith('would you') ||
        assistantLower.startsWith('i see you') ||
        assistantLower.includes('tell me about')
      
      if (isQuestion) {
        // Assign question ID
        const questionCounter = existingStructured.questions_asked.length + 1
        questionId = `q${questionCounter}`
        
        // Determine assessment areas based on question content
        const assessmentAreas: string[] = []
        
        // Answer structure - most questions assess this
        assessmentAreas.push('answer_structure')
        
        // Career alignment - if asking about interest, goals, or why this role
        if (assistantLower.includes('why') && (assistantLower.includes('interested') || assistantLower.includes('this role') || assistantLower.includes('position'))) {
          assessmentAreas.push('career_alignment')
        }
        
        // Specific examples - if asking for examples or details
        if (assistantLower.includes('example') || assistantLower.includes('specific') || assistantLower.includes('tell me about') || assistantLower.includes('describe')) {
          assessmentAreas.push('specific_examples')
        }
        
        // Handling uncertainty - if asking about something they may not know
        if (assistantLower.includes('how would you') || assistantLower.includes('what if') || assistantLower.includes('haven\'t')) {
          assessmentAreas.push('handling_uncertainty')
        }
        
        // Questions from candidate - if asking if they have questions
        if (assistantLower.includes('questions for') || assistantLower.includes('any questions') || assistantLower.includes('anything else')) {
          assessmentAreas.push('questions_asked')
        }
        
        // Pace and flow - all questions contribute to this assessment
        assessmentAreas.push('pace_and_flow')
        
        // Add question to questions_asked array
        existingStructured.questions_asked.push({
          id: questionId,
          question: assistantMessage,
          timestamp: timestamp,
          assessment_areas: assessmentAreas
        })
        
        // Add interviewer message with question_id
        existingStructured.messages.push({
          speaker: 'interviewer',
          text: assistantMessage,
          timestamp: timestamp,
          question_id: questionId
        })
      } else {
        // Not a question, just add message without question_id
        existingStructured.messages.push({
          speaker: 'interviewer',
          text: assistantMessage,
          timestamp: timestamp
        })
      }
      
      structuredTranscript = existingStructured
    }

    // Update transcript in database
    if (sessionId) {
      const updatedTranscript = [...(transcript || []), `You: ${userMessage}`, `Interviewer: ${assistantMessage}`].join('\n')
      const updateData: any = { transcript: updatedTranscript }
      
      // Add structured transcript for HR screen
      if (stage === 'hr_screen' && structuredTranscript) {
        updateData.transcript_structured = structuredTranscript
      }
      
      await supabaseAdmin
        .from('interview_sessions')
        .update(updateData)
        .eq('id', sessionId)
    }

    return NextResponse.json({
      assistantMessage: `Interviewer: ${assistantMessage}`,
      audioBase64, // Base64 encoded MP3 audio
      nextStage,
      complete,
      questionId: stage === 'hr_screen' ? questionId : null, // Question ID for HR screen questions
    })
  } catch (error) {
    console.error('Error processing text:', error)
    return NextResponse.json(
      { error: 'Failed to process text input' },
      { status: 500 }
    )
  }
}

