/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        primary: {
          400: '#FFE600',
          500: '#FFD700',
          600: '#FFC700',
        },
        zama: {
          base: '#191919', // Deep Background
          card: '#2E2E2E', // Card Background
          border: '#404040', // Borders for dark mode
        },
      },
    },
  },
  plugins: [],
}

