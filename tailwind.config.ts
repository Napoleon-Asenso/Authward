import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: "media",
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        primary: "hsl(var(--primary) / <alpha-value>)",
        "on-primary": "hsl(var(--on-primary) / <alpha-value>)",
        surface: "hsl(var(--surface) / <alpha-value>)",
        "on-surface": "hsl(var(--on-surface) / <alpha-value>)",
        "surface-variant": "hsl(var(--surface-variant) / <alpha-value>)",
        "on-surface-variant": "hsl(var(--on-surface-variant) / <alpha-value>)",
        "surface-container": "hsl(var(--surface-container) / <alpha-value>)",
        outline: "hsl(var(--outline) / <alpha-value>)",
        error: "hsl(var(--error) / <alpha-value>)",
        "error-container": "hsl(var(--error-container) / <alpha-value>)",
        "on-error-container": "hsl(var(--on-error-container) / <alpha-value>)",
      },
      boxShadow: {
        glow: "0 0 20px hsla(256, 34%, 48%, 0.35)",
        card: "0 3px 6px rgba(0,0,0,0.10)",
      },
      borderRadius: {
        md: "0.5rem",
        xl: "1rem",
      },
    },
  },
  plugins: [],
};

export default config;