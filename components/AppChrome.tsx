import { ReactNode } from 'react'
import Link from 'next/link'
import { Briefcase, Target, Sparkles } from 'lucide-react'

type Tab = 'preps' | 'practice' | 'account'

const NAV: { key: Tab; label: string; href: string; icon: any }[] = [
  { key: 'preps', label: 'Interviews', href: '/dashboard', icon: Briefcase },
  { key: 'practice', label: 'Practice', href: '/practice', icon: Target },
]

interface AppChromeProps {
  active?: Tab
  children: ReactNode
  maxWidth?: string
  hideMobileTabs?: boolean
}

export default function AppChrome({ active, children, maxWidth = 'max-w-5xl', hideMobileTabs }: AppChromeProps) {
  return (
    <div className="min-h-[100dvh] bg-[#fafaf9]">
      {/* Top bar */}
      <header className="sticky top-0 z-40 border-b border-slate-200 bg-white/90 backdrop-blur">
        <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-4 sm:px-6">
          <Link href="/dashboard" className="flex items-center" aria-label="PrepMe dashboard">
            <img src="/logo.svg" alt="PrepMe" className="h-7 w-auto" />
          </Link>

          <div className="flex items-center gap-2 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-sm font-semibold text-emerald-700">
            <Sparkles className="h-4 w-4" />
            <span>Demo mode</span>
          </div>
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
