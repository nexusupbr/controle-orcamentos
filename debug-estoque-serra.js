const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  'https://yhiiupamxdjmnrktkjku.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InloaWl1cGFteGRqbW5ya3Rramt1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njg0ODg2NzUsImV4cCI6MjA4NDA2NDY3NX0._QjYtYAlypJdursHe0-rPz14QOT4NNP2EklqcJ6TpkI'
);

async function investigar() {
  // 1. Encontrar o produto
  const { data: produtos, error: errProd } = await supabase
    .from('produtos')
    .select('*')
    .ilike('nome', '%SERRA%12X24%IRWIN%BIMETAL%');
  
  if (errProd || !produtos?.length) {
    console.log('Produto não encontrado. Tentando busca mais ampla...');
    const { data: prod2 } = await supabase
      .from('produtos')
      .select('*')
      .ilike('nome', '%SERRA%IRWIN%');
    console.log('Produtos encontrados:', prod2);
    return;
  }
  
  const produto = produtos[0];
  console.log('\n========== PRODUTO ENCONTRADO ==========');
  console.log('ID:', produto.id);
  console.log('Nome:', produto.nome);
  console.log('Estoque Atual:', produto.quantidade_estoque, produto.unidade);
  console.log('Valor Custo:', produto.valor_custo);
  console.log('Criado em:', produto.created_at);
  console.log('Atualizado em:', produto.updated_at);
  
  // 2. Buscar TODAS as movimentações de estoque
  const { data: movimentacoes, error: errMov } = await supabase
    .from('movimentacoes_estoque')
    .select('*, nota_fiscal:notas_fiscais_entrada(*)')
    .eq('produto_id', produto.id)
    .order('data_movimentacao', { ascending: true });
  
  console.log('\n========== MOVIMENTAÇÕES DE ESTOQUE ==========');
  if (!movimentacoes?.length) {
    console.log('❌ Nenhuma movimentação encontrada');
  } else {
    let saldoAcumulado = 0;
    movimentacoes.forEach((mov, i) => {
      const qtd = mov.tipo === 'entrada' ? mov.quantidade : -mov.quantidade;
      saldoAcumulado += qtd;
      console.log(`\n--- Movimentação ${i+1} ---`);
      console.log('Tipo:', mov.tipo);
      console.log('Quantidade:', mov.quantidade);
      console.log('Valor Unit:', mov.valor_unitario);
      console.log('Data:', mov.data_movimentacao);
      console.log('Motivo:', mov.motivo);
      console.log('Nota Fiscal ID:', mov.nota_fiscal_id);
      if (mov.nota_fiscal) {
        console.log('  -> NF Número:', mov.nota_fiscal.numero);
        console.log('  -> NF Chave:', mov.nota_fiscal.chave_acesso);
        console.log('  -> Fornecedor:', mov.nota_fiscal.fornecedor_razao_social);
        console.log('  -> Data Entrada:', mov.nota_fiscal.data_entrada);
      }
      console.log('Saldo Acumulado:', saldoAcumulado);
    });
  }
  
  // 3. Buscar itens de nota fiscal relacionados a este produto
  const { data: itensNF, error: errItens } = await supabase
    .from('itens_nota_entrada')
    .select('*, nota_fiscal:notas_fiscais_entrada(*)')
    .eq('produto_id', produto.id)
    .order('created_at', { ascending: true });
  
  console.log('\n========== ITENS DE NOTAS FISCAIS ==========');
  if (!itensNF?.length) {
    console.log('❌ Nenhum item de NF encontrado');
  } else {
    itensNF.forEach((item, i) => {
      console.log(`\n--- Item NF ${i+1} ---`);
      console.log('Descrição:', item.descricao);
      console.log('Quantidade:', item.quantidade, item.unidade);
      console.log('Valor Unit:', item.valor_unitario);
      console.log('Ação:', item.acao);
      console.log('Criado em:', item.created_at);
      if (item.nota_fiscal) {
        console.log('  -> NF Número:', item.nota_fiscal.numero);
        console.log('  -> NF Chave:', item.nota_fiscal.chave_acesso);
        console.log('  -> Fornecedor:', item.nota_fiscal.fornecedor_razao_social);
        console.log('  -> Data Entrada:', item.nota_fiscal.data_entrada);
      }
    });
  }
  
  // 4. Resumo final
  console.log('\n========== RESUMO ==========');
  const totalMovimentacoes = movimentacoes?.reduce((acc, mov) => {
    return acc + (mov.tipo === 'entrada' ? mov.quantidade : -mov.quantidade);
  }, 0) || 0;
  console.log('Total via Movimentações:', totalMovimentacoes);
  console.log('Estoque no Cadastro:', produto.quantidade_estoque);
  if (totalMovimentacoes !== produto.quantidade_estoque) {
    console.log('⚠️ DIVERGÊNCIA DETECTADA!');
    console.log('Diferença:', produto.quantidade_estoque - totalMovimentacoes);
  }
}

investigar().catch(console.error);
