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
        // Canonical Design Tokens
        canvas: "var(--canvas)",
        surface: {
          DEFAULT: "var(--surface)",
          subtle: "var(--surface-subtle)",
          hover: "var(--surface-hover)",
          // Backwards compatibility aliases for existing unrefactored components
          1: "var(--surface)",
          2: "var(--surface-subtle)",
          3: "var(--surface-hover)",
          4: "var(--surface-hover)",
        },
        border: {
          DEFAULT: "var(--border)",
          subtle: "var(--border-subtle)",
          strong: "var(--border-strong)",
        },
        "text-primary": "var(--text-primary)",
        "text-secondary": "var(--text-secondary)",
        "text-muted": "var(--text-muted)",
        "text-subtle": "var(--text-subtle)",
        accent: {
          DEFAULT: "var(--accent)",
          hover: "var(--accent-hover)",
        },
        success: "var(--success)",
        warning: "var(--warning)",
        danger: "var(--danger)",
        info: "var(--info)",

        // Backwards compatibility mappings for existing components
        hairline: {
          subtle: "var(--border-subtle)",
          DEFAULT: "var(--border)",
          strong: "var(--border-strong)",
        },
        brand: {
          lavender: "var(--accent)",
          hover: "var(--accent-hover)",
          glow: "transparent",
        },
        telemetry: {
          cyan: "var(--info)",
          emerald: "var(--success)",
          amber: "var(--warning)",
          rose: "var(--danger)",
          indigo: "var(--accent)",
          violet: "#8B5CF6",
        },
        ink: {
          DEFAULT: "var(--text-primary)",
          muted: "var(--text-secondary)",
          subtle: "var(--text-muted)",
          faint: "var(--text-subtle)",
        },
      },
      borderRadius: {
        input: "var(--radius-input)",
        button: "var(--radius-button)",
        card: "var(--radius-card)",
        dialog: "var(--radius-dialog)",
        popover: "var(--radius-popover)",
        pill: "var(--radius-pill)",
      },
      fontFamily: {
        sans: ["var(--font-sans)", "system-ui", "sans-serif"],
        mono: ["var(--font-mono)", "monospace"],
      },
      transitionDuration: {
        fast: "var(--motion-fast)",
        standard: "var(--motion-standard)",
        slow: "var(--motion-slow)",
      },
      transitionTimingFunction: {
        "ease-enter": "var(--ease-enter)",
        "ease-exit": "var(--ease-exit)",
      },
      letterSpacing: {
        tighter: "-0.045em",
        tight: "-0.02em",
        normal: "-0.005em",
      },
    },
  },
  plugins: [],
};

export default config;
