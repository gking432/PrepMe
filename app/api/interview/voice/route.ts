// API route to handle voice input and generate responses
import { NextRequest, NextResponse } from 'next/server'
import { supabase, supabaseAdmin } from '@/lib/supabase'
import {
  appendMessage,
  appendQuestion,
  getStructuredTranscript,
  getNextQuestionId,
  calculateDuration,
} from '@/lib/interview-session'
import { buildSystemPrompt as buildHrScreenPrompt } from '@/lib/interview-prompts/hr_screen'
import { buildSystemPrompt as buildHiringManagerPrompt } from '@/lib/interview-prompts/hiring_manager'
import { buildSystemPrompt as buildCultureFitPrompt } from '@/lib/interview-prompts/culture_fit'
import { buildSystemPrompt as buildFinalPrompt } from '@/lib/interview-prompts/final'
import { recordTurn } from '@/lib/observer-agent'
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'
import OpenAI from 'openai'

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
})

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData()
    const audioFile = formData.get('audio') as File
    const stage = formData.get('stage') as string
    const sessionId = formData.get('sessionId') as string
    const transcriptData = formData.get('transcript') as string
    
    // HR Screen / Hiring Manager conversation state
    const conversationPhaseRaw = stage === 'hr_screen' ? (formData.get('conversationPhase') as string) : null
    const conversationPhase = conversationPhaseRaw || (stage === 'hr_screen' ? 'opening' : null) // Default to 'opening' for HR screen
    const askedQuestionsData = formData.get('askedQuestions') as string
    const askedQuestions = askedQuestionsData ? JSON.parse(askedQuestionsData) : []

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

    if (!audioFile) {
      return NextResponse.json({ error: 'No audio file provided' }, { status: 400 })
    }

    // Convert audio to text using OpenAI Whisper
    const transcription = await openai.audio.transcriptions.create({
      file: audioFile,
      model: 'whisper-1',
    })

    const userMessage = transcription.text
    
    // For HR screen: Determine next conversation phase based on user response
    // Initialize with the phase from the request, or default to 'opening'
    let nextConversationPhase = conversationPhase || (stage === 'hr_screen' ? 'opening' : null)
    if (stage === 'hr_screen' && nextConversationPhase) {
      const userResponseLower = userMessage.toLowerCase().trim()
      
      if (nextConversationPhase === 'opening') {
        // User confirmed it's a good time - check for various confirmations
        const confirmationWords = ['yes', 'yeah', 'yep', 'sure', 'good', 'fine', 'works', 'okay', 'ok', 'sounds good', 'that works', 'now it works', 'perfect', 'great', 'that sounds great', 'let\'s do it']
        if (confirmationWords.some(word => userResponseLower.includes(word))) {
          nextConversationPhase = 'structure_overview'
        }
      } else if (nextConversationPhase === 'structure_overview') {
        // User confirmed the structure sounds good
        const confirmationWords = ['yes', 'yeah', 'yep', 'sure', 'sounds good', 'okay', 'ok', 'perfect', 'great', 'that sounds good', 'that sounds great', 'let\'s do it', 'sounds perfect']
        if (confirmationWords.some(word => userResponseLower.includes(word))) {
          nextConversationPhase = 'company_intro'
        }
      }
      // Other phase transitions are handled by AI responses, not user input
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
    let sessionData = null
    
    if (sessionId) {
      const sessionResult = await supabaseAdmin
        .from('interview_sessions')
        .select('user_interview_data_id, user_id')
        .eq('id', sessionId)
        .maybeSingle()
      
      if (sessionResult.error) {
        console.error('Error fetching session (will try to get data anyway):', sessionResult.error)
        console.error('Session ID:', sessionId)
      } else {
        sessionData = sessionResult.data
        if (sessionData) {
        } else {
          console.log('⚠️ Session not found, will try to get latest interview data')
        }
      }
    }

    let interviewData = null
    let userId = sessionData?.user_id || null
    
    // Try to get interview data from session link first
    if (sessionData?.user_interview_data_id) {
      const { data: interviewDataResult, error: dataError } = await supabaseAdmin
        .from('user_interview_data')
        .select('*')
        .eq('id', sessionData.user_interview_data_id)
        .maybeSingle()
      
      if (dataError) {
        console.error('Error fetching interview data from session link:', dataError)
      } else if (interviewDataResult) {
        interviewData = interviewDataResult
      }
    }
    
    // If no data from session link, get the latest interview data for this user
    if (!interviewData && userId) {
      console.log('Session not linked to interview data, fetching latest for user:', userId)
      const { data: latestInterviewData, error: latestError } = await supabaseAdmin
        .from('user_interview_data')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(1)
      
      if (latestError) {
        console.error('Error fetching latest interview data:', latestError)
      } else if (latestInterviewData && latestInterviewData.length > 0) {
        interviewData = latestInterviewData[0]
        
        // Update the session to link to this data if session exists
        if (sessionId && sessionData) {
          await supabaseAdmin
            .from('interview_sessions')
            .update({ user_interview_data_id: interviewData.id })
            .eq('id', sessionId)
        }
      }
    }
    
    // If still no data, fail gracefully instead of leaking another user's data
    if (!interviewData) {
      console.error('No interview data found for this session or user. Cannot proceed.')
    }
    
    
    // CRITICAL: Validate interview data exists and has content
    if (!interviewData) {
      console.error('CRITICAL ERROR: No interview data found! The AI will not have access to resume/job description.')
      return NextResponse.json(
        { error: 'Interview data not found. Please ensure resume and job description are uploaded.' },
        { status: 400 }
      )
    }
    
    if (!interviewData.resume_text || interviewData.resume_text.trim().length === 0) {
      console.error('CRITICAL ERROR: Interview data exists but resume_text is empty!')
      return NextResponse.json(
        { error: 'Resume text is missing. Please upload a resume.' },
        { status: 400 }
      )
    }
    
    if (!interviewData.job_description_text || interviewData.job_description_text.trim().length === 0) {
      console.error('CRITICAL ERROR: Interview data exists but job_description_text is empty!')
      return NextResponse.json(
        { error: 'Job description is missing. Please provide a job description.' },
        { status: 400 }
      )
    }
    

    // Fetch HR screen feedback if this is a hiring_manager interview
    let hrScreenContext = ''
    if (stage === 'hiring_manager' && userId) {
      const { data: hrSession } = await supabaseAdmin
        .from('interview_sessions')
        .select('id')
        .eq('user_id', userId)
        .eq('stage', 'hr_screen')
        .eq('status', 'completed')
        .order('completed_at', { ascending: false })
        .limit(1)
        .maybeSingle()

      if (hrSession) {
        const { data: hrFeedback } = await supabaseAdmin
          .from('interview_feedback')
          .select('strengths, weaknesses, suggestions, detailed_feedback, hr_screen_six_areas')
          .eq('interview_session_id', hrSession.id)
          .maybeSingle()

        if (hrFeedback) {
          const sixAreasFormatted = hrFeedback.hr_screen_six_areas && typeof hrFeedback.hr_screen_six_areas === 'object'
            ? Object.entries(hrFeedback.hr_screen_six_areas).map(([area, data]: [string, unknown]) => {
                const d = data as { score?: number; summary?: string }
                return `- ${area}: ${d?.score ?? 'N/A'}/5 - ${d?.summary || 'No notes'}`
              }).join('\n')
            : ''
          hrScreenContext = `
=== HR SCREEN FEEDBACK (reference this during the interview) ===

Strengths identified in HR screen:
${(hrFeedback.strengths ?? []).map((s: string) => `- ${s}`).join('\n') || '- None specifically noted'}

Weaknesses to probe deeper:
${(hrFeedback.weaknesses ?? []).map((w: string) => `- ${w}`).join('\n') || '- None specifically noted'}

Suggested areas for follow-up:
${(hrFeedback.suggestions ?? []).map((s: string) => `- ${s}`).join('\n') || '- None specifically noted'}

${sixAreasFormatted ? `Six-Area Assessment from HR:\n${sixAreasFormatted}` : ''}

Use this context to:
1. Don't re-ask what HR already covered thoroughly
2. Dig deeper on areas marked as weak
3. Probe inconsistencies or gaps
4. Build on insights from HR screen

=== END HR SCREEN FEEDBACK ===
`
        } else {
          console.log('⚠️ No HR screen feedback found - proceeding without context')
        }
      } else {
        console.log('⚠️ No completed HR screen found for this user - proceeding without context')
      }
    }

    // Build conversation context
    const transcript = transcriptData ? JSON.parse(transcriptData) : []
    
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
    
    // Build system prompt - different logic for HR screen vs other stages
    let systemPrompt = ''
    
    if (stage === 'hr_screen') {
      // HR SCREEN SPECIFIC PROMPT - Natural Conversation Flow Version
      // Use askedQuestions from frontend if available, otherwise extract from transcript
      // Build asked questions list for context tracking
      const askedQuestionsList = askedQuestions.length > 0 
        ? askedQuestions.map((q: string) => {
            // Clean up the question - remove extra whitespace
            const cleanQ = q.trim()
            return cleanQ.length > 100 ? cleanQ.substring(0, 100) + '...' : cleanQ
          })
        : transcript.filter((msg: string) => msg.startsWith('Interviewer:')).map((msg: string) => {
            const question = msg.replace('Interviewer:', '').trim()
            return question.length > 100 ? question.substring(0, 100) + '...' : question
          })
      
      const askedQuestionsCount = askedQuestionsList.length
      const askedQuestionsPreview = askedQuestionsList.slice(-5) // Last 5 questions for context
      
      // Build conversation context with explicit tracking
      const conversationContext = `
CONVERSATION MEMORY - CRITICAL:
You have asked ${askedQuestionsCount} questions so far.

${askedQuestionsPreview.length > 0 ? `
TOPICS ALREADY COVERED (do NOT repeat):
${askedQuestionsPreview.map((q: string, i: number) => `${i + 1}. ${q}`).join('\n')}

Look at these topics. DON'T ask about them again. Build on what you learned instead.
` : 'This is the start of the conversation.'}

${askedQuestionsCount >= 6 ? 
  '⚠️ You\'ve asked 6+ questions. Time to wrap up - ask if they have questions, then close.' : 
  'Continue the conversation naturally. Ask follow-ups on interesting details they share.'
}
`
      
      // Build phase-specific instructions with dynamic topic tracking
      const currentPhaseForPrompt = nextConversationPhase || conversationPhase || 'screening'
      let phaseInstructions = ''
      
      if (currentPhaseForPrompt === 'screening') {
        // Check what topics have been covered
        const hasAskedAboutExperience = askedQuestionsPreview.some((q: string) => 
          q.toLowerCase().includes('experience') || 
          q.toLowerCase().includes('tell me about') ||
          q.toLowerCase().includes('worked at') ||
          q.toLowerCase().includes('role at')
        )
        
        const hasAskedAboutMotivation = askedQuestionsPreview.some((q: string) => 
          q.toLowerCase().includes('interest') || 
          q.toLowerCase().includes('why') && (q.toLowerCase().includes('this role') || q.toLowerCase().includes('position') || q.toLowerCase().includes('drew you'))
        )
        
        const hasAskedAboutLeaving = askedQuestionsPreview.some((q: string) => 
          q.toLowerCase().includes('leaving') || 
          q.toLowerCase().includes('moving on') ||
          q.toLowerCase().includes('why are you')
        )
        
        const hasAskedAboutSalary = askedQuestionsPreview.some((q: string) => 
          q.toLowerCase().includes('salary') || 
          q.toLowerCase().includes('compensation') ||
          q.toLowerCase().includes('expectations')
        )
        
        const hasAskedAboutAvailability = askedQuestionsPreview.some((q: string) => 
          q.toLowerCase().includes('start') || 
          q.toLowerCase().includes('available') ||
          q.toLowerCase().includes('when could')
        )
        
        phaseInstructions = `
CONVERSATION STAGE: Main Interview

CORE TOPICS TO COVER (naturally, not rigidly):
${!hasAskedAboutExperience ? 
  '✓ START HERE: Their most relevant work experience (from resume)' : 
  '✗ Already covered experience'}

${!hasAskedAboutMotivation ? 
  '✓ NEXT: Why they want THIS role specifically' : 
  '✗ Already covered motivation'}

${!hasAskedAboutLeaving ? 
  '✓ Why they\'re leaving current position' : 
  '✗ Already covered leaving reasons'}

${!hasAskedAboutSalary ? 
  '○ Salary expectations (ask later in conversation, after covering experience/motivation)' : 
  '✗ Already covered salary'}

${!hasAskedAboutAvailability ? 
  '○ Start date availability (near end)' : 
  '✗ Already covered availability'}

FLOW GUIDANCE:
- If they just shared a specific achievement/metric → ask a follow-up about it
- If you've covered the main topics → transition to Q&A
- If they mention something interesting → explore it before moving on
- Build on previous answers: "You mentioned X - tell me more about that"
- Show you're listening: "That makes sense given your background in..."
`
      } else if (currentPhaseForPrompt === 'q_and_a') {
        phaseInstructions = `PHASE: Q&A

Candidate asks questions. Answer briefly (under 30 words).
After 2-3 questions → say: "Perfect. I'll follow up about next steps. Thanks for your time."`
      } else if (currentPhaseForPrompt === 'closing') {
        phaseInstructions = `PHASE: Closing

Say: "Perfect. I'll follow up about next steps. Thanks for your time."
End call.`
      } else {
        // Fallback for any other phases - treat as screening
        phaseInstructions = `
CONVERSATION STAGE: Main Interview

Continue gathering information naturally. Ask follow-ups on interesting details they share.
After 6-8 exchanges total, transition to Q&A phase.
`
      }
      
      // Build system prompt with data FIRST, then instructions
      // This ensures the model sees the data before processing instructions
      // CRITICAL: For HR screen, we MUST have both resume and job description
      if (!hasResume || !hasJobDescription) {
        console.error('CRITICAL ERROR: HR screen requires both resume and job description!')
        console.error('  - Has resume:', hasResume)
        console.error('  - Has job description:', hasJobDescription)
        return NextResponse.json(
          { error: 'HR screen interview requires both resume and job description to be uploaded.' },
          { status: 400 }
        )
      }
      
      let dataSection = `=== CANDIDATE INFORMATION - READ THIS FIRST ===

CANDIDATE'S RESUME:
${interviewData.resume_text}

JOB DESCRIPTION:
${interviewData.job_description_text}

${websiteContent ? `COMPANY WEBSITE CONTENT:
${websiteContent}
` : `COMPANY WEBSITE: ${interviewData.company_website || 'Not provided'}
`}

=== END CANDIDATE INFORMATION ===

`
      
      // Validate data section was built correctly
      if (!dataSection.includes(interviewData.resume_text.substring(0, 50))) {
        console.error('CRITICAL ERROR: Resume text not properly included in data section!')
        return NextResponse.json(
          { error: 'Failed to include resume in system prompt' },
          { status: 500 }
        )
      }
      
      if (!dataSection.includes(interviewData.job_description_text.substring(0, 50))) {
        console.error('CRITICAL ERROR: Job description text not properly included in data section!')
        return NextResponse.json(
          { error: 'Failed to include job description in system prompt' },
          { status: 500 }
        )
      }
      
      // Build system prompt using HR screen module
      systemPrompt = buildHrScreenPrompt({
        dataSection,
        conversationContext,
        phaseInstructions,
      })
    } else {
      // OTHER STAGES - Use stage-specific prompt modules
      // Build data section with candidate materials
      const stageDataSection = `=== CANDIDATE INFORMATION - READ THIS FIRST ===

CANDIDATE'S RESUME:
${interviewData.resume_text || 'Not provided'}

JOB DESCRIPTION:
${interviewData.job_description_text || 'Not provided'}

${websiteContent ? `COMPANY WEBSITE CONTENT:
${websiteContent}
` : `COMPANY WEBSITE: ${interviewData.company_website || 'Not provided'}
`}

=== END CANDIDATE INFORMATION ===

`

      // Build conversation context from prior rounds
      const conversationContext = hrScreenContext
        ? `\nPRIOR ROUND CONTEXT:\n${hrScreenContext}`
        : ''

      // Build dynamic phase instructions based on asked questions
      const askedQuestionsList = askedQuestions.length > 0
        ? askedQuestions.map((q: string) => (q.trim().length > 100 ? q.trim().substring(0, 100) + '...' : q.trim()))
        : transcript.filter((msg: string) => typeof msg === 'string' && msg.startsWith('Interviewer:')).map((msg: string) => {
            const q = msg.replace('Interviewer:', '').trim()
            return q.length > 100 ? q.substring(0, 100) + '...' : q
          })
      const askedQuestionsCount = askedQuestionsList.length
      const askedQuestionsPreview = askedQuestionsList.slice(-8)

      let phaseInstructions = ''

      if (stage === 'hiring_manager') {
        const hasAskedTechnicalDeepDive = askedQuestionsPreview.some((q: string) =>
          q.toLowerCase().includes('walk me through') ||
          q.toLowerCase().includes('most complex') ||
          q.toLowerCase().includes('technically challenging')
        )
        const hasAskedBehavioralSTAR = askedQuestionsPreview.some((q: string) =>
          q.toLowerCase().includes('tell me about a time') ||
          q.toLowerCase().includes('describe a situation') ||
          q.toLowerCase().includes('give me an example')
        )
        const hasAskedProblemSolving = askedQuestionsPreview.some((q: string) =>
          q.toLowerCase().includes('how would you') ||
          q.toLowerCase().includes('what would you do') ||
          q.toLowerCase().includes('approach')
        )
        const hasAskedAboutFailures = askedQuestionsPreview.some((q: string) =>
          q.toLowerCase().includes('failed') ||
          q.toLowerCase().includes("didn't work") ||
          q.toLowerCase().includes('mistake') ||
          q.toLowerCase().includes('challenge')
        )
        phaseInstructions = `
HIRING MANAGER INTERVIEW - CURRENT STATE:

Questions asked so far: ${askedQuestionsCount}/8 target

QUESTION MIX (ensure variety):
${!hasAskedTechnicalDeepDive ? '- NEEDED: Technical/Project Deep-Dive' : '- Already asked technical deep-dive'}
${!hasAskedBehavioralSTAR ? '- NEEDED: Behavioral STAR Question' : '- Already asked behavioral question'}
${!hasAskedProblemSolving ? '- NEEDED: Problem-Solving/Situational' : '- Already asked problem-solving question'}
${!hasAskedAboutFailures ? '- NEEDED: Failure/Learning Question' : '- Already asked about failures/challenges'}

${askedQuestionsCount === 0 ? 'Start with a warm-up: technical deep-dive on their most relevant project.' :
  askedQuestionsCount < 3 ? 'Ask core competency questions (technical OR behavioral).' :
  askedQuestionsCount < 6 ? 'Go deeper: follow-ups and challenging scenarios.' :
  'Wrapping up: ask if they have questions, then close.'}
`
      } else if (stage === 'culture_fit') {
        const hasAskedWorkStyle = askedQuestionsPreview.some((q: string) =>
          q.toLowerCase().includes('work style') ||
          q.toLowerCase().includes('prefer to work') ||
          q.toLowerCase().includes('remote') ||
          q.toLowerCase().includes('day-to-day')
        )
        const hasAskedTeamDynamics = askedQuestionsPreview.some((q: string) =>
          q.toLowerCase().includes('team') ||
          q.toLowerCase().includes('collaborate') ||
          q.toLowerCase().includes('disagree')
        )
        const hasAskedFeedback = askedQuestionsPreview.some((q: string) =>
          q.toLowerCase().includes('feedback') ||
          q.toLowerCase().includes('criticism') ||
          q.toLowerCase().includes('constructive')
        )
        const hasAskedConflict = askedQuestionsPreview.some((q: string) =>
          q.toLowerCase().includes('conflict') ||
          q.toLowerCase().includes('disagreement') ||
          q.toLowerCase().includes('difficult colleague')
        )
        phaseInstructions = `
CULTURE FIT INTERVIEW - CURRENT STATE:

Questions asked so far: ${askedQuestionsCount}/8 target

TOPIC COVERAGE:
${!hasAskedWorkStyle ? '- NEEDED: Work Style & Preferences' : '- Already covered work style'}
${!hasAskedTeamDynamics ? '- NEEDED: Team Dynamics & Collaboration' : '- Already covered team dynamics'}
${!hasAskedFeedback ? '- NEEDED: Giving/Receiving Feedback' : '- Already covered feedback'}
${!hasAskedConflict ? '- NEEDED: Conflict Resolution' : '- Already covered conflict'}

${askedQuestionsCount === 0 ? 'Start warm: ask about their ideal work environment or best team experience.' :
  askedQuestionsCount < 3 ? 'Explore their collaboration and communication style.' :
  askedQuestionsCount < 6 ? 'Go deeper on dynamics: feedback, conflict, adaptability.' :
  'Wrapping up: ask what questions they have about the team, then close warmly.'}
`
      } else if (stage === 'final') {
        const hasAskedStrategic = askedQuestionsPreview.some((q: string) =>
          q.toLowerCase().includes('strategy') ||
          q.toLowerCase().includes('vision') ||
          q.toLowerCase().includes('industry') ||
          q.toLowerCase().includes('direction')
        )
        const hasAskedLeadership = askedQuestionsPreview.some((q: string) =>
          q.toLowerCase().includes('lead') ||
          q.toLowerCase().includes('team') ||
          q.toLowerCase().includes('scale') ||
          q.toLowerCase().includes('build')
        )
        const hasAskedDecisionMaking = askedQuestionsPreview.some((q: string) =>
          q.toLowerCase().includes('decision') ||
          q.toLowerCase().includes('tradeoff') ||
          q.toLowerCase().includes('ambiguous') ||
          q.toLowerCase().includes('stakes')
        )
        phaseInstructions = `
FINAL ROUND INTERVIEW - CURRENT STATE:

Questions asked so far: ${askedQuestionsCount}/7 target

TOPIC COVERAGE:
${!hasAskedStrategic ? '- NEEDED: Strategic Vision & Industry Thinking' : '- Already covered strategic vision'}
${!hasAskedLeadership ? '- NEEDED: Leadership Philosophy & Team Building' : '- Already covered leadership'}
${!hasAskedDecisionMaking ? '- NEEDED: High-Stakes Decision-Making' : '- Already covered decision-making'}

${askedQuestionsCount === 0 ? 'Start with a strategic question: how they think about the industry or what they would focus on first.' :
  askedQuestionsCount < 3 ? 'Explore leadership and cross-functional impact.' :
  askedQuestionsCount < 5 ? 'Go deeper: probe decision-making and close any gaps from prior rounds.' :
  'Wrapping up: sell the opportunity, ask their questions, close strong.'}
`
      }

      // Use stage-specific prompt module
      const stagePromptBuilders: Record<string, typeof buildHiringManagerPrompt> = {
        hiring_manager: buildHiringManagerPrompt,
        culture_fit: buildCultureFitPrompt,
        final: buildFinalPrompt,
      }

      const buildStagePrompt = stagePromptBuilders[stage]
      if (buildStagePrompt) {
        systemPrompt = buildStagePrompt({
          dataSection: stageDataSection,
          conversationContext,
          phaseInstructions,
        })
      } else {
        // Fallback for unknown stages
        systemPrompt = `You are conducting a job interview.\n\n${stageDataSection}\n\nKeep responses concise and natural for voice conversation.`
      }
    }
    
    const messages: OpenAI.Chat.Completions.ChatCompletionMessageParam[] = [
      {
        role: 'system',
        content: systemPrompt,
      },
      ...transcript.map((msg: string) => ({
        role: msg.startsWith('You:') ? 'user' : 'assistant',
        content: msg.replace(/^(You:|Interviewer:)\s*/, ''),
      })),
      {
        role: 'user',
        content: userMessage,
      },
    ]

    // Generate response using ChatGPT (using gpt-4o for natural conversation)
    // Get current phase for logging
    const currentPhaseForPrompt = nextConversationPhase || conversationPhase || 'screening'

    const completion = await openai.chat.completions.create({
      model: 'gpt-4o', // Upgraded from gpt-4o-mini for better conversation flow
      messages,
      temperature: 0.75, // Natural variation for conversational flow
      max_tokens: 200, // Allow complete thoughts and natural responses
      // Removed penalties to allow natural conversation
    })
    
    const assistantMessage = completion.choices[0]?.message?.content || 'I see. Can you tell me more?'
    
    // Simple logging only - NO retry/validation loop
    if (stage === 'hr_screen' && currentPhaseForPrompt === 'screening') {
      const wordCount = assistantMessage.split(/\s+/).length
      if (wordCount > 50) {
        console.warn(`Response longer than ideal (${wordCount} words) - target is 15-35 words`)
      }
    }

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

    // Simple logic: after a few exchanges, move to next stage
    // In production, use more sophisticated logic
    const messageCount = transcript.length
    if (stage === 'hr_screen' && messageCount >= 6) {
      nextStage = 'hiring_manager'
    } else if (stage === 'hiring_manager' && messageCount >= 8) {
      nextStage = 'culture_fit'
    } else if (stage === 'culture_fit' && messageCount >= 8) {
      nextStage = 'final'
    } else if (stage === 'final' && messageCount >= 7) {
      // Check if assistant asked the final question
      if (assistantMessage.toLowerCase().includes('questions for') || assistantMessage.toLowerCase().includes('next steps')) {
        complete = true
      }
    }

    // For HR screen: Build structured transcript with question tracking
    let structuredTranscript = null
    let questionId = null
    if (stage === 'hr_screen' && sessionId) {
      // Get structured transcript using helper
      let structuredTranscriptData = await getStructuredTranscript(sessionId)
      
      // Calculate timestamp (relative to interview start)
      const startTime = new Date(structuredTranscriptData.start_time)
      const currentTime = new Date()
      const elapsedSeconds = Math.floor((currentTime.getTime() - startTime.getTime()) / 1000)
      const minutes = Math.floor(elapsedSeconds / 60)
      const seconds = elapsedSeconds % 60
      const timestamp = `${minutes}:${seconds.toString().padStart(2, '0')}`
      
      // Add user message to structured transcript using helper
      await appendMessage({
        sessionId,
        speaker: 'candidate',
        text: userMessage,
        timestamp,
      })
      
      // Get updated transcript after adding candidate message (needed for accurate question ID)
      structuredTranscriptData = await getStructuredTranscript(sessionId)
      
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
        // Get next question ID using helper (with updated transcript that includes candidate message)
        questionId = getNextQuestionId(structuredTranscriptData)
        
        // Determine assessment areas based on question content and phase
        const assessmentAreas: string[] = []
        const currentPhase = nextConversationPhase || conversationPhase || 'screening'
        
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
        
        // Add question using helper
        await appendQuestion({
          sessionId,
          questionId,
          question: assistantMessage,
          assessmentAreas,
          timestamp,
        })
        
        // Add interviewer message with question_id using helper
        await appendMessage({
          sessionId,
          speaker: 'interviewer',
          text: assistantMessage,
          questionId,
          timestamp,
        })

        // Call observer agent (fire-and-forget, don't block interview flow)
        recordTurn({
          sessionId,
          questionId,
          question: assistantMessage,
          answer: userMessage,
          timestamps: {
            start: timestamp, // Approximate - could be improved with actual timestamps
            end: timestamp,
          },
          stage,
        }).catch(err => {
          console.error('Observer failed (non-blocking):', err)
        })
      } else {
        // Not a question, just add message without question_id
        await appendMessage({
          sessionId,
          speaker: 'interviewer',
          text: assistantMessage,
          timestamp,
        })
      }
      
      // Get updated structured transcript for response
      structuredTranscript = await getStructuredTranscript(sessionId)
    }

    // Update plain text transcript in database (for backwards compatibility)
    // Note: structured transcript is already updated by helper functions
    if (sessionId) {
      try {
        // Fetch existing transcript from database first (don't rely on frontend state)
        const { data: existingSession, error: fetchError } = await supabaseAdmin
          .from('interview_sessions')
          .select('transcript')
          .eq('id', sessionId)
          .maybeSingle() // Use maybeSingle() to handle missing sessions gracefully
        
        if (fetchError) {
          console.error('Error fetching existing transcript:', fetchError)
        }
        
        const existingTranscript = existingSession?.transcript || ''
        const existingLines = existingTranscript ? existingTranscript.split('\n').filter((line: string) => line.trim()) : []
        
        // Append new messages to existing transcript
        const updatedTranscript = [...existingLines, `You: ${userMessage}`, `Interviewer: ${assistantMessage}`].join('\n')
        
        // Update transcript in database with error handling
        const { error: updateError } = await supabaseAdmin
          .from('interview_sessions')
          .update({ transcript: updatedTranscript })
          .eq('id', sessionId)
        
        if (updateError) {
          console.error('CRITICAL: Failed to save transcript to database:', updateError)
          console.error('  - SessionId:', sessionId)
          console.error('  - Transcript length:', updatedTranscript.length)
          console.error('  - Update error details:', updateError.message)
        }
      } catch (error) {
        console.error('CRITICAL: Exception while saving transcript:', error)
        // Don't throw - continue with response even if transcript save fails
      }
    } else {
      console.warn('No sessionId provided - cannot save transcript')
    }

    // For HR screen: Determine if we need to advance conversation phase based on AI response
    let updatedConversationPhase = nextConversationPhase
    if (stage === 'hr_screen' && nextConversationPhase) {
      const assistantLower = assistantMessage.toLowerCase()
      
      // Check if AI moved to next phase based on its response
      if (nextConversationPhase === 'structure_overview' && assistantLower.includes('does that sound good')) {
        // AI asked for confirmation, wait for user response (stay in structure_overview)
        updatedConversationPhase = 'structure_overview'
      } else if (nextConversationPhase === 'company_intro' && (assistantLower.includes('company') || assistantLower.includes('we are') || assistantLower.includes('our mission') || assistantLower.includes('founded'))) {
        // AI shared company info, next response should be job overview
        updatedConversationPhase = 'job_overview'
      } else if (nextConversationPhase === 'job_overview' && (assistantLower.includes('position') || assistantLower.includes('role') || assistantLower.includes('this job') || assistantLower.includes('responsibilities'))) {
        // AI shared job info, next should be screening
        updatedConversationPhase = 'screening'
      } else if (nextConversationPhase === 'screening' && (assistantLower.includes('questions for') || assistantLower.includes('anything else') || assistantLower.includes('any questions'))) {
        // AI is wrapping up, move to Q&A
        updatedConversationPhase = 'q_and_a'
      } else if (nextConversationPhase === 'q_and_a' && (assistantLower.includes('schedule') || assistantLower.includes('hiring manager') || assistantLower.includes('thanks for your time'))) {
        // AI is closing
        updatedConversationPhase = 'closing'
      }
    }
    
    return NextResponse.json({
      userMessage,
      assistantMessage: `Interviewer: ${assistantMessage}`,
      audioBase64, // Base64 encoded MP3 audio
      nextStage,
      complete,
      conversationPhase: stage === 'hr_screen' ? updatedConversationPhase : null, // Only for HR screen
      questionId: stage === 'hr_screen' ? questionId : null, // Question ID for HR screen questions
    })
  } catch (error) {
    console.error('Error processing voice:', error)
    return NextResponse.json(
      { error: 'Failed to process voice input' },
      { status: 500 }
    )
  }
}

