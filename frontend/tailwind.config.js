/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./frontend/**/*.{html,js,ejs}", // pega todos os arquivos do frontend
    "./backend/**/*.{js}",           // se tiver classes em arquivos backend
    "./**/*.{ejs,html,js,ts}"        // pega tudo no projeto (segurança extra)
  ],
  safelist: [
    "bg-gradient-to-br",
    "from-black",
    "via-gray-900",
    "to-black",
    "text-white",
    "text-quant-green",
    "text-quant-purple",
    "text-quant-pink",
    "animate-pulse-star", // garante que a animação da estrela nunca é purgada
    "fill-transparent",   // garante que o Tailwind gere essa classe
    "fill-yellow-400"     // garante que o Tailwind gere essa classe
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
        glow: "0 0 8px rgba(250, 204, 21, 0.8)", // ⭐ brilho amarelo
      },
      keyframes: {
        pulseStar: {
          "0%, 100%": { transform: "scale(1)", opacity: "1" },
          "50%": { transform: "scale(1.3)", opacity: "0.8" },
        },
      },
      animation: {
        "pulse-star": "pulseStar 0.4s ease-in-out",
      },
    },
  },
  plugins: [
    // Ativa utilitários de fill/stroke nativos do Tailwind
    function ({ addUtilities }) {
      addUtilities({
        ".fill-transparent": { fill: "transparent" },
        ".fill-yellow-400": { fill: "#facc15" }, // mesma cor do text-yellow-400
      });
    },
  ],
};
