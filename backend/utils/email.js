// backend/utils/email.js
import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY);

/**
 * 📩 Envia email de boas-vindas com link para criação de senha
 */
export async function enviarEmailBoasVindas({ nome, email, link }) {
  try {
    const html = `
      <div style="font-family: Arial, sans-serif; color: #222; background: #f9f9f9; padding: 30px;">
        <div style="max-width: 600px; margin: auto; background: #fff; border-radius: 12px; overflow: hidden; box-shadow: 0 2px 10px rgba(0,0,0,0.1);">
          <div style="background: linear-gradient(90deg, #1e3a8a, #3b82f6); color: white; padding: 20px 30px;">
            <h1 style="margin: 0;">Bem-vindo ao Clube Quant 🚀</h1>
          </div>
          <div style="padding: 30px;">
            <p>Olá <strong>${nome}</strong>,</p>
            <p>Seja bem-vindo(a)! Sua assinatura foi confirmada com sucesso. 🎉</p>
            <p>Para começar a usar o <strong>Clube Quant</strong>, crie sua senha clicando no botão abaixo:</p>
            <p style="text-align: center; margin: 30px 0;">
              <a href="${link}" style="background: #3b82f6; color: white; padding: 14px 30px; border-radius: 8px; text-decoration: none; font-weight: bold;">
                🔐 Criar minha senha
              </a>
            </p>
            <p>Este link é válido por <strong>24 horas</strong>.</p>
            <p>Nos vemos do outro lado,<br><strong>Equipe Clube Quant</strong></p>
          </div>
          <div style="background: #f3f4f6; color: #555; padding: 15px 30px; font-size: 13px;">
            Este email foi enviado automaticamente — não responda.<br>
            Caso não tenha feito esta assinatura, ignore esta mensagem.
          </div>
        </div>
      </div>
    `;

    await resend.emails.send({
      from: "Clube Quant <no-reply@clubequant.com.br>",
      to: email,
      subject: "🎉 Bem-vindo ao Clube Quant — Crie sua senha",
      html,
    });

    console.log(`📩 Email de boas-vindas enviado para ${email}`);
  } catch (err) {
    console.error("❌ Erro ao enviar email de boas-vindas:", err);
  }
}

/**
 * 🔑 Envia email de recuperação de senha
 */
export async function enviarEmailRecuperacao({ email, link }) {
  try {
    const html = `
      <div style="font-family:Arial,Helvetica,sans-serif;background-color:#0f172a;padding:40px;color:#f8fafc;text-align:center;border-radius:12px;max-width:480px;margin:auto;">
        <img src="https://app.clubequant.com.br/img/logo_clube_quant2.webp" alt="Clube Quant" style="width:160px;margin-bottom:24px;">
        <h2 style="color:#60a5fa;margin-bottom:12px;">Recuperação de Senha</h2>
        <p style="color:#e2e8f0;margin-bottom:30px;">Você solicitou redefinir sua senha. Clique no botão abaixo para continuar:</p>
        <a href="${link}" style="display:inline-block;background-color:#3b82f6;color:#fff;text-decoration:none;font-weight:bold;padding:12px 20px;border-radius:8px;">🔑 Redefinir minha senha</a>
        <p style="color:#94a3b8;margin-top:30px;font-size:13px;">Se você não fez esta solicitação, ignore este e-mail.<br>O link expira em 1 hora.</p>
      </div>
    `;

    await resend.emails.send({
      from: "Clube Quant <no-reply@clubequant.com.br>",
      to: email,
      subject: "🔐 Recuperação de Senha - Clube Quant",
      html,
    });

    console.log(`📤 Email de recuperação enviado para ${email}`);
  } catch (err) {
    console.error("❌ Erro ao enviar email de recuperação:", err);
  }
}
