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
    },
  },
  plugins: [],
};
export default config;
