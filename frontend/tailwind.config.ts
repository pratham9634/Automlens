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
        canvas: "#09090b", // deep carbon obsidian
        surface: {
          1: "#111116", // level 1 primary container cards
          2: "#181820", // level 2 elevated surfaces and inputs
          3: "#22222e", // level 3 hover highlights
          4: "#2e2e3d", // level 4 floating elements
        },
        hairline: {
          subtle: "rgba(255, 255, 255, 0.05)",
          DEFAULT: "rgba(255, 255, 255, 0.09)",
          strong: "rgba(255, 255, 255, 0.16)",
        },
        brand: {
          lavender: "#6366F1", // signature electric indigo
          hover: "#818CF8",
          glow: "rgba(99, 102, 241, 0.18)",
        },
        telemetry: {
          cyan: "#06B6D4",
          emerald: "#10B981",
          amber: "#F59E0B",
          rose: "#F43F5E",
          indigo: "#6366F1",
          violet: "#8B5CF6",
        },
        ink: {
          DEFAULT: "#FAFAFA",
          muted: "#A1A1AA",
          subtle: "#71717A",
          faint: "#52525B",
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
