import OpenAI from 'openai'
import { HR_SCREEN_PASS_FAIL_MODEL } from '@/lib/feedback-config'
import { hasSufficientHrInterviewCoverage } from '@/lib/hr-interview-coverage'

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
        'Present: [your professional lane now]. Past: [one relevant experience that built it]. Future: [why this role is the logical next step].',
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
        'Situation: [the relevant challenge]. Task: [what you owned]. Action: [the specific steps you took]. Result: [what changed or what you learned].',
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
        'Observation: [a specific part of the role]. Fit: [the relevant strength you bring]. Timing: [why this move makes sense now].',
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
        'Answer: [your honest starting point]. Reason: [why that approach makes sense]. Example: [one truthful supporting moment, if available].',
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
        'Clean start: [your main point]. Simple transition: [the most relevant detail]. Settled ending: [the result or takeaway].',
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
        'Role observation: [a specific responsibility]. Question: [what success, ownership, or collaboration looks like in practice].',
      prompt: 'Script one prepared company/role answer and one thoughtful question you would ask at the end.',
    },
  },
]

function hasSubstantiveCandidateResponse(materials: HrPassFailMaterials) {
  return hasSufficientHrInterviewCoverage(materials.transcriptStructured, materials.transcript)
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

This is an HR phone screen, not a final interview. A PASS means the candidate gave enough live evidence that a normal recruiter would not flag this area as a problem.
Do not require a polished workshop answer. Do not fail an area only because the answer could be stronger.
Default to FAIL only when evidence is missing, highly generic, contradicted, evasive, too brief to assess, or only present in resume/job context.

Areas:
${HR_PASS_FAIL_AREAS.map((area) => `- ${area.id}: ${area.label}. PASS if ${area.passDescription} FAIL if ${area.failDescription}`).join('\n')}

Area-specific gates:
- professional_story: pass if the candidate gives a recognizable current lane plus relevant past/foundation and some direction, even if the answer is not perfectly structured.
- specificity_proof: pass if at least one answer includes a specific project, situation, or accomplishment with personal ownership/action and concrete detail, result, or learning. A measurable metric is not required.
- career_alignment: pass if the candidate connects role interest to relevant background, sales/client/team experience, role specifics, company specifics, or timing. A vague single phrase alone is not enough.
- handling_uncertainty: pass only if the candidate answers uncertainty, stress, challenge, or missing-context questions with a composed process or grounded example. One-word answers, absolutes like "everything" or "I don't encounter them", bluffing, or dodging fail.
- pace_natural_delivery: pass if answers are mostly understandable and conversational. Fail only if the transcript shows repeated unfinished answers, rambling, contradictions, or choppy flow that would make the conversation hard to follow.
- preparation_curiosity: pass only if the candidate shows specific company/role preparation or asks a thoughtful non-logistical question. Generic readiness or no questions fails.

Rules:
- Return valid JSON only.
- Every area must appear once. Do not abbreviate the array.
- Use only the transcript as demonstrated interview evidence.
- Resume and job description may provide context, but they do not prove an interview area was demonstrated live.
- "passed" must be boolean.
- Keep feedback to one sentence per area.
- Include evidence when possible: question_id, question, timestamp, excerpt.

JSON shape:
{
  "areas": {
    "professional_story": {
      "passed": true,
      "feedback": "One sentence.",
      "evidence": [{ "question_id": "q1", "question": "Question text", "timestamp": "0:30", "excerpt": "Candidate words" }]
    }
  }
}`

  const userMessage = JSON.stringify({
    transcript_structured: materials.transcriptStructured || null,
    transcript: materials.transcript,
    resume: materials.resume || '',
    job_description: materials.jobDescription || '',
    company_website_content: materials.websiteContent || '',
  })

  const requestGrade = (maxCompletionTokens: number) =>
    getOpenAI().chat.completions.create({
      model,
      messages: [
        { role: 'system', content: prompt },
        { role: 'user', content: userMessage },
      ],
      response_format: {
        type: 'json_schema',
        json_schema: {
          name: 'hr_screen_pass_fail_grade',
          strict: true,
          schema: {
            type: 'object',
            additionalProperties: false,
            properties: {
              areas: {
                type: 'object',
                additionalProperties: false,
                properties: Object.fromEntries(
                  HR_PASS_FAIL_AREAS.map((area) => [
                    area.id,
                    {
                      type: 'object',
                      additionalProperties: false,
                      properties: {
                        passed: { type: 'boolean' },
                        feedback: { type: 'string' },
                        evidence: {
                          type: 'array',
                          items: {
                            type: 'object',
                            additionalProperties: false,
                            properties: {
                              question_id: { type: 'string' },
                              question: { type: 'string' },
                              timestamp: { type: 'string' },
                              excerpt: { type: 'string' },
                            },
                            required: ['question_id', 'question', 'timestamp', 'excerpt'],
                          },
                        },
                      },
                      required: ['passed', 'feedback', 'evidence'],
                    },
                  ])
                ),
                required: HR_PASS_FAIL_AREAS.map((area) => area.id),
              },
            },
            required: ['areas'],
          },
        },
      },
      max_completion_tokens: maxCompletionTokens,
      reasoning_effort: 'minimal',
    } as any)

  let completion = await requestGrade(4000)
  let outputText = completion.choices[0]?.message?.content || ''

  if (!outputText.trim() || completion.choices[0]?.finish_reason === 'length') {
    console.warn('HR pass/fail grader returned incomplete output; retrying with larger completion budget', {
      model,
      finishReason: completion.choices[0]?.finish_reason,
      usage: completion.usage,
    })
    completion = await requestGrade(8000)
    outputText = completion.choices[0]?.message?.content || ''
  }

  if (!outputText.trim()) {
    throw new Error(`HR pass/fail grader returned empty output with finish_reason=${completion.choices[0]?.finish_reason || 'unknown'}`)
  }

  const parsed = parseJsonObject(outputText)
  const areas = Array.isArray(parsed?.areas)
    ? parsed.areas
    : HR_PASS_FAIL_AREAS.map((definition) => ({
        id: definition.id,
        ...(parsed?.areas?.[definition.id] || {}),
      }))
  const recognizedAreaCount = new Set(
    areas
      .map((area: any) => area?.id)
      .filter((id: string) => HR_PASS_FAIL_AREAS.some((definition) => definition.id === id))
  ).size

  if (recognizedAreaCount < HR_PASS_FAIL_AREAS.length) {
    throw new Error(`HR pass/fail grader returned ${recognizedAreaCount}/${HR_PASS_FAIL_AREAS.length} recognized areas`)
  }

  return buildRubricFromAreas(areas, model, estimateCostCents(materials, outputText))
}
