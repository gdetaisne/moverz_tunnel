/**
 * Tailwind Config — Moverz Official V4
 * Design System: Turquoise signature #0EA5A6, Sora + Inter fonts
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
        },
        
        /* Moverz V4 Colors */
        bg: {
          primary: "var(--color-bg-primary)",      /* #FAFAFA */
          dark: "var(--color-bg-dark)",            /* #0B0F14 */
        },
        surface: {
          primary: "var(--color-surface-primary)", /* #FFFFFF */
          alt: "var(--color-surface-alt)",         /* #F8F9FA */
          /* Legacy */
          0: "rgb(var(--surface-0) / <alpha-value>)",
          1: "rgb(var(--surface-1) / <alpha-value>)",
          2: "rgb(var(--surface-2) / <alpha-value>)",
          3: "rgb(var(--surface-3) / <alpha-value>)",
        },
        text: {
          primary: "var(--color-text-primary)",      /* #0F172A */
          body: "var(--color-text-body)",            /* #1E293B */
          secondary: "var(--color-text-secondary)",  /* #6B7280 */
          muted: "var(--color-text-muted)",          /* #9CA3AF */
          /* Legacy */
          1: "rgb(var(--text-1) / <alpha-value>)",
          2: "rgb(var(--text-2) / <alpha-value>)",
          3: "rgb(var(--text-3) / <alpha-value>)",
        },
        accent: {
          DEFAULT: "var(--color-accent)",            /* #0EA5A6 ⭐ */
          hover: "var(--color-accent-hover)",        /* #0D9495 */
          light: "var(--color-accent-light)",        /* #E0F7F7 */
        },
        navy: "var(--color-navy)",                   /* #04163A */
        turquoise: "var(--color-turquoise-legacy)",  /* #6BCFCF */
        
        border: {
          DEFAULT: "var(--color-border)",            /* #E5E7EB */
          light: "var(--color-border-light)",        /* #F3F4F6 */
        },
        
        /* Buttons */
        btn: {
          primary: "var(--color-btn-primary)",           /* #0F172A */
          "primary-hover": "var(--color-btn-primary-hover)", /* #1E293B */
        },
        neutral: "var(--color-neutral)",                 /* #D1D5DB */

        /* Semantic */
        success: {
          DEFAULT: "var(--color-success)",               /* #16A34A */
          light: "var(--color-success-light)",           /* #DCFCE7 */
        },
        danger: {
          DEFAULT: "var(--color-danger)",                /* #DC2626 */
          light: "var(--color-danger-light)",            /* #FEE2E2 */
        },
        warning: {
          DEFAULT: "var(--color-warning)",               /* #F59E0B */
          light: "var(--color-warning-light)",           /* #FEF3C7 */
          fg: "var(--color-warning-fg)",                 /* #B45309 */
        },
        info: {
          DEFAULT: "var(--color-info)",                  /* #1D4ED8 */
          light: "var(--color-info-light)",              /* #DBEAFE */
        },

        /* Gradient panel */
        gradient: {
          "panel-from": "var(--color-gradient-panel-from)", /* #A8E6D8 */
          "panel-to": "var(--color-gradient-panel-to)",     /* #A78BFA */
        },
      },
      
      /* ===== FONTS ===== */
      fontFamily: {
        sora: "var(--font-sora)",     /* Titres (500, 600, 700) */
        inter: "var(--font-inter)",   /* Texte (400, 500, 600) */
      },
      
      /* ===== SPACING ===== */
      spacing: {
        section: "var(--space-section)",    /* 24px */
        block: "var(--space-block)",        /* 16px */
        inline: "var(--space-inline)",      /* 12px */
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
        sm: "var(--radius-sm)",       /* 8px */
        md: "var(--radius-md)",       /* 12px */
        card: "var(--radius-card)",   /* 12px */
        btn: "var(--radius-btn)",     /* 8px */
        input: "var(--radius-input)", /* 8px */
        full: "var(--radius-full)",
      },
      
      /* ===== SHADOWS ===== */
      boxShadow: {
        xs: "var(--shadow-xs)",
        sm: "var(--shadow-sm)",
        md: "var(--shadow-md)",
        lg: "var(--shadow-lg)",
        "glow-turquoise": "var(--shadow-glow-turquoise)", /* ✨ */
        focus: "var(--shadow-focus)",
        /* Legacy */
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
    },
  },
  plugins: [],
};

export default config;
