// API route to handle practice mode for specific questions
import { NextRequest, NextResponse } from 'next/server'
import { supabase, supabaseAdmin } from '@/lib/supabase'
import OpenAI from 'openai'

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
})

export async function POST(request: NextRequest) {
  try {
    // Check if this is a FormData request (voice) or JSON request (text)
    const contentType = request.headers.get('content-type') || ''
    let sessionId: string
    let questionId: string
    let userResponse: string | null = null
    let audioFile: File | null = null
    let action: string | null = null
    let question: string | null = null

    let stage: string | null = null

    if (contentType.includes('multipart/form-data')) {
      // Voice mode - FormData
      const formData = await request.formData()
      audioFile = formData.get('audio') as File
      sessionId = formData.get('sessionId') as string
      questionId = formData.get('questionId') as string
      question = formData.get('question') as string
      stage = formData.get('stage') as string
    } else {
      // Text mode or special actions - JSON
      const body = await request.json()
      sessionId = body.sessionId
      questionId = body.questionId
      userResponse = body.userResponse
      action = body.action
      question = body.question
      stage = body.stage
    }

    // Handle getting question audio (TTS)
    if (action === 'get_question_audio' && question) {
      try {
        const mp3 = await openai.audio.speech.create({
          model: 'tts-1',
          voice: 'alloy',
          input: question,
        })

        const buffer = Buffer.from(await mp3.arrayBuffer())
        const audioBase64 = buffer.toString('base64')

        return NextResponse.json({
          success: true,
          questionAudio: audioBase64,
        })
      } catch (error) {
        console.error('Error generating question audio:', error)
        return NextResponse.json(
          { error: 'Failed to generate question audio' },
          { status: 500 }
        )
      }
    }

    if (!sessionId || !questionId) {
      return NextResponse.json(
        { error: 'Missing sessionId or questionId' },
        { status: 400 }
      )
    }

    // If audio file provided, transcribe it first
    if (audioFile) {
      const transcription = await openai.audio.transcriptions.create({
        file: audioFile,
        model: 'whisper-1',
      })
      userResponse = transcription.text
    }

    if (!userResponse) {
      return NextResponse.json(
        { error: 'Missing userResponse (text or audio)' },
        { status: 400 }
      )
    }

    // Get the structured transcript, observer notes, and feedback to find practice recommendations
    const { data: sessionData, error: sessionError } = await supabaseAdmin
      .from('interview_sessions')
      .select('transcript_structured, observer_notes, user_interview_data_id, stage')
      .eq('id', sessionId)
      .single()
    
    // Get feedback to access practice queue from full_rubric
    const { data: feedbackData } = await supabaseAdmin
      .from('interview_feedback')
      .select('full_rubric')
      .eq('interview_session_id', sessionId)
      .maybeSingle()

    if (sessionError || !sessionData) {
      return NextResponse.json(
        { error: 'Interview session not found' },
        { status: 404 }
      )
    }

    // Use stage from request body if provided, otherwise fall back to session stage
    const effectiveStage = stage || sessionData.stage || 'hr_screen'

    const structuredTranscript = sessionData.transcript_structured
    if (!structuredTranscript || !structuredTranscript.questions_asked) {
      return NextResponse.json(
        { error: 'Structured transcript not found' },
        { status: 404 }
      )
    }

    // Find the question object from transcript (use question text from formData if provided)
    let questionText = question // Use question text from formData if available
    let questionObj = null
    
    if (structuredTranscript.questions_asked) {
      questionObj = structuredTranscript.questions_asked.find((q: any) => q.id === questionId)
      if (questionObj && !questionText) {
        questionText = questionObj.question
      }
    }
    
    if (!questionText) {
      return NextResponse.json(
        { error: 'Question not found' },
        { status: 404 }
      )
    }

    // Get the original answer from transcript if available
    let originalAnswer = null
    if (structuredTranscript.messages) {
      const questionMessage = structuredTranscript.messages.find((m: any) => m.question_id === questionId)
      if (questionMessage) {
        // Find the next candidate message after this question
        const questionIndex = structuredTranscript.messages.findIndex((m: any) => m.question_id === questionId)
        if (questionIndex >= 0 && questionIndex < structuredTranscript.messages.length - 1) {
          const nextMessage = structuredTranscript.messages[questionIndex + 1]
          if (nextMessage.speaker === 'candidate') {
            originalAnswer = nextMessage.text
          }
        }
      }
    }

    // Get job description and resume for context
    let jobDescription = ''
    let resume = ''
    if (sessionData.user_interview_data_id) {
      const { data: interviewData } = await supabaseAdmin
        .from('user_interview_data')
        .select('job_description_text, resume_text')
        .eq('id', sessionData.user_interview_data_id)
        .single()

      if (interviewData) {
        jobDescription = interviewData.job_description_text || ''
        resume = interviewData.resume_text || ''
      }
    }

    // Determine which assessment area this question targets
    const assessmentAreas = questionObj?.assessment_areas || []
    const primaryArea = assessmentAreas[0] || 'answer_structure'

    // Stage-specific criteria context for grading
    const stageCriteriaContext: Record<string, string> = {
      hr_screen: `STAGE: HR Screen
CRITERIA TO EVALUATE AGAINST (traditional HR criteria):
- Communication Skills: clarity, articulation, professional language
- Relevant Experience: alignment of background with role requirements
- Cultural Fit Indicators: enthusiasm, values alignment, team orientation
- Problem-Solving Approach: analytical thinking, structured responses
- Motivation & Interest: genuine interest in the role and company
- Professionalism: demeanor, preparation, self-awareness
- Overall Impression: confidence, likability, readiness to advance`,

      hiring_manager: `STAGE: Hiring Manager Interview
CRITERIA TO EVALUATE AGAINST (hiring manager criteria + role-specific):
Universal criteria:
- Technical/Functional Competency: depth of domain expertise
- Problem-Solving & Analytical Ability: structured thinking, creative solutions
- Communication & Influence: persuasion, stakeholder management
- Ownership & Accountability: initiative, responsibility, follow-through
- Adaptability & Learning Agility: flexibility, growth mindset
- Collaboration & Team Dynamics: cross-functional work, team contribution
Also evaluate against role-specific criteria based on the job description.`,

      culture_fit: `STAGE: Culture Fit Interview
CRITERIA TO EVALUATE AGAINST (culture fit criteria):
- Teamwork & Collaboration: working effectively with others, team dynamics
- Communication Style: interpersonal skills, active listening, empathy
- Values Alignment: alignment with company mission and values
- Adaptability: handling change, ambiguity, new environments
- Feedback & Growth Mindset: receptiveness to feedback, continuous improvement
- Conflict Resolution: handling disagreements, navigating difficult situations`,

      final: `STAGE: Final Round Interview
CRITERIA TO EVALUATE AGAINST (final round criteria):
- Strategic Thinking: big-picture vision, long-term planning
- Leadership Potential: inspiring others, decision ownership
- Decision-Making Under Ambiguity: judgment with incomplete information
- Cross-Functional Awareness: understanding of broader business context
- Mission & Vision Alignment: connection to company direction
- Executive Presence: composure, confidence, gravitas`,
    }

    const criteriaContext = stageCriteriaContext[effectiveStage] || stageCriteriaContext['hr_screen']

    // Build focused feedback prompt with scoring
    const systemPrompt = `You are an interview coach providing focused feedback on a specific answer and assigning a score.

${criteriaContext}

CONTEXT:
- Job Description: ${jobDescription.substring(0, 1000)}${jobDescription.length > 1000 ? '...' : ''}
- Candidate's Resume: ${resume.substring(0, 1000)}${resume.length > 1000 ? '...' : ''}

ORIGINAL QUESTION:
"${questionText}"

${originalAnswer ? `ORIGINAL ANSWER (for comparison):
"${originalAnswer}"
` : ''}

PRACTICE ANSWER:
"${userResponse}"

Your task is to provide focused, actionable feedback on this specific answer. Focus on the assessment area: ${primaryArea}.

You MUST respond in the following JSON format (no markdown, just raw JSON):
{
  "feedback": "Your detailed feedback here (what they did well, what to improve, specific suggestions${originalAnswer ? ', comparison with original answer' : ''}). Keep it concise and actionable.",
  "score": <number from 1 to 10>
}

Scoring guide:
- 1-3: Poor answer, misses key criteria, lacks substance
- 4-6: Adequate but needs significant improvement
- 7-8: Good answer, meets criteria with minor areas to refine
- 9-10: Excellent answer, strong demonstration of the criteria`

    // Generate feedback with scoring
    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content: systemPrompt,
        },
        {
          role: 'user',
          content: `Please evaluate this practice answer and provide feedback with a score.`,
        },
      ],
      temperature: 0.5,
      max_tokens: 500,
    })

    const rawContent = completion.choices[0]?.message?.content || ''

    // Parse the JSON response
    let feedback = 'No feedback available.'
    let score = 5
    try {
      // Try to extract JSON from the response (handle potential markdown wrapping)
      const jsonMatch = rawContent.match(/\{[\s\S]*\}/)
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0])
        feedback = parsed.feedback || feedback
        score = typeof parsed.score === 'number' ? Math.min(10, Math.max(1, parsed.score)) : 5
      } else {
        // Fallback: use raw content as feedback
        feedback = rawContent
      }
    } catch (parseError) {
      console.error('Error parsing practice feedback JSON:', parseError)
      feedback = rawContent
    }

    const passed = score >= 7

    // Generate TTS for feedback
    let feedbackAudio = null
    try {
      const mp3 = await openai.audio.speech.create({
        model: 'tts-1',
        voice: 'alloy',
        input: feedback,
      })

      const buffer = Buffer.from(await mp3.arrayBuffer())
      feedbackAudio = buffer.toString('base64')
    } catch (error) {
      console.error('Error generating feedback audio:', error)
      // Continue without audio if TTS fails
    }

    return NextResponse.json({
      success: true,
      question: questionText,
      feedback: feedback,
      audioFeedback: feedbackAudio,
      feedbackAudio: feedbackAudio, // Keep backward compat
      originalAnswer: originalAnswer,
      practiceAnswer: userResponse, // Include the transcribed/typed response
      assessmentArea: primaryArea,
      passed: passed,
      score: score,
      stage: effectiveStage,
    })
  } catch (error) {
    console.error('Error in practice mode:', error)
    return NextResponse.json(
      { error: 'Failed to process practice answer' },
      { status: 500 }
    )
  }
}

