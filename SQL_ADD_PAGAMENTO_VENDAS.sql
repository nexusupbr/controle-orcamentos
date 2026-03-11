-- =====================================================
-- MIGRAÇÃO: Adicionar colunas de pagamento na tabela vendas
-- Data: 2026-03-11
-- Descrição: Adiciona campos de forma de pagamento, condição, 
--            parcelas, vencimento e conta bancária na tabela vendas
-- =====================================================

-- Adicionar coluna forma_pagamento
ALTER TABLE vendas ADD COLUMN IF NOT EXISTS forma_pagamento TEXT DEFAULT 'dinheiro';

-- Adicionar coluna condicao_pagamento
ALTER TABLE vendas ADD COLUMN IF NOT EXISTS condicao_pagamento TEXT DEFAULT 'vista';

-- Adicionar coluna parcelas
ALTER TABLE vendas ADD COLUMN IF NOT EXISTS parcelas INT DEFAULT 1;

-- Adicionar coluna data_primeiro_vencimento
ALTER TABLE vendas ADD COLUMN IF NOT EXISTS data_primeiro_vencimento DATE;

-- Adicionar coluna conta_bancaria_id com referência
ALTER TABLE vendas ADD COLUMN IF NOT EXISTS conta_bancaria_id INT REFERENCES contas_bancarias(id);

-- Verificação
SELECT column_name, data_type, column_default
FROM information_schema.columns 
WHERE table_name = 'vendas' 
  AND column_name IN ('forma_pagamento', 'condicao_pagamento', 'parcelas', 'data_primeiro_vencimento', 'conta_bancaria_id')
ORDER BY ordinal_position;
