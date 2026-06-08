import { NextRequest, NextResponse } from 'next/server'
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'
import { supabaseAdmin } from '@/lib/supabase'

export const dynamic = 'force-dynamic'

const STAGES = new Set(['hr_screen', 'hiring_manager', 'culture_fit', 'final', 'final_interview'])

function sanitizeKey(key: string) {
  return key.replace(/[^\w:-]/g, '_').slice(0, 180)
}

function normalizeStage(stage?: string | null) {
  const safe = String(stage || 'hr_screen').trim()
  if (safe === 'final_interview') return 'final'
  return STAGES.has(safe) ? safe : 'hr_screen'
}

function objectAt(value: any) {
  return value && typeof value === 'object' && !Array.isArray(value) ? value : {}
}

function getStageBucket(memory: any, stage: string) {
  return objectAt(memory?.[stage])
}

function getSessionBucket(memory: any, stage: string, sessionId?: string | null) {
  const stageBucket = getStageBucket(memory, stage)
  const sessions = objectAt(stageBucket.sessions)
  if (sessionId && sessions[sessionId]) return objectAt(sessions[sessionId])
  return stageBucket
}

function getDrafts(memory: any, stage: string, sessionId?: string | null) {
  const sessionBucket = getSessionBucket(memory, stage, sessionId)
  const scopedDrafts = objectAt(sessionBucket.workshop_drafts)

  if (stage === 'hr_screen') {
    const legacyDrafts = objectAt(memory?.hr_screen?.workshop_drafts)
    return { ...legacyDrafts, ...scopedDrafts }
  }

  return scopedDrafts
}

async function getProfile(userId: string) {
  const { data: profile } = await supabaseAdmin
    .from('user_profiles')
    .select('practice_memory')
    .eq('id', userId)
    .maybeSingle()

  return objectAt(profile?.practice_memory)
}

export async function GET(request: NextRequest) {
  try {
    const supabaseAuth = createRouteHandlerClient({ cookies })
    const {
      data: { session },
    } = await supabaseAuth.auth.getSession()

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
    }

    const url = new URL(request.url)
    const stage = normalizeStage(url.searchParams.get('stage'))
    const sessionId = url.searchParams.get('sessionId')
    const memory = await getProfile(session.user.id)
    const drafts = getDrafts(memory, stage, sessionId)

    return NextResponse.json({ drafts, stage, sessionId, memory })
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Failed to load practice memory' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const { key, value, meta, stage: rawStage, sessionId: rawSessionId } = await request.json()

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

    const stage = normalizeStage(rawStage)
    const sessionId = typeof rawSessionId === 'string' && rawSessionId.trim()
      ? rawSessionId.trim()
      : (meta?.session_id ? String(meta.session_id) : 'general')

    const existingMemory = await getProfile(session.user.id)
    const stageBucket = getStageBucket(existingMemory, stage)
    const sessions = objectAt(stageBucket.sessions)
    const sessionBucket = objectAt(sessions[sessionId])
    const workshopDrafts = objectAt(sessionBucket.workshop_drafts)
    const now = new Date().toISOString()

    const practiceMemory = {
      ...existingMemory,
      [stage]: {
        ...stageBucket,
        sessions: {
          ...sessions,
          [sessionId]: {
            ...sessionBucket,
            workshop_drafts: {
              ...workshopDrafts,
              [sanitizeKey(key)]: {
                value,
                meta: meta && typeof meta === 'object' ? meta : {},
                updated_at: now,
              },
            },
            updated_at: now,
          },
        },
      },
    }

    const { error } = await supabaseAdmin
      .from('user_profiles')
      .update({
        practice_memory: practiceMemory,
        updated_at: now,
      })
      .eq('id', session.user.id)

    if (error) {
      return NextResponse.json({ error: 'Failed to save practice memory', details: error.message }, { status: 500 })
    }

    return NextResponse.json({ success: true, stage, sessionId })
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Failed to save practice memory' }, { status: 500 })
  }
}
