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
        // Icy Tech Telemetry Canonical Design Tokens
        canvas: "var(--canvas)",
        surface: {
          DEFAULT: "var(--surface)",
          subtle: "var(--surface-subtle)",
          container: "var(--surface-container)",
          hover: "var(--surface-hover)",
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

        // Primary / Action (Azure)
        accent: {
          DEFAULT: "var(--accent)",
          hover: "var(--accent-hover)",
        },
        azure: {
          400: "#38BDF8",
          500: "#0EA5E9",
          600: "#0284C7",
        },

        // Secondary / Streaming Telemetry (Electric Cyan)
        secondary: {
          DEFAULT: "var(--secondary)",
          hover: "var(--secondary-hover)",
        },
        cyan: {
          400: "#22D3EE",
          500: "#06B6D4",
          600: "#0891B2",
        },

        // Tertiary / User Override (Indigo / Violet)
        tertiary: {
          DEFAULT: "var(--tertiary)",
          400: "#818CF8",
          500: "#6366F1",
          600: "#4F46E5",
        },

        // Cold Slate Neutrals
        slate: {
          800: "#1E293B",
          900: "#0F172A",
          950: "#090D16",
        },

        // Telemetry Diagnostics
        success: "var(--success)",
        warning: "var(--warning)",
        danger: "var(--danger)",
        info: "var(--info)",

        // Legacy Aliases for seamless component compatibility
        brand: {
          lavender: "var(--accent)",
          hover: "var(--accent-hover)",
          glow: "rgba(6, 182, 212, 0.35)",
        },
        telemetry: {
          cyan: "#06B6D4",
          azure: "#0EA5E9",
          indigo: "#6366F1",
          amber: "#F59E0B",
          rose: "#EF4444",
          emerald: "#10B981",
        },
        ink: {
          DEFAULT: "var(--text-primary)",
          muted: "var(--text-secondary)",
          subtle: "var(--text-muted)",
          faint: "var(--text-subtle)",
        },
      },
      borderRadius: {
        sm: "0.25rem",        // 4px
        DEFAULT: "0.5rem",    // 8px
        md: "0.75rem",        // 12px
        lg: "1rem",           // 16px
        xl: "1.5rem",         // 24px
        full: "9999px",
        input: "var(--radius-input)",
        button: "var(--radius-button)",
        card: "var(--radius-card)",
        dialog: "var(--radius-dialog)",
        popover: "var(--radius-popover)",
        pill: "var(--radius-pill)",
      },
      fontFamily: {
        display: ["var(--font-display)", "Anton", "Impact", "sans-serif"],
        sans: ["var(--font-sans)", "Arimo", "system-ui", "sans-serif"],
        body: ["var(--font-sans)", "Arimo", "system-ui", "sans-serif"],
        mono: ["var(--font-mono)", "'Be Vietnam Pro'", "ui-monospace", "monospace"],
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
    },
  },
  plugins: [],
};

export default config;
