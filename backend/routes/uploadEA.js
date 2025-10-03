import express from "express";
import multer from "multer";
import { PutObjectCommand } from "@aws-sdk/client-s3";
import pool from "../db.js";
import s3 from "../r2.js";

const router = express.Router();
const upload = multer({ storage: multer.memoryStorage() });

// Upload EA + salvar no banco
router.post("/api/eas/upload", upload.single("file"), async (req, res) => {
  try {
    const { magic } = req.body;
    const file = req.file;

    if (!magic || !file) {
      return res.status(400).json({ erro: "Magic e arquivo são obrigatórios" });
    }

    const key = `eas/${file.originalname}`;

    // Upload para R2
    await s3.send(new PutObjectCommand({
      Bucket: process.env.R2_BUCKET,
      Key: key,
      Body: file.buffer,
    }));

    // Registrar no banco
    await pool.query(
      `INSERT INTO arquivos_ea (magic, nome_arquivo)
       VALUES ($1, $2)
       ON CONFLICT (magic) DO UPDATE SET nome_arquivo = $2`,
      [magic, file.originalname]
    );

    res.json({ sucesso: true, message: "EA cadastrado com sucesso" });
  } catch (err) {
    console.error("Erro upload EA:", err);
    res.status(500).json({ erro: "Falha ao cadastrar EA" });
  }
});

export default router;
