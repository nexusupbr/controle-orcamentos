-- =====================================================
-- Script para permitir CPF duplicado para Produtores Rurais
-- Execute no SQL Editor do Supabase: https://supabase.com/dashboard
-- =====================================================

-- 1. Remover constraint de CPF único atual
ALTER TABLE clientes DROP CONSTRAINT IF EXISTS clientes_cpf_key;

-- 2. Criar índice único parcial (CPF único apenas para NÃO-produtores rurais)
-- Isso permite que produtores rurais tenham o mesmo CPF com inscrições diferentes
DROP INDEX IF EXISTS clientes_cpf_unique;
CREATE UNIQUE INDEX clientes_cpf_unique 
ON clientes (cpf) 
WHERE cpf IS NOT NULL AND produtor_rural = false;

-- 3. Verificar se funcionou
SELECT 
  indexname, 
  indexdef 
FROM pg_indexes 
WHERE tablename = 'clientes' AND indexname = 'clientes_cpf_unique';
