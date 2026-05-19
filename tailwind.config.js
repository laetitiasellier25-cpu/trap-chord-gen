/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        ink: {
          900: '#0a0a0f',
          800: '#11121a',
          700: '#181a24',
          600: '#23262f',
          500: '#2d3140',
          400: '#3a3f52',
        },
        neon: {
          purple: '#a855f7',
          pink: '#ec4899',
          cyan: '#22d3ee',
          green: '#22c55e',
          amber: '#fbbf24',
        },
      },
      fontFamily: {
        mono: ['JetBrains Mono', 'ui-monospace', 'SFMono-Regular', 'monospace'],
      },
      boxShadow: {
        glow: '0 0 18px rgba(168, 85, 247, 0.35)',
      },
    },
  },
  plugins: [],
};
