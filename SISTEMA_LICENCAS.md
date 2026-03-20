# 🎯 Sistema de Licenciamento - Resumo

## ✅ Implementado

Sistema completo de validação de licenças para EAs com as seguintes regras:

### 📋 Regras de Negócio

1. **Downloads e Favoritos:** SEM LIMITE
   - Usuários podem baixar quantos EAs quiserem
   - Podem favoritar quantos algoritmos quiserem
   
2. **Execução no MetaTrader:** LIMITADO POR PLANO
   - **Starter:** 4 EAs ativos simultaneamente
   - **Plus:** 8 EAs ativos simultaneamente  
   - **Premium:** EAs ilimitados
   - **Diamond:** EAs ilimitados + VIP

3. **Gerenciamento de Mesa:** NÃO CONTA NO LIMITE
   - EAs de gerenciamento podem rodar ilimitados
   - Basta ter assinatura ativa

---

## 🔧 Arquivos Criados/Modificados

### Novos Arquivos:
- ✅ `backend/routes/licencas.js` - Rotas de validação de licenças
- ✅ `API_LICENCAS.md` - Documentação completa da API
- ✅ `database_licencas.sql` - Script de criação da tabela
- ✅ `SISTEMA_LICENCAS.md` - Este arquivo

### Arquivos Modificados:
- ✅ `backend/server.js` - Registrado novo router de licenças
- ✅ `frontend/views/planos.ejs` - Atualizado textos dos limites + seção explicativa
- ✅ `backend/routes/zoutiWebhook.js` - Removido typo "peament"

---

## 🚀 Como Funciona

### 1️⃣ EA Inicia (OnInit)
```
EA → POST /api/licenca/validar
    ↓
Servidor verifica:
- Assinatura ativa?
- Limite do plano?
- Já está no limite?
    ↓
Resposta: autorizado = true/false
```

### 2️⃣ EA Rodando (OnTimer - a cada 5 min)
```
EA → POST /api/licenca/heartbeat
    ↓
Servidor atualiza: ultima_atividade
    ↓
Resposta: ativo = true/false
```

### 3️⃣ EA Fecha (OnDeinit)
```
EA → POST /api/licenca/desativar
    ↓
Servidor limpa: session_token = NULL
    ↓
Licença liberada para outro uso
```

---

## 📊 Estrutura de Dados

### Tabela `licencas`
```
id | usuario_id | magic | session_token | criado_em | ultima_atividade
---|------------|-------|---------------|-----------|------------------
1  | 42         | 12345 | abc123...     | 2026-...  | 2026-...
2  | 42         | 67890 | NULL          | 2026-...  | 2026-...
```

- `session_token = NULL` → EA inativo (não conta no limite)
- `session_token != NULL` → EA ativo (conta no limite)

---

## 🎨 Interface Atualizada

### Página de Planos:
- ✅ Textos atualizados: "4 EAs ativos", "8 EAs ativos", "EAs ilimitados"
- ✅ Seção explicativa sobre como funciona o sistema
- ✅ Destaque que gerenciamento de mesa não conta

---

## 🔐 Magic Numbers Especiais

Adicionar em `backend/routes/licencas.js`:

```javascript
const MAGICS_GERENCIAMENTO_MESA = [
  1,  // 000001 - Gerenciamento Mesa
  2   // 000002 - Gerenciamento Notícia
];
```

✅ **Atualizado com os magic numbers corretos!**

---

## ✅ Checklist de Deploy

- [ ] Executar `database_licencas.sql` no banco de produção
- [ ] Atualizar magic numbers de gerenciamento em `licencas.js`
- [ ] Testar validação com usuário Starter (limite 4)
- [ ] Testar validação com usuário Plus (limite 8)
- [ ] Testar que gerenciamento de mesa não conta
- [ ] Implementar lógica no EA para chamar as APIs
- [ ] Configurar limpeza automática de licenças inativas (cron job)

---

## 📞 Próximos Passos

1. **No EA (MQL5):**
   - Implementar chamadas HTTP para as 3 rotas
   - Gerar session_id único por terminal
   - Timer para heartbeat a cada 5 minutos
   
2. **No Backend:**
   - Job de limpeza de licenças sem heartbeat há +30min
   - Logs detalhados de tentativas de uso
   
3. **Monitoramento:**
   - Dashboard admin com EAs ativos por usuário
   - Alertas de tentativas de exceder limite

---

**Data de Criação:** 20 de março de 2026
**Status:** ✅ Pronto para integração com EAs
