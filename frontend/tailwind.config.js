/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // Semantic tokens for the public pages (landing, login, signup).
        // Their defaults are the exact slate/blue palette those pages were
        // written in, so a broker still on the platform theme renders
        // unchanged; ThemeContext only overrides them for a tenant that set
        // up a theme of its own. Channels, not hex, so bg-surface/50 works.
        surface: 'rgb(var(--ui-surface) / <alpha-value>)',
        'surface-2': 'rgb(var(--ui-surface-2) / <alpha-value>)',
        'surface-3': 'rgb(var(--ui-surface-3) / <alpha-value>)',
        'surface-4': 'rgb(var(--ui-surface-4) / <alpha-value>)',
        ink: 'rgb(var(--ui-ink) / <alpha-value>)',
        'ink-1': 'rgb(var(--ui-ink-1) / <alpha-value>)',
        'ink-2': 'rgb(var(--ui-ink-2) / <alpha-value>)',
        'ink-3': 'rgb(var(--ui-ink-3) / <alpha-value>)',
        hair: 'rgb(var(--ui-hair) / <alpha-value>)',
        'hair-soft': 'rgb(var(--ui-hair-soft) / <alpha-value>)',
        'hair-strong': 'rgb(var(--ui-hair-strong) / <alpha-value>)',
        brand: 'rgb(var(--ui-brand) / <alpha-value>)',
        'brand-2': 'rgb(var(--ui-brand-2) / <alpha-value>)',
        'brand-soft': 'rgb(var(--ui-brand-soft) / <alpha-value>)',
        // The landing page tints each section with its own hue. Tokenised for
        // the same reason: emerald-400 on a white page is unreadable.
        'accent-a': 'rgb(var(--ui-accent-a) / <alpha-value>)',
        'accent-b': 'rgb(var(--ui-accent-b) / <alpha-value>)',
        'accent-c': 'rgb(var(--ui-accent-c) / <alpha-value>)',
        danger: 'rgb(var(--ui-danger) / <alpha-value>)',
        dark: {
          900: 'var(--theme-bgPrimary, #0a0a0a)',
          800: 'var(--theme-bgSecondary, #111111)',
          700: 'var(--theme-bgCard, #1a1a1a)',
          600: 'var(--theme-bgHover, #222222)',
          500: '#2a2a2a',
        },
        accent: {
          green: 'var(--theme-primary, #00d4aa)',
          orange: 'var(--theme-accent, #ff6b35)',
        },
        theme: {
          primary: 'var(--theme-primary, #3B82F6)',
          secondary: 'var(--theme-secondary, #10B981)',
          accent: 'var(--theme-accent, #F59E0B)',
          success: 'var(--theme-success, #10B981)',
          error: 'var(--theme-error, #EF4444)',
          warning: 'var(--theme-warning, #F59E0B)',
          buy: 'var(--theme-buyColor, #3B82F6)',
          sell: 'var(--theme-sellColor, #EF4444)',
          profit: 'var(--theme-profitColor, #10B981)',
          loss: 'var(--theme-lossColor, #EF4444)',
        }
      },
      animation: {
        'slide-up': 'slideUp 0.3s ease-out',
        'slide-down': 'slideDown 0.3s ease-out',
      },
      keyframes: {
        slideUp: {
          '0%': { transform: 'translateY(100%)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
        slideDown: {
          '0%': { transform: 'translateY(-100%)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
      },
    },
  },
  plugins: [],
}
