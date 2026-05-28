import { supabaseAdmin } from './supabase'

interface RelatedHrScreenFeedbackOptions {
  interviewDataId?: string | null
  userId?: string | null
}

export interface RelatedHrScreenFeedback {
  session_id: string
  overall_score: number | null
  strengths: string[]
  weaknesses: string[]
  suggestions: string[]
  detailed_feedback?: string | null
  full_rubric?: any
  hr_screen_six_areas?: any
}

export async function fetchRelatedHrScreenFeedback({
  interviewDataId,
  userId,
}: RelatedHrScreenFeedbackOptions): Promise<RelatedHrScreenFeedback | null> {
  if (!interviewDataId) {
    console.log('No interview data id available for related HR screen lookup')
    return null
  }

  let hrSessionQuery = supabaseAdmin
    .from('interview_sessions')
    .select('id')
    .eq('stage', 'hr_screen')
    .eq('status', 'completed')
    .eq('user_interview_data_id', interviewDataId)
    .order('completed_at', { ascending: false })
    .order('created_at', { ascending: false })
    .limit(1)

  if (userId) {
    hrSessionQuery = hrSessionQuery.eq('user_id', userId)
  }

  const { data: hrSessions, error: sessionError } = await hrSessionQuery

  if (sessionError) {
    console.error('Error fetching related HR screen session:', sessionError)
    return null
  }

  const hrSession = Array.isArray(hrSessions) ? hrSessions[0] : hrSessions
  if (!hrSession?.id) {
    console.log('No related completed HR screen found for interview data:', interviewDataId)
    return null
  }

  const { data: feedbackRows, error: feedbackError } = await supabaseAdmin
    .from('interview_feedback')
    .select('overall_score, strengths, weaknesses, suggestions, detailed_feedback, full_rubric, hr_screen_six_areas, created_at')
    .eq('interview_session_id', hrSession.id)
    .order('created_at', { ascending: false })
    .limit(1)

  if (feedbackError) {
    console.error('Error fetching related HR screen feedback:', feedbackError)
    return null
  }

  const feedback = Array.isArray(feedbackRows) ? feedbackRows[0] : feedbackRows
  if (!feedback) {
    console.log('Related HR screen has no feedback:', hrSession.id)
    return null
  }

  return {
    session_id: hrSession.id,
    overall_score: feedback.overall_score ?? null,
    strengths: Array.isArray(feedback.strengths) ? feedback.strengths : [],
    weaknesses: Array.isArray(feedback.weaknesses) ? feedback.weaknesses : [],
    suggestions: Array.isArray(feedback.suggestions) ? feedback.suggestions : [],
    detailed_feedback: feedback.detailed_feedback ?? null,
    full_rubric: feedback.full_rubric ?? null,
    hr_screen_six_areas: feedback.hr_screen_six_areas ?? feedback.full_rubric?.hr_screen_six_areas ?? null,
  }
}
