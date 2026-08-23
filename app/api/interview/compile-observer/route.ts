// API route to compile observer notes (server-side only)
import { NextRequest, NextResponse } from 'next/server'
import { compileNotes } from '@/lib/observer-agent'
import { enforceRateLimit, rejectOversizedRequest } from '@/lib/demo-guard'

export async function POST(request: NextRequest) {
  try {
    const rateLimited = enforceRateLimit(request, 'compile-observer', { limit: 10, windowMs: 60 * 60 * 1000 })
    if (rateLimited) return rateLimited
    const oversized = rejectOversizedRequest(request, 16 * 1024)
    if (oversized) return oversized

    const { sessionId } = await request.json()

    if (!sessionId) {
      return NextResponse.json(
        { error: 'Missing sessionId' },
        { status: 400 }
      )
    }

    const notes = await compileNotes(sessionId)

    return NextResponse.json({
      success: true,
      notes: notes,
    })
  } catch (error: any) {
    console.error('Error compiling observer notes:', error)
    return NextResponse.json(
      { error: 'Failed to compile observer notes', details: error.message },
      { status: 500 }
    )
  }
}
