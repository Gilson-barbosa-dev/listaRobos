// Script para ativar manualmente o status de assinatura de um usuário
import pool from "./db.js";

const EMAIL_USUARIO = process.argv[2];
const ATIVAR = process.argv[3] === "true" || process.argv[3] === "1";

if (!EMAIL_USUARIO) {
  console.log("\n❌ Uso: node ativar-assinatura.js <email> [true|false]");
  console.log("   Exemplo: node ativar-assinatura.js usuario@exemplo.com true\n");
  process.exit(1);
}

async function ativarAssinatura() {
  try {
    console.log("\n🔧 ATIVAR/DESATIVAR ASSINATURA");
    console.log("=" .repeat(60));

    // Verificar se usuário existe
    const userResult = await pool.query(
      "SELECT id, nome, email, plano, status_assinatura FROM usuarios WHERE email = $1",
      [EMAIL_USUARIO]
    );

    if (userResult.rows.length === 0) {
      console.log(`❌ Usuário ${EMAIL_USUARIO} não encontrado!\n`);
      process.exit(1);
    }

    const usuario = userResult.rows[0];
    console.log(`📧 Email: ${usuario.email}`);
    console.log(`👤 Nome: ${usuario.nome}`);
    console.log(`📦 Plano: ${usuario.plano}`);
    console.log(`📊 Status ATUAL: ${usuario.status_assinatura ? '✅ ATIVO' : '❌ INATIVO'}`);

    // Se não foi passado true/false, apenas mostrar status
    if (process.argv.length < 4) {
      console.log("\n💡 Para alterar, use:");
      console.log(`   node ativar-assinatura.js ${EMAIL_USUARIO} true   (ativar)`);
      console.log(`   node ativar-assinatura.js ${EMAIL_USUARIO} false  (desativar)\n`);
      process.exit(0);
    }

    // Atualizar status
    console.log(`\n🔄 Alterando para: ${ATIVAR ? '✅ ATIVO' : '❌ INATIVO'}...`);
    
    await pool.query(
      "UPDATE usuarios SET status_assinatura = $1 WHERE id = $2",
      [ATIVAR, usuario.id]
    );

    console.log(`✅ Status atualizado com sucesso!`);
    
    // Se estiver desativando, limpar todas as licenças ativas
    if (!ATIVAR) {
      console.log(`\n🧹 Limpando licenças ativas...`);
      const result = await pool.query(
        "UPDATE licencas SET session_token = NULL WHERE usuario_id = $1 AND session_token IS NOT NULL",
        [usuario.id]
      );
      console.log(`✅ ${result.rowCount} licença(s) desativada(s)`);
    }

    console.log("\n" + "=".repeat(60) + "\n");

  } catch (err) {
    console.error("❌ Erro:", err);
  } finally {
    await pool.end();
  }
}

ativarAssinatura();
