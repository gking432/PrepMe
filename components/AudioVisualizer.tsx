'use client'

import { useEffect, useRef, useState } from 'react'

interface AudioVisualizerProps {
  isActive: boolean
  color: 'black' | 'white'
}

export default function AudioVisualizer({ isActive, color }: AudioVisualizerProps) {
  const [bars, setBars] = useState<number[]>([])
  const animationFrameRef = useRef<number>()

  useEffect(() => {
    // Initialize bars
    const initialBars = Array.from({ length: 50 }, () => Math.random() * 30 + 10)
    setBars(initialBars)

    if (isActive) {
      const animate = () => {
        setBars((prev) =>
          prev.map((bar) => {
            // Create wave-like animation
            const variation = Math.sin(Date.now() / 100 + Math.random() * 10) * 20
            return Math.max(10, Math.min(100, bar + variation))
          })
        )
        animationFrameRef.current = requestAnimationFrame(animate)
      }
      animate()
    } else {
      // Fade out animation
      const fadeOut = () => {
        setBars((prev) => {
          const newBars = prev.map((bar) => Math.max(10, bar * 0.95))
          const allLow = newBars.every((bar) => bar <= 10.1)
          if (!allLow) {
            animationFrameRef.current = requestAnimationFrame(fadeOut)
          }
          return newBars
        })
      }
      fadeOut()
    }

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current)
      }
    }
  }, [isActive])

  return (
    <div className="audio-visualizer">
      {bars.map((height, index) => (
        <div
          key={index}
          className="audio-bar"
          style={{
            height: `${height}%`,
            backgroundColor: color === 'black' ? '#000000' : '#ffffff',
          }}
        />
      ))}
    </div>
  )
}

