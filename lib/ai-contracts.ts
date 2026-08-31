import { z } from 'zod'

const nonEmptyText = z.string().trim().min(1)
const textList = z.array(nonEmptyText)

export const evidenceSchema = z.object({
  question: z.string().optional(),
  question_id: z.string().optional(),
  excerpt: z.string().optional(),
  timestamp: z.string().optional(),
}).passthrough()

const signalAreaBase = z.object({
  criterion: nonEmptyText,
  feedback: nonEmptyText,
  rootCause: z.string().optional(),
  root_cause: z.string().optional(),
  practice_focus_id: z.string().optional(),
  rewrite_method: z.string().optional(),
  evidence: z.array(evidenceSchema).default([]),
}).passthrough()

export const signalAreaSchema = signalAreaBase.extend({
  score: z.coerce.number().min(0).max(10),
})

const graderSignalAreaSchema = signalAreaBase.extend({
  score: z.coerce.number().min(0).max(10).optional(),
})

export const sixAreaFeedbackSchema = z.object({
  what_went_well: z.array(signalAreaSchema),
  what_needs_improve: z.array(signalAreaSchema),
}).passthrough()

const graderSixAreaFeedbackSchema = z.object({
  what_went_well: z.array(graderSignalAreaSchema),
  what_needs_improve: z.array(graderSignalAreaSchema),
}).passthrough()

export const portfolioFeedbackSchema = z.object({
  overall_score: z.coerce.number().min(0).max(10),
  hr_screen_six_areas: sixAreaFeedbackSchema,
}).passthrough()

export const hrScreenGraderOutputSchema = z.object({
  overall_assessment: z.object({
    overall_score: z.coerce.number().min(0).max(10),
  }).passthrough(),
  hr_screen_six_areas: graderSixAreaFeedbackSchema,
}).passthrough()

export const professionalStoryOutputSchema = z.object({
  answerType: z.literal('professional_introduction'),
  structureUsed: z.object({
    present: nonEmptyText,
    past: nonEmptyText,
    future: nonEmptyText,
  }),
  primaryAnswer: nonEmptyText,
  casualAnswer: nonEmptyText,
  shortAnswer: nonEmptyText,
  openingLineOptions: textList.min(1),
  closingLineOptions: textList.min(1),
  whyThisWorks: textList.min(1),
  possibleWeakSpots: textList,
  likelyFollowUpQuestions: textList,
})

export const starStoryOutputSchema = z.object({
  storySummary: nonEmptyText,
  starBreakdown: z.object({
    situation: nonEmptyText,
    task: nonEmptyText,
    action: nonEmptyText,
    result: nonEmptyText,
  }),
  sixtySecondAnswer: nonEmptyText,
  thirtySecondAnswer: nonEmptyText,
  followUpQuestions: textList.min(1),
})

export const careerAlignmentOutputSchema = z.object({
  answerType: z.literal('career_alignment'),
  inferredQuestionIntent: z.enum(['why_role', 'why_company', 'why_now', 'why_interested', 'why_fit', 'mixed']),
  observationAnchor: z.enum([
    'role_responsibility',
    'company_mission_or_model',
    'industry_or_space',
    'customer_problem',
    'business_problem',
    'working_style',
    'growth_stage',
    'career_timing',
  ]),
  structureUsed: z.object({
    observation: nonEmptyText,
    evidenceOfFit: nonEmptyText,
    timing: nonEmptyText,
  }),
  primaryAnswer: nonEmptyText,
  shorterAnswer: nonEmptyText,
  conversationalAnswer: nonEmptyText,
  whyThisWorks: textList.min(1),
  followUpPrep: textList.min(1),
})

export const answerRewriteSchema = z.object({ primaryAnswer: nonEmptyText }).passthrough()

export const guidedWorkshopOutputSchema = z.object({
  suggestions: textList.min(1).max(5),
  hint: z.string().default(''),
})

export const rewriteBatchSchema = z.object({
  rewrites: z.array(z.object({
    id: nonEmptyText,
    method: z.string().optional(),
    rewritten_answer: nonEmptyText,
    why_this_works: z.string().optional(),
  }).passthrough()),
})

export function extractModelJson(raw: string): unknown {
  if (!raw.trim()) throw new Error('Model returned an empty response')
  const fenced = raw.match(/```(?:json)?\s*([\s\S]*?)```/i)
  const candidate = (fenced?.[1] || raw).trim()
  const start = candidate.indexOf('{')
  const end = candidate.lastIndexOf('}')
  if (start < 0 || end < start) throw new Error('Model response did not contain a JSON object')
  return JSON.parse(candidate.slice(start, end + 1))
}

export function parseModelOutput<TSchema extends z.ZodTypeAny>(
  raw: string,
  schema: TSchema,
): z.infer<TSchema> {
  return schema.parse(extractModelJson(raw))
}
