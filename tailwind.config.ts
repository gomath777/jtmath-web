import type { Config } from 'tailwindcss';

const config: Config = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        // shadcn tokens
        border: 'hsl(var(--border))',
        input: 'hsl(var(--input))',
        ring: 'hsl(var(--ring))',
        background: 'hsl(var(--background))',
        foreground: 'hsl(var(--foreground))',
        primary: {
          DEFAULT: 'hsl(var(--primary))',
          foreground: 'hsl(var(--primary-foreground))',
        },
        secondary: {
          DEFAULT: 'hsl(var(--secondary))',
          foreground: 'hsl(var(--secondary-foreground))',
        },
        destructive: {
          DEFAULT: 'hsl(var(--destructive))',
          foreground: 'hsl(var(--destructive-foreground))',
        },
        muted: {
          DEFAULT: 'hsl(var(--muted))',
          foreground: 'hsl(var(--muted-foreground))',
        },
        accent: {
          DEFAULT: 'hsl(var(--accent))',
          foreground: 'hsl(var(--accent-foreground))',
        },
        popover: {
          DEFAULT: 'hsl(var(--popover))',
          foreground: 'hsl(var(--popover-foreground))',
        },
        card: {
          DEFAULT: 'hsl(var(--card))',
          foreground: 'hsl(var(--card-foreground))',
        },

        // ── Claude-inspired warm palette ─────────
        parchment: '#f5f4ed',
        ivory: '#faf9f5',
        sand: '#e8e6dc',

        ink: {
          DEFAULT: '#141413',
          soft: '#30302e',
        },
        charcoal: '#4d4c48',
        olive: '#5e5d59',
        stone: '#87867f',
        silver: '#b0aea5',

        terracotta: {
          DEFAULT: '#c96442',
          light: '#d97757',
        },
        crimson: '#b53333',

        'border-cream': '#f0eee6',
        'border-warm': '#e8e6dc',
        'ring-warm': '#d1cfc5',
        'ring-deep': '#c2c0b6',

        // ── Legacy brand.* — remapped to Claude palette ─────
        // Existing code using `text-brand-blue`, `bg-brand-dark` etc.
        // keeps compiling while we migrate. All pointing to warm tones.
        brand: {
          DEFAULT: '#c96442',     // terracotta
          blue: '#c96442',        // CTA → terracotta
          mint: '#5e5d59',        // accent → olive
          orange: '#b53333',      // alert → crimson
          dark: '#f5f4ed',        // page bg → parchment
          surface: '#faf9f5',     // card → ivory
          elevated: '#f0eee6',    // elevated → border cream
        },
      },

      borderRadius: {
        sm: 'calc(var(--radius) - 4px)',
        md: 'calc(var(--radius) - 2px)',
        lg: 'var(--radius)',
        xl: '1rem',
        '2xl': '1.5rem',
        '3xl': '2rem',
      },

      fontFamily: {
        sans: ['"Pretendard Variable"', 'Pretendard', 'system-ui', 'sans-serif'],
        serif: ['var(--font-serif)', 'Gowun Batang', 'Georgia', 'serif'],
        mono: ['ui-monospace', 'SFMono-Regular', 'Menlo', 'monospace'],
      },

      boxShadow: {
        'ring-warm': '0 0 0 1px #d1cfc5',
        'ring-deep': '0 0 0 1px #c2c0b6',
        'ring-terracotta': '0 0 0 1px #c96442',
        whisper: 'rgba(0, 0, 0, 0.05) 0px 4px 24px',
      },

      letterSpacing: {
        tightest: '-0.02em',
        tighter: '-0.015em',
      },
    },
  },
  plugins: [],
};
export default config;
