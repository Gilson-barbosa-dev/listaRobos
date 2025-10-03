import express from "express";
import { GetObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import pool from "../db.js";
import s3 from "../r2.js";

const router = express.Router();

router.get("/api/eas/download/:magic", async (req, res) => {
  try {
    const { magic } = req.params;

    // Buscar nome do arquivo no banco
    const result = await pool.query(
      "SELECT nome_arquivo FROM arquivos_ea WHERE magic = $1",
      [magic]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ erro: "EA não encontrado" });
    }

    const objectKey = `eas/${result.rows[0].nome_arquivo}`;

    // Criar link temporário
    const command = new GetObjectCommand({
      Bucket: process.env.R2_BUCKET,
      Key: objectKey,
    });
    const url = await getSignedUrl(s3, command, { expiresIn: 60 });

    res.json({ url });
  } catch (err) {
    console.error("Erro download EA:", err);
    res.status(500).json({ erro: "Falha ao gerar link de download" });
  }
});

export default router;
