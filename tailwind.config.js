/** @type {import('tailwindcss').Config} */

export default {
  darkMode: "class",
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    container: {
      center: true,
      padding: "1.5rem",
      screens: {
        "2xl": "1400px",
      },
    },
    extend: {
      colors: {
        darkroom: {
          50: "#faf5ed",
          100: "#f2e8d5",
          200: "#e4d0a8",
          300: "#d3b172",
          400: "#c29349",
          500: "#b8860b",
          600: "#9e6a09",
          700: "#834f08",
          800: "#6e3f0a",
          900: "#5c330d",
          950: "#1a1a1a",
        },
        amber: {
          safe: "#8B4513",
          glow: "#c0392b",
        },
        ink: {
          50: "#f5f0e8",
          100: "#e8e0d0",
          200: "#d1c4a8",
          300: "#b8a380",
          400: "#9e825a",
          500: "#8B6914",
          600: "#6b5210",
          700: "#4a3a0c",
          800: "#2d2408",
          900: "#1a1a1a",
          950: "#0f0f0f",
        },
        status: {
          idle: "#2c5f2d",
          occupied: "#8B4513",
          maintenance: "#c0392b",
          normal: "#2c5f2d",
          near: "#b8860b",
          expired: "#c0392b",
          exhausted: "#6b7280",
        },
      },
      fontFamily: {
        serif: ['"Noto Serif SC"', "Georgia", "serif"],
        mono: ['"JetBrains Mono"', "ui-monospace", "monospace"],
      },
      backgroundImage: {
        "film-grain":
          "url(\"data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='0.04'/%3E%3C/svg%3E\")",
        "darkroom-gradient":
          "radial-gradient(ellipse at top, rgba(139, 69, 19, 0.15) 0%, rgba(26, 26, 26, 0) 60%)",
      },
      boxShadow: {
        "amber-glow": "0 0 20px rgba(184, 134, 11, 0.25)",
        "red-glow": "0 0 20px rgba(192, 57, 43, 0.3)",
        "card-inner":
          "inset 0 1px 0 rgba(255,255,255,0.03), inset 0 -1px 0 rgba(0,0,0,0.3)",
      },
      animation: {
        "pulse-glow": "pulse-glow 2s ease-in-out infinite",
        "count-up": "count-up 0.6s ease-out",
      },
      keyframes: {
        "pulse-glow": {
          "0%, 100%": { boxShadow: "0 0 5px rgba(184, 134, 11, 0.3)" },
          "50%": { boxShadow: "0 0 25px rgba(184, 134, 11, 0.6)" },
        },
        "count-up": {
          "0%": { opacity: "0", transform: "translateY(10px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
      },
    },
  },
  plugins: [],
};
