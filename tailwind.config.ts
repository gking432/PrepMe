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
        primary: {
          50: '#E6EEF7',
          100: '#CCDDF0',
          200: '#99BBE1',
          300: '#6699D2',
          400: '#3377C3',
          500: '#164AAF',
          600: '#123B8C',
          700: '#0D2C69',
          800: '#091D46',
          900: '#040E23',
        },
        accent: {
          50: '#E8F2FC',
          100: '#D1E5F9',
          200: '#A3CBF3',
          300: '#75B1ED',
          400: '#4A90E2',
          500: '#3A7BC2',
          600: '#2E6299',
          700: '#224970',
          800: '#173048',
          900: '#0B1820',
        },
      },
    },
  },
  plugins: [],
}
export default config

