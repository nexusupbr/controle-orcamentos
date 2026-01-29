'use client'

import { useState, useEffect } from 'react'
import { 
  X, User, Building, Package, FileText, DollarSign, MapPin, Phone, Mail,
  Calendar, CreditCard, Truck, Receipt, Eye, ShoppingCart, Tag
} from 'lucide-react'
import { Modal } from './Modal'
import { Badge, LoadingSpinner } from './Common'
import { Button } from './Button'
import { formatCurrency, formatDate } from '@/lib/utils'
import { supabase } from '@/lib/database'

// ==================== TIPOS ====================

interface Cliente {
  id: number
  tipo_pessoa: string
  nome: string
  razao_social?: string
  cpf?: string
  cnpj?: string
  inscricao_estadual?: string
  email?: string
  telefone?: string
  celular?: string
  endereco?: string
  numero?: string
  complemento?: string
  bairro?: string
  cidade?: string
  estado?: string
  cep?: string
  observacoes?: string
  created_at?: string
}

interface Venda {
  id: number
  numero?: string
  cliente_id?: number
  data_venda: string
  valor_produtos: number
  valor_servicos: number
  valor_desconto: number
  valor_frete: number
  valor_total: number
  custo_total: number
  lucro_bruto: number
  margem_lucro: number
  status: string
  observacoes?: string
  nota_fiscal_emitida: boolean
  forma_pagamento?: string
  condicao_pagamento?: string
  cliente?: Cliente
  itens?: any[]
}

interface Produto {
  id: number
  codigo?: string
  nome: string
  descricao?: string
  unidade: string
  ncm?: string
  marca?: string
  valor_custo: number
  valor_venda: number
  custo_medio: number
  margem_lucro: number
  quantidade_estoque: number
  estoque_minimo: number
  estoque_maximo: number
  localizacao?: string
  categoria?: { nome: string }
  fornecedor?: { razao_social: string }
}

interface Fornecedor {
  id: number
  razao_social: string
  nome_fantasia?: string
  cnpj?: string
  inscricao_estadual?: string
  email?: string
  telefone?: string
  celular?: string
  endereco?: string
  numero?: string
  bairro?: string
  cidade?: string
  estado?: string
  cep?: string
  observacoes?: string
  created_at?: string
}

interface NotaFiscalEntrada {
  id: number
  numero?: string
  serie?: string
  chave_acesso?: string
  data_emissao?: string
  data_entrada: string
  fornecedor_razao_social?: string
  valor_produtos: number
  valor_total: number
  status: string
  forma_pagamento?: string
}

// ==================== MODAL CLIENTE ====================

interface ClienteModalProps {
  isOpen: boolean
  onClose: () => void
  clienteId: number | null
}

export function ClienteDetailModal({ isOpen, onClose, clienteId }: ClienteModalProps) {
  const [cliente, setCliente] = useState<Cliente | null>(null)
  const [loading, setLoading] = useState(false)
  const [vendas, setVendas] = useState<any[]>([])

  useEffect(() => {
    if (isOpen && clienteId) {
      loadCliente()
    }
  }, [isOpen, clienteId])

  const loadCliente = async () => {
    if (!clienteId) return
    setLoading(true)
    try {
      const { data: clienteData } = await supabase
        .from('clientes')
        .select('*')
        .eq('id', clienteId)
        .single()
      
      setCliente(clienteData)

      // Carregar vendas do cliente
      const { data: vendasData } = await supabase
        .from('vendas')
        .select('id, numero, data_venda, valor_total, status')
        .eq('cliente_id', clienteId)
        .order('data_venda', { ascending: false })
        .limit(5)
      
      setVendas(vendasData || [])
    } catch (error) {
      console.error('Erro ao carregar cliente:', error)
    } finally {
      setLoading(false)
    }
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Detalhes do Cliente" size="xl">
      {loading ? (
        <div className="flex justify-center py-8">
          <LoadingSpinner />
        </div>
      ) : cliente ? (
        <div className="space-y-6">
          {/* Header */}
          <div className="flex items-start gap-4 p-4 bg-dark-700/50 rounded-lg">
            <div className="w-16 h-16 rounded-full bg-primary-500/20 flex items-center justify-center">
              {cliente.tipo_pessoa === 'juridica' ? (
                <Building className="w-8 h-8 text-primary-400" />
              ) : (
                <User className="w-8 h-8 text-primary-400" />
              )}
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <h3 className="text-xl font-bold text-white">
                  {cliente.razao_social || cliente.nome}
                </h3>
                <Badge variant={cliente.tipo_pessoa === 'juridica' ? 'primary' : 'secondary'}>
                  {cliente.tipo_pessoa === 'juridica' ? 'Pessoa Jurídica' : 'Pessoa Física'}
                </Badge>
              </div>
              {cliente.nome && cliente.razao_social && (
                <p className="text-dark-400">{cliente.nome}</p>
              )}
              <p className="text-dark-400 text-sm mt-1">
                {cliente.tipo_pessoa === 'juridica' ? 'CNPJ' : 'CPF'}: {cliente.cnpj || cliente.cpf || '-'}
              </p>
            </div>
          </div>

          {/* Informações */}
          <div className="grid grid-cols-2 gap-6">
            <div className="space-y-4">
              <h4 className="font-medium text-white flex items-center gap-2">
                <Phone className="w-4 h-4 text-primary-400" />
                Contato
              </h4>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-dark-400">Telefone:</span>
                  <span className="text-white">{cliente.telefone || '-'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-dark-400">Celular:</span>
                  <span className="text-white">{cliente.celular || '-'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-dark-400">Email:</span>
                  <span className="text-white">{cliente.email || '-'}</span>
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <h4 className="font-medium text-white flex items-center gap-2">
                <MapPin className="w-4 h-4 text-primary-400" />
                Endereço
              </h4>
              <div className="text-sm text-white">
                {cliente.endereco ? (
                  <>
                    <p>{cliente.endereco}, {cliente.numero}</p>
                    {cliente.complemento && <p>{cliente.complemento}</p>}
                    <p>{cliente.bairro}</p>
                    <p>{cliente.cidade} - {cliente.estado}</p>
                    <p>CEP: {cliente.cep}</p>
                  </>
                ) : (
                  <p className="text-dark-500">Endereço não cadastrado</p>
                )}
              </div>
            </div>
          </div>

          {/* Últimas Vendas */}
          {vendas.length > 0 && (
            <div className="border-t border-dark-600 pt-4">
              <h4 className="font-medium text-white mb-3 flex items-center gap-2">
                <ShoppingCart className="w-4 h-4 text-primary-400" />
                Últimas Vendas
              </h4>
              <div className="space-y-2">
                {vendas.map(v => (
                  <div key={v.id} className="flex justify-between items-center p-2 bg-dark-700 rounded">
                    <div>
                      <span className="text-white">Venda #{v.numero || v.id}</span>
                      <span className="text-dark-400 text-sm ml-2">{formatDate(v.data_venda)}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-green-400 font-medium">{formatCurrency(v.valor_total)}</span>
                      <Badge variant={v.status === 'concluida' ? 'success' : 'warning'} size="sm">
                        {v.status}
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Observações */}
          {cliente.observacoes && (
            <div className="border-t border-dark-600 pt-4">
              <h4 className="font-medium text-white mb-2">Observações</h4>
              <p className="text-dark-300 bg-dark-700 p-3 rounded">{cliente.observacoes}</p>
            </div>
          )}

          <div className="flex justify-end pt-4 border-t border-dark-600">
            <Button variant="secondary" onClick={onClose}>Fechar</Button>
          </div>
        </div>
      ) : (
        <p className="text-dark-400 text-center py-8">Cliente não encontrado</p>
      )}
    </Modal>
  )
}

// ==================== MODAL VENDA ====================

interface VendaModalProps {
  isOpen: boolean
  onClose: () => void
  vendaId: number | null
}

export function VendaDetailModal({ isOpen, onClose, vendaId }: VendaModalProps) {
  const [venda, setVenda] = useState<Venda | null>(null)
  const [loading, setLoading] = useState(false)
  const [itens, setItens] = useState<any[]>([])
  const [errorMsg, setErrorMsg] = useState<string | null>(null)

  useEffect(() => {
    if (isOpen && vendaId) {
      loadVenda()
    } else if (isOpen && !vendaId) {
      setErrorMsg('ID da venda não informado')
    }
  }, [isOpen, vendaId])

  useEffect(() => {
    if (!isOpen) {
      setVenda(null)
      setItens([])
      setErrorMsg(null)
    }
  }, [isOpen])

  const loadVenda = async () => {
    if (!vendaId) {
      setErrorMsg('ID da venda não informado')
      return
    }
    setLoading(true)
    setErrorMsg(null)
    try {
      console.log('Buscando venda ID:', vendaId)
      const { data: vendaData, error } = await supabase
        .from('vendas')
        .select(`
          *,
          cliente:clientes(id, nome, razao_social, cpf, cnpj)
        `)
        .eq('id', vendaId)
        .single()
      
      if (error) {
        console.error('Erro ao carregar venda:', error)
        setErrorMsg(`Erro: ${error.message}`)
        setVenda(null)
        setItens([])
        return
      }
      
      if (!vendaData) {
        setErrorMsg(`Venda #${vendaId} não encontrada no banco de dados`)
        setVenda(null)
        setItens([])
        return
      }
      
      console.log('Venda encontrada:', vendaData)
      setVenda(vendaData)

      // Carregar itens da venda
      const { data: itensData } = await supabase
        .from('itens_venda')
        .select(`
          *,
          produto:produtos(nome, codigo)
        `)
        .eq('venda_id', vendaId)
      
      setItens(itensData || [])
    } catch (error) {
      console.error('Erro ao carregar venda:', error)
    } finally {
      setLoading(false)
    }
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Detalhes da Venda" size="xl">
      {loading ? (
        <div className="flex justify-center py-8">
          <LoadingSpinner />
        </div>
      ) : venda ? (
        <div className="space-y-6">
          {/* Header */}
          <div className="flex items-start justify-between p-4 bg-dark-700/50 rounded-lg">
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-xl font-bold text-white">
                  Venda #{venda.numero || venda.id}
                </h3>
                <Badge variant={venda.status === 'concluida' ? 'success' : 'warning'}>
                  {venda.status}
                </Badge>
                {venda.nota_fiscal_emitida && (
                  <Badge variant="primary">NF Emitida</Badge>
                )}
              </div>
              <p className="text-dark-400 mt-1">
                <Calendar className="w-4 h-4 inline mr-1" />
                {formatDate(venda.data_venda)}
              </p>
              {venda.cliente && (
                <p className="text-dark-300 mt-2">
                  <User className="w-4 h-4 inline mr-1" />
                  {venda.cliente.razao_social || venda.cliente.nome}
                </p>
              )}
            </div>
            <div className="text-right">
              <p className="text-3xl font-bold text-green-400">
                {formatCurrency(venda.valor_total)}
              </p>
              <p className="text-dark-400 text-sm">
                Lucro: <span className="text-green-400">{formatCurrency(venda.lucro_bruto)}</span>
                <span className="ml-2">({venda.margem_lucro?.toFixed(1)}%)</span>
              </p>
            </div>
          </div>

          {/* Resumo Financeiro */}
          <div className="grid grid-cols-4 gap-4">
            <div className="p-3 bg-dark-700 rounded-lg">
              <p className="text-dark-400 text-sm">Produtos</p>
              <p className="text-white font-medium">{formatCurrency(venda.valor_produtos)}</p>
            </div>
            <div className="p-3 bg-dark-700 rounded-lg">
              <p className="text-dark-400 text-sm">Serviços</p>
              <p className="text-white font-medium">{formatCurrency(venda.valor_servicos)}</p>
            </div>
            <div className="p-3 bg-dark-700 rounded-lg">
              <p className="text-dark-400 text-sm">Desconto</p>
              <p className="text-red-400 font-medium">-{formatCurrency(venda.valor_desconto)}</p>
            </div>
            <div className="p-3 bg-dark-700 rounded-lg">
              <p className="text-dark-400 text-sm">Custo Total</p>
              <p className="text-white font-medium">{formatCurrency(venda.custo_total)}</p>
            </div>
          </div>

          {/* Itens */}
          {itens.length > 0 && (
            <div className="border-t border-dark-600 pt-4">
              <h4 className="font-medium text-white mb-3 flex items-center gap-2">
                <Package className="w-4 h-4 text-primary-400" />
                Itens da Venda
              </h4>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-dark-400 border-b border-dark-600">
                      <th className="text-left py-2">Produto</th>
                      <th className="text-center">Qtd</th>
                      <th className="text-right">Unit.</th>
                      <th className="text-right">Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    {itens.map((item, idx) => (
                      <tr key={idx} className="border-b border-dark-700">
                        <td className="py-2 text-white">
                          {item.produto?.nome || item.descricao}
                          {item.produto?.codigo && (
                            <span className="text-dark-500 text-xs ml-2">#{item.produto.codigo}</span>
                          )}
                        </td>
                        <td className="text-center text-dark-300">{item.quantidade}</td>
                        <td className="text-right text-dark-300">{formatCurrency(item.valor_unitario)}</td>
                        <td className="text-right text-white font-medium">{formatCurrency(item.valor_total)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Observações */}
          {venda.observacoes && (
            <div className="border-t border-dark-600 pt-4">
              <h4 className="font-medium text-white mb-2">Observações</h4>
              <p className="text-dark-300 bg-dark-700 p-3 rounded">{venda.observacoes}</p>
            </div>
          )}

          <div className="flex justify-end pt-4 border-t border-dark-600">
            <Button variant="secondary" onClick={onClose}>Fechar</Button>
          </div>
        </div>
      ) : (
        <div className="text-center py-8">
          <p className="text-dark-400">
            {errorMsg || `Venda #${vendaId} não encontrada`}
          </p>
          <p className="text-dark-500 text-sm mt-2">
            A venda pode ter sido removida ou o ID está incorreto.
          </p>
          <Button variant="secondary" onClick={onClose} className="mt-4">
            Fechar
          </Button>
        </div>
      )}
    </Modal>
  )
}

// ==================== MODAL PRODUTO ====================

interface ProdutoModalProps {
  isOpen: boolean
  onClose: () => void
  produtoId: number | null
}

export function ProdutoDetailModal({ isOpen, onClose, produtoId }: ProdutoModalProps) {
  const [produto, setProduto] = useState<Produto | null>(null)
  const [loading, setLoading] = useState(false)
  const [movimentacoes, setMovimentacoes] = useState<any[]>([])

  useEffect(() => {
    if (isOpen && produtoId) {
      loadProduto()
    }
  }, [isOpen, produtoId])

  const loadProduto = async () => {
    if (!produtoId) return
    setLoading(true)
    try {
      const { data: produtoData } = await supabase
        .from('produtos')
        .select(`
          *,
          categoria:categorias(nome),
          fornecedor:fornecedores(razao_social)
        `)
        .eq('id', produtoId)
        .single()
      
      setProduto(produtoData)

      // Últimas movimentações
      const { data: movData } = await supabase
        .from('movimentacoes_estoque')
        .select('*')
        .eq('produto_id', produtoId)
        .order('created_at', { ascending: false })
        .limit(5)
      
      setMovimentacoes(movData || [])
    } catch (error) {
      console.error('Erro ao carregar produto:', error)
    } finally {
      setLoading(false)
    }
  }

  const getEstoqueStatus = () => {
    if (!produto) return { variant: 'secondary' as const, text: '-' }
    if (produto.quantidade_estoque <= 0) return { variant: 'danger' as const, text: 'Sem estoque' }
    if (produto.quantidade_estoque <= produto.estoque_minimo) return { variant: 'warning' as const, text: 'Estoque baixo' }
    return { variant: 'success' as const, text: 'Em estoque' }
  }

  const estoqueStatus = getEstoqueStatus()

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Detalhes do Produto" size="xl">
      {loading ? (
        <div className="flex justify-center py-8">
          <LoadingSpinner />
        </div>
      ) : produto ? (
        <div className="space-y-6">
          {/* Header */}
          <div className="flex items-start gap-4 p-4 bg-dark-700/50 rounded-lg">
            <div className="w-16 h-16 rounded-lg bg-primary-500/20 flex items-center justify-center">
              <Package className="w-8 h-8 text-primary-400" />
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <h3 className="text-xl font-bold text-white">{produto.nome}</h3>
                <Badge variant={estoqueStatus.variant}>{estoqueStatus.text}</Badge>
              </div>
              {produto.codigo && (
                <p className="text-dark-400">Código: {produto.codigo}</p>
              )}
              {produto.categoria && (
                <p className="text-dark-400 text-sm mt-1">
                  <Tag className="w-3 h-3 inline mr-1" />
                  {produto.categoria.nome}
                </p>
              )}
            </div>
            <div className="text-right">
              <p className="text-2xl font-bold text-green-400">
                {formatCurrency(produto.valor_venda)}
              </p>
              <p className="text-dark-400 text-sm">
                Custo: {formatCurrency(produto.valor_custo)}
              </p>
            </div>
          </div>

          {/* Informações */}
          <div className="grid grid-cols-3 gap-4">
            <div className="p-3 bg-dark-700 rounded-lg text-center">
              <p className="text-dark-400 text-sm">Estoque Atual</p>
              <p className={`text-2xl font-bold ${
                produto.quantidade_estoque <= 0 ? 'text-red-400' : 
                produto.quantidade_estoque <= produto.estoque_minimo ? 'text-yellow-400' : 'text-white'
              }`}>
                {produto.quantidade_estoque} {produto.unidade}
              </p>
            </div>
            <div className="p-3 bg-dark-700 rounded-lg text-center">
              <p className="text-dark-400 text-sm">Estoque Mínimo</p>
              <p className="text-white text-2xl font-bold">{produto.estoque_minimo}</p>
            </div>
            <div className="p-3 bg-dark-700 rounded-lg text-center">
              <p className="text-dark-400 text-sm">Margem de Lucro</p>
              <p className="text-green-400 text-2xl font-bold">{produto.margem_lucro?.toFixed(1)}%</p>
            </div>
          </div>

          {/* Detalhes */}
          <div className="grid grid-cols-2 gap-6">
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-dark-400">Custo Médio:</span>
                <span className="text-white">{formatCurrency(produto.custo_medio)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-dark-400">Unidade:</span>
                <span className="text-white">{produto.unidade}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-dark-400">NCM:</span>
                <span className="text-white">{produto.ncm || '-'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-dark-400">Marca:</span>
                <span className="text-white">{produto.marca || '-'}</span>
              </div>
            </div>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-dark-400">Fornecedor:</span>
                <span className="text-white">{produto.fornecedor?.razao_social || '-'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-dark-400">Localização:</span>
                <span className="text-white">{produto.localizacao || '-'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-dark-400">Estoque Máximo:</span>
                <span className="text-white">{produto.estoque_maximo}</span>
              </div>
            </div>
          </div>

          {/* Últimas Movimentações */}
          {movimentacoes.length > 0 && (
            <div className="border-t border-dark-600 pt-4">
              <h4 className="font-medium text-white mb-3">Últimas Movimentações</h4>
              <div className="space-y-2">
                {movimentacoes.map(mov => (
                  <div key={mov.id} className="flex justify-between items-center p-2 bg-dark-700 rounded">
                    <div>
                      <Badge variant={mov.tipo === 'entrada' ? 'success' : 'danger'} size="sm">
                        {mov.tipo === 'entrada' ? '+' : '-'}{mov.quantidade}
                      </Badge>
                      <span className="text-dark-400 text-sm ml-2">{mov.motivo}</span>
                    </div>
                    <span className="text-dark-400 text-sm">{formatDate(mov.created_at)}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Descrição */}
          {produto.descricao && (
            <div className="border-t border-dark-600 pt-4">
              <h4 className="font-medium text-white mb-2">Descrição</h4>
              <p className="text-dark-300 bg-dark-700 p-3 rounded">{produto.descricao}</p>
            </div>
          )}

          <div className="flex justify-end pt-4 border-t border-dark-600">
            <Button variant="secondary" onClick={onClose}>Fechar</Button>
          </div>
        </div>
      ) : (
        <p className="text-dark-400 text-center py-8">Produto não encontrado</p>
      )}
    </Modal>
  )
}

// ==================== MODAL FORNECEDOR ====================

interface FornecedorModalProps {
  isOpen: boolean
  onClose: () => void
  fornecedorId: number | null
}

export function FornecedorDetailModal({ isOpen, onClose, fornecedorId }: FornecedorModalProps) {
  const [fornecedor, setFornecedor] = useState<Fornecedor | null>(null)
  const [loading, setLoading] = useState(false)
  const [produtos, setProdutos] = useState<any[]>([])

  useEffect(() => {
    if (isOpen && fornecedorId) {
      loadFornecedor()
    }
  }, [isOpen, fornecedorId])

  const loadFornecedor = async () => {
    if (!fornecedorId) return
    setLoading(true)
    try {
      const { data: fornecedorData } = await supabase
        .from('fornecedores')
        .select('*')
        .eq('id', fornecedorId)
        .single()
      
      setFornecedor(fornecedorData)

      // Produtos deste fornecedor
      const { data: produtosData } = await supabase
        .from('produtos')
        .select('id, nome, codigo, quantidade_estoque, valor_venda')
        .eq('fornecedor_id', fornecedorId)
        .limit(10)
      
      setProdutos(produtosData || [])
    } catch (error) {
      console.error('Erro ao carregar fornecedor:', error)
    } finally {
      setLoading(false)
    }
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Detalhes do Fornecedor" size="xl">
      {loading ? (
        <div className="flex justify-center py-8">
          <LoadingSpinner />
        </div>
      ) : fornecedor ? (
        <div className="space-y-6">
          {/* Header */}
          <div className="flex items-start gap-4 p-4 bg-dark-700/50 rounded-lg">
            <div className="w-16 h-16 rounded-full bg-orange-500/20 flex items-center justify-center">
              <Truck className="w-8 h-8 text-orange-400" />
            </div>
            <div className="flex-1">
              <h3 className="text-xl font-bold text-white">{fornecedor.razao_social}</h3>
              {fornecedor.nome_fantasia && (
                <p className="text-dark-400">{fornecedor.nome_fantasia}</p>
              )}
              <p className="text-dark-400 text-sm mt-1">
                CNPJ: {fornecedor.cnpj || '-'}
              </p>
            </div>
          </div>

          {/* Informações */}
          <div className="grid grid-cols-2 gap-6">
            <div className="space-y-4">
              <h4 className="font-medium text-white flex items-center gap-2">
                <Phone className="w-4 h-4 text-orange-400" />
                Contato
              </h4>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-dark-400">Telefone:</span>
                  <span className="text-white">{fornecedor.telefone || '-'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-dark-400">Celular:</span>
                  <span className="text-white">{fornecedor.celular || '-'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-dark-400">Email:</span>
                  <span className="text-white">{fornecedor.email || '-'}</span>
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <h4 className="font-medium text-white flex items-center gap-2">
                <MapPin className="w-4 h-4 text-orange-400" />
                Endereço
              </h4>
              <div className="text-sm text-white">
                {fornecedor.endereco ? (
                  <>
                    <p>{fornecedor.endereco}, {fornecedor.numero}</p>
                    <p>{fornecedor.bairro}</p>
                    <p>{fornecedor.cidade} - {fornecedor.estado}</p>
                    <p>CEP: {fornecedor.cep}</p>
                  </>
                ) : (
                  <p className="text-dark-500">Endereço não cadastrado</p>
                )}
              </div>
            </div>
          </div>

          {/* Produtos */}
          {produtos.length > 0 && (
            <div className="border-t border-dark-600 pt-4">
              <h4 className="font-medium text-white mb-3 flex items-center gap-2">
                <Package className="w-4 h-4 text-orange-400" />
                Produtos deste Fornecedor ({produtos.length})
              </h4>
              <div className="space-y-2">
                {produtos.map(p => (
                  <div key={p.id} className="flex justify-between items-center p-2 bg-dark-700 rounded">
                    <div>
                      <span className="text-white">{p.nome}</span>
                      {p.codigo && <span className="text-dark-500 text-sm ml-2">#{p.codigo}</span>}
                    </div>
                    <div className="flex items-center gap-4">
                      <span className="text-dark-400 text-sm">Estoque: {p.quantidade_estoque}</span>
                      <span className="text-green-400 font-medium">{formatCurrency(p.valor_venda)}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Observações */}
          {fornecedor.observacoes && (
            <div className="border-t border-dark-600 pt-4">
              <h4 className="font-medium text-white mb-2">Observações</h4>
              <p className="text-dark-300 bg-dark-700 p-3 rounded">{fornecedor.observacoes}</p>
            </div>
          )}

          <div className="flex justify-end pt-4 border-t border-dark-600">
            <Button variant="secondary" onClick={onClose}>Fechar</Button>
          </div>
        </div>
      ) : (
        <p className="text-dark-400 text-center py-8">Fornecedor não encontrado</p>
      )}
    </Modal>
  )
}

// ==================== MODAL NOTA FISCAL ENTRADA ====================

interface NFEntradaModalProps {
  isOpen: boolean
  onClose: () => void
  notaId: number | null
}

export function NFEntradaDetailModal({ isOpen, onClose, notaId }: NFEntradaModalProps) {
  const [nota, setNota] = useState<NotaFiscalEntrada | null>(null)
  const [loading, setLoading] = useState(false)
  const [itens, setItens] = useState<any[]>([])

  useEffect(() => {
    if (isOpen && notaId) {
      loadNota()
    }
  }, [isOpen, notaId])

  const loadNota = async () => {
    if (!notaId) return
    setLoading(true)
    try {
      const { data: notaData } = await supabase
        .from('notas_fiscais_entrada')
        .select('*')
        .eq('id', notaId)
        .single()
      
      setNota(notaData)

      // Itens da nota
      const { data: itensData } = await supabase
        .from('itens_nota_entrada')
        .select(`
          *,
          produto:produtos(nome, codigo)
        `)
        .eq('nota_fiscal_id', notaId)
      
      setItens(itensData || [])
    } catch (error) {
      console.error('Erro ao carregar nota:', error)
    } finally {
      setLoading(false)
    }
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Detalhes da Nota Fiscal" size="xl">
      {loading ? (
        <div className="flex justify-center py-8">
          <LoadingSpinner />
        </div>
      ) : nota ? (
        <div className="space-y-6">
          {/* Header */}
          <div className="flex items-start justify-between p-4 bg-dark-700/50 rounded-lg">
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-xl font-bold text-white">NF #{nota.numero}</h3>
                <Badge variant={nota.status === 'processada' ? 'success' : 'warning'}>
                  {nota.status}
                </Badge>
              </div>
              <p className="text-dark-400 mt-1">Série: {nota.serie || '-'}</p>
              <p className="text-dark-300 mt-2">{nota.fornecedor_razao_social}</p>
            </div>
            <div className="text-right">
              <p className="text-3xl font-bold text-white">
                {formatCurrency(nota.valor_total)}
              </p>
              <p className="text-dark-400 text-sm">
                Entrada: {formatDate(nota.data_entrada)}
              </p>
            </div>
          </div>

          {/* Chave de Acesso */}
          {nota.chave_acesso && (
            <div className="p-3 bg-dark-700 rounded-lg">
              <p className="text-dark-400 text-sm mb-1">Chave de Acesso</p>
              <p className="text-white font-mono text-xs break-all">{nota.chave_acesso}</p>
            </div>
          )}

          {/* Itens */}
          {itens.length > 0 && (
            <div className="border-t border-dark-600 pt-4">
              <h4 className="font-medium text-white mb-3">Itens da Nota</h4>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-dark-400 border-b border-dark-600">
                      <th className="text-left py-2">Produto</th>
                      <th className="text-center">Qtd</th>
                      <th className="text-right">Unit.</th>
                      <th className="text-right">Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    {itens.map((item, idx) => (
                      <tr key={idx} className="border-b border-dark-700">
                        <td className="py-2 text-white">
                          {item.produto?.nome || item.descricao}
                        </td>
                        <td className="text-center text-dark-300">{item.quantidade}</td>
                        <td className="text-right text-dark-300">{formatCurrency(item.valor_unitario)}</td>
                        <td className="text-right text-white font-medium">{formatCurrency(item.valor_total)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          <div className="flex justify-end pt-4 border-t border-dark-600">
            <Button variant="secondary" onClick={onClose}>Fechar</Button>
          </div>
        </div>
      ) : (
        <p className="text-dark-400 text-center py-8">Nota fiscal não encontrada</p>
      )}
    </Modal>
  )
}
