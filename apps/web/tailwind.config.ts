
import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: ["class"],
  content: [
    "./pages/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
    "./app/**/*.{ts,tsx}",
    "./src/**/*.{ts,tsx}",
  ],
  prefix: "",
  theme: {
    container: {
      center: true,
      padding: "2rem",
      screens: {
        "2xl": "1400px",
      },
    },
    extend: {
      fontFamily: {
        inter: ['Inter', 'sans-serif'],
        lato: ['Lato', 'sans-serif'],
        sora: ['Sora', 'sans-serif'],
        manrope: ['Manrope', 'sans-serif'],
      },
      colors: {
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        primary: {
          DEFAULT: "hsl(var(--primary))",
          dark: "hsl(var(--primary-dark))",
          light: "hsl(var(--primary-light))",
          foreground: "hsl(var(--primary-foreground))",
        },
        secondary: {
          DEFAULT: "hsl(var(--secondary))",
          foreground: "hsl(var(--secondary-foreground))",
        },
        accent: {
          DEFAULT: "hsl(var(--accent))",
          foreground: "hsl(var(--accent-foreground))",
        },
        destructive: {
          DEFAULT: "hsl(var(--destructive))",
          foreground: "hsl(var(--destructive-foreground))",
        },
        muted: {
          DEFAULT: "hsl(var(--muted))",
          foreground: "hsl(var(--muted-foreground))",
        },
        popover: {
          DEFAULT: "hsl(var(--popover))",
          foreground: "hsl(var(--popover-foreground))",
        },
        card: {
          DEFAULT: "hsl(var(--card))",
          foreground: "hsl(var(--card-foreground))",
        },
        // Dashboard B2B Professional Colors
        dashboard: {
          bg: "hsl(var(--dashboard-bg))",
          header: "hsl(var(--dashboard-header))",
          text: "hsl(var(--dashboard-text))",
          separator: "hsl(var(--dashboard-separator))",
        },
        carbon: {
          impact: "hsl(var(--carbon-impact))",
          dark: "hsl(var(--carbon-dark))",
          turquoise: "hsl(var(--carbon-turquoise))",
          blue: "hsl(var(--carbon-blue))",
        },
        scope: {
          1: "hsl(var(--scope-1))",
          2: "hsl(var(--scope-2))",
          3: "hsl(var(--scope-3))",
        },
        score: {
          a: "hsl(var(--score-a))",
          b: "hsl(var(--score-b))",
          c: "hsl(var(--score-c))",
          d: "hsl(var(--score-d))",
        },
        forest: {
          deep: "hsl(var(--forest-deep))",
          mid: "hsl(var(--forest-mid))",
          light: "hsl(var(--forest-light))",
          sage: "hsl(var(--forest-sage))",
          bg: "hsl(var(--forest-bg))",
        },
      },
      backgroundImage: {
        'gradient-primary': 'linear-gradient(135deg, hsl(174 70% 41%) 0%, hsl(180 100% 27%) 100%)',
        'gradient-secondary': 'linear-gradient(135deg, hsl(147 50% 36%) 0%, hsl(123 100% 50%) 100%)',
        'gradient-nature': 'linear-gradient(135deg, hsl(180 100% 73%) 0%, hsl(174 70% 41%) 50%, hsl(147 50% 36%) 100%)',
        'gradient-hero': 'linear-gradient(135deg, hsl(180 100% 94%) 0%, hsl(120 100% 97%) 50%, hsl(207 100% 97%) 100%)',
      },
      boxShadow: {
        'soft': '0 10px 40px hsl(174 70% 41% / 0.1)',
        'medium': '0 20px 60px hsl(174 70% 41% / 0.15)',
        'strong': '0 30px 80px hsl(174 70% 41% / 0.2)',
      },
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
      },
      keyframes: {
        "accordion-down": {
          from: { height: "0" },
          to: { height: "var(--radix-accordion-content-height)" },
        },
        "accordion-up": {
          from: { height: "var(--radix-accordion-content-height)" },
          to: { height: "0" },
        },
        "float": {
          "0%, 100%": { transform: "translateY(0px) rotate(0deg)" },
          "50%": { transform: "translateY(-20px) rotate(180deg)" },
        },
        "fadeInUp": {
          "0%": { opacity: "0", transform: "translateY(30px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        "slideInLeft": {
          "0%": { opacity: "0", transform: "translateX(-50px)" },
          "100%": { opacity: "1", transform: "translateX(0)" },
        },
        "slideInRight": {
          "0%": { opacity: "0", transform: "translateX(50px)" },
          "100%": { opacity: "1", transform: "translateX(0)" },
        },
        "earth-rotate": {
          "0%": { transform: "rotate(0deg)" },
          "100%": { transform: "rotate(360deg)" },
        },
        "cloud-float": {
          "0%, 100%": { transform: "translateY(0px) scale(1)" },
          "50%": { transform: "translateY(-10px) scale(1.1)" },
        },
        "data-point-float": {
          "0%, 100%": { transform: "translateY(0px) scale(1)" },
          "50%": { transform: "translateY(-8px) scale(1.05)" },
        },
        "float-card": {
          "0%, 100%": { transform: "translateY(0px) rotate(0deg)" },
          "50%": { transform: "translateY(-10px) rotate(2deg)" },
        },
        "card-cycle": {
          "0%": { 
            transform: "translateY(0px) scale(1)", 
            opacity: "1" 
          },
          "25%": { 
            transform: "translateY(-40px) scale(1.05)", 
            opacity: "0.8" 
          },
          "50%": { 
            transform: "translateY(-80px) scale(0.9)", 
            opacity: "0" 
          },
          "75%": { 
            transform: "translateY(40px) scale(0.9)", 
            opacity: "0" 
          },
          "100%": { 
            transform: "translateY(0px) scale(1)", 
            opacity: "1" 
          }
        },
        "bounce": {
          "0%, 20%, 50%, 80%, 100%": { transform: "translateX(-50%) translateY(0)" },
          "40%": { transform: "translateX(-50%) translateY(-10px)" },
          "60%": { transform: "translateX(-50%) translateY(-5px)" },
        },
        "progress-fill": {
          "0%": { width: "0%" },
          "100%": { width: "40%" },
        },
        "scroll-infinite": {
          "0%": { transform: "translateX(0)" },
          "100%": { transform: "translateX(-50%)" },
        },
        "scroll-testimonials": {
          "0%": { transform: "translateX(0)" },
          "100%": { transform: "translateX(-50%)" },
        },
        "scroll-testimonials-slow": {
          "0%": { transform: "translateX(0)" },
          "100%": { transform: "translateX(-50%)" },
        },
      },
      animation: {
        "accordion-down": "accordion-down 0.2s ease-out",
        "accordion-up": "accordion-up 0.2s ease-out",
        "float": "float 6s ease-in-out infinite",
        "fadeInUp": "fadeInUp 0.8s ease-out forwards",
        "slideInLeft": "slideInLeft 1s ease-out",
        "slideInRight": "slideInRight 1s ease-out",
        "earth-rotate": "earth-rotate 20s linear infinite",
        "cloud-float": "cloud-float 8s ease-in-out infinite",
        "data-point-float": "data-point-float 6s ease-in-out infinite",
        "float-card": "float-card 4s ease-in-out infinite",
        "card-cycle": "card-cycle 8s ease-in-out infinite",
        "bounce": "bounce 2s infinite",
        "progress-fill": "progress-fill 2s ease-out",
        "scroll-infinite": "scroll-infinite 20s linear infinite",
        "scroll-testimonials": "scroll-testimonials 40s linear infinite",
        "scroll-testimonials-slow": "scroll-testimonials-slow 60s linear infinite",
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
} satisfies Config;

export default config;
