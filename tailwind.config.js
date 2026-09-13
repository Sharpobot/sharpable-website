/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        primary: '#FFC629',
        'primary-dark': '#F0B300',
        'primary-light': '#FFDD70',
        accent: '#F5E6C8',
        'accent-dark': '#D9C49A',
        background: '#16161A',
        surface: '#202024',
        ink: '#FAFAFA',
        muted: '#9C9C9F',
        divider: '#38383D',
        deep: '#0F0F12',
      },
      fontFamily: {
        // 'Archivo Variable' is the actual @font-face family name @fontsource-variable/archivo
        // registers (see main.jsx) — paired with `font-stretch: semi-expanded` on `.font-display`
        // itself (index.css) to match the new logo's wordmark, rather than a separate named family
        // (Archivo ships width as a variable axis, not a standalone "SemiExpanded" font family).
        display: ['"Archivo Variable"', 'system-ui', 'sans-serif'],
        serif: ['"Cormorant Garamond"', 'serif'],
        body: ['"Inter"', 'system-ui', 'sans-serif'],
        mono: ['"JetBrains Mono"', 'monospace'],
      },
      // Site-wide "unround" pass (a later session): every radius tier compressed into a tight,
      // consistent band instead of the old 8px-64px spread — the old scale read as "very rounded",
      // off-brand for "Sharpable". Tightened a second time (3px-8px, down from an initial 6px-16px
      // pass) per "even sharper, but not fully square" feedback. Kept as a graduated scale (not one
      // flat value) so a small button and a huge card still read as different tiers, just all
      // subtly, not dramatically, rounded. Standard Tailwind tiers (lg/xl/2xl/3xl) are overridden
      // here too, not just the custom 2.5xl-7xl ones — `rounded-full` is deliberately left untouched
      // since it's used throughout for actual circles (avatars, dots, icon buttons), not "rounded
      // corners". Wide pill-shaped buttons/badges that used `rounded-full` for a stadium shape were
      // changed to `rounded-lg` in their own component files instead (see the "unround" commit)
      // since overriding `full` itself would have broken every genuine circle on the site — they
      // track this same scale via that shared `lg` token, so they tighten automatically too.
      borderRadius: {
        lg: '0.1875rem',
        xl: '0.25rem',
        '2xl': '0.3125rem',
        '3xl': '0.375rem',
        '2.5xl': '0.375rem',
        '4xl': '0.4375rem',
        '5xl': '0.4375rem',
        '6xl': '0.5rem',
        '7xl': '0.5rem',
      },
      animation: {
        'pulse-slow': 'pulse 3s ease-in-out infinite',
        'blink': 'blink 1s step-end infinite',
        'float': 'float 6s ease-in-out infinite',
      },
      keyframes: {
        blink: {
          '0%, 100%': { opacity: '1' },
          '50%': { opacity: '0' },
        },
        float: {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-8px)' },
        },
      },
    },
  },
  plugins: [],
}
