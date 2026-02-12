import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import Stripe from 'stripe'
import { PRICING } from '@/lib/pricing'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2024-04-10',
})

const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET!

// Disable body parsing — Stripe needs raw body for signature verification
export const runtime = 'nodejs'

async function grantCredits(userId: string, productType: string) {
  const product = PRICING[productType as keyof typeof PRICING]
  if (!product) return

  if (productType === 'subscription_monthly') {
    // Create or update subscription record
    const { error } = await supabaseAdmin
      .from('user_subscriptions')
      .upsert({
        user_id: userId,
        status: 'active',
        current_period_start: new Date().toISOString(),
        current_period_end: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
        interview_count_this_period: 0,
        max_interviews_per_period: 5,
        updated_at: new Date().toISOString(),
      }, { onConflict: 'user_id' })

    if (error) console.error('Error upserting subscription:', error)
    return
  }

  // Determine which stages to credit
  let stages: string[] = []
  const totalAttempts = 'totalAttempts' in product ? product.totalAttempts : 3

  if ('stage' in product) {
    stages = [product.stage]
  } else if ('stages' in product) {
    stages = [...product.stages]
  }

  // Grant credits for each stage
  for (const stage of stages) {
    const { error } = await supabaseAdmin
      .from('user_credits')
      .upsert({
        user_id: userId,
        stage,
        credits_remaining: totalAttempts,
        bundle_purchased: productType.startsWith('bundle'),
        updated_at: new Date().toISOString(),
      }, { onConflict: 'user_id,stage' })

    if (error) console.error(`Error granting credits for ${stage}:`, error)
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.text()
    const signature = request.headers.get('stripe-signature')

    if (!signature) {
      return NextResponse.json({ error: 'Missing signature' }, { status: 400 })
    }

    let event: Stripe.Event
    try {
      event = stripe.webhooks.constructEvent(body, signature, webhookSecret)
    } catch (err: any) {
      console.error('Webhook signature verification failed:', err.message)
      return NextResponse.json({ error: 'Invalid signature' }, { status: 400 })
    }

    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session
        const userId = session.metadata?.user_id
        const productType = session.metadata?.product_type

        if (!userId || !productType) {
          console.error('Missing metadata in checkout session')
          break
        }

        // Update transaction status
        await supabaseAdmin
          .from('payment_transactions')
          .update({
            status: 'completed',
            stripe_payment_intent_id: session.payment_intent as string,
          })
          .eq('stripe_checkout_session_id', session.id)

        // Grant credits
        await grantCredits(userId, productType)
        break
      }

      case 'customer.subscription.updated': {
        const subscription = event.data.object as Stripe.Subscription
        const customerId = subscription.customer as string

        // Find user by Stripe customer ID
        const { data: sub } = await supabaseAdmin
          .from('user_subscriptions')
          .select('user_id')
          .eq('stripe_customer_id', customerId)
          .single()

        if (sub) {
          await supabaseAdmin
            .from('user_subscriptions')
            .update({
              status: subscription.status === 'active' ? 'active' : subscription.status,
              current_period_start: new Date(subscription.current_period_start * 1000).toISOString(),
              current_period_end: new Date(subscription.current_period_end * 1000).toISOString(),
              updated_at: new Date().toISOString(),
            })
            .eq('user_id', sub.user_id)
        }
        break
      }

      case 'customer.subscription.deleted': {
        const subscription = event.data.object as Stripe.Subscription
        const customerId = subscription.customer as string

        const { data: sub } = await supabaseAdmin
          .from('user_subscriptions')
          .select('user_id')
          .eq('stripe_customer_id', customerId)
          .single()

        if (sub) {
          await supabaseAdmin
            .from('user_subscriptions')
            .update({ status: 'canceled', updated_at: new Date().toISOString() })
            .eq('user_id', sub.user_id)
        }
        break
      }
    }

    return NextResponse.json({ received: true })
  } catch (error: any) {
    console.error('Webhook error:', error)
    return NextResponse.json({ error: 'Webhook handler failed' }, { status: 500 })
  }
}
