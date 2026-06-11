'use client'

import { useMemo, useState } from 'react'
import { ArrowRight, BookOpen, Check, RotateCcw, Sparkles } from 'lucide-react'
import {
  type Drill,
  buildLessonDrills,
  LESSON_PASS_THRESHOLD,
  RESET_PHRASE_BANK,
} from '@/lib/handling-uncertainty-bank'

interface HandlingUncertaintyLessonProps {
  sessionId?: string
  originalQuestion?: string
  originalAnswer?: string
  onComplete: () => void
}

type Screen = 'what_happened' | 'teach' | 'drill' | 'result'

export default function HandlingUncertaintyLesson({
  originalQuestion,
  originalAnswer,
  onComplete,
}: HandlingUncertaintyLessonProps) {
  const [screen, setScreen] = useState<Screen>('what_happened')
  const [attemptKey, setAttemptKey] = useState(0)
  const drills = useMemo(() => buildLessonDrills(), [attemptKey])

  const [drillIndex, setDrillIndex] = useState(0)
  const [correctCount, setCorrectCount] = useState(0)
  const [showPhraseBank, setShowPhraseBank] = useState(false)

  const totalDrills = drills.length

  function startDrills() {
    setDrillIndex(0)
    setCorrectCount(0)
    setScreen('drill')
  }

  function handleDrillResult(wasCorrect: boolean) {
    const nextCorrect = correctCount + (wasCorrect ? 1 : 0)
    if (drillIndex + 1 >= totalDrills) {
      setCorrectCount(nextCorrect)
      setScreen('result')
    } else {
      setCorrectCount(nextCorrect)
      setDrillIndex((i) => i + 1)
    }
  }

  function retry() {
    setAttemptKey((k) => k + 1)
    setDrillIndex(0)
    setCorrectCount(0)
    setScreen('drill')
  }

  // ─── Screen 1: What Happened ───────────────────────────────────────────────

  if (screen === 'what_happened') {
    return (
      <div className="flex h-full flex-col overflow-y-auto">
        <div className="mx-auto w-full max-w-2xl space-y-5 px-4 py-6">
          <div>
            <p className="text-[10px] font-black uppercase tracking-[0.16em] text-violet-600">
              The Reset Lesson
            </p>
            <h2 className="mt-1 text-lg font-black text-slate-900">
              You started before you had an answer
            </h2>
            <p className="mt-2 text-sm leading-6 text-slate-500">
              When you freeze in an interview, the instinct is to start talking immediately.
              That usually creates a roundabout answer. The better move is to buy yourself a
              second, simplify the question, and choose what kind of answer it needs.
            </p>
          </div>

          {(originalQuestion || originalAnswer) && (
            <div className="space-y-3 rounded-2xl border-2 border-slate-200 bg-slate-50 p-4">
              {originalQuestion && (
                <div>
                  <p className="text-[10px] font-black uppercase tracking-[0.14em] text-slate-400">
                    Question
                  </p>
                  <p className="mt-1 text-sm font-semibold leading-6 text-slate-800">
                    {originalQuestion}
                  </p>
                </div>
              )}
              {originalAnswer && (
                <div>
                  <p className="text-[10px] font-black uppercase tracking-[0.14em] text-slate-400">
                    Your answer
                  </p>
                  <p className="mt-1 text-sm leading-6 text-slate-600">{originalAnswer}</p>
                </div>
              )}
            </div>
          )}

          <div className="rounded-2xl border-2 border-violet-200 bg-violet-50/50 p-4">
            <p className="text-[10px] font-black uppercase tracking-[0.14em] text-violet-600">
              The move you’ll learn
            </p>
            <p className="mt-2 text-base font-black text-slate-900">
              Rephrase → Pause → Pick a Lane → Start
            </p>
          </div>

          <button
            type="button"
            onClick={() => setScreen('teach')}
            className="flex w-full items-center justify-center gap-2 rounded-2xl bg-violet-600 px-5 py-3.5 text-sm font-extrabold text-white shadow-md transition hover:bg-violet-700 active:scale-[0.98]"
          >
            Learn the reset
            <ArrowRight className="h-4 w-4" />
          </button>
        </div>
      </div>
    )
  }

  // ─── Screen 2: Teach the Reset ─────────────────────────────────────────────

  if (screen === 'teach') {
    return (
      <div className="flex h-full flex-col overflow-y-auto">
        <div className="mx-auto w-full max-w-2xl space-y-5 px-4 py-6">
          <div>
            <h2 className="text-lg font-black text-slate-900">Use the reset line</h2>
            <p className="mt-2 text-sm leading-6 text-slate-500">
              When a question catches you off guard, lead with this:
            </p>
          </div>

          <div className="rounded-2xl border-2 border-violet-300 bg-violet-50 p-4">
            <p className="text-sm font-bold leading-7 text-violet-900">
              “Yeah, so <span className="underline decoration-violet-400 decoration-2 underline-offset-2">[simpler version of the question]</span>… let me think about that for a second.”
            </p>
          </div>

          <div className="rounded-2xl border-2 border-slate-200 bg-white p-4">
            <p className="text-[10px] font-black uppercase tracking-[0.14em] text-slate-400">
              This does four things
            </p>
            <ul className="mt-2 space-y-1.5">
              {['Buys you time', 'Shows you understood the question', 'Makes the question easier to answer', 'Gives your brain a place to search'].map((item, i) => (
                <li key={i} className="flex items-start gap-2 text-sm leading-6 text-slate-700">
                  <span className="mt-1 flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-violet-100 text-[10px] font-black text-violet-700">
                    {i + 1}
                  </span>
                  {item}
                </li>
              ))}
            </ul>
          </div>

          <div className="rounded-2xl border-2 border-amber-200 bg-amber-50 p-4">
            <p className="text-sm leading-6 text-amber-900">
              A short pause is not awkward — it usually makes you look more thoughtful. You can
              also take a sip of water or jot down 2–3 words before answering.
            </p>
          </div>

          <button
            type="button"
            onClick={startDrills}
            className="flex w-full items-center justify-center gap-2 rounded-2xl bg-violet-600 px-5 py-3.5 text-sm font-extrabold text-white shadow-md transition hover:bg-violet-700 active:scale-[0.98]"
          >
            <Sparkles className="h-4 w-4" />
            Practice the reset
          </button>
        </div>
      </div>
    )
  }

  // ─── Screen 3: Drills ──────────────────────────────────────────────────────

  if (screen === 'drill') {
    return (
      <div className="flex h-full flex-col overflow-y-auto">
        <div className="mx-auto w-full max-w-2xl px-4 py-5">
          {/* Progress */}
          <div className="mb-5 flex items-center gap-1.5">
            {drills.map((_, i) => (
              <div
                key={i}
                className={`h-1.5 flex-1 rounded-full transition ${
                  i < drillIndex ? 'bg-violet-500' : i === drillIndex ? 'bg-violet-300' : 'bg-slate-200'
                }`}
              />
            ))}
          </div>

          <div key={`${attemptKey}-${drillIndex}`}>
            <DrillRenderer
              drill={drills[drillIndex]}
              onResult={handleDrillResult}
              isLast={drillIndex + 1 >= totalDrills}
            />
          </div>
        </div>
      </div>
    )
  }

  // ─── Screen 4: Result ──────────────────────────────────────────────────────

  const passed = correctCount >= LESSON_PASS_THRESHOLD

  return (
    <div className="flex h-full flex-col overflow-y-auto">
      <div className="mx-auto w-full max-w-2xl space-y-5 px-4 py-6">
        <div className="rounded-2xl border-2 border-slate-200 bg-white p-5 text-center">
          <div
            className={`mx-auto flex h-16 w-16 items-center justify-center rounded-full ${
              passed ? 'bg-emerald-100' : 'bg-amber-100'
            }`}
          >
            {passed ? (
              <Check className="h-8 w-8 text-emerald-600" />
            ) : (
              <RotateCcw className="h-8 w-8 text-amber-600" />
            )}
          </div>
          <h2 className="mt-3 text-lg font-black text-slate-900">
            {passed ? 'Nice — you’ve got the reset' : 'Almost there'}
          </h2>
          <p className="mt-1 text-sm font-bold text-slate-500">
            {correctCount} / {totalDrills} correct
          </p>
          <p className="mt-2 text-sm leading-6 text-slate-500">
            {passed
              ? 'When a question catches you off guard, rephrase it, pause, pick a lane, and start. You don’t need the perfect answer — you need a clean start.'
              : 'Review the reset line and try the drill again. The goal is muscle memory, not a perfect score.'}
          </p>
        </div>

        {/* Phrase bank reference */}
        <div className="rounded-2xl border-2 border-slate-200 bg-white">
          <button
            type="button"
            onClick={() => setShowPhraseBank((v) => !v)}
            className="flex w-full items-center justify-between px-4 py-3 text-left"
          >
            <span className="flex items-center gap-2 text-sm font-extrabold text-slate-800">
              <BookOpen className="h-4 w-4 text-violet-500" />
              Reset phrase bank
            </span>
            <ArrowRight
              className={`h-4 w-4 text-slate-400 transition-transform ${showPhraseBank ? 'rotate-90' : ''}`}
            />
          </button>
          {showPhraseBank && (
            <div className="space-y-1.5 border-t border-slate-100 px-4 pb-4 pt-3">
              {RESET_PHRASE_BANK.map((phrase, i) => (
                <p key={i} className="text-sm leading-6 text-slate-600">
                  {phrase}
                </p>
              ))}
            </div>
          )}
        </div>

        <div className="flex gap-2">
          {!passed && (
            <button
              type="button"
              onClick={retry}
              className="flex flex-1 items-center justify-center gap-2 rounded-2xl border-2 border-violet-300 bg-white px-5 py-3.5 text-sm font-extrabold text-violet-700 transition hover:bg-violet-50 active:scale-[0.98]"
            >
              <RotateCcw className="h-4 w-4" />
              Try again
            </button>
          )}
          <button
            type="button"
            onClick={onComplete}
            className={`flex flex-1 items-center justify-center gap-2 rounded-2xl px-5 py-3.5 text-sm font-extrabold text-white shadow-md transition active:scale-[0.98] ${
              passed ? 'bg-emerald-500 hover:bg-emerald-600' : 'bg-violet-600 hover:bg-violet-700'
            }`}
          >
            <Check className="h-4 w-4" />
            Done
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── Drill Renderer ──────────────────────────────────────────────────────────

function DrillRenderer({
  drill,
  onResult,
  isLast,
}: {
  drill: Drill
  onResult: (wasCorrect: boolean) => void
  isLast: boolean
}) {
  if (drill.kind === 'complete_line') {
    return <CompleteLineDrill drill={drill} onResult={onResult} isLast={isLast} />
  }
  return <ChoiceDrill drill={drill} onResult={onResult} isLast={isLast} />
}

const DRILL_PROMPT: Record<Drill['kind'], string> = {
  best_reset: 'Which start gives you the best reset?',
  match_rephrase: 'Which is the best simpler version of this question?',
  pick_lane: 'What kind of answer does this question need?',
  fix_weak_start: 'What’s the better start?',
  complete_line: 'Build the best reset line.',
  recovery_move: 'What should you say?',
}

function ChoiceDrill({
  drill,
  onResult,
  isLast,
}: {
  drill: Exclude<Drill, { kind: 'complete_line' }>
  onResult: (wasCorrect: boolean) => void
  isLast: boolean
}) {
  const [selected, setSelected] = useState<number | null>(null)
  const [checked, setChecked] = useState(false)

  const optionLabels =
    drill.kind === 'pick_lane' ? drill.options.map((o) => o.label) : (drill.options as string[])
  const isCorrect = selected === drill.correctIndex

  return (
    <div className="space-y-4">
      {/* Context */}
      <div>
        {drill.kind === 'recovery_move' ? (
          <p className="text-sm font-bold leading-6 text-slate-800">{drill.scenario}</p>
        ) : (
          <>
            <p className="text-[10px] font-black uppercase tracking-[0.14em] text-slate-400">
              Interviewer asks
            </p>
            <p className="mt-1 text-sm font-bold leading-6 text-slate-800">“{drill.question}”</p>
            {drill.kind === 'fix_weak_start' && (
              <div className="mt-3 rounded-xl border-2 border-red-200 bg-red-50 px-3 py-2">
                <p className="text-[10px] font-black uppercase tracking-[0.14em] text-red-500">
                  Weak start
                </p>
                <p className="mt-0.5 text-sm leading-6 text-red-900">“{drill.weakStart}”</p>
              </div>
            )}
          </>
        )}
      </div>

      <p className="text-sm font-extrabold text-slate-700">{DRILL_PROMPT[drill.kind]}</p>

      {/* Options */}
      <div className="space-y-2">
        {optionLabels.map((label, i) => {
          const showCorrect = checked && i === drill.correctIndex
          const showWrong = checked && i === selected && i !== drill.correctIndex
          const isSelected = selected === i
          return (
            <button
              key={i}
              type="button"
              disabled={checked}
              onClick={() => setSelected(i)}
              className={`w-full rounded-xl border-2 px-3 py-2.5 text-left text-sm leading-6 transition ${
                showCorrect
                  ? 'border-emerald-400 bg-emerald-50 text-emerald-900'
                  : showWrong
                    ? 'border-red-400 bg-red-50 text-red-900'
                    : isSelected
                      ? 'border-violet-400 bg-violet-50 text-slate-900'
                      : 'border-slate-200 bg-white text-slate-700 hover:border-violet-300'
              } ${checked ? 'cursor-default' : ''}`}
            >
              {drill.kind === 'pick_lane' ? <span className="font-bold">{label}</span> : <>“{label}”</>}
            </button>
          )
        })}
      </div>

      {/* Feedback */}
      {checked && (
        <div
          className={`rounded-xl px-3 py-2.5 ${
            isCorrect ? 'bg-emerald-50 border border-emerald-200' : 'bg-amber-50 border border-amber-200'
          }`}
        >
          <p className={`text-xs font-black uppercase tracking-[0.12em] ${isCorrect ? 'text-emerald-600' : 'text-amber-600'}`}>
            {isCorrect ? 'Correct' : 'Not quite'}
          </p>
          <p className="mt-1 text-sm leading-6 text-slate-700">{drill.feedback}</p>
        </div>
      )}

      {/* Action */}
      {!checked ? (
        <button
          type="button"
          disabled={selected === null}
          onClick={() => setChecked(true)}
          className="flex w-full items-center justify-center gap-2 rounded-2xl bg-violet-600 px-5 py-3 text-sm font-extrabold text-white shadow-md transition hover:bg-violet-700 active:scale-[0.98] disabled:opacity-40"
        >
          Check
        </button>
      ) : (
        <button
          type="button"
          onClick={() => onResult(isCorrect)}
          className="flex w-full items-center justify-center gap-2 rounded-2xl bg-slate-900 px-5 py-3 text-sm font-extrabold text-white shadow-md transition hover:bg-slate-800 active:scale-[0.98]"
        >
          {isLast ? 'See results' : 'Continue'}
          <ArrowRight className="h-4 w-4" />
        </button>
      )}
    </div>
  )
}

function CompleteLineDrill({
  drill,
  onResult,
  isLast,
}: {
  drill: Extract<Drill, { kind: 'complete_line' }>
  onResult: (wasCorrect: boolean) => void
  isLast: boolean
}) {
  const [built, setBuilt] = useState<number[]>([]) // tile indices in chosen order
  const [checked, setChecked] = useState(false)

  const builtTiles = built.map((i) => drill.tiles[i])
  const isCorrect =
    builtTiles.length === drill.correctOrder.length &&
    builtTiles.every((tile, i) => tile === drill.correctOrder[i])

  function toggleTile(i: number) {
    if (checked) return
    setBuilt((prev) => (prev.includes(i) ? prev.filter((x) => x !== i) : [...prev, i]))
  }

  return (
    <div className="space-y-4">
      <div>
        <p className="text-[10px] font-black uppercase tracking-[0.14em] text-slate-400">
          Interviewer asks
        </p>
        <p className="mt-1 text-sm font-bold leading-6 text-slate-800">“{drill.question}”</p>
      </div>

      <p className="text-sm font-extrabold text-slate-700">{DRILL_PROMPT.complete_line}</p>

      {/* Build area */}
      <div className="min-h-[3.5rem] rounded-xl border-2 border-dashed border-slate-300 bg-slate-50 p-2">
        {built.length === 0 ? (
          <p className="px-1 py-2 text-xs text-slate-400">Tap tiles below to build your reset line…</p>
        ) : (
          <div className="flex flex-wrap gap-1.5">
            {built.map((tileIndex, position) => (
              <button
                key={position}
                type="button"
                disabled={checked}
                onClick={() => toggleTile(tileIndex)}
                className="rounded-lg bg-violet-600 px-2.5 py-1.5 text-xs font-bold text-white"
              >
                {drill.tiles[tileIndex]}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Tile bank */}
      <div className="flex flex-wrap gap-1.5">
        {drill.tiles.map((tile, i) => {
          const used = built.includes(i)
          return (
            <button
              key={i}
              type="button"
              disabled={checked || used}
              onClick={() => toggleTile(i)}
              className={`rounded-lg border-2 px-2.5 py-1.5 text-xs font-bold transition ${
                used
                  ? 'border-slate-100 bg-slate-100 text-slate-300'
                  : 'border-slate-200 bg-white text-slate-700 hover:border-violet-300'
              }`}
            >
              {tile}
            </button>
          )
        })}
      </div>

      {/* Feedback */}
      {checked && (
        <div
          className={`rounded-xl px-3 py-2.5 ${
            isCorrect ? 'bg-emerald-50 border border-emerald-200' : 'bg-amber-50 border border-amber-200'
          }`}
        >
          <p className={`text-xs font-black uppercase tracking-[0.12em] ${isCorrect ? 'text-emerald-600' : 'text-amber-600'}`}>
            {isCorrect ? 'Correct' : 'Not quite'}
          </p>
          {!isCorrect && (
            <p className="mt-1 text-sm leading-6 text-slate-700">
              Best line: “{drill.correctOrder.join(' ')}”
            </p>
          )}
          <p className="mt-1 text-sm leading-6 text-slate-700">{drill.feedback}</p>
        </div>
      )}

      {/* Action */}
      {!checked ? (
        <button
          type="button"
          disabled={built.length === 0}
          onClick={() => setChecked(true)}
          className="flex w-full items-center justify-center gap-2 rounded-2xl bg-violet-600 px-5 py-3 text-sm font-extrabold text-white shadow-md transition hover:bg-violet-700 active:scale-[0.98] disabled:opacity-40"
        >
          Check
        </button>
      ) : (
        <button
          type="button"
          onClick={() => onResult(isCorrect)}
          className="flex w-full items-center justify-center gap-2 rounded-2xl bg-slate-900 px-5 py-3 text-sm font-extrabold text-white shadow-md transition hover:bg-slate-800 active:scale-[0.98]"
        >
          {isLast ? 'See results' : 'Continue'}
          <ArrowRight className="h-4 w-4" />
        </button>
      )}
    </div>
  )
}
