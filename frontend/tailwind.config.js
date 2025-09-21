/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./index.html",             // arquivo principal
    "./*.{js,ts}",              // scripts na raiz
    "./components/**/*.{js,ts}",// caso crie componentes
    "./**/*.html"               // todos HTMLs dentro do frontend
  ],
  theme: {
    extend: {
      colors: {
        quant: {
          green: "#00ffb3",
          purple: "#7a5cff",
          pink: "#ff00c8",
        },
      },
      dropShadow: {
        quant: "0 0 20px rgba(0,255,179,0.6)",
      },
    },
  },
  plugins: [],
};
