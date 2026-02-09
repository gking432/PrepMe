// Test endpoint to simulate interview completion and generate feedback
import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import OpenAI from 'openai'

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
})

export async function POST(request: NextRequest) {
  try {
    console.log('🧪 TEST: Starting feedback generation test...')

    // Create test interview data
    const testResume = `John Doe
Software Engineer
Email: john.doe@example.com
Phone: (555) 123-4567

EXPERIENCE:
Senior Software Engineer | Tech Corp | 2020 - Present
- Led development of microservices architecture serving 1M+ users
- Implemented CI/CD pipelines reducing deployment time by 60%
- Mentored team of 5 junior developers
- Technologies: Python, React, AWS, Docker, Kubernetes

Software Engineer | Startup Inc | 2018 - 2020
- Built RESTful APIs handling 100K+ requests per day
- Developed frontend components using React and TypeScript
- Collaborated with product team on feature specifications

EDUCATION:
BS Computer Science | State University | 2018

SKILLS:
Python, JavaScript, React, TypeScript, AWS, Docker, Kubernetes, PostgreSQL, MongoDB`

    const testJobDescription = `Company: Placon Corporation
Position: Digital Marketing Specialist

Placon Corporation is seeking a Digital Marketing Specialist to join our marketing team. We are a sustainable packaging company committed to innovation and environmental responsibility.

RESPONSIBILITIES:
- Develop and execute digital marketing campaigns across multiple channels
- Manage website content and optimize for SEO
- Create engaging content for social media platforms
- Analyze marketing metrics and provide insights
- Collaborate with cross-functional teams on marketing initiatives
- Manage email marketing campaigns and automation

REQUIREMENTS:
- 3+ years of experience in digital marketing
- Strong understanding of SEO, SEM, and social media marketing
- Experience with marketing analytics tools (Google Analytics, etc.)
- Excellent written and verbal communication skills
- Ability to work in a fast-paced environment
- Bachelor's degree in Marketing, Communications, or related field

PREFERRED:
- Experience with marketing automation platforms
- Knowledge of sustainable/green marketing practices
- Experience in B2B marketing`

    const testTranscript = `Interviewer: Great, so I thought I'd just give you a little information about the interview process and then we can get started with some questions. Does that sound good?

Candidate: That sounds great.

Interviewer: I'm glad to hear that! At Placon, we focus on sustainability and innovation in packaging. What interests you about the Digital Marketing Specialist position?

Candidate: I'm really interested in the sustainability aspect. I've been working in digital marketing for about 4 years now, and I'm looking to focus on one company rather than being spread across many smaller clients. I think my experience with SEO, social media campaigns, and content creation would be a great fit.

Interviewer: That makes sense! Can you tell me about a specific digital marketing campaign you've managed that you're particularly proud of?

Candidate: Sure! I worked on a campaign for a client where we revamped their onboarding process. We created a series of automated emails and improved their website's user experience. The campaign resulted in a 30% increase in customer retention and significantly improved their onboarding completion rate.

Interviewer: That sounds like a valuable experience! How do you approach measuring the success of your marketing campaigns?

Candidate: I always start by defining clear KPIs before launching any campaign. I use Google Analytics to track website traffic, conversion rates, and user behavior. For email campaigns, I monitor open rates, click-through rates, and conversion metrics. I also do A/B testing to optimize performance.

Interviewer: Perfect! I think we have everything we need. I'll get something scheduled with the hiring manager and we'll be in touch soon.`

    // For testing, try to get an existing user, but allow null for anonymous
    let userId: string | null = null
    
    try {
      const { data: testUser, error: listError } = await supabaseAdmin.auth.admin.listUsers()
      if (!listError && testUser?.users && testUser.users.length > 0) {
        userId = testUser.users[0].id
        console.log('✅ Using existing user:', userId)
      } else {
        console.log('No existing users found, using null (anonymous mode)')
        userId = null
      }
    } catch (error: any) {
      console.log('Could not get users (this is OK for testing), using null (anonymous mode):', error.message)
      userId = null
    }

    // Create test interview data (user_id can be null for anonymous)
    const { data: interviewData, error: dataError } = await supabaseAdmin
      .from('user_interview_data')
      .insert({
        user_id: userId, // Can be null for anonymous
        resume_text: testResume,
        job_description_text: testJobDescription,
        company_website: 'https://www.placon.com',
        updated_at: new Date().toISOString(),
      })
      .select()
      .single()

    if (dataError) {
      console.error('❌ Error creating interview data:', dataError)
      return NextResponse.json({ 
        error: 'Failed to create interview data', 
        details: dataError.message 
      }, { status: 500 })
    }

    console.log('✅ Created test interview data:', interviewData.id)

    // Create test interview session
    const { data: session, error: sessionError } = await supabaseAdmin
      .from('interview_sessions')
      .insert({
        user_id: userId,
        user_interview_data_id: interviewData.id,
        stage: 'hr_screen',
        status: 'completed',
        transcript: testTranscript,
        completed_at: new Date().toISOString(),
      })
      .select()
      .single()

    if (sessionError) {
      console.error('Error creating session:', sessionError)
      return NextResponse.json({ error: 'Failed to create session' }, { status: 500 })
    }

    console.log('✅ Created test interview session:', session.id)

    // Now call the feedback API logic directly
    const { data: sessionData } = await supabaseAdmin
      .from('interview_sessions')
      .select('user_interview_data_id, stage')
      .eq('id', session.id)
      .single()

    // Fetch job description and resume
    const { data: interviewDataFull } = await supabaseAdmin
      .from('user_interview_data')
      .select('job_description_text, resume_text')
      .eq('id', sessionData.user_interview_data_id)
      .single()

    const jobDescription = interviewDataFull?.job_description_text || ''
    const resume = interviewDataFull?.resume_text || ''

    // Fetch evaluation criteria (handle case where table doesn't exist yet)
    let criteria: any[] = []
    try {
      const { data: criteriaData, error: criteriaError } = await supabaseAdmin
        .from('feedback_evaluation_criteria')
        .select('*')
        .eq('is_active', true)
        .order('area_name')

      if (criteriaError) {
        console.error('Error loading criteria (table may not exist):', criteriaError)
        // Use default criteria if table doesn't exist
        criteria = [
          {
            assessment_area: 'job_alignment',
            area_name: 'Job Alignment',
            description: 'Assesses how well the candidate\'s responses align with the job requirements.',
            evaluation_guidelines: 'Evaluate based on relevance of experience to job requirements.',
            rubric: '10: Perfect alignment. 7-9: Good alignment. 4-6: Some gaps. 1-3: Poor alignment.',
            weight: 1.3
          },
          {
            assessment_area: 'communication',
            area_name: 'Communication',
            description: 'Evaluates the candidate\'s ability to communicate clearly.',
            evaluation_guidelines: 'Evaluate based on clarity, professionalism, and use of examples.',
            rubric: '10: Excellent. 7-9: Good. 4-6: Adequate. 1-3: Poor.',
            weight: 1.2
          }
        ]
      } else {
        criteria = criteriaData || []
      }
    } catch (error) {
      console.error('Error fetching criteria:', error)
      criteria = []
    }

    // Fetch stage-specific instructions (handle case where table doesn't exist)
    let stageInstructions: any = null
    try {
      const { data: stageData } = await supabaseAdmin
        .from('feedback_stage_instructions')
        .select('*')
        .eq('stage', 'hr_screen')
        .maybeSingle()
      stageInstructions = stageData
    } catch (error) {
      console.log('Stage instructions table may not exist, using defaults')
    }

    // Fetch global settings (handle case where table doesn't exist)
    let settings: any = {
      honesty_level: 'tough',
      evaluation_instructions: 'Provide honest, constructive feedback.',
      require_job_alignment: true,
      require_specific_examples: true,
    }
    try {
      const { data: settingsData } = await supabaseAdmin
        .from('feedback_evaluation_settings')
        .select('*')
        .limit(1)
        .maybeSingle()
      if (settingsData) {
        settings = settingsData
      }
    } catch (error) {
      console.log('Settings table may not exist, using defaults')
    }

    // Use stage-specific instructions if available
    const evaluationInstructions = stageInstructions?.evaluation_instructions || settings.evaluation_instructions

    // Build system prompt
    let systemPrompt = evaluationInstructions || 'You are a rigorous, honest interview evaluator.'
    
    if (stageInstructions) {
      systemPrompt += `\n\nINTERVIEW STAGE: ${sessionData.stage.replace('_', ' ').toUpperCase()}`
      if (stageInstructions.focus_areas && stageInstructions.focus_areas.length > 0) {
        systemPrompt += `\n\nFOCUS AREAS FOR THIS STAGE: ${stageInstructions.focus_areas.join(', ')}`
      }
    }

    systemPrompt += '\n\nYOUR EVALUATION APPROACH:'
    systemPrompt += `\n- Honesty Level: ${settings.honesty_level.toUpperCase()}`
    systemPrompt += `\n- ${settings.require_job_alignment ? 'MUST' : 'Should'} compare responses directly against job requirements`
    systemPrompt += `\n- ${settings.require_specific_examples ? 'MUST' : 'Should'} reference specific examples from the transcript`

    if (jobDescription) {
      systemPrompt += '\n\nJOB DESCRIPTION:'
      systemPrompt += `\n${jobDescription}`
      systemPrompt += '\n\nYou MUST evaluate how well the candidate\'s responses align with these requirements. Be specific about gaps.'
    }

    if (resume) {
      systemPrompt += '\n\nCANDIDATE RESUME:'
      systemPrompt += `\n${resume}`
      systemPrompt += '\n\nUse this to understand the candidate\'s background and evaluate if their interview responses are consistent with their experience.'
    }

    // Apply stage-specific weight overrides
    const criteriaWithWeights = criteria.map((criterion) => {
      let weight = criterion.weight || 1.0
      if (stageInstructions?.weight_overrides && stageInstructions.weight_overrides[criterion.assessment_area] !== undefined) {
        weight = stageInstructions.weight_overrides[criterion.assessment_area]
      }
      return { ...criterion, weight: weight }
    })

    if (criteriaWithWeights.length > 0) {
      systemPrompt += '\n\nASSESSMENT AREAS AND CRITERIA:'
      criteriaWithWeights.forEach((criterion) => {
        systemPrompt += `\n\n${criterion.area_name} (Weight: ${criterion.weight}):`
        systemPrompt += `\nDescription: ${criterion.description}`
        systemPrompt += `\nEvaluation Guidelines: ${criterion.evaluation_guidelines}`
        systemPrompt += `\nScoring Rubric: ${criterion.rubric}`
      })
    }

    systemPrompt += '\n\nYOUR RESPONSE FORMAT:'
    systemPrompt += '\nYou MUST respond with valid JSON in this exact format:'
    systemPrompt += '\n{'
    systemPrompt += '\n  "overall_score": <number 1-10>,'
    systemPrompt += '\n  "area_scores": {'
    criteria.forEach((criterion) => {
      systemPrompt += `\n    "${criterion.assessment_area}": <number 1-10>,`
    })
    systemPrompt += '\n  },'
    systemPrompt += '\n  "area_feedback": {'
    criteria.forEach((criterion) => {
      systemPrompt += `\n    "${criterion.assessment_area}": "<detailed feedback for this area, with specific examples from transcript>",`
    })
    systemPrompt += '\n  },'
    systemPrompt += '\n  "strengths": [<array of 3-5 key strengths with specific examples>],'
    systemPrompt += '\n  "weaknesses": [<array of 2-4 areas for improvement with specific examples>],'
    systemPrompt += '\n  "suggestions": [<array of actionable improvement suggestions>],'
    systemPrompt += '\n  "detailed_feedback": "<comprehensive overall feedback paragraph>"'
    systemPrompt += '\n}'

    systemPrompt += '\n\nCRITICAL INSTRUCTIONS:'
    systemPrompt += '\n- Be HONEST and DIRECT. Do not sugarcoat weaknesses.'
    systemPrompt += '\n- Reference SPECIFIC quotes or examples from the transcript.'
    systemPrompt += '\n- Compare responses to job requirements explicitly.'
    systemPrompt += '\n- If a candidate performed poorly, state it clearly with evidence.'
    systemPrompt += '\n- Balance honesty with constructive guidance - be tough but fair.'
    systemPrompt += '\n- Calculate overall_score as a weighted average of area_scores using the weights provided.'

    // Build user message
    const userMessage = `Please analyze this interview transcript and provide honest, job-specific feedback:\n\n${testTranscript}`

    console.log('🤖 Calling OpenAI to generate feedback...')

    // Generate feedback using ChatGPT
    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content: systemPrompt,
        },
        {
          role: 'user',
          content: userMessage,
        },
      ],
      temperature: 0.7,
    })

    const feedbackText = completion.choices[0]?.message?.content || '{}'
    
    // Parse JSON
    let feedback: any
    try {
      feedback = JSON.parse(feedbackText)
    } catch (parseError) {
      console.error('Failed to parse feedback JSON:', parseError)
      feedback = {
        overall_score: 5,
        area_scores: {},
        area_feedback: {},
        strengths: [],
        weaknesses: [],
        suggestions: [],
        detailed_feedback: feedbackText,
      }
    }

    // Ensure all required fields exist
    if (!feedback.area_scores) feedback.area_scores = {}
    if (!feedback.area_feedback) feedback.area_feedback = {}
    if (!feedback.strengths) feedback.strengths = []
    if (!feedback.weaknesses) feedback.weaknesses = []
    if (!feedback.suggestions) feedback.suggestions = []
    if (!feedback.detailed_feedback) feedback.detailed_feedback = ''

    // Calculate overall score
    if (!feedback.overall_score || Object.keys(feedback.area_scores).length > 0) {
      const totalWeight = criteriaWithWeights.reduce((sum, c) => sum + (c.weight || 1.0), 0)
      const weightedSum = criteriaWithWeights.reduce((sum, c) => {
        const score = feedback.area_scores[c.assessment_area] || 5
        return sum + (score * (c.weight || 1.0))
      }, 0)
      feedback.overall_score = totalWeight > 0 ? Math.round((weightedSum / totalWeight) * 10) / 10 : 5
    }

    // Save feedback to database
    const { data: savedFeedback, error: dbError } = await supabaseAdmin
      .from('interview_feedback')
      .insert({
        interview_session_id: session.id,
        overall_score: Math.round(feedback.overall_score),
        strengths: feedback.strengths || [],
        weaknesses: feedback.weaknesses || [],
        suggestions: feedback.suggestions || [],
        detailed_feedback: feedback.detailed_feedback || '',
        area_scores: feedback.area_scores || {},
        area_feedback: feedback.area_feedback || {},
      })
      .select()
      .single()

    if (dbError) {
      console.error('Error saving feedback:', dbError)
      return NextResponse.json(
        { error: 'Failed to save feedback', details: dbError.message },
        { status: 500 }
      )
    }

    console.log('✅ Feedback saved successfully:', savedFeedback?.id)

    return NextResponse.json({
      success: true,
      message: 'Test feedback generated successfully!',
      sessionId: session.id,
      feedback: {
        overall_score: Math.round(feedback.overall_score),
        area_scores: feedback.area_scores || {},
        area_feedback: feedback.area_feedback || {},
        strengths: feedback.strengths || [],
        weaknesses: feedback.weaknesses || [],
        suggestions: feedback.suggestions || [],
        detailed_feedback: feedback.detailed_feedback || '',
      },
    })
  } catch (error: any) {
    console.error('❌ Error in test feedback generation:', error)
    console.error('Error stack:', error.stack)
    console.error('Error name:', error.name)
    return NextResponse.json(
      { 
        error: 'Failed to generate test feedback', 
        details: error.message || String(error),
        name: error.name,
        // Only include stack in development
        ...(process.env.NODE_ENV === 'development' && { stack: error.stack })
      },
      { status: 500 }
    )
  }
}

