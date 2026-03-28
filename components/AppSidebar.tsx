'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { BookOpen, Target, User, Briefcase, Phone, Users, Crown } from 'lucide-react'

type ActiveSection = 'learn' | 'practice' | 'profile'
type StageKey = 'hr_screen' | 'hiring_manager' | 'culture_fit' | 'final'

interface ProcessStage {
  key: StageKey
  label: string
  status: 'current' | 'complete' | 'upcoming'
}

interface AppSidebarProps {
  activeSection: ActiveSection
  processStages?: ProcessStage[]
}

const navItems = [
  { key: 'learn', label: 'Prepare', href: '/dashboard', icon: BookOpen },
  { key: 'practice', label: 'Practice', href: '/interview/feedback?preview=mock', icon: Target },
  { key: 'profile', label: 'Profile', href: '/profile', icon: User },
] as const

const stageIcons: Record<StageKey, any> = {
  hr_screen: Phone,
  hiring_manager: Briefcase,
  culture_fit: Users,
  final: Crown,
}

export default function AppSidebar({ activeSection, processStages = [] }: AppSidebarProps) {
  const pathname = usePathname()

  return (
    <aside className="hidden border-r border-white/8 bg-[#101720] lg:order-1 lg:flex lg:min-h-screen lg:flex-col">
      <div className="flex h-full w-[248px] flex-col px-5 py-6">
        <Link href="/" className="mb-8 flex items-center gap-3">
          <img src="/logo.svg" alt="PrepMe" className="h-9 w-auto" />
          <div>
            <p className="text-xs font-black uppercase tracking-[0.22em] text-violet-300/70">Premium Coach</p>
            <p className="text-base font-black text-white">PrepMe</p>
          </div>
        </Link>

        <nav className="space-y-2">
          {navItems.map(({ key, label, href, icon: Icon }) => {
            const isActive = activeSection === key || pathname === href
            return (
              <Link
                key={key}
                href={href}
                className={`flex items-center gap-3 rounded-2xl px-4 py-3 text-sm font-bold transition-all ${
                  isActive
                    ? 'border border-violet-400/30 bg-violet-500/14 text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]'
                    : 'text-slate-400 hover:bg-white/4 hover:text-white'
                }`}
              >
                <Icon className={`h-4 w-4 ${isActive ? 'text-violet-300' : 'text-slate-500'}`} />
                <span>{label}</span>
              </Link>
            )
          })}
        </nav>

        {processStages.length > 0 && (
          <div className="mt-8">
            <p className="mb-3 px-1 text-[11px] font-black uppercase tracking-[0.24em] text-slate-500">Interview Process</p>
            <div className="space-y-2">
              {processStages.map((stage) => {
                const Icon = stageIcons[stage.key]
                return (
                  <div
                    key={stage.key}
                    className={`flex items-center gap-3 rounded-2xl px-4 py-3 ${
                      stage.status === 'current'
                        ? 'bg-white/6 text-white'
                        : stage.status === 'complete'
                        ? 'bg-emerald-500/10 text-emerald-200'
                        : 'bg-transparent text-slate-500'
                    }`}
                  >
                    <div
                      className={`flex h-8 w-8 items-center justify-center rounded-xl ${
                        stage.status === 'current'
                          ? 'bg-violet-500/16 text-violet-300'
                          : stage.status === 'complete'
                          ? 'bg-emerald-500/18 text-emerald-300'
                          : 'bg-white/5 text-slate-600'
                      }`}
                    >
                      <Icon className="h-4 w-4" />
                    </div>
                    <p className="text-sm font-semibold">{stage.label}</p>
                  </div>
                )
              })}
            </div>
          </div>
        )}

        <div className="mt-auto rounded-[1.5rem] border border-white/8 bg-white/4 px-4 py-4">
          <p className="text-[11px] font-black uppercase tracking-[0.24em] text-slate-500">Orientation</p>
          <p className="mt-2 text-sm font-semibold text-slate-200">One primary surface, one next step, one place to return to.</p>
        </div>
      </div>
    </aside>
  )
}
