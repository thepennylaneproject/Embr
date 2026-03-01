/** @type {import('tailwindcss').Config} */
const sharedConfig = require("@embr/config/tailwind");

module.exports = {
  content: [
    "./src/app/**/*.{js,ts,jsx,tsx}",
    "./src/components/**/*.{js,ts,jsx,tsx}",
    "./src/pages/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      ...sharedConfig.theme.extend,
      colors: {
        ...sharedConfig.theme.extend.colors,
        embr: {
          // Primary - Muted Terracotta (Phoenix)
          primary: {
            50: "#faf6f4",
            100: "#f5eee9",
            200: "#ebd7cc",
            300: "#d9baa8",
            400: "#c4977d",
            500: "#b88566",
            600: "#a67452",
            700: "#886043",
            800: "#6d4a37",
            900: "#523729",
          },
          // Secondary - Teal (Water/Calm)
          secondary: {
            50: "#f0f7f6",
            100: "#dceee8",
            200: "#b8d9d3",
            300: "#8dbfb0",
            400: "#6ba898",
            500: "#5a9684",
            600: "#497e6f",
            700: "#3a6659",
            800: "#2d5246",
            900: "#213c35",
          },
          // Accent - Navy (Grounding)
          accent: {
            50: "#f5f7fa",
            100: "#e8ecf2",
            200: "#cbd5e3",
            300: "#a1b3c8",
            400: "#6a7f9e",
            500: "#4a5f7f",
            600: "#374563",
            700: "#2c3847",
            800: "#232d39",
            900: "#1a202c",
          },
          // Neutral - Cream (Background)
          neutral: {
            50: "#fefdfb",
            100: "#faf8f5",
            200: "#f3ebe5",
            300: "#e8ddd2",
            400: "#d4ccc0",
            500: "#c0b8ac",
            600: "#a89d91",
            700: "#8f8478",
            800: "#76695e",
            900: "#5d5248",
          },
          // Semantic
          success: "#6ba898",
          warning: "#c4977d",
          error: "#9b6b5a",
          info: "#4a5f7f",
        },
      },
      spacing: {
        xs: "0.25rem",
        sm: "0.5rem",
        md: "1rem",
        lg: "1.5rem",
        xl: "2rem",
        "2xl": "2.5rem",
        "3xl": "3rem",
      },
    },
  },
  plugins: sharedConfig.plugins || [],
};
