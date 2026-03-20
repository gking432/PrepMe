import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'PrepMe - Interview Simulation',
  description: 'Practice job interviews with AI-powered voice simulations',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
  },
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover" />
      </head>
      <body>{children}</body>
    </html>
  )
}

