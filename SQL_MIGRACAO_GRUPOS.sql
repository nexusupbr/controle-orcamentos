-- =====================================================
-- MIGRAÇÃO: SISTEMA DE AGRUPAMENTO DE LANÇAMENTOS DUPLICADOS
-- Data: 29/01/2026
-- =====================================================

-- 1. Adicionar coluna grupo_id para identificar lançamentos agrupados
-- Um grupo_id compartilhado indica que os lançamentos são do mesmo evento
ALTER TABLE lancamentos_financeiros 
ADD COLUMN IF NOT EXISTS grupo_id UUID DEFAULT NULL;

-- 2. Adicionar coluna para referência ao lançamento principal do grupo
ALTER TABLE lancamentos_financeiros 
ADD COLUMN IF NOT EXISTS grupo_principal_id INT REFERENCES lancamentos_financeiros(id) DEFAULT NULL;

-- 3. Adicionar data_nota para diferenciar de data_lancamento
-- data_lancamento = quando o lançamento foi registrado no sistema
-- data_nota = data do documento fiscal (NF, CT-e, etc.)
ALTER TABLE lancamentos_financeiros 
ADD COLUMN IF NOT EXISTS data_nota DATE DEFAULT NULL;

-- 4. Criar índice para consultas por grupo
CREATE INDEX IF NOT EXISTS idx_lancamentos_grupo_id ON lancamentos_financeiros(grupo_id) WHERE grupo_id IS NOT NULL;

-- 5. Criar índice para consultas por lançamento principal
CREATE INDEX IF NOT EXISTS idx_lancamentos_grupo_principal ON lancamentos_financeiros(grupo_principal_id) WHERE grupo_principal_id IS NOT NULL;

-- 6. Função para determinar se um grupo tem NF
-- Um grupo tem NF se qualquer membro tiver com_nota_fiscal=true ou nota_fiscal_entrada_id preenchido
CREATE OR REPLACE FUNCTION grupo_possui_nf(p_grupo_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
  v_possui_nf BOOLEAN;
BEGIN
  SELECT EXISTS (
    SELECT 1 FROM lancamentos_financeiros 
    WHERE grupo_id = p_grupo_id 
    AND (com_nota_fiscal = TRUE OR nota_fiscal_entrada_id IS NOT NULL)
  ) INTO v_possui_nf;
  
  RETURN COALESCE(v_possui_nf, FALSE);
END;
$$ LANGUAGE plpgsql;

-- 7. View para consulta de lançamentos com informações de grupo
CREATE OR REPLACE VIEW v_lancamentos_com_grupo AS
SELECT 
  l.*,
  CASE 
    WHEN l.grupo_id IS NOT NULL THEN (
      SELECT COUNT(*) FROM lancamentos_financeiros 
      WHERE grupo_id = l.grupo_id
    )
    ELSE 1
  END as grupo_total_itens,
  CASE 
    WHEN l.grupo_id IS NOT NULL THEN grupo_possui_nf(l.grupo_id)
    ELSE (l.com_nota_fiscal OR l.nota_fiscal_entrada_id IS NOT NULL)
  END as grupo_possui_nf,
  CASE 
    WHEN l.grupo_principal_id IS NULL AND l.grupo_id IS NOT NULL THEN TRUE
    WHEN l.grupo_id IS NULL THEN TRUE
    ELSE FALSE
  END as is_grupo_principal
FROM lancamentos_financeiros l;

-- 8. Garantir que created_at existe (já deve existir, mas garantir)
-- ALTER TABLE lancamentos_financeiros 
-- ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW();

COMMENT ON COLUMN lancamentos_financeiros.grupo_id IS 'UUID do grupo de lançamentos duplicados/relacionados';
COMMENT ON COLUMN lancamentos_financeiros.grupo_principal_id IS 'ID do lançamento principal do grupo (NULL = é o principal)';
COMMENT ON COLUMN lancamentos_financeiros.data_nota IS 'Data do documento fiscal (NF, CT-e), diferente de data_lancamento';
