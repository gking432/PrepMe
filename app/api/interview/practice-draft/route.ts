import { NextRequest, NextResponse } from 'next/server'
import OpenAI from 'openai'

let _openai: OpenAI | null = null
function getOpenAI() {
  if (!_openai) _openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })
  return _openai
}

const FRAMEWORK_GUIDANCE: Record<string, string> = {
  star: 'Evaluate whether the draft correctly uses STAR: Situation, Task, Action, Result.',
  present_past_future: 'Evaluate whether the draft correctly uses Present, Past, Future. Be strict about generic language. A weak draft can have the right structure but still fail because each section is only a label with no qualifier. A strong draft needs a real lane in Present, a real through-line in Past, and a real direction-and-fit explanation in Future. Reject answers that say things like "I work in operations" or "I worked in different roles" or "I want a good next step" without a concrete qualifier that makes the section believable.',
  noticed_fit_now: 'Evaluate whether the draft correctly uses What I noticed, Why it fits, Why now.',
  answer_reason_example: 'Evaluate whether the draft correctly uses Answer, Reason, Example.',
  claim_example_detail_impact: 'Evaluate whether the draft correctly uses Claim, Example, Detail, Impact. Be strict about evidence quality. A weak draft can name a trait and even mention an example, but still fail if the proof stays vague. A strong draft needs a clear claim, a real example, a concrete detail that makes the example believable, and an impact line that explains what the example proves. Reject answers that rely on phrases like "I have done that before," "I stayed organized," or "that shows I care" without concrete proof.',
  know_connect_ask: 'Evaluate whether the draft correctly uses Know, Connect, Ask. Be strict about preparation quality and curiosity quality. A strong draft should show 1–2 real things the candidate knows about the company, explain what stands out and why it matters to them, and ask thoughtful questions about the work, team, company, or culture. Reject vague praise like "great company" or "strong reputation." Do not fail logistics questions by themselves, but do fail drafts where logistics are the only signal of interest.',
  company_knowledge: 'Evaluate whether the draft shows enough company preparation for an HR screen. A strong draft should say what the company does, who it serves, what stood out, and why that matters to the candidate. Reject vague praise like "great company" or "strong reputation." The answer should sound informed without sounding over-researched or rehearsed.',
  meaningful_questions: 'Evaluate whether the draft contains thoughtful end-of-interview questions for an HR screen. A strong draft should include 1-2 questions about the role, team, company, culture in practice, priorities, or success in the role. Questions about salary, PTO, remote work, or promotion can matter, but should not be the only questions in this context.',
  handling_uncertainty: 'Evaluate whether the draft handles uncertainty in a calm, honest, and grounded way. A strong draft should make one clear point early, stay honest about what is unclear, name a useful first step, and end on a grounded principle. Reject hedge-heavy answers that circle the topic, sound more uncertain than honest, or never say what the person would actually do next.',
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
