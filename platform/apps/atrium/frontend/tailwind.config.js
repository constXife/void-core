/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{vue,js,ts}"],
  theme: {
    extend: {
      colors: {
        bg: {
          base: "#0a0e14",
          surface: "#131920",
          elevated: "#1a222c",
          hover: "#242d3a"
        },
        ink: {
          DEFAULT: "#e6edf3",
          secondary: "#7d8590",
          muted: "#484f58"
        },
        border: {
          DEFAULT: "#30363d",
          muted: "#21262d"
        },
        status: {
          online: "#3fb950",
          offline: "#f85149",
          warning: "#d29922",
          pending: "#58a6ff"
        },
        accent: {
          DEFAULT: "#58a6ff",
          cyan: "#39d5ff",
          purple: "#a371f7"
        },
        // Avatar background colors (generated from hash)
        avatar: {
          blue: "#3b82f6",
          purple: "#8b5cf6",
          pink: "#ec4899",
          red: "#ef4444",
          orange: "#f97316",
          yellow: "#eab308",
          green: "#22c55e",
          teal: "#14b8a6",
          cyan: "#06b6d4",
          indigo: "#6366f1"
        }
      },
      fontFamily: {
        sans: ["Inter", "system-ui", "sans-serif"],
        mono: ["JetBrains Mono", "monospace"]
      },
      animation: {
        "fade-in": "fadeIn 0.4s ease-out forwards",
        "fade-in-up": "fadeInUp 0.4s ease-out forwards",
        "fade-in-scale": "fadeInScale 0.3s ease-out forwards",
        "pulse-slow": "pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite",
        "glow": "glow 2s ease-in-out infinite alternate",
        "glow-pulse": "glowPulse 2s ease-in-out infinite"
      },
      keyframes: {
        fadeIn: {
          "0%": { opacity: "0" },
          "100%": { opacity: "1" }
        },
        fadeInUp: {
          "0%": { opacity: "0", transform: "translateY(10px)" },
          "100%": { opacity: "1", transform: "translateY(0)" }
        },
        fadeInScale: {
          "0%": { opacity: "0", transform: "scale(0.9)" },
          "100%": { opacity: "1", transform: "scale(1)" }
        },
        glow: {
          "0%": { boxShadow: "0 0 5px rgba(63, 185, 80, 0.4)" },
          "100%": { boxShadow: "0 0 20px rgba(63, 185, 80, 0.6)" }
        },
        glowPulse: {
          "0%, 100%": { boxShadow: "0 0 8px 2px rgba(63, 185, 80, 0.5)" },
          "50%": { boxShadow: "0 0 16px 4px rgba(63, 185, 80, 0.7)" }
        }
      },
      boxShadow: {
        "glow-online": "0 0 8px 2px rgba(63, 185, 80, 0.5)",
        "glow-offline": "0 0 8px 2px rgba(248, 81, 73, 0.4)",
        "glow-pending": "0 0 8px 2px rgba(88, 166, 255, 0.4)",
        "glow-accent": "0 0 20px rgba(88, 166, 255, 0.2)"
      },
      backdropBlur: {
        xs: "2px"
      }
    }
  },
  plugins: []
};
