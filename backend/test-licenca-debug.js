// Script de diagnóstico para verificar status de licenças
import pool from "./db.js";

const EMAIL_USUARIO = process.argv[2] || "usuario@exemplo.com"; // Passa como argumento

async function diagnosticar() {
  try {
    console.log("\n🔍 DIAGNÓSTICO DE LICENÇA");
    console.log("=" .repeat(60));
    console.log(`📧 Email: ${EMAIL_USUARIO}\n`);

    // 1️⃣ Verificar dados do usuário
    console.log("1️⃣ DADOS DO USUÁRIO:");
    const userResult = await pool.query(
      `SELECT id, nome, email, plano, status_assinatura, proxima_cobranca, criado_em
       FROM usuarios WHERE email = $1`,
      [EMAIL_USUARIO]
    );

    if (userResult.rows.length === 0) {
      console.log("   ❌ Usuário NÃO encontrado!");
      process.exit(1);
    }

    const usuario = userResult.rows[0];
    console.log(`   ID: ${usuario.id}`);
    console.log(`   Nome: ${usuario.nome}`);
    console.log(`   Plano: ${usuario.plano}`);
    console.log(`   Status Assinatura: ${usuario.status_assinatura ? '✅ ATIVO' : '❌ INATIVO'}`);
    console.log(`   Próxima Cobrança: ${usuario.proxima_cobranca || 'N/A'}`);
    console.log(`   Criado em: ${usuario.criado_em}`);

    // 2️⃣ Verificar licenças
    console.log("\n2️⃣ LICENÇAS REGISTRADAS:");
    const licencasResult = await pool.query(
      `SELECT id, magic, session_token, criado_em, ultima_atividade
       FROM licencas WHERE usuario_id = $1
       ORDER BY ultima_atividade DESC NULLS LAST`,
      [usuario.id]
    );

    if (licencasResult.rows.length === 0) {
      console.log("   ℹ️  Nenhuma licença registrada");
    } else {
      licencasResult.rows.forEach((lic, idx) => {
        console.log(`\n   Licença ${idx + 1}:`);
        console.log(`      ID: ${lic.id}`);
        console.log(`      Magic: ${lic.magic}`);
        console.log(`      Session Token: ${lic.session_token ? lic.session_token.substring(0, 20) + '...' : '❌ NULL (inativo)'}`);
        console.log(`      Criado em: ${lic.criado_em}`);
        console.log(`      Última atividade: ${lic.ultima_atividade || 'N/A'}`);
      });
    }

    // 3️⃣ Contar EAs ativos
    console.log("\n3️⃣ ESTATÍSTICAS:");
    const countResult = await pool.query(
      `SELECT COUNT(*) as total
       FROM licencas
       WHERE usuario_id = $1 AND session_token IS NOT NULL`,
      [usuario.id]
    );

    console.log(`   Total de licenças: ${licencasResult.rows.length}`);
    console.log(`   EAs ativos (com session_token): ${countResult.rows[0].total}`);
    
    // 4️⃣ Verificar limites
    const LIMITES = {
      Starter: 4,
      Plus: 8,
      Premium: "Ilimitado",
      Diamond: "Ilimitado"
    };
    
    const limite = LIMITES[usuario.plano] || 0;
    console.log(`   Limite do plano ${usuario.plano}: ${limite}`);

    // 5️⃣ Diagnóstico final
    console.log("\n4️⃣ DIAGNÓSTICO:");
    if (!usuario.status_assinatura) {
      console.log("   ⚠️  PROBLEMA: Status de assinatura está INATIVO");
      console.log("   💡 Solução: Ativar manualmente ou renovar assinatura");
    } else if (parseInt(countResult.rows[0].total) >= limite && limite !== "Ilimitado") {
      console.log("   ⚠️  PROBLEMA: Limite de EAs atingido");
      console.log(`   💡 Solução: Fazer upgrade ou desativar EAs não utilizados`);
    } else {
      console.log("   ✅ Tudo OK! Usuário pode ativar novos EAs");
    }

    console.log("\n" + "=".repeat(60) + "\n");

  } catch (err) {
    console.error("❌ Erro:", err);
  } finally {
    await pool.end();
  }
}

diagnosticar();
