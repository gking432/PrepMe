import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'
import { gradeCombinedReport, StageFeedbackSummary } from '@/lib/claude-client'

export const dynamic = 'force-dynamic'

const STAGE_ORDER = ['hr_screen', 'hiring_manager', 'culture_fit', 'final']

export async function GET(request: NextRequest) {
  try {
    const supabase = createRouteHandlerClient({ cookies })
    const { data: { session } } = await supabase.auth.getSession()

    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const userId = session.user.id

    // Fetch all completed sessions for this user
    const { data: sessions, error: sessionsError } = await supabaseAdmin
      .from('interview_sessions')
      .select('id, stage, completed_at')
      .eq('user_id', userId)
      .eq('status', 'completed')
      .in('stage', STAGE_ORDER)
      .order('completed_at', { ascending: true })

    if (sessionsError) {
      console.error('Error fetching sessions:', sessionsError)
      return NextResponse.json({ error: 'Failed to fetch sessions' }, { status: 500 })
    }

    if (!sessions || sessions.length < 2) {
      return NextResponse.json(
        { error: 'Complete at least 2 interview stages to generate a combined report' },
        { status: 400 }
      )
    }

    // Fetch feedback for each session
    const stageFeedbacks: StageFeedbackSummary[] = []

    for (const sess of sessions) {
      const { data: feedbackRows } = await supabaseAdmin
        .from('interview_feedback')
        .select('overall_score, strengths, weaknesses, full_rubric')
        .eq('interview_session_id', sess.id)
        .order('created_at', { ascending: false })
        .limit(1)

      const fb = feedbackRows?.[0]
      if (!fb) continue

      const strengths = fb.strengths ||
        fb.full_rubric?.overall_assessment?.key_strengths || []
      const weaknesses = fb.weaknesses ||
        fb.full_rubric?.overall_assessment?.key_weaknesses || []
      const likelihood = fb.full_rubric?.overall_assessment?.likelihood_to_advance

      stageFeedbacks.push({
        stage: sess.stage,
        overall_score: fb.overall_score || fb.full_rubric?.overall_assessment?.overall_score || 0,
        strengths,
        weaknesses,
        likelihood_to_advance: likelihood,
      })
    }

    if (stageFeedbacks.length < 2) {
      return NextResponse.json(
        { error: 'Not enough feedback found. Complete more stages first.' },
        { status: 400 }
      )
    }

    // Fetch job title and company for context
    const { data: interviewData } = await supabaseAdmin
      .from('interview_sessions')
      .select('user_interview_data_id')
      .eq('user_id', userId)
      .order('completed_at', { ascending: false })
      .limit(1)
      .single()

    let jobTitle = 'the role'
    let companyName = 'the company'

    if (interviewData?.user_interview_data_id) {
      const { data: userData } = await supabaseAdmin
        .from('user_interview_data')
        .select('job_description, company_website')
        .eq('id', interviewData.user_interview_data_id)
        .single()

      if (userData?.job_description) {
        const titleMatch = userData.job_description.match(/(?:job title|title|position|role)[:\s]+([^\n]+)/i)
        if (titleMatch) jobTitle = titleMatch[1].trim()
      }
      if (userData?.company_website) {
        try {
          companyName = new URL(userData.company_website).hostname.replace('www.', '')
        } catch {
          companyName = userData.company_website
        }
      }
    }

    const report = await gradeCombinedReport(stageFeedbacks, jobTitle, companyName)

    return NextResponse.json({
      report,
      stages_included: stageFeedbacks.map(s => s.stage),
      generated_at: new Date().toISOString(),
    })
  } catch (error: any) {
    console.error('Error generating combined report:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to generate combined report' },
      { status: 500 }
    )
  }
}
