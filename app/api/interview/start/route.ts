// API route to start an interview session
import { NextRequest, NextResponse } from 'next/server'
import { supabase, supabaseAdmin } from '@/lib/supabase'
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'
import OpenAI from 'openai'

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
})

export async function POST(request: NextRequest) {
  try {
    const { stage, sessionId } = await request.json()

    // Stage gating: non-HR stages require authentication
    if (stage && stage !== 'hr_screen') {
      const supabaseAuth = createRouteHandlerClient({ cookies })
      const { data: { session: authSession } } = await supabaseAuth.auth.getSession()
      if (!authSession) {
        return NextResponse.json(
          { error: 'Authentication required for this interview stage. Please sign in to continue.' },
          { status: 401 }
        )
      }
    }

    // Get the interview prompt for this stage
    const { data: promptData, error: promptError } = await supabaseAdmin
      .from('interview_prompts')
      .select('*')
      .eq('stage', stage)
      .single()

    if (promptError || !promptData) {
      return NextResponse.json(
        { error: 'Failed to load interview prompt' },
        { status: 500 }
      )
    }

    // Get user interview data for personalized greeting
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
          console.log('Got interview data from session link for greeting')
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
          console.log('Got latest interview data for user for greeting')
          
          // Update the session to link to this data
          await supabaseAdmin
            .from('interview_sessions')
            .update({ user_interview_data_id: latestInterviewData.id })
            .eq('id', sessionId)
        } else {
          console.log('No interview data found for user:', sessionData.user_id)
        }
      }
      
      console.log('Interview data for greeting:', {
        hasData: !!interviewData,
        hasResume: !!interviewData?.resume_text && interviewData.resume_text.trim().length > 0,
        hasJobDescription: !!interviewData?.job_description_text && interviewData.job_description_text.trim().length > 0,
        companyWebsite: interviewData?.company_website,
        resumeTextLength: interviewData?.resume_text?.length || 0,
        jobDescriptionLength: interviewData?.job_description_text?.length || 0,
        resumeTextPreview: interviewData?.resume_text?.substring(0, 100) || 'N/A',
      })
    }

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
            console.log('Fetched website content for greeting, length:', websiteContent.length)
          }
        }
      } catch (error) {
        console.error('Error fetching website content:', error)
        // Continue without website content
      }
    }

    // Log what we have for the greeting
    console.log('Creating greeting with:', {
      hasResume: !!interviewData?.resume_text && interviewData.resume_text.trim().length > 0,
      hasJobDescription: !!interviewData?.job_description_text && interviewData.job_description_text.trim().length > 0,
      hasWebsiteContent: !!websiteContent,
      resumeLength: interviewData?.resume_text?.length || 0,
      jobDescriptionLength: interviewData?.job_description_text?.length || 0,
    })
    
    // Create personalized initial message - HR screen has structured opening
    const systemPrompt = promptData.system_prompt
    let initialMessage = ''
    let conversationPhase = 'opening'
    
    if (stage === 'hr_screen') {
      // HR SCREEN: Structured opening script
      if (interviewData?.resume_text && interviewData?.job_description_text) {
        let companyName = 'our company'
        let positionName = 'this position'
        
        // Extract company name from website
        if (interviewData.company_website) {
          try {
            const url = interviewData.company_website.startsWith('http') 
              ? new URL(interviewData.company_website)
              : new URL(`https://${interviewData.company_website}`)
            companyName = url.hostname.replace('www.', '').split('.')[0]
          } catch {
            companyName = interviewData.company_website.replace(/^https?:\/\//, '').replace('www.', '').split('.')[0] || 'our company'
          }
        }
        
        // Extract position name from job description (look for "Position: [title]" format)
        const positionMatch = interviewData.job_description_text.match(/^Position:\s*(.+)$/m)
        if (positionMatch && positionMatch[1]) {
          positionName = positionMatch[1].trim()
        } else {
          // Fallback: Try to extract from first line if it looks like a title
          const jobDescLines = interviewData.job_description_text.split('\n').filter((line: string) => line.trim().length > 0)
          if (jobDescLines.length > 0) {
            const firstLine = jobDescLines[0].trim()
            // If it looks like a title (short, no punctuation at end, or has "Position:" etc)
            if (firstLine.length < 100 && (firstLine.includes('Position') || firstLine.includes('Role') || !firstLine.endsWith('.'))) {
              positionName = firstLine.replace(/^(Position|Role|Title):\s*/i, '').trim()
            }
          }
        }
        
        // Generate random interviewer name
        const interviewerNames = [
          'Sarah', 'Michael', 'Jessica', 'David', 'Emily', 'James', 'Amanda', 'Christopher',
          'Jennifer', 'Daniel', 'Lisa', 'Matthew', 'Michelle', 'Andrew', 'Nicole', 'Ryan',
          'Ashley', 'Joshua', 'Stephanie', 'Justin', 'Lauren', 'Brandon', 'Rachel', 'Kevin'
        ]
        const randomName = interviewerNames[Math.floor(Math.random() * interviewerNames.length)]
        
        // OPTIMIZED: Skip "good time" question - user already clicked "Start Interview"
        // Jump straight to screening with standard opening question
        initialMessage = `Hi, this is ${randomName} with ${companyName} calling about the ${positionName} position. I have a few quick questions, then you can ask me anything. Tell me a bit about yourself.`
        conversationPhase = 'screening'
        // HR Screen - starting with screening phase
        
        // Option 2: Keep structure overview but make it tighter (uncomment to use)
        // initialMessage = `Hi, this is ${companyName} about the ${positionName} role. I'll share info about the company and role, ask a few questions, then you can ask me anything. Sound good?`
        // conversationPhase = 'structure_overview'
      } else {
        // Fallback if no resume/job description
        initialMessage = `Hello! I'm conducting your HR screen interview. Is now still a good time?`
        conversationPhase = 'opening'
        console.warn('Using fallback HR screen greeting - no resume/job description data available')
      }
    } else if (stage === 'hiring_manager') {
      // HIRING MANAGER: More formal, domain-aware introduction
      if (interviewData?.resume_text && interviewData?.job_description_text) {
        let companyName = 'our company'
        let positionName = 'this position'
        let managerTitle = 'the Hiring Manager'

        // Extract company name from website
        if (interviewData.company_website) {
          try {
            const url = interviewData.company_website.startsWith('http')
              ? new URL(interviewData.company_website)
              : new URL(`https://${interviewData.company_website}`)
            const domain = url.hostname.replace('www.', '').split('.')[0]
            companyName = domain.charAt(0).toUpperCase() + domain.slice(1)
          } catch {
            const domain = interviewData.company_website.replace(/^https?:\/\//, '').replace('www.', '').split('.')[0] || 'our company'
            companyName = domain.charAt(0).toUpperCase() + domain.slice(1)
          }
        }

        // Extract position name from job description
        if (interviewData.job_description_text) {
          const jobDescLines = interviewData.job_description_text.split('\n').filter((line: string) => line.trim().length > 0)
          for (const line of jobDescLines) {
            if (line.includes('Position:')) {
              positionName = line.replace(/^Position:\s*/i, '').trim()
              break
            }
          }
          if (positionName === 'this position' && jobDescLines.length > 0) {
            const firstLine = jobDescLines[0].trim()
            if (firstLine.length < 100 && !firstLine.endsWith('.')) {
              positionName = firstLine.replace(/^(Company|Position|Role|Title):\s*/i, '').trim()
            }
          }
          // Infer manager title from position
          if (positionName.toLowerCase().includes('senior') || positionName.toLowerCase().includes('lead')) {
            managerTitle = 'the Engineering Director'
          } else if (positionName.toLowerCase().includes('manager') || positionName.toLowerCase().includes('director')) {
            managerTitle = 'the VP'
          } else {
            managerTitle = 'the Manager'
          }
        }

        initialMessage = `Hi, I'm ${managerTitle} at ${companyName}. Thanks for speaking with our HR team. I've reviewed your background and our notes from that conversation. I'd like to spend the next 30 minutes diving deeper into your experience, particularly as it relates to the ${positionName} role. Then we'll leave time for your questions. Sound good?`
        conversationPhase = 'screening'
        // Hiring Manager greeting created
      } else {
        initialMessage = `Hello! I'm the hiring manager. Thanks for taking the time to speak with our HR team. I'd like to dive deeper into your experience. Ready to get started?`
        conversationPhase = 'screening'
      }
    } else {
      // OTHER STAGES: Keep existing logic
      initialMessage = `Hello! I'm conducting your ${stage.replace('_', ' ')} interview.`
      if (interviewData?.resume_text && interviewData?.job_description_text) {
        let companyName = 'our company'
        if (interviewData.company_website) {
          try {
            const url = interviewData.company_website.startsWith('http')
              ? new URL(interviewData.company_website)
              : new URL(`https://${interviewData.company_website}`)
            companyName = url.hostname.replace('www.', '').split('.')[0]
          } catch {
            companyName = interviewData.company_website.replace(/^https?:\/\//, '').replace('www.', '').split('.')[0] || 'our company'
          }
        }
        initialMessage = `Hello! I'm calling from ${companyName} to conduct your ${stage.replace('_', ' ')} interview. I've reviewed your resume and I'm excited to learn more about your background. Let's begin - tell me about yourself.`
        // Personalized greeting created with resume/job description data
      } else {
        initialMessage += ` Let's begin - tell me about yourself.`
        console.warn('Using generic greeting - no resume/job description data available')
      }
    }
    
    // Log what we're about to send
    // Initial greeting and conversation phase ready

    // Generate speech audio using OpenAI TTS
    let audioBase64 = null
    try {
      const mp3 = await openai.audio.speech.create({
        model: 'tts-1',
        voice: 'alloy', // Options: alloy, echo, fable, onyx, nova, shimmer
        input: initialMessage,
      })

      const buffer = Buffer.from(await mp3.arrayBuffer())
      audioBase64 = buffer.toString('base64')
    } catch (error) {
      console.error('Error generating speech:', error)
      // Continue without audio if TTS fails
    }

    return NextResponse.json({
      message: initialMessage,
      audioBase64, // Base64 encoded MP3 audio
      systemPrompt,
      conversationPhase: stage === 'hr_screen' ? conversationPhase : null, // Only for HR screen
    })
  } catch (error: any) {
    console.error('Error starting interview:', error)
    console.error('Error details:', {
      message: error?.message,
      stack: error?.stack,
      name: error?.name,
    })
    return NextResponse.json(
      { 
        error: 'Failed to start interview',
        details: error?.message || 'Unknown error',
      },
      { status: 500 }
    )
  }
}

