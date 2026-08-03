/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          50: '#eef2ff',
          100: '#e0e7ff',
          200: '#c7d2fe',
          300: '#a5b4fc',
          400: '#818cf8',
          500: '#6366f1',
          600: '#4f46e5',
          700: '#4338ca',
          800: '#3730a3',
          900: '#312e81',
          950: '#1e1b4b',
        },
        accent: {
          cyan: '#0891b2',
          emerald: '#059669',
          amber: '#d97706',
          rose: '#e11d48',
          purple: '#9333ea',
        },
        // Light theme surface tokens
        surface: {
          bg: '#f8fafc',
          card: '#ffffff',
          border: '#e2e8f0',
          hover: '#f1f5f9',
          muted: '#f8fafc',
        }
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'sans-serif'],
      },
      boxShadow: {
        'card': '0 1px 3px 0 rgba(0,0,0,0.07), 0 1px 2px -1px rgba(0,0,0,0.05)',
        'card-hover': '0 4px 12px 0 rgba(0,0,0,0.08), 0 2px 4px -2px rgba(0,0,0,0.06)',
        'glow': '0 0 25px -5px rgba(99, 102, 241, 0.25)',
        'glow-emerald': '0 0 25px -5px rgba(5, 150, 105, 0.2)',
      },
      backgroundImage: {
        'gradient-radial': 'radial-gradient(var(--tw-gradient-stops))',
        'hero-pattern': 'radial-gradient(circle at 50% 50%, rgba(99, 102, 241, 0.08) 0%, transparent 60%)',
      }
    },
  },
  plugins: [],
}
