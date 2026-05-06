import { NextRequest, NextResponse } from 'next/server'
import OpenAI from 'openai'

let _openai: OpenAI | null = null

function getOpenAI() {
  if (!_openai) _openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })
  return _openai
}

type WorkshopState = {
  setting: string
  problem: string
  ownership: string
  actions: string[]
  result: string
  proof: string
  missing_piece: string
  turn_count: number
}

const MODEL = 'gpt-4o-mini'

function buildSystemPrompt() {
  return `You are generating the next question for a hidden coaching workflow that helps a user build a stronger behavioral interview answer.

The user sees only one question at a time.
Do not sound like a chatbot.
Do not acknowledge the user's answer.
Do not say things like "got it", "that helps", "that gives me", or "I’m hearing".
Ask one short direct question only.
The question should feel smart because it directly follows from the user's last answer.

The flagged interview question is already known.
Your job each turn:
1. Update the hidden answer state from the latest user answer.
2. Decide what is still missing.
3. Ask the best next question.
4. If the example is strong enough, stop asking questions and generate final answers.

Return ONLY valid JSON in this exact shape:
{
  "updated_state": {
    "setting": "string",
    "problem": "string",
    "ownership": "string",
    "actions": ["string", "string"],
    "result": "string",
    "proof": "string",
    "missing_piece": "string",
    "turn_count": 0
  },
  "next_question": "string",
  "ready_for_final": true,
  "final_options": ["string", "string", "string"]
}

Rules:
- Keep hidden state concise and factual.
- A setting alone is not enough. If the latest answer only names a container like a project, class, internship, launch, or client, ask what specifically became difficult, unclear, or at risk.
- Do not treat "a class project", "a business plan", "an internship", "a launch", or "a client request" as a usable situation by itself. Those are settings, not stories.
- Once a real problem exists, ask what part of it was theirs to handle if ownership is still unclear.
- Then ask what they actually did.
- If action is still generic, ask for one more concrete move.
- Do not accept action language like "helped", "communicated", "stayed organized", "took on responsibilities", "stepped up", or "managed it" unless the specific moves are also clear.
- Push until you have at least two concrete action beats or one clearly detailed action beat with visible execution.
- Then ask what changed in the end.
- Do not accept weak result lines like "we passed the class", "it worked out", "we finished", "it went well", or "everyone was happy" unless there is also a more visible consequence, improvement, protection, or outcome.
- For academic examples, passing the class or completing the assignment is usually too weak by itself. Ask what improved, what got saved, what changed in the team, or what outcome showed their contribution mattered.
- If the user mentions teammates not contributing, missed work, or unclear roles, ask what exactly was slipping, what they personally took over, and how they got the project back under control.
- "proof" should be a short internal note about what the story demonstrates, but it should not drive the next visible question until the rest is strong.
- Final answers should only be generated when there is enough for a believable story: setting, problem, ownership, at least two concrete actions or one strongly concrete action sequence, and a result with visible consequence.
- If force_finalize is true, you should still try to ask one last highest-value question unless the existing state is already good enough to draft from.
- Final answers must be short spoken paragraphs that answer the flagged question naturally.
- Keep final answers specific, believable, and clearly owned.
- Final answers must read like real STAR even though the user never saw STAR labels: clear setup, clear ownership, visible action, meaningful outcome.
- When ready_for_final is false, final_options must be an empty array.
- When ready_for_final is true, generate exactly 3 final_options.
- next_question must be empty when ready_for_final is true.
- Prefer one sharp next question over a broad or generic one.
- Never finalize early just because every field has something in it. Finalize only when the content is strong enough.`
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const latestAnswer = body.latest_answer as string | undefined
    const state = body.state as WorkshopState | undefined

    if (!latestAnswer || !state) {
      return NextResponse.json(
        { error: 'Missing latest_answer or state.' },
        { status: 400 }
      )
    }

    const completion = await getOpenAI().chat.completions.create({
      model: MODEL,
      temperature: 0.2,
      max_tokens: 900,
      response_format: { type: 'json_object' },
      messages: [
        {
          role: 'system',
          content: buildSystemPrompt(),
        },
        {
          role: 'user',
          content: JSON.stringify({
            question: body.question || '',
            flagged_answer: body.flagged_answer || '',
            latest_answer: latestAnswer,
            state,
            force_finalize: Boolean(body.force_finalize),
          }),
        },
      ],
    })

    const raw = completion.choices[0]?.message?.content || '{}'
    const parsed = JSON.parse(raw)
    return NextResponse.json(parsed)
  } catch (error) {
    console.error('star-workshop error', error)
    return NextResponse.json(
      { error: 'Failed to generate workshop turn.' },
      { status: 500 }
    )
  }
}
