const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://yhiiupamxdjmnrktkjku.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InloaWl1cGFteGRqbW5ya3Rramt1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njg0ODg2NzUsImV4cCI6MjA4NDA2NDY3NX0._QjYtYAlypJdursHe0-rPz14QOT4NNP2EklqcJ6TpkI';

const supabase = createClient(supabaseUrl, supabaseKey);

async function verificarTabelas() {
  console.log('🔍 Verificando tabelas existentes...\n');
  
  // Tentar fazer SELECT nas tabelas para ver se existem
  const { data: os, error: osErr } = await supabase
    .from('ordens_servico')
    .select('id')
    .limit(1);
  
  if (osErr && osErr.code === '42P01') {
    console.log('❌ Tabela ordens_servico NÃO existe');
  } else if (osErr) {
    console.log('⚠️ ordens_servico:', osErr.message);
  } else {
    console.log('✅ Tabela ordens_servico JÁ existe');
  }

  const { data: serv, error: servErr } = await supabase
    .from('os_servicos')
    .select('id')
    .limit(1);
  
  if (servErr && servErr.code === '42P01') {
    console.log('❌ Tabela os_servicos NÃO existe');
  } else if (servErr) {
    console.log('⚠️ os_servicos:', servErr.message);
  } else {
    console.log('✅ Tabela os_servicos JÁ existe');
  }

  const { data: prod, error: prodErr } = await supabase
    .from('os_produtos')
    .select('id')
    .limit(1);
  
  if (prodErr && prodErr.code === '42P01') {
    console.log('❌ Tabela os_produtos NÃO existe');
  } else if (prodErr) {
    console.log('⚠️ os_produtos:', prodErr.message);
  } else {
    console.log('✅ Tabela os_produtos JÁ existe');
  }

  console.log('\n📋 SQL para criar as tabelas (copie e execute no Supabase SQL Editor):');
  console.log('=' .repeat(70));
  console.log(`
-- Tabela principal de Ordens de Serviço
CREATE TABLE IF NOT EXISTS ordens_servico (
  id SERIAL PRIMARY KEY,
  numero INT UNIQUE NOT NULL,
  cliente_id INT REFERENCES clientes(id) ON DELETE SET NULL,
  cliente_nome TEXT NOT NULL,
  data_os DATE NOT NULL DEFAULT CURRENT_DATE,
  data_entrega DATE,
  status TEXT CHECK (status IN ('orcamento', 'aprovado', 'em_execucao', 'concluido', 'cancelado', 'faturado')) DEFAULT 'orcamento',
  tipo_atendimento TEXT DEFAULT 'Externo',
  total_servicos DECIMAL(15,2) DEFAULT 0,
  total_produtos DECIMAL(15,2) DEFAULT 0,
  total_horas DECIMAL(10,2) DEFAULT 0,
  total_itens INT DEFAULT 0,
  valor_total DECIMAL(15,2) DEFAULT 0,
  desconto_percentual DECIMAL(5,2) DEFAULT 0,
  desconto_valor DECIMAL(15,2) DEFAULT 0,
  observacoes TEXT,
  observacoes_internas TEXT,
  garantia_dias INT DEFAULT 90,
  venda_id INT REFERENCES vendas(id) ON DELETE SET NULL,
  nota_fiscal_id INT REFERENCES notas_fiscais(id) ON DELETE SET NULL,
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
  ordem INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Itens de produto da OS
CREATE TABLE IF NOT EXISTS os_produtos (
  id SERIAL PRIMARY KEY,
  os_id INT REFERENCES ordens_servico(id) ON DELETE CASCADE,
  produto_id INT REFERENCES produtos(id) ON DELETE SET NULL,
  codigo TEXT,
  descricao TEXT NOT NULL,
  unidade TEXT DEFAULT 'UN',
  ncm TEXT,
  quantidade DECIMAL(10,3) DEFAULT 1,
  valor_unitario DECIMAL(15,2) DEFAULT 0,
  valor_total DECIMAL(15,2) DEFAULT 0,
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
`);
  console.log('=' .repeat(70));
}

verificarTabelas().catch(console.error);
