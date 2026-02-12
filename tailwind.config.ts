/**
 * Tailwind Config — Tunnel Moverz Premium
 * Design System V1 Premium Applied
 * Mapped from styles/tokens.css
 */

import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./lib/**/*.{js,ts,jsx,tsx,mdx}"
  ],
  theme: {
    extend: {
      /* ===== COLORS ===== */
      colors: {
        /* Legacy brand tokens (keep for marketing pages) */
        brand: {
          deep: "rgb(var(--brand-deep-teal) / <alpha-value>)",
          spark: "rgb(var(--brand-spark) / <alpha-value>)",
          navy: "rgb(var(--brand-navy) / <alpha-value>)",
          slate: "rgb(var(--brand-slate) / <alpha-value>)",
          warm: "rgb(var(--brand-warm) / <alpha-value>)",
          /* New premium tunnel tokens */
          primary: "var(--color-brand-primary)",
          "primary-hover": "var(--color-brand-primary-hover)",
          "primary-light": "var(--color-brand-primary-light)",
        },
        
        /* Premium neutral scale */
        neutral: {
          50: "var(--color-neutral-50)",
          100: "var(--color-neutral-100)",
          200: "var(--color-neutral-200)",
          300: "var(--color-neutral-300)",
          400: "var(--color-neutral-400)",
          500: "var(--color-neutral-500)",
          600: "var(--color-neutral-600)",
          700: "var(--color-neutral-700)",
          800: "var(--color-neutral-800)",
          900: "var(--color-neutral-900)",
        },
        
        /* Semantic text colors */
        text: {
          primary: "var(--color-text-primary)",
          secondary: "var(--color-text-secondary)",
          muted: "var(--color-text-muted)",
          disabled: "var(--color-text-disabled)",
          inverse: "var(--color-text-inverse)",
          /* Legacy tokens (keep for backwards compat) */
          1: "rgb(var(--text-1) / <alpha-value>)",
          2: "rgb(var(--text-2) / <alpha-value>)",
          3: "rgb(var(--text-3) / <alpha-value>)",
        },
        
        /* Semantic background colors */
        bg: {
          primary: "var(--color-bg-primary)",
          secondary: "var(--color-bg-secondary)",
          tertiary: "var(--color-bg-tertiary)",
          inverse: "var(--color-bg-inverse)",
          overlay: "var(--color-bg-overlay)",
        },
        
        /* Semantic border colors */
        border: {
          neutral: "var(--color-border-neutral)",
          strong: "var(--color-border-strong)",
          focus: "var(--color-border-focus)",
        },
        
        /* Surface colors */
        surface: {
          primary: "var(--color-surface-primary)",
          secondary: "var(--color-surface-secondary)",
          hover: "var(--color-surface-hover)",
          /* Legacy tokens (keep for backwards compat) */
          0: "rgb(var(--surface-0) / <alpha-value>)",
          1: "rgb(var(--surface-1) / <alpha-value>)",
          2: "rgb(var(--surface-2) / <alpha-value>)",
          3: "rgb(var(--surface-3) / <alpha-value>)",
        },
        
        /* Feedback colors */
        success: {
          DEFAULT: "var(--color-success)",
          light: "var(--color-success-light)",
        },
        error: {
          DEFAULT: "var(--color-error)",
          light: "var(--color-error-light)",
        },
        warning: {
          DEFAULT: "var(--color-warning)",
          light: "var(--color-warning-light)",
        },
        info: {
          DEFAULT: "var(--color-info)",
          light: "var(--color-info-light)",
        },
      },
      
      /* ===== SPACING ===== */
      spacing: {
        section: "var(--space-section)",    /* 24px */
        block: "var(--space-block)",        /* 16px */
        inline: "var(--space-inline)",      /* 12px */
        compact: "var(--space-compact)",    /* 8px */
      },
      
      /* ===== SIZING ===== */
      height: {
        input: "var(--height-input)",           /* 48px */
        "input-sm": "var(--height-input-sm)",   /* 40px */
        "input-lg": "var(--height-input-lg)",   /* 56px */
        header: "var(--height-header)",         /* 64px */
      },
      width: {
        sidebar: "var(--width-sidebar)",        /* 416px */
        container: "var(--width-container)",    /* 1152px */
      },
      maxWidth: {
        container: "var(--width-container)",
      },
      
      /* ===== BORDER RADIUS ===== */
      borderRadius: {
        sm: "var(--radius-sm)",     /* 6px */
        md: "var(--radius-md)",     /* 8px */
        lg: "var(--radius-lg)",     /* 12px */
        xl: "var(--radius-xl)",     /* 16px */
        "2xl": "var(--radius-2xl)", /* 24px */
        full: "var(--radius-full)",
      },
      
      /* ===== SHADOWS ===== */
      boxShadow: {
        xs: "var(--shadow-xs)",
        sm: "var(--shadow-sm)",
        md: "var(--shadow-md)",
        lg: "var(--shadow-lg)",
        xl: "var(--shadow-xl)",
        "2xl": "var(--shadow-2xl)",
        focus: "var(--shadow-focus)",
        /* Legacy shadows (keep for backwards compat) */
        brand: "0 14px 30px rgba(var(--brand-deep-teal) / 0.18)",
        soft: "0 10px 30px rgba(15, 23, 42, 0.06)",
      },
      
      /* ===== TRANSITIONS ===== */
      transitionDuration: {
        fast: "var(--transition-fast)",   /* 150ms */
        base: "var(--transition-base)",   /* 200ms */
        slow: "var(--transition-slow)",   /* 300ms */
      },
      
      /* ===== Z-INDEX ===== */
      zIndex: {
        dropdown: "var(--z-dropdown)",
        sticky: "var(--z-sticky)",
        fixed: "var(--z-fixed)",
        "modal-backdrop": "var(--z-modal-backdrop)",
        modal: "var(--z-modal)",
        popover: "var(--z-popover)",
        tooltip: "var(--z-tooltip)",
      },
      
      /* ===== TYPOGRAPHY ===== */
      fontFamily: {
        sans: "var(--font-sans)",
        mono: "var(--font-mono)",
      },
      fontSize: {
        xs: ["var(--text-xs)", { lineHeight: "var(--leading-normal)" }],
        sm: ["var(--text-sm)", { lineHeight: "var(--leading-normal)" }],
        base: ["var(--text-base)", { lineHeight: "var(--leading-normal)" }],
        lg: ["var(--text-lg)", { lineHeight: "var(--leading-normal)" }],
        xl: ["var(--text-xl)", { lineHeight: "var(--leading-snug)" }],
        "2xl": ["var(--text-2xl)", { lineHeight: "var(--leading-snug)" }],
        "3xl": ["var(--text-3xl)", { lineHeight: "var(--leading-tight)" }],
        "4xl": ["var(--text-4xl)", { lineHeight: "var(--leading-tight)" }],
        "5xl": ["var(--text-5xl)", { lineHeight: "var(--leading-tight)" }],
      },
      fontWeight: {
        normal: "var(--font-normal)",
        medium: "var(--font-medium)",
        semibold: "var(--font-semibold)",
        bold: "var(--font-bold)",
      },
    },
  },
  plugins: [],
};

export default config;


