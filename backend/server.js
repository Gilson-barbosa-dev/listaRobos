import express from "express";
import path from "path";
import { fileURLToPath } from "url";
import dotenv from "dotenv";
import fs from "fs";
import pool from "./db.js"; // conexão com o banco
import session from "express-session";
import bcrypt from "bcrypt";
import arquivosRoutes from "./routes/arquivos.js";
import metricasRoutes from "./routes/metricas.js";

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

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, "../frontend")));
app.use("/api/arquivos", arquivosRoutes);
app.use("/api/metricas", metricasRoutes);

// ==========================
// 🔹 Sessões
// ==========================
app.use(session({
  secret: process.env.SESSION_SECRET || "segredo_super_seguro",
  resave: false,
  saveUninitialized: false,
  cookie: { secure: false } // em produção com HTTPS -> true
}));

// ==========================
// 🔹 Middlewares
// ==========================
function autenticar(req, res, next) {
  if (req.session.usuario) {
    return next();
  }
  return res.redirect("/login");
}

async function atualizarUsuario(req, res, next) {
  if (!req.session.usuario) return next();

  try {
    const { rows } = await pool.query(
      "SELECT id, nome, email, status_assinatura, plano, vencimento FROM usuarios WHERE id = $1",
      [req.session.usuario.id]
    );

    if (rows.length > 0) {
      req.session.usuario = {
        ...req.session.usuario,
        ...rows[0]
      };
    }
  } catch (err) {
    console.error("❌ Erro ao atualizar sessão do usuário:", err);
  }

  next();
}

async function verificarAssinatura(req, res, next) {
  if (!req.session.usuario) return res.redirect("/login");

  if (!req.session.usuario.status_assinatura) {
    return res.redirect("/planos");
  }

  return next();
}

// ==========================
// 🔹 Rotas de Login / Logout
// ==========================
app.get("/login", (req, res) => {
  res.render("login", { erro: null });
});

app.post("/login", async (req, res) => {
  const { email, senha } = req.body;

  try {
    const { rows } = await pool.query("SELECT * FROM usuarios WHERE email = $1", [email]);
    const usuario = rows[0];

    if (!usuario) {
      return res.render("login", { erro: "Usuário não encontrado" });
    }

    const senhaCorreta = await bcrypt.compare(senha, usuario.senha_hash);
    if (!senhaCorreta) {
      return res.render("login", { erro: "Senha incorreta" });
    }

    req.session.usuario = { 
      id: usuario.id, 
      nome: usuario.nome, 
      email: usuario.email, 
      status_assinatura: usuario.status_assinatura,
      plano: usuario.plano,
      vencimento: usuario.vencimento
    };

    return res.redirect("/");
  } catch (err) {
    console.error("❌ Erro login:", err);
    return res.render("login", { erro: "Erro interno, tente novamente." });
  }
});

app.get("/logout", (req, res) => {
  req.session.destroy(() => {
    res.redirect("/login");
  });
});

// ==========================
// 🔹 Rotas de Cadastro
// ==========================
app.get("/register", (req, res) => {
  res.render("register", { erro: null, sucesso: null });
});

app.post("/register", async (req, res) => {
  const { nome, email, senha } = req.body;

  try {
    const existe = await pool.query("SELECT id FROM usuarios WHERE email = $1", [email]);
    if (existe.rows.length > 0) {
      return res.render("register", { erro: "E-mail já cadastrado", sucesso: null });
    }

    const senhaHash = await bcrypt.hash(senha, 10);

    await pool.query(
      "INSERT INTO usuarios (nome, email, senha_hash, status_assinatura, plano, vencimento) VALUES ($1, $2, $3, $4, $5, $6)",
      [nome, email, senhaHash, false, null, null]
    );

    return res.render("register", { erro: null, sucesso: "Cadastro realizado com sucesso! Faça login." });
  } catch (err) {
    console.error("❌ Erro ao cadastrar:", err);
    return res.render("register", { erro: "Erro interno, tente novamente.", sucesso: null });
  }
});

// ==========================
// 🔹 Rotas de páginas protegidas
// ==========================
app.get("/", autenticar, atualizarUsuario, verificarAssinatura, (req, res) => 
  res.render("index", { page: "index", usuario: req.session.usuario })
);

app.get("/meus-algoritmos", autenticar, atualizarUsuario, verificarAssinatura, (req, res) =>
  res.render("meus-algoritmos", { page: "meus-algoritmos", usuario: req.session.usuario })
);

app.get("/planos", autenticar, atualizarUsuario, (req, res) => {
  const usuario = req.session.usuario;

  // 🔹 Normalizar status da assinatura
  usuario.ativo = usuario.status_assinatura === true;
  usuario.status = usuario.status_assinatura ? "ativo" : "inativo";

  res.render("planos", { page: "planos", usuario });
});


app.get("/primeiros-passos", autenticar, atualizarUsuario, verificarAssinatura, (req, res) => {
  fs.readFile(path.join(__dirname, "../frontend/primeiros-passos.json"), "utf8", (err, data) => {
    if (err) {
      console.error("❌ Erro ao carregar primeiros-passos.json:", err);
      return res.status(500).send("Erro ao carregar Primeiros Passos");
    }
    const modulos = JSON.parse(data);
    res.render("primeiros-passos", { page: "primeiros-passos", modulos, usuario: req.session.usuario });
  });
});

// ==========================
// 🔹 APIs protegidas
// ==========================
app.get("/api/estrategias", autenticar, atualizarUsuario, verificarAssinatura, async (req, res) => {
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

app.get("/api/consolidado-diario", autenticar, atualizarUsuario, verificarAssinatura, async (req, res) => {
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

app.get("/api/estatistica-detalhada", autenticar, atualizarUsuario, verificarAssinatura, async (req, res) => {
  let { magic } = req.query;

  if (!magic) {
    return res.status(400).json({ erro: "Parâmetro 'magic' é obrigatório" });
  }

  try {
    let magics = [];
    if (Array.isArray(magic)) {
      magics = magic.map((m) => parseInt(m, 10)).filter(Number.isInteger);
    } else {
      magics = String(magic)
        .split(",")
        .map((m) => parseInt(m, 10))
        .filter(Number.isInteger);
    }

    if (magics.length === 0) {
      return res.status(400).json({ erro: "Nenhum magic válido informado" });
    }

    const { rows } = await pool.query(
      `SELECT magic, data_ordem, lucro
       FROM estatistica_detalhada
       WHERE magic = ANY($1::int[])
       ORDER BY data_ordem ASC`,
      [magics]
    );

    return res.json(rows || []);
  } catch (err) {
    console.error("❌ Erro ao buscar estatística detalhada:", err);
    return res.status(500).json({ erro: "Erro interno ao buscar estatística detalhada" });
  }
});

// ==========================
// 🔹 Rotas de Favoritos
// ==========================
app.get("/api/favoritos", autenticar, atualizarUsuario, verificarAssinatura, async (req, res) => {
  try {
    const usuario_id = req.session.usuario.id;
    const query = `
      SELECT f.magic, f.criado_em,
             CASE WHEN l.session_token IS NOT NULL THEN true ELSE false END as tem_token
      FROM favorito f
      LEFT JOIN licencas l 
        ON l.usuario_id = f.usuario_id AND l.magic = f.magic
      WHERE f.usuario_id = $1
    `;
    const { rows } = await pool.query(query, [usuario_id]);
    return res.json(rows);
  } catch (err) {
    console.error("❌ Erro ao buscar favoritos:", err);
    return res.status(500).json({ erro: "Erro ao buscar favoritos" });
  }
});

// 🔹 Adicionar favorito
app.post("/api/favoritos", autenticar, atualizarUsuario, verificarAssinatura, async (req, res) => {
  try {
    const usuario_id = req.session.usuario.id;
    const { magic } = req.body;

    if (!usuario_id || !magic) {
      return res.status(400).json({ erro: "Parâmetros inválidos" });
    }

    await pool.query(
      `INSERT INTO favorito (usuario_id, magic, criado_em)
      SELECT $1, $2, NOW()
      WHERE NOT EXISTS (
        SELECT 1 FROM favorito WHERE usuario_id = $1 AND magic = $2
      )`,
      [usuario_id, magic]
    );

    return res.json({ status: "ok" });
  } catch (err) {
    console.error("❌ Erro ao adicionar favorito:", err);
    return res.status(500).json({ erro: "Erro ao adicionar favorito" });
  }
});

// 🔹 Remover favorito
app.delete("/api/favoritos/:magic", autenticar, atualizarUsuario, verificarAssinatura, async (req, res) => {
  try {
    const usuario_id = req.session.usuario.id;
    const magic = parseInt(req.params.magic, 10);

    if (!usuario_id || !magic) {
      return res.status(400).json({ erro: "Parâmetros inválidos" });
    }

    await pool.query(
      `DELETE FROM favorito WHERE usuario_id = $1 AND magic = $2`,
      [usuario_id, magic]
    );

    return res.json({ status: "ok" });
  } catch (err) {
    console.error("❌ Erro ao remover favorito:", err);
    return res.status(500).json({ erro: "Erro ao remover favorito" });
  }
});

app.post("/api/favoritos/liberar", autenticar, atualizarUsuario, verificarAssinatura, async (req, res) => {
  try {
    const usuario_id = req.session.usuario.id;
    const { magic } = req.body;

    if (!usuario_id || !magic) {
      return res.status(400).json({ erro: "Parâmetros inválidos" });
    }

    await pool.query(
      `UPDATE licencas SET session_token = NULL WHERE usuario_id = $1 AND magic = $2`,
      [usuario_id, magic]
    );

    return res.json({ status: "ok" });
  } catch (err) {
    console.error("❌ Erro ao liberar acesso:", err);
    return res.status(500).json({ erro: "Erro ao liberar acesso" });
  }
});

// Gerenciamento mesa
app.get("/gerenciamento-mesa", autenticar, atualizarUsuario, verificarAssinatura, async (req, res) => {
  res.render("gerenciamento-mesa");
});


// ==========================
// 🔹 Inicializar servidor
// ==========================
app.listen(PORT, () => {
  console.log(`🚀 Servidor rodando em http://localhost:${PORT}`);
});
