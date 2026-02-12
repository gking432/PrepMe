import { NextRequest, NextResponse } from 'next/server'
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'

export async function GET(request: NextRequest) {
  try {
    const supabase = createRouteHandlerClient({ cookies })
    const { data: { session } } = await supabase.auth.getSession()

    if (!session) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
    }

    const userId = session.user.id

    // Fetch credits for all stages
    const { data: credits } = await supabase
      .from('user_credits')
      .select('stage, credits_remaining, bundle_purchased')
      .eq('user_id', userId)

    // Fetch subscription status
    const { data: subscription } = await supabase
      .from('user_subscriptions')
      .select('status, plan_type, current_period_end, interview_count_this_period, max_interviews_per_period')
      .eq('user_id', userId)
      .single()

    // Build access map per stage
    const stageAccess: Record<string, { hasAccess: boolean; creditsRemaining: number; source: string }> = {
      hr_screen: { hasAccess: true, creditsRemaining: -1, source: 'free' }, // always free
      hiring_manager: { hasAccess: false, creditsRemaining: 0, source: 'none' },
      culture_fit: { hasAccess: false, creditsRemaining: 0, source: 'none' },
      final: { hasAccess: false, creditsRemaining: 0, source: 'none' },
    }

    // Check credits
    if (credits) {
      for (const credit of credits) {
        if (credit.credits_remaining > 0) {
          stageAccess[credit.stage] = {
            hasAccess: true,
            creditsRemaining: credit.credits_remaining,
            source: credit.bundle_purchased ? 'bundle' : 'individual',
          }
        }
      }
    }

    // Check subscription (overrides credits if active)
    const hasActiveSubscription = subscription?.status === 'active'
    if (hasActiveSubscription) {
      const withinLimit = (subscription.interview_count_this_period || 0) < (subscription.max_interviews_per_period || 5)
      for (const stage of ['hiring_manager', 'culture_fit', 'final']) {
        if (withinLimit || stageAccess[stage].hasAccess) {
          stageAccess[stage] = {
            hasAccess: true,
            creditsRemaining: withinLimit ? -1 : stageAccess[stage].creditsRemaining,
            source: withinLimit ? 'subscription' : stageAccess[stage].source,
          }
        }
      }
    }

    return NextResponse.json({
      stageAccess,
      subscription: hasActiveSubscription ? {
        active: true,
        periodEnd: subscription.current_period_end,
        interviewsUsed: subscription.interview_count_this_period,
        interviewsMax: subscription.max_interviews_per_period,
      } : null,
      credits: credits || [],
    })
  } catch (error: any) {
    console.error('Payment status error:', error)
    return NextResponse.json({ error: 'Failed to check payment status' }, { status: 500 })
  }
}
