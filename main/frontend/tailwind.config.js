/** @type {import('tailwindcss').Config} */
// Values here point at the CSS variables in src/styles/tokens.css, which are
// generated from docs/brand-guidelines.md. Don't hardcode brand hexes.
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        mono: ['JetBrains Mono', 'ui-monospace', 'monospace'],
      },
      colors: {
        brand: {
          50: '#eef2ff',
          100: '#e0e7ff',
          500: 'var(--color-brand-500)',
          600: 'var(--color-brand-600)',
          700: '#4338ca',
        },
        canvas: 'var(--color-canvas)',
        surface: {
          DEFAULT: 'var(--color-surface)',
          raised: 'var(--color-surface-raised)',
        },
        dept: {
          hr: 'var(--color-dept-hr)',
          it: 'var(--color-dept-it)',
        },
      },
      boxShadow: {
        'elev-1': 'var(--elev-1)',
        'elev-2': 'var(--elev-2)',
        'elev-3': 'var(--elev-3)',
        'elev-4': 'var(--elev-4)',
      },
      borderRadius: {
        base: 'var(--radius-base)',
      },
      transitionTimingFunction: {
        depth: 'var(--ease-out)',
      },
    },
  },
  plugins: [],
};
