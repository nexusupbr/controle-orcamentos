import { createClient } from '@supabase/supabase-js'
import { normalizeUnidade } from './utils'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://yhiiupamxdjmnrktkjku.supabase.co'
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InloaWl1cGFteGRqbW5ya3Rramt1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njg0ODg2NzUsImV4cCI6MjA4NDA2NDY3NX0._QjYtYAlypJdursHe0-rPz14QOT4NNP2EklqcJ6TpkI'

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

// ==================== TIPOS - ESTOQUE ====================

export interface Categoria {
  id: number
  nome: string
  descricao: string | null
  cor: string
  ativo: boolean
  created_at?: string
  updated_at?: string
}

export interface ClassificacaoFiscal {
  id: number
  codigo: string
  nome: string
  descricao: string | null
}

export interface Produto {
  id: number
  codigo: string | null
  codigo_barras: string | null
  gtin_ean: string | null
  nome: string
  descricao: string | null
  unidade: string
  ncm: string | null
  cfop: string | null
  origem: string
  categoria_id: number | null
  classificacao_fiscal: string
  valor_custo: number
  valor_venda: number
  custo_medio: number
  custo_ultima_compra: number
  margem_lucro: number
  quantidade_estoque: number
  estoque_minimo: number
  estoque_maximo: number
  marca: string | null
  peso_kg: number
  tamanho: string | null
  fornecedor_id: number | null
  localizacao: string | null
  ativo: boolean
  created_at?: string
  updated_at?: string
  categoria?: Categoria
  fornecedor?: Fornecedor
}

export type ProdutoInput = Partial<Omit<Produto, 'id' | 'created_at' | 'updated_at' | 'categoria' | 'fornecedor'>>

export interface MovimentacaoEstoque {
  id: number
  produto_id: number
  tipo: 'entrada' | 'saida' | 'ajuste'
  quantidade: number
  valor_unitario: number | null
  valor_total: number | null
  nota_fiscal_id: number | null
  compra_id: number | null
  venda_id: number | null
  motivo: string | null
  observacao: string | null
  usuario_id: number | null
  data_movimentacao: string
  created_at?: string
  produto?: Produto
}

// ==================== TIPOS - FORNECEDORES ====================

export interface Fornecedor {
  id: number
  razao_social: string
  nome_fantasia: string | null
  cnpj: string | null
  cpf: string | null
  inscricao_estadual: string | null
  endereco: string | null
  numero: string | null
  complemento: string | null
  bairro: string | null
  cidade: string | null
  estado: string | null
  cep: string | null
  telefone: string | null
  email: string | null
  contato: string | null
  observacoes: string | null
  ativo: boolean
  created_at?: string
  updated_at?: string
}

export type FornecedorInput = Partial<Omit<Fornecedor, 'id' | 'created_at' | 'updated_at'>>

// ==================== TIPOS - CLIENTES ====================

export interface EnderecoCliente {
  id: number
  cliente_id: number
  tipo: 'padrao' | 'cobranca' | 'entrega' | 'retirada'
  descricao: string | null
  cep: string | null
  endereco: string | null
  numero: string | null
  complemento: string | null
  bairro: string | null
  cidade: string | null
  estado: string | null
  principal: boolean
  ativo: boolean
  created_at?: string
}

export interface Cliente {
  id: number
  tipo_pessoa: 'PF' | 'PJ'
  tipo_cadastro: 'cliente' | 'fornecedor' | 'ambos'
  nome: string | null
  cpf: string | null
  rg: string | null
  data_nascimento: string | null
  produtor_rural: boolean
  inscricao_produtor_rural: string | null
  razao_social: string | null
  nome_fantasia: string | null
  cnpj: string | null
  inscricao_estadual: string | null
  inscricao_municipal: string | null
  cep: string | null
  endereco: string | null
  numero: string | null
  complemento: string | null
  bairro: string | null
  cidade: string | null
  estado: string | null
  telefone: string | null
  celular: string | null
  email: string | null
  contribuinte_icms: boolean
  regime_tributario: string | null
  anexos: any[]
  observacoes: string | null
  limite_credito: number
  saldo_devedor: number
  ativo: boolean
  created_at?: string
  updated_at?: string
  enderecos?: EnderecoCliente[]
}

export type ClienteInput = Partial<Omit<Cliente, 'id' | 'created_at' | 'updated_at'>>

// ==================== TIPOS - NOTAS FISCAIS ====================

export interface NotaFiscalEntrada {
  id: number
  numero: string | null
  serie: string | null
  chave_acesso: string | null
  data_emissao: string | null
  data_entrada: string
  fornecedor_id: number | null
  fornecedor_cnpj: string | null
  fornecedor_razao_social: string | null
  valor_produtos: number
  valor_frete: number
  valor_seguro: number
  valor_desconto: number
  valor_ipi: number
  valor_icms: number
  valor_pis: number
  valor_cofins: number
  valor_total: number
  forma_pagamento: string | null
  lancado_caixa: boolean
  caixa_id: number | null
  xml_original: string | null
  status: string
  observacoes: string | null
  created_at?: string
  updated_at?: string
  fornecedor?: Fornecedor
  itens?: ItemNotaEntrada[]
}

export interface ItemNotaEntrada {
  id: number
  nota_fiscal_id: number
  produto_id: number | null
  codigo_produto_nf: string | null
  descricao: string | null
  ncm: string | null
  cfop: string | null
  unidade: string | null
  quantidade: number
  valor_unitario: number
  valor_total: number
  valor_desconto: number
  acao: 'cadastrado' | 'existente' | 'substituido' | 'ignorado'
  produto_substituido_id: number | null
  created_at?: string
  produto?: Produto
}

// ==================== TIPOS - NOTAS FISCAIS DE SAÍDA ====================

export interface NotaFiscalSaida {
  id: number
  referencia: string
  venda_id: number | null
  tipo: 'nfe' | 'nfce' | 'nfse'
  numero: string | null
  serie: string | null
  chave_acesso: string | null
  status: 'pendente' | 'processando' | 'processando_autorizacao' | 'autorizado' | 'cancelada' | 'rejeitada' | 'denegada' | 'erro_autorizacao'
  status_sefaz: string | null
  mensagem_sefaz: string | null
  destinatario_nome: string | null
  destinatario_documento: string | null
  destinatario_email: string | null
  valor_total: number
  valor_produtos: number
  valor_desconto: number
  valor_frete: number
  url_xml: string | null
  url_danfe: string | null
  url_xml_cancelamento: string | null
  carta_correcao_numero: number | null
  carta_correcao_texto: string | null
  url_carta_correcao_xml: string | null
  url_carta_correcao_pdf: string | null
  cancelada_em: string | null
  cancelamento_justificativa: string | null
  cancelamento_protocolo: string | null
  dados_envio: any | null
  dados_retorno: any | null
  emitida_em: string | null
  ambiente: string | null
  created_at?: string
  updated_at?: string
  // Campos de join (virtuais)
  venda?: Venda
  cliente?: Cliente
}

// ==================== TIPOS - FINANCEIRO ====================

export interface CategoriaFinanceira {
  id: number
  nome: string
  tipo: 'despesa' | 'receita' | 'aplicacao'
  cor?: string | null
  com_nota_fiscal: boolean
  ativo: boolean
  created_at?: string
}

export interface ContaBancaria {
  id: number
  nome: string
  banco: string | null
  agencia: string | null
  conta: string | null
  tipo: 'corrente' | 'poupanca' | 'caixa'
  cnpj: string | null
  saldo_inicial: number
  saldo_atual: number
  ativo: boolean
  created_at?: string
  updated_at?: string
}

export interface LancamentoFinanceiro {
  id: number
  tipo: 'receita' | 'despesa' | 'transferencia' | 'entrada' | 'saida'
  categoria_id: number | null
  subcategoria: string | null
  com_nota_fiscal: boolean
  valor: number
  data_lancamento: string
  data_competencia: string | null
  conta_id: number | null
  forma_pagamento: 'dinheiro' | 'pix' | 'debito' | 'credito' | 'boleto' | 'transferencia' | 'cheque' | null
  cliente_id: number | null
  fornecedor_id: number | null
  nota_fiscal_entrada_id: number | null
  nota_fiscal_saida_id: number | null
  venda_id: number | null
  orcamento_id: number | null
  cte_id: number | null
  descricao: string | null
  observacao: string | null
  ofx_fitid: string | null
  ofx_data_importacao: string | null
  conciliado: boolean
  usuario_id: number | null
  created_at?: string
  updated_at?: string
  // Campos de agrupamento de duplicados
  grupo_id?: string | null          // UUID para identificar o grupo
  grupo_principal_id?: number | null // ID do lançamento principal do grupo
  data_nota?: string | null         // Data do documento fiscal (DD/MM/AAAA)
  // Campos virtuais (calculados)
  grupo_total_itens?: number        // Quantidade de itens no grupo (view)
  grupo_possui_nf?: boolean         // Se algum item do grupo tem NF (view)
  is_grupo_principal?: boolean      // Se este é o lançamento principal (virtual)
  itens_grupo?: LancamentoFinanceiro[] // Itens agrupados (carregado dinamicamente)
  // Campos de join (virtuais)
  categoria?: CategoriaFinanceira
  conta?: ContaBancaria
  cliente?: Cliente
  fornecedor?: Fornecedor
  // Aliases para compatibilidade de leitura (virtuais, não existem no banco)
  data?: string
  conta_bancaria_id?: number | null
  numero_nf?: string | null
  observacoes?: string | null
}

export type LancamentoFinanceiroInput = Partial<Omit<LancamentoFinanceiro, 'id' | 'created_at' | 'updated_at' | 'categoria' | 'conta' | 'cliente' | 'fornecedor'>>

export interface ContaPagar {
  id: number
  fornecedor_id: number | null
  descricao: string
  valor: number
  valor_pago: number
  data_emissao: string
  data_vencimento: string
  data_pagamento: string | null
  nota_fiscal_id: number | null
  cte_id: number | null
  boleto_codigo: string | null
  status: 'pendente' | 'pago' | 'parcial' | 'vencido' | 'cancelado'
  forma_pagamento: string | null
  categoria_id: number | null
  conta_bancaria_id: number | null
  numero_documento: string | null
  parcela_atual: number | null
  total_parcelas: number | null
  com_nota_fiscal: boolean
  observacoes: string | null
  created_at?: string
  updated_at?: string
  fornecedor?: Fornecedor
  categoria?: CategoriaFinanceira
}

export interface ContaReceber {
  id: number
  cliente_id: number | null
  descricao: string
  valor: number
  valor_recebido: number
  data_emissao: string
  data_vencimento: string
  data_recebimento: string | null
  nota_fiscal_id: number | null
  venda_id: number | null
  orcamento_id: number | null
  status: 'pendente' | 'recebido' | 'parcial' | 'vencido' | 'cancelado'
  forma_pagamento: string | null
  categoria_id: number | null
  conta_bancaria_id: number | null
  numero_documento: string | null
  parcela_atual: number | null
  total_parcelas: number | null
  observacoes: string | null
  created_at?: string
  updated_at?: string
  cliente?: Cliente
}

// ==================== TIPOS - VENDAS ====================

export interface Venda {
  id: number
  numero: string | null
  cliente_id: number | null
  orcamento_id: number | null
  obra_id: number | null
  data_venda: string
  valor_produtos: number
  valor_servicos: number
  valor_desconto: number
  valor_frete: number
  valor_total: number
  custo_total: number
  lucro_bruto: number
  margem_lucro: number
  nota_fiscal_emitida: boolean
  numero_nf: string | null
  chave_nf: string | null
  valor_impostos: number
  status: string
  observacoes: string | null
  created_at?: string
  updated_at?: string
  cliente?: Cliente
  itens?: ItemVenda[]
}

export interface ItemVenda {
  id: number
  venda_id: number
  produto_id: number | null
  tipo: 'produto' | 'servico'
  descricao: string | null
  quantidade: number
  valor_unitario: number
  valor_desconto: number
  valor_total: number
  custo_unitario: number
  created_at?: string
  produto?: Produto
}

export interface CTeFrete {
  id: number
  numero: string | null
  chave_acesso: string | null
  data_emissao: string | null
  transportadora_cnpj: string | null
  transportadora_nome: string | null
  valor_frete: number
  valor_icms: number
  nota_fiscal_id: number | null
  lancado_caixa: boolean
  caixa_id: number | null
  observacoes: string | null
  created_at?: string
}

// ==================== FUNÇÕES - CATEGORIAS ====================

export async function fetchCategorias(): Promise<Categoria[]> {
  const { data, error } = await supabase
    .from('categorias')
    .select('*')
    .order('nome')

  if (error) throw error
  return data || []
}

export async function createCategoria(categoria: Partial<Categoria>): Promise<Categoria> {
  const { data, error } = await supabase
    .from('categorias')
    .insert([categoria])
    .select()
    .single()

  if (error) throw new Error(error.message)
  return data
}

export async function updateCategoria(id: number, updates: Partial<Categoria>): Promise<Categoria> {
  const { data, error } = await supabase
    .from('categorias')
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select()
    .single()

  if (error) throw new Error(error.message)
  return data
}

export async function deleteCategoria(id: number): Promise<void> {
  const { error } = await supabase
    .from('categorias')
    .delete()
    .eq('id', id)

  if (error) throw new Error(error.message)
}

// ==================== FUNÇÕES - CLASSIFICAÇÕES FISCAIS ====================

export async function fetchClassificacoesFiscais(): Promise<ClassificacaoFiscal[]> {
  const { data, error } = await supabase
    .from('classificacoes_fiscais')
    .select('*')
    .order('codigo')

  if (error) throw error
  return data || []
}

// ==================== FUNÇÕES - PRODUTOS ====================

export async function fetchProdutos(): Promise<Produto[]> {
  const { data, error } = await supabase
    .from('produtos')
    .select(`
      *,
      categoria:categorias(*),
      fornecedor:fornecedores(*)
    `)
    .order('nome')

  if (error) throw error
  return data || []
}

export async function fetchProdutoById(id: number): Promise<Produto | null> {
  const { data, error } = await supabase
    .from('produtos')
    .select(`
      *,
      categoria:categorias(*),
      fornecedor:fornecedores(*)
    `)
    .eq('id', id)
    .single()

  if (error) return null
  return data
}

export async function fetchProdutoByNome(nome: string): Promise<Produto | null> {
  const { data, error } = await supabase
    .from('produtos')
    .select('*')
    .ilike('nome', nome)
    .single()

  if (error) return null
  return data
}

export async function fetchProdutoByCodigo(codigo: string): Promise<Produto | null> {
  const { data, error } = await supabase
    .from('produtos')
    .select('*')
    .eq('codigo', codigo)
    .single()

  if (error) return null
  return data
}

// Busca de produtos para seleção (substituição em importação XML)
export interface ProdutoSearchResult {
  id: number
  nome: string
  codigo: string | null
  codigo_barras: string | null
  gtin_ean: string | null
  valor_custo: number
  valor_venda: number
  quantidade_estoque: number
  unidade: string
}

export async function searchProdutos(query: string, limit: number = 15): Promise<ProdutoSearchResult[]> {
  const q = query.trim()
  console.log('[searchProdutos] Query recebida:', q)
  
  if (!q || q.length < 2) {
    console.log('[searchProdutos] Query muito curta, retornando vazio')
    return []
  }

  // Construir busca OR para todos os campos relevantes
  // Usar wildcard %q% para busca parcial
  const orFilter = `nome.ilike.%${q}%,codigo.ilike.%${q}%,codigo_barras.ilike.%${q}%,gtin_ean.ilike.%${q}%`
  
  console.log('[searchProdutos] Filtro OR:', orFilter)

  const { data, error } = await supabase
    .from('produtos')
    .select('id, nome, codigo, codigo_barras, gtin_ean, valor_custo, valor_venda, quantidade_estoque, unidade')
    .or(orFilter)
    .order('nome')
    .limit(limit)

  if (error) {
    console.error('[searchProdutos] Erro Supabase:', error)
    return []
  }

  console.log('[searchProdutos] Resultados encontrados:', data?.length || 0)
  if (data && data.length > 0) {
    console.log('[searchProdutos] Primeiro resultado:', data[0].nome)
  }

  return data || []
}

// ==================== FUNÇÕES PARA IMPORTAÇÃO XML SIMPLIFICADA ====================

/**
 * Interface do item da NF para importação
 */
export interface ItemNFImportacao {
  codigo: string           // cProd do XML
  descricao: string        // xProd do XML
  ncm: string
  cfop: string
  unidade: string
  quantidade: number
  valorUnitario: number    // vUnCom do XML
  valorTotal: number
  gtin?: string            // cEAN do XML (código de barras)
}

/**
 * Resultado do upsert de produto
 */
export interface UpsertProdutoResult {
  produtoId: number
  acao: 'criado' | 'atualizado'
  produto: Produto
}

/**
 * Arredonda para 2 casas decimais (evita erros de ponto flutuante)
 */
function round2(value: number): number {
  return Math.round(value * 100) / 100
}

/**
 * Busca produto existente por prioridade:
 * 1. GTIN/EAN (código de barras do XML)
 * 2. Código interno (cProd)
 * 3. Nome exato (ilike)
 */
export async function findProdutoExistente(item: ItemNFImportacao): Promise<Produto | null> {
  // Match APENAS por nome exato (case-insensitive)
  if (item.descricao && item.descricao.trim()) {
    const { data: byNome } = await supabase
      .from('produtos')
      .select('*')
      .ilike('nome', item.descricao.trim())
      .limit(1)
      .single()
    
    if (byNome) {
      console.log('[findProdutoExistente] Encontrado por nome exato:', byNome.nome)
      return byNome
    }
  }

  console.log('[findProdutoExistente] Produto não encontrado:', item.descricao)
  return null
}

/**
 * Cria ou atualiza produto baseado no item da NF
 * - Se existir: atualiza custo e opcionalmente preço de venda
 * - Se não existir: cria novo produto
 * - Sempre incrementa estoque via movimentação (separado)
 */
export async function upsertProdutoPorImportacao(
  item: ItemNFImportacao,
  atualizarVenda: boolean,
  fornecedorId?: number
): Promise<UpsertProdutoResult> {
  const existente = await findProdutoExistente(item)
  const novoCusto = round2(item.valorUnitario)
  
  if (existente) {
    // === ATUALIZAR PRODUTO EXISTENTE ===
    const updateData: Partial<Produto> = {
      valor_custo: novoCusto,
      custo_ultima_compra: novoCusto,
      custo_medio: novoCusto,
    }
    
    // Se tem código no XML e o produto não tem, atualizar
    if (item.codigo && !existente.codigo) {
      updateData.codigo = item.codigo
    }
    
    // Se atualizarVenda = true, recalcula preço de venda MANTENDO a margem existente
    if (atualizarVenda) {
      const margemExistente = existente.margem_lucro || 0
      // Recalcular preço de venda: custo * (1 + margem/100)
      const novoPrecoVenda = round2(novoCusto * (1 + margemExistente / 100))
      updateData.valor_venda = novoPrecoVenda
      // Manter a margem existente (não zerar!)
    }
    
    console.log('[upsertProdutoPorImportacao] Atualizando produto:', {
      id: existente.id,
      nome: existente.nome,
      custoAnterior: existente.valor_custo,
      novoCusto,
      margemExistente: existente.margem_lucro,
      novoPrecoVenda: updateData.valor_venda,
      atualizarVenda
    })
    
    const { data: updated, error } = await supabase
      .from('produtos')
      .update({ ...updateData, updated_at: new Date().toISOString() })
      .eq('id', existente.id)
      .select()
      .single()
    
    if (error) throw new Error(`Erro ao atualizar produto: ${error.message}`)
    
    return {
      produtoId: existente.id,
      acao: 'atualizado',
      produto: updated
    }
  } else {
    // === CRIAR NOVO PRODUTO ===
    const novoProduto: ProdutoInput = {
      codigo: item.codigo || null,
      nome: item.descricao,
      ncm: item.ncm || null,
      cfop: item.cfop || null,
      unidade: normalizeUnidade(item.unidade),
      valor_custo: novoCusto,
      valor_venda: atualizarVenda ? novoCusto : novoCusto, // Sempre inicia igual ao custo
      custo_medio: novoCusto,
      custo_ultima_compra: novoCusto,
      margem_lucro: 0,
      quantidade_estoque: 0, // Estoque será incrementado pela movimentação
      fornecedor_id: fornecedorId,
      classificacao_fiscal: '07',
      ativo: true
    }
    
    // Se tem GTIN válido, salvar
    if (item.gtin && item.gtin.length > 3 && !/^0+$/.test(item.gtin)) {
      novoProduto.gtin_ean = item.gtin
      novoProduto.codigo_barras = item.gtin
    }
    
    console.log('[upsertProdutoPorImportacao] Criando novo produto:', novoProduto)
    
    const { data: created, error } = await supabase
      .from('produtos')
      .insert([novoProduto])
      .select()
      .single()
    
    if (error) throw new Error(`Erro ao criar produto: ${error.message}`)
    
    return {
      produtoId: created.id,
      acao: 'criado',
      produto: created
    }
  }
}

/**
 * Incrementa estoque do produto
 */
export async function incrementarEstoqueProduto(produtoId: number, quantidade: number): Promise<void> {
  const { data: produto, error: fetchError } = await supabase
    .from('produtos')
    .select('quantidade_estoque')
    .eq('id', produtoId)
    .single()
  
  if (fetchError) throw new Error(`Erro ao buscar estoque: ${fetchError.message}`)
  
  const novoEstoque = round2((produto?.quantidade_estoque || 0) + quantidade)
  
  const { error: updateError } = await supabase
    .from('produtos')
    .update({ quantidade_estoque: novoEstoque, updated_at: new Date().toISOString() })
    .eq('id', produtoId)
  
  if (updateError) throw new Error(`Erro ao atualizar estoque: ${updateError.message}`)
  
  console.log('[incrementarEstoqueProduto] Estoque atualizado:', { produtoId, quantidade, novoEstoque })
}

export async function checkProdutoDuplicado(nome: string, excludeId?: number): Promise<boolean> {
  let query = supabase
    .from('produtos')
    .select('id')
    .ilike('nome', nome)

  if (excludeId) {
    query = query.neq('id', excludeId)
  }

  const { data } = await query
  return (data?.length || 0) > 0
}

export async function createProduto(produto: ProdutoInput): Promise<Produto> {
  if (produto.nome) {
    const duplicado = await checkProdutoDuplicado(produto.nome)
    if (duplicado) {
      throw new Error('Já existe um produto com este nome')
    }
  }
  
  // Normalizar unidade antes de salvar
  const produtoNormalizado = {
    ...produto,
    unidade: normalizeUnidade(produto.unidade)
  }

  const { data, error } = await supabase
    .from('produtos')
    .insert([produtoNormalizado])
    .select()
    .single()

  if (error) throw new Error(error.message)
  return data
}

export async function updateProduto(id: number, updates: ProdutoInput): Promise<Produto> {
  if (updates.nome) {
    const duplicado = await checkProdutoDuplicado(updates.nome, id)
    if (duplicado) {
      throw new Error('Já existe um produto com este nome')
    }
  }
  
  // Normalizar unidade se presente no update
  const updatesNormalizado = updates.unidade 
    ? { ...updates, unidade: normalizeUnidade(updates.unidade) }
    : updates

  const { data, error } = await supabase
    .from('produtos')
    .update({ ...updatesNormalizado, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select()
    .single()

  if (error) throw new Error(error.message)
  return data
}

export async function deleteProduto(id: number): Promise<void> {
  // Primeiro verificar se há movimentações vinculadas
  const { data: movimentacoes } = await supabase
    .from('movimentacoes_estoque')
    .select('id')
    .eq('produto_id', id)
    .limit(1)

  if (movimentacoes && movimentacoes.length > 0) {
    // Se houver movimentações, deletar também
    await supabase.from('movimentacoes_estoque').delete().eq('produto_id', id)
  }

  const { error } = await supabase
    .from('produtos')
    .delete()
    .eq('id', id)

  if (error) throw new Error(error.message)
}

// ==================== FUNÇÕES - MOVIMENTAÇÕES DE ESTOQUE ====================

export async function fetchMovimentacoesEstoque(produtoId?: number): Promise<MovimentacaoEstoque[]> {
  let query = supabase
    .from('movimentacoes_estoque')
    .select(`
      *,
      produto:produtos(id, nome, codigo)
    `)
    .order('data_movimentacao', { ascending: false })

  if (produtoId) {
    query = query.eq('produto_id', produtoId)
  }

  const { data, error } = await query
  if (error) throw error
  return data || []
}

export async function createMovimentacaoEstoque(movimentacao: Partial<MovimentacaoEstoque>): Promise<MovimentacaoEstoque> {
  const { data, error } = await supabase
    .from('movimentacoes_estoque')
    .insert([movimentacao])
    .select()
    .single()

  if (error) throw new Error(error.message)
  return data
}

// ==================== FUNÇÕES - FORNECEDORES ====================

export async function fetchFornecedores(): Promise<Fornecedor[]> {
  const { data, error } = await supabase
    .from('fornecedores')
    .select('*')
    .order('razao_social')

  if (error) throw error
  return data || []
}

export async function fetchFornecedorByCnpj(cnpj: string): Promise<Fornecedor | null> {
  const cnpjLimpo = cnpj.replace(/\D/g, '')
  const { data, error } = await supabase
    .from('fornecedores')
    .select('*')
    .eq('cnpj', cnpjLimpo)
    .single()

  if (error) return null
  return data
}

export async function fetchFornecedorByCpf(cpf: string): Promise<Fornecedor | null> {
  const cpfLimpo = cpf.replace(/\D/g, '')
  const { data, error } = await supabase
    .from('fornecedores')
    .select('*')
    .eq('cpf', cpfLimpo)
    .single()

  if (error) return null
  return data
}

export async function createFornecedor(fornecedor: FornecedorInput): Promise<Fornecedor> {
  if (fornecedor.cnpj) {
    fornecedor.cnpj = fornecedor.cnpj.replace(/\D/g, '')
  }

  const { data, error } = await supabase
    .from('fornecedores')
    .insert([fornecedor])
    .select()
    .single()

  if (error) throw new Error(error.message)
  return data
}

export async function updateFornecedor(id: number, updates: FornecedorInput): Promise<Fornecedor> {
  if (updates.cnpj) {
    updates.cnpj = updates.cnpj.replace(/\D/g, '')
  }

  const { data, error } = await supabase
    .from('fornecedores')
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select()
    .single()

  if (error) throw new Error(error.message)
  return data
}

export async function deleteFornecedor(id: number): Promise<void> {
  const { error } = await supabase
    .from('fornecedores')
    .delete()
    .eq('id', id)

  if (error) throw new Error(error.message)
}

// ==================== FUNÇÕES - CLIENTES ====================

export async function fetchClientes(tipoCadastro?: 'cliente' | 'fornecedor' | 'ambos'): Promise<Cliente[]> {
  let query = supabase
    .from('clientes')
    .select('*')
  
  if (tipoCadastro) {
    if (tipoCadastro === 'cliente') {
      query = query.in('tipo_cadastro', ['cliente', 'ambos'])
    } else if (tipoCadastro === 'fornecedor') {
      query = query.in('tipo_cadastro', ['fornecedor', 'ambos'])
    }
  }
  
  const { data, error } = await query.order('nome')

  if (error) throw error
  return data || []
}

export async function fetchClienteById(id: number): Promise<Cliente | null> {
  const { data, error } = await supabase
    .from('clientes')
    .select('*, enderecos:enderecos_cliente(*)')
    .eq('id', id)
    .single()

  if (error) return null
  return data
}

export async function fetchClienteByCnpj(cnpj: string): Promise<Cliente | null> {
  const cnpjLimpo = cnpj.replace(/\D/g, '')
  const { data, error } = await supabase
    .from('clientes')
    .select('*')
    .eq('cnpj', cnpjLimpo)
    .single()

  if (error) return null
  return data
}

export async function createCliente(cliente: ClienteInput): Promise<Cliente> {
  if (cliente.cnpj) cliente.cnpj = cliente.cnpj.replace(/\D/g, '')
  if (cliente.cpf) cliente.cpf = cliente.cpf.replace(/\D/g, '')

  const { data, error } = await supabase
    .from('clientes')
    .insert([cliente])
    .select()
    .single()

  if (error) throw new Error(error.message)
  return data
}

export async function updateCliente(id: number, updates: ClienteInput): Promise<Cliente> {
  if (updates.cnpj) updates.cnpj = updates.cnpj.replace(/\D/g, '')
  if (updates.cpf) updates.cpf = updates.cpf.replace(/\D/g, '')

  const { data, error } = await supabase
    .from('clientes')
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select()
    .single()

  if (error) throw new Error(error.message)
  return data
}

export async function deleteCliente(id: number): Promise<void> {
  // Primeiro deletar endereços vinculados
  await supabase.from('enderecos_cliente').delete().eq('cliente_id', id)

  const { error } = await supabase
    .from('clientes')
    .delete()
    .eq('id', id)

  if (error) throw new Error(error.message)
}

// ==================== FUNÇÕES - ENDEREÇOS CLIENTES ====================

export async function fetchEnderecosCliente(clienteId: number): Promise<EnderecoCliente[]> {
  const { data, error } = await supabase
    .from('enderecos_cliente')
    .select('*')
    .eq('cliente_id', clienteId)
    .order('principal', { ascending: false })

  if (error) throw error
  return data || []
}

export async function createEnderecoCliente(endereco: Partial<EnderecoCliente>): Promise<EnderecoCliente> {
  const { data, error } = await supabase
    .from('enderecos_cliente')
    .insert([endereco])
    .select()
    .single()

  if (error) throw new Error(error.message)
  return data
}

export async function updateEnderecoCliente(id: number, updates: Partial<EnderecoCliente>): Promise<EnderecoCliente> {
  const { data, error } = await supabase
    .from('enderecos_cliente')
    .update(updates)
    .eq('id', id)
    .select()
    .single()

  if (error) throw new Error(error.message)
  return data
}

export async function deleteEnderecoCliente(id: number): Promise<void> {
  const { error } = await supabase
    .from('enderecos_cliente')
    .delete()
    .eq('id', id)

  if (error) throw new Error(error.message)
}

// Consulta CNPJ na Receita Federal
export async function consultarCNPJ(cnpj: string): Promise<any> {
  const cnpjLimpo = cnpj.replace(/\D/g, '')
  try {
    const response = await fetch(`https://brasilapi.com.br/api/cnpj/v1/${cnpjLimpo}`)
    if (!response.ok) throw new Error('CNPJ não encontrado')
    return await response.json()
  } catch (error) {
    throw new Error('Erro ao consultar CNPJ')
  }
}

// ==================== FUNÇÕES - NOTAS FISCAIS ====================

export async function fetchNotasFiscaisEntrada(): Promise<NotaFiscalEntrada[]> {
  const { data, error } = await supabase
    .from('notas_fiscais_entrada')
    .select(`
      *,
      fornecedor:fornecedores(*)
    `)
    .order('data_entrada', { ascending: false })

  if (error) throw error
  return data || []
}

// ==================== FUNÇÕES - NOTAS FISCAIS DE SAÍDA ====================

export async function fetchNotasFiscaisSaida(): Promise<NotaFiscalSaida[]> {
  const { data, error } = await supabase
    .from('notas_fiscais')
    .select(`
      *,
      venda:vendas!notas_fiscais_venda_id_fkey(
        id,
        numero,
        data_venda,
        valor_total,
        cliente:clientes(id, nome, razao_social, cnpj, cpf)
      )
    `)
    .order('created_at', { ascending: false })

  if (error) throw error
  
  // Mapear dados para estrutura esperada
  return (data || []).map((nf: any) => ({
    ...nf,
    cliente: nf.venda?.cliente || null
  }))
}

export async function fetchNotaFiscalSaidaByVendaId(vendaId: number): Promise<NotaFiscalSaida | null> {
  const { data, error } = await supabase
    .from('notas_fiscais')
    .select(`
      *,
      venda:vendas!notas_fiscais_venda_id_fkey(
        id,
        numero,
        data_venda,
        valor_total,
        cliente:clientes(id, nome, razao_social, cnpj, cpf)
      )
    `)
    .eq('venda_id', vendaId)
    .neq('status', 'cancelada')
    .order('created_at', { ascending: false })
    .limit(1)
    .single()

  if (error) return null
  return data
}

export async function fetchNotaFiscalByChave(chave: string): Promise<NotaFiscalEntrada | null> {
  const { data, error } = await supabase
    .from('notas_fiscais_entrada')
    .select('*')
    .eq('chave_acesso', chave)
    .single()

  if (error) return null
  return data
}

// createNotaFiscalEntrada foi movida para o final do arquivo com suporte a itens

export async function createItemNotaEntrada(item: Partial<ItemNotaEntrada>): Promise<ItemNotaEntrada> {
  const { data, error } = await supabase
    .from('itens_nota_entrada')
    .insert([item])
    .select()
    .single()

  if (error) throw new Error(error.message)
  return data
}

export async function fetchItensNotaEntrada(notaId: number): Promise<ItemNotaEntrada[]> {
  const { data, error } = await supabase
    .from('itens_nota_entrada')
    .select(`
      *,
      produto:produtos!itens_nota_entrada_produto_id_fkey(id, nome, codigo)
    `)
    .eq('nota_fiscal_id', notaId)

  if (error) throw error
  return data || []
}

// ==================== FUNÇÕES - FINANCEIRO ====================

export async function fetchCategoriasFinanceiras(tipo?: string): Promise<CategoriaFinanceira[]> {
  let query = supabase
    .from('categorias_financeiras')
    .select('*')
    .order('nome')

  if (tipo) {
    query = query.eq('tipo', tipo)
  }

  const { data, error } = await query
  if (error) throw error
  return data || []
}

export async function createCategoriaFinanceira(categoria: Partial<CategoriaFinanceira>): Promise<CategoriaFinanceira> {
  const { data, error } = await supabase
    .from('categorias_financeiras')
    .insert([categoria])
    .select()
    .single()

  if (error) throw new Error(error.message)
  return data
}

export async function updateCategoriaFinanceira(id: number, updates: Partial<CategoriaFinanceira>): Promise<CategoriaFinanceira> {
  const { data, error } = await supabase
    .from('categorias_financeiras')
    .update(updates)
    .eq('id', id)
    .select()
    .single()

  if (error) throw new Error(error.message)
  return data
}

export async function deleteCategoriaFinanceira(id: number): Promise<{ success: boolean; message: string }> {
  // Verificar se está sendo usada em lançamentos financeiros
  const { data: lancamentos } = await supabase
    .from('lancamentos_financeiros')
    .select('id')
    .eq('categoria_id', id)
    .limit(1)

  if (lancamentos && lancamentos.length > 0) {
    return { 
      success: false, 
      message: 'Esta categoria está sendo usada em lançamentos financeiros e não pode ser excluída.' 
    }
  }

  // Verificar se está sendo usada em contas a pagar
  const { data: contasPagar } = await supabase
    .from('contas_pagar')
    .select('id')
    .eq('categoria_id', id)
    .limit(1)

  if (contasPagar && contasPagar.length > 0) {
    return { 
      success: false, 
      message: 'Esta categoria está sendo usada em contas a pagar e não pode ser excluída.' 
    }
  }

  // Verificar se está sendo usada em contas a receber (se existir)
  try {
    const { data: contasReceber } = await supabase
      .from('contas_receber')
      .select('id')
      .eq('categoria_id', id)
      .limit(1)

    if (contasReceber && contasReceber.length > 0) {
      return { 
        success: false, 
        message: 'Esta categoria está sendo usada em contas a receber e não pode ser excluída.' 
      }
    }
  } catch {
    // Tabela pode não existir, ignorar
  }

  // Excluir categoria
  const { error } = await supabase
    .from('categorias_financeiras')
    .delete()
    .eq('id', id)

  if (error) {
    return { success: false, message: `Erro ao excluir: ${error.message}` }
  }

  return { success: true, message: 'Categoria excluída com sucesso.' }
}

export async function fetchContasBancarias(): Promise<ContaBancaria[]> {
  const { data, error } = await supabase
    .from('contas_bancarias')
    .select('*')
    .order('nome')

  if (error) throw error
  return data || []
}

export async function createContaBancaria(conta: Partial<ContaBancaria>): Promise<ContaBancaria> {
  const { data, error } = await supabase
    .from('contas_bancarias')
    .insert([conta])
    .select()
    .single()

  if (error) throw new Error(error.message)
  return data
}

export async function updateContaBancaria(id: number, updates: Partial<ContaBancaria>): Promise<ContaBancaria> {
  const { data, error } = await supabase
    .from('contas_bancarias')
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select()
    .single()

  if (error) throw new Error(error.message)
  return data
}

// ==================== FUNÇÕES - LANÇAMENTOS FINANCEIROS ====================

export async function fetchLancamentosFinanceiros(filtros?: {
  dataInicio?: string
  dataFim?: string
  tipo?: string
  contaId?: number
  categoriaId?: number
}): Promise<LancamentoFinanceiro[]> {
  let query = supabase
    .from('lancamentos_financeiros')
    .select(`
      *,
      categoria:categorias_financeiras(*),
      conta:contas_bancarias(*),
      cliente:clientes(*),
      fornecedor:fornecedores(*)
    `)
    .order('data_lancamento', { ascending: false })

  if (filtros?.dataInicio) {
    query = query.gte('data_lancamento', filtros.dataInicio)
  }
  if (filtros?.dataFim) {
    query = query.lte('data_lancamento', filtros.dataFim)
  }
  if (filtros?.tipo) {
    query = query.eq('tipo', filtros.tipo)
  }
  if (filtros?.contaId) {
    query = query.eq('conta_id', filtros.contaId)
  }
  if (filtros?.categoriaId) {
    query = query.eq('categoria_id', filtros.categoriaId)
  }

  const { data, error } = await query
  if (error) throw error
  return data || []
}

export async function createLancamentoFinanceiro(lancamento: LancamentoFinanceiroInput): Promise<LancamentoFinanceiro> {
  const { data, error } = await supabase
    .from('lancamentos_financeiros')
    .insert([lancamento])
    .select()
    .single()

  if (error) throw new Error(error.message)
  return data
}

export async function updateLancamentoFinanceiro(id: number, updates: LancamentoFinanceiroInput): Promise<LancamentoFinanceiro> {
  const { data, error } = await supabase
    .from('lancamentos_financeiros')
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select()
    .single()

  if (error) throw new Error(error.message)
  return data
}

export async function deleteLancamentoFinanceiro(id: number): Promise<void> {
  const { error } = await supabase
    .from('lancamentos_financeiros')
    .delete()
    .eq('id', id)

  if (error) throw new Error(error.message)
}

// Função para verificar se lançamento pode ser excluído
export async function verificarExclusaoLancamento(id: number): Promise<{ canDelete: boolean; reason?: string }> {
  const { data: lancamento, error } = await supabase
    .from('lancamentos_financeiros')
    .select('*')
    .eq('id', id)
    .single()

  if (error || !lancamento) {
    return { canDelete: false, reason: 'Lançamento não encontrado' }
  }

  // Debug logs temporários
  console.log('[verificarExclusaoLancamento] ID:', id)
  console.log('[verificarExclusaoLancamento] venda_id:', lancamento.venda_id, typeof lancamento.venda_id)
  console.log('[verificarExclusaoLancamento] nota_fiscal_entrada_id:', lancamento.nota_fiscal_entrada_id, typeof lancamento.nota_fiscal_entrada_id)
  console.log('[verificarExclusaoLancamento] conciliado:', lancamento.conciliado)

  // Não permitir excluir se conciliado
  if (lancamento.conciliado) {
    return { canDelete: false, reason: 'Lançamento já está conciliado. Desfaça a conciliação antes de excluir.' }
  }

  // Normalizar valores: tratar 0, "0", "null", null, undefined como null
  const vendaId = (lancamento.venda_id && lancamento.venda_id !== 0 && lancamento.venda_id !== '0' && lancamento.venda_id !== 'null') 
    ? lancamento.venda_id 
    : null
  const notaFiscalEntradaId = (lancamento.nota_fiscal_entrada_id && lancamento.nota_fiscal_entrada_id !== 0 && lancamento.nota_fiscal_entrada_id !== '0' && lancamento.nota_fiscal_entrada_id !== 'null') 
    ? lancamento.nota_fiscal_entrada_id 
    : null

  console.log('[verificarExclusaoLancamento] vendaId normalizado:', vendaId)
  console.log('[verificarExclusaoLancamento] notaFiscalEntradaId normalizado:', notaFiscalEntradaId)

  // Verificar se venda realmente existe no banco
  if (vendaId) {
    const { data: venda } = await supabase
      .from('vendas')
      .select('id')
      .eq('id', vendaId)
      .single()

    console.log('[verificarExclusaoLancamento] Venda encontrada:', venda)

    if (venda) {
      return { canDelete: false, reason: 'Lançamento vinculado a uma venda. Exclua a venda primeiro.' }
    }
    // Se não encontrou a venda, é vínculo órfão - permitir excluir
    console.log('[verificarExclusaoLancamento] Vínculo órfão de venda_id detectado, permitindo exclusão')
  }

  // Verificar se NF de entrada realmente existe no banco
  if (notaFiscalEntradaId) {
    const { data: nf } = await supabase
      .from('notas_fiscais_entrada')
      .select('id')
      .eq('id', notaFiscalEntradaId)
      .single()

    console.log('[verificarExclusaoLancamento] NF Entrada encontrada:', nf)

    if (nf) {
      return { canDelete: false, reason: 'Lançamento vinculado a uma NF de entrada. Exclua a NF primeiro.' }
    }
    // Se não encontrou a NF, é vínculo órfão - permitir excluir
    console.log('[verificarExclusaoLancamento] Vínculo órfão de nota_fiscal_entrada_id detectado, permitindo exclusão')
  }

  return { canDelete: true }
}

// ==================== FUNÇÕES - EXCLUSÃO CASCATA NF ENTRADA ====================

export async function deleteNotaFiscalEntradaCascade(notaId: number): Promise<{ success: boolean; message: string }> {
  try {
    // 1. Buscar a nota para verificar se existe
    const { data: nota, error: notaError } = await supabase
      .from('notas_fiscais_entrada')
      .select('*')
      .eq('id', notaId)
      .single()

    if (notaError || !nota) {
      return { success: false, message: 'Nota fiscal não encontrada' }
    }

    // 2. Buscar movimentações de estoque vinculadas
    const { data: movimentacoes } = await supabase
      .from('movimentacoes_estoque')
      .select('id, produto_id, quantidade, tipo')
      .eq('nota_fiscal_id', notaId)

    // 3. Reverter o estoque das movimentações (subtrair o que foi adicionado)
    if (movimentacoes && movimentacoes.length > 0) {
      for (const mov of movimentacoes) {
        if (mov.tipo === 'entrada') {
          // Se foi entrada, diminuir o estoque - fazer update direto
          const { data: prod } = await supabase
            .from('produtos')
            .select('quantidade_estoque')
            .eq('id', mov.produto_id)
            .single()
          
          if (prod) {
            await supabase
              .from('produtos')
              .update({ quantidade_estoque: Math.max(0, prod.quantidade_estoque - mov.quantidade) })
              .eq('id', mov.produto_id)
          }
        }
      }

      // 4. Deletar movimentações de estoque
      const { error: movError } = await supabase
        .from('movimentacoes_estoque')
        .delete()
        .eq('nota_fiscal_id', notaId)

      if (movError) {
        console.error('Erro ao deletar movimentações:', movError)
      }
    }

    // 5. Deletar lançamentos financeiros vinculados
    const { error: lancError } = await supabase
      .from('lancamentos_financeiros')
      .delete()
      .eq('nota_fiscal_entrada_id', notaId)

    if (lancError) {
      console.error('Erro ao deletar lançamentos:', lancError)
    }

    // 6. Deletar contas a pagar vinculadas (usando nota_fiscal_id)
    const { error: contasError } = await supabase
      .from('contas_pagar')
      .delete()
      .eq('nota_fiscal_id', notaId)

    if (contasError) {
      console.error('Erro ao deletar contas a pagar:', contasError)
    }

    // 7. Deletar itens da nota fiscal
    const { error: itensError } = await supabase
      .from('itens_nota_entrada')
      .delete()
      .eq('nota_fiscal_id', notaId)

    if (itensError) {
      console.error('Erro ao deletar itens da nota:', itensError)
    }

    // 8. Finalmente, deletar a nota fiscal
    const { error: deleteError } = await supabase
      .from('notas_fiscais_entrada')
      .delete()
      .eq('id', notaId)

    if (deleteError) {
      return { success: false, message: 'Erro ao excluir nota fiscal: ' + deleteError.message }
    }

    return { 
      success: true, 
      message: `Nota fiscal excluída com sucesso. Removidos: ${movimentacoes?.length || 0} movimentações de estoque.` 
    }
  } catch (err) {
    console.error('Erro na exclusão cascata:', err)
    return { success: false, message: 'Erro ao processar exclusão: ' + (err instanceof Error ? err.message : 'Erro desconhecido') }
  }
}

// Excluir nota fiscal de SAÍDA com cascade
export async function deleteNotaFiscalSaidaCascade(notaId: number): Promise<{ success: boolean; message: string }> {
  try {
    // 1. Buscar a nota para verificar se existe
    const { data: nota, error: notaError } = await supabase
      .from('notas_fiscais')
      .select('*')
      .eq('id', notaId)
      .single()

    if (notaError || !nota) {
      return { success: false, message: 'Nota fiscal não encontrada' }
    }

    // 2. Verificar se a nota já foi autorizada pela SEFAZ
    if (nota.status === 'autorizado' || nota.status === 'autorizada') {
      return { 
        success: false, 
        message: 'Não é possível excluir uma nota fiscal já autorizada pela SEFAZ. Use a opção de cancelamento.' 
      }
    }

    // 3. Deletar eventos da nota fiscal
    await supabase
      .from('notas_fiscais_eventos')
      .delete()
      .eq('nota_fiscal_id', notaId)

    // 4. Deletar lançamentos financeiros vinculados à nota de saída
    await supabase
      .from('lancamentos_financeiros')
      .delete()
      .eq('nota_fiscal_saida_id', notaId)

    // 5. Se houver venda vinculada, limpar referência na venda
    if (nota.venda_id) {
      await supabase
        .from('vendas')
        .update({
          nota_fiscal_emitida: false,
          numero_nf: null,
          chave_nf: null,
          nota_fiscal_status: null,
          nota_fiscal_id: null
        })
        .eq('id', nota.venda_id)
    }

    // 6. Finalmente, deletar a nota fiscal
    const { error: deleteError } = await supabase
      .from('notas_fiscais')
      .delete()
      .eq('id', notaId)

    if (deleteError) {
      return { success: false, message: 'Erro ao excluir nota fiscal: ' + deleteError.message }
    }

    return { 
      success: true, 
      message: 'Nota fiscal de saída excluída com sucesso.' 
    }
  } catch (err) {
    console.error('Erro na exclusão de NF saída:', err)
    return { success: false, message: 'Erro ao processar exclusão: ' + (err instanceof Error ? err.message : 'Erro desconhecido') }
  }
}

export async function checkOFXDuplicado(fitid: string, contaId?: number): Promise<boolean> {
  // Limpar o fitid de qualquer caractere especial
  const cleanFitid = fitid.replace(/[<>\/]/g, '').trim()
  
  let query = supabase
    .from('lancamentos_financeiros')
    .select('id')
    .eq('ofx_fitid', cleanFitid)
  
  if (contaId) {
    query = query.eq('conta_id', contaId)
  }
  
  const { data } = await query
  return (data?.length || 0) > 0
}

// ==================== FUNÇÕES - SIMILARIDADE E DEDUPLICAÇÃO ====================

/**
 * Normaliza uma string para comparação de similaridade
 * Remove acentos, pontuação, tokens comuns (nf, nota, códigos alfanuméricos longos)
 */
export function normalizarDescricao(descricao: string): string {
  if (!descricao) return ''
  
  return descricao
    // PRIMEIRO: Separar camelCase e PascalCase ANTES de toLowerCase (MaosNaObra -> Maos Na Obra)
    .replace(/([a-z])([A-Z])/g, '$1 $2')
    // Separar letras de números (Agro123 -> Agro 123)
    .replace(/([a-zA-Z])(\d)/g, '$1 $2')
    .replace(/(\d)([a-zA-Z])/g, '$1 $2')
    // DEPOIS: Converter para minúsculas
    .toLowerCase()
    // Remover acentos
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    // Remover pontuação e caracteres especiais
    .replace(/[.,;:!?@#$%&*()[\]{}<>\/\\|`~^"'=-]/g, ' ')
    // Remover APENAS tokens muito genéricos (prefixos de transação)
    .replace(/\b(compras|nacionais|internacionais|pix|ted|doc|parcela|ref|nr|num|numero|pagamento|debito|credito|liquidacao|boleto|tarifa)\b/gi, '')
    // Remover APENAS códigos alfanuméricos que começam com letras e têm números (ex: VE0828256)
    .replace(/\b[a-z]{1,3}\d{5,}\b/gi, '')
    // Remover sufixos empresariais comuns
    .replace(/\b(ltda|me|eireli|sa|epp|ss|s\/s)\b/gi, '')
    // Remover nomes de cidades/estados comuns
    .replace(/\b(sinop|cuiaba|brasilia|sao paulo|rio de janeiro|mt|sp|rj|mg|br|brasil)\b/gi, '')
    // Colapsar espaços múltiplos
    .replace(/\s+/g, ' ')
    .trim()
}

/**
 * Extrai tokens de uma string normalizada
 */
export function extrairTokens(texto: string): Set<string> {
  const normalizado = normalizarDescricao(texto)
  const tokens = normalizado.split(' ').filter(t => t.length > 2)
  return new Set(tokens)
}

/**
 * Calcula similaridade de Jaccard entre dois conjuntos de tokens
 * Retorna valor entre 0 e 1
 */
export function calcularSimilaridadeJaccard(tokens1: Set<string>, tokens2: Set<string>): number {
  if (tokens1.size === 0 && tokens2.size === 0) return 0
  if (tokens1.size === 0 || tokens2.size === 0) return 0
  
  const arr1 = Array.from(tokens1)
  const arr2 = Array.from(tokens2)
  const intersecao = new Set(arr1.filter(t => tokens2.has(t)))
  const uniao = new Set([...arr1, ...arr2])
  
  return intersecao.size / uniao.size
}

/**
 * Interface para resultado de busca de lançamentos semelhantes
 */
export interface LancamentoSemelhante {
  id: number
  data_lancamento: string
  descricao: string | null
  valor: number
  tipo: string
  categoria_id: number | null
  conta_id: number | null
  categoria_nome?: string
  conta_nome?: string
  score: number
}

/**
 * Busca lançamentos semelhantes no banco de dados
 * @param params Parâmetros de busca (data_lancamento, valor, descricao)
 * @param limite Número máximo de resultados (default: 5)
 * @param limiarSimilaridade Score mínimo de similaridade (default: 0.3)
 */
export async function buscarLancamentosSemelhantes(params: {
  data_lancamento: string
  valor: number
  descricao: string
}, limite: number = 5, limiarSimilaridade: number = 0.3): Promise<LancamentoSemelhante[]> {
  const { data_lancamento, valor, descricao } = params
  
  // Não buscar se dados insuficientes
  if (!data_lancamento || !valor || !descricao || descricao.length < 3) {
    return []
  }
  
  // Calcular intervalo de datas (±3 dias)
  const dataBase = new Date(data_lancamento)
  const dataInicio = new Date(dataBase)
  dataInicio.setDate(dataInicio.getDate() - 3)
  const dataFim = new Date(dataBase)
  dataFim.setDate(dataFim.getDate() + 3)
  
  // Converter valor para centavos para comparação exata
  const valorCentavos = Math.round(valor * 100)
  const toleranciaValor = 0.01 // R$ 0,01 de tolerância
  
  try {
    // Query pré-filtrada por valor e data
    const { data, error } = await supabase
      .from('lancamentos_financeiros')
      .select(`
        id,
        data_lancamento,
        descricao,
        valor,
        tipo,
        categoria_id,
        conta_id,
        categoria:categorias_financeiras(nome),
        conta:contas_bancarias(nome)
      `)
      .gte('data_lancamento', dataInicio.toISOString().split('T')[0])
      .lte('data_lancamento', dataFim.toISOString().split('T')[0])
      .gte('valor', valor - toleranciaValor)
      .lte('valor', valor + toleranciaValor)
      .limit(50) // Limite de segurança para pós-processamento
    
    if (error) {
      console.error('Erro ao buscar lançamentos semelhantes:', error)
      return []
    }
    
    if (!data || data.length === 0) {
      return []
    }
    
    // Calcular similaridade textual em JS
    const tokensBusca = extrairTokens(descricao)
    
    const resultados: LancamentoSemelhante[] = data
      .map(lanc => {
        const tokensLanc = extrairTokens(lanc.descricao || '')
        const score = calcularSimilaridadeJaccard(tokensBusca, tokensLanc)
        
        return {
          id: lanc.id,
          data_lancamento: lanc.data_lancamento,
          descricao: lanc.descricao,
          valor: lanc.valor,
          tipo: lanc.tipo,
          categoria_id: lanc.categoria_id,
          conta_id: lanc.conta_id,
          categoria_nome: (lanc.categoria as any)?.nome || undefined,
          conta_nome: (lanc.conta as any)?.nome || undefined,
          score
        }
      })
      .filter(r => r.score >= limiarSimilaridade)
      .sort((a, b) => b.score - a.score)
      .slice(0, limite)
    
    return resultados
  } catch (err) {
    console.error('Erro ao buscar lançamentos semelhantes:', err)
    return []
  }
}

/**
 * Gera fingerprint para deduplicação de transações OFX
 * Útil quando não há FITID confiável
 */
export function gerarFingerprintOFX(params: {
  contaId: number
  data: string
  valor: number
  descricao: string
}): string {
  const { contaId, data, valor, descricao } = params
  
  // Normalizar data para YYYY-MM-DD
  const dataFormatada = data.split('T')[0]
  
  // Valor em centavos com sinal
  const valorCentavos = Math.round(valor * 100)
  
  // Descrição normalizada
  const descNormalizada = normalizarDescricao(descricao)
  
  // Gerar hash simples combinando os campos
  const chave = `${contaId}|${dataFormatada}|${valorCentavos}|${descNormalizada}`
  
  // Hash simples usando djb2
  let hash = 5381
  for (let i = 0; i < chave.length; i++) {
    hash = ((hash << 5) + hash) + chave.charCodeAt(i)
    hash = hash >>> 0 // Converter para unsigned
  }
  
  return hash.toString(36)
}

/**
 * Verifica duplicação OFX usando FITID ou fingerprint
 * Retorna objeto com informações de duplicação
 */
export async function checkOFXDuplicadoAvancado(params: {
  fitid?: string | null
  contaId: number
  data: string
  valor: number
  descricao: string
}): Promise<{
  duplicado: boolean
  metodo: 'fitid' | 'fingerprint' | 'valor_data_desc' | 'nenhum'
  lancamentoExistenteId?: number
}> {
  const { fitid, contaId, data, valor, descricao } = params
  
  // 1. Tentar por FITID primeiro (mais confiável)
  if (fitid && fitid.trim()) {
    const cleanFitid = fitid.replace(/[<>\/]/g, '').trim()
    
    const { data: resultFitid } = await supabase
      .from('lancamentos_financeiros')
      .select('id')
      .eq('ofx_fitid', cleanFitid)
      .eq('conta_id', contaId)
      .limit(1)
    
    if (resultFitid && resultFitid.length > 0) {
      return {
        duplicado: true,
        metodo: 'fitid',
        lancamentoExistenteId: resultFitid[0].id
      }
    }
  }
  
  // 2. Se não encontrou por FITID, tentar por valor + data ±2 dias + descrição similar
  const dataBase = new Date(data)
  const dataInicio = new Date(dataBase)
  dataInicio.setDate(dataInicio.getDate() - 2)
  const dataFim = new Date(dataBase)
  dataFim.setDate(dataFim.getDate() + 2)
  
  const toleranciaValor = 0.01
  
  const { data: resultValorData } = await supabase
    .from('lancamentos_financeiros')
    .select('id, descricao')
    .eq('conta_id', contaId)
    .gte('data_lancamento', dataInicio.toISOString().split('T')[0])
    .lte('data_lancamento', dataFim.toISOString().split('T')[0])
    .gte('valor', Math.abs(valor) - toleranciaValor)
    .lte('valor', Math.abs(valor) + toleranciaValor)
    .limit(20)
  
  if (resultValorData && resultValorData.length > 0) {
    // Verificar similaridade de descrição
    const tokensBusca = extrairTokens(descricao)
    
    for (const lanc of resultValorData) {
      const tokensLanc = extrairTokens(lanc.descricao || '')
      const score = calcularSimilaridadeJaccard(tokensBusca, tokensLanc)
      
      // Se similaridade > 0.6, considerar duplicado
      if (score >= 0.6) {
        return {
          duplicado: true,
          metodo: 'valor_data_desc',
          lancamentoExistenteId: lanc.id
        }
      }
    }
  }
  
  return {
    duplicado: false,
    metodo: 'nenhum'
  }
}

/**
 * Resultado da importação OFX
 */
export interface ResultadoImportacaoOFX {
  importados: number
  duplicadosFitid: number
  duplicadosFingerprint: number
  erros: number
  detalhes: Array<{
    descricao: string
    status: 'importado' | 'duplicado_fitid' | 'duplicado_fingerprint' | 'erro'
    mensagem?: string
  }>
}

// ==================== FUNÇÕES - RECONCILIAÇÃO NF COM OFX ====================

/**
 * Interface para candidato de reconciliação
 */
export interface CandidatoReconciliacao {
  id: number
  data_lancamento: string
  descricao: string | null
  valor: number
  tipo: string
  categoria_id: number | null
  conta_id: number | null
  conciliado: boolean
  com_nota_fiscal: boolean
  nota_fiscal_entrada_id: number | null
  ofx_fitid: string | null
  score: number
  diferencaDias: number
}

/**
 * Busca lançamentos existentes (provavelmente OFX) para reconciliar com NF
 * Usado quando importa XML de NF e marca "Lançar no caixa"
 * 
 * @param params Dados da NF para buscar match
 * @returns Lista de candidatos ordenados por score (melhor primeiro)
 */
export async function buscarLancamentoParaReconciliar(params: {
  data_nf: string       // Data da NF (YYYY-MM-DD)
  valor: number         // Valor da NF
  descricao_xml: string // Descrição do XML (ex: "NF 876 - MAOS NA OBRA LTDA")
  fornecedor_nome?: string // Nome do fornecedor para aumentar match
}): Promise<{ candidatos: CandidatoReconciliacao[], melhorMatch: CandidatoReconciliacao | null }> {
  const { data_nf, valor, descricao_xml, fornecedor_nome } = params
  
  try {
    // Calcular intervalo de datas (±3 dias da data da NF)
    const dataBase = new Date(data_nf)
    const dataInicio = new Date(dataBase)
    dataInicio.setDate(dataInicio.getDate() - 3)
    const dataFim = new Date(dataBase)
    dataFim.setDate(dataFim.getDate() + 3)
    
    // Tolerância de valor: R$ 0,01
    const toleranciaValor = 0.01
    
    // Query pré-filtrada: despesas, valor similar, data próxima, não tem NF ainda
    const { data, error } = await supabase
      .from('lancamentos_financeiros')
      .select(`
        id,
        data_lancamento,
        descricao,
        valor,
        tipo,
        categoria_id,
        conta_id,
        conciliado,
        com_nota_fiscal,
        nota_fiscal_entrada_id,
        ofx_fitid
      `)
      .in('tipo', ['despesa', 'saida']) // Só despesas (legado usa 'saida')
      .gte('data_lancamento', dataInicio.toISOString().split('T')[0])
      .lte('data_lancamento', dataFim.toISOString().split('T')[0])
      .gte('valor', valor - toleranciaValor)
      .lte('valor', valor + toleranciaValor)
      .is('nota_fiscal_entrada_id', null) // Não tem NF vinculada ainda
      .eq('com_nota_fiscal', false) // Não marcado como tendo NF
      .limit(20)
    
    if (error) {
      console.error('Erro ao buscar lançamentos para reconciliar:', error)
      return { candidatos: [], melhorMatch: null }
    }
    
    if (!data || data.length === 0) {
      return { candidatos: [], melhorMatch: null }
    }
    
    // Preparar tokens da descrição do XML + nome do fornecedor
    const descricaoCompleta = fornecedor_nome 
      ? `${descricao_xml} ${fornecedor_nome}` 
      : descricao_xml
    const tokensXML = extrairTokens(descricaoCompleta)
    
    // Calcular score de similaridade para cada candidato
    const candidatos: CandidatoReconciliacao[] = data
      .map(lanc => {
        const tokensLanc = extrairTokens(lanc.descricao || '')
        const score = calcularSimilaridadeJaccard(tokensXML, tokensLanc)
        
        // Calcular diferença de dias
        const dataLanc = new Date(lanc.data_lancamento)
        const diferencaDias = Math.abs(Math.round((dataLanc.getTime() - dataBase.getTime()) / (1000 * 60 * 60 * 24)))
        
        return {
          id: lanc.id,
          data_lancamento: lanc.data_lancamento,
          descricao: lanc.descricao,
          valor: lanc.valor,
          tipo: lanc.tipo,
          categoria_id: lanc.categoria_id,
          conta_id: lanc.conta_id,
          conciliado: lanc.conciliado,
          com_nota_fiscal: lanc.com_nota_fiscal,
          nota_fiscal_entrada_id: lanc.nota_fiscal_entrada_id,
          ofx_fitid: lanc.ofx_fitid,
          score,
          diferencaDias
        }
      })
      // Filtrar apenas com score >= 0.55 (limiar de confiança)
      .filter(c => c.score >= 0.55)
      // Ordenar por score DESC, depois por diferença de dias ASC
      .sort((a, b) => {
        if (b.score !== a.score) return b.score - a.score
        return a.diferencaDias - b.diferencaDias
      })
    
    // Determinar melhor match
    let melhorMatch: CandidatoReconciliacao | null = null
    
    if (candidatos.length === 1) {
      // Apenas 1 candidato acima do limiar = match confiável
      melhorMatch = candidatos[0]
    } else if (candidatos.length > 1) {
      // Múltiplos candidatos: verificar se o melhor é significativamente melhor
      const melhor = candidatos[0]
      const segundo = candidatos[1]
      
      // Se o melhor tem score >= 0.7 E é pelo menos 0.1 melhor que o segundo
      if (melhor.score >= 0.7 && (melhor.score - segundo.score) >= 0.1) {
        melhorMatch = melhor
      }
      // Caso contrário, não decidir automaticamente (retornar null para mostrar seleção)
    }
    
    return { candidatos, melhorMatch }
  } catch (err) {
    console.error('Erro ao buscar lançamentos para reconciliar:', err)
    return { candidatos: [], melhorMatch: null }
  }
}

/**
 * Reconcilia um lançamento existente (OFX) com dados da NF
 * Atualiza o lançamento ao invés de criar um novo
 * 
 * @param params Dados para reconciliação
 * @returns Sucesso e lançamento atualizado
 */
export async function reconciliarLancamentoComNF(params: {
  lancamento_id: number
  nota_fiscal_entrada_id: number
  numero_nf: string
  fornecedor_nome: string
  categoria_id?: number | null
  forma_pagamento?: string | null
}): Promise<{ success: boolean; error?: string; lancamento?: LancamentoFinanceiro }> {
  const { lancamento_id, nota_fiscal_entrada_id, numero_nf, fornecedor_nome, categoria_id, forma_pagamento } = params
  
  try {
    // Buscar lançamento atual
    const { data: lancamentoAtual, error: fetchError } = await supabase
      .from('lancamentos_financeiros')
      .select('*')
      .eq('id', lancamento_id)
      .single()
    
    if (fetchError || !lancamentoAtual) {
      return { 
        success: false, 
        error: 'Lançamento não encontrado: ' + (fetchError?.message || 'ID inválido')
      }
    }
    
    // Preservar descrição original e adicionar info da NF
    const descricaoOriginal = lancamentoAtual.descricao || ''
    const novaDescricao = `NF ${numero_nf} - ${fornecedor_nome}${descricaoOriginal ? ` | OFX: ${descricaoOriginal}` : ''}`
    
    // Preparar dados de atualização
    const dadosUpdate: Record<string, any> = {
      com_nota_fiscal: true,
      nota_fiscal_entrada_id,
      descricao: novaDescricao,
      updated_at: new Date().toISOString()
    }
    
    // Atualizar categoria se fornecida (prioridade do XML)
    if (categoria_id) {
      // Se tinha categoria antes, guardar na observação
      if (lancamentoAtual.categoria_id && lancamentoAtual.categoria_id !== categoria_id) {
        const obsAnterior = lancamentoAtual.observacao || ''
        dadosUpdate.observacao = `${obsAnterior}${obsAnterior ? ' | ' : ''}Categoria anterior ID: ${lancamentoAtual.categoria_id}`
      }
      dadosUpdate.categoria_id = categoria_id
    }
    
    // Atualizar forma de pagamento se fornecida
    if (forma_pagamento) {
      dadosUpdate.forma_pagamento = forma_pagamento
    }
    
    // Executar update
    const { data: lancamentoAtualizado, error: updateError } = await supabase
      .from('lancamentos_financeiros')
      .update(dadosUpdate)
      .eq('id', lancamento_id)
      .select()
      .single()
    
    if (updateError) {
      return { 
        success: false, 
        error: 'Erro ao atualizar lançamento: ' + updateError.message
      }
    }
    
    console.log(`✓ Lançamento #${lancamento_id} reconciliado com NF ${numero_nf}`)
    
    return { 
      success: true, 
      lancamento: lancamentoAtualizado as LancamentoFinanceiro
    }
  } catch (err) {
    console.error('Erro ao reconciliar lançamento com NF:', err)
    return { 
      success: false, 
      error: 'Erro interno ao reconciliar'
    }
  }
}

// ==================== FUNÇÕES - DETECÇÃO DE DUPLICADOS EXISTENTES ====================

/**
 * Interface para par de lançamentos duplicados
 */
export interface ParDuplicado {
  lancamentoComNF: LancamentoFinanceiro    // O que tem NF
  lancamentoSemNF: LancamentoFinanceiro    // O que não tem NF (provavelmente OFX)
  score: number                             // Similaridade
  diferencaDias: number                     // Diferença de dias entre eles
}

/**
 * Detecta lançamentos duplicados existentes no banco
 * Busca pares onde um tem NF e outro não, com valor igual e descrição similar
 * 
 * @param limite Número máximo de pares a retornar
 * @returns Lista de pares duplicados ordenados por score
 */
export async function detectarDuplicadosExistentes(limite: number = 50): Promise<ParDuplicado[]> {
  try {
    // Buscar TODOS os lançamentos (não só despesas) que não são subordinados de grupo
    const { data: todosLancamentos, error: errorTodos } = await supabase
      .from('lancamentos_financeiros')
      .select(`
        *,
        categoria:categorias_financeiras(id, nome, tipo),
        conta:contas_bancarias(id, nome)
      `)
      .is('grupo_principal_id', null)
      .order('data_lancamento', { ascending: false })
      .limit(500)
    
    if (errorTodos || !todosLancamentos) {
      console.error('Erro ao buscar lançamentos:', errorTodos)
      return []
    }
    
    const duplicados: ParDuplicado[] = []
    const toleranciaValor = 0.01
    const idsUsados = new Set<number>()
    
    // Comparar todos os lançamentos entre si para encontrar duplicados
    for (let i = 0; i < todosLancamentos.length; i++) {
      const lancA = todosLancamentos[i]
      if (idsUsados.has(lancA.id)) continue
      
      for (let j = i + 1; j < todosLancamentos.length; j++) {
        const lancB = todosLancamentos[j]
        if (idsUsados.has(lancB.id)) continue
        
        // Mesmo tipo normalizado
        const tipoA = (lancA.tipo === 'entrada' || lancA.tipo === 'receita') ? 'entrada' : 'saida'
        const tipoB = (lancB.tipo === 'entrada' || lancB.tipo === 'receita') ? 'entrada' : 'saida'
        if (tipoA !== tipoB) continue
        
        // Verificar valor (com tolerância)
        if (Math.abs(lancA.valor - lancB.valor) > toleranciaValor) continue
        
        // Verificar data (±5 dias)
        const dataA = new Date(lancA.data_lancamento)
        const dataB = new Date(lancB.data_lancamento)
        const diferencaDias = Math.abs(Math.round((dataA.getTime() - dataB.getTime()) / (1000 * 60 * 60 * 24)))
        if (diferencaDias > 5) continue
        
        // Verificar se já não estão no mesmo grupo
        if (lancA.grupo_id && lancA.grupo_id === lancB.grupo_id) continue
        
        // Calcular similaridade de descrição
        const tokensA = extrairTokens(lancA.descricao || '')
        const tokensB = extrairTokens(lancB.descricao || '')
        const score = calcularSimilaridadeJaccard(tokensA, tokensB)
        
        // Descrições exatamente iguais OU similaridade >= 0.3
        const descIguais = (lancA.descricao || '').trim().toLowerCase() === (lancB.descricao || '').trim().toLowerCase()
        
        if (score >= 0.3 || descIguais) {
          // Decidir qual é "com NF" e qual é "sem NF"
          let lancComNF = lancA
          let lancSemNF = lancB
          if (!lancA.com_nota_fiscal && lancB.com_nota_fiscal) {
            lancComNF = lancB
            lancSemNF = lancA
          }
          
          duplicados.push({
            lancamentoComNF: lancComNF as LancamentoFinanceiro,
            lancamentoSemNF: lancSemNF as LancamentoFinanceiro,
            score: descIguais ? 1.0 : score,
            diferencaDias
          })
          
          idsUsados.add(lancB.id)
          break // Passar para o próximo
        }
      }
    }
    
    // Ordenar por score (melhor primeiro) e limitar
    return duplicados
      .sort((a, b) => b.score - a.score)
      .slice(0, limite)
  } catch (err) {
    console.error('Erro ao detectar duplicados:', err)
    return []
  }
}

/**
 * Mescla dois lançamentos duplicados
 * O lançamento COM NF é mantido como principal, o SEM NF é marcado como reconciliado
 * 
 * @param lancamentoNFId ID do lançamento com NF (será o principal)
 * @param lancamentoOFXId ID do lançamento sem NF (será subordinado ou removido)
 * @param acao 'agrupar' = mantém ambos no grupo | 'mesclar' = remove o OFX após mesclar dados
 */
export async function mesclarDuplicados(params: {
  lancamentoNFId: number
  lancamentoOFXId: number
  acao: 'agrupar' | 'mesclar'
}): Promise<{ success: boolean; error?: string }> {
  const { lancamentoNFId, lancamentoOFXId, acao } = params
  
  try {
    // Buscar ambos os lançamentos
    const { data: lancamentos, error: fetchError } = await supabase
      .from('lancamentos_financeiros')
      .select('*')
      .in('id', [lancamentoNFId, lancamentoOFXId])
    
    if (fetchError || !lancamentos || lancamentos.length !== 2) {
      return { success: false, error: 'Lançamentos não encontrados' }
    }
    
    const lancNF = lancamentos.find(l => l.id === lancamentoNFId)!
    const lancOFX = lancamentos.find(l => l.id === lancamentoOFXId)!
    
    if (acao === 'mesclar') {
      // Mesclar: atualizar o lançamento com NF com dados do OFX e deletar o OFX
      const descricaoMesclada = lancNF.descricao + (lancOFX.descricao ? ` | OFX: ${lancOFX.descricao}` : '')
      
      // Preservar dados do OFX que podem ser úteis
      const observacaoAtualizada = [
        lancNF.observacao || '',
        lancOFX.observacao ? `Obs OFX: ${lancOFX.observacao}` : '',
        lancOFX.ofx_fitid ? `FITID: ${lancOFX.ofx_fitid}` : '',
        `Reconciliado em: ${new Date().toLocaleDateString('pt-BR')}`
      ].filter(Boolean).join(' | ')
      
      // Atualizar o lançamento com NF
      const { error: updateError } = await supabase
        .from('lancamentos_financeiros')
        .update({
          descricao: descricaoMesclada,
          observacao: observacaoAtualizada,
          ofx_fitid: lancOFX.ofx_fitid || lancNF.ofx_fitid, // Preservar FITID
          conta_id: lancOFX.conta_id || lancNF.conta_id,    // Preservar conta se o NF não tinha
          conciliado: true,
          updated_at: new Date().toISOString()
        })
        .eq('id', lancamentoNFId)
      
      if (updateError) {
        return { success: false, error: 'Erro ao atualizar lançamento: ' + updateError.message }
      }
      
      // Deletar o lançamento OFX
      const { error: deleteError } = await supabase
        .from('lancamentos_financeiros')
        .delete()
        .eq('id', lancamentoOFXId)
      
      if (deleteError) {
        return { success: false, error: 'Erro ao deletar lançamento OFX: ' + deleteError.message }
      }
      
      console.log(`✓ Lançamentos mesclados: #${lancamentoNFId} (NF) + #${lancamentoOFXId} (OFX) -> #${lancamentoNFId}`)
    } else {
      // Agrupar: manter ambos mas vincular
      const grupo_id = gerarUUID()
      
      // O lançamento com NF é o principal
      await supabase
        .from('lancamentos_financeiros')
        .update({
          grupo_id,
          grupo_principal_id: null,
          updated_at: new Date().toISOString()
        })
        .eq('id', lancamentoNFId)
      
      // O lançamento OFX é subordinado
      await supabase
        .from('lancamentos_financeiros')
        .update({
          grupo_id,
          grupo_principal_id: lancamentoNFId,
          updated_at: new Date().toISOString()
        })
        .eq('id', lancamentoOFXId)
      
      console.log(`✓ Lançamentos agrupados: #${lancamentoNFId} (principal) + #${lancamentoOFXId} (subordinado)`)
    }
    
    return { success: true }
  } catch (err) {
    console.error('Erro ao mesclar duplicados:', err)
    return { success: false, error: 'Erro interno ao mesclar' }
  }
}

/**
 * Reconciliação AUTOMÁTICA de duplicados
 * Busca e mescla automaticamente lançamentos duplicados óbvios
 * Critérios rigorosos: mesmo valor exato, datas ±3 dias, um com NF outro sem
 * 
 * @returns Quantidade de pares mesclados automaticamente
 */
export async function reconciliarDuplicadosAutomatico(): Promise<{
  mesclados: number
  detalhes: Array<{ nfId: number; ofxId: number; descricaoNF: string; descricaoOFX: string }>
}> {
  const resultado = { mesclados: 0, detalhes: [] as any[] }
  
  try {
    console.log('═══════════════════════════════════════════════════════════')
    console.log('🔍 INICIANDO RECONCILIAÇÃO AUTOMÁTICA DE DUPLICADOS')
    console.log('═══════════════════════════════════════════════════════════')
    
    // Buscar lançamentos COM NF (despesas)
    const { data: lancamentosComNF, error: error1 } = await supabase
      .from('lancamentos_financeiros')
      .select('id, descricao, valor, data_lancamento, categoria_id, conta_id, com_nota_fiscal, tipo')
      .eq('com_nota_fiscal', true)
      .in('tipo', ['despesa', 'saida'])
      .order('data_lancamento', { ascending: false })
      .limit(100)
    
    console.log(`\n📋 Lançamentos COM NF encontrados: ${lancamentosComNF?.length || 0}`)
    if (error1) {
      console.error('❌ Erro ao buscar lançamentos COM NF:', error1)
      return resultado
    }
    
    if (!lancamentosComNF || lancamentosComNF.length === 0) {
      console.log('⚠️ Nenhum lançamento COM NF encontrado')
      return resultado
    }
    
    // Listar todos os lançamentos COM NF
    console.log('\n--- LANÇAMENTOS COM NF (despesas) ---')
    lancamentosComNF.forEach(l => {
      console.log(`  #${l.id} | ${l.data_lancamento} | R$ ${l.valor} | "${l.descricao}" | tipo: ${l.tipo}`)
    })
    
    // Buscar lançamentos SEM NF (provavelmente OFX)
    const { data: lancamentosSemNF, error: error2 } = await supabase
      .from('lancamentos_financeiros')
      .select('id, descricao, valor, data_lancamento, categoria_id, conta_id, ofx_fitid, com_nota_fiscal, tipo')
      .eq('com_nota_fiscal', false)
      .in('tipo', ['despesa', 'saida'])
      .order('data_lancamento', { ascending: false })
      .limit(300)
    
    console.log(`\n📋 Lançamentos SEM NF encontrados: ${lancamentosSemNF?.length || 0}`)
    if (error2) {
      console.error('❌ Erro ao buscar lançamentos SEM NF:', error2)
      return resultado
    }
    
    if (!lancamentosSemNF || lancamentosSemNF.length === 0) {
      console.log('⚠️ Nenhum lançamento SEM NF encontrado')
      return resultado
    }
    
    // Listar todos os lançamentos SEM NF
    console.log('\n--- LANÇAMENTOS SEM NF (provavelmente OFX) ---')
    lancamentosSemNF.forEach(l => {
      console.log(`  #${l.id} | ${l.data_lancamento} | R$ ${l.valor} | "${l.descricao}" | tipo: ${l.tipo}`)
    })
    
    console.log('\n═══════════════════════════════════════════════════════════')
    console.log('🔎 ANÁLISE DE POSSÍVEIS DUPLICADOS')
    console.log('═══════════════════════════════════════════════════════════')
    
    // Para cada lançamento COM NF, buscar match exato
    for (const lancNF of lancamentosComNF) {
      const dataNF = new Date(lancNF.data_lancamento)
      const valorNFCentavos = Math.round(lancNF.valor * 100)
      
      // DEBUG: Análise específica para valor 69.02
      const isTargetNF = valorNFCentavos === 6902
      
      if (isTargetNF) {
        console.log(`\n🎯 ANALISANDO NF TARGET: "${lancNF.descricao}" (R$ ${lancNF.valor})`)
        
        // Primeiro, mostrar TODOS os OFX com mesmo valor
        const candidatosExatos = lancamentosSemNF.filter(l => Math.round(l.valor * 100) === valorNFCentavos)
        console.log(`   📋 OFX com MESMO VALOR (R$ ${lancNF.valor}): ${candidatosExatos.length} encontrados`)
        candidatosExatos.forEach((c, i) => {
          console.log(`      ${i+1}. #${c.id} | ${c.data_lancamento} | "${c.descricao}"`)
        })
      }
      
      for (const lancOFX of lancamentosSemNF) {
        // Mesmo valor exato (em centavos para evitar float issues)
        const valorNF = valorNFCentavos
        const valorOFX = Math.round(lancOFX.valor * 100)
        
        // DEBUG para o caso específico (mesmo valor)
        const isTargetPair = isTargetNF && valorNF === valorOFX
        
        if (isTargetPair) {
          console.log(`\n   📊 COMPARANDO COM CANDIDATO:`)
          console.log(`      NF:  "${lancNF.descricao}" | R$ ${lancNF.valor} | Data: ${lancNF.data_lancamento}`)
          console.log(`      OFX: "${lancOFX.descricao}" | R$ ${lancOFX.valor} | Data: ${lancOFX.data_lancamento}`)
        }
        
        if (valorNF !== valorOFX) {
          continue // Silenciosamente pula valores diferentes
        }
        
        if (isTargetPair) {
          console.log(`      ✅ VALOR IGUAL: R$ ${lancNF.valor}`)
        }
        
        // Datas próximas (±3 dias)
        const dataOFX = new Date(lancOFX.data_lancamento)
        const diffDias = Math.abs(Math.round((dataNF.getTime() - dataOFX.getTime()) / (1000 * 60 * 60 * 24)))
        
        if (isTargetPair) {
          console.log(`      📅 Diferença de dias: ${diffDias}`)
        }
        
        if (diffDias > 3) {
          if (isTargetPair) {
            console.log(`      ❌ DATAS MUITO DISTANTES: ${diffDias} dias (limite: 3)`)
          }
          continue
        }
        
        if (isTargetPair) {
          console.log(`      ✅ DATAS PRÓXIMAS: ${diffDias} dias`)
        }
        
        // Calcular similaridade de descrição
        const descNFNormalizada = normalizarDescricao(lancNF.descricao || '')
        const descOFXNormalizada = normalizarDescricao(lancOFX.descricao || '')
        const tokensNF = extrairTokens(lancNF.descricao || '')
        const tokensOFX = extrairTokens(lancOFX.descricao || '')
        const score = calcularSimilaridadeJaccard(tokensNF, tokensOFX)
        
        if (isTargetPair) {
          console.log(`\n      🔤 ANÁLISE DE TEXTO:`)
          console.log(`         NF Original:    "${lancNF.descricao}"`)
          console.log(`         NF Normalizada: "${descNFNormalizada}"`)
          console.log(`         NF Tokens:      [${Array.from(tokensNF).join(', ')}]`)
          console.log(`         OFX Original:   "${lancOFX.descricao}"`)
          console.log(`         OFX Normalizada: "${descOFXNormalizada}"`)
          console.log(`         OFX Tokens:     [${Array.from(tokensOFX).join(', ')}]`)
          console.log(`         SCORE JACCARD:  ${(score * 100).toFixed(1)}% (mínimo: 25%)`)
        }
        
        // Score >= 0.25 para match automático (mais permissivo porque valor e data já batem)
        if (score >= 0.25) {
          console.log(`\n✅ MATCH ENCONTRADO!`)
          console.log(`   NF:  "${lancNF.descricao}"`)
          console.log(`   OFX: "${lancOFX.descricao}"`)
          console.log(`   Score: ${(score*100).toFixed(0)}%`)
          
          // Mesclar: manter NF, absorver dados do OFX, deletar OFX
          const descricaoMesclada = lancNF.descricao + ` | OFX: ${lancOFX.descricao}`
          
          await supabase
            .from('lancamentos_financeiros')
            .update({
              descricao: descricaoMesclada,
              conta_id: lancOFX.conta_id || lancNF.conta_id,
              ofx_fitid: lancOFX.ofx_fitid,
              conciliado: true,
              updated_at: new Date().toISOString()
            })
            .eq('id', lancNF.id)
          
          await supabase
            .from('lancamentos_financeiros')
            .delete()
            .eq('id', lancOFX.id)
          
          resultado.mesclados++
          resultado.detalhes.push({
            nfId: lancNF.id,
            ofxId: lancOFX.id,
            descricaoNF: lancNF.descricao,
            descricaoOFX: lancOFX.descricao
          })
          
          // Remover o OFX da lista para não processar novamente
          const idx = lancamentosSemNF.findIndex(l => l.id === lancOFX.id)
          if (idx > -1) lancamentosSemNF.splice(idx, 1)
          
          break // Passar para o próximo lançamento com NF
        } else if (isTargetPair) {
          console.log(`\n      ❌ SCORE INSUFICIENTE: ${(score * 100).toFixed(1)}% < 25%`)
          console.log(`         Motivo: Os tokens não têm interseção suficiente`)
        }
      }
    }
    
    // ==================== FASE 2: DEDUPLICAÇÃO GENÉRICA (TODOS OS TIPOS) ====================
    console.log('\n═══════════════════════════════════════════════════════════')
    console.log('🔍 FASE 2: DEDUPLICAÇÃO GENÉRICA (TODOS OS TIPOS)')
    console.log('═══════════════════════════════════════════════════════════')
    
    // Buscar TODOS os lançamentos recentes que não são subordinados de grupo
    const { data: todosLancamentos, error: errorTodos } = await supabase
      .from('lancamentos_financeiros')
      .select('id, descricao, valor, data_lancamento, categoria_id, conta_id, com_nota_fiscal, tipo, grupo_id, grupo_principal_id, ofx_fitid, created_at')
      .is('grupo_principal_id', null)
      .order('data_lancamento', { ascending: false })
      .limit(500)
    
    if (!errorTodos && todosLancamentos && todosLancamentos.length > 1) {
      const idsJaProcessados = new Set<number>()
      
      for (let i = 0; i < todosLancamentos.length; i++) {
        const lancA = todosLancamentos[i]
        if (idsJaProcessados.has(lancA.id)) continue
        
        for (let j = i + 1; j < todosLancamentos.length; j++) {
          const lancB = todosLancamentos[j]
          if (idsJaProcessados.has(lancB.id)) continue
          
          // Mesmo tipo
          const tipoA = (lancA.tipo === 'entrada' || lancA.tipo === 'receita') ? 'entrada' : 'saida'
          const tipoB = (lancB.tipo === 'entrada' || lancB.tipo === 'receita') ? 'entrada' : 'saida'
          if (tipoA !== tipoB) continue
          
          // Mesmo valor exato (em centavos)
          const valorA = Math.round(lancA.valor * 100)
          const valorB = Math.round(lancB.valor * 100)
          if (valorA !== valorB) continue
          
          // Datas próximas (±3 dias)
          const dataA = new Date(lancA.data_lancamento)
          const dataB = new Date(lancB.data_lancamento)
          const diffDias = Math.abs(Math.round((dataA.getTime() - dataB.getTime()) / (1000 * 60 * 60 * 24)))
          if (diffDias > 3) continue
          
          // Calcular similaridade de descrição
          const tokensA = extrairTokens(lancA.descricao || '')
          const tokensB = extrairTokens(lancB.descricao || '')
          const score = calcularSimilaridadeJaccard(tokensA, tokensB)
          
          // Score alto (>= 0.5) para match genérico, OU descrições exatamente iguais
          const descIguais = (lancA.descricao || '').trim().toLowerCase() === (lancB.descricao || '').trim().toLowerCase()
          
          if (score >= 0.5 || descIguais) {
            console.log(`\n✅ DUPLICADO GENÉRICO ENCONTRADO!`)
            console.log(`   A: #${lancA.id} | ${lancA.data_lancamento} | R$ ${lancA.valor} | "${lancA.descricao}"`)
            console.log(`   B: #${lancB.id} | ${lancB.data_lancamento} | R$ ${lancB.valor} | "${lancB.descricao}"`)
            console.log(`   Score: ${(score*100).toFixed(0)}% | Desc iguais: ${descIguais}`)
            
            // Decidir qual manter: preferir o que tem NF, ou o mais antigo, ou o de menor ID
            let principal = lancA
            let duplicado = lancB
            if (!lancA.com_nota_fiscal && lancB.com_nota_fiscal) {
              principal = lancB
              duplicado = lancA
            } else if (lancA.com_nota_fiscal === lancB.com_nota_fiscal) {
              // Ambos com ou sem NF: manter o mais antigo (menor created_at)
              if (new Date(lancA.created_at) > new Date(lancB.created_at)) {
                principal = lancB
                duplicado = lancA
              }
            }
            
            // Mesclar: manter principal, enriquecer com dados do duplicado e deletar duplicado
            const descMesclada = principal.descricao + (duplicado.descricao && duplicado.descricao !== principal.descricao ? ` | Dup: ${duplicado.descricao}` : '')
            
            await supabase
              .from('lancamentos_financeiros')
              .update({
                descricao: descMesclada,
                conta_id: principal.conta_id || duplicado.conta_id,
                categoria_id: principal.categoria_id || duplicado.categoria_id,
                ofx_fitid: principal.ofx_fitid || duplicado.ofx_fitid,
                conciliado: true,
                updated_at: new Date().toISOString()
              })
              .eq('id', principal.id)
            
            await supabase
              .from('lancamentos_financeiros')
              .delete()
              .eq('id', duplicado.id)
            
            idsJaProcessados.add(duplicado.id)
            
            resultado.mesclados++
            resultado.detalhes.push({
              nfId: principal.id,
              ofxId: duplicado.id,
              descricaoNF: principal.descricao,
              descricaoOFX: duplicado.descricao
            })
            
            console.log(`   ✅ Mantido #${principal.id}, removido #${duplicado.id}`)
            break // Passar para o próximo lançamento
          }
        }
      }
    }
    
    console.log('\n═══════════════════════════════════════════════════════════')
    if (resultado.mesclados > 0) {
      console.log(`✅ RECONCILIAÇÃO CONCLUÍDA: ${resultado.mesclados} par(es) mesclado(s)`)
    } else {
      console.log('ℹ️ NENHUM DUPLICADO ÓBVIO ENCONTRADO')
    }
    console.log('═══════════════════════════════════════════════════════════\n')
    
    return resultado
  } catch (err) {
    console.error('❌ Erro na reconciliação automática:', err)
    return resultado
  }
}

// ==================== FUNÇÕES - AGRUPAMENTO DE LANÇAMENTOS ====================

/**
 * Gera UUID v4 simples para identificar grupos
 */
function gerarUUID(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = Math.random() * 16 | 0
    const v = c === 'x' ? r : (r & 0x3 | 0x8)
    return v.toString(16)
  })
}

/**
 * Agrupa dois lançamentos como duplicados/semelhantes
 * O principal é definido por: (1) ter NF, (2) ser mais antigo, (3) ter ID menor
 * @param principal_id ID do lançamento que será o principal do grupo
 * @param duplicado_id ID do lançamento que será agrupado como subordinado
 */
export async function agruparLancamentos(params: {
  principal_id: number
  duplicado_id: number
}): Promise<{ success: boolean; error?: string; grupo_id?: string }> {
  const { principal_id, duplicado_id } = params
  
  try {
    // Buscar ambos os lançamentos
    const { data: lancamentos, error: fetchError } = await supabase
      .from('lancamentos_financeiros')
      .select('id, com_nota_fiscal, created_at, grupo_id, grupo_principal_id')
      .in('id', [principal_id, duplicado_id])
    
    if (fetchError || !lancamentos || lancamentos.length !== 2) {
      return { 
        success: false, 
        error: 'Erro ao buscar lançamentos: ' + (fetchError?.message || 'Lançamentos não encontrados')
      }
    }
    
    const lancPrincipal = lancamentos.find(l => l.id === principal_id)!
    const lancDuplicado = lancamentos.find(l => l.id === duplicado_id)!
    
    // Verificar se já estão no mesmo grupo
    if (lancPrincipal.grupo_id && lancPrincipal.grupo_id === lancDuplicado.grupo_id) {
      return { 
        success: false, 
        error: 'Lançamentos já pertencem ao mesmo grupo'
      }
    }
    
    // Determinar o grupo_id (usar existente ou criar novo)
    let grupo_id = lancPrincipal.grupo_id || lancDuplicado.grupo_id || gerarUUID()
    
    // Calcular se algum tem NF (para propagar ao grupo)
    const grupoPossuiNF = lancPrincipal.com_nota_fiscal || lancDuplicado.com_nota_fiscal
    
    // Atualizar o lançamento principal
    const { error: updatePrincipalError } = await supabase
      .from('lancamentos_financeiros')
      .update({
        grupo_id,
        grupo_principal_id: null, // Principal não tem referência a outro
        com_nota_fiscal: grupoPossuiNF // Propagar NF
      })
      .eq('id', principal_id)
    
    if (updatePrincipalError) {
      return { 
        success: false, 
        error: 'Erro ao atualizar lançamento principal: ' + updatePrincipalError.message
      }
    }
    
    // Atualizar o lançamento duplicado
    const { error: updateDuplicadoError } = await supabase
      .from('lancamentos_financeiros')
      .update({
        grupo_id,
        grupo_principal_id: principal_id,
        com_nota_fiscal: grupoPossuiNF // Propagar NF
      })
      .eq('id', duplicado_id)
    
    if (updateDuplicadoError) {
      return { 
        success: false, 
        error: 'Erro ao atualizar lançamento duplicado: ' + updateDuplicadoError.message
      }
    }
    
    // Se o duplicado já tinha outros subordinados, redirecionar para o novo principal
    if (lancDuplicado.grupo_id) {
      await supabase
        .from('lancamentos_financeiros')
        .update({ grupo_principal_id: principal_id, grupo_id })
        .eq('grupo_principal_id', duplicado_id)
    }
    
    return { success: true, grupo_id }
  } catch (err) {
    console.error('Erro ao agrupar lançamentos:', err)
    return { 
      success: false, 
      error: 'Erro interno ao agrupar lançamentos'
    }
  }
}

/**
 * Remove um lançamento de seu grupo atual
 * @param lancamento_id ID do lançamento a ser removido do grupo
 */
export async function desagruparLancamento(lancamento_id: number): Promise<{ success: boolean; error?: string }> {
  try {
    // Buscar lançamento
    const { data: lancamento, error: fetchError } = await supabase
      .from('lancamentos_financeiros')
      .select('id, grupo_id, grupo_principal_id')
      .eq('id', lancamento_id)
      .single()
    
    if (fetchError || !lancamento) {
      return { success: false, error: 'Lançamento não encontrado' }
    }
    
    if (!lancamento.grupo_id) {
      return { success: false, error: 'Lançamento não pertence a nenhum grupo' }
    }
    
    // Se é o principal do grupo, precisamos eleger um novo principal
    if (!lancamento.grupo_principal_id) {
      // Buscar todos os subordinados deste grupo
      const { data: subordinados } = await supabase
        .from('lancamentos_financeiros')
        .select('id, com_nota_fiscal, created_at')
        .eq('grupo_principal_id', lancamento_id)
        .order('created_at', { ascending: true })
      
      if (subordinados && subordinados.length > 0) {
        // Eleger o próximo (mais antigo) como novo principal
        const novoPrincipal = subordinados[0]
        
        // Atualizar o novo principal
        await supabase
          .from('lancamentos_financeiros')
          .update({ grupo_principal_id: null })
          .eq('id', novoPrincipal.id)
        
        // Redirecionar os outros subordinados para o novo principal
        if (subordinados.length > 1) {
          const outrosIds = subordinados.slice(1).map(s => s.id)
          await supabase
            .from('lancamentos_financeiros')
            .update({ grupo_principal_id: novoPrincipal.id })
            .in('id', outrosIds)
        }
      }
    }
    
    // Remover este lançamento do grupo
    const { error: updateError } = await supabase
      .from('lancamentos_financeiros')
      .update({ grupo_id: null, grupo_principal_id: null })
      .eq('id', lancamento_id)
    
    if (updateError) {
      return { success: false, error: 'Erro ao remover do grupo: ' + updateError.message }
    }
    
    return { success: true }
  } catch (err) {
    console.error('Erro ao desagrupar lançamento:', err)
    return { success: false, error: 'Erro interno ao desagrupar' }
  }
}

/**
 * Busca lançamentos com informações de grupo
 * Retorna lista com lançamentos principais e seus subordinados aninhados
 */
export async function fetchLancamentosAgrupados(filtros?: {
  tipo?: string
  dataInicio?: string
  dataFim?: string
  contaId?: number
  categoriaId?: number
  incluirSubordinados?: boolean
}): Promise<LancamentoFinanceiro[]> {
  try {
    let query = supabase
      .from('lancamentos_financeiros')
      .select(`
        *,
        categoria:categorias_financeiras(id, nome, tipo),
        conta:contas_bancarias(id, nome),
        cliente:clientes(id, nome_fantasia, razao_social),
        fornecedor:fornecedores(id, nome_fantasia, razao_social)
      `)
      .order('data_lancamento', { ascending: false })
    
    // Filtros
    if (filtros?.tipo) {
      query = query.eq('tipo', filtros.tipo)
    }
    if (filtros?.dataInicio) {
      query = query.gte('data_lancamento', filtros.dataInicio)
    }
    if (filtros?.dataFim) {
      query = query.lte('data_lancamento', filtros.dataFim)
    }
    if (filtros?.contaId) {
      query = query.eq('conta_id', filtros.contaId)
    }
    if (filtros?.categoriaId) {
      query = query.eq('categoria_id', filtros.categoriaId)
    }
    
    // Por padrão, não mostrar subordinados na lista principal
    if (!filtros?.incluirSubordinados) {
      query = query.is('grupo_principal_id', null)
    }
    
    const { data, error } = await query.limit(500)
    
    if (error) {
      console.error('Erro ao buscar lançamentos agrupados:', error)
      return []
    }
    
    if (!data) return []
    
    // Para cada lançamento que é principal de grupo, buscar subordinados
    const resultado: LancamentoFinanceiro[] = []
    
    for (const lanc of data) {
      const lancFormatado: LancamentoFinanceiro = {
        ...lanc,
        is_grupo_principal: lanc.grupo_id && !lanc.grupo_principal_id,
        grupo_total_itens: 1,
        grupo_possui_nf: lanc.com_nota_fiscal,
        itens_grupo: []
      }
      
      // Se for principal de grupo, buscar subordinados
      if (lancFormatado.is_grupo_principal) {
        const { data: subordinados } = await supabase
          .from('lancamentos_financeiros')
          .select(`
            *,
            categoria:categorias_financeiras(id, nome, tipo),
            conta:contas_bancarias(id, nome)
          `)
          .eq('grupo_principal_id', lanc.id)
        
        if (subordinados && subordinados.length > 0) {
          lancFormatado.itens_grupo = subordinados as LancamentoFinanceiro[]
          lancFormatado.grupo_total_itens = 1 + subordinados.length
          lancFormatado.grupo_possui_nf = lanc.com_nota_fiscal || subordinados.some(s => s.com_nota_fiscal)
        }
      }
      
      resultado.push(lancFormatado)
    }
    
    // ==================== DEDUPLICAÇÃO CLIENT-SIDE ====================
    // Consolida lançamentos com mesma descrição, mesmo valor e datas próximas
    const deduplicados: LancamentoFinanceiro[] = []
    const idsVistos = new Set<number>()
    
    for (const lanc of resultado) {
      if (idsVistos.has(lanc.id)) continue
      
      // Procurar duplicados deste lançamento
      const descNorm = (lanc.descricao || '').trim().toLowerCase()
      const valorCentavos = Math.round((lanc.valor || 0) * 100)
      const dataLanc = new Date(lanc.data_lancamento)
      const tipoNorm = (lanc.tipo === 'entrada' || lanc.tipo === 'receita') ? 'entrada' : 'saida'
      
      const duplicadosDoItem: LancamentoFinanceiro[] = []
      
      for (const outro of resultado) {
        if (outro.id === lanc.id || idsVistos.has(outro.id)) continue
        
        const outroDescNorm = (outro.descricao || '').trim().toLowerCase()
        const outroValor = Math.round((outro.valor || 0) * 100)
        const outroData = new Date(outro.data_lancamento)
        const outroTipo = (outro.tipo === 'entrada' || outro.tipo === 'receita') ? 'entrada' : 'saida'
        
        // Mesmo tipo e mesmo valor
        if (tipoNorm !== outroTipo || valorCentavos !== outroValor) continue
        
        // Datas próximas (±3 dias)
        const diffDias = Math.abs(Math.round((dataLanc.getTime() - outroData.getTime()) / (1000 * 60 * 60 * 24)))
        if (diffDias > 3) continue
        
        // Similaridade de descrição: descrições iguais OU tokens similares (>= 0.5)
        const tokensA = extrairTokens(lanc.descricao || '')
        const tokensB = extrairTokens(outro.descricao || '')
        const score = calcularSimilaridadeJaccard(tokensA, tokensB)
        const descIguais = descNorm === outroDescNorm
        
        if (descIguais || score >= 0.5) {
          duplicadosDoItem.push(outro)
          idsVistos.add(outro.id)
        }
      }
      
      // Se encontrou duplicados, agrupar visualmente
      if (duplicadosDoItem.length > 0) {
        lanc.is_grupo_principal = true
        lanc.grupo_total_itens = 1 + duplicadosDoItem.length
        lanc.itens_grupo = [...(lanc.itens_grupo || []), ...duplicadosDoItem]
      }
      
      idsVistos.add(lanc.id)
      deduplicados.push(lanc)
    }
    
    return deduplicados
  } catch (err) {
    console.error('Erro ao buscar lançamentos agrupados:', err)
    return []
  }
}

/**
 * Busca os itens de um grupo específico
 */
export async function fetchItensGrupo(grupo_id: string): Promise<LancamentoFinanceiro[]> {
  try {
    const { data, error } = await supabase
      .from('lancamentos_financeiros')
      .select(`
        *,
        categoria:categorias_financeiras(id, nome, tipo),
        conta:contas_bancarias(id, nome)
      `)
      .eq('grupo_id', grupo_id)
      .order('grupo_principal_id', { ascending: true, nullsFirst: true })
    
    if (error) {
      console.error('Erro ao buscar itens do grupo:', error)
      return []
    }
    
    return (data || []) as LancamentoFinanceiro[]
  } catch (err) {
    console.error('Erro ao buscar itens do grupo:', err)
    return []
  }
}

// ==================== FUNÇÕES - CONTAS A PAGAR ====================

export async function fetchContasPagar(filtros?: {
  status?: string
  dataInicio?: string
  dataFim?: string
  fornecedorId?: number
}): Promise<ContaPagar[]> {
  let query = supabase
    .from('contas_pagar')
    .select(`
      *,
      fornecedor:fornecedores(*),
      categoria:categorias_financeiras(*)
    `)
    .order('data_vencimento', { ascending: true })

  if (filtros?.status) {
    query = query.eq('status', filtros.status)
  }
  if (filtros?.dataInicio) {
    query = query.gte('data_vencimento', filtros.dataInicio)
  }
  if (filtros?.dataFim) {
    query = query.lte('data_vencimento', filtros.dataFim)
  }
  if (filtros?.fornecedorId) {
    query = query.eq('fornecedor_id', filtros.fornecedorId)
  }

  const { data, error } = await query
  if (error) throw error
  return data || []
}

export async function createContaPagar(conta: Partial<ContaPagar>): Promise<ContaPagar> {
  const { data, error } = await supabase
    .from('contas_pagar')
    .insert([conta])
    .select()
    .single()

  if (error) throw new Error(error.message)
  return data
}

export async function updateContaPagar(id: number, updates: Partial<ContaPagar>): Promise<ContaPagar> {
  const { data, error } = await supabase
    .from('contas_pagar')
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select()
    .single()

  if (error) throw new Error(error.message)
  return data
}

export async function pagarConta(id: number, valorPago: number, dataPagamento: string, formaPagamento: string): Promise<ContaPagar> {
  const { data: conta } = await supabase
    .from('contas_pagar')
    .select('*')
    .eq('id', id)
    .single()

  if (!conta) throw new Error('Conta não encontrada')

  const novoValorPago = conta.valor_pago + valorPago
  const status = novoValorPago >= conta.valor ? 'pago' : 'parcial'

  const { data, error } = await supabase
    .from('contas_pagar')
    .update({
      valor_pago: novoValorPago,
      data_pagamento: status === 'pago' ? dataPagamento : null,
      status,
      forma_pagamento: formaPagamento,
      updated_at: new Date().toISOString()
    })
    .eq('id', id)
    .select()
    .single()

  if (error) throw new Error(error.message)
  return data
}

// ==================== FUNÇÕES - CONTAS A RECEBER ====================

export async function fetchContasReceber(filtros?: {
  status?: string
  dataInicio?: string
  dataFim?: string
  clienteId?: number
}): Promise<ContaReceber[]> {
  let query = supabase
    .from('contas_receber')
    .select(`
      *,
      cliente:clientes(*)
    `)
    .order('data_vencimento', { ascending: true })

  if (filtros?.status) {
    query = query.eq('status', filtros.status)
  }
  if (filtros?.dataInicio) {
    query = query.gte('data_vencimento', filtros.dataInicio)
  }
  if (filtros?.dataFim) {
    query = query.lte('data_vencimento', filtros.dataFim)
  }
  if (filtros?.clienteId) {
    query = query.eq('cliente_id', filtros.clienteId)
  }

  const { data, error } = await query
  if (error) throw error
  return data || []
}

export async function createContaReceber(conta: Partial<ContaReceber>): Promise<ContaReceber> {
  const { data, error } = await supabase
    .from('contas_receber')
    .insert([conta])
    .select()
    .single()

  if (error) throw new Error(error.message)
  return data
}

export async function updateContaReceber(id: number, updates: Partial<ContaReceber>): Promise<ContaReceber> {
  const { data, error } = await supabase
    .from('contas_receber')
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select()
    .single()

  if (error) throw new Error(error.message)
  return data
}

export async function receberConta(id: number, valorRecebido: number, dataRecebimento: string, formaPagamento: string): Promise<ContaReceber> {
  const { data: conta } = await supabase
    .from('contas_receber')
    .select('*')
    .eq('id', id)
    .single()

  if (!conta) throw new Error('Conta não encontrada')

  const novoValorRecebido = conta.valor_recebido + valorRecebido
  const status = novoValorRecebido >= conta.valor ? 'recebido' : 'parcial'

  const { data, error } = await supabase
    .from('contas_receber')
    .update({
      valor_recebido: novoValorRecebido,
      data_recebimento: status === 'recebido' ? dataRecebimento : null,
      status,
      forma_pagamento: formaPagamento,
      updated_at: new Date().toISOString()
    })
    .eq('id', id)
    .select()
    .single()

  if (error) throw new Error(error.message)
  return data
}

export async function deleteContaPagar(id: number): Promise<void> {
  const { error } = await supabase
    .from('contas_pagar')
    .delete()
    .eq('id', id)

  if (error) throw new Error(error.message)
}

export async function deleteContaReceber(id: number): Promise<void> {
  const { error } = await supabase
    .from('contas_receber')
    .delete()
    .eq('id', id)

  if (error) throw new Error(error.message)
}

// ==================== FUNÇÕES - VENDAS ====================

export async function fetchVendas(filtros?: {
  dataInicio?: string
  dataFim?: string
  clienteId?: number
}): Promise<Venda[]> {
  let query = supabase
    .from('vendas')
    .select(`
      *,
      cliente:clientes(*),
      itens:itens_venda(*)
    `)
    .order('data_venda', { ascending: false })

  if (filtros?.dataInicio) {
    query = query.gte('data_venda', filtros.dataInicio)
  }
  if (filtros?.dataFim) {
    query = query.lte('data_venda', filtros.dataFim)
  }
  if (filtros?.clienteId) {
    query = query.eq('cliente_id', filtros.clienteId)
  }

  const { data, error } = await query
  if (error) throw error
  return data || []
}

export async function createVenda(venda: Partial<Venda>, itens?: Partial<ItemVenda>[]): Promise<Venda> {
  const { data, error } = await supabase
    .from('vendas')
    .insert([venda])
    .select()
    .single()

  if (error) throw new Error(error.message)

  // Criar itens se existirem
  if (itens && itens.length > 0) {
    const itensComVenda = itens.map(item => ({
      ...item,
      venda_id: data.id
    }))

    const { error: itensError } = await supabase
      .from('itens_venda')
      .insert(itensComVenda)

    if (itensError) throw new Error(itensError.message)
  }

  return data
}

export async function createItemVenda(item: Partial<ItemVenda>): Promise<ItemVenda> {
  const { data, error } = await supabase
    .from('itens_venda')
    .insert([item])
    .select()
    .single()

  if (error) throw new Error(error.message)
  return data
}

// ==================== FUNÇÕES - CT-e ====================

export async function fetchCteFretes(): Promise<CTeFrete[]> {
  const { data, error } = await supabase
    .from('cte_fretes')
    .select('*')
    .order('data_emissao', { ascending: false })

  if (error) throw error
  return data || []
}

export async function createCteFrete(cte: Partial<CTeFrete>): Promise<CTeFrete> {
  const { data, error } = await supabase
    .from('cte_fretes')
    .insert([cte])
    .select()
    .single()

  if (error) throw new Error(error.message)
  return data
}

// ==================== FUNÇÕES - RELATÓRIOS ====================

export async function getRelatorioCaixa(dataInicio: string, dataFim: string, contaId?: number) {
  let query = supabase
    .from('lancamentos_financeiros')
    .select(`
      *,
      categoria:categorias_financeiras(nome, tipo)
    `)
    .gte('data_lancamento', dataInicio)
    .lte('data_lancamento', dataFim)
    .order('data_lancamento')

  if (contaId) {
    query = query.eq('conta_id', contaId)
  }

  const { data, error } = await query
  if (error) throw error

  const receitas = data?.filter(l => l.tipo === 'receita').reduce((acc, l) => acc + l.valor, 0) || 0
  const despesas = data?.filter(l => l.tipo === 'despesa').reduce((acc, l) => acc + l.valor, 0) || 0

  return {
    lancamentos: data || [],
    totalReceitas: receitas,
    totalDespesas: despesas,
    saldo: receitas - despesas
  }
}

export async function getRelatorioInventario(categoriaId?: number) {
  let query = supabase
    .from('produtos')
    .select(`
      *,
      categoria:categorias(nome)
    `)
    .order('nome')

  if (categoriaId) {
    query = query.eq('categoria_id', categoriaId)
  }

  const { data, error } = await query
  if (error) throw error

  const totalCusto = data?.reduce((acc, p) => acc + (p.quantidade_estoque * p.custo_medio), 0) || 0
  const totalVenda = data?.reduce((acc, p) => acc + (p.quantidade_estoque * p.valor_venda), 0) || 0
  const totalItens = data?.reduce((acc, p) => acc + p.quantidade_estoque, 0) || 0

  return {
    produtos: data || [],
    totalCusto,
    totalVenda,
    totalItens,
    lucroPotencial: totalVenda - totalCusto
  }
}

export async function getRelatorioDRE(dataInicio: string, dataFim: string) {
  const { data, error } = await supabase
    .from('lancamentos_financeiros')
    .select(`
      tipo,
      valor,
      com_nota_fiscal,
      categoria:categorias_financeiras(nome, tipo)
    `)
    .gte('data_lancamento', dataInicio)
    .lte('data_lancamento', dataFim)

  if (error) throw error

  const porCategoria: Record<string, { receitas: number; despesas: number }> = {}
  
  data?.forEach(l => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const categoriaData = Array.isArray(l.categoria) ? (l.categoria as any[])[0] : l.categoria as { nome?: string; tipo?: string } | null
    const cat = categoriaData?.nome || 'Sem categoria'
    if (!porCategoria[cat]) {
      porCategoria[cat] = { receitas: 0, despesas: 0 }
    }
    if (l.tipo === 'receita') {
      porCategoria[cat].receitas += l.valor
    } else if (l.tipo === 'despesa') {
      porCategoria[cat].despesas += l.valor
    }
  })

  const totalReceitas = data?.filter(l => l.tipo === 'receita').reduce((acc, l) => acc + l.valor, 0) || 0
  const totalDespesas = data?.filter(l => l.tipo === 'despesa').reduce((acc, l) => acc + l.valor, 0) || 0

  return {
    porCategoria,
    totalReceitas,
    totalDespesas,
    lucroLiquido: totalReceitas - totalDespesas
  }
}

export async function getRelatorioVendas(dataInicio: string, dataFim: string) {
  const { data, error } = await supabase
    .from('vendas')
    .select(`
      *,
      cliente:clientes(nome, razao_social)
    `)
    .gte('data_venda', dataInicio)
    .lte('data_venda', dataFim)
    .order('data_venda')

  if (error) throw error

  const totalVendas = data?.reduce((acc, v) => acc + v.valor_total, 0) || 0
  const totalCusto = data?.reduce((acc, v) => acc + v.custo_total, 0) || 0
  const totalLucro = data?.reduce((acc, v) => acc + v.lucro_bruto, 0) || 0
  const margemMedia = totalVendas > 0 ? (totalLucro / totalVendas) * 100 : 0

  return {
    vendas: data || [],
    totalVendas,
    totalCusto,
    totalLucro,
    margemMedia,
    quantidadeVendas: data?.length || 0
  }
}

export async function getProdutosMaisVendidos(dataInicio: string, dataFim: string, limite = 10) {
  const { data, error } = await supabase
    .from('itens_venda')
    .select(`
      produto_id,
      quantidade,
      valor_total,
      produto:produtos(id, nome, codigo)
    `)
    .gte('created_at', dataInicio)
    .lte('created_at', dataFim)

  if (error) throw error

  const porProduto: Record<number, { nome: string; quantidade: number; valorTotal: number }> = {}
  
  data?.forEach(item => {
    if (item.produto_id && item.produto) {
      if (!porProduto[item.produto_id]) {
        porProduto[item.produto_id] = {
          nome: (item.produto as any).nome,
          quantidade: 0,
          valorTotal: 0
        }
      }
      porProduto[item.produto_id].quantidade += item.quantidade
      porProduto[item.produto_id].valorTotal += item.valor_total
    }
  })

  return Object.entries(porProduto)
    .map(([id, dados]) => ({ id: Number(id), ...dados }))
    .sort((a, b) => b.quantidade - a.quantidade)
    .slice(0, limite)
}

// ==================== FUNÇÕES - IMPORTAÇÃO OFX ====================

export async function registrarImportacaoOFX(
  contaId: number,
  nomeArquivo: string,
  dataInicio: string,
  dataFim: string,
  quantidadeLancamentos: number,
  hashArquivo: string,
  usuarioId?: number
) {
  const { data, error } = await supabase
    .from('importacoes_ofx')
    .insert([{
      conta_id: contaId,
      nome_arquivo: nomeArquivo,
      data_inicio: dataInicio,
      data_fim: dataFim,
      quantidade_lancamentos: quantidadeLancamentos,
      hash_arquivo: hashArquivo,
      usuario_id: usuarioId
    }])
    .select()
    .single()

  if (error) throw new Error(error.message)
  return data
}

export async function checkImportacaoOFXDuplicada(hashArquivo: string): Promise<boolean> {
  const { data } = await supabase
    .from('importacoes_ofx')
    .select('id')
    .eq('hash_arquivo', hashArquivo)

  return (data?.length || 0) > 0
}

// ==================== FUNÇÕES VENDAS COMPLEMENTARES ====================

export async function updateVenda(id: number, venda: Partial<Venda>, itens?: Partial<ItemVenda>[]): Promise<Venda> {
  const { data, error } = await supabase
    .from('vendas')
    .update(venda)
    .eq('id', id)
    .select()
    .single()

  if (error) throw new Error(error.message)

  // Se foram passados itens, atualizar
  if (itens !== undefined) {
    // Deletar itens antigos
    await supabase.from('itens_venda').delete().eq('venda_id', id)

    // Criar novos itens
    if (itens.length > 0) {
      const itensComVenda = itens.map(item => ({
        ...item,
        venda_id: id
      }))

      const { error: itensError } = await supabase
        .from('itens_venda')
        .insert(itensComVenda)

      if (itensError) throw new Error(itensError.message)
    }
  }

  return data
}

export async function deleteVenda(id: number): Promise<void> {
  // Primeiro deletar itens
  await supabase.from('itens_venda').delete().eq('venda_id', id)
  
  const { error } = await supabase.from('vendas').delete().eq('id', id)
  if (error) throw new Error(error.message)
}

export async function createVendaComItens(
  venda: Partial<Venda>, 
  itens: Partial<ItemVenda>[]
): Promise<Venda> {
  // Criar venda
  const { data: vendaData, error: vendaError } = await supabase
    .from('vendas')
    .insert([venda])
    .select()
    .single()

  if (vendaError) throw new Error(vendaError.message)

  // Criar itens
  if (itens.length > 0) {
    const itensComVenda = itens.map(item => ({
      ...item,
      venda_id: vendaData.id
    }))

    const { error: itensError } = await supabase
      .from('itens_venda')
      .insert(itensComVenda)

    if (itensError) throw new Error(itensError.message)
  }

  return vendaData
}

// ==================== FUNÇÕES NOTAS FISCAIS COMPLEMENTARES ====================

export async function createNotaFiscalEntrada(
  nota: Partial<NotaFiscalEntrada>,
  itens?: any[]
): Promise<NotaFiscalEntrada> {
  const { data: notaData, error: notaError } = await supabase
    .from('notas_fiscais_entrada')
    .insert([nota])
    .select()
    .single()

  if (notaError) throw new Error(notaError.message)

  // Criar itens se existirem
  if (itens && itens.length > 0) {
    const itensComNota = itens.map(item => ({
      ...item,
      nota_fiscal_id: notaData.id
    }))

    const { error: itensError } = await supabase
      .from('itens_nota_entrada')
      .insert(itensComNota)

    if (itensError) throw new Error(itensError.message)
  }

  return notaData
}

// ==================== TIPOS - ORDEM DE SERVIÇO ====================

export interface OrdemServico {
  id: number
  numero: number
  cliente_id: number | null
  cliente_nome: string
  data_os: string
  data_entrega: string | null
  status: 'orcamento' | 'aprovado' | 'em_execucao' | 'concluido' | 'cancelado' | 'faturado'
  tipo_atendimento: string
  total_servicos: number
  total_produtos: number
  total_horas: number
  total_itens: number
  valor_total: number
  desconto_percentual: number
  desconto_valor: number
  observacoes: string | null
  observacoes_internas: string | null
  garantia_dias: number
  venda_id: number | null
  nota_fiscal_id: number | null
  created_at?: string
  updated_at?: string
  // Relações
  cliente?: Cliente
  servicos?: OSServico[]
  produtos?: OSProduto[]
}

export interface OSServico {
  id?: number
  os_id?: number
  descricao: string
  quantidade: number
  valor_unitario: number
  valor_total: number
  ordem: number
}

export interface OSProduto {
  id?: number
  os_id?: number
  produto_id: number | null
  codigo: string | null
  descricao: string
  unidade: string
  ncm: string | null
  quantidade: number
  valor_unitario: number
  valor_total: number
  ordem: number
}

// ==================== FUNÇÕES - ORDEM DE SERVIÇO ====================

export async function fetchOrdensServico(): Promise<OrdemServico[]> {
  const { data, error } = await supabase
    .from('ordens_servico')
    .select(`
      *,
      cliente:clientes(id, nome, razao_social, tipo_pessoa)
    `)
    .order('numero', { ascending: false })

  if (error) throw error
  return data || []
}

export async function fetchOrdemServicoById(id: number): Promise<OrdemServico | null> {
  const { data, error } = await supabase
    .from('ordens_servico')
    .select(`
      *,
      cliente:clientes(id, nome, razao_social, tipo_pessoa, cnpj, cpf, telefone, celular, email, endereco, numero, bairro, cidade, estado, cep),
      servicos:os_servicos(*),
      produtos:os_produtos(*)
    `)
    .eq('id', id)
    .single()

  if (error) throw error
  return data
}

export async function getProximoNumeroOS(): Promise<number> {
  const { data, error } = await supabase
    .from('ordens_servico')
    .select('numero')
    .order('numero', { ascending: false })
    .limit(1)

  if (error) throw error
  return (data?.[0]?.numero || 0) + 1
}

export async function createOrdemServico(
  os: Partial<OrdemServico>,
  servicos: OSServico[],
  produtos: OSProduto[]
): Promise<OrdemServico> {
  // Obter próximo número
  const numero = await getProximoNumeroOS()
  
  // Calcular totais
  const totalServicos = servicos.reduce((acc, s) => acc + (s.valor_total || 0), 0)
  const totalProdutos = produtos.reduce((acc, p) => acc + (p.valor_total || 0), 0)
  const totalHoras = servicos.reduce((acc, s) => acc + (s.quantidade || 0), 0)
  const totalItens = produtos.reduce((acc, p) => acc + (p.quantidade || 0), 0)
  const subtotal = totalServicos + totalProdutos
  const descontoValor = os.desconto_percentual ? subtotal * (os.desconto_percentual / 100) : (os.desconto_valor || 0)
  const valorTotal = subtotal - descontoValor

  // Criar OS
  const { data: osData, error: osError } = await supabase
    .from('ordens_servico')
    .insert([{
      ...os,
      numero,
      total_servicos: totalServicos,
      total_produtos: totalProdutos,
      total_horas: totalHoras,
      total_itens: totalItens,
      desconto_valor: descontoValor,
      valor_total: valorTotal
    }])
    .select()
    .single()

  if (osError) throw new Error(osError.message)

  // Criar serviços
  if (servicos.length > 0) {
    const servicosComOS = servicos.map((s, i) => ({
      ...s,
      os_id: osData.id,
      ordem: i
    }))

    const { error: servError } = await supabase
      .from('os_servicos')
      .insert(servicosComOS)

    if (servError) throw new Error(servError.message)
  }

  // Criar produtos
  if (produtos.length > 0) {
    const produtosComOS = produtos.map((p, i) => ({
      ...p,
      os_id: osData.id,
      ordem: i
    }))

    const { error: prodError } = await supabase
      .from('os_produtos')
      .insert(produtosComOS)

    if (prodError) throw new Error(prodError.message)
  }

  return osData
}

export async function updateOrdemServico(
  id: number,
  os: Partial<OrdemServico>,
  servicos: OSServico[],
  produtos: OSProduto[]
): Promise<OrdemServico> {
  // Calcular totais
  const totalServicos = servicos.reduce((acc, s) => acc + (s.valor_total || 0), 0)
  const totalProdutos = produtos.reduce((acc, p) => acc + (p.valor_total || 0), 0)
  const totalHoras = servicos.reduce((acc, s) => acc + (s.quantidade || 0), 0)
  const totalItens = produtos.reduce((acc, p) => acc + (p.quantidade || 0), 0)
  const subtotal = totalServicos + totalProdutos
  const descontoValor = os.desconto_percentual ? subtotal * (os.desconto_percentual / 100) : (os.desconto_valor || 0)
  const valorTotal = subtotal - descontoValor

  // Atualizar OS
  const { data: osData, error: osError } = await supabase
    .from('ordens_servico')
    .update({
      ...os,
      total_servicos: totalServicos,
      total_produtos: totalProdutos,
      total_horas: totalHoras,
      total_itens: totalItens,
      desconto_valor: descontoValor,
      valor_total: valorTotal,
      updated_at: new Date().toISOString()
    })
    .eq('id', id)
    .select()
    .single()

  if (osError) throw new Error(osError.message)

  // Deletar serviços e produtos antigos
  await supabase.from('os_servicos').delete().eq('os_id', id)
  await supabase.from('os_produtos').delete().eq('os_id', id)

  // Criar novos serviços
  if (servicos.length > 0) {
    const servicosComOS = servicos.map((s, i) => ({
      descricao: s.descricao,
      quantidade: s.quantidade,
      valor_unitario: s.valor_unitario,
      valor_total: s.valor_total,
      os_id: id,
      ordem: i
    }))

    await supabase.from('os_servicos').insert(servicosComOS)
  }

  // Criar novos produtos
  if (produtos.length > 0) {
    const produtosComOS = produtos.map((p, i) => ({
      produto_id: p.produto_id,
      codigo: p.codigo,
      descricao: p.descricao,
      unidade: p.unidade,
      ncm: p.ncm,
      quantidade: p.quantidade,
      valor_unitario: p.valor_unitario,
      valor_total: p.valor_total,
      os_id: id,
      ordem: i
    }))

    await supabase.from('os_produtos').insert(produtosComOS)
  }

  return osData
}

export async function deleteOrdemServico(id: number): Promise<void> {
  const { error } = await supabase
    .from('ordens_servico')
    .delete()
    .eq('id', id)

  if (error) throw new Error(error.message)
}

export async function updateStatusOS(id: number, status: OrdemServico['status']): Promise<{ venda_id?: number }> {
  let venda_id: number | undefined

  // Se o status for "aprovado", criar automaticamente uma venda
  if (status === 'aprovado') {
    // Buscar a OS completa com produtos e serviços
    const os = await fetchOrdemServicoById(id)
    if (!os) throw new Error('Ordem de serviço não encontrada')

    // Verificar se já não existe uma venda vinculada
    if (os.venda_id) {
      throw new Error('Este orçamento já possui uma venda vinculada')
    }

    // Criar os itens da venda baseados nos produtos e serviços da OS
    const itensVenda: Partial<ItemVenda>[] = []
    let custoTotal = 0

    // Adicionar serviços como itens
    if (os.servicos && os.servicos.length > 0) {
      os.servicos.forEach(servico => {
        itensVenda.push({
          produto_id: null,
          tipo: 'servico',
          descricao: servico.descricao,
          quantidade: servico.quantidade,
          valor_unitario: servico.valor_unitario,
          valor_desconto: 0,
          valor_total: servico.valor_total,
          custo_unitario: 0
        })
      })
    }

    // Adicionar produtos como itens (buscando custo do cadastro)
    if (os.produtos && os.produtos.length > 0) {
      for (const produto of os.produtos) {
        let custoUnitario = 0
        
        // Buscar custo do produto no cadastro
        if (produto.produto_id) {
          const { data: produtoCadastro } = await supabase
            .from('produtos')
            .select('valor_custo, custo_medio')
            .eq('id', produto.produto_id)
            .single()
          
          if (produtoCadastro) {
            custoUnitario = produtoCadastro.custo_medio || produtoCadastro.valor_custo || 0
          }
        }
        
        custoTotal += custoUnitario * produto.quantidade
        
        itensVenda.push({
          produto_id: produto.produto_id,
          tipo: 'produto',
          descricao: produto.descricao,
          quantidade: produto.quantidade,
          valor_unitario: produto.valor_unitario,
          valor_desconto: 0,
          valor_total: produto.valor_total,
          custo_unitario: custoUnitario
        })
      }
    }

    // Calcular lucro
    const lucroBruto = os.valor_total - custoTotal
    const margemLucro = os.valor_total > 0 ? (lucroBruto / os.valor_total) * 100 : 0

    // Gerar número da venda
    const { data: ultimaVenda } = await supabase
      .from('vendas')
      .select('numero')
      .order('id', { ascending: false })
      .limit(1)

    const ultimoNumero = ultimaVenda?.[0]?.numero ? parseInt(ultimaVenda[0].numero) : 0
    const novoNumero = String(ultimoNumero + 1).padStart(6, '0')

    // Criar a venda (sem orcamento_id, pois referencia tabela diferente)
    const vendaData: Partial<Venda> = {
      numero: novoNumero,
      cliente_id: os.cliente_id,
      data_venda: new Date().toISOString().split('T')[0],
      valor_produtos: os.total_produtos,
      valor_servicos: os.total_servicos,
      valor_desconto: os.desconto_valor,
      valor_frete: 0,
      valor_total: os.valor_total,
      custo_total: custoTotal,
      lucro_bruto: lucroBruto,
      margem_lucro: margemLucro,
      nota_fiscal_emitida: false,
      valor_impostos: 0,
      status: 'concluida',
      observacoes: `Venda gerada automaticamente do Orçamento (OS) #${os.numero}`
    }

    const venda = await createVenda(vendaData, itensVenda)
    venda_id = venda.id

    // Criar lançamento financeiro (receita) automaticamente
    // Por padrão, vendas geradas de orçamento são consideradas à vista
    await createLancamentoFinanceiro({
      tipo: 'receita',
      valor: os.valor_total,
      data_lancamento: new Date().toISOString().split('T')[0],
      descricao: `Venda #${novoNumero} (OS #${os.numero})`,
      cliente_id: os.cliente_id || undefined,
      venda_id: venda.id,
      forma_pagamento: 'dinheiro',
      conciliado: false
    })

    // Atualizar a OS com o venda_id e o status
    const { error: updateError } = await supabase
      .from('ordens_servico')
      .update({ 
        status, 
        venda_id: venda.id,
        updated_at: new Date().toISOString() 
      })
      .eq('id', id)

    if (updateError) throw new Error(updateError.message)
  } else {
    // Para outros status, apenas atualizar
    const { error } = await supabase
      .from('ordens_servico')
      .update({ status, updated_at: new Date().toISOString() })
      .eq('id', id)

    if (error) throw new Error(error.message)
  }

  return { venda_id }
}
