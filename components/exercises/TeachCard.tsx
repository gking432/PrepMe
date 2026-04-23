'use client'

import { useCallback, useMemo, useState } from 'react'
import { normalizePracticeCriterion } from '@/lib/practice-bundles'
import { ArrowRight, ThumbsDown, ThumbsUp } from 'lucide-react'
import Preppi from '@/components/Preppi'

interface TeachCardProps {
  criterion: string
  title: string
  lessonTitle?: string
  explanation: string
  example: {
    question: string
    badAnswer: string
    mediumAnswer?: string
    goodAnswer: string
    breakdown: Record<string, string>
    annotatedStrongAnswer?: Array<{
      label: string
      text: string
      detail?: string
    }>
    pairedAnnotatedAnswer?: Array<{
      label: string
      statement: string
      groundingDetail: string
      note?: string
    }>
  }
  originalQuestion?: string
  originalAnswer?: string
  onContinue: () => void
}

// For STAR keys show S/T/A/R badge; for other keys show the number (1,2,3...) based on index
// Label is always the human-readable key (underscores → spaces, title case)
function formatBreakdownKey(key: string, index: number): string {
  const star: Record<string, string> = {
    situation: 'S', task: 'T', action: 'A', result: 'R',
  }
  return star[key.toLowerCase()] ?? String(index + 1)
}

function breakdownKeyLabel(key: string): string {
  // Convert snake_case / camelCase to readable label
  return key
    .replace(/_/g, ' ')
    .replace(/([A-Z])/g, ' $1')
    .replace(/^\w/, c => c.toUpperCase())
    .trim()
}

function summarizeExplanation(explanation: string) {
  const [firstSentence] = explanation
    .split(/(?<=[.!?])\s+/)
    .map((sentence) => sentence.trim())
    .filter(Boolean)

  return firstSentence || explanation
}

function annotationColors(label: string) {
  const key = label.toLowerCase()
  if (key.startsWith('present')) return {
    text: 'text-sky-900',
    bg: 'bg-sky-100',
    border: 'border-sky-200',
    chip: 'bg-sky-100 text-sky-700',
    highlight: 'bg-sky-100/80',
    subtle: 'bg-sky-50',
  }
  if (key.startsWith('past')) return {
    text: 'text-emerald-900',
    bg: 'bg-emerald-100',
    border: 'border-emerald-200',
    chip: 'bg-emerald-100 text-emerald-700',
    highlight: 'bg-emerald-100/80',
    subtle: 'bg-emerald-50',
  }
  if (key.startsWith('why here') || key.startsWith('now') || key.startsWith('future')) return {
    text: 'text-amber-900',
    bg: 'bg-amber-100',
    border: 'border-amber-200',
    chip: 'bg-amber-100 text-amber-700',
    highlight: 'bg-amber-100/80',
    subtle: 'bg-amber-50',
  }
  if (key === 'lead') return {
    text: 'text-sky-900',
    bg: 'bg-sky-100',
    border: 'border-sky-200',
    chip: 'bg-sky-100 text-sky-700',
    highlight: 'bg-sky-100/80',
    subtle: 'bg-sky-50',
  }
  if (key === 'situation') return {
    text: 'text-emerald-900',
    bg: 'bg-emerald-100',
    border: 'border-emerald-200',
    chip: 'bg-emerald-100 text-emerald-700',
    highlight: 'bg-emerald-100/80',
    subtle: 'bg-emerald-50',
  }
  if (key === 'task') return {
    text: 'text-amber-900',
    bg: 'bg-amber-100',
    border: 'border-amber-200',
    chip: 'bg-amber-100 text-amber-700',
    highlight: 'bg-amber-100/80',
    subtle: 'bg-amber-50',
  }
  if (key === 'action') return {
    text: 'text-violet-900',
    bg: 'bg-violet-100',
    border: 'border-violet-200',
    chip: 'bg-violet-100 text-violet-700',
    highlight: 'bg-violet-100/80',
    subtle: 'bg-violet-50',
  }
  if (key === 'result') return {
    text: 'text-rose-900',
    bg: 'bg-rose-100',
    border: 'border-rose-200',
    chip: 'bg-rose-100 text-rose-700',
    highlight: 'bg-rose-100/80',
    subtle: 'bg-rose-50',
  }
  if (key === 'observation') return {
    text: 'text-sky-900',
    bg: 'bg-sky-100',
    border: 'border-sky-200',
    chip: 'bg-sky-100 text-sky-700',
    highlight: 'bg-sky-100/80',
    subtle: 'bg-sky-50',
  }
  if (key === 'fit') return {
    text: 'text-emerald-900',
    bg: 'bg-emerald-100',
    border: 'border-emerald-200',
    chip: 'bg-emerald-100 text-emerald-700',
    highlight: 'bg-emerald-100/80',
    subtle: 'bg-emerald-50',
  }
  if (key === 'timing') return {
    text: 'text-amber-900',
    bg: 'bg-amber-100',
    border: 'border-amber-200',
    chip: 'bg-amber-100 text-amber-700',
    highlight: 'bg-amber-100/80',
    subtle: 'bg-amber-50',
  }
  if (key === 'answer') return {
    text: 'text-sky-900',
    bg: 'bg-sky-100',
    border: 'border-sky-200',
    chip: 'bg-sky-100 text-sky-700',
    highlight: 'bg-sky-100/80',
    subtle: 'bg-sky-50',
  }
  if (key === 'reason') return {
    text: 'text-emerald-900',
    bg: 'bg-emerald-100',
    border: 'border-emerald-200',
    chip: 'bg-emerald-100 text-emerald-700',
    highlight: 'bg-emerald-100/80',
    subtle: 'bg-emerald-50',
  }
  if (key === 'example') return {
    text: 'text-amber-900',
    bg: 'bg-amber-100',
    border: 'border-amber-200',
    chip: 'bg-amber-100 text-amber-700',
    highlight: 'bg-amber-100/80',
    subtle: 'bg-amber-50',
  }
  if (key === 'claim') return {
    text: 'text-sky-900',
    bg: 'bg-sky-100',
    border: 'border-sky-200',
    chip: 'bg-sky-100 text-sky-700',
    highlight: 'bg-sky-100/80',
    subtle: 'bg-sky-50',
  }
  if (key === 'detail') return {
    text: 'text-violet-900',
    bg: 'bg-violet-100',
    border: 'border-violet-200',
    chip: 'bg-violet-100 text-violet-700',
    highlight: 'bg-violet-100/80',
    subtle: 'bg-violet-50',
  }
  if (key === 'impact') return {
    text: 'text-rose-900',
    bg: 'bg-rose-100',
    border: 'border-rose-200',
    chip: 'bg-rose-100 text-rose-700',
    highlight: 'bg-rose-100/80',
    subtle: 'bg-rose-50',
  }
  if (key === 'know') return {
    text: 'text-sky-900',
    bg: 'bg-sky-100',
    border: 'border-sky-200',
    chip: 'bg-sky-100 text-sky-700',
    highlight: 'bg-sky-100/80',
    subtle: 'bg-sky-50',
  }
  if (key === 'connect') return {
    text: 'text-emerald-900',
    bg: 'bg-emerald-100',
    border: 'border-emerald-200',
    chip: 'bg-emerald-100 text-emerald-700',
    highlight: 'bg-emerald-100/80',
    subtle: 'bg-emerald-50',
  }
  if (key === 'ask') return {
    text: 'text-amber-900',
    bg: 'bg-amber-100',
    border: 'border-amber-200',
    chip: 'bg-amber-100 text-amber-700',
    highlight: 'bg-amber-100/80',
    subtle: 'bg-amber-50',
  }
  return {
    text: 'text-slate-900',
    bg: 'bg-slate-100',
    border: 'border-slate-200',
    chip: 'bg-slate-100 text-slate-700',
    highlight: 'bg-slate-100',
    subtle: 'bg-slate-50',
  }
}

function normalizeQuestion(text?: string) {
  return (text || '')
    .trim()
    .replace(/[^\w\s]/g, '')
    .replace(/\s+/g, ' ')
    .toLowerCase()
}

function extractPlaceholderQuestion(answer?: string) {
  if (!answer) return null
  const match = answer.match(/No response provided to:\s*['"](.+?)['"]/i)
  return match?.[1] || null
}

function TeachingList({
  items,
  numbered = false,
}: {
  items: string[]
  numbered?: boolean
}) {
  return (
    <div className="space-y-4">
      {items.map((line, index) => (
        <div key={`${line}-${index}`} className="flex items-start gap-3">
          {numbered ? (
            <span className="mt-0.5 inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-violet-100 text-xs font-black text-violet-700">
              {index + 1}
            </span>
          ) : (
            <span className="mt-2 h-2 w-2 shrink-0 rounded-full bg-violet-400" />
          )}
          <p className="text-sm leading-relaxed text-slate-700 md:text-[15px]">{line}</p>
        </div>
      ))}
    </div>
  )
}

function ContrastText({
  weakLabel = 'Weak',
  weakText,
  strongLabel = 'Stronger',
  strongText,
}: {
  weakLabel?: string
  weakText: string
  strongLabel?: string
  strongText: string
}) {
  return (
    <div className="space-y-5">
      <div>
        <p className="text-xs font-bold uppercase tracking-[0.16em] text-rose-500">{weakLabel}</p>
        <p className="mt-2 text-base leading-relaxed text-rose-700 md:text-[17px]">
          &ldquo;{weakText}&rdquo;
        </p>
      </div>
      <div className="h-px bg-slate-200" />
      <div>
        <p className="text-xs font-bold uppercase tracking-[0.16em] text-emerald-600">{strongLabel}</p>
        <p className="mt-2 text-base leading-relaxed text-emerald-700 md:text-[17px]">
          &ldquo;{strongText}&rdquo;
        </p>
      </div>
    </div>
  )
}

export default function TeachCard({
  criterion,
  title,
  lessonTitle,
  explanation,
  example,
  originalQuestion,
  originalAnswer,
  onContinue,
}: TeachCardProps) {
  const [step, setStep] = useState(0)
  const summary = useMemo(() => summarizeExplanation(explanation), [explanation])
  const frameworkRows = useMemo(() => Object.entries(example.breakdown), [example.breakdown])
  const isStarLesson = useMemo(() => {
    const keys = frameworkRows.map(([key]) => key.toLowerCase())
    return ['situation', 'task', 'action', 'result'].every((key) => keys.includes(key))
  }, [frameworkRows])
  const isPresentPastFutureLesson = useMemo(() => {
    const keys = frameworkRows.map(([key]) => key.toLowerCase())
    return ['present', 'past', 'future'].every((key) => keys.includes(key))
  }, [frameworkRows])
  const isObservationLesson = useMemo(() => {
    const keys = frameworkRows.map(([key]) => key.toLowerCase())
    return ['observation', 'fit', 'timing'].every((key) => keys.includes(key))
  }, [frameworkRows])
  const isAnswerReasonExampleLesson = useMemo(() => {
    const keys = frameworkRows.map(([key]) => key.toLowerCase())
    return ['answer', 'reason', 'example'].every((key) => keys.includes(key))
  }, [frameworkRows])
  const isClaimExampleDetailImpactLesson = useMemo(
    () => lessonTitle === 'Strengthen Weak Proof',
    [lessonTitle]
  )
  const isCompanyKnowledgeLesson = useMemo(
    () => lessonTitle === 'Show You Prepared',
    [lessonTitle]
  )
  const isMeaningfulQuestionsLesson = useMemo(
    () => lessonTitle === 'Ask Better Questions',
    [lessonTitle]
  )
  const isHandlingUncertaintyLesson = useMemo(
    () => lessonTitle === 'Stay Grounded When You Are Unsure',
    [lessonTitle]
  )
  const isCareerAlignmentLesson = useMemo(
    () => lessonTitle === 'Career Alignment',
    [lessonTitle]
  )
  const isPaceAndFlowLesson = useMemo(
    () => lessonTitle === 'Pace and Flow',
    [lessonTitle]
  )
  const placeholderQuestion = useMemo(() => extractPlaceholderQuestion(originalAnswer), [originalAnswer])
  const originalAnswerMissing = useMemo(() => /^No response provided to:/i.test((originalAnswer || '').trim()), [originalAnswer])
  const placeholderMatchesQuestion = useMemo(() => {
    if (!placeholderQuestion) return false
    return normalizeQuestion(placeholderQuestion) === normalizeQuestion(originalQuestion || example.question)
  }, [example.question, originalQuestion, placeholderQuestion])
  const hasMatchingOriginalAnswer = useMemo(() => {
    if (!originalAnswer) return false
    if (placeholderQuestion) {
      return placeholderMatchesQuestion
    }
    return true
  }, [originalAnswer, placeholderQuestion, placeholderMatchesQuestion])
  const safeOriginalAnswer = hasMatchingOriginalAnswer ? originalAnswer : undefined

  const whyMissed = useMemo(() => {
    if (originalAnswerMissing && placeholderMatchesQuestion) {
      return 'This was flagged because you did not give a usable answer to this question. The first fix is to answer the exact question directly instead of pausing, restarting, or leaving it blank.'
    }
    if (originalAnswerMissing && placeholderQuestion && !placeholderMatchesQuestion) {
      return 'This was flagged because the interview transcript does not contain a usable answer for this exact question. That usually means you answered a different question, got interrupted, or never got a clean response out.'
    }
    if (!safeOriginalAnswer) {
      return 'This was flagged because we do not have a clean matching answer excerpt for this question. We should still practice the right move, but we should not pretend we have a real answer to critique.'
    }

    const normalizedCriterion = normalizePracticeCriterion(criterion)
    const key = normalizedCriterion.toLowerCase()
    if (key.includes('professional story')) {
      return 'This answer likely got flagged because it does not clearly define what you do now, the through-line behind your background, and where you want to go next.'
    }
    if (key.includes('specific examples')) {
      return 'This answer likely got flagged because it stays general. The interviewer hears claims, but not enough proof.'
    }
    if (key.includes('company')) {
      return 'This answer likely got flagged because it does not show real preparation or good judgment about the company and role.'
    }
    if (key.includes('uncertain')) {
      return 'This answer likely got flagged because it does not show a calm first step, a decision process, or what happened next.'
    }
    if (key.includes('career goals') || key.includes('alignment')) {
      return 'This answer likely got flagged because it does not clearly explain why this role makes sense for you now.'
    }
    if (key.includes('pace') || key.includes('conversation')) {
      return 'This answer likely got flagged because the delivery does not feel clean and controlled yet.'
    }
    return 'This answer likely got flagged because the interviewer could not clearly hear the move you wanted them to hear.'
  }, [criterion, originalAnswerMissing, placeholderMatchesQuestion, placeholderQuestion, safeOriginalAnswer])

  const withIntro = useCallback(
    (lessonCards: Array<{ eyebrow: string; title: string; preppi: string; content: JSX.Element }>) => [
      {
        eyebrow: 'Lesson Intro',
        title: "What you're about to learn",
        preppi: 'Start with the lesson goal. Then move into the flagged moment and the teaching sequence.',
        content: (
          <div className="space-y-4">
            <p className="text-xs font-bold uppercase tracking-[0.16em] text-violet-500">This is what you&apos;re about to learn</p>
            <p className="text-base leading-relaxed text-slate-700 md:text-[17px]">{summary}</p>
          </div>
        ),
      },
      ...lessonCards,
    ],
    [summary]
  )

  const cards = useMemo(() => {
    if (isPresentPastFutureLesson) {
      return [
        {
          eyebrow: 'Professional Story',
          title: 'What this answer is for',
          preppi: 'This is the opening move in a lot of interviews. The goal is not to tell your whole life story.',
          content: (
            <div className="space-y-4">
              <p className="text-sm leading-relaxed text-slate-700 md:text-[15px]">In this lesson, you’ll learn how to turn a scattered background into a clear, focused answer you can actually use.</p>
              <p className="text-sm leading-relaxed text-slate-700 md:text-[15px]">“Tell me about yourself” is not your full resume.</p>
              <p className="text-sm leading-relaxed text-slate-700 md:text-[15px]">A strong answer does three things:</p>
              <TeachingList
                items={[
                  'explains what you do now',
                  'shows the background that led you here',
                  'makes it clear where you are headed next',
                ]}
              />
              <p className="text-sm leading-relaxed text-slate-700 md:text-[15px]">The goal is to make your background easy to follow and relevant to the role.</p>
            </div>
          ),
        },
        {
          eyebrow: 'Why It Gets Flagged',
          title: 'Why this gets flagged',
          preppi: 'Most misses here are not about having a weak background. They come from how the story is told.',
          content: (
            <div className="space-y-4">
              <p className="text-sm leading-relaxed text-slate-700 md:text-[15px]">This answer usually gets flagged when the candidate:</p>
              <TeachingList
                items={[
                  'starts too far back',
                  'lists jobs in order',
                  'includes too much irrelevant detail',
                  'never clearly defines what they do now',
                  'sounds scattered or unfocused',
                  'uses vague future language like “I want to grow” or “I’m looking for a new challenge”',
                  'sounds like a resume recap instead of a professional story',
                ]}
              />
            </div>
          ),
        },
        {
          eyebrow: 'The Framework',
          title: 'The repair tool: Present → Past → Future',
          preppi: 'This is the cleanest shape for background questions because it keeps the answer anchored in the present and pointed toward what comes next.',
          content: (
            <div className="space-y-4">
              <p className="text-sm leading-relaxed text-slate-700 md:text-[15px]">A strong answer usually follows this shape:</p>
              <div className="space-y-3 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4">
                <div>
                  <p className="text-xs font-bold uppercase tracking-[0.16em] text-sky-700">Present</p>
                  <p className="mt-1 text-sm leading-relaxed text-slate-700 md:text-[15px]">Start with where you are now.</p>
                </div>
                <div>
                  <p className="text-xs font-bold uppercase tracking-[0.16em] text-emerald-700">Past</p>
                  <p className="mt-1 text-sm leading-relaxed text-slate-700 md:text-[15px]">Then explain the background that led you here.</p>
                </div>
                <div>
                  <p className="text-xs font-bold uppercase tracking-[0.16em] text-amber-700">Future</p>
                  <p className="mt-1 text-sm leading-relaxed text-slate-700 md:text-[15px]">Then explain where you want to go next.</p>
                </div>
              </div>
            </div>
          ),
        },
        {
          eyebrow: 'Present',
          title: 'Present: what to do',
          preppi: 'Lead with your current lane. This is where the interviewer should immediately understand what kind of professional you are.',
          content: (
            <div className="space-y-4">
              <p className="text-sm leading-relaxed text-slate-700 md:text-[15px]">Start with where you are now.</p>
              <p className="text-sm leading-relaxed text-slate-700 md:text-[15px]">This should explain:</p>
              <TeachingList
                items={[
                  'what kind of work you do',
                  'what your role really centers on',
                ]}
              />
              <p className="text-sm leading-relaxed text-slate-700 md:text-[15px]">Do not just give your title. Define your lane.</p>
            </div>
          ),
        },
        {
          eyebrow: 'Past',
          title: 'Past: what to do',
          preppi: 'This is where you show the pattern behind your experience instead of walking through every stop on your resume.',
          content: (
            <div className="space-y-4">
              <p className="text-sm leading-relaxed text-slate-700 md:text-[15px]">Then explain the background that led you here.</p>
              <p className="text-sm leading-relaxed text-slate-700 md:text-[15px]">This should:</p>
              <TeachingList
                items={[
                  'show the foundation behind your current work',
                  'explain the pattern in your experience',
                  'avoid listing every job in order',
                ]}
              />
              <p className="text-sm leading-relaxed text-slate-700 md:text-[15px]">The goal is not chronology. The goal is connection.</p>
            </div>
          ),
        },
        {
          eyebrow: 'Future',
          title: 'Future: what to do',
          preppi: 'Finish by showing the direction you want to keep building toward and why that direction makes sense.',
          content: (
            <div className="space-y-4">
              <p className="text-sm leading-relaxed text-slate-700 md:text-[15px]">Then explain where you want to go next.</p>
              <p className="text-sm leading-relaxed text-slate-700 md:text-[15px]">This should:</p>
              <TeachingList
                items={[
                  'name the kind of work you want more of',
                  'make this move feel logical',
                  'sound specific, not generic',
                ]}
              />
              <p className="text-sm leading-relaxed text-slate-700 md:text-[15px]">Do not say:</p>
              <TeachingList
                items={[
                  'I want to grow',
                  'I want a new challenge',
                  'I’m looking for a better opportunity',
                ]}
              />
              <p className="text-sm leading-relaxed text-slate-700 md:text-[15px]">Those are too broad.</p>
            </div>
          ),
        },
        {
          eyebrow: 'Selection',
          title: 'The most important skill: selection',
          preppi: 'A stronger answer is not about saying more. It is about choosing the details that support the story you want the interviewer to hear.',
          content: (
            <div className="space-y-4">
              <p className="text-sm leading-relaxed text-slate-700 md:text-[15px]">Most people do not struggle because they lack experience. They struggle because they do not know what to include.</p>
              <p className="text-sm leading-relaxed text-slate-700 md:text-[15px]">A strong Professional Story is not about saying more. It is about choosing better.</p>
              <p className="text-sm leading-relaxed text-slate-700 md:text-[15px]">Keep what helps explain:</p>
              <TeachingList
                items={[
                  'what you do now',
                  'what built that path',
                  'why this role makes sense next',
                ]}
              />
              <p className="text-sm leading-relaxed text-slate-700 md:text-[15px]">Cut what does not help:</p>
              <TeachingList
                items={[
                  'old details that are no longer relevant',
                  'side paths that do not support the story',
                  'repeated ideas',
                  'job-by-job chronology',
                  'resume bullet language',
                ]}
              />
            </div>
          ),
        },
        {
          eyebrow: 'Messy Backgrounds',
          title: 'If your background feels messy',
          preppi: 'That does not mean you have no story. It usually means you have to zoom out far enough to see the pattern.',
          content: (
            <div className="space-y-4">
              <p className="text-sm leading-relaxed text-slate-700 md:text-[15px]">That is normal.</p>
              <p className="text-sm leading-relaxed text-slate-700 md:text-[15px]">Your story does not need to explain everything. It just needs to explain the version of your background that makes sense for this role.</p>
              <p className="text-sm leading-relaxed text-slate-700 md:text-[15px]">If your background feels scattered, look for:</p>
              <TeachingList
                items={[
                  'the kind of work that repeats',
                  'the strengths that show up across roles',
                  'the pattern that connects your experience',
                ]}
              />
              <p className="text-sm leading-relaxed text-slate-700 md:text-[15px]">Focus on the through-line, not the titles.</p>
            </div>
          ),
        },
        {
          eyebrow: 'Examples',
          title: 'What strong answers sound like',
          preppi: 'These work because they are clear, selective, connected, and pointed in a direction.',
          content: (
            <div className="space-y-4">
              <div className="space-y-3 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4">
                <p className="text-sm leading-relaxed text-sky-700 md:text-[15px]">“Right now, most of my work is focused on coordinating teams and keeping work moving.”</p>
                <p className="text-sm leading-relaxed text-emerald-700 md:text-[15px]">“Before that, I built my foundation in roles where I had to stay organized, adjust quickly, and keep priorities on track.”</p>
                <p className="text-sm leading-relaxed text-amber-700 md:text-[15px]">“Going forward, I want to keep building in that kind of coordination work in a role with more ownership.”</p>
              </div>
              <p className="text-sm leading-relaxed text-slate-700 md:text-[15px]">This works because it is:</p>
              <TeachingList
                items={[
                  'clear',
                  'selective',
                  'connected',
                  'pointed in a direction',
                ]}
              />
            </div>
          ),
        },
        {
          eyebrow: 'Delivery',
          title: 'Final reminder',
          preppi: 'The goal is a clear answer you can say naturally, not a word-for-word performance.',
          content: (
            <div className="space-y-4">
              <p className="text-sm leading-relaxed text-slate-700 md:text-[15px]">The goal is not to memorize a speech.</p>
              <p className="text-sm leading-relaxed text-slate-700 md:text-[15px]">The goal is to build a clear answer you can say naturally.</p>
              <p className="text-sm leading-relaxed text-slate-700 md:text-[15px]">You should know:</p>
              <TeachingList
                items={[
                  'the points you want to hit',
                  'the order you want to hit them in',
                ]}
              />
              <p className="text-sm leading-relaxed text-slate-700 md:text-[15px]">But it should still sound like you, not like a script.</p>
            </div>
          ),
        },
        {
          eyebrow: 'Next Up',
          title: 'Ready to practice?',
          preppi: 'You have the pattern. Now let’s pressure-test it with drills before we build your own version.',
          content: <div />,
        },
      ]
    }

    if (isStarLesson) {
      return withIntro([
        {
          eyebrow: 'Your Flagged Answer',
          title: originalQuestion || example.question,
          preppi: 'We should start with the exact miss first, not generic advice.',
          content: (
            <div className="space-y-4">
              {safeOriginalAnswer ? (
                <div className="overflow-hidden rounded-2xl border border-rose-200 bg-rose-50/80 shadow-sm">
                  <div className="border-b border-rose-200 bg-rose-100/80 px-4 py-3">
                    <p className="text-xs font-bold uppercase tracking-wide text-rose-600">Your original answer</p>
                  </div>
                  <div className="px-4 py-4">
                    <p className="text-sm leading-relaxed text-rose-900 md:text-[15px]">&ldquo;{safeOriginalAnswer}&rdquo;</p>
                  </div>
                </div>
              ) : (
                <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4">
                  <p className="text-sm leading-relaxed text-slate-600 md:text-base">
                    We do not have a clean matching transcript excerpt for this flagged answer, so we will use the flagged question and rebuild the move from there.
                  </p>
                </div>
              )}
              <div className="space-y-1">
                <p className="text-xs font-bold uppercase tracking-wide text-amber-700">Why it got flagged</p>
                <p className="mt-2 text-sm leading-relaxed text-amber-900 md:text-[15px]">{whyMissed}</p>
              </div>
            </div>
          ),
        },
        {
          eyebrow: 'Question Type',
          title: 'What kind of question this is',
          preppi: 'Start by knowing when to use STAR. Then the rest of the lesson has the right frame.',
          content: (
            <div className="space-y-4">
              <div className="grid gap-3">
                {[
                  'Tell me about a project or accomplishment you’re proud of and what your role was',
                  'Tell me about a time you didn’t have the answer right away or the path forward wasn’t clear',
                  'Tell me about a challenge you faced and how you handled it',
                ].map((line) => (
                  <div key={line} className="border-l-2 border-violet-200 pl-4">
                    <p className="text-sm font-semibold text-slate-800 md:text-[15px]">{line}</p>
                  </div>
                ))}
              </div>
              <div className="border-t border-violet-100 pt-3">
                <p className="text-sm font-semibold leading-relaxed text-violet-900 md:text-[15px]">
                  Best use: accomplishment, challenge, uncertainty, problem-solving, ownership stories.
                </p>
              </div>
            </div>
          ),
        },
        {
          eyebrow: 'Scoring Logic',
          title: 'What interviewers are actually listening for',
          preppi: 'They are not grading the acronym. They are listening for ownership and judgment.',
          content: (
            <div className="space-y-4">
              <div className="grid gap-3">
                {[
                  'what happened',
                  'what you were responsible for',
                  'what you did',
                  'what changed because of your actions',
                ].map((line, index) => (
                  <div key={line} className="flex items-start gap-3 border-l-2 border-violet-200 pl-4">
                    <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-violet-100 text-xs font-black text-violet-700">{index + 1}</span>
                    <p className="text-sm font-semibold text-slate-800 md:text-[15px]">{line}</p>
                  </div>
                ))}
              </div>
              <div className="border-t border-violet-100 pt-3">
                <p className="text-sm font-semibold leading-relaxed text-violet-900 md:text-[15px]">
                  They are not grading the acronym. They are listening for ownership and judgment.
                </p>
              </div>
            </div>
          ),
        },
        {
          eyebrow: 'The Structure',
          title: 'The STAR structure',
          preppi: 'This is the framework itself. Keep it simple before we talk about what makes it strong.',
          content: (
            <div className="space-y-3">
              {frameworkRows.map(([key, value], index) => (
                <div key={key} className="flex items-start gap-3 rounded-2xl border border-slate-200 bg-slate-50/80 px-4 py-4">
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-violet-100 text-sm font-extrabold text-violet-700">
                    {formatBreakdownKey(key, index)}
                  </span>
                  <div className="min-w-0">
                    <p className="text-xs font-bold uppercase tracking-wide text-violet-600">{breakdownKeyLabel(key)}</p>
                    <p className="mt-1 text-sm leading-relaxed text-slate-700 md:text-[15px]">{value}</p>
                  </div>
                </div>
              ))}
              <div className="border-t border-slate-200 pt-4">
                <p className="text-sm leading-relaxed text-slate-700 md:text-[15px]">
                  The structure helps. The details inside each section are what make the answer strong.
                </p>
              </div>
            </div>
          ),
        },
        {
          eyebrow: 'Weighting',
          title: 'Not all four parts should be the same size',
          preppi: 'This is one of the highest-value fixes. Most people over-explain the setup and under-explain the Action.',
          content: (
            <div className="space-y-4">
              <div className="grid gap-3">
                {[
                  ['Situation', 'Keep it short.'],
                  ['Task', 'Keep it clear, but brief.'],
                  ['Action', 'Put most of the detail here.'],
                  ['Result', 'Close with a real outcome.'],
                ].map(([label, text]) => {
                  const colors = annotationColors(label)
                  return (
                    <div key={label} className={`rounded-2xl border ${colors.border} bg-white px-4 py-4 shadow-sm`}>
                      <span className={`inline-flex rounded-full px-2.5 py-1 text-[11px] font-black uppercase tracking-[0.14em] ${colors.chip}`}>{label}</span>
                      <p className="mt-3 text-sm leading-relaxed text-slate-700 md:text-[15px]">{text}</p>
                    </div>
                  )
                })}
              </div>
              <div className="border-t border-violet-100 pt-3">
                <p className="text-sm font-semibold leading-relaxed text-violet-900 md:text-[15px]">
                  In a strong STAR answer, the Action carries the most weight.
                </p>
              </div>
            </div>
          ),
        },
        {
          eyebrow: 'Most Common Mistake',
          title: 'The most common STAR mistake',
          preppi: 'This is the exact teaching point behind the “Situation is too long” drill.',
          content: (
            <div className="space-y-4">
              <p className="text-sm leading-relaxed text-slate-600 md:text-base">
                Most people spend too long on the setup and not enough time on the Action. That creates an answer that is organized, but still weak.
              </p>
              <div className="space-y-1">
                <p className="text-sm font-semibold leading-relaxed text-amber-900 md:text-[15px]">
                  Get to the point faster. Put the detail where it matters.
                </p>
              </div>
            </div>
          ),
        },
        {
          eyebrow: 'Compare',
          title: 'Weak vs better vs strong',
          preppi: 'The middle tier matters. STAR-shaped is not the same thing as strong.',
          content: (
            <div className="space-y-4">
              {[
                ['Weak', example.badAnswer, 'rose', 'Unclear, generic, and light on ownership.'],
                ['Structured but weak', example.mediumAnswer || '', 'amber', 'The shape is there, but the Action is vague and the Result is soft.'],
                ['Strong', example.goodAnswer, 'emerald', 'Specific, owned, and easy to believe.'],
              ].map(([label, answer, tone, note]) => {
                const styles = tone === 'rose'
                  ? ['border-rose-200', 'bg-rose-50/70', 'border-rose-200 bg-rose-100/80', 'text-rose-600', 'text-rose-900']
                  : tone === 'amber'
                  ? ['border-amber-200', 'bg-amber-50/70', 'border-amber-200 bg-amber-100/80', 'text-amber-700', 'text-amber-900']
                  : ['border-emerald-200', 'bg-emerald-50/70', 'border-emerald-200 bg-emerald-100/80', 'text-emerald-600', 'text-emerald-900']
                return (
                  <div key={label} className={`overflow-hidden rounded-2xl border-2 ${styles[0]} ${styles[1]} shadow-sm`}>
                    <div className={`px-4 py-3 ${styles[2]}`}>
                      <span className={`text-xs font-bold uppercase tracking-wide ${styles[3]}`}>{label}</span>
                    </div>
                    <div className="space-y-3 px-4 py-4">
                      <p className={`text-base leading-relaxed ${styles[4]}`}>&ldquo;{answer}&rdquo;</p>
                      <p className="text-sm leading-relaxed text-slate-600">{note}</p>
                    </div>
                  </div>
                )
              })}
            </div>
          ),
        },
        {
          eyebrow: 'See It In Action',
          title: 'See the strong answer with STAR applied',
          preppi: 'Now the concept is laid onto the stronger answer itself. This is the proof of what each section is doing.',
          content: (
            <div className="space-y-4">
              <div className="border-t border-slate-200 pt-4">
                <div className="flex flex-wrap gap-2">
                  {example.annotatedStrongAnswer?.map((part, index) => {
                    const colors = annotationColors(part.label)
                    return (
                      <span
                        key={`${part.label}-pill-${index}`}
                        className={`inline-flex rounded-full px-2.5 py-1 text-[11px] font-black uppercase tracking-[0.14em] ${colors.chip}`}
                      >
                        {part.label}
                      </span>
                    )
                  })}
                </div>
                <p className="mt-4 text-base leading-relaxed text-slate-900">
                  &ldquo;
                  {example.annotatedStrongAnswer?.map((part, index) => {
                    const colors = annotationColors(part.label)
                    return (
                      <span
                        key={`${part.label}-highlight-${index}`}
                        className={`rounded px-1.5 py-0.5 ${colors.highlight}`}
                      >
                        {part.text}
                        {index < (example.annotatedStrongAnswer?.length || 0) - 1 ? ' ' : ''}
                      </span>
                    )
                  })}
                  &rdquo;
                </p>
              </div>
              <div className="grid gap-3 md:grid-cols-2">
                {example.annotatedStrongAnswer?.map((part, index) => {
                  const colors = annotationColors(part.label)
                  return (
                    <div
                      key={`${part.label}-detail-${index}`}
                      className={`rounded-2xl border ${colors.border} bg-white px-4 py-4 shadow-sm`}
                    >
                      <span className={`inline-flex rounded-full px-2.5 py-1 text-[11px] font-black uppercase tracking-[0.14em] ${colors.chip}`}>
                        {part.label}
                      </span>
                      <p className="mt-3 text-sm leading-relaxed text-slate-700 md:text-[15px]">
                        {part.detail}
                      </p>
                    </div>
                  )
                })}
              </div>
            </div>
          ),
        },
        {
          eyebrow: 'Self Check',
          title: 'Use this check before you answer again',
          preppi: 'This is the editing lens to keep in your head while you practice.',
          content: (
            <div className="space-y-4">
              <div className="grid gap-3">
                {[
                  'Did I get to the point quickly?',
                  'Is my responsibility clear?',
                  'Did I say what I actually did?',
                  'Did I show what changed?',
                ].map((line) => (
                  <div key={line} className="border-l-2 border-violet-200 pl-4">
                    <p className="text-sm font-semibold text-slate-800 md:text-[15px]">{line}</p>
                  </div>
                ))}
              </div>
              <div className="border-t border-violet-100 pt-3">
                <p className="text-sm font-semibold leading-relaxed text-violet-900 md:text-[15px]">
                  That is the standard you will practice next.
                </p>
              </div>
            </div>
          ),
        },
      ])
    }

    if (isObservationLesson) {
      return withIntro([
        {
          eyebrow: 'Your Flagged Answer',
          title: originalQuestion || example.question,
          preppi: 'We should start with the exact miss first, not generic advice.',
          content: (
            <div className="space-y-4">
              {safeOriginalAnswer ? (
                <div className="overflow-hidden rounded-2xl border border-rose-200 bg-rose-50/80 shadow-sm">
                  <div className="border-b border-rose-200 bg-rose-100/80 px-4 py-3">
                    <p className="text-xs font-bold uppercase tracking-wide text-rose-600">Your original answer</p>
                  </div>
                  <div className="px-4 py-4">
                    <p className="text-sm leading-relaxed text-rose-900 md:text-[15px]">&ldquo;{safeOriginalAnswer}&rdquo;</p>
                  </div>
                </div>
              ) : (
                <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4">
                  <p className="text-sm leading-relaxed text-slate-600 md:text-base">
                    We do not have a clean matching transcript excerpt for this flagged answer, so we will use the flagged question and rebuild the move from there.
                  </p>
                </div>
              )}
              <div className="space-y-1">
                <p className="text-xs font-bold uppercase tracking-wide text-amber-700">Why it got flagged</p>
                <p className="mt-2 text-sm leading-relaxed text-amber-900 md:text-[15px]">{whyMissed}</p>
              </div>
            </div>
          ),
        },
        {
          eyebrow: 'Question Type',
          title: 'What kind of question this is',
          preppi: 'This framework is for motivation and alignment questions, not background questions.',
          content: (
            <div className="space-y-4">
              <div className="grid gap-3">
                {[
                  'Why this role?',
                  'Why this company?',
                  'Why are you interested?',
                  'Why now?',
                  'Why are you interested in this position?',
                ].map((line) => (
                  <div key={line} className="border-l-2 border-violet-200 pl-4">
                    <p className="text-sm font-semibold text-slate-800 md:text-[15px]">{line}</p>
                  </div>
                ))}
              </div>
              <div className="border-t border-violet-100 pt-3">
                <p className="text-sm font-semibold leading-relaxed text-violet-900 md:text-[15px]">
                  Best use: role/company interest, alignment, why now.
                </p>
              </div>
            </div>
          ),
        },
        {
          eyebrow: 'Key Difference',
          title: 'This is different from Present, Past, Future',
          preppi: 'Start with your story for “Tell me about yourself.” Start with the opportunity for “Why this role?”',
          content: (
            <div className="space-y-4">
              <div className="grid gap-3 md:grid-cols-2">
                <div className="space-y-1">
                  <p className="text-xs font-bold uppercase tracking-wide text-sky-700">Present, Past, Future</p>
                  <p className="mt-2 text-sm leading-relaxed text-sky-900 md:text-[15px]">
                    Explains your background.
                  </p>
                </div>
                <div className="space-y-1">
                  <p className="text-xs font-bold uppercase tracking-wide text-amber-700">Observation, Fit, Timing</p>
                  <p className="mt-2 text-sm leading-relaxed text-amber-900 md:text-[15px]">
                    Explains why you want this opportunity.
                  </p>
                </div>
              </div>
              <div className="border-t border-slate-200 pt-4">
                <p className="text-sm leading-relaxed text-slate-700 md:text-[15px]">
                  Start with your story for “Tell me about yourself.” Start with the opportunity for “Why this role?” or “Why this company?”
                </p>
              </div>
              <div className="border-t border-violet-100 pt-3">
                <p className="text-sm font-semibold leading-relaxed text-violet-900 md:text-[15px]">That is the key difference.</p>
              </div>
            </div>
          ),
        },
        {
          eyebrow: 'Scoring Logic',
          title: 'What interviewers are actually listening for',
          preppi: 'They are not looking for enthusiasm alone. They are listening for logic.',
          content: (
            <div className="space-y-4">
              <div className="grid gap-3">
                {[
                  'what stood out to you',
                  'why it fits your background',
                  'why the timing makes sense now',
                ].map((line, index) => (
                  <div key={line} className="flex items-start gap-3 border-l-2 border-violet-200 pl-4">
                    <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-violet-100 text-xs font-black text-violet-700">{index + 1}</span>
                    <p className="text-sm font-semibold text-slate-800 md:text-[15px]">{line}</p>
                  </div>
                ))}
              </div>
              <div className="border-t border-violet-100 pt-3">
                <p className="text-sm font-semibold leading-relaxed text-violet-900 md:text-[15px]">
                  They are not looking for enthusiasm alone. They are listening for logic.
                </p>
              </div>
            </div>
          ),
        },
        {
          eyebrow: 'The Structure',
          title: 'The structure',
          preppi: 'This works best when each part is clear and specific.',
          content: (
            <div className="space-y-3">
              {frameworkRows.map(([key, value], index) => (
                <div key={key} className="flex items-start gap-3 rounded-2xl border border-slate-200 bg-slate-50/80 px-4 py-4">
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-violet-100 text-sm font-extrabold text-violet-700">
                    {index + 1}
                  </span>
                  <div className="min-w-0">
                    <p className="text-xs font-bold uppercase tracking-wide text-violet-600">{breakdownKeyLabel(key)}</p>
                    <p className="mt-1 text-sm leading-relaxed text-slate-700 md:text-[15px]">{value}</p>
                  </div>
                </div>
              ))}
            </div>
          ),
        },
        {
          eyebrow: 'Most Common Mistake',
          title: 'The most common mistake',
          preppi: 'Interest is not enough. The answer has to feel logical.',
          content: (
            <div className="space-y-4">
              <p className="text-sm leading-relaxed text-slate-600 md:text-base">
                Many answers sound interested, but not convincing.
              </p>
              <div className="grid gap-3">
                {[
                  'what specifically stood out',
                  'why it fits their background',
                  'why now makes sense',
                ].map((line) => (
                  <div key={line} className="border-l-2 border-violet-200 pl-4">
                    <p className="text-sm font-semibold text-slate-800 md:text-[15px]">{line}</p>
                  </div>
                ))}
              </div>
              <div className="space-y-1">
                <p className="text-sm font-semibold leading-relaxed text-amber-900 md:text-[15px]">
                  Interest is not enough. The answer has to feel logical.
                </p>
              </div>
            </div>
          ),
        },
        {
          eyebrow: 'Compare',
          title: 'Weak vs better vs strong',
          preppi: 'The middle tier matters here too. Structured is not the same thing as convincing.',
          content: (
            <div className="space-y-4">
              {[
                ['Weak', example.badAnswer, 'rose', 'Flattering and generic.'],
                ['Structured but weak', example.mediumAnswer || '', 'amber', 'The shape is there, but it still feels broad and unconvincing.'],
                ['Strong', example.goodAnswer, 'emerald', 'Specific, connected, and well-timed.'],
              ].map(([label, answer, tone, note]) => {
                const styles = tone === 'rose'
                  ? ['border-rose-200', 'bg-rose-50/70', 'border-rose-200 bg-rose-100/80', 'text-rose-600', 'text-rose-900']
                  : tone === 'amber'
                  ? ['border-amber-200', 'bg-amber-50/70', 'border-amber-200 bg-amber-100/80', 'text-amber-700', 'text-amber-900']
                  : ['border-emerald-200', 'bg-emerald-50/70', 'border-emerald-200 bg-emerald-100/80', 'text-emerald-600', 'text-emerald-900']
                return (
                  <div key={label} className={`overflow-hidden rounded-2xl border-2 ${styles[0]} ${styles[1]} shadow-sm`}>
                    <div className={`px-4 py-3 ${styles[2]}`}>
                      <span className={`text-xs font-bold uppercase tracking-wide ${styles[3]}`}>{label}</span>
                    </div>
                    <div className="space-y-3 px-4 py-4">
                      <p className={`text-base leading-relaxed ${styles[4]}`}>&ldquo;{answer}&rdquo;</p>
                      <p className="text-sm leading-relaxed text-slate-600">{note}</p>
                    </div>
                  </div>
                )
              })}
            </div>
          ),
        },
        {
          eyebrow: 'See It In Action',
          title: 'See the strong answer with the framework applied',
          preppi: 'Now the concept is laid onto the stronger answer itself. This is the proof of what each section is doing.',
          content: (
            <div className="space-y-4">
              <div className="border-t border-slate-200 pt-4">
                <div className="flex flex-wrap gap-2">
                  {example.annotatedStrongAnswer?.map((part, index) => {
                    const colors = annotationColors(part.label)
                    return (
                      <span
                        key={`${part.label}-pill-${index}`}
                        className={`inline-flex rounded-full px-2.5 py-1 text-[11px] font-black uppercase tracking-[0.14em] ${colors.chip}`}
                      >
                        {part.label}
                      </span>
                    )
                  })}
                </div>
                <p className="mt-4 text-base leading-relaxed text-slate-900">
                  &ldquo;
                  {example.annotatedStrongAnswer?.map((part, index) => {
                    const colors = annotationColors(part.label)
                    return (
                      <span key={`${part.label}-highlight-${index}`} className={`rounded px-1.5 py-0.5 ${colors.highlight}`}>
                        {part.text}
                        {index < (example.annotatedStrongAnswer?.length || 0) - 1 ? ' ' : ''}
                      </span>
                    )
                  })}
                  &rdquo;
                </p>
              </div>
              <div className="grid gap-3 md:grid-cols-3">
                {example.annotatedStrongAnswer?.map((part, index) => {
                  const colors = annotationColors(part.label)
                  return (
                    <div key={`${part.label}-detail-${index}`} className={`rounded-2xl border ${colors.border} bg-white px-4 py-4 shadow-sm`}>
                      <span className={`inline-flex rounded-full px-2.5 py-1 text-[11px] font-black uppercase tracking-[0.14em] ${colors.chip}`}>
                        {part.label}
                      </span>
                      <p className="mt-3 text-sm leading-relaxed text-slate-700 md:text-[15px]">{part.detail}</p>
                    </div>
                  )
                })}
              </div>
            </div>
          ),
        },
        {
          eyebrow: 'Self Check',
          title: 'Use this check before you answer again',
          preppi: 'This is the editing lens to keep in your head while you practice.',
          content: (
            <div className="space-y-4">
              <div className="grid gap-3">
                {[
                  'Did I point to something real?',
                  'Did I explain why it fits me?',
                  'Did I explain why now?',
                  'Does this sound specific, not flattering?',
                ].map((line) => (
                  <div key={line} className="border-l-2 border-violet-200 pl-4">
                    <p className="text-sm font-semibold text-slate-800 md:text-[15px]">{line}</p>
                  </div>
                ))}
              </div>
              <div className="border-t border-violet-100 pt-3">
                <p className="text-sm font-semibold leading-relaxed text-violet-900 md:text-[15px]">
                  That is the standard you will practice next.
                </p>
              </div>
            </div>
          ),
        },
      ])
    }

    if (isCareerAlignmentLesson) {
      return withIntro([
        {
          eyebrow: 'Your Flagged Answer',
          title: originalQuestion || example.question,
          preppi: 'Start with the exact answer that got flagged so the coaching stays anchored in the real miss.',
          content: (
            <div className="space-y-4">
              {safeOriginalAnswer ? (
                <div className="overflow-hidden rounded-2xl border border-rose-200 bg-rose-50/80 shadow-sm">
                  <div className="border-b border-rose-200 bg-rose-100/80 px-4 py-3">
                    <p className="text-xs font-bold uppercase tracking-wide text-rose-600">Your original answer</p>
                  </div>
                  <div className="px-4 py-4">
                    <p className="text-sm leading-relaxed text-rose-900 md:text-[15px]">&ldquo;{safeOriginalAnswer}&rdquo;</p>
                  </div>
                </div>
              ) : (
                <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4">
                  <p className="text-sm leading-relaxed text-slate-600 md:text-base">
                    We do not have a clean matching transcript excerpt for this flagged answer, so we will use the flagged question and rebuild the move from there.
                  </p>
                </div>
              )}
              <div className="space-y-1">
                <p className="text-xs font-bold uppercase tracking-wide text-amber-700">Why it got flagged</p>
                <p className="mt-2 text-sm leading-relaxed text-amber-900 md:text-[15px]">{whyMissed}</p>
              </div>
            </div>
          ),
        },
        {
          eyebrow: 'Alignment',
          title: 'What this answer was missing',
          preppi: 'The goal here is not just to sound interested. The move needs to make sense.',
          content: (
            <div className="space-y-4">
              <p className="text-sm leading-relaxed text-slate-700 md:text-[15px]">
                This answer needed a stronger sense of alignment.
              </p>
              <p className="text-sm leading-relaxed text-slate-700 md:text-[15px]">
                When you answer &ldquo;Why this role?&rdquo; the goal is not just to sound interested. The goal is to make the move feel logical and intentional.
              </p>
              <div className="border-t border-violet-100 pt-3">
                <p className="text-sm font-semibold leading-relaxed text-violet-900 md:text-[15px]">
                  Best use: &ldquo;Why this role?&rdquo; &ldquo;Why this position?&rdquo; &ldquo;What&apos;s prompting the move?&rdquo; &ldquo;Why now?&rdquo;
                </p>
              </div>
            </div>
          ),
        },
        {
          eyebrow: 'Scoring Logic',
          title: 'What interviewers are actually listening for',
          preppi: 'They are not just asking whether you want the role. They are asking whether the move makes sense.',
          content: (
            <div className="space-y-4">
              <TeachingList
                items={[
                  'specific interest',
                  'relevance to your background',
                  'clear timing',
                  'a logical next step',
                ]}
              />
              <div className="border-t border-violet-100 pt-3">
                <p className="text-sm font-semibold leading-relaxed text-violet-900 md:text-[15px]">
                  They are not just asking whether you want the role. They are asking whether the move makes sense.
                </p>
              </div>
            </div>
          ),
        },
        {
          eyebrow: 'Generic Interest',
          title: 'Weak alignment usually sounds generic',
          preppi: 'Positive language is not enough if it could apply to almost any job.',
          content: (
            <div className="space-y-4">
              <TeachingList
                items={[
                  '“It seems like a great opportunity.”',
                  '“I’m ready for a new challenge.”',
                  '“I want to use my skills in a new role.”',
                ]}
              />
              <div className="border-t border-violet-100 pt-3">
                <p className="text-sm font-semibold leading-relaxed text-violet-900 md:text-[15px]">
                  Generic interest is not enough.
                </p>
              </div>
            </div>
          ),
        },
        {
          eyebrow: 'Connection',
          title: 'Strong alignment connects the role to your background',
          preppi: 'A stronger answer should make the fit feel natural, not aspirational.',
          content: (
            <div className="space-y-4">
              <TeachingList
                items={[
                  'what part of the role stands out',
                  'how it fits the work you have been doing',
                  'why that makes this move feel natural',
                ]}
              />
              <div className="border-t border-violet-100 pt-3">
                <p className="text-sm font-semibold leading-relaxed text-violet-900 md:text-[15px]">
                  The role should connect to your direction, not just your desire for change.
                </p>
              </div>
            </div>
          ),
        },
        {
          eyebrow: 'Timing',
          title: 'Timing should sound intentional',
          preppi: 'This is one of the easiest places for the answer to slip back into generic job-seeking.',
          content: (
            <ContrastText
              weakLabel="Weak timing"
              weakText="I’m ready for something new."
              strongLabel="Stronger timing"
              strongText="The timing makes sense because I’m looking for a role where this kind of work is more central to what I do."
            />
          ),
        },
        {
          eyebrow: 'Specificity',
          title: 'Do not sound like you would take anything',
          preppi: 'If the answer could work in every interview, it does not sound aligned yet.',
          content: (
            <div className="space-y-4">
              <p className="text-sm leading-relaxed text-slate-700 md:text-[15px]">
                A weak answer can make your interest sound broad or unfocused.
              </p>
              <p className="text-sm leading-relaxed text-slate-700 md:text-[15px]">
                If your answer could apply to almost any role, it does not sound aligned yet.
              </p>
              <div className="border-t border-violet-100 pt-3">
                <p className="text-sm font-semibold leading-relaxed text-violet-900 md:text-[15px]">
                  A strong answer should feel specific enough that it could not be copied into every interview.
                </p>
              </div>
            </div>
          ),
        },
        {
          eyebrow: 'Landing',
          title: 'Strong answers land on a clear next step',
          preppi: 'By the end, the interviewer should understand why this move is coherent.',
          content: (
            <div className="space-y-4">
              <TeachingList
                items={[
                  'why this role fits your background',
                  'why it stands out to you',
                  'why this move makes sense now',
                ]}
              />
              <div className="border-t border-violet-100 pt-3">
                <p className="text-sm font-semibold leading-relaxed text-violet-900 md:text-[15px]">
                  The goal is to make the next step feel coherent.
                </p>
              </div>
            </div>
          ),
        },
        {
          eyebrow: 'Self Check',
          title: 'Use this check before you answer again',
          preppi: 'This is the editing lens to keep in your head while you practice.',
          content: (
            <div className="space-y-4">
              <TeachingList
                items={[
                  'Did I say what specifically interests me here?',
                  'Did I connect it to my background?',
                  'Did I explain why this move makes sense now?',
                  'Does this sound intentional, not generic?',
                ]}
              />
              <div className="border-t border-violet-100 pt-3">
                <p className="text-sm font-semibold leading-relaxed text-violet-900 md:text-[15px]">
                  That is the standard you will practice next.
                </p>
              </div>
            </div>
          ),
        },
      ])
    }

    if (isPaceAndFlowLesson) {
      return withIntro([
        {
          eyebrow: 'Your Flagged Answer',
          title: originalQuestion || example.question,
          preppi: 'Start with the flagged moment so the coaching stays tied to the real interaction, not abstract speaking advice.',
          content: (
            <div className="space-y-4">
              {safeOriginalAnswer ? (
                <div className="overflow-hidden rounded-2xl border border-rose-200 bg-rose-50/80 shadow-sm">
                  <div className="border-b border-rose-200 bg-rose-100/80 px-4 py-3">
                    <p className="text-xs font-bold uppercase tracking-wide text-rose-600">Your original answer</p>
                  </div>
                  <div className="px-4 py-4">
                    <p className="text-sm leading-relaxed text-rose-900 md:text-[15px]">&ldquo;{safeOriginalAnswer}&rdquo;</p>
                  </div>
                </div>
              ) : (
                <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4">
                  <p className="text-sm leading-relaxed text-slate-600 md:text-base">
                    We do not have a clean matching transcript excerpt for this flagged answer, so we will use the flagged question and rebuild the interaction from there.
                  </p>
                </div>
              )}
              <div className="space-y-1">
                <p className="text-xs font-bold uppercase tracking-wide text-amber-700">Why it got flagged</p>
                <p className="mt-2 text-sm leading-relaxed text-amber-900 md:text-[15px]">{whyMissed}</p>
              </div>
            </div>
          ),
        },
        {
          eyebrow: 'Conversation Quality',
          title: 'What this answer was missing',
          preppi: 'This is about interview rhythm, not just answer content.',
          content: (
            <div className="space-y-4">
              <p className="text-sm leading-relaxed text-slate-700 md:text-[15px]">
                This answer needed better pace and flow.
              </p>
              <p className="text-sm leading-relaxed text-slate-700 md:text-[15px]">
                Even strong content can feel awkward if the conversation has long silences, interruptions, rushed answers, or abrupt transitions.
              </p>
              <div className="border-t border-violet-100 pt-3">
                <p className="text-sm font-semibold leading-relaxed text-violet-900 md:text-[15px]">
                  This lesson helps your interview sound more natural and easier to follow.
                </p>
              </div>
            </div>
          ),
        },
        {
          eyebrow: 'Scoring Logic',
          title: 'What interviewers are actually listening for',
          preppi: 'They are not just listening for good answers. They are also noticing how the interaction feels.',
          content: (
            <div className="space-y-4">
              <TeachingList
                items={[
                  'natural',
                  'attentive',
                  'easy to follow',
                  'conversational',
                ]}
              />
              <div className="border-t border-violet-100 pt-3">
                <p className="text-sm font-semibold leading-relaxed text-violet-900 md:text-[15px]">
                  They are not just listening for good answers. They are also noticing how the interaction feels.
                </p>
              </div>
            </div>
          ),
        },
        {
          eyebrow: 'Pauses',
          title: 'Short pauses are fine',
          preppi: 'Not every pause is a problem.',
          content: (
            <div className="space-y-4">
              <p className="text-sm leading-relaxed text-slate-700 md:text-[15px]">
                A short pause to think is normal.
              </p>
              <p className="text-sm leading-relaxed text-slate-700 md:text-[15px]">
                In many interviews, a brief pause sounds more thoughtful than jumping in too fast.
              </p>
              <div className="border-t border-violet-100 pt-3">
                <p className="text-sm font-semibold leading-relaxed text-violet-900 md:text-[15px]">
                  Not every pause is a problem.
                </p>
              </div>
            </div>
          ),
        },
        {
          eyebrow: 'Dead Air',
          title: 'Long silence changes the energy',
          preppi: 'A thoughtful pause is fine. A long dead-air pause changes the tone.',
          content: (
            <div className="space-y-4">
              <p className="text-sm leading-relaxed text-slate-700 md:text-[15px]">
                If the pause stretches too long, the conversation can start to feel stalled or uncertain.
              </p>
              <p className="text-sm leading-relaxed text-slate-700 md:text-[15px]">
                That makes it harder for the interview to keep a natural rhythm.
              </p>
              <div className="border-t border-violet-100 pt-3">
                <p className="text-sm font-semibold leading-relaxed text-violet-900 md:text-[15px]">
                  A thoughtful pause is fine. A long dead-air pause changes the tone.
                </p>
              </div>
            </div>
          ),
        },
        {
          eyebrow: 'Pacing',
          title: 'Do not rush the answer',
          preppi: 'Fast is not the same as strong.',
          content: (
            <div className="space-y-4">
              <p className="text-sm leading-relaxed text-slate-700 md:text-[15px]">
                Rushed answers often sound nervous or over-rehearsed.
              </p>
              <p className="text-sm leading-relaxed text-slate-700 md:text-[15px]">
                A strong pace gives the interviewer time to follow your point and makes you sound more settled.
              </p>
              <div className="border-t border-violet-100 pt-3">
                <p className="text-sm font-semibold leading-relaxed text-violet-900 md:text-[15px]">
                  Fast is not the same as strong.
                </p>
              </div>
            </div>
          ),
        },
        {
          eyebrow: 'Turn Taking',
          title: 'Let the interviewer finish',
          preppi: 'Good timing shows attentiveness.',
          content: (
            <div className="space-y-4">
              <p className="text-sm leading-relaxed text-slate-700 md:text-[15px]">
                Interrupting can break the flow of the conversation, even if you are trying to sound enthusiastic.
              </p>
              <p className="text-sm leading-relaxed text-slate-700 md:text-[15px]">
                Wait until the interviewer finishes the question before you begin.
              </p>
              <div className="border-t border-violet-100 pt-3">
                <p className="text-sm font-semibold leading-relaxed text-violet-900 md:text-[15px]">
                  Good timing shows attentiveness.
                </p>
              </div>
            </div>
          ),
        },
        {
          eyebrow: 'Transitions',
          title: 'Use simple transitions',
          preppi: 'Transitions help the conversation move smoothly.',
          content: (
            <div className="space-y-4">
              <TeachingList
                items={[
                  '“The main thing I’d say is…”',
                  '“What stands out most is…”',
                  '“A good example of that is…”',
                  '“The reason I mention that is…”',
                ]}
              />
              <div className="border-t border-violet-100 pt-3">
                <p className="text-sm font-semibold leading-relaxed text-violet-900 md:text-[15px]">
                  Transitions help the conversation move smoothly.
                </p>
              </div>
            </div>
          ),
        },
        {
          eyebrow: 'Back And Forth',
          title: 'Good interviews feel like back-and-forth',
          preppi: 'The goal is not just to respond. The goal is to interact well.',
          content: (
            <div className="space-y-4">
              <TeachingList
                items={[
                  'an interrogation',
                  'a speech',
                  'a race to answer',
                ]}
              />
              <p className="text-sm leading-relaxed text-slate-700 md:text-[15px]">
                A strong interview should not feel like any of those. It should feel like a real conversation with clear back-and-forth.
              </p>
              <div className="border-t border-violet-100 pt-3">
                <p className="text-sm font-semibold leading-relaxed text-violet-900 md:text-[15px]">
                  The goal is not just to respond. The goal is to interact well.
                </p>
              </div>
            </div>
          ),
        },
        {
          eyebrow: 'Self Check',
          title: 'Use this check before you answer again',
          preppi: 'This is the editing lens to keep in your head while you practice.',
          content: (
            <div className="space-y-4">
              <TeachingList
                items={[
                  'Did I pause naturally without disappearing?',
                  'Did I avoid rushing?',
                  'Did I let the interviewer finish?',
                  'Did my answer sound conversational?',
                  'Did the exchange feel like back-and-forth?',
                ]}
              />
              <div className="border-t border-violet-100 pt-3">
                <p className="text-sm font-semibold leading-relaxed text-violet-900 md:text-[15px]">
                  That is the standard you will practice next.
                </p>
              </div>
            </div>
          ),
        },
      ])
    }

    if (isAnswerReasonExampleLesson) {
      return withIntro([
        {
          eyebrow: 'Your Flagged Answer',
          title: originalQuestion || example.question,
          preppi: 'We should start with the exact miss first, not generic advice.',
          content: (
            <div className="space-y-4">
              {safeOriginalAnswer ? (
                <div className="overflow-hidden rounded-2xl border border-rose-200 bg-rose-50/80 shadow-sm">
                  <div className="border-b border-rose-200 bg-rose-100/80 px-4 py-3">
                    <p className="text-xs font-bold uppercase tracking-wide text-rose-600">Your original answer</p>
                  </div>
                  <div className="px-4 py-4">
                    <p className="text-sm leading-relaxed text-rose-900 md:text-[15px]">&ldquo;{safeOriginalAnswer}&rdquo;</p>
                  </div>
                </div>
              ) : (
                <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4">
                  <p className="text-sm leading-relaxed text-slate-600 md:text-base">
                    We do not have a clean matching transcript excerpt for this flagged answer, so we will use the flagged question and rebuild the move from there.
                  </p>
                </div>
              )}
              <div className="space-y-1">
                <p className="text-xs font-bold uppercase tracking-wide text-amber-700">Why it got flagged</p>
                <p className="mt-2 text-sm leading-relaxed text-amber-900 md:text-[15px]">{whyMissed}</p>
              </div>
            </div>
          ),
        },
        {
          eyebrow: 'Question Type',
          title: 'What kind of question this is',
          preppi: 'This framework is for judgment, preference, and approach questions that do not need a full story.',
          content: (
            <div className="space-y-4">
              <div className="grid gap-3">
                {[
                  'What are your salary expectations?',
                  'What’s your availability or start date?',
                  'Are you open to travel or relocation?',
                  'Do you require sponsorship?',
                  'What do you know about our company?',
                ].map((line) => (
                  <div key={line} className="border-l-2 border-violet-200 pl-4">
                    <p className="text-sm font-semibold text-slate-800 md:text-[15px]">{line}</p>
                  </div>
                ))}
              </div>
              <div className="border-t border-violet-100 pt-3">
                <p className="text-sm font-semibold leading-relaxed text-violet-900 md:text-[15px]">
                  Best use: direct, concise, recruiter-style answers where a full story would be too much.
                </p>
              </div>
            </div>
          ),
        },
        {
          eyebrow: 'Key Difference',
          title: 'This is different from STAR',
          preppi: 'If the question does not need a full story, do not force one.',
          content: (
            <div className="space-y-4">
              <div className="grid gap-3 md:grid-cols-2">
                <div className="border-t border-violet-100 pt-3">
                  <p className="text-xs font-bold uppercase tracking-wide text-violet-700">STAR</p>
                  <p className="mt-2 text-sm leading-relaxed text-violet-900 md:text-[15px]">
                    Use this when the question asks for a specific story.
                  </p>
                </div>
                <div className="space-y-1">
                  <p className="text-xs font-bold uppercase tracking-wide text-sky-700">Answer / Reason / Example</p>
                  <p className="mt-2 text-sm leading-relaxed text-sky-900 md:text-[15px]">
                    Use this when the question asks what you think, prefer, or usually do.
                  </p>
                </div>
              </div>
              <div className="border-t border-violet-100 pt-3">
                <p className="text-sm font-semibold leading-relaxed text-violet-900 md:text-[15px]">
                  If the question does not need a full story, do not force one.
                </p>
              </div>
            </div>
          ),
        },
        {
          eyebrow: 'Scoring Logic',
          title: 'What interviewers are actually listening for',
          preppi: 'They are not looking for a long explanation. They are looking for clear thinking.',
          content: (
            <div className="space-y-4">
              <div className="grid gap-3">
                {[
                  'your answer',
                  'your logic',
                  'your proof',
                ].map((line, index) => (
                  <div key={line} className="flex items-start gap-3 border-l-2 border-violet-200 pl-4">
                    <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-violet-100 text-xs font-black text-violet-700">{index + 1}</span>
                    <p className="text-sm font-semibold text-slate-800 md:text-[15px]">{line}</p>
                  </div>
                ))}
              </div>
              <div className="border-t border-violet-100 pt-3">
                <p className="text-sm font-semibold leading-relaxed text-violet-900 md:text-[15px]">
                  They are not looking for a long explanation. They are looking for clear thinking.
                </p>
              </div>
            </div>
          ),
        },
        {
          eyebrow: 'The Structure',
          title: 'The structure',
          preppi: 'Direct first. Then support it.',
          content: (
            <div className="space-y-3">
              {frameworkRows.map(([key, value], index) => (
                <div key={key} className="flex items-start gap-3 rounded-2xl border border-slate-200 bg-slate-50/80 px-4 py-4">
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-violet-100 text-sm font-extrabold text-violet-700">
                    {index + 1}
                  </span>
                  <div className="min-w-0">
                    <p className="text-xs font-bold uppercase tracking-wide text-violet-600">{breakdownKeyLabel(key)}</p>
                    <p className="mt-1 text-sm leading-relaxed text-slate-700 md:text-[15px]">{value}</p>
                  </div>
                </div>
              ))}
              <div className="border-t border-violet-100 pt-3">
                <p className="text-sm font-semibold leading-relaxed text-violet-900 md:text-[15px]">Direct first. Then support it.</p>
              </div>
            </div>
          ),
        },
        {
          eyebrow: 'Compare',
          title: 'Weak vs better vs strong',
          preppi: 'The middle tier matters here too. Structured is not the same thing as convincing.',
          content: (
            <div className="space-y-4">
              {[
                ['Weak', example.badAnswer, 'rose', 'Vague and indirect.'],
                ['Structured but weak', example.mediumAnswer || '', 'amber', 'The shape is there, but it still sounds broad.'],
                ['Strong', example.goodAnswer, 'emerald', 'Direct, explained, and supported.'],
              ].map(([label, answer, tone, note]) => {
                const styles = tone === 'rose'
                  ? ['border-rose-200', 'bg-rose-50/70', 'border-rose-200 bg-rose-100/80', 'text-rose-600', 'text-rose-900']
                  : tone === 'amber'
                  ? ['border-amber-200', 'bg-amber-50/70', 'border-amber-200 bg-amber-100/80', 'text-amber-700', 'text-amber-900']
                  : ['border-emerald-200', 'bg-emerald-50/70', 'border-emerald-200 bg-emerald-100/80', 'text-emerald-600', 'text-emerald-900']
                return (
                  <div key={label} className={`overflow-hidden rounded-2xl border-2 ${styles[0]} ${styles[1]} shadow-sm`}>
                    <div className={`px-4 py-3 ${styles[2]}`}>
                      <span className={`text-xs font-bold uppercase tracking-wide ${styles[3]}`}>{label}</span>
                    </div>
                    <div className="space-y-3 px-4 py-4">
                      <p className={`text-base leading-relaxed ${styles[4]}`}>&ldquo;{answer}&rdquo;</p>
                      <p className="text-sm leading-relaxed text-slate-600">{note}</p>
                    </div>
                  </div>
                )
              })}
            </div>
          ),
        },
        {
          eyebrow: 'See It In Action',
          title: 'See the strong answer with the framework applied',
          preppi: 'Now the concept is laid onto the stronger answer itself. This is the proof of what each section is doing.',
          content: (
            <div className="space-y-4">
              <div className="border-t border-slate-200 pt-4">
                <div className="flex flex-wrap gap-2">
                  {example.annotatedStrongAnswer?.map((part, index) => {
                    const colors = annotationColors(part.label)
                    return (
                      <span key={`${part.label}-pill-${index}`} className={`inline-flex rounded-full px-2.5 py-1 text-[11px] font-black uppercase tracking-[0.14em] ${colors.chip}`}>
                        {part.label}
                      </span>
                    )
                  })}
                </div>
                <p className="mt-4 text-base leading-relaxed text-slate-900">
                  &ldquo;
                  {example.annotatedStrongAnswer?.map((part, index) => {
                    const colors = annotationColors(part.label)
                    return (
                      <span key={`${part.label}-highlight-${index}`} className={`rounded px-1.5 py-0.5 ${colors.highlight}`}>
                        {part.text}
                        {index < (example.annotatedStrongAnswer?.length || 0) - 1 ? ' ' : ''}
                      </span>
                    )
                  })}
                  &rdquo;
                </p>
              </div>
              <div className="grid gap-3 md:grid-cols-3">
                {example.annotatedStrongAnswer?.map((part, index) => {
                  const colors = annotationColors(part.label)
                  return (
                    <div key={`${part.label}-detail-${index}`} className={`rounded-2xl border ${colors.border} bg-white px-4 py-4 shadow-sm`}>
                      <span className={`inline-flex rounded-full px-2.5 py-1 text-[11px] font-black uppercase tracking-[0.14em] ${colors.chip}`}>
                        {part.label}
                      </span>
                      <p className="mt-3 text-sm leading-relaxed text-slate-700 md:text-[15px]">{part.detail}</p>
                    </div>
                  )
                })}
              </div>
            </div>
          ),
        },
        {
          eyebrow: 'Self Check',
          title: 'Use this check before you answer again',
          preppi: 'This is the editing lens to keep in your head while you practice.',
          content: (
            <div className="space-y-4">
              <div className="grid gap-3">
                {[
                  'Did I answer the question directly?',
                  'Did I explain why?',
                  'Did I give a short proof or example?',
                  'Does this sound clear, not rambling?',
                ].map((line) => (
                  <div key={line} className="border-l-2 border-violet-200 pl-4">
                    <p className="text-sm font-semibold text-slate-800 md:text-[15px]">{line}</p>
                  </div>
                ))}
              </div>
              <div className="border-t border-violet-100 pt-3">
                <p className="text-sm font-semibold leading-relaxed text-violet-900 md:text-[15px]">
                  That is the standard you will practice next.
                </p>
              </div>
            </div>
          ),
        },
      ])
    }

    if (isClaimExampleDetailImpactLesson) {
      return withIntro([
        {
          eyebrow: 'Your Flagged Answer',
          title: originalQuestion || example.question,
          preppi: 'We should start with the exact miss first, not generic advice.',
          content: (
            <div className="space-y-4">
              {safeOriginalAnswer ? (
                <div className="overflow-hidden rounded-2xl border border-rose-200 bg-rose-50/80 shadow-sm">
                  <div className="border-b border-rose-200 bg-rose-100/80 px-4 py-3">
                    <p className="text-xs font-bold uppercase tracking-wide text-rose-600">Your original answer</p>
                  </div>
                  <div className="px-4 py-4">
                    <p className="text-sm leading-relaxed text-rose-900 md:text-[15px]">&ldquo;{safeOriginalAnswer}&rdquo;</p>
                  </div>
                </div>
              ) : (
                <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4">
                  <p className="text-sm leading-relaxed text-slate-600 md:text-base">
                    We do not have a clean matching transcript excerpt for this flagged answer, so we will use the flagged question and rebuild the move from there.
                  </p>
                </div>
              )}
              <div className="space-y-1">
                <p className="text-xs font-bold uppercase tracking-wide text-amber-700">Why it got flagged</p>
                <p className="mt-2 text-sm leading-relaxed text-amber-900 md:text-[15px]">{whyMissed}</p>
              </div>
            </div>
          ),
        },
        {
          eyebrow: 'Missing Piece',
          title: 'What this answer was missing',
          preppi: 'This module fixes weak proof, not weak structure.',
          content: (
            <div className="space-y-4">
              <div className="rounded-2xl border border-slate-200 bg-slate-50/80 px-4 py-4">
                <p className="text-sm leading-relaxed text-slate-700 md:text-[15px]">
                  This answer made a point, but it did not prove it strongly enough. When you describe a strength, skill, or work style, the interviewer needs evidence that feels real and believable.
                </p>
              </div>
              <div className="border-t border-violet-100 pt-3">
                <p className="text-sm font-semibold leading-relaxed text-violet-900 md:text-[15px]">
                  This module helps you move from claim to proof.
                </p>
              </div>
            </div>
          ),
        },
        {
          eyebrow: 'Scoring Logic',
          title: 'What strong proof does differently',
          preppi: 'The goal is not more words. The goal is more believable proof.',
          content: (
            <div className="space-y-4">
              <div className="grid gap-3">
                {[
                  'makes a clear claim',
                  'uses a real example',
                  'adds concrete detail',
                  'shows what the example proves',
                ].map((line, index) => (
                  <div key={line} className="flex items-start gap-3 border-l-2 border-violet-200 pl-4">
                    <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-violet-100 text-xs font-black text-violet-700">{index + 1}</span>
                    <p className="text-sm font-semibold text-slate-800 md:text-[15px]">{line}</p>
                  </div>
                ))}
              </div>
              <div className="border-t border-violet-100 pt-3">
                <p className="text-sm font-semibold leading-relaxed text-violet-900 md:text-[15px]">
                  The goal is not more words. The goal is more believable proof.
                </p>
              </div>
            </div>
          ),
        },
        {
          eyebrow: 'Compare',
          title: 'Weak vs better vs strong',
          preppi: 'This is where the difference becomes obvious.',
          content: (
            <div className="space-y-4">
              {[
                ['Weak', example.badAnswer, 'rose', 'This makes a claim and leaves it unsupported.'],
                ['Better but still weak', example.mediumAnswer || '', 'amber', 'There is some shape, but the proof is still too broad.'],
                ['Strong', example.goodAnswer, 'emerald', 'This gives real proof, concrete detail, and a clear takeaway.'],
              ].map(([label, answer, tone, note]) => {
                const styles = tone === 'rose'
                  ? ['border-rose-200', 'bg-rose-50/70', 'border-rose-200 bg-rose-100/80', 'text-rose-600', 'text-rose-900']
                  : tone === 'amber'
                    ? ['border-amber-200', 'bg-amber-50/70', 'border-amber-200 bg-amber-100/80', 'text-amber-700', 'text-amber-900']
                    : ['border-emerald-200', 'bg-emerald-50/70', 'border-emerald-200 bg-emerald-100/80', 'text-emerald-600', 'text-emerald-900']
                return (
                  <div key={label} className={`overflow-hidden rounded-2xl border-2 ${styles[0]} ${styles[1]} shadow-sm`}>
                    <div className={`px-4 py-3 ${styles[2]}`}>
                      <span className={`text-xs font-bold uppercase tracking-wide ${styles[3]}`}>{label}</span>
                    </div>
                    <div className="space-y-3 px-4 py-4">
                      <p className={`text-base leading-relaxed ${styles[4]}`}>&ldquo;{answer}&rdquo;</p>
                      <p className="text-sm leading-relaxed text-slate-600">{note}</p>
                    </div>
                  </div>
                )
              })}
            </div>
          ),
        },
        {
          eyebrow: 'Core Principle',
          title: 'A claim is not proof',
          preppi: 'This needs to be said plainly.',
          content: (
            <div className="space-y-4">
              <div className="grid gap-3">
                {[
                  'I am organized.',
                  'I am proactive.',
                  'I am good under pressure.',
                ].map((line) => (
                  <div key={line} className="border-l-2 border-violet-200 pl-4">
                    <p className="text-sm font-semibold text-slate-800 md:text-[15px]">{line}</p>
                  </div>
                ))}
              </div>
              <div className="border-t border-violet-100 pt-3">
                <p className="text-sm font-semibold leading-relaxed text-violet-900 md:text-[15px]">
                  Those are claims. The interviewer still needs a reason to believe them.
                </p>
              </div>
            </div>
          ),
        },
        {
          eyebrow: 'Core Principle',
          title: 'Use a real example',
          preppi: 'Real examples are easier to trust than broad summaries.',
          content: (
            <div className="space-y-4">
              <div className="grid gap-3 md:grid-cols-2">
                <div className="space-y-1">
                  <p className="text-xs font-bold uppercase tracking-wide text-rose-700">Weak proof</p>
                  <p className="mt-2 text-sm leading-relaxed text-rose-900 md:text-[15px]">
                    “I have done that in different roles.”
                  </p>
                </div>
                <div className="space-y-1">
                  <p className="text-xs font-bold uppercase tracking-wide text-emerald-700">Stronger proof</p>
                  <p className="mt-2 text-sm leading-relaxed text-emerald-900 md:text-[15px]">
                    “In my last role, I handled scheduling changes during a busy launch week.”
                  </p>
                </div>
              </div>
              <div className="border-t border-violet-100 pt-3">
                <p className="text-sm font-semibold leading-relaxed text-violet-900 md:text-[15px]">
                  The best proof comes from a real moment or a clear pattern of work.
                </p>
              </div>
            </div>
          ),
        },
        {
          eyebrow: 'Core Principle',
          title: 'Concrete detail makes proof believable',
          preppi: 'Specifics make the answer credible.',
          content: (
            <div className="space-y-4">
              <div className="grid gap-3">
                {[
                  'what was happening',
                  'what made it difficult',
                  'what you handled',
                  'what you did',
                ].map((line) => (
                  <div key={line} className="border-l-2 border-violet-200 pl-4">
                    <p className="text-sm font-semibold text-slate-800 md:text-[15px]">{line}</p>
                  </div>
                ))}
              </div>
              <div className="border-t border-violet-100 pt-3">
                <p className="text-sm font-semibold leading-relaxed text-violet-900 md:text-[15px]">
                  You do not need a huge story. You need enough detail to make the example feel true.
                </p>
              </div>
            </div>
          ),
        },
        {
          eyebrow: 'Core Principle',
          title: 'You do not need a long story',
          preppi: 'Aim for concrete, not long.',
          content: (
            <div className="space-y-4">
              <div className="rounded-2xl border border-slate-200 bg-slate-50/80 px-4 py-4">
                <p className="text-sm leading-relaxed text-slate-700 md:text-[15px]">
                  More detail is not always better. You only need enough detail to make the example believable and relevant.
                </p>
              </div>
              <div className="border-t border-violet-100 pt-3">
                <p className="text-sm font-semibold leading-relaxed text-violet-900 md:text-[15px]">
                  Enough detail to trust you. Not so much detail that the answer loses shape.
                </p>
              </div>
            </div>
          ),
        },
        {
          eyebrow: 'Core Principle',
          title: 'End by showing what the example proves',
          preppi: 'Do not just tell the example and stop.',
          content: (
            <div className="space-y-4">
              <div className="grid gap-3 md:grid-cols-2">
                <div className="space-y-1">
                  <p className="text-xs font-bold uppercase tracking-wide text-rose-700">Weak ending</p>
                  <p className="mt-2 text-sm leading-relaxed text-rose-900 md:text-[15px]">
                    “That was a valuable experience.”
                  </p>
                </div>
                <div className="space-y-1">
                  <p className="text-xs font-bold uppercase tracking-wide text-emerald-700">Stronger ending</p>
                  <p className="mt-2 text-sm leading-relaxed text-emerald-900 md:text-[15px]">
                    “That is a good example of how I create structure when priorities start shifting.”
                  </p>
                </div>
              </div>
              <div className="border-t border-violet-100 pt-3">
                <p className="text-sm font-semibold leading-relaxed text-violet-900 md:text-[15px]">
                  Make clear what the example shows and why it supports the claim you made.
                </p>
              </div>
            </div>
          ),
        },
        {
          eyebrow: 'Self Check',
          title: 'Use this check before you answer again',
          preppi: 'This is the standard you will practice next.',
          content: (
            <div className="space-y-4">
              <div className="grid gap-3">
                {[
                  'Did I make a clear claim?',
                  'Did I give a real example?',
                  'Did I add a concrete detail?',
                  'Did I explain what that example shows?',
                ].map((line) => (
                  <div key={line} className="border-l-2 border-violet-200 pl-4">
                    <p className="text-sm font-semibold text-slate-800 md:text-[15px]">{line}</p>
                  </div>
                ))}
              </div>
              <div className="border-t border-violet-100 pt-3">
                <p className="text-sm font-semibold leading-relaxed text-violet-900 md:text-[15px]">
                  That is the standard you will practice next.
                </p>
              </div>
            </div>
          ),
        },
      ])
    }

    if (isCompanyKnowledgeLesson) {
      return withIntro([
        {
          eyebrow: 'Your Flagged Answer',
          title: originalQuestion || example.question,
          preppi: 'We should start with the exact miss first, not generic advice.',
          content: (
            <div className="space-y-4">
              {safeOriginalAnswer ? (
                <div className="overflow-hidden rounded-2xl border border-rose-200 bg-rose-50/80 shadow-sm">
                  <div className="border-b border-rose-200 bg-rose-100/80 px-4 py-3">
                    <p className="text-xs font-bold uppercase tracking-wide text-rose-600">Your original answer</p>
                  </div>
                  <div className="px-4 py-4">
                    <p className="text-sm leading-relaxed text-rose-900 md:text-[15px]">&ldquo;{safeOriginalAnswer}&rdquo;</p>
                  </div>
                </div>
              ) : (
                <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4">
                  <p className="text-sm leading-relaxed text-slate-600 md:text-base">
                    We do not have a clean matching transcript excerpt for this flagged answer, so we will use the flagged question and rebuild the move from there.
                  </p>
                </div>
              )}
              <div className="space-y-1">
                <p className="text-xs font-bold uppercase tracking-wide text-amber-700">Why it got flagged</p>
                <p className="mt-2 text-sm leading-relaxed text-amber-900 md:text-[15px]">{whyMissed}</p>
              </div>
            </div>
          ),
        },
        {
          eyebrow: 'Lesson Focus',
          title: 'What this lesson is about',
          preppi: 'This lesson is about preparation, not perfect recall.',
          content: (
            <div className="space-y-4">
              <div className="rounded-2xl border border-slate-200 bg-slate-50/80 px-4 py-4">
                <p className="text-sm leading-relaxed text-slate-700 md:text-[15px]">
                  This lesson helps you answer company knowledge questions more credibly. In an HR screen, the interviewer is usually checking whether you did basic homework and whether your interest feels real.
                </p>
              </div>
              <div className="border-t border-violet-100 pt-3">
                <p className="text-sm font-semibold leading-relaxed text-violet-900 md:text-[15px]">
                  Best use: “What do you know about our company?” “What stood out to you?” “Why this company?”
                </p>
              </div>
            </div>
          ),
        },
        {
          eyebrow: 'Core Principle',
          title: 'What “enough research” usually looks like',
          preppi: 'You do not need deep research. You do need the basics.',
          content: (
            <div className="space-y-4">
              <div className="grid gap-3">
                {[
                  'what the company does',
                  'who it serves',
                  'one thing that stood out to you',
                ].map((line) => (
                  <div key={line} className="border-l-2 border-violet-200 pl-4">
                    <p className="text-sm font-semibold text-slate-800 md:text-[15px]">{line}</p>
                  </div>
                ))}
              </div>
              <div className="border-t border-violet-100 pt-3">
                <p className="text-sm font-semibold leading-relaxed text-violet-900 md:text-[15px]">
                  Before an HR screen, that is usually enough.
                </p>
              </div>
            </div>
          ),
        },
        {
          eyebrow: 'Core Principle',
          title: 'Generic praise is weak',
          preppi: 'Flattery is not research.',
          content: (
            <div className="space-y-4">
              <div className="space-y-1">
                <p className="text-xs font-bold uppercase tracking-wide text-rose-700">Weak answer</p>
                <p className="mt-2 text-sm leading-relaxed text-rose-900 md:text-[15px]">
                  “You seem like a great company with a strong reputation.”
                </p>
              </div>
              <div className="border-t border-violet-100 pt-3">
                <p className="text-sm font-semibold leading-relaxed text-violet-900 md:text-[15px]">
                  That sounds positive, but it does not show real preparation.
                </p>
              </div>
            </div>
          ),
        },
        {
          eyebrow: 'Core Principle',
          title: 'Say something real',
          preppi: 'A strong answer includes something real and specific.',
          content: (
            <div className="space-y-4">
              <div className="space-y-1">
                <p className="text-xs font-bold uppercase tracking-wide text-emerald-700">Stronger answer</p>
                <p className="mt-2 text-sm leading-relaxed text-emerald-900 md:text-[15px]">
                  “From what I saw, the company works with [customer type] and seems focused on [product, service, or business area].”
                </p>
              </div>
            </div>
          ),
        },
        {
          eyebrow: 'Core Principle',
          title: 'Do not stop at the fact',
          preppi: 'Say what you noticed, then say why it matters.',
          content: (
            <div className="space-y-4">
              <div className="grid gap-3 md:grid-cols-2">
                <div className="space-y-1">
                  <p className="text-xs font-bold uppercase tracking-wide text-rose-700">Not enough</p>
                  <p className="mt-2 text-sm leading-relaxed text-rose-900 md:text-[15px]">
                    “I saw the company is growing.”
                  </p>
                </div>
                <div className="space-y-1">
                  <p className="text-xs font-bold uppercase tracking-wide text-emerald-700">Better</p>
                  <p className="mt-2 text-sm leading-relaxed text-emerald-900 md:text-[15px]">
                    “That stood out to me because it suggests a fast-moving environment where this role can have real impact.”
                  </p>
                </div>
              </div>
            </div>
          ),
        },
        {
          eyebrow: 'Compare',
          title: 'Weak vs better vs strong',
          preppi: 'The goal is not to know everything. The goal is to sound informed and interested.',
          content: (
            <div className="space-y-4">
              {[
                ['Weak', example.badAnswer, 'rose', 'This shows very little research.'],
                ['Better', example.mediumAnswer || '', 'amber', 'There is some preparation here, but it still sounds generic.'],
                ['Strong', example.goodAnswer, 'emerald', 'This shows something real and explains what stood out.'],
              ].map(([label, answer, tone, note]) => {
                const styles = tone === 'rose'
                  ? ['border-rose-200', 'bg-rose-50/70', 'border-rose-200 bg-rose-100/80', 'text-rose-600', 'text-rose-900']
                  : tone === 'amber'
                    ? ['border-amber-200', 'bg-amber-50/70', 'border-amber-200 bg-amber-100/80', 'text-amber-700', 'text-amber-900']
                    : ['border-emerald-200', 'bg-emerald-50/70', 'border-emerald-200 bg-emerald-100/80', 'text-emerald-600', 'text-emerald-900']
                return (
                  <div key={label} className={`overflow-hidden rounded-2xl border-2 ${styles[0]} ${styles[1]} shadow-sm`}>
                    <div className={`px-4 py-3 ${styles[2]}`}>
                      <span className={`text-xs font-bold uppercase tracking-wide ${styles[3]}`}>{label}</span>
                    </div>
                    <div className="space-y-3 px-4 py-4">
                      <p className={`text-base leading-relaxed ${styles[4]}`}>&ldquo;{answer}&rdquo;</p>
                      <p className="text-sm leading-relaxed text-slate-600">{note}</p>
                    </div>
                  </div>
                )
              })}
            </div>
          ),
        },
        {
          eyebrow: 'Self Check',
          title: 'Use this check before your next interview',
          preppi: 'This is the standard you will practice next.',
          content: (
            <div className="space-y-4">
              <div className="grid gap-3">
                {[
                  'Can I say 1–2 real things about the company?',
                  'Can I explain what stood out to me?',
                  'Did I avoid generic praise?',
                  'Does my interest sound informed?',
                ].map((line) => (
                  <div key={line} className="border-l-2 border-violet-200 pl-4">
                    <p className="text-sm font-semibold text-slate-800 md:text-[15px]">{line}</p>
                  </div>
                ))}
              </div>
              <div className="border-t border-violet-100 pt-3">
                <p className="text-sm font-semibold leading-relaxed text-violet-900 md:text-[15px]">
                  That is the standard you will practice next.
                </p>
              </div>
            </div>
          ),
        },
      ])
    }

    if (isMeaningfulQuestionsLesson) {
      return withIntro([
        {
          eyebrow: 'Flagged Moment',
          title: originalQuestion || example.question,
          preppi: 'We should start with the exact miss first, not generic advice.',
          content: (
            <div className="space-y-4">
              {safeOriginalAnswer ? (
                <div className="overflow-hidden rounded-2xl border border-rose-200 bg-rose-50/80 shadow-sm">
                  <div className="border-b border-rose-200 bg-rose-100/80 px-4 py-3">
                    <p className="text-xs font-bold uppercase tracking-wide text-rose-600">Your original answer</p>
                  </div>
                  <div className="px-4 py-4">
                    <p className="text-sm leading-relaxed text-rose-900 md:text-[15px]">&ldquo;{safeOriginalAnswer}&rdquo;</p>
                  </div>
                </div>
              ) : (
                <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4">
                  <p className="text-sm leading-relaxed text-slate-600 md:text-base">
                    We do not have a clean matching transcript excerpt for this flagged answer, so we will use the flagged question and rebuild the move from there.
                  </p>
                </div>
              )}
              <div className="space-y-1">
                <p className="text-xs font-bold uppercase tracking-wide text-amber-700">Why it got flagged</p>
                <p className="mt-2 text-sm leading-relaxed text-amber-900 md:text-[15px]">{whyMissed}</p>
              </div>
            </div>
          ),
        },
        {
          eyebrow: 'Lesson Focus',
          title: 'What this lesson is about',
          preppi: 'This lesson is about asking questions that show genuine interest.',
          content: (
            <div className="space-y-4">
              <div className="rounded-2xl border border-slate-200 bg-slate-50/80 px-4 py-4">
                <p className="text-sm leading-relaxed text-slate-700 md:text-[15px]">
                  This lesson helps you ask better questions at the end of an HR screen. Your questions should show that you are thoughtful, interested, and paying attention to the opportunity.
                </p>
              </div>
              <div className="border-t border-violet-100 pt-3">
                <p className="text-sm font-semibold leading-relaxed text-violet-900 md:text-[15px]">
                  Best use: “What questions do you have for me?” “What would you like to know?”
                </p>
              </div>
            </div>
          ),
        },
        {
          eyebrow: 'Core Principle',
          title: 'Be ready with questions',
          preppi: 'Having no questions can make your interest feel weak.',
          content: (
            <div className="space-y-4">
              <div className="rounded-2xl border border-slate-200 bg-slate-50/80 px-4 py-4">
                <p className="text-sm leading-relaxed text-slate-700 md:text-[15px]">
                  Do not wait until the moment to think of something. Before the interview, prepare 1–2 questions you would genuinely want answered.
                </p>
              </div>
            </div>
          ),
        },
        {
          eyebrow: 'Core Principle',
          title: 'Good questions focus on the work',
          preppi: 'Good questions help you understand what the job is really like.',
          content: (
            <div className="space-y-4">
              <div className="grid gap-3">
                {[
                  'success in the role',
                  'team priorities',
                  'how the team works',
                  'culture in practice',
                ].map((line) => (
                  <div key={line} className="border-l-2 border-violet-200 pl-4">
                    <p className="text-sm font-semibold text-slate-800 md:text-[15px]">{line}</p>
                  </div>
                ))}
              </div>
            </div>
          ),
        },
        {
          eyebrow: 'Core Principle',
          title: 'Good questions show real curiosity',
          preppi: 'A strong question shows interest in the work, not just the logistics.',
          content: (
            <div className="space-y-4">
              <div className="grid gap-3 md:grid-cols-2">
                <div className="space-y-1">
                  <p className="text-xs font-bold uppercase tracking-wide text-rose-700">Weak question</p>
                  <p className="mt-2 text-sm leading-relaxed text-rose-900 md:text-[15px]">
                    “What are the hours?”
                  </p>
                </div>
                <div className="space-y-1">
                  <p className="text-xs font-bold uppercase tracking-wide text-emerald-700">Stronger question</p>
                  <p className="mt-2 text-sm leading-relaxed text-emerald-900 md:text-[15px]">
                    “What tends to make someone successful in this role in the first few months?”
                  </p>
                </div>
              </div>
            </div>
          ),
        },
        {
          eyebrow: 'Core Principle',
          title: 'Be careful with self-focused questions',
          preppi: 'Lead with curiosity about the role, team, or company.',
          content: (
            <div className="space-y-4">
              <div className="rounded-2xl border border-slate-200 bg-slate-50/80 px-4 py-4">
                <p className="text-sm leading-relaxed text-slate-700 md:text-[15px]">
                  Questions about salary, PTO, remote work, or promotion can matter. But if those are your only questions in an HR screen, they can make your interest feel shallow.
                </p>
              </div>
            </div>
          ),
        },
        {
          eyebrow: 'Compare',
          title: 'Weak vs better vs strong',
          preppi: 'The goal is not just to ask a question. The goal is to ask a meaningful one.',
          content: (
            <div className="space-y-4">
              {[
                ['Weak', example.badAnswer, 'rose', 'This is only about convenience.'],
                ['Better', example.mediumAnswer || '', 'amber', 'This is relevant, but still too broad.'],
                ['Strong', example.goodAnswer, 'emerald', 'These questions help you understand the work and the team more clearly.'],
              ].map(([label, answer, tone, note]) => {
                const styles = tone === 'rose'
                  ? ['border-rose-200', 'bg-rose-50/70', 'border-rose-200 bg-rose-100/80', 'text-rose-600', 'text-rose-900']
                  : tone === 'amber'
                    ? ['border-amber-200', 'bg-amber-50/70', 'border-amber-200 bg-amber-100/80', 'text-amber-700', 'text-amber-900']
                    : ['border-emerald-200', 'bg-emerald-50/70', 'border-emerald-200 bg-emerald-100/80', 'text-emerald-600', 'text-emerald-900']
                return (
                  <div key={label} className={`overflow-hidden rounded-2xl border-2 ${styles[0]} ${styles[1]} shadow-sm`}>
                    <div className={`px-4 py-3 ${styles[2]}`}>
                      <span className={`text-xs font-bold uppercase tracking-wide ${styles[3]}`}>{label}</span>
                    </div>
                    <div className="space-y-3 px-4 py-4">
                      <p className={`text-base leading-relaxed ${styles[4]}`}>&ldquo;{answer}&rdquo;</p>
                      <p className="text-sm leading-relaxed text-slate-600">{note}</p>
                    </div>
                  </div>
                )
              })}
            </div>
          ),
        },
        {
          eyebrow: 'Self Check',
          title: 'Use this check before you ask again',
          preppi: 'This is the standard you will practice next.',
          content: (
            <div className="space-y-4">
              <div className="grid gap-3">
                {[
                  'Do I have 1–2 questions ready?',
                  'Do my questions focus on the role, team, company, or culture?',
                  'Will the answer help me understand the opportunity better?',
                  'Do my questions show genuine interest?',
                ].map((line) => (
                  <div key={line} className="border-l-2 border-violet-200 pl-4">
                    <p className="text-sm font-semibold text-slate-800 md:text-[15px]">{line}</p>
                  </div>
                ))}
              </div>
              <div className="border-t border-violet-100 pt-3">
                <p className="text-sm font-semibold leading-relaxed text-violet-900 md:text-[15px]">
                  That is the standard you will practice next.
                </p>
              </div>
            </div>
          ),
        },
      ])
    }

    if (isHandlingUncertaintyLesson) {
      return withIntro([
        {
          eyebrow: 'Flagged Moment',
          title: originalQuestion || example.question,
          preppi: 'We should start with the exact miss first, not generic advice.',
          content: (
            <div className="space-y-4">
              {safeOriginalAnswer ? (
                <div className="overflow-hidden rounded-2xl border border-rose-200 bg-rose-50/80 shadow-sm">
                  <div className="border-b border-rose-200 bg-rose-100/80 px-4 py-3">
                    <p className="text-xs font-bold uppercase tracking-wide text-rose-600">Your original answer</p>
                  </div>
                  <div className="px-4 py-4">
                    <p className="text-sm leading-relaxed text-rose-900 md:text-[15px]">&ldquo;{safeOriginalAnswer}&rdquo;</p>
                  </div>
                </div>
              ) : (
                <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4">
                  <p className="text-sm leading-relaxed text-slate-600 md:text-base">
                    We do not have a clean matching transcript excerpt for this flagged answer, so we will use the flagged question and rebuild the move from there.
                  </p>
                </div>
              )}
              <div className="space-y-1">
                <p className="text-xs font-bold uppercase tracking-wide text-amber-700">Why it got flagged</p>
                <p className="mt-2 text-sm leading-relaxed text-amber-900 md:text-[15px]">{whyMissed}</p>
              </div>
            </div>
          ),
        },
        {
          eyebrow: 'Missing Piece',
          title: 'What this answer was missing',
          preppi: 'This lesson is about recovery, not perfection.',
          content: (
            <div className="space-y-4">
              <p className="text-base leading-relaxed text-slate-700 md:text-[17px]">
                This answer needed more steadiness. Sometimes the question is fine, but you do not have a strong answer right away. In that moment, do not fill the space with rambling. Slow down and regain control.
              </p>
              <p className="text-sm font-semibold leading-relaxed text-violet-700 md:text-[15px]">
                This lesson helps when you are unsure how to answer, not just when the question feels hard.
              </p>
            </div>
          ),
        },
        {
          eyebrow: 'Scoring Logic',
          title: 'What interviewers are actually listening for',
          preppi: 'They are not expecting instant perfection.',
          content: (
            <div className="space-y-4">
              <TeachingList
                items={[
                  'calm judgment',
                  'honesty',
                  'clarity',
                  'grounded thinking',
                ]}
                numbered
              />
              <p className="text-sm font-semibold leading-relaxed text-violet-700 md:text-[15px]">
                They are not expecting instant perfection. They are listening for how you recover.
              </p>
            </div>
          ),
        },
        {
          eyebrow: 'Failure Mode',
          title: 'How weak uncertain answers usually sound',
          preppi: 'Uncertainty is normal. Spiraling is the problem.',
          content: (
            <TeachingList
              items={[
                'start talking before the point is clear',
                'hedge too much',
                'circle without answering',
                'sound more lost than honest',
              ]}
            />
          ),
        },
        {
          eyebrow: 'Recovery Move',
          title: 'What stronger uncertain answers do differently',
          preppi: 'You do not need the full answer right away. You do need a steady one.',
          content: (
            <TeachingList
              items={[
                'pauses briefly',
                'makes one clear point',
                'stays honest about what is unclear',
                'gives the first useful move',
                'ends somewhere settled',
              ]}
            />
          ),
        },
        {
          eyebrow: 'Core Principle',
          title: 'Start with one point, not a cloud of hedges',
          preppi: 'Do not talk in circles while you search for the answer.',
          content: (
            <ContrastText
              weakLabel="Weak start"
              weakText="There are probably a lot of ways to think about that, and I think it would depend..."
              strongLabel="Stronger start"
              strongText="The main thing I’d do first is... or My starting point would be..."
            />
          ),
        },
        {
          eyebrow: 'Core Principle',
          title: 'Honest caution is better than bluffing',
          preppi: 'You do not have to sound completely certain.',
          content: (
            <div className="space-y-4">
              <p className="text-base leading-relaxed text-slate-700 md:text-[17px]">
                A stronger answer can say: <span className="text-violet-700">&ldquo;I&apos;d want to understand the situation a little better first, but my starting point would be...&rdquo;</span>
              </p>
              <p className="text-sm font-semibold leading-relaxed text-violet-700 md:text-[15px]">
                Honest caution sounds stronger than pretending to know more than you do.
              </p>
            </div>
          ),
        },
        {
          eyebrow: 'Core Principle',
          title: 'Give the first useful move',
          preppi: 'The first move shows judgment.',
          content: (
            <div className="space-y-4">
              <p className="text-base leading-relaxed text-slate-700 md:text-[17px]">
                When the full answer is not obvious yet, name the next grounded step.
              </p>
              <TeachingList
                items={[
                  'getting clear on the situation',
                  'checking what matters most',
                  'talking to the right person',
                  'confirming the facts before acting',
                ]}
              />
            </div>
          ),
        },
        {
          eyebrow: 'Core Principle',
          title: 'End somewhere settled',
          preppi: 'Even if the answer is not perfect, the ending should feel grounded.',
          content: (
            <ContrastText
              weakLabel="Weak ending"
              weakText="So yeah, I think it would depend a lot and I’d kind of figure it out from there."
              strongLabel="Stronger ending"
              strongText="The main thing is staying calm, getting clear on the situation, and taking the first useful step."
            />
          ),
        },
        {
          eyebrow: 'Self Check',
          title: 'Use this check before you answer again',
          preppi: 'That is the standard you will practice next.',
          content: (
            <TeachingList
              items={[
                'Did I pause instead of filling space?',
                'Did I make one clear point early?',
                'Was I honest without sounding lost?',
                'Did I name the first useful move?',
                'Did I end somewhere settled?',
              ]}
            />
          ),
        },
      ])
    }

    return withIntro([
    {
      eyebrow: 'Your Flagged Answer',
      title: originalQuestion || example.question,
      preppi: 'We should start with the exact miss first, not generic advice.',
      content: (
        <div className="space-y-4">
          {safeOriginalAnswer ? (
            <div className="overflow-hidden rounded-2xl border border-rose-200 bg-rose-50/80 shadow-sm">
              <div className="border-b border-rose-200 bg-rose-100/80 px-4 py-3">
                <p className="text-xs font-bold uppercase tracking-wide text-rose-600">
                  Your original answer
                </p>
              </div>
              <div className="px-4 py-4">
                <p className="text-sm leading-relaxed text-rose-900 md:text-[15px]">
                  &ldquo;{safeOriginalAnswer}&rdquo;
                </p>
              </div>
            </div>
          ) : (
            <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4">
              <p className="text-sm leading-relaxed text-slate-600 md:text-base">
                We do not have a clean matching transcript excerpt for this flagged answer, so we will use the flagged question and rebuild the move from there.
              </p>
            </div>
          )}

          <div className="space-y-1">
            <p className="text-xs font-bold uppercase tracking-wide text-amber-700">
              Why it got flagged
            </p>
            <p className="mt-2 text-sm leading-relaxed text-amber-900 md:text-[15px]">
              {whyMissed}
            </p>
          </div>
        </div>
      ),
    },
    ...(example.pairedAnnotatedAnswer ? [{
      eyebrow: 'The Concept',
      title: 'Get the shape and the qualifier right',
      preppi: 'This card should teach the concept itself. First the section, then the qualifier that makes it believable.',
      content: (
        <div className="space-y-4">
          <p className="text-sm leading-relaxed text-slate-600 md:text-base">
            {summary}
          </p>

          <div className="grid gap-3">
            {example.pairedAnnotatedAnswer.map((part) => {
              const colors = annotationColors(part.label)
              return (
                <div
                  key={`${part.label}-concept`}
                  className={`rounded-2xl border ${colors.border} bg-white px-4 py-4 shadow-sm`}
                >
                  <span className={`inline-flex rounded-full px-2.5 py-1 text-[11px] font-black uppercase tracking-[0.14em] ${colors.chip}`}>
                    {part.label}
                  </span>
                  <div className="mt-3 grid gap-3 md:grid-cols-2">
                    <div className={`rounded-xl ${colors.bg} px-3 py-3`}>
                      <p className="text-[11px] font-black uppercase tracking-[0.14em] text-slate-500">
                        Section
                      </p>
                      <p className={`mt-1 text-sm leading-relaxed ${colors.text}`}>
                        {frameworkRows.find(([key]) => key.toLowerCase() === part.label.toLowerCase())?.[1] || part.statement}
                      </p>
                    </div>
                    <div className={`rounded-xl ${colors.subtle} border ${colors.border} px-3 py-3`}>
                      <p className="text-[11px] font-black uppercase tracking-[0.14em] text-slate-500">
                        Qualifier
                      </p>
                      <p className="mt-1 text-sm leading-relaxed text-slate-800">
                        {part.note}
                      </p>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      ),
    }] : [{
      eyebrow: 'The Rule',
      title,
      preppi: 'Here is the repeatable move to use the next time this kind of question comes up.',
      content: (
        <div className="space-y-4">
          <p className="text-sm leading-relaxed text-slate-600 md:text-base">
            {summary}
          </p>

          <div className="space-y-5">
            {frameworkRows.map(([key, value], index) => (
              <div key={key} className="border-l-2 border-violet-200 pl-4">
                <div className="flex items-center gap-3">
                  <span className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-violet-100 text-xs font-extrabold text-violet-700">
                    {formatBreakdownKey(key, index)}
                  </span>
                  <p className="text-xs font-bold uppercase tracking-[0.16em] text-violet-600">
                    {breakdownKeyLabel(key)}
                  </p>
                </div>
                <p className="mt-2 text-sm leading-relaxed text-slate-700 md:text-[15px]">
                  {value}
                </p>
              </div>
            ))}
          </div>
        </div>
      ),
    }]),
    {
      eyebrow: 'Compare',
      title: 'See the difference',
      preppi: 'This is where the fix becomes obvious. First the weak version, then the stronger one.',
      content: (
        <ContrastText weakText={example.badAnswer} strongText={example.goodAnswer} />
      ),
    },
    ...(example.pairedAnnotatedAnswer ? [{
      eyebrow: 'See It In Action',
      title: 'See the strong answer with the concept applied',
      preppi: 'Now the concept is laid onto the stronger answer itself. This is the proof of what each section and qualifier is doing.',
      content: (
        <div className="space-y-4">
          <div className="border-t border-slate-200 pt-4">
            <div className="flex flex-wrap gap-2">
              {example.pairedAnnotatedAnswer.flatMap((part) => ([
                { key: `${part.label}-statement-pill`, text: part.label, label: part.label, kind: 'statement' },
                { key: `${part.label}-detail-pill`, text: `${part.label} Qualifier`, label: part.label, kind: 'detail' },
              ])).map((segment) => {
                const colors = annotationColors(segment.label)
                return (
                  <span
                    key={segment.key}
                    className={`inline-flex rounded-full px-2.5 py-1 text-[11px] font-black uppercase tracking-[0.14em] ${
                      segment.kind === 'statement' ? colors.chip : `${colors.border} border ${colors.text} ${colors.subtle}`
                    }`}
                  >
                    {segment.text}
                  </span>
                )
              })}
            </div>
            <p className="mt-4 text-base leading-relaxed text-slate-900">
              &ldquo;
              {example.pairedAnnotatedAnswer.flatMap((part) => ([
                { key: `${part.label}-statement-inline`, text: part.statement, label: part.label, kind: 'statement' },
                { key: `${part.label}-detail-inline`, text: part.groundingDetail, label: part.label, kind: 'detail' },
              ])).map((segment, index, array) => {
                const colors = annotationColors(segment.label)
                return (
                  <span
                    key={segment.key}
                    className={`rounded px-1.5 py-0.5 ${segment.kind === 'statement' ? colors.highlight : colors.subtle}`}
                  >
                    {segment.text}
                    {index < array.length - 1 ? ' ' : ''}
                  </span>
                )
              })}
              &rdquo;
            </p>
          </div>
        </div>
      ),
    }] : example.annotatedStrongAnswer ? [{
      eyebrow: 'Label The Strong Answer',
      title: 'See exactly where each part lives',
      preppi: 'If we teach a structure, we should be able to point to each piece inside the stronger answer.',
      content: (
        <div className="space-y-4">
          <p className="text-base leading-relaxed text-slate-900">
            &ldquo;
            {example.annotatedStrongAnswer.map((part, index) => {
              const colors = annotationColors(part.label)
              return (
                <span
                  key={`${part.label}-${index}`}
                  className={`rounded px-1.5 py-0.5 ${colors.highlight}`}
                >
                  {part.text}
                  {index < example.annotatedStrongAnswer!.length - 1 ? ' ' : ''}
                </span>
              )
            })}
            &rdquo;
          </p>
        </div>
      ),
    }] : []),
    ])
  }, [example, frameworkRows, isAnswerReasonExampleLesson, isCareerAlignmentLesson, isClaimExampleDetailImpactLesson, isCompanyKnowledgeLesson, isHandlingUncertaintyLesson, isMeaningfulQuestionsLesson, isObservationLesson, isPaceAndFlowLesson, isPresentPastFutureLesson, isStarLesson, originalQuestion, safeOriginalAnswer, summary, title, whyMissed, withIntro])

  const currentCard = cards[step]
  const isLastStep = step === cards.length - 1

  return (
    <div className="flex h-full w-full flex-col gap-5">
      <div className="shrink-0 space-y-4">
        {currentCard.preppi ? <Preppi message={currentCard.preppi} size="sm" /> : null}

        <div className="flex items-center justify-between text-xs font-bold uppercase tracking-[0.2em] text-slate-400">
          <span>{currentCard.eyebrow || ''}</span>
          <span>{step + 1} / {cards.length}</span>
        </div>
      </div>

      <div className="min-h-0 flex-1 rounded-[2rem] bg-white px-6 py-7 md:px-8 md:py-8">
        {currentCard.title ? (
          <h2 className="max-w-3xl text-xl font-extrabold leading-tight text-slate-900 md:text-[2rem]">
            {currentCard.title}
          </h2>
        ) : null}
        {currentCard.eyebrow === 'Flagged Moment' && (
          <div className="mt-5 border-l-2 border-slate-200 pl-4">
            <p className="text-xs font-bold uppercase tracking-wide text-slate-400">
              Interview question
            </p>
            <p className="mt-1 text-sm font-semibold leading-snug text-slate-900 md:text-base">
              {example.question}
            </p>
          </div>
        )}
        <div className="mt-6 max-w-3xl">{currentCard.content}</div>
      </div>

      <div className="mt-auto shrink-0 flex items-end justify-between gap-3 border-t border-slate-200/80 pt-5">
        <button
          onClick={() => setStep(prev => Math.max(0, prev - 1))}
          disabled={step === 0}
          className="rounded-2xl border border-slate-200 px-5 py-3 text-sm font-extrabold text-slate-500 transition hover:border-slate-300 hover:text-slate-700 disabled:cursor-default disabled:opacity-40"
        >
          Back
        </button>
        <button
          onClick={() => {
            if (isLastStep) {
              onContinue()
              return
            }
            setStep(prev => prev + 1)
          }}
          className="btn-coach-primary flex items-center justify-center gap-2 px-6 py-3.5"
        >
          {isLastStep ? 'Start practice' : 'Next'}
          <ArrowRight className="h-4 w-4" />
        </button>
      </div>
    </div>
  )
}
