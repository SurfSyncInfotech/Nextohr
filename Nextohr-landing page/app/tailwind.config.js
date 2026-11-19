/** @type {import('tailwindcss').Config} */
const v = (name) => `rgb(var(--${name}) / <alpha-value>)`

export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      fontFamily: { sans: ['Manrope', 'ui-sans-serif', 'system-ui', 'sans-serif'] },
      colors: {
        // Brand scales — 500 is the exact brand color.
        orange: {
          50: '#FFF6EC', 100: '#FEE9D0', 200: '#FDD09F', 300: '#FBB264', 400: '#F99B3A',
          500: '#F68713', 600: '#DC6F06', 700: '#B65807', 800: '#91460D', 900: '#763B0F',
        },
        blue: {
          50: '#EEF9FC', 100: '#D4F0F7', 200: '#AEE2EF', 300: '#77CDE2', 400: '#43B3CE',
          500: '#2A9CB8', 600: '#1F7E98', 700: '#1D667C', 800: '#1E5566', 900: '#1D4757',
        },
        // Semantic tokens (switch with .dark)
        bg: v('bg'),
        surface: v('surface'),
        'surface-2': v('surface-2'),
        'surface-3': v('surface-3'),
        line: v('line'),
        'line-strong': v('line-strong'),
        ink: v('ink'),
        muted: v('muted'),
        subtle: v('subtle'),
        primary: v('primary'),
        'primary-soft': v('primary-soft'),
        'primary-ink': v('primary-ink'),
        'on-primary': v('on-primary'),
        'primary-strong': v('primary-strong'),
        accent: v('accent'),
        'accent-soft': v('accent-soft'),
        'accent-ink': v('accent-ink'),
        success: v('success'),
        'success-soft': v('success-soft'),
        warning: v('warning'),
        'warning-soft': v('warning-soft'),
        danger: v('danger'),
        'danger-soft': v('danger-soft'),
      },
      borderRadius: { xl: '14px', '2xl': '18px', '3xl': '24px' },
      boxShadow: {
        card: '0 1px 2px rgb(16 24 40 / 0.04), 0 1px 3px rgb(16 24 40 / 0.06)',
        pop: '0 12px 32px -8px rgb(16 24 40 / 0.18), 0 4px 8px -4px rgb(16 24 40 / 0.08)',
        ring: '0 0 0 4px rgb(var(--primary) / 0.18)',
      },
      keyframes: {
        'fade-in': { from: { opacity: 0 }, to: { opacity: 1 } },
        'pop-in': { from: { opacity: 0, transform: 'translateY(6px) scale(.98)' }, to: { opacity: 1, transform: 'none' } },
        'slide-in': { from: { transform: 'translateX(24px)', opacity: 0 }, to: { transform: 'none', opacity: 1 } },
        shimmer: { '100%': { transform: 'translateX(100%)' } },
      },
      animation: {
        'fade-in': 'fade-in .18s ease-out',
        'pop-in': 'pop-in .2s cubic-bezier(.2,.8,.2,1)',
        'slide-in': 'slide-in .24s cubic-bezier(.2,.8,.2,1)',
      },
    },
  },
  plugins: [],
}
