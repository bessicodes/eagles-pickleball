import type { Config } from 'tailwindcss';

const config: Config = {
  content: [
    './src/app/**/*.{ts,tsx}',
    './src/components/**/*.{ts,tsx}',
    './src/lib/**/*.{ts,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        // Pure dark base + charcoal surfaces
        ink: '#0A0A0B',
        char: '#141416',
        // Neon lime — primary, live dots, rank #1
        lime: {
          DEFAULT: '#D6FF00',
          soft: 'rgba(214,255,0,0.14)',
        },
        // Electric violet — partner requests / secondary
        violet: {
          DEFAULT: '#8A5CFF',
          soft: 'rgba(138,92,255,0.14)',
        },
      },
      fontFamily: {
        sans: ['var(--font-geist-sans)', 'system-ui', 'sans-serif'],
        display: ['var(--font-grotesk)', 'var(--font-geist-sans)', 'sans-serif'],
        serif: ['var(--font-instrument)', 'Georgia', 'serif'],
      },
      letterSpacing: {
        tightest: '-0.03em',
      },
      borderRadius: {
        card: '12px',
        pill: '999px',
      },
      maxWidth: {
        app: '440px',
      },
      boxShadow: {
        glass: '0 20px 60px -20px rgba(0,0,0,0.7)',
        lime: '0 8px 30px -8px rgba(214,255,0,0.5)',
        violet: '0 8px 30px -8px rgba(138,92,255,0.5)',
      },
      keyframes: {
        pulseDot: {
          '0%,100%': { opacity: '1', transform: 'scale(1)' },
          '50%': { opacity: '0.35', transform: 'scale(0.75)' },
        },
        shimmer: {
          '100%': { transform: 'translateX(100%)' },
        },
        floatMesh: {
          '0%,100%': { transform: 'translate(0,0)' },
          '50%': { transform: 'translate(4%,3%)' },
        },
      },
      animation: {
        pulseDot: 'pulseDot 1.4s ease-in-out infinite',
        shimmer: 'shimmer 1.6s infinite',
        floatMesh: 'floatMesh 18s ease-in-out infinite',
      },
    },
  },
  plugins: [],
};

export default config;
