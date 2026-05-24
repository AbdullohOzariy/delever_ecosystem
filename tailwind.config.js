/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./App.tsx",
    "./index.tsx",
    "./index.css",
    "./components/**/*.{js,ts,jsx,tsx}",
    "./src/**/*.{js,ts,jsx,tsx}"
  ],
  theme: {
    extend: {
      colors: {
        background: '#F0F2F5',
        surface:    '#FFFFFF',
        primary:    '#1A1D1F',
        secondary:  '#6B7280',
        accent:     '#B4F481',
        accentHover:'#A0E070',
        warning:    '#FCD34D',
        info:       '#60C4E8',
        error:      '#F87171',
        bonus:      '#C084FC',
        muted:      '#F9FAFB',
        border:     '#E5E7EB',
      },
      fontFamily: {
        sans:    ['Inter', 'sans-serif'],
        display: ['Plus Jakarta Sans', 'sans-serif'],
      },
      borderRadius: {
        'xl':  '12px',
        '2xl': '16px',
        '3xl': '20px',
        '4xl': '24px',
      },
      boxShadow: {
        'soft':  '0 1px 3px rgba(0,0,0,0.06), 0 1px 2px rgba(0,0,0,0.04)',
        'card':  '0 4px 16px -4px rgba(0,0,0,0.08)',
        'hover': '0 8px 24px -6px rgba(0,0,0,0.12)',
        'inner-sm': 'inset 0 1px 2px rgba(0,0,0,0.06)',
      },
      fontSize: {
        '2xs': ['10px', { lineHeight: '14px' }],
      }
    },
  },
  plugins: [],
}
