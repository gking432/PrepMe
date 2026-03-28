'use client'

import { useState, useEffect } from 'react'

interface PreppiProps {
  message?: string
  size?: 'sm' | 'md' | 'lg' | 'xl'
  animate?: boolean
  className?: string
  showOnDesktop?: boolean
}

export default function Preppi({ message, size = 'md', animate = true, className = '', showOnDesktop = false }: PreppiProps) {
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
    sm: { bird: 48, wrapper: 'gap-2' },
    md: { bird: 64, wrapper: 'gap-3' },
    lg: { bird: 88, wrapper: 'gap-4' },
    xl: { bird: 128, wrapper: 'gap-5' },
  }

  const s = sizes[size]

  return (
    <div
      className={`${showOnDesktop ? '' : 'md:hidden '}flex items-end ${s.wrapper} transition-all duration-500 ${visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-2'} ${className}`}
    >
      {/* Parrot SVG */}
      <div className="shrink-0" style={{ width: s.bird, height: s.bird }}>
        <PreppiSVG />
      </div>

      {/* Speech bubble */}
      {message && (
        <div className="relative max-w-xs rounded-[1.4rem] rounded-bl-sm border border-violet-200/80 bg-white/96 px-4 py-3.5 shadow-[0_16px_30px_rgba(15,23,42,0.08)]">
          <p className="text-sm font-bold leading-snug text-slate-800">{message}</p>
          {/* Tail */}
          <div className="absolute -left-2 bottom-3 w-0 h-0 border-t-[6px] border-t-transparent border-r-[8px] border-r-white border-b-[6px] border-b-transparent" />
          <div className="absolute -left-[11px] bottom-[10px] h-0 w-0 border-b-[7px] border-r-[10px] border-t-[7px] border-b-transparent border-r-violet-200 border-t-transparent" />
        </div>
      )}
    </div>
  )
}

export function PreppiSVG() {
  return (
    <svg viewBox="0 0 96 96" fill="none" xmlns="http://www.w3.org/2000/svg" className="h-full w-full drop-shadow-[0_8px_18px_rgba(15,23,42,0.14)]">
      <path d="M30 76C24 84 18 85 16 82C14 79 20 72 28 68L30 76Z" fill="#4C1D95" />
      <path d="M42 79C40 89 34 91 31 88C29 86 32 78 39 72L42 79Z" fill="#7C3AED" />
      <path d="M57 79C60 89 66 91 69 88C71 86 68 78 61 72L57 79Z" fill="#4C1D95" />
      <ellipse cx="48" cy="58" rx="24" ry="22" fill="#7C3AED" />
      <ellipse cx="28" cy="58" rx="11" ry="16" transform="rotate(-18 28 58)" fill="#6D28D9" />
      <ellipse cx="68" cy="58" rx="11" ry="16" transform="rotate(18 68 58)" fill="#6D28D9" />
      <ellipse cx="48" cy="61" rx="13" ry="16" fill="#F6F0FF" />
      <circle cx="48" cy="32" r="19" fill="#8B5CF6" />
      <path d="M41 16C43 8 47 7 49 13C52 7 56 9 57 18" stroke="#5B21B6" strokeWidth="3" strokeLinecap="round" />
      <circle cx="49" cy="10" r="3.5" fill="#FFD84D" />
      <ellipse cx="42" cy="31" rx="7" ry="8" fill="white" />
      <ellipse cx="56" cy="31" rx="7" ry="8" fill="white" />
      <circle cx="44" cy="32" r="3.6" fill="#172133" />
      <circle cx="58" cy="32" r="3.6" fill="#172133" />
      <circle cx="45.4" cy="30.6" r="1.1" fill="white" />
      <circle cx="59.4" cy="30.6" r="1.1" fill="white" />
      <path d="M47 38C48.5 41 50.2 42.5 53 38.8C49.8 37.5 48.3 37.4 47 38Z" fill="#FF9A3C" />
      <path d="M40 24C41.7 22.2 44.2 21 46.3 21" stroke="#5B21B6" strokeWidth="2" strokeLinecap="round" />
      <path d="M53 21.3C55 21.1 57.7 22 59.7 24" stroke="#5B21B6" strokeWidth="2" strokeLinecap="round" />
      <line x1="41" y1="79" x2="38" y2="85" stroke="#FF9A3C" strokeWidth="2.5" strokeLinecap="round" />
      <line x1="38" y1="85" x2="35" y2="87" stroke="#FF9A3C" strokeWidth="2.5" strokeLinecap="round" />
      <line x1="55" y1="79" x2="58" y2="85" stroke="#FF9A3C" strokeWidth="2.5" strokeLinecap="round" />
      <line x1="58" y1="85" x2="61" y2="87" stroke="#FF9A3C" strokeWidth="2.5" strokeLinecap="round" />
    </svg>
  )
}
