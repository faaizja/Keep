import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        paper:   "#FAF7F2",
        surface: "#FFFFFF",
        ink:     "#1F1B16",
        muted:   "#6B6259",
        faint:   "#9A9088",
        line:    "#E7E0D6",
        keep:    "#2F5D50",
        keepsoft:"#E4EDE9",
        keepdeep:"#234439",
        signal:  "#B4682A",
        signalsoft:"#F7EBE0",
      },
      fontFamily: {
        display: ["var(--font-display)", "Georgia", "serif"],
        sans: ["var(--font-sans)", "system-ui", "sans-serif"],
      },
      borderRadius: { xl2: "1.25rem" },
      boxShadow: {
        card: "0 1px 2px rgba(31,27,22,0.04), 0 8px 24px -12px rgba(31,27,22,0.12)",
        lift: "0 2px 4px rgba(31,27,22,0.05), 0 16px 40px -16px rgba(31,27,22,0.18)",
      },
      maxWidth: { measure: "38rem" },
    },
  },
  plugins: [],
};
export default config;
