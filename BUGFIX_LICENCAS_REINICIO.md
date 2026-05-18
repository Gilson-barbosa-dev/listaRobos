# 🐛 BugFix: Licenças bloqueadas após reinício do MetaTrader

## ❌ Problema Identificado

Quando o usuário **reiniciava o MetaTrader** ou **removia e adicionava o robô novamente**, o sistema **bloqueava o acesso** dizendo que o limite foi atingido, mesmo o usuário estando dentro do período válido e não tendo excedido o número de EAs permitidos no plano.

## 🔍 Causa Raiz

### Fluxo do Problema:

1. **Usuário adiciona EA pela primeira vez:**
   - EA gera `session_id_1` (baseado no terminal/gráfico)
   - Chama `/api/licenca/validar` com `magic=12345` e `session_id_1`
   - Sistema cria registro: `{usuario_id, magic=12345, session_token=session_id_1}`

2. **Usuário reinicia MetaTrader ou remove/adiciona EA:**
   - **Novo `session_id_2` é gerado** (porque é uma nova sessão)
   - EA chama `/api/licenca/validar` com `magic=12345` e `session_id_2`

3. **Código antigo fazia:**
   ```javascript
   // Busca licença existente
   const licenca = buscarLicenca(usuario_id, magic=12345);
   
   // Se session_token != session_id_2, não faz nada
   if (licenca.session_token === sessionId) {
     renovar(); // ❌ Nunca entra aqui porque session_id mudou!
   }
   
   // Continua e conta quantos EAs estão ativos
   const easAtivos = contarComSessionToken(); // ❌ Conta o EA com session_id_1
   
   // Tenta criar/validar como se fosse um EA NOVO
   if (easAtivos >= limite) {
     return "BLOQUEADO"; // ❌ Bloqueia indevidamente!
   }
   ```

4. **Resultado:** Sistema contava o EA com `session_id_1` como ativo e tentava adicionar outro com `session_id_2`, atingindo o limite artificialmente.

## ✅ Solução Implementada

### Nova Lógica em `/api/licenca/validar`:

```javascript
// 1️⃣ Buscar se já existe licença para este magic number
const licenca = buscarLicenca(usuario_id, magic);

if (licenca) {
  // 2️⃣ Se é o MESMO session_id, apenas renovar timestamp
  if (licenca.session_token === sessionId) {
    renovarTimestamp();
    return { autorizado: true };
  }
  
  // 3️⃣ Se é session_id DIFERENTE → EA foi reiniciado/reaberto
  //    ATUALIZAR o session_token (não é EA adicional, é o MESMO!)
  atualizarSessionToken(sessionId);
  return { autorizado: true, mensagem: "Licença reativada" };
}

// 4️⃣ Se NÃO existe licença → Verificar limite e criar novo registro
if (easAtivos >= limite) {
  return { autorizado: false };
}
criarNovaLicenca(usuario_id, magic, sessionId);
```

### Mudanças no Código:

**Antes:**
- ✅ Renovava se `session_token` fosse idêntico
- ❌ **Ignorava** quando `session_token` era diferente
- ❌ Contava como EA adicional

**Depois:**
- ✅ Renova se `session_token` for idêntico
- ✅ **Atualiza** quando `session_token` for diferente (reinício)
- ✅ Reconhece como o mesmo EA, não conta como adicional

## 🧪 Casos de Teste

### Cenário 1: EA rodando normalmente
- **Ação:** EA chama `/validar` a cada 5 minutos
- **Esperado:** Renova timestamp, retorna `autorizado: true`
- **Status:** ✅ Funcionava antes, continua funcionando

### Cenário 2: Usuário reinicia MetaTrader
- **Ação:** Novo `session_id` gerado, chama `/validar`
- **Antes:** ❌ Bloqueava dizendo "limite atingido"
- **Depois:** ✅ Atualiza session_token, retorna `autorizado: true`

### Cenário 3: Usuário remove e adiciona EA no mesmo gráfico
- **Ação:** Novo `session_id` gerado, chama `/validar`
- **Antes:** ❌ Bloqueava dizendo "limite atingido"
- **Depois:** ✅ Atualiza session_token, retorna `autorizado: true`

### Cenário 4: Usuário tenta adicionar EA diferente além do limite
- **Ação:** Novo `magic` number, chama `/validar`
- **Esperado:** Bloqueia se limite atingido
- **Status:** ✅ Funcionava antes, continua funcionando

### Cenário 5: EAs de Gerenciamento de Mesa
- **Ação:** `magic=1` ou `magic=2` (gerenciamento)
- **Esperado:** Não conta no limite, sempre autoriza
- **Status:** ✅ Funcionava antes, continua funcionando

## 📊 Impacto

### Benefícios:
- ✅ Usuários podem reiniciar MetaTrader sem perder acesso
- ✅ Remover/adicionar EA não conta como uso adicional
- ✅ Mesma lógica de limite continua funcionando
- ✅ Gerenciamento de mesa continua ilimitado

### Sem Efeitos Colaterais:
- ✅ Não afeta contagem de limite
- ✅ Não afeta validação de assinatura
- ✅ Não afeta EAs de gerenciamento
- ✅ Não afeta heartbeat ou desativação

## 🚀 Deploy

### Passos:
1. ✅ Código atualizado em `backend/routes/licencas.js`
2. ⏳ Reiniciar servidor Node.js
3. ⏳ Testar com usuário real

### Comandos:
```bash
# No servidor
pm2 restart clubequant-backend
# ou
npm restart
```

## 📝 Logs para Monitorar

Após deploy, verificar logs:

```
✅ Licença autorizada: user@email.com | Magic 12345 | Plano Starter | Ativos: 1/4
🔄 Licença atualizada (reinício): user@email.com | Magic 12345 | Plano Starter
```

O log `🔄 Licença atualizada (reinício)` indica que o fix está funcionando corretamente.

---

**Data do Fix:** 18 de maio de 2026  
**Arquivo Modificado:** `backend/routes/licencas.js`  
**Linhas Alteradas:** 73-115  
**Status:** ✅ Pronto para deploy
