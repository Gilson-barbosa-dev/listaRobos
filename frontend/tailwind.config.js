/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./frontend/**/*.{html,js,ejs}", // pega todos os arquivos do frontend
    "./backend/**/*.{js}",           // se tiver classes em arquivos backend
    "./**/*.{ejs,html,js,ts}"        // pega tudo no projeto (segurança extra)
  ],
  safelist: [
    'bg-gradient-to-br',
    'from-black',
    'via-gray-900',
    'to-black',
    'text-white',
    'text-quant-green',
    'text-quant-purple',
    'text-quant-pink'
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
