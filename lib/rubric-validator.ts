// Validator for Claude grader rubric responses

export interface RubricStructure {
  overall_assessment?: any
  traditional_hr_criteria?: any
  time_management_analysis?: any
  question_analysis?: any
  next_steps_preparation?: any
  comparative_analysis?: any
  hr_screen_six_areas?: any
}

/**
 * Validate that a rubric response contains all required fields
 */
export function validateRubric(rubric: any): boolean {
  if (!rubric || typeof rubric !== 'object') {
    console.error('Rubric is not an object')
    return false
  }

  const required = [
    'overall_assessment',
    'traditional_hr_criteria',
    'time_management_analysis',
    'question_analysis',
    'next_steps_preparation',
    'comparative_analysis',
  ]

  for (const field of required) {
    if (!rubric[field]) {
      console.error(`Missing required field: ${field}`)
      return false
    }

    if (typeof rubric[field] !== 'object' || Object.keys(rubric[field]).length === 0) {
      console.error(`Field ${field} is empty or not an object`)
      return false
    }
  }

  // Validate overall_assessment has required sub-fields
  if (!rubric.overall_assessment.overall_score) {
    console.error('Missing overall_score in overall_assessment')
    return false
  }

  // Validate traditional_hr_criteria has scores and feedback
  if (!rubric.traditional_hr_criteria.scores || !rubric.traditional_hr_criteria.feedback) {
    console.error('Missing scores or feedback in traditional_hr_criteria')
    return false
  }

  // Validate that ALL 7 required criteria are present
  const requiredCriteria = [
    'communication_skills',
    'professionalism',
    'basic_qualifications_match',
    'interest_and_enthusiasm',
    'culture_fit_indicators',
    'response_quality',
    'red_flags',
  ]

  const scores = rubric.traditional_hr_criteria.scores
  const feedback = rubric.traditional_hr_criteria.feedback

  for (const criterion of requiredCriteria) {
    if (!(criterion in scores)) {
      console.error(`Missing required criterion in scores: ${criterion}`)
      return false
    }
    if (!(criterion in feedback)) {
      console.error(`Missing required criterion in feedback: ${criterion}`)
      return false
    }
    if (typeof scores[criterion] !== 'number') {
      console.error(`Invalid score type for ${criterion}: expected number, got ${typeof scores[criterion]}`)
      return false
    }
    if (typeof feedback[criterion] !== 'string' || feedback[criterion].trim().length === 0) {
      console.error(`Invalid or empty feedback for ${criterion}`)
      return false
    }
  }

  // Validate comparative_analysis has all required fields
  if (!rubric.comparative_analysis) {
    console.error('Missing comparative_analysis')
    return false
  }

  const ca = rubric.comparative_analysis
  if (typeof ca.percentile_estimate !== 'number' || ca.percentile_estimate < 0 || ca.percentile_estimate > 100) {
    console.error(`Invalid percentile_estimate: expected number 0-100, got ${ca.percentile_estimate}`)
    return false
  }
  if (!Array.isArray(ca.standout_qualities) || ca.standout_qualities.length === 0) {
    console.error('Missing or empty standout_qualities array in comparative_analysis')
    return false
  }
  if (!Array.isArray(ca.common_weaknesses_avoided)) {
    console.error('Missing common_weaknesses_avoided array in comparative_analysis')
    return false
  }
  if (typeof ca.resume_vs_interview !== 'string' || ca.resume_vs_interview.trim().length === 0) {
    console.error('Missing or empty resume_vs_interview in comparative_analysis')
    return false
  }

  // Validate time_management_analysis has required fields
  if (!rubric.time_management_analysis) {
    console.error('Missing time_management_analysis')
    return false
  }

  const tma = rubric.time_management_analysis
  if (!tma.overall_pace && !tma.pacing_feedback) {
    console.error('Missing overall_pace or pacing_feedback in time_management_analysis')
    return false
  }
  if (typeof tma.questions_asked !== 'number') {
    console.error('Missing or invalid questions_asked in time_management_analysis')
    return false
  }

  return true
}

/**
 * Validate HR screen specific fields
 */
export function validateHrScreenRubric(rubric: any): boolean {
  if (!validateRubric(rubric)) {
    return false
  }

  // Check for hr_screen_six_areas
  if (!rubric.hr_screen_six_areas) {
    console.error('Missing hr_screen_six_areas for HR screen rubric')
    return false
  }

  const sixAreas = rubric.hr_screen_six_areas
  if (!sixAreas.what_went_well || !Array.isArray(sixAreas.what_went_well)) {
    console.error('Missing or invalid what_went_well in hr_screen_six_areas')
    return false
  }

  if (!sixAreas.what_needs_improve || !Array.isArray(sixAreas.what_needs_improve)) {
    console.error('Missing or invalid what_needs_improve in hr_screen_six_areas')
    return false
  }

  return true
}

