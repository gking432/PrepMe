'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Briefcase, Phone, Users, Crown, FolderOpen, PlusSquare, ChevronDown, ChevronRight, FileText, Target, PlayCircle, Lock, Check } from 'lucide-react'

type ActiveSection = string
type StageKey = 'hr_screen' | 'hiring_manager' | 'culture_fit' | 'final'

interface ProcessStage {
  key: StageKey
  label: string
  status: 'current' | 'complete' | 'upcoming'
  href?: string
  onClick?: () => void
  expanded?: boolean
  children?: Array<{
    key: string
    label: string
    href?: string
    onClick?: () => void
    active?: boolean
    locked?: boolean
    statusLabel?: string
  }>
}

interface AppSidebarProps {
  activeSection: ActiveSection
  processStages?: ProcessStage[]
  theme?: 'dark' | 'light'
  navItemsOverride?: Array<{
    key: ActiveSection
    label: string
    href?: string
    onClick?: () => void
    icon: any
  }>
  navTitle?: string
  processTitle?: string
  contextTitle?: string
  contextItems?: Array<{
    label: string
    status?: 'current' | 'complete' | 'upcoming' | 'locked'
    meta?: string
  }>
  footerText?: string
}

const navItems = [
  { key: 'interviews', label: 'Interviews', href: '/dashboard', icon: Briefcase },
  { key: 'documents', label: 'Documents', href: '/dashboard?panel=documents', icon: FolderOpen },
  { key: 'new_process', label: 'New Process', href: '/dashboard?new=1', icon: PlusSquare },
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
  navItemsOverride,
  navTitle = 'Workspace',
  processTitle = 'Interview Stages',
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
  const navItemsToRender = navItemsOverride || navItems

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

        {processStages.length > 0 && (
          <div className="mt-8">
            <p className={`mb-3 px-1 text-[11px] font-black uppercase tracking-[0.24em] ${labelClass}`}>{processTitle}</p>
            <div className="relative space-y-2">
              <div className={`pointer-events-none absolute bottom-5 left-5 top-5 w-px ${isLight ? 'bg-[linear-gradient(180deg,#ddd6fe_0%,#e2e8f0_100%)]' : 'bg-[linear-gradient(180deg,rgba(167,139,250,0.38)_0%,rgba(148,163,184,0.18)_100%)]'}`} />
              {processStages.map((stage) => {
                const Icon = stageIcons[stage.key]
                const isCurrent = stage.status === 'current'
                const isComplete = stage.status === 'complete'
                const isUpcoming = stage.status === 'upcoming'
                const className = `flex w-full items-center gap-3 rounded-2xl px-4 py-3 text-left ${
                      isCurrent
                        ? isLight ? 'bg-white/72 text-slate-900 shadow-[0_8px_18px_rgba(15,23,42,0.05)]' : 'bg-white/6 text-white'
                        : isComplete
                        ? isLight ? 'bg-emerald-50 text-emerald-800' : 'bg-emerald-500/10 text-emerald-200'
                        : isLight ? 'bg-transparent text-slate-500' : 'bg-transparent text-slate-500'
                    }`
                const content = (
                  <>
                    <div className="relative flex h-8 w-8 items-center justify-center">
                      <span
                        className={`absolute left-1/2 top-1/2 h-3.5 w-3.5 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 ${
                          isCurrent
                            ? isLight
                              ? 'border-violet-500 bg-violet-500'
                              : 'border-violet-300 bg-violet-300'
                            : isComplete
                            ? isLight
                              ? 'border-emerald-500 bg-emerald-500'
                              : 'border-emerald-300 bg-emerald-300'
                            : isLight
                            ? 'border-slate-300 bg-white'
                            : 'border-slate-500 bg-[#101720]'
                        }`}
                      />
                      <div
                        className={`relative flex h-8 w-8 items-center justify-center rounded-xl ${
                          isCurrent
                            ? isLight ? 'bg-violet-100 text-violet-700' : 'bg-violet-500/16 text-violet-300'
                            : isComplete
                            ? isLight ? 'bg-emerald-100 text-emerald-700' : 'bg-emerald-500/18 text-emerald-300'
                            : isLight ? 'bg-slate-100 text-slate-500' : 'bg-white/5 text-slate-600'
                        }`}
                      >
                        {isComplete ? <Check className="h-4 w-4" /> : <Icon className="h-4 w-4" />}
                      </div>
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-semibold">{stage.label}</p>
                      <p className={`mt-0.5 text-[10px] font-black uppercase tracking-[0.18em] ${
                        isCurrent
                          ? isLight ? 'text-violet-500' : 'text-violet-300'
                          : isComplete
                          ? isLight ? 'text-emerald-600' : 'text-emerald-300'
                          : isLight ? 'text-slate-400' : 'text-slate-500'
                      }`}>
                        {isCurrent ? 'Current Round' : isComplete ? 'Complete' : isUpcoming ? 'Still Ahead' : ''}
                      </p>
                    </div>
                    {stage.children?.length ? (
                      stage.expanded ? <ChevronDown className="h-4 w-4 opacity-60" /> : <ChevronRight className="h-4 w-4 opacity-60" />
                    ) : null}
                  </>
                )

                return (
                  <div key={stage.key}>
                    {stage.onClick ? (
                      <button type="button" onClick={stage.onClick} className={className}>
                        {content}
                      </button>
                    ) : stage.href ? (
                      <Link href={stage.href} className={className}>
                        {content}
                      </Link>
                    ) : (
                      <div className={className}>{content}</div>
                    )}

                    {stage.expanded && stage.children?.length ? (
                      <div className="mt-2 space-y-2 pl-9">
                        {stage.children.map((child) => {
                          const childClass = `flex w-full items-center gap-3 rounded-2xl px-4 py-2.5 text-left text-sm font-semibold transition-all ${
                            child.active
                              ? isLight
                                ? 'border border-violet-200 bg-violet-50 text-violet-700'
                                : 'border border-violet-400/25 bg-violet-500/10 text-violet-200'
                              : isLight
                              ? 'text-slate-500 hover:bg-white/70 hover:text-slate-900'
                              : 'text-slate-400 hover:bg-white/4 hover:text-white'
                          } ${child.locked ? 'opacity-60' : ''}`
                          const childIcon = child.label === 'Feedback'
                            ? FileText
                            : child.label === 'Practice'
                            ? Target
                            : child.locked
                            ? Lock
                            : PlayCircle
                          const ChildIcon = childIcon

                          if (child.onClick) {
                            return (
                              <button key={child.key} type="button" onClick={child.onClick} className={childClass}>
                                <ChildIcon className="h-4 w-4" />
                                <span className="flex-1">{child.label}</span>
                                {child.statusLabel ? <span className={`text-[10px] font-black uppercase tracking-[0.18em] ${labelClass}`}>{child.statusLabel}</span> : null}
                              </button>
                            )
                          }

                          if (child.href) {
                            return (
                              <Link key={child.key} href={child.href} className={childClass}>
                                <ChildIcon className="h-4 w-4" />
                                <span className="flex-1">{child.label}</span>
                                {child.statusLabel ? <span className={`text-[10px] font-black uppercase tracking-[0.18em] ${labelClass}`}>{child.statusLabel}</span> : null}
                              </Link>
                            )
                          }

                          return (
                            <div key={child.key} className={childClass}>
                              <ChildIcon className="h-4 w-4" />
                              <span className="flex-1">{child.label}</span>
                              {child.statusLabel ? <span className={`text-[10px] font-black uppercase tracking-[0.18em] ${labelClass}`}>{child.statusLabel}</span> : null}
                            </div>
                          )
                        })}
                      </div>
                    ) : null}
                  </div>
                )
              })}
            </div>
          </div>
        )}

        <div className={processStages.length > 0 ? 'mt-8' : ''}>
          <p className={`mb-3 px-1 text-[11px] font-black uppercase tracking-[0.24em] ${labelClass}`}>{navTitle}</p>
          <nav className="space-y-2">
            {navItemsToRender.map(({ key, label, href, onClick, icon: Icon }) => {
              const isActive = activeSection === key || pathname === href
              const className = `flex w-full items-center gap-3 rounded-2xl px-4 py-3 text-sm font-bold transition-all ${
                isActive ? navActiveClass : navIdleClass
              }`
              const content = (
                <>
                  <Icon className={`h-4 w-4 ${isActive ? navActiveIconClass : navIdleIconClass}`} />
                  <span>{label}</span>
                </>
              )

              if (onClick) {
                return (
                  <button
                    key={key}
                    type="button"
                    onClick={onClick}
                    className={className}
                  >
                    {content}
                  </button>
                )
              }

              return (
                <Link
                  key={key}
                  href={href || '/'}
                  className={className}
                >
                  {content}
                </Link>
              )
            })}
          </nav>
        </div>

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
