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

function questionLooksBehavioral(question = '') {
  const normalized = question.toLowerCase()
  return /tell me about a time|give me an example|describe a time|walk me through a time|significant challenge|accomplishment|worked on|handled|managed|solved|dealt with/.test(normalized)
}

function getRewriteMethodForHrSignal(criterion = '', rootCause = '') {
  const text = `${criterion} ${rootCause}`.toLowerCase()

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

function getRewriteMethodForHrSignalAndQuestion(criterion = '', rootCause = '', question = '') {
  const text = `${criterion} ${rootCause}`.toLowerCase()

  if (/answer structure|conciseness|structure/.test(text)) {
    if (/tell me about yourself|background|walk me through your experience|bit about yourself/i.test(question)) {
      return HR_REWRITE_METHODS[0]
    }
    return questionLooksBehavioral(question) ? HR_REWRITE_METHODS[1] : HR_REWRITE_METHODS[2]
  }

  if (/specific examples|specificity|proof|evidence|lack_of_specificity|star|example/.test(text)) {
    return questionLooksBehavioral(question) ? HR_REWRITE_METHODS[1] : HR_REWRITE_METHODS[2]
  }

  return getRewriteMethodForHrSignal(criterion, rootCause)
}

function getQuestionText(questionId, evidence, structuredTranscript) {
  if (typeof evidence?.question === 'string' && evidence.question.trim()) return evidence.question.trim()

  const questions = Array.isArray(structuredTranscript?.questions_asked) ? structuredTranscript.questions_asked : []
  const match = questions.find((question) => question?.id === questionId || question?.question_id === questionId)
  return typeof match?.question === 'string' ? match.question.trim() : ''
}

function isUsableCandidateAnswer(answer = '') {
  const normalized = String(answer).trim()
  if (normalized.length < 20) return false
  return !/^\[(no response|not enough|missing|inaudible)/i.test(normalized)
}

function getCandidateAnswerForQuestion(questionId, evidence, structuredTranscript) {
  const messages = Array.isArray(structuredTranscript?.messages) ? structuredTranscript.messages : []

  if (questionId) {
    const matchingCandidateMessages = messages
      .filter((message) => message?.speaker === 'candidate' && message?.question_id === questionId && typeof message?.text === 'string')
      .map((message) => message.text.trim())
      .filter(Boolean)

    const answer = matchingCandidateMessages.join('\n\n')
    if (isUsableCandidateAnswer(answer)) return answer
  }

  const excerpt = typeof evidence?.excerpt === 'string' ? evidence.excerpt.trim() : ''
  if (excerpt) {
    const excerptMatch = messages.find((message) => {
      if (message?.speaker !== 'candidate' || typeof message?.text !== 'string') return false
      return message.text.includes(excerpt) || excerpt.includes(message.text.slice(0, 80))
    })
    if (isUsableCandidateAnswer(excerptMatch?.text)) return excerptMatch.text.trim()
  }

  return excerpt
}

function getQuestionIntent(criterion = '', rootCause = '') {
  const text = `${criterion} ${rootCause}`.toLowerCase()
  if (/professional story|professional_story|tell me about yourself|background/.test(text)) return 'professional_story'
  if (/specific examples|specificity|proof|evidence|lack_of_specificity|star|example/.test(text)) return 'specificity'
  if (/uncertain|difficult|off_topic|gap|bluff|deflect/.test(text)) return 'uncertainty'
  if (/alignment|career goals|career_alignment|position|why this role|why this position|noticed_fit_now/.test(text)) return 'alignment'
  if (/pace|flow|natural delivery|weak_communication|conversation/.test(text)) return 'pace'
  if (/preparation|curiosity|questions_about_company|company|question/.test(text)) return 'preparation'
  return 'general'
}

function questionMatchesIntent(question = '', intent = 'general') {
  const text = question.toLowerCase()
  if (intent === 'professional_story') return /tell me about yourself|background|walk me through your experience|bit about yourself/.test(text)
  if (intent === 'specificity') return /example|time when|tell me about a time|describe|challenge|accomplishment|handled|managed|worked on|solved/.test(text)
  if (intent === 'uncertainty') return /difficult|challenge|uncertain|develop|weakness|gap|mistake|failure|struggle|stretch/.test(text)
  if (intent === 'alignment') return /why.*role|why.*position|interested|career|goals|opportunit|fit|now/.test(text)
  if (intent === 'preparation') return /what do you know|company|helmhouse|questions.*for|do you have.*questions|research/.test(text)
  return false
}

function getFallbackQuestionForIntent(intent, structuredTranscript) {
  const questions = Array.isArray(structuredTranscript?.questions_asked) ? structuredTranscript.questions_asked : []
  const matchingQuestion = questions.find((question) => questionMatchesIntent(question?.question || '', intent))
  if (matchingQuestion?.question) return matchingQuestion.question.trim()

  if (intent === 'professional_story') return 'Can you tell me a bit about yourself?'
  if (intent === 'specificity') return 'Can you give me a specific example?'
  if (intent === 'uncertainty') return 'Tell me about an area where you are still developing professionally.'
  if (intent === 'alignment') return 'What interests you about this role?'
  if (intent === 'preparation') return 'What do you know about the company, and what questions do you have?'
  if (intent === 'pace') return 'Use one saved answer from this interview.'
  return questions[0]?.question?.trim() || 'Interview question'
}

function getFallbackCandidateAnswer(criterion, rootCause, structuredTranscript) {
  const intent = getQuestionIntent(criterion, rootCause)
  const messages = Array.isArray(structuredTranscript?.messages) ? structuredTranscript.messages : []
  const candidateMessages = messages.filter((message) => message?.speaker === 'candidate' && isUsableCandidateAnswer(message?.text))
  if (!candidateMessages.length) return ''

  const questions = Array.isArray(structuredTranscript?.questions_asked) ? structuredTranscript.questions_asked : []
  const matchingQuestion = questions.find((question) => questionMatchesIntent(question?.question || '', intent))
  if (matchingQuestion?.id || matchingQuestion?.question_id) {
    const questionId = matchingQuestion.id || matchingQuestion.question_id
    const answer = candidateMessages
      .filter((message) => message.question_id === questionId)
      .map((message) => message.text.trim())
      .join('\n\n')
    if (isUsableCandidateAnswer(answer)) return answer
  }

  const indexedMatch = messages.find((message, index) => {
    if (message?.speaker !== 'interviewer' || !questionMatchesIntent(message.text || '', intent)) return false
    return candidateMessages.some((candidate) => messages.indexOf(candidate) > index)
  })

  if (indexedMatch) {
    const questionIndex = messages.indexOf(indexedMatch)
    const nextAnswer = messages
      .slice(questionIndex + 1)
      .find((message) => message?.speaker === 'candidate' && isUsableCandidateAnswer(message?.text))
    if (nextAnswer?.text) return nextAnswer.text.trim()
  }

  if (intent === 'pace') {
    return candidateMessages.slice().sort((a, b) => String(b.text).length - String(a.text).length)[0]?.text.trim() || ''
  }

  return candidateMessages[0]?.text.trim() || ''
}

function parsePlainTranscript(transcript = '') {
  const lines = String(transcript)
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)

  const messages = []
  const questions_asked = []
  let questionCounter = 0
  let currentQuestionId = ''

  for (const line of lines) {
    const candidateMatch = line.match(/^You:\s*(.+)$/i)
    const interviewerMatch = line.match(/^Interviewer:\s*(.+)$/i)

    if (interviewerMatch) {
      const text = interviewerMatch[1].trim()
      const isQuestion =
        text.includes('?') ||
        /^(tell me|what|why|how|can you|would you|could you|do you have)/i.test(text)
      const question_id = isQuestion ? `q${++questionCounter}` : undefined
      if (question_id) currentQuestionId = question_id
      messages.push({ speaker: 'interviewer', text, question_id })
      if (question_id) questions_asked.push({ id: question_id, question: text })
      continue
    }

    if (candidateMatch) {
      messages.push({ speaker: 'candidate', text: candidateMatch[1].trim(), question_id: currentQuestionId || undefined })
      continue
    }
  }

  return { messages, questions_asked }
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

async function buildRewriteItems(feedback, structuredTranscript, { force = false } = {}) {
  const weakSignals = getWeakSignals(feedback)

  return weakSignals
    .map((signal, index) => {
      if (!force && typeof signal?.rewritten_answer === 'string' && signal.rewritten_answer.trim()) return null

      const evidence = Array.isArray(signal?.evidence) ? signal.evidence[0] : null
      const rootCause = signal?.rootCause || signal?.root_cause
      const questionId = evidence?.question_id
      const intent = getQuestionIntent(signal?.criterion, rootCause)
      const question = getQuestionText(questionId, evidence, structuredTranscript) || getFallbackQuestionForIntent(intent, structuredTranscript)
      const originalAnswer =
        getCandidateAnswerForQuestion(questionId, evidence, structuredTranscript) ||
        getFallbackCandidateAnswer(signal?.criterion, rootCause, structuredTranscript)
      const method = getRewriteMethodForHrSignalAndQuestion(signal?.criterion, rootCause, question)
      if (!method) return null

      if (!question || !isUsableCandidateAnswer(originalAnswer)) return null

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
    .slice(0, 6)
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
  const limit = Number.parseInt(process.argv.find((arg) => arg.startsWith('--limit='))?.split('=')[1] || '25', 10)
  const dryRun = process.argv.includes('--dry-run')
  const force = process.argv.includes('--force')

  const { data: feedbackRows, error } = await supabase
    .from('interview_feedback')
    .select('id, interview_session_id, created_at, full_rubric')
    .order('created_at', { ascending: false })
    .limit(25)

  if (error) throw error

  const candidates = []

  for (const feedback of feedbackRows || []) {
    const weakSignals = getWeakSignals(feedback)
    if (!weakSignals.length) continue

    const { data: session, error: sessionError } = await supabase
      .from('interview_sessions')
      .select('id, stage, status, transcript_structured, transcript')
      .eq('id', feedback.interview_session_id)
      .maybeSingle()

    if (sessionError) throw sessionError
    if (session?.stage !== 'hr_screen') continue

    const transcriptSource = session.transcript_structured || parsePlainTranscript(session.transcript || '')
    if (!transcriptSource?.messages?.length && !transcriptSource?.questions_asked?.length) continue

    const rewriteItems = await buildRewriteItems(feedback, transcriptSource, { force })
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
