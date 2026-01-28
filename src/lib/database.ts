import { createClient } from '@supabase/supabase-js'

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
  data: string
  data_lancamento: string
  data_competencia: string | null
  conta_id: number | null
  conta_bancaria_id: number | null
  forma_pagamento: 'dinheiro' | 'pix' | 'debito' | 'credito' | 'boleto' | 'transferencia' | 'cheque' | null
  cliente_id: number | null
  fornecedor_id: number | null
  nota_fiscal_entrada_id: number | null
  nota_fiscal_saida_id: number | null
  venda_id: number | null
  orcamento_id: number | null
  conta_pagar_id: number | null
  conta_receber_id: number | null
  cte_id: number | null
  descricao: string | null
  observacao: string | null
  observacoes: string | null
  numero_nf: string | null
  ofx_fitid: string | null
  identificador_externo: string | null
  ofx_data_importacao: string | null
  conciliado: boolean
  usuario_id: number | null
  created_at?: string
  updated_at?: string
  categoria?: CategoriaFinanceira
  conta?: ContaBancaria
  cliente?: Cliente
  fornecedor?: Fornecedor
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
    .eq('ativo', true)
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
    .eq('ativo', true)
    .single()

  if (error) return null
  return data
}

export async function fetchProdutoByCodigo(codigo: string): Promise<Produto | null> {
  const { data, error } = await supabase
    .from('produtos')
    .select('*')
    .eq('codigo', codigo)
    .eq('ativo', true)
    .single()

  if (error) return null
  return data
}

export async function checkProdutoDuplicado(nome: string, excludeId?: number): Promise<boolean> {
  let query = supabase
    .from('produtos')
    .select('id')
    .ilike('nome', nome)
    .eq('ativo', true)

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

  const { data, error } = await supabase
    .from('produtos')
    .insert([produto])
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

  const { data, error } = await supabase
    .from('produtos')
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select()
    .single()

  if (error) throw new Error(error.message)
  return data
}

export async function deleteProduto(id: number): Promise<void> {
  const { error } = await supabase
    .from('produtos')
    .update({ ativo: false, updated_at: new Date().toISOString() })
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
    .eq('ativo', true)
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
    .update({ ativo: false, updated_at: new Date().toISOString() })
    .eq('id', id)

  if (error) throw new Error(error.message)
}

// ==================== FUNÇÕES - CLIENTES ====================

export async function fetchClientes(tipoCadastro?: 'cliente' | 'fornecedor' | 'ambos'): Promise<Cliente[]> {
  let query = supabase
    .from('clientes')
    .select('*')
    .eq('ativo', true)
  
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
  const { error } = await supabase
    .from('clientes')
    .update({ ativo: false, updated_at: new Date().toISOString() })
    .eq('id', id)

  if (error) throw new Error(error.message)
}

// ==================== FUNÇÕES - ENDEREÇOS CLIENTES ====================

export async function fetchEnderecosCliente(clienteId: number): Promise<EnderecoCliente[]> {
  const { data, error } = await supabase
    .from('enderecos_cliente')
    .select('*')
    .eq('cliente_id', clienteId)
    .eq('ativo', true)
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
    .update({ ativo: false })
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
      produto:produtos(id, nome, codigo)
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
    .eq('ativo', true)
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

export async function fetchContasBancarias(): Promise<ContaBancaria[]> {
  const { data, error } = await supabase
    .from('contas_bancarias')
    .select('*')
    .eq('ativo', true)
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

export async function checkOFXDuplicado(fitid: string, contaId?: number): Promise<boolean> {
  let query = supabase
    .from('lancamentos_financeiros')
    .select('id')
    .or(`ofx_fitid.eq.${fitid},identificador_externo.eq.${fitid}`)
  
  if (contaId) {
    query = query.eq('conta_id', contaId)
  }
  
  const { data } = await query
  return (data?.length || 0) > 0
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
    .eq('ativo', true)
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
