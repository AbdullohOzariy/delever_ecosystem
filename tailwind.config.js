/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./App.tsx",
    "./main.tsx",
    "./components/**/*.{js,ts,jsx,tsx}",
    "./src/**/*.{js,ts,jsx,tsx}" // Agar src bo'lsa
  ],
  darkMode: 'class',
  theme: {
    extend: {},
  },
  plugins: [],
}
