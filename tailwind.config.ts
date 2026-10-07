import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: "#0d1c2c",
          container: "#233142",
          fixed: "#d5e4fa",
          "fixed-dim": "#b9c8dd",
        },
        secondary: {
          DEFAULT: "#715a43",
          container: "#fdddbf",
          fixed: "#fdddbf",
          "fixed-dim": "#e0c1a5",
        },
        tertiary: {
          DEFAULT: "#2a1703",
          container: "#422b14",
          fixed: "#ffdcbe",
          "fixed-dim": "#e5c09e",
        },
        "surface-container": {
          lowest: "#ffffff",
          low: "#f3f4f5",
          DEFAULT: "#edeeef",
          high: "#e7e8e9",
          highest: "#e1e3e4",
        },
        "on-surface": {
          DEFAULT: "#191c1d",
          variant: "#44474c",
        },
        "on-primary": {
          DEFAULT: "#ffffff",
          container: "#8b99ae",
          fixed: "#0e1c2d",
        },
        "on-secondary": {
          DEFAULT: "#ffffff",
          container: "#786048",
          fixed: "#281806",
        },
        outline: {
          DEFAULT: "#74777d",
          variant: "#c4c6cd",
        },
        error: {
          DEFAULT: "#ba1a1a",
          container: "#ffdad6",
        },
        "on-error": {
          DEFAULT: "#ffffff",
          container: "#93000a",
        },
        alegra: {
          navy: "#233142",
          "navy-dark": "#18222E",
          "navy-light": "#34495E",
          sand: "#D6B89C",
          "sand-light": "#F7F2EC",
          "sand-dark": "#B89677",
          bg: "#F8F9FA",
          card: "#FFFFFF",
          border: "#E5E7EB",
        },
      },
      fontFamily: {
        sans: ["'Inter'", "sans-serif"],
        display: ["'Plus Jakarta Sans'", "sans-serif"],
      },
    },
  },
  plugins: [],
};
export default config;
