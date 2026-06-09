import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'
import OpenAI from 'openai'
import { HR_SCREEN_PASS_FAIL_MODEL } from '@/lib/feedback-config'

let _openai: OpenAI | null = null
function getOpenAI() {
  if (!_openai) _openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })
  return _openai
}

type WorkshopType =
  | 'professional_story'
  | 'star_proof'
  | 'career_alignment'
  | 'handling_uncertainty'
  | 'pace_delivery'
  | 'preparation_curiosity'
  | 'role_depth'
  | 'problem_solving'

type Confidence = 'clear' | 'inferred' | 'missing'

interface WorkshopStep {
  key: string
  label: string
  prompt: string
}

const CONFIGS: Record<WorkshopType, { framework: string; context: string; behavioral: boolean; steps: WorkshopStep[] }> = {
  star_proof: {
    framework: 'STAR',
    context: 'A behavioral answer that needs a specific example with ownership and outcome.',
    behavioral: true,
    steps: [
      { key: 'situation', label: 'Situation', prompt: 'What was the real scene or problem?' },
      { key: 'task', label: 'Task', prompt: 'What was at stake, and what did the candidate own?' },
      { key: 'action', label: 'Action', prompt: 'What did the candidate personally do?' },
      { key: 'result', label: 'Result', prompt: 'What changed because of the action?' },
    ],
  },
  professional_story: {
    framework: 'Identity / Foundation / Recent Focus / Direction',
    context: 'A tell-me-about-yourself answer that should sound like a natural professional introduction, not a resume walkthrough.',
    behavioral: false,
    steps: [
      { key: 'identity', label: 'Identity', prompt: 'How should the candidate describe who they are professionally?' },
      { key: 'foundation', label: 'Foundation', prompt: 'Which 1-2 background points built that identity?' },
      { key: 'recent_focus', label: 'Recent Focus', prompt: 'What have they been developing or focusing on lately?' },
      { key: 'direction', label: 'Direction', prompt: 'Why does this role or next step make sense now?' },
    ],
  },
  career_alignment: {
    framework: 'Observation / Evidence of Fit / Timing',
    context: 'A why-this-role/company answer that must start with what the candidate noticed, then prove fit, then explain why now. It should not be selfish-first.',
    behavioral: false,
    steps: [
      { key: 'observation', label: 'Observation', prompt: 'What specific role or company detail matters?' },
      { key: 'fit', label: 'Evidence of Fit', prompt: 'What real background maps to that detail?' },
      { key: 'timing', label: 'Timing', prompt: 'Why does this move make sense now?' },
    ],
  },
  handling_uncertainty: {
    framework: 'Pause / Frame / Answer / Support',
    context: 'A recovery workshop for answers where the candidate rambled, dodged, over-qualified, or started talking before they had a clear lane.',
    behavioral: true,
    steps: [
      { key: 'pause', label: 'Pause', prompt: 'What short phrase buys the candidate 2-3 seconds?' },
      { key: 'frame', label: 'Frame', prompt: 'How should the candidate narrow the question before answering?' },
      { key: 'answer', label: 'Answer', prompt: 'What direct answer should they give?' },
      { key: 'support', label: 'Support', prompt: 'What brief reason, example, tradeoff, or thinking process supports it?' },
    ],
  },
  pace_delivery: {
    framework: 'Cue Card / Pause Points / Natural Transitions / Landing',
    context: 'A rehearsal workshop that helps the candidate say a crafted answer naturally instead of sounding scripted or rushed.',
    behavioral: false,
    steps: [
      { key: 'cue_card', label: 'Cue Card', prompt: 'What is the short memory cue, not the full script?' },
      { key: 'pause_points', label: 'Pause Points', prompt: 'Where should the candidate pause or look like they are thinking?' },
      { key: 'transitions', label: 'Natural Transitions', prompt: 'What small spoken transitions keep it conversational?' },
      { key: 'landing', label: 'Landing', prompt: 'How should the answer stop cleanly without trailing off?' },
    ],
  },
  preparation_curiosity: {
    framework: 'Company Detail / Role Detail / Why It Matters / HR-Appropriate Question',
    context: 'A preparation workshop for answering what the candidate knows about the company/role and asking smart HR-screen questions.',
    behavioral: false,
    steps: [
      { key: 'company_detail', label: 'Company Detail', prompt: 'What specific company detail should they know before the screen?' },
      { key: 'role_detail', label: 'Role Detail', prompt: 'What specific role detail should they be ready to mention?' },
      { key: 'why_it_matters', label: 'Why It Matters', prompt: 'Why does that detail connect to their interest or background?' },
      { key: 'hr_question', label: 'HR-Appropriate Question', prompt: 'What thoughtful question fits an HR generalist audience?' },
    ],
  },
  role_depth: {
    framework: 'Context / Method / Tradeoff / Outcome',
    context: 'A hiring-manager style answer that needs real working depth.',
    behavioral: true,
    steps: [
      { key: 'context', label: 'Context', prompt: 'What real domain situation were they discussing?' },
      { key: 'method', label: 'Method', prompt: 'What approach, tool, or process did they actually use?' },
      { key: 'tradeoff', label: 'Tradeoff', prompt: 'What real tradeoff did they weigh?' },
      { key: 'outcome', label: 'Outcome', prompt: 'What happened because of the approach?' },
    ],
  },
  problem_solving: {
    framework: 'Clarify / Approach / Execute / Reflect',
    context: 'A problem-solving answer that needs reasoning, action, and reflection.',
    behavioral: true,
    steps: [
      { key: 'clarify', label: 'Clarify', prompt: 'What did they need to understand first?' },
      { key: 'approach', label: 'Approach', prompt: 'How did they choose a path?' },
      { key: 'execute', label: 'Execute', prompt: 'What did they actually do?' },
      { key: 'reflect', label: 'Reflect', prompt: 'What did they learn or change?' },
    ],
  },
}

function clean(value: unknown, max = 4000) {
  return String(value || '').trim().slice(0, max)
}

function hashText(text: string) {
  let h = 0
  for (let i = 0; i < text.length; i++) {
    h = (h << 5) - h + text.charCodeAt(i)
    h |= 0
  }
  return Math.abs(h).toString(36).slice(0, 10)
}

function objectAt(value: any) {
  return value && typeof value === 'object' && !Array.isArray(value) ? value : {}
}

function safeParseJson(raw: string): any {
  if (!raw) return null
  const match = raw.match(/```(?:json)?\s*(\{[\s\S]*\})\s*```/) || raw.match(/(\{[\s\S]*\})/)
  const body = match ? match[1] : raw
  try {
    return JSON.parse(body)
  } catch {
    return null
  }
}

function estimateCostCents(
  inputText: string,
  outputText: string,
  usage?: { input_tokens?: number; output_tokens?: number; prompt_tokens?: number; completion_tokens?: number }
) {
  const inputTokens = usage?.input_tokens || usage?.prompt_tokens || Math.ceil(inputText.length / 4)
  const outputTokens = usage?.output_tokens || usage?.completion_tokens || Math.ceil(outputText.length / 4)
  const usd = (inputTokens * 0.05 + outputTokens * 0.4) / 1_000_000
  return {
    model: HR_SCREEN_PASS_FAIL_MODEL,
    input_tokens: inputTokens,
    output_tokens: outputTokens,
    estimated_cents: Number((usd * 100).toFixed(4)),
  }
}

function normalizeSkeleton(config: typeof CONFIGS[WorkshopType], parsed: any) {
  const rawSteps = Array.isArray(parsed?.skeleton) ? parsed.skeleton : []
  return config.steps.map((step) => {
    const found = rawSteps.find((item: any) => item?.key === step.key) || {}
    const raw = clean(found.raw || found.text || '', 900)
    const confidence = (['clear', 'inferred', 'missing'].includes(found.confidence) ? found.confidence : (raw ? 'inferred' : 'missing')) as Confidence
    return {
      key: step.key,
      label: step.label,
      prompt: step.prompt,
      raw,
      confidence,
      missingPrompt: clean(found.missingPrompt || found.missing_prompt || step.prompt, 220),
      sourceNote: clean(found.sourceNote || found.source_note || '', 220),
    }
  })
}

function fallbackExtract(config: typeof CONFIGS[WorkshopType], originalAnswer: string) {
  const first = config.steps[0]
  return {
    summary: originalAnswer
      ? 'I found the rough answer, but some pieces still need confirmation.'
      : 'I need a little more detail before this can become a useful answer.',
    skeleton: config.steps.map((step, index) => ({
      key: step.key,
      label: step.label,
      prompt: step.prompt,
      raw: index === 0 ? originalAnswer.slice(0, 500) : '',
      confidence: index === 0 && originalAnswer ? 'inferred' : 'missing',
      missingPrompt: step.prompt,
      sourceNote: index === 0 && originalAnswer ? 'Pulled from the original answer.' : '',
    })),
    alternatives: [],
    cache_hit: false,
  }
}

function fallbackPolish(config: typeof CONFIGS[WorkshopType], confirmed: Record<string, string>) {
  const pieces = config.steps.map((step) => ({
    key: step.key,
    label: step.label,
    text: clean(confirmed[step.key], 900),
    rationale: `${step.label} gives the interviewer a clearer signal.`,
    sourceNote: 'Confirmed by the candidate.',
  }))
  const finalAnswer = pieces.map((piece) => piece.text).filter(Boolean).join(' ')
  return {
    pieces,
    finalAnswer,
    coachNote: 'This version is cleaner because it puts the answer into the taught framework.',
    sourceMap: pieces.map((piece) => ({ key: piece.key, source: piece.sourceNote })),
  }
}

function mockExtract(config: (typeof CONFIGS)[WorkshopType], originalAnswer: string) {
  const sentences = (originalAnswer.match(/[^.!?]+[.!?]+/g) || [originalAnswer])
    .map((sentence) => clean(sentence, 320))
    .filter((sentence) => sentence && !/^of course[.!]?$/i.test(sentence))

  const mockRawForStep = (step: WorkshopStep, index: number) => {
    if (config.framework === 'Identity / Foundation / Recent Focus / Direction') {
      if (step.key === 'identity') {
        return sentences.find((sentence) => /background|professional|known for|describe/i.test(sentence)) || sentences[0] || ''
      }
      if (step.key === 'foundation') {
        return sentences.find((sentence) => /started|earlier|background|foundation/i.test(sentence)) || sentences[1] || sentences[0] || ''
      }
      if (step.key === 'recent_focus') {
        return sentences.find((sentence) => /recent|lately|current|right now|focused/i.test(sentence)) || sentences[1] || sentences[0] || ''
      }
      if (step.key === 'direction') {
        const future = sentences.filter((sentence) => /role|drew|opportunity|going forward|next/i.test(sentence))
        return future.join(' ') || sentences[sentences.length - 1] || ''
      }
    }

    return sentences[index] || sentences[Math.min(index, sentences.length - 1)] || ''
  }

  return {
    summary: 'I found a usable preview story from the mock answer. Confirm the beats before polishing it.',
    skeleton: config.steps.map((step, index) => {
      const raw = mockRawForStep(step, index)
      return {
        key: step.key,
        label: step.label,
        prompt: step.prompt,
        raw,
        confidence: raw ? (index < sentences.length ? 'clear' : 'inferred') : 'missing',
        missingPrompt: step.prompt,
        sourceNote: raw ? 'Pulled from the mock interview answer.' : '',
      }
    }),
    alternatives: [
      {
        label: 'Use the project deadline story',
        detail: 'The mock transcript includes a tight-deadline project with stakeholder disagreement.',
        source: 'Mock transcript',
      },
    ],
    cache_key: `mock:${config.framework}`,
    cache_hit: false,
    cost_estimate: {
      model: 'mock-preview',
      input_tokens: 0,
      output_tokens: 0,
      estimated_cents: 0,
    },
  }
}

function mockPolish(config: (typeof CONFIGS)[WorkshopType], confirmed: Record<string, string>, prove: string, tone: string, repairFeedback: string) {
  const pieces = config.steps.map((step) => {
    const text = clean(confirmed[step.key], 800)
    return {
      key: step.key,
      label: step.label,
      text,
      rationale: repairFeedback
        ? `This makes the ${step.label.toLowerCase()} easier to score against the flagged issue.`
        : `This keeps the ${step.label.toLowerCase()} clear and grounded.`,
      sourceNote: 'Confirmed in the preview workshop.',
    }
  })
  const finalAnswer = pieces.map((piece) => piece.text).filter(Boolean).join(' ')

  return {
    pieces,
    finalAnswer,
    coachNote: `Preview polish using a ${tone || 'direct'} tone and ${prove || 'specific proof'} as the angle.`,
    sourceMap: pieces.map((piece) => ({ key: piece.key, source: piece.sourceNote })),
    cost_estimate: {
      model: 'mock-preview',
      input_tokens: 0,
      output_tokens: 0,
      estimated_cents: 0,
    },
  }
}

async function fetchUserContext(sessionId?: string, userId?: string) {
  let jobDescription = ''
  let resumeText = ''
  let companyWebsite = ''
  let transcriptStructured: any = null
  let stage = 'hr_screen'

  try {
    if (sessionId) {
      const { data: sessionData } = await supabaseAdmin
        .from('interview_sessions')
        .select('user_interview_data_id, user_id, transcript, transcript_structured, structured_transcript, stage')
        .eq('id', sessionId)
        .single()

      transcriptStructured = sessionData?.transcript_structured || sessionData?.structured_transcript || sessionData?.transcript || null
      stage = sessionData?.stage || stage

      if (sessionData?.user_interview_data_id) {
        const { data: interviewData } = await supabaseAdmin
          .from('user_interview_data')
          .select('job_description_text, resume_text, company_website')
          .eq('id', sessionData.user_interview_data_id)
          .single()
        if (interviewData?.job_description_text) jobDescription = interviewData.job_description_text
        if (interviewData?.resume_text) resumeText = interviewData.resume_text
        if (interviewData?.company_website) companyWebsite = interviewData.company_website
      }

      if (!resumeText && sessionData?.user_id) {
        const { data: resumeRow } = await supabaseAdmin
          .from('user_resumes')
          .select('resume_text')
          .eq('user_id', sessionData.user_id)
          .eq('is_active', true)
          .limit(1)
          .single()
        if (resumeRow?.resume_text) resumeText = resumeRow.resume_text
      }
    }

    if (!resumeText && userId) {
      const { data: resumeRow } = await supabaseAdmin
        .from('user_resumes')
        .select('resume_text')
        .eq('user_id', userId)
        .eq('is_active', true)
        .limit(1)
        .single()
      if (resumeRow?.resume_text) resumeText = resumeRow.resume_text
    }
  } catch {
    // best-effort context
  }

  return {
    stage: stage === 'final_interview' ? 'final' : stage,
    jobDescription: clean(jobDescription, 5000),
    resumeText: clean(resumeText, 5000),
    companyWebsite: clean(companyWebsite, 1000),
    transcriptStructured,
  }
}

async function getPracticeMemory(userId: string) {
  const { data: profile } = await supabaseAdmin
    .from('user_profiles')
    .select('practice_memory')
    .eq('id', userId)
    .maybeSingle()
  return objectAt(profile?.practice_memory)
}

async function cacheExtract(userId: string, stage: string, sessionId: string, cacheKey: string, value: any) {
  const memory = await getPracticeMemory(userId)
  const stageBucket = objectAt(memory[stage])
  const sessions = objectAt(stageBucket.sessions)
  const sessionBucket = objectAt(sessions[sessionId])
  const extracts = objectAt(sessionBucket.workshop_extracts)
  const now = new Date().toISOString()

  await supabaseAdmin
    .from('user_profiles')
    .update({
      practice_memory: {
        ...memory,
        [stage]: {
          ...stageBucket,
          sessions: {
            ...sessions,
            [sessionId]: {
              ...sessionBucket,
              workshop_extracts: {
                ...extracts,
                [cacheKey]: { value, updated_at: now },
              },
              updated_at: now,
            },
          },
        },
      },
      updated_at: now,
    })
    .eq('id', userId)
}

async function readCachedExtract(userId: string, stage: string, sessionId: string, cacheKey: string) {
  const memory = await getPracticeMemory(userId)
  return objectAt(memory?.[stage]?.sessions?.[sessionId]?.workshop_extracts?.[cacheKey])?.value || null
}

async function runExtract({
  userId,
  workshopType,
  sessionId,
  originalQuestion,
  originalAnswer,
  storyHint,
}: {
  userId: string
  workshopType: WorkshopType
  sessionId?: string
  originalQuestion: string
  originalAnswer: string
  storyHint: string
}) {
  const config = CONFIGS[workshopType]
  const context = await fetchUserContext(sessionId, userId)
  const cacheKey = `${workshopType}:${hashText(`${originalQuestion}:${originalAnswer}:${storyHint}`)}`

  if (sessionId && !storyHint) {
    const cached = await readCachedExtract(userId, context.stage, sessionId, cacheKey)
    if (cached) return { ...cached, cache_hit: true }
  }

  const system = `You extract raw material for an interview answer workshop.

Workshop: ${config.context}
Framework: ${config.framework}

Rules:
- Extract raw answer beats. Do not write the polished answer yet.
- Return one object per framework step.
- Confidence must be "clear", "inferred", or "missing".
- "clear" means the detail is explicitly in the transcript/original answer/resume.
- "inferred" means it is a reasonable link from the transcript or resume, but needs user confirmation.
- "missing" means the app should ask the user one small question.
- Behavioral workshops must not invent events, actions, metrics, companies, or outcomes. The job description only tells you what the interviewer cares about.
- Non-behavioral workshops may use the JD/company context, but candidate claims must still come from the candidate data.
- Career alignment must not be selfish-first. Growth, challenge, title, pay, perks, or needing change cannot be the center of the answer.
- Preparation/curiosity should fit an HR screen audience. Prefer team structure, hiring process, success profile, onboarding, manager/team context, and what HR is screening for. Do not make pay, PTO, vacation, perks, or logistics the only curiosity signal.
- Pace/delivery is rehearsal, not content invention. Turn the answer into cue-card beats, pause points, natural transitions, and a landing.
- Handling uncertainty is behavior recovery, not a generic stress-question rewrite. Use it only to help the candidate pause, frame, answer directly, support briefly, and stop.
- Keep each raw beat short, factual, and easy to confirm.
- Return only valid JSON.`

  const userPayload = {
    task: 'Extract likely raw workshop material from the candidate data.',
    workshop_type: workshopType,
    framework: config.framework,
    steps: config.steps,
    behavioral: config.behavioral,
    original_question: originalQuestion || '(not provided)',
    original_answer: originalAnswer || '(not provided)',
    story_hint: storyHint || '',
    transcript_structured: context.transcriptStructured || null,
    resume: context.resumeText || '(resume unavailable)',
    job_description: context.jobDescription || '(job description unavailable)',
    company_website: context.companyWebsite || '',
    output_shape: {
      summary: 'One sentence summary of the likely answer material.',
      skeleton: config.steps.map((step) => ({
        key: step.key,
        label: step.label,
        raw: 'short factual beat or empty string',
        confidence: 'clear | inferred | missing',
        missingPrompt: 'one tiny question to ask if missing',
        sourceNote: 'where this came from',
      })),
      alternatives: [
        { label: 'alternate story candidate', detail: 'why this might be the intended story', source: 'resume or transcript clue' },
      ],
    },
  }

  const inputText = JSON.stringify(userPayload)

  try {
    const message = await getOpenAI().chat.completions.create({
      model: HR_SCREEN_PASS_FAIL_MODEL,
      messages: [
        { role: 'system', content: system },
        { role: 'user', content: inputText },
      ],
      response_format: { type: 'json_object' },
      max_completion_tokens: 1300,
      reasoning_effort: 'minimal',
    } as any)
    const text = message.choices[0]?.message?.content || ''
    const parsed = safeParseJson(text) || {}
    const result = {
      summary: clean(parsed.summary || '', 300) || fallbackExtract(config, originalAnswer).summary,
      skeleton: normalizeSkeleton(config, parsed),
      alternatives: Array.isArray(parsed.alternatives)
        ? parsed.alternatives.slice(0, 3).map((item: any) => ({
            label: clean(item.label, 120),
            detail: clean(item.detail, 240),
            source: clean(item.source, 160),
          })).filter((item: any) => item.label || item.detail)
        : [],
      cache_key: cacheKey,
      cache_hit: false,
      cost_estimate: estimateCostCents(inputText, text, (message as any).usage),
    }

    if (sessionId && !storyHint) await cacheExtract(userId, context.stage, sessionId, cacheKey, result)
    return result
  } catch (error: any) {
    console.error('guided-workshop extract failed:', error?.message || error)
    return { ...fallbackExtract(config, originalAnswer), cache_key: cacheKey, error: 'extract_failed' }
  }
}

async function runPolish({
  userId,
  workshopType,
  sessionId,
  originalQuestion,
  originalAnswer,
  confirmed,
  prove,
  tone,
  repairFeedback,
  regenerate,
}: {
  userId: string
  workshopType: WorkshopType
  sessionId?: string
  originalQuestion: string
  originalAnswer: string
  confirmed: Record<string, string>
  prove: string
  tone: string
  repairFeedback: string
  regenerate: boolean
}) {
  const config = CONFIGS[workshopType]
  const context = await fetchUserContext(sessionId, userId)

  const system = `You polish confirmed interview answer beats into a spoken answer or rehearsal card.

Workshop: ${config.context}
Framework: ${config.framework}

Rules:
- Use only the confirmed beats for candidate events, actions, outcomes, companies, titles, and claims.
- Do not invent metrics, accomplishments, employers, clients, dates, or target-company experience.
- If a beat is weak or vague, make it cleaner but do not make it more factual than the source allows.
- The final answer should sound spoken, not written.
- Use contractions, short sentences, and natural transitions.
- Avoid corporate cliches such as leveraged, spearheaded, passionate about, strategic alignment, and team player.
- Career alignment must start from what the candidate noticed about the role/company, then connect fit and timing. Do not center selfish reasons like growth, title, pay, perks, or needing a new challenge.
- Preparation/curiosity must include concrete company/role preparation and a question appropriate for an HR generalist. Avoid selfish-first questions about pay, PTO, vacation, perks, or logistics.
- Pace/delivery should produce rehearsal notes the candidate can say naturally: cue-card headline, spoken beats, pause points, transitions, and a clean landing. Do not make it sound like a script to memorize.
- Handling uncertainty should model Pause -> Frame -> Answer -> Support. Do not force a STAR answer unless the question clearly asks for a past example.
- Aim for an answer the candidate can say in 45-90 seconds.
- Explain briefly why each piece improves the failed HR signal.
- Return only valid JSON.`

  const userPayload = {
    task: regenerate ? 'Create one alternate polished version from the same confirmed beats.' : 'Create one polished answer from the confirmed beats.',
    workshop_type: workshopType,
    framework: config.framework,
    steps: config.steps,
    original_question: originalQuestion || '(not provided)',
    original_answer: originalAnswer || '(not provided)',
    confirmed_beats: confirmed,
    user_selected_proof_goal: prove,
    user_selected_tone: tone,
    flagged_feedback: repairFeedback,
    job_description: context.jobDescription || '',
    output_shape: {
      pieces: config.steps.map((step) => ({
        key: step.key,
        label: step.label,
        text: 'polished spoken piece',
        rationale: 'why this improves the weak signal',
        sourceNote: 'which confirmed beat it came from',
      })),
      finalAnswer: 'full answer assembled from pieces',
      coachNote: 'one concise coaching note',
      sourceMap: [{ key: 'step key', source: 'source explanation' }],
    },
  }

  const inputText = JSON.stringify(userPayload)

  try {
    const message = await getOpenAI().chat.completions.create({
      model: HR_SCREEN_PASS_FAIL_MODEL,
      messages: [
        { role: 'system', content: system },
        { role: 'user', content: inputText },
      ],
      response_format: { type: 'json_object' },
      max_completion_tokens: 1500,
      reasoning_effort: 'minimal',
    } as any)
    const text = message.choices[0]?.message?.content || ''
    const parsed = safeParseJson(text) || {}
    const fallback = fallbackPolish(config, confirmed)
    const pieces = Array.isArray(parsed.pieces)
      ? config.steps.map((step) => {
          const found = parsed.pieces.find((item: any) => item?.key === step.key) || {}
          return {
            key: step.key,
            label: step.label,
            text: clean(found.text || confirmed[step.key] || '', 900),
            rationale: clean(found.rationale || `${step.label} makes the answer easier to score.`, 220),
            sourceNote: clean(found.sourceNote || found.source_note || 'Confirmed by the candidate.', 180),
          }
        })
      : fallback.pieces
    const finalAnswer = clean(parsed.finalAnswer || parsed.final_answer || pieces.map((piece) => piece.text).join(' '), 4000)

    return {
      pieces,
      finalAnswer,
      coachNote: clean(parsed.coachNote || parsed.coach_note || fallback.coachNote, 260),
      sourceMap: Array.isArray(parsed.sourceMap || parsed.source_map)
        ? (parsed.sourceMap || parsed.source_map).slice(0, 8)
        : fallback.sourceMap,
      cost_estimate: estimateCostCents(inputText, text, (message as any).usage),
    }
  } catch (error: any) {
    console.error('guided-workshop polish failed:', error?.message || error)
    return { ...fallbackPolish(config, confirmed), error: 'polish_failed' }
  }
}

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => ({}))
  const mode = clean(body.mode || 'extract', 40)
  const workshopType = body.workshopType as WorkshopType
  const sessionId = body.sessionId ? clean(body.sessionId, 120) : undefined
  const originalQuestion = clean(body.originalQuestion, 2000)
  const originalAnswer = clean(body.originalAnswer, 4000)

  if (!workshopType || !CONFIGS[workshopType]) {
    return NextResponse.json({ error: 'Invalid workshopType' }, { status: 400 })
  }

  if (sessionId === 'mock-session-preview') {
    if (mode === 'extract') {
      return NextResponse.json(mockExtract(CONFIGS[workshopType], originalAnswer))
    }

    if (mode === 'polish') {
      return NextResponse.json(mockPolish(
        CONFIGS[workshopType],
        objectAt(body.confirmed) as Record<string, string>,
        clean(body.prove, 120),
        clean(body.tone, 120),
        clean(body.repairFeedback, 1200)
      ))
    }

    return NextResponse.json({ error: 'Invalid mode' }, { status: 400 })
  }

  const supabase = createRouteHandlerClient({ cookies })
  const { data: { session } } = await supabase.auth.getSession()
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
  }

  if (mode === 'extract') {
    const result = await runExtract({
      userId: session.user.id,
      workshopType,
      sessionId,
      originalQuestion,
      originalAnswer,
      storyHint: clean(body.storyHint, 600),
    })
    return NextResponse.json(result)
  }

  if (mode === 'polish') {
    const confirmed = objectAt(body.confirmed)
    const result = await runPolish({
      userId: session.user.id,
      workshopType,
      sessionId,
      originalQuestion,
      originalAnswer,
      confirmed,
      prove: clean(body.prove, 120),
      tone: clean(body.tone, 120),
      repairFeedback: clean(body.repairFeedback, 1200),
      regenerate: Boolean(body.regenerate),
    })
    return NextResponse.json(result)
  }

  return NextResponse.json({ error: 'Invalid mode' }, { status: 400 })
}
