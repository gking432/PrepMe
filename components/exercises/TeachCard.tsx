'use client'

import { useMemo, useState } from 'react'
import { ArrowRight, ThumbsDown, ThumbsUp } from 'lucide-react'
import Preppi from '@/components/Preppi'

interface TeachCardProps {
  criterion: string
  title: string
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

export default function TeachCard({
  criterion,
  title,
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

    const key = criterion.toLowerCase()
    if (key.includes('answer structure')) {
      return 'This answer likely got flagged because it takes too long to get to the point, packs in too many side details, and does not land cleanly at the end.'
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

  const cards = useMemo(() => {
    if (isPresentPastFutureLesson) {
      return [
        {
          eyebrow: 'When To Use It',
          title: 'When to use this structure',
          preppi: 'This framework is for background walkthrough questions, not motivation or behavioral stories.',
          content: (
            <div className="space-y-4">
              <div className="grid gap-3">
                {[
                  'Tell me a bit about yourself',
                  'Walk me through your background briefly',
                  'I see you were at [Company] as a [Role] — could you tell me a bit more about that?',
                ].map((line) => (
                  <div key={line} className="rounded-2xl border border-slate-200 bg-slate-50/80 px-4 py-3">
                    <p className="text-sm font-semibold text-slate-800 md:text-[15px]">{line}</p>
                  </div>
                ))}
              </div>
              <div className="rounded-2xl border border-violet-200 bg-violet-50 px-4 py-4">
                <p className="text-sm font-semibold leading-relaxed text-violet-900 md:text-[15px]">
                  Best use: background walkthrough, role history, transitions, where you&apos;re headed.
                </p>
              </div>
            </div>
          ),
        },
        {
          eyebrow: 'Scoring Logic',
          title: 'What interviewers are actually listening for',
          preppi: 'They are not looking for your full resume. They are listening for a clear through-line.',
          content: (
            <div className="space-y-4">
              <div className="grid gap-3">
                {[
                  'what you do now',
                  'what shaped your background',
                  'why this next move makes sense',
                ].map((line, index) => (
                  <div key={line} className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-slate-50/80 px-4 py-3">
                    <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-violet-100 text-xs font-black text-violet-700">{index + 1}</span>
                    <p className="text-sm font-semibold text-slate-800 md:text-[15px]">{line}</p>
                  </div>
                ))}
              </div>
              <div className="rounded-2xl border border-violet-200 bg-violet-50 px-4 py-4">
                <p className="text-sm font-semibold leading-relaxed text-violet-900 md:text-[15px]">
                  They are not looking for your full resume. They are listening for a clear through-line.
                </p>
              </div>
            </div>
          ),
        },
        {
          eyebrow: 'The Structure',
          title: 'The structure',
          preppi: 'Each section should be short, clear, and connected to the next.',
          content: (
            <div className="space-y-3">
              {frameworkRows.map(([key, value], index) => {
                const colors = annotationColors(key)
                return (
                  <div key={key} className={`flex items-start gap-3 rounded-2xl border ${colors.border} bg-white px-4 py-4 shadow-sm`}>
                    <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-sm font-extrabold ${colors.chip}`}>
                      {index + 1}
                    </span>
                    <div className="min-w-0">
                      <p className="text-xs font-bold uppercase tracking-wide text-violet-600">{breakdownKeyLabel(key)}</p>
                      <p className="mt-1 text-sm leading-relaxed text-slate-700 md:text-[15px]">{value}</p>
                    </div>
                  </div>
                )
              })}
              <div className="rounded-2xl border border-slate-200 bg-white px-4 py-4">
                <p className="text-sm leading-relaxed text-slate-700 md:text-[15px]">
                  Each section should be short, clear, and connected to the next.
                </p>
              </div>
            </div>
          ),
        },
        {
          eyebrow: 'Compare',
          title: 'Weak vs better vs strong',
          preppi: 'The middle tier matters here too. Structure alone is not enough if the answer still sounds generic.',
          content: (
            <div className="space-y-4">
              {[
                ['Weak', example.badAnswer, 'rose', 'Walks through everything and loses the thread.'],
                ['Better', example.mediumAnswer || '', 'amber', 'Has the shape, but still sounds generic.'],
                ['Strong', example.goodAnswer, 'emerald', 'Clear, selective, and easy to believe.'],
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
          eyebrow: 'What Makes It Strong',
          title: 'What makes the answer strong',
          preppi: 'Structure helps, but each section needs more than a label.',
          content: (
            <div className="space-y-4">
              <p className="text-sm leading-relaxed text-slate-600 md:text-base">
                Each section needs more than a label.
              </p>
              <div className="grid gap-3">
                {[
                  'what kind of work you do now',
                  'what pattern connects your past',
                  'why this move makes sense next',
                ].map((line) => (
                  <div key={line} className="rounded-2xl border border-slate-200 bg-slate-50/80 px-4 py-3">
                    <p className="text-sm font-semibold text-slate-800 md:text-[15px]">{line}</p>
                  </div>
                ))}
              </div>
              <div className="rounded-2xl border border-violet-200 bg-violet-50 px-4 py-4">
                <p className="text-sm font-semibold leading-relaxed text-violet-900 md:text-[15px]">
                  Structure helps. Qualifiers make it believable.
                </p>
              </div>
            </div>
          ),
        },
        {
          eyebrow: 'Present',
          title: 'What strong Present sounds like',
          preppi: 'A strong Present gives your lane, not just your title.',
          content: (
            <div className="space-y-4">
              <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4">
                <p className="text-xs font-bold uppercase tracking-wide text-slate-500">Weak Present</p>
                <p className="mt-2 text-sm leading-relaxed text-slate-500 md:text-[15px]">&ldquo;Right now I work in operations.&rdquo;</p>
              </div>
              <div className="rounded-2xl border border-sky-200 bg-sky-50 px-4 py-4">
                <p className="text-xs font-bold uppercase tracking-wide text-sky-700">Strong Present</p>
                <p className="mt-2 text-sm font-semibold leading-relaxed text-sky-900 md:text-[15px]">
                  &ldquo;Right now I work in operations, mostly supporting work that depends on coordination, follow-through, and keeping moving parts aligned.&rdquo;
                </p>
              </div>
              <div className="rounded-2xl border border-sky-200 bg-white px-4 py-4">
                <p className="text-sm leading-relaxed text-slate-700 md:text-[15px]">
                  A strong Present gives your lane, not just your title.
                </p>
              </div>
            </div>
          ),
        },
        {
          eyebrow: 'Past And Future',
          title: 'What strong Past and Future sound like',
          preppi: 'Past should show the pattern. Future should show the logic of the move.',
          content: (
            <div className="space-y-4">
              <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4">
                <p className="text-xs font-bold uppercase tracking-wide text-slate-500">Weak Past</p>
                <p className="mt-2 text-sm leading-relaxed text-slate-500 md:text-[15px]">&ldquo;Before that, I worked in a few different roles.&rdquo;</p>
              </div>
              <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-4">
                <p className="text-xs font-bold uppercase tracking-wide text-emerald-700">Strong Past</p>
                <p className="mt-2 text-sm font-semibold leading-relaxed text-emerald-900 md:text-[15px]">
                  &ldquo;Before that, I built my foundation in roles where I had to keep work organized, respond to changing needs, and make sure things stayed on track.&rdquo;
                </p>
              </div>
              <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4">
                <p className="text-xs font-bold uppercase tracking-wide text-slate-500">Weak Future</p>
                <p className="mt-2 text-sm leading-relaxed text-slate-500 md:text-[15px]">&ldquo;I&apos;m looking for a new opportunity.&rdquo;</p>
              </div>
              <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-4">
                <p className="text-xs font-bold uppercase tracking-wide text-amber-700">Strong Future</p>
                <p className="mt-2 text-sm font-semibold leading-relaxed text-amber-900 md:text-[15px]">
                  &ldquo;That is why this next move makes sense. It lets me keep doing that kind of work in a role with more direct ownership.&rdquo;
                </p>
              </div>
              <div className="rounded-2xl border border-violet-200 bg-violet-50 px-4 py-4">
                <p className="text-sm font-semibold leading-relaxed text-violet-900 md:text-[15px]">
                  Past should show the pattern. Future should show the logic of the move.
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
              <div className="grid gap-3">
                {[
                  'Did I start with what I do now?',
                  'Did I describe my past as a foundation, not a full history?',
                  'Did I explain why this next move makes sense?',
                  'Does each section sound specific, not generic?',
                ].map((line) => (
                  <div key={line} className="rounded-2xl border border-slate-200 bg-slate-50/80 px-4 py-3">
                    <p className="text-sm font-semibold text-slate-800 md:text-[15px]">{line}</p>
                  </div>
                ))}
              </div>
              <div className="rounded-2xl border border-violet-200 bg-violet-50 px-4 py-4">
                <p className="text-sm font-semibold leading-relaxed text-violet-900 md:text-[15px]">
                  That is the standard you will practice next.
                </p>
              </div>
            </div>
          ),
        },
      ]
    }

    if (isStarLesson) {
      return [
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
              <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-4">
                <p className="text-xs font-bold uppercase tracking-wide text-amber-700">Why it got flagged</p>
                <p className="mt-2 text-sm leading-relaxed text-amber-900 md:text-[15px]">{whyMissed}</p>
              </div>
            </div>
          ),
        },
        {
          eyebrow: 'The Problem',
          title: 'Why this kind of answer gets flagged',
          preppi: 'Start by knowing when to use STAR. Then the rest of the lesson has the right frame.',
          content: (
            <div className="space-y-4">
              <div className="grid gap-3">
                {[
                  'Tell me about a project or accomplishment you’re proud of and what your role was',
                  'Tell me about a time you didn’t have the answer right away or the path forward wasn’t clear',
                  'Tell me about a challenge you faced and how you handled it',
                ].map((line) => (
                  <div key={line} className="rounded-2xl border border-slate-200 bg-slate-50/80 px-4 py-3">
                    <p className="text-sm font-semibold text-slate-800 md:text-[15px]">{line}</p>
                  </div>
                ))}
              </div>
              <div className="rounded-2xl border border-violet-200 bg-violet-50 px-4 py-4">
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
                  <div key={line} className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-slate-50/80 px-4 py-3">
                    <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-violet-100 text-xs font-black text-violet-700">{index + 1}</span>
                    <p className="text-sm font-semibold text-slate-800 md:text-[15px]">{line}</p>
                  </div>
                ))}
              </div>
              <div className="rounded-2xl border border-violet-200 bg-violet-50 px-4 py-4">
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
              <div className="rounded-2xl border border-slate-200 bg-white px-4 py-4">
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
              <div className="rounded-2xl border border-violet-200 bg-violet-50 px-4 py-4">
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
              <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-4">
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
              <div className="rounded-2xl border border-slate-200 bg-white px-4 py-4 shadow-sm">
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
                  <div key={line} className="rounded-2xl border border-slate-200 bg-slate-50/80 px-4 py-3">
                    <p className="text-sm font-semibold text-slate-800 md:text-[15px]">{line}</p>
                  </div>
                ))}
              </div>
              <div className="rounded-2xl border border-violet-200 bg-violet-50 px-4 py-4">
                <p className="text-sm font-semibold leading-relaxed text-violet-900 md:text-[15px]">
                  That is the standard you will practice next.
                </p>
              </div>
            </div>
          ),
        },
      ]
    }

    if (isObservationLesson) {
      return [
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
              <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-4">
                <p className="text-xs font-bold uppercase tracking-wide text-amber-700">Why it got flagged</p>
                <p className="mt-2 text-sm leading-relaxed text-amber-900 md:text-[15px]">{whyMissed}</p>
              </div>
            </div>
          ),
        },
        {
          eyebrow: 'When To Use It',
          title: 'When to use this structure',
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
                  <div key={line} className="rounded-2xl border border-slate-200 bg-slate-50/80 px-4 py-3">
                    <p className="text-sm font-semibold text-slate-800 md:text-[15px]">{line}</p>
                  </div>
                ))}
              </div>
              <div className="rounded-2xl border border-violet-200 bg-violet-50 px-4 py-4">
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
                <div className="rounded-2xl border border-sky-200 bg-sky-50 px-4 py-4">
                  <p className="text-xs font-bold uppercase tracking-wide text-sky-700">Present, Past, Future</p>
                  <p className="mt-2 text-sm leading-relaxed text-sky-900 md:text-[15px]">
                    Explains your background.
                  </p>
                </div>
                <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-4">
                  <p className="text-xs font-bold uppercase tracking-wide text-amber-700">Observation, Fit, Timing</p>
                  <p className="mt-2 text-sm leading-relaxed text-amber-900 md:text-[15px]">
                    Explains why you want this opportunity.
                  </p>
                </div>
              </div>
              <div className="rounded-2xl border border-slate-200 bg-white px-4 py-4">
                <p className="text-sm leading-relaxed text-slate-700 md:text-[15px]">
                  Start with your story for “Tell me about yourself.” Start with the opportunity for “Why this role?” or “Why this company?”
                </p>
              </div>
              <div className="rounded-2xl border border-violet-200 bg-violet-50 px-4 py-4">
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
                  <div key={line} className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-slate-50/80 px-4 py-3">
                    <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-violet-100 text-xs font-black text-violet-700">{index + 1}</span>
                    <p className="text-sm font-semibold text-slate-800 md:text-[15px]">{line}</p>
                  </div>
                ))}
              </div>
              <div className="rounded-2xl border border-violet-200 bg-violet-50 px-4 py-4">
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
                  <div key={line} className="rounded-2xl border border-slate-200 bg-slate-50/80 px-4 py-3">
                    <p className="text-sm font-semibold text-slate-800 md:text-[15px]">{line}</p>
                  </div>
                ))}
              </div>
              <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-4">
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
              <div className="rounded-2xl border border-slate-200 bg-white px-4 py-4 shadow-sm">
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
                  <div key={line} className="rounded-2xl border border-slate-200 bg-slate-50/80 px-4 py-3">
                    <p className="text-sm font-semibold text-slate-800 md:text-[15px]">{line}</p>
                  </div>
                ))}
              </div>
              <div className="rounded-2xl border border-violet-200 bg-violet-50 px-4 py-4">
                <p className="text-sm font-semibold leading-relaxed text-violet-900 md:text-[15px]">
                  That is the standard you will practice next.
                </p>
              </div>
            </div>
          ),
        },
      ]
    }

    if (isAnswerReasonExampleLesson) {
      return [
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
              <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-4">
                <p className="text-xs font-bold uppercase tracking-wide text-amber-700">Why it got flagged</p>
                <p className="mt-2 text-sm leading-relaxed text-amber-900 md:text-[15px]">{whyMissed}</p>
              </div>
            </div>
          ),
        },
        {
          eyebrow: 'When To Use It',
          title: 'When to use this structure',
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
                  <div key={line} className="rounded-2xl border border-slate-200 bg-slate-50/80 px-4 py-3">
                    <p className="text-sm font-semibold text-slate-800 md:text-[15px]">{line}</p>
                  </div>
                ))}
              </div>
              <div className="rounded-2xl border border-violet-200 bg-violet-50 px-4 py-4">
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
                <div className="rounded-2xl border border-violet-200 bg-violet-50 px-4 py-4">
                  <p className="text-xs font-bold uppercase tracking-wide text-violet-700">STAR</p>
                  <p className="mt-2 text-sm leading-relaxed text-violet-900 md:text-[15px]">
                    Use this when the question asks for a specific story.
                  </p>
                </div>
                <div className="rounded-2xl border border-sky-200 bg-sky-50 px-4 py-4">
                  <p className="text-xs font-bold uppercase tracking-wide text-sky-700">Answer / Reason / Example</p>
                  <p className="mt-2 text-sm leading-relaxed text-sky-900 md:text-[15px]">
                    Use this when the question asks what you think, prefer, or usually do.
                  </p>
                </div>
              </div>
              <div className="rounded-2xl border border-violet-200 bg-violet-50 px-4 py-4">
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
                  <div key={line} className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-slate-50/80 px-4 py-3">
                    <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-violet-100 text-xs font-black text-violet-700">{index + 1}</span>
                    <p className="text-sm font-semibold text-slate-800 md:text-[15px]">{line}</p>
                  </div>
                ))}
              </div>
              <div className="rounded-2xl border border-violet-200 bg-violet-50 px-4 py-4">
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
              <div className="rounded-2xl border border-violet-200 bg-violet-50 px-4 py-4">
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
              <div className="rounded-2xl border border-slate-200 bg-white px-4 py-4 shadow-sm">
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
                  <div key={line} className="rounded-2xl border border-slate-200 bg-slate-50/80 px-4 py-3">
                    <p className="text-sm font-semibold text-slate-800 md:text-[15px]">{line}</p>
                  </div>
                ))}
              </div>
              <div className="rounded-2xl border border-violet-200 bg-violet-50 px-4 py-4">
                <p className="text-sm font-semibold leading-relaxed text-violet-900 md:text-[15px]">
                  That is the standard you will practice next.
                </p>
              </div>
            </div>
          ),
        },
      ]
    }

    return [
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

          <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-4">
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

          <div className="space-y-3">
            {frameworkRows.map(([key, value], index) => (
              <div
                key={key}
                className="flex items-start gap-3 rounded-2xl border border-slate-200 bg-slate-50/80 px-4 py-4"
              >
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-violet-100 text-sm font-extrabold text-violet-700">
                  {formatBreakdownKey(key, index)}
                </span>
                <div className="min-w-0">
                  <p className="text-xs font-bold uppercase tracking-wide text-violet-600">
                    {breakdownKeyLabel(key)}
                  </p>
                  <p className="mt-1 text-sm leading-relaxed text-slate-700 md:text-[15px]">
                    {value}
                  </p>
                </div>
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
        <div className="space-y-4">
          <div className="overflow-hidden rounded-2xl border-2 border-rose-200 bg-rose-50/70 shadow-sm">
            <div className="flex items-center gap-2 border-b border-rose-200 bg-rose-100/80 px-4 py-3">
              <ThumbsDown className="h-4 w-4 text-rose-500" />
              <span className="text-xs font-bold uppercase tracking-wide text-rose-600">
                Weak version
              </span>
            </div>
            <div className="px-4 py-4">
              <p className="text-base italic leading-relaxed text-rose-900">
                &ldquo;{example.badAnswer}&rdquo;
              </p>
            </div>
          </div>
          <div className="overflow-hidden rounded-2xl border-2 border-emerald-200 bg-emerald-50/70 shadow-sm">
            <div className="flex items-center gap-2 border-b border-emerald-200 bg-emerald-100/80 px-4 py-3">
              <ThumbsUp className="h-4 w-4 text-emerald-500" />
              <span className="text-xs font-bold uppercase tracking-wide text-emerald-600">
                Stronger version
              </span>
            </div>
            <div className="px-4 py-4">
              <p className="text-base leading-relaxed text-emerald-900">
                &ldquo;{example.goodAnswer}&rdquo;
              </p>
            </div>
          </div>
        </div>
      ),
    },
    ...(example.pairedAnnotatedAnswer ? [{
      eyebrow: 'See It In Action',
      title: 'See the strong answer with the concept applied',
      preppi: 'Now the concept is laid onto the stronger answer itself. This is the proof of what each section and qualifier is doing.',
      content: (
        <div className="space-y-4">
          <div className="rounded-2xl border border-slate-200 bg-white px-4 py-4 shadow-sm">
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
          <div className="overflow-hidden rounded-2xl border-2 border-emerald-200 bg-emerald-50/70 shadow-sm">
            <div className="flex items-center gap-2 border-b border-emerald-200 bg-emerald-100/80 px-4 py-3">
              <ThumbsUp className="h-4 w-4 text-emerald-500" />
              <span className="text-xs font-bold uppercase tracking-wide text-emerald-600">
                Stronger version
              </span>
            </div>
            <div className="px-4 py-4">
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
          </div>
        </div>
      ),
    }] : []),
    ]
  }, [example, frameworkRows, isAnswerReasonExampleLesson, isObservationLesson, isPresentPastFutureLesson, isStarLesson, originalQuestion, safeOriginalAnswer, summary, title, whyMissed])

  const currentCard = cards[step]
  const isLastStep = step === cards.length - 1

  return (
    <div className="flex h-full w-full flex-col gap-5">
      <div className="shrink-0 space-y-4">
        <Preppi message={currentCard.preppi} size="sm" />

        <div className="flex items-center justify-between text-xs font-bold uppercase tracking-[0.2em] text-slate-400">
          <span>{currentCard.eyebrow}</span>
          <span>{step + 1} / {cards.length}</span>
        </div>
      </div>

      <div className="min-h-0 flex-1 rounded-[2rem] border border-violet-100 bg-white/95 p-6 shadow-[0_20px_40px_rgba(15,23,42,0.08)] md:p-7">
        <h2 className="text-xl font-extrabold text-slate-900 md:text-2xl">
          {currentCard.title}
        </h2>
        {(step === 0 || step === 2) && (
          <div className="mt-4 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
            <p className="text-xs font-bold uppercase tracking-wide text-slate-400">
              Interview question
            </p>
            <p className="mt-1 text-sm font-semibold leading-snug text-slate-900 md:text-base">
              {example.question}
            </p>
          </div>
        )}
        <div className="mt-5">{currentCard.content}</div>
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
