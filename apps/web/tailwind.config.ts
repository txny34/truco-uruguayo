import type { Config } from 'tailwindcss'

const config: Config = {
  content: [
    './app/**/*.{ts,tsx}',
    './components/**/*.{ts,tsx}',
    './lib/**/*.{ts,tsx}',
  ],
  theme: {
    extend: {
      keyframes: {
        'carta-entra': {
          from: { transform: 'translateY(60px)', opacity: '0' },
          to:   { transform: 'translateY(0)',    opacity: '1' },
        },
        'carta-mesa': {
          from: { transform: 'scale(0.55) translateY(-14px)', opacity: '0' },
          to:   { transform: 'scale(1) translateY(0)',        opacity: '1' },
        },
        'slide-arriba': {
          from: { transform: 'translateY(36px)', opacity: '0' },
          to:   { transform: 'translateY(0)',    opacity: '1' },
        },
      },
      animation: {
        'carta-entra':  'carta-entra  0.35s ease-out both',
        'carta-mesa':   'carta-mesa   0.28s cubic-bezier(0.34,1.56,0.64,1) both',
        'slide-arriba': 'slide-arriba 0.4s ease-out both',
      },
    },
  },
  plugins: [],
}

export default config
