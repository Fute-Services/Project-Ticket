/** @type {import('tailwindcss').Config} */
// Values point at the CSS variables in src/styles/tokens.css, ported from the
// "Modernist" design system. Don't hardcode hexes in components.
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Archivo', 'system-ui', 'sans-serif'],
        heading: ['Archivo', 'system-ui', 'sans-serif'],
      },
      colors: {
        bg: 'var(--bg)',
        sf: 'var(--sf)',
        pn: 'var(--pn)',
        ink: 'var(--ink)',
        mut: 'var(--mut)',
        line: 'var(--line)',
        acc: {
          DEFAULT: 'var(--acc)',
          600: 'var(--acc-600)',
          700: 'var(--acc-700)',
        },
        ok: 'var(--ok)',
        warn: 'var(--warn)',
        info: 'var(--info)',
      },
      borderRadius: {
        // Modernist is square.
        none: '0px',
      },
    },
  },
  plugins: [],
};
