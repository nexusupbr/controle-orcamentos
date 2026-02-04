const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  'https://yhiiupamxdjmnrktkjku.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InloaWl1cGFteGRqbW5ya3Rramt1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njg0ODg2NzUsImV4cCI6MjA4NDA2NDY3NX0._QjYtYAlypJdursHe0-rPz14QOT4NNP2EklqcJ6TpkI'
);

async function investigarPorCodigo() {
  const codigo = '003289';
  const gtin = '888317002715';
  
  console.log('🔍 BUSCA POR CÓDIGO E GTIN');
  console.log('Código:', codigo);
  console.log('GTIN:', gtin);
  console.log('================================================\n');
  
  // 1. Buscar itens de NF pelo código
  const { data: itensPorCodigo } = await supabase
    .from('itens_nota_entrada')
    .select('*, nota_fiscal:notas_fiscais_entrada(*)')
    .eq('codigo_produto_nf', codigo);
  
  console.log('📋 ITENS DE NF COM CÓDIGO', codigo + ':');
  if (itensPorCodigo?.length) {
    itensPorCodigo.forEach(item => {
      console.log(`\n- Descrição: ${item.descricao}`);
      console.log(`  Quantidade: ${item.quantidade}`);
      console.log(`  Produto ID vinculado: ${item.produto_id}`);
      if (item.nota_fiscal) {
        console.log(`  NF: ${item.nota_fiscal.numero}`);
        console.log(`  Fornecedor: ${item.nota_fiscal.fornecedor_razao_social}`);
        console.log(`  Data entrada: ${item.nota_fiscal.data_entrada}`);
      }
    });
  } else {
    console.log('Nenhum item encontrado com este código');
  }
  
  // 2. Buscar todos os produtos com quantidade_estoque > 0 que não tenham movimentação
  console.log('\n\n🔎 BUSCANDO ORIGEM VIA CSV DE PRODUTOS...');
  
  // Ver arquivos CSV importados recentemente
  const { data: todosProds } = await supabase
    .from('produtos')
    .select('id, nome, quantidade_estoque, created_at, codigo, gtin_ean')
    .eq('codigo', codigo);
  
  console.log('\nProdutos com código 003289:');
  todosProds?.forEach(p => {
    console.log(`- ID: ${p.id}, Nome: ${p.nome}, Qtd: ${p.quantidade_estoque}, Criado: ${p.created_at}`);
  });
  
  // 3. Buscar movimentações por produto_id específico
  console.log('\n\n🔄 TODAS AS MOVIMENTAÇÕES DO PRODUTO 3250:');
  const { data: movs, error } = await supabase
    .from('movimentacoes_estoque')
    .select('*')
    .eq('produto_id', 3250);
  
  if (error) {
    console.log('Erro:', error.message);
  } else {
    console.log('Movimentações encontradas:', movs?.length || 0);
    movs?.forEach(m => console.log(m));
  }
  
  // 4. Ver histórico completo de updates no produto via audit log (se existir)
  console.log('\n\n📊 VERIFICANDO SE PRODUTO VEIO DO CSV DE PRODUTOS...');
  
  // Verificar o arquivo CSV de produtos
  const fs = require('fs');
  const csvPath = './produtos_882420(1).csv';
  
  if (fs.existsSync(csvPath)) {
    const csvContent = fs.readFileSync(csvPath, 'utf8');
    const lines = csvContent.split('\n');
    
    console.log('Procurando SERRA no CSV...');
    lines.forEach((line, i) => {
      if (line.toUpperCase().includes('SERRA') && line.toUpperCase().includes('IRWIN')) {
        console.log(`Linha ${i}: ${line.substring(0, 200)}`);
      }
    });
  } else {
    console.log('Arquivo CSV não encontrado');
  }
  
  // 5. Verificar se há itens de NF com descrição similar
  console.log('\n\n📋 BUSCANDO ITENS COM SERRA E IRWIN:');
  const { data: itensSerraIrwin } = await supabase
    .from('itens_nota_entrada')
    .select('*, nota_fiscal:notas_fiscais_entrada(*)')
    .or('descricao.ilike.%SERRA%IRWIN%,descricao.ilike.%IRWIN%SERRA%');
  
  if (itensSerraIrwin?.length) {
    itensSerraIrwin.forEach(item => {
      console.log(`\n- "${item.descricao}"`);
      console.log(`  Qtd: ${item.quantidade}, Produto ID: ${item.produto_id}`);
      if (item.nota_fiscal) {
        console.log(`  NF: ${item.nota_fiscal.numero} (${item.nota_fiscal.fornecedor_razao_social})`);
      }
    });
  } else {
    console.log('Nenhum item encontrado');
  }
  
  // 6. Buscar por GTIN
  console.log('\n\n📋 BUSCANDO ITENS COM GTIN', gtin + ':');
  // Não temos campo gtin em itens_nota_entrada, vamos verificar em produtos
  const { data: prodsPorGtin } = await supabase
    .from('produtos')
    .select('*')
    .or(`gtin_ean.eq.${gtin},codigo_barras.eq.${gtin}`);
  
  console.log('Produtos com este GTIN:');
  prodsPorGtin?.forEach(p => {
    console.log(`- ID: ${p.id}, Nome: ${p.nome}, Estoque: ${p.quantidade_estoque}`);
  });
}

investigarPorCodigo().catch(console.error);
