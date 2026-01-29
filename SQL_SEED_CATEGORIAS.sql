-- SQL para seed de categorias financeiras iniciais
-- Execute este script no Supabase SQL Editor

-- Inserir categorias de despesa padrão (se não existirem)
INSERT INTO categorias_financeiras (nome, tipo, ativo, com_nota_fiscal)
SELECT 'Despesa de Material', 'despesa', true, true
WHERE NOT EXISTS (
  SELECT 1 FROM categorias_financeiras 
  WHERE nome = 'Despesa de Material' AND tipo = 'despesa'
);

INSERT INTO categorias_financeiras (nome, tipo, ativo, com_nota_fiscal)
SELECT 'Frete', 'despesa', true, true
WHERE NOT EXISTS (
  SELECT 1 FROM categorias_financeiras 
  WHERE nome = 'Frete' AND tipo = 'despesa'
);

INSERT INTO categorias_financeiras (nome, tipo, ativo, com_nota_fiscal)
SELECT 'Impostos', 'despesa', true, true
WHERE NOT EXISTS (
  SELECT 1 FROM categorias_financeiras 
  WHERE nome = 'Impostos' AND tipo = 'despesa'
);

INSERT INTO categorias_financeiras (nome, tipo, ativo, com_nota_fiscal)
SELECT 'Serviços', 'despesa', true, false
WHERE NOT EXISTS (
  SELECT 1 FROM categorias_financeiras 
  WHERE nome = 'Serviços' AND tipo = 'despesa'
);

INSERT INTO categorias_financeiras (nome, tipo, ativo, com_nota_fiscal)
SELECT 'Despesas Gerais', 'despesa', true, false
WHERE NOT EXISTS (
  SELECT 1 FROM categorias_financeiras 
  WHERE nome = 'Despesas Gerais' AND tipo = 'despesa'
);

-- Inserir categorias de receita padrão (se não existirem)
INSERT INTO categorias_financeiras (nome, tipo, ativo, com_nota_fiscal)
SELECT 'Venda de Produtos', 'receita', true, true
WHERE NOT EXISTS (
  SELECT 1 FROM categorias_financeiras 
  WHERE nome = 'Venda de Produtos' AND tipo = 'receita'
);

INSERT INTO categorias_financeiras (nome, tipo, ativo, com_nota_fiscal)
SELECT 'Prestação de Serviços', 'receita', true, true
WHERE NOT EXISTS (
  SELECT 1 FROM categorias_financeiras 
  WHERE nome = 'Prestação de Serviços' AND tipo = 'receita'
);

INSERT INTO categorias_financeiras (nome, tipo, ativo, com_nota_fiscal)
SELECT 'Outras Receitas', 'receita', true, false
WHERE NOT EXISTS (
  SELECT 1 FROM categorias_financeiras 
  WHERE nome = 'Outras Receitas' AND tipo = 'receita'
);

-- Verificar categorias inseridas
SELECT id, nome, tipo, ativo, com_nota_fiscal, created_at
FROM categorias_financeiras
ORDER BY tipo, nome;
