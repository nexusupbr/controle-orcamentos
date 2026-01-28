const https = require('https');

const PROJECT_REF = 'yhiiupamxdjmnrktkjku';

// SQL para criar as tabelas
const sql = `
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
`;

console.log('🚀 SQL para criar tabelas de Ordem de Serviço');
console.log('=' .repeat(60));
console.log('\n📋 Acesse o Supabase SQL Editor e execute o SQL abaixo:\n');
console.log('   https://supabase.com/dashboard/project/' + PROJECT_REF + '/sql/new');
console.log('\n' + '=' .repeat(60));
console.log(sql);
console.log('=' .repeat(60));

// Tentar abrir navegador
const { exec } = require('child_process');
const url = `https://supabase.com/dashboard/project/${PROJECT_REF}/sql/new`;

console.log('\n🌐 Abrindo navegador automaticamente...');
exec(`xdg-open "${url}"`, (error) => {
  if (error) {
    console.log('⚠️ Não foi possível abrir automaticamente. Acesse manualmente:');
    console.log('   ' + url);
  }
});
