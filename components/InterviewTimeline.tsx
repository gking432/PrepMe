'use client'

import { Phone, Briefcase, Users, Crown, Check, Lock } from 'lucide-react'

interface Stage {
  id: string
  label: string
  shortLabel: string
  icon: any
  status: 'completed' | 'current' | 'locked' | 'upcoming'
}

interface InterviewTimelineProps {
  currentStage: string
  completedStages: string[]
  isPremium: boolean
}

const STAGES = [
  { id: 'hr_screen', label: 'HR Screen', shortLabel: 'HR', icon: Phone },
  { id: 'hiring_manager', label: 'Hiring Manager', shortLabel: 'HM', icon: Briefcase },
  { id: 'culture_fit', label: 'Culture Fit', shortLabel: 'CF', icon: Users },
  { id: 'final', label: 'Final Round', shortLabel: 'Final', icon: Crown },
]

export default function InterviewTimeline({ currentStage, completedStages, isPremium }: InterviewTimelineProps) {
  const stages: Stage[] = STAGES.map((s) => {
    const isCompleted = completedStages.includes(s.id)
    const isCurrent = s.id === currentStage
    const currentIdx = STAGES.findIndex((st) => st.id === currentStage)
    const thisIdx = STAGES.findIndex((st) => st.id === s.id)
    const isUpcoming = thisIdx > currentIdx && !isCompleted
    const isLocked = isUpcoming && !isPremium

    return {
      ...s,
      status: isCompleted ? 'completed' : isCurrent ? 'current' : isLocked ? 'locked' : 'upcoming',
    }
  })

  return (
    <div className="bg-white border-b border-gray-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between py-3 overflow-x-auto">
          {stages.map((stage, i) => {
            const Icon = stage.icon
            const isLast = i === stages.length - 1

            return (
              <div key={stage.id} className="flex items-center flex-1 min-w-0">
                {/* Stage node */}
                <div className="flex items-center gap-2 shrink-0">
                  <div
                    className={`w-8 h-8 rounded-full flex items-center justify-center transition-all ${
                      stage.status === 'completed'
                        ? 'bg-emerald-500 text-white'
                        : stage.status === 'current'
                          ? 'bg-primary-500 text-white ring-4 ring-primary-100'
                          : stage.status === 'locked'
                            ? 'bg-gray-100 text-gray-400'
                            : 'bg-gray-100 text-gray-500'
                    }`}
                  >
                    {stage.status === 'completed' ? (
                      <Check className="w-4 h-4" />
                    ) : stage.status === 'locked' ? (
                      <Lock className="w-3.5 h-3.5" />
                    ) : (
                      <Icon className="w-4 h-4" />
                    )}
                  </div>
                  <span
                    className={`text-sm font-medium hidden sm:block ${
                      stage.status === 'completed'
                        ? 'text-emerald-700'
                        : stage.status === 'current'
                          ? 'text-primary-700 font-bold'
                          : 'text-gray-400'
                    }`}
                  >
                    {stage.label}
                  </span>
                  <span
                    className={`text-xs font-medium sm:hidden ${
                      stage.status === 'completed'
                        ? 'text-emerald-700'
                        : stage.status === 'current'
                          ? 'text-primary-700 font-bold'
                          : 'text-gray-400'
                    }`}
                  >
                    {stage.shortLabel}
                  </span>
                </div>

                {/* Connector line */}
                {!isLast && (
                  <div className="flex-1 mx-2 sm:mx-3">
                    <div
                      className={`h-0.5 rounded-full ${
                        stage.status === 'completed' ? 'bg-emerald-400' : 'bg-gray-200'
                      }`}
                    />
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
