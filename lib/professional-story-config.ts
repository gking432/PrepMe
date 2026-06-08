// ---------------------------------------------------------------------------
// Professional Story Builder — Static Configuration
// ---------------------------------------------------------------------------

// ========================== TYPE DEFINITIONS ==========================

export type NarrativeAngleType =
  | 'function_based'
  | 'industry_based'
  | 'skill_cluster'
  | 'problem_solver'
  | 'progression'
  | 'transition'
  | 'mission_fit'
  | 'operator'

export type CurrentPositioning =
  | 'currently_in_role'
  | 'currently_job_searching'
  | 'currently_independent'
  | 'currently_building'
  | 'currently_transitioning'
  | 'recently_left_role'
  | 'student_or_recent_grad'
  | 'returning_to_work'
  | 'other'

export type TonePreference =
  | 'natural_confident'
  | 'polished_professional'
  | 'warm_conversational'
  | 'direct_concise'
  | 'executive'
  | 'early_career'

export type LengthPreference = 'thirty_seconds' | 'sixty_seconds' | 'ninety_seconds'

export type AvoidEmphasis =
  | 'sounding_like_resume_walkthrough'
  | 'listing_every_job'
  | 'using_too_many_buzzwords'
  | 'explaining_why_leaving'
  | 'drawing_attention_to_gaps'
  | 'highlighting_short_tenure'
  | 'sounding_overqualified'
  | 'sounding_underqualified'
  | 'over_explaining_career_change'
  | 'sounding_too_junior'
  | 'sounding_too_senior'
  | 'being_too_vague'
  | 'being_too_detailed'
  | 'sounding_desperate'
  | 'sounding_arrogant'

export interface ProfessionalStoryInput {
  currentPositioning: CurrentPositioning
  currentPositioningOtherDetail?: string
  tone: TonePreference
  length: LengthPreference
  avoidEmphasis: AvoidEmphasis[]
  additionalNotes?: string
}

export interface NarrativeAngle {
  type: NarrativeAngleType
  label: string
  description: string
}

export interface ProfessionalStoryOutput {
  roleUnderstanding: {
    roleTitle?: string
    companyName?: string
    interviewerLikelyCaresAbout: string[]
  }
  resumeFitSummary: {
    strongestRelevantBackground: string[]
    backgroundToMinimize: string[]
    possibleConcern?: string
  }
  recommendedAngle: NarrativeAngle
  alternateAngles: NarrativeAngle[]
  ppfBreakdown: {
    present: string
    past: string
    future: string
  }
  fullAnswer: string
  shorterVersion: string
  conversationalVersion: string
  openingLines: string[]
  closingLines: string[]
  whyItWorks: string
  watchOuts: string[]
  followUpQuestions: string[]
}

// ========================== OPTION ARRAYS ==========================

export const CURRENT_POSITIONING_OPTIONS = [
  {
    id: 'currently_in_role' as const,
    label: 'Currently in a role',
    description: "You're employed and looking for a new opportunity.",
  },
  {
    id: 'currently_job_searching' as const,
    label: 'Actively job searching',
    description: "You're between roles and actively looking.",
  },
  {
    id: 'currently_independent' as const,
    label: 'Freelance or consulting',
    description: "You're working independently and want to go in-house or change direction.",
  },
  {
    id: 'currently_building' as const,
    label: 'Building something',
    description: "You're working on your own project, startup, or side business.",
  },
  {
    id: 'currently_transitioning' as const,
    label: 'Career transition',
    description: "You're moving into a different function or field.",
  },
  {
    id: 'recently_left_role' as const,
    label: 'Recently left a role',
    description: "You left your last job and are figuring out what's next.",
  },
  {
    id: 'student_or_recent_grad' as const,
    label: 'Student or recent grad',
    description: "You're finishing school or recently graduated.",
  },
  {
    id: 'returning_to_work' as const,
    label: 'Returning to work',
    description: "You've been away and are getting back into the workforce.",
  },
  {
    id: 'other' as const,
    label: 'Other',
    description: "Something else — you'll add a short note.",
  },
] as const

export const TONE_OPTIONS = [
  {
    id: 'natural_confident' as const,
    label: 'Natural & confident',
    description: 'Clear, to the point. Like someone who knows what they bring.',
  },
  {
    id: 'polished_professional' as const,
    label: 'Polished & professional',
    description: 'Structured, articulate. Like someone who prepares well.',
  },
  {
    id: 'warm_conversational' as const,
    label: 'Warm & conversational',
    description: 'Friendly, approachable. Like talking to a colleague.',
  },
  {
    id: 'direct_concise' as const,
    label: 'Direct & concise',
    description: 'No filler. Gets to the point fast.',
  },
  {
    id: 'executive' as const,
    label: 'Executive',
    description: 'Strategic, high-level. Sounds like someone who leads.',
  },
  {
    id: 'early_career' as const,
    label: 'Early career',
    description: 'Eager, genuine. Sounds like someone ready to prove themselves.',
  },
] as const

export const LENGTH_OPTIONS = [
  { id: 'thirty_seconds' as const, label: '30 seconds', description: '70–100 words. Quick and tight for early screens.' },
  { id: 'sixty_seconds' as const, label: '60 seconds', description: '130–180 words. Standard length, covers the arc.' },
  { id: 'ninety_seconds' as const, label: '90 seconds', description: '190–260 words. Full version when they give you room.' },
] as const

export const AVOID_OPTIONS = [
  { id: 'sounding_like_resume_walkthrough' as const, label: "Sounding like a resume walkthrough" },
  { id: 'listing_every_job' as const, label: "Listing every job" },
  { id: 'using_too_many_buzzwords' as const, label: "Using too many buzzwords" },
  { id: 'explaining_why_leaving' as const, label: "Explaining why I'm leaving" },
  { id: 'drawing_attention_to_gaps' as const, label: "Drawing attention to gaps" },
  { id: 'highlighting_short_tenure' as const, label: "Highlighting short stints" },
  { id: 'sounding_overqualified' as const, label: "Sounding overqualified" },
  { id: 'sounding_underqualified' as const, label: "Sounding underqualified" },
  { id: 'over_explaining_career_change' as const, label: "Over-explaining the career change" },
  { id: 'sounding_too_junior' as const, label: "Sounding too junior" },
  { id: 'sounding_too_senior' as const, label: "Sounding too senior" },
  { id: 'being_too_vague' as const, label: "Being too vague" },
  { id: 'being_too_detailed' as const, label: "Being too detailed" },
  { id: 'sounding_desperate' as const, label: "Sounding desperate" },
  { id: 'sounding_arrogant' as const, label: "Sounding arrogant" },
] as const

export const PROGRESS_STEPS = [
  'Positioning', 'Tone', 'Details', 'Generate',
] as const

// ========================== FRAMEWORK STEPS (for flip cards) ==========================

export const FRAMEWORK_STEPS = [
  {
    key: 'present',
    label: 'Present',
    description: "Who you are now — your current role, what you spend your time on. Not a resume recitation.",
    color: 'sky',
    emoji: '📍',
  },
  {
    key: 'past',
    label: 'Past',
    description: "The relevant background that got you here. Pick one or two things — not your whole history.",
    color: 'amber',
    emoji: '🔙',
  },
  {
    key: 'future',
    label: 'Future',
    description: "Why this role, why now. Connect your arc to the specific job — not just 'I want to grow.'",
    color: 'violet',
    emoji: '🎯',
  },
] as const

// ========================== DEFAULT AVOID EMPHASIS ==========================

export const DEFAULT_AVOID_EMPHASIS: AvoidEmphasis[] = [
  'sounding_like_resume_walkthrough',
  'listing_every_job',
  'using_too_many_buzzwords',
]
