const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  'https://yhiiupamxdjmnrktkjku.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InloaWl1cGFteGRqbW5ya3Rramt1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njg0ODg2NzUsImV4cCI6MjA4NDA2NDY3NX0._QjYtYAlypJdursHe0-rPz14QOT4NNP2EklqcJ6TpkI'
);

async function conclusaoFinal() {
  console.log('🎯 CONCLUSÃO FINAL - ORIGEM DAS 6 UNIDADES DE SERRA IRWIN');
  console.log('==========================================================\n');
  
  const produto = {
    id: 3250,
    nome: 'SERRA 12X24 IRWIN BIMETAL',
    created_at: '2026-01-30T22:04:33.975946+00:00',
    updated_at: '2026-02-03T10:51:57.814+00:00',
    quantidade_estoque: 6
  };
  
  console.log('📦 RESUMO DO PRODUTO:');
  console.log('   ID:', produto.id);
  console.log('   Nome:', produto.nome);
  console.log('   Estoque atual:', produto.quantidade_estoque, 'UN');
  console.log('   Criado em:', new Date(produto.created_at).toLocaleString('pt-BR'));
  console.log('   Última atualização:', new Date(produto.updated_at).toLocaleString('pt-BR'));
  
  console.log('\n📊 ANÁLISE DAS EVIDÊNCIAS:');
  console.log('───────────────────────────────────────────────');
  console.log('1. ❌ NÃO há movimentações de estoque (entrada/saída)');
  console.log('2. ❌ NÃO há itens de nota fiscal vinculados');
  console.log('3. ❌ NÃO há XMLs no sistema com este produto');
  console.log('4. ❌ NÃO veio do CSV de produtos importado');
  console.log('5. ✅ O produto foi criado em 30/01/2026 junto com ~489 outros');
  console.log('   (provavelmente importação em massa do sistema anterior)');
  console.log('6. ✅ O produto foi ATUALIZADO em 03/02/2026 às 10:51');
  console.log('   (único produto atualizado nesse momento)');
  
  console.log('\n🔍 CONCLUSÃO:');
  console.log('═══════════════════════════════════════════════════════════════');
  console.log('');
  console.log('   As 6 unidades foram adicionadas de forma MANUAL.');
  console.log('');
  console.log('   ORIGEM PROVÁVEL:');
  console.log('   ────────────────');
  console.log('   1️⃣  O produto foi criado via IMPORTAÇÃO EM MASSA em 30/01/2026');
  console.log('      (junto com 488 outros produtos do sistema anterior)');
  console.log('');
  console.log('   2️⃣  A quantidade foi EDITADA MANUALMENTE em 03/02/2026 às 10:51');
  console.log('      (provavelmente na tela de Estoque → Editar Produto)');
  console.log('');
  console.log('   ⚠️  NÃO VEIO DE:');
  console.log('      • XML de nota fiscal');
  console.log('      • OFX bancário');
  console.log('      • Movimentação de estoque registrada');
  console.log('');
  console.log('═══════════════════════════════════════════════════════════════');
  
  console.log('\n\n💡 RECOMENDAÇÃO:');
  console.log('Para evitar este problema no futuro, SEMPRE use:');
  console.log('• Importação de XML para entrada de mercadorias');
  console.log('• Funcionalidade de Ajuste de Estoque para correções');
  console.log('• Nunca edite diretamente a quantidade no cadastro do produto');
  
  // Verificar se há mais produtos com esta mesma situação
  console.log('\n\n📋 VERIFICANDO OUTROS PRODUTOS NA MESMA SITUAÇÃO...');
  
  // Produtos com estoque > 0 mas sem movimentações
  const { data: prodsSemMov } = await supabase
    .from('produtos')
    .select('id, nome, quantidade_estoque')
    .gt('quantidade_estoque', 0)
    .order('quantidade_estoque', { ascending: false })
    .limit(100);
  
  let semMovimentacao = 0;
  let comMovimentacao = 0;
  
  for (const prod of (prodsSemMov || []).slice(0, 50)) {
    const { data: movs } = await supabase
      .from('movimentacoes_estoque')
      .select('id')
      .eq('produto_id', prod.id)
      .limit(1);
    
    if (!movs?.length) {
      semMovimentacao++;
    } else {
      comMovimentacao++;
    }
  }
  
  console.log(`Dos 50 primeiros produtos com estoque > 0:`);
  console.log(`• ${semMovimentacao} SEM movimentações (quantidade inserida manualmente)`);
  console.log(`• ${comMovimentacao} COM movimentações (via sistema)`);
}

conclusaoFinal().catch(console.error);
