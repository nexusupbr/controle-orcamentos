'use client'

import { useEffect, useState, useRef } from 'react'
import { 
  Plus, Edit2, Trash2, Search, Package, Eye, 
  AlertTriangle, TrendingUp, Filter, Download, 
  ChevronDown, ChevronUp, History, DollarSign,
  FileUp, Upload, CheckCircle, XCircle
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

interface ImportResult {
  success: number
  errors: { linha: number; erro: string }[]
}

interface ImportPreviewItem {
  linha: number
  selected: boolean
  isDuplicate: boolean
  duplicateReason?: string
  data: {
    codigo: string
    codigo_barras: string
    gtin_ean: string
    nome: string
    descricao: string
    unidade: string
    ncm: string
    origem: string
    classificacao_fiscal: string
    valor_custo: number
    valor_venda: number
    custo_medio: number
    margem_lucro: number
    quantidade_estoque: number
    estoque_minimo: number
    estoque_maximo: number
    marca: string
    peso_kg: number
    tamanho: string
    localizacao: string
    ativo: boolean
  }
}

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
  
  // Estados para seleção em massa
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set())
  const [deleting, setDeleting] = useState(false)
  
  // Modais
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [isCategoriaModalOpen, setIsCategoriaModalOpen] = useState(false)
  const [isHistoricoModalOpen, setIsHistoricoModalOpen] = useState(false)
  const [isFormadorPrecoOpen, setIsFormadorPrecoOpen] = useState(false)
  const [isImportModalOpen, setIsImportModalOpen] = useState(false)
  
  // Estados para importação CSV
  const [importing, setImporting] = useState(false)
  const [importResult, setImportResult] = useState<ImportResult | null>(null)
  const [importPreview, setImportPreview] = useState<ImportPreviewItem[]>([])
  const [importStep, setImportStep] = useState<'select' | 'preview' | 'result'>('select')
  const csvInputRef = useRef<HTMLInputElement>(null)
  
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
    custo: '',
    margem: '30',
    impostos: '',
    frete: '',
    outros: ''
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

  // Funções para seleção em massa
  const toggleSelectItem = (id: number) => {
    setSelectedIds(prev => {
      const newSet = new Set(prev)
      if (newSet.has(id)) {
        newSet.delete(id)
      } else {
        newSet.add(id)
      }
      return newSet
    })
  }

  const toggleSelectAllProdutos = () => {
    if (selectedIds.size === filteredProdutos.length) {
      setSelectedIds(new Set())
    } else {
      setSelectedIds(new Set(filteredProdutos.map(p => p.id)))
    }
  }

  const handleDeleteSelected = async () => {
    if (selectedIds.size === 0) return
    
    const count = selectedIds.size
    if (!confirm(`Tem certeza que deseja excluir ${count} produto(s)?\n\nEsta ação não pode ser desfeita.`)) return
    
    setDeleting(true)
    let successCount = 0
    let errorCount = 0
    
    const idsArray = Array.from(selectedIds)
    for (const id of idsArray) {
      try {
        await deleteProduto(id)
        successCount++
      } catch (err) {
        console.error(`Erro ao excluir produto ${id}:`, err)
        errorCount++
      }
    }
    
    setSelectedIds(new Set())
    await loadData()
    setDeleting(false)
    
    if (errorCount > 0) {
      alert(`${successCount} excluído(s) com sucesso.\n${errorCount} erro(s) ao excluir.`)
    }
  }

  // Função para importar CSV de produtos
  const parseCSVLine = (line: string, delimiter: string = ','): string[] => {
    const result: string[] = []
    let current = ''
    let inQuotes = false
    
    for (let i = 0; i < line.length; i++) {
      const char = line[i]
      if (char === '"') {
        inQuotes = !inQuotes
      } else if (char === delimiter && !inQuotes) {
        // Remove aspas residuais e espaços
        result.push(current.replace(/"/g, '').trim())
        current = ''
      } else {
        current += char
      }
    }
    // Remove aspas residuais do último campo
    result.push(current.replace(/"/g, '').trim())
    return result
  }

  const parseNumber = (value: string): number => {
    if (!value) return 0
    // Remove caracteres não numéricos exceto vírgula e ponto
    const cleaned = value.replace(/[^\d,.-]/g, '').replace(',', '.')
    return parseFloat(cleaned) || 0
  }

  // Função para carregar CSV e mostrar preview
  const handleLoadCSVPreview = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    const reader = new FileReader()
    reader.onload = async (event) => {
      try {
        const text = event.target?.result as string
        const lines = text.split('\n').filter(line => line.trim())
        
        const delimiter = lines[0].includes(';') ? ';' : ','
        const dataLines = lines.slice(1)
        
        // Recarregar lista de produtos para garantir dados atualizados
        const produtosAtualizados = await fetchProdutos()
        setProdutos(produtosAtualizados)
        
        const previewItems: ImportPreviewItem[] = []
        const codigosNoCSV = new Map<string, number>() // Para detectar duplicados dentro do CSV
        const nomesNoCSV = new Map<string, number>()
        const codigosBarrasNoCSV = new Map<string, number>()

        for (let i = 0; i < dataLines.length; i++) {
          const line = dataLines[i]
          if (!line.trim()) continue
          
          const columns = parseCSVLine(line, delimiter)
          
          const codigo = columns[0] || ''
          const nome = columns[2] || ''
          const marca = columns[5] || ''
          const estoqueMinimo = parseNumber(columns[6])
          const estoqueMaximo = parseNumber(columns[7])
          const estoqueAtual = parseNumber(columns[8])
          const unidade = columns[9] || 'UN'
          const valorVenda = parseNumber(columns[11])
          const valorCusto = parseNumber(columns[12])
          const peso = parseNumber(columns[13])
          const ncm = columns[22] || ''
          const origem = columns[23] || '0'
          const codigoBarras = columns[25] || ''
          const classificacaoFiscal = columns[26] || '07'
          const observacoes = columns[27] || ''
          const situacao = columns[30]?.toLowerCase().includes('ativo') !== false
          const tamanho = columns[31] || ''
          const localizacao = columns[32] || ''

          // Verificar duplicação no banco
          let isDuplicate = false
          let duplicateReason = ''
          
          const produtoExistente = produtosAtualizados.find(p => 
            (codigo && p.codigo === codigo) || 
            p.nome.toLowerCase() === nome.toLowerCase() ||
            (codigoBarras && p.codigo_barras === codigoBarras)
          )
          
          if (produtoExistente) {
            isDuplicate = true
            if (codigo && produtoExistente.codigo === codigo) {
              duplicateReason = `Código "${codigo}" já cadastrado: ${produtoExistente.nome}`
            } else if (codigoBarras && produtoExistente.codigo_barras === codigoBarras) {
              duplicateReason = `Código de barras já cadastrado: ${produtoExistente.nome}`
            } else {
              duplicateReason = `Nome similar já cadastrado: ${produtoExistente.nome}`
            }
          }
          
          // Verificar duplicação DENTRO do próprio CSV
          if (!isDuplicate) {
            if (codigo) {
              const linhaAnterior = codigosNoCSV.get(codigo)
              if (linhaAnterior !== undefined) {
                isDuplicate = true
                duplicateReason = `Código "${codigo}" duplicado no CSV (mesmo que linha ${linhaAnterior})`
              } else {
                codigosNoCSV.set(codigo, i + 2)
              }
            }
            
            if (!isDuplicate && nome) {
              const nomeNormalizado = nome.toLowerCase().trim()
              const linhaAnterior = nomesNoCSV.get(nomeNormalizado)
              if (linhaAnterior !== undefined) {
                isDuplicate = true
                duplicateReason = `Nome "${nome}" duplicado no CSV (mesmo que linha ${linhaAnterior})`
              } else {
                nomesNoCSV.set(nomeNormalizado, i + 2)
              }
            }
            
            if (!isDuplicate && codigoBarras) {
              const linhaAnterior = codigosBarrasNoCSV.get(codigoBarras)
              if (linhaAnterior !== undefined) {
                isDuplicate = true
                duplicateReason = `Código de barras duplicado no CSV (mesmo que linha ${linhaAnterior})`
              } else {
                codigosBarrasNoCSV.set(codigoBarras, i + 2)
              }
            }
          }

          previewItems.push({
            linha: i + 2,
            selected: !isDuplicate && !!nome,
            isDuplicate,
            duplicateReason,
            data: {
              codigo,
              codigo_barras: codigoBarras,
              gtin_ean: codigoBarras,
              nome,
              descricao: observacoes,
              unidade: unidade.toUpperCase(),
              ncm: ncm.replace(/\D/g, ''),
              origem,
              classificacao_fiscal: classificacaoFiscal,
              valor_custo: valorCusto,
              valor_venda: valorVenda,
              custo_medio: valorCusto,
              margem_lucro: valorCusto > 0 ? ((valorVenda - valorCusto) / valorCusto) * 100 : 0,
              quantidade_estoque: estoqueAtual,
              estoque_minimo: estoqueMinimo,
              estoque_maximo: estoqueMaximo,
              marca,
              peso_kg: peso,
              tamanho,
              localizacao,
              ativo: situacao
            }
          })
        }

        setImportPreview(previewItems)
        setImportStep('preview')
      } catch (err) {
        console.error('Erro ao processar CSV:', err)
        alert('Erro ao ler o arquivo CSV')
      }
      if (csvInputRef.current) csvInputRef.current.value = ''
    }

    reader.readAsText(file, 'UTF-8')
  }

  // Função para confirmar importação
  const handleConfirmImport = async () => {
    const selectedItems = importPreview.filter(item => item.selected)
    if (selectedItems.length === 0) {
      alert('Selecione pelo menos um item para importar')
      return
    }

    setImporting(true)
    let success = 0
    const errors: { linha: number; erro: string }[] = []

    for (const item of selectedItems) {
      try {
        if (!item.data.nome) {
          errors.push({ linha: item.linha, erro: 'Nome do produto não informado' })
          continue
        }
        await createProduto(item.data as any)
        success++
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Erro desconhecido'
        errors.push({ linha: item.linha, erro: message })
      }
    }

    setImportResult({ success, errors })
    setImportStep('result')
    setImporting(false)
    await loadData()
  }

  // Toggle seleção de item no preview
  const togglePreviewItem = (index: number) => {
    setImportPreview(prev => prev.map((item, i) => 
      i === index ? { ...item, selected: !item.selected } : item
    ))
  }

  // Selecionar/desmarcar todos
  const toggleSelectAll = (selected: boolean) => {
    setImportPreview(prev => prev.map(item => ({ 
      ...item, 
      selected: selected && !item.isDuplicate && !!item.data.nome 
    })))
  }

  // Resetar modal de importação
  const resetImportModal = () => {
    setIsImportModalOpen(false)
    setImportResult(null)
    setImportPreview([])
    setImportStep('select')
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
    const custo = parseFloat(formadorData.custo) || 0
    const margem = parseFloat(formadorData.margem) || 0
    const impostos = parseFloat(formadorData.impostos) || 0
    const frete = parseFloat(formadorData.frete) || 0
    const outros = parseFloat(formadorData.outros) || 0
    // Calcular valores percentuais sobre o custo
    const valorImpostos = custo * (impostos / 100)
    const valorFrete = custo * (frete / 100)
    const valorOutros = custo * (outros / 100)
    const custoTotal = custo + valorImpostos + valorFrete + valorOutros
    const precoVenda = custoTotal * (1 + margem / 100)
    return { precoVenda, custoTotal, valorImpostos, valorFrete, valorOutros }
  }

  const aplicarFormadorPreco = () => {
    const { precoVenda } = calcularPrecoVenda()
    const custo = parseFloat(formadorData.custo) || 0
    const margem = parseFloat(formadorData.margem) || 0
    setFormData({
      ...formData,
      valor_custo: custo,
      valor_venda: Number(precoVenda.toFixed(2)),
      margem_lucro: margem
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
            onClick={() => setIsImportModalOpen(true)}
            leftIcon={<FileUp className="w-4 h-4" />}
          >
            Importar CSV
          </Button>
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
        
        {selectedIds.size > 0 && (
          <div className="mt-4 p-3 bg-red-500/10 border border-red-500/30 rounded-lg flex items-center justify-between">
            <span className="text-red-400 font-medium">{selectedIds.size} produto(s) selecionado(s)</span>
            <div className="flex gap-2">
              <Button variant="secondary" size="sm" onClick={() => setSelectedIds(new Set())}>Limpar Seleção</Button>
              <Button variant="danger" size="sm" onClick={handleDeleteSelected} disabled={deleting} leftIcon={<Trash2 className="w-4 h-4" />}>
                {deleting ? 'Excluindo...' : 'Excluir Selecionados'}
              </Button>
            </div>
          </div>
        )}
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
                  <th className="w-10">
                    <input 
                      type="checkbox" 
                      checked={selectedIds.size === filteredProdutos.length && filteredProdutos.length > 0}
                      onChange={toggleSelectAllProdutos}
                      className="w-4 h-4 rounded text-primary-500"
                    />
                  </th>
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
                  <tr key={produto.id} className={`group ${selectedIds.has(produto.id) ? 'bg-primary-500/5' : ''}`}>
                    <td>
                      <input 
                        type="checkbox" 
                        checked={selectedIds.has(produto.id)}
                        onChange={() => toggleSelectItem(produto.id)}
                        className="w-4 h-4 rounded text-primary-500"
                      />
                    </td>
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
                  setFormadorData({ ...formadorData, custo: String(formData.valor_custo || '') })
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
            <label className="block text-sm font-medium text-dark-300 mb-2">Custo do Produto (R$)</label>
            <input
              type="number"
              step="0.01"
              value={formadorData.custo}
              onChange={(e) => setFormadorData({ ...formadorData, custo: e.target.value })}
              className="input w-full"
              placeholder="0,00"
            />
          </div>
          
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="block text-sm font-medium text-dark-300 mb-2">Impostos (%)</label>
              <div className="relative">
                <input
                  type="number"
                  step="0.1"
                  value={formadorData.impostos}
                  onChange={(e) => setFormadorData({ ...formadorData, impostos: e.target.value })}
                  className="input w-full pr-8"
                  placeholder="0"
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-dark-400">%</span>
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-dark-300 mb-2">Frete (%)</label>
              <div className="relative">
                <input
                  type="number"
                  step="0.1"
                  value={formadorData.frete}
                  onChange={(e) => setFormadorData({ ...formadorData, frete: e.target.value })}
                  className="input w-full pr-8"
                  placeholder="0"
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-dark-400">%</span>
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-dark-300 mb-2">Outros (%)</label>
              <div className="relative">
                <input
                  type="number"
                  step="0.1"
                  value={formadorData.outros}
                  onChange={(e) => setFormadorData({ ...formadorData, outros: e.target.value })}
                  className="input w-full pr-8"
                  placeholder="0"
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-dark-400">%</span>
              </div>
            </div>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-dark-300 mb-2">Margem de Lucro (%)</label>
            <div className="relative">
              <input
                type="number"
                step="0.1"
                value={formadorData.margem}
                onChange={(e) => setFormadorData({ ...formadorData, margem: e.target.value })}
                className="input w-full pr-8"
              />
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-dark-400">%</span>
            </div>
          </div>
          
          <div className="border-t border-dark-700 pt-4 space-y-2">
            {parseFloat(formadorData.custo) > 0 && (
              <>
                <div className="flex justify-between items-center text-sm">
                  <span className="text-dark-400">Custo Base:</span>
                  <span className="text-white">{formatCurrency(parseFloat(formadorData.custo) || 0)}</span>
                </div>
                {parseFloat(formadorData.impostos) > 0 && (
                  <div className="flex justify-between items-center text-sm">
                    <span className="text-dark-400">+ Impostos ({formadorData.impostos}%):</span>
                    <span className="text-white">{formatCurrency(calcularPrecoVenda().valorImpostos)}</span>
                  </div>
                )}
                {parseFloat(formadorData.frete) > 0 && (
                  <div className="flex justify-between items-center text-sm">
                    <span className="text-dark-400">+ Frete ({formadorData.frete}%):</span>
                    <span className="text-white">{formatCurrency(calcularPrecoVenda().valorFrete)}</span>
                  </div>
                )}
                {parseFloat(formadorData.outros) > 0 && (
                  <div className="flex justify-between items-center text-sm">
                    <span className="text-dark-400">+ Outros ({formadorData.outros}%):</span>
                    <span className="text-white">{formatCurrency(calcularPrecoVenda().valorOutros)}</span>
                  </div>
                )}
              </>
            )}
            <div className="flex justify-between items-center pt-2 border-t border-dark-700">
              <span className="text-dark-400">Custo Total:</span>
              <span className="text-white font-medium">
                {formatCurrency(calcularPrecoVenda().custoTotal)}
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-dark-400">Preço de Venda Sugerido:</span>
              <span className="text-green-400 font-bold text-lg">
                {formatCurrency(calcularPrecoVenda().precoVenda)}
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

      {/* Modal de Importação CSV de Produtos */}
      <Modal isOpen={isImportModalOpen} onClose={resetImportModal} title="Importar Produtos" size="xl">
        <div className="space-y-6">
          {/* Step 1: Seleção de arquivo */}
          {importStep === 'select' && (
            <>
              <div className="p-4 bg-dark-700/50 rounded-lg">
                <h4 className="text-white font-medium mb-2">Formato do arquivo CSV</h4>
                <p className="text-dark-400 text-sm mb-3">O arquivo deve conter as colunas separadas por vírgula (,) ou ponto e vírgula (;):</p>
                <div className="text-xs text-dark-500 font-mono bg-dark-800 p-3 rounded overflow-x-auto">
                  Código;Tipo;Nome;Fornecedor;ID Fornec;Marca;Est.Min;Est.Max;Est.Atual;Unidade;Variado;Valor Venda;Valor Custo;...
                </div>
              </div>

              <div className="flex flex-col items-center justify-center p-8 border-2 border-dashed border-dark-600 rounded-lg hover:border-primary-500 transition-colors">
                <input ref={csvInputRef} type="file" accept=".csv,.txt" onChange={handleLoadCSVPreview} className="hidden" />
                <FileUp className="w-12 h-12 text-dark-400 mb-4" />
                <p className="text-dark-300 mb-4">Selecione o arquivo CSV para importar</p>
                <Button onClick={() => csvInputRef.current?.click()} leftIcon={<Upload className="w-4 h-4" />}>Selecionar Arquivo</Button>
              </div>

              <div className="flex justify-end pt-4 border-t border-dark-700">
                <Button variant="secondary" onClick={resetImportModal}>Cancelar</Button>
              </div>
            </>
          )}

          {/* Step 2: Preview e seleção */}
          {importStep === 'preview' && (
            <>
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="text-white font-medium">Revisão dos dados</h4>
                  <p className="text-dark-400 text-sm">
                    {importPreview.filter(i => i.selected).length} de {importPreview.length} itens selecionados
                    {importPreview.filter(i => i.isDuplicate).length > 0 && (
                      <span className="text-yellow-400 ml-2">
                        ({importPreview.filter(i => i.isDuplicate).length} duplicados)
                      </span>
                    )}
                  </p>
                </div>
                <div className="flex gap-2">
                  <Button variant="secondary" size="sm" onClick={() => toggleSelectAll(true)}>Selecionar Todos</Button>
                  <Button variant="secondary" size="sm" onClick={() => toggleSelectAll(false)}>Desmarcar Todos</Button>
                </div>
              </div>

              <div className="max-h-96 overflow-y-auto border border-dark-700 rounded-lg">
                <table className="data-table">
                  <thead className="sticky top-0 bg-dark-800 z-10">
                    <tr>
                      <th className="w-10"></th>
                      <th>Linha</th>
                      <th>Código</th>
                      <th>Nome</th>
                      <th>Marca</th>
                      <th className="text-right">Custo</th>
                      <th className="text-right">Venda</th>
                      <th className="text-right">Estoque</th>
                      <th>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {importPreview.map((item, index) => (
                      <tr key={index} className={`${item.isDuplicate ? 'bg-yellow-500/5' : ''} ${!item.selected ? 'opacity-50' : ''}`}>
                        <td>
                          <input
                            type="checkbox"
                            checked={item.selected}
                            onChange={() => togglePreviewItem(index)}
                            className="w-4 h-4 rounded text-primary-500"
                          />
                        </td>
                        <td className="text-dark-400">{item.linha}</td>
                        <td className="text-dark-300 font-mono text-sm">{item.data.codigo || '-'}</td>
                        <td className="text-white">{item.data.nome || <span className="text-red-400">Nome vazio</span>}</td>
                        <td className="text-dark-400">{item.data.marca || '-'}</td>
                        <td className="text-right text-dark-300">{formatCurrency(item.data.valor_custo)}</td>
                        <td className="text-right text-green-400">{formatCurrency(item.data.valor_venda)}</td>
                        <td className="text-right text-white">{item.data.quantidade_estoque} {item.data.unidade}</td>
                        <td>
                          {item.isDuplicate ? (
                            <div className="flex items-center gap-1">
                              <AlertTriangle className="w-4 h-4 text-yellow-400" />
                              <span className="text-yellow-400 text-xs" title={item.duplicateReason}>Duplicado</span>
                            </div>
                          ) : !item.data.nome ? (
                            <XCircle className="w-4 h-4 text-red-400" />
                          ) : (
                            <CheckCircle className="w-4 h-4 text-green-400" />
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {importPreview.some(i => i.isDuplicate) && (
                <div className="p-3 bg-yellow-500/10 border border-yellow-500/30 rounded-lg">
                  <p className="text-yellow-400 text-sm flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4" />
                    Itens duplicados foram automaticamente desmarcados. Você pode selecioná-los manualmente se desejar.
                  </p>
                </div>
              )}

              <div className="flex justify-between pt-4 border-t border-dark-700">
                <Button variant="secondary" onClick={() => { setImportStep('select'); setImportPreview([]) }}>Voltar</Button>
                <div className="flex gap-2">
                  <Button variant="secondary" onClick={resetImportModal}>Cancelar</Button>
                  <Button
                    onClick={handleConfirmImport}
                    disabled={importing || importPreview.filter(i => i.selected).length === 0}
                    leftIcon={importing ? <LoadingSpinner size="sm" /> : <CheckCircle className="w-4 h-4" />}
                  >
                    {importing ? 'Importando...' : `Importar ${importPreview.filter(i => i.selected).length} itens`}
                  </Button>
                </div>
              </div>
            </>
          )}

          {/* Step 3: Resultado */}
          {importStep === 'result' && importResult && (
            <>
              <div className="space-y-4">
                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-2 p-4 bg-green-500/10 rounded-lg flex-1">
                    <CheckCircle className="w-6 h-6 text-green-400" />
                    <div>
                      <p className="text-green-400 font-bold text-xl">{importResult.success}</p>
                      <p className="text-dark-400 text-sm">Importados com sucesso</p>
                    </div>
                  </div>
                  {importResult.errors.length > 0 && (
                    <div className="flex items-center gap-2 p-4 bg-red-500/10 rounded-lg flex-1">
                      <XCircle className="w-6 h-6 text-red-400" />
                      <div>
                        <p className="text-red-400 font-bold text-xl">{importResult.errors.length}</p>
                        <p className="text-dark-400 text-sm">Erros encontrados</p>
                      </div>
                    </div>
                  )}
                </div>

                {importResult.errors.length > 0 && (
                  <div className="max-h-48 overflow-y-auto bg-dark-800 rounded-lg p-3">
                    <p className="text-dark-400 text-sm mb-2">Detalhes dos erros:</p>
                    {importResult.errors.slice(0, 50).map((err, i) => (
                      <p key={i} className="text-red-400 text-xs mb-1">Linha {err.linha}: {err.erro}</p>
                    ))}
                    {importResult.errors.length > 50 && (
                      <p className="text-dark-500 text-xs mt-2">... e mais {importResult.errors.length - 50} erros</p>
                    )}
                  </div>
                )}
              </div>

              <div className="flex justify-end pt-4 border-t border-dark-700">
                <Button onClick={resetImportModal}>Fechar</Button>
              </div>
            </>
          )}
        </div>
      </Modal>
    </div>
  )
}
