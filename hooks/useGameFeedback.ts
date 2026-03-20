'use client'

import { useCallback } from 'react'

export function useGameFeedback() {
  const ding = useCallback(() => {
    // Haptic feedback — works on Android; iOS Safari blocks navigator.vibrate
    if (typeof navigator !== 'undefined' && navigator.vibrate) {
      navigator.vibrate([40, 20, 60])
    }

    // Synthesized two-note ascending ding via Web Audio API — no audio files needed
    try {
      const AudioContextClass =
        window.AudioContext || (window as any).webkitAudioContext
      if (!AudioContextClass) return

      const ctx = new AudioContextClass()

      // G5 → C6 — same interval as Duolingo's completion chime
      const notes = [
        { freq: 784,  start: 0,    dur: 0.18 },
        { freq: 1047, start: 0.13, dur: 0.32 },
      ]

      notes.forEach(({ freq, start, dur }) => {
        const osc  = ctx.createOscillator()
        const gain = ctx.createGain()
        osc.connect(gain)
        gain.connect(ctx.destination)

        osc.type = 'sine'
        osc.frequency.value = freq

        gain.gain.setValueAtTime(0, ctx.currentTime + start)
        gain.gain.linearRampToValueAtTime(0.22, ctx.currentTime + start + 0.02)
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + start + dur)

        osc.start(ctx.currentTime + start)
        osc.stop(ctx.currentTime + start + dur + 0.05)
      })

      setTimeout(() => ctx.close(), 800)
    } catch (_) {
      // Audio blocked or unsupported — silent fail
    }
  }, [])

  return { ding }
}
