import { ReactNode } from 'react'
import Link from 'next/link'
import { Briefcase, Target } from 'lucide-react'
import AiImplementationDrawer from '@/components/AiImplementationDrawer'
import { PORTFOLIO_DEMO_MODE } from '@/lib/portfolio-demo'

type Tab = 'preps' | 'practice' | 'account'

const NAV: { key: Tab; label: string; href: string; icon: any }[] = [
  { key: 'preps', label: 'Interviews', href: '/dashboard', icon: Briefcase },
  { key: 'practice', label: 'Practice', href: '/practice', icon: Target },
]

interface AppChromeProps {
  active?: Tab
  children: ReactNode
  maxWidth?: string
  headerMaxWidth?: string
  hideMobileTabs?: boolean
  aiActivityMessage?: string
}

export default function AppChrome({ active, children, maxWidth = 'max-w-5xl', headerMaxWidth, hideMobileTabs, aiActivityMessage }: AppChromeProps) {
  return (
    <div className="min-h-[100dvh] bg-[#fafaf9]">
      {/* Top bar */}
      <header className="sticky top-0 z-40 border-b border-slate-200 bg-white/90 backdrop-blur">
        <div className={`mx-auto flex h-14 w-full ${headerMaxWidth || maxWidth} items-center justify-between px-4 sm:px-6`}>
          <Link href="/dashboard" className="flex items-center" aria-label="PrepMe dashboard">
            <span className="text-[19px] font-semibold leading-none text-slate-900 sm:hidden">Prep<span className="text-accent-600">Me</span></span>
            <img src="/logo.svg" alt="PrepMe" className="hidden h-7 w-auto sm:block" />
          </Link>

          {PORTFOLIO_DEMO_MODE ? (
            <div className="flex items-center gap-2">
              <span className="hidden rounded-full bg-emerald-50 px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.14em] text-emerald-700 sm:inline-flex">Portfolio demo</span>
              <AiImplementationDrawer activityMessage={aiActivityMessage} />
            </div>
          ) : null}
        </div>
      </header>

      {/* Content */}
      <main className={`mx-auto w-full ${maxWidth} px-4 pb-24 pt-6 sm:px-6 md:pb-14`}>{children}</main>

      {/* Mobile bottom tabs */}
      <nav className={`fixed inset-x-0 bottom-0 z-40 grid grid-cols-2 border-t border-slate-200 bg-white/95 backdrop-blur md:hidden ${hideMobileTabs ? 'hidden' : ''}`}>
        {NAV.map((n) => {
          const Icon = n.icon
          const on = active === n.key
          return (
            <Link
              key={n.key}
              href={n.href}
              className={`flex flex-col items-center gap-1 py-2.5 text-[11px] font-medium ${
                on ? 'text-accent-600' : 'text-slate-400'
              }`}
            >
              <Icon className="h-5 w-5" />
              {n.label}
            </Link>
          )
        })}
      </nav>
    </div>
  )
}
