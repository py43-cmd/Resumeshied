import tailwindcssAnimate from 'tailwindcss-animate';

/** @type {import('tailwindcss').Config} */
export default {
  darkMode: ['class'],
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    container: {
      center: true,
      padding: '1.5rem',
      screens: { '2xl': '1200px' },
    },
    extend: {
      colors: {
        border: 'hsl(var(--border))',
        input: 'hsl(var(--input))',
        ring: 'hsl(var(--ring))',
        background: 'hsl(var(--background))',
        foreground: 'hsl(var(--foreground))',
        surface: 'hsl(var(--card))',
        primary: {
          DEFAULT: 'hsl(var(--primary))',
          hover: 'hsl(var(--primary-hover))',
          foreground: 'hsl(var(--primary-foreground))',
        },
        accent: {
          DEFAULT: 'hsl(var(--accent))',
          foreground: 'hsl(var(--accent-foreground))',
        },
        destructive: {
          DEFAULT: 'hsl(var(--destructive))',
          foreground: 'hsl(var(--destructive-foreground))',
        },
        warning: {
          DEFAULT: 'hsl(var(--warning))',
          foreground: 'hsl(var(--warning-foreground))',
        },
        success: {
          DEFAULT: 'hsl(var(--success))',
          foreground: 'hsl(var(--success-foreground))',
        },
        muted: {
          DEFAULT: 'hsl(var(--muted))',
          foreground: 'hsl(var(--muted-foreground))',
        },
        card: {
          DEFAULT: 'hsl(var(--card))',
          foreground: 'hsl(var(--card-foreground))',
        },
      },
      borderRadius: {
        card: '1rem',
        panel: '1.25rem',
        lg: 'var(--radius)',
        md: 'calc(var(--radius) - 4px)',
        sm: 'calc(var(--radius) - 6px)',
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
      fontSize: {
        eyebrow: ['0.6875rem', { lineHeight: '1rem', letterSpacing: '0.14em' }],
        section: ['clamp(1.875rem, 3vw, 2.75rem)', { lineHeight: '1.15', letterSpacing: '-0.03em' }],
        display: [
          'clamp(2.5rem, 5.5vw, 4.25rem)',
          { lineHeight: '1.03', letterSpacing: '-0.045em' },
        ],
      },
      backgroundImage: {
        cta: 'linear-gradient(100deg, hsl(var(--cta-from)) 0%, hsl(var(--cta-to)) 100%)',
        'accent-sheen':
          'linear-gradient(110deg, hsl(var(--primary)) 0%, hsl(var(--accent)) 55%, hsl(249 100% 78%) 100%)',
      },
      boxShadow: {
        card: 'inset 0 1px 0 hsl(0 0% 100% / 0.04), 0 12px 34px hsl(0 0% 0% / 0.28)',
        panel: 'inset 0 1px 0 hsl(0 0% 100% / 0.05), 0 28px 70px hsl(0 0% 0% / 0.5)',
        cta: '0 12px 30px -12px hsl(var(--cta-shadow) / 0.7)',
        glow: '0 0 0 1px hsl(var(--accent) / 0.25), 0 16px 48px hsl(var(--primary) / 0.18)',
      },
      keyframes: {
        indeterminate: {
          '0%': { transform: 'translateX(-100%)' },
          '100%': { transform: 'translateX(300%)' },
        },
      },
      animation: {
        indeterminate: 'indeterminate 1.4s ease-in-out infinite',
      },
    },
  },
  plugins: [tailwindcssAnimate],
};
