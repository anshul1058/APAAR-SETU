/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        ivory: {
          50: '#FCFBF8',
          100: '#FAF6EE',
          200: '#F5EEE0',
          300: '#EFE3CC',
          400: '#E4D3B2',
          500: '#D7BF96',
        },
        primary: {
          50: '#eff6ff',
          100: '#dbeafe',
          500: '#3b82f6',
          600: '#2563eb',
          700: '#1d4ed8',
        },
        aicte: {
          navy: '#0F2537',
          blue: '#1E40AF',
          gold: '#D97706',
          orange: '#EA580C',
          green: '#059669',
          cream: '#FAF6EE',
        }
      },
      borderRadius: {
        '3xl': '24px',
        '4xl': '32px',
        '5xl': '40px',
      },
      boxShadow: {
        'soft-neumorphic': '0 24px 60px -12px rgba(0, 0, 0, 0.08), 0 8px 24px -4px rgba(0, 0, 0, 0.04), 0 0 0 1px rgba(255, 255, 255, 0.8) inset',
        'glow-pill': '0 12px 28px -6px rgba(37, 99, 235, 0.45), 0 4px 12px -2px rgba(99, 102, 241, 0.35)',
        'card': '0 4px 20px -2px rgba(15, 23, 42, 0.05), 0 2px 6px -1px rgba(15, 23, 42, 0.03)',
      }
    },
  },
  plugins: [],
}
