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
  theme?: 'dark' | 'light'
  workspaceTabs?: Array<{
    label: string
    active: boolean
    onClick: () => void
  }>
  contextTitle?: string
  contextItems?: Array<{
    label: string
    status?: 'current' | 'complete' | 'upcoming' | 'locked'
    meta?: string
  }>
  footerText?: string
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

export default function AppSidebar({
  activeSection,
  processStages = [],
  theme = 'dark',
  workspaceTabs = [],
  contextTitle,
  contextItems = [],
  footerText = 'One primary surface, one next step, one place to return to.',
}: AppSidebarProps) {
  const pathname = usePathname()
  const isLight = theme === 'light'

  const shellClass = isLight
    ? 'hidden border-r border-slate-200/80 bg-[linear-gradient(180deg,#f6f3ff_0%,#f6f8ff_42%,#eff5fb_100%)] lg:order-1 lg:flex lg:min-h-screen lg:flex-col'
    : 'hidden border-r border-white/8 bg-[#101720] lg:order-1 lg:flex lg:min-h-screen lg:flex-col'
  const logoEyebrowClass = isLight ? 'text-violet-500/70' : 'text-violet-300/70'
  const logoTextClass = isLight ? 'text-slate-900' : 'text-white'
  const navIdleClass = isLight ? 'text-slate-500 hover:bg-white/70 hover:text-slate-900' : 'text-slate-400 hover:bg-white/4 hover:text-white'
  const navActiveClass = isLight
    ? 'border border-violet-300/70 bg-white/80 text-slate-900 shadow-[0_10px_20px_rgba(109,40,217,0.08)]'
    : 'border border-violet-400/30 bg-violet-500/14 text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]'
  const navActiveIconClass = isLight ? 'text-violet-600' : 'text-violet-300'
  const navIdleIconClass = isLight ? 'text-slate-400' : 'text-slate-500'
  const labelClass = isLight ? 'text-slate-400' : 'text-slate-500'
  const footerClass = isLight ? 'border-slate-200/80 bg-white/65 text-slate-700' : 'border-white/8 bg-white/4 text-slate-200'

  return (
    <aside className={shellClass}>
      <div className="flex h-full w-[248px] flex-col px-5 py-6">
        <Link href="/" className="mb-8 flex items-center gap-3">
          <img src="/logo.svg" alt="PrepMe" className="h-9 w-auto" />
          <div>
            <p className={`text-xs font-black uppercase tracking-[0.22em] ${logoEyebrowClass}`}>Premium Coach</p>
            <p className={`text-base font-black ${logoTextClass}`}>PrepMe</p>
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
                  isActive ? navActiveClass : navIdleClass
                }`}
              >
                <Icon className={`h-4 w-4 ${isActive ? navActiveIconClass : navIdleIconClass}`} />
                <span>{label}</span>
              </Link>
            )
          })}
        </nav>

        {workspaceTabs.length > 0 && (
          <div className="mt-6 rounded-[1.35rem] border border-slate-200/80 bg-white/70 p-1.5 shadow-[0_10px_24px_rgba(15,23,42,0.06)]">
            <div className="grid grid-cols-2 gap-1">
              {workspaceTabs.map((tab) => (
                <button
                  key={tab.label}
                  onClick={tab.onClick}
                  className={`rounded-[1rem] px-3 py-2 text-sm font-bold transition-all ${
                    tab.active
                      ? 'bg-violet-600 text-white shadow-[0_10px_18px_rgba(109,40,217,0.22)]'
                      : 'text-slate-500 hover:bg-white hover:text-slate-900'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>
          </div>
        )}

        {processStages.length > 0 && (
          <div className="mt-8">
            <p className={`mb-3 px-1 text-[11px] font-black uppercase tracking-[0.24em] ${labelClass}`}>Interview Process</p>
            <div className="space-y-2">
              {processStages.map((stage) => {
                const Icon = stageIcons[stage.key]
                return (
                  <div
                    key={stage.key}
                    className={`flex items-center gap-3 rounded-2xl px-4 py-3 ${
                      stage.status === 'current'
                        ? isLight ? 'bg-white/72 text-slate-900 shadow-[0_8px_18px_rgba(15,23,42,0.05)]' : 'bg-white/6 text-white'
                        : stage.status === 'complete'
                        ? isLight ? 'bg-emerald-50 text-emerald-800' : 'bg-emerald-500/10 text-emerald-200'
                        : isLight ? 'bg-transparent text-slate-500' : 'bg-transparent text-slate-500'
                    }`}
                  >
                    <div
                      className={`flex h-8 w-8 items-center justify-center rounded-xl ${
                        stage.status === 'current'
                          ? isLight ? 'bg-violet-100 text-violet-700' : 'bg-violet-500/16 text-violet-300'
                          : stage.status === 'complete'
                          ? isLight ? 'bg-emerald-100 text-emerald-700' : 'bg-emerald-500/18 text-emerald-300'
                          : isLight ? 'bg-slate-100 text-slate-500' : 'bg-white/5 text-slate-600'
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

        {contextTitle && contextItems.length > 0 && (
          <div className="mt-8">
            <p className={`mb-3 px-1 text-[11px] font-black uppercase tracking-[0.24em] ${labelClass}`}>{contextTitle}</p>
            <div className="space-y-2">
              {contextItems.map((item) => (
                <div
                  key={item.label}
                  className={`rounded-2xl px-4 py-3 ${
                    item.status === 'current'
                      ? isLight
                        ? 'border border-violet-200 bg-white/82 shadow-[0_10px_20px_rgba(109,40,217,0.08)]'
                        : 'border border-violet-400/25 bg-violet-500/10'
                      : item.status === 'complete'
                      ? isLight
                        ? 'border border-emerald-200 bg-emerald-50/90'
                        : 'bg-emerald-500/10'
                      : item.status === 'locked'
                      ? isLight
                        ? 'bg-slate-100/90 opacity-70'
                        : 'bg-white/4 opacity-70'
                      : isLight
                      ? 'bg-white/55'
                      : 'bg-white/4'
                  }`}
                >
                  <div className="flex items-center justify-between gap-3">
                    <p className={`text-sm font-semibold ${isLight ? 'text-slate-800' : 'text-slate-100'}`}>{item.label}</p>
                    {item.meta && <span className={`text-[11px] font-bold uppercase tracking-[0.18em] ${labelClass}`}>{item.meta}</span>}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className={`mt-auto rounded-[1.5rem] border px-4 py-4 ${footerClass}`}>
          <p className={`text-[11px] font-black uppercase tracking-[0.24em] ${labelClass}`}>Orientation</p>
          <p className={`mt-2 text-sm font-semibold ${isLight ? 'text-slate-700' : 'text-slate-200'}`}>{footerText}</p>
        </div>
      </div>
    </aside>
  )
}
