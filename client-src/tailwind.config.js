/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        counter: {
          950: '#0D0F12',
          900: '#14161A',
          800: '#1C1F25',
          700: '#262A32',
          600: '#343A44'
        },
        brass: {
          400: '#D9B36C',
          500: '#C89B5C',
          600: '#A87C3F'
        },
        paper: '#F7F5F0',
        mint: '#4ADE9D',
        clay: '#E4572E'
      },
      fontFamily: {
        display: ['"Space Grotesk"', 'sans-serif'],
        body: ['"Inter"', 'sans-serif'],
        mono: ['"IBM Plex Mono"', 'monospace']
      },
      boxShadow: {
        counter: '0 1px 0 rgba(255,255,255,0.04) inset, 0 20px 40px -20px rgba(0,0,0,0.6)',
        drawer: '0 30px 60px -15px rgba(0,0,0,0.5)'
      },
      perspective: {
        deck: '1400px'
      }
    }
  },
  plugins: []
};
