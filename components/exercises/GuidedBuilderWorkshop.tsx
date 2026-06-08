'use client'

import { useCallback, useMemo, useRef, useState } from 'react'
import {
  ArrowRight,
  Check,
  ChevronLeft,
  Edit3,
  FileText,
  Loader2,
  Mic,
  RefreshCw,
  ShieldCheck,
  Sparkles,
  Wand2,
  X,
} from 'lucide-react'

export type WorkshopType =
  | 'professional_story'
  | 'star_proof'
  | 'career_alignment'
  | 'handling_uncertainty'
  | 'pace_delivery'
  | 'preparation_curiosity'
  | 'role_depth'
  | 'problem_solving'

type StageKey = 'hr_screen' | 'hiring_manager' | 'culture_fit' | 'final'
type Phase = 'setup' | 'extracting' | 'confirm' | 'polishing' | 'rehearse' | 'done'
type Confidence = 'clear' | 'inferred' | 'missing'

interface GuidedBuilderWorkshopProps {
  workshopType: WorkshopType
  sessionId?: string
  stageKey?: StageKey
  originalQuestion?: string
  originalAnswer?: string
  repairFeedback?: string
  repairCriterion?: string
  onComplete: () => void
}

interface StepConfig {
  key: string
  label: string
  help: string
  prompt?: string
}

interface WorkshopConfig {
  title: string
  framework: string
  promise: string
  steps: StepConfig[]
}

interface ExtractedStep extends StepConfig {
  raw: string
  confidence: Confidence
  missingPrompt: string
  sourceNote: string
}

interface AlternativeStory {
  label: string
  detail?: string
  source?: string
}

interface PolishedPiece {
  key: string
  label: string
  text: string
  rationale: string
  sourceNote: string
}

interface PolishedAnswer {
  pieces: PolishedPiece[]
  finalAnswer: string
  coachNote?: string
  sourceMap?: Array<{ key?: string; source?: string }>
  cost_estimate?: any
}

interface VoiceResult {
  transcript: string
  scores: { coverage: number; structure: number; delivery: number }
  feedback: string
  kept: string[]
  dropped: string[]
  ready_for_retake?: boolean
  fixed_score_area?: boolean
  remaining_gap?: string
  breakdown_phase?: 'source_material' | 'answer_structure' | 'spoken_delivery'
  next_action?: string
  cost_estimate?: any
}

const CONFIGS: Record<WorkshopType, WorkshopConfig> = {
  professional_story: {
    title: 'Professional Story',
    framework: 'Present / Past / Future',
    promise: 'Turn the opener into a clear arc instead of a resume recap.',
    steps: [
      { key: 'present', label: 'Present', help: 'What you do now and what you are known for.' },
      { key: 'past', label: 'Past', help: 'The background thread that explains how you got here.' },
      { key: 'future', label: 'Future', help: 'Why this role is the logical next move.' },
    ],
  },
  star_proof: {
    title: 'Specific Example',
    framework: 'Situation / Task / Action / Result',
    promise: 'Turn a vague claim into a story an interviewer can trust.',
    steps: [
      { key: 'situation', label: 'Situation', help: 'The real scene, problem, or constraint.' },
      { key: 'task', label: 'Task', help: 'What was at stake and what you owned.' },
      { key: 'action', label: 'Action', help: 'The specific things you personally did.' },
      { key: 'result', label: 'Result', help: 'What changed because of your action.' },
    ],
  },
  career_alignment: {
    title: 'Career Alignment',
    framework: 'Observation / Fit / Timing',
    promise: 'Make the role feel chosen on purpose, not generically interesting.',
    steps: [
      { key: 'observation', label: 'Observation', help: 'A specific thing you noticed in the role.' },
      { key: 'fit', label: 'Fit', help: 'The matching part of your background.' },
      { key: 'timing', label: 'Timing', help: 'Why this move makes sense now.' },
    ],
  },
  handling_uncertainty: {
    title: 'Handling Uncertainty',
    framework: 'Recovery / Answer / Reason / Example',
    promise: 'Sound steady when the question catches you off guard.',
    steps: [
      { key: 'recovery', label: 'Recovery', help: 'A calm opener that buys one second.' },
      { key: 'answer', label: 'Answer', help: 'The direct point you are trying to make.' },
      { key: 'reason', label: 'Reason', help: 'Why that answer holds up.' },
      { key: 'example', label: 'Example', help: 'A real moment that backs it up.' },
    ],
  },
  pace_delivery: {
    title: 'Pace And Delivery',
    framework: 'Opener / Main Point / Landing',
    promise: 'Keep the same substance, but make it easier to hear.',
    steps: [
      { key: 'opener', label: 'Opener', help: 'The clean headline.' },
      { key: 'main_point', label: 'Main Point', help: 'Two or three supporting beats.' },
      { key: 'landing', label: 'Landing', help: 'A clean ending that does not trail off.' },
    ],
  },
  preparation_curiosity: {
    title: 'Preparation And Curiosity',
    framework: 'What You Know / What Stood Out / Your Question',
    promise: 'Show preparation with a specific observation and a useful question.',
    steps: [
      { key: 'what_you_know', label: 'What You Know', help: 'A real role or company detail.' },
      { key: 'what_stood_out', label: 'What Stood Out', help: 'Why that detail matters to you.' },
      { key: 'your_question', label: 'Your Question', help: 'The question that follows naturally.' },
    ],
  },
  role_depth: {
    title: 'Role Depth',
    framework: 'Context / Method / Tradeoff / Outcome',
    promise: 'Show how you think inside the work, not just around it.',
    steps: [
      { key: 'context', label: 'Context', help: 'The real work situation.' },
      { key: 'method', label: 'Method', help: 'The approach, tool, or process you used.' },
      { key: 'tradeoff', label: 'Tradeoff', help: 'What you weighed and chose.' },
      { key: 'outcome', label: 'Outcome', help: 'What happened because of that method.' },
    ],
  },
  problem_solving: {
    title: 'Problem Solving',
    framework: 'Clarify / Approach / Execute / Reflect',
    promise: 'Make your reasoning visible before the answer jumps to action.',
    steps: [
      { key: 'clarify', label: 'Clarify', help: 'What you needed to understand first.' },
      { key: 'approach', label: 'Approach', help: 'How you chose a path.' },
      { key: 'execute', label: 'Execute', help: 'What you actually did.' },
      { key: 'reflect', label: 'Reflect', help: 'What changed or what you learned.' },
    ],
  },
}

const PROVE_OPTIONS = ['ownership', 'judgment', 'specific proof', 'role fit', 'composure', 'preparation']
const TONE_OPTIONS = ['direct', 'warm', 'steady', 'specific', 'concise', 'confident']

function clean(value: string) {
  return value.trim().replace(/\s+/g, ' ')
}

function hashQuestion(question: string) {
  let h = 0
  for (let i = 0; i < question.length; i++) {
    h = (h << 5) - h + question.charCodeAt(i)
    h |= 0
  }
  return Math.abs(h).toString(36).slice(0, 8)
}

function confidenceClass(confidence: Confidence) {
  if (confidence === 'clear') return 'border-emerald-200 bg-emerald-50 text-emerald-700'
  if (confidence === 'inferred') return 'border-amber-200 bg-amber-50 text-amber-700'
  return 'border-rose-200 bg-rose-50 text-rose-700'
}

function average(scores?: VoiceResult['scores']) {
  if (!scores) return 0
  return Math.round((scores.coverage + scores.structure + scores.delivery) / 3)
}

export default function GuidedBuilderWorkshop({
  workshopType,
  sessionId,
  stageKey = 'hr_screen',
  originalQuestion,
  originalAnswer,
  repairFeedback,
  repairCriterion,
  onComplete,
}: GuidedBuilderWorkshopProps) {
  const config = CONFIGS[workshopType]
  const [phase, setPhase] = useState<Phase>('setup')
  const [prove, setProve] = useState(PROVE_OPTIONS[0])
  const [tone, setTone] = useState(TONE_OPTIONS[0])
  const [storyHint, setStoryHint] = useState('')
  const [showAlternatives, setShowAlternatives] = useState(false)
  const [skeleton, setSkeleton] = useState<ExtractedStep[]>([])
  const [summary, setSummary] = useState('')
  const [alternatives, setAlternatives] = useState<AlternativeStory[]>([])
  const [confirmed, setConfirmed] = useState<Record<string, string>>({})
  const [editingKey, setEditingKey] = useState<string | null>(null)
  const [editText, setEditText] = useState('')
  const [polished, setPolished] = useState<PolishedAnswer | null>(null)
  const [polishRegens, setPolishRegens] = useState(0)
  const [error, setError] = useState('')
  const [recording, setRecording] = useState(false)
  const [submittingVoice, setSubmittingVoice] = useState(false)
  const [voiceResult, setVoiceResult] = useState<VoiceResult | null>(null)
  const [hideScript, setHideScript] = useState(false)
  const [costs, setCosts] = useState<any[]>([])
  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const audioChunksRef = useRef<Blob[]>([])

  const questionLabel = originalQuestion?.trim() || 'Practice this answer.'
  const originalAnswerLabel = originalAnswer?.trim() || ''
  const confirmedCount = config.steps.filter((step) => clean(confirmed[step.key] || '')).length
  const readyToPolish = confirmedCount === config.steps.length
  const finalAnswer = polished?.finalAnswer || ''

  const progress = useMemo(() => {
    const order: Phase[] = ['setup', 'extracting', 'confirm', 'polishing', 'rehearse', 'done']
    return Math.max(1, order.indexOf(phase) + 1)
  }, [phase])

  const requestExtract = useCallback(async (hint = '') => {
    setPhase('extracting')
    setError('')
    try {
      const res = await fetch('/api/interview/guided-workshop', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          mode: 'extract',
          workshopType,
          sessionId,
          originalQuestion,
          originalAnswer,
          storyHint: hint,
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data?.error || 'extract_failed')
      setSkeleton(Array.isArray(data.skeleton) ? data.skeleton : [])
      setSummary(data.summary || '')
      setAlternatives(Array.isArray(data.alternatives) ? data.alternatives : [])
      setConfirmed({})
      setShowAlternatives(false)
      if (data.cost_estimate) setCosts((prev) => [...prev, { kind: 'extract', ...data.cost_estimate }])
      setPhase('confirm')
    } catch (e: any) {
      setError(e?.message || 'Could not build the answer material yet.')
      setPhase('setup')
    }
  }, [originalAnswer, originalQuestion, sessionId, workshopType])

  const requestPolish = useCallback(async (regenerate = false) => {
    if (!readyToPolish) return
    setPhase('polishing')
    setError('')
    try {
      const res = await fetch('/api/interview/guided-workshop', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          mode: 'polish',
          workshopType,
          sessionId,
          originalQuestion,
          originalAnswer,
          confirmed,
          prove,
          tone,
          repairFeedback,
          regenerate,
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data?.error || 'polish_failed')
      setPolished(data)
      if (data.cost_estimate) setCosts((prev) => [...prev, { kind: regenerate ? 'regenerate' : 'polish', ...data.cost_estimate }])
      if (regenerate) setPolishRegens((prev) => prev + 1)
      setPhase('rehearse')
    } catch (e: any) {
      setError(e?.message || 'Could not polish the answer yet.')
      setPhase('confirm')
    }
  }, [confirmed, originalAnswer, originalQuestion, prove, readyToPolish, repairFeedback, sessionId, tone, workshopType])

  function confirmStep(step: ExtractedStep) {
    if (!clean(step.raw)) {
      setEditingKey(step.key)
      setEditText('')
      return
    }
    setConfirmed((prev) => ({ ...prev, [step.key]: clean(step.raw) }))
  }

  function startEdit(step: ExtractedStep) {
    setEditingKey(step.key)
    setEditText(confirmed[step.key] || step.raw || '')
  }

  function saveEdit(step: ExtractedStep) {
    const value = clean(editText)
    if (!value) return
    setConfirmed((prev) => ({ ...prev, [step.key]: value }))
    setEditingKey(null)
    setEditText('')
  }

  async function startRecording() {
    if (!polished?.finalAnswer) return
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      audioChunksRef.current = []
      const recorder = new MediaRecorder(stream)
      mediaRecorderRef.current = recorder
      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) audioChunksRef.current.push(event.data)
      }
      recorder.onstop = () => {
        stream.getTracks().forEach((track) => track.stop())
        void submitVoice()
      }
      recorder.start()
      setRecording(true)
    } catch {
      setError('Microphone access is required for the voice rehearsal.')
    }
  }

  function stopRecording() {
    mediaRecorderRef.current?.stop()
    setRecording(false)
  }

  async function submitVoice() {
    if (!audioChunksRef.current.length || !polished?.finalAnswer) return
    setSubmittingVoice(true)
    setError('')
    try {
      const blob = new Blob(audioChunksRef.current, { type: 'audio/webm' })
      const fd = new FormData()
      fd.append('audio', blob, 'practice.webm')
      fd.append('built_answer', polished.finalAnswer)
      fd.append('workshop_type', workshopType)
      fd.append('confirmed_beats', JSON.stringify(confirmed))
      fd.append('original_answer', originalAnswer || '')
      fd.append('repair_feedback', repairFeedback || '')
      fd.append('session_id', sessionId || '')
      const res = await fetch('/api/interview/guided-workshop/voice-eval', { method: 'POST', body: fd })
      const data = await res.json()
      if (!res.ok) throw new Error(data?.error || 'voice_eval_failed')
      setVoiceResult(data)
      const nextCosts = data.cost_estimate ? [...costs, { kind: 'voice_eval', ...data.cost_estimate }] : costs
      if (data.cost_estimate) setCosts(nextCosts)
      saveToProfile(data, nextCosts)
      setPhase('done')
    } catch (e: any) {
      setError(e?.message || 'Could not score the rehearsal.')
    } finally {
      setSubmittingVoice(false)
    }
  }

  function saveToProfile(result: VoiceResult, costEstimates = costs) {
    const questionHash = hashQuestion(questionLabel)
    const key = `${workshopType}:${questionHash}`
    const value = polished?.finalAnswer || ''
    const meta = {
      workshop_type: workshopType,
      stage: stageKey,
      session_id: sessionId || null,
      original_question: questionLabel,
      original_answer: originalAnswer || '',
      repair_criterion: repairCriterion || '',
      repair_feedback: repairFeedback || '',
      selected_proof_goal: prove,
      selected_tone: tone,
      confirmed_beats: confirmed,
      polished_pieces: polished?.pieces || [],
      transcript: result.transcript,
      scores: result.scores,
      ready_for_retake: result.ready_for_retake,
      fixed_score_area: result.fixed_score_area,
      breakdown_phase: result.breakdown_phase,
      next_action: result.next_action,
      cost_estimates: costEstimates,
      timestamp: new Date().toISOString(),
    }
    fetch('/api/profile/practice-memory', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ key, value, stage: stageKey, sessionId, meta }),
    }).catch(() => {})
  }

  return (
    <div className="flex h-full min-h-[34rem] flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
      <div className="shrink-0 border-b border-slate-200 bg-slate-950 px-5 py-4 text-white">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-[10px] font-black uppercase tracking-[0.18em] text-violet-200">{config.framework}</p>
            <h2 className="mt-1 text-xl font-black">{config.title}</h2>
          </div>
          <div className="flex items-center gap-1.5">
            {[1, 2, 3, 4, 5, 6].map((item) => (
              <span key={item} className={`h-1.5 rounded-full ${item <= progress ? 'w-6 bg-violet-300' : 'w-3 bg-white/20'}`} />
            ))}
          </div>
        </div>
        <p className="mt-2 text-sm font-medium leading-6 text-slate-300">{config.promise}</p>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto px-5 py-5">
        {phase === 'setup' && (
          <div className="space-y-5">
            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
              <div className="flex items-center gap-2 text-xs font-black uppercase tracking-[0.16em] text-slate-500">
                <FileText className="h-4 w-4" />
                Flagged answer
              </div>
              <p className="mt-3 text-sm font-bold leading-6 text-slate-900">{questionLabel}</p>
              {originalAnswerLabel && (
                <p className="mt-2 line-clamp-4 text-sm leading-6 text-slate-600">{originalAnswerLabel}</p>
              )}
              {repairFeedback && (
                <p className="mt-3 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs font-semibold leading-5 text-amber-900">
                  {repairFeedback}
                </p>
              )}
            </div>

            <ChoiceGroup
              title="What should this answer prove?"
              options={PROVE_OPTIONS}
              selected={prove}
              onSelect={setProve}
            />
            <ChoiceGroup
              title="How should it sound?"
              options={TONE_OPTIONS}
              selected={tone}
              onSelect={setTone}
            />

            {error && <p className="rounded-xl bg-rose-50 px-3 py-2 text-sm font-bold text-rose-700">{error}</p>}

            <button
              type="button"
              onClick={() => requestExtract()}
              className="group flex w-full items-center justify-center gap-2 rounded-xl bg-violet-600 px-5 py-3.5 text-sm font-black text-white transition hover:bg-violet-700"
            >
              Build from my answer
              <ArrowRight className="h-4 w-4 transition group-hover:translate-x-0.5" />
            </button>
          </div>
        )}

        {phase === 'extracting' && (
          <LoadingState label="Finding the useful answer material..." />
        )}

        {phase === 'confirm' && (
          <div className="space-y-4">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.16em] text-violet-700">Confirm the story</p>
              <h3 className="mt-1 text-xl font-black text-slate-950">Here is what I found. Is this right?</h3>
              {summary && <p className="mt-2 text-sm font-semibold leading-6 text-slate-600">{summary}</p>}
            </div>

            <div className="space-y-3">
              {skeleton.map((step) => {
                const isConfirmed = Boolean(clean(confirmed[step.key] || ''))
                const isEditing = editingKey === step.key
                return (
                  <div key={step.key} className={`rounded-2xl border-2 p-4 ${isConfirmed ? 'border-emerald-300 bg-emerald-50/40' : 'border-slate-200 bg-white'}`}>
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="text-sm font-black text-slate-950">{step.label}</p>
                          <span className={`rounded-full border px-2 py-0.5 text-[10px] font-black uppercase ${confidenceClass(step.confidence)}`}>
                            {step.confidence}
                          </span>
                          {isConfirmed && <span className="rounded-full bg-emerald-500 px-2 py-0.5 text-[10px] font-black uppercase text-white">confirmed</span>}
                        </div>
                        <p className="mt-1 text-xs font-semibold leading-5 text-slate-500">{step.help || step.prompt}</p>
                      </div>
                    </div>

                    {isEditing ? (
                      <div className="mt-3">
                        <textarea
                          value={editText}
                          onChange={(event) => setEditText(event.target.value)}
                          placeholder={step.missingPrompt || step.prompt}
                          className="min-h-[7rem] w-full rounded-xl border border-slate-200 px-3 py-2 text-sm leading-6 outline-none focus:border-violet-400 focus:ring-2 focus:ring-violet-100"
                        />
                        <div className="mt-2 flex gap-2">
                          <button
                            type="button"
                            onClick={() => saveEdit(step)}
                            className="flex items-center gap-1.5 rounded-lg bg-slate-950 px-3 py-2 text-xs font-black text-white"
                          >
                            <Check className="h-3.5 w-3.5" />
                            Save beat
                          </button>
                          <button
                            type="button"
                            onClick={() => setEditingKey(null)}
                            className="flex items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-2 text-xs font-black text-slate-600"
                          >
                            <X className="h-3.5 w-3.5" />
                            Cancel
                          </button>
                        </div>
                      </div>
                    ) : (
                      <>
                        <p className="mt-3 text-sm font-semibold leading-6 text-slate-800">
                          {confirmed[step.key] || step.raw || step.missingPrompt || step.prompt}
                        </p>
                        {step.sourceNote && <p className="mt-2 text-xs font-medium leading-5 text-slate-400">{step.sourceNote}</p>}
                        <div className="mt-3 flex flex-wrap gap-2">
                          <button
                            type="button"
                            onClick={() => confirmStep(step)}
                            className="rounded-lg bg-emerald-600 px-3 py-2 text-xs font-black text-white"
                          >
                            Use this
                          </button>
                          <button
                            type="button"
                            onClick={() => startEdit(step)}
                            className="flex items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-2 text-xs font-black text-slate-700"
                          >
                            <Edit3 className="h-3.5 w-3.5" />
                            Adjust
                          </button>
                        </div>
                      </>
                    )}
                  </div>
                )
              })}
            </div>

            <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-4">
              <button
                type="button"
                onClick={() => setShowAlternatives((value) => !value)}
                className="flex w-full items-center justify-between text-left text-sm font-black text-slate-800"
              >
                Not this story?
                <RefreshCw className="h-4 w-4 text-slate-400" />
              </button>
              {showAlternatives && (
                <div className="mt-3 space-y-2">
                  {alternatives.map((alt, index) => (
                    <button
                      key={`${alt.label}-${index}`}
                      type="button"
                      onClick={() => {
                        const hint = clean(`${alt.label}. ${alt.detail || ''}`)
                        setStoryHint(hint)
                        void requestExtract(hint)
                      }}
                      className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-left hover:border-violet-300"
                    >
                      <p className="text-sm font-bold text-slate-900">{alt.label || `Option ${index + 1}`}</p>
                      {alt.detail && <p className="mt-1 text-xs leading-5 text-slate-500">{alt.detail}</p>}
                    </button>
                  ))}
                  <textarea
                    value={storyHint}
                    onChange={(event) => setStoryHint(event.target.value)}
                    placeholder="In one sentence, what story were you trying to tell?"
                    className="min-h-[5rem] w-full rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-violet-400"
                  />
                  <button
                    type="button"
                    onClick={() => requestExtract(storyHint)}
                    disabled={!clean(storyHint)}
                    className="rounded-lg bg-violet-600 px-3 py-2 text-xs font-black text-white disabled:opacity-40"
                  >
                    Rebuild around this
                  </button>
                </div>
              )}
            </div>

            {error && <p className="rounded-xl bg-rose-50 px-3 py-2 text-sm font-bold text-rose-700">{error}</p>}

            <button
              type="button"
              onClick={() => requestPolish(false)}
              disabled={!readyToPolish}
              className="group flex w-full items-center justify-center gap-2 rounded-xl bg-violet-600 px-5 py-3.5 text-sm font-black text-white transition hover:bg-violet-700 disabled:cursor-not-allowed disabled:opacity-40"
            >
              Polish the confirmed answer
              <Wand2 className="h-4 w-4" />
            </button>
          </div>
        )}

        {phase === 'polishing' && (
          <LoadingState label="Turning the confirmed beats into an answer you can say..." />
        )}

        {phase === 'rehearse' && polished && (
          <div className="space-y-4">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.16em] text-violet-700">Polished answer</p>
              <h3 className="mt-1 text-xl font-black text-slate-950">This is the version to practice.</h3>
              {polished.coachNote && <p className="mt-2 text-sm font-semibold leading-6 text-slate-600">{polished.coachNote}</p>}
            </div>

            <div className="space-y-2">
              {polished.pieces.map((piece) => (
                <div key={piece.key} className="rounded-2xl border border-slate-200 bg-white p-4">
                  <p className="text-xs font-black uppercase tracking-[0.16em] text-slate-400">{piece.label}</p>
                  <p className="mt-2 text-sm font-semibold leading-6 text-slate-900">{piece.text}</p>
                  <p className="mt-2 rounded-xl bg-violet-50 px-3 py-2 text-xs font-semibold leading-5 text-violet-900">{piece.rationale}</p>
                </div>
              ))}
            </div>

            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
              <div className="flex items-center justify-between gap-3">
                <p className="text-sm font-black text-slate-900">Full answer</p>
                <button
                  type="button"
                  onClick={() => setHideScript((value) => !value)}
                  className="text-xs font-black text-violet-700"
                >
                  {hideScript ? 'Show script' : 'Hide script'}
                </button>
              </div>
              {!hideScript && <p className="mt-3 text-sm font-semibold leading-7 text-slate-700">{polished.finalAnswer}</p>}
            </div>

            <div className="grid gap-2 sm:grid-cols-2">
              <button
                type="button"
                onClick={() => requestPolish(true)}
                disabled={polishRegens >= 1}
                className="flex items-center justify-center gap-2 rounded-xl border border-slate-200 px-4 py-3 text-sm font-black text-slate-700 disabled:opacity-40"
              >
                <RefreshCw className="h-4 w-4" />
                Tighten once
              </button>
              <button
                type="button"
                onClick={recording ? stopRecording : startRecording}
                disabled={submittingVoice}
                className={`flex items-center justify-center gap-2 rounded-xl px-4 py-3 text-sm font-black text-white ${recording ? 'bg-rose-600' : 'bg-slate-950'}`}
              >
                <Mic className="h-4 w-4" />
                {submittingVoice ? 'Scoring...' : recording ? 'Stop recording' : 'Say it out loud'}
              </button>
            </div>

            {submittingVoice && <LoadingState label="Checking whether the repair holds up when spoken..." compact />}
            {error && <p className="rounded-xl bg-rose-50 px-3 py-2 text-sm font-bold text-rose-700">{error}</p>}
          </div>
        )}

        {phase === 'done' && voiceResult && (
          <div className="space-y-4">
            <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-5">
              <div className="flex items-start gap-3">
                <ShieldCheck className="mt-0.5 h-6 w-6 text-emerald-600" />
                <div>
                  <p className="text-xs font-black uppercase tracking-[0.16em] text-emerald-700">
                    {voiceResult.ready_for_retake ? 'Ready for retake' : 'One more pass recommended'}
                  </p>
                  <h3 className="mt-1 text-2xl font-black text-slate-950">{average(voiceResult.scores)}/100</h3>
                  <p className="mt-2 text-sm font-semibold leading-6 text-slate-700">{voiceResult.feedback}</p>
                </div>
              </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-3">
              <ScoreTile label="Coverage" value={voiceResult.scores.coverage} />
              <ScoreTile label="Structure" value={voiceResult.scores.structure} />
              <ScoreTile label="Delivery" value={voiceResult.scores.delivery} />
            </div>

            {voiceResult.remaining_gap && (
              <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4">
                <p className="text-xs font-black uppercase tracking-[0.16em] text-amber-700">Remaining gap</p>
                <p className="mt-2 text-sm font-semibold leading-6 text-amber-950">{voiceResult.remaining_gap}</p>
              </div>
            )}

            {voiceResult.next_action && (
              <div className="rounded-2xl border border-slate-200 bg-white p-4">
                <p className="text-xs font-black uppercase tracking-[0.16em] text-slate-400">Next action</p>
                <p className="mt-2 text-sm font-semibold leading-6 text-slate-800">{voiceResult.next_action}</p>
              </div>
            )}

            <button
              type="button"
              onClick={onComplete}
              className="group flex w-full items-center justify-center gap-2 rounded-xl bg-violet-600 px-5 py-3.5 text-sm font-black text-white transition hover:bg-violet-700"
            >
              Finish workshop
              <ArrowRight className="h-4 w-4 transition group-hover:translate-x-0.5" />
            </button>
          </div>
        )}
      </div>

      {phase !== 'setup' && phase !== 'done' && (
        <div className="shrink-0 border-t border-slate-200 bg-white px-5 py-3">
          <button
            type="button"
            onClick={() => {
              if (phase === 'confirm') setPhase('setup')
              else if (phase === 'rehearse') setPhase('confirm')
            }}
            className="flex items-center gap-1.5 text-xs font-black text-slate-500 hover:text-slate-900"
          >
            <ChevronLeft className="h-4 w-4" />
            Back
          </button>
        </div>
      )}
    </div>
  )
}

function ChoiceGroup({
  title,
  options,
  selected,
  onSelect,
}: {
  title: string
  options: string[]
  selected: string
  onSelect: (value: string) => void
}) {
  return (
    <div>
      <p className="text-xs font-black uppercase tracking-[0.16em] text-slate-500">{title}</p>
      <div className="mt-2 flex flex-wrap gap-2">
        {options.map((option) => (
          <button
            key={option}
            type="button"
            onClick={() => onSelect(option)}
            className={`rounded-full border px-3 py-1.5 text-xs font-black capitalize transition ${
              selected === option
                ? 'border-violet-600 bg-violet-600 text-white'
                : 'border-slate-200 bg-white text-slate-600 hover:border-violet-300'
            }`}
          >
            {option}
          </button>
        ))}
      </div>
    </div>
  )
}

function LoadingState({ label, compact = false }: { label: string; compact?: boolean }) {
  return (
    <div className={`flex items-center justify-center gap-3 rounded-2xl border border-slate-200 bg-slate-50 ${compact ? 'px-4 py-3' : 'min-h-[18rem] p-8'}`}>
      <Loader2 className="h-5 w-5 animate-spin text-violet-600" />
      <p className="text-sm font-black text-slate-700">{label}</p>
      <Sparkles className="h-4 w-4 text-violet-300" />
    </div>
  )
}

function ScoreTile({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4 text-center">
      <p className="text-2xl font-black text-slate-950">{Math.round(value)}</p>
      <p className="mt-1 text-[10px] font-black uppercase tracking-[0.16em] text-slate-400">{label}</p>
    </div>
  )
}
