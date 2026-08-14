/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        police: {
          900: '#0a1128',
          800: '#001f54',
          700: '#034078',
          600: '#1282a2',
          gold: '#d4af37',
          goldhover: '#b59226',
          badge: '#b91c1c'
        }
      },
      fontFamily: {
        sans: ['Inter', 'Noto Sans Devanagari', 'system-ui', 'sans-serif'],
        devanagari: ['Noto Sans Devanagari', 'sans-serif']
      }
    },
  },
  plugins: [],
}
