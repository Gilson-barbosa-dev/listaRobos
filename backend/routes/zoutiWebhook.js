import express from "express";
import pool from "../db.js";
import crypto from "crypto";
import { enviarEmailBoasVindas } from "../utils/email.js";

const router = express.Router();

// Função auxiliar para próxima cobrança (28 dias)
function calcularProximaCobranca(dias = 28) {
  return new Date(Date.now() + dias * 24 * 60 * 60 * 1000);
}

// 🔹 Mapeamento dos planos Zouti por offer_id (compatibilidade)
const planosZouti = {
  prod_offer_rw4arkjywwtvst66qb6f35: "Starter",
  prod_offer_u86x1k92h6v8gu8nenhc5k: "Plus",
  prod_offer_ad7lhtpltf4l7lecmuiccx: "Premium",
};

// 🔹 Mapeamento por product_id + valor (em centavos)
const planosPorValor = {
  "prod_v8tg0qam1wg42dqg466m4y_9700": "Starter",
  "prod_v8tg0qam1wg42dqg466m4y_19700": "Plus",
  "prod_v8tg0qam1wg42dqg466m4y_29700": "Premium",
};

// 🔹 Webhook principal
router.post("/webhook/zouti", async (req, res) => {
  try {
    const body = req.body;
    const status = body.status;
    const email = body.customer?.email;
    const nome = body.customer?.name || "Usuário";
    const telefone = body.customer?.phone || null;
    
    // Extrair offer_id, product_id e valor
    const lineItem = body.line_items?.[0] || {};
    const offerId = lineItem.plan_id || lineItem.product_offer_id || lineItem.offer_id || body.plan?.id || null;
    const productId = lineItem.product_id || "prod_v8tg0qam1wg42dqg466m4y";
    const amount = lineItem.amount || 0;

    // Log para debug
    console.log("📦 Webhook recebido:", {
      status,
      email,
      offerId,
      productId,
      amount,
      line_items: body.line_items
    });

    if (!email) {
      console.log("❌ Webhook inválido — sem email:", body);
      return res.status(400).json({ erro: "Email não informado" });
    }

    // Mapear plano pela offer_id (primeiro método)
    let plano = planosZouti[offerId];
    
    // Se não encontrou, tentar pelo product_id + valor
    if (!plano && amount > 0) {
      const chave = `${productId}_${amount}`;
      plano = planosPorValor[chave];
      console.log(`🔍 Buscando plano por product_id + valor: ${chave} → ${plano || "não encontrado"}`);
    }

    if (!plano) {
      console.log("⚠️ Plano não reconhecido:", {
        offerId,
        productId,
        amount,
        ofertas_conhecidas: Object.keys(planosZouti),
        valores_conhecidos: Object.keys(planosPorValor)
      });
      return res.status(200).json({ ok: true });
    }

    // Busca usuário existente (um plano por e-mail)
    const result = await pool.query("SELECT * FROM usuarios WHERE email = $1", [email]);
    const usuario = result.rows[0];

    // ✅ Caso ACTIVE
    if (status === "ACTIVE") {
      const agora = new Date();
      const proximaCobranca = calcularProximaCobranca(28);

      // 🟢 1. NOVO USUÁRIO
      if (!usuario) {
        const token = crypto.randomBytes(32).toString("hex");
        const expira = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24h

        await pool.query(
          `INSERT INTO usuarios
            (nome, email, telefone, role, criado_em, data_pagamento, status_assinatura, product_id, plano, proxima_cobranca, reset_token, reset_expira)
           VALUES ($1,$2,$3,'user',$4,$5,true,$6,$7,$8,$9,$10)`,
          [
            nome,
            email,
            telefone,
            agora,
            agora,
            offerId,
            plano,
            proximaCobranca,
            token,
            expira,
          ]
        );

        console.log(`✅ Novo usuário criado (${plano}): ${email}`);
        const link = `${process.env.BASE_URL}/criar-senha/${token}`;
        await enviarEmailBoasVindas({ nome, email, link });
        return res.json({ ok: true });
      }

      // 🟠 2. USUÁRIO EXISTENTE — verificar se é renovação ou mudança de plano
      const planoAtual = usuario.plano;
      const proxima = usuario.proxima_cobranca ? new Date(usuario.proxima_cobranca) : null;
      const mudouPlano = planoAtual !== plano;
      const podeRenovar = proxima && agora >= proxima;

      // ❌ Bloquear ACTIVE inválido
      if (!mudouPlano && !podeRenovar) {
        console.log(
          `🚫 Ignorado ACTIVE inválido: ${email} | Plano atual: ${planoAtual} | Próx. cobrança: ${usuario.proxima_cobranca}`
        );
        return res.status(200).json({ ignorado: true });
      }

      // 🟢 Renovação ou upgrade/downgrade autorizado
      await pool.query(
        `UPDATE usuarios
         SET status_assinatura = true,
             data_pagamento = $1,
             proxima_cobranca = $2,
             plano = $3,
             product_id = $4
         WHERE id = $5`,
        [agora, proximaCobranca, plano, offerId, usuario.id]
      );

      const tipo = mudouPlano ? "mudança de plano" : "renovação";
      console.log(`🔄 Usuário ${email} atualizado (${tipo} para ${plano})`);
      return res.json({ ok: true });
    }

    // ❌ Caso CANCELED — sempre permitido
    if (status === "CANCELED" && usuario) {
      await pool.query(
        "UPDATE usuarios SET status_assinatura = false WHERE id = $1",
        [usuario.id]
      );
      console.log(`🚫 Usuário cancelado: ${email} (Plano ${usuario.plano})`);
      return res.json({ ok: true });
    }

    return res.json({ ignorado: true });
  } catch (err) {
    console.error("❌ Erro no webhook Zouti:", err);
    return res.status(500).json({ erro: "Erro interno no webhook" });
  }
});

export default router;
