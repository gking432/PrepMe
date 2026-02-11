// Claude (Anthropic) client for post-interview grading
import Anthropic from '@anthropic-ai/sdk'

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY || '',
})

export interface GradingMaterials {
  transcript: string
  transcriptStructured?: any
  observerNotes?: any
  resume: string
  jobDescription: string
  companyWebsite?: string
  websiteContent?: string
  stage: string
  rubricTemplate?: any
  gradingInstructions?: string
  hrScreenFeedback?: {
    overall_score: number
    strengths: string[]
    weaknesses: string[]
    suggestions: string[]
  }
}

export interface RubricResponse {
  overall_assessment: {
    overall_score: number
    likelihood_to_advance: string
    key_strengths: string[]
    key_weaknesses: string[]
    summary: string
  }
  traditional_hr_criteria: {
    scores: Record<string, number>
    feedback: Record<string, string>
  }
  hiring_manager_criteria?: {
    scores: Record<string, number>
    feedback: Record<string, string>
  }
  role_specific_criteria?: {
    criteria_identified: Array<{
      name: string
      score: number
      feedback: string
    }>
  }
  time_management_analysis: {
    per_question_timing: any[]
    overall_pace: string
  }
  question_analysis: {
    questions: any[]
  }
  next_steps_preparation: {
    ready_for_hiring_manager?: boolean
    ready_for_next_round?: boolean
    confidence_level?: string
    improvement_suggestions: string[]
    practice_recommendations: {
      immediate_focus_areas: string[]
    }
    areas_to_study?: Array<{
      topic: string
      reason: string
      preparation_tip: string
    }>
    predicted_hiring_manager_questions?: string[]
    predicted_next_round_questions?: string[]
  }
  comparative_analysis: {
    resume_vs_interview: string
    job_requirements_gaps: string[]
    standout_qualities?: string[]
    common_weaknesses_avoided?: string[]
    percentile_estimate?: number
  }
  cross_stage_progress?: {
    improvement_from_hr_screen: string
    consistent_strengths: string[]
    persistent_weaknesses: string[]
    new_concerns: string[]
  }
  hr_screen_six_areas?: {
    what_went_well: any[]
    what_needs_improve: any[]
  }
  hiring_manager_six_areas?: {
    what_went_well: any[]
    what_needs_improve: any[]
  }
}

/**
 * Shared Claude API call logic for grading
 */
async function callClaudeGrader(
  systemPrompt: string,
  userMessage: string
): Promise<RubricResponse> {
  if (!process.env.ANTHROPIC_API_KEY) {
    throw new Error('ANTHROPIC_API_KEY environment variable is not set')
  }

  try {
    const message = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 8000,
      system: systemPrompt,
      messages: [
        {
          role: 'user',
          content: userMessage,
        },
      ],
    })

    // Extract JSON from response
    const content = message.content[0]
    if (content.type !== 'text') {
      throw new Error('Unexpected response type from Claude')
    }

    // Parse JSON response
    try {
      const text = content.text
      const jsonMatch = text.match(/```(?:json)?\s*(\{[\s\S]*\})\s*```/) || text.match(/(\{[\s\S]*\})/)
      const jsonText = jsonMatch ? jsonMatch[1] : text
      return JSON.parse(jsonText)
    } catch (parseError) {
      console.error('Failed to parse Claude response as JSON:', parseError)
      console.error('Raw response:', content.text)
      throw new Error('Failed to parse Claude response as valid JSON')
    }
  } catch (error: any) {
    console.error('Claude API error:', error)
    throw new Error(`Claude grading failed: ${error.message || 'Unknown error'}`)
  }
}

/**
 * Grade HR screen interview using Claude Sonnet 4
 */
export async function gradeHrScreen(
  materials: GradingMaterials
): Promise<RubricResponse> {
  const systemPrompt = buildGradingPrompt(materials)
  const userMessage = buildUserMessage(materials)
  return callClaudeGrader(systemPrompt, userMessage)
}

/**
 * Grade Hiring Manager interview using Claude Sonnet 4
 * Two-tier grading: universal criteria + JD-adaptive role-specific criteria
 */
export async function gradeHiringManager(
  materials: GradingMaterials
): Promise<RubricResponse> {
  const systemPrompt = buildHiringManagerGradingPrompt(materials)
  const userMessage = buildHiringManagerUserMessage(materials)
  return callClaudeGrader(systemPrompt, userMessage)
}

/**
 * Build the Hiring Manager grading prompt (two-tier system)
 */
function buildHiringManagerGradingPrompt(materials: GradingMaterials): string {
  let prompt = materials.gradingInstructions || 'You are an expert interview evaluator assessing a Hiring Manager round interview.'

  prompt += `\n\nINTERVIEW STAGE: HIRING MANAGER`

  prompt += `\n\n=== HIRING MANAGER 6-AREA EVALUATION ===
You are evaluating a Hiring Manager interview. This is a deeper, more technical round than the HR screen.
You will receive the full interview transcript, candidate resume, job description, and possibly observer notes and HR screen feedback.

Your task is to assess the candidate using TWO tiers:

TIER 1 - UNIVERSAL HIRING MANAGER CRITERIA (score each 1-10):
These apply to every candidate regardless of industry or role:

1. Depth of Knowledge
   - Did they go beyond surface-level answers?
   - Could they explain the "why" behind their decisions and approaches?
   - Did they demonstrate mastery vs. familiarity?

2. Problem-Solving Approach
   - When given challenges or scenarios, how did they think through them?
   - Did they show structured thinking (break down problems, consider tradeoffs)?
   - Did they ask clarifying questions before jumping to solutions?

3. Impact & Results
   - Did they quantify achievements with real numbers/metrics?
   - Did they show outcomes, not just activities?
   - Could they articulate their specific contribution vs. team effort?

4. Role Alignment
   - Do their actual skills match what the job description requires?
   - Did their answers demonstrate capability for THIS specific role?
   - Are there critical skill gaps vs. nice-to-have gaps?

5. Growth & Self-Awareness
   - Can they articulate what they've learned from failures?
   - Do they show awareness of their own strengths and weaknesses?
   - Do they demonstrate a growth mindset and desire to improve?

6. Red Flags & Concerns
   - Any inconsistencies between resume claims and interview answers?
   - Blame-shifting, defensiveness, or inability to take ownership?
   - Vague answers on topics where specificity was expected?
   - Signs of exaggeration or dishonesty?

TIER 2 - ROLE-SPECIFIC CRITERIA (Claude identifies from JD):
Read the job description carefully and identify the 3-4 most critical technical/functional competencies for THIS specific role.
Score each one 1-10 and explain why.

For example:
- If the JD is for a Software Engineer → you might identify: system design, code quality, debugging methodology
- If the JD is for a Marketing Manager → you might identify: campaign strategy, analytics fluency, brand thinking
- If the JD is for a Sales Rep → you might identify: objection handling, discovery skills, closing ability
- If the JD is for a Nurse → you might identify: patient assessment, clinical decision-making, care coordination

YOU decide what the role-specific criteria are based on the JD. Name them clearly.

EVALUATION GUIDELINES:
- Be specific: reference actual quotes or moments from the transcript
- Be balanced: highlight both strengths and weaknesses
- Be fair: consider experience level based on resume
- Be actionable: feedback should tell them exactly what to improve
- Use question IDs and timestamps from structured transcript when available

OUTPUT FORMAT FOR 6 AREAS:
You MUST include a "hiring_manager_six_areas" field with this structure:
{
  "hiring_manager_six_areas": {
    "what_went_well": [
      {
        "criterion": "Depth of Knowledge",
        "feedback": "[1-2 sentence explanation with specific transcript reference]",
        "evidence": [
          {
            "question_id": "q2",
            "timestamp": "5:30",
            "excerpt": "candidate's response excerpt..."
          }
        ]
      }
    ],
    "what_needs_improve": [
      {
        "criterion": "Impact & Results",
        "feedback": "[1-2 sentence explanation with specific transcript reference]",
        "evidence": [
          {
            "question_id": "q4",
            "timestamp": "12:00",
            "excerpt": "candidate's response excerpt..."
          }
        ]
      }
    ]
  }
}

Each of the 6 universal criteria should appear in either "what_went_well" or "what_needs_improve" (not both).`

  // Add cross-stage context if HR screen feedback is available
  if (materials.hrScreenFeedback) {
    prompt += `\n\n=== CROSS-STAGE INTELLIGENCE ===
The candidate has already completed an HR Screen. Here is their feedback from that round:

HR Screen Overall Score: ${materials.hrScreenFeedback.overall_score}/10

HR Screen Strengths:
${(materials.hrScreenFeedback.strengths || []).map((s: string) => `- ${s}`).join('\n') || '- None noted'}

HR Screen Weaknesses:
${(materials.hrScreenFeedback.weaknesses || []).map((w: string) => `- ${w}`).join('\n') || '- None noted'}

Use this context to:
1. Note if the candidate improved on HR Screen weaknesses or if they persisted
2. Check if strengths from HR Screen were consistent in this deeper round
3. Identify NEW concerns that only surfaced in this more technical round
4. Include a "cross_stage_progress" section in your output`
  }

  // Add rubric template if provided
  if (materials.rubricTemplate) {
    prompt += `\n\nRUBRIC TEMPLATE:\n${JSON.stringify(materials.rubricTemplate, null, 2)}`
  }

  prompt += `\n\nYou MUST respond with valid JSON. Include ALL of these required fields:`
  prompt += `\n- overall_assessment (with overall_score 1-10, likelihood_to_advance, key_strengths, key_weaknesses, summary)`
  prompt += `\n- hiring_manager_criteria (with scores and feedback objects for ALL 6 universal criteria)`
  prompt += `\n- role_specific_criteria (with criteria_identified array - each has name, score, feedback)`
  prompt += `\n- time_management_analysis`
  prompt += `\n- question_analysis`
  prompt += `\n- next_steps_preparation (with ready_for_next_round, confidence_level, improvement_suggestions, practice_recommendations, areas_to_study, predicted_next_round_questions)`
  prompt += `\n- comparative_analysis (with resume_vs_interview, job_requirements_gaps, standout_qualities, common_weaknesses_avoided, percentile_estimate)`
  prompt += `\n- hiring_manager_six_areas (with what_went_well and what_needs_improve arrays as described above)`
  if (materials.hrScreenFeedback) {
    prompt += `\n- cross_stage_progress (with improvement_from_hr_screen, consistent_strengths, persistent_weaknesses, new_concerns)`
  }
  prompt += `\n\nDO NOT omit any of these fields.`

  prompt += `\n\nMANDATORY REQUIREMENTS FOR hiring_manager_criteria:`
  prompt += `\nYou MUST include ALL 6 criteria in both "scores" and "feedback" objects with these EXACT names:`
  prompt += `\n1. depth_of_knowledge`
  prompt += `\n2. problem_solving`
  prompt += `\n3. impact_and_results`
  prompt += `\n4. role_alignment`
  prompt += `\n5. growth_and_self_awareness`
  prompt += `\n6. red_flags`
  prompt += `\n\nDO NOT use alternative names. Every single one must be present with both a score and feedback text.`

  prompt += `\n\nSCORING SCALE (STRICT - SCORES MUST ALIGN WITH YOUR ANALYSIS):`
  prompt += `\nAll scores use a 1-10 scale. Your scores MUST match the quality described in your analysis.`
  prompt += `\n- 1-2: Poor - Major issues, significant gaps, does NOT meet requirements`
  prompt += `\n- 3-4: Below Average - Noticeable problems, partially meets requirements`
  prompt += `\n- 5-6: Average/Adequate - Meets basic requirements with some gaps`
  prompt += `\n- 7: Good - Exceeds basic expectations, solid performance`
  prompt += `\n- 8: Very Good - Strong performance, clearly above average`
  prompt += `\n- 9: Excellent - Outstanding performance, exceptional skills`
  prompt += `\n- 10: Exceptional - Perfect or near-perfect performance`
  prompt += `\n\nDO NOT inflate scores. Be honest and constructive.`

  return prompt
}

/**
 * Build user message for Hiring Manager grading
 */
function buildHiringManagerUserMessage(materials: GradingMaterials): string {
  let message = 'Please evaluate this Hiring Manager interview.\n\n'

  if (materials.transcriptStructured) {
    message += `STRUCTURED TRANSCRIPT:\n${JSON.stringify(materials.transcriptStructured, null, 2)}\n\n`
  } else {
    message += `TRANSCRIPT:\n${materials.transcript}\n\n`
  }

  if (materials.observerNotes && Object.keys(materials.observerNotes).length > 0) {
    message += `OBSERVER NOTES:\n${JSON.stringify(materials.observerNotes, null, 2)}\n\n`
  }

  message += `CANDIDATE RESUME:\n${materials.resume}\n\n`
  message += `JOB DESCRIPTION:\n${materials.jobDescription}\n\n`

  if (materials.websiteContent) {
    message += `COMPANY WEBSITE CONTENT:\n${materials.websiteContent}\n\n`
  }

  message += 'Please provide a comprehensive evaluation using the two-tier grading system (universal criteria + role-specific criteria identified from the job description).'

  return message
}

/**
 * Build the system prompt for grading
 */
function buildGradingPrompt(materials: GradingMaterials): string {
  let prompt = materials.gradingInstructions || 'You are an expert HR interview grader. Evaluate this completed phone screen interview.'

  // Add stage-specific context
  prompt += `\n\nINTERVIEW STAGE: ${materials.stage.replace('_', ' ').toUpperCase()}`

  // Add rubric template if provided
  if (materials.rubricTemplate) {
    prompt += `\n\nRUBRIC TEMPLATE:\n${JSON.stringify(materials.rubricTemplate, null, 2)}`
  }

  // Add output format requirements - CRITICAL: Must include all required fields
  prompt += `\n\nYou MUST respond with valid JSON matching the rubric template structure. Include ALL required fields:`
  prompt += `\n- overall_assessment (with overall_score, likelihood_to_advance, key_strengths, key_weaknesses, summary)`
  prompt += `\n- traditional_hr_criteria (with scores and feedback objects) - THIS IS REQUIRED`
  prompt += `\n- time_management_analysis`
  prompt += `\n- question_analysis`
  prompt += `\n- next_steps_preparation`
  prompt += `\n- comparative_analysis`
  if (materials.stage === 'hr_screen') {
    prompt += `\n- hr_screen_six_areas (with what_went_well and what_needs_improve arrays)`
  }
  prompt += `\n\nDO NOT omit any of these fields. The traditional_hr_criteria field is especially critical.`

  return prompt
}

/**
 * Build the user message with all grading materials
 */
function buildUserMessage(materials: GradingMaterials): string {
  let message = 'Please evaluate this HR phone screen interview.\n\n'

  // Add transcript
  if (materials.transcriptStructured) {
    message += `STRUCTURED TRANSCRIPT:\n${JSON.stringify(materials.transcriptStructured, null, 2)}\n\n`
  } else {
    message += `TRANSCRIPT:\n${materials.transcript}\n\n`
  }

  // Add observer notes if available
  if (materials.observerNotes && Object.keys(materials.observerNotes).length > 0) {
    message += `OBSERVER NOTES:\n${JSON.stringify(materials.observerNotes, null, 2)}\n\n`
  }

  // Add resume
  message += `CANDIDATE RESUME:\n${materials.resume}\n\n`

  // Add job description
  message += `JOB DESCRIPTION:\n${materials.jobDescription}\n\n`

  // Add company website content if available
  if (materials.websiteContent) {
    message += `COMPANY WEBSITE CONTENT:\n${materials.websiteContent}\n\n`
  }

  message += 'Please provide a comprehensive evaluation following the rubric template.'

  return message
}

/**
 * Retry wrapper with exponential backoff (generic)
 */
async function gradeWithRetry(
  gradeFn: (materials: GradingMaterials) => Promise<RubricResponse>,
  materials: GradingMaterials,
  maxRetries: number = 3
): Promise<RubricResponse> {
  let lastError: Error | null = null

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await gradeFn(materials)
    } catch (error: any) {
      lastError = error
      if (attempt < maxRetries) {
        const delay = Math.pow(2, attempt) * 1000
        console.log(`Claude grading attempt ${attempt} failed, retrying in ${delay}ms...`)
        await new Promise(resolve => setTimeout(resolve, delay))
      }
    }
  }

  throw lastError || new Error('Grading failed after all retries')
}

/**
 * Grade HR screen with retry
 */
export async function gradeHrScreenWithRetry(
  materials: GradingMaterials,
  maxRetries: number = 3
): Promise<RubricResponse> {
  return gradeWithRetry(gradeHrScreen, materials, maxRetries)
}

/**
 * Grade Hiring Manager interview with retry
 */
export async function gradeHiringManagerWithRetry(
  materials: GradingMaterials,
  maxRetries: number = 3
): Promise<RubricResponse> {
  return gradeWithRetry(gradeHiringManager, materials, maxRetries)
}

/**
 * Grade Culture Fit interview using Claude Sonnet 4
 */
export async function gradeCultureFit(
  materials: GradingMaterials
): Promise<RubricResponse> {
  const systemPrompt = buildCultureFitGradingPrompt(materials)
  const userMessage = buildStageUserMessage(materials, 'Culture Fit')
  return callClaudeGrader(systemPrompt, userMessage)
}

/**
 * Grade Culture Fit interview with retry
 */
export async function gradeCultureFitWithRetry(
  materials: GradingMaterials,
  maxRetries: number = 3
): Promise<RubricResponse> {
  return gradeWithRetry(gradeCultureFit, materials, maxRetries)
}

/**
 * Grade Final Round interview using Claude Sonnet 4
 */
export async function gradeFinalRound(
  materials: GradingMaterials
): Promise<RubricResponse> {
  const systemPrompt = buildFinalRoundGradingPrompt(materials)
  const userMessage = buildStageUserMessage(materials, 'Final Round')
  return callClaudeGrader(systemPrompt, userMessage)
}

/**
 * Grade Final Round interview with retry
 */
export async function gradeFinalRoundWithRetry(
  materials: GradingMaterials,
  maxRetries: number = 3
): Promise<RubricResponse> {
  return gradeWithRetry(gradeFinalRound, materials, maxRetries)
}

/**
 * Generic user message builder for non-HR stages
 */
function buildStageUserMessage(materials: GradingMaterials, stageName: string): string {
  let message = `Please evaluate this ${stageName} interview.\n\n`

  if (materials.transcriptStructured) {
    message += `STRUCTURED TRANSCRIPT:\n${JSON.stringify(materials.transcriptStructured, null, 2)}\n\n`
  } else {
    message += `TRANSCRIPT:\n${materials.transcript}\n\n`
  }

  if (materials.observerNotes && Object.keys(materials.observerNotes).length > 0) {
    message += `OBSERVER NOTES:\n${JSON.stringify(materials.observerNotes, null, 2)}\n\n`
  }

  message += `CANDIDATE RESUME:\n${materials.resume}\n\n`
  message += `JOB DESCRIPTION:\n${materials.jobDescription}\n\n`

  if (materials.websiteContent) {
    message += `COMPANY WEBSITE CONTENT:\n${materials.websiteContent}\n\n`
  }

  message += `Please provide a comprehensive evaluation following the grading criteria specified.`

  return message
}

/**
 * Build Culture Fit grading prompt
 * Criteria: teamwork, communication, values alignment, adaptability, feedback receptiveness, conflict resolution
 */
function buildCultureFitGradingPrompt(materials: GradingMaterials): string {
  let prompt = 'You are an expert interview evaluator assessing a Culture Fit round interview.'

  prompt += `\n\nINTERVIEW STAGE: CULTURE FIT`

  prompt += `\n\n=== CULTURE FIT 6-AREA EVALUATION ===
You are evaluating a Culture Fit interview. This round focuses on how the candidate works with others,
their values alignment, communication style, and whether they would thrive on the team.

You will receive the full interview transcript, candidate resume, job description, and possibly observer notes
and prior round feedback.

CULTURE FIT CRITERIA (score each 1-10):

1. Teamwork & Collaboration
   - Do they prefer collaborative or independent work? Can they do both?
   - Did they give specific examples of effective teamwork?
   - Do they elevate others or focus only on personal achievements?

2. Communication Style
   - How clearly do they express ideas?
   - Are they good listeners? Do they build on what others say?
   - Can they adapt their communication to different audiences?

3. Values & Mission Alignment
   - Do their career motivations align with the company's mission?
   - Do they show genuine interest beyond just getting a job?
   - Are their personal values compatible with the company culture?

4. Adaptability & Flexibility
   - How do they handle ambiguity, changing priorities, or unexpected challenges?
   - Can they work outside their comfort zone?
   - Are they open to new ideas and approaches?

5. Feedback & Growth Mindset
   - How do they give constructive feedback to peers?
   - How do they handle receiving critical feedback?
   - Do they show a pattern of learning and improving?

6. Conflict Resolution
   - How do they handle disagreements with colleagues?
   - Do they approach conflict constructively or avoid it?
   - Can they separate personal feelings from professional disagreements?

OUTPUT FORMAT FOR 6 AREAS:
You MUST include a "culture_fit_six_areas" field with this structure:
{
  "culture_fit_six_areas": {
    "what_went_well": [
      {
        "criterion": "Teamwork & Collaboration",
        "feedback": "[1-2 sentence explanation with specific transcript reference]",
        "evidence": [{ "question_id": "q2", "timestamp": "5:30", "excerpt": "candidate's response..." }]
      }
    ],
    "what_needs_improve": [
      {
        "criterion": "Conflict Resolution",
        "feedback": "[1-2 sentence explanation]",
        "evidence": [{ "question_id": "q4", "timestamp": "12:00", "excerpt": "candidate's response..." }]
      }
    ]
  }
}

Each of the 6 criteria should appear in either "what_went_well" or "what_needs_improve" (not both).`

  // Cross-stage context
  if (materials.hrScreenFeedback) {
    prompt += `\n\n=== CROSS-STAGE INTELLIGENCE ===
The candidate has completed prior rounds. Here is their earlier feedback:

Prior Round Overall Score: ${materials.hrScreenFeedback.overall_score}/10

Prior Strengths:
${(materials.hrScreenFeedback.strengths || []).map((s: string) => `- ${s}`).join('\n') || '- None noted'}

Prior Weaknesses:
${(materials.hrScreenFeedback.weaknesses || []).map((w: string) => `- ${w}`).join('\n') || '- None noted'}

Include a "cross_stage_progress" section noting improvements, consistent strengths, persistent weaknesses, and new concerns.`
  }

  prompt += `\n\nYou MUST respond with valid JSON. Include ALL of these required fields:`
  prompt += `\n- overall_assessment (with overall_score 1-10, likelihood_to_advance, key_strengths, key_weaknesses, summary)`
  prompt += `\n- culture_fit_criteria (with scores and feedback objects for ALL 6 criteria)`
  prompt += `\n- time_management_analysis`
  prompt += `\n- question_analysis`
  prompt += `\n- next_steps_preparation (with ready_for_next_round, confidence_level, improvement_suggestions, practice_recommendations, areas_to_study, predicted_next_round_questions)`
  prompt += `\n- comparative_analysis (with resume_vs_interview, job_requirements_gaps, standout_qualities, common_weaknesses_avoided, percentile_estimate)`
  prompt += `\n- culture_fit_six_areas (with what_went_well and what_needs_improve arrays)`
  if (materials.hrScreenFeedback) {
    prompt += `\n- cross_stage_progress (with improvement_from_hr_screen, consistent_strengths, persistent_weaknesses, new_concerns)`
  }

  prompt += `\n\nMANDATORY REQUIREMENTS FOR culture_fit_criteria:`
  prompt += `\nYou MUST include ALL 6 criteria in both "scores" and "feedback" objects with these EXACT names:`
  prompt += `\n1. teamwork_collaboration`
  prompt += `\n2. communication_style`
  prompt += `\n3. values_alignment`
  prompt += `\n4. adaptability`
  prompt += `\n5. feedback_growth_mindset`
  prompt += `\n6. conflict_resolution`

  prompt += `\n\nSCORING SCALE (1-10): Same as other stages. Be honest and constructive.`

  return prompt
}

/**
 * Build Final Round grading prompt
 * Criteria: strategic thinking, leadership, decision-making, cross-functional impact, long-term alignment, executive presence
 */
function buildFinalRoundGradingPrompt(materials: GradingMaterials): string {
  let prompt = 'You are an expert interview evaluator assessing a Final Round interview with a senior leader.'

  prompt += `\n\nINTERVIEW STAGE: FINAL ROUND`

  prompt += `\n\n=== FINAL ROUND 6-AREA EVALUATION ===
You are evaluating a Final Round interview. This is the last stage — conducted by a VP or senior stakeholder.
It focuses on strategic thinking, leadership, and long-term fit.

FINAL ROUND CRITERIA (score each 1-10):

1. Strategic Thinking
   - Can they think beyond their individual role?
   - Do they understand industry trends and the company's market position?
   - Can they articulate a vision for their first 90 days / first year?

2. Leadership & Influence
   - Can they build and scale teams?
   - Do they lead through influence, not just authority?
   - How do they handle underperformers and develop talent?

3. Decision-Making Under Ambiguity
   - How do they make high-stakes decisions with incomplete data?
   - Do they weigh tradeoffs explicitly?
   - Can they explain their decision-making framework?

4. Cross-Functional Impact
   - Have they driven outcomes across multiple teams or functions?
   - Can they partner effectively with product, sales, design, etc.?
   - Do they think about organizational impact, not just team impact?

5. Long-Term Alignment
   - Does their career trajectory make sense for this role?
   - Are they genuinely excited about this opportunity?
   - Would this role be a meaningful next step in their career?

6. Executive Presence
   - Do they communicate with clarity and confidence at a senior level?
   - Can they simplify complex topics for diverse audiences?
   - Do they project authority without being arrogant?

OUTPUT FORMAT FOR 6 AREAS:
You MUST include a "final_round_six_areas" field with this structure:
{
  "final_round_six_areas": {
    "what_went_well": [...],
    "what_needs_improve": [...]
  }
}
Same format as previous stages: criterion, feedback, evidence array.`

  // Cross-stage context
  if (materials.hrScreenFeedback) {
    prompt += `\n\n=== CROSS-STAGE INTELLIGENCE ===
The candidate has completed prior rounds. Here is their earlier feedback:

Prior Round Overall Score: ${materials.hrScreenFeedback.overall_score}/10

Prior Strengths:
${(materials.hrScreenFeedback.strengths || []).map((s: string) => `- ${s}`).join('\n') || '- None noted'}

Prior Weaknesses:
${(materials.hrScreenFeedback.weaknesses || []).map((w: string) => `- ${w}`).join('\n') || '- None noted'}

Include a "cross_stage_progress" section. For the final round, also note whether earlier concerns were resolved.`
  }

  prompt += `\n\nYou MUST respond with valid JSON. Include ALL of these required fields:`
  prompt += `\n- overall_assessment (with overall_score 1-10, likelihood_to_advance as "hire"/"no_hire"/"strong_hire", key_strengths, key_weaknesses, summary)`
  prompt += `\n- final_round_criteria (with scores and feedback objects for ALL 6 criteria)`
  prompt += `\n- time_management_analysis`
  prompt += `\n- question_analysis`
  prompt += `\n- next_steps_preparation (with ready_for_next_round as hire recommendation, confidence_level, improvement_suggestions, practice_recommendations)`
  prompt += `\n- comparative_analysis (with resume_vs_interview, job_requirements_gaps, standout_qualities, common_weaknesses_avoided, percentile_estimate)`
  prompt += `\n- final_round_six_areas (with what_went_well and what_needs_improve arrays)`
  if (materials.hrScreenFeedback) {
    prompt += `\n- cross_stage_progress (with improvement_from_hr_screen, consistent_strengths, persistent_weaknesses, new_concerns)`
  }

  prompt += `\n\nMANDATORY REQUIREMENTS FOR final_round_criteria:`
  prompt += `\nYou MUST include ALL 6 criteria in both "scores" and "feedback" objects with these EXACT names:`
  prompt += `\n1. strategic_thinking`
  prompt += `\n2. leadership_influence`
  prompt += `\n3. decision_making`
  prompt += `\n4. cross_functional_impact`
  prompt += `\n5. long_term_alignment`
  prompt += `\n6. executive_presence`

  prompt += `\n\nSCORING SCALE (1-10): Same as other stages. Be honest and constructive.`

  return prompt
}

