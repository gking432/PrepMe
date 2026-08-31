// API route to generate interview feedback
import { NextRequest, NextResponse } from 'next/server'
import { supabase, supabaseAdmin } from '@/lib/supabase'
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'
import OpenAI from 'openai'
import { Anthropic } from '@anthropic-ai/sdk/client'
import { gradeHrScreenWithRetry, gradeHiringManagerWithRetry, gradeCultureFitWithRetry, gradeFinalRoundWithRetry, GradingMaterials } from '@/lib/claude-client'
import { gradeHrScreenPassFail } from '@/lib/hr-pass-fail-grader'
import { hasSufficientHrInterviewCoverage } from '@/lib/hr-interview-coverage'
import { gradeHrScreenQuestionLevel } from '@/lib/hr-question-level-grader'
import { validateHrScreenRubric, validateHiringManagerRubric, validateCultureFitRubric, validateFinalRoundRubric } from '@/lib/rubric-validator'
import { shouldDeductInterviewCredit } from '@/lib/interview-stage-access'
import { HR_DETAILED_REPORT_ENABLED, HR_SCREEN_GRADING_MODE } from '@/lib/feedback-config'
import { fetchRelatedHrScreenFeedback } from '@/lib/hr-screen-context'
import { enforceRateLimit, rejectOversizedRequest } from '@/lib/demo-guard'
import { parseModelOutput, rewriteBatchSchema } from '@/lib/ai-contracts'
import { AI_MODELS } from '@/lib/ai-models'

let _openai: OpenAI | null = null
function getOpenAI() {
  if (!_openai) _openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })
  return _openai
}

let _anthropicHaiku: Anthropic | null = null
function getAnthropicHaiku() {
  if (!_anthropicHaiku) _anthropicHaiku = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY || '' })
  return _anthropicHaiku
}

const HR_SIX_CRITERIA = [
  'Professional Story',
  'Specificity / Proof',
  'Career Alignment',
  'Handling Uncertainty',
  'Pace / Natural Delivery',
  'Preparation / Curiosity',
] as const

type RewriteMethod = {
  id: string
  label: string
  instruction: string
}

const HR_REWRITE_METHODS: RewriteMethod[] = [
  {
    id: 'present_past_future',
    label: 'Present, Past, Future',
    instruction: 'Rewrite as Present -> Past -> Future: what they do now, the foundation that shaped them, and where they are headed next.',
  },
  {
    id: 'star',
    label: 'STAR',
    instruction: 'Rewrite as Situation -> Task -> Action -> Result. Keep Situation short, make Task/ownership clear, put the most weight into Action, and close with Result.',
  },
  {
    id: 'answer_reason_example',
    label: 'Answer, Reason, Example',
    instruction: 'Rewrite as direct Answer -> brief Reason -> short Example or proof. Use this for judgment, preference, approach, or non-story questions.',
  },
  {
    id: 'observation_fit_timing',
    label: 'Observation, Fit, Timing',
    instruction: 'Rewrite as Observation -> Fit -> Timing: what stood out about the role/company, why that connects to their background, and why the move makes sense now.',
  },
  {
    id: 'uncertainty_recovery',
    label: 'Recovery + Answer, Reason, Example',
    instruction: 'Rewrite as a brief recovery answer: pause/steady opening, one clear Answer, a Reason, and a short Example. Do not ramble while searching.',
  },
  {
    id: 'pace_delivery',
    label: 'Delivery Workshop',
    instruction: 'Rewrite the saved answer for better delivery: one simple transition, one clear main point first, smoother flow, and a settled ending. Do not change the substance.',
  },
  {
    id: 'research_questions',
    label: 'Research + Question-Building',
    instruction: 'Rewrite as a stronger preparation/curiosity response: basic company knowledge, one real point of interest, why it matters, and one thoughtful role/team/company question if relevant. If the candidate admitted they did not research something, keep that honesty and use placeholders for what they need to add.',
  },
]

function questionLooksBehavioral(question?: string) {
  const normalized = (question || '').toLowerCase()
  return /tell me about a time|give me an example|describe a time|walk me through a time|significant challenge|accomplishment|worked on|handled|managed|solved|dealt with/.test(normalized)
}

function getRewriteMethodForHrSignal(criterion?: string, rootCause?: string): RewriteMethod | null {
  const text = `${criterion || ''} ${rootCause || ''}`.toLowerCase()

  if (/professional story|professional_story|tell me about yourself|background/.test(text)) {
    return HR_REWRITE_METHODS[0]
  }

  if (/answer structure|conciseness|structure/.test(text)) {
    return null
  }

  if (/specific examples|specificity|proof|evidence|lack_of_specificity|star|example/.test(text)) {
    return null
  }

  if (/uncertain|difficult|off_topic|gap|bluff|deflect/.test(text)) {
    return HR_REWRITE_METHODS[4]
  }

  if (/alignment|career goals|career_alignment|position|why this role|why this position|noticed_fit_now/.test(text)) {
    return HR_REWRITE_METHODS[3]
  }

  if (/pace|flow|natural delivery|weak_communication|conversation/.test(text)) {
    return HR_REWRITE_METHODS[5]
  }

  if (/preparation|curiosity|questions_about_company|company|question/.test(text)) {
    return HR_REWRITE_METHODS[6]
  }

  return null
}

function getRewriteMethodForHrSignalAndQuestion(criterion?: string, rootCause?: string, question?: string): RewriteMethod | null {
  const text = `${criterion || ''} ${rootCause || ''}`.toLowerCase()

  if (/answer structure|conciseness|structure/.test(text)) {
    if (/tell me about yourself|background|walk me through your experience|bit about yourself/i.test(question || '')) {
      return HR_REWRITE_METHODS[0]
    }
    return questionLooksBehavioral(question) ? HR_REWRITE_METHODS[1] : HR_REWRITE_METHODS[2]
  }

  if (/specific examples|specificity|proof|evidence|lack_of_specificity|star|example/.test(text)) {
    return questionLooksBehavioral(question) ? HR_REWRITE_METHODS[1] : HR_REWRITE_METHODS[2]
  }

  return getRewriteMethodForHrSignal(criterion, rootCause)
}

function getQuestionText(questionId: string | undefined, evidence: any, structuredTranscript: any) {
  const evidenceQuestion = typeof evidence?.question === 'string' ? evidence.question : ''
  if (evidenceQuestion) return evidenceQuestion

  const questions = Array.isArray(structuredTranscript?.questions_asked) ? structuredTranscript.questions_asked : []
  const match = questions.find((question: any) => question?.id === questionId || question?.question_id === questionId)
  return match?.question || ''
}

function getCandidateAnswerForQuestion(questionId: string | undefined, evidence: any, structuredTranscript: any) {
  const messages = Array.isArray(structuredTranscript?.messages) ? structuredTranscript.messages : []

  if (questionId) {
    const matchingCandidateMessages = messages
      .filter((message: any) => message?.speaker === 'candidate' && message?.question_id === questionId && typeof message?.text === 'string')
      .map((message: any) => message.text.trim())
      .filter(Boolean)

    if (matchingCandidateMessages.length > 0) return matchingCandidateMessages.join('\n\n')
  }

  const excerpt = typeof evidence?.excerpt === 'string' ? evidence.excerpt.trim() : ''
  if (excerpt) {
    const excerptMatch = messages.find((message: any) => {
      if (message?.speaker !== 'candidate' || typeof message?.text !== 'string') return false
      return message.text.includes(excerpt) || excerpt.includes(message.text.slice(0, 80))
    })
    if (excerptMatch?.text) return excerptMatch.text.trim()
  }

  return excerpt
}

async function enrichHrWeakSignalsWithHaikuRewrites(rubric: any, structuredTranscript: any) {
  const weakSignals = Array.isArray(rubric?.hr_screen_six_areas?.what_needs_improve)
    ? rubric.hr_screen_six_areas.what_needs_improve
    : []

  if (!weakSignals.length || !process.env.ANTHROPIC_API_KEY) return rubric

  const rewriteItems = weakSignals
    .map((signal: any, index: number) => {
      const evidence = Array.isArray(signal?.evidence) ? signal.evidence[0] : null
      const questionId = evidence?.question_id
      const question = getQuestionText(questionId, evidence, structuredTranscript)
      const originalAnswer = getCandidateAnswerForQuestion(questionId, evidence, structuredTranscript)
      const method = getRewriteMethodForHrSignalAndQuestion(signal?.criterion, signal?.rootCause || signal?.root_cause, question)
      if (!method) return null

      if (!question || !originalAnswer || originalAnswer.length < 20) return null

      return {
        id: `issue_${index}`,
        index,
        criterion: signal.criterion,
        feedback: signal.feedback,
        question,
        original_answer: originalAnswer,
        method,
      }
    })
    .filter(Boolean) as Array<{
      id: string
      index: number
      criterion: string
      feedback: string
      question: string
      original_answer: string
      method: RewriteMethod
    }>

  const cappedRewriteItems = rewriteItems.slice(0, 6)

  if (!rewriteItems.length) return rubric

  try {
    const message = await getAnthropicHaiku().messages.create({
      model: AI_MODELS.coachingGeneration,
      max_tokens: 2800,
      temperature: 0.2,
      system: `You rewrite interview answers cheaply and safely.

Rules:
- Preserve only details the candidate already provided.
- Do not invent metrics, company facts, seniority, accomplishments, tools, clients, or outcomes.
- Do not reverse the meaning of a weak answer. If the candidate said they do not know something, preserve that honesty and show the recovery structure, not fake preparation.
- For company/research rewrites, use bracketed placeholders for missing research details instead of claiming the candidate researched them.
- If a needed detail is missing, use a short bracketed placeholder like [specific result].
- Keep each rewrite interview-natural, concise, and spoken aloud.
- Target 80-120 words per rewritten answer.
- Return valid JSON only.`,
      messages: [
        {
          role: 'user',
          content: JSON.stringify({
            task: 'Rewrite each flagged HR-screen answer using the assigned method.',
            output_shape: {
              rewrites: [
                {
                  id: 'issue_0',
                  method: 'STAR',
                  rewritten_answer: 'Better answer here.',
                  why_this_works: 'One sentence explaining the improvement.',
                },
              ],
            },
            items: cappedRewriteItems.map((item) => ({
              id: item.id,
              criterion: item.criterion,
              rubric_feedback: item.feedback,
              question: item.question,
              original_answer: item.original_answer,
              method: item.method.label,
              method_instruction: item.method.instruction,
            })),
          }),
        },
      ],
    })

    const content = message.content[0]
    if (content.type !== 'text') return rubric

    const parsed = parseModelOutput(content.text, rewriteBatchSchema)
    const rewrites = parsed.rewrites

    rewrites.forEach((rewrite: any) => {
      const source = cappedRewriteItems.find((item) => item.id === rewrite?.id)
      if (!source || !rewrite?.rewritten_answer) return

      weakSignals[source.index] = {
        ...weakSignals[source.index],
        rewrite_method: rewrite.method || source.method.label,
        rewritten_answer: String(rewrite.rewritten_answer).trim(),
        rewrite_explanation: rewrite.why_this_works ? String(rewrite.why_this_works).trim() : '',
        original_answer: source.original_answer,
      }
    })
  } catch (error) {
    console.error('Haiku rewrite enrichment failed; continuing without rewrites:', error)
  }

  return rubric
}

function isBlankInterviewTranscript(structuredTranscript: any, transcript: string) {
  return !hasSufficientHrInterviewCoverage(structuredTranscript, transcript)
}

function countWords(text: any) {
  if (typeof text !== 'string') return 0
  const matches = text.trim().match(/\b[\w']+\b/g)
  return matches ? matches.length : 0
}

function getTranscriptWordCounts(structuredTranscript: any, transcript: string) {
  let interviewerWordCount = 0
  let candidateWordCount = 0

  const messages = Array.isArray(structuredTranscript?.messages)
    ? structuredTranscript.messages
    : []

  if (messages.length > 0) {
    for (const message of messages) {
      if (message?.speaker === 'interviewer') {
        interviewerWordCount += countWords(message.text)
      } else if (message?.speaker === 'candidate') {
        candidateWordCount += countWords(message.text)
      }
    }
  } else {
    const lines = (transcript || '').split('\n')
    for (const line of lines) {
      if (/^Interviewer:\s*/i.test(line)) {
        interviewerWordCount += countWords(line.replace(/^Interviewer:\s*/i, ''))
      } else if (/^(You|Candidate):\s*/i.test(line)) {
        candidateWordCount += countWords(line.replace(/^(You|Candidate):\s*/i, ''))
      }
    }
  }

  return { interviewerWordCount, candidateWordCount }
}

function numberFromEnv(name: string, fallback: number) {
  const value = Number(process.env[name])
  return Number.isFinite(value) ? value : fallback
}

function buildHrCostEstimate({
  transcript,
  structuredTranscript,
  durationSeconds,
  graderCostEstimate,
}: {
  transcript: string
  structuredTranscript: any
  durationSeconds: number | null
  graderCostEstimate: any
}) {
  const { interviewerWordCount, candidateWordCount } = getTranscriptWordCounts(structuredTranscript, transcript)
  const wordsPerMinute = numberFromEnv('HR_COST_AUDIO_WORDS_PER_MINUTE', 150)
  const inputAudioCentsPerMinute = numberFromEnv('HR_REALTIME_INPUT_AUDIO_CENTS_PER_MINUTE', 0.6)
  const outputAudioCentsPerMinute = numberFromEnv('HR_REALTIME_OUTPUT_AUDIO_CENTS_PER_MINUTE', 2.4)
  const candidateMinutes = candidateWordCount / wordsPerMinute
  const interviewerMinutes = interviewerWordCount / wordsPerMinute
  const estimatedRealtimeCents = (candidateMinutes * inputAudioCentsPerMinute) + (interviewerMinutes * outputAudioCentsPerMinute)
  const estimatedGradingCents = Number(graderCostEstimate?.estimated_grading_cents || 0)

  return {
    pricing_version: 'openai-realtime-mini-audio-2026-05-27',
    duration_seconds: durationSeconds,
    interviewer_word_count: interviewerWordCount,
    candidate_word_count: candidateWordCount,
    realtime_model: AI_MODELS.realtimeInterview,
    grader_model: graderCostEstimate?.grader_model,
    rewrite_count: 0,
    estimated_realtime_cents: Number(estimatedRealtimeCents.toFixed(4)),
    estimated_grading_cents: Number(estimatedGradingCents.toFixed(4)),
    estimated_total_cents: Number((estimatedRealtimeCents + estimatedGradingCents).toFixed(4)),
    assumptions: {
      words_per_minute: wordsPerMinute,
      realtime_input_audio_cents_per_minute: inputAudioCentsPerMinute,
      realtime_output_audio_cents_per_minute: outputAudioCentsPerMinute,
      realtime_audio_input_token_price_per_1m_usd: 10,
      realtime_audio_output_token_price_per_1m_usd: 20,
      input_audio_tokens_per_minute: 600,
      output_audio_tokens_per_minute: 1200,
    },
  }
}

function applyBlankInterviewGuardrailToHrRubric(rubric: any) {
  const blankFeedback =
    'Candidate provided no substantive verbal response in the interview, so this area was not demonstrated live and should be practiced before the next round.'

  rubric.overall_assessment = rubric.overall_assessment || {}
  rubric.overall_assessment.overall_score = Math.min(Number(rubric.overall_assessment.overall_score || 2), 2)
  rubric.overall_assessment.likelihood_to_advance = 'unlikely'
  rubric.overall_assessment.key_strengths = []
  rubric.overall_assessment.key_weaknesses = [
    'Candidate provided no substantive verbal responses during the interview, so interview performance could not be demonstrated.',
    ...((Array.isArray(rubric.overall_assessment.key_weaknesses) ? rubric.overall_assessment.key_weaknesses : [])
      .filter((item: string) => typeof item === 'string' && !/no substantive verbal responses/i.test(item))),
  ].slice(0, 4)
  rubric.overall_assessment.summary =
    'Candidate provided no substantive verbal responses during the interview. Resume and job-description fit may exist on paper, but interview strengths were not demonstrated live, so the session should be treated as a full practice-needed outcome.'

  rubric.hr_screen_six_areas = {
    what_went_well: [],
    what_needs_improve: HR_SIX_CRITERIA.map((criterion) => ({
      criterion,
      feedback: blankFeedback,
      evidence: [],
    })),
  }

  rubric.next_steps_preparation = rubric.next_steps_preparation || {}
  rubric.next_steps_preparation.ready_for_hiring_manager = false
  rubric.next_steps_preparation.confidence_level = 'High'
  rubric.next_steps_preparation.improvement_suggestions = [
    'Complete a full HR practice loop with spoken responses so your communication, structure, alignment, and question quality can actually be evaluated.',
    ...((Array.isArray(rubric.next_steps_preparation.improvement_suggestions)
      ? rubric.next_steps_preparation.improvement_suggestions
      : []).filter((item: string) => typeof item === 'string')),
  ].slice(0, 5)
  rubric.next_steps_preparation.practice_recommendations =
    rubric.next_steps_preparation.practice_recommendations || {}
  rubric.next_steps_preparation.practice_recommendations.immediate_focus_areas = [...HR_SIX_CRITERIA]

  return rubric
}

async function gradePortfolioDemoHrScreen(params: {
  transcript: string
  demoContext: any
}) {
  const { transcript, demoContext } = params
  const structuredTranscript = demoContext?.structuredTranscript || null
  const gradingMaterials = {
    transcript,
    transcriptStructured: structuredTranscript,
    resume: String(demoContext?.resumeText || '').slice(0, 12000),
    jobDescription: String(demoContext?.jobDescriptionText || '').slice(0, 12000),
    websiteContent: '',
  }

  let rubric = HR_SCREEN_GRADING_MODE === 'pass_fail'
    ? await gradeHrScreenPassFail(gradingMaterials)
    : await gradeHrScreenQuestionLevel(gradingMaterials)

  if (isBlankInterviewTranscript(structuredTranscript, transcript)) {
    applyBlankInterviewGuardrailToHrRubric(rubric)
  }

  rubric = await enrichHrWeakSignalsWithHaikuRewrites(rubric, structuredTranscript)
  if (!validateHrScreenRubric(rubric)) {
    throw new Error('Invalid lean HR rubric structure')
  }

  rubric.cost_estimate = buildHrCostEstimate({
    transcript,
    structuredTranscript,
    durationSeconds: typeof demoContext?.durationSeconds === 'number'
      ? demoContext.durationSeconds
      : null,
    graderCostEstimate: rubric.cost_estimate,
  })

  return {
    id: crypto.randomUUID(),
    interview_session_id: null as string | null,
    created_at: new Date().toISOString(),
    overall_score: Math.round(rubric.overall_assessment.overall_score),
    area_scores: Object.fromEntries((rubric.areas || []).map((area: any) => [area.id, area.points_awarded])),
    area_feedback: Object.fromEntries((rubric.areas || []).map((area: any) => [area.id, area.feedback])),
    strengths: rubric.overall_assessment.key_strengths || [],
    weaknesses: rubric.overall_assessment.key_weaknesses || [],
    suggestions: rubric.next_steps_preparation?.improvement_suggestions || [],
    detailed_feedback: rubric.overall_assessment.summary || '',
    hr_screen_six_areas: rubric.hr_screen_six_areas || {
      what_went_well: [],
      what_needs_improve: [],
    },
    full_rubric: rubric,
  }
}

export async function POST(request: NextRequest) {
  try {
    const rateLimited = enforceRateLimit(request, 'interview-feedback', { limit: 6, windowMs: 60 * 60 * 1000 })
    if (rateLimited) return rateLimited
    const oversized = rejectOversizedRequest(request, 256 * 1024)
    if (oversized) return oversized

    const {
      sessionId,
      transcript: providedTranscript,
      demoMode,
      demoContext,
    } = await request.json()

    if (!sessionId) {
      console.error('Missing sessionId')
      return NextResponse.json(
        { error: 'Missing sessionId' },
        { status: 400 }
      )
    }

    if (demoMode) {
      const transcript = String(providedTranscript || demoContext?.transcript || '').trim()
      if (!transcript) {
        return NextResponse.json(
          { error: 'No transcript found. Please complete the interview first.' },
          { status: 404 },
        )
      }

      try {
        const feedback = await gradePortfolioDemoHrScreen({ transcript, demoContext })
        feedback.interview_session_id = sessionId
        return NextResponse.json({ success: true, feedback, demoMode: true })
      } catch (demoError: any) {
        console.error('Portfolio demo grading failed:', demoError)
        return NextResponse.json(
          { error: 'Failed to generate HR screen feedback', details: demoError?.message || 'Unknown error' },
          { status: 500 },
        )
      }
    }

    // Fetch transcript from database if not provided
    let transcript = providedTranscript
    if (!transcript) {
      const { data: sessionData, error: transcriptError } = await supabaseAdmin
        .from('interview_sessions')
        .select('transcript')
        .eq('id', sessionId)
        .maybeSingle()
      
      if (transcriptError) {
        console.error('Error fetching transcript from database:', transcriptError)
        console.error('  - SessionId:', sessionId)
        console.error('  - Error details:', transcriptError.message)
      }
      
      if (sessionData?.transcript && sessionData.transcript.trim().length > 0) {
        transcript = sessionData.transcript
      } else {
        console.error('No transcript found in database or request')
        console.error('  - SessionId:', sessionId)
        console.error('  - Session exists?', !!sessionData)
        console.error('  - Transcript value:', sessionData?.transcript ? `"${sessionData.transcript.substring(0, 100)}..."` : 'null/undefined')
        console.error('  - Transcript length:', sessionData?.transcript?.length || 0)
        return NextResponse.json(
          { error: 'No transcript found. Please complete the interview first.' },
          { status: 404 }
        )
      }
    }

    // Fetch interview session to get user_interview_data_id
    // Use supabaseAdmin to bypass RLS and ensure access
    const { data: sessionData, error: sessionError } = await supabaseAdmin
      .from('interview_sessions')
      .select('user_interview_data_id, stage, user_id')
      .eq('id', sessionId)
      .single()

    if (sessionError || !sessionData) {
      console.error('Session fetch error:', sessionError)
      console.error('Session data:', sessionData)
      return NextResponse.json(
        { error: 'Interview session not found', details: sessionError?.message },
        { status: 404 }
      )
    }

    // Stage gating: non-HR stages require authentication
    const stage = sessionData.stage
    if (stage && stage !== 'hr_screen') {
      const supabaseAuth = createRouteHandlerClient({ cookies })
      const { data: { session: authSession } } = await supabaseAuth.auth.getSession()
      if (!authSession) {
        return NextResponse.json(
          { error: 'Authentication required to grade this interview stage.' },
          { status: 401 }
        )
      }
    }

    // Fetch job description, resume, and company website
    // Use supabaseAdmin to bypass RLS
    let jobDescription = ''
    let resume = ''
    let companyWebsite = ''
    if (sessionData.user_interview_data_id) {
      const { data: interviewData, error: dataError } = await supabaseAdmin
        .from('user_interview_data')
        .select('job_description_text, resume_text, company_website')
        .eq('id', sessionData.user_interview_data_id)
        .single()

      if (dataError) {
        console.error('Error fetching interview data:', dataError)
      } else if (interviewData) {
        jobDescription = interviewData.job_description_text || ''
        resume = interviewData.resume_text || ''
        companyWebsite = interviewData.company_website || ''
      }
    } else {
      console.warn('No user_interview_data_id in session')
    }
    
    // Fetch structured transcript and observer notes for graded stages
    let structuredTranscript = null
    let observerNotes = null
    let sessionDurationSeconds: number | null = null
    if (['hr_screen', 'hiring_manager', 'culture_fit', 'final'].includes(sessionData.stage)) {
      const { data: sessionWithData } = await supabaseAdmin
        .from('interview_sessions')
        .select('transcript_structured, observer_notes, user_id, duration_seconds')
        .eq('id', sessionId)
        .single()

      structuredTranscript = sessionWithData?.transcript_structured || null
      observerNotes = sessionWithData?.observer_notes || null
      sessionDurationSeconds = typeof sessionWithData?.duration_seconds === 'number'
        ? sessionWithData.duration_seconds
        : null
    }

    // Delete any existing feedback for this session before generating new (prevent duplicates)
    await supabaseAdmin
      .from('interview_feedback')
      .delete()
      .eq('interview_session_id', sessionId)

    // Fetch HR screen feedback for cross-stage intelligence (hiring_manager and later stages)
    let hrScreenFeedback = null
    if (sessionData.stage === 'hiring_manager') {
      const relatedHrFeedback = await fetchRelatedHrScreenFeedback({
        interviewDataId: sessionData.user_interview_data_id,
        userId: sessionData.user_id,
      })

      if (relatedHrFeedback) {
        hrScreenFeedback = {
          overall_score: relatedHrFeedback.overall_score,
          strengths: relatedHrFeedback.strengths,
          weaknesses: relatedHrFeedback.weaknesses,
          suggestions: relatedHrFeedback.suggestions,
        }
      }
    }

    // Fetch company website content for grader
    let websiteContent = null
    if (['hr_screen', 'hiring_manager', 'culture_fit', 'final'].includes(sessionData.stage) && companyWebsite) {
      try {
        const websiteResponse = await fetch(`${request.nextUrl.origin}/api/scrape-website`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ url: companyWebsite }),
        })
        
        if (websiteResponse.ok) {
          const websiteData = await websiteResponse.json()
          if (websiteData.success && websiteData.content) {
            websiteContent = websiteData.content
          }
        }
      } catch (error) {
        console.error('Error fetching website content for grader:', error)
        // Continue without website content
      }
    }

    // Fetch evaluation criteria
    // Use supabaseAdmin to bypass RLS for all feedback-related queries
    const { data: criteriaData, error: criteriaError } = await supabaseAdmin
      .from('feedback_evaluation_criteria')
      .select('*')
      .eq('is_active', true)
      .order('area_name')

    const criteria = criteriaData || []

    // Fetch stage-specific instructions (if they exist)
    const { data: stageInstructions, error: stageInstructionsError } = await supabaseAdmin
      .from('feedback_stage_instructions')
      .select('*')
      .eq('stage', stage)
      .maybeSingle()

    // Fetch global evaluation settings (fallback)
    const { data: settingsData, error: settingsError } = await supabaseAdmin
      .from('feedback_evaluation_settings')
      .select('*')
      .limit(1)
      .maybeSingle()

    const settings = settingsData || {
      honesty_level: 'tough',
      evaluation_instructions: 'Provide honest, constructive feedback.',
      require_job_alignment: true,
      require_specific_examples: true,
    }

    // Use stage-specific instructions if available, otherwise use global
    const evaluationInstructions = stageInstructions?.evaluation_instructions || settings.evaluation_instructions

    // Build comprehensive system prompt
    let systemPrompt = evaluationInstructions || 'You are a rigorous, honest interview evaluator.'
    
    // Add stage context if stage-specific instructions exist
    if (stageInstructions) {
      systemPrompt += `\n\nINTERVIEW STAGE: ${stage.replace('_', ' ').toUpperCase()}`
      if (stageInstructions.focus_areas && stageInstructions.focus_areas.length > 0) {
        systemPrompt += `\n\nFOCUS AREAS FOR THIS STAGE: ${stageInstructions.focus_areas.join(', ')}`
      }
      if (stageInstructions.excluded_areas && stageInstructions.excluded_areas.length > 0) {
        systemPrompt += `\n\nAREAS TO DE-EMPHASIZE: ${stageInstructions.excluded_areas.join(', ')}`
      }
    }

    // For HR screen: Add 6-area evaluation instructions
    if (stage === 'hr_screen') {
      const blankInterview = isBlankInterviewTranscript(structuredTranscript, Array.isArray(transcript) ? transcript.join('\n') : transcript)

      systemPrompt += `\n\n=== HR SCREEN 6-AREA EVALUATION ===
You are evaluating an HR phone screen interview. You will receive:
- Job description
- Candidate's resume
${websiteContent ? '- Company website content' : ''}
- Full interview transcript${structuredTranscript ? ' (structured with question IDs)' : ''}

Your task is to assess the candidate on 6 specific criteria. For each criterion, determine whether it belongs in "What Went Well" or "What Needs to Improve" and provide a brief (1-2 sentence) explanation with evidence.

EVALUATION CRITERIA:

1. Professional Story
   - Use this area for "Tell me about yourself," "Walk me through your background," and similar opening background questions.
   - "What Went Well" if: Gives a clear, selective summary of who they are professionally, explains what they do now, what relevant experience led them here, and where they want to go next, makes their background feel connected by a clear through-line, highlights the parts of their experience that are most relevant to the role, and sounds intentional and concise rather than reciting their resume
   - "Needs to Improve" if: Gives a long, unfocused walkthrough of their background, lists jobs or experiences without a clear through-line, includes too much irrelevant detail, makes it hard to understand what they do now, how they got here, or where they are headed, or sounds like they are reciting their resume instead of telling a coherent professional story
   - Internal grading guidance: When evaluating "Tell me about yourself," "Walk me through your background," or similar questions, strong answers often follow a clear present -> past -> future logic. Reward answers that naturally reflect that flow, even if the structure is not explicit. If the answer jumps around in time, stays too long in the past, never explains current work clearly, or does not land on future direction, that is a sign the response may need work.

2. Specific Examples and Evidence
   - Use this area for answers where the candidate is describing a skill, strength, experience, accomplishment, challenge, or way of working and needs to support it with believable proof.
   - "What Went Well" if: Supports their points with real, specific examples, includes enough concrete detail to make the example feel believable, makes their role in the example clear, explains what they actually did rather than just what the team did, and uses proof that strengthens the point they are trying to make
   - "Needs to Improve" if: Relies mostly on broad claims like "I'm good at..." or "I usually...", gives examples that are too vague to feel convincing, talks in summaries or patterns without anchoring them in one real example, makes it unclear what they personally did, or gives proof that is too thin, generic, or disconnected from the point they are trying to make
   - Internal grading guidance: When evaluating answers about skills, strengths, accomplishments, problem-solving, or work style, strong responses often use a concrete example with clear context, action, and outcome. Reward answers that naturally show that logic, even if the structure is not explicit. Story-based answers will often resemble STAR, while shorter judgment or work-style answers may use a briefer proof style. If the candidate stays at the level of claims, summaries, or vague patterns without giving one believable example, that is a sign the response may need work.

3. Preparation / Curiosity
   - Use this area for moments when the candidate is asked about the company or role (for example, "What do you know about our company?", "Why this company?", or "What stood out to you?"), as well as the candidate’s questions at the end of the interview.
   - "What Went Well" if: Shows they did basic homework on the company and role, gives answers about the company or role that sound specific, informed, and intentional, can explain what the company does, what the role seems focused on, or what stood out to them without relying on generic praise, asks 1-2 thoughtful, stage-appropriate questions about the role, team, company, or process, asks questions that show real curiosity and help them understand the opportunity better, and sounds like they are taking the opportunity seriously rather than just moving through another application
   - "Needs to Improve" if: Sounds broad, generic, or underprepared when asked about the company or role, relies mostly on praise, surface-level facts, or filler like "you seem like a great company", makes it unclear whether they understand what the company does or what the role is actually about, asks no questions, asks only questions about salary, benefits, hours, remote work, or logistics in a way that can make their interest seem shallow especially early in the process, asks questions that show they did not read the job description or were not paying attention, or asks only broad, generic, or low-value questions that do not help them understand the role
   - Internal grading guidance: This area covers both sides of preparation and curiosity: whether the candidate sounds informed when discussing the company or role, and whether the candidate asks thoughtful, stage-appropriate questions during the question portion. Reward candidates who show basic preparation, real curiosity, and enough specificity to sound like they chose this interview on purpose. In an HR screen, strong answers and questions usually stay close to the company, the role, what stood out, what success looks like, team context, and the interview process. Questions about compensation, benefits, remote work, or logistics are not inherently bad, but if those are the only questions early in the process, that can make the candidate’s interest seem shallow. Score lower when the candidate sounds underprepared, asks nothing, or treats the interaction like just another application.

4. Handling Uncertain/Difficult Questions
   - Use this area for moments when the candidate is asked an unexpected, difficult, or unfamiliar question and does not have a ready-made answer.
   - "What Went Well" if: Stays composed when asked an unexpected, difficult, or unfamiliar question, takes a brief moment to think instead of rushing into a weak answer, answers honestly when they do not have the exact experience or answer, avoids bluffing and instead gives a clear starting point, related example, or thoughtful approach, and finds a way to land the answer clearly instead of rambling or trailing off
   - "Needs to Improve" if: Becomes defensive or visibly flustered, tries to bluff through obvious gaps in knowledge or experience, gives contradictory information, avoids the question instead of engaging with it, starts talking before finding a clear point and ends up rambling, or never arrives at a settled answer or says something like "I'm not sure if that answered your question"
   - Internal grading guidance: When evaluating unexpected or difficult questions, reward candidates who stay calm, take a moment to think, and find a clear angle instead of panicking or filling space. Strong answers often begin with a brief pause or acknowledgment, then move into a clear starting point, reasoning, and a settled answer. A simple answer -> reason -> example flow often works well here once the candidate knows what they want to say, but the structure does not need to be explicit. Score lower when the candidate rambles, bluffs, contradicts themselves, avoids the question, or never lands on a clear point.

5. Alignment of Career Goals with Position
   - Use this area for "Why this role?", "Why this position?", "Why now?", and similar questions about why this move makes sense for the candidate at this point in their career.
   - "What Went Well" if: Makes a clear connection between their background and this specific role, explains why this role stands out over other possible opportunities, makes the timing of the move feel intentional, makes the next step feel logical and coherent, and sounds like they are pursuing a role that fits their direction rather than just looking for change
   - "Needs to Improve" if: Gives generic reasons that could apply to almost any role, focuses mostly on wanting change, growth, or a new challenge without explaining fit, sounds opportunistic or broadly open rather than specifically aligned, does not make the transition from past experience to this role feel logical, or makes it unclear why this move makes sense now
   - Internal grading guidance: When evaluating "Why this role?" and similar alignment questions, strong answers often follow a clear observation -> fit -> timing logic. Reward answers that naturally reflect that flow, even if the structure is not explicit. Strong responses usually point to something specific about the role, connect it to the candidate’s background, and explain why the timing makes sense now. Score lower when the answer stays generic, over-relies on growth or change language, or could apply just as easily to many other jobs.

6. Pace and Conversation Flow
   - Use this area for how the candidate sounds in the interview overall, including pacing, timing, transitions, and whether the conversation feels natural rather than stiff, rushed, awkward, or memorized.
   - "What Went Well" if: Responds with a natural, conversational rhythm, uses brief pauses to think without creating awkward dead air, does not interrupt the interviewer, uses simple transitions that make answers easier to follow, sounds prepared and confident without sounding memorized or overly scripted, delivers answers in a way that feels spoken and human rather than recited word for word, and helps the interview feel like a real back-and-forth conversation
   - "Needs to Improve" if: Has frequent awkward silences that disrupt the flow of the conversation, interrupts the interviewer multiple times or starts answering before the question is finished, rushes through answers in a way that makes them hard to follow, sounds overly rehearsed, robotic, or memorized, delivers polished content in a way that feels recited instead of spoken, gives answers that feel abrupt, choppy, or hard to track, or makes the interview feel more like a speech, interrogation, or race to answer than a conversation
   - Internal grading guidance: When evaluating delivery, reward answers that feel easy to follow, well-paced, and conversational. Brief pauses to think are a positive signal when they feel intentional and do not derail the rhythm. Strong candidates usually let the interviewer finish, begin cleanly, use light transitions when shifting ideas, and stop once their point has landed. They may clearly be prepared, but they should still sound like they are speaking naturally rather than reciting a memorized paragraph. Score lower when the candidate frequently interrupts, leaves long dead air, rushes, trails off awkwardly, or sounds like they are delivering a script word for word instead of having a real conversation.

IMPORTANT GUIDELINES:
- Be balanced: Not all 6 should go in the same category
- Be specific: Reference actual quotes or moments from the transcript
- Be fair: Consider the candidate's experience level based on their resume
- Be actionable: If something needs improvement, the feedback should indicate what specifically to work on
- Use question IDs and timestamps from structured transcript when available for evidence

OUTPUT FORMAT FOR 6 AREAS:
You MUST include a "hr_screen_six_areas" field in your JSON response with this structure:
{
  "hr_screen_six_areas": {
    "what_went_well": [
      {
        "criterion": "Professional Story",
        "feedback": "[1-2 sentence explanation with specific reference to transcript]",
        "evidence": [
          {
            "question_id": "q2",
            "timestamp": "3:45",
            "excerpt": "candidate's response excerpt here..."
          }
        ]
      }
    ],
    "what_needs_improve": [
      {
        "criterion": "Specific Examples and Evidence",
        "feedback": "[1-2 sentence explanation with specific reference to transcript]",
        "evidence": [
          {
            "question_id": "q3",
            "timestamp": "5:20",
            "excerpt": "candidate's response excerpt here..."
          }
        ]
      }
    ]
  }
}

Each of the 6 criteria should appear in either "what_went_well" or "what_needs_improve" (not both).
`

      if (blankInterview) {
        systemPrompt += `\n\nBLANK INTERVIEW GUARDRAIL:
The candidate provided no substantive verbal responses in this interview.
- Do NOT treat resume/job-description fit as a demonstrated interview strength
- Do NOT place any of the 6 HR screen areas in "what_went_well"
- Place all 6 HR screen areas in "what_needs_improve"
- You may mention that on-paper alignment exists, but it was NOT demonstrated live in the interview`
      }
      
      if (websiteContent) {
        systemPrompt += `\n\nCOMPANY WEBSITE CONTENT:
${websiteContent}
`
      }
      
      if (structuredTranscript) {
        systemPrompt += `\n\nSTRUCTURED TRANSCRIPT WITH QUESTION TRACKING:
${JSON.stringify(structuredTranscript, null, 2)}

Use the question IDs and timestamps from this structured transcript when providing evidence for your assessments.
`
      }
    }

    systemPrompt += '\n\nYOUR EVALUATION APPROACH:'
    systemPrompt += `\n- Honesty Level: ${settings.honesty_level.toUpperCase()}`
    systemPrompt += `\n- ${settings.require_job_alignment ? 'MUST' : 'Should'} compare responses directly against job requirements`
    systemPrompt += `\n- ${settings.require_specific_examples ? 'MUST' : 'Should'} reference specific examples from the transcript`

    if (jobDescription) {
      systemPrompt += '\n\nJOB DESCRIPTION:'
      systemPrompt += `\n${jobDescription}`
      systemPrompt += '\n\nYou MUST evaluate how well the candidate\'s responses align with these requirements. Be specific about gaps.'
    }

    if (resume) {
      systemPrompt += '\n\nCANDIDATE RESUME:'
      systemPrompt += `\n${resume}`
      systemPrompt += '\n\nUse this to understand the candidate\'s background and evaluate if their interview responses are consistent with their experience.'
    }

    // Apply stage-specific weight overrides if they exist
    const criteriaWithWeights = criteria.map((criterion) => {
      let weight = criterion.weight || 1.0
      
      // Apply stage-specific weight override if it exists
      if (stageInstructions?.weight_overrides && stageInstructions.weight_overrides[criterion.assessment_area] !== undefined) {
        weight = stageInstructions.weight_overrides[criterion.assessment_area]
      }
      
      return {
        ...criterion,
        weight: weight
      }
    })

    if (criteriaWithWeights.length > 0) {
      systemPrompt += '\n\nASSESSMENT AREAS AND CRITERIA:'
      criteriaWithWeights.forEach((criterion) => {
        systemPrompt += `\n\n${criterion.area_name} (Weight: ${criterion.weight}):`
        systemPrompt += `\nDescription: ${criterion.description}`
        systemPrompt += `\nEvaluation Guidelines: ${criterion.evaluation_guidelines}`
        systemPrompt += `\nScoring Rubric: ${criterion.rubric}`
      })
    }

    systemPrompt += '\n\nYOUR RESPONSE FORMAT:'
    systemPrompt += '\nYou MUST respond with valid JSON in this exact format:'
    if (stage === 'hr_screen' && !HR_DETAILED_REPORT_ENABLED) {
      // Compact HR schema — detailed report stored away (see HR_DETAILED_REPORT_ENABLED).
      systemPrompt += '\n{'
      systemPrompt += '\n  "overall_assessment": {'
      systemPrompt += '\n    "overall_score": <number 1-10>,'
      systemPrompt += '\n    "likelihood_to_advance": "<likely|unlikely|marginal>",'
      systemPrompt += '\n    "key_strengths": [<array of 3-5 key strengths with specific examples>],'
      systemPrompt += '\n    "key_weaknesses": [<array of 2-4 areas for improvement with specific examples>],'
      systemPrompt += '\n    "summary": "<comprehensive overall feedback paragraph>"'
      systemPrompt += '\n  },'
      systemPrompt += '\n  "next_steps_preparation": {'
      systemPrompt += '\n    "improvement_suggestions": [<array of 3-5 actionable improvement suggestions>]'
      systemPrompt += '\n  },'
      systemPrompt += '\n  "hr_screen_six_areas": {<the 6-area assessment structure as described above>}'
      systemPrompt += '\n}'
      systemPrompt += '\n\nCRITICAL: Include ONLY these top-level fields, nothing else:'
      systemPrompt += '\n- overall_assessment (overall_score, likelihood_to_advance, key_strengths, key_weaknesses, summary)'
      systemPrompt += '\n- next_steps_preparation (improvement_suggestions)'
      systemPrompt += '\n- hr_screen_six_areas (what_went_well and what_needs_improve arrays)'
    } else {
    systemPrompt += '\n{'
    systemPrompt += '\n  "overall_assessment": {'
    systemPrompt += '\n    "overall_score": <number 1-10>,'
    systemPrompt += '\n    "likelihood_to_advance": "<likely|unlikely|marginal>",'
    systemPrompt += '\n    "key_strengths": [<array of 3-5 key strengths with specific examples>],'
    systemPrompt += '\n    "key_weaknesses": [<array of 2-4 areas for improvement with specific examples>],'
    systemPrompt += '\n    "summary": "<comprehensive overall feedback paragraph>"'
    systemPrompt += '\n  },'
    systemPrompt += '\n  "traditional_hr_criteria": {'
    systemPrompt += '\n    "scores": {'
    systemPrompt += '\n      "communication_skills": <number 1-10>,'
    systemPrompt += '\n      "professionalism": <number 1-10>,'
    systemPrompt += '\n      "basic_qualifications_match": <number 1-10>,'
    systemPrompt += '\n      "interest_and_enthusiasm": <number 1-10>,'
    systemPrompt += '\n      "culture_fit_indicators": <number 1-10>,'
    systemPrompt += '\n      "response_quality": <number 1-10>,'
    systemPrompt += '\n      "red_flags": <number 1-10>'
    systemPrompt += '\n    },'
    systemPrompt += '\n    "feedback": {'
    systemPrompt += '\n      "communication_skills": "<detailed feedback for communication skills, with specific examples from transcript>",'
    systemPrompt += '\n      "professionalism": "<detailed feedback for professionalism (greeting, closing, tone, environment, etiquette), with specific examples>",'
    systemPrompt += '\n      "basic_qualifications_match": "<detailed feedback on how well candidate matches basic job requirements (experience, skills, authorization, availability), with specific examples>",'
    systemPrompt += '\n      "interest_and_enthusiasm": "<detailed feedback on candidate interest and enthusiasm (company knowledge, energy level, questions asked), with specific examples>",'
    systemPrompt += '\n      "culture_fit_indicators": "<detailed feedback on culture fit (work style, values alignment, collaboration), with specific examples>",'
    systemPrompt += '\n      "response_quality": "<detailed feedback on response quality (relevance, specificity, honesty, conciseness), with specific examples>",'
    systemPrompt += '\n      "red_flags": "<detailed assessment of any red flags (concerning behavior, inconsistencies, inappropriate comments), with specific examples if any>"'
    systemPrompt += '\n    }'
    systemPrompt += '\n  },'
    systemPrompt += '\n  "time_management_analysis": {'
    systemPrompt += '\n    "per_question_timing": [<array of timing objects with question_id, question_text, candidate_response_time, duration_seconds, assessment, target_range>],'
    systemPrompt += '\n    "total_interview_duration": "<formatted duration like 15:32>",'
    systemPrompt += '\n    "target_duration": "<target duration like 15-20 minutes>",'
    systemPrompt += '\n    "variance": "<variance from target, e.g., +2:15 or -0:45>",'
    systemPrompt += '\n    "questions_asked": <number of questions asked>,'
    systemPrompt += '\n    "overall_pace": "<detailed assessment of pacing with specific feedback>"'
    systemPrompt += '\n  },'
    systemPrompt += '\n  "question_analysis": {'
    systemPrompt += '\n    "questions": [<array of question-level analysis objects>]'
    systemPrompt += '\n  },'
    systemPrompt += '\n  "next_steps_preparation": {'
    systemPrompt += '\n    "ready_for_hiring_manager": <boolean - true if candidate should advance, false if not ready>,'
    systemPrompt += '\n    "confidence_level": "<string - Low|Medium-Low|Medium|Medium-High|High - confidence in readiness assessment>",'
    systemPrompt += '\n    "improvement_suggestions": [<array of actionable improvement suggestions>],'
    systemPrompt += '\n    "practice_recommendations": {'
    systemPrompt += '\n      "immediate_focus_areas": [<array of areas to practice>]'
    systemPrompt += '\n    },'
    systemPrompt += '\n    "areas_to_study": [<array of objects with topic, reason, and preparation_tip for each area>],'
    systemPrompt += '\n    "predicted_hiring_manager_questions": [<array of likely questions the hiring manager will ask>]'
    systemPrompt += '\n  },'
    systemPrompt += '\n  "comparative_analysis": {'
    systemPrompt += '\n    "resume_vs_interview": "<detailed comparison text between resume claims and interview performance>",'
    systemPrompt += '\n    "job_requirements_gaps": [<array of specific gaps identified between candidate and job requirements>],'
    systemPrompt += '\n    "standout_qualities": [<array of 2-4 specific qualities that made this candidate stand out compared to typical candidates>],'
    systemPrompt += '\n    "common_weaknesses_avoided": [<array of 2-4 common interview mistakes that this candidate avoided>],'
    systemPrompt += '\n    "percentile_estimate": <number 0-100 - your best estimate of what percentile this candidate falls into based on typical HR screen performance>'
    systemPrompt += '\n  }'
    if (stage === 'hr_screen') {
      systemPrompt += ',\n  "hr_screen_six_areas": {<the 6-area assessment structure as described above>}'
    }
    systemPrompt += '\n}'
    
    systemPrompt += '\n\nCRITICAL: You MUST include ALL of these top-level fields in your JSON response:'
    systemPrompt += '\n- overall_assessment (with overall_score, likelihood_to_advance, key_strengths, key_weaknesses, summary)'
    systemPrompt += '\n- traditional_hr_criteria (with scores and feedback objects containing ALL 7 required criteria listed above)'
    systemPrompt += '\n- time_management_analysis'
    systemPrompt += '\n- question_analysis'
    systemPrompt += '\n- next_steps_preparation'
    systemPrompt += '\n- comparative_analysis'
    if (stage === 'hr_screen') {
      systemPrompt += '\n- hr_screen_six_areas (with what_went_well and what_needs_improve arrays)'
    }
    }

    if (HR_DETAILED_REPORT_ENABLED || stage !== 'hr_screen') {
    systemPrompt += '\n\nMANDATORY REQUIREMENTS FOR traditional_hr_criteria:'
    systemPrompt += '\nYou MUST include ALL 7 criteria in both "scores" and "feedback" objects with these EXACT names:'
    systemPrompt += '\n1. communication_skills'
    systemPrompt += '\n2. professionalism'
    systemPrompt += '\n3. basic_qualifications_match'
    systemPrompt += '\n4. interest_and_enthusiasm'
    systemPrompt += '\n5. culture_fit_indicators'
    systemPrompt += '\n6. response_quality'
    systemPrompt += '\n7. red_flags'
    systemPrompt += '\n\nDO NOT use alternative names like "communication", "cultural_fit", "job_alignment", etc.'
    systemPrompt += '\nDO NOT omit any of these 7 criteria. Every single one must be present with both a score and feedback text.'
    systemPrompt += '\nIf you cannot assess a criterion due to limited data, provide your best assessment based on available information, but you MUST still include it.'
    
    systemPrompt += '\n\nMANDATORY REQUIREMENTS FOR comparative_analysis:'
    systemPrompt += '\nYou MUST include ALL of these fields:'
    systemPrompt += '\n- resume_vs_interview: Detailed comparison text'
    systemPrompt += '\n- job_requirements_gaps: Array of specific gaps (can be empty array if no gaps)'
    systemPrompt += '\n- standout_qualities: Array of 2-4 specific qualities that made this candidate stand out'
    systemPrompt += '\n- common_weaknesses_avoided: Array of 2-4 common interview mistakes this candidate avoided'
    systemPrompt += '\n- percentile_estimate: Your best estimate (0-100) of where this candidate ranks compared to typical HR screen candidates'
    systemPrompt += '\n\nDO NOT calculate percentile from overall_score. Provide your honest assessment based on typical candidate performance.'
    systemPrompt += '\nDO NOT create generic placeholder text. All fields must contain real, specific assessments.'
    }

    systemPrompt += '\n\nSCORING SCALE (STRICT - SCORES MUST ALIGN WITH YOUR ANALYSIS):'
    systemPrompt += '\nAll scores use a 1-10 scale. Your scores MUST match the severity and quality described in your analysis. Do not inflate scores.'
    systemPrompt += '\n\nScore Definitions (applies to ALL criteria):'
    systemPrompt += '\n- 1-2: Poor/Unacceptable - Major issues, significant gaps, does NOT meet basic requirements or expectations'
    systemPrompt += '\n- 3-4: Below Average - Noticeable problems, substantial gaps, partially meets requirements but has important deficiencies'
    systemPrompt += '\n- 5-6: Average/Adequate - Meets basic requirements, acceptable performance with some gaps or areas for improvement'
    systemPrompt += '\n- 7: Good - Exceeds basic expectations, solid performance with minor areas for improvement'
    systemPrompt += '\n- 8: Very Good - Strong performance, clearly above average, demonstrates clear competency'
    systemPrompt += '\n- 9: Excellent - Outstanding performance, exceptional demonstration of skills and fit'
    systemPrompt += '\n- 10: Exceptional - Perfect or near-perfect performance, exemplary in all areas'
    systemPrompt += '\n\nCRITICAL SCORING PRINCIPLE:'
    systemPrompt += '\nYour scores MUST match the severity and quality described in your analysis, regardless of which criterion you are evaluating.'
    systemPrompt += '\n- If your analysis describes poor performance, significant gaps, or failure to meet requirements → score MUST be 1-2/10'
    systemPrompt += '\n- If your analysis describes below-average performance or important deficiencies → score should be 3-4/10'
    systemPrompt += '\n- If your analysis describes adequate performance that meets basic requirements → score should be 5-6/10'
    systemPrompt += '\n- If your analysis describes good performance that exceeds expectations → score should be 7-8/10'
    systemPrompt += '\n- If your analysis describes excellent or outstanding performance → score should be 9-10/10'
    systemPrompt += '\n\nDO NOT inflate scores. A score must accurately reflect what your analysis describes:'
    systemPrompt += '\n- "Significant gaps" + "has none" of required qualifications → 1-2/10 (not 3-4/10)'
    systemPrompt += '\n- "Meets basic requirements" → 5-6/10 (fair score for competent users)'
    systemPrompt += '\n- "Exceeds expectations" → 7-8/10 (encouraging score for good performance)'
    systemPrompt += '\n\nRemember: You can write encouraging, constructive feedback text (this is a coaching tool), but the scores must honestly reflect the performance level described in your analysis.'

    systemPrompt += '\n\nCRITICAL INSTRUCTIONS:'
    systemPrompt += '\n- Be HONEST and DIRECT. Do not sugarcoat weaknesses.'
    systemPrompt += '\n- Reference SPECIFIC quotes or examples from the transcript.'
    systemPrompt += '\n- Compare responses to job requirements explicitly.'
    systemPrompt += '\n- If a candidate performed poorly, state it clearly with evidence.'
    systemPrompt += '\n- Balance honesty with constructive guidance - be tough but fair.'
    systemPrompt += '\n- Calculate overall_score as a weighted average of area_scores using the weights provided.'
    systemPrompt += '\n- Remember: You can write encouraging, actionable feedback while still giving honest scores that match your analysis.'

    // HR Screen: default to compact pass/fail grading. Keep Sonnet path available
    // for future paid-stage reuse by setting HR_SCREEN_GRADING_MODE=sonnet.
    if (stage === 'hr_screen') {
      if (HR_SCREEN_GRADING_MODE === 'v2_question_level' || HR_SCREEN_GRADING_MODE === 'pass_fail') {
        try {
          const gradingMaterials = {
            transcript: Array.isArray(transcript) ? transcript.join('\n') : transcript,
            transcriptStructured: structuredTranscript,
            resume: resume || '',
            jobDescription: jobDescription || '',
            websiteContent: websiteContent || '',
          }

          let rubric = HR_SCREEN_GRADING_MODE === 'v2_question_level'
            ? await gradeHrScreenQuestionLevel(gradingMaterials)
            : await gradeHrScreenPassFail(gradingMaterials)

          if (isBlankInterviewTranscript(structuredTranscript, Array.isArray(transcript) ? transcript.join('\n') : transcript)) {
            applyBlankInterviewGuardrailToHrRubric(rubric)
          }

          rubric = await enrichHrWeakSignalsWithHaikuRewrites(rubric, structuredTranscript)

          if (!validateHrScreenRubric(rubric)) {
            console.error('Lean HR rubric validation failed:', JSON.stringify(rubric, null, 2).substring(0, 500))
            throw new Error('Invalid lean HR rubric structure')
          }

          const costEstimate = buildHrCostEstimate({
            transcript: Array.isArray(transcript) ? transcript.join('\n') : transcript,
            structuredTranscript,
            durationSeconds: sessionDurationSeconds,
            graderCostEstimate: rubric.cost_estimate,
          })
          rubric.cost_estimate = costEstimate

          const feedback = {
            overall_score: rubric.overall_assessment.overall_score,
            area_scores: Object.fromEntries((rubric.areas || []).map((area: any) => [area.id, area.points_awarded])),
            area_feedback: Object.fromEntries((rubric.areas || []).map((area: any) => [area.id, area.feedback])),
            strengths: rubric.overall_assessment.key_strengths || [],
            weaknesses: rubric.overall_assessment.key_weaknesses || [],
            suggestions: rubric.next_steps_preparation?.improvement_suggestions || [],
            detailed_feedback: rubric.overall_assessment.summary || '',
            hr_screen_six_areas: rubric.hr_screen_six_areas || {
              what_went_well: [],
              what_needs_improve: [],
            },
          }

          const insertData: any = {
            interview_session_id: sessionId,
            overall_score: Math.round(feedback.overall_score),
            strengths: feedback.strengths,
            weaknesses: feedback.weaknesses,
            suggestions: feedback.suggestions,
            detailed_feedback: feedback.detailed_feedback,
            area_scores: feedback.area_scores,
            area_feedback: feedback.area_feedback,
            full_rubric: rubric,
          }

          const { error: dbError } = await supabaseAdmin
            .from('interview_feedback')
            .insert(insertData)
            .select()
            .single()

          if (dbError) {
            console.error('Error saving lean HR feedback to database:', dbError)
            return NextResponse.json(
              { error: 'Failed to save feedback', details: dbError.message },
              { status: 500 }
            )
          }

          await supabaseAdmin
            .from('interview_sessions')
            .update({
              observer_notes: {
                ...(observerNotes && typeof observerNotes === 'object' ? observerNotes : {}),
                cost_estimate: costEstimate,
              },
            })
            .eq('id', sessionId)

          return NextResponse.json({
            success: true,
            feedback: {
              overall_score: Math.round(feedback.overall_score),
              area_scores: feedback.area_scores,
              area_feedback: feedback.area_feedback,
              strengths: feedback.strengths,
              weaknesses: feedback.weaknesses,
              suggestions: feedback.suggestions,
              detailed_feedback: feedback.detailed_feedback,
              hr_screen_six_areas: feedback.hr_screen_six_areas,
              full_rubric: rubric,
            },
          })
        } catch (passFailError: any) {
          console.error('Lean HR grading failed:', passFailError)
          return NextResponse.json(
            { error: 'Failed to generate HR screen feedback', details: passFailError?.message || 'Unknown error' },
            { status: 500 }
          )
        }
      }

      try {
        // Build grading materials
        // Pass the full system prompt as gradingInstructions so Claude gets all the requirements
        const gradingMaterials: GradingMaterials = {
          transcript: Array.isArray(transcript) ? transcript.join('\n') : transcript,
          transcriptStructured: structuredTranscript,
          observerNotes: observerNotes || {},
          resume: resume || '',
          jobDescription: jobDescription || '',
          companyWebsite: companyWebsite || '',
          websiteContent: websiteContent || '',
          stage: stage,
          gradingInstructions: systemPrompt, // Pass the full system prompt with all requirements
        }

        // Call Claude grader with retry logic
        let rubric = await gradeHrScreenWithRetry(gradingMaterials, 3)

        if (isBlankInterviewTranscript(structuredTranscript, Array.isArray(transcript) ? transcript.join('\n') : transcript)) {
          applyBlankInterviewGuardrailToHrRubric(rubric)
        }

        rubric = await enrichHrWeakSignalsWithHaikuRewrites(rubric, structuredTranscript)

        // Validate rubric
        if (!validateHrScreenRubric(rubric)) {
          console.error('Rubric validation failed, falling back to OpenAI')
          console.error('Rubric structure:', JSON.stringify(rubric, null, 2).substring(0, 500))
          throw new Error('Invalid rubric structure from Claude')
        }

        // Derive fields from rubric for backwards compatibility
        const feedback = {
          overall_score: rubric.overall_assessment.overall_score,
          area_scores: rubric.traditional_hr_criteria?.scores || {},
          area_feedback: rubric.traditional_hr_criteria?.feedback || {},
          strengths: rubric.overall_assessment.key_strengths || [],
          weaknesses: rubric.overall_assessment.key_weaknesses || [],
          suggestions: rubric.next_steps_preparation.improvement_suggestions || [],
          detailed_feedback: rubric.overall_assessment.summary || '',
          hr_screen_six_areas: rubric.hr_screen_six_areas || {
            what_went_well: [],
            what_needs_improve: [],
          },
        }

        // Save feedback to database (both full rubric and derived fields)
        const insertData: any = {
          interview_session_id: sessionId,
          overall_score: Math.round(feedback.overall_score),
          strengths: feedback.strengths,
          weaknesses: feedback.weaknesses,
          suggestions: feedback.suggestions,
          detailed_feedback: feedback.detailed_feedback,
          area_scores: feedback.area_scores,
          area_feedback: feedback.area_feedback,
          full_rubric: rubric, // Store complete rubric (includes hr_screen_six_areas)
        }

        // Use supabaseAdmin to bypass RLS for insert
        let savedFeedback: any = null
        const { data: insertResult, error: dbError } = await supabaseAdmin
          .from('interview_feedback')
          .insert(insertData)
          .select()
          .single()

        if (dbError) {
          console.error('Error saving feedback to database:', dbError)
          return NextResponse.json(
            { error: 'Failed to save feedback', details: dbError.message },
            { status: 500 }
          )
        } else {
          savedFeedback = insertResult
        }

        return NextResponse.json({
          success: true,
          feedback: {
            overall_score: Math.round(feedback.overall_score),
            area_scores: feedback.area_scores,
            area_feedback: feedback.area_feedback,
            strengths: feedback.strengths,
            weaknesses: feedback.weaknesses,
            suggestions: feedback.suggestions,
            detailed_feedback: feedback.detailed_feedback,
            hr_screen_six_areas: feedback.hr_screen_six_areas,
          },
        })
      } catch (claudeError: any) {
        console.error('Claude grading failed:', claudeError)
        console.error('Claude error message:', claudeError?.message)
        console.error('Claude error stack:', claudeError?.stack)
        console.warn('Falling back to OpenAI grader')
        console.warn('WARNING: OpenAI grader does NOT generate full_rubric - detailed report will not be available')
        // Fall through to OpenAI path below
      }
    }

    // Hiring Manager: Use Claude Grader with two-tier system
    if (stage === 'hiring_manager') {
      try {
        const gradingMaterials: GradingMaterials = {
          transcript: Array.isArray(transcript) ? transcript.join('\n') : transcript,
          transcriptStructured: structuredTranscript,
          observerNotes: observerNotes || {},
          resume: resume || '',
          jobDescription: jobDescription || '',
          companyWebsite: companyWebsite || '',
          websiteContent: websiteContent || '',
          stage: stage,
          gradingInstructions: systemPrompt,
          hrScreenFeedback: hrScreenFeedback || undefined,
        }

        const rubric = await gradeHiringManagerWithRetry(gradingMaterials, 3)

        // Validate rubric
        if (!validateHiringManagerRubric(rubric)) {
          console.error('Hiring Manager rubric validation failed, falling back to OpenAI')
          throw new Error('Invalid rubric structure from Claude')
        }

        // Derive fields from rubric for backwards compatibility
        const feedback = {
          overall_score: rubric.overall_assessment.overall_score,
          area_scores: rubric.hiring_manager_criteria?.scores || {},
          area_feedback: rubric.hiring_manager_criteria?.feedback || {},
          strengths: rubric.overall_assessment.key_strengths || [],
          weaknesses: rubric.overall_assessment.key_weaknesses || [],
          suggestions: rubric.next_steps_preparation?.improvement_suggestions || [],
          detailed_feedback: rubric.overall_assessment.summary || '',
          hiring_manager_six_areas: rubric.hiring_manager_six_areas || {
            what_went_well: [],
            what_needs_improve: [],
          },
        }

        // Save feedback to database
        const insertData: any = {
          interview_session_id: sessionId,
          overall_score: Math.round(feedback.overall_score),
          strengths: feedback.strengths,
          weaknesses: feedback.weaknesses,
          suggestions: feedback.suggestions,
          detailed_feedback: feedback.detailed_feedback,
          area_scores: feedback.area_scores,
          area_feedback: feedback.area_feedback,
          full_rubric: rubric,
        }

        const { data: savedFeedback, error: dbError } = await supabaseAdmin
          .from('interview_feedback')
          .insert(insertData)
          .select()
          .single()

        if (dbError) {
          console.error('Error saving Hiring Manager feedback to database:', dbError)
          return NextResponse.json(
            { error: 'Failed to save feedback', details: dbError.message },
            { status: 500 }
          )
        }

        return NextResponse.json({
          success: true,
          feedback: {
            overall_score: Math.round(feedback.overall_score),
            area_scores: feedback.area_scores,
            area_feedback: feedback.area_feedback,
            strengths: feedback.strengths,
            weaknesses: feedback.weaknesses,
            suggestions: feedback.suggestions,
            detailed_feedback: feedback.detailed_feedback,
            hiring_manager_six_areas: feedback.hiring_manager_six_areas,
          },
        })
      } catch (claudeError: any) {
        console.error('Claude Hiring Manager grading failed:', claudeError)
        console.error('Error message:', claudeError?.message)
        console.warn('Falling back to OpenAI grader for Hiring Manager')
        // Fall through to OpenAI path below
      }
    }

    // Culture Fit grading via Claude
    if (stage === 'culture_fit') {
      try {
        const gradingMaterials: GradingMaterials = {
          transcript: Array.isArray(transcript) ? transcript.join('\n') : transcript,
          transcriptStructured: structuredTranscript,
          observerNotes: observerNotes || {},
          resume: resume || '',
          jobDescription: jobDescription || '',
          companyWebsite: companyWebsite || '',
          websiteContent: websiteContent || '',
          stage: stage,
          gradingInstructions: systemPrompt,
          hrScreenFeedback: hrScreenFeedback || undefined,
        }

        const rubric = await gradeCultureFitWithRetry(gradingMaterials, 3)

        if (!validateCultureFitRubric(rubric)) {
          console.error('Culture Fit rubric validation failed, falling back to OpenAI')
          throw new Error('Invalid rubric structure from Claude')
        }

        const feedback = {
          overall_score: rubric.overall_assessment.overall_score,
          area_scores: (rubric as any).culture_fit_criteria?.scores || {},
          area_feedback: (rubric as any).culture_fit_criteria?.feedback || {},
          strengths: rubric.overall_assessment.key_strengths || [],
          weaknesses: rubric.overall_assessment.key_weaknesses || [],
          suggestions: rubric.next_steps_preparation?.improvement_suggestions || [],
          detailed_feedback: rubric.overall_assessment.summary || '',
        }

        const insertData: any = {
          interview_session_id: sessionId,
          overall_score: Math.round(feedback.overall_score),
          strengths: feedback.strengths,
          weaknesses: feedback.weaknesses,
          suggestions: feedback.suggestions,
          detailed_feedback: feedback.detailed_feedback,
          area_scores: feedback.area_scores,
          area_feedback: feedback.area_feedback,
          full_rubric: rubric,
        }

        const { data: savedFeedback, error: dbError } = await supabaseAdmin
          .from('interview_feedback')
          .insert(insertData)
          .select()
          .single()

        if (dbError) {
          console.error('Error saving Culture Fit feedback:', dbError)
          return NextResponse.json({ error: 'Failed to save feedback', details: dbError.message }, { status: 500 })
        }

        return NextResponse.json({
          success: true,
          feedback: {
            overall_score: Math.round(feedback.overall_score),
            area_scores: feedback.area_scores,
            area_feedback: feedback.area_feedback,
            strengths: feedback.strengths,
            weaknesses: feedback.weaknesses,
            suggestions: feedback.suggestions,
            detailed_feedback: feedback.detailed_feedback,
            culture_fit_six_areas: (rubric as any).culture_fit_six_areas,
          },
        })
      } catch (claudeError: any) {
        console.error('Claude Culture Fit grading failed:', claudeError?.message)
        console.warn('Falling back to OpenAI grader')
      }
    }

    // Final Round grading via Claude
    if (stage === 'final') {
      try {
        const gradingMaterials: GradingMaterials = {
          transcript: Array.isArray(transcript) ? transcript.join('\n') : transcript,
          transcriptStructured: structuredTranscript,
          observerNotes: observerNotes || {},
          resume: resume || '',
          jobDescription: jobDescription || '',
          companyWebsite: companyWebsite || '',
          websiteContent: websiteContent || '',
          stage: stage,
          gradingInstructions: systemPrompt,
          hrScreenFeedback: hrScreenFeedback || undefined,
        }

        const rubric = await gradeFinalRoundWithRetry(gradingMaterials, 3)

        if (!validateFinalRoundRubric(rubric)) {
          console.error('Final Round rubric validation failed, falling back to OpenAI')
          throw new Error('Invalid rubric structure from Claude')
        }

        const feedback = {
          overall_score: rubric.overall_assessment.overall_score,
          area_scores: (rubric as any).final_round_criteria?.scores || {},
          area_feedback: (rubric as any).final_round_criteria?.feedback || {},
          strengths: rubric.overall_assessment.key_strengths || [],
          weaknesses: rubric.overall_assessment.key_weaknesses || [],
          suggestions: rubric.next_steps_preparation?.improvement_suggestions || [],
          detailed_feedback: rubric.overall_assessment.summary || '',
        }

        const insertData: any = {
          interview_session_id: sessionId,
          overall_score: Math.round(feedback.overall_score),
          strengths: feedback.strengths,
          weaknesses: feedback.weaknesses,
          suggestions: feedback.suggestions,
          detailed_feedback: feedback.detailed_feedback,
          area_scores: feedback.area_scores,
          area_feedback: feedback.area_feedback,
          full_rubric: rubric,
        }

        const { data: savedFeedback, error: dbError } = await supabaseAdmin
          .from('interview_feedback')
          .insert(insertData)
          .select()
          .single()

        if (dbError) {
          console.error('Error saving Final Round feedback:', dbError)
          return NextResponse.json({ error: 'Failed to save feedback', details: dbError.message }, { status: 500 })
        }

        return NextResponse.json({
          success: true,
          feedback: {
            overall_score: Math.round(feedback.overall_score),
            area_scores: feedback.area_scores,
            area_feedback: feedback.area_feedback,
            strengths: feedback.strengths,
            weaknesses: feedback.weaknesses,
            suggestions: feedback.suggestions,
            detailed_feedback: feedback.detailed_feedback,
            final_round_six_areas: (rubric as any).final_round_six_areas,
          },
        })
      } catch (claudeError: any) {
        console.error('Claude Final Round grading failed:', claudeError?.message)
        console.warn('Falling back to OpenAI grader')
      }
    }

    // Non-HR/non-HM stages or Claude fallback: Use OpenAI (existing path)
    // Build user message with transcript
    const transcriptText = Array.isArray(transcript) ? transcript.join('\n') : transcript
    const userMessage = `Please analyze this interview transcript and provide honest, job-specific feedback:\n\n${transcriptText}`

    // Generate feedback using ChatGPT
    const completion = await getOpenAI().chat.completions.create({
      model: AI_MODELS.lightweightReasoning,
      messages: [
        {
          role: 'system',
          content: systemPrompt,
        },
        {
          role: 'user',
          content: userMessage,
        },
      ],
      temperature: 0.7,
    })

    const feedbackText = completion.choices[0]?.message?.content || '{}'
    
    // Try to parse as JSON
    let feedback: any
    try {
      feedback = JSON.parse(feedbackText)
    } catch (parseError) {
      console.error('Failed to parse feedback JSON:', parseError)
      // Fallback: create structured response
      feedback = {
        overall_score: 5,
        area_scores: {},
        area_feedback: {},
        strengths: [],
        weaknesses: [],
        suggestions: [],
        detailed_feedback: feedbackText,
      }
      
      // Try to extract area scores from text if criteria exist
      criteria.forEach((criterion) => {
        feedback.area_scores[criterion.assessment_area] = 5
        feedback.area_feedback[criterion.assessment_area] = 'Unable to parse detailed feedback for this area.'
      })
    }

    // Ensure all required fields exist
    if (!feedback.area_scores) feedback.area_scores = {}
    if (!feedback.area_feedback) feedback.area_feedback = {}
    if (!feedback.strengths) feedback.strengths = []
    if (!feedback.weaknesses) feedback.weaknesses = []
    if (!feedback.suggestions) feedback.suggestions = []
    if (!feedback.detailed_feedback) feedback.detailed_feedback = ''
    
    // For HR screen: Ensure hr_screen_six_areas exists
    if (stage === 'hr_screen') {
      if (!feedback.hr_screen_six_areas) {
        feedback.hr_screen_six_areas = {
          what_went_well: [],
          what_needs_improve: []
        }
      }
      // Ensure both arrays exist
      if (!feedback.hr_screen_six_areas.what_went_well) {
        feedback.hr_screen_six_areas.what_went_well = []
      }
      if (!feedback.hr_screen_six_areas.what_needs_improve) {
        feedback.hr_screen_six_areas.what_needs_improve = []
      }
    }

    // Calculate overall score if not provided or if area scores exist
    // Use criteriaWithWeights (which includes stage-specific overrides) for calculation
    if (!feedback.overall_score || Object.keys(feedback.area_scores).length > 0) {
      const totalWeight = criteriaWithWeights.reduce((sum, c) => sum + (c.weight || 1.0), 0)
      const weightedSum = criteriaWithWeights.reduce((sum, c) => {
        const score = feedback.area_scores[c.assessment_area] || 5
        return sum + (score * (c.weight || 1.0))
      }, 0)
      feedback.overall_score = totalWeight > 0 ? Math.round((weightedSum / totalWeight) * 10) / 10 : 5
    }

    // Save feedback to database
    const insertData: any = {
      interview_session_id: sessionId,
      overall_score: Math.round(feedback.overall_score),
      strengths: feedback.strengths || [],
      weaknesses: feedback.weaknesses || [],
      suggestions: feedback.suggestions || [],
      detailed_feedback: feedback.detailed_feedback || '',
      area_scores: feedback.area_scores || {},
      area_feedback: feedback.area_feedback || {},
    }
    
    const { data: savedFeedback, error: dbError } = await supabase
      .from('interview_feedback')
      .insert(insertData)
      .select()
      .single()

    if (dbError) {
      console.error('Error saving feedback to database:', dbError)
      return NextResponse.json(
        { error: 'Failed to save feedback', details: dbError.message },
        { status: 500 }
      )
    }

    console.log('Feedback saved successfully:', savedFeedback?.id)

    const responseFeedback: any = {
      overall_score: Math.round(feedback.overall_score),
      area_scores: feedback.area_scores || {},
      area_feedback: feedback.area_feedback || {},
      strengths: feedback.strengths || [],
      weaknesses: feedback.weaknesses || [],
      suggestions: feedback.suggestions || [],
      detailed_feedback: feedback.detailed_feedback || '',
    }
    
    // Add hr_screen_six_areas for HR screen
    if (stage === 'hr_screen' && feedback.hr_screen_six_areas) {
      responseFeedback.hr_screen_six_areas = feedback.hr_screen_six_areas
    }
    
    // Track HR screen completions for authenticated users
    if (stage === 'hr_screen') {
      try {
        const supabaseAuth = createRouteHandlerClient({ cookies })
        const { data: { session: authSession } } = await supabaseAuth.auth.getSession()
        if (authSession) {
          await supabaseAdmin.rpc('increment_hr_completions', { user_id_param: authSession.user.id })
        }
      } catch (hrTrackError) {
        console.error('Error tracking HR completion:', hrTrackError)
      }
    }

    // Deduct credit for completed paid interview
    if (stage && shouldDeductInterviewCredit(stage)) {
      try {
        const supabaseAuth = createRouteHandlerClient({ cookies })
        const { data: { session: authSession } } = await supabaseAuth.auth.getSession()
        if (authSession) {
          const { deductCredit } = await import('@/lib/credit-check')
          await deductCredit(authSession.user.id, stage)
        }
      } catch (creditError) {
        console.error('Error deducting credit:', creditError)
        // Don't fail the request — feedback was already saved
      }
    }

    return NextResponse.json({
      success: true,
      feedback: responseFeedback,
    })
  } catch (error) {
    console.error('Error generating feedback:', error)
    return NextResponse.json(
      { error: 'Failed to generate feedback' },
      { status: 500 }
    )
  }
}
