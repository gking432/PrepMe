import { NextRequest, NextResponse } from 'next/server'
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'
import { Anthropic } from '@anthropic-ai/sdk/client'

let _anthropic: Anthropic | null = null
function getAnthropic() {
  if (!_anthropic) _anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY || '' })
  return _anthropic
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

const SYSTEM_PROMPT = `You are helping a job candidate turn structured notes into a STAR interview answer.

Create a specific, believable, natural-sounding behavioral interview answer using only the information provided.

Do not invent:
- company names
- job titles
- metrics
- customer names
- exact numbers
- outcomes
- technical details

You may lightly connect the selected choices into complete sentences.

The answer should sound like a real person speaking in an interview, not like a corporate memo.

Use the STAR format:
- Situation
- Task
- Action
- Result

Rules:
1. Use first person.
2. Keep the answer natural and conversational.
3. Do not exaggerate the user's role.
4. Do not add hard numbers unless the user provided them.
5. If there is no metric, use the non-metric proof.
6. If the story is vague, make the answer simple rather than inventing details.
7. Make the user sound accountable and specific.
8. Emphasize the selected competencies.
9. End the 60-second answer with a short lesson or tie-back to the role.
10. Avoid buzzwords and fake corporate language.
11. Use contractions and spoken language. Short sentences. The candidate will say this out loud.

Return ONLY valid JSON matching this exact shape:
{
  "storySummary": "A one-line summary of what this story demonstrates",
  "starBreakdown": {
    "situation": "The situation portion of the answer",
    "task": "The task portion of the answer",
    "action": "The action portion of the answer",
    "result": "The result portion of the answer"
  },
  "sixtySecondAnswer": "The full answer stitched together, roughly 60 seconds spoken",
  "thirtySecondAnswer": "A compressed version, roughly 30 seconds spoken",
  "followUpQuestions": ["Likely follow-up 1", "Likely follow-up 2", "Likely follow-up 3"]
}`

export async function POST(request: NextRequest) {
  const supabase = createRouteHandlerClient({ cookies })
  const { data: { session } } = await supabase.auth.getSession()
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
  }

  const body = await request.json().catch(() => ({}))

  const storyType = String(body.storyType || '')
  const setting = String(body.setting || '')
  const contextName = String(body.contextName || '')
  const situationType = String(body.situationType || '')
  const situationDetail = String(body.situationDetail || '')
  const stakes: string[] = Array.isArray(body.stakes)
    ? body.stakes.map((s: unknown) => String(s || '').trim()).filter(Boolean)
    : []
  const stakeOtherDetail = String(body.stakeOtherDetail || '')
  const userRole = String(body.userRole || '')
  const roleOtherDetail = String(body.roleOtherDetail || '')
  const roleDetail = String(body.roleDetail || '')
  const actionsTaken: string[] = Array.isArray(body.actionsTaken)
    ? body.actionsTaken.map((a: unknown) => String(a || '').trim()).filter(Boolean)
    : []
  const actionDetails: { actionId: string; detail: string }[] = Array.isArray(body.actionDetails)
    ? body.actionDetails.map((ad: any) => ({
        actionId: String(ad?.actionId || ''),
        detail: String(ad?.detail || ''),
      }))
    : []
  const resultTypes: string[] = Array.isArray(body.resultTypes)
    ? body.resultTypes.map((r: unknown) => String(r || '').trim()).filter(Boolean)
    : []
  const hasMetric = String(body.hasMetric || '')
  const metricType = String(body.metricType || '')
  const metricValue = String(body.metricValue || '')
  const metricContext = String(body.metricContext || '')
  const nonMetricProofs: string[] = Array.isArray(body.nonMetricProofs)
    ? body.nonMetricProofs.map((p: unknown) => String(p || '').trim()).filter(Boolean)
    : []
  const proofDetail = String(body.proofDetail || '')
  const competencies: string[] = Array.isArray(body.competencies)
    ? body.competencies.map((c: unknown) => String(c || '').trim()).filter(Boolean)
    : []
  const additionalNotes = String(body.additionalNotes || '').slice(0, 2000)

  const actionDetailsFormatted = actionDetails
    .filter((ad) => ad.actionId && ad.detail)
    .map((ad) => `${ad.actionId}: ${ad.detail}`)
    .join('\n')

  const userMessage = `Story type: ${storyType}
Setting: ${setting}
Context name: ${contextName}
Situation type: ${situationType}
Situation detail: ${situationDetail}
What was at stake: ${stakes.join(', ')}${stakeOtherDetail ? ` (other: ${stakeOtherDetail})` : ''}
User role: ${userRole}${roleOtherDetail ? ` (other: ${roleOtherDetail})` : ''}
Role detail: ${roleDetail}
Actions taken: ${actionsTaken.join(', ')}
Action details:
${actionDetailsFormatted || '(none provided)'}
Results: ${resultTypes.join(', ')}
Metric: ${hasMetric === 'yes' ? `Yes — ${metricType} ${metricValue} ${metricContext}` : 'No metric provided'}
Non-metric proof: ${nonMetricProofs.join(', ')}${proofDetail ? ` — ${proofDetail}` : ''}
Competencies to emphasize: ${competencies.join(', ')}
Additional notes: ${additionalNotes || '(none)'}

Generate the STAR answer as JSON.`

  try {
    const message = await getAnthropic().messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 1500,
      temperature: 0.4,
      system: SYSTEM_PROMPT,
      messages: [{ role: 'user', content: userMessage }],
    })

    const content = message.content[0]
    if (content.type !== 'text') {
      return NextResponse.json({ error: 'generate_failed' }, { status: 200 })
    }

    const parsed = safeParseJson(content.text)
    if (!parsed) {
      console.error('star-story: failed to parse JSON from model response')
      return NextResponse.json({ error: 'generate_failed' }, { status: 200 })
    }

    return NextResponse.json(parsed)
  } catch (error: any) {
    console.error('star-story generation failed:', error?.message || error)
    return NextResponse.json({ error: 'generate_failed' }, { status: 200 })
  }
}
