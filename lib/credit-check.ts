import { supabaseAdmin } from '@/lib/supabase'

/**
 * Check if a user has access to a specific interview stage.
 * Returns true if they have credits or an active subscription.
 */
export async function hasStageAccess(userId: string, stage: string): Promise<boolean> {
  // HR screen is always free
  if (stage === 'hr_screen') return true

  // Check credits first
  const { data: credit } = await supabaseAdmin
    .from('user_credits')
    .select('credits_remaining')
    .eq('user_id', userId)
    .eq('stage', stage)
    .single()

  if (credit && credit.credits_remaining > 0) return true

  // Check subscription
  const { data: sub } = await supabaseAdmin
    .from('user_subscriptions')
    .select('status, interview_count_this_period, max_interviews_per_period')
    .eq('user_id', userId)
    .single()

  if (sub?.status === 'active') {
    return (sub.interview_count_this_period || 0) < (sub.max_interviews_per_period || 5)
  }

  return false
}

/**
 * Deduct one credit for a completed interview.
 * Call this after an interview session completes successfully.
 */
export async function deductCredit(userId: string, stage: string): Promise<void> {
  if (stage === 'hr_screen') return

  // Try to deduct from credits first
  const { data: credit } = await supabaseAdmin
    .from('user_credits')
    .select('id, credits_remaining')
    .eq('user_id', userId)
    .eq('stage', stage)
    .single()

  if (credit && credit.credits_remaining > 0) {
    await supabaseAdmin
      .from('user_credits')
      .update({
        credits_remaining: credit.credits_remaining - 1,
        updated_at: new Date().toISOString(),
      })
      .eq('id', credit.id)
    return
  }

  // Otherwise, increment subscription usage
  const { data: sub } = await supabaseAdmin
    .from('user_subscriptions')
    .select('id, interview_count_this_period')
    .eq('user_id', userId)
    .eq('status', 'active')
    .single()

  if (sub) {
    await supabaseAdmin
      .from('user_subscriptions')
      .update({
        interview_count_this_period: (sub.interview_count_this_period || 0) + 1,
        updated_at: new Date().toISOString(),
      })
      .eq('id', sub.id)
  }
}
