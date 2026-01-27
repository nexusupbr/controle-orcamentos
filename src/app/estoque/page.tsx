'use client'

import { useEffect, useState } from 'react'
import { 
  Plus, Edit2, Trash2, Search, Package, Eye, 
  AlertTriangle, TrendingUp, Filter, Download, 
  ChevronDown, ChevronUp, History, DollarSign
} from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Input, Select } from '@/components/ui/Form'
import { Modal } from '@/components/ui/Modal'
import { LoadingSpinner, EmptyState, Badge } from '@/components/ui/Common'
import { 
  Produto, Categoria, ClassificacaoFiscal, Fornecedor, MovimentacaoEstoque,
  fetchProdutos, createProduto, updateProduto, deleteProduto,
  fetchCategorias, createCategoria, updateCategoria, deleteCategoria,
  fetchClassificacoesFiscais, fetchFornecedores, fetchMovimentacoesEstoque,
  checkProdutoDuplicado
} from '@/lib/database'
import { formatCurrency } from '@/lib/utils'

// Classificações fiscais padrão
const classificacoesPadrao = [
  { codigo: '00', nome: 'Mercadoria para Revenda' },
  { codigo: '01', nome: 'Matéria-Prima' },
  { codigo: '02', nome: 'Embalagem' },
  { codigo: '03', nome: 'Produto em Processo' },
  { codigo: '04', nome: 'Produto Acabado' },
  { codigo: '05', nome: 'Subproduto' },
  { codigo: '06', nome: 'Produto Intermediário' },
  { codigo: '07', nome: 'Material de Uso e Consumo' },
  { codigo: '08', nome: 'Ativo Imobilizado' },
  { codigo: '09', nome: 'Serviços' },
  { codigo: '10', nome: 'Outros Insumos' },
  { codigo: '99', nome: 'Outras' },
]

export default function EstoquePage() {
  const [produtos, setProdutos] = useState<Produto[]>([])
  const [categorias, setCategorias] = useState<Categoria[]>([])
  const [classificacoes, setClassificacoes] = useState<ClassificacaoFiscal[]>([])
  const [fornecedores, setFornecedores] = useState<Fornecedor[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')
  const [filterCategoria, setFilterCategoria] = useState<string>('')
  const [filterClassificacao, setFilterClassificacao] = useState<string>('')
  
  // Modais
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [isCategoriaModalOpen, setIsCategoriaModalOpen] = useState(false)
  const [isHistoricoModalOpen, setIsHistoricoModalOpen] = useState(false)
  const [isFormadorPrecoOpen, setIsFormadorPrecoOpen] = useState(false)
  
  const [editingId, setEditingId] = useState<number | null>(null)
  const [formError, setFormError] = useState<string | null>(null)
  const [duplicateWarning, setDuplicateWarning] = useState<string | null>(null)
  
  // Histórico de movimentações
  const [movimentacoes, setMovimentacoes] = useState<MovimentacaoEstoque[]>([])
  const [selectedProduto, setSelectedProduto] = useState<Produto | null>(null)
  
  // Form de produto
  const [formData, setFormData] = useState({
    codigo: '',
    codigo_barras: '',
    gtin_ean: '',
    nome: '',
    descricao: '',
    unidade: 'UN',
    ncm: '',
    cfop: '',
    origem: '0',
    categoria_id: null as number | null,
    classificacao_fiscal: '07',
    valor_custo: 0,
    valor_venda: 0,
    custo_medio: 0,
    margem_lucro: 0,
    quantidade_estoque: 0,
    estoque_minimo: 0,
    estoque_maximo: 0,
    marca: '',
    peso_kg: 0,
    tamanho: '',
    fornecedor_id: null as number | null,
    localizacao: '',
  })
  
  // Form de categoria
  const [categoriaForm, setCategoriaForm] = useState({
    nome: '',
    descricao: '',
    cor: '#3B82F6'
  })
  const [editingCategoriaId, setEditingCategoriaId] = useState<number | null>(null)
  
  // Formador de preço
  const [formadorData, setFormadorData] = useState({
    custo: 0,
    margem: 30,
    impostos: 0,
    frete: 0,
    outros: 0
  })

  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    try {
      setLoading(true)
      const [produtosData, categoriasData, fornecedoresData] = await Promise.all([
        fetchProdutos(),
        fetchCategorias(),
        fetchFornecedores()
      ])
      setProdutos(produtosData)
      setCategorias(categoriasData)
      setFornecedores(fornecedoresData)
      
      // Tentar carregar classificações, usar padrão se não existir a tabela
      try {
        const classData = await fetchClassificacoesFiscais()
        setClassificacoes(classData.length > 0 ? classData : classificacoesPadrao as any)
      } catch {
        setClassificacoes(classificacoesPadrao as any)
      }
    } catch (err) {
      console.error('Erro ao carregar dados:', err)
    } finally {
      setLoading(false)
    }
  }

  // Filtrar produtos
  const filteredProdutos = produtos.filter(p => {
    const matchSearch = p.nome.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.codigo?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.codigo_barras?.includes(searchTerm)
    const matchCategoria = !filterCategoria || p.categoria_id === Number(filterCategoria)
    const matchClassificacao = !filterClassificacao || p.classificacao_fiscal === filterClassificacao
    return matchSearch && matchCategoria && matchClassificacao
  })

  // Verificar duplicação ao digitar nome
  const handleNomeChange = async (nome: string) => {
    setFormData({ ...formData, nome })
    setDuplicateWarning(null)
    
    if (nome.length > 3) {
      const duplicado = await checkProdutoDuplicado(nome, editingId || undefined)
      if (duplicado) {
        setDuplicateWarning('Já existe um produto com nome similar!')
      }
    }
  }

  // Abrir modal de produto
  const openModal = (produto?: Produto) => {
    setFormError(null)
    setDuplicateWarning(null)
    
    if (produto) {
      setEditingId(produto.id)
      setFormData({
        codigo: produto.codigo || '',
        codigo_barras: produto.codigo_barras || '',
        gtin_ean: produto.gtin_ean || '',
        nome: produto.nome,
        descricao: produto.descricao || '',
        unidade: produto.unidade,
        ncm: produto.ncm || '',
        cfop: produto.cfop || '',
        origem: produto.origem,
        categoria_id: produto.categoria_id,
        classificacao_fiscal: produto.classificacao_fiscal,
        valor_custo: produto.valor_custo,
        valor_venda: produto.valor_venda,
        custo_medio: produto.custo_medio,
        margem_lucro: produto.margem_lucro,
        quantidade_estoque: produto.quantidade_estoque,
        estoque_minimo: produto.estoque_minimo,
        estoque_maximo: produto.estoque_maximo,
        marca: produto.marca || '',
        peso_kg: produto.peso_kg,
        tamanho: produto.tamanho || '',
        fornecedor_id: produto.fornecedor_id,
        localizacao: produto.localizacao || '',
      })
    } else {
      setEditingId(null)
      setFormData({
        codigo: '',
        codigo_barras: '',
        gtin_ean: '',
        nome: '',
        descricao: '',
        unidade: 'UN',
        ncm: '',
        cfop: '',
        origem: '0',
        categoria_id: null,
        classificacao_fiscal: '07',
        valor_custo: 0,
        valor_venda: 0,
        custo_medio: 0,
        margem_lucro: 0,
        quantidade_estoque: 0,
        estoque_minimo: 0,
        estoque_maximo: 0,
        marca: '',
        peso_kg: 0,
        tamanho: '',
        fornecedor_id: null,
        localizacao: '',
      })
    }
    setIsModalOpen(true)
  }

  const closeModal = () => {
    setIsModalOpen(false)
    setEditingId(null)
    setFormError(null)
    setDuplicateWarning(null)
  }

  // Salvar produto
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    setFormError(null)
    
    try {
      if (editingId) {
        await updateProduto(editingId, formData)
      } else {
        await createProduto(formData)
      }
      await loadData()
      closeModal()
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Erro ao salvar produto'
      setFormError(message)
    } finally {
      setSaving(false)
    }
  }

  // Excluir produto
  const handleDelete = async (id: number) => {
    if (!confirm('Tem certeza que deseja excluir este produto?')) return
    
    try {
      await deleteProduto(id)
      await loadData()
    } catch (err) {
      console.error('Erro ao excluir:', err)
      alert('Erro ao excluir produto')
    }
  }

  // Ver histórico de movimentações
  const handleVerHistorico = async (produto: Produto) => {
    setSelectedProduto(produto)
    try {
      const movs = await fetchMovimentacoesEstoque(produto.id)
      setMovimentacoes(movs)
      setIsHistoricoModalOpen(true)
    } catch (err) {
      console.error('Erro ao carregar histórico:', err)
    }
  }

  // Formador de preço
  const calcularPrecoVenda = () => {
    const { custo, margem, impostos, frete, outros } = formadorData
    const custoTotal = custo + impostos + frete + outros
    const precoVenda = custoTotal * (1 + margem / 100)
    return precoVenda
  }

  const aplicarFormadorPreco = () => {
    const precoVenda = calcularPrecoVenda()
    setFormData({
      ...formData,
      valor_custo: formadorData.custo,
      valor_venda: Number(precoVenda.toFixed(2)),
      margem_lucro: formadorData.margem
    })
    setIsFormadorPrecoOpen(false)
  }

  // Categorias
  const openCategoriaModal = (categoria?: Categoria) => {
    if (categoria) {
      setEditingCategoriaId(categoria.id)
      setCategoriaForm({
        nome: categoria.nome,
        descricao: categoria.descricao || '',
        cor: categoria.cor
      })
    } else {
      setEditingCategoriaId(null)
      setCategoriaForm({ nome: '', descricao: '', cor: '#3B82F6' })
    }
    setIsCategoriaModalOpen(true)
  }

  const handleSaveCategoria = async () => {
    try {
      if (editingCategoriaId) {
        await updateCategoria(editingCategoriaId, categoriaForm)
      } else {
        await createCategoria(categoriaForm)
      }
      const categoriasData = await fetchCategorias()
      setCategorias(categoriasData)
      setIsCategoriaModalOpen(false)
    } catch (err) {
      console.error('Erro ao salvar categoria:', err)
    }
  }

  const handleDeleteCategoria = async (id: number) => {
    if (!confirm('Excluir esta categoria?')) return
    try {
      await deleteCategoria(id)
      const categoriasData = await fetchCategorias()
      setCategorias(categoriasData)
    } catch (err) {
      alert('Erro ao excluir categoria. Ela pode estar em uso.')
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-[60vh]">
        <LoadingSpinner size="lg" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div>
          <h1 className="text-2xl lg:text-3xl font-bold font-heading text-white">
            Estoque
          </h1>
          <p className="text-dark-400 mt-1">
            Gerencie produtos, categorias e movimentações
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="secondary"
            onClick={() => openCategoriaModal()}
            leftIcon={<Plus className="w-4 h-4" />}
          >
            Nova Categoria
          </Button>
          <Button
            onClick={() => openModal()}
            leftIcon={<Plus className="w-5 h-5" />}
          >
            Novo Produto
          </Button>
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="glass-card p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-primary-500/20 flex items-center justify-center">
              <Package className="w-5 h-5 text-primary-400" />
            </div>
            <div>
              <p className="text-dark-400 text-sm">Total Produtos</p>
              <p className="text-xl font-bold text-white">{produtos.length}</p>
            </div>
          </div>
        </div>
        
        <div className="glass-card p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-green-500/20 flex items-center justify-center">
              <TrendingUp className="w-5 h-5 text-green-400" />
            </div>
            <div>
              <p className="text-dark-400 text-sm">Valor em Estoque</p>
              <p className="text-xl font-bold text-white">
                {formatCurrency(produtos.reduce((acc, p) => acc + (p.quantidade_estoque * p.custo_medio), 0))}
              </p>
            </div>
          </div>
        </div>
        
        <div className="glass-card p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-yellow-500/20 flex items-center justify-center">
              <AlertTriangle className="w-5 h-5 text-yellow-400" />
            </div>
            <div>
              <p className="text-dark-400 text-sm">Estoque Baixo</p>
              <p className="text-xl font-bold text-white">
                {produtos.filter(p => p.quantidade_estoque <= p.estoque_minimo && p.estoque_minimo > 0).length}
              </p>
            </div>
          </div>
        </div>
        
        <div className="glass-card p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-blue-500/20 flex items-center justify-center">
              <DollarSign className="w-5 h-5 text-blue-400" />
            </div>
            <div>
              <p className="text-dark-400 text-sm">Valor Venda</p>
              <p className="text-xl font-bold text-white">
                {formatCurrency(produtos.reduce((acc, p) => acc + (p.quantidade_estoque * p.valor_venda), 0))}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Filtros */}
      <div className="glass-card p-4">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="relative md:col-span-2">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-dark-400" />
            <input
              type="text"
              placeholder="Buscar por nome, código ou código de barras..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="input pl-12 w-full"
            />
          </div>
          
          <select
            value={filterCategoria}
            onChange={(e) => setFilterCategoria(e.target.value)}
            className="input"
          >
            <option value="">Todas as categorias</option>
            {categorias.map(cat => (
              <option key={cat.id} value={cat.id}>{cat.nome}</option>
            ))}
          </select>
          
          <select
            value={filterClassificacao}
            onChange={(e) => setFilterClassificacao(e.target.value)}
            className="input"
          >
            <option value="">Todas as classificações</option>
            {(classificacoes.length > 0 ? classificacoes : classificacoesPadrao).map(c => (
              <option key={c.codigo} value={c.codigo}>{c.codigo} - {c.nome}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Categorias (cards editáveis) */}
      <div className="glass-card p-4">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-white">Categorias</h3>
        </div>
        <div className="flex flex-wrap gap-2">
          {categorias.map(cat => (
            <div
              key={cat.id}
              className="flex items-center gap-2 px-3 py-2 rounded-lg bg-dark-800 group"
              style={{ borderLeft: `3px solid ${cat.cor}` }}
            >
              <span className="text-sm text-white">{cat.nome}</span>
              <span className="text-xs text-dark-400">
                ({produtos.filter(p => p.categoria_id === cat.id).length})
              </span>
              <div className="hidden group-hover:flex gap-1">
                <button
                  onClick={() => openCategoriaModal(cat)}
                  className="p-1 hover:bg-dark-700 rounded"
                >
                  <Edit2 className="w-3 h-3 text-dark-400" />
                </button>
                <button
                  onClick={() => handleDeleteCategoria(cat.id)}
                  className="p-1 hover:bg-dark-700 rounded"
                >
                  <Trash2 className="w-3 h-3 text-red-400" />
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Tabela de Produtos */}
      <div className="glass-card overflow-hidden">
        {filteredProdutos.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Código</th>
                  <th>Produto</th>
                  <th>Categoria</th>
                  <th>Classificação</th>
                  <th className="text-right">Estoque</th>
                  <th className="text-right">Custo</th>
                  <th className="text-right">Venda</th>
                  <th className="text-right">Margem</th>
                  <th className="text-right">Ações</th>
                </tr>
              </thead>
              <tbody>
                {filteredProdutos.map((produto) => (
                  <tr key={produto.id} className="group">
                    <td className="text-dark-400">{produto.codigo || '-'}</td>
                    <td>
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-lg bg-primary-500/10 flex items-center justify-center">
                          <Package className="w-5 h-5 text-primary-400" />
                        </div>
                        <div>
                          <span className="font-medium text-white">{produto.nome}</span>
                          {produto.marca && (
                            <p className="text-xs text-dark-400">{produto.marca}</p>
                          )}
                        </div>
                      </div>
                    </td>
                    <td>
                      <Badge variant="secondary">
                        {produto.categoria?.nome || 'Sem categoria'}
                      </Badge>
                    </td>
                    <td>
                      <span className="text-sm text-dark-400">
                        {classificacoesPadrao.find(c => c.codigo === produto.classificacao_fiscal)?.nome || produto.classificacao_fiscal}
                      </span>
                    </td>
                    <td className="text-right">
                      <span className={`font-medium ${
                        produto.quantidade_estoque <= produto.estoque_minimo && produto.estoque_minimo > 0
                          ? 'text-red-400' 
                          : 'text-white'
                      }`}>
                        {produto.quantidade_estoque} {produto.unidade}
                      </span>
                    </td>
                    <td className="text-right text-dark-300">
                      {formatCurrency(produto.custo_medio || produto.valor_custo)}
                    </td>
                    <td className="text-right text-green-400 font-medium">
                      {formatCurrency(produto.valor_venda)}
                    </td>
                    <td className="text-right">
                      <Badge variant={produto.margem_lucro >= 30 ? 'success' : produto.margem_lucro >= 15 ? 'warning' : 'danger'}>
                        {produto.margem_lucro.toFixed(1)}%
                      </Badge>
                    </td>
                    <td>
                      <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button
                          onClick={() => handleVerHistorico(produto)}
                          className="p-2 rounded-lg text-dark-400 hover:text-blue-400 hover:bg-blue-500/10 transition-colors"
                          title="Ver histórico"
                        >
                          <History className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => openModal(produto)}
                          className="p-2 rounded-lg text-dark-400 hover:text-primary-400 hover:bg-primary-500/10 transition-colors"
                          title="Editar"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDelete(produto.id)}
                          className="p-2 rounded-lg text-dark-400 hover:text-red-400 hover:bg-red-500/10 transition-colors"
                          title="Excluir"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <EmptyState
            icon={<Package className="w-10 h-10 text-dark-500" />}
            title="Nenhum produto encontrado"
            description="Adicione produtos ao estoque"
            action={
              <Button onClick={() => openModal()} leftIcon={<Plus className="w-4 h-4" />}>
                Novo Produto
              </Button>
            }
          />
        )}
      </div>

      {/* Modal de Produto */}
      <Modal
        isOpen={isModalOpen}
        onClose={closeModal}
        title={editingId ? 'Editar Produto' : 'Novo Produto'}
        size="xl"
      >
        <form onSubmit={handleSubmit} className="space-y-6">
          {formError && (
            <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
              {formError}
            </div>
          )}
          
          {duplicateWarning && (
            <div className="p-3 rounded-lg bg-yellow-500/10 border border-yellow-500/20 text-yellow-400 text-sm flex items-center gap-2">
              <AlertTriangle className="w-4 h-4" />
              {duplicateWarning}
            </div>
          )}

          {/* Informações básicas */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-dark-300 mb-2">Nome *</label>
              <input
                type="text"
                value={formData.nome}
                onChange={(e) => handleNomeChange(e.target.value)}
                className="input w-full"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-dark-300 mb-2">Código</label>
              <input
                type="text"
                value={formData.codigo}
                onChange={(e) => setFormData({ ...formData, codigo: e.target.value })}
                className="input w-full"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-dark-300 mb-2">GTIN/EAN</label>
              <input
                type="text"
                value={formData.gtin_ean}
                onChange={(e) => setFormData({ ...formData, gtin_ean: e.target.value })}
                className="input w-full"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <label className="block text-sm font-medium text-dark-300 mb-2">NCM</label>
              <input
                type="text"
                value={formData.ncm}
                onChange={(e) => setFormData({ ...formData, ncm: e.target.value })}
                className="input w-full"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-dark-300 mb-2">Unidade</label>
              <select
                value={formData.unidade}
                onChange={(e) => setFormData({ ...formData, unidade: e.target.value })}
                className="input w-full"
              >
                <option value="UN">UN - Unidade</option>
                <option value="KG">KG - Quilograma</option>
                <option value="L">L - Litro</option>
                <option value="M">M - Metro</option>
                <option value="M2">M² - Metro Quadrado</option>
                <option value="M3">M³ - Metro Cúbico</option>
                <option value="CX">CX - Caixa</option>
                <option value="PC">PC - Peça</option>
                <option value="PAR">PAR - Par</option>
                <option value="SC">SC - Saco</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-dark-300 mb-2">Marca</label>
              <input
                type="text"
                value={formData.marca}
                onChange={(e) => setFormData({ ...formData, marca: e.target.value })}
                className="input w-full"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-dark-300 mb-2">Peso (Kg)</label>
              <input
                type="number"
                step="0.001"
                value={formData.peso_kg}
                onChange={(e) => setFormData({ ...formData, peso_kg: Number(e.target.value) })}
                className="input w-full"
              />
            </div>
          </div>

          {/* Classificação */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-dark-300 mb-2">Categoria</label>
              <select
                value={formData.categoria_id || ''}
                onChange={(e) => setFormData({ ...formData, categoria_id: e.target.value ? Number(e.target.value) : null })}
                className="input w-full"
              >
                <option value="">Selecione...</option>
                {categorias.map(cat => (
                  <option key={cat.id} value={cat.id}>{cat.nome}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-dark-300 mb-2">Classificação Fiscal</label>
              <select
                value={formData.classificacao_fiscal}
                onChange={(e) => setFormData({ ...formData, classificacao_fiscal: e.target.value })}
                className="input w-full"
              >
                {classificacoesPadrao.map(c => (
                  <option key={c.codigo} value={c.codigo}>{c.codigo} - {c.nome}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-dark-300 mb-2">Fornecedor</label>
              <select
                value={formData.fornecedor_id || ''}
                onChange={(e) => setFormData({ ...formData, fornecedor_id: e.target.value ? Number(e.target.value) : null })}
                className="input w-full"
              >
                <option value="">Selecione...</option>
                {fornecedores.map(f => (
                  <option key={f.id} value={f.id}>{f.razao_social}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Valores */}
          <div className="border-t border-dark-700 pt-4">
            <div className="flex items-center justify-between mb-4">
              <h4 className="text-white font-medium">Valores</h4>
              <Button
                type="button"
                variant="secondary"
                size="sm"
                onClick={() => {
                  setFormadorData({ ...formadorData, custo: formData.valor_custo })
                  setIsFormadorPrecoOpen(true)
                }}
                leftIcon={<DollarSign className="w-4 h-4" />}
              >
                Formador de Preço
              </Button>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div>
                <label className="block text-sm font-medium text-dark-300 mb-2">Valor de Custo</label>
                <input
                  type="number"
                  step="0.01"
                  value={formData.valor_custo}
                  onChange={(e) => setFormData({ ...formData, valor_custo: Number(e.target.value) })}
                  className="input w-full"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-dark-300 mb-2">Custo Médio</label>
                <input
                  type="number"
                  step="0.01"
                  value={formData.custo_medio}
                  onChange={(e) => setFormData({ ...formData, custo_medio: Number(e.target.value) })}
                  className="input w-full bg-dark-700"
                  readOnly
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-dark-300 mb-2">Valor de Venda</label>
                <input
                  type="number"
                  step="0.01"
                  value={formData.valor_venda}
                  onChange={(e) => setFormData({ ...formData, valor_venda: Number(e.target.value) })}
                  className="input w-full"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-dark-300 mb-2">Margem (%)</label>
                <input
                  type="number"
                  step="0.1"
                  value={formData.margem_lucro}
                  onChange={(e) => setFormData({ ...formData, margem_lucro: Number(e.target.value) })}
                  className="input w-full"
                />
              </div>
            </div>
          </div>

          {/* Estoque */}
          <div className="border-t border-dark-700 pt-4">
            <h4 className="text-white font-medium mb-4">Estoque</h4>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div>
                <label className="block text-sm font-medium text-dark-300 mb-2">Quantidade Atual</label>
                <input
                  type="number"
                  step="0.0001"
                  value={formData.quantidade_estoque}
                  onChange={(e) => setFormData({ ...formData, quantidade_estoque: Number(e.target.value) })}
                  className="input w-full"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-dark-300 mb-2">Estoque Mínimo</label>
                <input
                  type="number"
                  step="0.0001"
                  value={formData.estoque_minimo}
                  onChange={(e) => setFormData({ ...formData, estoque_minimo: Number(e.target.value) })}
                  className="input w-full"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-dark-300 mb-2">Estoque Máximo</label>
                <input
                  type="number"
                  step="0.0001"
                  value={formData.estoque_maximo}
                  onChange={(e) => setFormData({ ...formData, estoque_maximo: Number(e.target.value) })}
                  className="input w-full"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-dark-300 mb-2">Localização</label>
                <input
                  type="text"
                  value={formData.localizacao}
                  onChange={(e) => setFormData({ ...formData, localizacao: e.target.value })}
                  className="input w-full"
                  placeholder="Ex: Prateleira A1"
                />
              </div>
            </div>
          </div>

          {/* Descrição */}
          <div>
            <label className="block text-sm font-medium text-dark-300 mb-2">Descrição</label>
            <textarea
              value={formData.descricao}
              onChange={(e) => setFormData({ ...formData, descricao: e.target.value })}
              className="input w-full h-24 resize-none"
            />
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-dark-700">
            <Button type="button" variant="secondary" onClick={closeModal}>
              Cancelar
            </Button>
            <Button type="submit" disabled={saving}>
              {saving ? 'Salvando...' : editingId ? 'Salvar' : 'Cadastrar'}
            </Button>
          </div>
        </form>
      </Modal>

      {/* Modal de Categoria */}
      <Modal
        isOpen={isCategoriaModalOpen}
        onClose={() => setIsCategoriaModalOpen(false)}
        title={editingCategoriaId ? 'Editar Categoria' : 'Nova Categoria'}
        size="sm"
      >
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-dark-300 mb-2">Nome</label>
            <input
              type="text"
              value={categoriaForm.nome}
              onChange={(e) => setCategoriaForm({ ...categoriaForm, nome: e.target.value })}
              className="input w-full"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-dark-300 mb-2">Descrição</label>
            <input
              type="text"
              value={categoriaForm.descricao}
              onChange={(e) => setCategoriaForm({ ...categoriaForm, descricao: e.target.value })}
              className="input w-full"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-dark-300 mb-2">Cor</label>
            <input
              type="color"
              value={categoriaForm.cor}
              onChange={(e) => setCategoriaForm({ ...categoriaForm, cor: e.target.value })}
              className="w-full h-10 rounded-lg cursor-pointer"
            />
          </div>
          <div className="flex justify-end gap-3 pt-4">
            <Button variant="secondary" onClick={() => setIsCategoriaModalOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleSaveCategoria}>
              Salvar
            </Button>
          </div>
        </div>
      </Modal>

      {/* Modal de Histórico */}
      <Modal
        isOpen={isHistoricoModalOpen}
        onClose={() => setIsHistoricoModalOpen(false)}
        title={`Histórico - ${selectedProduto?.nome}`}
        size="lg"
      >
        <div className="space-y-4">
          <div className="grid grid-cols-3 gap-4 mb-4">
            <div className="glass-card p-3">
              <p className="text-dark-400 text-sm">Estoque Atual</p>
              <p className="text-xl font-bold text-white">{selectedProduto?.quantidade_estoque} {selectedProduto?.unidade}</p>
            </div>
            <div className="glass-card p-3">
              <p className="text-dark-400 text-sm">Custo Médio</p>
              <p className="text-xl font-bold text-white">{formatCurrency(selectedProduto?.custo_medio || 0)}</p>
            </div>
            <div className="glass-card p-3">
              <p className="text-dark-400 text-sm">Última Compra</p>
              <p className="text-xl font-bold text-white">{formatCurrency(selectedProduto?.custo_ultima_compra || 0)}</p>
            </div>
          </div>
          
          {movimentacoes.length > 0 ? (
            <div className="overflow-x-auto max-h-96">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Data</th>
                    <th>Tipo</th>
                    <th className="text-right">Quantidade</th>
                    <th className="text-right">Valor Unit.</th>
                    <th>Motivo</th>
                  </tr>
                </thead>
                <tbody>
                  {movimentacoes.map(mov => (
                    <tr key={mov.id}>
                      <td>{new Date(mov.data_movimentacao).toLocaleDateString('pt-BR')}</td>
                      <td>
                        <Badge variant={mov.tipo === 'entrada' ? 'success' : mov.tipo === 'saida' ? 'danger' : 'warning'}>
                          {mov.tipo}
                        </Badge>
                      </td>
                      <td className="text-right font-medium">
                        {mov.tipo === 'saida' ? '-' : '+'}{mov.quantidade}
                      </td>
                      <td className="text-right">{formatCurrency(mov.valor_unitario || 0)}</td>
                      <td className="text-dark-400">{mov.motivo || '-'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="text-center text-dark-400 py-8">Nenhuma movimentação registrada</p>
          )}
        </div>
      </Modal>

      {/* Modal Formador de Preço */}
      <Modal
        isOpen={isFormadorPrecoOpen}
        onClose={() => setIsFormadorPrecoOpen(false)}
        title="Formador de Preço"
        size="sm"
      >
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-dark-300 mb-2">Custo do Produto</label>
            <input
              type="number"
              step="0.01"
              value={formadorData.custo}
              onChange={(e) => setFormadorData({ ...formadorData, custo: Number(e.target.value) })}
              className="input w-full"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-dark-300 mb-2">Impostos</label>
            <input
              type="number"
              step="0.01"
              value={formadorData.impostos}
              onChange={(e) => setFormadorData({ ...formadorData, impostos: Number(e.target.value) })}
              className="input w-full"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-dark-300 mb-2">Frete</label>
            <input
              type="number"
              step="0.01"
              value={formadorData.frete}
              onChange={(e) => setFormadorData({ ...formadorData, frete: Number(e.target.value) })}
              className="input w-full"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-dark-300 mb-2">Outros Custos</label>
            <input
              type="number"
              step="0.01"
              value={formadorData.outros}
              onChange={(e) => setFormadorData({ ...formadorData, outros: Number(e.target.value) })}
              className="input w-full"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-dark-300 mb-2">Margem de Lucro (%)</label>
            <input
              type="number"
              step="0.1"
              value={formadorData.margem}
              onChange={(e) => setFormadorData({ ...formadorData, margem: Number(e.target.value) })}
              className="input w-full"
            />
          </div>
          
          <div className="border-t border-dark-700 pt-4">
            <div className="flex justify-between items-center mb-2">
              <span className="text-dark-400">Custo Total:</span>
              <span className="text-white font-medium">
                {formatCurrency(formadorData.custo + formadorData.impostos + formadorData.frete + formadorData.outros)}
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-dark-400">Preço de Venda Sugerido:</span>
              <span className="text-green-400 font-bold text-lg">
                {formatCurrency(calcularPrecoVenda())}
              </span>
            </div>
          </div>
          
          <div className="flex justify-end gap-3 pt-4">
            <Button variant="secondary" onClick={() => setIsFormadorPrecoOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={aplicarFormadorPreco}>
              Aplicar
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  )
}
