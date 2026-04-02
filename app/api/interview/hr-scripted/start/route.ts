import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { appendMessage, appendQuestion } from '@/lib/interview-session'
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'
import {
  buildPersonalizedQuestions,
  buildInitialHrState,
  buildOpeningLine,
  getAllPromptTexts,
  extractCompanyName,
  extractRoleTitle,
} from '@/lib/hr-screen-script'
import { getOrCreateCachedSpeech } from '@/lib/interview-audio'

export async function POST(request: NextRequest) {
  try {
    const { sessionId, hrCompleted } = await request.json()

    if (!sessionId) {
      return NextResponse.json({ error: 'Missing sessionId' }, { status: 400 })
    }

    if (hrCompleted) {
      const supabaseAuth = createRouteHandlerClient({ cookies })
      const { data: { session: authSession } } = await supabaseAuth.auth.getSession()

      if (!authSession) {
        return NextResponse.json(
          { error: 'You\'ve used your free HR screen. Create an account to get 1 free retake and access more stages.', code: 'HR_LIMIT_REACHED' },
          { status: 403 }
        )
      }

      const { data: profile } = await supabaseAdmin
        .from('user_profiles')
        .select('free_hr_retakes_used')
        .eq('id', authSession.user.id)
        .single()

      if (profile && profile.free_hr_retakes_used >= 1) {
        return NextResponse.json(
          { error: 'You\'ve used your free HR screen retake. Purchase additional access to continue.', code: 'HR_RETAKE_USED' },
          { status: 403 }
        )
      }
    }

    const { data: sessionData, error: sessionError } = await supabaseAdmin
      .from('interview_sessions')
      .select('user_interview_data_id, observer_notes')
      .eq('id', sessionId)
      .single()

    if (sessionError || !sessionData) {
      return NextResponse.json({ error: 'Interview session not found' }, { status: 404 })
    }

    let resumeText = ''
    let jobDescriptionText = ''
    let companyWebsite = ''

    if (sessionData.user_interview_data_id) {
      const { data: interviewData } = await supabaseAdmin
        .from('user_interview_data')
        .select('resume_text, job_description_text, company_website')
        .eq('id', sessionData.user_interview_data_id)
        .single()

      resumeText = interviewData?.resume_text || ''
      jobDescriptionText = interviewData?.job_description_text || ''
      companyWebsite = interviewData?.company_website || ''
    }

    const companyName = extractCompanyName(companyWebsite)
    const roleTitle = extractRoleTitle(jobDescriptionText)
    const personalizedQuestions = buildPersonalizedQuestions(resumeText, roleTitle)

    const state = buildInitialHrState({
      companyName,
      roleTitle,
      personalizedQuestions,
    })

    const openingText = buildOpeningLine(state)
    const openingPrompt = state.prompts[0]

    const promptTexts = getAllPromptTexts(state)
    const prewarmed = await Promise.all(
      promptTexts.map((text) =>
        getOrCreateCachedSpeech({
          text,
          requireElevenLabs: true,
        })
      )
    )
    const audioBase64 = prewarmed[0]

    if (!audioBase64 || prewarmed.some((item) => !item)) {
      return NextResponse.json({ error: 'Failed to generate scripted HR audio' }, { status: 500 })
    }

    await appendQuestion({
      sessionId,
      questionId: openingPrompt?.questionId || 'q1',
      question: openingText,
      assessmentAreas: ['answer_structure', 'pace_and_flow'],
      timestamp: '0:00',
    })

    await appendMessage({
      sessionId,
      speaker: 'interviewer',
      text: openingText,
      questionId: openingPrompt?.questionId || 'q1',
      timestamp: '0:00',
    })

    await supabaseAdmin
      .from('interview_sessions')
      .update({
        transcript: `Interviewer: ${openingText}`,
        observer_notes: {
          ...(sessionData.observer_notes && typeof sessionData.observer_notes === 'object' ? sessionData.observer_notes : {}),
          hr_script_state: state,
        },
      })
      .eq('id', sessionId)

    return NextResponse.json({
      message: openingText,
      audioBase64,
      conversationPhase: 'screening',
      scriptedMode: true,
    })
  } catch (error) {
    console.error('Error starting scripted HR interview:', error)
    return NextResponse.json({ error: 'Failed to start scripted HR interview' }, { status: 500 })
  }
}
