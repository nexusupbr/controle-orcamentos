// Script para simular a lógica de detecção de duplicados
const { createClient } = require('@supabase/supabase-js')
const fs = require('fs')

const supabaseUrl = 'https://yhiiupamxdjmnrktkjku.supabase.co'
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InloaWl1cGFteGRqbW5ya3Rramt1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njg0ODg2NzUsImV4cCI6MjA4NDA2NDY3NX0._QjYtYAlypJdursHe0-rPz14QOT4NNP2EklqcJ6TpkI'

const supabase = createClient(supabaseUrl, supabaseKey)

// Função parseCSVLine (mesmo do código)
function parseCSVLine(line, delimiter = ';') {
  const result = []
  let current = ''
  let inQuotes = false
  
  for (let i = 0; i < line.length; i++) {
    const char = line[i]
    if (char === '"') {
      inQuotes = !inQuotes
    } else if (char === delimiter && !inQuotes) {
      result.push(current.replace(/"/g, '').trim())
      current = ''
    } else {
      current += char
    }
  }
  result.push(current.replace(/"/g, '').trim())
  return result
}

async function simularImportacao() {
  console.log('🔍 Simulando lógica de importação...\n')
  
  // Buscar clientes do banco
  const { data: clientes, error } = await supabase
    .from('clientes')
    .select('*')
  
  if (error) {
    console.error('❌ Erro:', error.message)
    return
  }
  
  console.log(`📊 Clientes no banco: ${clientes.length}\n`)
  
  // Ler CSV
  const csvPath = './Clientes_Fornecedores_882420_20260128.csv'
  const csvContent = fs.readFileSync(csvPath, 'utf-8')
  const lines = csvContent.split('\n').filter(line => line.trim())
  const delimiter = lines[0].includes(';') ? ';' : ','
  const dataLines = lines.slice(1)
  
  console.log(`📄 Linhas no CSV: ${dataLines.length}`)
  console.log(`📌 Delimitador detectado: "${delimiter}"\n`)
  
  // Testar cada linha
  let duplicadosDetectados = 0
  let naoDetectados = 0
  
  console.log('🧪 Testando detecção de duplicados:\n')
  
  for (let i = 0; i < Math.min(dataLines.length, 10); i++) {
    const line = dataLines[i]
    if (!line.trim()) continue
    
    const columns = parseCSVLine(line, delimiter)
    const tipoPessoa = columns[1]?.toUpperCase() === 'PJ' ? 'PJ' : 'PF'
    const documento = columns[3]?.replace(/\D/g, '') || ''
    const nomeRazao = columns[4] || ''
    
    console.log(`Linha ${i + 2}: ${tipoPessoa} - Doc: ${documento} - ${nomeRazao.substring(0, 40)}`)
    
    // Verificar duplicação (mesma lógica do código)
    let isDuplicate = false
    let duplicateReason = ''
    
    if (tipoPessoa === 'PJ' && documento) {
      const existente = clientes.find(c => c.cnpj?.replace(/\D/g, '') === documento)
      if (existente) {
        isDuplicate = true
        duplicateReason = `CNPJ já cadastrado: ${existente.razao_social || existente.nome}`
      }
    } else if (tipoPessoa === 'PF' && documento) {
      const existente = clientes.find(c => c.cpf?.replace(/\D/g, '') === documento)
      if (existente) {
        isDuplicate = true
        duplicateReason = `CPF já cadastrado: ${existente.nome}`
      }
    }
    
    if (isDuplicate) {
      console.log(`  ✅ DUPLICADO DETECTADO: ${duplicateReason}`)
      duplicadosDetectados++
    } else {
      console.log(`  ❌ NÃO DETECTADO COMO DUPLICADO`)
      naoDetectados++
      
      // Debug: mostrar o que foi parseado
      console.log(`     Colunas parseadas: [0]=${columns[0]}, [1]=${columns[1]}, [3]=${columns[3]}`)
    }
    console.log('')
  }
  
  console.log(`\n📊 Resumo: ${duplicadosDetectados} detectados, ${naoDetectados} não detectados`)
}

simularImportacao().catch(console.error)
