-- =====================================================
-- SCRIPT SQL PARA CRIAR AS NOVAS TABELAS
-- Execute este script no Supabase (SQL Editor)
-- =====================================================

-- 1. Tabela de Usuários (login Admin/Funcionário)
CREATE TABLE IF NOT EXISTS usuarios (
  id SERIAL PRIMARY KEY,
  nome TEXT NOT NULL,
  email TEXT UNIQUE NOT NULL,
  senha TEXT NOT NULL,
  tipo TEXT CHECK (tipo IN ('admin', 'funcionario')) NOT NULL DEFAULT 'funcionario',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Tabela de Materiais
CREATE TABLE IF NOT EXISTS materiais (
  id SERIAL PRIMARY KEY,
  nome TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Tabela de Obras (vinculadas a orçamentos)
CREATE TABLE IF NOT EXISTS obras (
  id SERIAL PRIMARY KEY,
  orcamento_id INT REFERENCES orcamentos(id) ON DELETE SET NULL,
  nome TEXT NOT NULL,
  descricao TEXT,
  status TEXT CHECK (status IN ('em_andamento', 'concluida', 'pausada')) DEFAULT 'em_andamento',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. Tabela de Materiais por Obra (quantidade de cada material)
CREATE TABLE IF NOT EXISTS obra_materiais (
  id SERIAL PRIMARY KEY,
  obra_id INT REFERENCES obras(id) ON DELETE CASCADE,
  material_id INT REFERENCES materiais(id) ON DELETE CASCADE,
  quantidade INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(obra_id, material_id)
);

-- =====================================================
-- INSERIR USUÁRIOS INICIAIS
-- =====================================================

-- Admin padrão (admin@admin.com / admin123)
INSERT INTO usuarios (nome, email, senha, tipo) 
VALUES ('Admin', 'admin@admin.com', 'admin123', 'admin')
ON CONFLICT (email) DO NOTHING;

-- Funcionário de exemplo (funcionario@email.com / func123)
INSERT INTO usuarios (nome, email, senha, tipo) 
VALUES ('Funcionário', 'funcionario@email.com', 'func123', 'funcionario')
ON CONFLICT (email) DO NOTHING;

-- =====================================================
-- INSERIR ALGUNS MATERIAIS DE EXEMPLO
-- =====================================================

INSERT INTO materiais (nome) VALUES 
  ('Cimento'),
  ('Areia'),
  ('Tijolo'),
  ('Argamassa'),
  ('Cal'),
  ('Ferragem'),
  ('Madeira'),
  ('Prego'),
  ('Parafuso'),
  ('Tinta')
ON CONFLICT DO NOTHING;

-- =====================================================
-- HABILITAR RLS (Row Level Security) - OPCIONAL
-- =====================================================

-- Por enquanto deixando sem RLS para simplificar
-- Se quiser mais segurança, ative e configure as policies

-- ALTER TABLE usuarios ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE materiais ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE obras ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE obra_materiais ENABLE ROW LEVEL SECURITY;

-- =====================================================
-- ATUALIZAÇÃO DA TABELA CLIENTES (adicionar tipo_cadastro)
-- Execute se a coluna não existir
-- =====================================================

-- Adicionar coluna tipo_cadastro na tabela clientes (se não existir)
ALTER TABLE clientes ADD COLUMN IF NOT EXISTS tipo_cadastro TEXT DEFAULT 'cliente';

-- Adicionar colunas de produtor rural na tabela clientes (se não existirem)
ALTER TABLE clientes ADD COLUMN IF NOT EXISTS produtor_rural BOOLEAN DEFAULT FALSE;
ALTER TABLE clientes ADD COLUMN IF NOT EXISTS inscricao_produtor_rural TEXT;

-- =====================================================
-- CORRIGIR CATEGORIAS FINANCEIRAS DUPLICADAS
-- =====================================================

-- Passo 1: Identificar e remover categorias duplicadas (mantendo a de menor ID)
DELETE FROM categorias_financeiras 
WHERE id NOT IN (
  SELECT MIN(id) 
  FROM categorias_financeiras 
  GROUP BY nome, tipo
);

-- Passo 2: Adicionar constraint UNIQUE para evitar duplicatas futuras
ALTER TABLE categorias_financeiras 
ADD CONSTRAINT categorias_financeiras_nome_tipo_unique UNIQUE (nome, tipo);

-- Verificar resultado (execute separadamente para ver as categorias restantes)
-- SELECT id, nome, tipo FROM categorias_financeiras ORDER BY tipo, nome;

-- Atualizar registros existentes que podem estar NULL
UPDATE clientes SET tipo_cadastro = 'cliente' WHERE tipo_cadastro IS NULL;

-- =====================================================
-- TABELA DE CONFIGURAÇÃO FISCAL (NFe/NFCe/NFSe)
-- =====================================================

CREATE TABLE IF NOT EXISTS config_fiscal (
  id SERIAL PRIMARY KEY,
  
  -- Dados do Emitente
  cnpj TEXT NOT NULL,
  inscricao_estadual TEXT,
  inscricao_municipal TEXT,
  razao_social TEXT NOT NULL,
  nome_fantasia TEXT,
  
  -- Endereço
  logradouro TEXT NOT NULL,
  numero TEXT NOT NULL,
  complemento TEXT,
  bairro TEXT NOT NULL,
  codigo_municipio TEXT NOT NULL,
  municipio TEXT NOT NULL,
  uf TEXT NOT NULL,
  cep TEXT NOT NULL,
  telefone TEXT,
  
  -- Regime tributário: 1=Simples Nacional, 2=Simples Excesso, 3=Regime Normal
  regime_tributario INT CHECK (regime_tributario IN (1, 2, 3)) DEFAULT 1,
  
  -- Focus NFe API
  focusnfe_token TEXT,
  focusnfe_ambiente TEXT CHECK (focusnfe_ambiente IN ('homologacao', 'producao')) DEFAULT 'homologacao',
  
  -- Certificado Digital (base64) - opcional se já enviou pelo painel Focus NFe
  certificado_base64 TEXT,
  certificado_senha TEXT,
  certificado_validade DATE,
  
  -- NFCe (se aplicável)
  csc_nfce TEXT,
  id_token_nfce TEXT,
  
  -- Série das notas
  serie_nfe INT DEFAULT 1,
  serie_nfce INT DEFAULT 1,
  serie_nfse INT DEFAULT 1,
  
  -- Próximo número (controle local, Focus NFe gerencia automaticamente)
  proximo_numero_nfe INT DEFAULT 1,
  proximo_numero_nfce INT DEFAULT 1,
  proximo_numero_nfse INT DEFAULT 1,
  
  -- Configurações padrão
  natureza_operacao_padrao TEXT DEFAULT 'Venda',
  cfop_padrao TEXT DEFAULT '5102',
  
  -- Informações adicionais padrão
  informacoes_complementares TEXT,
  
  -- Status
  ativo BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================================
-- TABELA DE NOTAS FISCAIS EMITIDAS
-- =====================================================

CREATE TABLE IF NOT EXISTS notas_fiscais (
  id SERIAL PRIMARY KEY,
  
  -- Referência única (usada na API Focus NFe)
  referencia TEXT UNIQUE NOT NULL,
  
  -- Vínculo com venda
  venda_id INT REFERENCES vendas(id) ON DELETE SET NULL,
  
  -- Tipo de documento
  tipo TEXT CHECK (tipo IN ('nfe', 'nfce', 'nfse')) NOT NULL DEFAULT 'nfe',
  
  -- Dados da nota
  numero TEXT,
  serie TEXT,
  chave_acesso TEXT,
  
  -- Status
  status TEXT CHECK (status IN (
    'pendente',
    'processando',
    'autorizada',
    'cancelada',
    'rejeitada',
    'denegada'
  )) DEFAULT 'pendente',
  
  status_sefaz TEXT,
  mensagem_sefaz TEXT,
  
  -- Dados do destinatário (snapshot)
  destinatario_nome TEXT,
  destinatario_documento TEXT,
  destinatario_email TEXT,
  
  -- Valores
  valor_total DECIMAL(15,2),
  valor_produtos DECIMAL(15,2),
  valor_desconto DECIMAL(15,2) DEFAULT 0,
  valor_frete DECIMAL(15,2) DEFAULT 0,
  
  -- URLs dos arquivos
  url_xml TEXT,
  url_danfe TEXT,
  url_xml_cancelamento TEXT,
  
  -- Carta de correção (se houver)
  carta_correcao_numero INT,
  carta_correcao_texto TEXT,
  url_carta_correcao_xml TEXT,
  url_carta_correcao_pdf TEXT,
  
  -- Cancelamento
  cancelada_em TIMESTAMPTZ,
  cancelamento_justificativa TEXT,
  cancelamento_protocolo TEXT,
  
  -- Dados JSON completos (backup)
  dados_envio JSONB,
  dados_retorno JSONB,
  
  -- Timestamps
  emitida_em TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Índices para melhor performance
CREATE INDEX IF NOT EXISTS idx_notas_fiscais_venda ON notas_fiscais(venda_id);
CREATE INDEX IF NOT EXISTS idx_notas_fiscais_status ON notas_fiscais(status);
CREATE INDEX IF NOT EXISTS idx_notas_fiscais_chave ON notas_fiscais(chave_acesso);
CREATE INDEX IF NOT EXISTS idx_notas_fiscais_referencia ON notas_fiscais(referencia);

-- =====================================================
-- ATUALIZAR TABELA DE VENDAS (adicionar campos NFe)
-- =====================================================

-- Adiciona coluna para referência da nota fiscal
ALTER TABLE vendas ADD COLUMN IF NOT EXISTS nota_fiscal_id INT REFERENCES notas_fiscais(id) ON DELETE SET NULL;
ALTER TABLE vendas ADD COLUMN IF NOT EXISTS nota_fiscal_status TEXT;
ALTER TABLE vendas ADD COLUMN IF NOT EXISTS nota_fiscal_chave TEXT;

-- =====================================================
-- SISTEMA DE ORDEM DE SERVIÇO (OS)
-- =====================================================

-- Tabela principal de Ordens de Serviço
CREATE TABLE IF NOT EXISTS ordens_servico (
  id SERIAL PRIMARY KEY,
  numero INT UNIQUE NOT NULL,
  
  -- Cliente
  cliente_id INT REFERENCES clientes(id) ON DELETE SET NULL,
  cliente_nome TEXT NOT NULL,
  
  -- Datas
  data_os DATE NOT NULL DEFAULT CURRENT_DATE,
  data_entrega DATE,
  
  -- Status: orcamento, aprovado, em_execucao, concluido, cancelado, faturado
  status TEXT CHECK (status IN ('orcamento', 'aprovado', 'em_execucao', 'concluido', 'cancelado', 'faturado')) DEFAULT 'orcamento',
  
  -- Tipo de atendimento
  tipo_atendimento TEXT DEFAULT 'Externo',
  
  -- Valores calculados
  total_servicos DECIMAL(15,2) DEFAULT 0,
  total_produtos DECIMAL(15,2) DEFAULT 0,
  total_horas DECIMAL(10,2) DEFAULT 0,
  total_itens INT DEFAULT 0,
  valor_total DECIMAL(15,2) DEFAULT 0,
  
  -- Desconto
  desconto_percentual DECIMAL(5,2) DEFAULT 0,
  desconto_valor DECIMAL(15,2) DEFAULT 0,
  
  -- Observações
  observacoes TEXT,
  observacoes_internas TEXT,
  
  -- Garantia
  garantia_dias INT DEFAULT 90,
  
  -- Vínculo com venda/NF (quando faturado)
  venda_id INT REFERENCES vendas(id) ON DELETE SET NULL,
  nota_fiscal_id INT REFERENCES notas_fiscais(id) ON DELETE SET NULL,
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Itens de serviço da OS
CREATE TABLE IF NOT EXISTS os_servicos (
  id SERIAL PRIMARY KEY,
  os_id INT REFERENCES ordens_servico(id) ON DELETE CASCADE,
  
  descricao TEXT NOT NULL,
  quantidade DECIMAL(10,2) DEFAULT 1,
  valor_unitario DECIMAL(15,2) DEFAULT 0,
  valor_total DECIMAL(15,2) DEFAULT 0,
  
  -- Ordem de exibição
  ordem INT DEFAULT 0,
  
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Itens de produto da OS
CREATE TABLE IF NOT EXISTS os_produtos (
  id SERIAL PRIMARY KEY,
  os_id INT REFERENCES ordens_servico(id) ON DELETE CASCADE,
  
  -- Produto (pode ser vinculado ou avulso)
  produto_id INT REFERENCES produtos(id) ON DELETE SET NULL,
  codigo TEXT,
  descricao TEXT NOT NULL,
  unidade TEXT DEFAULT 'UN',
  ncm TEXT,
  
  quantidade DECIMAL(10,3) DEFAULT 1,
  valor_unitario DECIMAL(15,2) DEFAULT 0,
  valor_total DECIMAL(15,2) DEFAULT 0,
  
  -- Ordem de exibição
  ordem INT DEFAULT 0,
  
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_os_cliente ON ordens_servico(cliente_id);
CREATE INDEX IF NOT EXISTS idx_os_status ON ordens_servico(status);
CREATE INDEX IF NOT EXISTS idx_os_data ON ordens_servico(data_os);
CREATE INDEX IF NOT EXISTS idx_os_numero ON ordens_servico(numero);
CREATE INDEX IF NOT EXISTS idx_os_servicos_os ON os_servicos(os_id);
CREATE INDEX IF NOT EXISTS idx_os_produtos_os ON os_produtos(os_id);

-- Sequence para número da OS
CREATE SEQUENCE IF NOT EXISTS os_numero_seq START 1;

-- Função para obter próximo número de OS
CREATE OR REPLACE FUNCTION get_proximo_numero_os()
RETURNS INT AS $$
DECLARE
  proximo INT;
BEGIN
  SELECT COALESCE(MAX(numero), 0) + 1 INTO proximo FROM ordens_servico;
  RETURN proximo;
END;
$$ LANGUAGE plpgsql;
