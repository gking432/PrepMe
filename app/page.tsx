export const dynamic = 'force-dynamic'

import Link from 'next/link'
import Header from '@/components/Header'
import { Sparkles, ArrowRight, ShieldCheck, Briefcase, Mic, Target, Trophy, Waves } from 'lucide-react'

const pillars = [
  {
    icon: Mic,
    title: 'Real interview simulation',
    body: 'The interview itself stays formal. No games, no transcript clutter, no coaching interruptions.',
  },
  {
    icon: Target,
    title: 'Precise post-round coaching',
    body: 'You get specific feedback tied to what the interviewer cared about and what your answer actually showed.',
  },
  {
    icon: Trophy,
    title: 'Practice that changes outcomes',
    body: 'Rebuild weak answers, then say them out loud again under pressure before the real round matters.',
  },
]

export default function HomePage() {
  return (
    <div className="app-shell">
      <Header />

      <main className="page-container pb-20 pt-8 sm:pt-12">
        <section className="premium-panel overflow-hidden px-6 py-8 sm:px-10 sm:py-12 lg:px-14 lg:py-16">
          <div className="grid items-center gap-10 lg:grid-cols-[1.15fr_0.85fr]">
            <div>
              <div className="eyebrow eyebrow-coach mb-5">
                <Sparkles className="h-3.5 w-3.5" />
                Premium coach. Real interview pressure.
              </div>
              <h1 className="max-w-3xl text-4xl font-black tracking-tight text-slate-950 sm:text-5xl lg:text-6xl">
                Practice the interview process like it actually works.
              </h1>
              <p className="mt-5 max-w-2xl text-lg leading-8 text-slate-600 sm:text-xl">
                Start with a free HR screen, then sharpen your hiring manager, culture fit, and executive rounds with guided feedback,
                targeted drills, and voice re-performance that feels worth paying for.
              </p>
              <div className="mt-8 flex flex-col gap-3 sm:flex-row">
                <Link
                  href="/dashboard"
                  className="btn-coach-primary inline-flex items-center justify-center gap-2 px-7 py-4 text-base"
                >
                  Start free HR screen
                  <ArrowRight className="h-5 w-5" />
                </Link>
                <Link
                  href="/dashboard"
                  className="btn-coach-secondary inline-flex items-center justify-center gap-2 px-7 py-4 text-base"
                >
                  Explore the process
                </Link>
              </div>
              <div className="mt-8 flex flex-wrap items-center gap-3 text-sm font-semibold text-slate-500">
                <span className="rounded-full bg-white px-4 py-2 shadow-sm">HR screen free</span>
                <span className="rounded-full bg-white px-4 py-2 shadow-sm">Pay per stage or bundle</span>
                <span className="rounded-full bg-white px-4 py-2 shadow-sm">Voice-first practice</span>
              </div>
            </div>

            <div className="coach-card p-6 sm:p-7">
              <div className="rounded-[1.6rem] border border-slate-200/80 bg-slate-950 p-5 text-white shadow-[0_28px_50px_rgba(2,6,23,0.28)]">
                <div className="flex items-center justify-between border-b border-white/10 pb-4">
                  <div>
                    <p className="text-[11px] font-black uppercase tracking-[0.24em] text-slate-400">Interview Mode</p>
                    <h2 className="mt-1 text-xl font-black">Hiring Manager Round</h2>
                  </div>
                  <div className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs font-bold text-slate-300">
                    Formal simulation
                  </div>
                </div>
                <div className="mt-5 space-y-4">
                  <div className="rounded-2xl border border-white/8 bg-white/5 p-4">
                    <p className="text-xs font-black uppercase tracking-[0.18em] text-slate-500">Interviewer</p>
                    <p className="mt-2 text-sm leading-6 text-slate-100">
                      Walk me through the part you personally owned. What tradeoffs did you have to make, and what would you change now?
                    </p>
                  </div>
                  <div className="rounded-2xl border border-emerald-400/20 bg-emerald-400/10 p-4">
                    <p className="text-xs font-black uppercase tracking-[0.18em] text-emerald-200/70">After the round</p>
                    <p className="mt-2 text-sm leading-6 text-emerald-50">
                      We call out exactly where your answer lacked depth, then make you rebuild it before the real interview.
                    </p>
                  </div>
                  <div className="grid gap-3 sm:grid-cols-2">
                    <div className="rounded-2xl border border-white/8 bg-white/5 p-4">
                      <Waves className="h-5 w-5 text-sky-300" />
                      <p className="mt-3 text-sm font-black">Structured feedback</p>
                      <p className="mt-1 text-sm text-slate-400">What mattered, what slipped, and what the interviewer would remember.</p>
                    </div>
                    <div className="rounded-2xl border border-white/8 bg-white/5 p-4">
                      <ShieldCheck className="h-5 w-5 text-emerald-300" />
                      <p className="mt-3 text-sm font-black">Pressure-ready practice</p>
                      <p className="mt-1 text-sm text-slate-400">Learn it, drill it, then answer it again out loud.</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="mt-8 grid gap-5 lg:grid-cols-3">
          {pillars.map(({ icon: Icon, title, body }) => (
            <div key={title} className="premium-card p-6">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary-50 text-primary-600">
                <Icon className="h-5 w-5" />
              </div>
              <h3 className="mt-5 text-xl font-black text-slate-900">{title}</h3>
              <p className="mt-2 text-sm leading-7 text-slate-600">{body}</p>
            </div>
          ))}
        </section>

        <section className="mt-8 grid gap-6 lg:grid-cols-[0.95fr_1.05fr]">
          <div className="premium-card p-7">
            <div className="eyebrow mb-4">
              <Briefcase className="h-3.5 w-3.5" />
              How the product earns trust
            </div>
            <h2 className="text-2xl font-black text-slate-950">We give away the HR screen because the serious value comes after.</h2>
            <div className="mt-5 space-y-4 text-sm leading-7 text-slate-600">
              <p>The free HR screen shows users exactly how specific and honest the product is. That is the proof.</p>
              <p>Once they see what a hiring manager or executive round is going to demand, paying to practice becomes the obvious decision.</p>
              <p>PrepMe is not trying to teach someone how to do the job. It helps them perform credibly in the room they are about to enter.</p>
            </div>
          </div>

          <div className="coach-card p-7">
            <div className="eyebrow eyebrow-coach mb-4">Round progression</div>
            <div className="space-y-4">
              {[
                ['HR Screen', 'Broad diagnosis, cleaner teaching, confidence-building.'],
                ['Hiring Manager', 'Sharper evidence demands and deeper contribution testing.'],
                ['Culture Fit', 'Optional round focused on interpersonal judgment and credibility.'],
                ['Executive / Final', 'High-pressure answers, strategic thinking, and concise leadership communication.'],
              ].map(([title, body], index) => (
                <div key={title} className="flex gap-4 rounded-2xl border border-white/40 bg-white/70 p-4">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary-600 text-sm font-black text-white">
                    {index + 1}
                  </div>
                  <div>
                    <p className="text-sm font-black text-slate-900">{title}</p>
                    <p className="mt-1 text-sm leading-6 text-slate-600">{body}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>
      </main>
    </div>
  )
}
