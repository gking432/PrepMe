// Observer Agent - Real-time note-taking during interviews
// Uses GPT-4o-mini to observe and take structured notes per Q/A turn

import { supabaseAdmin } from './supabase'
import OpenAI from 'openai'

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
})

export interface ObserverPrompt {
  systemPrompt: string
  redFlagKeywords: string[]
  qualityIndicators: {
    strong: string[]
    okay: string[]
    weak: string[]
  }
}

export interface ObserverNote {
  question_id: string
  question_text: string
  timestamp_asked: string
  quality_flag: 'strong' | 'okay' | 'weak'
  observations: {
    used_star_method?: boolean
    provided_metrics?: boolean
    gave_timeframes?: boolean
    [key: string]: any
  }
  notable_quote?: string
  flag_for_practice: boolean
  practice_priority?: 'high' | 'medium' | 'low' | null
  duration_seconds?: number
  word_count_estimate?: number
}

export interface ObserverNotes {
  questions: Record<string, ObserverNote>
  summary: {
    total_questions: number
    strong_answers: number
    weak_answers: number
    red_flags: string[]
    best_moment?: string
    weakest_moment?: string
    overall_impression?: string
  }
}

/**
 * Get observer prompt from database for a specific stage
 */
export async function getObserverPrompt(stage: string): Promise<ObserverPrompt> {
  const { data, error } = await supabaseAdmin
    .from('observer_prompts')
    .select('system_prompt, red_flag_keywords, quality_indicators')
    .eq('stage', stage)
    .single()

  if (error || !data) {
    throw new Error(`Observer prompt not found for stage: ${stage}. Error: ${error?.message}`)
  }

  return {
    systemPrompt: data.system_prompt,
    redFlagKeywords: data.red_flag_keywords || [],
    qualityIndicators: data.quality_indicators || {
      strong: [],
      okay: [],
      weak: [],
    },
  }
}

/**
 * Record a single Q/A turn - takes notes on the candidate's response
 * This is async/fire-and-forget - should NOT block interview flow
 */
export async function recordTurn(params: {
  sessionId: string
  questionId: string
  question: string
  answer: string
  timestamps?: { start?: string; end?: string }
  stage: string
}): Promise<void> {
  const { sessionId, questionId, question, answer, timestamps, stage } = params

  try {
    // Get observer prompt from database
    const observerPrompt = await getObserverPrompt(stage)

    // Calculate duration if timestamps provided
    let durationSeconds: number | undefined
    if (timestamps?.start && timestamps?.end) {
      const start = new Date(timestamps.start).getTime()
      const end = new Date(timestamps.end).getTime()
      durationSeconds = Math.floor((end - start) / 1000)
    }

    // Estimate word count
    const wordCountEstimate = answer.split(/\s+/).length

    // Build prompt for this specific Q/A turn
    const userMessage = `Evaluate this question and answer:

QUESTION (ID: ${questionId}):
"${question}"

CANDIDATE'S ANSWER:
"${answer}"
${durationSeconds ? `\nDuration: ${durationSeconds} seconds` : ''}
${wordCountEstimate ? `\nWord count: ~${wordCountEstimate} words` : ''}

Provide structured notes in JSON format with:
- quality_flag: "strong" | "okay" | "weak"
- observations: object with specific observations (used_star_method, provided_metrics, gave_timeframes, etc.)
- notable_quote: a specific quote from the answer (if notable)
- flag_for_practice: boolean
- practice_priority: "high" | "medium" | "low" | null (if flag_for_practice is true)
- duration_seconds: ${durationSeconds || 'null'}
- word_count_estimate: ${wordCountEstimate}

Also check for red flags: ${observerPrompt.redFlagKeywords.join(', ')}`

    // Call GPT-4o-mini for observation
    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content: observerPrompt.systemPrompt,
        },
        {
          role: 'user',
          content: userMessage,
        },
      ],
      temperature: 0.3, // Lower temperature for more consistent structured output
      response_format: { type: 'json_object' },
    })

    const responseText = completion.choices[0]?.message?.content || '{}'
    let noteData: Partial<ObserverNote>
    
    try {
      noteData = JSON.parse(responseText)
    } catch (parseError) {
      console.error('Failed to parse observer response as JSON:', parseError)
      // Create a basic note structure if parsing fails
      noteData = {
        quality_flag: 'okay' as const,
        observations: {},
        flag_for_practice: false,
      }
    }

    // Build complete observer note
    const observerNote: ObserverNote = {
      question_id: questionId,
      question_text: question,
      timestamp_asked: timestamps?.start || new Date().toISOString(),
      quality_flag: noteData.quality_flag || 'okay',
      observations: noteData.observations || {},
      notable_quote: noteData.notable_quote,
      flag_for_practice: noteData.flag_for_practice || false,
      practice_priority: noteData.practice_priority || null,
      duration_seconds: durationSeconds,
      word_count_estimate: wordCountEstimate,
    }

    // Get existing observer notes
    const { data: sessionData } = await supabaseAdmin
      .from('interview_sessions')
      .select('observer_notes')
      .eq('id', sessionId)
      .single()

    const existingNotes: ObserverNotes = sessionData?.observer_notes || {
      questions: {},
      summary: {
        total_questions: 0,
        strong_answers: 0,
        weak_answers: 0,
        red_flags: [],
      },
    }

    // Add this question's note
    existingNotes.questions[questionId] = observerNote

    // Update summary counts
    existingNotes.summary.total_questions = Object.keys(existingNotes.questions).length
    if (observerNote.quality_flag === 'strong') {
      existingNotes.summary.strong_answers++
    } else if (observerNote.quality_flag === 'weak') {
      existingNotes.summary.weak_answers++
    }

    // Check for red flags in the answer
    const answerLower = answer.toLowerCase()
    const foundRedFlags = observerPrompt.redFlagKeywords.filter(keyword =>
      answerLower.includes(keyword.toLowerCase())
    )
    if (foundRedFlags.length > 0) {
      existingNotes.summary.red_flags.push(...foundRedFlags)
    }

    // Save updated notes
    await supabaseAdmin
      .from('interview_sessions')
      .update({ observer_notes: existingNotes })
      .eq('id', sessionId)

    console.log(`✅ Observer note recorded for question ${questionId}`)
  } catch (error: any) {
    // Log error but don't throw - observer failures shouldn't break interviews
    console.error(`❌ Observer failed for question ${questionId}:`, error.message)
    // Don't rethrow - this is fire-and-forget
  }
}

/**
 * Compile final summary notes at end of interview
 * Can add aggregate stats, identify best/weakest moments, etc.
 */
export async function compileNotes(sessionId: string): Promise<ObserverNotes | null> {
  try {
    const { data: sessionData } = await supabaseAdmin
      .from('interview_sessions')
      .select('observer_notes')
      .eq('id', sessionId)
      .single()

    if (!sessionData?.observer_notes) {
      return null
    }

    const notes: ObserverNotes = sessionData.observer_notes

    // Find best and weakest moments
    let bestMoment: string | undefined
    let weakestMoment: string | undefined
    let bestScore = -1
    let weakestScore = 10

    for (const [questionId, note] of Object.entries(notes.questions)) {
      const score = note.quality_flag === 'strong' ? 3 : note.quality_flag === 'okay' ? 2 : 1
      if (score > bestScore) {
        bestScore = score
        bestMoment = questionId
      }
      if (score < weakestScore) {
        weakestScore = score
        weakestMoment = questionId
      }
    }

    notes.summary.best_moment = bestMoment
    notes.summary.weakest_moment = weakestMoment

    // Generate overall impression
    const strongRatio = notes.summary.strong_answers / notes.summary.total_questions
    if (strongRatio >= 0.5) {
      notes.summary.overall_impression = 'Strong performance with mostly well-structured answers'
    } else if (strongRatio >= 0.3) {
      notes.summary.overall_impression = 'Good performance with room for improvement in specificity'
    } else {
      notes.summary.overall_impression = 'Needs improvement - answers lack structure and specific examples'
    }

    // Save updated notes with summary
    await supabaseAdmin
      .from('interview_sessions')
      .update({ observer_notes: notes })
      .eq('id', sessionId)

    return notes
  } catch (error: any) {
    console.error('Error compiling observer notes:', error)
    return null
  }
}

