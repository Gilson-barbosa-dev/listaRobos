/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./index.html",
    "./*.{js,ts}",
    "./**/*.{html,js,ts}"
  ],
  safelist: [
    // Fundo principal
    'bg-gradient-to-br',
    'from-black',
    'via-gray-900',
    'to-black',
    'text-white',

    // Inputs / textos
    'bg-gray-800',
    'border-gray-700',
    'placeholder-gray-400',

    // Cards / métricas
    'bg-gray-900',
    'bg-gray-900/40',
    'bg-gradient-to-r',
    'from-quant-green/20',
    'to-quant-purple/20',
    'border-quant-green/30',
    'border-quant-purple/30',

    // Textos dinâmicos
    'text-quant-green',
    'text-quant-purple',
    'text-quant-pink',
    'text-gray-300',
    'text-gray-400'
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
