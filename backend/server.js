import express from "express";
import path from "path";
import { fileURLToPath } from "url";
import dotenv from "dotenv";
import pool from "./db.js"; // conexão com o banco

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

// Corrigir __dirname no ESModules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// ==========================
// 🔹 Configuração do EJS
// ==========================
app.set("views", path.join(__dirname, "../frontend/views"));
app.set("view engine", "ejs");

// Middleware para JSON
app.use(express.json());

// Servir arquivos estáticos (CSS, JS, imagens)
app.use(express.static(path.join(__dirname, "../frontend")));

// ==========================
// 🔹 Rotas de páginas (com sidebar partial)
// ==========================
app.get("/", (req, res) => res.render("index", { page: "index" }));
app.get("/meus-algoritmos", (req, res) =>
  res.render("meus-algoritmos", { page: "meus-algoritmos" })
);
app.get("/planos", (req, res) =>
  res.render("planos", { page: "planos" })
);

// ==========================
// 🔹 API - pegar estratégias
// ==========================
app.get("/api/estrategias", async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT magic, estrategia, ativo, lucro_total, total_operacoes, assertividade
      FROM estatistica
      ORDER BY id DESC
    `);

    return res.json(result.rows || []);
  } catch (err) {
    console.error("❌ Erro ao buscar estratégias:", err);
    return res.status(500).json({ erro: "Erro ao buscar estratégias" });
  }
});

// ==========================
// 🔹 API - consolidado diário
// ==========================
app.get("/api/consolidado-diario", async (req, res) => {
  try {
    const { rows } = await pool.query(`
      SELECT DATE(data_ordem) as dia, SUM(lucro) as lucro_total
      FROM estatistica_detalhada
      GROUP BY dia
      ORDER BY dia ASC
    `);
    return res.json(rows || []);
  } catch (err) {
    console.error("❌ Erro ao buscar consolidado diário:", err);
    return res.status(500).json({ erro: "Erro ao buscar consolidado diário" });
  }
});

// ==========================
// 🔹 API - histórico detalhado por estratégia (Magic)
// ==========================
app.get("/api/estatistica-detalhada", async (req, res) => {
  const { magic } = req.query;

  if (!magic) {
    return res.status(400).json({ erro: "Parâmetro 'magic' é obrigatório" });
  }

  try {
    const { rows } = await pool.query(
      `SELECT data_ordem, lucro
       FROM estatistica_detalhada
       WHERE magic = $1
       ORDER BY data_ordem ASC`,
      [magic]
    );

    return res.json(rows || []);
  } catch (err) {
    console.error("❌ Erro ao buscar estatística detalhada:", err);
    return res.status(500).json({ erro: "Erro interno ao buscar estatística detalhada" });
  }
});

// ==========================
// 🔹 Inicializar servidor
// ==========================
app.listen(PORT, () => {
  console.log(`🚀 Servidor rodando em http://localhost:${PORT}`);
});
