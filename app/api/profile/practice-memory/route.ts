import { NextRequest, NextResponse } from 'next/server'
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'
import { supabaseAdmin } from '@/lib/supabase'

export const dynamic = 'force-dynamic'

function sanitizeKey(key: string) {
  return key.replace(/[^\w:-]/g, '_').slice(0, 180)
}

export async function GET() {
  try {
    const supabaseAuth = createRouteHandlerClient({ cookies })
    const {
      data: { session },
    } = await supabaseAuth.auth.getSession()

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
    }

    const { data: profile } = await supabaseAdmin
      .from('user_profiles')
      .select('practice_memory')
      .eq('id', session.user.id)
      .maybeSingle()

    const memory =
      profile?.practice_memory && typeof profile.practice_memory === 'object'
        ? profile.practice_memory
        : {}
    const hrScreen = memory.hr_screen && typeof memory.hr_screen === 'object' ? memory.hr_screen : {}
    const drafts = hrScreen.workshop_drafts && typeof hrScreen.workshop_drafts === 'object'
      ? hrScreen.workshop_drafts
      : {}

    return NextResponse.json({ drafts })
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Failed to load practice memory' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const { key, value, meta } = await request.json()

    if (typeof key !== 'string' || typeof value !== 'string') {
      return NextResponse.json({ error: 'Missing key or value' }, { status: 400 })
    }

    const supabaseAuth = createRouteHandlerClient({ cookies })
    const {
      data: { session },
    } = await supabaseAuth.auth.getSession()

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
    }

    const { data: profile } = await supabaseAdmin
      .from('user_profiles')
      .select('practice_memory')
      .eq('id', session.user.id)
      .maybeSingle()

    const existingMemory =
      profile?.practice_memory && typeof profile.practice_memory === 'object'
        ? profile.practice_memory
        : {}
    const hrScreen = existingMemory.hr_screen && typeof existingMemory.hr_screen === 'object'
      ? existingMemory.hr_screen
      : {}
    const workshopDrafts = hrScreen.workshop_drafts && typeof hrScreen.workshop_drafts === 'object'
      ? hrScreen.workshop_drafts
      : {}

    const practiceMemory = {
      ...existingMemory,
      hr_screen: {
        ...hrScreen,
        workshop_drafts: {
          ...workshopDrafts,
          [sanitizeKey(key)]: {
            value,
            meta: meta && typeof meta === 'object' ? meta : {},
            updated_at: new Date().toISOString(),
          },
        },
      },
    }

    const { error } = await supabaseAdmin
      .from('user_profiles')
      .update({
        practice_memory: practiceMemory,
        updated_at: new Date().toISOString(),
      })
      .eq('id', session.user.id)

    if (error) {
      return NextResponse.json({ error: 'Failed to save practice memory', details: error.message }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Failed to save practice memory' }, { status: 500 })
  }
}
