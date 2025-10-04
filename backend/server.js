import express from "express";
import path from "path";
import { fileURLToPath } from "url";
import dotenv from "dotenv";
import fs from "fs";
import pool from "./db.js"; // conexão com o banco
import session from "express-session";
import bcrypt from "bcrypt";
import crypto from "crypto";
import { Resend } from "resend";
import arquivosRoutes from "./routes/arquivos.js";
import metricasRoutes from "./routes/metricas.js";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

// Corrigir __dirname no ESModules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const resend = new Resend(process.env.RESEND_API_KEY);

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
// 🔹 Recuperar acesso (Esqueceu a senha)
// ==========================
// ==========================
// 🔹 Recuperar acesso (Esqueceu a senha)
// ==========================
app.get("/recuperar", (req, res) => {
  res.render("recuperar", { erro: null, mensagem: null });
});

app.post("/recuperar", async (req, res) => {
  const { email } = req.body;

  try {
    const { rows } = await pool.query("SELECT id FROM usuarios WHERE email = $1", [email]);
    if (rows.length === 0)
      return res.render("recuperar", { erro: "E-mail não encontrado.", mensagem: null });

    const token = crypto.randomBytes(32).toString("hex");

    // 🔧 adiciona +1h de validade +3h de fuso (UTC → SP)
    const expira = new Date(Date.now() + 3600000 + 3 * 60 * 60 * 1000);

    await pool.query(
      "UPDATE usuarios SET reset_token=$1, reset_expira=$2 WHERE email=$3",
      [token, expira, email]
    );

    const link = `${process.env.BASE_URL}/resetar/${token}`;

    await resend.emails.send({
      from: "Clube Quant <no-reply@clubequant.com.br>",
      to: email,
      subject: "🔐 Recuperação de Senha - Clube Quant",
      html: `
        <div style="font-family:Arial,Helvetica,sans-serif;background-color:#0f172a;padding:40px;color:#f8fafc;text-align:center;border-radius:12px;max-width:480px;margin:auto;">
          <img src="https://app.clubequant.com.br/img/logo_clube_quant2.webp" alt="Clube Quant" style="width:160px;margin-bottom:24px;">
          <h2 style="color:#60a5fa;margin-bottom:12px;">Recuperação de Senha</h2>
          <p style="color:#e2e8f0;margin-bottom:30px;">Você solicitou redefinir sua senha. Clique no botão abaixo para continuar:</p>
          <a href="${link}" style="display:inline-block;background-color:#3b82f6;color:#fff;text-decoration:none;font-weight:bold;padding:12px 20px;border-radius:8px;">🔑 Redefinir minha senha</a>
          <p style="color:#94a3b8;margin-top:30px;font-size:13px;">Se você não fez esta solicitação, ignore este e-mail.<br>O link expira em 1 hora.</p>
        </div>
      `,
    });

    res.render("recuperar", { erro: null, mensagem: "Enviamos um link de recuperação para o seu e-mail." });
  } catch (err) {
    console.error("❌ Erro ao enviar recuperação:", err);
    res.render("recuperar", { erro: "Erro ao enviar o e-mail.", mensagem: null });
  }
});

// ==========================
// 🔹 Página de redefinição
// ==========================
app.get("/resetar/:token", async (req, res) => {
  const { token } = req.params;

  try {
    // 🔍 Valida token e expiração
    const { rows } = await pool.query(
      "SELECT id FROM usuarios WHERE reset_token=$1 AND reset_expira > NOW()",
      [token]
    );

    if (rows.length === 0) {
      console.warn("⚠️ Token inválido ou expirado:", token);
      return res.render("resetar", {
        erro: "Token inválido ou expirado. Solicite uma nova recuperação.",
        mensagem: null,
        token: null,
      });
    }

    // ✅ Token válido → renderiza formulário
    res.render("resetar", { erro: null, mensagem: null, token });
  } catch (err) {
    console.error("❌ Erro ao carregar token:", err);
    res.render("resetar", { erro: "Erro interno. Tente novamente.", mensagem: null, token: null });
  }
});

// ==========================
// 🔹 Atualizar senha
// ==========================
app.post("/resetar/:token", async (req, res) => {
  const { token } = req.params;
  const { senha } = req.body;

  try {
    const { rows } = await pool.query(
      "SELECT id FROM usuarios WHERE reset_token=$1 AND reset_expira > NOW()",
      [token]
    );

    if (rows.length === 0) {
      console.warn("⚠️ Tentativa de redefinir com token inválido:", token);
      return res.render("resetar", {
        erro: "Token inválido ou expirado. Solicite uma nova recuperação.",
        mensagem: null,
        token: null,
        redirect: false
      });
    }

    // 🔐 Atualiza senha com hash e limpa token
    const hash = await bcrypt.hash(senha, 10);
    await pool.query(
      "UPDATE usuarios SET senha_hash=$1, reset_token=NULL, reset_expira=NULL WHERE reset_token=$2",
      [hash, token]
    );

    console.log("✅ Senha redefinida com sucesso para usuário ID:", rows[0].id);

    // ✅ Envia flag redirect:true
    res.render("resetar", {
      erro: null,
      mensagem: "Senha redefinida! Redirecionando para o login...",
      token: null,
      redirect: true
    });
  } catch (err) {
    console.error("❌ Erro ao redefinir senha:", err);
    res.render("resetar", {
      erro: "Erro ao redefinir senha. Tente novamente.",
      mensagem: null,
      token,
      redirect: false
    });
  }
});

// ==========================
// 🔹 Inicializar servidor
// ==========================
app.listen(PORT, () => {
  console.log(`🚀 Servidor rodando em http://localhost:${PORT}`);
});
