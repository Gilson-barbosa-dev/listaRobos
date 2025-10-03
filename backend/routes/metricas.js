// backend/routes/metricas.js
import express from "express";
import pool from "../db.js";
import s3 from "../r2.js"; // SDK configurado para o R2
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { GetObjectCommand } from "@aws-sdk/client-s3";

const router = express.Router();
const BUCKET = process.env.R2_BUCKET;

// ==========================
// 🔹 Rota para imagem de Métricas por Magic
// ==========================
router.get("/:magic", async (req, res) => {
  try {
    const { magic } = req.params;
    const magicInt = parseInt(magic, 10);

    if (isNaN(magicInt)) {
      return res.status(400).json({ erro: "Magic inválido" });
    }

    // Buscar nome_arquivo e ativo no banco
    const result = await pool.query(
      "SELECT nome_arquivo, ativo FROM arquivos_ea WHERE magic = $1",
      [magicInt]
    );

    if (!result.rows.length) {
      return res.status(404).json({ erro: "Arquivo de métrica não encontrado no banco" });
    }

    const { nome_arquivo, ativo } = result.rows[0];

    // 🔹 Pasta do ativo (normalizada)
    const pasta = String(ativo).trim().toUpperCase();

    // 🔹 Converter .ex5 -> .png
    const nomeMetricas = nome_arquivo.replace(".ex5", ".png");

    // 🔹 Caminho final no bucket (ex: METRICAS/XAUUSD/Strategy 1.17.127 - XAUUSD - H1 - 4001.png)
    const key = `METRICAS/${pasta}/${nomeMetricas}`;

    console.log("📊 Gerando link métrica para:", key);

    // Gerar link assinado (válido 60s)
    const command = new GetObjectCommand({
      Bucket: BUCKET,
      Key: key,
    });

    const url = await getSignedUrl(s3, command, { expiresIn: 60 });

    return res.json({ url });
  } catch (err) {
    console.error("❌ Erro ao gerar link da métrica:", err);
    res.status(500).json({ erro: "Erro ao gerar link da métrica" });
  }
});

export default router;
