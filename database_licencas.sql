-- =====================================================
-- Script de Criação da Tabela de Licenças
-- Clube Quant - Sistema de Controle de EAs Ativos
-- =====================================================

-- Criar tabela de licenças (se não existir)
CREATE TABLE IF NOT EXISTS licencas (
    id SERIAL PRIMARY KEY,
    usuario_id INT NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
    magic INT NOT NULL,
    session_token VARCHAR(255),
    criado_em TIMESTAMP DEFAULT NOW(),
    ultima_atividade TIMESTAMP DEFAULT NOW(),
    CONSTRAINT unique_usuario_magic UNIQUE (usuario_id, magic)
);

-- Criar índices para otimizar consultas
CREATE INDEX IF NOT EXISTS idx_licencas_usuario_magic 
    ON licencas(usuario_id, magic);

CREATE INDEX IF NOT EXISTS idx_licencas_session 
    ON licencas(session_token) 
    WHERE session_token IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_licencas_atividade 
    ON licencas(ultima_atividade);

-- Comentários
COMMENT ON TABLE licencas IS 'Controle de licenças de EAs ativos por usuário';
COMMENT ON COLUMN licencas.session_token IS 'Token único da sessão do MetaTrader. NULL = inativo, preenchido = ativo';
COMMENT ON COLUMN licencas.ultima_atividade IS 'Última vez que o EA enviou heartbeat';

-- =====================================================
-- Queries Úteis para Administração
-- =====================================================

-- Ver EAs ativos por usuário
-- SELECT u.email, u.plano, COUNT(l.id) as eas_ativos
-- FROM usuarios u
-- LEFT JOIN licencas l ON u.id = l.usuario_id AND l.session_token IS NOT NULL
-- GROUP BY u.id, u.email, u.plano
-- ORDER BY eas_ativos DESC;

-- Ver EAs inativos há mais de 30 minutos (considerar limpeza)
-- SELECT u.email, l.magic, l.ultima_atividade
-- FROM licencas l
-- JOIN usuarios u ON l.usuario_id = u.id
-- WHERE l.session_token IS NOT NULL 
--   AND l.ultima_atividade < NOW() - INTERVAL '30 minutes'
-- ORDER BY l.ultima_atividade;

-- Limpar licenças inativas (executar periodicamente)
-- UPDATE licencas 
-- SET session_token = NULL 
-- WHERE session_token IS NOT NULL 
--   AND ultima_atividade < NOW() - INTERVAL '1 hour';
