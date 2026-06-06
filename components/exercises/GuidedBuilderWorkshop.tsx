'use client'

import { useEffect, useMemo, useState } from 'react'
import {
  ArrowRight,
  Check,
  CheckCircle2,
  Edit3,
  Lightbulb,
  Loader2,
  RefreshCw,
  Sparkles,
  Target,
  Wand2,
  Zap,
} from 'lucide-react'

export type WorkshopType =
  | 'professional_story'
  | 'star_proof'
  | 'career_alignment'
  | 'handling_uncertainty'
  | 'pace_delivery'
  | 'preparation_curiosity'

interface GuidedBuilderWorkshopProps {
  workshopType: WorkshopType
  sessionId?: string
  originalQuestion?: string
  originalAnswer?: string
  onComplete: () => void
}

type Phase = 'intro' | 'method' | 'diagnose' | 'build' | 'assemble' | 'compare' | 'done'

interface FrameworkStep {
  key: string
  label: string
  description: string
  prompt: string
  color: string // tailwind color suffix family, e.g. 'violet', 'emerald'
  emoji: string
  connector?: string // sentence connector when assembling, e.g. "and so"
}

interface WorkshopConfig {
  framework: string
  whyTitle: string
  whyBody: string
  whenItHits: string
  steps: FrameworkStep[]
  assembleHint: string
  practiceCta: string
}

const COLOR_MAP: Record<string, { bg: string; border: string; text: string; ring: string; soft: string; chip: string }> = {
  violet: {
    bg: 'bg-violet-500',
    border: 'border-violet-300',
    text: 'text-violet-700',
    ring: 'ring-violet-400',
    soft: 'bg-violet-50',
    chip: 'bg-violet-100 text-violet-800',
  },
  emerald: {
    bg: 'bg-emerald-500',
    border: 'border-emerald-300',
    text: 'text-emerald-700',
    ring: 'ring-emerald-400',
    soft: 'bg-emerald-50',
    chip: 'bg-emerald-100 text-emerald-800',
  },
  sky: {
    bg: 'bg-sky-500',
    border: 'border-sky-300',
    text: 'text-sky-700',
    ring: 'ring-sky-400',
    soft: 'bg-sky-50',
    chip: 'bg-sky-100 text-sky-800',
  },
  amber: {
    bg: 'bg-amber-500',
    border: 'border-amber-300',
    text: 'text-amber-700',
    ring: 'ring-amber-400',
    soft: 'bg-amber-50',
    chip: 'bg-amber-100 text-amber-800',
  },
  rose: {
    bg: 'bg-rose-500',
    border: 'border-rose-300',
    text: 'text-rose-700',
    ring: 'ring-rose-400',
    soft: 'bg-rose-50',
    chip: 'bg-rose-100 text-rose-800',
  },
}

const CONFIGS: Record<WorkshopType, WorkshopConfig> = {
  star_proof: {
    framework: 'STAR',
    whyTitle: 'Interviewers want proof, not opinions.',
    whyBody: 'A vague example sounds like talk. A specific one sounds like evidence. STAR forces you to show the work: the scene, the stakes, the moves, the outcome.',
    whenItHits: 'Use it any time you hear "tell me about a time", "give me an example", or "walk me through how you handled..."',
    steps: [
      { key: 'situation', label: 'Situation', description: 'Set the scene in 1-2 sentences. Who, where, when. Just enough to follow.', prompt: 'Pick a real situation.', color: 'sky', emoji: '🎬' },
      { key: 'task', label: 'Task', description: 'What was specifically at stake or yours to own?', prompt: 'What was on your plate?', color: 'amber', emoji: '🎯', connector: 'My job was to' },
      { key: 'action', label: 'Action', description: 'The biggest weight goes here. What did you actually do?', prompt: 'What did you actually do?', color: 'violet', emoji: '⚡', connector: 'So I' },
      { key: 'result', label: 'Result', description: 'Close with what changed. Numbers if you have them, real outcome if you don\'t.', prompt: 'What changed?', color: 'emerald', emoji: '✅', connector: 'In the end,' },
    ],
    assembleHint: 'Notice the answer leads with scene, narrows fast to ownership, then puts most weight on what you did.',
    practiceCta: 'Say it out loud',
  },
  professional_story: {
    framework: 'Present · Past · Future',
    whyTitle: '"Tell me about yourself" is not a resume recap.',
    whyBody: 'Interviewers want an arc that explains why you\'re sitting in that chair. Present-Past-Future gives them a coherent story instead of a list of facts.',
    whenItHits: 'Use it for "tell me about yourself", "walk me through your background", or any open opener in the first 60 seconds.',
    steps: [
      { key: 'present', label: 'Present', description: 'Where you are right now. Role, focus, what you\'re known for.', prompt: 'Start with your now.', color: 'violet', emoji: '👋' },
      { key: 'past', label: 'Past', description: 'The 1-2 things in your background that explain how you got here.', prompt: 'What shaped that?', color: 'sky', emoji: '🧭', connector: 'Before that,' },
      { key: 'future', label: 'Future', description: 'Why this role is the natural next step.', prompt: 'Why this role next?', color: 'emerald', emoji: '🚀', connector: 'Which is why' },
    ],
    assembleHint: 'Notice how each part hands off to the next — there\'s a logic to why you\'re sitting there.',
    practiceCta: 'Say your story out loud',
  },
  career_alignment: {
    framework: 'Observation · Fit · Timing',
    whyTitle: '"Why this role" reveals if you actually looked.',
    whyBody: 'Generic answers ("I love your mission!") sound the same as every other candidate. Observation-Fit-Timing proves you read the JD, know what you bring, and chose this on purpose.',
    whenItHits: 'Use it for "why this role", "why this company", "why are you interested", or anything probing intent.',
    steps: [
      { key: 'observation', label: 'Observation', description: 'One specific thing about the role/team that stood out.', prompt: 'What did you notice?', color: 'amber', emoji: '🔍' },
      { key: 'fit', label: 'Fit', description: 'A concrete piece of your experience that maps to it.', prompt: 'How does it match you?', color: 'violet', emoji: '🧩', connector: 'That lines up with' },
      { key: 'timing', label: 'Timing', description: 'Why now makes sense in your arc.', prompt: 'Why now?', color: 'emerald', emoji: '⏱️', connector: 'And right now,' },
    ],
    assembleHint: 'Lead with the role, then yourself, then timing. The order signals you put their need first.',
    practiceCta: 'Try the full answer out loud',
  },
  handling_uncertainty: {
    framework: 'Recovery · Answer · Reason · Example',
    whyTitle: 'Pausing is fine. Rambling is not.',
    whyBody: 'When a question catches you off guard, most people fill the silence with filler and accidentally bluff. A clean pause + a structured answer signals composure.',
    whenItHits: 'Use it when you\'re thrown by a question, when you don\'t know the perfect answer, or when you feel yourself starting to ramble.',
    steps: [
      { key: 'recovery', label: 'Recovery', description: 'A calm 1-sentence opener that buys you a second without sounding panicked.', prompt: 'How do you steady yourself?', color: 'sky', emoji: '🌬️' },
      { key: 'answer', label: 'Answer', description: 'A direct position or judgment, one sentence.', prompt: 'What\'s the answer?', color: 'violet', emoji: '🎯', connector: '' },
      { key: 'reason', label: 'Reason', description: 'One sentence explaining why that answer holds up.', prompt: 'Why does it hold up?', color: 'amber', emoji: '💭', connector: 'The reason is' },
      { key: 'example', label: 'Example', description: 'A real moment from your work that backs it up.', prompt: 'What backs it up?', color: 'emerald', emoji: '📌', connector: 'For example,' },
    ],
    assembleHint: 'Notice the structure shows composure — even if you don\'t have a perfect answer, you sound steady.',
    practiceCta: 'Practice the recovery out loud',
  },
  pace_delivery: {
    framework: 'Opener · Main Point · Landing',
    whyTitle: 'Your content was fine. Your delivery buried it.',
    whyBody: 'When you bury the main point under filler or trail off at the end, interviewers literally remember less of what you said. Tightening the shape — not the substance — makes you sound senior.',
    whenItHits: 'Use it any time you catch yourself saying "um", "like", "kind of", or rambling toward an answer instead of leading with it.',
    steps: [
      { key: 'opener', label: 'Opener', description: 'Lead with the main point in one declarative sentence. No "so", no "um", no warmup.', prompt: 'What\'s the headline?', color: 'violet', emoji: '🎤' },
      { key: 'main_point', label: 'Main Body', description: '2-3 sentences of clean support. Same content as before, no filler.', prompt: 'Add the supporting beats.', color: 'sky', emoji: '📣', connector: '' },
      { key: 'landing', label: 'Landing', description: 'Close cleanly. Don\'t trail off into "yeah, so, that\'s it".', prompt: 'How do you land it?', color: 'emerald', emoji: '🛬', connector: '' },
    ],
    assembleHint: 'Same facts you had before — but the listener can actually hold onto them now.',
    practiceCta: 'Say the tightened version',
  },
  preparation_curiosity: {
    framework: 'What You Know · What Stood Out · Your Question',
    whyTitle: '"Any questions for us?" is a test you can ace.',
    whyBody: 'A generic question ("what\'s the culture like?") tells the interviewer you didn\'t prepare. A specific one — built from real research — signals you\'re already thinking like an employee.',
    whenItHits: 'Use it for "what do you know about us", "any questions for us", or any moment when you can show you did the homework.',
    steps: [
      { key: 'what_you_know', label: 'What You Know', description: 'One real specific from the JD or company — not "I love your mission".', prompt: 'What\'s the real specific?', color: 'sky', emoji: '📚' },
      { key: 'what_stood_out', label: 'What Stood Out', description: 'Why that one detail caught your attention.', prompt: 'Why did it catch you?', color: 'amber', emoji: '✨', connector: 'What stood out was' },
      { key: 'your_question', label: 'Your Question', description: 'A question that follows naturally from the above — not a generic culture question.', prompt: 'What do you want to ask?', color: 'violet', emoji: '❓', connector: 'Which makes me curious —' },
    ],
    assembleHint: 'A question built from real research lands completely differently than a generic one.',
    practiceCta: 'Say the question out loud',
  },
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
    .map((step) => {
      const value = cleanInput(choices[step.key] || '')
      if (!value) return ''
      if (!step.connector) return value
      const lower = value.charAt(0).toLowerCase() + value.slice(1)
      return `${step.connector} ${lower}`
    })
    .filter(Boolean)
    .join(' ')
}

interface SuggestResponse {
  suggestions: string[]
  hint: string
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
  const [suggestions, setSuggestions] = useState<string[]>([])
  const [hint, setHint] = useState<string>('')
  const [loadingSuggestions, setLoadingSuggestions] = useState(false)
  const [refreshKey, setRefreshKey] = useState(0)
  const [showCustom, setShowCustom] = useState(false)
  const [customDraft, setCustomDraft] = useState('')
  const [methodTappedSteps, setMethodTappedSteps] = useState<Set<number>>(new Set())
  const [revealedSteps, setRevealedSteps] = useState<Set<string>>(new Set())

  const activeStep = config.steps[stepIndex]
  const questionLabel = useMemo(
    () => originalQuestion?.trim() || 'Practice this answer pattern.',
    [originalQuestion]
  )
  const answerSummary = useMemo(() => summarize(originalAnswer, 220), [originalAnswer])

  // Fetch suggestions whenever we enter a build step or hit refresh
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

  // Animate step reveal in assemble phase
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

  function pickSuggestion(text: string) {
    setChoices((prev) => ({ ...prev, [activeStep.key]: cleanInput(text) }))
    advanceStep()
  }

  function submitCustom() {
    const value = cleanInput(customDraft)
    if (!value) return
    setChoices((prev) => ({ ...prev, [activeStep.key]: value }))
    setShowCustom(false)
    setCustomDraft('')
    advanceStep()
  }

  function advanceStep() {
    if (stepIndex + 1 >= config.steps.length) {
      setPhase('assemble')
      setStepIndex(0)
    } else {
      setStepIndex((prev) => prev + 1)
      setShowCustom(false)
      setCustomDraft('')
    }
  }

  function tapMethodStep(i: number) {
    setMethodTappedSteps((prev) => {
      const next = new Set(prev)
      next.add(i)
      return next
    })
  }

  const allMethodStepsTapped = methodTappedSteps.size >= config.steps.length

  const finalAnswer = useMemo(() => assembleAnswer(config, choices), [config, choices])

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
            <h2 className="mt-3 text-xl font-extrabold leading-tight text-slate-900">
              {config.whyTitle}
            </h2>
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
                    Your answer in the interview
                  </p>
                  <p className="mt-2 text-sm italic leading-6 text-rose-900">&ldquo;{answerSummary}&rdquo;</p>
                  <p className="mt-3 text-xs font-bold text-rose-700">We&apos;re going to rebuild this together — in your words, using your real experience.</p>
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

      {/* METHOD */}
      {phase === 'method' && (
        <div className="flex h-full flex-col">
          <div className="border-b border-slate-200 bg-gradient-to-br from-sky-50 via-white to-violet-50 px-5 py-4">
            <div className="flex items-center gap-2">
              <span className="rounded-full bg-sky-100 px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.16em] text-sky-700">
                The Method
              </span>
            </div>
            <h2 className="mt-2 text-xl font-extrabold leading-tight text-slate-900">{config.framework}</h2>
            <p className="mt-1 text-xs font-bold text-slate-500">Tap each step to learn what goes in it.</p>
          </div>

          <div className="min-h-0 flex-1 overflow-y-auto px-5 py-5">
            <div className="space-y-3">
              {config.steps.map((step, i) => {
                const colors = COLOR_MAP[step.color]
                const tapped = methodTappedSteps.has(i)
                return (
                  <button
                    key={step.key}
                    onClick={() => tapMethodStep(i)}
                    className={`w-full rounded-2xl border-2 px-4 py-3 text-left transition ${
                      tapped
                        ? `${colors.border} ${colors.soft} shadow-sm`
                        : 'border-slate-200 bg-white hover:border-slate-300'
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      <div
                        className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-lg transition ${
                          tapped ? `${colors.bg} text-white` : 'bg-slate-100 text-slate-400'
                        }`}
                      >
                        {tapped ? step.emoji : i + 1}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center justify-between gap-2">
                          <p className={`text-sm font-extrabold ${tapped ? colors.text : 'text-slate-900'}`}>
                            {step.label}
                          </p>
                          {tapped && <Check className={`h-4 w-4 ${colors.text}`} />}
                        </div>
                        {tapped && (
                          <p className="mt-1 text-xs leading-5 text-slate-700 animate-fade-in">
                            {step.description}
                          </p>
                        )}
                      </div>
                    </div>
                  </button>
                )
              })}
            </div>

            {!allMethodStepsTapped && (
              <p className="mt-4 text-center text-[11px] font-bold uppercase tracking-[0.16em] text-slate-400">
                {methodTappedSteps.size}/{config.steps.length} explored
              </p>
            )}
          </div>

          <div className="shrink-0 border-t border-slate-200 px-5 py-3">
            <button
              onClick={() => {
                setPhase(originalAnswer ? 'diagnose' : 'build')
                setStepIndex(0)
              }}
              disabled={!allMethodStepsTapped}
              className="btn-coach-primary flex w-full items-center justify-center gap-2 py-3 text-sm font-bold disabled:opacity-50"
            >
              {allMethodStepsTapped ? 'Now let\'s use it' : 'Tap every step to continue'}
              <ArrowRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}

      {/* DIAGNOSE */}
      {phase === 'diagnose' && (
        <div className="flex h-full flex-col">
          <div className="border-b border-slate-200 bg-gradient-to-br from-rose-50 via-white to-amber-50 px-5 py-4">
            <span className="rounded-full bg-rose-100 px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.16em] text-rose-700">
              Where you landed
            </span>
            <h2 className="mt-2 text-xl font-extrabold leading-tight text-slate-900">
              Here&apos;s your answer, mapped to the method.
            </h2>
          </div>

          <div className="min-h-0 flex-1 overflow-y-auto px-5 py-5">
            <div className="rounded-2xl border border-rose-100 bg-rose-50/50 px-4 py-3">
              <p className="text-[10px] font-black uppercase tracking-[0.16em] text-rose-600">You said</p>
              <p className="mt-1 text-sm italic leading-6 text-rose-900">&ldquo;{answerSummary}&rdquo;</p>
            </div>

            <p className="mt-5 text-[11px] font-black uppercase tracking-[0.16em] text-slate-500">
              The strong version would have these parts:
            </p>
            <div className="mt-3 space-y-2">
              {config.steps.map((step, i) => {
                const colors = COLOR_MAP[step.color]
                return (
                  <div
                    key={step.key}
                    className={`flex items-center gap-3 rounded-xl border ${colors.border} ${colors.soft} px-3 py-2`}
                  >
                    <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${colors.bg} text-sm text-white`}>
                      {step.emoji}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className={`text-xs font-extrabold ${colors.text}`}>{step.label}</p>
                      <p className="text-xs leading-5 text-slate-600">{step.description}</p>
                    </div>
                    <span className="shrink-0 rounded-full bg-white px-2 py-0.5 text-[10px] font-bold text-slate-500">
                      Step {i + 1}
                    </span>
                  </div>
                )
              })}
            </div>

            <div className="mt-5 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3">
              <div className="flex items-start gap-2">
                <Wand2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-700" />
                <p className="text-xs leading-5 text-emerald-900">
                  We&apos;ll build each part together. We&apos;ll pull suggestions from your real resume and the job
                  — you pick what fits or write your own. Nothing gets invented.
                </p>
              </div>
            </div>
          </div>

          <div className="shrink-0 border-t border-slate-200 px-5 py-3">
            <button
              onClick={() => {
                setPhase('build')
                setStepIndex(0)
              }}
              className="btn-coach-primary flex w-full items-center justify-center gap-2 py-3 text-sm font-bold"
            >
              Start building
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
                  {hint && !loadingSuggestions && (
                    <div className="mb-3 flex items-start gap-2 rounded-xl bg-amber-50 border border-amber-100 px-3 py-2">
                      <Sparkles className="mt-0.5 h-3.5 w-3.5 shrink-0 text-amber-700" />
                      <p className="text-xs leading-5 text-amber-900">{hint}</p>
                    </div>
                  )}

                  <p className="mb-2 text-[11px] font-black uppercase tracking-[0.16em] text-slate-500">
                    Pick the one that fits
                  </p>

                  {loadingSuggestions ? (
                    <div className="space-y-2">
                      {[0, 1, 2].map((i) => (
                        <div key={i} className="animate-pulse rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4">
                          <div className="h-3 w-full rounded bg-slate-200" />
                          <div className="mt-2 h-3 w-4/5 rounded bg-slate-200" />
                        </div>
                      ))}
                      <p className="pt-2 text-center text-[11px] font-bold text-slate-500">
                        Reading your resume and the job description…
                      </p>
                    </div>
                  ) : suggestions.length > 0 ? (
                    <div className="space-y-2">
                      {suggestions.map((suggestion, i) => (
                        <button
                          key={`${refreshKey}-${i}`}
                          onClick={() => pickSuggestion(suggestion)}
                          className={`group w-full rounded-2xl border-2 border-slate-200 bg-white px-4 py-3 text-left transition hover:${colors.border} hover:${colors.soft} hover:shadow-md`}
                        >
                          <p className="text-sm leading-6 text-slate-800 group-hover:text-slate-900">
                            {suggestion}
                          </p>
                          <p className={`mt-2 text-[10px] font-black uppercase tracking-[0.16em] opacity-0 transition group-hover:opacity-100 ${colors.text}`}>
                            Tap to use this
                          </p>
                        </button>
                      ))}
                    </div>
                  ) : (
                    <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 px-4 py-6 text-center">
                      <p className="text-sm font-bold text-slate-600">No suggestions right now.</p>
                      <p className="mt-1 text-xs text-slate-500">Write your own below — that&apos;s the whole point anyway.</p>
                    </div>
                  )}

                  <div className="mt-3 flex items-center gap-2">
                    <button
                      onClick={() => setRefreshKey((k) => k + 1)}
                      disabled={loadingSuggestions}
                      className="flex flex-1 items-center justify-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-bold text-slate-700 transition hover:border-slate-300 hover:bg-slate-50 disabled:opacity-50"
                    >
                      <RefreshCw className={`h-3.5 w-3.5 ${loadingSuggestions ? 'animate-spin' : ''}`} />
                      Give me more options
                    </button>
                    <button
                      onClick={() => setShowCustom((v) => !v)}
                      className={`flex flex-1 items-center justify-center gap-1.5 rounded-xl border px-3 py-2 text-xs font-bold transition ${
                        showCustom
                          ? `${colors.border} ${colors.soft} ${colors.text}`
                          : 'border-slate-200 bg-white text-slate-700 hover:border-slate-300 hover:bg-slate-50'
                      }`}
                    >
                      <Edit3 className="h-3.5 w-3.5" />
                      Write my own
                    </button>
                  </div>

                  {showCustom && (
                    <div className={`mt-3 rounded-2xl border-2 ${colors.border} ${colors.soft} p-3 animate-fade-in`}>
                      <textarea
                        value={customDraft}
                        onChange={(e) => setCustomDraft(e.target.value)}
                        placeholder={activeStep.prompt}
                        className="min-h-[88px] w-full resize-none border-0 bg-transparent text-sm leading-6 text-slate-800 outline-none placeholder:text-slate-400"
                      />
                      <div className="flex items-center justify-end">
                        <button
                          onClick={submitCustom}
                          disabled={!cleanInput(customDraft)}
                          className={`flex items-center gap-1.5 rounded-xl ${colors.bg} px-4 py-2 text-xs font-bold text-white shadow-sm disabled:opacity-50`}
                        >
                          Use this
                          <ArrowRight className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </div>
                  )}
                </div>

                {/* Choices made so far - chip strip */}
                {Object.keys(choices).length > 0 && (
                  <div className="shrink-0 border-t border-slate-200 bg-slate-50 px-5 py-2">
                    <div className="flex items-center gap-1.5 overflow-x-auto">
                      <span className="text-[10px] font-black uppercase tracking-[0.14em] text-slate-500 shrink-0">
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
                        <p className={`text-[10px] font-black uppercase tracking-[0.14em] ${colors.text}`}>
                          {step.label}
                        </p>
                        <p className="text-sm leading-6 text-slate-800">{value}</p>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>

            {revealedSteps.size === config.steps.length && finalAnswer && (
              <div className="mt-5 rounded-2xl border-2 border-emerald-300 bg-emerald-50 px-4 py-4 animate-fade-in">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-emerald-700" />
                  <p className="text-[10px] font-black uppercase tracking-[0.16em] text-emerald-700">
                    Your full answer
                  </p>
                </div>
                <p className="mt-2 text-sm leading-7 text-slate-900">{finalAnswer}</p>
              </div>
            )}
          </div>

          <div className="shrink-0 border-t border-slate-200 px-5 py-3">
            <button
              onClick={() => setPhase('compare')}
              disabled={revealedSteps.size < config.steps.length}
              className="btn-coach-primary flex w-full items-center justify-center gap-2 py-3 text-sm font-bold disabled:opacity-50"
            >
              {revealedSteps.size < config.steps.length ? 'Assembling…' : 'See what changed'}
              <ArrowRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}

      {/* COMPARE */}
      {phase === 'compare' && (
        <div className="flex h-full flex-col">
          <div className="border-b border-slate-200 bg-gradient-to-br from-violet-50 via-white to-emerald-50 px-5 py-4">
            <span className="rounded-full bg-violet-100 px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.16em] text-violet-700">
              Before · After
            </span>
            <h2 className="mt-2 text-xl font-extrabold leading-tight text-slate-900">
              See the difference.
            </h2>
          </div>

          <div className="min-h-0 flex-1 overflow-y-auto px-5 py-5 space-y-3">
            {answerSummary && (
              <div className="rounded-2xl border border-rose-200 bg-rose-50/60 px-4 py-3">
                <p className="text-[10px] font-black uppercase tracking-[0.16em] text-rose-600">Before</p>
                <p className="mt-1 text-sm italic leading-6 text-rose-900">&ldquo;{answerSummary}&rdquo;</p>
              </div>
            )}
            <div className="rounded-2xl border-2 border-emerald-300 bg-emerald-50 px-4 py-3">
              <p className="text-[10px] font-black uppercase tracking-[0.16em] text-emerald-700">After</p>
              <p className="mt-1 text-sm leading-7 text-slate-900">{finalAnswer}</p>
            </div>

            <div className="rounded-2xl border border-violet-200 bg-violet-50 px-4 py-3">
              <div className="flex items-start gap-2">
                <Zap className="mt-0.5 h-4 w-4 shrink-0 text-violet-700" />
                <div>
                  <p className="text-xs font-extrabold text-violet-900">Why this lands harder</p>
                  <p className="mt-1 text-xs leading-5 text-violet-800">{config.assembleHint}</p>
                </div>
              </div>
            </div>
          </div>

          <div className="shrink-0 border-t border-slate-200 px-5 py-3">
            <button
              onClick={() => setPhase('done')}
              className="btn-coach-primary flex w-full items-center justify-center gap-2 py-3 text-sm font-bold"
            >
              I&apos;m ready to practice
              <ArrowRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}

      {/* DONE */}
      {phase === 'done' && (
        <div className="flex h-full flex-col">
          <div className="border-b border-slate-200 bg-gradient-to-br from-emerald-50 via-white to-emerald-50 px-5 py-4">
            <span className="rounded-full bg-emerald-100 px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.16em] text-emerald-700">
              {config.practiceCta}
            </span>
            <h2 className="mt-2 text-xl font-extrabold leading-tight text-slate-900">
              Read it twice. Then say it without looking.
            </h2>
          </div>

          <div className="min-h-0 flex-1 overflow-y-auto px-5 py-5">
            <div className="rounded-2xl border-2 border-emerald-300 bg-emerald-50 px-4 py-4">
              <p className="text-sm leading-7 text-slate-900">{finalAnswer}</p>
            </div>

            <div className="mt-4 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
              <div className="flex items-start gap-2">
                <Lightbulb className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" />
                <div>
                  <p className="text-xs font-extrabold text-slate-900">Drill it</p>
                  <ul className="mt-1 space-y-1 text-xs leading-5 text-slate-700">
                    <li>· Read it once. Say it once exactly. Then say it without reading.</li>
                    <li>· Each time you repeat it, drop one word. Keep the meaning.</li>
                    <li>· When you can say it in your own voice — not memorized — you&apos;ve got it.</li>
                  </ul>
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
