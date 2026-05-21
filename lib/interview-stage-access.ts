export const TEST_ALL_INTERVIEW_STAGES_UNLOCKED = true

export function isInterviewStageLocked(hasAccess: boolean | undefined, stage: string) {
  if (stage === 'hr_screen') return false
  if (TEST_ALL_INTERVIEW_STAGES_UNLOCKED) return false
  return !hasAccess
}

export function shouldEnforceInterviewStageAccess() {
  return !TEST_ALL_INTERVIEW_STAGES_UNLOCKED
}

export function shouldDeductInterviewCredit(stage: string) {
  if (stage === 'hr_screen') return false
  return !TEST_ALL_INTERVIEW_STAGES_UNLOCKED
}
