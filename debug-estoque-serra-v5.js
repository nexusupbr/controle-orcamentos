const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  'https://yhiiupamxdjmnrktkjku.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InloaWl1cGFteGRqbW5ya3Rramt1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njg0ODg2NzUsImV4cCI6MjA4NDA2NDY3NX0._QjYtYAlypJdursHe0-rPz14QOT4NNP2EklqcJ6TpkI'
);

async function investigarUltimaAtualizacao() {
  console.log('🔍 INVESTIGAÇÃO: O QUE ACONTECEU EM 2026-02-03 10:51?');
  console.log('=====================================================\n');
  
  // Horário da última atualização do produto
  const updateTime = '2026-02-03T10:51:57.814+00:00';
  const before = new Date(updateTime);
  before.setHours(before.getHours() - 1);
  const after = new Date(updateTime);
  after.setHours(after.getHours() + 1);
  
  // 1. Notas fiscais nesse período
  console.log('📑 NOTAS FISCAIS CRIADAS ENTRE', before.toISOString(), 'e', after.toISOString());
  const { data: notas } = await supabase
    .from('notas_fiscais_entrada')
    .select('*')
    .gte('created_at', before.toISOString())
    .lte('created_at', after.toISOString())
    .order('created_at');
  
  if (notas?.length) {
    for (const nf of notas) {
      console.log(`\n📄 NF ${nf.numero}:`);
      console.log(`   Fornecedor: ${nf.fornecedor_razao_social}`);
      console.log(`   Criada em: ${nf.created_at}`);
      console.log(`   Data entrada: ${nf.data_entrada}`);
      
      // Ver itens dessa nota
      const { data: itens } = await supabase
        .from('itens_nota_entrada')
        .select('*')
        .eq('nota_fiscal_id', nf.id);
      
      console.log('   Itens:');
      itens?.forEach(item => {
        const match = item.descricao?.toUpperCase().includes('SERRA') || 
                      item.descricao?.toUpperCase().includes('IRWIN') ? ' ⚠️ POSSÍVEL MATCH!' : '';
        console.log(`   - ${item.descricao} (Qtd: ${item.quantidade}, Produto ID: ${item.produto_id})${match}`);
      });
      
      // Verificar se o XML tem referência
      if (nf.xml_original) {
        const xml = nf.xml_original;
        if (xml.includes('888317002715') || xml.includes('003289')) {
          console.log('   🎯 XML CONTÉM O CÓDIGO OU GTIN DO PRODUTO!');
        }
        if (xml.toUpperCase().includes('SERRA') && xml.toUpperCase().includes('IRWIN')) {
          console.log('   🎯 XML CONTÉM SERRA E IRWIN!');
        }
      }
    }
  } else {
    console.log('Nenhuma nota fiscal nesse período');
  }
  
  // 2. Movimentações de estoque nesse período
  console.log('\n\n🔄 MOVIMENTAÇÕES DE ESTOQUE NESSE PERÍODO:');
  const { data: movs } = await supabase
    .from('movimentacoes_estoque')
    .select('*, produto:produtos(nome)')
    .gte('created_at', before.toISOString())
    .lte('created_at', after.toISOString());
  
  if (movs?.length) {
    movs.forEach(m => {
      console.log(`- ${m.tipo} ${m.quantidade} - ${m.produto?.nome} (${m.created_at})`);
    });
  } else {
    console.log('Nenhuma movimentação nesse período');
  }
  
  // 3. Produtos atualizados nesse período
  console.log('\n\n📦 PRODUTOS ATUALIZADOS NESSE PERÍODO:');
  const { data: prods } = await supabase
    .from('produtos')
    .select('id, nome, quantidade_estoque, updated_at')
    .gte('updated_at', before.toISOString())
    .lte('updated_at', after.toISOString())
    .order('updated_at');
  
  console.log(`Total: ${prods?.length} produtos`);
  prods?.slice(0, 30).forEach(p => {
    const match = p.nome?.toUpperCase().includes('SERRA') ? ' ⚠️ É O PRODUTO!' : '';
    console.log(`- ${p.nome} (Qtd: ${p.quantidade_estoque})${match}`);
  });
  
  // 4. Ver todos os XMLs que têm SERRA ou IRWIN
  console.log('\n\n🔎 VERIFICANDO TODOS OS XMLs DO SISTEMA...');
  const { data: todasNotas } = await supabase
    .from('notas_fiscais_entrada')
    .select('id, numero, fornecedor_razao_social, created_at, xml_original');
  
  let encontradas = 0;
  for (const nf of (todasNotas || [])) {
    if (nf.xml_original) {
      const temSerra = nf.xml_original.toUpperCase().includes('SERRA');
      const temIrwin = nf.xml_original.toUpperCase().includes('IRWIN');
      const temGtin = nf.xml_original.includes('888317002715');
      const temCodigo = nf.xml_original.includes('003289');
      
      if (temSerra || temIrwin || temGtin || temCodigo) {
        encontradas++;
        console.log(`\n✅ NF ${nf.numero} (${nf.fornecedor_razao_social})`);
        console.log(`   Criada: ${nf.created_at}`);
        console.log(`   Tem SERRA: ${temSerra}, Tem IRWIN: ${temIrwin}`);
        console.log(`   Tem GTIN: ${temGtin}, Tem Código: ${temCodigo}`);
        
        // Extrair o produto do XML
        const parser = nf.xml_original.match(/<det[^>]*>.*?<\/det>/gs);
        if (parser) {
          parser.forEach(det => {
            if (det.toUpperCase().includes('SERRA') || det.toUpperCase().includes('IRWIN') ||
                det.includes('888317002715') || det.includes('003289')) {
              // Extrair quantidade
              const qMatch = det.match(/<qCom>([^<]+)<\/qCom>/);
              const descMatch = det.match(/<xProd>([^<]+)<\/xProd>/);
              const codMatch = det.match(/<cProd>([^<]+)<\/cProd>/);
              console.log(`   📦 Produto no XML:`);
              console.log(`      Código: ${codMatch?.[1]}`);
              console.log(`      Descrição: ${descMatch?.[1]}`);
              console.log(`      Quantidade: ${qMatch?.[1]}`);
            }
          });
        }
      }
    }
  }
  
  if (encontradas === 0) {
    console.log('Nenhum XML encontrado com SERRA, IRWIN, GTIN ou código 003289');
  }
}

investigarUltimaAtualizacao().catch(console.error);
