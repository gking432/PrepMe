'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { ClipboardList, User } from 'lucide-react'

const tabs = [
  { href: '/dashboard', icon: ClipboardList, label: 'Prep' },
  { href: '/profile', icon: User, label: 'Profile' },
]

export default function MobileNav() {
  const pathname = usePathname()

  return (
    <nav
      className="md:hidden fixed bottom-0 left-0 right-0 z-50 border-t border-slate-200/80 bg-white/90 backdrop-blur-xl"
      style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}
    >
      <div className="mx-auto flex max-w-lg px-3 pb-1 pt-2">
        {tabs.map(({ href, icon: Icon, label }) => {
          const active = pathname === href || pathname.startsWith(href + '/')
          return (
            <Link
              key={href}
              href={href}
              className={`flex-1 flex flex-col items-center justify-center gap-1 rounded-2xl py-2.5 transition-colors ${
                active ? 'bg-primary-50 text-primary-700' : 'text-slate-400'
              }`}
            >
              <Icon className={`w-5 h-5 ${active ? 'stroke-[2.5]' : 'stroke-2'}`} />
              <span className={`text-[10px] ${active ? 'font-extrabold' : 'font-semibold'}`}>{label}</span>
            </Link>
          )
        })}
      </div>
    </nav>
  )
}
