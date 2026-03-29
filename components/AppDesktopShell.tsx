'use client'

import { ReactNode } from 'react'
import AppSidebar from '@/components/AppSidebar'
import AppProgressRail from '@/components/AppProgressRail'

type ActiveSection = 'learn' | 'practice' | 'profile'
type StageKey = 'hr_screen' | 'hiring_manager' | 'culture_fit' | 'final'

interface ProcessStage {
  key: StageKey
  label: string
  status: 'current' | 'complete' | 'upcoming'
}

interface RailItem {
  label: string
  value: string
  progress?: number
  tone?: 'default' | 'success' | 'warning' | 'brand'
}

interface RailCard {
  title: string
  items: RailItem[]
}

interface AppDesktopShellProps {
  activeSection: ActiveSection
  processStages?: ProcessStage[]
  railCards?: RailCard[]
  children: ReactNode
}

export default function AppDesktopShell({
  activeSection,
  processStages = [],
  railCards = [],
  children,
}: AppDesktopShellProps) {
  return (
    <div className="hidden min-h-screen bg-[#0d141d] lg:grid lg:grid-cols-[248px_minmax(0,1fr)_320px_minmax(48px,1fr)]">
      <AppSidebar activeSection={activeSection} processStages={processStages} />
      <main className="min-w-0 bg-[linear-gradient(180deg,#f7f4ff_0%,#f4f7ff_40%,#eef4fb_100%)]">
        <div className="min-h-screen px-8 py-8">{children}</div>
      </main>
      <AppProgressRail cards={railCards} />
    </div>
  )
}
