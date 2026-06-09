// ---------------------------------------------------------------------------
// Career Alignment Builder — Static Configuration
// Observation → Evidence of Fit → Timing
// ---------------------------------------------------------------------------

export type CareerAlignmentQuestionIntent =
  | 'why_role'
  | 'why_company'
  | 'why_now'
  | 'why_interested'
  | 'why_fit'
  | 'mixed'

export type ObservationAnchor =
  | 'role_responsibility'
  | 'company_mission_or_model'
  | 'industry_or_space'
  | 'customer_problem'
  | 'business_problem'
  | 'working_style'
  | 'growth_stage'
  | 'career_timing'

export type CareerAlignmentTone =
  | 'natural_confident'
  | 'polished_professional'
  | 'warm_conversational'
  | 'direct_concise'
  | 'executive'
  | 'early_career'

export type CareerAlignmentLength = 'thirty_seconds' | 'sixty_seconds' | 'ninety_seconds'

export type CareerAlignmentRewriteInstruction =
  | 'regenerate'
  | 'make_shorter'
  | 'make_more_conversational'
  | 'make_more_confident'
  | 'make_less_formal'
  | 'tie_closer_to_role'
  | 'tie_closer_to_company'
  | 'use_stronger_evidence'
  | 'reduce_buzzwords'

export interface CandidateProfileSummary {
  professionalHeadline?: string
  strongestExperienceAreas: string[]
  coreSkills: string[]
  relevantCompaniesOrProjects: string[]
  currentOrRecentWork?: string
  careerArcSummary?: string
  notableProofPoints?: string[]
  possibleConcerns?: string[]
}

export interface JobDescriptionSummary {
  roleTitle?: string
  companyName?: string
  roleCategory?: string
  topResponsibilities: string[]
  topRequiredSkills: string[]
  likelyInterviewerPriorities: string[]
  roleFitThemes?: string[]
}

export interface CareerAlignmentOutput {
  answerType: 'career_alignment'
  inferredQuestionIntent: CareerAlignmentQuestionIntent
  observationAnchor: ObservationAnchor
  structureUsed: {
    observation: string
    evidenceOfFit: string
    timing: string
  }
  primaryAnswer: string
  shorterAnswer: string
  conversationalAnswer: string
  whyThisWorks: string[]
  followUpPrep: string[]
}

export const DEFAULT_TONE: CareerAlignmentTone = 'natural_confident'
export const DEFAULT_LENGTH: CareerAlignmentLength = 'sixty_seconds'

export const REWRITE_OPTIONS: { id: CareerAlignmentRewriteInstruction; label: string }[] = [
  { id: 'regenerate', label: 'Regenerate' },
  { id: 'make_shorter', label: 'Make shorter' },
  { id: 'make_more_conversational', label: 'Make more conversational' },
  { id: 'make_more_confident', label: 'Make more confident' },
  { id: 'make_less_formal', label: 'Make less formal' },
  { id: 'tie_closer_to_role', label: 'Tie closer to the role' },
  { id: 'tie_closer_to_company', label: 'Tie closer to the company' },
  { id: 'use_stronger_evidence', label: 'Use stronger evidence' },
  { id: 'reduce_buzzwords', label: 'Reduce buzzwords' },
]

export const FRAMEWORK_STEPS = [
  {
    key: 'observation',
    label: 'Observation',
    description: 'What you noticed about the role, company, or space.',
    color: 'sky',
    emoji: '👁️',
  },
  {
    key: 'evidenceOfFit',
    label: 'Evidence of Fit',
    description: 'What in your background proves the connection.',
    color: 'amber',
    emoji: '🔗',
  },
  {
    key: 'timing',
    label: 'Timing',
    description: 'Why this makes sense as your next step.',
    color: 'violet',
    emoji: '⏱️',
  },
] as const
