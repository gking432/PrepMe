import fs from 'node:fs'
import path from 'node:path'
import { createClient } from '@supabase/supabase-js'

const rootDir = process.cwd()
const envPath = path.join(rootDir, '.env.local')

if (fs.existsSync(envPath)) {
  const lines = fs.readFileSync(envPath, 'utf8').split(/\r?\n/)
  for (const line of lines) {
    const trimmed = line.trim()
    if (!trimmed || trimmed.startsWith('#')) continue
    const match = trimmed.match(/^([A-Za-z_][A-Za-z0-9_]*)=(.*)$/)
    if (!match) continue
    const [, key, rawValue] = match
    if (!process.env[key]) {
      process.env[key] = rawValue.replace(/^['"]|['"]$/g, '')
    }
  }
}

const requiredEnv = ['NEXT_PUBLIC_SUPABASE_URL', 'SUPABASE_SERVICE_ROLE_KEY', 'ANTHROPIC_API_KEY']
const missingEnv = requiredEnv.filter((key) => !process.env[key])
if (missingEnv.length) {
  console.error(`Missing required env vars: ${missingEnv.join(', ')}`)
  process.exit(1)
}

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { persistSession: false } },
)

const HR_REWRITE_METHODS = [
  {
    id: 'present_past_future',
    label: 'Present-Past-Future',
    instruction: 'Rewrite as Present -> Past -> Future: current professional lane, relevant background proof, then why this role is the logical next step.',
  },
  {
    id: 'star',
    label: 'STAR',
    instruction: 'Rewrite as Situation -> Task -> Action -> Result with one concrete example, clear ownership, and a result or honest placeholder if the result was missing.',
  },
  {
    id: 'answer_reason_example',
    label: 'Answer-Reason-Example',
    instruction: 'Rewrite as direct answer -> brief reason -> related example or transferable experience. Address the difficult question honestly instead of deflecting.',
  },
  {
    id: 'noticed_fit_now',
    label: 'Noticed-Fit-Now',
    instruction: 'Rewrite as what they noticed about the role/company -> how their background fits -> why the timing makes sense now.',
  },
]

function getRewriteMethodForHrSignal(criterion = '', rootCause = '') {
  const text = `${criterion} ${rootCause}`.toLowerCase()

  if (/professional story|professional_story|tell me about yourself|background/.test(text)) {
    return HR_REWRITE_METHODS[0]
  }

  if (/specific examples|evidence|lack_of_specificity|star|example/.test(text)) {
    return HR_REWRITE_METHODS[1]
  }

  if (/uncertain|difficult|off_topic|gap|bluff|deflect/.test(text)) {
    return HR_REWRITE_METHODS[2]
  }

  if (/alignment|career goals|position|why this role|why this position|noticed_fit_now/.test(text)) {
    return HR_REWRITE_METHODS[3]
  }

  return null
}

function getQuestionText(questionId, evidence, structuredTranscript) {
  if (typeof evidence?.question === 'string' && evidence.question.trim()) return evidence.question.trim()

  const questions = Array.isArray(structuredTranscript?.questions_asked) ? structuredTranscript.questions_asked : []
  const match = questions.find((question) => question?.id === questionId || question?.question_id === questionId)
  return typeof match?.question === 'string' ? match.question.trim() : ''
}

function getCandidateAnswerForQuestion(questionId, evidence, structuredTranscript) {
  const messages = Array.isArray(structuredTranscript?.messages) ? structuredTranscript.messages : []

  if (questionId) {
    const matchingCandidateMessages = messages
      .filter((message) => message?.speaker === 'candidate' && message?.question_id === questionId && typeof message?.text === 'string')
      .map((message) => message.text.trim())
      .filter(Boolean)

    if (matchingCandidateMessages.length > 0) return matchingCandidateMessages.join('\n\n')
  }

  const excerpt = typeof evidence?.excerpt === 'string' ? evidence.excerpt.trim() : ''
  if (excerpt) {
    const excerptMatch = messages.find((message) => {
      if (message?.speaker !== 'candidate' || typeof message?.text !== 'string') return false
      return message.text.includes(excerpt) || excerpt.includes(message.text.slice(0, 80))
    })
    if (excerptMatch?.text) return excerptMatch.text.trim()
  }

  return excerpt
}

function parseJsonObject(text) {
  const jsonMatch = text.match(/```(?:json)?\s*(\{[\s\S]*\})\s*```/) || text.match(/(\{[\s\S]*\})/)
  return JSON.parse(jsonMatch ? jsonMatch[1] : text)
}

function getWeakSignals(feedback) {
  const fromRubric = feedback?.full_rubric?.hr_screen_six_areas?.what_needs_improve
  if (Array.isArray(fromRubric)) return fromRubric

  return []
}

function hasAnyRewrite(feedback) {
  return getWeakSignals(feedback).some((signal) => typeof signal?.rewritten_answer === 'string' && signal.rewritten_answer.trim())
}

async function buildRewriteItems(feedback, structuredTranscript) {
  const weakSignals = getWeakSignals(feedback)

  return weakSignals
    .map((signal, index) => {
      const method = getRewriteMethodForHrSignal(signal?.criterion, signal?.rootCause || signal?.root_cause)
      if (!method) return null

      const evidence = Array.isArray(signal?.evidence) ? signal.evidence[0] : null
      const questionId = evidence?.question_id
      const question = getQuestionText(questionId, evidence, structuredTranscript)
      const originalAnswer = getCandidateAnswerForQuestion(questionId, evidence, structuredTranscript)

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
    .filter(Boolean)
    .slice(0, 4)
}

async function generateRewrites(rewriteItems) {
  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'x-api-key': process.env.ANTHROPIC_API_KEY,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
    model: 'claude-haiku-4-5-20251001',
    max_tokens: 1900,
    temperature: 0.2,
    system: `You rewrite interview answers cheaply and safely.

Rules:
- Preserve only details the candidate already provided.
- Do not invent metrics, company facts, seniority, accomplishments, tools, clients, or outcomes.
- If a needed detail is missing, use a short bracketed placeholder like [specific result].
- Keep each rewrite interview-natural, concise, and spoken aloud.
- Target 90-130 words per rewritten answer.
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
          items: rewriteItems.map((item) => ({
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
    }),
  })

  if (!response.ok) {
    throw new Error(`Anthropic rewrite request failed: ${response.status} ${await response.text()}`)
  }

  const message = await response.json()

  const content = message.content[0]
  if (content?.type !== 'text') return []
  const parsed = parseJsonObject(content.text)
  return Array.isArray(parsed?.rewrites) ? parsed.rewrites : []
}

function applyRewrites(feedback, rewriteItems, rewrites) {
  const nextFullRubric = structuredClone(feedback.full_rubric || {})
  const fullWeakSignals = Array.isArray(nextFullRubric?.hr_screen_six_areas?.what_needs_improve)
    ? nextFullRubric.hr_screen_six_areas.what_needs_improve
    : []

  let applied = 0

  for (const rewrite of rewrites) {
    const source = rewriteItems.find((item) => item.id === rewrite?.id)
    if (!source || !rewrite?.rewritten_answer) continue

    const patch = {
      rewrite_method: rewrite.method || source.method.label,
      rewritten_answer: String(rewrite.rewritten_answer).trim(),
      rewrite_explanation: rewrite.why_this_works ? String(rewrite.why_this_works).trim() : '',
      original_answer: source.original_answer,
    }

    if (fullWeakSignals[source.index]) {
      fullWeakSignals[source.index] = { ...fullWeakSignals[source.index], ...patch }
    }

    applied += 1
  }

  return { nextFullRubric, applied }
}

async function main() {
  const limit = Number.parseInt(process.argv.find((arg) => arg.startsWith('--limit='))?.split('=')[1] || '4', 10)
  const dryRun = process.argv.includes('--dry-run')

  const { data: feedbackRows, error } = await supabase
    .from('interview_feedback')
    .select('id, interview_session_id, created_at, full_rubric')
    .order('created_at', { ascending: false })
    .limit(25)

  if (error) throw error

  const candidates = []

  for (const feedback of feedbackRows || []) {
    const weakSignals = getWeakSignals(feedback)
    if (!weakSignals.length || hasAnyRewrite(feedback)) continue

    const { data: session, error: sessionError } = await supabase
      .from('interview_sessions')
      .select('id, stage, status, transcript_structured')
      .eq('id', feedback.interview_session_id)
      .maybeSingle()

    if (sessionError) throw sessionError
    if (session?.stage !== 'hr_screen' || !session?.transcript_structured) continue

    const rewriteItems = await buildRewriteItems(feedback, session.transcript_structured)
    if (!rewriteItems.length) continue

    candidates.push({ feedback, session, rewriteItems })
    if (candidates.length >= limit) break
  }

  console.log(`Found ${candidates.length} HR feedback row(s) to backfill.`)

  for (const item of candidates) {
    const rewrites = dryRun ? [] : await generateRewrites(item.rewriteItems)
    const { nextFullRubric, applied } = dryRun
      ? { nextFullRubric: item.feedback.full_rubric, applied: item.rewriteItems.length }
      : applyRewrites(item.feedback, item.rewriteItems, rewrites)

    if (!dryRun && applied > 0) {
      const { error: updateError } = await supabase
        .from('interview_feedback')
        .update({
          full_rubric: nextFullRubric,
        })
        .eq('id', item.feedback.id)

      if (updateError) throw updateError
    }

    console.log(`${dryRun ? 'Would update' : 'Updated'} feedback ${item.feedback.id}: ${applied} rewrite(s).`)
  }
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
