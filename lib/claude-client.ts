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
  time_management_analysis: {
    per_question_timing: any[]
    overall_pace: string
  }
  question_analysis: {
    questions: any[]
  }
  next_steps_preparation: {
    ready_for_hiring_manager?: boolean
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
  }
  comparative_analysis: {
    resume_vs_interview: string
    job_requirements_gaps: string[]
  }
  hr_screen_six_areas?: {
    what_went_well: any[]
    what_needs_improve: any[]
  }
}

/**
 * Grade HR screen interview using Claude Sonnet 4
 */
export async function gradeHrScreen(
  materials: GradingMaterials
): Promise<RubricResponse> {
  if (!process.env.ANTHROPIC_API_KEY) {
    throw new Error('ANTHROPIC_API_KEY environment variable is not set')
  }

  // Build the grading prompt
  const systemPrompt = buildGradingPrompt(materials)
  const userMessage = buildUserMessage(materials)

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
    let rubric: RubricResponse
    try {
      // Try to extract JSON from markdown code blocks if present
      const text = content.text
      const jsonMatch = text.match(/```(?:json)?\s*(\{[\s\S]*\})\s*```/) || text.match(/(\{[\s\S]*\})/)
      const jsonText = jsonMatch ? jsonMatch[1] : text
      rubric = JSON.parse(jsonText)
    } catch (parseError) {
      console.error('Failed to parse Claude response as JSON:', parseError)
      console.error('Raw response:', content.text)
      throw new Error('Failed to parse Claude response as valid JSON')
    }

    return rubric
  } catch (error: any) {
    console.error('Claude API error:', error)
    throw new Error(`Claude grading failed: ${error.message || 'Unknown error'}`)
  }
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
 * Retry wrapper with exponential backoff
 */
export async function gradeHrScreenWithRetry(
  materials: GradingMaterials,
  maxRetries: number = 3
): Promise<RubricResponse> {
  let lastError: Error | null = null

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await gradeHrScreen(materials)
    } catch (error: any) {
      lastError = error
      if (attempt < maxRetries) {
        const delay = Math.pow(2, attempt) * 1000 // Exponential backoff: 2s, 4s, 8s
        console.log(`Claude grading attempt ${attempt} failed, retrying in ${delay}ms...`)
        await new Promise(resolve => setTimeout(resolve, delay))
      }
    }
  }

  throw lastError || new Error('Grading failed after all retries')
}

