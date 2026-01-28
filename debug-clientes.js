// Script de debug para verificar clientes no banco
const { createClient } = require('@supabase/supabase-js')

const supabaseUrl = 'https://yhiiupamxdjmnrktkjku.supabase.co'
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InloaWl1cGFteGRqbW5ya3Rramt1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njg0ODg2NzUsImV4cCI6MjA4NDA2NDY3NX0._QjYtYAlypJdursHe0-rPz14QOT4NNP2EklqcJ6TpkI'

const supabase = createClient(supabaseUrl, supabaseKey)

async function debug() {
  console.log('🔍 Verificando clientes no banco...\n')
  
  // Buscar todos os clientes
  const { data: clientes, error } = await supabase
    .from('clientes')
    .select('id, tipo_pessoa, nome, razao_social, cpf, cnpj')
    .order('id')
  
  if (error) {
    console.error('❌ Erro ao buscar clientes:', error.message)
    return
  }
  
  console.log(`📊 Total de clientes no banco: ${clientes.length}\n`)
  
  // Mostrar alguns exemplos
  console.log('📋 Primeiros 10 clientes:')
  clientes.slice(0, 10).forEach(c => {
    const doc = c.tipo_pessoa === 'PF' ? c.cpf : c.cnpj
    const nome = c.tipo_pessoa === 'PF' ? c.nome : c.razao_social
    console.log(`  ID ${c.id}: ${c.tipo_pessoa} - ${doc || 'SEM DOC'} - ${nome || 'SEM NOME'}`)
  })
  
  // Verificar CNPJs específicos do CSV
  const cnpjsParaVerificar = [
    '04173794000146', // 5 - COMERCIAL DE ARTEFATOS
    '09237525000543', // AAGUA COMERCIO
    '24774390000387', // AGRO FERRAGENS LUIZAO
  ]
  
  console.log('\n🔎 Verificando CNPJs específicos do CSV:')
  for (const cnpj of cnpjsParaVerificar) {
    const encontrado = clientes.find(c => {
      const cnpjLimpo = c.cnpj?.replace(/\D/g, '')
      return cnpjLimpo === cnpj
    })
    if (encontrado) {
      console.log(`  ✅ CNPJ ${cnpj} ENCONTRADO: ID ${encontrado.id} - ${encontrado.razao_social}`)
    } else {
      console.log(`  ❌ CNPJ ${cnpj} NÃO encontrado`)
    }
  }
  
  // Listar todos os CNPJs para comparação
  console.log('\n📑 Todos os CNPJs cadastrados (limpos):')
  const cnpjsCadastrados = clientes
    .filter(c => c.cnpj)
    .map(c => c.cnpj.replace(/\D/g, ''))
  console.log(cnpjsCadastrados.join(', '))
}

debug().catch(console.error)
