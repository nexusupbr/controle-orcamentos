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
