// API route to compile observer notes (server-side only)
import { NextRequest, NextResponse } from 'next/server'
import { compileNotes } from '@/lib/observer-agent'

export async function POST(request: NextRequest) {
  try {
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

