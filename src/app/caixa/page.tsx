'use client'

import { useEffect, useState, useRef } from 'react'
import { 
  Plus, Search, DollarSign, TrendingUp, TrendingDown, Calendar,
  Filter, Download, Upload, CheckCircle, Clock, AlertTriangle,
  FileText, Receipt, Truck, CreditCard, Building, Trash2, AlertCircle,
  ChevronDown, ChevronRight, Link2, Unlink, Merge, GitMerge, Edit2, Save, X
} from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Modal } from '@/components/ui/Modal'
import { LoadingSpinner, EmptyState, Badge } from '@/components/ui/Common'
import { 
  ClienteDetailModal, VendaDetailModal, FornecedorDetailModal, NFEntradaDetailModal 
} from '@/components/ui/DetailModals'
import { 
  LancamentoFinanceiro, CategoriaFinanceira, ContaBancaria, Venda,
  fetchLancamentosFinanceiros, createLancamentoFinanceiro, deleteLancamentoFinanceiro,
  updateLancamentoFinanceiro,
  verificarExclusaoLancamento,
  fetchCategoriasFinanceiras, fetchContasBancarias,
  fetchVendas, getRelatorioCaixa, checkOFXDuplicado,
  buscarLancamentosSemelhantes, checkOFXDuplicadoAvancado,
  agruparLancamentos, fetchLancamentosAgrupados, desagruparLancamento,
  detectarDuplicadosExistentes, mesclarDuplicados, ParDuplicado,
  reconciliarDuplicadosAutomatico,
  LancamentoSemelhante, ResultadoImportacaoOFX
} from '@/lib/database'
import { formatCurrency, formatDate } from '@/lib/utils'
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, LineChart, Line
} from 'recharts'

type PeriodoType = 'dia' | 'semana' | 'mes' | 'ano' | 'personalizado'
type TipoLancamento = 'todos' | 'entrada' | 'saida'

const COLORS = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#EC4899', '#14B8A6', '#F97316']

export default function CaixaPage() {
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  
  // Dados
  const [lancamentos, setLancamentos] = useState<LancamentoFinanceiro[]>([])
  const [categorias, setCategorias] = useState<CategoriaFinanceira[]>([])
  const [contasBancarias, setContasBancarias] = useState<ContaBancaria[]>([])
  const [vendas, setVendas] = useState<Venda[]>([])
  
  // Filtros
  const [searchTerm, setSearchTerm] = useState('')
  const [filterPeriodo, setFilterPeriodo] = useState<PeriodoType>('mes')
  const [filterTipo, setFilterTipo] = useState<TipoLancamento>('todos')
  const [filterCategoria, setFilterCategoria] = useState<number | null>(null)
  const [filterContaBancaria, setFilterContaBancaria] = useState<number | null>(null)
  const [dataInicio, setDataInicio] = useState('')
  const [dataFim, setDataFim] = useState('')
  const [filterComNF, setFilterComNF] = useState<'todos' | 'com_nf' | 'sem_nf'>('todos')
  
  // Modal
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [isDCTeModalOpen, setIsDCTeModalOpen] = useState(false)
  const [isOFXModalOpen, setIsOFXModalOpen] = useState(false)
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false)
  const [selectedLancamento, setSelectedLancamento] = useState<LancamentoFinanceiro | null>(null)
  
  // Exclusão de lançamento
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false)
  const [deleteError, setDeleteError] = useState<string | null>(null)
  const [deleting, setDeleting] = useState(false)
  
  // Seleção em massa
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set())
  const [isDeleteMassModalOpen, setIsDeleteMassModalOpen] = useState(false)
  const [deletingMass, setDeletingMass] = useState(false)
  const [deleteMassProgress, setDeleteMassProgress] = useState({ current: 0, total: 0, errors: 0 })
  
  // Modais de detalhes vinculados
  const [clienteModalOpen, setClienteModalOpen] = useState(false)
  const [vendaModalOpen, setVendaModalOpen] = useState(false)
  const [fornecedorModalOpen, setFornecedorModalOpen] = useState(false)
  const [nfEntradaModalOpen, setNfEntradaModalOpen] = useState(false)
  const [selectedClienteId, setSelectedClienteId] = useState<number | null>(null)
  const [selectedVendaId, setSelectedVendaId] = useState<number | null>(null)
  const [selectedFornecedorId, setSelectedFornecedorId] = useState<number | null>(null)
  const [selectedNfEntradaId, setSelectedNfEntradaId] = useState<number | null>(null)
  
  // Form Lançamento
  const [formData, setFormData] = useState({
    tipo: 'entrada' as 'entrada' | 'saida',
    valor: 0,
    data: new Date().toISOString().split('T')[0],
    descricao: '',
    categoria_id: null as number | null,
    conta_bancaria_id: null as number | null,
    venda_id: null as number | null,
    numero_nf: '',
    observacoes: ''
  })
  
  // Form DCTe/Frete
  const [formDCTe, setFormDCTe] = useState({
    numero_cte: '',
    chave_cte: '',
    valor_frete: 0,
    data: new Date().toISOString().split('T')[0],
    transportadora: '',
    observacoes: '',
    categoria_id: null as number | null,
    conta_bancaria_id: null as number | null
  })
  
  // OFX Import
  const [ofxData, setOfxData] = useState<any[]>([])
  const [ofxCategorizacao, setOfxCategorizacao] = useState<{[key: string]: number}>({})
  const [importResult, setImportResult] = useState<ResultadoImportacaoOFX | null>(null)
  
  // Lançamentos semelhantes
  const [lancamentosSemelhantes, setLancamentosSemelhantes] = useState<LancamentoSemelhante[]>([])
  const [buscandoSemelhantes, setBuscandoSemelhantes] = useState(false)
  const [ignorarSugestoes, setIgnorarSugestoes] = useState<Set<number>>(new Set())
  const [agrupando, setAgrupando] = useState(false)
  
  // Grupos expandidos na tabela
  const [gruposExpandidos, setGruposExpandidos] = useState<Set<number>>(new Set())
  
  // Detecção de duplicados existentes
  const [isDuplicadosModalOpen, setIsDuplicadosModalOpen] = useState(false)
  const [duplicadosEncontrados, setDuplicadosEncontrados] = useState<ParDuplicado[]>([])
  const [buscandoDuplicados, setBuscandoDuplicados] = useState(false)
  const [processandoDuplicado, setProcessandoDuplicado] = useState<number | null>(null)
  
  // Edição de categoria inline
  const [editingCategoriaLancId, setEditingCategoriaLancId] = useState<number | null>(null)
  const [editingCategoriaValue, setEditingCategoriaValue] = useState<number | null>(null)
  const [savingCategoria, setSavingCategoria] = useState(false)

  // Validação de categorias OFX
  const [attemptedImport, setAttemptedImport] = useState(false)
  const [missingCategoryIds, setMissingCategoryIds] = useState<string[]>([])
  const [missingContaBancaria, setMissingContaBancaria] = useState(false)
  const ofxRowRefs = useRef<{[key: string]: HTMLTableRowElement | null}>({})
  const ofxSelectRefs = useRef<{[key: string]: HTMLSelectElement | null}>({})
  const contaBancariaSelectRef = useRef<HTMLSelectElement | null>(null)

  useEffect(() => {
    loadData(true) // true = executar reconciliação automática na primeira carga
    setDefaultDates()
  }, [])

  const setDefaultDates = () => {
    const now = new Date()
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)
    setDataInicio(startOfMonth.toISOString().split('T')[0])
    setDataFim(now.toISOString().split('T')[0])
  }

  const loadData = async (runReconciliacao: boolean = false) => {
    try {
      setLoading(true)
      
      // Reconciliação automática de duplicados (roda na primeira carga)
      if (runReconciliacao) {
        const resultadoReconciliacao = await reconciliarDuplicadosAutomatico()
        if (resultadoReconciliacao.mesclados > 0) {
          console.log(`✅ ${resultadoReconciliacao.mesclados} duplicado(s) reconciliado(s) automaticamente`)
        }
      }
      
      const [lancs, cats, contas, vends] = await Promise.all([
        fetchLancamentosAgrupados(), // Usa função que carrega grupos
        fetchCategoriasFinanceiras(),
        fetchContasBancarias(),
        fetchVendas()
      ])
      setLancamentos(lancs)
      setCategorias(cats)
      setContasBancarias(contas)
      setVendas(vends)
    } catch (err) {
      console.error('Erro ao carregar dados:', err)
    } finally {
      setLoading(false)
    }
  }

  // Aplicar filtros de data
  const getDateRange = () => {
    const now = new Date()
    let start = new Date()
    let end = now
    
    switch (filterPeriodo) {
      case 'dia':
        start = new Date(now.getFullYear(), now.getMonth(), now.getDate())
        break
      case 'semana':
        start = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 7)
        break
      case 'mes':
        start = new Date(now.getFullYear(), now.getMonth(), 1)
        break
      case 'ano':
        start = new Date(now.getFullYear(), 0, 1)
        break
      case 'personalizado':
        start = dataInicio ? new Date(dataInicio) : start
        end = dataFim ? new Date(dataFim) : end
        break
    }
    
    return { start, end }
  }

  // Filtrar lançamentos
  const { start, end } = getDateRange()
  const filteredLancamentos = lancamentos.filter(l => {
    const dataLanc = new Date(l.data_lancamento)
    const matchPeriodo = dataLanc >= start && dataLanc <= end
    const matchSearch = l.descricao?.toLowerCase().includes(searchTerm.toLowerCase())
    const matchTipo = filterTipo === 'todos' || l.tipo === filterTipo || 
                     (filterTipo === 'entrada' && l.tipo === 'receita') ||
                     (filterTipo === 'saida' && l.tipo === 'despesa')
    const matchCategoria = !filterCategoria || l.categoria_id === filterCategoria
    const matchConta = !filterContaBancaria || l.conta_id === filterContaBancaria
    const matchNF = filterComNF === 'todos' || 
                   (filterComNF === 'com_nf' && l.com_nota_fiscal) || 
                   (filterComNF === 'sem_nf' && !l.com_nota_fiscal)
    
    return matchPeriodo && matchSearch && matchTipo && matchCategoria && matchConta && matchNF
  })

  // Calcular totais
  const totalEntradas = filteredLancamentos
    .filter(l => l.tipo === 'receita' || l.tipo === 'entrada')
    .reduce((acc, l) => acc + l.valor, 0)
  
  const totalSaidas = filteredLancamentos
    .filter(l => l.tipo === 'despesa' || l.tipo === 'saida')
    .reduce((acc, l) => acc + l.valor, 0)
  
  const saldo = totalEntradas - totalSaidas

  // Dados para gráficos
  const dadosPorCategoria = categorias.map(cat => {
    const valor = filteredLancamentos
      .filter(l => l.categoria_id === cat.id)
      .reduce((acc, l) => acc + ((l.tipo === 'saida' || l.tipo === 'despesa') ? l.valor : 0), 0)
    return { name: cat.nome, value: valor, cor: cat.cor }
  }).filter(d => d.value > 0)

  const dadosPorDia = () => {
    const dados: { [key: string]: { entradas: number, saidas: number } } = {}
    
    filteredLancamentos.forEach(l => {
      const dia = l.data_lancamento?.split('T')[0]
      if (!dia) return
      if (!dados[dia]) {
        dados[dia] = { entradas: 0, saidas: 0 }
      }
      if (l.tipo === 'entrada' || l.tipo === 'receita') {
        dados[dia].entradas += l.valor
      } else {
        dados[dia].saidas += l.valor
      }
    })
    
    return Object.entries(dados)
      .map(([data, valores]) => ({
        data: formatDate(data),
        entradas: valores.entradas,
        saidas: valores.saidas,
        saldo: valores.entradas - valores.saidas
      }))
      .slice(-10)
  }

  // Buscar lançamentos semelhantes quando formulário é preenchido
  const buscarSemelhantes = async () => {
    if (!formData.data || !formData.valor || !formData.descricao || formData.descricao.length < 3) {
      setLancamentosSemelhantes([])
      return
    }
    
    setBuscandoSemelhantes(true)
    try {
      const semelhantes = await buscarLancamentosSemelhantes({
        data_lancamento: formData.data,
        valor: formData.valor,
        descricao: formData.descricao
      })
      
      // Filtrar os que o usuário já ignorou na sessão
      const filtrados = semelhantes.filter(s => !ignorarSugestoes.has(s.id))
      setLancamentosSemelhantes(filtrados)
    } catch (err) {
      console.error('Erro ao buscar semelhantes:', err)
    } finally {
      setBuscandoSemelhantes(false)
    }
  }

  // Debounce para buscar semelhantes
  useEffect(() => {
    const timer = setTimeout(() => {
      if (isModalOpen && formData.data && formData.valor > 0 && formData.descricao.length >= 3) {
        buscarSemelhantes()
      }
    }, 500)
    
    return () => clearTimeout(timer)
  }, [formData.data, formData.valor, formData.descricao, isModalOpen])

  // Agrupar lançamento atual com um existente
  const handleAgruparComExistente = async (existenteId: number) => {
    if (!formData.data || !formData.valor) return
    
    setAgrupando(true)
    try {
      // Primeiro, salvar o lançamento atual se ainda não foi salvo
      const novoLancamento = await createLancamentoFinanceiro({
        tipo: formData.tipo === 'entrada' ? 'receita' : 'despesa',
        valor: formData.valor,
        data_lancamento: formData.data,
        descricao: formData.descricao,
        categoria_id: formData.categoria_id,
        conta_id: formData.conta_bancaria_id,
        venda_id: formData.venda_id,
        observacao: formData.observacoes,
        conciliado: false,
        com_nota_fiscal: !!formData.numero_nf
      })
      
      if (!novoLancamento) {
        alert('Erro ao criar lançamento')
        return
      }
      
      // Agora agrupar com o existente (existente como principal)
      const resultado = await agruparLancamentos({
        principal_id: existenteId,
        duplicado_id: novoLancamento.id
      })
      
      if (resultado.success) {
        await loadData()
        setIsModalOpen(false)
        resetForm()
        setLancamentosSemelhantes([])
      } else {
        alert('Erro ao agrupar: ' + resultado.error)
      }
    } catch (err) {
      console.error('Erro ao agrupar:', err)
      alert('Erro ao agrupar lançamentos')
    } finally {
      setAgrupando(false)
    }
  }

  // Toggle grupo expandido na tabela
  const toggleGrupoExpandido = (lancamentoId: number) => {
    setGruposExpandidos(prev => {
      const novo = new Set(prev)
      if (novo.has(lancamentoId)) {
        novo.delete(lancamentoId)
      } else {
        novo.add(lancamentoId)
      }
      return novo
    })
  }

  // Desagrupar um lançamento
  const handleDesagrupar = async (lancamentoId: number) => {
    if (!confirm('Tem certeza que deseja remover este lançamento do grupo?')) return
    
    try {
      const resultado = await desagruparLancamento(lancamentoId)
      if (resultado.success) {
        await loadData()
        setGruposExpandidos(new Set())
      } else {
        alert('Erro ao desagrupar: ' + resultado.error)
      }
    } catch (err) {
      console.error('Erro ao desagrupar:', err)
      alert('Erro ao desagrupar lançamento')
    }
  }

  // Detectar duplicados existentes
  const handleDetectarDuplicados = async () => {
    setBuscandoDuplicados(true)
    setIsDuplicadosModalOpen(true)
    try {
      const duplicados = await detectarDuplicadosExistentes(30)
      setDuplicadosEncontrados(duplicados)
    } catch (err) {
      console.error('Erro ao detectar duplicados:', err)
      alert('Erro ao buscar duplicados')
    } finally {
      setBuscandoDuplicados(false)
    }
  }

  // Mesclar par de duplicados
  const handleMesclarDuplicado = async (lancNFId: number, lancOFXId: number, acao: 'mesclar' | 'agrupar') => {
    setProcessandoDuplicado(lancNFId)
    try {
      const resultado = await mesclarDuplicados({
        lancamentoNFId: lancNFId,
        lancamentoOFXId: lancOFXId,
        acao
      })
      
      if (resultado.success) {
        // Remover da lista
        setDuplicadosEncontrados(prev => prev.filter(d => d.lancamentoComNF.id !== lancNFId))
        await loadData()
      } else {
        alert('Erro: ' + resultado.error)
      }
    } catch (err) {
      console.error('Erro ao mesclar:', err)
      alert('Erro ao processar')
    } finally {
      setProcessandoDuplicado(null)
    }
  }

  // Handlers
  const handleSubmitLancamento = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    
    try {
      await createLancamentoFinanceiro({
        tipo: formData.tipo === 'entrada' ? 'receita' : 'despesa',
        valor: formData.valor,
        data_lancamento: formData.data,
        descricao: formData.descricao,
        categoria_id: formData.categoria_id,
        conta_id: formData.conta_bancaria_id,
        venda_id: formData.venda_id,
        observacao: formData.observacoes,
        conciliado: false,
        com_nota_fiscal: !!formData.numero_nf
      })
      
      await loadData()
      setIsModalOpen(false)
      resetForm()
    } catch (err) {
      console.error('Erro ao salvar:', err)
      alert('Erro ao salvar lançamento')
    } finally {
      setSaving(false)
    }
  }

  const handleSubmitDCTe = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    
    try {
      // Verificar duplicidade
      if (formDCTe.chave_cte) {
        const duplicado = await checkOFXDuplicado(formDCTe.chave_cte)
        if (duplicado) {
          alert('Este CT-e já foi lançado!')
          setSaving(false)
          return
        }
      }
      
      await createLancamentoFinanceiro({
        tipo: 'despesa',
        valor: formDCTe.valor_frete,
        data_lancamento: formDCTe.data,
        descricao: `Frete CT-e ${formDCTe.numero_cte} - ${formDCTe.transportadora}`,
        categoria_id: formDCTe.categoria_id,
        conta_id: formDCTe.conta_bancaria_id,
        ofx_fitid: formDCTe.chave_cte,
        observacao: formDCTe.observacoes,
        conciliado: false,
        com_nota_fiscal: true
      })
      
      await loadData()
      setIsDCTeModalOpen(false)
      setFormDCTe({
        numero_cte: '',
        chave_cte: '',
        valor_frete: 0,
        data: new Date().toISOString().split('T')[0],
        transportadora: '',
        observacoes: '',
        categoria_id: null,
        conta_bancaria_id: null
      })
    } catch (err) {
      console.error('Erro ao salvar:', err)
      alert('Erro ao salvar lançamento de frete')
    } finally {
      setSaving(false)
    }
  }

  const resetForm = () => {
    setFormData({
      tipo: 'entrada',
      valor: 0,
      data: new Date().toISOString().split('T')[0],
      descricao: '',
      categoria_id: null,
      conta_bancaria_id: null,
      venda_id: null,
      numero_nf: '',
      observacoes: ''
    })
    // Limpar estado de semelhantes
    setLancamentosSemelhantes([])
    setIgnorarSugestoes(new Set())
  }

  // Exclusão de lançamento
  const handleDeleteLancamento = async () => {
    if (!selectedLancamento) return
    
    setDeleting(true)
    setDeleteError(null)
    
    try {
      // Verificar se pode excluir
      const verificacao = await verificarExclusaoLancamento(selectedLancamento.id)
      
      if (!verificacao.canDelete) {
        setDeleteError(verificacao.reason || 'Não é possível excluir este lançamento')
        setDeleting(false)
        return
      }
      
      // Executar exclusão
      await deleteLancamentoFinanceiro(selectedLancamento.id)
      
      // Fechar modais e atualizar lista
      setIsDeleteModalOpen(false)
      setIsDetailModalOpen(false)
      setSelectedLancamento(null)
      await loadData()
    } catch (err) {
      console.error('Erro ao excluir:', err)
      setDeleteError('Erro ao excluir lançamento: ' + (err instanceof Error ? err.message : 'Erro desconhecido'))
    } finally {
      setDeleting(false)
    }
  }

  // Alterar categoria de um lançamento
  const handleSalvarCategoria = async (lancamentoId: number, categoriaId: number | null) => {
    setSavingCategoria(true)
    try {
      await updateLancamentoFinanceiro(lancamentoId, { categoria_id: categoriaId } as any)
      // Atualiza localmente para feedback imediato
      setLancamentos(prev => prev.map(l => 
        l.id === lancamentoId ? { ...l, categoria_id: categoriaId } : l
      ))
      if (selectedLancamento?.id === lancamentoId) {
        setSelectedLancamento(prev => prev ? { ...prev, categoria_id: categoriaId } : null)
      }
      setEditingCategoriaLancId(null)
    } catch (err) {
      console.error('Erro ao alterar categoria:', err)
      alert('Erro ao alterar categoria: ' + (err instanceof Error ? err.message : 'Erro desconhecido'))
    } finally {
      setSavingCategoria(false)
    }
  }

  const openDeleteModal = async () => {
    if (!selectedLancamento) return
    
    setDeleteError(null)
    
    // Verificar antecipadamente se pode excluir
    const verificacao = await verificarExclusaoLancamento(selectedLancamento.id)
    
    if (!verificacao.canDelete) {
      setDeleteError(verificacao.reason || 'Não é possível excluir este lançamento')
    }
    
    setIsDeleteModalOpen(true)
  }

  // Seleção em massa
  const toggleSelectAll = () => {
    if (selectedIds.size === filteredLancamentos.length) {
      setSelectedIds(new Set())
    } else {
      setSelectedIds(new Set(filteredLancamentos.map(l => l.id)))
    }
  }

  const toggleSelectOne = (id: number) => {
    const newSet = new Set(Array.from(selectedIds))
    if (newSet.has(id)) {
      newSet.delete(id)
    } else {
      newSet.add(id)
    }
    setSelectedIds(newSet)
  }

  // Exclusão em massa
  const handleDeleteMass = async () => {
    if (selectedIds.size === 0) return
    
    setDeletingMass(true)
    setDeleteMassProgress({ current: 0, total: selectedIds.size, errors: 0 })
    
    let errors = 0
    let current = 0
    
    for (const id of Array.from(selectedIds)) {
      try {
        // Verificar se pode excluir
        const verificacao = await verificarExclusaoLancamento(id)
        if (!verificacao.canDelete) {
          errors++
        } else {
          await deleteLancamentoFinanceiro(id)
        }
      } catch (err) {
        console.error(`Erro ao excluir lançamento ${id}:`, err)
        errors++
      }
      current++
      setDeleteMassProgress({ current, total: selectedIds.size, errors })
    }
    
    setDeletingMass(false)
    setIsDeleteMassModalOpen(false)
    setSelectedIds(new Set())
    await loadData()
    
    if (errors > 0) {
      alert(`Exclusão concluída. ${current - errors} excluídos, ${errors} erros (lançamentos vinculados ou conciliados).`)
    }
  }

  // Importação OFX
  const handleOFXUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    
    // Reset estados anteriores
    setImportResult(null)
    
    try {
      const text = await file.text()
      const transactions: any[] = []
      const stmttrn = text.match(/<STMTTRN>([\s\S]*?)<\/STMTTRN>/g) || []
      
      // Set para deduplicar dentro do próprio arquivo (por FITID)
      const fitidsNoArquivo = new Set<string>()
      
      for (const trn of stmttrn) {
        const trntype = trn.match(/<TRNTYPE>([^<\s]+)/)?.[1]
        const dtposted = trn.match(/<DTPOSTED>(\d+)/)?.[1]
        const trnamt = trn.match(/<TRNAMT>([\d.-]+)/)?.[1]
        const fitid = trn.match(/<FITID>([^<\s]+)/)?.[1]
        const memo = trn.match(/<MEMO>([^<]+)/)?.[1]
        
        if (dtposted && trnamt && fitid) {
          // Limpar FITID
          const cleanFitid = fitid.replace(/[<>\/]/g, '').trim()
          
          // Deduplicar dentro do arquivo
          if (fitidsNoArquivo.has(cleanFitid)) {
            continue // Pular duplicado interno
          }
          fitidsNoArquivo.add(cleanFitid)
          
          // Verificar duplicação no banco (usando a função simples para preview)
          const duplicado = await checkOFXDuplicado(cleanFitid)
          
          transactions.push({
            id: cleanFitid,
            tipo: Number(trnamt) >= 0 ? 'entrada' : 'saida',
            valor: Math.abs(Number(trnamt)),
            data: `${dtposted.slice(0,4)}-${dtposted.slice(4,6)}-${dtposted.slice(6,8)}`,
            descricao: memo || trntype,
            duplicado,
            metodoDuplicacao: duplicado ? 'fitid' : null
          })
        }
      }
      
      setOfxData(transactions)
      setIsOFXModalOpen(true)
    } catch (err) {
      console.error('Erro ao processar OFX:', err)
      alert('Erro ao processar arquivo OFX')
    }
  }

  const handleImportOFX = async () => {
    // Marcar que tentou importar
    setAttemptedImport(true)
    setImportResult(null)
    
    // Validar conta bancária
    if (!filterContaBancaria) {
      setMissingContaBancaria(true)
      setTimeout(() => {
        contaBancariaSelectRef.current?.focus()
        contaBancariaSelectRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' })
      }, 100)
      return
    }
    setMissingContaBancaria(false)
    
    // Identificar transações sem categoria (apenas não-duplicados)
    const transacoesParaImportar = ofxData.filter(t => !t.duplicado)
    const semCategoria = transacoesParaImportar.filter(t => !ofxCategorizacao[t.id])
    
    if (semCategoria.length > 0) {
      // Bloquear importação e destacar itens
      const missingIds = semCategoria.map(t => t.id)
      setMissingCategoryIds(missingIds)
      
      // Scroll para o primeiro item sem categoria
      setTimeout(() => {
        const firstMissingId = missingIds[0]
        const rowRef = ofxRowRefs.current[firstMissingId]
        const selectRef = ofxSelectRefs.current[firstMissingId]
        
        if (rowRef) {
          rowRef.scrollIntoView({ behavior: 'smooth', block: 'center' })
        }
        if (selectRef) {
          setTimeout(() => selectRef.focus(), 300)
        }
      }, 100)
      
      return // Não continua com a importação
    }
    
    setSaving(true)
    
    // Resultado da importação
    const resultado: ResultadoImportacaoOFX = {
      importados: 0,
      duplicadosFitid: 0,
      duplicadosFingerprint: 0,
      erros: 0,
      detalhes: []
    }
    
    try {
      for (const trn of transacoesParaImportar) {
        const categoriaId = ofxCategorizacao[trn.id]
        
        // Garantia defensiva: não permitir categoria null
        if (!categoriaId) {
          resultado.erros++
          resultado.detalhes.push({
            descricao: trn.descricao,
            status: 'erro',
            mensagem: 'Categoria não definida'
          })
          continue
        }
        
        // Verificação avançada de duplicação (re-checar antes do insert para garantia)
        const checkDup = await checkOFXDuplicadoAvancado({
          fitid: trn.id,
          contaId: filterContaBancaria,
          data: trn.data,
          valor: trn.valor,
          descricao: trn.descricao
        })
        
        if (checkDup.duplicado) {
          if (checkDup.metodo === 'fitid') {
            resultado.duplicadosFitid++
            resultado.detalhes.push({
              descricao: trn.descricao,
              status: 'duplicado_fitid',
              mensagem: `Já existe (FITID: ${trn.id})`
            })
          } else {
            resultado.duplicadosFingerprint++
            resultado.detalhes.push({
              descricao: trn.descricao,
              status: 'duplicado_fingerprint',
              mensagem: 'Transação similar já existe'
            })
          }
          continue
        }
        
        // Inserir lançamento
        try {
          await createLancamentoFinanceiro({
            conta_id: filterContaBancaria,
            tipo: trn.tipo === 'entrada' ? 'receita' : 'despesa',
            valor: trn.valor,
            data_lancamento: trn.data,
            descricao: trn.descricao,
            categoria_id: categoriaId,
            ofx_fitid: trn.id,
            ofx_data_importacao: new Date().toISOString(),
            conciliado: false,
            com_nota_fiscal: false
          })
          
          resultado.importados++
          resultado.detalhes.push({
            descricao: trn.descricao,
            status: 'importado'
          })
        } catch (insertErr) {
          console.error('Erro ao inserir lançamento:', insertErr)
          resultado.erros++
          resultado.detalhes.push({
            descricao: trn.descricao,
            status: 'erro',
            mensagem: insertErr instanceof Error ? insertErr.message : 'Erro desconhecido'
          })
        }
      }
      
      // Mostrar resultado
      setImportResult(resultado)
      
      await loadData()
      
      // Só fechar modal se importou tudo com sucesso
      if (resultado.erros === 0) {
        // Manter modal aberto para mostrar resultado
        setTimeout(() => {
          setIsOFXModalOpen(false)
          setOfxData([])
          setOfxCategorizacao({})
          setAttemptedImport(false)
          setMissingCategoryIds([])
          setImportResult(null)
        }, 3000)
      }
    } catch (err) {
      console.error('Erro ao importar:', err)
      alert('Erro ao importar lançamentos: ' + (err instanceof Error ? err.message : 'Erro desconhecido'))
    } finally {
      setSaving(false)
    }
  }
  
  // Handler para selecionar categoria - remove da lista de pendentes
  const handleCategoriaChange = (trnId: string, categoriaId: number) => {
    setOfxCategorizacao(prev => ({
      ...prev,
      [trnId]: categoriaId
    }))
    
    // Remover do missingCategoryIds se estava marcado
    if (missingCategoryIds.includes(trnId)) {
      setMissingCategoryIds(prev => prev.filter(id => id !== trnId))
    }
  }

  // Exportar Excel (simples CSV)
  const exportarExcel = () => {
    const headers = ['Data', 'Descrição', 'Categoria', 'Tipo', 'Valor', 'NF', 'Conta']
    const rows = filteredLancamentos.map(l => [
      formatDate(l.data_lancamento),
      l.descricao,
      categorias.find(c => c.id === l.categoria_id)?.nome || '',
      l.tipo,
      l.valor.toFixed(2),
      l.com_nota_fiscal ? 'Sim' : 'Não',
      contasBancarias.find(c => c.id === l.conta_id)?.nome || ''
    ])
    
    const csv = [headers.join(';'), ...rows.map(r => r.join(';'))].join('\n')
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const link = document.createElement('a')
    link.href = URL.createObjectURL(blob)
    link.download = `caixa_${new Date().toISOString().split('T')[0]}.csv`
    link.click()
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
            Caixa
          </h1>
          <p className="text-dark-400 mt-1">
            Controle de fluxo de caixa e movimentações financeiras
          </p>
        </div>
        <div className="flex gap-2 flex-wrap">
          <Button
            variant="secondary"
            onClick={exportarExcel}
            leftIcon={<Download className="w-4 h-4" />}
          >
            Exportar
          </Button>
          <input
            type="file"
            accept=".ofx"
            onChange={handleOFXUpload}
            className="hidden"
            id="ofx-caixa"
          />
          <label htmlFor="ofx-caixa">
            <span className="btn btn-secondary flex items-center gap-2 cursor-pointer">
              <Upload className="w-4 h-4" />
              Importar OFX
            </span>
          </label>
          <Button
            variant="secondary"
            onClick={handleDetectarDuplicados}
            leftIcon={<GitMerge className="w-4 h-4" />}
            title="Detectar lançamentos duplicados (OFX vs NF)"
          >
            Duplicados
          </Button>
          <Button
            variant="secondary"
            onClick={() => setIsDCTeModalOpen(true)}
            leftIcon={<Truck className="w-4 h-4" />}
          >
            Lançar Frete
          </Button>
          <Button
            onClick={() => setIsModalOpen(true)}
            leftIcon={<Plus className="w-4 h-4" />}
          >
            Novo Lançamento
          </Button>
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="glass-card p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-green-500/20 flex items-center justify-center">
              <TrendingUp className="w-5 h-5 text-green-400" />
            </div>
            <div>
              <p className="text-dark-400 text-sm">Entradas</p>
              <p className="text-xl font-bold text-green-400">{formatCurrency(totalEntradas)}</p>
            </div>
          </div>
        </div>
        
        <div className="glass-card p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-red-500/20 flex items-center justify-center">
              <TrendingDown className="w-5 h-5 text-red-400" />
            </div>
            <div>
              <p className="text-dark-400 text-sm">Saídas</p>
              <p className="text-xl font-bold text-red-400">{formatCurrency(totalSaidas)}</p>
            </div>
          </div>
        </div>
        
        <div className="glass-card p-4">
          <div className="flex items-center gap-3">
            <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
              saldo >= 0 ? 'bg-primary-500/20' : 'bg-red-500/20'
            }`}>
              <DollarSign className={`w-5 h-5 ${saldo >= 0 ? 'text-primary-400' : 'text-red-400'}`} />
            </div>
            <div>
              <p className="text-dark-400 text-sm">Saldo do Período</p>
              <p className={`text-xl font-bold ${saldo >= 0 ? 'text-primary-400' : 'text-red-400'}`}>
                {formatCurrency(saldo)}
              </p>
            </div>
          </div>
        </div>
        
        <div className="glass-card p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-blue-500/20 flex items-center justify-center">
              <FileText className="w-5 h-5 text-blue-400" />
            </div>
            <div>
              <p className="text-dark-400 text-sm">Lançamentos</p>
              <p className="text-xl font-bold text-white">{filteredLancamentos.length}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Filtros */}
      <div className="glass-card p-4">
        <div className="grid grid-cols-1 md:grid-cols-6 gap-4">
          <div className="relative md:col-span-2">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-dark-400" />
            <input
              type="text"
              placeholder="Buscar..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="input pl-12 w-full"
            />
          </div>
          
          <select
            value={filterPeriodo}
            onChange={(e) => setFilterPeriodo(e.target.value as PeriodoType)}
            className="input"
          >
            <option value="dia">Hoje</option>
            <option value="semana">Última Semana</option>
            <option value="mes">Este Mês</option>
            <option value="ano">Este Ano</option>
            <option value="personalizado">Personalizado</option>
          </select>
          
          <select
            value={filterTipo}
            onChange={(e) => setFilterTipo(e.target.value as TipoLancamento)}
            className="input"
          >
            <option value="todos">Todos os tipos</option>
            <option value="entrada">Entradas</option>
            <option value="saida">Saídas</option>
          </select>
          
          <select
            value={filterCategoria || ''}
            onChange={(e) => setFilterCategoria(e.target.value ? Number(e.target.value) : null)}
            className="input"
          >
            <option value="">Todas categorias</option>
            {categorias.map(c => (
              <option key={c.id} value={c.id}>{c.nome}</option>
            ))}
          </select>
          
          <select
            value={filterComNF}
            onChange={(e) => setFilterComNF(e.target.value as any)}
            className="input"
          >
            <option value="todos">Com/Sem NF</option>
            <option value="com_nf">Com NF</option>
            <option value="sem_nf">Sem NF</option>
          </select>
        </div>
        
        {filterPeriodo === 'personalizado' && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
            <div>
              <label className="block text-sm text-dark-300 mb-2">Data Início</label>
              <input
                type="date"
                value={dataInicio}
                onChange={(e) => setDataInicio(e.target.value)}
                className="input w-full"
              />
            </div>
            <div>
              <label className="block text-sm text-dark-300 mb-2">Data Fim</label>
              <input
                type="date"
                value={dataFim}
                onChange={(e) => setDataFim(e.target.value)}
                className="input w-full"
              />
            </div>
          </div>
        )}
      </div>

      {/* Gráficos */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Gráfico de Fluxo */}
        <div className="glass-card p-6">
          <h3 className="text-lg font-semibold text-white mb-4">Fluxo de Caixa</h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={dadosPorDia()}>
                <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                <XAxis dataKey="data" stroke="#9CA3AF" fontSize={12} />
                <YAxis stroke="#9CA3AF" fontSize={12} />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: '#1F2937', 
                    border: '1px solid #374151',
                    borderRadius: '8px'
                  }}
                  formatter={(value: number) => formatCurrency(value)}
                />
                <Bar dataKey="entradas" fill="#10B981" name="Entradas" />
                <Bar dataKey="saidas" fill="#EF4444" name="Saídas" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Gráfico por Categoria */}
        <div className="glass-card p-6">
          <h3 className="text-lg font-semibold text-white mb-4">Despesas por Categoria</h3>
          <div className="h-64">
            {dadosPorCategoria.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={dadosPorCategoria}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={80}
                    paddingAngle={5}
                    dataKey="value"
                  >
                    {dadosPorCategoria.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.cor || COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: '#1F2937', 
                      border: '1px solid #374151',
                      borderRadius: '8px'
                    }}
                    formatter={(value: number) => formatCurrency(value)}
                  />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex items-center justify-center h-full text-dark-400">
                Sem despesas no período
              </div>
            )}
          </div>
          {dadosPorCategoria.length > 0 && (
            <div className="flex flex-wrap gap-2 mt-4">
              {dadosPorCategoria.map((item, index) => (
                <div key={index} className="flex items-center gap-2 text-sm">
                  <div 
                    className="w-3 h-3 rounded-full" 
                    style={{ backgroundColor: item.cor || COLORS[index % COLORS.length] }}
                  />
                  <span className="text-dark-300">{item.name}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Lista de Lançamentos */}
      <div className="glass-card overflow-hidden">
        <div className="p-4 border-b border-dark-700 flex items-center justify-between">
          <h3 className="text-lg font-semibold text-white">Lançamentos</h3>
          
          {/* Barra de ações em massa */}
          {selectedIds.size > 0 && (
            <div className="flex items-center gap-3">
              <span className="text-dark-300 text-sm">
                {selectedIds.size} {selectedIds.size === 1 ? 'selecionado' : 'selecionados'}
              </span>
              <Button
                variant="danger"
                size="sm"
                leftIcon={<Trash2 className="w-4 h-4" />}
                onClick={() => setIsDeleteMassModalOpen(true)}
              >
                Excluir Selecionados
              </Button>
              <Button
                variant="secondary"
                size="sm"
                onClick={() => setSelectedIds(new Set())}
              >
                Limpar
              </Button>
            </div>
          )}
        </div>
        
        {filteredLancamentos.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="data-table">
              <thead>
                <tr>
                  <th className="w-10">
                    <input
                      type="checkbox"
                      checked={selectedIds.size === filteredLancamentos.length && filteredLancamentos.length > 0}
                      onChange={toggleSelectAll}
                      className="w-4 h-4 rounded border-dark-500 bg-dark-700 text-primary-500 focus:ring-primary-500"
                    />
                  </th>
                  <th>Data</th>
                  <th>Cadastro</th>
                  <th>Descrição</th>
                  <th>Categoria</th>
                  <th>Conta</th>
                  <th>NF</th>
                  <th className="text-right">Entrada</th>
                  <th className="text-right">Saída</th>
                  <th>Conciliado</th>
                </tr>
              </thead>
              <tbody>
                {filteredLancamentos.map((lanc) => {
                  const isGrupoPrincipal = lanc.is_grupo_principal && (lanc.grupo_total_itens || 0) > 1
                  const isExpandido = gruposExpandidos.has(lanc.id)
                  const possuiNFGrupo = lanc.grupo_possui_nf || lanc.com_nota_fiscal
                  
                  return (
                    <>
                      {/* Linha principal */}
                      <tr 
                        key={lanc.id} 
                        className={`cursor-pointer hover:bg-dark-600/50 transition-colors ${selectedIds.has(lanc.id) ? 'bg-primary-500/10' : ''} ${isGrupoPrincipal ? 'border-l-2 border-l-primary-500' : ''}`}
                        onClick={() => {
                          setSelectedLancamento(lanc)
                          setIsDetailModalOpen(true)
                        }}
                      >
                        <td onClick={(e) => e.stopPropagation()}>
                          <div className="flex items-center gap-2">
                            {isGrupoPrincipal && (
                              <button
                                onClick={(e) => {
                                  e.stopPropagation()
                                  toggleGrupoExpandido(lanc.id)
                                }}
                                className="p-1 hover:bg-dark-600 rounded"
                              >
                                {isExpandido ? (
                                  <ChevronDown className="w-4 h-4 text-primary-400" />
                                ) : (
                                  <ChevronRight className="w-4 h-4 text-dark-400" />
                                )}
                              </button>
                            )}
                            <input
                              type="checkbox"
                              checked={selectedIds.has(lanc.id)}
                              onChange={() => toggleSelectOne(lanc.id)}
                              className="w-4 h-4 rounded border-dark-500 bg-dark-700 text-primary-500 focus:ring-primary-500"
                            />
                          </div>
                        </td>
                        <td className="text-dark-300">{formatDate(lanc.data_lancamento || '')}</td>
                        <td className="text-dark-400 text-xs">
                          {lanc.created_at ? formatDate(lanc.created_at) : '-'}
                        </td>
                        <td>
                          <div className="flex items-center gap-2">
                            <span className="font-medium text-white">{lanc.descricao}</span>
                            {isGrupoPrincipal && (
                              <Badge variant="secondary" size="sm" className="bg-primary-500/20 text-primary-400">
                                <Link2 className="w-3 h-3 mr-1" />
                                {lanc.grupo_total_itens}
                              </Badge>
                            )}
                            {lanc.venda_id && (
                              <Badge variant="primary" size="sm">Venda #{lanc.venda_id}</Badge>
                            )}
                          </div>
                        </td>
                        <td onClick={(e) => e.stopPropagation()}>
                          {editingCategoriaLancId === lanc.id ? (
                            <div className="flex items-center gap-1">
                              <select
                                value={editingCategoriaValue || ''}
                                onChange={(e) => setEditingCategoriaValue(e.target.value ? Number(e.target.value) : null)}
                                className="input text-xs py-1 px-2 w-32"
                                autoFocus
                              >
                                <option value="">Sem categoria</option>
                                {categorias.map(c => (
                                  <option key={c.id} value={c.id}>{c.nome}</option>
                                ))}
                              </select>
                              <button
                                onClick={() => handleSalvarCategoria(lanc.id, editingCategoriaValue)}
                                disabled={savingCategoria}
                                className="p-1 rounded hover:bg-green-500/20 text-green-400"
                                title="Salvar"
                              >
                                <Save className="w-3 h-3" />
                              </button>
                              <button
                                onClick={() => setEditingCategoriaLancId(null)}
                                className="p-1 rounded hover:bg-red-500/20 text-red-400"
                                title="Cancelar"
                              >
                                <X className="w-3 h-3" />
                              </button>
                            </div>
                          ) : (
                            <div className="flex items-center gap-1 group/cat">
                              {lanc.categoria_id ? (
                                <span 
                                  className="px-2 py-1 rounded text-xs text-white"
                                  style={{ 
                                    backgroundColor: categorias.find(c => c.id === lanc.categoria_id)?.cor || '#3B82F6' 
                                  }}
                                >
                                  {categorias.find(c => c.id === lanc.categoria_id)?.nome}
                                </span>
                              ) : (
                                <span className="text-dark-500 text-sm">Sem categoria</span>
                              )}
                              <button
                                onClick={() => {
                                  setEditingCategoriaLancId(lanc.id)
                                  setEditingCategoriaValue(lanc.categoria_id)
                                }}
                                className="p-1 rounded opacity-0 group-hover/cat:opacity-100 hover:bg-primary-500/20 text-dark-400 hover:text-primary-400 transition-all"
                                title="Alterar categoria"
                              >
                                <Edit2 className="w-3 h-3" />
                              </button>
                            </div>
                          )}
                        </td>
                        <td className="text-dark-300">
                          {contasBancarias.find(c => c.id === lanc.conta_id)?.nome || '-'}
                        </td>
                        <td className="text-dark-300">
                          {possuiNFGrupo ? (
                            <div className="flex items-center gap-1 text-green-400">
                              <Receipt className="w-3 h-3" />
                              Sim
                            </div>
                          ) : '-'}
                        </td>
                        <td className="text-right text-green-400">
                          {(lanc.tipo === 'entrada' || lanc.tipo === 'receita') ? formatCurrency(lanc.valor) : '-'}
                        </td>
                        <td className="text-right text-red-400">
                          {(lanc.tipo === 'saida' || lanc.tipo === 'despesa') ? formatCurrency(lanc.valor) : '-'}
                        </td>
                        <td>
                          {lanc.conciliado ? (
                            <CheckCircle className="w-4 h-4 text-green-400" />
                          ) : (
                            <Clock className="w-4 h-4 text-dark-500" />
                          )}
                        </td>
                      </tr>
                      
                      {/* Linhas subordinadas do grupo (expandidas) */}
                      {isGrupoPrincipal && isExpandido && lanc.itens_grupo?.map((subLanc) => (
                        <tr 
                          key={`sub-${subLanc.id}`}
                          className="bg-dark-700/50 cursor-pointer hover:bg-dark-600/50 border-l-2 border-l-dark-500"
                          onClick={() => {
                            setSelectedLancamento(subLanc)
                            setIsDetailModalOpen(true)
                          }}
                        >
                          <td onClick={(e) => e.stopPropagation()}>
                            <div className="flex items-center gap-2 pl-6">
                              <input
                                type="checkbox"
                                checked={selectedIds.has(subLanc.id)}
                                onChange={() => toggleSelectOne(subLanc.id)}
                                className="w-4 h-4 rounded border-dark-500 bg-dark-700 text-primary-500 focus:ring-primary-500"
                              />
                            </div>
                          </td>
                          <td className="text-dark-400 text-sm">{formatDate(subLanc.data_lancamento || '')}</td>
                          <td className="text-dark-500 text-xs">
                            {subLanc.created_at ? formatDate(subLanc.created_at) : '-'}
                          </td>
                          <td>
                            <div className="flex items-center gap-2">
                              <span className="text-dark-300 text-sm">{subLanc.descricao}</span>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation()
                                  handleDesagrupar(subLanc.id)
                                }}
                                className="p-1 hover:bg-dark-600 rounded text-dark-400 hover:text-red-400"
                                title="Remover do grupo"
                              >
                                <Unlink className="w-3 h-3" />
                              </button>
                            </div>
                          </td>
                          <td>
                            {subLanc.categoria_id ? (
                              <span 
                                className="px-2 py-1 rounded text-xs text-white opacity-70"
                                style={{ 
                                  backgroundColor: categorias.find(c => c.id === subLanc.categoria_id)?.cor || '#3B82F6' 
                                }}
                              >
                                {categorias.find(c => c.id === subLanc.categoria_id)?.nome}
                              </span>
                            ) : (
                              <span className="text-dark-500 text-sm">-</span>
                            )}
                          </td>
                          <td className="text-dark-400 text-sm">
                            {contasBancarias.find(c => c.id === subLanc.conta_id)?.nome || '-'}
                          </td>
                          <td className="text-dark-400">
                            {subLanc.com_nota_fiscal ? (
                              <div className="flex items-center gap-1 text-green-400/70">
                                <Receipt className="w-3 h-3" />
                                Sim
                              </div>
                            ) : '-'}
                          </td>
                          <td className="text-right text-green-400/70 text-sm">
                            {(subLanc.tipo === 'entrada' || subLanc.tipo === 'receita') ? formatCurrency(subLanc.valor) : '-'}
                          </td>
                          <td className="text-right text-red-400/70 text-sm">
                            {(subLanc.tipo === 'saida' || subLanc.tipo === 'despesa') ? formatCurrency(subLanc.valor) : '-'}
                          </td>
                          <td>
                            {subLanc.conciliado ? (
                              <CheckCircle className="w-4 h-4 text-green-400/70" />
                            ) : (
                              <Clock className="w-4 h-4 text-dark-500" />
                            )}
                          </td>
                        </tr>
                      ))}
                    </>
                  )
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <EmptyState
            icon={<DollarSign className="w-10 h-10 text-dark-500" />}
            title="Nenhum lançamento"
            description="Faça lançamentos ou importe um arquivo OFX"
            action={
              <Button onClick={() => setIsModalOpen(true)} leftIcon={<Plus className="w-4 h-4" />}>
                Novo Lançamento
              </Button>
            }
          />
        )}
      </div>

      {/* Modal Detalhes do Lançamento */}
      <Modal
        isOpen={isDetailModalOpen}
        onClose={() => {
          setIsDetailModalOpen(false)
          setSelectedLancamento(null)
        }}
        title="Detalhes do Lançamento"
        size="lg"
      >
        {selectedLancamento && (
          <div className="space-y-6">
            {/* Header com tipo e valor */}
            <div className={`p-4 rounded-lg ${
              (selectedLancamento.tipo === 'receita' || selectedLancamento.tipo === 'entrada') 
                ? 'bg-green-500/10 border border-green-500/30' 
                : 'bg-red-500/10 border border-red-500/30'
            }`}>
              <div className="flex justify-between items-center">
                <div>
                  <Badge variant={(selectedLancamento.tipo === 'receita' || selectedLancamento.tipo === 'entrada') ? 'success' : 'danger'}>
                    {(selectedLancamento.tipo === 'receita' || selectedLancamento.tipo === 'entrada') ? 'ENTRADA' : 'SAÍDA'}
                  </Badge>
                  <p className="text-white mt-2 text-lg">{selectedLancamento.descricao}</p>
                </div>
                <p className={`text-3xl font-bold ${
                  (selectedLancamento.tipo === 'receita' || selectedLancamento.tipo === 'entrada') 
                    ? 'text-green-400' 
                    : 'text-red-400'
                }`}>
                  {formatCurrency(selectedLancamento.valor)}
                </p>
              </div>
            </div>

            {/* Informações */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-3">
                <div>
                  <p className="text-dark-400 text-sm">Data</p>
                  <p className="text-white">{formatDate(selectedLancamento.data_lancamento || '')}</p>
                </div>
                <div>
                  <p className="text-dark-400 text-sm">Forma de Pagamento</p>
                  <p className="text-white capitalize">{selectedLancamento.forma_pagamento || '-'}</p>
                </div>
                <div>
                  <p className="text-dark-400 text-sm">Categoria</p>
                  {editingCategoriaLancId === selectedLancamento.id ? (
                    <div className="flex items-center gap-2 mt-1">
                      <select
                        value={editingCategoriaValue || ''}
                        onChange={(e) => setEditingCategoriaValue(e.target.value ? Number(e.target.value) : null)}
                        className="input text-sm py-1 px-2"
                        autoFocus
                      >
                        <option value="">Sem categoria</option>
                        {categorias.map(c => (
                          <option key={c.id} value={c.id}>{c.nome}</option>
                        ))}
                      </select>
                      <button
                        onClick={() => handleSalvarCategoria(selectedLancamento.id, editingCategoriaValue)}
                        disabled={savingCategoria}
                        className="p-1.5 rounded-lg bg-green-500/20 text-green-400 hover:bg-green-500/30"
                        title="Salvar"
                      >
                        <Save className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => setEditingCategoriaLancId(null)}
                        className="p-1.5 rounded-lg bg-red-500/20 text-red-400 hover:bg-red-500/30"
                        title="Cancelar"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2 mt-1">
                      {selectedLancamento.categoria_id ? (
                        <span 
                          className="px-2 py-1 rounded text-xs text-white inline-block"
                          style={{ 
                            backgroundColor: categorias.find(c => c.id === selectedLancamento.categoria_id)?.cor || '#3B82F6' 
                          }}
                        >
                          {categorias.find(c => c.id === selectedLancamento.categoria_id)?.nome}
                        </span>
                      ) : (
                        <span className="text-dark-500">Sem categoria</span>
                      )}
                      <button
                        onClick={() => {
                          setEditingCategoriaLancId(selectedLancamento.id)
                          setEditingCategoriaValue(selectedLancamento.categoria_id)
                        }}
                        className="p-1.5 rounded-lg text-dark-400 hover:text-primary-400 hover:bg-primary-500/20 transition-colors"
                        title="Alterar categoria"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                    </div>
                  )}
                </div>
              </div>
              <div className="space-y-3">
                <div>
                  <p className="text-dark-400 text-sm">Conta Bancária</p>
                  <p className="text-white">
                    {contasBancarias.find(c => c.id === selectedLancamento.conta_id)?.nome || '-'}
                  </p>
                </div>
                <div>
                  <p className="text-dark-400 text-sm">Nota Fiscal</p>
                  <p className="text-white">{selectedLancamento.com_nota_fiscal ? 'Sim' : 'Não'}</p>
                </div>
                <div>
                  <p className="text-dark-400 text-sm">Status</p>
                  {selectedLancamento.conciliado ? (
                    <Badge variant="success">Conciliado</Badge>
                  ) : (
                    <Badge variant="warning">Pendente</Badge>
                  )}
                </div>
              </div>
            </div>

            {/* Vínculos */}
            {(selectedLancamento.venda_id || selectedLancamento.cliente_id || selectedLancamento.fornecedor_id || selectedLancamento.nota_fiscal_entrada_id) && (
              <div className="border-t border-dark-600 pt-4">
                <p className="text-dark-400 text-sm mb-3">Vínculos</p>
                <div className="flex flex-wrap gap-2">
                  {selectedLancamento.venda_id && (
                    <button 
                      onClick={() => {
                        setSelectedVendaId(selectedLancamento.venda_id)
                        setVendaModalOpen(true)
                      }}
                      className="flex items-center gap-2 px-3 py-2 bg-primary-500/20 text-primary-400 rounded-lg hover:bg-primary-500/30 transition-colors"
                    >
                      <Receipt className="w-4 h-4" />
                      Ver Venda #{selectedLancamento.venda_id}
                    </button>
                  )}
                  {selectedLancamento.cliente_id && (
                    <button 
                      onClick={() => {
                        setSelectedClienteId(selectedLancamento.cliente_id)
                        setClienteModalOpen(true)
                      }}
                      className="flex items-center gap-2 px-3 py-2 bg-blue-500/20 text-blue-400 rounded-lg hover:bg-blue-500/30 transition-colors"
                    >
                      <Building className="w-4 h-4" />
                      Ver Cliente
                    </button>
                  )}
                  {selectedLancamento.fornecedor_id && (
                    <button 
                      onClick={() => {
                        setSelectedFornecedorId(selectedLancamento.fornecedor_id)
                        setFornecedorModalOpen(true)
                      }}
                      className="flex items-center gap-2 px-3 py-2 bg-orange-500/20 text-orange-400 rounded-lg hover:bg-orange-500/30 transition-colors"
                    >
                      <Truck className="w-4 h-4" />
                      Ver Fornecedor
                    </button>
                  )}
                  {selectedLancamento.nota_fiscal_entrada_id && (
                    <button 
                      onClick={() => {
                        setSelectedNfEntradaId(selectedLancamento.nota_fiscal_entrada_id)
                        setNfEntradaModalOpen(true)
                      }}
                      className="flex items-center gap-2 px-3 py-2 bg-yellow-500/20 text-yellow-400 rounded-lg hover:bg-yellow-500/30 transition-colors"
                    >
                      <FileText className="w-4 h-4" />
                      Ver NF de Entrada
                    </button>
                  )}
                </div>
              </div>
            )}

            {/* Observações */}
            {selectedLancamento.observacao && (
              <div className="border-t border-dark-600 pt-4">
                <p className="text-dark-400 text-sm mb-2">Observações</p>
                <p className="text-white bg-dark-700 p-3 rounded-lg">
                  {selectedLancamento.observacao}
                </p>
              </div>
            )}

            {/* Ações */}
            <div className="flex justify-between gap-2 pt-4 border-t border-dark-600">
              <Button 
                variant="danger" 
                onClick={openDeleteModal}
                leftIcon={<Trash2 className="w-4 h-4" />}
              >
                Excluir
              </Button>
              <Button 
                variant="secondary" 
                onClick={() => setIsDetailModalOpen(false)}
              >
                Fechar
              </Button>
            </div>
          </div>
        )}
      </Modal>

      {/* Modal Confirmação de Exclusão */}
      <Modal
        isOpen={isDeleteModalOpen}
        onClose={() => { setIsDeleteModalOpen(false); setDeleteError(null) }}
        title="Confirmar Exclusão"
        size="sm"
      >
        <div className="space-y-4">
          {deleteError ? (
            <div className="p-4 bg-red-500/10 border border-red-500/30 rounded-lg">
              <div className="flex items-start gap-3">
                <AlertTriangle className="w-5 h-5 text-red-400 mt-0.5" />
                <div>
                  <p className="text-red-400 font-medium">Não é possível excluir</p>
                  <p className="text-dark-300 text-sm mt-1">{deleteError}</p>
                </div>
              </div>
            </div>
          ) : (
            <>
              <div className="p-4 bg-yellow-500/10 border border-yellow-500/30 rounded-lg">
                <div className="flex items-start gap-3">
                  <AlertTriangle className="w-5 h-5 text-yellow-400 mt-0.5" />
                  <div>
                    <p className="text-yellow-400 font-medium">Atenção</p>
                    <p className="text-dark-300 text-sm mt-1">
                      Tem certeza que deseja excluir este lançamento? Esta ação não pode ser desfeita.
                    </p>
                  </div>
                </div>
              </div>
              
              {selectedLancamento && (
                <div className="p-3 bg-dark-700 rounded-lg">
                  <p className="text-white font-medium">{selectedLancamento.descricao}</p>
                  <p className={`text-lg font-bold ${
                    (selectedLancamento.tipo === 'receita' || selectedLancamento.tipo === 'entrada') 
                      ? 'text-green-400' 
                      : 'text-red-400'
                  }`}>
                    {formatCurrency(selectedLancamento.valor)}
                  </p>
                </div>
              )}
            </>
          )}
          
          <div className="flex justify-end gap-2 pt-2">
            <Button 
              variant="secondary" 
              onClick={() => { setIsDeleteModalOpen(false); setDeleteError(null) }}
            >
              {deleteError ? 'Fechar' : 'Cancelar'}
            </Button>
            {!deleteError && (
              <Button 
                variant="danger" 
                onClick={handleDeleteLancamento}
                isLoading={deleting}
              >
                Excluir Lançamento
              </Button>
            )}
          </div>
        </div>
      </Modal>

      {/* Modal Novo Lançamento */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => { setIsModalOpen(false); resetForm() }}
        title="Novo Lançamento"
        size="lg"
      >
        <form onSubmit={handleSubmitLancamento} className="space-y-4">
          <div className="flex gap-2 mb-4">
            <button
              type="button"
              onClick={() => setFormData({ ...formData, tipo: 'entrada' })}
              className={`flex-1 py-3 rounded-lg font-medium transition-colors flex items-center justify-center gap-2 ${
                formData.tipo === 'entrada'
                  ? 'bg-green-500 text-white'
                  : 'bg-dark-700 text-dark-300 hover:bg-dark-600'
              }`}
            >
              <TrendingUp className="w-4 h-4" />
              Entrada
            </button>
            <button
              type="button"
              onClick={() => setFormData({ ...formData, tipo: 'saida' })}
              className={`flex-1 py-3 rounded-lg font-medium transition-colors flex items-center justify-center gap-2 ${
                formData.tipo === 'saida'
                  ? 'bg-red-500 text-white'
                  : 'bg-dark-700 text-dark-300 hover:bg-dark-600'
              }`}
            >
              <TrendingDown className="w-4 h-4" />
              Saída
            </button>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="md:col-span-2">
              <label className="block text-sm text-dark-300 mb-2">Descrição *</label>
              <input
                type="text"
                value={formData.descricao}
                onChange={(e) => setFormData({ ...formData, descricao: e.target.value })}
                className="input w-full"
                required
              />
            </div>
            
            <div>
              <label className="block text-sm text-dark-300 mb-2">Valor *</label>
              <input
                type="number"
                step="0.01"
                value={formData.valor}
                onChange={(e) => setFormData({ ...formData, valor: Number(e.target.value) })}
                className="input w-full"
                required
              />
            </div>
            
            <div>
              <label className="block text-sm text-dark-300 mb-2">Data *</label>
              <input
                type="date"
                value={formData.data}
                onChange={(e) => setFormData({ ...formData, data: e.target.value })}
                className="input w-full"
                required
              />
            </div>
            
            <div>
              <label className="block text-sm text-dark-300 mb-2">Categoria</label>
              <select
                value={formData.categoria_id || ''}
                onChange={(e) => setFormData({ ...formData, categoria_id: e.target.value ? Number(e.target.value) : null })}
                className="input w-full"
              >
                <option value="">Selecione...</option>
                {categorias
                  .filter(c => c.tipo === (formData.tipo === 'entrada' ? 'receita' : 'despesa'))
                  .map(c => (
                    <option key={c.id} value={c.id}>{c.nome}</option>
                  ))}
              </select>
            </div>
            
            <div>
              <label className="block text-sm text-dark-300 mb-2">Conta Bancária</label>
              <select
                value={formData.conta_bancaria_id || ''}
                onChange={(e) => setFormData({ ...formData, conta_bancaria_id: e.target.value ? Number(e.target.value) : null })}
                className="input w-full"
              >
                <option value="">Selecione...</option>
                {contasBancarias.map(c => (
                  <option key={c.id} value={c.id}>{c.nome}</option>
                ))}
              </select>
            </div>
            
            {formData.tipo === 'entrada' && (
              <div>
                <label className="block text-sm text-dark-300 mb-2">Vincular à Venda</label>
                <select
                  value={formData.venda_id || ''}
                  onChange={(e) => setFormData({ ...formData, venda_id: e.target.value ? Number(e.target.value) : null })}
                  className="input w-full"
                >
                  <option value="">Nenhuma</option>
                  {vendas.map(v => (
                    <option key={v.id} value={v.id}>
                      Venda #{v.id} - {formatCurrency(v.valor_total)}
                    </option>
                  ))}
                </select>
              </div>
            )}
            
            <div>
              <label className="block text-sm text-dark-300 mb-2">Nº NF</label>
              <input
                type="text"
                value={formData.numero_nf}
                onChange={(e) => setFormData({ ...formData, numero_nf: e.target.value })}
                className="input w-full"
              />
            </div>
          </div>
          
          {/* Lançamentos Semelhantes */}
          {lancamentosSemelhantes.length > 0 && (
            <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-lg p-4 mt-4">
              <div className="flex items-center gap-2 mb-3">
                <AlertTriangle className="w-5 h-5 text-yellow-500" />
                <h4 className="text-yellow-500 font-medium">Lançamentos Semelhantes Encontrados</h4>
              </div>
              <p className="text-dark-300 text-sm mb-3">
                Encontramos lançamentos que podem ser duplicados. Você pode agrupar este lançamento com um existente:
              </p>
              <div className="space-y-2 max-h-48 overflow-y-auto">
                {lancamentosSemelhantes.map((lanc) => (
                  <div 
                    key={lanc.id} 
                    className="bg-dark-700 rounded-lg p-3 flex items-center justify-between"
                  >
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <span className="text-white font-medium">{formatCurrency(lanc.valor)}</span>
                        <span className="text-dark-400">•</span>
                        <span className="text-dark-300 text-sm">{formatDate(lanc.data_lancamento)}</span>
                        {lanc.categoria_nome && (
                          <>
                            <span className="text-dark-400">•</span>
                            <Badge variant="secondary" size="sm">{lanc.categoria_nome}</Badge>
                          </>
                        )}
                      </div>
                      <p className="text-dark-400 text-sm mt-1 truncate">{lanc.descricao}</p>
                      <p className="text-dark-500 text-xs mt-1">
                        Similaridade: {Math.round(lanc.score * 100)}%
                      </p>
                    </div>
                    <div className="flex gap-2 ml-3">
                      <button
                        type="button"
                        disabled={agrupando}
                        onClick={() => handleAgruparComExistente(lanc.id)}
                        className="px-3 py-1 bg-primary-500/20 text-primary-400 rounded text-sm hover:bg-primary-500/30 transition-colors flex items-center gap-1 disabled:opacity-50"
                      >
                        <Link2 className="w-3 h-3" />
                        {agrupando ? 'Agrupando...' : 'Agrupar'}
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          // Ver lançamento existente
                          setIsModalOpen(false)
                          resetForm()
                          const lancExistente = lancamentos.find(l => l.id === lanc.id)
                          if (lancExistente) {
                            setSelectedLancamento(lancExistente)
                            setIsDetailModalOpen(true)
                          }
                        }}
                        className="px-3 py-1 bg-blue-500/20 text-blue-400 rounded text-sm hover:bg-blue-500/30 transition-colors"
                      >
                        Ver
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setIgnorarSugestoes(prev => new Set([...Array.from(prev), lanc.id]))
                          setLancamentosSemelhantes(prev => prev.filter(l => l.id !== lanc.id))
                        }}
                        className="px-3 py-1 bg-dark-600 text-dark-300 rounded text-sm hover:bg-dark-500 transition-colors"
                      >
                        Ignorar
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
          
          {buscandoSemelhantes && (
            <div className="flex items-center gap-2 text-dark-400 text-sm mt-2">
              <LoadingSpinner size="sm" />
              Buscando lançamentos semelhantes...
            </div>
          )}
          
          <div className="flex justify-end gap-3 pt-4 border-t border-dark-700">
            <Button type="button" variant="secondary" onClick={() => { setIsModalOpen(false); resetForm() }}>
              Cancelar
            </Button>
            <Button type="submit" disabled={saving}>
              {saving ? 'Salvando...' : 'Salvar'}
            </Button>
          </div>
        </form>
      </Modal>

      {/* Modal DCTe/Frete */}
      <Modal
        isOpen={isDCTeModalOpen}
        onClose={() => setIsDCTeModalOpen(false)}
        title="Lançar Frete (CT-e)"
        size="lg"
      >
        <form onSubmit={handleSubmitDCTe} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm text-dark-300 mb-2">Nº CT-e</label>
              <input
                type="text"
                value={formDCTe.numero_cte}
                onChange={(e) => setFormDCTe({ ...formDCTe, numero_cte: e.target.value })}
                className="input w-full"
              />
            </div>
            
            <div>
              <label className="block text-sm text-dark-300 mb-2">Chave CT-e</label>
              <input
                type="text"
                value={formDCTe.chave_cte}
                onChange={(e) => setFormDCTe({ ...formDCTe, chave_cte: e.target.value })}
                className="input w-full"
                placeholder="44 dígitos"
              />
            </div>
            
            <div>
              <label className="block text-sm text-dark-300 mb-2">Transportadora</label>
              <input
                type="text"
                value={formDCTe.transportadora}
                onChange={(e) => setFormDCTe({ ...formDCTe, transportadora: e.target.value })}
                className="input w-full"
              />
            </div>
            
            <div>
              <label className="block text-sm text-dark-300 mb-2">Valor do Frete *</label>
              <input
                type="number"
                step="0.01"
                value={formDCTe.valor_frete}
                onChange={(e) => setFormDCTe({ ...formDCTe, valor_frete: Number(e.target.value) })}
                className="input w-full"
                required
              />
            </div>
            
            <div>
              <label className="block text-sm text-dark-300 mb-2">Data</label>
              <input
                type="date"
                value={formDCTe.data}
                onChange={(e) => setFormDCTe({ ...formDCTe, data: e.target.value })}
                className="input w-full"
              />
            </div>
            
            <div>
              <label className="block text-sm text-dark-300 mb-2">Categoria</label>
              <select
                value={formDCTe.categoria_id || ''}
                onChange={(e) => setFormDCTe({ ...formDCTe, categoria_id: e.target.value ? Number(e.target.value) : null })}
                className="input w-full"
              >
                <option value="">Selecione...</option>
                {categorias.filter(c => c.tipo === 'despesa').map(c => (
                  <option key={c.id} value={c.id}>{c.nome}</option>
                ))}
              </select>
            </div>
            
            <div>
              <label className="block text-sm text-dark-300 mb-2">Conta Bancária</label>
              <select
                value={formDCTe.conta_bancaria_id || ''}
                onChange={(e) => setFormDCTe({ ...formDCTe, conta_bancaria_id: e.target.value ? Number(e.target.value) : null })}
                className="input w-full"
              >
                <option value="">Selecione...</option>
                {contasBancarias.map(c => (
                  <option key={c.id} value={c.id}>{c.nome}</option>
                ))}
              </select>
            </div>
          </div>
          
          <div>
            <label className="block text-sm text-dark-300 mb-2">Observações</label>
            <textarea
              value={formDCTe.observacoes}
              onChange={(e) => setFormDCTe({ ...formDCTe, observacoes: e.target.value })}
              className="input w-full h-20 resize-none"
            />
          </div>
          
          <div className="flex justify-end gap-3 pt-4 border-t border-dark-700">
            <Button type="button" variant="secondary" onClick={() => setIsDCTeModalOpen(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={saving}>
              {saving ? 'Salvando...' : 'Lançar'}
            </Button>
          </div>
        </form>
      </Modal>

      {/* Modal Importação OFX */}
      <Modal
        isOpen={isOFXModalOpen}
        onClose={() => { 
          setIsOFXModalOpen(false)
          setOfxData([])
          setOfxCategorizacao({})
          setAttemptedImport(false)
          setMissingCategoryIds([])
          setMissingContaBancaria(false)
          setImportResult(null)
        }}
        title="Importar Extrato OFX"
        size="xl"
      >
        <div className="space-y-4">
          {/* Alerta de erros */}
          {attemptedImport && (missingContaBancaria || missingCategoryIds.length > 0) && (
            <div className="flex items-center gap-3 p-4 bg-red-500/10 border border-red-500/30 rounded-lg">
              <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0" />
              <div className="text-sm text-red-300">
                {missingContaBancaria && (
                  <div><strong>Selecione uma conta bancária.</strong></div>
                )}
                {missingCategoryIds.length > 0 && (
                  <div>
                    <strong>Existem {missingCategoryIds.length} {missingCategoryIds.length === 1 ? 'item' : 'itens'} sem categoria.</strong>
                    {' '}Preencha todas as categorias para importar.
                  </div>
                )}
              </div>
            </div>
          )}
          
          <div>
            <label className="block text-sm text-dark-300 mb-2">Conta Bancária *</label>
            <select
              ref={contaBancariaSelectRef}
              value={filterContaBancaria || ''}
              onChange={(e) => {
                setFilterContaBancaria(Number(e.target.value))
                if (e.target.value) setMissingContaBancaria(false)
              }}
              className={`input w-full ${attemptedImport && missingContaBancaria ? 'border-red-500 ring-1 ring-red-500' : ''}`}
            >
              <option value="">Selecione a conta...</option>
              {contasBancarias.map(c => (
                <option key={c.id} value={c.id}>{c.nome}</option>
              ))}
            </select>
            {attemptedImport && missingContaBancaria && (
              <div className="flex items-center gap-1 text-xs text-red-400 mt-1">
                <AlertCircle className="w-3 h-3" />
                Conta bancária obrigatória
              </div>
            )}
          </div>
          
          <div className="max-h-96 overflow-y-auto">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Data</th>
                  <th>Descrição</th>
                  <th>Tipo</th>
                  <th className="text-right">Valor</th>
                  <th>Categoria *</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {ofxData.map((trn) => {
                  const isMissing = attemptedImport && missingCategoryIds.includes(trn.id)
                  
                  return (
                    <tr 
                      key={trn.id} 
                      ref={(el) => { ofxRowRefs.current[trn.id] = el }}
                      className={`
                        ${trn.duplicado ? 'opacity-50' : ''}
                        ${isMissing ? 'bg-red-500/10 border-l-2 border-l-red-500' : ''}
                      `}
                    >
                      <td className="text-dark-300">{formatDate(trn.data)}</td>
                      <td className="text-white">{trn.descricao}</td>
                      <td>
                        <Badge variant={(trn.tipo === 'entrada' || trn.tipo === 'receita') ? 'success' : 'danger'}>
                          {(trn.tipo === 'entrada' || trn.tipo === 'receita') ? 'Entrada' : 'Saída'}
                        </Badge>
                      </td>
                      <td className={`text-right font-medium ${(trn.tipo === 'entrada' || trn.tipo === 'receita') ? 'text-green-400' : 'text-red-400'}`}>
                        {formatCurrency(trn.valor)}
                      </td>
                      <td>
                        <div className="flex flex-col gap-1">
                          <select
                            ref={(el) => { ofxSelectRefs.current[trn.id] = el }}
                            value={ofxCategorizacao[trn.id] || ''}
                            onChange={(e) => handleCategoriaChange(trn.id, Number(e.target.value))}
                            className={`input text-sm ${isMissing ? 'border-red-500 ring-1 ring-red-500' : ''}`}
                            disabled={trn.duplicado}
                          >
                            <option value="">Selecione...</option>
                            {categorias
                              .filter(c => c.tipo === ((trn.tipo === 'entrada' || trn.tipo === 'receita') ? 'receita' : 'despesa'))
                              .map(c => (
                                <option key={c.id} value={c.id}>{c.nome}</option>
                              ))}
                          </select>
                          {isMissing && (
                            <div className="flex items-center gap-1 text-xs text-red-400">
                              <AlertCircle className="w-3 h-3" />
                              Categoria obrigatória
                            </div>
                          )}
                        </div>
                      </td>
                      <td>
                        {trn.duplicado ? (
                          <Badge variant="warning">Duplicado</Badge>
                        ) : isMissing ? (
                          <Badge variant="danger">Pendente</Badge>
                        ) : (
                          <Badge variant="success">Novo</Badge>
                        )}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
          
          {/* Resultado da Importação */}
          {importResult && (
            <div className={`p-4 rounded-lg border ${
              importResult.erros > 0 
                ? 'bg-red-500/10 border-red-500/30' 
                : 'bg-green-500/10 border-green-500/30'
            }`}>
              <h4 className={`font-medium mb-2 ${
                importResult.erros > 0 ? 'text-red-400' : 'text-green-400'
              }`}>
                {importResult.erros > 0 ? '⚠️ Importação parcial' : '✅ Importação concluída'}
              </h4>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
                <div className="bg-dark-700 p-2 rounded">
                  <span className="text-dark-400">Importados:</span>
                  <span className="text-green-400 ml-2 font-medium">{importResult.importados}</span>
                </div>
                <div className="bg-dark-700 p-2 rounded">
                  <span className="text-dark-400">Dup. FITID:</span>
                  <span className="text-yellow-400 ml-2 font-medium">{importResult.duplicadosFitid}</span>
                </div>
                <div className="bg-dark-700 p-2 rounded">
                  <span className="text-dark-400">Dup. Similar:</span>
                  <span className="text-orange-400 ml-2 font-medium">{importResult.duplicadosFingerprint}</span>
                </div>
                <div className="bg-dark-700 p-2 rounded">
                  <span className="text-dark-400">Erros:</span>
                  <span className="text-red-400 ml-2 font-medium">{importResult.erros}</span>
                </div>
              </div>
            </div>
          )}
          
          <div className="flex items-center justify-between pt-4 border-t border-dark-700">
            <div className="text-sm text-dark-400">
              {ofxData.filter(t => !t.duplicado).length} lançamentos serão importados
              {ofxData.filter(t => t.duplicado).length > 0 && (
                <span className="text-yellow-400 ml-2">
                  ({ofxData.filter(t => t.duplicado).length} duplicados ignorados)
                </span>
              )}
            </div>
            <div className="flex gap-3">
              <Button 
                variant="secondary" 
                onClick={() => { 
                  setIsOFXModalOpen(false)
                  setOfxData([])
                  setOfxCategorizacao({})
                  setAttemptedImport(false)
                  setMissingCategoryIds([])
                  setMissingContaBancaria(false)
                  setImportResult(null)
                }}
              >
                Cancelar
              </Button>
              <Button 
                onClick={handleImportOFX} 
                disabled={saving}
              >
                {saving ? 'Importando...' : 'Importar'}
              </Button>
            </div>
          </div>
        </div>
      </Modal>

      {/* Modal Exclusão em Massa */}
      <Modal
        isOpen={isDeleteMassModalOpen}
        onClose={() => !deletingMass && setIsDeleteMassModalOpen(false)}
        title="Excluir Lançamentos Selecionados"
        size="md"
      >
        <div className="space-y-4">
          {!deletingMass ? (
            <>
              <div className="flex items-center gap-3 p-4 bg-red-500/10 border border-red-500/30 rounded-lg">
                <AlertTriangle className="w-6 h-6 text-red-400 flex-shrink-0" />
                <div>
                  <p className="text-white font-medium">
                    Tem certeza que deseja excluir {selectedIds.size} lançamento{selectedIds.size > 1 ? 's' : ''}?
                  </p>
                  <p className="text-dark-400 text-sm mt-1">
                    Esta ação não pode ser desfeita. Lançamentos vinculados a vendas ou conciliados serão ignorados.
                  </p>
                </div>
              </div>
              
              <div className="flex justify-end gap-3">
                <Button variant="secondary" onClick={() => setIsDeleteMassModalOpen(false)}>
                  Cancelar
                </Button>
                <Button variant="danger" onClick={handleDeleteMass}>
                  Excluir {selectedIds.size} lançamento{selectedIds.size > 1 ? 's' : ''}
                </Button>
              </div>
            </>
          ) : (
            <div className="py-8">
              <div className="flex flex-col items-center gap-4">
                <LoadingSpinner size="lg" />
                <p className="text-white">
                  Excluindo... {deleteMassProgress.current} de {deleteMassProgress.total}
                </p>
                {deleteMassProgress.errors > 0 && (
                  <p className="text-yellow-400 text-sm">
                    {deleteMassProgress.errors} erro{deleteMassProgress.errors > 1 ? 's' : ''} (serão ignorados)
                  </p>
                )}
                <div className="w-full bg-dark-700 rounded-full h-2">
                  <div 
                    className="bg-primary-500 h-2 rounded-full transition-all"
                    style={{ width: `${(deleteMassProgress.current / deleteMassProgress.total) * 100}%` }}
                  />
                </div>
              </div>
            </div>
          )}
        </div>
      </Modal>

      {/* Modais de Detalhes */}
      <ClienteDetailModal 
        isOpen={clienteModalOpen} 
        onClose={() => setClienteModalOpen(false)} 
        clienteId={selectedClienteId} 
      />
      <VendaDetailModal 
        isOpen={vendaModalOpen} 
        onClose={() => setVendaModalOpen(false)} 
        vendaId={selectedVendaId} 
      />
      <FornecedorDetailModal 
        isOpen={fornecedorModalOpen} 
        onClose={() => setFornecedorModalOpen(false)} 
        fornecedorId={selectedFornecedorId} 
      />
      <NFEntradaDetailModal 
        isOpen={nfEntradaModalOpen} 
        onClose={() => setNfEntradaModalOpen(false)} 
        notaId={selectedNfEntradaId} 
      />

      {/* Modal de Duplicados Existentes */}
      <Modal
        isOpen={isDuplicadosModalOpen}
        onClose={() => {
          setIsDuplicadosModalOpen(false)
          setDuplicadosEncontrados([])
        }}
        title="Lançamentos Duplicados Detectados"
        size="xl"
      >
        <div className="space-y-4">
          {buscandoDuplicados ? (
            <div className="flex flex-col items-center justify-center py-12">
              <LoadingSpinner size="lg" />
              <p className="text-dark-300 mt-4">Analisando lançamentos...</p>
            </div>
          ) : duplicadosEncontrados.length === 0 ? (
            <div className="text-center py-12">
              <CheckCircle className="w-16 h-16 text-green-400 mx-auto mb-4" />
              <h3 className="text-xl font-medium text-white mb-2">Nenhum duplicado encontrado!</h3>
              <p className="text-dark-400">Todos os lançamentos parecem únicos.</p>
            </div>
          ) : (
            <>
              <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-lg p-4">
                <div className="flex items-start gap-3">
                  <AlertTriangle className="w-5 h-5 text-yellow-500 flex-shrink-0 mt-0.5" />
                  <div>
                    <h4 className="text-yellow-500 font-medium mb-1">
                      {duplicadosEncontrados.length} par(es) de duplicados encontrado(s)
                    </h4>
                    <p className="text-dark-300 text-sm">
                      Estes lançamentos parecem ser do mesmo evento (valor igual, datas próximas, descrição similar).
                      Você pode <strong>Mesclar</strong> (mantém 1, deleta outro) ou <strong>Ignorar</strong>.
                    </p>
                  </div>
                </div>
              </div>

              <div className="space-y-4 max-h-[60vh] overflow-y-auto">
                {duplicadosEncontrados.map((par, index) => (
                  <div key={index} className="bg-dark-700 rounded-lg p-4 border border-dark-600">
                    <div className="flex items-center justify-between mb-3">
                      <Badge variant="warning" size="sm">
                        Similaridade: {Math.round(par.score * 100)}%
                      </Badge>
                      <span className="text-dark-400 text-xs">
                        Diferença: {par.diferencaDias} dia(s)
                      </span>
                    </div>

                    {/* Lançamento COM NF */}
                    <div className="bg-green-500/10 border border-green-500/30 rounded-lg p-3 mb-2">
                      <div className="flex items-center gap-2 mb-1">
                        <Receipt className="w-4 h-4 text-green-400" />
                        <span className="text-green-400 text-xs font-medium">COM NOTA FISCAL</span>
                      </div>
                      <div className="flex justify-between items-start">
                        <div>
                          <p className="text-white font-medium">{par.lancamentoComNF.descricao}</p>
                          <p className="text-dark-400 text-sm">
                            {formatDate(par.lancamentoComNF.data_lancamento)} • 
                            {categorias.find(c => c.id === par.lancamentoComNF.categoria_id)?.nome || 'Sem categoria'}
                          </p>
                        </div>
                        <span className="text-red-400 font-bold">{formatCurrency(par.lancamentoComNF.valor)}</span>
                      </div>
                    </div>

                    {/* Lançamento SEM NF (OFX) */}
                    <div className="bg-dark-600 rounded-lg p-3 mb-3">
                      <div className="flex items-center gap-2 mb-1">
                        <Upload className="w-4 h-4 text-blue-400" />
                        <span className="text-blue-400 text-xs font-medium">OFX / SEM NF</span>
                      </div>
                      <div className="flex justify-between items-start">
                        <div>
                          <p className="text-white font-medium">{par.lancamentoSemNF.descricao}</p>
                          <p className="text-dark-400 text-sm">
                            {formatDate(par.lancamentoSemNF.data_lancamento)} • 
                            {contasBancarias.find(c => c.id === par.lancamentoSemNF.conta_id)?.nome || 'Sem conta'}
                          </p>
                        </div>
                        <span className="text-red-400 font-bold">{formatCurrency(par.lancamentoSemNF.valor)}</span>
                      </div>
                    </div>

                    {/* Ações */}
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        variant="primary"
                        onClick={() => handleMesclarDuplicado(par.lancamentoComNF.id, par.lancamentoSemNF.id, 'mesclar')}
                        disabled={processandoDuplicado === par.lancamentoComNF.id}
                        leftIcon={<GitMerge className="w-4 h-4" />}
                        className="flex-1"
                      >
                        {processandoDuplicado === par.lancamentoComNF.id ? 'Mesclando...' : 'Mesclar (mantém NF)'}
                      </Button>
                      <Button
                        size="sm"
                        variant="secondary"
                        onClick={() => setDuplicadosEncontrados(prev => prev.filter((_, i) => i !== index))}
                        className="flex-1"
                      >
                        Ignorar
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      </Modal>
    </div>
  )
}
