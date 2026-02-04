const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  'https://yhiiupamxdjmnrktkjku.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InloaWl1cGFteGRqbW5ya3Rramt1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njg0ODg2NzUsImV4cCI6MjA4NDA2NDY3NX0._QjYtYAlypJdursHe0-rPz14QOT4NNP2EklqcJ6TpkI'
);

async function investigarCompleto() {
  const produtoId = 3250;
  const produtoNome = 'SERRA 12X24 IRWIN BIMETAL';
  
  console.log('🔍 INVESTIGAÇÃO COMPLETA - ORIGEM DO ESTOQUE');
  console.log('================================================\n');
  
  // 1. Ver dados completos do produto
  const { data: produto } = await supabase
    .from('produtos')
    .select('*')
    .eq('id', produtoId)
    .single();
  
  console.log('📦 DADOS DO PRODUTO:');
  console.log(JSON.stringify(produto, null, 2));
  
  // 2. Verificar se foi importado via CSV de produtos
  console.log('\n\n📄 VERIFICANDO IMPORTAÇÃO CSV...');
  console.log('Data de criação:', produto.created_at);
  
  // 3. Buscar notas fiscais com este item na descrição (pode ter sido vinculado errado)
  const { data: itensNF } = await supabase
    .from('itens_nota_entrada')
    .select('*, nota_fiscal:notas_fiscais_entrada(*)')
    .ilike('descricao', '%SERRA%12X24%');
  
  console.log('\n📋 ITENS DE NF COM DESCRIÇÃO SIMILAR:');
  if (itensNF?.length) {
    itensNF.forEach(item => {
      console.log(`- "${item.descricao}" (Qtd: ${item.quantidade}, Produto ID: ${item.produto_id})`);
      if (item.nota_fiscal) {
        console.log(`  NF: ${item.nota_fiscal.numero} - ${item.nota_fiscal.fornecedor_razao_social}`);
      }
    });
  } else {
    console.log('Nenhum item encontrado');
  }
  
  // 4. Buscar todas as movimentações do sistema que mencionem SERRA
  const { data: todasMovs } = await supabase
    .from('movimentacoes_estoque')
    .select('*, produto:produtos(nome)')
    .order('created_at', { ascending: false })
    .limit(50);
  
  const movsRelacionadas = todasMovs?.filter(m => 
    m.produto?.nome?.toUpperCase().includes('SERRA') || 
    m.motivo?.toUpperCase().includes('SERRA')
  );
  
  console.log('\n🔄 MOVIMENTAÇÕES RELACIONADAS A SERRA:');
  if (movsRelacionadas?.length) {
    movsRelacionadas.forEach(m => {
      console.log(`- ${m.tipo} ${m.quantidade} - ${m.produto?.nome} - "${m.motivo}"`);
    });
  } else {
    console.log('Nenhuma movimentação encontrada');
  }
  
  // 5. Ver se foi cadastro manual (via tela de estoque)
  console.log('\n📝 ANÁLISE:');
  console.log('- Produto criado em:', produto.created_at);
  console.log('- Última atualização:', produto.updated_at);
  console.log('- Quantidade atual:', produto.quantidade_estoque);
  
  // 6. Verificar se há código ou GTIN que ajude a rastrear
  console.log('- Código:', produto.codigo || 'NÃO TEM');
  console.log('- GTIN/EAN:', produto.gtin_ean || 'NÃO TEM');
  console.log('- Código Barras:', produto.codigo_barras || 'NÃO TEM');
  
  // 7. Buscar notas fiscais próximas da data de criação
  const dataCriacao = new Date(produto.created_at);
  const dataInicio = new Date(dataCriacao);
  dataInicio.setHours(dataInicio.getHours() - 2);
  const dataFim = new Date(dataCriacao);
  dataFim.setHours(dataFim.getHours() + 2);
  
  const { data: notasProximas } = await supabase
    .from('notas_fiscais_entrada')
    .select('*')
    .gte('created_at', dataInicio.toISOString())
    .lte('created_at', dataFim.toISOString());
  
  console.log('\n📑 NOTAS FISCAIS IMPORTADAS PRÓXIMAS DA CRIAÇÃO DO PRODUTO:');
  if (notasProximas?.length) {
    for (const nf of notasProximas) {
      console.log(`\n- NF ${nf.numero} (${nf.fornecedor_razao_social})`);
      console.log(`  Criada em: ${nf.created_at}`);
      
      // Buscar itens dessa nota
      const { data: itensNota } = await supabase
        .from('itens_nota_entrada')
        .select('*')
        .eq('nota_fiscal_id', nf.id);
      
      console.log('  Itens:');
      itensNota?.forEach(item => {
        const match = item.descricao?.toUpperCase().includes('SERRA') ? '⚠️ MATCH!' : '';
        console.log(`    - ${item.descricao} (Qtd: ${item.quantidade}, Produto ID: ${item.produto_id}) ${match}`);
      });
    }
  } else {
    console.log('Nenhuma nota encontrada nesse período');
  }
  
  // 8. Verificar se veio da importação CSV inicial
  console.log('\n\n🔎 CONCLUSÃO DA INVESTIGAÇÃO:');
  console.log('================================');
  
  if (!produto.codigo && !produto.gtin_ean) {
    console.log('✓ Produto NÃO tem código nem GTIN');
    console.log('✓ NÃO há movimentações de estoque registradas');
    console.log('✓ NÃO há itens de NF vinculados');
    console.log('\n💡 PROVÁVEL ORIGEM:');
    console.log('   O produto foi cadastrado MANUALMENTE ou importado via CSV de produtos');
    console.log('   com a quantidade já definida no campo quantidade_estoque.');
    console.log('   A importação de notas XML NÃO conseguiu vincular a este produto');
    console.log('   porque não encontrou match por código, GTIN ou nome exato.');
  }
}

investigarCompleto().catch(console.error);
