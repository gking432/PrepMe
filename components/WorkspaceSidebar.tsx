'use client'

import { ReactNode } from 'react'
import { Archive, Briefcase, CheckCircle2, FolderOpen, PlusSquare } from 'lucide-react'

type View = 'interviews' | 'documents'
type Tab = 'active' | 'finished' | 'archived'

interface Props {
  activeView: View
  activeTab: Tab
  counts: { active: number; finished: number; archived: number }
  onSelectTab: (tab: Tab) => void
  onSelectDocuments: () => void
  onNewPrep: () => void
}

const TAB_ITEMS: { key: Tab; label: string; icon: any }[] = [
  { key: 'active', label: 'Active', icon: Briefcase },
  { key: 'finished', label: 'Finished', icon: CheckCircle2 },
  { key: 'archived', label: 'Archived', icon: Archive },
]

function NavRow({
  isActive,
  onClick,
  icon,
  label,
  count,
}: {
  isActive: boolean
  onClick: () => void
  icon: ReactNode
  label: string
  count?: number
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex w-full items-center justify-between gap-2 rounded-xl px-3 py-2.5 text-left transition-colors ${
        isActive ? 'bg-accent-50 ring-1 ring-accent-200' : 'hover:bg-slate-50'
      }`}
    >
      <span className="flex items-center gap-2.5">
        <span className={isActive ? 'text-accent-600' : 'text-slate-400'}>{icon}</span>
        <span className={`text-sm font-semibold ${isActive ? 'text-accent-700' : 'text-slate-800'}`}>{label}</span>
      </span>
      {typeof count === 'number' && (
        <span className={`text-[11px] font-semibold ${isActive ? 'text-accent-600' : 'text-slate-400'}`}>{count}</span>
      )}
    </button>
  )
}

export default function WorkspaceSidebar({
  activeView,
  activeTab,
  counts,
  onSelectTab,
  onSelectDocuments,
  onNewPrep,
}: Props) {
  const total = counts.active + counts.finished + counts.archived

  return (
    <aside className="flex h-full min-h-0 flex-col rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      <div>
        <p className="text-xs font-semibold uppercase tracking-wider text-accent-600">Workspace</p>
        <h2 className="mt-1 text-base font-bold text-slate-900">Interviews</h2>
        <p className="text-xs text-slate-500">{total} {total === 1 ? 'interview' : 'interviews'}</p>
      </div>

      <div className="mt-4 -mx-1.5 space-y-1">
        {TAB_ITEMS.map((item) => {
          const Icon = item.icon
          const isActive = activeView === 'interviews' && activeTab === item.key
          return (
            <NavRow
              key={item.key}
              isActive={isActive}
              onClick={() => onSelectTab(item.key)}
              icon={<Icon className="h-4 w-4" />}
              label={item.label}
              count={counts[item.key]}
            />
          )
        })}
      </div>

      <div className="mt-3 -mx-1.5 border-t border-slate-100 pt-3">
        <NavRow
          isActive={activeView === 'documents'}
          onClick={onSelectDocuments}
          icon={<FolderOpen className="h-4 w-4" />}
          label="Documents"
        />
      </div>

      <div className="mt-auto pt-4">
        <button
          type="button"
          onClick={onNewPrep}
          className="btn-coach-primary flex w-full items-center justify-center gap-2 px-4 py-2.5 text-sm"
        >
          <PlusSquare className="h-4 w-4" /> New interview
        </button>
      </div>
    </aside>
  )
}
