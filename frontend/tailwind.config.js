/** @type {import('tailwindcss').Config} */

const { fontFamily } = require("tailwindcss/defaultTheme")

module.exports = {
  darkMode: ["class"],
  content: [
    './pages/**/*.{js,jsx}',
    './components/**/*.{js,jsx}',
    './app/**/*.{js,jsx}',
    './src/**/*.{js,jsx}',
  ],
  prefix: "",
  theme: {
    container: {
      center: true,
      padding: '2rem',
      screens: {
        '2xl': '1440px' // FlowMind max container width
      }
    },
    extend: {
      fontFamily: {
        sans: [
          'Inter',
          'var(--font-sans)',
          ...fontFamily.sans
        ],
        display: [
          'Clash Display',
          ...fontFamily.sans
        ],
        mono: [
          'JetBrains Mono',
          ...fontFamily.mono
        ]
      },
      colors: {
        // FlowMind Color System
        'flowmind-primary': '#2B50AA', // Deep Indigo
        'flowmind-amber': '#FFB547', // Warm Amber
        'flowmind-teal': '#22B8A0', // Mint Teal
        'flowmind-cloud': '#F7F8FA', // Cloud White
        'flowmind-night': '#12151A', // Night Ink
        'flowmind-graphite': '#1C1C1E', // Graphite
        'flowmind-slate': '#6E7580', // Slate Grey
        'flowmind-mist': '#E3E5E8', // Mist Grey
        'flowmind-emerald': '#4CAF50', // Emerald Green
        'flowmind-coral': '#E74C3C', // Coral Red
        
        // Standard CSS variables
        border: 'hsl(var(--border))',
        input: 'hsl(var(--input))',
        ring: 'hsl(var(--ring))',
        background: 'hsl(var(--background))',
        foreground: 'hsl(var(--foreground))',
        primary: {
          DEFAULT: 'hsl(var(--primary))',
          foreground: 'hsl(var(--primary-foreground))'
        },
        secondary: {
          DEFAULT: 'hsl(var(--secondary))',
          foreground: 'hsl(var(--secondary-foreground))'
        },
        destructive: {
          DEFAULT: 'hsl(var(--destructive))',
          foreground: 'hsl(var(--destructive-foreground))'
        },
        success: {
          DEFAULT: 'hsl(var(--success))',
          foreground: 'hsl(var(--success-foreground))'
        },
        muted: {
          DEFAULT: 'hsl(var(--muted))',
          foreground: 'hsl(var(--muted-foreground))'
        },
        accent: {
          DEFAULT: 'hsl(var(--accent))',
          foreground: 'hsl(var(--accent-foreground))'
        },
        'accent-1': {
          DEFAULT: 'hsl(var(--accent-1))',
          foreground: 'hsl(var(--primary-foreground))'
        },
        'accent-2': {
          DEFAULT: 'hsl(var(--accent-2))',
          foreground: 'hsl(var(--primary-foreground))'
        },
        popover: {
          DEFAULT: 'hsl(var(--popover))',
          foreground: 'hsl(var(--popover-foreground))'
        },
        card: {
          DEFAULT: 'hsl(var(--card))',
          foreground: 'hsl(var(--card-foreground))'
        }
      },
      borderRadius: {
        'flowmind': '1rem', // 16px
        'flowmind-lg': '1.25rem', // 20px
        'flowmind-md': '0.75rem', // 12px
        lg: 'var(--radius)',
        md: 'calc(var(--radius) - 2px)',
        sm: 'calc(var(--radius) - 4px)'
      },
      spacing: {
        // FlowMind 8px base spacing scale
        'flowmind-xs': '0.25rem', // 4px
        'flowmind-s': '0.5rem', // 8px
        'flowmind-m': '1rem', // 16px
        'flowmind-l': '1.5rem', // 24px
        'flowmind-xl': '2rem', // 32px
        'flowmind-xxl': '3rem', // 48px
      },
      boxShadow: {
        'flowmind-primary': '0px 4px 8px rgba(43, 80, 170, 0.25)',
        'flowmind-card': '0px 4px 12px rgba(0, 0, 0, 0.08)',
        'flowmind-card-hover': '0px 8px 20px rgba(0, 0, 0, 0.12)',
        'flowmind-focus': '0 0 0 3px rgba(34, 184, 160, 0.3)',
      },
      keyframes: {
        'accordion-down': {
          from: {
            height: '0'
          },
          to: {
            height: 'var(--radix-accordion-content-height)'
          }
        },
        'accordion-up': {
          from: {
            height: 'var(--radix-accordion-content-height)'
          },
          to: {
            height: '0'
          }
        },
        'flowmind-fade-in': {
          from: {
            opacity: '0'
          },
          to: {
            opacity: '1'
          }
        },
        'flowmind-scale-in': {
          from: {
            opacity: '0',
            transform: 'scale(0.95)'
          },
          to: {
            opacity: '1',
            transform: 'scale(1)'
          }
        }
      },
      animation: {
        'accordion-down': 'accordion-down 0.2s ease-out',
        'accordion-up': 'accordion-up 0.2s ease-out',
        'flowmind-fade-in': 'flowmind-fade-in 250ms ease-out',
        'flowmind-scale-in': 'flowmind-scale-in 200ms cubic-bezier(0.16, 1, 0.3, 1)'
      }
    }
  },
  plugins: [
    require("tailwindcss-animate"),
    require("@tailwindcss/typography")
  ],
}