'use client'

import { useState } from 'react'
import { HelpCircle } from 'lucide-react'
import { getImprovementTipForCriterion } from '@/lib/practice-bundles'

interface ImprovementTipProps {
  criterion: string
  rootCause?: string
  buttonLabel?: string
  align?: 'left' | 'right'
  rewrittenAnswer?: string
  rewriteMethod?: string
}

export default function ImprovementTip({
  criterion,
  rootCause,
  buttonLabel = 'Tip',
  align = 'right',
  rewrittenAnswer,
  rewriteMethod,
}: ImprovementTipProps) {
  const [open, setOpen] = useState(false)
  const tip = getImprovementTipForCriterion(criterion, rootCause)
  const panelAlignment = align === 'left' ? 'left-0' : 'right-0'

  return (
    <div
      className="relative"
      onMouseEnter={() => setOpen(true)}
      onMouseLeave={() => setOpen(false)}
    >
      <button
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        className="inline-flex items-center gap-2 rounded-full border border-amber-200 bg-white px-3 py-1.5 text-xs font-bold text-amber-700 transition hover:border-amber-300 hover:bg-amber-50"
        aria-expanded={open}
        aria-label={`Show improvement tip for ${criterion}`}
      >
        <HelpCircle className="h-3.5 w-3.5" />
        {buttonLabel}
      </button>

      {open ? (
        <div className={`absolute ${panelAlignment} top-full z-30 mt-2 w-80 max-w-[85vw] rounded-2xl border border-amber-200 bg-white p-4 shadow-[0_16px_40px_rgba(15,23,42,0.14)]`}>
          <p className="text-[11px] font-black uppercase tracking-[0.18em] text-amber-600">Tip For Improvement</p>
          <p className="mt-2 text-sm font-black text-slate-900">{tip.title}</p>
          <p className="mt-2 text-sm leading-6 text-slate-600">{tip.summary}</p>
          {tip.bullets.length > 0 ? (
            <div className="mt-3 space-y-2">
              {tip.bullets.map((bullet) => (
                <p key={bullet} className="rounded-xl bg-amber-50 px-3 py-2 text-xs leading-5 text-slate-700">
                  {bullet}
                </p>
              ))}
            </div>
          ) : null}
          <div className="mt-3 rounded-xl border border-slate-200 bg-slate-50 px-3 py-3">
            <p className="text-[11px] font-black uppercase tracking-[0.18em] text-slate-500">Before You Retry</p>
            <p className="mt-1 text-xs leading-5 text-slate-700">{tip.retryPrompt}</p>
          </div>
          {rewrittenAnswer ? (
            <div className="mt-3 rounded-xl border border-accent-200 bg-accent-50 px-3 py-3">
              <div className="flex items-center justify-between gap-3">
                <p className="text-[11px] font-black uppercase tracking-[0.18em] text-accent-700">Better Version</p>
                {rewriteMethod ? (
                  <span className="rounded-full bg-white px-2 py-1 text-[10px] font-black uppercase tracking-[0.12em] text-accent-700">
                    {rewriteMethod}
                  </span>
                ) : null}
              </div>
              <p className="mt-2 text-xs font-semibold leading-5 text-slate-800">&ldquo;{rewrittenAnswer}&rdquo;</p>
            </div>
          ) : null}
        </div>
      ) : null}
    </div>
  )
}
