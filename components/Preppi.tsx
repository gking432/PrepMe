'use client'

import { useState, useEffect } from 'react'

interface PreppiProps {
  message?: string
  size?: 'sm' | 'md' | 'lg' | 'xl'
  animate?: boolean
  className?: string
}

export default function Preppi({ message, size = 'md', animate = true, className = '' }: PreppiProps) {
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    if (animate) {
      const t = setTimeout(() => setVisible(true), 150)
      return () => clearTimeout(t)
    } else {
      setVisible(true)
    }
  }, [animate])

  const sizes = {
    sm: { bird: 40, wrapper: 'gap-2' },
    md: { bird: 56, wrapper: 'gap-3' },
    lg: { bird: 80, wrapper: 'gap-4' },
    xl: { bird: 120, wrapper: 'gap-5' },
  }

  const s = sizes[size]

  return (
    <div
      className={`flex items-end ${s.wrapper} transition-all duration-500 ${visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-2'} ${className}`}
    >
      {/* Parrot SVG */}
      <div className="shrink-0" style={{ width: s.bird, height: s.bird }}>
        <PreppiSVG />
      </div>

      {/* Speech bubble */}
      {message && (
        <div className="relative bg-white border border-gray-200 rounded-2xl rounded-bl-sm px-4 py-3 shadow-sm max-w-xs">
          <p className="text-sm text-gray-700 leading-snug">{message}</p>
          {/* Tail */}
          <div className="absolute -left-2 bottom-3 w-0 h-0 border-t-[6px] border-t-transparent border-r-[8px] border-r-white border-b-[6px] border-b-transparent" />
          <div className="absolute -left-[9px] bottom-[10px] w-0 h-0 border-t-[7px] border-t-transparent border-r-[9px] border-r-gray-200 border-b-[7px] border-b-transparent" />
        </div>
      )}
    </div>
  )
}

export function PreppiSVG() {
  return (
    <svg viewBox="0 0 80 80" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-full drop-shadow-sm">
      {/* Body */}
      <ellipse cx="40" cy="50" rx="18" ry="22" fill="#7C3AED" />
      {/* Wing left */}
      <ellipse cx="24" cy="52" rx="9" ry="14" fill="#6D28D9" transform="rotate(-15 24 52)" />
      {/* Wing right */}
      <ellipse cx="56" cy="52" rx="9" ry="14" fill="#6D28D9" transform="rotate(15 56 52)" />
      {/* Belly */}
      <ellipse cx="40" cy="54" rx="10" ry="14" fill="#DDD6FE" />
      {/* Tail feathers */}
      <path d="M32 68 Q28 78 24 76 Q30 70 32 68Z" fill="#5B21B6" />
      <path d="M40 70 Q38 82 34 80 Q38 72 40 70Z" fill="#6D28D9" />
      <path d="M48 68 Q52 78 56 76 Q50 70 48 68Z" fill="#5B21B6" />
      {/* Head */}
      <circle cx="40" cy="28" r="16" fill="#7C3AED" />
      {/* Head crest */}
      <path d="M36 14 Q38 6 40 8 Q42 6 44 14" stroke="#5B21B6" strokeWidth="2.5" strokeLinecap="round" fill="none" />
      <circle cx="40" cy="7" r="3" fill="#FDE68A" />
      {/* Face patch */}
      <ellipse cx="40" cy="30" rx="9" ry="8" fill="#EDE9FE" />
      {/* Eyes — oversized, expressive */}
      <circle cx="35" cy="24" r="6" fill="white" />
      <circle cx="45" cy="24" r="6" fill="white" />
      <circle cx="36" cy="25" r="3" fill="#1A1A2E" />
      <circle cx="46" cy="25" r="3" fill="#1A1A2E" />
      {/* Eye shine */}
      <circle cx="37.5" cy="23.5" r="1.2" fill="white" />
      <circle cx="47.5" cy="23.5" r="1.2" fill="white" />
      {/* Beak */}
      <path d="M37 31 Q40 36 43 31 Q40 29 37 31Z" fill="#F97316" />
      {/* Feet */}
      <line x1="35" y1="71" x2="33" y2="76" stroke="#F97316" strokeWidth="2" strokeLinecap="round" />
      <line x1="33" y1="76" x2="30" y2="78" stroke="#F97316" strokeWidth="2" strokeLinecap="round" />
      <line x1="33" y1="76" x2="31" y2="79" stroke="#F97316" strokeWidth="2" strokeLinecap="round" />
      <line x1="45" y1="71" x2="47" y2="76" stroke="#F97316" strokeWidth="2" strokeLinecap="round" />
      <line x1="47" y1="76" x2="50" y2="78" stroke="#F97316" strokeWidth="2" strokeLinecap="round" />
      <line x1="47" y1="76" x2="49" y2="79" stroke="#F97316" strokeWidth="2" strokeLinecap="round" />
    </svg>
  )
}
