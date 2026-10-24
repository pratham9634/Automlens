import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: ["class"],
  content: [
    "./pages/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
    "./app/**/*.{ts,tsx}",
    "./src/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        canvas: "#030712", // deepest obsidian black
        surface: {
          1: "#0B0F19", // level 1 cards & sidebars
          2: "#111827", // level 2 elevated panels
          3: "#1F2937", // level 3 hover states
          4: "#374151", // level 4 floating elements
        },
        hairline: {
          subtle: "rgba(255, 255, 255, 0.06)",
          DEFAULT: "rgba(255, 255, 255, 0.10)",
          strong: "rgba(255, 255, 255, 0.18)",
        },
        brand: {
          lavender: "#6366F1", // signature primary accent
          hover: "#818CF8",
          glow: "rgba(99, 102, 241, 0.15)",
        },
        telemetry: {
          cyan: "#06B6D4",
          emerald: "#10B981",
          amber: "#F59E0B",
          rose: "#F43F5E",
        },
        ink: {
          DEFAULT: "#F9FAFB",
          muted: "#9CA3AF",
          subtle: "#6B7280",
          faint: "#4B5563",
        },
      },
      fontFamily: {
        sans: ["var(--font-sans)", "system-ui", "sans-serif"],
        mono: ["var(--font-mono)", "monospace"],
      },
      letterSpacing: {
        tighter: "-0.03em",
        tight: "-0.015em",
      },
    },
  },
  plugins: [],
};

export default config;
