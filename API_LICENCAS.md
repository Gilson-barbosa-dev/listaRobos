# 📘 API de Licenciamento - Clube Quant

## Visão Geral

Sistema de validação de licenças para Expert Advisors (EAs) do MetaTrader. Controla quantos EAs podem rodar simultaneamente baseado no plano do usuário.

---

## 🔐 Endpoints

### 1. Validar Licença (Ativar EA)

**Endpoint:** `POST /api/licenca/validar`

**Uso:** O EA chama esta rota quando é anexado ao gráfico no MetaTrader para verificar se pode rodar.

**Body (JSON):**
```json
{
  "email": "usuario@exemplo.com",
  "magic": 123456,
  "session_id": "unique-session-identifier-12345"
}
```

**Parâmetros:**
- `email` (string): Email do usuário cadastrado
- `magic` (int): Magic number do EA
- `session_id` (string): Identificador único da sessão/terminal do MT5

**Resposta de Sucesso (200):**
```json
{
  "autorizado": true,
  "mensagem": "Licença autorizada com sucesso",
  "plano": "Starter",
  "limite": 4,
  "em_uso": 2
}
```

**Respostas de Erro:**

**403 - Limite Atingido:**
```json
{
  "autorizado": false,
  "mensagem": "Limite de 4 EAs atingido no plano Starter. Faça upgrade ou libere um EA em uso.",
  "limite": 4,
  "em_uso": 4
}
```

**403 - Assinatura Inativa:**
```json
{
  "autorizado": false,
  "mensagem": "Assinatura inativa. Renove seu plano em https://clubequant.com/planos"
}
```

**404 - Usuário Não Encontrado:**
```json
{
  "autorizado": false,
  "mensagem": "Usuário não encontrado"
}
```

---

### 2. Heartbeat (Manter Licença Ativa)

**Endpoint:** `POST /api/licenca/heartbeat`

**Uso:** O EA deve chamar esta rota a cada 5-10 minutos para renovar a licença e confirmar que ainda está rodando.

**Body (JSON):**
```json
{
  "email": "usuario@exemplo.com",
  "magic": 123456,
  "session_id": "unique-session-identifier-12345"
}
```

**Resposta de Sucesso (200):**
```json
{
  "ativo": true
}
```

**Resposta quando sessão inválida:**
```json
{
  "ativo": false,
  "mensagem": "Assinatura inativa"
}
```

---

### 3. Desativar Licença (Fechar EA)

**Endpoint:** `POST /api/licenca/desativar`

**Uso:** O EA deve chamar esta rota quando for removido do gráfico ou encerrado.

**Body (JSON):**
```json
{
  "email": "usuario@exemplo.com",
  "magic": 123456,
  "session_id": "unique-session-identifier-12345"
}
```

**Resposta de Sucesso (200):**
```json
{
  "sucesso": true
}
```

---

### 4. Listar EAs Ativos (Debug/Admin)

**Endpoint:** `GET /api/licenca/ativas/:email`

**Uso:** Listar todos os EAs atualmente ativos de um usuário.

**Exemplo:** `GET /api/licenca/ativas/usuario@exemplo.com`

**Resposta de Sucesso (200):**
```json
[
  {
    "magic": 123456,
    "session_token": "unique-session-identifier-12345",
    "criado_em": "2026-03-20T10:00:00Z",
    "ultima_atividade": "2026-03-20T15:30:00Z",
    "estrategia": "Scalper M5",
    "ativo": "EURUSD"
  }
]
```

---

## 📊 Regras de Negócio

### Limites por Plano

| Plano     | EAs Ativos Simultâneos | Gerenciamento de Mesa |
|-----------|------------------------|------------------------|
| Starter   | 4                      | Ilimitado             |
| Plus      | 8                      | Ilimitado             |
| Premium   | Ilimitado             | Ilimitado             |
| Diamond   | Ilimitado             | Ilimitado             |

### EAs de Gerenciamento de Mesa

Magic numbers específicos **não contam** no limite:
- `1` (000001 - Gerenciamento Mesa)
- `2` (000002 - Gerenciamento Notícia)

**Nota:** Para adicionar novos EAs de gerenciamento, edite o array `MAGICS_GERENCIAMENTO_MESA` em `/backend/routes/licencas.js`

### Validações Importantes

1. **Assinatura Ativa:** `status_assinatura = true` no banco de dados
2. **Limite por Plano:** Contador de `session_token` não nulos na tabela `licencas`
3. **Session ID Único:** Cada terminal/gráfico deve gerar um ID único
4. **Timeout de Inatividade:** Considerar limpar licenças sem heartbeat há mais de 30 minutos

---

## 🛠️ Implementação no EA (MQL5)

### OnInit()
```mql5
int OnInit() {
    // Gerar session_id único baseado no terminal/gráfico
    string session_id = IntegerToString(AccountInfoInteger(ACCOUNT_LOGIN)) + 
                        "_" + IntegerToString(ChartID()) + 
                        "_" + IntegerToString(GetTickCount());
    
    // Validar licença
    if (!ValidarLicenca(USER_EMAIL, EA_MAGIC_NUMBER, session_id)) {
        Alert("Licença não autorizada! Verifique seu plano.");
        return INIT_FAILED;
    }
    
    // Iniciar timer para heartbeat (a cada 5 min)
    EventSetTimer(300); // 300 segundos
    
    return INIT_SUCCEEDED;
}
```

### OnTimer()
```mql5
void OnTimer() {
    // Renovar licença (heartbeat)
    if (!RenovarLicenca(USER_EMAIL, EA_MAGIC_NUMBER, session_id)) {
        Alert("Licença expirada! O EA será encerrado.");
        ExpertRemove();
    }
}
```

### OnDeinit()
```mql5
void OnDeinit(const int reason) {
    // Liberar licença ao fechar
    DesativarLicenca(USER_EMAIL, EA_MAGIC_NUMBER, session_id);
    EventKillTimer();
}
```

---

## 🗄️ Estrutura do Banco de Dados

### Tabela: `licencas`

```sql
CREATE TABLE licencas (
    id SERIAL PRIMARY KEY,
    usuario_id INT NOT NULL REFERENCES usuarios(id),
    magic INT NOT NULL,
    session_token VARCHAR(255),
    criado_em TIMESTAMP DEFAULT NOW(),
    ultima_atividade TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_licencas_usuario_magic ON licencas(usuario_id, magic);
CREATE INDEX idx_licencas_session ON licencas(session_token);
```

**Campos:**
- `session_token`: NULL = inativo, preenchido = ativo
- `ultima_atividade`: Atualizado a cada heartbeat

---

## 🔍 Logs e Monitoramento

O sistema registra logs para:
- ✅ Licenças autorizadas
- 🚫 Tentativas de exceder o limite
- 🔓 Licenças liberadas
- ⚠️ Erros de validação

**Exemplo de Log:**
```
✅ Licença autorizada: user@exemplo.com | Magic 123456 | Plano Starter | Ativos: 2/4
```

---

## 📞 Suporte

Para dúvidas sobre a integração, contate o time de desenvolvimento.

**Versão:** 1.0  
**Última Atualização:** 20 de março de 2026
