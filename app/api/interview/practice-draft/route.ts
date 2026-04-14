import { NextRequest, NextResponse } from 'next/server'
import OpenAI from 'openai'

let _openai: OpenAI | null = null
function getOpenAI() {
  if (!_openai) _openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })
  return _openai
}

const FRAMEWORK_GUIDANCE: Record<string, string> = {
  star: 'Evaluate whether the draft correctly uses STAR: Situation, Task, Action, Result.',
  present_past_now: 'Evaluate whether the draft correctly uses Present, Past, Now. Be strict about generic language. A weak draft can have the right structure but still fail because each section is only a label with no qualifier. A strong draft needs a real lane in Present, a real through-line in Past, and a real fit-and-timing explanation in Now. Reject answers that say things like "I work in operations" or "I worked in different roles" or "this is a good next step" without a concrete qualifier that makes the section believable.',
  noticed_fit_now: 'Evaluate whether the draft correctly uses What I noticed, Why it fits, Why now.',
  answer_reason_example: 'Evaluate whether the draft correctly uses Answer, Reason, Example.',
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const question = body.question as string | undefined
    const criterion = body.criterion as string | undefined
    const evaluationType = body.evaluationType as string | undefined
    const answers = body.answers as Record<string, string> | undefined

    if (!question || !evaluationType || !answers || typeof answers !== 'object') {
      return NextResponse.json({ error: 'Missing required fields.' }, { status: 400 })
    }

    const response = await getOpenAI().chat.completions.create({
      model: 'gpt-4o-mini',
      temperature: 0.2,
      max_tokens: 500,
      messages: [
        {
          role: 'system',
          content: `You are evaluating a written interview practice draft.

Return ONLY valid JSON in this exact shape:
{
  "passed": true,
  "fieldFeedback": {
    "Field Name": ["short feedback item"],
    "General": ["optional overall note"]
  }
}

Evaluation rules:
- Be strict about structure quality, but keep feedback short and practical.
- Fail the draft if it is vague, off-question, nonsensical, or uses the wrong structure.
- Fail the draft if it is technically in the right buckets but still too generic to score well in a real interview.
- If a field is acceptable, omit it from fieldFeedback.
- Use "General" only for a short overall note when needed.
- ${FRAMEWORK_GUIDANCE[evaluationType] || 'Evaluate whether the draft uses the intended structure correctly.'}`,
        },
        {
          role: 'user',
          content: JSON.stringify({
            criterion,
            question,
            evaluationType,
            answers,
          }),
        },
      ],
    })

    const raw = response.choices[0]?.message?.content || '{}'
    const jsonMatch = raw.match(/\{[\s\S]*\}/)
    const parsed = jsonMatch ? JSON.parse(jsonMatch[0]) : { passed: false, fieldFeedback: { General: ['Could not evaluate this draft.'] } }

    return NextResponse.json({
      passed: Boolean(parsed.passed),
      fieldFeedback: parsed.fieldFeedback || {},
    })
  } catch (error) {
    console.error('practice-draft error', error)
    return NextResponse.json(
      { error: 'Failed to evaluate practice draft.' },
      { status: 500 }
    )
  }
}
