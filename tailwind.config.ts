import type { Config } from 'tailwindcss'

const config: Config = {
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        background: 'var(--background)',
        foreground: 'var(--foreground)',
        surface: 'var(--surface)',
        panel: 'var(--panel)',
        muted: 'var(--muted)',
        border: 'var(--border)',
        interview: 'var(--interview)',
        coach: 'var(--coach)',
        success: 'var(--success)',
        warning: 'var(--warning)',
        // Navy / slate — primary brand ink and dark surfaces
        primary: {
          50:  '#F1F5F9',
          100: '#E2E8F0',
          200: '#CBD5E1',
          300: '#94A3B8',
          400: '#64748B',
          500: '#334155',
          600: '#1E293B',  // core brand (deep navy-slate)
          700: '#152033',
          800: '#0F1827',
          900: '#0A1018',
        },
        // Sharp blue — single confident accent
        accent: {
          50:  '#EFF4FF',
          100: '#DBE6FE',
          200: '#BFD3FE',
          300: '#93B4FD',
          400: '#6090FA',
          500: '#2563EB',  // core accent
          600: '#1D4ED8',
          700: '#1E40AF',
          800: '#1E3A8A',
          900: '#172554',
        },
      },
    },
  },
  plugins: [],
}
export default config
