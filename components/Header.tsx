'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase-client'
import { User, LogOut, Sparkles } from 'lucide-react'

export default function Header() {
  const [user, setUser] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const supabase = createClient()

  useEffect(() => {
    const getUser = async () => {
      const { data: { session } } = await supabase.auth.getSession()
      setUser(session?.user || null)
      setLoading(false)
    }
    getUser()

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user || null)
    })

    return () => subscription.unsubscribe()
  }, [])

  const handleLogout = async () => {
    await supabase.auth.signOut()
    window.location.href = '/'
  }

  return (
    <header className="sticky top-0 z-50 border-b border-white/40 bg-white/72 backdrop-blur-xl">
      <div className="page-container">
        <div className="flex items-center justify-between py-3.5">
          <Link href={user ? '/dashboard' : '/'} className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl border border-slate-200/80 bg-white shadow-[0_10px_24px_rgba(15,23,42,0.08)]">
              <img src="/logo.svg" alt="PrepMe" className="h-7 w-auto" />
            </div>
            <div className="hidden sm:block">
              <p className="text-[11px] font-black uppercase tracking-[0.22em] text-slate-400">Premium Coach</p>
              <p className="text-sm font-extrabold text-slate-900">PrepMe</p>
            </div>
          </Link>
          {!loading && (
            <div className="hidden md:flex items-center gap-2">
              {user ? (
                <>
                  <Link
                    href="/dashboard"
                    className="flex items-center gap-2 rounded-full border border-slate-200/80 bg-white px-4 py-2 text-sm font-semibold text-slate-600 shadow-sm hover:border-slate-300 hover:text-slate-900"
                  >
                    <User className="w-4 h-4" />
                    <span>Workspace</span>
                  </Link>
                  <button
                    onClick={handleLogout}
                    className="flex items-center gap-2 rounded-full border border-transparent px-4 py-2 text-sm font-semibold text-slate-500 hover:bg-slate-100 hover:text-slate-800"
                  >
                    <LogOut className="w-4 h-4" />
                    <span>Logout</span>
                  </button>
                </>
              ) : (
                <div className="flex items-center gap-2">
                  <div className="eyebrow">
                    <Sparkles className="h-3.5 w-3.5" />
                    HR screen free
                  </div>
                  <Link
                    href="/auth/login"
                    className="rounded-full px-4 py-2 text-sm font-bold text-primary-600 hover:bg-primary-50 hover:text-primary-700"
                  >
                    Log in
                  </Link>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </header>
  )
}
