'use client'

import { useEffect, useMemo, useState } from 'react'

const COLORS = ['#58CC02', '#1CB0F6', '#FF4B4B', '#FFDE59', '#CE82FF', '#FF9600']

export default function Confetti({ active }: { active: boolean }) {
  const [show, setShow] = useState(false)

  // Stable random values — computed once so SSR/client match doesn't matter
  const pieces = useMemo(() =>
    Array.from({ length: 70 }, (_, i) => ({
      left: `${(i * 1.618 * 100) % 100}%`,
      delay: `${(i * 0.04) % 0.7}s`,
      duration: `${1.4 + (i % 12) * 0.08}s`,
      color: COLORS[i % COLORS.length],
      width: `${6 + (i % 6)}px`,
      height: `${4 + (i % 5)}px`,
      rotate: `${i * 41}deg`,
    }))
  , [])

  useEffect(() => {
    if (!active) return
    setShow(true)
    const t = setTimeout(() => setShow(false), 3800)
    return () => clearTimeout(t)
  }, [active])

  if (!show) return null

  return (
    <div className="fixed inset-0 pointer-events-none z-50 overflow-hidden">
      {pieces.map((p, i) => (
        <div
          key={i}
          className="absolute top-0 confetti-piece"
          style={{
            left: p.left,
            animationDelay: p.delay,
            animationDuration: p.duration,
            backgroundColor: p.color,
            width: p.width,
            height: p.height,
            transform: `rotate(${p.rotate})`,
          }}
        />
      ))}
    </div>
  )
}
