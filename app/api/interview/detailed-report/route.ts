import { NextRequest, NextResponse } from 'next/server'
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'
import { gradeHrScreenWithRetry, GradingMaterials } from '@/lib/claude-client'
import { validateRubric } from '@/lib/rubric-validator'
import { supabaseAdmin } from '@/lib/supabase'
import { TEST_ALL_INTERVIEW_STAGES_UNLOCKED } from '@/lib/interview-stage-access'

function stringifyFeedbackItems(items: any): string[] {
  if (!Array.isArray(items)) return []
  return items
    .map((item) => {
      if (typeof item === 'string') return item
      if (item && typeof item === 'object') return item.title || item.description || item.feedback || item.criterion || ''
      return ''
    })
    .filter(Boolean)
}

function normalizeScore(value: any, fallback: any) {
  const raw = typeof value === 'number' ? value : Number.parseFloat(String(value ?? fallback ?? 0))
  if (!Number.isFinite(raw)) return 0
  return Math.max(0, Math.min(10, Math.round(raw > 10 ? raw / 10 : raw)))
}

export async function POST(request: NextRequest) {
  try {
    const supabase = createRouteHandlerClient({ cookies })
    const { data: { session } } = await supabase.auth.getSession()

    if (!session) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
    }

    const { sessionId } = await request.json() as { sessionId?: string }
    if (!sessionId) {
      return NextResponse.json({ error: 'sessionId is required' }, { status: 400 })
    }

    const { data: sessionRow, error: sessionError } = await supabaseAdmin
      .from('interview_sessions')
      .select(`
        id,
        user_id,
        stage,
        transcript,
        transcript_structured,
        observer_notes,
        duration_seconds,
        user_interview_data (
          resume_text,
          job_description_text,
          company_website
        )
      `)
      .eq('id', sessionId)
      .single()

    if (sessionError || !sessionRow) {
      return NextResponse.json({ error: 'Interview session not found' }, { status: 404 })
    }

    if (sessionRow.stage !== 'hr_screen') {
      return NextResponse.json({ error: 'Advanced report unlock is only for HR screen sessions.' }, { status: 400 })
    }

    if (sessionRow.user_id && sessionRow.user_id !== session.user.id) {
      return NextResponse.json({ error: 'You do not have access to this interview.' }, { status: 403 })
    }

    const { data: existingFeedback } = await supabaseAdmin
      .from('interview_feedback')
      .select('*')
      .eq('interview_session_id', sessionId)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle()

    if (existingFeedback?.full_rubric?.traditional_hr_criteria) {
      return NextResponse.json({
        success: true,
        alreadyGenerated: true,
        feedback: existingFeedback,
      })
    }

    const { data: reportPayments } = await supabaseAdmin
      .from('payment_transactions')
      .select('id, metadata')
      .eq('user_id', session.user.id)
      .eq('product_type', 'hr_detailed_report')
      .eq('status', 'completed')

    const hasPaidForThisReport = (reportPayments || []).some((payment: any) => {
      const metadata = payment?.metadata && typeof payment.metadata === 'object' ? payment.metadata : {}
      return metadata.session_id === sessionId
    })

    if (!TEST_ALL_INTERVIEW_STAGES_UNLOCKED && !hasPaidForThisReport) {
      return NextResponse.json({ error: 'Advanced report payment required' }, { status: 402 })
    }

    const interviewData = Array.isArray(sessionRow.user_interview_data)
      ? sessionRow.user_interview_data[0]
      : sessionRow.user_interview_data

    const gradingMaterials: GradingMaterials = {
      transcript: sessionRow.transcript || '',
      transcriptStructured: sessionRow.transcript_structured || null,
      observerNotes: sessionRow.observer_notes || {},
      resume: interviewData?.resume_text || '',
      jobDescription: interviewData?.job_description_text || '',
      companyWebsite: interviewData?.company_website || '',
      stage: 'hr_screen',
      forceFullReport: true,
      gradingInstructions: `You are an expert HR phone screen evaluator. Generate a detailed interviewer-style performance report for this completed HR screen. The report should feel like the structured evaluation an interviewer would fill out after the call: specific, evidence-backed, candid, and useful for deciding whether the candidate should advance.`,
    }

    const rubric = await gradeHrScreenWithRetry(gradingMaterials, 3)

    if (!validateRubric(rubric) || !rubric.hr_screen_six_areas) {
      console.error('Paid HR detailed report validation failed:', JSON.stringify(rubric).slice(0, 700))
      return NextResponse.json({ error: 'Generated report did not match the expected rubric shape.' }, { status: 500 })
    }

    const overallScore = normalizeScore(rubric.overall_assessment?.overall_score, existingFeedback?.overall_score)
    const payload = {
      interview_session_id: sessionId,
      overall_score: overallScore,
      strengths: stringifyFeedbackItems(rubric.overall_assessment?.key_strengths || existingFeedback?.strengths),
      weaknesses: stringifyFeedbackItems(rubric.overall_assessment?.key_weaknesses || existingFeedback?.weaknesses),
      suggestions: stringifyFeedbackItems(rubric.next_steps_preparation?.areas_to_study || existingFeedback?.suggestions),
      detailed_feedback: rubric.overall_assessment?.summary || existingFeedback?.detailed_feedback || '',
      area_scores: rubric.traditional_hr_criteria?.scores || existingFeedback?.area_scores || {},
      area_feedback: rubric.traditional_hr_criteria?.feedback || existingFeedback?.area_feedback || {},
      hr_screen_six_areas: rubric.hr_screen_six_areas || existingFeedback?.hr_screen_six_areas || {},
      full_rubric: {
        ...rubric,
        paid_unlock: {
          product_type: 'hr_detailed_report',
          generated_at: new Date().toISOString(),
        },
      },
    }

    const dbQuery = existingFeedback?.id
      ? supabaseAdmin.from('interview_feedback').update(payload).eq('id', existingFeedback.id).select().single()
      : supabaseAdmin.from('interview_feedback').insert(payload).select().single()

    const { data: savedFeedback, error: saveError } = await dbQuery

    if (saveError) {
      console.error('Error saving paid HR detailed report:', saveError)
      return NextResponse.json({ error: 'Failed to save detailed report' }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      feedback: savedFeedback,
    })
  } catch (error: any) {
    console.error('Error generating paid HR detailed report:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to generate detailed report' },
      { status: 500 }
    )
  }
}
