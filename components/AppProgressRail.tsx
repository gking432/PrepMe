'use client'

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

interface AppProgressRailProps {
  cards: RailCard[]
}

function progressBarClass(tone: RailItem['tone']) {
  switch (tone) {
    case 'success':
      return 'bg-[linear-gradient(90deg,#34d399_0%,#16a34a_100%)]'
    case 'warning':
      return 'bg-[linear-gradient(90deg,#fbbf24_0%,#f59e0b_100%)]'
    case 'brand':
      return 'bg-[linear-gradient(90deg,#8b5cf6_0%,#6d28d9_100%)]'
    default:
      return 'bg-[linear-gradient(90deg,#64748b_0%,#475569_100%)]'
  }
}

export default function AppProgressRail({ cards }: AppProgressRailProps) {
  return (
    <aside className="hidden border-l border-white/8 bg-[#101720] lg:order-3 lg:block">
      <div className="sticky top-0 flex min-h-screen w-[320px] flex-col gap-5 px-5 py-6">
        {cards.map((card) => (
          <div key={card.title} className="rounded-[1.7rem] border border-white/8 bg-white/[0.04] p-5">
            <h3 className="text-sm font-black uppercase tracking-[0.22em] text-slate-400">{card.title}</h3>
            <div className="mt-4 space-y-4">
              {card.items.map((item) => (
                <div key={item.label}>
                  <div className="mb-1.5 flex items-center justify-between gap-3">
                    <p className="text-sm font-semibold text-slate-200">{item.label}</p>
                    <span className="text-xs font-bold text-slate-400">{item.value}</span>
                  </div>
                  {typeof item.progress === 'number' && (
                    <div className="h-2 overflow-hidden rounded-full bg-white/8">
                      <div
                        className={`h-full rounded-full ${progressBarClass(item.tone)}`}
                        style={{ width: `${Math.max(0, Math.min(100, item.progress))}%` }}
                      />
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </aside>
  )
}
