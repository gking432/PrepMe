// ---------------------------------------------------------------------------
// Professional Introduction Builder — Static Configuration
// Present → Past → Future
// ---------------------------------------------------------------------------

// ========================== TYPE DEFINITIONS ==========================

export type CurrentSituation =
  | 'currently_employed'
  | 'currently_job_searching'
  | 'currently_independent'
  | 'currently_building'
  | 'currently_transitioning'
  | 'recently_left_role'
  | 'student_or_recent_grad'
  | 'returning_to_work'
  | 'other'

export type ProfessionalIdentityStyle =
  | 'broad_professional'
  | 'function_specific'
  | 'hybrid_generalist'
  | 'industry_specific'
  | 'transition_focused'
  | 'early_career'
  | 'custom'

export type Emphasis =
  | 'customer_focus'
  | 'sales'
  | 'marketing'
  | 'product_thinking'
  | 'technical_fluency'
  | 'operations'
  | 'leadership'
  | 'execution'
  | 'strategy'
  | 'communication'
  | 'problem_solving'
  | 'adaptability'
  | 'industry_experience'
  | 'service_orientation'
  | 'teamwork'
  | 'ownership'

export type TonePreference =
  | 'natural_confident'
  | 'polished_professional'
  | 'warm_conversational'
  | 'direct_concise'
  | 'executive'
  | 'early_career'

export type LengthPreference = 'forty_five_seconds' | 'sixty_seconds' | 'ninety_seconds'

export type Avoidance =
  | 'starting_with_current_gap'
  | 'starting_with_side_projects'
  | 'sounding_like_resume_walkthrough'
  | 'listing_every_job'
  | 'using_too_many_buzzwords'
  | 'sounding_too_technical'
  | 'sounding_too_salesy'
  | 'overexplaining_transition'
  | 'overexplaining_independent_work'
  | 'sounding_apologetic'
  | 'sounding_too_generic'
  | 'overclaiming_experience'

export type RewriteInstruction =
  | 'make_shorter'
  | 'make_more_conversational'
  | 'make_more_confident'
  | 'make_less_formal'
  | 'make_more_specific'
  | 'tie_closer_to_role'
  | 'reduce_buzzwords'
  | 'make_less_technical'
  | 'make_less_salesy'
  | 'regenerate'

export interface ProfessionalIntroductionInput {
  currentSituation: CurrentSituation
  currentSituationDetail?: string
  professionalIdentityStyle: ProfessionalIdentityStyle
  customProfessionalIdentity?: string
  emphasis?: Emphasis[]
  tone: TonePreference
  length: LengthPreference
  avoidances?: Avoidance[]
}

export interface ProfessionalIntroductionOutput {
  answerType: 'professional_introduction'
  structureUsed: {
    present: string
    past: string
    future: string
  }
  primaryAnswer: string
  casualAnswer: string
  shortAnswer: string
  openingLineOptions: string[]
  closingLineOptions: string[]
  whyThisWorks: string[]
  possibleWeakSpots: string[]
  likelyFollowUpQuestions: string[]
}

// ========================== OPTION ARRAYS ==========================

export const CURRENT_SITUATION_OPTIONS = [
  {
    id: 'currently_employed' as const,
    label: "I'm currently employed",
    description: 'Best if you currently have a role.',
  },
  {
    id: 'currently_job_searching' as const,
    label: "I'm currently looking for my next role",
    description: 'Best if you are between jobs.',
  },
  {
    id: 'currently_independent' as const,
    label: "I'm currently doing independent work",
    description: 'Best for freelancing, consulting, agency work, or self-directed work.',
  },
  {
    id: 'currently_building' as const,
    label: "I'm currently building products or projects",
    description: 'Best for apps, prototypes, startups, creative work, or product exploration.',
  },
  {
    id: 'currently_transitioning' as const,
    label: "I'm making a career transition",
    description: 'Best if you are moving from one function or industry into another.',
  },
  {
    id: 'recently_left_role' as const,
    label: 'I recently left a role or business',
    description: 'Best if your recent change needs a simple explanation.',
  },
  {
    id: 'student_or_recent_grad' as const,
    label: "I'm a student or recent graduate",
    description: 'Best for early-career users.',
  },
  {
    id: 'returning_to_work' as const,
    label: "I'm returning to work",
    description: 'Best if you are re-entering after time away.',
  },
  {
    id: 'other' as const,
    label: 'Other',
    description: 'Describe manually.',
  },
] as const

export const PROFESSIONAL_IDENTITY_STYLE_OPTIONS = [
  {
    id: 'broad_professional' as const,
    label: 'Broad professional identity',
    description: "Example: I'm a marketing and sales professional with experience across brand positioning, client management, and strategy.",
  },
  {
    id: 'function_specific' as const,
    label: 'Function-specific identity',
    description: "Example: I'm a software engineer focused on backend systems and reliable product infrastructure.",
  },
  {
    id: 'hybrid_generalist' as const,
    label: 'Hybrid / generalist identity',
    description: 'Example: My background sits across sales, marketing, product, and customer-facing work.',
  },
  {
    id: 'industry_specific' as const,
    label: 'Industry-specific identity',
    description: "Example: I'm a healthcare operations professional with experience in patient care coordination and service delivery.",
  },
  {
    id: 'transition_focused' as const,
    label: 'Transition-focused identity',
    description: "Example: My background started in education, and I'm now moving toward training and employee development.",
  },
  {
    id: 'early_career' as const,
    label: 'Early-career identity',
    description: "Example: I'm early in my career, with experience through internships, projects, and hands-on learning.",
  },
  {
    id: 'custom' as const,
    label: 'I want to write my own opening identity',
    description: 'Best if you already know exactly how you want to describe yourself.',
  },
] as const

export const EMPHASIS_OPTIONS = [
  { id: 'customer_focus' as const, label: 'Customer focus' },
  { id: 'sales' as const, label: 'Sales' },
  { id: 'marketing' as const, label: 'Marketing' },
  { id: 'product_thinking' as const, label: 'Product thinking' },
  { id: 'technical_fluency' as const, label: 'Technical fluency' },
  { id: 'operations' as const, label: 'Operations' },
  { id: 'leadership' as const, label: 'Leadership' },
  { id: 'execution' as const, label: 'Execution' },
  { id: 'strategy' as const, label: 'Strategy' },
  { id: 'communication' as const, label: 'Communication' },
  { id: 'problem_solving' as const, label: 'Problem solving' },
  { id: 'adaptability' as const, label: 'Adaptability' },
  { id: 'industry_experience' as const, label: 'Industry experience' },
  { id: 'service_orientation' as const, label: 'Service orientation' },
  { id: 'teamwork' as const, label: 'Teamwork' },
  { id: 'ownership' as const, label: 'Ownership' },
] as const

export const TONE_OPTIONS = [
  {
    id: 'natural_confident' as const,
    label: 'Natural and confident',
    description: 'Clear, human, and capable without sounding rehearsed.',
  },
  {
    id: 'polished_professional' as const,
    label: 'Polished and professional',
    description: 'More formal and structured.',
  },
  {
    id: 'warm_conversational' as const,
    label: 'Warm and conversational',
    description: 'Friendly, approachable, and less corporate.',
  },
  {
    id: 'direct_concise' as const,
    label: 'Direct and concise',
    description: 'Short, efficient, and to the point.',
  },
  {
    id: 'executive' as const,
    label: 'Executive',
    description: 'Higher-level, strategic, and commercially focused.',
  },
  {
    id: 'early_career' as const,
    label: 'Early career',
    description: 'Useful for students, recent grads, or people with limited experience.',
  },
] as const

export const LENGTH_OPTIONS = [
  { id: 'forty_five_seconds' as const, label: '45 seconds', description: 'Best for quick phone screens.' },
  { id: 'sixty_seconds' as const, label: '60 seconds', description: 'Best default for most interviews.' },
  { id: 'ninety_seconds' as const, label: '90 seconds', description: 'Best when the interviewer asks an open-ended version.' },
] as const

export const AVOIDANCE_OPTIONS = [
  { id: 'starting_with_current_gap' as const, label: 'Starting with a current gap' },
  { id: 'starting_with_side_projects' as const, label: 'Starting with side projects' },
  { id: 'sounding_like_resume_walkthrough' as const, label: 'Sounding like a resume walkthrough' },
  { id: 'listing_every_job' as const, label: 'Listing every job' },
  { id: 'using_too_many_buzzwords' as const, label: 'Using too many buzzwords' },
  { id: 'sounding_too_technical' as const, label: 'Sounding too technical' },
  { id: 'sounding_too_salesy' as const, label: 'Sounding too salesy' },
  { id: 'overexplaining_transition' as const, label: 'Overexplaining a transition' },
  { id: 'overexplaining_independent_work' as const, label: 'Overexplaining independent work' },
  { id: 'sounding_apologetic' as const, label: 'Sounding apologetic' },
  { id: 'sounding_too_generic' as const, label: 'Sounding too generic' },
  { id: 'overclaiming_experience' as const, label: 'Overclaiming experience' },
] as const

export const DEFAULT_AVOIDANCES: Avoidance[] = [
  'sounding_like_resume_walkthrough',
  'listing_every_job',
  'using_too_many_buzzwords',
  'starting_with_side_projects',
  'sounding_apologetic',
]

export const REWRITE_OPTIONS = [
  { id: 'make_shorter' as const, label: 'Make shorter' },
  { id: 'make_more_conversational' as const, label: 'Make more conversational' },
  { id: 'make_more_confident' as const, label: 'Make more confident' },
  { id: 'make_less_formal' as const, label: 'Make less formal' },
  { id: 'make_more_specific' as const, label: 'Make more specific' },
  { id: 'tie_closer_to_role' as const, label: 'Tie closer to the role' },
  { id: 'reduce_buzzwords' as const, label: 'Reduce buzzwords' },
  { id: 'make_less_technical' as const, label: 'Make less technical' },
  { id: 'make_less_salesy' as const, label: 'Make less salesy' },
  { id: 'regenerate' as const, label: 'Regenerate' },
] as const

export const PROGRESS_STEPS = [
  'Context', 'Present', 'Delivery', 'Generate',
] as const

// ========================== FRAMEWORK STEPS (for flip cards) ==========================

export const FRAMEWORK_STEPS = [
  {
    key: 'present',
    label: 'Present',
    description: 'Open with your professional lane now and the work you are best positioned to do. Lead with value, not employment status.',
    color: 'emerald',
    emoji: '📍',
  },
  {
    key: 'past',
    label: 'Past',
    description: 'Select one or two relevant experiences that explain how you built that lane. Give the through-line, not every job.',
    color: 'sky',
    emoji: '🧭',
  },
  {
    key: 'future',
    label: 'Future',
    description: 'Connect that through-line to this specific role and explain why the move makes sense now.',
    color: 'violet',
    emoji: '🎯',
  },
] as const
