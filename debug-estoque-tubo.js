const { createClient } = require('@supabase/supabase-js')

const supabase = createClient(
  'https://yhiiupamxdjmnrktkjku.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InloaWl1cGFteGRqbW5ya3Rramt1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njg0ODg2NzUsImV4cCI6MjA4NDA2NDY3NX0._QjYtYAlypJdursHe0-rPz14QOT4NNP2EklqcJ6TpkI'
)

async function investigar() {
  // 1. Buscar o produto
  const { data: produto, error: errProd } = await supabase
    .from('produtos')
    .select('*')
    .ilike('nome', '%TUBO ESGOTO 150%')
  
  if (errProd) { console.error('Erro:', errProd); return }
  
  console.log('\n=== PRODUTO ===')
  if (!produto || produto.length === 0) {
    console.log('Produto não encontrado')
    return
  }
  
  for (const p of produto) {
    console.log(`ID: ${p.id}`)
    console.log(`Nome: ${p.nome}`)
    console.log(`Código: ${p.codigo}`)
    console.log(`Estoque: ${p.quantidade_estoque} ${p.unidade}`)
    console.log(`Custo: ${p.valor_custo}`)
    console.log(`Venda: ${p.valor_venda}`)
    console.log(`Criado: ${p.created_at}`)
    console.log(`Atualizado: ${p.updated_at}`)
    console.log('')
  }
  
  const produtoId = produto[0].id
  
  // 2. Buscar movimentações de estoque
  const { data: movimentacoes, error: errMov } = await supabase
    .from('movimentacoes_estoque')
    .select('*')
    .eq('produto_id', produtoId)
    .order('created_at', { ascending: true })
  
  console.log('\n=== MOVIMENTAÇÕES DE ESTOQUE ===')
  if (!movimentacoes || movimentacoes.length === 0) {
    console.log('Nenhuma movimentação encontrada')
  } else {
    console.log(`Total: ${movimentacoes.length} movimentações`)
    let estoqueAcumulado = 0
    for (const mov of movimentacoes) {
      if (mov.tipo === 'entrada') estoqueAcumulado += mov.quantidade
      else if (mov.tipo === 'saida') estoqueAcumulado -= mov.quantidade
      else estoqueAcumulado += mov.quantidade
      
      console.log(`  [${mov.created_at}] ${mov.tipo.toUpperCase()} | Qtd: ${mov.quantidade} | Unit: ${mov.valor_unitario} | Total: ${mov.valor_total} | Motivo: ${mov.motivo} | Estoque acumulado: ${estoqueAcumulado}`)
    }
    console.log(`\nEstoque calculado: ${estoqueAcumulado}`)
    console.log(`Estoque no banco: ${produto[0].quantidade_estoque}`)
  }
  
  // 3. Buscar itens de notas fiscais de entrada com esse produto
  const { data: itensNota, error: errItens } = await supabase
    .from('itens_nota_entrada')
    .select('*, nota_fiscal:notas_fiscais_entrada(numero, chave_acesso, data_emissao, fornecedor_razao_social, data_entrada)')
    .eq('produto_id', produtoId)
    .order('created_at', { ascending: true })
  
  console.log('\n=== ITENS DE NOTAS FISCAIS ===')
  if (!itensNota || itensNota.length === 0) {
    console.log('Nenhum item de nota encontrado')
  } else {
    console.log(`Total: ${itensNota.length} itens de nota`)
    for (const item of itensNota) {
      const nf = item.nota_fiscal
      console.log(`  NF ${nf?.numero} (${nf?.data_emissao}) - Forn: ${nf?.fornecedor_razao_social}`)
      console.log(`    Qtd: ${item.quantidade} ${item.unidade} | Unit: ${item.valor_unitario} | Total: ${item.valor_total} | Ação: ${item.acao}`)
      console.log(`    Criado: ${item.created_at}`)
    }
  }

  // 4. Verificar se existem notas duplicadas com a mesma chave
  if (itensNota && itensNota.length > 0) {
    const chaves = itensNota.map(i => i.nota_fiscal?.chave_acesso).filter(Boolean)
    const chavesUnicas = [...new Set(chaves)]
    if (chaves.length !== chavesUnicas.length) {
      console.log('\n⚠️ ALERTA: Existem notas DUPLICADAS com a mesma chave de acesso!')
    }
  }
}

investigar().catch(console.error)
