import OpenAI from 'openai'
import { HR_SCREEN_PASS_FAIL_MODEL } from '@/lib/feedback-config'
import { HR_PASS_FAIL_AREAS } from '@/lib/hr-pass-fail-grader'

type Evidence = {
  question_id?: string
  question?: string
  timestamp?: string
  excerpt?: string
}

type HrQuestionLevelMaterials = {
  transcript: string
  transcriptStructured?: any
  resume?: string
  jobDescription?: string
  websiteContent?: string
}

type HrScoreAreaDefinition = {
  id: string
  label: string
  weight: number
  description: string
}

type ModelQuestionEvaluation = {
  question_id: string
  question: string
  answer_excerpt: string
  intent: string
  vote: 'pass' | 'fail' | 'neutral'
  hr_area: string
  coaching_bucket: string
  severity: 'none' | 'low' | 'medium' | 'high'
  issue_codes: string[]
  feedback: string
}

type ModelHrArea = {
  status: 'pass' | 'fail' | 'neutral'
  feedback: string
  evidence: Evidence[]
}

type ModelRedFlag = {
  severity: 'low' | 'medium' | 'high' | 'disqualifying'
  code: string
  question_id: string
  excerpt: string
  feedback: string
}

const HR_SCORE_AREAS: HrScoreAreaDefinition[] = [
  {
    id: 'basic_fit_qualifications',
    label: 'Basic Fit / Qualifications',
    weight: 1.5,
    description: 'Background plausibly matches the role requirements, resume claims, experience level, and minimum qualifications.',
  },
  {
    id: 'communication_professionalism',
    label: 'Communication & Professionalism',
    weight: 2,
    description: 'Answers are clear, complete enough, professional, credible, and conversational.',
  },
  {
    id: 'motivation_role_fit',
    label: 'Motivation & Role Fit',
    weight: 2,
    description: 'The candidate explains why this role, company, and career move make sense.',
  },
  {
    id: 'evidence_credibility',
    label: 'Evidence & Credibility',
    weight: 2,
    description: 'Examples, ownership, details, and spoken answers feel believable and consistent with the resume.',
  },
  {
    id: 'preparation_curiosity',
    label: 'Preparation & Curiosity',
    weight: 1.5,
    description: 'The candidate shows role/company preparation and asks thoughtful non-logistical questions when invited.',
  },
  {
    id: 'logistics_constraints',
    label: 'Logistics / Constraints',
    weight: 1,
    description: 'Salary, start date, location, sponsorship, and other constraints appear workable or are not meaningfully assessed.',
  },
]

const HR_SCORE_AREA_IDS = HR_SCORE_AREAS.map((area) => area.id)
const COACHING_BUCKET_IDS = HR_PASS_FAIL_AREAS.map((area) => area.id)
const COACHING_BUCKET_LABELS = Object.fromEntries(HR_PASS_FAIL_AREAS.map((area) => [area.id, area.label]))
const COACHING_WORKSHOPS = Object.fromEntries(HR_PASS_FAIL_AREAS.map((area) => [area.id, area.workshop]))

let _openai: OpenAI | null = null
function getOpenAI() {
  if (!_openai) _openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })
  return _openai
}

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

function hasSubstantiveCandidateResponse(materials: HrQuestionLevelMaterials) {
  const structuredCandidateText = candidateTextFromStructured(materials.transcriptStructured)
  const transcriptCandidateLines = String(materials.transcript || '')
    .split(/\r?\n/)
    .filter((line) => /^(You|Candidate|User):/i.test(line))
    .join('\n')
  return words(`${structuredCandidateText}\n${transcriptCandidateLines}`) >= 12
}

function buildQuestionAnswerPairs(transcriptStructured: any) {
  const questions = Array.isArray(transcriptStructured?.questions_asked) ? transcriptStructured.questions_asked : []
  const messages = Array.isArray(transcriptStructured?.messages) ? transcriptStructured.messages : []
  const pairs = questions.map((question: any, index: number) => ({
    question_id: String(question?.id || question?.question_id || `q${index + 1}`),
    question: String(question?.question || question?.text || ''),
    timestamp: String(question?.timestamp || ''),
    answer: '',
    answer_word_count: 0,
  }))
  const pairById = new Map<string, (typeof pairs)[number]>(pairs.map((pair) => [pair.question_id, pair]))

  for (const message of messages) {
    if (message?.speaker !== 'candidate' || typeof message?.text !== 'string') continue
    const questionId = String(message?.question_id || '')
    const pair = pairById.get(questionId)
    if (!pair) continue

    pair.answer = pair.answer ? `${pair.answer}\n${message.text}` : message.text
    pair.answer_word_count = words(pair.answer)
  }

  return pairs
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

function estimateCostCents(materials: HrQuestionLevelMaterials, outputText = '') {
  const transcript = materials.transcript || JSON.stringify(materials.transcriptStructured || '')
  const inputTokens = Math.ceil(
    (transcript.length + (materials.resume || '').length + (materials.jobDescription || '').length + 6500) / 4
  )
  const outputTokens = Math.ceil((outputText.length || 5200) / 4)
  const estimatedUsd = inputTokens * 0.05 / 1_000_000 + outputTokens * 0.4 / 1_000_000
  return Number((estimatedUsd * 100).toFixed(4))
}

function getAreaDefinition(areaId: string) {
  return HR_SCORE_AREAS.find((area) => area.id === areaId)
}

function normalizeHrAreaStatus(value: any): 'pass' | 'fail' | 'neutral' {
  return value === 'pass' || value === 'fail' || value === 'neutral' ? value : 'neutral'
}

function normalizeSeverity(value: any): 'none' | 'low' | 'medium' | 'high' {
  return value === 'low' || value === 'medium' || value === 'high' ? value : 'none'
}

function normalizeRedFlagSeverity(value: any): ModelRedFlag['severity'] {
  return value === 'medium' || value === 'high' || value === 'disqualifying' ? value : 'low'
}

function feedbackLooksNegative(feedback: string) {
  return /\b(needs?|lack|lacks|missing|vague|weak|generic|disjointed|unfocused|rambly|ambiguous|inaccurate|evasive|unverified|unsupported|provide|add|avoid|reframe|not demonstrated|does not)\b/i.test(feedback)
}

function normalizeQuestionVote(evaluation: any): 'pass' | 'fail' | 'neutral' {
  if (evaluation?.vote === 'pass' || evaluation?.vote === 'fail') return evaluation.vote
  if (evaluation?.vote !== 'neutral') return 'neutral'

  const severity = normalizeSeverity(evaluation?.severity)
  const hrArea = String(evaluation?.hr_area || '')
  const issueCodes = Array.isArray(evaluation?.issue_codes) ? evaluation.issue_codes : []

  if (hrArea !== 'logistics_constraints' && (severity !== 'none' || issueCodes.length > 0 || feedbackLooksNegative(String(evaluation?.feedback || '')))) {
    return 'fail'
  }

  return 'neutral'
}

function fallbackCoachingBucketForHrArea(hrArea: string) {
  switch (hrArea) {
    case 'communication_professionalism':
      return 'pace_natural_delivery'
    case 'motivation_role_fit':
      return 'career_alignment'
    case 'evidence_credibility':
    case 'basic_fit_qualifications':
      return 'specificity_proof'
    case 'preparation_curiosity':
      return 'preparation_curiosity'
    default:
      return 'none'
  }
}

function normalizeCoachingBucket(evaluation: ModelQuestionEvaluation) {
  const issueText = (evaluation.issue_codes || []).join(' ').toLowerCase()
  const intentText = `${evaluation.intent || ''} ${evaluation.question || ''}`.toLowerCase()
  const answerText = String(evaluation.answer_excerpt || '').toLowerCase()
  const proposed = COACHING_BUCKET_IDS.includes(evaluation.coaching_bucket)
    ? evaluation.coaching_bucket
    : fallbackCoachingBucketForHrArea(evaluation.hr_area)

  if (/stress/.test(intentText) && /\bi (do not|don't|never) (encounter|experience|have)\b/.test(answerText)) {
    return 'pace_natural_delivery'
  }

  if (/tell_me_about_yourself|background|professional_story|weak_intro|unfinished_background/.test(issueText + ' ' + intentText)) {
    return 'professional_story'
  }

  if (/no_question|no_questions|no_prep|no_preparation|generic_preparation|curiosity/.test(issueText + ' ' + intentText)) {
    return 'preparation_curiosity'
  }

  if (/generic_role|role_interest|why_this|why_now|motivation|leaving|organization_fit/.test(issueText + ' ' + intentText)) {
    return 'career_alignment'
  }

  if (/rambling_under_uncertainty|bluffing_unknown|missing_context|uncertain|uncertainty/.test(issueText)) {
    return 'handling_uncertainty'
  }

  if (/unfinished|fragment|abrupt|choppy|rambling|hard_to_follow|overly_brief|delivery|pace/.test(issueText)) {
    return 'pace_natural_delivery'
  }

  if (/no_example|unsupported|vague|specific|evidence|credib|unbelievable|evasive|contradiction|impossible_claim|resume_mismatch/.test(issueText)) {
    return 'specificity_proof'
  }

  return proposed
}

function scoreCapForRedFlags(redFlags: ModelRedFlag[]) {
  if (redFlags.some((flag) => flag.severity === 'disqualifying')) return 3
  if (redFlags.some((flag) => flag.severity === 'high')) return 5
  if (redFlags.some((flag) => flag.severity === 'medium')) return 7
  return null
}

function wordsIn(value: string) {
  return (value.match(/[A-Za-z0-9']+/g) || []).length
}

function deriveStatusFromQuestionVotes(areaId: string, evaluations: ModelQuestionEvaluation[]): 'pass' | 'fail' | 'neutral' {
  const related = evaluations.filter((evaluation) => evaluation.hr_area === areaId)
  const failed = related.filter((evaluation) => evaluation.vote === 'fail')
  const passed = related.filter((evaluation) => evaluation.vote === 'pass')

  if (areaId === 'logistics_constraints') {
    if (failed.some((evaluation) => evaluation.severity === 'high')) return 'fail'
    const answeredLogistics = related.some((evaluation) =>
      /logistics_salary|logistics_availability/.test(evaluation.intent) &&
      wordsIn(evaluation.answer_excerpt) > 0 &&
      !/sponsor|visa|relocation|cannot|unable/i.test(evaluation.answer_excerpt)
    )
    return answeredLogistics ? 'pass' : 'neutral'
  }

  if (areaId === 'basic_fit_qualifications') {
    const hasBackground = related.some((evaluation) =>
      /background_story|resume_verification/.test(evaluation.intent) &&
      wordsIn(evaluation.answer_excerpt) >= 20 &&
      !evaluation.issue_codes.some((code) => /minimum_gap|resume_mismatch|qualification_mismatch|contradiction/i.test(code))
    )
    if (hasBackground && !failed.some((evaluation) => evaluation.severity === 'high')) return 'pass'
  }

  if (failed.length > 0) return 'fail'
  if (passed.length > 0) return 'pass'
  return 'neutral'
}

function buildQuestionEvidence(evaluation: ModelQuestionEvaluation): Evidence {
  return {
    question_id: evaluation.question_id,
    question: evaluation.question,
    excerpt: evaluation.answer_excerpt,
  }
}

function buildMiniWorkshops(questionEvaluations: ModelQuestionEvaluation[], failedHrAreas: any[]) {
  const bucketMap = new Map<string, { feedback: string; evidence: Evidence[]; source_question_ids: string[] }>()

  for (const evaluation of questionEvaluations) {
    if (evaluation.vote !== 'fail') continue
    const bucket = normalizeCoachingBucket(evaluation)
    if (!COACHING_BUCKET_IDS.includes(bucket)) continue

    const existing = bucketMap.get(bucket) || { feedback: '', evidence: [], source_question_ids: [] }
    if (!existing.feedback && evaluation.feedback) existing.feedback = evaluation.feedback
    existing.evidence.push(buildQuestionEvidence(evaluation))
    existing.source_question_ids.push(evaluation.question_id)
    bucketMap.set(bucket, existing)
  }

  for (const area of failedHrAreas) {
    const bucket = fallbackCoachingBucketForHrArea(area.id)
    if (!COACHING_BUCKET_IDS.includes(bucket) || bucketMap.has(bucket)) continue

    bucketMap.set(bucket, {
      feedback: area.feedback,
      evidence: area.evidence || [],
      source_question_ids: [],
    })
  }

  return [...bucketMap.entries()].map(([bucket, details]) => ({
    area_id: bucket,
    area: COACHING_BUCKET_LABELS[bucket],
    feedback: details.feedback,
    evidence: details.evidence.slice(0, 2),
    source_question_ids: [...new Set(details.source_question_ids)].filter(Boolean),
    ...COACHING_WORKSHOPS[bucket],
  }))
}

function buildFallbackRubric(reason: string, model: string) {
  const failedHrAreas = HR_SCORE_AREAS.map((area) => ({
    id: area.id,
    label: area.label,
    status: 'fail',
    weight: area.weight,
    points_awarded: 0,
    points_possible: area.weight,
    feedback: reason,
    evidence: [],
  }))
  const miniWorkshops = HR_PASS_FAIL_AREAS.map((area) => ({
    area_id: area.id,
    area: area.label,
    feedback: reason,
    evidence: [],
    source_question_ids: [],
    ...area.workshop,
  }))

  return {
    grading_mode: 'v2_question_level',
    grader_model: model,
    raw_score: 0,
    areas: failedHrAreas,
    hr_score_areas: failedHrAreas,
    question_evaluations: [],
    red_flags: [],
    coaching_buckets: miniWorkshops,
    mini_workshops: miniWorkshops,
    overall_assessment: {
      overall_score: 0,
      likelihood_to_advance: 'unlikely',
      key_strengths: ['No HR screen area clearly passed based on the live interview.'],
      key_weaknesses: failedHrAreas.map((area) => `${area.label}: ${area.feedback}`),
      summary: reason,
    },
    hr_screen_six_areas: {
      what_went_well: [],
      what_needs_improve: miniWorkshops.map((workshop) => ({
        criterion: workshop.area,
        feedback: workshop.feedback,
        evidence: workshop.evidence,
        rootCause: workshop.area_id,
        mini_workshop: workshop,
      })),
    },
    next_steps_preparation: {
      ready_for_hiring_manager: false,
      confidence_level: 'High',
      improvement_suggestions: miniWorkshops.map((workshop) => workshop.prompt),
      practice_recommendations: {
        immediate_focus_areas: miniWorkshops.map((workshop) => workshop.area),
      },
    },
    cost_estimate: {
      grader_model: model,
      rewrite_count: 0,
      estimated_grading_cents: 0,
    },
  }
}

function buildRubricFromQuestionLevelResult(parsed: any, materials: HrQuestionLevelMaterials, model: string, outputText: string) {
  const modelAreas = parsed?.hr_score_areas || {}
  const questionEvaluations: ModelQuestionEvaluation[] = Array.isArray(parsed?.question_evaluations)
    ? parsed.question_evaluations.map((evaluation: any) => ({
        question_id: String(evaluation?.question_id || ''),
        question: String(evaluation?.question || ''),
        answer_excerpt: String(evaluation?.answer_excerpt || ''),
        intent: String(evaluation?.intent || 'other'),
        vote: normalizeQuestionVote(evaluation),
        hr_area: HR_SCORE_AREA_IDS.includes(evaluation?.hr_area) ? evaluation.hr_area : 'communication_professionalism',
        coaching_bucket: COACHING_BUCKET_IDS.includes(evaluation?.coaching_bucket) ? evaluation.coaching_bucket : 'none',
        severity: normalizeSeverity(evaluation?.severity),
        issue_codes: Array.isArray(evaluation?.issue_codes)
          ? evaluation.issue_codes.map((code: any) => String(code)).filter(Boolean).slice(0, 5)
          : [],
        feedback: String(evaluation?.feedback || ''),
      }))
    : []

  const modelRedFlags: ModelRedFlag[] = Array.isArray(parsed?.red_flags)
    ? parsed.red_flags.map((flag: any) => ({
        severity: normalizeRedFlagSeverity(flag?.severity),
        code: String(flag?.code || 'red_flag'),
        question_id: String(flag?.question_id || ''),
        excerpt: String(flag?.excerpt || ''),
        feedback: String(flag?.feedback || ''),
      })).filter((flag) => flag.severity !== 'low' && !/if_needed|possible|maybe/i.test(flag.code))
    : []
  const derivedRedFlags: ModelRedFlag[] = questionEvaluations
    .filter((evaluation) => {
      const issueText = evaluation.issue_codes.join(' ').toLowerCase()
      const text = `${evaluation.question} ${evaluation.answer_excerpt}`.toLowerCase()
      return evaluation.vote === 'fail' && (
        /uncredible|unbelievable|bluff|misrepresent|evasive|contradiction|unprofessional/.test(issueText) ||
        (/stress/.test(text) && /\bi (do not|don't|never) (encounter|experience|have)\b/.test(text))
      )
    })
    .map((evaluation) => ({
      severity: evaluation.severity === 'high' ? 'high' : 'medium',
      code: evaluation.issue_codes.find((code) => /uncredible|unbelievable|bluff|misrepresent|evasive|contradiction|unprofessional/i.test(code)) || 'credibility_red_flag',
      question_id: evaluation.question_id,
      excerpt: evaluation.answer_excerpt,
      feedback: evaluation.feedback,
    }))
  const redFlags = [...modelRedFlags]
  for (const flag of derivedRedFlags) {
    if (!redFlags.some((existing) => existing.question_id === flag.question_id)) {
      redFlags.push(flag)
    }
  }

  const hrScoreAreas = HR_SCORE_AREAS.map((definition) => {
    const modelArea: ModelHrArea = modelAreas?.[definition.id] || {}
    const modelStatus = normalizeHrAreaStatus(modelArea.status)
    let status = modelStatus === 'neutral'
      ? deriveStatusFromQuestionVotes(definition.id, questionEvaluations)
      : modelStatus
    const hasCredibilityRedFlag = redFlags.some((flag) => flag.severity === 'medium' || flag.severity === 'high' || flag.severity === 'disqualifying')
    if (hasCredibilityRedFlag && (definition.id === 'communication_professionalism' || definition.id === 'evidence_credibility')) {
      status = 'fail'
    }
    const pointsPossible = status === 'neutral' ? 0 : definition.weight
    return {
      id: definition.id,
      label: definition.label,
      status,
      weight: definition.weight,
      points_awarded: status === 'pass' ? definition.weight : 0,
      points_possible: pointsPossible,
      feedback: modelArea.feedback || (status === 'pass' ? `${definition.label} was demonstrated well enough for an HR screen.` : `${definition.label} was not demonstrated strongly enough in this HR screen.`),
      evidence: normalizeEvidence(modelArea.evidence),
    }
  })

  const assessedAreas = hrScoreAreas.filter((area) => area.status !== 'neutral')
  const possiblePoints = assessedAreas.reduce((sum, area) => sum + area.points_possible, 0)
  const earnedPoints = assessedAreas.reduce((sum, area) => sum + area.points_awarded, 0)
  const uncappedRawScore = possiblePoints > 0 ? (earnedPoints / possiblePoints) * 10 : 0
  const redFlagCap = scoreCapForRedFlags(redFlags)
  const rawScore = redFlagCap == null ? uncappedRawScore : Math.min(uncappedRawScore, redFlagCap)
  const roundedScore = Math.round(rawScore)
  const likelihood = roundedScore >= 7 ? 'likely' : roundedScore >= 5 ? 'marginal' : 'unlikely'
  const passedHrAreas = hrScoreAreas.filter((area) => area.status === 'pass')
  const failedHrAreas = hrScoreAreas.filter((area) => area.status === 'fail')
  const miniWorkshops = buildMiniWorkshops(questionEvaluations, failedHrAreas)
  const redFlagWeaknesses = redFlags.map((flag) => `Red flag (${flag.severity}): ${flag.feedback || flag.code}`)

  return {
    grading_mode: 'v2_question_level',
    grader_model: model,
    raw_score: Number(rawScore.toFixed(2)),
    uncapped_raw_score: Number(uncappedRawScore.toFixed(2)),
    red_flag_score_cap: redFlagCap,
    areas: hrScoreAreas,
    hr_score_areas: hrScoreAreas,
    question_evaluations: questionEvaluations,
    red_flags: redFlags,
    coaching_buckets: miniWorkshops,
    mini_workshops: miniWorkshops,
    overall_assessment: {
      overall_score: roundedScore,
      likelihood_to_advance: likelihood,
      key_strengths: passedHrAreas.length
        ? passedHrAreas.map((area) => `${area.label}: ${area.feedback}`)
        : ['No HR screen score area clearly passed based on the live interview.'],
      key_weaknesses: [
        ...failedHrAreas.map((area) => `${area.label}: ${area.feedback}`),
        ...redFlagWeaknesses,
      ],
      summary:
        parsed?.overall_summary ||
        `The candidate passed ${passedHrAreas.length} of ${assessedAreas.length || HR_SCORE_AREAS.length} assessed HR score areas. Coaching should focus on ${miniWorkshops.map((workshop) => workshop.area).join(', ') || 'the flagged score areas'}.`,
    },
    hr_screen_six_areas: {
      what_went_well: passedHrAreas.map((area) => ({
        criterion: area.label,
        feedback: area.feedback,
        evidence: area.evidence,
        points_awarded: area.points_awarded,
        points_possible: area.points_possible,
      })),
      what_needs_improve: miniWorkshops.length
        ? miniWorkshops.map((workshop) => ({
            criterion: workshop.area,
            feedback: workshop.feedback || workshop.diagnosis,
            evidence: workshop.evidence,
            rootCause: workshop.area_id,
            source_question_ids: workshop.source_question_ids,
            mini_workshop: workshop,
          }))
        : failedHrAreas.map((area) => ({
            criterion: area.label,
            feedback: area.feedback,
            evidence: area.evidence,
            rootCause: area.id,
          })),
    },
    next_steps_preparation: {
      ready_for_hiring_manager: likelihood === 'likely',
      confidence_level: redFlags.length ? 'High' : 'Medium',
      improvement_suggestions: miniWorkshops.map((workshop) => workshop.prompt),
      practice_recommendations: {
        immediate_focus_areas: miniWorkshops.map((workshop) => workshop.area),
      },
    },
    cost_estimate: {
      grader_model: model,
      rewrite_count: 0,
      estimated_grading_cents: estimateCostCents(materials, outputText),
    },
  }
}

function buildJsonSchema() {
  const evidenceItem = {
    type: 'object',
    additionalProperties: false,
    properties: {
      question_id: { type: 'string' },
      question: { type: 'string' },
      timestamp: { type: 'string' },
      excerpt: { type: 'string' },
    },
    required: ['question_id', 'question', 'timestamp', 'excerpt'],
  }

  const hrAreaItem = {
    type: 'object',
    additionalProperties: false,
    properties: {
      status: { type: 'string', enum: ['pass', 'fail', 'neutral'] },
      feedback: { type: 'string' },
      evidence: {
        type: 'array',
        items: evidenceItem,
      },
    },
    required: ['status', 'feedback', 'evidence'],
  }

  return {
    type: 'object',
    additionalProperties: false,
    properties: {
      question_evaluations: {
        type: 'array',
        items: {
          type: 'object',
          additionalProperties: false,
          properties: {
            question_id: { type: 'string' },
            question: { type: 'string' },
            answer_excerpt: { type: 'string' },
            intent: {
              type: 'string',
              enum: [
                'background_story',
                'role_interest',
                'career_move',
                'specific_example',
                'resume_verification',
                'challenge_learning',
                'behavioral_stress',
                'uncertainty_recovery',
                'logistics_salary',
                'logistics_availability',
                'candidate_questions',
                'other',
              ],
            },
            vote: { type: 'string', enum: ['pass', 'fail', 'neutral'] },
            hr_area: { type: 'string', enum: HR_SCORE_AREA_IDS },
            coaching_bucket: { type: 'string', enum: [...COACHING_BUCKET_IDS, 'none'] },
            severity: { type: 'string', enum: ['none', 'low', 'medium', 'high'] },
            issue_codes: {
              type: 'array',
              items: { type: 'string' },
            },
            feedback: { type: 'string' },
          },
          required: ['question_id', 'question', 'answer_excerpt', 'intent', 'vote', 'hr_area', 'coaching_bucket', 'severity', 'issue_codes', 'feedback'],
        },
      },
      hr_score_areas: {
        type: 'object',
        additionalProperties: false,
        properties: Object.fromEntries(HR_SCORE_AREAS.map((area) => [area.id, hrAreaItem])),
        required: HR_SCORE_AREA_IDS,
      },
      red_flags: {
        type: 'array',
        items: {
          type: 'object',
          additionalProperties: false,
          properties: {
            severity: { type: 'string', enum: ['low', 'medium', 'high', 'disqualifying'] },
            code: { type: 'string' },
            question_id: { type: 'string' },
            excerpt: { type: 'string' },
            feedback: { type: 'string' },
          },
          required: ['severity', 'code', 'question_id', 'excerpt', 'feedback'],
        },
      },
      overall_summary: { type: 'string' },
    },
    required: ['question_evaluations', 'hr_score_areas', 'red_flags', 'overall_summary'],
  }
}

export async function gradeHrScreenQuestionLevel(materials: HrQuestionLevelMaterials) {
  const model = HR_SCREEN_PASS_FAIL_MODEL

  if (!hasSubstantiveCandidateResponse(materials)) {
    return buildFallbackRubric('Candidate did not provide enough substantive live answer content to assess this HR screen.', model)
  }

  const prompt = `You are grading an HR phone screen for a job-interview coaching app.

Use TWO LAYERS:
1. HR score areas decide whether a recruiter would advance the candidate.
2. Coaching buckets decide what lesson/workshop the candidate should practice.

HR score areas:
${HR_SCORE_AREAS.map((area) => `- ${area.id}: ${area.label}. ${area.description}`).join('\n')}

Coaching buckets:
${HR_PASS_FAIL_AREAS.map((area) => `- ${area.id}: ${area.label}`).join('\n')}

Rules:
- Evaluate question/answer pairs first. Use the structured transcript when possible and the plain transcript when the structured pairing looks incomplete.
- The user payload includes canonical question_answer_pairs. Prefer those pairs for question_evaluations. The plain transcript can contain extra or misordered lines; never treat interviewer text as a candidate answer.
- For each meaningful interviewer question, create one question_evaluation.
- vote is pass/fail/neutral for that specific answer.
- Use neutral only when the question was not meaningfully answered because it was not actually assessed, was a duplicate prompt, or was pure transition. If the candidate answered and the answer is weak, vague, evasive, incomplete, or not credible, vote fail.
- hr_area is what the recruiter question/answer primarily affects.
- coaching_bucket is the practice lesson that would fix the answer. Use "none" for logistics or when no coaching is needed.
- Do NOT automatically route stress, challenge, or curveball answers to handling_uncertainty.
- Handling Uncertainty is only for rambling, bluffing, dodging, or losing the thread when the candidate lacks a ready answer or faces ambiguity/missing context. It can appear on any question, but only when that behavior is present.
- Bad answers like "I don't encounter stressful situations" should usually be evidence_credibility or communication_professionalism, with coaching_bucket specificity_proof or pace_natural_delivery, not handling_uncertainty.
- Preparation & Curiosity should fail when the candidate shows no role/company preparation and/or asks no thoughtful question when invited.
- Logistics / Constraints should be neutral if not assessed, pass if workable, fail if it creates a real constraint.
- Basic Fit / Qualifications should be neutral if the interview does not reveal enough about minimum requirements. If the candidate gives a plausible background and there is no clear mismatch, it can pass even if the delivery needs coaching.
- HR score area status follows the same rule: neutral means not assessed, not "weak." If an area was assessed and the evidence was insufficient, mark it fail.
- Be honest. This is a practice product, so do not inflate scores.
- Red flags are separate from coaching buckets. Use them for evasive, unbelievable, inconsistent, unprofessional, or disqualifying moments.
- Return JSON only.`

  const userMessage = JSON.stringify({
    question_answer_pairs: buildQuestionAnswerPairs(materials.transcriptStructured),
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
          name: 'hr_screen_question_level_grade',
          strict: true,
          schema: buildJsonSchema(),
        },
      },
      max_completion_tokens: maxCompletionTokens,
      reasoning_effort: 'minimal',
    } as any)

  let completion = await requestGrade(8000)
  let outputText = completion.choices[0]?.message?.content || ''

  if (!outputText.trim() || completion.choices[0]?.finish_reason === 'length') {
    console.warn('HR question-level grader returned incomplete output; retrying with larger completion budget', {
      model,
      finishReason: completion.choices[0]?.finish_reason,
      usage: completion.usage,
    })
    completion = await requestGrade(12000)
    outputText = completion.choices[0]?.message?.content || ''
  }

  if (!outputText.trim()) {
    throw new Error(`HR question-level grader returned empty output with finish_reason=${completion.choices[0]?.finish_reason || 'unknown'}`)
  }

  const parsed = parseJsonObject(outputText)
  if (!parsed?.hr_score_areas || !Array.isArray(parsed?.question_evaluations)) {
    throw new Error('HR question-level grader returned an invalid shape')
  }

  return buildRubricFromQuestionLevelResult(parsed, materials, model, outputText)
}
