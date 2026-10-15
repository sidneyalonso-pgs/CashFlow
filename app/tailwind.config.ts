import type { Config } from "tailwindcss";

// Cores com variável CSS (canais RGB) para o tema da intranet poder ser trocado por escopo:
// :root = paleta original (documentos, login); .app-shell = verde-floresta da intranet.
const v = (name: string) => `rgb(var(--${name}) / <alpha-value>)`;

const config: Config = {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        "ps-navy-900": v("ps-navy-900"),
        "ps-navy-800": v("ps-navy-800"),
        "ps-navy-700": v("ps-navy-700"),
        "ps-navy-600": v("ps-navy-600"),
        "ps-navy": v("ps-navy"),
        "ps-navy-50": v("ps-navy-50"),
        "ps-green": "#2BC196",
        "ps-green-700": "#1AA380",
        "ps-green-600": "#20B389",
        "ps-green-300": v("ps-green-300"),
        "ps-green-200": v("ps-green-200"),
        "ps-mint": v("ps-mint"),
        "ps-bg": v("ps-bg"),
        "ps-bg-2": v("ps-bg-2"),
        "ps-ink": v("ps-ink"),
        "ps-ink-2": v("ps-ink-2"),
        "ps-muted": v("ps-muted"),
        "ps-muted-2": "#8294A6",
      },
      fontFamily: {
        sans: ["var(--font-ui)", "Inter", "sans-serif"],
        mono: ["JetBrains Mono", "monospace"],
      },
      borderRadius: {
        ps: "20px",
        "ps-sm": "12px",
        "ps-lg": "28px",
      },
      boxShadow: {
        ps: "0 6px 16px rgba(0, 20, 42, 0.06), 0 18px 40px rgba(0, 20, 42, 0.06)",
        "ps-sm": "0 1px 2px rgba(0, 20, 42, 0.06), 0 2px 6px rgba(0, 20, 42, 0.04)",
      },
    },
  },
  plugins: [],
};

export default config;
