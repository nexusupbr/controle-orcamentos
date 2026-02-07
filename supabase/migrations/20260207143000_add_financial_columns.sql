-- =====================================================
-- MIGRAÇÃO: Adicionar colunas financeiras
-- Execute este script no Supabase (SQL Editor)
-- =====================================================

-- =====================================================
-- 1. ADICIONAR COLUNAS NA TABELA CONTAS_PAGAR
-- =====================================================

-- Adicionar coluna conta_bancaria_id
ALTER TABLE contas_pagar 
ADD COLUMN IF NOT EXISTS conta_bancaria_id INT REFERENCES contas_bancarias(id);

-- Adicionar coluna numero_documento
ALTER TABLE contas_pagar 
ADD COLUMN IF NOT EXISTS numero_documento TEXT;

-- Adicionar coluna parcela_atual
ALTER TABLE contas_pagar 
ADD COLUMN IF NOT EXISTS parcela_atual INT DEFAULT 1;

-- Adicionar coluna total_parcelas
ALTER TABLE contas_pagar 
ADD COLUMN IF NOT EXISTS total_parcelas INT DEFAULT 1;

-- =====================================================
-- 2. ADICIONAR COLUNAS NA TABELA CONTAS_RECEBER
-- =====================================================

-- Adicionar coluna conta_bancaria_id
ALTER TABLE contas_receber 
ADD COLUMN IF NOT EXISTS conta_bancaria_id INT REFERENCES contas_bancarias(id);

-- Adicionar coluna numero_documento
ALTER TABLE contas_receber 
ADD COLUMN IF NOT EXISTS numero_documento TEXT;

-- Adicionar coluna parcela_atual
ALTER TABLE contas_receber 
ADD COLUMN IF NOT EXISTS parcela_atual INT DEFAULT 1;

-- Adicionar coluna total_parcelas
ALTER TABLE contas_receber 
ADD COLUMN IF NOT EXISTS total_parcelas INT DEFAULT 1;

-- Adicionar coluna categoria_id (se não existir)
ALTER TABLE contas_receber 
ADD COLUMN IF NOT EXISTS categoria_id INT REFERENCES categorias_financeiras(id);

-- =====================================================
-- 3. CRIAR ÍNDICES PARA MELHOR PERFORMANCE
-- =====================================================

CREATE INDEX IF NOT EXISTS idx_contas_pagar_conta_bancaria ON contas_pagar(conta_bancaria_id);
CREATE INDEX IF NOT EXISTS idx_contas_receber_conta_bancaria ON contas_receber(conta_bancaria_id);
CREATE INDEX IF NOT EXISTS idx_contas_pagar_categoria ON contas_pagar(categoria_id);
CREATE INDEX IF NOT EXISTS idx_contas_receber_categoria ON contas_receber(categoria_id);

-- =====================================================
-- PRONTO! Colunas adicionadas com sucesso.
-- =====================================================
