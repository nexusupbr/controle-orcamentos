-- =====================================================
-- MIGRAÇÃO: Integração Robusta NFe - Focus NFe
-- Data: 05/02/2026
-- Versão: 2.0
-- =====================================================

-- =====================================================
-- 1. ATUALIZAR TABELA notas_fiscais
-- =====================================================

-- Adicionar colunas para controle de retry e polling
ALTER TABLE notas_fiscais 
ADD COLUMN IF NOT EXISTS tentativas_autorizacao INT DEFAULT 0,
ADD COLUMN IF NOT EXISTS proxima_consulta_em TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS ultimo_status_focus TEXT,
ADD COLUMN IF NOT EXISTS erro_detalhado JSONB,
ADD COLUMN IF NOT EXISTS tempo_autorizacao_ms INT,
ADD COLUMN IF NOT EXISTS ambiente TEXT DEFAULT 'homologacao',
ADD COLUMN IF NOT EXISTS ip_origem TEXT,
ADD COLUMN IF NOT EXISTS usuario_id UUID REFERENCES auth.users(id);

-- Índice para busca de notas pendentes (worker)
CREATE INDEX IF NOT EXISTS idx_notas_fiscais_pendentes 
ON notas_fiscais (status, proxima_consulta_em)
WHERE status IN ('pendente', 'processando', 'processando_autorizacao');

-- Índice único para garantir uma nota não-cancelada por venda
CREATE UNIQUE INDEX IF NOT EXISTS idx_notas_fiscais_venda_unica
ON notas_fiscais (venda_id)
WHERE status NOT IN ('cancelada', 'rejeitada', 'erro_autorizacao');

-- Índice para consulta por referência
CREATE INDEX IF NOT EXISTS idx_notas_fiscais_ref ON notas_fiscais(referencia);

-- =====================================================
-- 2. CRIAR TABELA DE EVENTOS/LOGS
-- =====================================================

CREATE TABLE IF NOT EXISTS notas_fiscais_eventos (
  id SERIAL PRIMARY KEY,
  nota_fiscal_id INT NOT NULL REFERENCES notas_fiscais(id) ON DELETE CASCADE,
  tipo_evento TEXT NOT NULL,
  -- Tipos: 'criacao', 'envio', 'consulta', 'autorizacao', 'rejeicao', 
  --        'cancelamento', 'carta_correcao', 'reenvio_email', 'erro', 'retry'
  descricao TEXT,
  payload_envio JSONB,
  payload_retorno JSONB,
  status_http INT,
  duracao_ms INT,
  erro_mensagem TEXT,
  usuario_id UUID REFERENCES auth.users(id),
  ip_origem TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Índices para eventos
CREATE INDEX IF NOT EXISTS idx_nfe_eventos_nota ON notas_fiscais_eventos(nota_fiscal_id);
CREATE INDEX IF NOT EXISTS idx_nfe_eventos_tipo ON notas_fiscais_eventos(tipo_evento);
CREATE INDEX IF NOT EXISTS idx_nfe_eventos_data ON notas_fiscais_eventos(created_at DESC);

-- =====================================================
-- 3. CRIAR TABELA DE MÉTRICAS
-- =====================================================

CREATE TABLE IF NOT EXISTS notas_fiscais_metricas (
  id SERIAL PRIMARY KEY,
  data DATE NOT NULL DEFAULT CURRENT_DATE,
  ambiente TEXT NOT NULL DEFAULT 'homologacao',
  
  -- Contadores
  total_emitidas INT DEFAULT 0,
  total_autorizadas INT DEFAULT 0,
  total_rejeitadas INT DEFAULT 0,
  total_canceladas INT DEFAULT 0,
  total_erros INT DEFAULT 0,
  
  -- Tempos médios (em ms)
  tempo_medio_autorizacao INT DEFAULT 0,
  tempo_maximo_autorizacao INT DEFAULT 0,
  tempo_minimo_autorizacao INT DEFAULT 0,
  
  -- Retries
  total_retries INT DEFAULT 0,
  media_tentativas DECIMAL(5,2) DEFAULT 0,
  
  -- Valores
  valor_total_autorizado DECIMAL(15,2) DEFAULT 0,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  UNIQUE(data, ambiente)
);

-- =====================================================
-- 4. CRIAR TABELA DE FILA DE PROCESSAMENTO
-- =====================================================

CREATE TABLE IF NOT EXISTS notas_fiscais_fila (
  id SERIAL PRIMARY KEY,
  nota_fiscal_id INT REFERENCES notas_fiscais(id) ON DELETE CASCADE,
  venda_id INT REFERENCES vendas(id) ON DELETE CASCADE,
  tipo_operacao TEXT NOT NULL,
  -- Tipos: 'emitir', 'consultar', 'cancelar', 'carta_correcao', 'email'
  prioridade INT DEFAULT 5, -- 1=alta, 10=baixa
  tentativas INT DEFAULT 0,
  max_tentativas INT DEFAULT 10,
  status TEXT DEFAULT 'pendente',
  -- Status: 'pendente', 'processando', 'concluido', 'erro', 'cancelado'
  dados JSONB,
  erro_ultimo TEXT,
  proximo_processamento TIMESTAMPTZ DEFAULT NOW(),
  processado_em TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Índice para buscar jobs pendentes
CREATE INDEX IF NOT EXISTS idx_nfe_fila_pendentes 
ON notas_fiscais_fila (status, prioridade, proximo_processamento)
WHERE status IN ('pendente', 'erro');

-- =====================================================
-- 5. ATUALIZAR config_fiscal
-- =====================================================

ALTER TABLE config_fiscal
ADD COLUMN IF NOT EXISTS webhook_url TEXT,
ADD COLUMN IF NOT EXISTS webhook_secret TEXT,
ADD COLUMN IF NOT EXISTS max_tentativas_autorizacao INT DEFAULT 10,
ADD COLUMN IF NOT EXISTS intervalo_retry_base_ms INT DEFAULT 10000,
ADD COLUMN IF NOT EXISTS timeout_autorizacao_min INT DEFAULT 30;

-- =====================================================
-- 6. CRIAR VIEW PARA DASHBOARD
-- =====================================================

CREATE OR REPLACE VIEW vw_notas_fiscais_dashboard AS
SELECT 
  DATE(created_at) as data,
  ambiente,
  COUNT(*) as total,
  COUNT(*) FILTER (WHERE status = 'autorizada') as autorizadas,
  COUNT(*) FILTER (WHERE status IN ('rejeitada', 'erro_autorizacao', 'denegada')) as rejeitadas,
  COUNT(*) FILTER (WHERE status IN ('pendente', 'processando', 'processando_autorizacao')) as pendentes,
  COUNT(*) FILTER (WHERE status = 'cancelada') as canceladas,
  COALESCE(SUM(valor_total) FILTER (WHERE status = 'autorizada'), 0) as valor_autorizado,
  COALESCE(AVG(tempo_autorizacao_ms) FILTER (WHERE status = 'autorizada'), 0)::INT as tempo_medio_ms,
  COALESCE(AVG(tentativas_autorizacao) FILTER (WHERE status = 'autorizada'), 0)::DECIMAL(5,2) as media_tentativas
FROM notas_fiscais
WHERE created_at >= CURRENT_DATE - INTERVAL '30 days'
GROUP BY DATE(created_at), ambiente
ORDER BY data DESC;

-- =====================================================
-- 7. FUNÇÕES AUXILIARES
-- =====================================================

-- Função para calcular próximo retry com backoff exponencial
CREATE OR REPLACE FUNCTION calcular_proximo_retry(
  tentativas_atuais INT,
  intervalo_base_ms INT DEFAULT 10000
)
RETURNS TIMESTAMPTZ AS $$
DECLARE
  delay_ms INT;
  max_delay_ms INT := 300000; -- 5 minutos máximo
BEGIN
  -- Backoff exponencial: base * 2^tentativas
  delay_ms := intervalo_base_ms * POWER(2, tentativas_atuais);
  
  -- Limitar ao máximo
  IF delay_ms > max_delay_ms THEN
    delay_ms := max_delay_ms;
  END IF;
  
  -- Adicionar jitter (±10%)
  delay_ms := delay_ms + (RANDOM() * delay_ms * 0.2 - delay_ms * 0.1)::INT;
  
  RETURN NOW() + (delay_ms || ' milliseconds')::INTERVAL;
END;
$$ LANGUAGE plpgsql;

-- Função para registrar evento
CREATE OR REPLACE FUNCTION registrar_evento_nfe(
  p_nota_id INT,
  p_tipo TEXT,
  p_descricao TEXT DEFAULT NULL,
  p_payload_envio JSONB DEFAULT NULL,
  p_payload_retorno JSONB DEFAULT NULL,
  p_status_http INT DEFAULT NULL,
  p_duracao_ms INT DEFAULT NULL,
  p_erro TEXT DEFAULT NULL,
  p_usuario_id UUID DEFAULT NULL
)
RETURNS INT AS $$
DECLARE
  evento_id INT;
BEGIN
  INSERT INTO notas_fiscais_eventos (
    nota_fiscal_id, tipo_evento, descricao, 
    payload_envio, payload_retorno, 
    status_http, duracao_ms, erro_mensagem, usuario_id
  )
  VALUES (
    p_nota_id, p_tipo, p_descricao,
    p_payload_envio, p_payload_retorno,
    p_status_http, p_duracao_ms, p_erro, p_usuario_id
  )
  RETURNING id INTO evento_id;
  
  RETURN evento_id;
END;
$$ LANGUAGE plpgsql;

-- Função para atualizar métricas diárias
CREATE OR REPLACE FUNCTION atualizar_metricas_nfe(p_ambiente TEXT DEFAULT 'homologacao')
RETURNS VOID AS $$
BEGIN
  INSERT INTO notas_fiscais_metricas (data, ambiente, 
    total_emitidas, total_autorizadas, total_rejeitadas, total_canceladas, total_erros,
    tempo_medio_autorizacao, tempo_maximo_autorizacao, tempo_minimo_autorizacao,
    total_retries, media_tentativas, valor_total_autorizado)
  SELECT 
    CURRENT_DATE,
    p_ambiente,
    COUNT(*),
    COUNT(*) FILTER (WHERE status = 'autorizada'),
    COUNT(*) FILTER (WHERE status = 'rejeitada'),
    COUNT(*) FILTER (WHERE status = 'cancelada'),
    COUNT(*) FILTER (WHERE status IN ('erro_autorizacao', 'denegada')),
    COALESCE(AVG(tempo_autorizacao_ms) FILTER (WHERE status = 'autorizada'), 0)::INT,
    COALESCE(MAX(tempo_autorizacao_ms) FILTER (WHERE status = 'autorizada'), 0),
    COALESCE(MIN(tempo_autorizacao_ms) FILTER (WHERE status = 'autorizada' AND tempo_autorizacao_ms > 0), 0),
    COALESCE(SUM(tentativas_autorizacao), 0),
    COALESCE(AVG(tentativas_autorizacao), 0),
    COALESCE(SUM(valor_total) FILTER (WHERE status = 'autorizada'), 0)
  FROM notas_fiscais
  WHERE DATE(created_at) = CURRENT_DATE
    AND ambiente = p_ambiente
  ON CONFLICT (data, ambiente) DO UPDATE SET
    total_emitidas = EXCLUDED.total_emitidas,
    total_autorizadas = EXCLUDED.total_autorizadas,
    total_rejeitadas = EXCLUDED.total_rejeitadas,
    total_canceladas = EXCLUDED.total_canceladas,
    total_erros = EXCLUDED.total_erros,
    tempo_medio_autorizacao = EXCLUDED.tempo_medio_autorizacao,
    tempo_maximo_autorizacao = EXCLUDED.tempo_maximo_autorizacao,
    tempo_minimo_autorizacao = EXCLUDED.tempo_minimo_autorizacao,
    total_retries = EXCLUDED.total_retries,
    media_tentativas = EXCLUDED.media_tentativas,
    valor_total_autorizado = EXCLUDED.valor_total_autorizado,
    updated_at = NOW();
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- 8. POLÍTICAS DE SEGURANÇA (RLS)
-- =====================================================

-- Habilitar RLS nas novas tabelas
ALTER TABLE notas_fiscais_eventos ENABLE ROW LEVEL SECURITY;
ALTER TABLE notas_fiscais_metricas ENABLE ROW LEVEL SECURITY;
ALTER TABLE notas_fiscais_fila ENABLE ROW LEVEL SECURITY;

-- Política para eventos: leitura para usuários autenticados
CREATE POLICY "Eventos leitura usuarios autenticados"
ON notas_fiscais_eventos FOR SELECT
TO authenticated
USING (true);

-- Política para métricas: leitura para usuários autenticados
CREATE POLICY "Metricas leitura usuarios autenticados"
ON notas_fiscais_metricas FOR SELECT
TO authenticated
USING (true);

-- Política para fila: service role apenas
CREATE POLICY "Fila service role"
ON notas_fiscais_fila FOR ALL
TO service_role
USING (true);

-- Atualizar política de notas_fiscais para INSERT
DROP POLICY IF EXISTS "Notas fiscais insert usuarios autenticados" ON notas_fiscais;
CREATE POLICY "Notas fiscais insert usuarios autenticados"
ON notas_fiscais FOR INSERT
TO authenticated
WITH CHECK (true);

-- Atualizar política de notas_fiscais para UPDATE
DROP POLICY IF EXISTS "Notas fiscais update usuarios autenticados" ON notas_fiscais;
CREATE POLICY "Notas fiscais update usuarios autenticados"
ON notas_fiscais FOR UPDATE
TO authenticated
USING (true);

-- =====================================================
-- 9. TRIGGERS
-- =====================================================

-- Trigger para atualizar updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_notas_fiscais_fila_updated_at
  BEFORE UPDATE ON notas_fiscais_fila
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- 10. DADOS INICIAIS
-- =====================================================

-- Inserir configuração de ambiente se não existir
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM config_fiscal WHERE ativo = true) THEN
    INSERT INTO config_fiscal (
      cnpj, razao_social, nome_fantasia,
      logradouro, numero, bairro, codigo_municipio, municipio, uf, cep,
      regime_tributario, focusnfe_ambiente,
      natureza_operacao_padrao, cfop_padrao, ativo
    ) VALUES (
      '00000000000000', 'EMPRESA TESTE', 'EMPRESA TESTE',
      'RUA TESTE', '100', 'CENTRO', '3550308', 'SAO PAULO', 'SP', '01000000',
      1, 'homologacao',
      'Venda', '5102', true
    );
  END IF;
END $$;

-- =====================================================
-- COMENTÁRIOS
-- =====================================================

COMMENT ON TABLE notas_fiscais_eventos IS 'Log de eventos de cada nota fiscal para auditoria e debugging';
COMMENT ON TABLE notas_fiscais_metricas IS 'Métricas agregadas diárias para dashboard';
COMMENT ON TABLE notas_fiscais_fila IS 'Fila de jobs assíncronos para processamento de NFe';
COMMENT ON COLUMN notas_fiscais.tentativas_autorizacao IS 'Número de tentativas de consulta de autorização';
COMMENT ON COLUMN notas_fiscais.proxima_consulta_em IS 'Timestamp para próxima consulta (backoff exponencial)';
COMMENT ON COLUMN notas_fiscais.tempo_autorizacao_ms IS 'Tempo em ms desde envio até autorização';
