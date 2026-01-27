-- =====================================================
-- SCRIPT SQL COMPLETO - SISTEMA DE GESTÃO
-- Execute este script no Supabase (SQL Editor)
-- =====================================================

-- =====================================================
-- 1. USUÁRIOS (necessário antes de outras tabelas)
-- =====================================================
CREATE TABLE IF NOT EXISTS usuarios (
  id SERIAL PRIMARY KEY,
  nome TEXT NOT NULL,
  email TEXT UNIQUE NOT NULL,
  senha_hash TEXT,
  cargo TEXT,
  ativo BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================================
-- 2. CATEGORIAS DE PRODUTOS
-- =====================================================
CREATE TABLE IF NOT EXISTS categorias (
  id SERIAL PRIMARY KEY,
  nome TEXT NOT NULL UNIQUE,
  descricao TEXT,
  cor TEXT DEFAULT '#3B82F6',
  ativo BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Inserir categorias padrão
INSERT INTO categorias (nome, descricao) VALUES 
  ('Mercadoria para Revenda', 'Produtos destinados à revenda'),
  ('Matéria-Prima', 'Materiais para produção'),
  ('Embalagem', 'Materiais de embalagem'),
  ('Produto em Processo', 'Produtos em fase de fabricação'),
  ('Produto Acabado', 'Produtos finalizados'),
  ('Subproduto', 'Subprodutos da produção'),
  ('Produto Intermediário', 'Produtos intermediários'),
  ('Material de Uso e Consumo', 'Materiais para uso interno'),
  ('Ativo Imobilizado', 'Bens patrimoniais'),
  ('Serviços', 'Prestação de serviços'),
  ('Outros Insumos', 'Outros materiais'),
  ('Outras', 'Outras categorias')
ON CONFLICT (nome) DO NOTHING;

-- =====================================================
-- 3. CLASSIFICAÇÕES FISCAIS DE PRODUTOS
-- =====================================================
CREATE TABLE IF NOT EXISTS classificacoes_fiscais (
  id SERIAL PRIMARY KEY,
  codigo TEXT NOT NULL UNIQUE,
  nome TEXT NOT NULL,
  descricao TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

INSERT INTO classificacoes_fiscais (codigo, nome) VALUES 
  ('00', 'Mercadoria para Revenda'),
  ('01', 'Matéria-Prima'),
  ('02', 'Embalagem'),
  ('03', 'Produto em Processo'),
  ('04', 'Produto Acabado'),
  ('05', 'Subproduto'),
  ('06', 'Produto Intermediário'),
  ('07', 'Material de Uso e Consumo'),
  ('08', 'Ativo Imobilizado'),
  ('09', 'Serviços'),
  ('10', 'Outros Insumos'),
  ('99', 'Outras')
ON CONFLICT (codigo) DO NOTHING;

-- =====================================================
-- 4. FORNECEDORES
-- =====================================================
CREATE TABLE IF NOT EXISTS fornecedores (
  id SERIAL PRIMARY KEY,
  razao_social TEXT NOT NULL,
  nome_fantasia TEXT,
  cnpj TEXT UNIQUE,
  cpf TEXT,
  inscricao_estadual TEXT,
  endereco TEXT,
  numero TEXT,
  complemento TEXT,
  bairro TEXT,
  cidade TEXT,
  estado TEXT,
  cep TEXT,
  telefone TEXT,
  email TEXT,
  contato TEXT,
  observacoes TEXT,
  ativo BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================================
-- 5. CLIENTES (movido para antes de orcamentos)
-- =====================================================
CREATE TABLE IF NOT EXISTS clientes (
  id SERIAL PRIMARY KEY,
  tipo_pessoa TEXT CHECK (tipo_pessoa IN ('PF', 'PJ')) DEFAULT 'PF',
  tipo_cadastro TEXT CHECK (tipo_cadastro IN ('cliente', 'fornecedor', 'ambos')) DEFAULT 'cliente',
  
  -- Pessoa Física
  nome TEXT,
  cpf TEXT UNIQUE,
  rg TEXT,
  data_nascimento DATE,
  produtor_rural BOOLEAN DEFAULT FALSE,
  inscricao_produtor_rural TEXT,
  
  -- Pessoa Jurídica
  razao_social TEXT,
  nome_fantasia TEXT,
  cnpj TEXT UNIQUE,
  inscricao_estadual TEXT,
  inscricao_municipal TEXT,
  
  -- Endereço Principal
  cep TEXT,
  endereco TEXT,
  numero TEXT,
  complemento TEXT,
  bairro TEXT,
  cidade TEXT,
  estado TEXT,
  
  -- Contato
  telefone TEXT,
  celular TEXT,
  email TEXT,
  
  -- Dados fiscais
  contribuinte_icms BOOLEAN DEFAULT FALSE,
  regime_tributario TEXT,
  
  -- Anexos (URLs dos arquivos)
  anexos JSONB DEFAULT '[]',
  
  observacoes TEXT,
  limite_credito DECIMAL(15,2) DEFAULT 0,
  saldo_devedor DECIMAL(15,2) DEFAULT 0,
  ativo BOOLEAN DEFAULT TRUE,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================================
-- 6. OBRAS (necessário antes de orcamentos e vendas)
-- =====================================================
CREATE TABLE IF NOT EXISTS obras (
  id SERIAL PRIMARY KEY,
  cliente_id INT REFERENCES clientes(id),
  nome TEXT NOT NULL,
  descricao TEXT,
  endereco TEXT,
  cidade TEXT,
  estado TEXT,
  status TEXT DEFAULT 'em_andamento',
  data_inicio DATE,
  data_previsao DATE,
  data_conclusao DATE,
  valor_total DECIMAL(15,2) DEFAULT 0,
  ativo BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================================
-- 7. ORÇAMENTOS (necessário antes de vendas e lancamentos)
-- =====================================================
CREATE TABLE IF NOT EXISTS orcamentos (
  id SERIAL PRIMARY KEY,
  numero TEXT,
  cliente_id INT REFERENCES clientes(id),
  obra_id INT REFERENCES obras(id),
  data_orcamento DATE DEFAULT CURRENT_DATE,
  validade DATE,
  valor_produtos DECIMAL(15,2) DEFAULT 0,
  valor_servicos DECIMAL(15,2) DEFAULT 0,
  valor_desconto DECIMAL(15,2) DEFAULT 0,
  valor_total DECIMAL(15,2) DEFAULT 0,
  margem_lucro DECIMAL(5,2) DEFAULT 0,
  custo_estimado DECIMAL(15,2) DEFAULT 0,
  status TEXT DEFAULT 'pendente',
  observacoes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================================
-- 8. PRODUTOS/ESTOQUE
-- =====================================================
CREATE TABLE IF NOT EXISTS produtos (
  id SERIAL PRIMARY KEY,
  codigo TEXT UNIQUE,
  codigo_barras TEXT,
  gtin_ean TEXT,
  nome TEXT NOT NULL,
  descricao TEXT,
  unidade TEXT DEFAULT 'UN',
  ncm TEXT,
  cfop TEXT,
  origem TEXT DEFAULT '0',
  
  -- Classificação
  categoria_id INT REFERENCES categorias(id),
  classificacao_fiscal TEXT DEFAULT '07',
  
  -- Valores
  valor_custo DECIMAL(15,2) DEFAULT 0,
  valor_venda DECIMAL(15,2) DEFAULT 0,
  custo_medio DECIMAL(15,2) DEFAULT 0,
  custo_ultima_compra DECIMAL(15,2) DEFAULT 0,
  margem_lucro DECIMAL(5,2) DEFAULT 0,
  
  -- Estoque
  quantidade_estoque DECIMAL(15,4) DEFAULT 0,
  estoque_minimo DECIMAL(15,4) DEFAULT 0,
  estoque_maximo DECIMAL(15,4) DEFAULT 0,
  
  -- Informações adicionais
  marca TEXT,
  peso_kg DECIMAL(10,4) DEFAULT 0,
  tamanho TEXT,
  fornecedor_id INT REFERENCES fornecedores(id),
  localizacao TEXT,
  
  -- Controle
  ativo BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Índice para busca por nome (evitar duplicatas)
CREATE INDEX IF NOT EXISTS idx_produtos_nome ON produtos(LOWER(nome));

-- =====================================================
-- 9. MOVIMENTAÇÕES DE ESTOQUE
-- =====================================================
CREATE TABLE IF NOT EXISTS movimentacoes_estoque (
  id SERIAL PRIMARY KEY,
  produto_id INT REFERENCES produtos(id) ON DELETE CASCADE,
  tipo TEXT CHECK (tipo IN ('entrada', 'saida', 'ajuste')) NOT NULL,
  quantidade DECIMAL(15,4) NOT NULL,
  valor_unitario DECIMAL(15,2),
  valor_total DECIMAL(15,2),
  
  -- Referências
  nota_fiscal_id INT,
  compra_id INT,
  venda_id INT,
  
  motivo TEXT,
  observacao TEXT,
  usuario_id INT REFERENCES usuarios(id),
  data_movimentacao TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================================
-- 10. ENDEREÇOS ADICIONAIS
-- =====================================================
CREATE TABLE IF NOT EXISTS enderecos_cliente (
  id SERIAL PRIMARY KEY,
  cliente_id INT REFERENCES clientes(id) ON DELETE CASCADE,
  tipo TEXT CHECK (tipo IN ('padrao', 'cobranca', 'entrega', 'retirada')) DEFAULT 'entrega',
  descricao TEXT,
  cep TEXT,
  endereco TEXT,
  numero TEXT,
  complemento TEXT,
  bairro TEXT,
  cidade TEXT,
  estado TEXT,
  principal BOOLEAN DEFAULT FALSE,
  ativo BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================================
-- 11. NOTAS FISCAIS DE ENTRADA (XML)
-- =====================================================
CREATE TABLE IF NOT EXISTS notas_fiscais_entrada (
  id SERIAL PRIMARY KEY,
  numero TEXT,
  serie TEXT,
  chave_acesso TEXT UNIQUE,
  data_emissao DATE,
  data_entrada DATE DEFAULT CURRENT_DATE,
  
  -- Emitente (Fornecedor)
  fornecedor_id INT REFERENCES fornecedores(id),
  fornecedor_cnpj TEXT,
  fornecedor_razao_social TEXT,
  
  -- Valores
  valor_produtos DECIMAL(15,2) DEFAULT 0,
  valor_frete DECIMAL(15,2) DEFAULT 0,
  valor_seguro DECIMAL(15,2) DEFAULT 0,
  valor_desconto DECIMAL(15,2) DEFAULT 0,
  valor_ipi DECIMAL(15,2) DEFAULT 0,
  valor_icms DECIMAL(15,2) DEFAULT 0,
  valor_pis DECIMAL(15,2) DEFAULT 0,
  valor_cofins DECIMAL(15,2) DEFAULT 0,
  valor_total DECIMAL(15,2) DEFAULT 0,
  
  -- Pagamento
  forma_pagamento TEXT,
  lancado_caixa BOOLEAN DEFAULT FALSE,
  caixa_id INT,
  
  -- Controle
  xml_original TEXT,
  status TEXT DEFAULT 'processada',
  observacoes TEXT,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================================
-- 12. ITENS DA NOTA FISCAL DE ENTRADA
-- =====================================================
CREATE TABLE IF NOT EXISTS itens_nota_entrada (
  id SERIAL PRIMARY KEY,
  nota_fiscal_id INT REFERENCES notas_fiscais_entrada(id) ON DELETE CASCADE,
  
  -- Produto
  produto_id INT REFERENCES produtos(id),
  codigo_produto_nf TEXT,
  descricao TEXT,
  ncm TEXT,
  cfop TEXT,
  unidade TEXT,
  
  -- Quantidades e valores
  quantidade DECIMAL(15,4) NOT NULL,
  valor_unitario DECIMAL(15,4) NOT NULL,
  valor_total DECIMAL(15,2) NOT NULL,
  valor_desconto DECIMAL(15,2) DEFAULT 0,
  
  -- Ação tomada
  acao TEXT CHECK (acao IN ('cadastrado', 'existente', 'substituido', 'ignorado')) DEFAULT 'existente',
  produto_substituido_id INT REFERENCES produtos(id),
  
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================================
-- 13. CT-e (Conhecimento de Transporte)
-- =====================================================
CREATE TABLE IF NOT EXISTS cte_fretes (
  id SERIAL PRIMARY KEY,
  numero TEXT,
  chave_acesso TEXT UNIQUE,
  data_emissao DATE,
  
  -- Transportadora
  transportadora_cnpj TEXT,
  transportadora_nome TEXT,
  
  -- Valores
  valor_frete DECIMAL(15,2) NOT NULL,
  valor_icms DECIMAL(15,2) DEFAULT 0,
  
  -- Vinculação
  nota_fiscal_id INT REFERENCES notas_fiscais_entrada(id),
  lancado_caixa BOOLEAN DEFAULT FALSE,
  caixa_id INT,
  
  observacoes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================================
-- 14. CATEGORIAS FINANCEIRAS
-- =====================================================
CREATE TABLE IF NOT EXISTS categorias_financeiras (
  id SERIAL PRIMARY KEY,
  nome TEXT NOT NULL,
  tipo TEXT CHECK (tipo IN ('despesa', 'receita', 'aplicacao')) NOT NULL,
  cor TEXT DEFAULT '#3B82F6',
  com_nota_fiscal BOOLEAN DEFAULT FALSE,
  ativo BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Inserir categorias padrão de despesas
INSERT INTO categorias_financeiras (nome, tipo) VALUES 
  ('Associação de Classe', 'despesa'),
  ('Bens de Pequeno Valor', 'despesa'),
  ('Despesas Combustível e Lubrificantes', 'despesa'),
  ('Despesas Cartorarias', 'despesa'),
  ('Despesas com Água e Esgoto', 'despesa'),
  ('Despesas com Correios e Malotes', 'despesa'),
  ('Despesas com Seguros', 'despesa'),
  ('Despesas com Telefone e Internet', 'despesa'),
  ('Despesas com Veículos e Conservação', 'despesa'),
  ('Despesas Diversas', 'despesa'),
  ('Despesas Escritório', 'despesa'),
  ('Encargos de Amortização', 'despesa'),
  ('Encargos de Depreciação', 'despesa'),
  ('IPVA/DEPVAT e taxas de Licenciamento', 'despesa'),
  ('Material de Uso e Consumo', 'despesa'),
  ('Propaganda, Publicidade e Patrocínio', 'despesa'),
  ('Serviços Adquiridos de Terceiros', 'despesa'),
  ('Honorários Profissionais', 'despesa'),
  ('Fretes e Carretos', 'despesa'),
  ('Despesas com Energia Elétrica', 'despesa'),
  ('Descontos Concedidos', 'despesa'),
  ('Juros', 'despesa'),
  ('Multas/Mora', 'despesa'),
  ('Tarifa Bancárias', 'despesa'),
  ('Taxas s/ Cobrança', 'despesa'),
  ('Despesas Pessoais', 'despesa'),
  ('Adiantamento a Fornecedores', 'despesa'),
  ('Retirada do Sócio - Antecipação de Lucros', 'despesa')
ON CONFLICT DO NOTHING;

-- Inserir categorias de receitas
INSERT INTO categorias_financeiras (nome, tipo) VALUES 
  ('Vendas de Mercadoria a Vista', 'receita'),
  ('Vendas de Mercadoria a Prazo', 'receita'),
  ('Serviços Prestados', 'receita'),
  ('Adiantamento de Clientes', 'receita'),
  ('Juros Recebidos', 'receita'),
  ('Descontos Obtidos', 'receita')
ON CONFLICT DO NOTHING;

-- Inserir aplicações financeiras
INSERT INTO categorias_financeiras (nome, tipo) VALUES 
  ('Aplicação DI Plus', 'aplicacao'),
  ('Aplicação BB Rende Fácil', 'aplicacao'),
  ('Depósito Conta Capital Sicoob', 'aplicacao')
ON CONFLICT DO NOTHING;

-- =====================================================
-- 15. CONTAS BANCÁRIAS
-- =====================================================
CREATE TABLE IF NOT EXISTS contas_bancarias (
  id SERIAL PRIMARY KEY,
  nome TEXT NOT NULL,
  banco TEXT,
  agencia TEXT,
  conta TEXT,
  tipo TEXT CHECK (tipo IN ('corrente', 'poupanca', 'caixa')) DEFAULT 'corrente',
  cnpj TEXT,
  saldo_inicial DECIMAL(15,2) DEFAULT 0,
  saldo_atual DECIMAL(15,2) DEFAULT 0,
  ativo BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Conta caixa padrão
INSERT INTO contas_bancarias (nome, tipo) VALUES ('Caixa Geral', 'caixa') ON CONFLICT DO NOTHING;

-- =====================================================
-- 16. LANÇAMENTOS FINANCEIROS (CAIXA)
-- =====================================================
CREATE TABLE IF NOT EXISTS lancamentos_financeiros (
  id SERIAL PRIMARY KEY,
  tipo TEXT CHECK (tipo IN ('receita', 'despesa', 'transferencia')) NOT NULL,
  
  -- Categorização
  categoria_id INT REFERENCES categorias_financeiras(id),
  subcategoria TEXT,
  com_nota_fiscal BOOLEAN DEFAULT FALSE,
  
  -- Valores
  valor DECIMAL(15,2) NOT NULL,
  data_lancamento DATE DEFAULT CURRENT_DATE,
  data_competencia DATE,
  
  -- Conta
  conta_id INT REFERENCES contas_bancarias(id),
  
  -- Forma de pagamento
  forma_pagamento TEXT CHECK (forma_pagamento IN ('dinheiro', 'pix', 'debito', 'credito', 'boleto', 'transferencia', 'cheque')),
  
  -- Vinculações
  cliente_id INT REFERENCES clientes(id),
  fornecedor_id INT REFERENCES fornecedores(id),
  nota_fiscal_entrada_id INT REFERENCES notas_fiscais_entrada(id),
  nota_fiscal_saida_id INT,
  venda_id INT,
  orcamento_id INT REFERENCES orcamentos(id),
  cte_id INT REFERENCES cte_fretes(id),
  
  -- Descrição
  descricao TEXT,
  observacao TEXT,
  
  -- Importação OFX
  ofx_fitid TEXT,
  ofx_data_importacao TIMESTAMPTZ,
  
  -- Controle
  conciliado BOOLEAN DEFAULT FALSE,
  usuario_id INT REFERENCES usuarios(id),
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Índice para evitar duplicação de OFX
CREATE UNIQUE INDEX IF NOT EXISTS idx_lancamentos_ofx ON lancamentos_financeiros(conta_id, ofx_fitid) WHERE ofx_fitid IS NOT NULL;

-- =====================================================
-- 17. CONTAS A PAGAR
-- =====================================================
CREATE TABLE IF NOT EXISTS contas_pagar (
  id SERIAL PRIMARY KEY,
  fornecedor_id INT REFERENCES fornecedores(id),
  
  descricao TEXT NOT NULL,
  valor DECIMAL(15,2) NOT NULL,
  valor_pago DECIMAL(15,2) DEFAULT 0,
  
  data_emissao DATE DEFAULT CURRENT_DATE,
  data_vencimento DATE NOT NULL,
  data_pagamento DATE,
  
  -- Vinculações
  nota_fiscal_id INT REFERENCES notas_fiscais_entrada(id),
  cte_id INT REFERENCES cte_fretes(id),
  boleto_codigo TEXT,
  
  -- Status
  status TEXT CHECK (status IN ('pendente', 'pago', 'parcial', 'vencido', 'cancelado')) DEFAULT 'pendente',
  
  forma_pagamento TEXT,
  categoria_id INT REFERENCES categorias_financeiras(id),
  com_nota_fiscal BOOLEAN DEFAULT FALSE,
  
  observacoes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================================
-- 18. CONTAS A RECEBER
-- =====================================================
CREATE TABLE IF NOT EXISTS contas_receber (
  id SERIAL PRIMARY KEY,
  cliente_id INT REFERENCES clientes(id),
  
  descricao TEXT NOT NULL,
  valor DECIMAL(15,2) NOT NULL,
  valor_recebido DECIMAL(15,2) DEFAULT 0,
  
  data_emissao DATE DEFAULT CURRENT_DATE,
  data_vencimento DATE NOT NULL,
  data_recebimento DATE,
  
  -- Vinculações
  nota_fiscal_id INT,
  venda_id INT,
  orcamento_id INT REFERENCES orcamentos(id),
  
  -- Status
  status TEXT CHECK (status IN ('pendente', 'recebido', 'parcial', 'vencido', 'cancelado')) DEFAULT 'pendente',
  
  forma_pagamento TEXT,
  observacoes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================================
-- 19. VENDAS / NOTAS FISCAIS DE SAÍDA
-- =====================================================
CREATE TABLE IF NOT EXISTS vendas (
  id SERIAL PRIMARY KEY,
  numero TEXT,
  cliente_id INT REFERENCES clientes(id),
  orcamento_id INT REFERENCES orcamentos(id),
  obra_id INT REFERENCES obras(id),
  
  data_venda DATE DEFAULT CURRENT_DATE,
  
  -- Valores
  valor_produtos DECIMAL(15,2) DEFAULT 0,
  valor_servicos DECIMAL(15,2) DEFAULT 0,
  valor_desconto DECIMAL(15,2) DEFAULT 0,
  valor_frete DECIMAL(15,2) DEFAULT 0,
  valor_total DECIMAL(15,2) DEFAULT 0,
  
  -- Lucro
  custo_total DECIMAL(15,2) DEFAULT 0,
  lucro_bruto DECIMAL(15,2) DEFAULT 0,
  margem_lucro DECIMAL(5,2) DEFAULT 0,
  
  -- NF
  nota_fiscal_emitida BOOLEAN DEFAULT FALSE,
  numero_nf TEXT,
  chave_nf TEXT,
  valor_impostos DECIMAL(15,2) DEFAULT 0,
  
  status TEXT DEFAULT 'concluida',
  observacoes TEXT,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================================
-- 20. ITENS DA VENDA
-- =====================================================
CREATE TABLE IF NOT EXISTS itens_venda (
  id SERIAL PRIMARY KEY,
  venda_id INT REFERENCES vendas(id) ON DELETE CASCADE,
  produto_id INT REFERENCES produtos(id),
  
  tipo TEXT CHECK (tipo IN ('produto', 'servico')) DEFAULT 'produto',
  descricao TEXT,
  
  quantidade DECIMAL(15,4) NOT NULL,
  valor_unitario DECIMAL(15,4) NOT NULL,
  valor_desconto DECIMAL(15,2) DEFAULT 0,
  valor_total DECIMAL(15,2) NOT NULL,
  
  -- Custo para cálculo de lucro
  custo_unitario DECIMAL(15,4) DEFAULT 0,
  
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================================
-- 21. IMPORTAÇÕES OFX (controle de duplicatas)
-- =====================================================
CREATE TABLE IF NOT EXISTS importacoes_ofx (
  id SERIAL PRIMARY KEY,
  conta_id INT REFERENCES contas_bancarias(id),
  nome_arquivo TEXT,
  data_importacao TIMESTAMPTZ DEFAULT NOW(),
  data_inicio DATE,
  data_fim DATE,
  quantidade_lancamentos INT DEFAULT 0,
  hash_arquivo TEXT,
  usuario_id INT REFERENCES usuarios(id)
);

-- =====================================================
-- 22. ANEXOS (arquivos de clientes, NFs, etc)
-- =====================================================
CREATE TABLE IF NOT EXISTS anexos (
  id SERIAL PRIMARY KEY,
  tipo_entidade TEXT NOT NULL,
  entidade_id INT NOT NULL,
  nome_arquivo TEXT NOT NULL,
  tipo_arquivo TEXT,
  tamanho INT,
  url TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================================
-- ATUALIZAR TABELA DE ORÇAMENTOS
-- =====================================================
ALTER TABLE orcamentos ADD COLUMN IF NOT EXISTS cliente_id INT REFERENCES clientes(id);
ALTER TABLE orcamentos ADD COLUMN IF NOT EXISTS margem_lucro DECIMAL(5,2) DEFAULT 0;
ALTER TABLE orcamentos ADD COLUMN IF NOT EXISTS valor_desconto DECIMAL(15,2) DEFAULT 0;
ALTER TABLE orcamentos ADD COLUMN IF NOT EXISTS custo_estimado DECIMAL(15,2) DEFAULT 0;

-- =====================================================
-- FUNÇÕES AUXILIARES
-- =====================================================

-- Função para atualizar custo médio do produto
CREATE OR REPLACE FUNCTION atualizar_custo_medio()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.tipo = 'entrada' THEN
    UPDATE produtos 
    SET 
      custo_medio = (
        (custo_medio * quantidade_estoque + NEW.valor_unitario * NEW.quantidade) /
        NULLIF(quantidade_estoque + NEW.quantidade, 0)
      ),
      custo_ultima_compra = NEW.valor_unitario,
      quantidade_estoque = quantidade_estoque + NEW.quantidade,
      updated_at = NOW()
    WHERE id = NEW.produto_id;
  ELSIF NEW.tipo = 'saida' THEN
    UPDATE produtos 
    SET 
      quantidade_estoque = quantidade_estoque - NEW.quantidade,
      updated_at = NOW()
    WHERE id = NEW.produto_id;
  ELSIF NEW.tipo = 'ajuste' THEN
    UPDATE produtos 
    SET 
      quantidade_estoque = quantidade_estoque + NEW.quantidade,
      updated_at = NOW()
    WHERE id = NEW.produto_id;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger para atualizar estoque
DROP TRIGGER IF EXISTS trigger_atualizar_estoque ON movimentacoes_estoque;
CREATE TRIGGER trigger_atualizar_estoque
AFTER INSERT ON movimentacoes_estoque
FOR EACH ROW
EXECUTE FUNCTION atualizar_custo_medio();

-- Função para verificar nome duplicado de produto
CREATE OR REPLACE FUNCTION verificar_produto_duplicado()
RETURNS TRIGGER AS $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM produtos 
    WHERE LOWER(nome) = LOWER(NEW.nome) 
    AND id != COALESCE(NEW.id, 0)
    AND ativo = TRUE
  ) THEN
    RAISE EXCEPTION 'Já existe um produto com este nome';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_verificar_produto_duplicado ON produtos;
CREATE TRIGGER trigger_verificar_produto_duplicado
BEFORE INSERT OR UPDATE ON produtos
FOR EACH ROW
EXECUTE FUNCTION verificar_produto_duplicado();

-- Função para atualizar status de contas a pagar
CREATE OR REPLACE FUNCTION atualizar_status_conta_pagar()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.valor_pago >= NEW.valor THEN
    NEW.status = 'pago';
  ELSIF NEW.valor_pago > 0 THEN
    NEW.status = 'parcial';
  ELSIF NEW.data_vencimento < CURRENT_DATE AND NEW.status = 'pendente' THEN
    NEW.status = 'vencido';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_status_conta_pagar ON contas_pagar;
CREATE TRIGGER trigger_status_conta_pagar
BEFORE UPDATE ON contas_pagar
FOR EACH ROW
EXECUTE FUNCTION atualizar_status_conta_pagar();

-- Função similar para contas a receber
CREATE OR REPLACE FUNCTION atualizar_status_conta_receber()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.valor_recebido >= NEW.valor THEN
    NEW.status = 'recebido';
  ELSIF NEW.valor_recebido > 0 THEN
    NEW.status = 'parcial';
  ELSIF NEW.data_vencimento < CURRENT_DATE AND NEW.status = 'pendente' THEN
    NEW.status = 'vencido';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_status_conta_receber ON contas_receber;
CREATE TRIGGER trigger_status_conta_receber
BEFORE UPDATE ON contas_receber
FOR EACH ROW
EXECUTE FUNCTION atualizar_status_conta_receber();

-- =====================================================
-- VIEWS PARA RELATÓRIOS
-- =====================================================

-- View para DRE
CREATE OR REPLACE VIEW vw_dre AS
SELECT 
  DATE_TRUNC('month', data_lancamento) as periodo,
  lf.tipo,
  lf.categoria_id,
  cf.nome as categoria,
  lf.com_nota_fiscal,
  SUM(lf.valor) as total
FROM lancamentos_financeiros lf
LEFT JOIN categorias_financeiras cf ON cf.id = lf.categoria_id
GROUP BY DATE_TRUNC('month', data_lancamento), lf.tipo, lf.categoria_id, cf.nome, lf.com_nota_fiscal
ORDER BY periodo DESC, lf.tipo, categoria;

-- View para inventário
CREATE OR REPLACE VIEW vw_inventario AS
SELECT 
  p.id,
  p.codigo,
  p.nome,
  c.nome as categoria,
  p.classificacao_fiscal,
  p.quantidade_estoque,
  p.valor_custo,
  p.custo_medio,
  p.valor_venda,
  (p.quantidade_estoque * p.custo_medio) as valor_total_custo,
  (p.quantidade_estoque * p.valor_venda) as valor_total_venda
FROM produtos p
LEFT JOIN categorias c ON c.id = p.categoria_id
WHERE p.ativo = TRUE
ORDER BY c.nome, p.nome;

-- View para produtos mais vendidos
CREATE OR REPLACE VIEW vw_produtos_mais_vendidos AS
SELECT 
  p.id,
  p.nome,
  p.codigo,
  SUM(iv.quantidade) as quantidade_vendida,
  SUM(iv.valor_total) as valor_total_vendido,
  COUNT(DISTINCT v.id) as numero_vendas
FROM itens_venda iv
JOIN produtos p ON p.id = iv.produto_id
JOIN vendas v ON v.id = iv.venda_id
WHERE v.status = 'concluida'
GROUP BY p.id, p.nome, p.codigo
ORDER BY quantidade_vendida DESC;

-- =====================================================
-- ÍNDICES PARA PERFORMANCE
-- =====================================================
CREATE INDEX IF NOT EXISTS idx_lancamentos_data ON lancamentos_financeiros(data_lancamento);
CREATE INDEX IF NOT EXISTS idx_lancamentos_tipo ON lancamentos_financeiros(tipo);
CREATE INDEX IF NOT EXISTS idx_lancamentos_categoria ON lancamentos_financeiros(categoria_id);
CREATE INDEX IF NOT EXISTS idx_contas_pagar_vencimento ON contas_pagar(data_vencimento);
CREATE INDEX IF NOT EXISTS idx_contas_pagar_status ON contas_pagar(status);
CREATE INDEX IF NOT EXISTS idx_contas_receber_vencimento ON contas_receber(data_vencimento);
CREATE INDEX IF NOT EXISTS idx_contas_receber_status ON contas_receber(status);
CREATE INDEX IF NOT EXISTS idx_produtos_categoria ON produtos(categoria_id);
CREATE INDEX IF NOT EXISTS idx_movimentacoes_produto ON movimentacoes_estoque(produto_id);
CREATE INDEX IF NOT EXISTS idx_movimentacoes_data ON movimentacoes_estoque(data_movimentacao);

-- =====================================================
-- FIM DO SCRIPT
-- =====================================================
