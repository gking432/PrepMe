import Link from 'next/link'
import AiImplementationDrawer from '@/components/AiImplementationDrawer'
import { PORTFOLIO_DEMO_MODE } from '@/lib/portfolio-demo'

export default function Header() {
  return (
    <header className="sticky top-0 z-50 border-b border-white/40 bg-white/72 backdrop-blur-xl">
      <div className="page-container">
        <div className="flex items-center justify-between py-3.5">
          <Link href="/dashboard" className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl border border-slate-200/80 bg-white shadow-[0_10px_24px_rgba(15,23,42,0.08)]">
              <img src="/logo.svg" alt="PrepMe" className="h-7 w-auto" />
            </div>
            <div className="hidden sm:block">
              <p className="text-[11px] font-black uppercase tracking-[0.22em] text-slate-400">Premium Coach</p>
              <p className="text-sm font-extrabold text-slate-900">PrepMe</p>
            </div>
          </Link>
          {PORTFOLIO_DEMO_MODE ? (
            <div className="hidden items-center gap-2 md:flex">
              <span className="eyebrow">Portfolio demo</span>
              <AiImplementationDrawer />
            </div>
          ) : null}
        </div>
      </div>
    </header>
  )
}
