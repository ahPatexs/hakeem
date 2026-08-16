import type { Config } from "tailwindcss";

const rgb = (token: string) => `rgb(var(${token}) / <alpha-value>)`;

const config: Config = {
  darkMode: ["class"],
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        background: rgb("--color-background"),
        surface: rgb("--color-surface"),
        "surface-bright": rgb("--color-surface-bright"),
        "surface-container": rgb("--color-surface-container"),
        "surface-container-low": rgb("--color-surface-container-low"),
        "surface-container-lowest": rgb("--color-surface-container-lowest"),
        "surface-container-high": rgb("--color-surface-container-high"),
        "surface-container-highest": rgb("--color-surface-container-highest"),
        "surface-dim": rgb("--color-surface-dim"),
        "on-background": rgb("--color-on-background"),
        "on-surface": rgb("--color-on-surface"),
        "on-surface-variant": rgb("--color-on-surface-variant"),
        primary: rgb("--color-primary"),
        "primary-container": rgb("--color-primary-container"),
        "primary-fixed": rgb("--color-primary-fixed"),
        "on-primary": rgb("--color-on-primary"),
        "on-primary-container": rgb("--color-on-primary-container"),
        secondary: rgb("--color-secondary"),
        "secondary-container": rgb("--color-secondary-container"),
        "on-secondary": rgb("--color-on-secondary"),
        "on-secondary-container": rgb("--color-on-secondary-container"),
        tertiary: rgb("--color-tertiary"),
        "tertiary-container": rgb("--color-tertiary-container"),
        "tertiary-fixed": rgb("--color-tertiary-fixed"),
        "on-tertiary": rgb("--color-on-tertiary"),
        "med-green": rgb("--color-med-green"),
        "warm-coral": rgb("--color-warm-coral"),
        outline: rgb("--color-outline"),
        "outline-variant": rgb("--color-outline-variant"),
        error: rgb("--color-error"),
      },
      borderRadius: {
        lg: "0.5rem",
        xl: "0.75rem",
        "2xl": "1rem",
        "3xl": "1.5rem",
      },
      spacing: {
        xs: "0.25rem",
        sm: "0.5rem",
        md: "1rem",
        lg: "1.5rem",
        xl: "2rem",
        "2xl": "3rem",
        gutter: "1.5rem",
        "margin-mobile": "1rem",
        "margin-desktop": "2.5rem",
      },
      fontFamily: {
        sans: ["var(--font-montserrat)", "system-ui", "sans-serif"],
        headline: ["var(--font-montserrat)", "system-ui", "sans-serif"],
        arabic: ["var(--font-noto-arabic)", "var(--font-montserrat)", "system-ui", "sans-serif"],
      },
      fontSize: {
        "headline-lg": ["2rem", { lineHeight: "1.2", fontWeight: "700" }],
        "headline-xl": ["3rem", { lineHeight: "1.1", fontWeight: "700" }],
      },
    },
  },
  plugins: [],
};

export default config;
