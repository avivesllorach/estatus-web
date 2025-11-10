/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        'sans': ['Aller', 'ui-sans-serif', 'system-ui', 'sans-serif'],
        'aller': ['Aller', 'sans-serif'],
        'aller-display': ['Aller Display', 'Aller', 'sans-serif'],
      },
      animation: {
        'pulse-glow': 'pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'glow-pulse-red-slow': 'glow-pulse-red 5s ease-in-out infinite',
        'glow-pulse-red-fast': 'glow-pulse-red 1s ease-in-out infinite',
        'glow-pulse-orange-slow': 'glow-pulse-orange 5s ease-in-out infinite',
        'glow-pulse-orange-fast': 'glow-pulse-orange 1s ease-in-out infinite',
      },
      keyframes: {
        'glow-pulse-red': {
          '0%, 100%': {
            boxShadow: '0 0 5px rgba(239, 68, 68, 0.5)',
          },
          '50%': {
            boxShadow: '0 0 20px rgba(239, 68, 68, 0.8), 0 0 30px rgba(239, 68, 68, 0.6)',
          },
        },
        'glow-pulse-orange': {
          '0%, 100%': {
            boxShadow: '0 0 5px rgba(249, 115, 22, 0.5)',
          },
          '50%': {
            boxShadow: '0 0 20px rgba(249, 115, 22, 0.8), 0 0 30px rgba(249, 115, 22, 0.6)',
          },
        },
      },
    },
  },
  plugins: [],
}