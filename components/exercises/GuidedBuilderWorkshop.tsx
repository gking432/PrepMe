'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  ArrowRight,
  Check,
  CheckCircle2,
  Lightbulb,
  Lock,
  Mic,
  MicOff,
  RefreshCw,
  Sparkles,
  Target,
  Zap,
} from 'lucide-react'
import { PORTFOLIO_DEMO_MODE, getDemoContextPayload } from '@/lib/portfolio-demo'

export type WorkshopType =
  | 'professional_story'
  | 'star_proof'
  | 'career_alignment'
  | 'handling_uncertainty'
  | 'pace_delivery'
  | 'preparation_curiosity'
  | 'role_depth'
  | 'problem_solving'

interface GuidedBuilderWorkshopProps {
  workshopType: WorkshopType
  sessionId?: string
  originalQuestion?: string
  originalAnswer?: string
  onComplete: () => void
}

type Phase = 'intro' | 'method' | 'tags' | 'gather' | 'build' | 'assemble' | 'recall' | 'done'

interface FrameworkStep {
  key: string
  label: string
  description: string
  prompt: string
  color: string
  emoji: string
  example?: string
}

interface GatherQuestion {
  key: string
  label: string
  placeholder: string
  hint: string
  multiline?: boolean
}

interface WorkshopConfig {
  framework: string
  whyTitle: string
  whyBody: string
  whenItHits: string
  steps: FrameworkStep[]
  assembleHint: string
  practiceCta: string
  tagPrompt: string
  tags: string[]
  gatherQuestions?: GatherQuestion[]
}

const COLOR_MAP: Record<string, { bg: string; border: string; text: string; ring: string; soft: string; chip: string }> = {
  violet: { bg: 'bg-violet-500', border: 'border-violet-300', text: 'text-violet-700', ring: 'ring-violet-400', soft: 'bg-violet-50', chip: 'bg-violet-100 text-violet-800' },
  emerald: { bg: 'bg-emerald-500', border: 'border-emerald-300', text: 'text-emerald-700', ring: 'ring-emerald-400', soft: 'bg-emerald-50', chip: 'bg-emerald-100 text-emerald-800' },
  sky: { bg: 'bg-sky-500', border: 'border-sky-300', text: 'text-sky-700', ring: 'ring-sky-400', soft: 'bg-sky-50', chip: 'bg-sky-100 text-sky-800' },
  amber: { bg: 'bg-amber-500', border: 'border-amber-300', text: 'text-amber-700', ring: 'ring-amber-400', soft: 'bg-amber-50', chip: 'bg-amber-100 text-amber-800' },
  rose: { bg: 'bg-rose-500', border: 'border-rose-300', text: 'text-rose-700', ring: 'ring-rose-400', soft: 'bg-rose-50', chip: 'bg-rose-100 text-rose-800' },
}

const CONFIGS: Record<WorkshopType, WorkshopConfig> = {
  star_proof: {
    framework: 'STAR',
    whyTitle: 'Interviewers want proof, not opinions.',
    whyBody: 'A vague example sounds like talk. A specific one sounds like evidence. STAR forces you to show the work: the scene, the stakes, the moves, the outcome.',
    whenItHits: 'Use it any time you hear "tell me about a time", "give me an example", or "walk me through how you handled..."',
    steps: [
      { key: 'situation', label: 'Situation', description: 'Set the scene in 1-2 sentences. Who, where, when. Just enough to follow.', prompt: 'Pick a real situation.', color: 'sky', emoji: '🎬', example: '"At TouchPoint, we had a client whose website deliverables got completely mixed up between two projects."' },
      { key: 'task', label: 'Task', description: 'What was specifically at stake or yours to own?', prompt: 'What was on your plate?', color: 'amber', emoji: '🎯', example: '"I was responsible for sorting out the mess and making sure the client didn\'t lose confidence in us."' },
      { key: 'action', label: 'Action', description: 'The biggest weight goes here. What did you actually do?', prompt: 'What did you actually do?', color: 'violet', emoji: '⚡', example: '"What I actually did was eat the cost on our end, redesign the entire website myself, and keep the client in the loop daily."' },
      { key: 'result', label: 'Result', description: 'Close with what changed. Numbers if you have them, real outcome if you don\'t.', prompt: 'What changed?', color: 'emerald', emoji: '✅', example: '"In the end, they were happy with the finished product and their customer conversion went up about 15%."' },
    ],
    assembleHint: 'Notice the answer leads with scene, narrows fast to ownership, then puts most weight on what you did.',
    practiceCta: 'Say it out loud',
    tagPrompt: 'How did you show up in this story? Pick at least 4.',
    tags: ['hands-on', 'scrappy', 'methodical', 'decisive', 'calm-under-pressure', 'collaborative', 'persistent', 'analytical', 'creative', 'direct', 'patient', 'resourceful', 'curious', 'adaptable', 'detail-oriented', 'fast-moving', 'principled', 'pragmatic', 'humble', 'thorough'],
    gatherQuestions: [
      { key: 'story_company', label: 'Where did this happen?', placeholder: 'e.g. TouchPoint, Sub-Zero, a freelance project', hint: 'Name the company or context. Doesn\'t need to be your current job.' },
      { key: 'story_problem', label: 'What specifically went wrong or was at stake?', placeholder: 'e.g. A client\'s website deliverables got mixed up between two projects and we were about to lose them', hint: 'Be specific — name the actual problem, not the general responsibility. What was the mess, the risk, or the thing that needed fixing?', multiline: true },
      { key: 'story_action', label: 'What did you actually do about it?', placeholder: 'e.g. I ate the cost, redesigned the whole website myself, and kept the client updated daily', hint: 'Concrete actions — what you personally did, not what the team did generally.', multiline: true },
      { key: 'story_result', label: 'How did it turn out?', placeholder: 'e.g. They were happy, their conversion rate went up 15%, and they referred two more clients', hint: 'What changed because of what you did? Numbers if you have them, real outcome if you don\'t.' },
    ],
  },
  professional_story: {
    framework: 'Present · Past · Future',
    whyTitle: '"Tell me about yourself" is not a resume recap.',
    whyBody: 'Interviewers want an arc that explains why you\'re sitting in that chair. Present-Past-Future gives them a coherent story instead of a list of facts.',
    whenItHits: 'Use it for "tell me about yourself", "walk me through your background", or any open opener in the first 60 seconds.',
    steps: [
      { key: 'present', label: 'Present', description: 'Where you are right now. Role, focus, what you\'re known for.', prompt: 'Start with your now.', color: 'violet', emoji: '👋', example: '"Right now, at TouchPoint I work as a product developer, where I\'m mostly focused on moving from concept to working prototypes and getting real user feedback."' },
      { key: 'past', label: 'Past', description: 'The 1-2 things in your background that explain how you got here.', prompt: 'What shaped that?', color: 'sky', emoji: '🧭', example: '"Before that, I spent time at Sub-Zero doing dealer development, which is where I built my foundation in managing client relationships and understanding purchasing decisions."' },
      { key: 'future', label: 'Future', description: 'Why this role is the natural next step.', prompt: 'Why this role next?', color: 'emerald', emoji: '🚀', example: '"So that\'s why this account executive role makes sense — I want that client relationship work to be the whole job, not a side responsibility."' },
    ],
    assembleHint: 'Notice how each part hands off to the next — there\'s a logic to why you\'re sitting there.',
    practiceCta: 'Say your story out loud',
    tagPrompt: 'How do you want to come across? Pick at least 4.',
    tags: ['builder', 'communicator', 'problem-solver', 'learner', 'leader', 'executor', 'mentor', 'strategist', 'generalist', 'specialist', 'connector', 'finisher', 'operator', 'researcher', 'creative', 'analyst', 'organizer', 'fixer', 'storyteller', 'systems-thinker'],
  },
  career_alignment: {
    framework: 'Observation · Fit · Timing',
    whyTitle: '"Why this role" reveals if you actually looked.',
    whyBody: 'Generic answers ("I love your mission!") sound the same as every other candidate. Observation-Fit-Timing proves you read the JD, know what you bring, and chose this on purpose.',
    whenItHits: 'Use it for "why this role", "why this company", "why are you interested", or anything probing intent.',
    steps: [
      { key: 'observation', label: 'Observation', description: 'One specific thing about the role/team that stood out.', prompt: 'What did you notice?', color: 'amber', emoji: '🔍', example: '"What stood out to me is how central this role is to managing the full client relationship — from discovery through reporting."' },
      { key: 'fit', label: 'Fit', description: 'A concrete piece of your experience that maps to it.', prompt: 'How does it match you?', color: 'violet', emoji: '🧩', example: '"That fits well with my background, because I\'ve spent the last two years owning the full customer lifecycle at TouchPoint."' },
      { key: 'timing', label: 'Timing', description: 'Why now makes sense in your arc.', prompt: 'Why now?', color: 'emerald', emoji: '⏱️', example: '"The timing makes sense because I\'m looking for a role where that client work is more central to what I do."' },
    ],
    assembleHint: 'Lead with the role, then yourself, then timing. The order signals you put their need first.',
    practiceCta: 'Try the full answer out loud',
    tagPrompt: 'What\'s actually drawing you to this work? Pick at least 4.',
    tags: ['autonomy', 'mission', 'growth', 'ownership', 'impact', 'scale', 'craft', 'team', 'learning', 'customer-focus', 'ambiguity', 'recognition', 'stability', 'pace', 'visibility', 'mentorship', 'product-quality', 'company-stage', 'industry', 'leadership-style'],
  },
  handling_uncertainty: {
    framework: 'Recovery · Answer · Reason · Example',
    whyTitle: 'Pausing is fine. Rambling is not.',
    whyBody: 'When a question catches you off guard, most people fill the silence with filler and accidentally bluff. A clean pause + a structured answer signals composure.',
    whenItHits: 'Use it when you\'re thrown by a question, when you don\'t know the perfect answer, or when you feel yourself starting to ramble.',
    steps: [
      { key: 'recovery', label: 'Recovery', description: 'A calm 1-sentence opener that buys you a second without sounding panicked.', prompt: 'How do you steady yourself?', color: 'sky', emoji: '🌬️', example: '"That\'s a good question — let me think about that for a second."' },
      { key: 'answer', label: 'Answer', description: 'A direct position or judgment, one sentence.', prompt: 'What\'s the answer?', color: 'violet', emoji: '🎯', example: '"One area I\'m still developing is getting faster at making decisions when the path isn\'t fully clear."' },
      { key: 'reason', label: 'Reason', description: 'One sentence explaining why that answer holds up.', prompt: 'Why does it hold up?', color: 'amber', emoji: '💭', example: '"I\'ve improved a lot, but I still push myself to get to a clear call faster instead of over-processing."' },
      { key: 'example', label: 'Example', description: 'A real moment from your work that backs it up.', prompt: 'What backs it up?', color: 'emerald', emoji: '📌', example: '"For example, in one role I had to reset a project plan with incomplete information, and I learned that clarifying the key decision first was more useful than waiting for perfect certainty."' },
    ],
    assembleHint: 'Notice the structure shows composure — even if you don\'t have a perfect answer, you sound steady.',
    practiceCta: 'Practice the recovery out loud',
    tagPrompt: 'How do you want to come across under pressure? Pick at least 4.',
    tags: ['composed', 'honest', 'curious', 'thoughtful', 'decisive', 'humble', 'grounded', 'confident', 'direct', 'reflective', 'candid', 'level-headed', 'self-aware', 'measured', 'open', 'principled', 'pragmatic', 'inquisitive', 'steady', 'sincere'],
  },
  pace_delivery: {
    framework: 'Opener · Main Point · Landing',
    whyTitle: 'Your content was fine. Your delivery buried it.',
    whyBody: 'When you bury the main point under filler or trail off at the end, interviewers literally remember less of what you said. Tightening the shape — not the substance — makes you sound senior.',
    whenItHits: 'Use it any time you catch yourself saying "um", "like", "kind of", or rambling toward an answer instead of leading with it.',
    steps: [
      { key: 'opener', label: 'Opener', description: 'Lead with the main point in one declarative sentence. No "so", no "um", no warmup.', prompt: 'What\'s the headline?', color: 'violet', emoji: '🎤', example: '"The biggest thing I bring is the ability to keep three workstreams moving without letting any one of them stall."' },
      { key: 'main_point', label: 'Main Body', description: '2-3 sentences of clean support. Same content as before, no filler.', prompt: 'Add the supporting beats.', color: 'sky', emoji: '📣', example: '"I ran the cross-team tracker for our last launch, owned the daily standups, and flagged blockers before they became problems."' },
      { key: 'landing', label: 'Landing', description: 'Close cleanly. Don\'t trail off into "yeah, so, that\'s it".', prompt: 'How do you land it?', color: 'emerald', emoji: '🛬', example: '"That\'s the kind of coordination work I want to do more of — and it\'s exactly what this role calls for."' },
    ],
    assembleHint: 'Same facts you had before — but the listener can actually hold onto them now.',
    practiceCta: 'Say the tightened version',
    tagPrompt: 'What\'s your natural delivery? Pick at least 4.',
    tags: ['direct', 'warm', 'energetic', 'measured', 'precise', 'conversational', 'confident', 'dry', 'candid', 'structured', 'expressive', 'deliberate', 'enthusiastic', 'thoughtful', 'crisp', 'animated', 'calm', 'punchy', 'narrative', 'concise'],
  },
  preparation_curiosity: {
    framework: 'What You Know · What Stood Out · Your Question',
    whyTitle: '"Any questions for us?" is a test you can ace.',
    whyBody: 'A generic question ("what\'s the culture like?") tells the interviewer you didn\'t prepare. A specific one — built from real research — signals you\'re already thinking like an employee.',
    whenItHits: 'Use it for "what do you know about us", "any questions for us", or any moment when you can show you did the homework.',
    steps: [
      { key: 'what_you_know', label: 'What You Know', description: 'One real specific from the JD or company — not "I love your mission".', prompt: 'What\'s the real specific?', color: 'sky', emoji: '📚', example: '"I saw that this role owns the full territory for Senior Living communities — from prospecting through account management."' },
      { key: 'what_stood_out', label: 'What Stood Out', description: 'Why that one detail caught your attention.', prompt: 'Why did it catch you?', color: 'amber', emoji: '✨', example: '"What caught my attention was that it\'s a defined customer segment — not a generic sales territory."' },
      { key: 'your_question', label: 'Your Question', description: 'A question that follows naturally from the above — not a generic culture question.', prompt: 'What do you want to ask?', color: 'violet', emoji: '❓', example: '"So I\'m curious — what does the ramp look like for learning the Senior Living space? Is there a structured onboarding for the industry side?"' },
    ],
    assembleHint: 'A question built from real research lands completely differently than a generic one.',
    practiceCta: 'Say the question out loud',
    tagPrompt: 'What about this company actually hooked you? Pick at least 4.',
    tags: ['vision', 'team', 'product', 'scale', 'recent-direction', 'technical-depth', 'customer-focus', 'mission', 'founders', 'growth', 'market', 'craft', 'culture', 'engineering-bar', 'design-quality', 'business-model', 'industry-position', 'leadership', 'velocity', 'ambition'],
  },
  role_depth: {
    framework: 'Context · Method · Tradeoff · Outcome',
    whyTitle: 'The hiring manager wants to see you think in the role.',
    whyBody: 'Surface-level answers sound like you read about it. A hiring manager wants to hear how you actually think through the real work: the methods you choose, the tradeoffs you weigh, and what happened because of your decisions.',
    whenItHits: 'Use it when asked about your approach, your process, how you\'d handle a scenario, or anything where the interviewer is testing domain depth — not just "tell me about a time".',
    steps: [
      { key: 'context', label: 'Context', description: 'Name the real situation — what you were working on, what the constraints were, and why it mattered.', prompt: 'Set the real context.', color: 'sky', emoji: '🔬', example: '"At TouchPoint, we had a client who needed a full website redesign but the original project scope had gotten completely mixed up."' },
      { key: 'method', label: 'Method', description: 'What approach did you choose and why? Name the specific tools, frameworks, or thinking you applied.', prompt: 'What was your method?', color: 'violet', emoji: '🛠️', example: '"So I went with absorbing the cost on our end and rebuilding the site from scratch — because the client relationship was worth more than the short-term hit."' },
      { key: 'tradeoff', label: 'Tradeoff', description: 'What did you weigh? What did you decide against and why?', prompt: 'What did you trade off?', color: 'amber', emoji: '⚖️', example: '"The main tradeoff was eating the margin vs. losing the client — I chose to eat it because one referral from them would cover the cost."' },
      { key: 'outcome', label: 'Outcome', description: 'What happened because of your approach? Be specific.', prompt: 'What was the result?', color: 'emerald', emoji: '📊', example: '"And it worked — their conversion rate went up about 15%, and they ended up referring two more clients to us."' },
    ],
    assembleHint: 'Notice how naming the tradeoff is what separates a working answer from a textbook answer.',
    practiceCta: 'Walk through it out loud',
    tagPrompt: 'How do you work in this domain? Pick at least 4.',
    tags: ['analytical', 'hands-on', 'systematic', 'data-driven', 'pragmatic', 'iterative', 'risk-aware', 'creative', 'process-minded', 'cross-functional', 'detail-oriented', 'big-picture', 'deadline-driven', 'quality-focused', 'experimental', 'structured', 'resourceful', 'evidence-based', 'collaborative', 'independent'],
    gatherQuestions: [
      { key: 'story_company', label: 'Where did this happen?', placeholder: 'e.g. TouchPoint, Sub-Zero, a freelance project', hint: 'Name the company or context.' },
      { key: 'story_problem', label: 'What was the real challenge or project?', placeholder: 'e.g. A client needed a full website redesign but the scope had gotten completely mixed up', hint: 'Name the specific project, challenge, or constraint — not your general job duties.', multiline: true },
      { key: 'story_method', label: 'What approach did you take and why?', placeholder: 'e.g. I absorbed the cost and rebuilt the site from scratch because the client relationship was worth more than the margin', hint: 'What did you decide to do, and what was your reasoning?', multiline: true },
      { key: 'story_result', label: 'What happened because of your approach?', placeholder: 'e.g. Their conversion rate went up 15% and they referred two more clients', hint: 'Specific outcome — numbers if you have them, real result if not.' },
    ],
  },
  problem_solving: {
    framework: 'Clarify · Approach · Execute · Reflect',
    whyTitle: 'Hiring managers test how you think, not what you know.',
    whyBody: 'When you jump straight to an answer, you skip the part that actually impresses hiring managers: your reasoning. Clarify-Approach-Execute-Reflect shows you can break down ambiguity, make deliberate choices, and learn from what happened.',
    whenItHits: 'Use it for scenario questions, "how would you handle..." questions, case-style questions, or any time the interviewer is probing your problem-solving process rather than a specific past event.',
    steps: [
      { key: 'clarify', label: 'Clarify', description: 'What did you need to understand first? What assumptions did you test or questions did you ask?', prompt: 'What did you clarify first?', color: 'sky', emoji: '🔎', example: '"First thing I needed to figure out was whether the issue was the scope, the timeline, or something on the client side — so I went back through the original agreement."' },
      { key: 'approach', label: 'Approach', description: 'What was your plan? Name the options you considered and why you picked this path.', prompt: 'What was your approach?', color: 'violet', emoji: '🧭', example: '"From there, I looked at pushing the deadline vs. absorbing the extra work — and went with absorbing it because keeping the client was the priority."' },
      { key: 'execute', label: 'Execute', description: 'What did you actually do? Concrete steps, not theory. Include who you worked with if relevant.', prompt: 'What did you do?', color: 'amber', emoji: '⚡', example: '"What I actually did was rebuild the deliverables myself over two weeks and set up daily check-ins with the client so they could see progress."' },
      { key: 'reflect', label: 'Reflect', description: 'What worked, what would you do differently, and what did you take away?', prompt: 'What would you change?', color: 'emerald', emoji: '💡', example: '"Looking back, the daily check-ins were the biggest win — they rebuilt trust faster than the finished product did."' },
    ],
    assembleHint: 'The "Clarify" step is what most people skip — it\'s also what makes you sound senior.',
    practiceCta: 'Walk through your reasoning out loud',
    tagPrompt: 'How do you approach problems? Pick at least 4.',
    tags: ['first-principles', 'collaborative', 'data-driven', 'iterative', 'risk-aware', 'stakeholder-focused', 'systematic', 'scrappy', 'creative', 'pragmatic', 'hypothesis-driven', 'customer-first', 'deadline-aware', 'thorough', 'decisive', 'inclusive', 'prioritization-focused', 'simplicity-driven', 'trade-off-aware', 'outcome-oriented'],
    gatherQuestions: [
      { key: 'story_company', label: 'Where did this happen?', placeholder: 'e.g. TouchPoint, Sub-Zero, a freelance project', hint: 'Name the company or context.' },
      { key: 'story_problem', label: 'What was the problem you had to solve?', placeholder: 'e.g. Two projects got their deliverables mixed up and the client was about to walk', hint: 'Name the actual problem — what was broken, unclear, or at risk?', multiline: true },
      { key: 'story_action', label: 'What did you actually do?', placeholder: 'e.g. I ate the cost, redesigned the whole website myself, and set up daily check-ins with the client', hint: 'Concrete steps you personally took — not what the team did generally.', multiline: true },
      { key: 'story_result', label: 'How did it turn out?', placeholder: 'e.g. They were happy, conversion went up 15%, and they referred two more clients', hint: 'What changed because of what you did?' },
    ],
  },
}

const MIN_TAGS = 4

const STEP_APPROACHES: Record<string, string[]> = {
  situation: ['Start with the most high-stakes moment', 'Set the scene with the team and the constraint', 'Lead with the timeline pressure'],
  task: ['Emphasize what was personally mine to own', 'Frame it as the gap no one else was filling', 'Focus on the specific deliverable'],
  action: ['Show the step-by-step moves I made', 'Highlight a judgment call I had to make', 'Focus on how I influenced others'],
  present: ['Lead with my current title and focus', 'Start with what I\'m known for right now', 'Open with the type of problems I solve'],
  past: ['Trace the thread from an early role', 'Name the skill that built over time', 'Pick the one experience that shaped me most'],
  future: ['Connect my arc to something specific in the JD', 'Name the natural next step for my growth', 'Show why this role is intentional, not random'],
  observation: ['Pull a detail from the JD that most people miss', 'Name something about the team structure', 'Reference a recent company move or decision'],
  fit: ['Map a specific past project to the observation', 'Show I already solve this kind of problem', 'Name the overlap between my background and the role'],
  timing: ['Explain the career momentum that points here', 'Show why now is different from a year ago', 'Connect a recent learning to the role\'s needs'],
  answer: ['Give a direct position in one sentence', 'Start with a clear "yes" or "no" then explain', 'State a principle I\'d follow'],
  reason: ['Ground it in past experience', 'Explain the logic behind the position', 'Name what I\'ve seen go wrong the other way'],
  example: ['Pull from my most recent role', 'Use the story with the clearest outcome', 'Pick the one closest to the interviewer\'s question'],
  opener: ['Lead with the single strongest point', 'Start with a confident declarative sentence', 'Open with the result, then explain how'],
  main_point: ['Keep it to two clean supporting beats', 'Stack facts without editorializing', 'Use short sentences, no filler'],
  what_you_know: ['Cite a detail from the JD', 'Name a recent company move', 'Reference the team\'s specific focus area'],
  what_stood_out: ['Connect it to my own experience', 'Explain why it felt different from other companies', 'Name what signals quality to me'],
  your_question: ['Ask about how the team works day-to-day', 'Ask about what success looks like in 6 months', 'Ask about the biggest challenge they\'re solving'],
  context: ['Name the project and the real constraint', 'Describe the business problem we were solving', 'Set up the stakes and who depended on it'],
  method: ['Name the specific tools or frameworks I used', 'Explain why I picked this approach over alternatives', 'Describe my process step by step'],
  tradeoff: ['Name what I chose not to do and why', 'Explain the risk I accepted', 'Show the constraint that forced the decision'],
  clarify: ['Name the assumptions I tested first', 'List the questions I asked before acting', 'Describe the constraint I needed to understand'],
  approach: ['Explain the options I considered', 'Walk through my reasoning for picking this path', 'Name who I involved and why'],
  execute: ['Describe the concrete steps in order', 'Explain what I built or changed', 'Show how I coordinated with others'],
}

const STEP_APPROACH_QUESTION: Record<string, string> = {
  situation: 'How do you want to set the scene?',
  context: 'How do you want to set the scene?',
  present: 'How do you want to set the scene?',
  task: 'How do you frame your ownership?',
  action: 'What angle shows your work best?',
  execute: 'What angle shows your work best?',
  method: 'What angle shows your work best?',
  fit: 'What makes the connection?',
  timing: 'What makes the connection?',
  answer: 'What direction do you lean?',
  observation: 'What caught your eye?',
  what_you_know: 'What caught your eye?',
  what_stood_out: 'What felt different?',
  opener: 'How do you lead?',
  main_point: 'How do you lead?',
  past: 'What thread do you pull?',
  future: 'What thread do you pull?',
  approach: 'How do you frame your thinking?',
  clarify: 'How do you frame your thinking?',
  your_question: 'What do you want to know?',
  reason: 'What direction do you lean?',
  example: 'What direction do you lean?',
  tradeoff: 'How do you frame your thinking?',
}

function cleanInput(value: string) {
  return value.trim().replace(/\s+/g, ' ')
}

function summarize(text?: string, max = 180) {
  const cleaned = cleanInput(text || '')
  if (!cleaned) return ''
  if (cleaned.length <= max) return cleaned
  return cleaned.slice(0, max).trim() + '…'
}

function assembleAnswer(config: WorkshopConfig, choices: Record<string, string>) {
  return config.steps
    .map((step) => cleanInput(choices[step.key] || ''))
    .filter(Boolean)
    .join(' ')
}

function hashQuestion(question: string) {
  let h = 0
  for (let i = 0; i < question.length; i++) {
    h = (h << 5) - h + question.charCodeAt(i)
    h |= 0
  }
  return Math.abs(h).toString(36).slice(0, 8)
}

function scoreColor(score: number) {
  if (score >= 75) return 'text-emerald-700 bg-emerald-100'
  if (score >= 50) return 'text-amber-700 bg-amber-100'
  return 'text-rose-700 bg-rose-100'
}

interface SuggestResponse {
  suggestions: string[]
  hint: string
}

interface RecallResult {
  transcript: string
  scores: { coverage: number; structure: number; delivery: number }
  feedback: string
  kept: string[]
  dropped: string[]
}

export default function GuidedBuilderWorkshop({
  workshopType,
  sessionId,
  originalQuestion,
  originalAnswer,
  onComplete,
}: GuidedBuilderWorkshopProps) {
  const config = CONFIGS[workshopType]
  const [phase, setPhase] = useState<Phase>('intro')
  const [stepIndex, setStepIndex] = useState(0)
  const [choices, setChoices] = useState<Record<string, string>>({})
  const [selectedTags, setSelectedTags] = useState<string[]>([])
  const [suggestions, setSuggestions] = useState<string[]>([])
  const [hint, setHint] = useState<string>('')
  const [loadingSuggestions, setLoadingSuggestions] = useState(false)
  const [refreshKey, setRefreshKey] = useState(0)
  const [showAllSuggestions, setShowAllSuggestions] = useState(false)
  const [flippedMethodSteps, setFlippedMethodSteps] = useState<Set<number>>(new Set())
  const [revealedSteps, setRevealedSteps] = useState<Set<string>>(new Set())
  const [stepApproachPicked, setStepApproachPicked] = useState<Record<string, string>>({})
  const [gatherAnswers, setGatherAnswers] = useState<Record<string, string>>({})

  const hasGather = !!config.gatherQuestions && config.gatherQuestions.length > 0
  const gatherComplete = hasGather && config.gatherQuestions!.every((q) => (gatherAnswers[q.key] || '').trim().length > 0)

  // Recall phase state
  const [recallStage, setRecallStage] = useState<'reading' | 'memorizing' | 'recording' | 'submitting' | 'result'>('reading')
  const [recording, setRecording] = useState(false)
  const [recallResult, setRecallResult] = useState<RecallResult | null>(null)
  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const audioChunksRef = useRef<Blob[]>([])

  const questionLabel = useMemo(
    () => originalQuestion?.trim() || 'Practice this answer pattern.',
    [originalQuestion]
  )
  const answerSummary = useMemo(() => summarize(originalAnswer, 220), [originalAnswer])
  const activeStep = config.steps[stepIndex]
  const finalAnswer = useMemo(() => assembleAnswer(config, choices), [config, choices])

  // Fetch suggestions
  useEffect(() => {
    if (phase !== 'build' || !activeStep) return
    let cancelled = false

    async function load() {
      setLoadingSuggestions(true)
      setSuggestions([])
      setHint('')
      try {
        const response = await fetch('/api/interview/guided-workshop', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            workshopType,
            sessionId,
            originalQuestion,
            originalAnswer,
            stepKey: activeStep.key,
            previousChoices: choices,
            tags: selectedTags,
            ...(hasGather && Object.keys(gatherAnswers).length > 0 ? { storyContext: gatherAnswers } : {}),
            ...(PORTFOLIO_DEMO_MODE ? getDemoContextPayload() : {}),
          }),
        })
        if (!response.ok) throw new Error('suggest_failed')
        const data = (await response.json()) as SuggestResponse
        if (cancelled) return
        setSuggestions(data.suggestions || [])
        setHint(data.hint || '')
      } catch {
        if (cancelled) return
        setSuggestions([])
        setHint('')
      } finally {
        if (!cancelled) setLoadingSuggestions(false)
      }
    }

    load()
    return () => {
      cancelled = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase, stepIndex, refreshKey])

  // Animated assemble reveal
  useEffect(() => {
    if (phase !== 'assemble') return
    setRevealedSteps(new Set())
    const filledSteps = config.steps.filter((step) => choices[step.key])
    filledSteps.forEach((step, i) => {
      window.setTimeout(() => {
        setRevealedSteps((prev) => new Set(prev).add(step.key))
      }, 300 + i * 500)
    })
  }, [phase, choices, config.steps])

  // Save to practice memory after recall completes (fire-and-forget)
  const saveToProfile = useCallback(
    (transcript: string, scores: RecallResult['scores'] | null) => {
      if (PORTFOLIO_DEMO_MODE) return
      const questionHash = hashQuestion(questionLabel)
      const key = `${workshopType}:${questionHash}`
      const value = finalAnswer
      const meta = {
        workshop_type: workshopType,
        original_question: questionLabel,
        original_answer: originalAnswer || '',
        chosen_tags: selectedTags,
        choices,
        gather_answers: hasGather ? gatherAnswers : undefined,
        transcript,
        scores,
        session_id: sessionId || null,
        timestamp: new Date().toISOString(),
      }
      fetch('/api/profile/practice-memory', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ key, value, meta }),
      }).catch(() => {
        // best-effort
      })
    },
    [workshopType, questionLabel, finalAnswer, originalAnswer, selectedTags, choices, sessionId]
  )

  function pickSuggestion(text: string) {
    setChoices((prev) => ({ ...prev, [activeStep.key]: cleanInput(text) }))
    advanceStep()
  }

  function advanceStep() {
    setShowAllSuggestions(false)
    if (stepIndex + 1 >= config.steps.length) {
      setPhase('assemble')
      setStepIndex(0)
    } else {
      setStepIndex((prev) => prev + 1)
    }
  }

  function flipMethodStep(i: number) {
    setFlippedMethodSteps((prev) => {
      const next = new Set(prev)
      next.add(i)
      return next
    })
  }

  function toggleTag(tag: string) {
    setSelectedTags((prev) => (prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]))
  }

  const allMethodFlipped = flippedMethodSteps.size >= config.steps.length
  const enoughTags = selectedTags.length >= MIN_TAGS

  // Recall: start recording
  const startRecording = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      const mr = new MediaRecorder(stream, { mimeType: 'audio/webm' })
      mediaRecorderRef.current = mr
      audioChunksRef.current = []
      mr.ondataavailable = (e) => {
        if (e.data.size > 0) audioChunksRef.current.push(e.data)
      }
      mr.onstop = async () => {
        stream.getTracks().forEach((t) => t.stop())
        const blob = new Blob(audioChunksRef.current, { type: 'audio/webm' })
        await submitRecall(blob)
      }
      mr.start()
      setRecording(true)
      setRecallStage('recording')
    } catch {
      alert('Microphone access is required for the voice test.')
    }
  }, [])

  const stopRecording = useCallback(() => {
    if (mediaRecorderRef.current?.state === 'recording') {
      mediaRecorderRef.current.stop()
      setRecording(false)
      setRecallStage('submitting')
    }
  }, [])

  const submitRecall = useCallback(
    async (blob: Blob) => {
      try {
        const fd = new FormData()
        fd.append('audio', blob, 'recall.webm')
        fd.append('built_answer', finalAnswer)
        fd.append('workshop_type', workshopType)
        fd.append('session_id', sessionId || '')
        if (PORTFOLIO_DEMO_MODE) fd.append('demo_mode', 'true')
        const res = await fetch('/api/interview/guided-workshop/voice-eval', { method: 'POST', body: fd })
        const data = (await res.json()) as RecallResult
        setRecallResult(data)
        saveToProfile(data.transcript || '', data.scores || null)
      } catch {
        const fallback: RecallResult = {
          transcript: '',
          scores: { coverage: 0, structure: 0, delivery: 0 },
          feedback: 'Could not score that attempt — but you said it out loud, which is the part that matters.',
          kept: [],
          dropped: [],
        }
        setRecallResult(fallback)
        saveToProfile('', null)
      } finally {
        setRecallStage('result')
      }
    },
    [finalAnswer, workshopType, saveToProfile]
  )

  function retryRecall() {
    setRecallResult(null)
    setRecallStage('memorizing')
  }

  return (
    <div className="flex h-full flex-col overflow-hidden rounded-[28px] border border-slate-200 bg-white">
      {/* INTRO */}
      {phase === 'intro' && (
        <div className="flex h-full flex-col">
          <div className="border-b border-slate-200 bg-gradient-to-br from-violet-50 via-white to-sky-50 px-5 py-4">
            <div className="flex items-center gap-2">
              <span className="rounded-full bg-violet-100 px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.16em] text-violet-700">
                Why this matters
              </span>
              <span className="rounded-full bg-slate-100 px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.14em] text-slate-600">
                {config.framework}
              </span>
            </div>
            <h2 className="mt-3 text-xl font-extrabold leading-tight text-slate-900">{config.whyTitle}</h2>
          </div>

          <div className="min-h-0 flex-1 overflow-y-auto px-5 py-5">
            <div className="space-y-4">
              <div className="rounded-2xl border border-violet-100 bg-violet-50/60 px-4 py-4">
                <div className="flex items-start gap-3">
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-violet-500 text-white">
                    <Lightbulb className="h-4 w-4" />
                  </div>
                  <p className="text-sm leading-7 text-slate-800">{config.whyBody}</p>
                </div>
              </div>

              <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4">
                <div className="flex items-start gap-3">
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-slate-700 text-white">
                    <Target className="h-4 w-4" />
                  </div>
                  <div>
                    <p className="text-[10px] font-black uppercase tracking-[0.16em] text-slate-500">When to use it</p>
                    <p className="mt-1 text-sm leading-6 text-slate-800">{config.whenItHits}</p>
                  </div>
                </div>
              </div>

              {answerSummary && (
                <div className="rounded-2xl border border-rose-100 bg-rose-50/50 px-4 py-4">
                  <p className="text-[10px] font-black uppercase tracking-[0.16em] text-rose-600">
                    What you said in the interview
                  </p>
                  {originalQuestion && (
                    <p className="mt-1 text-[11px] font-bold leading-5 text-rose-800">
                      Q: {originalQuestion}
                    </p>
                  )}
                  <p className="mt-2 text-sm italic leading-6 text-rose-900">&ldquo;{answerSummary}&rdquo;</p>
                  <p className="mt-3 text-xs font-bold text-rose-700">
                    We&apos;re going to rebuild this together using the experience in the interview context.
                  </p>
                </div>
              )}
            </div>
          </div>

          <div className="shrink-0 border-t border-slate-200 px-5 py-3">
            <button
              onClick={() => setPhase('method')}
              className="btn-coach-primary flex w-full items-center justify-center gap-2 py-3 text-sm font-bold"
            >
              See the method
              <ArrowRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}

      {/* METHOD - flip cards with progressive unlock */}
      {phase === 'method' && (
        <div className="flex h-full flex-col">
          <div className="border-b border-slate-200 bg-gradient-to-br from-sky-50 via-white to-violet-50 px-5 py-4">
            <span className="rounded-full bg-sky-100 px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.16em] text-sky-700">
              The Method
            </span>
            <h2 className="mt-2 text-xl font-extrabold leading-tight text-slate-900">{config.framework}</h2>
            <p className="mt-1 text-xs font-bold text-slate-500">
              Flip each card in order to unlock the next.
            </p>
          </div>

          <div className="min-h-0 flex-1 overflow-y-auto px-5 py-5">
            <div className="space-y-3">
              {config.steps.map((step, i) => {
                const colors = COLOR_MAP[step.color]
                const flipped = flippedMethodSteps.has(i)
                const previousFlipped = i === 0 || flippedMethodSteps.has(i - 1)
                const isNext = !flipped && previousFlipped
                const locked = !flipped && !previousFlipped

                return (
                  <div
                    key={step.key}
                    className={`flip-card relative ${flipped ? 'flipped' : ''}`}
                    style={{ height: step.example ? '130px' : '92px' }}
                  >
                    <div className="flip-card-inner">
                      {/* FRONT - face down */}
                      <button
                        type="button"
                        onClick={() => isNext && flipMethodStep(i)}
                        disabled={!isNext}
                        className={`flip-card-face w-full rounded-2xl border-2 px-4 py-3 text-left transition ${
                          locked
                            ? 'border-slate-200 bg-slate-100 opacity-50 cursor-not-allowed'
                            : `border-dashed ${colors.border} ${colors.soft} ${isNext ? 'animate-wiggle cursor-pointer hover:shadow-md' : ''}`
                        }`}
                      >
                        <div className="flex h-full items-center gap-3">
                          <div
                            className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-xl text-xl ${
                              locked ? 'bg-slate-200 text-slate-400' : `${colors.bg} text-white`
                            }`}
                          >
                            {locked ? <Lock className="h-5 w-5" /> : i + 1}
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className={`text-sm font-extrabold ${locked ? 'text-slate-400' : colors.text}`}>
                              Step {i + 1}
                            </p>
                            <p className={`text-xs font-bold ${locked ? 'text-slate-400' : 'text-slate-600'}`}>
                              {locked ? 'Flip the previous card first' : 'Tap to flip'}
                            </p>
                          </div>
                        </div>
                      </button>

                      {/* BACK - description */}
                      <div className={`flip-card-face flip-card-back w-full rounded-2xl border-2 ${colors.border} ${colors.soft} px-4 py-3 shadow-sm`}>
                        <div className="flex h-full items-start gap-3">
                          <div className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-xl ${colors.bg} text-xl text-white`}>
                            {step.emoji}
                          </div>
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center justify-between gap-2">
                              <p className={`text-sm font-extrabold ${colors.text}`}>{step.label}</p>
                              <Check className={`h-4 w-4 ${colors.text}`} />
                            </div>
                            <p className="mt-0.5 text-xs leading-5 text-slate-700">{step.description}</p>
                            {step.example && (
                              <p className="mt-1 text-[11px] italic leading-5 text-slate-500">{step.example}</p>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>

            <p className="mt-4 text-center text-[11px] font-bold uppercase tracking-[0.16em] text-slate-400">
              {flippedMethodSteps.size}/{config.steps.length} flipped
            </p>
          </div>

          <div className="shrink-0 border-t border-slate-200 px-5 py-3">
            <button
              onClick={() => setPhase('tags')}
              disabled={!allMethodFlipped}
              className="btn-coach-primary flex w-full items-center justify-center gap-2 py-3 text-sm font-bold disabled:opacity-50"
            >
              {allMethodFlipped ? "Now let's use it" : 'Flip every card to continue'}
              <ArrowRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}

      {/* TAGS - voice/approach picker */}
      {phase === 'tags' && (
        <div className="flex h-full flex-col">
          <div className="border-b border-slate-200 bg-gradient-to-br from-amber-50 via-white to-violet-50 px-5 py-4">
            <span className="rounded-full bg-amber-100 px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.16em] text-amber-700">
              Your voice
            </span>
            <h2 className="mt-2 text-xl font-extrabold leading-tight text-slate-900">{config.tagPrompt}</h2>
            <p className="mt-1 text-xs font-bold text-slate-500">
              We&apos;ll use these to shape the suggestions you see next.
            </p>
          </div>

          <div className="min-h-0 flex-1 overflow-y-auto px-5 py-5">
            <div className="flex flex-wrap gap-2">
              {config.tags.map((tag) => {
                const selected = selectedTags.includes(tag)
                return (
                  <button
                    key={tag}
                    type="button"
                    onClick={() => toggleTag(tag)}
                    className={`rounded-full border-2 px-3.5 py-1.5 text-sm font-bold transition active:scale-95 ${
                      selected
                        ? 'border-violet-400 bg-violet-500 text-white shadow-sm'
                        : 'border-slate-200 bg-white text-slate-700 hover:border-violet-300 hover:bg-violet-50'
                    }`}
                  >
                    {selected && <Check className="mr-1 -ml-1 inline h-3.5 w-3.5" />}
                    {tag}
                  </button>
                )
              })}
            </div>

            <div className="mt-6 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
              <div className="flex items-center justify-between">
                <p className="text-xs font-bold text-slate-700">
                  {selectedTags.length} picked · need at least {MIN_TAGS}
                </p>
                <div className="flex items-center gap-1">
                  {Array.from({ length: MIN_TAGS }).map((_, i) => (
                    <span
                      key={i}
                      className={`h-2 w-2 rounded-full ${
                        i < selectedTags.length ? 'bg-violet-500' : 'bg-slate-300'
                      }`}
                    />
                  ))}
                </div>
              </div>
            </div>
          </div>

          <div className="shrink-0 border-t border-slate-200 px-5 py-3">
            <button
              onClick={() => {
                if (hasGather) {
                  setPhase('gather')
                } else {
                  setPhase('build')
                  setStepIndex(0)
                }
              }}
              disabled={!enoughTags}
              className="btn-coach-primary flex w-full items-center justify-center gap-2 py-3 text-sm font-bold disabled:opacity-50"
            >
              {enoughTags ? (hasGather ? 'Tell us your story' : 'Start building') : `Pick ${MIN_TAGS - selectedTags.length} more`}
              <ArrowRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}

      {/* GATHER - qualifying story questions for behavioral workshops */}
      {phase === 'gather' && config.gatherQuestions && (
        <div className="flex h-full flex-col">
          <div className="border-b border-slate-200 bg-gradient-to-br from-sky-50 via-white to-violet-50 px-5 py-4">
            <span className="rounded-full bg-sky-100 px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.16em] text-sky-700">
              Your story
            </span>
            <h2 className="mt-2 text-xl font-extrabold leading-tight text-slate-900">
              Give us the real version.
            </h2>
            <p className="mt-1 text-xs leading-5 text-slate-500">
              We need the specifics to build an answer that sounds like you — not a job description.
              Short answers are fine. A sentence or two per question.
            </p>
          </div>

          <div className="min-h-0 flex-1 overflow-y-auto px-5 py-5">
            <div className="space-y-5">
              {config.gatherQuestions.map((q, i) => (
                <div key={q.key}>
                  <label className="block text-sm font-bold text-slate-800">
                    <span className="mr-2 inline-flex h-5 w-5 items-center justify-center rounded-full bg-violet-500 text-[10px] font-black text-white">
                      {i + 1}
                    </span>
                    {q.label}
                  </label>
                  <p className="mt-1 ml-7 text-[11px] leading-4 text-slate-500">{q.hint}</p>
                  {q.multiline ? (
                    <textarea
                      value={gatherAnswers[q.key] || ''}
                      onChange={(e) => setGatherAnswers((prev) => ({ ...prev, [q.key]: e.target.value }))}
                      placeholder={q.placeholder}
                      rows={3}
                      className="mt-2 ml-7 w-[calc(100%-1.75rem)] rounded-xl border-2 border-slate-200 bg-white px-3 py-2.5 text-sm leading-6 text-slate-800 placeholder:text-slate-400 focus:border-violet-400 focus:outline-none focus:ring-2 focus:ring-violet-200"
                    />
                  ) : (
                    <input
                      type="text"
                      value={gatherAnswers[q.key] || ''}
                      onChange={(e) => setGatherAnswers((prev) => ({ ...prev, [q.key]: e.target.value }))}
                      placeholder={q.placeholder}
                      className="mt-2 ml-7 w-[calc(100%-1.75rem)] rounded-xl border-2 border-slate-200 bg-white px-3 py-2.5 text-sm leading-6 text-slate-800 placeholder:text-slate-400 focus:border-violet-400 focus:outline-none focus:ring-2 focus:ring-violet-200"
                    />
                  )}
                </div>
              ))}
            </div>
          </div>

          <div className="shrink-0 border-t border-slate-200 px-5 py-3">
            <button
              onClick={() => {
                setPhase('build')
                setStepIndex(0)
              }}
              disabled={!gatherComplete}
              className="btn-coach-primary flex w-full items-center justify-center gap-2 py-3 text-sm font-bold disabled:opacity-50"
            >
              {gatherComplete ? 'Build the answer' : 'Fill in every question to continue'}
              <ArrowRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}

      {/* BUILD */}
      {phase === 'build' && activeStep && (
        <div className="flex h-full flex-col">
          {(() => {
            const colors = COLOR_MAP[activeStep.color]
            return (
              <>
                <div className={`border-b border-slate-200 ${colors.soft} px-5 py-4`}>
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <span className={`flex h-7 w-7 items-center justify-center rounded-full ${colors.bg} text-sm text-white`}>
                        {activeStep.emoji}
                      </span>
                      <div>
                        <p className={`text-[10px] font-black uppercase tracking-[0.14em] ${colors.text}`}>
                          Step {stepIndex + 1} of {config.steps.length}
                        </p>
                        <h3 className={`text-base font-extrabold ${colors.text}`}>{activeStep.label}</h3>
                      </div>
                    </div>
                    <div className="flex items-center gap-1">
                      {config.steps.map((s, i) => {
                        const sColors = COLOR_MAP[s.color]
                        const done = !!choices[s.key]
                        const current = i === stepIndex
                        return (
                          <span
                            key={s.key}
                            className={`h-1.5 rounded-full transition-all ${
                              done ? sColors.bg : current ? 'bg-slate-400 w-6' : 'bg-slate-200 w-3'
                            } ${done ? 'w-6' : ''}`}
                          />
                        )
                      })}
                    </div>
                  </div>
                  <p className="mt-2 text-xs leading-5 text-slate-700">{activeStep.description}</p>
                </div>

                <div className="min-h-0 flex-1 overflow-y-auto px-5 py-4">
                  {!stepApproachPicked[activeStep.key] && STEP_APPROACHES[activeStep.key] ? (
                    <div className="space-y-3">
                      <p className="text-[11px] font-black uppercase tracking-[0.16em] text-slate-500">
                        {STEP_APPROACH_QUESTION[activeStep.key] || "What's your instinct?"}
                      </p>
                      <p className="text-xs leading-5 text-slate-600">
                        Pick the approach that feels most natural. We&apos;ll shape your options around it.
                      </p>
                      <div className="space-y-2 pt-1">
                        {STEP_APPROACHES[activeStep.key].map((approach) => (
                          <button
                            key={approach}
                            type="button"
                            onClick={() => {
                              setStepApproachPicked((prev) => ({ ...prev, [activeStep.key]: approach }))
                            }}
                            className={`group w-full rounded-2xl border-2 border-slate-200 bg-white px-4 py-3 text-left transition hover:border-violet-300 hover:bg-violet-50 hover:shadow-md`}
                          >
                            <p className="text-sm font-bold leading-6 text-slate-800">{approach}</p>
                          </button>
                        ))}
                      </div>
                    </div>
                  ) : (
                  <>
                  {loadingSuggestions ? (
                    <div className="space-y-3">
                      <div className="animate-pulse rounded-2xl border border-slate-200 bg-slate-50 px-4 py-5">
                        <div className="h-3 w-full rounded bg-slate-200" />
                        <div className="mt-2 h-3 w-4/5 rounded bg-slate-200" />
                        <div className="mt-2 h-3 w-3/5 rounded bg-slate-200" />
                      </div>
                      <p className="text-center text-[11px] font-bold text-slate-500">
                        Building from your resume…
                      </p>
                    </div>
                  ) : suggestions.length > 0 && !showAllSuggestions ? (
                    <div className="space-y-3">
                      <p className="text-[11px] font-black uppercase tracking-[0.16em] text-slate-500">
                        Here&apos;s what that could sound like
                      </p>
                      <div className={`rounded-2xl border-2 ${colors.border} ${colors.soft} px-4 py-4`}>
                        <p className="text-sm leading-7 text-slate-800">{suggestions[0]}</p>
                      </div>

                      {hint && (
                        <div className="flex items-start gap-2 rounded-xl bg-amber-50 border border-amber-100 px-3 py-2">
                          <Sparkles className="mt-0.5 h-3.5 w-3.5 shrink-0 text-amber-700" />
                          <p className="text-xs leading-5 text-amber-900">{hint}</p>
                        </div>
                      )}

                      <button
                        onClick={() => pickSuggestion(suggestions[0])}
                        className={`group flex w-full items-center justify-center gap-2 rounded-xl ${colors.bg} px-5 py-3 text-sm font-bold text-white transition hover:opacity-90`}
                      >
                        Use this
                        <ArrowRight className="h-4 w-4 transition group-hover:translate-x-0.5" />
                      </button>
                      {suggestions.length > 1 && (
                        <button
                          onClick={() => setShowAllSuggestions(true)}
                          className="flex w-full items-center justify-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-xs font-bold text-slate-600 transition hover:bg-slate-50"
                        >
                          <RefreshCw className="h-3.5 w-3.5" />
                          Show me other options
                        </button>
                      )}
                    </div>
                  ) : suggestions.length > 0 && showAllSuggestions ? (
                    <div className="space-y-3">
                      <p className="text-[11px] font-black uppercase tracking-[0.16em] text-slate-500">
                        Pick the one that fits best
                      </p>
                      {suggestions.map((suggestion, i) => (
                        <button
                          key={`${refreshKey}-${i}`}
                          onClick={() => pickSuggestion(suggestion)}
                          className={`group w-full rounded-2xl border-2 border-slate-200 bg-white px-4 py-3 text-left transition hover:${colors.border} hover:${colors.soft} hover:shadow-md`}
                        >
                          <p className="text-sm leading-6 text-slate-800">{suggestion}</p>
                        </button>
                      ))}
                    </div>
                  ) : (
                    <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 px-4 py-6 text-center">
                      <p className="text-sm font-bold text-slate-600">No suggestions right now.</p>
                      <p className="mt-1 text-xs text-slate-500">Write your own below.</p>
                    </div>
                  )}
                  </>
                  )}
                </div>

                {Object.keys(choices).length > 0 && (
                  <div className="shrink-0 border-t border-slate-200 bg-slate-50 px-5 py-2">
                    <div className="flex items-center gap-1.5 overflow-x-auto">
                      <span className="shrink-0 text-[10px] font-black uppercase tracking-[0.14em] text-slate-500">
                        Built so far:
                      </span>
                      {config.steps.map((s, i) => {
                        if (!choices[s.key] || i >= stepIndex) return null
                        const sColors = COLOR_MAP[s.color]
                        return (
                          <span
                            key={s.key}
                            className={`shrink-0 rounded-full ${sColors.chip} px-2 py-0.5 text-[10px] font-bold`}
                          >
                            {s.emoji} {s.label}
                          </span>
                        )
                      })}
                    </div>
                  </div>
                )}
              </>
            )
          })()}
        </div>
      )}

      {/* ASSEMBLE */}
      {phase === 'assemble' && (
        <div className="flex h-full flex-col">
          <div className="border-b border-slate-200 bg-gradient-to-br from-emerald-50 via-white to-violet-50 px-5 py-4">
            <span className="rounded-full bg-emerald-100 px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.16em] text-emerald-700">
              Your answer
            </span>
            <h2 className="mt-2 text-xl font-extrabold leading-tight text-slate-900">
              Watch the pieces snap together.
            </h2>
          </div>

          <div className="min-h-0 flex-1 overflow-y-auto px-5 py-5">
            <div className="space-y-2">
              {config.steps.map((step) => {
                const value = choices[step.key]
                if (!value) return null
                const colors = COLOR_MAP[step.color]
                const revealed = revealedSteps.has(step.key)
                return (
                  <div
                    key={step.key}
                    className={`rounded-xl border-2 ${colors.border} ${colors.soft} px-3 py-2 transition-all duration-500 ${
                      revealed ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-2'
                    }`}
                  >
                    <div className="flex items-start gap-2">
                      <span className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-md ${colors.bg} text-xs text-white`}>
                        {step.emoji}
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className={`text-[10px] font-black uppercase tracking-[0.14em] ${colors.text}`}>{step.label}</p>
                        <p className="text-sm leading-6 text-slate-800">{value}</p>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>

          </div>

          <div className="shrink-0 border-t border-slate-200 px-5 py-3">
            <button
              onClick={() => {
                setPhase('recall')
                setRecallStage('reading')
              }}
              disabled={revealedSteps.size < config.steps.length}
              className="btn-coach-primary flex w-full items-center justify-center gap-2 py-3 text-sm font-bold disabled:opacity-50"
            >
              {revealedSteps.size < config.steps.length ? 'Assembling…' : config.practiceCta}
              <Mic className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}

      {/* RECALL - voice test */}
      {phase === 'recall' && (
        <div className="flex h-full flex-col">
          <div className="border-b border-slate-200 bg-gradient-to-br from-emerald-50 via-white to-emerald-50 px-5 py-4">
            <span className="rounded-full bg-emerald-100 px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.16em] text-emerald-700">
              Voice check
            </span>
            <h2 className="mt-2 text-xl font-extrabold leading-tight text-slate-900">
              {recallStage === 'reading' && 'Read it. Say it twice silently.'}
              {recallStage === 'memorizing' && 'Now say it from memory.'}
              {recallStage === 'recording' && 'Recording — speak your answer.'}
              {recallStage === 'submitting' && 'Scoring your attempt…'}
              {recallStage === 'result' && 'How that landed'}
            </h2>
          </div>

          <div className="min-h-0 flex-1 overflow-y-auto px-5 py-5">
            {/* READING */}
            {recallStage === 'reading' && (
              <>
                <div className="rounded-2xl border-2 border-emerald-300 bg-emerald-50 px-4 py-4">
                  <p className="text-[10px] font-black uppercase tracking-[0.16em] text-emerald-700">Your built answer</p>
                  <p className="mt-2 text-sm leading-7 text-slate-900">{finalAnswer}</p>
                </div>
                <div className="mt-4 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
                  <p className="text-xs leading-5 text-slate-700">
                    Say this out loud to yourself as many times as you need and try to remember the key beats —
                    not word-for-word. When you tap &ldquo;I&apos;m ready&rdquo;, we&apos;ll hide it and record
                    you so we can see how much stuck.
                  </p>
                  <p className="mt-2 text-xs font-bold text-emerald-700">
                    Don&apos;t worry — we&apos;ll save this answer to your profile either way.
                  </p>
                </div>
              </>
            )}

            {/* MEMORIZING - answer hidden, prep to record */}
            {recallStage === 'memorizing' && (
              <div className="flex h-full flex-col items-center justify-center text-center">
                <div className="rounded-2xl bg-slate-100 px-6 py-10">
                  <div className="text-4xl">🤫</div>
                  <p className="mt-3 text-sm font-bold text-slate-700">Answer hidden.</p>
                  <p className="mt-1 text-xs text-slate-500">When you tap the mic, say the answer from memory.</p>
                </div>
              </div>
            )}

            {/* RECORDING */}
            {recallStage === 'recording' && (
              <div className="flex h-full flex-col items-center justify-center text-center">
                <div className="relative">
                  <div className="flex h-32 w-32 items-center justify-center rounded-full bg-red-500 text-white animate-recording-pulse">
                    <Mic className="h-12 w-12" />
                  </div>
                </div>
                <p className="mt-6 text-sm font-bold text-red-700">Recording…</p>
                <p className="mt-1 text-xs text-slate-500">Speak naturally. Tap below when you&apos;re done.</p>
              </div>
            )}

            {/* SUBMITTING */}
            {recallStage === 'submitting' && (
              <div className="flex h-full flex-col items-center justify-center text-center">
                <div className="h-10 w-10 animate-spin rounded-full border-4 border-emerald-200 border-t-emerald-500" />
                <p className="mt-4 text-sm font-bold text-slate-700">Listening and scoring…</p>
                <p className="mt-1 text-xs text-slate-500">This takes about 5 seconds.</p>
              </div>
            )}

            {/* RESULT */}
            {recallStage === 'result' && recallResult && (
              <div className="space-y-3">
                <div className="grid grid-cols-3 gap-2">
                  {(['coverage', 'structure', 'delivery'] as const).map((dim) => {
                    const value = recallResult.scores[dim]
                    return (
                      <div key={dim} className={`rounded-xl px-3 py-3 text-center ${scoreColor(value)}`}>
                        <p className="text-2xl font-black">{value}</p>
                        <p className="text-[10px] font-black uppercase tracking-[0.14em]">{dim}</p>
                      </div>
                    )
                  })}
                </div>

                {recallResult.feedback && (
                  <div className="rounded-2xl border border-violet-200 bg-violet-50 px-4 py-3">
                    <div className="flex items-start gap-2">
                      <Zap className="mt-0.5 h-4 w-4 shrink-0 text-violet-700" />
                      <p className="text-xs leading-5 text-violet-900">{recallResult.feedback}</p>
                    </div>
                  </div>
                )}

                {recallResult.kept.length > 0 && (
                  <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3">
                    <p className="text-[10px] font-black uppercase tracking-[0.14em] text-emerald-700">You nailed</p>
                    <ul className="mt-1 space-y-1">
                      {recallResult.kept.map((item, i) => (
                        <li key={i} className="flex items-start gap-1.5 text-xs leading-5 text-emerald-900">
                          <Check className="mt-0.5 h-3 w-3 shrink-0" />
                          {item}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {recallResult.dropped.length > 0 && (
                  <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3">
                    <p className="text-[10px] font-black uppercase tracking-[0.14em] text-amber-700">Watch for</p>
                    <ul className="mt-1 space-y-1">
                      {recallResult.dropped.map((item, i) => (
                        <li key={i} className="text-xs leading-5 text-amber-900">
                          · {item}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {recallResult.transcript && (
                  <details className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-2">
                    <summary className="cursor-pointer text-[11px] font-bold uppercase tracking-[0.14em] text-slate-600">
                      What we heard
                    </summary>
                    <p className="mt-2 text-xs italic leading-5 text-slate-700">&ldquo;{recallResult.transcript}&rdquo;</p>
                  </details>
                )}
              </div>
            )}
          </div>

          <div className="shrink-0 border-t border-slate-200 px-5 py-3">
            {recallStage === 'reading' && (
              <button
                onClick={() => setRecallStage('memorizing')}
                className="btn-coach-primary flex w-full items-center justify-center gap-2 py-3 text-sm font-bold"
              >
                I&apos;m ready — hide it
                <ArrowRight className="h-4 w-4" />
              </button>
            )}
            {recallStage === 'memorizing' && (
              <button
                onClick={startRecording}
                className="flex w-full items-center justify-center gap-2 rounded-xl bg-red-500 py-3 text-sm font-bold text-white shadow-sm hover:bg-red-600"
              >
                <Mic className="h-4 w-4" />
                Tap to record
              </button>
            )}
            {recallStage === 'recording' && (
              <button
                onClick={stopRecording}
                className="flex w-full items-center justify-center gap-2 rounded-xl bg-slate-900 py-3 text-sm font-bold text-white shadow-sm hover:bg-slate-800"
              >
                <MicOff className="h-4 w-4" />
                Done
              </button>
            )}
            {recallStage === 'submitting' && (
              <button
                disabled
                className="flex w-full items-center justify-center gap-2 rounded-xl bg-slate-300 py-3 text-sm font-bold text-white"
              >
                Scoring…
              </button>
            )}
            {recallStage === 'result' && (
              <div className="flex items-center gap-2">
                <button
                  onClick={retryRecall}
                  className="flex flex-1 items-center justify-center gap-1.5 rounded-xl border border-slate-200 bg-white py-3 text-xs font-bold text-slate-700 hover:bg-slate-50"
                >
                  <RefreshCw className="h-3.5 w-3.5" />
                  Try again
                </button>
                <button
                  onClick={() => setPhase('done')}
                  className="btn-coach-primary flex flex-1 items-center justify-center gap-2 py-3 text-sm font-bold"
                >
                  Finish
                  <CheckCircle2 className="h-4 w-4" />
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* DONE */}
      {phase === 'done' && (
        <div className="flex h-full flex-col">
          <div className="border-b border-slate-200 bg-gradient-to-br from-emerald-50 via-white to-emerald-50 px-5 py-4">
            <span className="rounded-full bg-emerald-100 px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.16em] text-emerald-700">
              Saved
            </span>
            <h2 className="mt-2 text-xl font-extrabold leading-tight text-slate-900">
              Workshop locked in.
            </h2>
          </div>

          <div className="min-h-0 flex-1 overflow-y-auto px-5 py-5">
            <div className="rounded-2xl border-2 border-emerald-300 bg-emerald-50 px-4 py-4">
              <p className="text-[10px] font-black uppercase tracking-[0.16em] text-emerald-700">Your answer</p>
              <p className="mt-2 text-sm leading-7 text-slate-900">{finalAnswer}</p>
            </div>

            <div className="mt-4 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
              <div className="flex items-start gap-2">
                <Lightbulb className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" />
                <div>
                  <p className="text-xs font-extrabold text-slate-900">We&apos;ve saved this for you</p>
                  <p className="mt-1 text-xs leading-5 text-slate-700">
                    Your built answer and voice attempt are in your profile so you can revisit them before the
                    next round.
                  </p>
                </div>
              </div>
            </div>
          </div>

          <div className="shrink-0 border-t border-slate-200 px-5 py-3">
            <button
              onClick={onComplete}
              className="btn-coach-primary flex w-full items-center justify-center gap-2 py-3 text-sm font-bold"
            >
              Finish workshop
              <CheckCircle2 className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
