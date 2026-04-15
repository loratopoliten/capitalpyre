/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        // Capital Pyre brand — derived from IAMS HTML design language
        pyre: {
          navy:    '#0D1F3C',
          blue:    '#175291',
          card:    '#243B55',
          dark:    '#000D1A',
          gold:    '#EFBF04',
          amber:   '#B8860B',
          crimson: '#800020',
          muted:   '#7A9AB5',
          input:   '#2A4A6B',
          surface: '#175291',
        },
      },
      fontFamily: {
        sans:    ['DM Sans', 'sans-serif'],
        display: ['Syne', 'sans-serif'],
      },
      boxShadow: {
        card: '0 4px 24px rgba(0,0,0,0.18)',
      },
    },
  },
  plugins: [],
}
