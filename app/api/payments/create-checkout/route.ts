import { NextRequest, NextResponse } from 'next/server'
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'
import Stripe from 'stripe'
import { PRICING, ProductType } from '@/lib/pricing'

let _stripe: Stripe | null = null
function getStripe() {
  if (!_stripe) _stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, { apiVersion: '2023-10-16' })
  return _stripe
}

export async function POST(request: NextRequest) {
  try {
    // Require authentication
    const supabase = createRouteHandlerClient({ cookies })
    const { data: { session } } = await supabase.auth.getSession()

    if (!session) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
    }

    const {
      productType,
      sessionId,
      returnPath,
    } = await request.json() as {
      productType: ProductType
      sessionId?: string
      returnPath?: string
    }

    if (!productType || !PRICING[productType]) {
      return NextResponse.json({ error: 'Invalid product type' }, { status: 400 })
    }

    const product = PRICING[productType]
    const isSubscription = productType === 'subscription_monthly'

    const safeReturnPath = typeof returnPath === 'string' && returnPath.startsWith('/')
      ? returnPath
      : '/interview/feedback'
    const successUrl = new URL(safeReturnPath, request.nextUrl.origin)
    successUrl.searchParams.set('payment', 'success')
    successUrl.searchParams.set('product', productType)
    if (sessionId && !successUrl.searchParams.get('sessionId')) {
      successUrl.searchParams.set('sessionId', sessionId)
    }
    const cancelUrl = new URL(safeReturnPath, request.nextUrl.origin)
    cancelUrl.searchParams.set('payment', 'canceled')
    cancelUrl.searchParams.set('product', productType)
    if (sessionId && !cancelUrl.searchParams.get('sessionId')) {
      cancelUrl.searchParams.set('sessionId', sessionId)
    }

    // Build Stripe checkout session
    const checkoutParams: Stripe.Checkout.SessionCreateParams = {
      customer_email: session.user.email,
      metadata: {
        user_id: session.user.id,
        product_type: productType,
        ...(sessionId ? { session_id: sessionId } : {}),
      },
      success_url: successUrl.toString(),
      cancel_url: cancelUrl.toString(),
    }

    if (isSubscription) {
      // Subscription mode
      checkoutParams.mode = 'subscription'
      checkoutParams.line_items = [{
        price_data: {
          currency: 'usd',
          unit_amount: product.priceCents,
          recurring: { interval: 'month' },
          product_data: { name: product.label },
        },
        quantity: 1,
      }]
    } else {
      // One-time payment mode
      checkoutParams.mode = 'payment'
      checkoutParams.line_items = [{
        price_data: {
          currency: 'usd',
          unit_amount: product.priceCents,
          product_data: { name: product.label },
        },
        quantity: 1,
      }]
    }

    const checkoutSession = await getStripe().checkout.sessions.create(checkoutParams)

    // Record pending transaction
    const { error: txError } = await supabase
      .from('payment_transactions')
      .insert({
        user_id: session.user.id,
        stripe_checkout_session_id: checkoutSession.id,
        amount_cents: product.priceCents,
        product_type: productType,
        status: 'pending',
        metadata: {
          checkout_url: checkoutSession.url,
          ...(sessionId ? { session_id: sessionId } : {}),
          return_path: safeReturnPath,
        },
      })

    if (txError) {
      console.error('Error recording transaction:', txError)
    }

    return NextResponse.json({ url: checkoutSession.url })
  } catch (error: any) {
    console.error('Checkout error:', error)
    return NextResponse.json(
      { error: 'Failed to create checkout session', details: error.message },
      { status: 500 }
    )
  }
}
