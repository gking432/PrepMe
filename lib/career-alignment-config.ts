// ---------------------------------------------------------------------------
// Career Alignment Builder — Static Configuration
// Observation → Fit → Timing
// ---------------------------------------------------------------------------

// ========================== TYPE DEFINITIONS ==========================

export type CareerAlignmentQuestionType =
  | 'why_this_role'
  | 'why_this_company'
  | 'why_are_you_interested'
  | 'why_now'
  | 'why_should_we_hire_you'
  | 'what_attracted_you'
  | 'why_are_you_a_fit'

export type RoleObservationType =
  | 'customer_closeness'
  | 'ownership'
  | 'execution'
  | 'problem_solving'
  | 'relationship_building'
  | 'technical_depth'
  | 'cross_functional_work'
  | 'process_improvement'
  | 'growth_or_sales'
  | 'service_or_care'
  | 'mission_alignment'
  | 'learning_opportunity'
  | 'leadership'
  | 'pace_or_ambiguity'
  | 'industry_specific_work'

export type CareerAlignmentTone =
  | 'natural_confident'
  | 'polished_professional'
  | 'warm_conversational'
  | 'direct_concise'
  | 'executive'
  | 'early_career'

export type CareerAlignmentLength = 'thirty_seconds' | 'sixty_seconds' | 'ninety_seconds'

export type CareerAlignmentAvoidance =
  | 'sounding_generic'
  | 'sounding_too_excited'
  | 'sounding_too_salesy'
  | 'sounding_too_technical'
  | 'sounding_apologetic'
  | 'overexplaining_transition'
  | 'overexplaining_gap'
  | 'listing_every_job'
  | 'using_too_many_buzzwords'
  | 'overclaiming_fit'
  | 'overusing_company_flattery'
  | 'sounding_like_cover_letter'
  | 'sounding_like_resume_walkthrough'

export type CareerAlignmentRewriteInstruction =
  | 'make_shorter'
  | 'make_more_conversational'
  | 'make_more_confident'
  | 'make_less_formal'
  | 'tie_closer_to_company'
  | 'tie_closer_to_role'
  | 'reduce_buzzwords'
  | 'make_more_executive'
  | 'make_more_entry_level'
  | 'regenerate'

export interface CareerAlignmentOutput {
  questionType: CareerAlignmentQuestionType
  roleObservation: {
    observationType: RoleObservationType
    observation: string
    evidenceFromJobDescription: string
  }
  companyObservation?: {
    observation: string
    evidenceFromCompanyOrJobDescription: string
  }
  candidateFit: {
    fitSummary: string
    evidenceFromResume: string[]
  }
  timing: {
    timingSummary: string
    whyNow: string
  }
  primaryAnswer: string
  shorterAnswer: string
  moreConversationalAnswer: string
  openingLineOptions: string[]
  closingLineOptions: string[]
  whyThisWorks: string[]
  possibleWeakSpots: string[]
}

// ========================== OPTION ARRAYS ==========================

export const QUESTION_TYPE_OPTIONS = [
  { id: 'why_this_role' as const, label: 'Why this role?', description: 'Best for explaining why the responsibilities and opportunity fit your background.' },
  { id: 'why_this_company' as const, label: 'Why this company?', description: 'Best for explaining why the company itself interests you.' },
  { id: 'why_are_you_interested' as const, label: 'Why are you interested?', description: 'Best general-purpose version.' },
  { id: 'why_now' as const, label: 'Why now?', description: 'Best for explaining timing, transition, or next step.' },
  { id: 'why_should_we_hire_you' as const, label: 'Why should we hire you?', description: 'Best for emphasizing fit, value, and contribution.' },
  { id: 'what_attracted_you' as const, label: 'What attracted you to this opportunity?', description: 'Best for a softer version of why this role or company.' },
  { id: 'why_are_you_a_fit' as const, label: 'Why are you a fit?', description: 'Best for directly connecting your background to the role.' },
] as const

export const TONE_OPTIONS = [
  { id: 'natural_confident' as const, label: 'Natural and confident', description: 'Clear, human, and capable without sounding rehearsed.' },
  { id: 'polished_professional' as const, label: 'Polished and professional', description: 'More formal and structured.' },
  { id: 'warm_conversational' as const, label: 'Warm and conversational', description: 'Friendly, approachable, and less corporate.' },
  { id: 'direct_concise' as const, label: 'Direct and concise', description: 'Short, efficient, and to the point.' },
  { id: 'executive' as const, label: 'Executive', description: 'Higher-level, strategic, and commercially focused.' },
  { id: 'early_career' as const, label: 'Early career', description: 'Useful for students, recent grads, or people with limited experience.' },
] as const

export const LENGTH_OPTIONS = [
  { id: 'thirty_seconds' as const, label: '30 seconds', description: 'Best for quick screens or when the interviewer wants brevity.' },
  { id: 'sixty_seconds' as const, label: '60 seconds', description: 'Best default for most interviews.' },
  { id: 'ninety_seconds' as const, label: '90 seconds', description: 'Best for senior roles or when the question is very open-ended.' },
] as const

export const DEFAULT_AVOIDANCES: CareerAlignmentAvoidance[] = [
  'sounding_generic',
  'using_too_many_buzzwords',
  'overclaiming_fit',
  'overusing_company_flattery',
]

export const REWRITE_OPTIONS = [
  { id: 'make_shorter' as const, label: 'Make shorter' },
  { id: 'make_more_conversational' as const, label: 'Make more conversational' },
  { id: 'make_more_confident' as const, label: 'Make more confident' },
  { id: 'make_less_formal' as const, label: 'Make less formal' },
  { id: 'tie_closer_to_company' as const, label: 'Tie closer to the company' },
  { id: 'tie_closer_to_role' as const, label: 'Tie closer to the role' },
  { id: 'reduce_buzzwords' as const, label: 'Reduce buzzwords' },
  { id: 'make_more_executive' as const, label: 'Make more executive' },
  { id: 'make_more_entry_level' as const, label: 'Make more entry-level' },
  { id: 'regenerate' as const, label: 'Regenerate' },
] as const

export const PROGRESS_STEPS = ['Question', 'Tone', 'Generate'] as const

// ========================== FRAMEWORK STEPS (for flip cards) ==========================

export const FRAMEWORK_STEPS = [
  { key: 'observation', label: 'Observation', description: "What you noticed about the role or company. Something specific and real — not generic excitement.", color: 'sky', emoji: '👁️' },
  { key: 'fit', label: 'Fit', description: "Why your background connects to that observation. 1-2 relevant experiences, not your whole resume.", color: 'amber', emoji: '🔗' },
  { key: 'timing', label: 'Timing', description: "Why this opportunity makes sense now. What changed, what you want next, why this moment is right.", color: 'violet', emoji: '⏱️' },
] as const
