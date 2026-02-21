/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/app/**/*.{js,ts,jsx,tsx}",
    "./src/components/**/*.{js,ts,jsx,tsx}",
    "./src/pages/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          50: "#fdf8f6",
          100: "#fce8e3",
          200: "#f5ccc2",
          300: "#edb0a0",
          400: "#e8998d",
          500: "#e0827a",
          600: "#d66b63",
          700: "#c9554c",
          800: "#a84438",
          900: "#7d3228",
        },
        secondary: "#C9ADA7",
        accent: "#9A8C98",
      },
      fontFamily: {
        sans: ["system-ui", "sans-serif"],
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
  plugins: [],
};
