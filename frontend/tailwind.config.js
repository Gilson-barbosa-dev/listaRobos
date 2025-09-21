/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./index.html",
    "./*.{js,ts}",
    "./**/*.html"
  ],
  safelist: [
    'bg-gradient-to-br',
    'from-black',
    'via-gray-900',
    'to-black',
    'text-white',
    'text-gray-300',
    'text-gray-400',
    'text-gray-500',
    'text-quant-green',
    'text-quant-purple',
    'text-quant-pink',
    'bg-gray-800',
    'bg-gray-900',
    'border-gray-700',
    'border-quant-green',
    'border-quant-purple',
    'border-quant-pink'
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
