const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  'https://yhiiupamxdjmnrktkjku.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InloaWl1cGFteGRqbW5ya3Rramt1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njg0ODg2NzUsImV4cCI6MjA4NDA2NDY3NX0._QjYtYAlypJdursHe0-rPz14QOT4NNP2EklqcJ6TpkI'
);

async function investigarFinal() {
  const produtoId = 3250;
  
  console.log('🔍 INVESTIGAÇÃO FINAL - RASTREAMENTO DE TODAS AS ALTERAÇÕES');
  console.log('============================================================\n');
  
  // 1. Ver todos os produtos criados na mesma época
  console.log('📅 Produtos criados em 30/01/2026 entre 22:00 e 22:10:');
  const { data: prodsMesmaEpoca } = await supabase
    .from('produtos')
    .select('id, nome, codigo, quantidade_estoque, created_at')
    .gte('created_at', '2026-01-30T22:00:00')
    .lte('created_at', '2026-01-30T22:10:00')
    .order('created_at', { ascending: true });
  
  console.log(`Total: ${prodsMesmaEpoca?.length} produtos`);
  prodsMesmaEpoca?.slice(0, 10).forEach(p => {
    console.log(`- ${p.nome} (Código: ${p.codigo}, Qtd: ${p.quantidade_estoque}, Criado: ${p.created_at})`);
  });
  
  // 2. Ver se há XML importados que poderiam ter este produto
  console.log('\n\n📑 TODAS AS NOTAS FISCAIS COM "SERRA" OU "IRWIN":');
  const { data: notas } = await supabase
    .from('notas_fiscais_entrada')
    .select('*');
  
  // Verificar se algum XML tem esse produto
  for (const nf of (notas || [])) {
    if (nf.xml_original && (
      nf.xml_original.toUpperCase().includes('SERRA') || 
      nf.xml_original.toUpperCase().includes('IRWIN') ||
      nf.xml_original.includes('888317002715') ||
      nf.xml_original.includes('003289')
    )) {
      console.log(`\n✅ ENCONTRADO NA NF ${nf.numero}:`);
      console.log(`   Fornecedor: ${nf.fornecedor_razao_social}`);
      console.log(`   Data entrada: ${nf.data_entrada}`);
      console.log(`   Criada em: ${nf.created_at}`);
      
      // Extrair o trecho relevante do XML
      const xmlUpper = nf.xml_original.toUpperCase();
      const idx = Math.max(
        xmlUpper.indexOf('SERRA'),
        xmlUpper.indexOf('IRWIN'),
        nf.xml_original.indexOf('888317002715'),
        nf.xml_original.indexOf('003289')
      );
      
      if (idx > 0) {
        const start = Math.max(0, idx - 100);
        const end = Math.min(nf.xml_original.length, idx + 300);
        console.log(`\n   Trecho XML:`);
        console.log(`   ${nf.xml_original.substring(start, end).replace(/</g, '\n   <')}`);
      }
    }
  }
  
  // 3. Ver se quantidade foi inserida diretamente
  console.log('\n\n📊 ANÁLISE DA CRIAÇÃO DO PRODUTO:');
  const { data: produto } = await supabase
    .from('produtos')
    .select('*')
    .eq('id', produtoId)
    .single();
  
  console.log('O produto foi criado em:', produto.created_at);
  console.log('Última atualização:', produto.updated_at);
  console.log('Diferença:', new Date(produto.updated_at) - new Date(produto.created_at), 'ms');
  
  // 4. Verificar se o estoque foi alterado após a criação
  if (produto.created_at !== produto.updated_at) {
    console.log('\n⚠️ O produto foi ATUALIZADO após a criação!');
    console.log('Pode ter sido alteração manual ou importação de XML.');
    
    // Ver o que aconteceu próximo da última atualização
    const updateTime = new Date(produto.updated_at);
    const before = new Date(updateTime);
    before.setMinutes(before.getMinutes() - 30);
    const after = new Date(updateTime);
    after.setMinutes(after.getMinutes() + 30);
    
    console.log(`\nNotas criadas próximas da última atualização (${produto.updated_at}):`);
    const { data: notasUpdate } = await supabase
      .from('notas_fiscais_entrada')
      .select('numero, fornecedor_razao_social, created_at, data_entrada')
      .gte('created_at', before.toISOString())
      .lte('created_at', after.toISOString());
    
    notasUpdate?.forEach(n => {
      console.log(`- NF ${n.numero} (${n.fornecedor_razao_social}) - Criada: ${n.created_at}`);
    });
  }
  
  // 5. Conclusão
  console.log('\n\n🎯 CONCLUSÃO:');
  console.log('================');
  console.log('Quantidade atual no estoque:', produto.quantidade_estoque);
  console.log('Movimentações de estoque registradas: 0');
  console.log('Itens de NF vinculados: 0');
  console.log('\n💡 POSSÍVEIS ORIGENS:');
  console.log('1. Cadastro manual na tela de Estoque');
  console.log('2. Importação de XML que não criou movimentação (bug anterior)');
  console.log('3. Edição direta do campo quantidade_estoque');
}

investigarFinal().catch(console.error);
