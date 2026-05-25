'use client'

import { ReactNode, useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase-client'
import { Briefcase, Target, LogOut, ChevronDown, UserRound } from 'lucide-react'

type Tab = 'preps' | 'practice' | 'account'

const NAV: { key: Tab; label: string; href: string; icon: any }[] = [
  { key: 'preps', label: 'My Preps', href: '/dashboard', icon: Briefcase },
  { key: 'practice', label: 'Practice', href: '/practice', icon: Target },
  { key: 'account', label: 'Account', href: '/profile', icon: UserRound },
]

interface AppChromeProps {
  active?: Tab
  children: ReactNode
  maxWidth?: string
}

export default function AppChrome({ active, children, maxWidth = 'max-w-5xl' }: AppChromeProps) {
  const [email, setEmail] = useState<string | undefined>(undefined)
  const [menuOpen, setMenuOpen] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const supabase = createClient()
    supabase.auth.getSession().then(({ data }) => setEmail(data.session?.user?.email || undefined))
  }, [])

  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setMenuOpen(false)
    }
    document.addEventListener('mousedown', onClick)
    return () => document.removeEventListener('mousedown', onClick)
  }, [])

  const signOut = async () => {
    const supabase = createClient()
    await supabase.auth.signOut()
    window.location.href = '/'
  }

  return (
    <div className="min-h-[100dvh] bg-[#f8fafc]">
      {/* Top bar */}
      <header className="sticky top-0 z-40 border-b border-slate-200 bg-white/90 backdrop-blur">
        <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-4 sm:px-6">
          <div className="flex items-center gap-7">
            <Link href="/dashboard" className="flex items-center gap-2">
              <img src="/logo.svg" alt="PrepMe" className="h-6 w-auto" />
              <span className="text-[17px] font-bold tracking-tight text-slate-900">PrepMe</span>
            </Link>
            <nav className="hidden items-center gap-1 md:flex">
              {NAV.filter((n) => n.key !== 'account').map((n) => {
                const Icon = n.icon
                const on = active === n.key
                return (
                  <Link
                    key={n.key}
                    href={n.href}
                    className={`flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                      on ? 'bg-slate-100 text-slate-900' : 'text-slate-500 hover:bg-slate-50 hover:text-slate-900'
                    }`}
                  >
                    <Icon className="h-4 w-4" />
                    {n.label}
                  </Link>
                )
              })}
            </nav>
          </div>

          <div className="relative" ref={menuRef}>
            <button
              type="button"
              onClick={() => setMenuOpen((v) => !v)}
              className="flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50"
            >
              <span className="flex h-6 w-6 items-center justify-center rounded-full bg-accent-600 text-xs font-bold text-white">
                {(email?.[0] || 'U').toUpperCase()}
              </span>
              <span className="hidden max-w-[160px] truncate sm:inline">{email || 'Account'}</span>
              <ChevronDown className="h-4 w-4 text-slate-400" />
            </button>
            {menuOpen && (
              <div className="absolute right-0 mt-2 w-56 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-lg">
                <div className="border-b border-slate-100 px-4 py-3">
                  <p className="text-xs font-medium text-slate-400">Signed in as</p>
                  <p className="truncate text-sm font-semibold text-slate-800">{email || 'Account'}</p>
                </div>
                <Link
                  href="/profile"
                  className="flex items-center gap-2 px-4 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50"
                >
                  <UserRound className="h-4 w-4 text-slate-400" />
                  Profile &amp; billing
                </Link>
                <button
                  type="button"
                  onClick={signOut}
                  className="flex w-full items-center gap-2 px-4 py-2.5 text-left text-sm font-medium text-slate-700 hover:bg-slate-50"
                >
                  <LogOut className="h-4 w-4 text-slate-400" />
                  Log out
                </button>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* Content */}
      <main className={`mx-auto w-full ${maxWidth} px-4 pb-24 pt-6 sm:px-6 md:pb-14`}>{children}</main>

      {/* Mobile bottom tabs */}
      <nav className="fixed inset-x-0 bottom-0 z-40 grid grid-cols-3 border-t border-slate-200 bg-white/95 backdrop-blur md:hidden">
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
