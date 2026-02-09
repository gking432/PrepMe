import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'PrepMe - Interview Simulation',
  description: 'Practice job interviews with AI-powered voice simulations',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  )
}

