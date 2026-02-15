/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./App.tsx",
    "./index.tsx",
    "./components/**/*.{js,ts,jsx,tsx}",
    "./src/**/*.{js,ts,jsx,tsx}"
  ],
  theme: {
    extend: {
      colors: {
        background: '#F4F7F6',
        surface: '#FFFFFF',
        primary: '#1A1D1F',
        secondary: '#6F767E',
        accent: '#B4F481',
        accentHover: '#A0E070',
        
        // Yordamchi Ranglar
        warning: '#FFD966',
        info: '#70D1F4',
        error: '#FF8F8F',
        bonus: '#C396FF',
      },
      fontFamily: {
        sans: ['Inter', 'sans-serif'],
        display: ['Plus Jakarta Sans', 'sans-serif'],
      },
      borderRadius: {
        'xl': '12px',
        '2xl': '16px',
        '3xl': '20px',
        '4xl': '24px',
      },
      boxShadow: {
        'soft': '0 8px 30px -4px rgba(0, 0, 0, 0.04)',
        'card': '0 2px 12px -2px rgba(0, 0, 0, 0.03)',
        'hover': '0 12px 40px -8px rgba(0, 0, 0, 0.08)',
      }
    },
  },
  plugins: [],
}
