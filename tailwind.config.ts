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
        // Slate-Indigo — primary brand color
        primary: {
          50:  '#ECEEF8',
          100: '#D4D9F0',
          200: '#A9B3E1',
          300: '#7E8ED3',
          400: '#5368C4',
          500: '#2D3A8C',  // core brand
          600: '#252F72',
          700: '#1C2357',
          800: '#12183B',
          900: '#090C1E',
        },
        // Violet — Preppi's color, used as accent
        accent: {
          50:  '#F3EEFE',
          100: '#E6DCFD',
          200: '#CDB9FB',
          300: '#B496F9',
          400: '#9B73F7',
          500: '#7C3AED',  // Preppi purple
          600: '#6330C1',
          700: '#4A2491',
          800: '#311860',
          900: '#190C30',
        },
      },
    },
  },
  plugins: [],
}
export default config
