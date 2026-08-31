'use client'

import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import {
  ArrowRight,
  Braces,
  CheckCircle2,
  ExternalLink,
  Gauge,
  GitBranch,
  Mic2,
  ShieldCheck,
  Sparkles,
  Target,
  X,
} from 'lucide-react'
import { PORTFOLIO_EVALUATION_SUMMARY, PORTFOLIO_GOLDEN_EVALUATIONS } from '@/lib/portfolio-evaluations'

const PIPELINE = [
  { label: 'Context', detail: 'Fictional résumé + role', icon: Braces },
  { label: 'Interview', detail: 'Realtime voice or text', icon: Mic2 },
  { label: 'Transcript', detail: 'Normalized question/answer turns', icon: GitBranch },
  { label: 'Evaluation', detail: 'Six explicit HR signals', icon: Target },
  { label: 'Coaching', detail: 'Evidence-linked workshops', icon: Sparkles },
] as const

export default function AiImplementationDrawer() {
  const [open, setOpen] = useState(false)
  const triggerRef = useRef<HTMLButtonElement>(null)
  const closeRef = useRef<HTMLButtonElement>(null)

  useEffect(() => {
    if (!open) return
    const previousOverflow = document.body.style.overflow
    const trigger = triggerRef.current
    document.body.style.overflow = 'hidden'
    closeRef.current?.focus()
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpen(false)
    }
    window.addEventListener('keydown', onKeyDown)
    return () => {
      document.body.style.overflow = previousOverflow
      window.removeEventListener('keydown', onKeyDown)
      trigger?.focus()
    }
  }, [open])

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        onClick={() => setOpen(true)}
        className="flex items-center gap-2 rounded-lg border border-violet-200 bg-violet-50 px-3 py-1.5 text-sm font-semibold text-violet-700 transition hover:border-violet-300 hover:bg-violet-100"
      >
        <Sparkles className="h-4 w-4" />
        <span>How the AI works</span>
      </button>

      {open && typeof document !== 'undefined' ? createPortal(
        <div
          className="fixed inset-0 z-[100] flex justify-end bg-slate-950/35 backdrop-blur-sm"
          role="presentation"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) setOpen(false)
          }}
        >
          <aside
            role="dialog"
            aria-modal="true"
            aria-labelledby="ai-implementation-title"
            className="flex h-full w-full max-w-4xl flex-col overflow-hidden border-l border-slate-200 bg-white shadow-2xl"
          >
            <div className="flex shrink-0 items-start justify-between gap-4 border-b border-slate-200 px-6 py-5">
              <div>
                <p className="text-[10px] font-black uppercase tracking-[0.18em] text-violet-600">Implementation notes</p>
                <h2 id="ai-implementation-title" className="mt-1 text-2xl font-black text-slate-950">
                  Applied AI, not a chat wrapper.
                </h2>
                <p className="mt-2 text-sm leading-6 text-slate-600">
                  Next.js and TypeScript coordinate OpenAI Realtime, Anthropic grading and coaching, browser-local demo state, and Supabase product persistence.
                </p>
              </div>
              <button
                ref={closeRef}
                type="button"
                onClick={() => setOpen(false)}
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-slate-100 text-slate-600 transition hover:bg-slate-200"
                aria-label="Close implementation notes"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="min-h-0 flex-1 overflow-hidden px-6 py-4">
              <section aria-labelledby="pipeline-title">
                <h3 id="pipeline-title" className="text-xs font-black uppercase tracking-[0.16em] text-slate-500">AI pipeline</h3>
                <div className="mt-3 grid grid-cols-5 gap-2">
                  {PIPELINE.map((step, index) => {
                    const Icon = step.icon
                    return (
                      <div key={step.label} className="relative rounded-xl border border-slate-200 bg-slate-50 px-3 py-3">
                        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-violet-100 text-violet-700">
                          <Icon className="h-4 w-4" />
                        </span>
                        <div className="mt-2 min-w-0">
                          <p className="text-xs font-extrabold text-slate-900">{index + 1}. {step.label}</p>
                          <p className="mt-0.5 text-[11px] leading-4 text-slate-500">{step.detail}</p>
                        </div>
                        {index < PIPELINE.length - 1 ? <ArrowRight className="absolute right-2 top-3 h-4 w-4 text-slate-300" /> : <CheckCircle2 className="absolute right-2 top-3 h-4 w-4 text-emerald-500" />}
                      </div>
                    )
                  })}
                </div>
              </section>

              <div className="mt-4 grid grid-cols-2 gap-3">
                <section className="rounded-2xl border border-emerald-200 bg-emerald-50/70 p-4">
                  <ShieldCheck className="h-5 w-5 text-emerald-700" />
                  <h3 className="mt-2 text-sm font-black text-slate-900">Reliability and safety</h3>
                  <p className="mt-1 text-xs leading-5 text-slate-600">
                    Typed and completed-sample fallbacks, sparse-session handling, payload limits, rate limits, and private-network URL rejection.
                  </p>
                </section>
                <section className="rounded-2xl border border-sky-200 bg-sky-50/70 p-4">
                  <Gauge className="h-5 w-5 text-sky-700" />
                  <h3 className="mt-2 text-sm font-black text-slate-900">Validated contracts</h3>
                  <p className="mt-1 text-xs leading-5 text-slate-600">
                    Model JSON is parsed, schema checked, and rejected before malformed feedback or coaching reaches the UI.
                  </p>
                </section>
              </div>

              <section className="mt-4 rounded-2xl border-2 border-violet-200 bg-violet-50/60 p-3.5" aria-labelledby="evaluation-title">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-[10px] font-black uppercase tracking-[0.16em] text-violet-600">Checked-in evaluation suite</p>
                    <h3 id="evaluation-title" className="mt-1 text-lg font-black text-slate-950">
                      {PORTFOLIO_EVALUATION_SUMMARY.passed}/{PORTFOLIO_EVALUATION_SUMMARY.total} golden scenarios passing
                    </h3>
                  </div>
                  <span className="rounded-full bg-white px-3 py-1 text-[10px] font-black uppercase tracking-[0.12em] text-violet-700">
                    {PORTFOLIO_EVALUATION_SUMMARY.verifiedOn}
                  </span>
                </div>
                <div className="mt-3 grid grid-cols-4 gap-2">
                  {PORTFOLIO_GOLDEN_EVALUATIONS.map((evaluation) => (
                    <div key={evaluation.id} className="flex items-start gap-2 rounded-lg bg-white/80 px-2.5 py-2">
                      <CheckCircle2 className="mt-0.5 h-3.5 w-3.5 shrink-0 text-emerald-500" />
                      <p className="text-[11px] font-bold leading-4 text-slate-700">{evaluation.label}</p>
                    </div>
                  ))}
                </div>
              </section>

            </div>

            <div className="grid shrink-0 grid-cols-2 gap-3 border-t border-slate-200 px-6 py-4">
              <a
                href="https://github.com/gking432/PrepMe"
                target="_blank"
                rel="noreferrer"
                className="flex items-center justify-center gap-2 rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-bold text-slate-700 transition hover:bg-slate-50"
              >
                <ExternalLink className="h-4 w-4" />
                View source
              </a>
              <a
                href="https://github.com/gking432/PrepMe/blob/codex/portfolio-hr-demo/docs/portfolio-case-study.md"
                target="_blank"
                rel="noreferrer"
                className="flex items-center justify-center gap-2 rounded-xl bg-violet-600 px-4 py-2.5 text-sm font-bold text-white transition hover:bg-violet-700"
              >
                <Braces className="h-4 w-4" />
                Read case study
              </a>
            </div>
          </aside>
        </div>,
        document.body,
      ) : null}
    </>
  )
}
