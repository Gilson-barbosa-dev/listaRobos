// backend/routes/arquivos.js
import express from "express";
import pool from "../db.js";
import s3 from "../r2.js"; // SDK configurado para o R2
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { GetObjectCommand } from "@aws-sdk/client-s3";

const router = express.Router();
const BUCKET = process.env.R2_BUCKET;

// ==========================
// 🔹 Rota para download de EA por magic
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
      return res.status(404).json({ erro: "Arquivo não encontrado no banco" });
    }

    const { nome_arquivo, ativo } = result.rows[0];

    // 🔹 Normalizar a pasta (ativo) para evitar erro de case/espacos
    const pasta = String(ativo).trim().toUpperCase();

    // 🔹 Montar a chave correta (pasta/arquivo)
    const key = `${pasta}/${nome_arquivo}`;

    console.log("📂 Gerando link assinado para:", key);

    // Gerar link assinado para download no R2
    const command = new GetObjectCommand({
      Bucket: BUCKET,
      Key: key,
    });

    const url = await getSignedUrl(s3, command, { expiresIn: 60 }); // válido por 60s

    return res.json({ url });
  } catch (err) {
    console.error("❌ Erro ao gerar link de download:", err);
    res.status(500).json({ erro: "Erro ao gerar link de download" });
  }
});

export default router;
