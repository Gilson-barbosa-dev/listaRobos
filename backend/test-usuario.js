// Script de teste para verificar usuário dicainvest@gmail.com
import pool from "./db.js";

async function testarUsuario() {
  try {
    const result = await pool.query(
      "SELECT id, email, plano, status_assinatura, proxima_cobranca FROM usuarios WHERE email = $1",
      ["dicainvest@gmail.com"]
    );

    if (result.rows.length === 0) {
      console.log("❌ Usuário não encontrado!");
      return;
    }

    const user = result.rows[0];
    console.log("📊 Dados do usuário:");
    console.log("   Email:", user.email);
    console.log("   Plano:", user.plano);
    console.log("   Status Assinatura:", user.status_assinatura);
    console.log("   Próxima Cobrança:", user.proxima_cobranca);

    // Verificar licenças ativas
    const licencas = await pool.query(
      `SELECT magic, session_token, criado_em, ultima_atividade 
       FROM licencas 
       WHERE usuario_id = $1`,
      [user.id]
    );

    console.log("\n🔑 Licenças cadastradas:");
    if (licencas.rows.length === 0) {
      console.log("   Nenhuma licença encontrada");
    } else {
      licencas.rows.forEach(lic => {
        console.log(`   Magic ${lic.magic}:`);
        console.log(`     - Session: ${lic.session_token || "INATIVO"}`);
        console.log(`     - Última atividade: ${lic.ultima_atividade}`);
      });
    }

    // Contar EAs ativos (excluindo gerenciamento)
    const count = await pool.query(
      `SELECT COUNT(*) as total
       FROM licencas
       WHERE usuario_id = $1 
         AND session_token IS NOT NULL
         AND magic NOT IN (1, 2)`,
      [user.id]
    );

    console.log(`\n📈 EAs ativos (exceto gerenciamento): ${count.rows[0].total}`);
    console.log(`   Limite do plano ${user.plano}: ${user.plano === 'Starter' ? '4' : user.plano === 'Plus' ? '8' : 'Ilimitado'}`);

  } catch (err) {
    console.error("❌ Erro:", err);
  } finally {
    process.exit();
  }
}

testarUsuario();
