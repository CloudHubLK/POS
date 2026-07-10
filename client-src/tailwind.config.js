/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        counter: {
          950: '#F8FAFC', // Slate 50
          900: '#F1F5F9', // Slate 100
          800: '#FFFFFF', // Pure White
          700: '#E2E8F0', // Slate 200
          600: '#64748B'  // Slate 500
        },
        brass: {
          400: '#3B82F6',
          500: '#135EF2',
          600: '#0B41C5'
        },
        paper: '#0F172A', // Slate 900
        mint: '#10B981',  // Emerald 500
        clay: '#EF4444'   // Red 500
      },
      fontFamily: {
        display: ['"Space Grotesk"', 'sans-serif'],
        body: ['"Inter"', 'sans-serif'],
        mono: ['"IBM Plex Mono"', 'monospace']
      },
      boxShadow: {
        counter: '0 4px 6px -1px rgba(0, 0, 0, 0.05), 0 2px 4px -1px rgba(0, 0, 0, 0.03), 0 0 0 1px rgba(0, 0, 0, 0.05)',
        drawer: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)'
      },
      perspective: {
        deck: '1400px'
      }
    }
  },
  plugins: []
};
