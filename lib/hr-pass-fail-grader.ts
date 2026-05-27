import OpenAI from 'openai'
import { HR_SCREEN_PASS_FAIL_MODEL } from '@/lib/feedback-config'

type Evidence = {
  question_id?: string
  question?: string
  timestamp?: string
  excerpt?: string
}

type HrAreaDefinition = {
  id: string
  label: string
  passDescription: string
  failDescription: string
  workshop: {
    framework: string
    diagnosis: string
    example: string
    prompt: string
  }
}

type HrPassFailArea = {
  id: string
  label: string
  passed: boolean
  points_awarded: number
  points_possible: number
  feedback: string
  evidence: Evidence[]
  mini_workshop?: HrAreaDefinition['workshop'] & {
    area_id: string
    area: string
  }
}

type HrPassFailMaterials = {
  transcript: string
  transcriptStructured?: any
  resume?: string
  jobDescription?: string
  websiteContent?: string
}

let _openai: OpenAI | null = null
function getOpenAI() {
  if (!_openai) _openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })
  return _openai
}

export const HR_PASS_FAIL_AREAS: HrAreaDefinition[] = [
  {
    id: 'professional_story',
    label: 'Professional Story',
    passDescription: 'Opening/background answer has a clear current lane, relevant foundation, and future direction.',
    failDescription: 'Background answer is missing, scattered, too chronological, or lacks a clear professional through-line.',
    workshop: {
      framework: 'Present, Past, Future',
      diagnosis: 'Your background needs to sound like a coherent professional story, not a resume read-through.',
      example:
        'Right now, most of my work is focused on coordinating projects across teams. Earlier in my career, I built that foundation in customer-facing roles where follow-through mattered every day. Going forward, I want a role where that coordination work is central to the job.',
      prompt: 'Script your own Present, Past, Future answer for "Tell me about yourself."',
    },
  },
  {
    id: 'specificity_proof',
    label: 'Specificity / Proof',
    passDescription: 'Answers include believable examples, clear ownership, concrete action, and a result or consequence.',
    failDescription: 'Answers lean on claims, broad summaries, team-level language, or examples without enough proof.',
    workshop: {
      framework: 'STAR or Answer, Reason, Example',
      diagnosis: 'The interviewer needs proof they can picture. Put more weight into what you personally did.',
      example:
        'During a launch week, scheduling changes were coming from three teams. I owned the tracker, reset owners and deadlines, and flagged blockers twice a day. We got through the launch without missing critical handoffs.',
      prompt: 'Script one stronger proof-based answer using STAR or Answer, Reason, Example.',
    },
  },
  {
    id: 'career_alignment',
    label: 'Career Alignment',
    passDescription: 'The candidate connects this specific role to their background and explains why the move makes sense now.',
    failDescription: "Role interest sounds generic, opportunistic, or disconnected from the candidate's actual path.",
    workshop: {
      framework: 'Observation, Fit, Timing',
      diagnosis: 'Your answer should explain what you noticed, why it fits your background, and why now is the right step.',
      example:
        'What stood out is that this role sits close to coordination and follow-through work. That fits my background because I have kept moving pieces aligned across teams. The timing makes sense because I want that work to be more central in my next role.',
      prompt: 'Script your own Observation, Fit, Timing answer for why this role makes sense.',
    },
  },
  {
    id: 'handling_uncertainty',
    label: 'Handling Uncertainty',
    passDescription: 'Unexpected or difficult answers stay composed, honest, direct, and land on a clear point.',
    failDescription: 'The candidate rambles, bluffs, dodges, contradicts themselves, or never lands the answer.',
    workshop: {
      framework: 'Recovery process, then Answer, Reason, Example',
      diagnosis: 'When you do not have a perfect answer, pause, recover, and choose one grounded point instead of filling space.',
      example:
        'I would start by clarifying the highest-risk part of the situation. That matters because uncertainty gets easier when the first decision is clear. In a past project, I used that approach to reset priorities before the team lost more time.',
      prompt: 'Script a calm recovery answer for a question that could make you ramble.',
    },
  },
  {
    id: 'pace_natural_delivery',
    label: 'Pace / Natural Delivery',
    passDescription: 'The interview sounds conversational, easy to follow, and not overly rehearsed or rushed.',
    failDescription: 'Delivery feels rushed, choppy, overly scripted, interruptive, or hard to track.',
    workshop: {
      framework: 'Delivery workshop using a saved answer',
      diagnosis: 'A strong answer should sound spoken, settled, and easy to follow out loud.',
      example:
        'The main thing I would point to is ownership. In that project, I was responsible for keeping the handoff clear, so I focused on the tracker, the owners, and the blockers. That helped the team move without confusion.',
      prompt: 'Pick one saved answer and rewrite it with a cleaner start, one simple transition, and a settled ending.',
    },
  },
  {
    id: 'preparation_curiosity',
    label: 'Preparation / Curiosity',
    passDescription: 'The candidate shows basic company/role preparation and asks thoughtful role, team, company, or process questions.',
    failDescription: 'Company knowledge or end questions are missing, generic, shallow, or mostly logistics-only.',
    workshop: {
      framework: 'Research + question-building workshops',
      diagnosis: 'Preparation should show you understand the opportunity and have real questions about the work.',
      example:
        'I saw that the role focuses on improving customer handoffs, which connects to work I have done before. I would be curious how the team defines success in the first few months.',
      prompt: 'Script one prepared company/role answer and one thoughtful question you would ask at the end.',
    },
  },
]

function words(value: string) {
  return (value.match(/[A-Za-z0-9']+/g) || []).length
}

function candidateTextFromStructured(transcriptStructured: any) {
  const messages = Array.isArray(transcriptStructured?.messages) ? transcriptStructured.messages : []
  return messages
    .filter((message: any) => message?.speaker === 'candidate' && typeof message?.text === 'string')
    .map((message: any) => message.text)
    .join('\n')
}

function hasSubstantiveCandidateResponse(materials: HrPassFailMaterials) {
  const structuredCandidateText = candidateTextFromStructured(materials.transcriptStructured)
  const transcriptCandidateLines = String(materials.transcript || '')
    .split(/\r?\n/)
    .filter((line) => /^(You|Candidate|User):/i.test(line))
    .join('\n')
  return words(`${structuredCandidateText}\n${transcriptCandidateLines}`) >= 12
}

function parseJsonObject(text: string) {
  const jsonMatch = text.match(/```(?:json)?\s*(\{[\s\S]*\})\s*```/) || text.match(/(\{[\s\S]*\})/)
  return JSON.parse(jsonMatch ? jsonMatch[1] : text)
}

function normalizeEvidence(value: any): Evidence[] {
  if (!Array.isArray(value)) return []
  return value.slice(0, 2).map((item) => ({
    question_id: typeof item?.question_id === 'string' ? item.question_id : undefined,
    question: typeof item?.question === 'string' ? item.question : undefined,
    timestamp: typeof item?.timestamp === 'string' ? item.timestamp : undefined,
    excerpt: typeof item?.excerpt === 'string' ? item.excerpt : undefined,
  }))
}

function estimateCostCents(materials: HrPassFailMaterials, outputText = '') {
  const transcript = materials.transcript || JSON.stringify(materials.transcriptStructured || '')
  const inputTokens = Math.ceil(
    (transcript.length + (materials.resume || '').length + (materials.jobDescription || '').length + 5000) / 4
  )
  const outputTokens = Math.ceil((outputText.length || 1800) / 4)
  const estimatedUsd = inputTokens * 0.05 / 1_000_000 + outputTokens * 0.4 / 1_000_000
  return Number((estimatedUsd * 100).toFixed(4))
}

function buildFallbackAreas(reason: string): HrPassFailArea[] {
  return HR_PASS_FAIL_AREAS.map((area) => ({
    id: area.id,
    label: area.label,
    passed: false,
    points_awarded: 0,
    points_possible: 10 / HR_PASS_FAIL_AREAS.length,
    feedback: reason,
    evidence: [],
    mini_workshop: {
      area_id: area.id,
      area: area.label,
      ...area.workshop,
    },
  }))
}

function buildRubricFromAreas(areas: HrPassFailArea[], model: string, estimatedGradingCents: number) {
  const pointsPossible = 10 / HR_PASS_FAIL_AREAS.length
  const normalizedAreas = HR_PASS_FAIL_AREAS.map((definition) => {
    const graded = areas.find((area) => area.id === definition.id || area.label === definition.label)
    const passed = Boolean(graded?.passed)
    return {
      id: definition.id,
      label: definition.label,
      passed,
      points_awarded: passed ? pointsPossible : 0,
      points_possible: pointsPossible,
      feedback: graded?.feedback || (passed ? definition.passDescription : definition.failDescription),
      evidence: normalizeEvidence(graded?.evidence),
      ...(passed
        ? {}
        : {
            mini_workshop: {
              area_id: definition.id,
              area: definition.label,
              ...definition.workshop,
            },
          }),
    }
  })

  const passedCount = normalizedAreas.filter((area) => area.passed).length
  const rawScore = normalizedAreas.reduce((sum, area) => sum + area.points_awarded, 0)
  const roundedScore = Math.round(rawScore)
  const failedAreas = normalizedAreas.filter((area) => !area.passed)
  const strongAreas = normalizedAreas.filter((area) => area.passed)
  const likelihood = passedCount >= 4 ? 'likely' : passedCount === 3 ? 'marginal' : 'unlikely'
  const miniWorkshops = failedAreas.map((area) => area.mini_workshop).filter(Boolean)

  return {
    grading_mode: 'pass_fail',
    grader_model: model,
    raw_score: Number(rawScore.toFixed(2)),
    areas: normalizedAreas,
    mini_workshops: miniWorkshops,
    overall_assessment: {
      overall_score: roundedScore,
      likelihood_to_advance: likelihood,
      key_strengths: strongAreas.length
        ? strongAreas.map((area) => `${area.label}: ${area.feedback}`)
        : ['No HR screen area clearly passed based on the live interview.'],
      key_weaknesses: failedAreas.map((area) => `${area.label}: ${area.feedback}`),
      summary:
        failedAreas.length === 0
          ? 'The candidate passed all six HR screen areas in this interview.'
          : `The candidate passed ${passedCount} of 6 HR screen areas. Practice should focus on ${failedAreas.map((area) => area.label).join(', ')}.`,
    },
    hr_screen_six_areas: {
      what_went_well: strongAreas.map((area) => ({
        criterion: area.label,
        feedback: area.feedback,
        evidence: area.evidence,
        points_awarded: area.points_awarded,
        points_possible: area.points_possible,
      })),
      what_needs_improve: failedAreas.map((area) => ({
        criterion: area.label,
        feedback: area.feedback,
        evidence: area.evidence,
        rootCause: area.id,
        points_awarded: area.points_awarded,
        points_possible: area.points_possible,
        mini_workshop: area.mini_workshop,
      })),
    },
    next_steps_preparation: {
      ready_for_hiring_manager: likelihood === 'likely',
      confidence_level: 'Medium',
      improvement_suggestions: miniWorkshops.map((workshop: any) => workshop.prompt),
      practice_recommendations: {
        immediate_focus_areas: failedAreas.map((area) => area.label),
      },
    },
    cost_estimate: {
      grader_model: model,
      rewrite_count: 0,
      estimated_grading_cents: estimatedGradingCents,
    },
  }
}

export async function gradeHrScreenPassFail(materials: HrPassFailMaterials) {
  const model = HR_SCREEN_PASS_FAIL_MODEL

  if (!hasSubstantiveCandidateResponse(materials)) {
    return buildRubricFromAreas(
      buildFallbackAreas('Candidate did not provide enough substantive live answer content to assess this area.'),
      model,
      0
    )
  }

  const prompt = `Grade this HR screen as pass/fail in exactly six areas.

Areas:
${HR_PASS_FAIL_AREAS.map((area) => `- ${area.id}: ${area.label}. PASS if ${area.passDescription} FAIL if ${area.failDescription}`).join('\n')}

Rules:
- Return valid JSON only.
- Every area must appear once.
- Use only the transcript as demonstrated interview evidence.
- Resume and job description may provide context, but they do not prove an interview area was demonstrated live.
- "passed" must be boolean.
- Keep feedback to one sentence per area.
- Include evidence when possible: question_id, question, timestamp, excerpt.

JSON shape:
{
  "areas": [
    {
      "id": "professional_story",
      "passed": true,
      "feedback": "One sentence.",
      "evidence": [{ "question_id": "q1", "question": "Question text", "timestamp": "0:30", "excerpt": "Candidate words" }]
    }
  ]
}`

  const userMessage = JSON.stringify({
    transcript_structured: materials.transcriptStructured || null,
    transcript: materials.transcript,
    resume: materials.resume || '',
    job_description: materials.jobDescription || '',
    company_website_content: materials.websiteContent || '',
  })

  const completion = await getOpenAI().chat.completions.create({
    model,
    messages: [
      { role: 'system', content: prompt },
      { role: 'user', content: userMessage },
    ],
    response_format: { type: 'json_object' },
    max_completion_tokens: 1600,
  } as any)

  const outputText = completion.choices[0]?.message?.content || '{}'
  let parsed: any
  try {
    parsed = parseJsonObject(outputText)
  } catch (error) {
    parsed = {
      areas: buildFallbackAreas('The grader could not parse the transcript reliably, so this area should be practiced.'),
    }
  }

  const areas = Array.isArray(parsed?.areas) ? parsed.areas : []
  return buildRubricFromAreas(areas, model, estimateCostCents(materials, outputText))
}
