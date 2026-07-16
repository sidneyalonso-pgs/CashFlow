import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        "ps-navy-900": "#00142A",
        "ps-navy-800": "#001B35",
        "ps-navy-700": "#00264A",
        "ps-navy-600": "#003566",
        "ps-navy": "#002443",
        "ps-navy-50": "#E8EEF5",
        "ps-green": "#2BC196",
        "ps-green-700": "#1AA380",
        "ps-green-600": "#20B389",
        "ps-green-300": "#5CF7CF",
        "ps-green-200": "#B6FCE6",
        "ps-mint": "#5CF7CF",
        "ps-bg": "#F4F6F4",
        "ps-bg-2": "#ECEFEE",
        "ps-ink": "#00142A",
        "ps-ink-2": "#1F2D3F",
        "ps-muted": "#5B6C7E",
        "ps-muted-2": "#8294A6",
      },
      fontFamily: {
        sans: ["Inter", "sans-serif"],
        mono: ["JetBrains Mono", "monospace"],
      },
      borderRadius: {
        ps: "16px",
        "ps-sm": "10px",
        "ps-lg": "24px",
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
