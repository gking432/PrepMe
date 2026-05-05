'use client'

import { useMemo, useState } from 'react'
import { ArrowRight, CheckCircle2 } from 'lucide-react'

type WorkshopPhase =
  | 'bridge'
  | 'bridge_conversational'
  | 'bridge_examples'
  | 'present_company'
  | 'present_title'
  | 'present_focus'
  | 'present_years'
  | 'present_choose'
  | 'present_bridge_words'
  | 'present_bridge_choose'
  | 'present_preview'
  | 'past_company'
  | 'past_title'
  | 'past_duties'
  | 'past_skills'
  | 'past_learning'
  | 'past_choose'
  | 'past_bridge_words'
  | 'past_bridge_choose'
  | 'past_preview'
  | 'future_area'
  | 'future_role'
  | 'future_wants'
  | 'future_choose'
  | 'future_bridge_choose'
  | 'future_preview'
  | 'practice'

interface WorkshopAnswers {
  presentCompany: string
  presentTitle: string
  presentFocus: string
  presentYears: string
  pastCompany: string
  pastTitle: string
  pastDuties: string
  pastSkills: string
  pastLearning: string
  futureArea: string
  futureRole: string
}

interface ProfessionalStoryWorkshopProps {
  onComplete: () => void
}

type PresentBridgeBucket = 'challenge' | 'pace' | 'teamwork' | 'structure' | 'reward' | 'variety'
type PastBridgeBucket = 'foundation' | 'clarity' | 'growth' | 'importance' | 'practical'
type FutureBridgeBucket = 'fit' | 'trajectory' | 'preference'
type LearningBucket = 'execution' | 'coordination' | 'pressure' | 'judgment'

interface PresentBridgeWord {
  label: string
  bucket: PresentBridgeBucket
  keptMe: string
  allowedTemplates: Array<'contrast' | 'mix' | 'effect' | 'growth' | 'blend'>
  compatibleBuckets: PresentBridgeBucket[]
  renderForms?: Partial<Record<'mix' | 'growth', string>>
}

interface PastBridgeWord {
  label: string
  bucket: PastBridgeBucket
}

interface FutureBridgeSignal {
  label: string
  bucket: FutureBridgeBucket
}

interface PresentBridgeTemplate {
  id: string
  template: 'contrast' | 'mix' | 'effect' | 'growth' | 'blend'
  requiredBuckets: PresentBridgeBucket[]
  preferredBuckets?: PresentBridgeBucket[]
  build: (context: {
    first: PresentBridgeWord
    second: PresentBridgeWord
    third?: PresentBridgeWord
    title: string
  }) => string
}

interface PastSentenceTemplate {
  id: string
  priority: number
  build: (context: {
    company: string
    title: string
    duties: string
    skills: string
  }) => string
}

interface PastBridgeTemplate {
  id: string
  requiredReflection: PastBridgeBucket[]
  preferredLearning: LearningBucket[]
  priority: number
  build: (context: {
    reflection: PastBridgeWord
    learning: string
  }) => string
}

interface FutureSentenceTemplate {
  id: string
  requiresWants?: boolean
  priority: number
  build: (context: {
    area: string
    role: string
    wantsText: string
  }) => string
}

const PRESENT_BRIDGE_WORDS: PresentBridgeWord[] = [
  { label: 'challenging', bucket: 'challenge', keptMe: 'sharp', allowedTemplates: ['contrast', 'effect', 'growth', 'blend'], compatibleBuckets: ['reward', 'teamwork', 'structure'], renderForms: { growth: 'challenging work' } },
  { label: 'demanding', bucket: 'challenge', keptMe: 'focused', allowedTemplates: ['contrast', 'effect', 'growth', 'blend'], compatibleBuckets: ['reward', 'structure'], renderForms: { growth: 'demanding work' } },
  { label: 'stretching', bucket: 'challenge', keptMe: 'growing', allowedTemplates: ['effect', 'growth', 'blend'], compatibleBuckets: ['reward', 'teamwork'], renderForms: { growth: 'stretching work' } },
  { label: 'complex', bucket: 'challenge', keptMe: 'thinking', allowedTemplates: ['mix', 'effect', 'growth'], compatibleBuckets: ['structure', 'teamwork'], renderForms: { mix: 'complex work' } },
  { label: 'fast-paced', bucket: 'pace', keptMe: 'engaged', allowedTemplates: ['contrast', 'mix', 'effect', 'blend'], compatibleBuckets: ['structure', 'teamwork', 'reward'], renderForms: { mix: 'fast-paced work' } },
  { label: 'dynamic', bucket: 'pace', keptMe: 'engaged', allowedTemplates: ['mix', 'effect', 'blend'], compatibleBuckets: ['teamwork', 'reward'], renderForms: { mix: 'dynamic work' } },
  { label: 'high-energy', bucket: 'pace', keptMe: 'energized', allowedTemplates: ['mix', 'contrast'], compatibleBuckets: ['teamwork', 'structure'], renderForms: { mix: 'high-energy work' } },
  { label: 'collaborative', bucket: 'teamwork', keptMe: 'connected', allowedTemplates: ['mix', 'effect', 'growth', 'blend'], compatibleBuckets: ['pace', 'reward', 'structure'], renderForms: { mix: 'a collaborative environment', growth: 'a collaborative environment' } },
  { label: 'cross-functional', bucket: 'teamwork', keptMe: 'adaptable', allowedTemplates: ['mix', 'effect', 'growth', 'blend'], compatibleBuckets: ['pace', 'challenge', 'structure'], renderForms: { mix: 'cross-functional work', growth: 'a cross-functional environment' } },
  { label: 'team-oriented', bucket: 'teamwork', keptMe: 'motivated', allowedTemplates: ['mix', 'growth', 'blend'], compatibleBuckets: ['pace', 'structure', 'challenge'], renderForms: { mix: 'a focus on teamwork', growth: 'a team-oriented workflow' } },
  { label: 'structured', bucket: 'structure', keptMe: 'organized', allowedTemplates: ['contrast', 'mix', 'growth', 'effect', 'blend'], compatibleBuckets: ['pace', 'challenge', 'teamwork'], renderForms: { mix: 'structured work', growth: 'structure' } },
  { label: 'analytical', bucket: 'structure', keptMe: 'thinking', allowedTemplates: ['mix', 'growth', 'effect', 'blend'], compatibleBuckets: ['challenge', 'teamwork'], renderForms: { mix: 'analytical work' } },
  { label: 'detail-heavy', bucket: 'structure', keptMe: 'focused', allowedTemplates: ['growth', 'effect', 'blend'], compatibleBuckets: ['pace', 'challenge'], renderForms: { growth: 'detail-heavy work' } },
  { label: 'fulfilling', bucket: 'reward', keptMe: 'motivated', allowedTemplates: ['contrast', 'effect', 'mix', 'blend'], compatibleBuckets: ['challenge', 'pace', 'teamwork'] },
  { label: 'rewarding', bucket: 'reward', keptMe: 'motivated', allowedTemplates: ['contrast', 'effect', 'mix', 'blend'], compatibleBuckets: ['challenge', 'pace', 'teamwork'] },
  { label: 'meaningful', bucket: 'reward', keptMe: 'motivated', allowedTemplates: ['effect', 'mix', 'blend'], compatibleBuckets: ['teamwork', 'challenge'] },
  { label: 'satisfying', bucket: 'reward', keptMe: 'energized', allowedTemplates: ['effect'], compatibleBuckets: ['structure', 'challenge'] },
  { label: 'interesting', bucket: 'variety', keptMe: 'interested', allowedTemplates: ['effect', 'mix', 'blend'], compatibleBuckets: ['pace', 'challenge'] },
  { label: 'varied', bucket: 'variety', keptMe: 'curious', allowedTemplates: ['effect', 'mix', 'blend'], compatibleBuckets: ['pace', 'teamwork'], renderForms: { mix: 'varied work' } },
  { label: 'energizing', bucket: 'variety', keptMe: 'energized', allowedTemplates: ['effect'], compatibleBuckets: ['pace', 'reward'] },
]

const PRESENT_BRIDGE_TEMPLATES: PresentBridgeTemplate[] = [
  { id: 'present-1', template: 'contrast', requiredBuckets: ['pace', 'structure'], build: ({ first, second }) => `It’s been ${first.label} but also ${second.label}, which has kept me ${second.keptMe}.` },
  { id: 'present-2', template: 'contrast', requiredBuckets: ['challenge', 'reward'], build: ({ first, second }) => `It’s been ${first.label} but also ${second.label}, which has kept me ${second.keptMe}.` },
  { id: 'present-3', template: 'effect', requiredBuckets: ['pace', 'reward'], build: ({ first, second }) => `It’s been ${first.label} and ${second.label}, which has kept me ${second.keptMe}.` },
  { id: 'present-4', template: 'effect', requiredBuckets: ['teamwork', 'reward'], build: ({ first, second }) => `It’s been ${first.label} and ${second.label}, which has kept me ${second.keptMe}.` },
  { id: 'present-5', template: 'mix', requiredBuckets: ['pace', 'teamwork'], build: ({ first, second, third }) => `The mix of ${renderPresentWord(first, 'mix')} and ${renderPresentWord(second, 'mix')} has made the role feel ${third?.label || 'rewarding'}.` },
  { id: 'present-6', template: 'mix', requiredBuckets: ['structure', 'teamwork'], build: ({ first, second, third }) => `The mix of ${renderPresentWord(first, 'mix')} and ${renderPresentWord(second, 'mix')} has made the work feel ${third?.label || 'meaningful'}.` },
  { id: 'present-7', template: 'growth', requiredBuckets: ['structure', 'teamwork'], build: ({ first, second, title }) => `That balance of ${renderPresentWord(first, 'growth')} and ${renderPresentWord(second, 'growth')} has helped me grow into a stronger ${title || 'professional'}.` },
  { id: 'present-8', template: 'growth', requiredBuckets: ['pace', 'structure'], build: ({ first, second, title }) => `That balance of ${renderPresentWord(first, 'growth')} and ${renderPresentWord(second, 'growth')} has helped me grow into a stronger ${title || 'professional'}.` },
  { id: 'present-9', template: 'blend', requiredBuckets: ['challenge', 'teamwork'], build: ({ first, second }) => `It’s been ${first.label} and very ${second.label}, which has kept me ${second.keptMe}.` },
  { id: 'present-10', template: 'blend', requiredBuckets: ['pace', 'variety'], build: ({ first, second }) => `It’s been ${first.label} and ${second.label}, which has kept me ${second.keptMe}.` },
  { id: 'present-11', template: 'effect', requiredBuckets: ['structure', 'challenge'], build: ({ first, second }) => `It’s been ${first.label} and ${second.label}, which has kept me ${first.keptMe}.` },
  { id: 'present-12', template: 'mix', requiredBuckets: ['challenge', 'teamwork'], build: ({ first, second, third }) => `The mix of ${renderPresentWord(first, 'mix')} and ${renderPresentWord(second, 'mix')} has made the work feel ${third?.label || 'rewarding'}.` },
]

const PAST_SENTENCE_TEMPLATES: PastSentenceTemplate[] = [
  { id: 'past-sentence-1', priority: 5, build: ({ company, title, duties }) => `Earlier in my career, ${company} played a big role in shaping me because that ${title} experience gave me exposure to ${duties}.` },
  { id: 'past-sentence-2', priority: 5, build: ({ company, title, skills }) => `A big part of what shaped me was my role at ${company}, where I built a foundation in ${skills}.` },
  { id: 'past-sentence-3', priority: 4, build: ({ company, title, duties }) => `My time at ${company} as ${withIndefiniteArticle(title)} helped me build a strong foundation through work that involved ${duties}.` },
  { id: 'past-sentence-4', priority: 4, build: ({ company, title, skills, duties }) => `One experience that really shaped me was ${company}, where I worked as ${withIndefiniteArticle(title)} and built strengths in ${skills} through ${duties}.` },
  { id: 'past-sentence-5', priority: 4, build: ({ company, title, skills }) => `Before that, my role at ${company} as ${withIndefiniteArticle(title)} helped me develop real strength in ${skills}.` },
  { id: 'past-sentence-6', priority: 3, build: ({ company, title, duties }) => `Before that, ${company} gave me early exposure to ${duties} in my ${title} role.` },
  { id: 'past-sentence-7', priority: 3, build: ({ company, title, skills, duties }) => `At ${company}, I learned a lot in my ${title} role, especially through work involving ${duties} and ${skills}.` },
  { id: 'past-sentence-8', priority: 3, build: ({ company, title, skills }) => `Earlier on, my time at ${company} as ${withIndefiniteArticle(title)} helped shape how I work by building ${skills}.` },
  { id: 'past-sentence-9', priority: 2, build: ({ company, title, duties }) => `A role that really helped shape my foundation was ${title} at ${company}, where I spent a lot of time ${duties}.` },
  { id: 'past-sentence-10', priority: 2, build: ({ company, title, skills, duties }) => `My experience at ${company} combined ${duties} with a foundation in ${skills}, which ended up shaping me a lot.` },
]

const PAST_BRIDGE_TEMPLATES: PastBridgeTemplate[] = [
  { id: 'past-bridge-1', requiredReflection: ['foundation', 'importance'], preferredLearning: ['execution', 'coordination'], priority: 5, build: ({ reflection, learning }) => `That experience was really ${reflection.label} for me because it made me better at ${learning}.` },
  { id: 'past-bridge-2', requiredReflection: ['clarity'], preferredLearning: ['pressure', 'judgment'], priority: 5, build: ({ reflection, learning }) => `Looking back, that period was especially ${reflection.label} because it showed me I do my best work when I’m ${learning}.` },
  { id: 'past-bridge-3', requiredReflection: ['growth'], preferredLearning: ['coordination', 'pressure'], priority: 4, build: ({ reflection, learning }) => `That experience ended up being really ${reflection.label} because it pushed me to get better at ${learning}.` },
  { id: 'past-bridge-4', requiredReflection: ['importance'], preferredLearning: ['judgment', 'coordination'], priority: 4, build: ({ reflection, learning }) => `That was a really ${reflection.label} part of my background because it gave me more confidence in ${learning}.` },
  { id: 'past-bridge-5', requiredReflection: ['practical'], preferredLearning: ['execution', 'coordination'], priority: 4, build: ({ reflection, learning }) => `That experience was especially ${reflection.label} because it taught me a lot about ${learning}.` },
  { id: 'past-bridge-6', requiredReflection: ['foundation', 'clarity'], preferredLearning: ['coordination', 'execution'], priority: 4, build: ({ reflection, learning }) => `I think that experience really shaped the direction of my career because it showed me how much I enjoy ${learning}.` },
  { id: 'past-bridge-7', requiredReflection: ['growth', 'clarity'], preferredLearning: ['pressure', 'execution'], priority: 3, build: ({ reflection, learning }) => `That period was more ${reflection.label} than I realized at the time because it taught me how to ${learning}.` },
  { id: 'past-bridge-8', requiredReflection: ['foundation', 'practical'], preferredLearning: ['execution', 'pressure'], priority: 3, build: ({ reflection, learning }) => `It was a really ${reflection.label} experience because it made me more comfortable with ${learning}.` },
  { id: 'past-bridge-9', requiredReflection: ['importance', 'clarity'], preferredLearning: ['judgment', 'pressure'], priority: 3, build: ({ reflection, learning }) => `Looking back, that was a really ${reflection.label} experience because it gave me a clearer sense of how I work best in ${learning}.` },
  { id: 'past-bridge-10', requiredReflection: ['foundation', 'growth'], preferredLearning: ['coordination', 'judgment'], priority: 3, build: ({ reflection, learning }) => `That experience was really ${reflection.label} for me because it built my confidence around ${learning}.` },
  { id: 'past-bridge-11', requiredReflection: ['clarity', 'importance'], preferredLearning: ['coordination', 'execution'], priority: 2, build: ({ reflection, learning }) => `That experience helped clarify what I wanted to keep building toward because it showed me how much I value ${learning}.` },
  { id: 'past-bridge-12', requiredReflection: ['growth', 'practical'], preferredLearning: ['pressure', 'coordination'], priority: 2, build: ({ reflection, learning }) => `That period ended up being really ${reflection.label} because it made me stronger at ${learning}.` },
]

const FUTURE_SENTENCE_TEMPLATES: FutureSentenceTemplate[] = [
  { id: 'future-1', priority: 5, build: ({ area }) => `Going forward, I want to keep building in ${area}.` },
  { id: 'future-2', priority: 5, build: ({ role, area }) => `The kind of role I’m aiming for next is ${withIndefiniteArticle(role)} role where I can go deeper into ${area}.` },
  { id: 'future-3', requiresWants: true, priority: 5, build: ({ role, area, wantsText }) => `Next, I’m looking for ${withIndefiniteArticle(role)} opportunity where I can keep building in ${area}, ideally with ${wantsText}.` },
  { id: 'future-4', requiresWants: true, priority: 4, build: ({ area, wantsText }) => `Going forward, I’d like to move deeper into ${area}, with things like ${wantsText}.` },
  { id: 'future-5', priority: 4, build: ({ role, area }) => `Next, I’m looking for ${withIndefiniteArticle(role)} opportunity that lets me keep growing in ${area}.` },
  { id: 'future-6', priority: 4, build: ({ role, area }) => `I’d like my next step to be ${withIndefiniteArticle(role)} role where I can spend more time in ${area}.` },
  { id: 'future-7', requiresWants: true, priority: 4, build: ({ role, wantsText }) => `The kind of opportunity I’m looking for next is ${withIndefiniteArticle(role)} role with ${wantsText}.` },
  { id: 'future-8', priority: 3, build: ({ area }) => `Longer term, I want to keep building toward work that goes deeper into ${area}.` },
  { id: 'future-9', requiresWants: true, priority: 3, build: ({ area, wantsText }) => `Next, I’m hoping to find a role that gives me ${wantsText} while keeping me close to ${area}.` },
  { id: 'future-10', priority: 3, build: ({ role, area }) => `I’m looking for a next step where I can keep moving toward ${withIndefiniteArticle(role)} path with more depth in ${area}.` },
]

const PAST_BRIDGE_WORDS: PastBridgeWord[] = [
  { label: 'foundational', bucket: 'foundation' },
  { label: 'formative', bucket: 'foundation' },
  { label: 'shaping', bucket: 'foundation' },
  { label: 'defining', bucket: 'foundation' },
  { label: 'clarifying', bucket: 'clarity' },
  { label: 'eye-opening', bucket: 'clarity' },
  { label: 'revealing', bucket: 'clarity' },
  { label: 'stretching', bucket: 'growth' },
  { label: 'confidence-building', bucket: 'growth' },
  { label: 'developmental', bucket: 'growth' },
  { label: 'important', bucket: 'importance' },
  { label: 'meaningful', bucket: 'importance' },
  { label: 'career-shaping', bucket: 'importance' },
  { label: 'practical', bucket: 'practical' },
  { label: 'hands-on', bucket: 'practical' },
  { label: 'grounding', bucket: 'practical' },
]

const FUTURE_WANTS = [
  'more ownership',
  'more hands-on work',
  'larger team',
  'smaller team',
  'more strategic work',
  'more client-facing work',
  'more cross-functional work',
  'clearer scope',
  'faster pace',
  'more depth in one area',
]

const FUTURE_BRIDGE_SIGNALS: FutureBridgeSignal[] = [
  { label: 'natural next step', bucket: 'trajectory' },
  { label: 'builds on my background', bucket: 'trajectory' },
  { label: 'right direction', bucket: 'trajectory' },
  { label: 'strong fit', bucket: 'fit' },
  { label: 'good match', bucket: 'fit' },
  { label: 'clear fit', bucket: 'fit' },
  { label: 'more ownership', bucket: 'preference' },
  { label: 'closer to the work I enjoy most', bucket: 'preference' },
]

const FUTURE_BRIDGE_OPTIONS = [
  'That’s a big part of why this feels like a natural next step for me.',
  'From the job description, this seems like it could be a strong fit.',
  'It feels closely aligned with the direction I want to keep building in.',
  'It also feels like a good match for the background I’ve already been developing.',
]

const EMPTY_ANSWERS: WorkshopAnswers = {
  presentCompany: '',
  presentTitle: '',
  presentFocus: '',
  presentYears: '',
  pastCompany: '',
  pastTitle: '',
  pastDuties: '',
  pastSkills: '',
  pastLearning: '',
  futureArea: '',
  futureRole: '',
}

const RESUME_ACTION_VERBS = new Set([
  'analyze',
  'build',
  'close',
  'collaborate',
  'communicate',
  'coordinate',
  'create',
  'define',
  'deliver',
  'develop',
  'drive',
  'execute',
  'handle',
  'identify',
  'improve',
  'lead',
  'maintain',
  'manage',
  'market',
  'monitor',
  'name',
  'organize',
  'oversee',
  'plan',
  'present',
  'prioritize',
  'research',
  'run',
  'sell',
  'set',
  'shape',
  'show',
  'solve',
  'source',
  'support',
  'track',
  'write',
])

function splitCommaList(value: string) {
  return value
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean)
}

function toGerund(phrase: string) {
  const trimmed = phrase.trim().toLowerCase()
  if (!trimmed) return ''
  const [first, ...rest] = trimmed.split(/\s+/)
  let gerund = first
  if (first === 'be') {
    gerund = 'being'
  } else if (first === 'set') {
    gerund = 'setting'
  } else if (first === 'get') {
    gerund = 'getting'
  } else if (first === 'let') {
    gerund = 'letting'
  } else if (first === 'put') {
    gerund = 'putting'
  } else if (first === 'run') {
    gerund = 'running'
  } else if (first.endsWith('ie')) {
    gerund = `${first.slice(0, -2)}ying`
  } else if (first.endsWith('e') && !first.endsWith('ee')) {
    gerund = `${first.slice(0, -1)}ing`
  } else if (
    first.length >= 3 &&
    !/[aeiou]/.test(first[first.length - 1]) &&
    /[aeiou]/.test(first[first.length - 2]) &&
    !/[aeiou]/.test(first[first.length - 3])
  ) {
    gerund = `${first}${first[first.length - 1]}ing`
  } else {
    gerund = `${first}ing`
  }
  return [gerund, ...rest].join(' ')
}

function isLikelyVerbPhrase(phrase: string) {
  const trimmed = phrase.trim().toLowerCase()
  if (!trimmed) return false
  const [first] = trimmed.split(/\s+/)
  return RESUME_ACTION_VERBS.has(first)
}

function joinList(items: string[]) {
  if (items.length === 0) return ''
  if (items.length === 1) return items[0]
  if (items.length === 2) return `${items[0]} and ${items[1]}`
  return `${items.slice(0, -1).join(', ')}, and ${items[items.length - 1]}`
}

function withIndefiniteArticle(value: string) {
  if (!value) return value
  const first = value.trim()[0]?.toLowerCase()
  const article = ['a', 'e', 'i', 'o', 'u'].includes(first) ? 'an' : 'a'
  return `${article} ${value}`
}

function formatDutiesForSpeech(value: string) {
  return joinList(
    splitCommaList(value).map((item) => {
      const normalized = item.trim().toLowerCase()
      return isLikelyVerbPhrase(normalized) ? toGerund(normalized) : normalized
    }),
  )
}

function formatSkills(value: string) {
  return joinList(splitCommaList(value).map((item) => item.toLowerCase()))
}

function formatLearning(value: string) {
  return joinList(splitCommaList(value).map((item) => item.toLowerCase()))
}

function normalizeConcept(phrase: string) {
  const normalized = phrase.toLowerCase()
  if (/(vendor|supplier|partner|relationship)/.test(normalized)) return 'relationship'
  if (/(team|stakeholder|meeting|cross-functional|across|coordina|align)/.test(normalized)) return 'coordination'
  if (/(project|priority|timeline|moving|execution|follow-through)/.test(normalized)) return 'execution'
  if (/(pressure|deadline|competing|shift|adapt|busy|pace)/.test(normalized)) return 'pressure'
  if (/(decision|judgment|tradeoff|problem|strategy|analy)/.test(normalized)) return 'judgment'
  return normalized.replace(/[^a-z0-9]+/g, ' ').trim()
}

function broadenLearningPhrase(phrase: string) {
  const normalized = phrase.toLowerCase()
  if (/(vendor|supplier|partner|relationship)/.test(normalized)) return 'relationship-driven work'
  if (/(team|stakeholder|meeting|cross-functional|across|coordina|align)/.test(normalized)) return 'keeping different people aligned'
  if (/(project|priority|timeline|moving|execution|follow-through)/.test(normalized)) return 'keeping a lot of moving parts on track'
  if (/(pressure|deadline|competing|shift|adapt|busy|pace)/.test(normalized)) return 'working well when priorities shift'
  if (/(decision|judgment|tradeoff|problem|strategy|analy)/.test(normalized)) return 'making sound decisions in complex situations'
  return normalized
}

function formatArea(value: string) {
  const trimmed = value.trim().toLowerCase()
  if (!trimmed) return ''
  return trimmed.includes('work') || trimmed.includes('management') ? trimmed : `${trimmed} work`
}

function uniqueStrings(items: string[]) {
  return Array.from(new Set(items))
}

function renderPastLearning(phrase: string, style: 'at' | 'to' | 'in' | 'value' = 'at') {
  const base = broadenLearningPhrase(phrase)
  if (style === 'to') {
    if (base.startsWith('working ')) return base.replace(/^working /, 'work ')
    if (base.startsWith('keeping ')) return base.replace(/^keeping /, 'keep ')
    if (base.startsWith('making ')) return base.replace(/^making /, 'make ')
    if (base.startsWith('staying ')) return base.replace(/^staying /, 'stay ')
    if (base.startsWith('communicating ')) return base.replace(/^communicating /, 'communicate ')
    if (base.startsWith('coordinating ')) return base.replace(/^coordinating /, 'coordinate ')
    if (base.startsWith('adapting ')) return base.replace(/^adapting /, 'adapt ')
    if (base.startsWith('solving ')) return base.replace(/^solving /, 'solve ')
    if (base.startsWith('following ')) return base.replace(/^following /, 'follow ')
    if (base.startsWith('thinking ')) return base.replace(/^thinking /, 'think ')
    return base
  }
  if (style === 'in') {
    if (base.startsWith('working well when')) return `situations where ${base.replace('working well when ', '')}`
    return base
  }
  if (style === 'value') {
    if (base.startsWith('keeping ')) return base.replace(/^keeping /, '')
    return base
  }
  return base
}

function formatWantPhrase(value: string) {
  const normalized = value.trim().toLowerCase()
  if (!normalized) return ''
  if (normalized.startsWith('more ')) return normalized
  if (normalized.startsWith('a ')) return normalized
  if (['smaller team', 'larger team', 'clearer scope', 'faster pace'].includes(normalized)) {
    return `a ${normalized}`
  }
  return normalized
}

function getLearningVariants(phrase: string) {
  const normalized = phrase.toLowerCase()
  if (/(pressure|deadline|competing|shift|adapt|busy|pace)/.test(normalized)) {
    return [
      'adapting when priorities changed quickly',
      'keeping things moving when timelines shifted',
      'staying steady when a lot was changing at once',
      'working through change without losing momentum',
    ]
  }
  if (/(team|stakeholder|meeting|cross-functional|across|coordina|align)/.test(normalized)) {
    return [
      'keeping different people aligned',
      'coordinating a lot of moving parts',
      'helping busy teams stay on the same page',
      'communicating clearly across different groups',
    ]
  }
  if (/(project|priority|timeline|moving|execution|follow-through)/.test(normalized)) {
    return [
      'keeping a lot of moving parts on track',
      'staying organized when several priorities were moving at once',
      'following through when details mattered',
      'keeping work moving without dropping the details',
    ]
  }
  if (/(decision|judgment|tradeoff|problem|strategy|analy)/.test(normalized)) {
    return [
      'making sound decisions in complex situations',
      'thinking clearly when tradeoffs were involved',
      'solving problems without losing momentum',
      'using good judgment when things were less straightforward',
    ]
  }
  return [broadenLearningPhrase(phrase)]
}

function joinBridgePair(first: PresentBridgeWord, second: PresentBridgeWord) {
  const contrastPairs: Array<[PresentBridgeBucket, PresentBridgeBucket]> = [
    ['pace', 'structure'],
    ['challenge', 'reward'],
    ['pace', 'reward'],
    ['challenge', 'structure'],
  ]

  const isContrast = contrastPairs.some(
    ([left, right]) =>
      (first.bucket === left && second.bucket === right) ||
      (first.bucket === right && second.bucket === left),
  )

  return isContrast
    ? `${first.label} but also ${second.label}`
    : `${first.label} and ${second.label}`
}

function renderPresentWord(word: PresentBridgeWord, template: 'mix' | 'growth') {
  return word.renderForms?.[template] || word.label
}

function areCompatiblePresentWords(
  first: PresentBridgeWord,
  second: PresentBridgeWord,
  template: 'contrast' | 'mix' | 'effect' | 'growth',
) {
  if (first.label === second.label) return false
  if (!first.allowedTemplates.includes(template) || !second.allowedTemplates.includes(template)) return false
  return first.compatibleBuckets.includes(second.bucket) || second.compatibleBuckets.includes(first.bucket)
}

function buildPresentOptions(answers: WorkshopAnswers) {
  const company = answers.presentCompany.trim()
  const title = answers.presentTitle.trim()
  const duties = formatDutiesForSpeech(answers.presentFocus)
  const years = answers.presentYears.trim()

  return [
    `Right now, most of my work is focused on ${duties}.`,
    `Right now, at ${company} I work as ${withIndefiniteArticle(title)}, where I’m mostly focused on ${duties}.`,
    `As ${withIndefiniteArticle(title)} at ${company}, a lot of my work centers on ${duties}.`,
    years
      ? `At ${company}, I’ve spent the last ${years} focused on ${duties}.`
      : `At ${company}, I’m mostly focused on ${duties} in my ${title} role.`,
  ]
}

function buildPastOptions(answers: WorkshopAnswers) {
  const company = answers.pastCompany.trim()
  const title = answers.pastTitle.trim()
  const duties = formatDutiesForSpeech(answers.pastDuties)
  const skills = formatSkills(answers.pastSkills)
  return PAST_SENTENCE_TEMPLATES
    .sort((a, b) => b.priority - a.priority)
    .slice(0, 4)
    .map((template) => template.build({ company, title, duties, skills }))
}

function buildFutureOptions(answers: WorkshopAnswers, wants: string[]) {
  const area = formatArea(answers.futureArea)
  const role = answers.futureRole.trim()
  const wantsText = wants.length > 0 ? joinList(wants.slice(0, 2).map(formatWantPhrase)) : ''
  return FUTURE_SENTENCE_TEMPLATES
    .filter((template) => !template.requiresWants || Boolean(wantsText))
    .sort((a, b) => b.priority - a.priority)
    .slice(0, 4)
    .map((template) => template.build({ area, role, wantsText }))
}

function rotateItems<T>(items: T[], seed: number) {
  if (items.length <= 1) return items
  const offset = seed % items.length
  const rotated = [...items.slice(offset), ...items.slice(0, offset)]
  return seed % 2 === 0 ? rotated : rotated.reverse()
}

function buildBridgeWordGroups(selected: string[], seed: number) {
  const ordered = rotateItems(selected, seed)
  const groups = [[], [], [], []] as string[][]

  ordered.forEach((word, index) => {
    groups[index % 4].push(word)
  })

  groups.forEach((group, index) => {
    if (group.length === 0 && ordered.length > 0) {
      group.push(ordered[index % ordered.length])
    }
  })

  return groups.map((group) => group.slice(0, 2))
}

function buildBridgeOptions(
  section: 'present' | 'past' | 'future',
  selected: string[],
  seed: number,
  roleLabel?: string,
  supportingDetail?: string,
) {
  if (section === 'present') {
    const presentWords = rotateItems(
      selected
      .map((label) => PRESENT_BRIDGE_WORDS.find((word) => word.label === label))
      .filter((word): word is PresentBridgeWord => Boolean(word)),
      seed,
    )
    const buckets = uniqueStrings(presentWords.map((word) => word.bucket)) as PresentBridgeBucket[]
    const globallyUsed = new Set<string>()

    const selectWord = (
      bucket: PresentBridgeBucket,
      template: PresentBridgeTemplate['template'],
      exclude: string[],
    ) =>
      presentWords.find(
        (word) =>
          word.bucket === bucket &&
          word.allowedTemplates.includes(template) &&
          !exclude.includes(word.label),
      )

    const selectRewardOrVariety = (exclude: string[]) =>
      presentWords.find(
        (word) =>
          ['reward', 'variety'].includes(word.bucket) &&
          word.allowedTemplates.includes('mix') &&
          !exclude.includes(word.label),
      )

    const scored = PRESENT_BRIDGE_TEMPLATES
      .map((template) => {
        const hasRequired = template.requiredBuckets.every((bucket) => buckets.includes(bucket))
        const coverage = template.requiredBuckets.filter((bucket) => buckets.includes(bucket)).length
        const preferred = (template.preferredBuckets || []).filter((bucket) => buckets.includes(bucket)).length
        return { template, hasRequired, score: coverage * 3 + preferred }
      })
      .sort((a, b) => {
        if (a.hasRequired !== b.hasRequired) return a.hasRequired ? -1 : 1
        return b.score - a.score
      })

    const options: string[] = []
    for (const { template } of scored) {
      if (options.length >= 4) break
      const firstBucket = template.requiredBuckets[0]
      const secondBucket = template.requiredBuckets[1] || template.requiredBuckets[0]
      const first = selectWord(firstBucket, template.template, [])
      const second = selectWord(secondBucket, template.template, first ? [first.label] : [])
      if (!first || !second || !areCompatiblePresentWords(first, second, template.template === 'blend' ? 'effect' : template.template)) {
        continue
      }
      const third = selectRewardOrVariety([first.label, second.label])
      const built = template.build({
        first,
        second,
        third: third || undefined,
        title: roleLabel || 'professional',
      })
      if (!options.includes(built)) {
        globallyUsed.add(first.label)
        globallyUsed.add(second.label)
        if (third) globallyUsed.add(third.label)
        options.push(built)
      }
    }

    return options.slice(0, 4)
  }

  if (section === 'past') {
    const pastWords = selected
      .map((label) => PAST_BRIDGE_WORDS.find((word) => word.label === label))
      .filter((word): word is PastBridgeWord => Boolean(word))

    const phrases = splitCommaList(supportingDetail || '')
    const detectLearningBucket = (phrase: string): LearningBucket => {
      const normalized = phrase.toLowerCase()
      if (/(pressure|priorit|shift|adapt|deadline|competing|busy|fast)/.test(normalized)) return 'pressure'
      if (/(team|stakeholder|meeting|communicat|cross-functional|across|coordinat|align)/.test(normalized)) return 'coordination'
      if (/(decision|judgment|tradeoff|problem|solve|thinking|analyz|strategy)/.test(normalized)) return 'judgment'
      return 'execution'
    }

    const learningByBucket = phrases.reduce<Record<LearningBucket, string[]>>(
      (acc, phrase) => {
        acc[detectLearningBucket(phrase)].push(phrase.toLowerCase())
        return acc
      },
      { execution: [], coordination: [], pressure: [], judgment: [] },
    )

    const fallbackLearning = formatLearning(supportingDetail || '') || 'working under pressure and staying organized'
    const sentenceConcepts = new Set(
      [...splitCommaList(supportingDetail || ''), ...splitCommaList(roleLabel || '')].map(normalizeConcept),
    )

    const usedLearningVariants = new Set<string>()
    const chooseLearning = (preferred: LearningBucket[], style: 'at' | 'to' | 'in' | 'value' = 'at') => {
      for (const bucket of preferred) {
        if (learningByBucket[bucket].length > 0) {
          const nonRepeating = learningByBucket[bucket].filter(
            (phrase) => !sentenceConcepts.has(normalizeConcept(phrase)),
          )
          const selected = nonRepeating.length > 0 ? nonRepeating : learningByBucket[bucket]
          const candidates = selected.flatMap((phrase) => getLearningVariants(phrase))
          const fresh = candidates.find((candidate) => !usedLearningVariants.has(candidate))
          const chosen = fresh || candidates[0]
          if (chosen) {
            usedLearningVariants.add(chosen)
            return renderPastLearning(chosen, style)
          }
        }
      }
      const fallbackCandidates = splitCommaList(fallbackLearning).flatMap((phrase) => getLearningVariants(phrase))
      const fallbackChosen = fallbackCandidates.find((candidate) => !usedLearningVariants.has(candidate)) || fallbackCandidates[0]
      if (fallbackChosen) {
        usedLearningVariants.add(fallbackChosen)
        return renderPastLearning(fallbackChosen, style)
      }
      return renderPastLearning(fallbackLearning, style)
    }
    const reflectionBuckets = uniqueStrings(pastWords.map((word) => word.bucket)) as PastBridgeBucket[]
    const availableLearningBuckets = Object.entries(learningByBucket)
      .filter(([, values]) => values.length > 0)
      .map(([bucket]) => bucket as LearningBucket)

    const scored = PAST_BRIDGE_TEMPLATES
      .map((template) => ({
        template,
        reflectionScore: template.requiredReflection.filter((bucket) => reflectionBuckets.includes(bucket)).length,
        learningScore: template.preferredLearning.filter((bucket) => availableLearningBuckets.includes(bucket)).length,
      }))
      .sort((a, b) => (b.reflectionScore * 3 + b.learningScore + b.template.priority) - (a.reflectionScore * 3 + a.learningScore + a.template.priority))

    const usedReflections = new Set<string>()
    const options: string[] = []
    for (const { template } of scored) {
      if (options.length >= 4) break
      const reflection =
        pastWords.find((word) => template.requiredReflection.includes(word.bucket) && !usedReflections.has(word.label)) ||
        pastWords.find((word) => !usedReflections.has(word.label)) ||
        pastWords[0]
      if (!reflection) continue
      usedReflections.add(reflection.label)
      const style: 'at' | 'to' | 'in' | 'value' =
        template.id === 'past-bridge-2' || template.id === 'past-bridge-9'
          ? 'in'
          : template.id === 'past-bridge-4' || template.id === 'past-bridge-10'
            ? 'at'
            : template.id === 'past-bridge-5' || template.id === 'past-bridge-7'
              ? 'to'
              : template.id === 'past-bridge-11'
                ? 'value'
                : 'at'
      const learning = chooseLearning(template.preferredLearning, style)
      const built = template.build({ reflection, learning })
      if (!options.includes(built)) options.push(built)
    }

    return options.slice(0, 4)
  }

  const futureSignals = selected
    .map((label) => FUTURE_BRIDGE_SIGNALS.find((signal) => signal.label === label))
    .filter((signal): signal is FutureBridgeSignal => Boolean(signal))

  const wants = splitCommaList(supportingDetail || '')

  const takeFutureSignal = (
    preferredBuckets: FutureBridgeBucket[],
    usedLabels: Set<string>,
    fallback: FutureBridgeSignal,
  ) => {
    const exact = futureSignals.find(
      (signal) => preferredBuckets.includes(signal.bucket) && !usedLabels.has(signal.label),
    )
    if (exact) {
      usedLabels.add(exact.label)
      return exact
    }

    const anyUnused = futureSignals.find((signal) => !usedLabels.has(signal.label))
    if (anyUnused) {
      usedLabels.add(anyUnused.label)
      return anyUnused
    }

    return fallback
  }

  const fallbackTrajectory = FUTURE_BRIDGE_SIGNALS.find((signal) => signal.label === 'natural next step')!
  const fallbackFit = FUTURE_BRIDGE_SIGNALS.find((signal) => signal.label === 'strong fit')!
  const fallbackPreference = FUTURE_BRIDGE_SIGNALS.find((signal) => signal.label === 'closer to the work I enjoy most')!
  const wantPhrase = joinList(wants.slice(0, 2))
  const usedFuture = new Set<string>()
  const sentenceOne = takeFutureSignal(['trajectory'], usedFuture, fallbackTrajectory)
  const sentenceTwo = takeFutureSignal(['fit'], usedFuture, fallbackFit)
  const sentenceThree = takeFutureSignal(['preference', 'trajectory'], usedFuture, fallbackPreference)
  const sentenceFour = takeFutureSignal(['fit', 'trajectory'], usedFuture, fallbackFit)

  return [
    `That’s a big part of why this feels like ${sentenceOne.label} for me.`,
    `From the job description, this seems like it could be ${sentenceTwo.label}.`,
    `It feels closely aligned with the background I’ve already been building and the ${sentenceThree.label} I’m looking for.`,
    wantPhrase
      ? `It also feels like a better match for where I want to go next, especially with ${wantPhrase}.`
      : `It also feels like a better match for the kind of work I want to keep doing long term.`,
  ]
}

function joinFullAnswer(present: string, past: string, future: string) {
  return [present, past, future].filter(Boolean).join(' ')
}

function ChoiceCard({
  option,
  selected,
  onSelect,
}: {
  option: string
  selected: boolean
  onSelect: () => void
}) {
  return (
    <button
      onClick={onSelect}
      className={`w-full rounded-2xl border-2 px-4 py-4 text-left transition ${
        selected
          ? 'border-violet-400 bg-violet-50 shadow-[0_10px_20px_rgba(139,92,246,0.12)]'
          : 'border-slate-200 bg-white hover:border-violet-300 hover:bg-violet-50/50'
      }`}
    >
      <div className="flex items-start gap-3">
        <span className={`mt-1 flex h-5 w-5 shrink-0 rounded-full border-2 ${selected ? 'border-violet-500 bg-violet-500' : 'border-slate-300 bg-white'}`} />
        <p className="text-sm leading-7 text-slate-800">{option}</p>
      </div>
    </button>
  )
}

function ToggleChip({
  label,
  selected,
  onToggle,
}: {
  label: string
  selected: boolean
  onToggle: () => void
}) {
  return (
    <button
      onClick={onToggle}
      className={`rounded-full border px-3 py-2 text-sm font-semibold transition ${
        selected
          ? 'border-violet-400 bg-violet-50 text-violet-800'
          : 'border-slate-200 bg-white text-slate-700 hover:border-violet-300 hover:bg-violet-50/50'
      }`}
    >
      {label}
    </button>
  )
}

export default function ProfessionalStoryWorkshop({
  onComplete,
}: ProfessionalStoryWorkshopProps) {
  const [phase, setPhase] = useState<WorkshopPhase>('bridge')
  const [answers, setAnswers] = useState<WorkshopAnswers>(EMPTY_ANSWERS)
  const [inputValue, setInputValue] = useState('')
  const [selectedPresent, setSelectedPresent] = useState('')
  const [selectedPast, setSelectedPast] = useState('')
  const [selectedFuture, setSelectedFuture] = useState('')
  const [selectedPresentBridgeWords, setSelectedPresentBridgeWords] = useState<string[]>([])
  const [selectedPastBridgeWords, setSelectedPastBridgeWords] = useState<string[]>([])
  const [selectedFutureWants, setSelectedFutureWants] = useState<string[]>([])
  const [selectedPresentBridge, setSelectedPresentBridge] = useState('')
  const [selectedPastBridge, setSelectedPastBridge] = useState('')
  const [selectedFutureBridge, setSelectedFutureBridge] = useState('')
  const [presentBridgeSeed, setPresentBridgeSeed] = useState(0)
  const [pastBridgeSeed, setPastBridgeSeed] = useState(0)

  const presentOptions = useMemo(() => buildPresentOptions(answers), [answers])
  const pastOptions = useMemo(() => buildPastOptions(answers), [answers])
  const futureOptions = useMemo(() => buildFutureOptions(answers, selectedFutureWants), [answers, selectedFutureWants])
  const presentBridgeOptions = useMemo(
    () => buildBridgeOptions('present', selectedPresentBridgeWords, presentBridgeSeed, answers.presentTitle.trim().toLowerCase()),
    [selectedPresentBridgeWords, presentBridgeSeed, answers.presentTitle],
  )
  const pastBridgeOptions = useMemo(
    () =>
      buildBridgeOptions(
        'past',
        selectedPastBridgeWords,
        pastBridgeSeed,
        `${answers.pastDuties},${answers.pastSkills}`,
        formatLearning(answers.pastLearning),
    ),
    [selectedPastBridgeWords, pastBridgeSeed, answers.pastDuties, answers.pastSkills, answers.pastLearning],
  )
  const fullAnswer = joinFullAnswer(
    [selectedPresent, selectedPresentBridge].filter(Boolean).join(' '),
    [selectedPast, selectedPastBridge].filter(Boolean).join(' '),
    [selectedFuture, selectedFutureBridge].filter(Boolean).join(' '),
  )

  const questionConfig = useMemo(() => {
    switch (phase) {
      case 'present_company':
        return {
          step: 'Step 1 of 4',
          title: 'Start with your Present details',
          prompt: 'What company do you work at now?',
          helper: 'We are starting with the raw material for your Present sentence.',
          placeholder: 'e.g. Target',
          answerKey: 'presentCompany' as const,
          next: 'present_title' as WorkshopPhase,
        }
      case 'present_title':
        return {
          step: 'Step 1 of 4',
          title: 'Keep building your Present',
          prompt: 'What is your current job title?',
          helper: 'Use the title you would naturally say out loud.',
          placeholder: 'e.g. Logistics Coordinator',
          answerKey: 'presentTitle' as const,
          next: 'present_focus' as WorkshopPhase,
        }
      case 'present_focus':
        return {
          step: 'Step 1 of 4',
          title: 'Keep building your Present',
          prompt: 'List your main job duties, separated by commas',
          helper: 'Use short phrases like you would on a resume. We will turn them into spoken language.',
          placeholder: 'e.g. manage orders, coordinate vendors, track inventory',
          answerKey: 'presentFocus' as const,
          next: 'present_years' as WorkshopPhase,
        }
      case 'present_years':
        return {
          step: 'Step 1 of 4',
          title: 'Finish gathering your Present details',
          prompt: 'How long have you been there?',
          helper: 'This gives us one more acceptable way to phrase the Present section.',
          placeholder: 'e.g. 2 years',
          answerKey: 'presentYears' as const,
          next: 'present_choose' as WorkshopPhase,
        }
      case 'past_company':
        return {
          step: 'Step 2 of 4',
          title: 'Now build your Past',
          prompt: 'What former company had the biggest impact on shaping your career?',
          helper: 'Pick one former company or experience that really mattered.',
          placeholder: 'e.g. United Way',
          answerKey: 'pastCompany' as const,
          next: 'past_title' as WorkshopPhase,
        }
      case 'past_title':
        return {
          step: 'Step 2 of 4',
          title: 'Keep building your Past',
          prompt: 'What was your title there?',
          helper: 'Just the title.',
          placeholder: 'e.g. Program Coordinator',
          answerKey: 'pastTitle' as const,
          next: 'past_duties' as WorkshopPhase,
        }
      case 'past_duties':
        return {
          step: 'Step 2 of 4',
          title: 'Keep building your Past',
          prompt: 'List your main responsibilities there, separated by commas',
          helper: 'Use short phrases. We will handle the wording.',
          placeholder: 'e.g. manage volunteers, track schedules, support event planning',
          answerKey: 'pastDuties' as const,
          next: 'past_skills' as WorkshopPhase,
        }
      case 'past_skills':
        return {
          step: 'Step 2 of 4',
          title: 'Keep building your Past',
          prompt: 'What skills did that role build? Separate with commas',
          helper: 'Think short labels, not full sentences.',
          placeholder: 'e.g. coordination, stakeholder communication, planning',
          answerKey: 'pastSkills' as const,
          next: 'past_learning' as WorkshopPhase,
        }
      case 'past_learning':
        return {
          step: 'Step 2 of 4',
          title: 'Finish gathering your Past details',
          prompt: 'What did that experience make you better at? Separate with commas',
          helper: 'Use short phrases only. We’ll turn them into a stronger reflection.',
          placeholder: 'e.g. working under pressure, coordinating busy teams, keeping projects moving',
          answerKey: 'pastLearning' as const,
          next: 'past_choose' as WorkshopPhase,
        }
      case 'future_area':
        return {
          step: 'Step 3 of 4',
          title: 'Now build your Future',
          prompt: 'What area do you want to move deeper into next?',
          helper: 'Keep it simple. One word or a short phrase is enough.',
          placeholder: 'e.g. operations, supply chain, project coordination',
          answerKey: 'futureArea' as const,
          next: 'future_role' as WorkshopPhase,
        }
      case 'future_role':
        return {
          step: 'Step 3 of 4',
          title: 'Finish gathering your Future details',
          prompt: 'What kind of role are you aiming for?',
          helper: 'Use the role title you’d naturally say out loud.',
          placeholder: 'e.g. project coordinator',
          answerKey: 'futureRole' as const,
          next: 'future_wants' as WorkshopPhase,
        }
      default:
        return null
    }
  }, [phase])

  const handleAdvanceQuestion = () => {
    if (!questionConfig || !inputValue.trim()) return
    setAnswers((current) => ({
      ...current,
      [questionConfig.answerKey]: inputValue.trim(),
    }))
    setInputValue('')
    setPhase(questionConfig.next)
  }

  const toggleChipSelection = (
    value: string,
    selected: string[],
    setSelected: (values: string[]) => void,
    max: number,
  ) => {
    if (selected.includes(value)) {
      setSelected(selected.filter((item) => item !== value))
      return
    }
    if (selected.length >= max) return
    setSelected([...selected, value])
  }

  const renderQuestionStep = () => {
    if (!questionConfig) return null

    return (
      <>
        <p className="text-[11px] font-black uppercase tracking-[0.14em] text-slate-500">{questionConfig.step}</p>
        <h4 className="mt-2 text-lg font-extrabold text-slate-900">{questionConfig.title}</h4>
        <p className="mt-2 text-sm leading-6 text-slate-500">{questionConfig.helper}</p>
        <p className="mt-6 text-base font-bold leading-snug text-slate-900">{questionConfig.prompt}</p>

        <textarea
          value={inputValue}
          onChange={(event) => setInputValue(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === 'Enter' && !event.shiftKey && inputValue.trim()) {
              event.preventDefault()
              handleAdvanceQuestion()
            }
          }}
          placeholder={questionConfig.placeholder}
          className="mt-4 min-h-[120px] w-full resize-none rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm leading-6 text-slate-800 outline-none transition focus:border-violet-300 focus:ring-4 focus:ring-violet-100"
        />

        <div className="mt-auto flex items-end justify-end border-t border-slate-200/80 pt-5">
          <button
            onClick={handleAdvanceQuestion}
            disabled={!inputValue.trim()}
            className="btn-coach-primary flex min-w-[188px] items-center justify-center gap-2 px-6 py-3 disabled:opacity-50"
          >
            Next
            <ArrowRight className="h-4 w-4" />
          </button>
        </div>
      </>
    )
  }

  return (
    <div className="flex h-full flex-col gap-5">
      <div className="shrink-0">
        <p className="text-xs font-black uppercase tracking-[0.14em] text-violet-600">Workshop</p>
        <h3 className="mt-2 text-xl font-extrabold text-slate-900 md:text-2xl">Build your Professional Story</h3>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600">
          We&apos;ll move one question at a time, then turn your raw inputs into a few usable sentence options for each section.
        </p>
      </div>

      <div className="min-h-0 flex-1 rounded-[1.6rem] border border-slate-200 bg-white px-5 py-5 shadow-[0_12px_24px_rgba(15,23,42,0.05)]">
        {phase === 'bridge' ? (
          <div className="flex h-full flex-col">
            <p className="text-[11px] font-black uppercase tracking-[0.14em] text-slate-500">Before you start</p>
            <h4 className="mt-2 text-lg font-extrabold text-slate-900">Use real details, but keep them useful</h4>
            <p className="mt-3 text-sm leading-6 text-slate-600">
              You do not need to write polished interview sentences here. Give us raw ingredients and we’ll do the phrasing for you.
            </p>

            <div className="mt-5 rounded-2xl border border-violet-200 bg-violet-50 px-4 py-4">
              <p className="text-xs font-black uppercase tracking-[0.14em] text-violet-700">Core rule</p>
              <p className="mt-2 text-sm font-semibold leading-6 text-violet-900">
                Your job is to provide the content. Our job is to format it so it sounds clear and spoken.
              </p>
            </div>

            <div className="mt-auto flex items-end justify-end border-t border-slate-200/80 pt-5">
              <button onClick={() => setPhase('bridge_conversational')} className="btn-coach-primary flex min-w-[188px] items-center justify-center gap-2 px-6 py-3">
                Next
                <ArrowRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        ) : null}

        {phase === 'bridge_conversational' ? (
          <div className="flex h-full flex-col">
            <p className="text-[11px] font-black uppercase tracking-[0.14em] text-slate-500">Before you start</p>
            <h4 className="mt-2 text-lg font-extrabold text-slate-900">Structure first, then make it sound human</h4>
            <p className="mt-3 text-sm leading-6 text-slate-600">
              The main Present, Past, and Future sentences give your answer structure. Short bridge lines make it sound more conversational and more like something you would actually say out loud.
            </p>

            <div className="mt-5 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4">
              <p className="text-xs font-black uppercase tracking-[0.14em] text-slate-500">What a bridge line can do</p>
              <div className="mt-3 space-y-3">
                {[
                  'Add a little tone to your Present.',
                  'Add meaning or reflection to your Past.',
                  'Connect your Future to this role more naturally.',
                ].map((item) => (
                  <div key={item} className="flex items-start gap-3">
                    <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-violet-600" />
                    <p className="text-sm leading-6 text-slate-700">{item}</p>
                  </div>
                ))}
              </div>
            </div>

            <div className="mt-auto flex items-end justify-end border-t border-slate-200/80 pt-5">
              <button onClick={() => setPhase('bridge_examples')} className="btn-coach-primary flex min-w-[188px] items-center justify-center gap-2 px-6 py-3">
                Next
                <ArrowRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        ) : null}

        {phase === 'bridge_examples' ? (
          <div className="flex h-full flex-col">
            <p className="text-[11px] font-black uppercase tracking-[0.14em] text-slate-500">Before you start</p>
            <h4 className="mt-2 text-lg font-extrabold text-slate-900">Keep bridge lines short</h4>
            <p className="mt-3 text-sm leading-6 text-slate-600">
              Bridge lines should support the story, not take over the story.
            </p>

            <div className="mt-5 space-y-4 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4">
              <div>
                <p className="text-xs font-black uppercase tracking-[0.14em] text-amber-700">Present bridge</p>
                <p className="mt-2 text-sm leading-6 text-slate-700">“It’s been challenging but really fulfilling.”</p>
              </div>
              <div>
                <p className="text-xs font-black uppercase tracking-[0.14em] text-emerald-700">Past bridge</p>
                <p className="mt-2 text-sm leading-6 text-slate-700">“That experience was really foundational for me.”</p>
              </div>
              <div>
                <p className="text-xs font-black uppercase tracking-[0.14em] text-rose-700">Future bridge</p>
                <p className="mt-2 text-sm leading-6 text-slate-700">“From the job description, this seems like it could be a strong fit.”</p>
              </div>
            </div>

            <div className="mt-auto flex items-end justify-end border-t border-slate-200/80 pt-5">
              <button onClick={() => setPhase('present_company')} className="btn-coach-primary flex min-w-[188px] items-center justify-center gap-2 px-6 py-3">
                Start with Present
                <ArrowRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        ) : null}

        {['present_company', 'present_title', 'present_focus', 'present_years', 'past_company', 'past_title', 'past_duties', 'past_skills', 'past_learning', 'future_area', 'future_role'].includes(phase) ? (
          <div className="flex h-full flex-col">{renderQuestionStep()}</div>
        ) : null}

        {phase === 'present_choose' ? (
          <div className="flex h-full flex-col">
            <p className="text-[11px] font-black uppercase tracking-[0.14em] text-slate-500">Step 1 of 4</p>
            <h4 className="mt-2 text-lg font-extrabold text-slate-900">Choose your Present sentence</h4>
            <p className="mt-2 text-sm leading-6 text-slate-500">All of these are acceptable. Pick the version that sounds most natural to you.</p>
            <div className="mt-5 space-y-3">
              {presentOptions.map((option) => (
                <ChoiceCard key={option} option={option} selected={selectedPresent === option} onSelect={() => setSelectedPresent(option)} />
              ))}
            </div>
            <div className="mt-auto flex items-end justify-end border-t border-slate-200/80 pt-5">
              <button
                onClick={() => {
                  setSelectedPresentBridge('')
                  setPresentBridgeSeed(0)
                  setPhase('present_bridge_words')
                }}
                disabled={!selectedPresent}
                className="btn-coach-primary flex min-w-[188px] items-center justify-center gap-2 px-6 py-3 disabled:opacity-50"
              >
                Add a Present bridge
                <ArrowRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        ) : null}

        {phase === 'present_bridge_words' ? (
          <div className="flex h-full flex-col">
            <p className="text-[11px] font-black uppercase tracking-[0.14em] text-slate-500">Step 1 of 4</p>
            <h4 className="mt-2 text-lg font-extrabold text-slate-900">Make your Present sound more natural</h4>
            <p className="mt-2 text-sm leading-6 text-slate-500">Select at least 4 words that describe how your current work feels.</p>
            <div className="mt-5 flex flex-wrap gap-2">
              {PRESENT_BRIDGE_WORDS.map((word) => (
                <ToggleChip
                  key={word.label}
                  label={word.label}
                  selected={selectedPresentBridgeWords.includes(word.label)}
                  onToggle={() => {
                    setSelectedPresentBridge('')
                    toggleChipSelection(word.label, selectedPresentBridgeWords, setSelectedPresentBridgeWords, 5)
                  }}
                />
              ))}
            </div>
            <div className="mt-auto flex items-end justify-end border-t border-slate-200/80 pt-5">
              <button
                onClick={() => {
                  setSelectedPresentBridge('')
                  setPresentBridgeSeed(0)
                  setPhase('present_bridge_choose')
                }}
                disabled={selectedPresentBridgeWords.length < 4}
                className="btn-coach-primary flex min-w-[188px] items-center justify-center gap-2 px-6 py-3 disabled:opacity-50"
              >
                Next
                <ArrowRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        ) : null}

        {phase === 'present_bridge_choose' ? (
          <div className="flex h-full flex-col">
            <p className="text-[11px] font-black uppercase tracking-[0.14em] text-slate-500">Step 1 of 4</p>
            <h4 className="mt-2 text-lg font-extrabold text-slate-900">Choose your Present bridge</h4>
            <p className="mt-2 text-sm leading-6 text-slate-500">Pick the short bridge line that sounds most natural to you.</p>
            <div className="mt-5 space-y-3">
              {presentBridgeOptions.map((option) => (
                <ChoiceCard key={option} option={option} selected={selectedPresentBridge === option} onSelect={() => setSelectedPresentBridge(option)} />
              ))}
              <button
                onClick={() => {
                  setSelectedPresentBridge('')
                  setPresentBridgeSeed((current) => current + 1)
                }}
                className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-semibold text-slate-700 transition hover:border-violet-300 hover:bg-violet-50"
              >
                Regenerate bridge options
              </button>
            </div>
            <div className="mt-auto flex items-end justify-end border-t border-slate-200/80 pt-5">
              <button
                onClick={() => setPhase('present_preview')}
                disabled={!selectedPresentBridge}
                className="btn-coach-primary flex min-w-[188px] items-center justify-center gap-2 px-6 py-3 disabled:opacity-50"
              >
                Next
                <ArrowRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        ) : null}

        {phase === 'present_preview' ? (
          <div className="flex h-full flex-col">
            <p className="text-[11px] font-black uppercase tracking-[0.14em] text-slate-500">Step 1 of 4</p>
            <h4 className="mt-2 text-lg font-extrabold text-slate-900">Here’s your full Present</h4>
            <p className="mt-2 text-sm leading-6 text-slate-500">This is the full Present section you’ve built so far.</p>
            <div className="mt-5 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-4">
              <p className="text-xs font-black uppercase tracking-[0.14em] text-amber-700">Your Present</p>
              <p className="mt-3 text-sm leading-7 text-slate-800">{[selectedPresent, selectedPresentBridge].join(' ')}</p>
            </div>
            <div className="mt-auto flex items-end justify-end border-t border-slate-200/80 pt-5">
              <button
                onClick={() => setPhase('past_company')}
                className="btn-coach-primary flex min-w-[188px] items-center justify-center gap-2 px-6 py-3"
              >
                Next
                <ArrowRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        ) : null}

        {phase === 'past_choose' ? (
          <div className="flex h-full flex-col">
            <p className="text-[11px] font-black uppercase tracking-[0.14em] text-slate-500">Step 2 of 4</p>
            <h4 className="mt-2 text-lg font-extrabold text-slate-900">Choose your Past sentence</h4>
            <p className="mt-2 text-sm leading-6 text-slate-500">Pick the version that explains your foundation most clearly without turning into chronology.</p>
            <div className="mt-5 space-y-3">
              {pastOptions.map((option) => (
                <ChoiceCard key={option} option={option} selected={selectedPast === option} onSelect={() => setSelectedPast(option)} />
              ))}
            </div>
            <div className="mt-auto flex items-end justify-end border-t border-slate-200/80 pt-5">
              <button
                onClick={() => {
                  setSelectedPastBridge('')
                  setPastBridgeSeed(0)
                  setPhase('past_bridge_words')
                }}
                disabled={!selectedPast}
                className="btn-coach-primary flex min-w-[188px] items-center justify-center gap-2 px-6 py-3 disabled:opacity-50"
              >
                Add a Past bridge
                <ArrowRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        ) : null}

        {phase === 'past_bridge_words' ? (
          <div className="flex h-full flex-col">
            <p className="text-[11px] font-black uppercase tracking-[0.14em] text-slate-500">Step 2 of 4</p>
            <h4 className="mt-2 text-lg font-extrabold text-slate-900">Add some reflection to your Past</h4>
            <p className="mt-2 text-sm leading-6 text-slate-500">Select at least 4 words that describe what that experience meant for you.</p>
            <div className="mt-5 flex flex-wrap gap-2">
              {PAST_BRIDGE_WORDS.map((word) => (
                <ToggleChip
                  key={word.label}
                  label={word.label}
                  selected={selectedPastBridgeWords.includes(word.label)}
                  onToggle={() => {
                    setSelectedPastBridge('')
                    toggleChipSelection(word.label, selectedPastBridgeWords, setSelectedPastBridgeWords, 5)
                  }}
                />
              ))}
            </div>
            <div className="mt-auto flex items-end justify-end border-t border-slate-200/80 pt-5">
              <button
                onClick={() => {
                  setSelectedPastBridge('')
                  setPastBridgeSeed(0)
                  setPhase('past_bridge_choose')
                }}
                disabled={selectedPastBridgeWords.length < 4}
                className="btn-coach-primary flex min-w-[188px] items-center justify-center gap-2 px-6 py-3 disabled:opacity-50"
              >
                Next
                <ArrowRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        ) : null}

        {phase === 'past_bridge_choose' ? (
          <div className="flex h-full flex-col">
            <p className="text-[11px] font-black uppercase tracking-[0.14em] text-slate-500">Step 2 of 4</p>
            <h4 className="mt-2 text-lg font-extrabold text-slate-900">Choose your Past bridge</h4>
            <p className="mt-2 text-sm leading-6 text-slate-500">Pick the reflective bridge line that feels most natural to you.</p>
            <div className="mt-5 space-y-3">
              {pastBridgeOptions.map((option) => (
                <ChoiceCard key={option} option={option} selected={selectedPastBridge === option} onSelect={() => setSelectedPastBridge(option)} />
              ))}
              <button
                onClick={() => {
                  setSelectedPastBridge('')
                  setPastBridgeSeed((current) => current + 1)
                }}
                className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-semibold text-slate-700 transition hover:border-violet-300 hover:bg-violet-50"
              >
                Regenerate bridge options
              </button>
            </div>
            <div className="mt-auto flex items-end justify-end border-t border-slate-200/80 pt-5">
              <button
                onClick={() => setPhase('past_preview')}
                disabled={!selectedPastBridge}
                className="btn-coach-primary flex min-w-[188px] items-center justify-center gap-2 px-6 py-3 disabled:opacity-50"
              >
                Next
                <ArrowRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        ) : null}

        {phase === 'past_preview' ? (
          <div className="flex h-full flex-col">
            <p className="text-[11px] font-black uppercase tracking-[0.14em] text-slate-500">Step 2 of 4</p>
            <h4 className="mt-2 text-lg font-extrabold text-slate-900">Here’s your full Past</h4>
            <p className="mt-2 text-sm leading-6 text-slate-500">This is the full Past section you’ve built so far.</p>
            <div className="mt-5 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-4">
              <p className="text-xs font-black uppercase tracking-[0.14em] text-emerald-700">Your Past</p>
              <p className="mt-3 text-sm leading-7 text-slate-800">{[selectedPast, selectedPastBridge].join(' ')}</p>
            </div>
            <div className="mt-auto flex items-end justify-end border-t border-slate-200/80 pt-5">
              <button
                onClick={() => setPhase('future_area')}
                className="btn-coach-primary flex min-w-[188px] items-center justify-center gap-2 px-6 py-3"
              >
                Next
                <ArrowRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        ) : null}

        {phase === 'future_wants' ? (
          <div className="flex h-full flex-col">
            <p className="text-[11px] font-black uppercase tracking-[0.14em] text-slate-500">Step 3 of 4</p>
            <h4 className="mt-2 text-lg font-extrabold text-slate-900">Select any additional things you want in your next role</h4>
            <p className="mt-2 text-sm leading-6 text-slate-500">Pick as many as fit. You can also leave this blank if nothing here really matters.</p>
            <div className="mt-5 flex flex-wrap gap-2">
              {FUTURE_WANTS.map((word) => (
                <ToggleChip key={word} label={word} selected={selectedFutureWants.includes(word)} onToggle={() => toggleChipSelection(word, selectedFutureWants, setSelectedFutureWants, 5)} />
              ))}
            </div>
            <div className="mt-auto flex items-end justify-end border-t border-slate-200/80 pt-5">
              <button onClick={() => setPhase('future_choose')} className="btn-coach-primary flex min-w-[188px] items-center justify-center gap-2 px-6 py-3">
                Show Future options
                <ArrowRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        ) : null}

        {phase === 'future_choose' ? (
          <div className="flex h-full flex-col">
            <p className="text-[11px] font-black uppercase tracking-[0.14em] text-slate-500">Step 3 of 4</p>
            <h4 className="mt-2 text-lg font-extrabold text-slate-900">Choose your Future sentence</h4>
            <p className="mt-2 text-sm leading-6 text-slate-500">Pick the version that sounds like a real next step, not just a vague desire to grow.</p>
            <div className="mt-5 space-y-3">
              {futureOptions.map((option) => (
                <ChoiceCard key={option} option={option} selected={selectedFuture === option} onSelect={() => setSelectedFuture(option)} />
              ))}
            </div>
            <div className="mt-auto flex items-end justify-end border-t border-slate-200/80 pt-5">
              <button
                onClick={() => {
                  setSelectedFutureBridge('')
                  setPhase('future_bridge_choose')
                }}
                disabled={!selectedFuture}
                className="btn-coach-primary flex min-w-[188px] items-center justify-center gap-2 px-6 py-3 disabled:opacity-50"
              >
                Add a Future bridge
                <ArrowRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        ) : null}

        {phase === 'future_bridge_choose' ? (
          <div className="flex h-full flex-col">
            <p className="text-[11px] font-black uppercase tracking-[0.14em] text-slate-500">Step 3 of 4</p>
            <h4 className="mt-2 text-lg font-extrabold text-slate-900">Choose your Future bridge</h4>
            <p className="mt-2 text-sm leading-6 text-slate-500">Pick the bridge line that best connects your next step to this role.</p>
            <div className="mt-5 space-y-3">
              {FUTURE_BRIDGE_OPTIONS.map((option) => (
                <ChoiceCard key={option} option={option} selected={selectedFutureBridge === option} onSelect={() => setSelectedFutureBridge(option)} />
              ))}
            </div>
            <div className="mt-auto flex items-end justify-end border-t border-slate-200/80 pt-5">
              <button
                onClick={() => setPhase('future_preview')}
                disabled={!selectedFutureBridge}
                className="btn-coach-primary flex min-w-[188px] items-center justify-center gap-2 px-6 py-3 disabled:opacity-50"
              >
                Next
                <ArrowRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        ) : null}

        {phase === 'future_preview' ? (
          <div className="flex h-full flex-col">
            <p className="text-[11px] font-black uppercase tracking-[0.14em] text-slate-500">Step 3 of 4</p>
            <h4 className="mt-2 text-lg font-extrabold text-slate-900">Here’s your full Future</h4>
            <p className="mt-2 text-sm leading-6 text-slate-500">This is the full Future section you’ve built so far.</p>
            <div className="mt-5 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-4">
              <p className="text-xs font-black uppercase tracking-[0.14em] text-rose-700">Your Future</p>
              <p className="mt-3 text-sm leading-7 text-slate-800">{[selectedFuture, selectedFutureBridge].join(' ')}</p>
            </div>
            <div className="mt-auto flex items-end justify-end border-t border-slate-200/80 pt-5">
              <button
                onClick={() => setPhase('practice')}
                className="btn-coach-primary flex min-w-[188px] items-center justify-center gap-2 px-6 py-3"
              >
                Next
                <ArrowRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        ) : null}

        {phase === 'practice' ? (
          <div className="flex h-full flex-col">
            <p className="text-[11px] font-black uppercase tracking-[0.14em] text-slate-500">Step 4 of 4</p>
            <h4 className="mt-2 text-lg font-extrabold text-slate-900">Here is your full answer</h4>
            <p className="mt-2 text-sm leading-6 text-slate-500">Say it out loud a few times. Then try it again without staring at every word.</p>

            <div className="mt-5 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4">
              <p className="text-sm leading-7 text-slate-800">{fullAnswer}</p>
            </div>

            <div className="mt-5 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-4">
              <p className="text-xs font-black uppercase tracking-[0.14em] text-emerald-700">Final reminder</p>
              <div className="mt-3 space-y-3">
                {[
                  'Do not memorize this word for word.',
                  'Be ready to paraphrase when you are actually asked.',
                  'Keep the Present current, the Past meaningful, and the Future logical.',
                  'Make it sound like you, not like a script.',
                ].map((item) => (
                  <div key={item} className="flex items-start gap-3">
                    <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" />
                    <p className="text-sm leading-6 text-emerald-900">{item}</p>
                  </div>
                ))}
              </div>
            </div>

            <div className="mt-auto flex items-end justify-end border-t border-slate-200/80 pt-5">
              <button onClick={onComplete} className="btn-coach-primary flex min-w-[188px] items-center justify-center gap-2 px-6 py-3">
                Finish workshop
                <ArrowRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        ) : null}
      </div>
    </div>
  )
}
