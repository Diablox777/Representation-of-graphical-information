/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        'bruised-purple': '#5B3F8D',
        'aged-wine-red': '#8B2A2A',
        'antique-gold': '#D4C29A',
      },
      fontFamily: {
        'gothic': ['UnifrakturMaguntia', 'Metamorphous', 'serif'],
      },
    },
  },
  plugins: [],
}
