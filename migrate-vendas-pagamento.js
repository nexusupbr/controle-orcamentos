const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(
  'https://yhiiupamxdjmnrktkjku.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InloaWl1cGFteGRqbW5ya3Rramt1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njg0ODg2NzUsImV4cCI6MjA4NDA2NDY3NX0._QjYtYAlypJdursHe0-rPz14QOT4NNP2EklqcJ6TpkI'
);

async function migrate() {
  const sql = `
    ALTER TABLE vendas ADD COLUMN IF NOT EXISTS forma_pagamento TEXT DEFAULT 'dinheiro';
    ALTER TABLE vendas ADD COLUMN IF NOT EXISTS condicao_pagamento TEXT DEFAULT 'vista';
    ALTER TABLE vendas ADD COLUMN IF NOT EXISTS parcelas INT DEFAULT 1;
    ALTER TABLE vendas ADD COLUMN IF NOT EXISTS data_primeiro_vencimento DATE;
    ALTER TABLE vendas ADD COLUMN IF NOT EXISTS conta_bancaria_id INT REFERENCES contas_bancarias(id);
  `;

  const { data, error } = await supabase.rpc('exec_sql', { sql });
  
  if (error) {
    console.log('RPC nao disponivel:', error.message);
    console.log('');
    console.log('=== EXECUTE NO SUPABASE SQL EDITOR ===');
    console.log(sql);
  } else {
    console.log('Migracao executada!', data);
  }

  // Verificar apos tentativa
  const { data: check, error: checkErr } = await supabase.from('vendas').select('forma_pagamento').limit(1);
  if (checkErr) {
    console.log('Colunas AINDA nao existem:', checkErr.message);
  } else {
    console.log('Colunas existem! OK');
  }
}

migrate().catch(console.error);
