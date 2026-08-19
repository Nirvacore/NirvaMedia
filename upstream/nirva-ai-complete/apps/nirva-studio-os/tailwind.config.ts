import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: "class",
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        nirva: {
          bg: "#0A0A0F",
          surface: "#12121A",
          card: "#16161F",
          border: "#26263A",
          violet: "#8B7CF6",
          "violet-soft": "#A99BF8",
          gold: "#E2C285",
          "gold-soft": "#F0D9AE",
          muted: "#8E8EA8",
        },
      },
      fontFamily: {
        sans: [
          "Inter",
          "Noto Sans Thai",
          "-apple-system",
          "BlinkMacSystemFont",
          "Segoe UI",
          "sans-serif",
        ],
      },
      backgroundImage: {
        "dot-grid":
          "radial-gradient(circle, rgba(139,124,246,0.12) 1px, transparent 1px)",
        "nirva-glow":
          "radial-gradient(ellipse 80% 50% at 50% -20%, rgba(139,124,246,0.15), transparent)",
      },
      boxShadow: {
        glow: "0 0 40px -12px rgba(139,124,246,0.35)",
        card: "0 4px 24px -8px rgba(0,0,0,0.5)",
      },
      borderRadius: {
        xl2: "1.25rem",
      },
    },
  },
  plugins: [],
};

export default config;
