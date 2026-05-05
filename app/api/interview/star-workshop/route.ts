import { NextRequest, NextResponse } from 'next/server'
import OpenAI from 'openai'

let _openai: OpenAI | null = null

function getOpenAI() {
  if (!_openai) _openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })
  return _openai
}

type WorkshopStage = 'story' | 'follow_up' | 'finalize'

const MODEL = 'gpt-4o-mini'

function buildSystemPrompt(stage: WorkshopStage) {
  const shared = `You are coaching a user on a flagged behavioral interview answer.

The user already has the interview question.
The user needs help finding a specific situation and turning it into a believable answer.
You should coach adaptively based on the latest answer, not force a rigid visible STAR form.

Return ONLY valid JSON.
Do not include markdown.
Do not explain your reasoning.
Keep every sentence short, natural, and spoken.
Ground the coaching in the flagged question.
Prefer concrete, believable language over polished fluff.`

  if (stage === 'story') {
    return `${shared}

Return JSON in this exact shape:
{
  "normalized": {
    "story": "string"
  },
  "reflection": "string",
  "weakness_focus": "string",
  "next_question": "string",
  "should_continue": true,
  "draft": {
    "situation": "string",
    "task": "string",
    "action": "string",
    "result": "string",
    "proof": "string"
  }
}

Rules:
- The user just described a possible situation for the flagged question.
- Reflection should briefly say what kind of situation this sounds like and what will matter most.
- Ask one best next question based on what is weakest or missing.
- Most of the time, the next question should clarify risk, ownership, or the first concrete action.
- Draft fields can be partial. Leave unknown fields as empty strings.
- Do not generate final answer options yet.`
  }

  if (stage === 'follow_up') {
    return `${shared}

Return JSON in this exact shape:
{
  "normalized": {
    "latest_answer": "string"
  },
  "reflection": "string",
  "weakness_focus": "string",
  "next_question": "string",
  "should_continue": true,
  "draft": {
    "situation": "string",
    "task": "string",
    "action": "string",
    "result": "string",
    "proof": "string"
  },
  "final_options": ["string", "string", "string"]
}

Rules:
- Use the story and prior turns to decide the next best coaching move.
- The next question must respond to the latest answer.
- Ask about one thing only: risk, ownership, first action, concrete move, result, or what the story proves.
- If the story is strong enough, set should_continue to false and include exactly 3 final_options.
- If it is not strong enough, set should_continue to true and leave final_options empty.
- Draft should get stronger and more specific after every turn.`
  }

  return `${shared}

Return JSON in this exact shape:
{
  "reflection": "string",
  "weakness_focus": "string",
  "should_continue": false,
  "draft": {
    "situation": "string",
    "task": "string",
    "action": "string",
    "result": "string",
    "proof": "string"
  },
  "final_options": ["string", "string", "string"]
}

Rules:
- The story is ready to turn into final answer options.
- Generate exactly 3 full answer options for the flagged question.
- Each answer should be one short spoken paragraph.
- The answers should be specific, believable, and clearly owned.
- Action and Result should carry the most proof.
- Keep the tone natural, not over-coached.`
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
      temperature: 0.25,
      max_tokens: 900,
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
