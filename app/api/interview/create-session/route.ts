import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'

export const dynamic = 'force-dynamic'

export async function POST(request: NextRequest) {
  try {
    const { stage, tempInterviewData } = await request.json()

    // Get authenticated user if present
    const supabase = createRouteHandlerClient({ cookies })
    const { data: { session } } = await supabase.auth.getSession()

    // Non-HR stages require authentication
    if (stage !== 'hr_screen' && !session) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
    }

    let interviewDataId: string | null = null

    if (session) {
      // Logged-in user: fetch their latest interview data record
      const { data: interviewData } = await supabaseAdmin
        .from('user_interview_data')
        .select('id')
        .eq('user_id', session.user.id)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle()
      interviewDataId = interviewData?.id || null
    } else if (tempInterviewData) {
      // Anonymous user: save temp data to DB so the interview API can access it
      const { data: savedData } = await supabaseAdmin
        .from('user_interview_data')
        .insert({
          user_id: null,
          resume_text: tempInterviewData.resumeText || '',
          job_description_text: tempInterviewData.jobDescriptionText || '',
          company_website: tempInterviewData.companyWebsite || null,
          notes: tempInterviewData.notes || null,
        })
        .select('id')
        .single()
      interviewDataId = savedData?.id || null
    }

    // Create the session using supabaseAdmin (bypasses RLS)
    const { data: newSession, error: sessionError } = await supabaseAdmin
      .from('interview_sessions')
      .insert({
        user_id: session?.user.id || null,
        user_interview_data_id: interviewDataId,
        stage,
        status: 'in_progress',
      })
      .select()
      .single()

    if (sessionError) {
      console.error('Error creating interview session:', sessionError)
      return NextResponse.json({ error: 'Failed to create session' }, { status: 500 })
    }

    return NextResponse.json({ sessionId: newSession.id })
  } catch (error: any) {
    console.error('create-session error:', error)
    return NextResponse.json({ error: error.message || 'Unknown error' }, { status: 500 })
  }
}
