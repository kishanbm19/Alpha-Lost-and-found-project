/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,jsx}"],
  theme: {
    extend: {
      colors: {
        brand: {
          DEFAULT: "#2865A8", // buttons, links
          dark: "#153B6B",    // headings, footer
          light: "#E9F1F9",   // page background
          muted: "#5B6B7F",   // secondary text
        },
      },
      fontFamily: {
        sans: ["Inter", "system-ui", "sans-serif"],
        mono: ["'Roboto Mono'", "ui-monospace", "monospace"],
      },
    },
  },
  plugins: [],
};
