import { NextRequest, NextResponse } from 'next/server'
import OpenAI from 'openai'

let _openai: OpenAI | null = null
function getOpenAI() {
  if (!_openai) _openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })
  return _openai
}

type WorkshopStage = 'situation_task' | 'action' | 'result_landing'

const MODEL = 'gpt-4o-mini'

function buildSystemPrompt(stage: WorkshopStage) {
  const shared = `You are helping generate a stronger interview workshop step for a STAR answer.

Return ONLY valid JSON.
Do not include markdown.
Do not explain your reasoning.
Keep all generated options short, natural, and spoken.
If user input is weak or malformed, prefer cleaner rewrites over literal reuse.
Ask at most one follow-up question only when the latest user input is too vague to generate strong options.
`

  if (stage === 'situation_task') {
    return `${shared}
Return JSON in this exact shape:
{
  "normalized_input": {
    "example": "string",
    "responsibility": "string"
  },
  "options": {
    "situation": ["string", "string", "string"],
    "task": ["string", "string", "string"]
  },
  "should_ask_follow_up": true,
  "follow_up_question": "string",
  "weakness_tag": "ownership_vague"
}

Rules:
- Situation should give enough context without becoming long.
- Task should make ownership clear and concrete.
- If responsibility is too broad, vague, or label-like, ask one follow-up.
- If responsibility is usable, do not ask a follow-up.
- Generate exactly 3 situation options and exactly 3 task options when not asking a follow-up.`
  }

  if (stage === 'action') {
    return `${shared}
Return JSON in this exact shape:
{
  "normalized_input": {
    "action_detail": "string"
  },
  "options": {
    "action": ["string", "string", "string", "string"]
  },
  "should_ask_follow_up": true,
  "follow_up_question": "string",
  "weakness_tag": "action_detail_vague"
}

Rules:
- Action must sound like specific moves, not traits or outcomes.
- The typed detail should be used only if it clearly fits as an action phrase.
- If the typed detail is too vague or not action-like, ask one follow-up.
- Otherwise generate exactly 4 strong action options.`
  }

  return `${shared}
Return JSON in this exact shape:
{
  "normalized_input": {
    "result_detail": "string"
  },
  "options": {
    "result": ["string", "string", "string"],
    "landing": ["string", "string", "string"]
  },
  "should_ask_follow_up": true,
  "follow_up_question": "string",
  "weakness_tag": "result_detail_vague"
}

Rules:
- Result should make the value easy to hear.
- Landing lines should explain what the story proves, not just sound flattering.
- The typed visible outcome is optional. Use it only if it improves the sentence.
- If the typed outcome is malformed or too vague, you may ignore it without asking a follow-up if the selected outcome tags are enough.
- Ask one follow-up only if the result signal is too weak overall.
- Generate exactly 3 result options and exactly 3 landing options when not asking a follow-up.`
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const stage = body.stage as WorkshopStage | undefined
    const state = body.state as Record<string, unknown> | undefined

    if (!stage || !state) {
      return NextResponse.json({ error: 'Missing stage or state.' }, { status: 400 })
    }

    const completion = await getOpenAI().chat.completions.create({
      model: MODEL,
      temperature: 0.2,
      max_tokens: 700,
      response_format: { type: 'json_object' },
      messages: [
        {
          role: 'system',
          content: buildSystemPrompt(stage),
        },
        {
          role: 'user',
          content: JSON.stringify({ stage, state }),
        },
      ],
    })

    const raw = completion.choices[0]?.message?.content || '{}'
    const parsed = JSON.parse(raw)

    return NextResponse.json(parsed)
  } catch (error) {
    console.error('star-workshop error', error)
    return NextResponse.json(
      { error: 'Failed to generate workshop step.' },
      { status: 500 }
    )
  }
}
