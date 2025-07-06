const fs = require("fs");

fs.writeFileSync("tailwind.config.js", `module.exports = {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {},
  },
  plugins: [],
};`);

fs.writeFileSync("postcss.config.js", `module.exports = {
  plugins: {
    tailwindcss: {},
    autoprefixer: {},
  },
};`);

console.log("✔️ Arquivos tailwind.config.js e postcss.config.js criados.");
