// backend/routes/licencas.js
import express from "express";
import pool from "../db.js";
import crypto from "crypto";

const router = express.Router();

// 🔹 Limites de EAs ativos simultaneamente por plano
const LIMITES_PLANO = {
  Starter: 4,
  Plus: 8,
  Premium: Infinity, // Ilimitado
  Diamond: Infinity  // Ilimitado
};

// 🔹 Magic numbers de gerenciamento de mesa (não contam no limite)
const MAGICS_GERENCIAMENTO_MESA = [
  1,  // 000001 - Gerenciamento Mesa
  2   // 000002 - Gerenciamento Notícia
];

// ==========================
// 🔹 Validar Licença (chamado pelo EA ao iniciar)
// ==========================
router.post("/validar", async (req, res) => {
  try {
    const { email, magic, session_id } = req.body;

    // 🔍 Validação de parâmetros
    if (!email || !magic || !session_id) {
      return res.status(400).json({ 
        autorizado: false, 
        mensagem: "Parâmetros inválidos (email, magic, session_id)" 
      });
    }

    const magicInt = parseInt(magic, 10);
    if (isNaN(magicInt)) {
      return res.status(400).json({ 
        autorizado: false, 
        mensagem: "Magic number inválido" 
      });
    }

    // 🔍 Buscar usuário
    const userResult = await pool.query(
      "SELECT id, plano, status_assinatura FROM usuarios WHERE email = $1",
      [email]
    );

    if (userResult.rows.length === 0) {
      return res.status(404).json({ 
        autorizado: false, 
        mensagem: "Usuário não encontrado" 
      });
    }

    const usuario = userResult.rows[0];

    // 🚫 Verificar assinatura ativa
    if (!usuario.status_assinatura) {
      return res.status(403).json({ 
        autorizado: false, 
        mensagem: "Assinatura inativa. Renove seu plano em https://clubequant.com/planos" 
      });
    }

    // 🎯 Verificar se é EA de gerenciamento de mesa
    const isGerenciamentoMesa = MAGICS_GERENCIAMENTO_MESA.includes(magicInt);

    // 🔍 Buscar licença existente
    const licencaResult = await pool.query(
      "SELECT id, session_token FROM licencas WHERE usuario_id = $1 AND magic = $2",
      [usuario.id, magicInt]
    );

    // ✅ Se já existe licença com mesmo session_id, renovar
    if (licencaResult.rows.length > 0) {
      const licenca = licencaResult.rows[0];
      
      if (licenca.session_token === session_id) {
        // Renovar última atividade
        await pool.query(
          "UPDATE licencas SET ultima_atividade = NOW() WHERE id = $1",
          [licenca.id]
        );

        return res.json({ 
          autorizado: true, 
          mensagem: "Licença renovada com sucesso",
          plano: usuario.plano
        });
      }
    }

    // 📊 Contar EAs ativos (excluir gerenciamento de mesa)
    let countQuery = `
      SELECT COUNT(*) as total
      FROM licencas l
      WHERE l.usuario_id = $1 
        AND l.session_token IS NOT NULL
    `;
    
    // Se tiver magic numbers de gerenciamento de mesa, excluir da contagem
    if (MAGICS_GERENCIAMENTO_MESA.length > 0) {
      countQuery += ` AND l.magic NOT IN (${MAGICS_GERENCIAMENTO_MESA.join(',')})`;
    }

    const countResult = await pool.query(countQuery, [usuario.id]);
    const easAtivos = parseInt(countResult.rows[0].total, 10);

    // 🎯 Verificar limite do plano (não aplicar para gerenciamento de mesa)
    const limitePlano = LIMITES_PLANO[usuario.plano] || 0;
    
    if (!isGerenciamentoMesa && easAtivos >= limitePlano) {
      return res.status(403).json({ 
        autorizado: false, 
        mensagem: `Limite de ${limitePlano} EAs atingido no plano ${usuario.plano}. Faça upgrade ou libere um EA em uso.`,
        limite: limitePlano,
        em_uso: easAtivos
      });
    }

    // ✅ Autorizar: criar ou atualizar licença
    if (licencaResult.rows.length > 0) {
      // Atualizar session_token existente
      await pool.query(
        `UPDATE licencas 
         SET session_token = $1, ultima_atividade = NOW() 
         WHERE id = $2`,
        [session_id, licencaResult.rows[0].id]
      );
    } else {
      // Criar nova licença
      await pool.query(
        `INSERT INTO licencas (usuario_id, magic, session_token, criado_em, ultima_atividade)
         VALUES ($1, $2, $3, NOW(), NOW())`,
        [usuario.id, magicInt, session_id]
      );
    }

    console.log(`✅ Licença autorizada: ${email} | Magic ${magicInt} | Plano ${usuario.plano} | Ativos: ${easAtivos + 1}/${limitePlano}`);

    return res.json({ 
      autorizado: true, 
      mensagem: "Licença autorizada com sucesso",
      plano: usuario.plano,
      limite: limitePlano === Infinity ? "Ilimitado" : limitePlano,
      em_uso: easAtivos + 1
    });

  } catch (err) {
    console.error("❌ Erro ao validar licença:", err);
    return res.status(500).json({ 
      autorizado: false, 
      mensagem: "Erro interno ao validar licença" 
    });
  }
});

// ==========================
// 🔹 Renovar Heartbeat (EA chama periodicamente)
// ==========================
router.post("/heartbeat", async (req, res) => {
  try {
    const { email, magic, session_id } = req.body;

    if (!email || !magic || !session_id) {
      return res.status(400).json({ ativo: false });
    }

    // Buscar usuário
    const userResult = await pool.query(
      "SELECT id, status_assinatura FROM usuarios WHERE email = $1",
      [email]
    );

    if (userResult.rows.length === 0 || !userResult.rows[0].status_assinatura) {
      return res.json({ ativo: false, mensagem: "Assinatura inativa" });
    }

    const usuario = userResult.rows[0];

    // Atualizar última atividade
    const updateResult = await pool.query(
      `UPDATE licencas 
       SET ultima_atividade = NOW() 
       WHERE usuario_id = $1 AND magic = $2 AND session_token = $3
       RETURNING id`,
      [usuario.id, parseInt(magic, 10), session_id]
    );

    if (updateResult.rows.length === 0) {
      return res.json({ ativo: false, mensagem: "Sessão não encontrada" });
    }

    return res.json({ ativo: true });

  } catch (err) {
    console.error("❌ Erro no heartbeat:", err);
    return res.json({ ativo: false });
  }
});

// ==========================
// 🔹 Desativar Licença (EA chama ao fechar)
// ==========================
router.post("/desativar", async (req, res) => {
  try {
    const { email, magic, session_id } = req.body;

    if (!email || !magic || !session_id) {
      return res.status(400).json({ sucesso: false });
    }

    // Buscar usuário
    const userResult = await pool.query(
      "SELECT id FROM usuarios WHERE email = $1",
      [email]
    );

    if (userResult.rows.length === 0) {
      return res.status(404).json({ sucesso: false });
    }

    const usuario = userResult.rows[0];

    // Limpar session_token
    await pool.query(
      `UPDATE licencas 
       SET session_token = NULL 
       WHERE usuario_id = $1 AND magic = $2 AND session_token = $3`,
      [usuario.id, parseInt(magic, 10), session_id]
    );

    console.log(`🔓 Licença liberada: ${email} | Magic ${magic}`);

    return res.json({ sucesso: true });

  } catch (err) {
    console.error("❌ Erro ao desativar licença:", err);
    return res.json({ sucesso: false });
  }
});

// ==========================
// 🔹 Listar EAs ativos do usuário (para admin/debug)
// ==========================
router.get("/ativas/:email", async (req, res) => {
  try {
    const { email } = req.params;

    const result = await pool.query(
      `SELECT l.magic, l.session_token, l.criado_em, l.ultima_atividade,
              e.estrategia, e.ativo
       FROM licencas l
       JOIN usuarios u ON l.usuario_id = u.id
       LEFT JOIN estatistica e ON l.magic = e.magic
       WHERE u.email = $1 AND l.session_token IS NOT NULL
       ORDER BY l.ultima_atividade DESC`,
      [email]
    );

    return res.json(result.rows);

  } catch (err) {
    console.error("❌ Erro ao listar licenças ativas:", err);
    return res.status(500).json({ erro: "Erro ao listar licenças" });
  }
});

export default router;
