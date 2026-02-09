/**
 * Options passed to each stage's buildSystemPrompt.
 * dataSection is built by the voice route (resume, job description, company website).
 * conversationContext and phaseInstructions are used by hr_screen for question tracking and phases.
 */
export type StagePromptOptions = {
  dataSection: string
  conversationContext?: string
  phaseInstructions?: string
}

export type StageId = 'hr_screen' | 'hiring_manager' | 'culture_fit' | 'final'
