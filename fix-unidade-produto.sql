-- =====================================================
-- DIAGNÓSTICO E CORREÇÃO DE UNIDADES INVÁLIDAS
-- Irriga Centro Oeste - Módulo de Estoque
-- Data: 29/01/2026
-- =====================================================

-- =====================================================
-- PASSO 1: DIAGNÓSTICO - Identificar produtos com unidade inválida
-- =====================================================

-- Query para listar todos os produtos com unidade problemática
SELECT 
  id, 
  codigo, 
  nome, 
  unidade,
  quantidade_estoque,
  created_at,
  updated_at
FROM produtos
WHERE 
  unidade IS NULL 
  OR unidade IN ('', '1', '0', '2', '3', '4', '5', '6', '7', '8', '9')
  OR unidade ~ '^[0-9]+$'  -- Unidade é apenas números
  OR unidade ~ '^[0-9]+\.?[0-9]*$'  -- Unidade é número decimal
ORDER BY updated_at DESC;

-- Contagem de produtos afetados
SELECT 
  COUNT(*) as total_afetados,
  (SELECT COUNT(*) FROM produtos) as total_produtos
FROM produtos
WHERE 
  unidade IS NULL 
  OR unidade IN ('', '1', '0')
  OR unidade ~ '^[0-9]+$';

-- Distribuição de unidades (para ver valores estranhos)
SELECT 
  unidade, 
  COUNT(*) as qtd_produtos
FROM produtos
GROUP BY unidade
ORDER BY qtd_produtos DESC;


-- =====================================================
-- PASSO 2: AUDITORIA (antes de corrigir)
-- =====================================================

-- Exportar lista de produtos que serão corrigidos (para auditoria)
-- Copie o resultado antes de executar o UPDATE
SELECT 
  id, 
  codigo, 
  nome, 
  unidade as unidade_antiga,
  'UN' as unidade_nova,
  quantidade_estoque,
  valor_custo,
  valor_venda
FROM produtos
WHERE 
  unidade IS NULL 
  OR unidade IN ('', '1', '0')
  OR unidade ~ '^[0-9]+$'
ORDER BY id;


-- =====================================================
-- PASSO 3: CORREÇÃO - Atualizar unidades inválidas
-- =====================================================

-- Corrigir todas as unidades inválidas para 'UN' (padrão)
UPDATE produtos 
SET 
  unidade = 'UN',
  updated_at = NOW()
WHERE 
  unidade IS NULL 
  OR unidade IN ('', '1', '0')
  OR unidade ~ '^[0-9]+$';

-- Retornar quantas linhas foram afetadas
-- O Supabase vai mostrar: "X rows affected"


-- =====================================================
-- PASSO 4: VERIFICAÇÃO PÓS-CORREÇÃO
-- =====================================================

-- Confirmar que não há mais unidades inválidas
SELECT 
  COUNT(*) as produtos_com_unidade_invalida
FROM produtos
WHERE 
  unidade IS NULL 
  OR unidade IN ('', '1', '0')
  OR unidade ~ '^[0-9]+$';

-- Resultado esperado: 0


-- =====================================================
-- EXTRA: Normalizar unidades comuns (opcional)
-- =====================================================

-- Normalizar variações de unidade
UPDATE produtos SET unidade = 'UN', updated_at = NOW() WHERE UPPER(unidade) IN ('UNID', 'UNIDADE', 'UNIDADES');
UPDATE produtos SET unidade = 'PC', updated_at = NOW() WHERE UPPER(unidade) IN ('PECA', 'PEÇA', 'PECAS', 'PEÇAS');
UPDATE produtos SET unidade = 'KG', updated_at = NOW() WHERE UPPER(unidade) IN ('QUILO', 'QUILOS', 'QUILOGRAMA');
UPDATE produtos SET unidade = 'L', updated_at = NOW() WHERE UPPER(unidade) IN ('LITRO', 'LITROS');
UPDATE produtos SET unidade = 'M', updated_at = NOW() WHERE UPPER(unidade) IN ('METRO', 'METROS');
UPDATE produtos SET unidade = 'CX', updated_at = NOW() WHERE UPPER(unidade) IN ('CAIXA', 'CAIXAS');
UPDATE produtos SET unidade = 'SC', updated_at = NOW() WHERE UPPER(unidade) IN ('SACO', 'SACOS');

-- Garantir tudo em uppercase
UPDATE produtos 
SET unidade = UPPER(unidade), updated_at = NOW()
WHERE unidade != UPPER(unidade);


-- =====================================================
-- PASSO 5: VERIFICAÇÃO FINAL - Lista de todas as unidades
-- =====================================================

SELECT 
  unidade, 
  COUNT(*) as qtd_produtos,
  ROUND(COUNT(*) * 100.0 / (SELECT COUNT(*) FROM produtos), 2) as percentual
FROM produtos
GROUP BY unidade
ORDER BY qtd_produtos DESC;
