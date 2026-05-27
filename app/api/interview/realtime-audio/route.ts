import { NextRequest, NextResponse } from 'next/server'
import crypto from 'crypto'
import { supabaseAdmin } from '@/lib/supabase'
import { getStructuredTranscript } from '@/lib/interview-session'

export const dynamic = 'force-dynamic'

const BUCKET = 'interview-audio'

function normalize(text: string) {
  return text.toLowerCase().replace(/\s+/g, ' ').trim()
}

function textHash(text: string) {
  return crypto.createHash('sha1').update(text).digest('hex').slice(0, 12)
}

function normalizeAudioContentType(type: string) {
  return type.split(';')[0]?.trim() || 'audio/webm'
}

async function ensureBucket() {
  const { error } = await supabaseAdmin.storage.getBucket(BUCKET)
  if (!error) return

  const { error: createError } = await supabaseAdmin.storage.createBucket(BUCKET, {
    public: false,
    fileSizeLimit: 10 * 1024 * 1024,
    allowedMimeTypes: ['audio/webm', 'audio/mp4', 'audio/mpeg', 'audio/ogg'],
  })

  if (createError && !/already exists/i.test(createError.message || '')) {
    throw createError
  }
}

function findQuestionIndex(questions: any[], questionText: string) {
  const target = normalize(questionText)
  if (!target) return questions.length - 1

  for (let index = questions.length - 1; index >= 0; index -= 1) {
    const question = normalize(String(questions[index]?.question || questions[index]?.text || ''))
    if (question === target || question.includes(target) || target.includes(question)) {
      return index
    }
  }

  return questions.length - 1
}

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData()
    const sessionId = formData.get('sessionId') as string | null
    const questionText = String(formData.get('questionText') || '').trim()
    const audioFile = formData.get('audio') as File | null

    if (!sessionId || !questionText || !audioFile) {
      return NextResponse.json({ error: 'Missing sessionId, questionText, or audio' }, { status: 400 })
    }

    await ensureBucket()

    const contentType = normalizeAudioContentType(audioFile.type || 'audio/webm')
    const extension = contentType.includes('mp4')
      ? 'mp4'
      : contentType.includes('mpeg')
      ? 'mp3'
      : contentType.includes('ogg')
      ? 'ogg'
      : 'webm'
    const hash = textHash(questionText)
    const audioPath = `hr-screen/${sessionId}/${Date.now()}-${hash}.${extension}`
    const audioBuffer = Buffer.from(await audioFile.arrayBuffer())

    const { error: uploadError } = await supabaseAdmin.storage
      .from(BUCKET)
      .upload(audioPath, audioBuffer, {
        contentType,
        upsert: true,
      })

    if (uploadError) {
      throw uploadError
    }

    const structured = await getStructuredTranscript(sessionId)
    const questions = Array.isArray(structured.questions_asked) ? structured.questions_asked as any[] : []
    if (!questions.length) {
      return NextResponse.json({ success: true, skipped: true, reason: 'No saved question to attach audio to' })
    }

    const questionIndex = findQuestionIndex(questions, questionText)
    if (questionIndex < 0 || !questions[questionIndex]) {
      return NextResponse.json({ success: true, skipped: true, reason: 'No matching question found' })
    }

    questions[questionIndex] = {
      ...questions[questionIndex],
      audio_cache: {
        bucket: BUCKET,
        path: audioPath,
        content_type: contentType,
        source: 'realtime_output',
        text_hash: hash,
        captured_at: new Date().toISOString(),
      },
    }

    await supabaseAdmin
      .from('interview_sessions')
      .update({ transcript_structured: structured })
      .eq('id', sessionId)

    return NextResponse.json({ success: true, path: audioPath })
  } catch (error: any) {
    console.error('realtime-audio error:', error)
    return NextResponse.json({ error: error.message || 'Failed to save realtime audio' }, { status: 500 })
  }
}
