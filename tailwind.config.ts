import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          orange: "#f97316",
          orangeDark: "#ea580c",
          blue: "#0f2a4d",
          light: "#f7f8fb",
        },
      },
      boxShadow: {
        card: "0 10px 26px rgba(15, 42, 77, 0.09)",
      },
      borderRadius: {
        xl2: "1rem",
      },
    },
  },
  plugins: [],
};

export default config;
