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

    if (contentType.includes('multipart/form-data')) {
      // Voice mode - FormData
      const formData = await request.formData()
      audioFile = formData.get('audio') as File
      sessionId = formData.get('sessionId') as string
      questionId = formData.get('questionId') as string
      question = formData.get('question') as string
    } else {
      // Text mode or special actions - JSON
      const body = await request.json()
      sessionId = body.sessionId
      questionId = body.questionId
      userResponse = body.userResponse
      action = body.action
      question = body.question
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

    if (sessionData.stage !== 'hr_screen') {
      return NextResponse.json(
        { error: 'Practice mode is only available for HR screen interviews' },
        { status: 400 }
      )
    }

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

    // Build focused feedback prompt
    const systemPrompt = `You are an interview coach providing focused feedback on a specific answer.

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

Provide:
1. What they did well in this answer
2. What could be improved
3. Specific suggestions for improvement
4. ${originalAnswer ? 'A brief comparison with their original answer' : ''}

Keep feedback concise (2-3 sentences each) and actionable.`

    // Generate feedback
    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content: systemPrompt,
        },
        {
          role: 'user',
          content: `Please provide focused feedback on this practice answer.`,
        },
      ],
      temperature: 0.7,
      max_tokens: 300,
    })

    const feedback = completion.choices[0]?.message?.content || 'No feedback available.'

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
      feedbackAudio: feedbackAudio,
      originalAnswer: originalAnswer,
      practiceAnswer: userResponse, // Include the transcribed/typed response
      assessmentArea: primaryArea,
    })
  } catch (error) {
    console.error('Error in practice mode:', error)
    return NextResponse.json(
      { error: 'Failed to process practice answer' },
      { status: 500 }
    )
  }
}

