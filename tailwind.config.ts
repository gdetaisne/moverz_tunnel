import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./lib/**/*.{js,ts,jsx,tsx,mdx}"
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          deep: "rgb(var(--brand-deep-teal) / <alpha-value>)",
          spark: "rgb(var(--brand-spark) / <alpha-value>)",
          navy: "rgb(var(--brand-navy) / <alpha-value>)",
          slate: "rgb(var(--brand-slate) / <alpha-value>)",
          warm: "rgb(var(--brand-warm) / <alpha-value>)",
        },
        surface: {
          0: "rgb(var(--surface-0) / <alpha-value>)",
          1: "rgb(var(--surface-1) / <alpha-value>)",
          2: "rgb(var(--surface-2) / <alpha-value>)",
          3: "rgb(var(--surface-3) / <alpha-value>)",
        },
        text: {
          1: "rgb(var(--text-1) / <alpha-value>)",
          2: "rgb(var(--text-2) / <alpha-value>)",
          3: "rgb(var(--text-3) / <alpha-value>)",
        },
        /* ─── Tunnel design tokens (2025) ─── */
        tunnel: {
          navy:      "#0F172A",  /* texte principal */
          slate:     "#1E293B",  /* texte secondaire */
          teal:      "#6BCFCF",  /* accent principal */
          "teal-dk": "#2B7A78",  /* accent sombre */
          "teal-bg": "#F0FAFA",  /* fond accent léger */
          "teal-bg2":"#E7FAFA",  /* fond accent très léger */
          border:    "#E3E5E8",  /* bordures */
          bg:        "#F8F9FA",  /* fond de page */
          error:     "#EF4444",  /* erreur */
          "price-lo":"#14532D",  /* prix bas (vert) */
          "price-hi":"#7F1D1D",  /* prix haut (rouge) */
        },
      },
      boxShadow: {
        brand: "0 14px 30px rgba(var(--brand-deep-teal) / 0.18)",
        soft: "0 10px 30px rgba(15, 23, 42, 0.06)",
      },
    },
  },
  plugins: [],
};

export default config;


