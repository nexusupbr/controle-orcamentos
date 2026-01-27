'use client'

import { useEffect, useState } from 'react'
import { 
  Plus, Edit2, Trash2, Search, DollarSign, TrendingUp, TrendingDown,
  Calendar, FileText, Upload, Download, CheckCircle, Clock, AlertTriangle,
  CreditCard, Wallet, Building2, RefreshCw, Filter
} from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Modal } from '@/components/ui/Modal'
import { LoadingSpinner, EmptyState, Badge } from '@/components/ui/Common'
import { 
  ContaPagar, ContaReceber, ContaBancaria, CategoriaFinanceira, LancamentoFinanceiro,
  fetchContasPagar, createContaPagar, updateContaPagar, deleteContaPagar,
  fetchContasReceber, createContaReceber, updateContaReceber, deleteContaReceber,
  fetchContasBancarias, createContaBancaria, fetchCategoriasFinanceiras, createCategoriaFinanceira,
  fetchLancamentosFinanceiros, createLancamentoFinanceiro,
  fetchFornecedores, fetchClientes, checkOFXDuplicado
} from '@/lib/database'
import { formatCurrency, formatDate } from '@/lib/utils'

type TabType = 'pagar' | 'receber' | 'extrato' | 'contas' | 'dre'

export default function FinanceiroPage() {
  const [activeTab, setActiveTab] = useState<TabType>('pagar')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  
  // Dados
  const [contasPagar, setContasPagar] = useState<ContaPagar[]>([])
  const [contasReceber, setContasReceber] = useState<ContaReceber[]>([])
  const [contasBancarias, setContasBancarias] = useState<ContaBancaria[]>([])
  const [categorias, setCategorias] = useState<CategoriaFinanceira[]>([])
  const [lancamentos, setLancamentos] = useState<LancamentoFinanceiro[]>([])
  const [fornecedores, setFornecedores] = useState<any[]>([])
  const [clientes, setClientes] = useState<any[]>([])
  
  // Filtros
  const [searchTerm, setSearchTerm] = useState('')
  const [filterStatus, setFilterStatus] = useState<string>('todos')
  const [filterPeriodo, setFilterPeriodo] = useState<string>('mes')
  const [filterContaBancaria, setFilterContaBancaria] = useState<number | null>(null)
  
  // Modais
  const [isPagarModalOpen, setIsPagarModalOpen] = useState(false)
  const [isReceberModalOpen, setIsReceberModalOpen] = useState(false)
  const [isContaBancariaModalOpen, setIsContaBancariaModalOpen] = useState(false)
  const [isOFXModalOpen, setIsOFXModalOpen] = useState(false)
  const [isCategoriaModalOpen, setIsCategoriaModalOpen] = useState(false)
  
  // Edição
  const [editingPagar, setEditingPagar] = useState<ContaPagar | null>(null)
  const [editingReceber, setEditingReceber] = useState<ContaReceber | null>(null)
  
  // Forms
  const [formPagar, setFormPagar] = useState({
    fornecedor_id: null as number | null,
    descricao: '',
    valor: 0,
    data_vencimento: '',
    data_pagamento: '',
    categoria_id: null as number | null,
    conta_bancaria_id: null as number | null,
    forma_pagamento: 'boleto',
    numero_documento: '',
    parcela_atual: 1,
    total_parcelas: 1,
    observacoes: ''
  })
  
  const [formReceber, setFormReceber] = useState({
    cliente_id: null as number | null,
    descricao: '',
    valor: 0,
    data_vencimento: '',
    data_recebimento: '',
    categoria_id: null as number | null,
    conta_bancaria_id: null as number | null,
    forma_pagamento: 'pix',
    numero_documento: '',
    parcela_atual: 1,
    total_parcelas: 1,
    observacoes: ''
  })
  
  const [formContaBancaria, setFormContaBancaria] = useState({
    nome: '',
    banco: '',
    agencia: '',
    conta: '',
    tipo: 'corrente',
    saldo_inicial: 0
  })
  
  const [formCategoria, setFormCategoria] = useState({
    nome: '',
    tipo: 'despesa' as 'receita' | 'despesa',
    cor: '#3B82F6'
  })
  
  // OFX Import
  const [ofxData, setOfxData] = useState<any[]>([])
  const [ofxCategorizacao, setOfxCategorizacao] = useState<{[key: string]: number}>({})

  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    try {
      setLoading(true)
      const [pagar, receber, contas, cats, lancs, forns, clis] = await Promise.all([
        fetchContasPagar(),
        fetchContasReceber(),
        fetchContasBancarias(),
        fetchCategoriasFinanceiras(),
        fetchLancamentosFinanceiros(),
        fetchFornecedores(),
        fetchClientes()
      ])
      setContasPagar(pagar)
      setContasReceber(receber)
      setContasBancarias(contas)
      setCategorias(cats)
      setLancamentos(lancs)
      setFornecedores(forns)
      setClientes(clis)
    } catch (err) {
      console.error('Erro ao carregar dados:', err)
    } finally {
      setLoading(false)
    }
  }

  // Calcular totais
  const totalPagar = contasPagar.filter(c => c.status !== 'pago').reduce((acc, c) => acc + c.valor, 0)
  const totalReceber = contasReceber.filter(c => c.status !== 'recebido').reduce((acc, c) => acc + c.valor, 0)
  const saldoContas = contasBancarias.reduce((acc, c) => acc + c.saldo_atual, 0)
  const vencidos = contasPagar.filter(c => c.status === 'vencido').length + contasReceber.filter(c => c.status === 'vencido').length

  // Filtrar contas a pagar
  const filteredPagar = contasPagar.filter(c => {
    const matchSearch = c.descricao?.toLowerCase().includes(searchTerm.toLowerCase())
    const matchStatus = filterStatus === 'todos' || c.status === filterStatus
    return matchSearch && matchStatus
  })

  // Filtrar contas a receber
  const filteredReceber = contasReceber.filter(c => {
    const matchSearch = c.descricao?.toLowerCase().includes(searchTerm.toLowerCase())
    const matchStatus = filterStatus === 'todos' || c.status === filterStatus
    return matchSearch && matchStatus
  })

  // Filtrar lançamentos
  const filteredLancamentos = lancamentos.filter(l => {
    const matchSearch = l.descricao?.toLowerCase().includes(searchTerm.toLowerCase())
    const matchConta = !filterContaBancaria || l.conta_bancaria_id === filterContaBancaria || l.conta_id === filterContaBancaria
    return matchSearch && matchConta
  })

  // Handlers Contas a Pagar
  const openPagarModal = (conta?: ContaPagar) => {
    if (conta) {
      setEditingPagar(conta)
      setFormPagar({
        fornecedor_id: conta.fornecedor_id,
        descricao: conta.descricao,
        valor: conta.valor,
        data_vencimento: conta.data_vencimento,
        data_pagamento: conta.data_pagamento || '',
        categoria_id: conta.categoria_id,
        conta_bancaria_id: conta.conta_bancaria_id,
        forma_pagamento: conta.forma_pagamento || 'boleto',
        numero_documento: conta.numero_documento || '',
        parcela_atual: conta.parcela_atual || 1,
        total_parcelas: conta.total_parcelas || 1,
        observacoes: conta.observacoes || ''
      })
    } else {
      setEditingPagar(null)
      setFormPagar({
        fornecedor_id: null,
        descricao: '',
        valor: 0,
        data_vencimento: '',
        data_pagamento: '',
        categoria_id: null,
        conta_bancaria_id: null,
        forma_pagamento: 'boleto',
        numero_documento: '',
        parcela_atual: 1,
        total_parcelas: 1,
        observacoes: ''
      })
    }
    setIsPagarModalOpen(true)
  }

  const handleSavePagar = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    try {
      const statusValue: 'pendente' | 'pago' | 'vencido' = formPagar.data_pagamento ? 'pago' : 
                new Date(formPagar.data_vencimento) < new Date() ? 'vencido' : 'pendente'
      
      const data = {
        fornecedor_id: formPagar.fornecedor_id,
        descricao: formPagar.descricao,
        valor: formPagar.valor,
        data_vencimento: formPagar.data_vencimento,
        data_pagamento: formPagar.data_pagamento || null,
        categoria_id: formPagar.categoria_id,
        conta_bancaria_id: formPagar.conta_bancaria_id,
        forma_pagamento: formPagar.forma_pagamento,
        numero_documento: formPagar.numero_documento,
        parcela_atual: formPagar.parcela_atual,
        total_parcelas: formPagar.total_parcelas,
        observacoes: formPagar.observacoes,
        status: statusValue
      }
      
      if (editingPagar) {
        await updateContaPagar(editingPagar.id, data)
      } else {
        await createContaPagar(data)
      }
      
      await loadData()
      setIsPagarModalOpen(false)
    } catch (err) {
      console.error('Erro ao salvar:', err)
      alert('Erro ao salvar conta')
    } finally {
      setSaving(false)
    }
  }

  const handlePagarConta = async (conta: ContaPagar) => {
    if (!confirm('Confirma o pagamento desta conta?')) return
    
    try {
      await updateContaPagar(conta.id, {
        status: 'pago',
        data_pagamento: new Date().toISOString().split('T')[0]
      })
      
      // Criar lançamento
      if (conta.conta_bancaria_id) {
        await createLancamentoFinanceiro({
          conta_bancaria_id: conta.conta_bancaria_id,
          tipo: 'despesa',
          valor: conta.valor,
          data: new Date().toISOString().split('T')[0],
          descricao: conta.descricao,
          categoria_id: conta.categoria_id,
          conta_pagar_id: conta.id,
          conciliado: false
        })
      }
      
      await loadData()
    } catch (err) {
      console.error('Erro ao pagar conta:', err)
    }
  }

  const handleDeletePagar = async (id: number) => {
    if (!confirm('Tem certeza que deseja excluir esta conta?')) return
    try {
      await deleteContaPagar(id)
      await loadData()
    } catch (err) {
      console.error('Erro ao excluir:', err)
    }
  }

  // Handlers Contas a Receber
  const openReceberModal = (conta?: ContaReceber) => {
    if (conta) {
      setEditingReceber(conta)
      setFormReceber({
        cliente_id: conta.cliente_id,
        descricao: conta.descricao,
        valor: conta.valor,
        data_vencimento: conta.data_vencimento,
        data_recebimento: conta.data_recebimento || '',
        categoria_id: conta.categoria_id,
        conta_bancaria_id: conta.conta_bancaria_id,
        forma_pagamento: conta.forma_pagamento || 'pix',
        numero_documento: conta.numero_documento || '',
        parcela_atual: conta.parcela_atual || 1,
        total_parcelas: conta.total_parcelas || 1,
        observacoes: conta.observacoes || ''
      })
    } else {
      setEditingReceber(null)
      setFormReceber({
        cliente_id: null,
        descricao: '',
        valor: 0,
        data_vencimento: '',
        data_recebimento: '',
        categoria_id: null,
        conta_bancaria_id: null,
        forma_pagamento: 'pix',
        numero_documento: '',
        parcela_atual: 1,
        total_parcelas: 1,
        observacoes: ''
      })
    }
    setIsReceberModalOpen(true)
  }

  const handleSaveReceber = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    try {
      const statusValue: 'pendente' | 'recebido' | 'vencido' = formReceber.data_recebimento ? 'recebido' : 
                new Date(formReceber.data_vencimento) < new Date() ? 'vencido' : 'pendente'
      
      const data = {
        cliente_id: formReceber.cliente_id,
        descricao: formReceber.descricao,
        valor: formReceber.valor,
        data_vencimento: formReceber.data_vencimento,
        data_recebimento: formReceber.data_recebimento || null,
        categoria_id: formReceber.categoria_id,
        conta_bancaria_id: formReceber.conta_bancaria_id,
        forma_pagamento: formReceber.forma_pagamento,
        numero_documento: formReceber.numero_documento,
        parcela_atual: formReceber.parcela_atual,
        total_parcelas: formReceber.total_parcelas,
        observacoes: formReceber.observacoes,
        status: statusValue
      }
      
      if (editingReceber) {
        await updateContaReceber(editingReceber.id, data)
      } else {
        await createContaReceber(data)
      }
      
      await loadData()
      setIsReceberModalOpen(false)
    } catch (err) {
      console.error('Erro ao salvar:', err)
      alert('Erro ao salvar conta')
    } finally {
      setSaving(false)
    }
  }

  const handleReceberConta = async (conta: ContaReceber) => {
    if (!confirm('Confirma o recebimento desta conta?')) return
    
    try {
      await updateContaReceber(conta.id, {
        status: 'recebido',
        data_recebimento: new Date().toISOString().split('T')[0]
      })
      
      // Criar lançamento
      if (conta.conta_bancaria_id) {
        await createLancamentoFinanceiro({
          conta_bancaria_id: conta.conta_bancaria_id,
          tipo: 'receita',
          valor: conta.valor,
          data: new Date().toISOString().split('T')[0],
          descricao: conta.descricao,
          categoria_id: conta.categoria_id,
          conta_receber_id: conta.id,
          conciliado: false
        })
      }
      
      await loadData()
    } catch (err) {
      console.error('Erro ao receber conta:', err)
    }
  }

  const handleDeleteReceber = async (id: number) => {
    if (!confirm('Tem certeza que deseja excluir esta conta?')) return
    try {
      await deleteContaReceber(id)
      await loadData()
    } catch (err) {
      console.error('Erro ao excluir:', err)
    }
  }

  // Handler Conta Bancária
  const handleSaveContaBancaria = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    try {
      const tipoValue: 'corrente' | 'poupanca' | 'caixa' = formContaBancaria.tipo as 'corrente' | 'poupanca' | 'caixa'
      await createContaBancaria({
        nome: formContaBancaria.nome,
        banco: formContaBancaria.banco,
        agencia: formContaBancaria.agencia,
        conta: formContaBancaria.conta,
        tipo: tipoValue,
        saldo_inicial: formContaBancaria.saldo_inicial,
        saldo_atual: formContaBancaria.saldo_inicial,
        ativo: true
      })
      await loadData()
      setIsContaBancariaModalOpen(false)
      setFormContaBancaria({ nome: '', banco: '', agencia: '', conta: '', tipo: 'corrente', saldo_inicial: 0 })
    } catch (err) {
      console.error('Erro ao salvar:', err)
    } finally {
      setSaving(false)
    }
  }

  // Handler Categoria
  const handleSaveCategoria = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    try {
      await createCategoriaFinanceira(formCategoria)
      await loadData()
      setIsCategoriaModalOpen(false)
      setFormCategoria({ nome: '', tipo: 'despesa', cor: '#3B82F6' })
    } catch (err) {
      console.error('Erro ao salvar:', err)
    } finally {
      setSaving(false)
    }
  }

  // Importação OFX
  const handleOFXUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    
    try {
      const text = await file.text()
      // Parse OFX simplificado
      const transactions: any[] = []
      const stmttrn = text.match(/<STMTTRN>([\s\S]*?)<\/STMTTRN>/g) || []
      
      for (const trn of stmttrn) {
        const trntype = trn.match(/<TRNTYPE>(\w+)/)?.[1]
        const dtposted = trn.match(/<DTPOSTED>(\d+)/)?.[1]
        const trnamt = trn.match(/<TRNAMT>([\d.-]+)/)?.[1]
        const fitid = trn.match(/<FITID>(\S+)/)?.[1]
        const memo = trn.match(/<MEMO>([^<]+)/)?.[1]
        
        if (dtposted && trnamt && fitid) {
          // Verificar se já existe
          const duplicado = await checkOFXDuplicado(fitid)
          
          transactions.push({
            id: fitid,
            tipo: Number(trnamt) >= 0 ? 'entrada' : 'saida',
            valor: Math.abs(Number(trnamt)),
            data: `${dtposted.slice(0,4)}-${dtposted.slice(4,6)}-${dtposted.slice(6,8)}`,
            descricao: memo || trntype,
            duplicado
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
    if (!filterContaBancaria) {
      alert('Selecione uma conta bancária')
      return
    }
    
    setSaving(true)
    try {
      for (const trn of ofxData.filter(t => !t.duplicado)) {
        await createLancamentoFinanceiro({
          conta_bancaria_id: filterContaBancaria,
          tipo: trn.tipo,
          valor: trn.valor,
          data: trn.data,
          descricao: trn.descricao,
          categoria_id: ofxCategorizacao[trn.id] || null,
          identificador_externo: trn.id,
          conciliado: false
        })
      }
      
      await loadData()
      setIsOFXModalOpen(false)
      setOfxData([])
    } catch (err) {
      console.error('Erro ao importar:', err)
      alert('Erro ao importar lançamentos')
    } finally {
      setSaving(false)
    }
  }

  // Calcular DRE
  const calcularDRE = () => {
    const now = new Date()
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)
    
    const receitas = lancamentos
      .filter(l => (l.tipo === 'receita' || l.tipo === 'entrada') && new Date(l.data || l.data_lancamento) >= startOfMonth)
      .reduce((acc, l) => acc + l.valor, 0)
    
    const despesas = lancamentos
      .filter(l => (l.tipo === 'despesa' || l.tipo === 'saida') && new Date(l.data || l.data_lancamento) >= startOfMonth)
      .reduce((acc, l) => acc + l.valor, 0)
    
    const despesasPorCategoria = categorias
      .filter(c => c.tipo === 'despesa')
      .map(cat => ({
        categoria: cat.nome,
        valor: lancamentos
          .filter(l => (l.tipo === 'despesa' || l.tipo === 'saida') && l.categoria_id === cat.id && new Date(l.data || l.data_lancamento) >= startOfMonth)
          .reduce((acc, l) => acc + l.valor, 0)
      }))
      .filter(d => d.valor > 0)
    
    return { receitas, despesas, lucro: receitas - despesas, despesasPorCategoria }
  }

  const dre = calcularDRE()

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
            Financeiro
          </h1>
          <p className="text-dark-400 mt-1">
            Gerencie contas a pagar, receber e extrato bancário
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="secondary"
            onClick={() => setIsCategoriaModalOpen(true)}
            leftIcon={<Plus className="w-4 h-4" />}
          >
            Categoria
          </Button>
          <Button
            variant="secondary"
            onClick={() => setIsContaBancariaModalOpen(true)}
            leftIcon={<Building2 className="w-4 h-4" />}
          >
            Conta Bancária
          </Button>
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="glass-card p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-red-500/20 flex items-center justify-center">
              <TrendingDown className="w-5 h-5 text-red-400" />
            </div>
            <div>
              <p className="text-dark-400 text-sm">A Pagar</p>
              <p className="text-xl font-bold text-red-400">{formatCurrency(totalPagar)}</p>
            </div>
          </div>
        </div>
        
        <div className="glass-card p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-green-500/20 flex items-center justify-center">
              <TrendingUp className="w-5 h-5 text-green-400" />
            </div>
            <div>
              <p className="text-dark-400 text-sm">A Receber</p>
              <p className="text-xl font-bold text-green-400">{formatCurrency(totalReceber)}</p>
            </div>
          </div>
        </div>
        
        <div className="glass-card p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-primary-500/20 flex items-center justify-center">
              <Wallet className="w-5 h-5 text-primary-400" />
            </div>
            <div>
              <p className="text-dark-400 text-sm">Saldo em Conta</p>
              <p className="text-xl font-bold text-white">{formatCurrency(saldoContas)}</p>
            </div>
          </div>
        </div>
        
        <div className="glass-card p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-yellow-500/20 flex items-center justify-center">
              <AlertTriangle className="w-5 h-5 text-yellow-400" />
            </div>
            <div>
              <p className="text-dark-400 text-sm">Vencidos</p>
              <p className="text-xl font-bold text-yellow-400">{vencidos}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 border-b border-dark-700 pb-4 overflow-x-auto">
        {[
          { id: 'pagar', label: 'Contas a Pagar', icon: TrendingDown },
          { id: 'receber', label: 'Contas a Receber', icon: TrendingUp },
          { id: 'extrato', label: 'Extrato', icon: FileText },
          { id: 'contas', label: 'Contas Bancárias', icon: Building2 },
          { id: 'dre', label: 'DRE', icon: DollarSign }
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as TabType)}
            className={`px-4 py-2 rounded-lg font-medium whitespace-nowrap transition-colors flex items-center gap-2 ${
              activeTab === tab.id 
                ? 'bg-primary-500 text-white' 
                : 'bg-dark-700 text-dark-300 hover:bg-dark-600'
            }`}
          >
            <tab.icon className="w-4 h-4" />
            {tab.label}
          </button>
        ))}
      </div>

      {/* Filtros */}
      {(activeTab === 'pagar' || activeTab === 'receber' || activeTab === 'extrato') && (
        <div className="glass-card p-4">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
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
            
            {(activeTab === 'pagar' || activeTab === 'receber') && (
              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                className="input"
              >
                <option value="todos">Todos os status</option>
                <option value="pendente">Pendente</option>
                <option value="vencido">Vencido</option>
                <option value={activeTab === 'pagar' ? 'pago' : 'recebido'}>
                  {activeTab === 'pagar' ? 'Pago' : 'Recebido'}
                </option>
              </select>
            )}
            
            {activeTab === 'extrato' && (
              <>
                <select
                  value={filterContaBancaria || ''}
                  onChange={(e) => setFilterContaBancaria(e.target.value ? Number(e.target.value) : null)}
                  className="input"
                >
                  <option value="">Todas as contas</option>
                  {contasBancarias.map(conta => (
                    <option key={conta.id} value={conta.id}>{conta.nome}</option>
                  ))}
                </select>
                
                <div className="relative">
                  <input
                    type="file"
                    accept=".ofx"
                    onChange={handleOFXUpload}
                    className="hidden"
                    id="ofx-upload"
                  />
                  <label htmlFor="ofx-upload" className="cursor-pointer">
                    <span className="btn btn-secondary flex items-center gap-2">
                      <Upload className="w-4 h-4" />
                      Importar OFX
                    </span>
                  </label>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* Contas a Pagar */}
      {activeTab === 'pagar' && (
        <div className="glass-card overflow-hidden">
          {filteredPagar.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Descrição</th>
                    <th>Fornecedor</th>
                    <th>Vencimento</th>
                    <th className="text-right">Valor</th>
                    <th>Status</th>
                    <th className="text-right">Ações</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredPagar.map((conta) => (
                    <tr key={conta.id} className="group">
                      <td>
                        <div>
                          <span className="font-medium text-white">{conta.descricao}</span>
                          {(conta.total_parcelas ?? 0) > 1 && (
                            <span className="text-xs text-dark-400 ml-2">
                              ({conta.parcela_atual}/{conta.total_parcelas})
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="text-dark-300">
                        {fornecedores.find(f => f.id === conta.fornecedor_id)?.razao_social || '-'}
                      </td>
                      <td className="text-dark-300">{formatDate(conta.data_vencimento)}</td>
                      <td className="text-right font-medium text-white">{formatCurrency(conta.valor)}</td>
                      <td>
                        <Badge 
                          variant={
                            conta.status === 'pago' ? 'success' : 
                            conta.status === 'vencido' ? 'danger' : 'warning'
                          }
                        >
                          {conta.status === 'pago' ? 'Pago' : 
                           conta.status === 'vencido' ? 'Vencido' : 'Pendente'}
                        </Badge>
                      </td>
                      <td>
                        <div className="flex items-center justify-end gap-1">
                          {conta.status !== 'pago' && (
                            <button
                              onClick={() => handlePagarConta(conta)}
                              className="p-2 rounded-lg text-dark-400 hover:text-green-400 hover:bg-green-500/10 transition-colors"
                              title="Pagar"
                            >
                              <CheckCircle className="w-4 h-4" />
                            </button>
                          )}
                          <button
                            onClick={() => openPagarModal(conta)}
                            className="p-2 rounded-lg text-dark-400 hover:text-primary-400 hover:bg-primary-500/10 transition-colors"
                            title="Editar"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleDeletePagar(conta.id)}
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
              icon={<TrendingDown className="w-10 h-10 text-dark-500" />}
              title="Nenhuma conta a pagar"
              description="Cadastre contas a pagar para controlar suas despesas"
              action={
                <Button onClick={() => openPagarModal()} leftIcon={<Plus className="w-4 h-4" />}>
                  Nova Conta
                </Button>
              }
            />
          )}
        </div>
      )}

      {activeTab === 'receber' && (
        <div className="glass-card overflow-hidden">
          {filteredReceber.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Descrição</th>
                    <th>Cliente</th>
                    <th>Vencimento</th>
                    <th className="text-right">Valor</th>
                    <th>Status</th>
                    <th className="text-right">Ações</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredReceber.map((conta) => (
                    <tr key={conta.id} className="group">
                      <td>
                        <div>
                          <span className="font-medium text-white">{conta.descricao}</span>
                          {(conta.total_parcelas ?? 0) > 1 && (
                            <span className="text-xs text-dark-400 ml-2">
                              ({conta.parcela_atual}/{conta.total_parcelas})
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="text-dark-300">
                        {clientes.find(c => c.id === conta.cliente_id)?.nome || 
                         clientes.find(c => c.id === conta.cliente_id)?.razao_social || '-'}
                      </td>
                      <td className="text-dark-300">{formatDate(conta.data_vencimento)}</td>
                      <td className="text-right font-medium text-white">{formatCurrency(conta.valor)}</td>
                      <td>
                        <Badge 
                          variant={
                            conta.status === 'recebido' ? 'success' : 
                            conta.status === 'vencido' ? 'danger' : 'warning'
                          }
                        >
                          {conta.status === 'recebido' ? 'Recebido' : 
                           conta.status === 'vencido' ? 'Vencido' : 'Pendente'}
                        </Badge>
                      </td>
                      <td>
                        <div className="flex items-center justify-end gap-1">
                          {conta.status !== 'recebido' && (
                            <button
                              onClick={() => handleReceberConta(conta)}
                              className="p-2 rounded-lg text-dark-400 hover:text-green-400 hover:bg-green-500/10 transition-colors"
                              title="Receber"
                            >
                              <CheckCircle className="w-4 h-4" />
                            </button>
                          )}
                          <button
                            onClick={() => openReceberModal(conta)}
                            className="p-2 rounded-lg text-dark-400 hover:text-primary-400 hover:bg-primary-500/10 transition-colors"
                            title="Editar"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleDeleteReceber(conta.id)}
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
              icon={<TrendingUp className="w-10 h-10 text-dark-500" />}
              title="Nenhuma conta a receber"
              description="Cadastre contas a receber para controlar suas receitas"
              action={
                <Button onClick={() => openReceberModal()} leftIcon={<Plus className="w-4 h-4" />}>
                  Nova Conta
                </Button>
              }
            />
          )}
        </div>
      )}

      {activeTab === 'extrato' && (
        <div className="glass-card overflow-hidden">
          {filteredLancamentos.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Data</th>
                    <th>Descrição</th>
                    <th>Conta</th>
                    <th>Categoria</th>
                    <th className="text-right">Entrada</th>
                    <th className="text-right">Saída</th>
                    <th>Conciliado</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredLancamentos.map((lanc) => (
                    <tr key={lanc.id}>
                      <td className="text-dark-300">{formatDate(lanc.data || lanc.data_lancamento)}</td>
                      <td className="font-medium text-white">{lanc.descricao}</td>
                      <td className="text-dark-300">
                        {contasBancarias.find(c => c.id === (lanc.conta_bancaria_id || lanc.conta_id))?.nome}
                      </td>
                      <td className="text-dark-300">
                        {categorias.find(c => c.id === lanc.categoria_id)?.nome || '-'}
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
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <EmptyState
              icon={<FileText className="w-10 h-10 text-dark-500" />}
              title="Nenhum lançamento"
              description="Importe um arquivo OFX ou faça pagamentos/recebimentos"
            />
          )}
        </div>
      )}

      {activeTab === 'contas' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {contasBancarias.map((conta) => (
            <div key={conta.id} className="glass-card p-6">
              <div className="flex items-center gap-4 mb-4">
                <div className="w-12 h-12 rounded-xl bg-primary-500/20 flex items-center justify-center">
                  <Building2 className="w-6 h-6 text-primary-400" />
                </div>
                <div>
                  <h3 className="font-medium text-white">{conta.nome}</h3>
                  <p className="text-sm text-dark-400">{conta.banco}</p>
                </div>
              </div>
              <div className="space-y-2 text-sm mb-4">
                <div className="flex justify-between">
                  <span className="text-dark-400">Agência:</span>
                  <span className="text-white">{conta.agencia}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-dark-400">Conta:</span>
                  <span className="text-white">{conta.conta}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-dark-400">Tipo:</span>
                  <span className="text-white capitalize">{conta.tipo}</span>
                </div>
              </div>
              <div className="pt-4 border-t border-dark-700">
                <p className="text-dark-400 text-sm">Saldo Atual</p>
                <p className={`text-2xl font-bold ${conta.saldo_atual >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                  {formatCurrency(conta.saldo_atual)}
                </p>
              </div>
            </div>
          ))}
          
          {contasBancarias.length === 0 && (
            <div className="col-span-full">
              <EmptyState
                icon={<Building2 className="w-10 h-10 text-dark-500" />}
                title="Nenhuma conta bancária"
                description="Cadastre suas contas bancárias para gerenciar o fluxo de caixa"
                action={
                  <Button onClick={() => setIsContaBancariaModalOpen(true)} leftIcon={<Plus className="w-4 h-4" />}>
                    Nova Conta
                  </Button>
                }
              />
            </div>
          )}
        </div>
      )}

      {activeTab === 'dre' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="glass-card p-6">
              <p className="text-dark-400 text-sm mb-2">Receitas do Mês</p>
              <p className="text-3xl font-bold text-green-400">{formatCurrency(dre.receitas)}</p>
            </div>
            <div className="glass-card p-6">
              <p className="text-dark-400 text-sm mb-2">Despesas do Mês</p>
              <p className="text-3xl font-bold text-red-400">{formatCurrency(dre.despesas)}</p>
            </div>
            <div className="glass-card p-6">
              <p className="text-dark-400 text-sm mb-2">Resultado</p>
              <p className={`text-3xl font-bold ${dre.lucro >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                {formatCurrency(dre.lucro)}
              </p>
            </div>
          </div>
          
          <div className="glass-card p-6">
            <h3 className="text-lg font-semibold text-white mb-4">Despesas por Categoria</h3>
            <div className="space-y-3">
              {dre.despesasPorCategoria.map((item, index) => (
                <div key={index} className="flex items-center justify-between">
                  <span className="text-dark-300">{item.categoria}</span>
                  <span className="font-medium text-white">{formatCurrency(item.valor)}</span>
                </div>
              ))}
              {dre.despesasPorCategoria.length === 0 && (
                <p className="text-dark-400 text-center py-4">Nenhuma despesa no período</p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Modal Conta a Pagar */}
      <Modal
        isOpen={isPagarModalOpen}
        onClose={() => setIsPagarModalOpen(false)}
        title={editingPagar ? 'Editar Conta a Pagar' : 'Nova Conta a Pagar'}
        size="lg"
      >
        <form onSubmit={handleSavePagar} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="md:col-span-2">
              <label className="block text-sm text-dark-300 mb-2">Descrição *</label>
              <input
                type="text"
                value={formPagar.descricao}
                onChange={(e) => setFormPagar({ ...formPagar, descricao: e.target.value })}
                className="input w-full"
                required
              />
            </div>
            
            <div>
              <label className="block text-sm text-dark-300 mb-2">Fornecedor</label>
              <select
                value={formPagar.fornecedor_id || ''}
                onChange={(e) => setFormPagar({ ...formPagar, fornecedor_id: e.target.value ? Number(e.target.value) : null })}
                className="input w-full"
              >
                <option value="">Selecione...</option>
                {fornecedores.map(f => (
                  <option key={f.id} value={f.id}>{f.razao_social}</option>
                ))}
              </select>
            </div>
            
            <div>
              <label className="block text-sm text-dark-300 mb-2">Categoria</label>
              <select
                value={formPagar.categoria_id || ''}
                onChange={(e) => setFormPagar({ ...formPagar, categoria_id: e.target.value ? Number(e.target.value) : null })}
                className="input w-full"
              >
                <option value="">Selecione...</option>
                {categorias.filter(c => c.tipo === 'despesa').map(c => (
                  <option key={c.id} value={c.id}>{c.nome}</option>
                ))}
              </select>
            </div>
            
            <div>
              <label className="block text-sm text-dark-300 mb-2">Valor *</label>
              <input
                type="number"
                step="0.01"
                value={formPagar.valor}
                onChange={(e) => setFormPagar({ ...formPagar, valor: Number(e.target.value) })}
                className="input w-full"
                required
              />
            </div>
            
            <div>
              <label className="block text-sm text-dark-300 mb-2">Vencimento *</label>
              <input
                type="date"
                value={formPagar.data_vencimento}
                onChange={(e) => setFormPagar({ ...formPagar, data_vencimento: e.target.value })}
                className="input w-full"
                required
              />
            </div>
            
            <div>
              <label className="block text-sm text-dark-300 mb-2">Conta Bancária</label>
              <select
                value={formPagar.conta_bancaria_id || ''}
                onChange={(e) => setFormPagar({ ...formPagar, conta_bancaria_id: e.target.value ? Number(e.target.value) : null })}
                className="input w-full"
              >
                <option value="">Selecione...</option>
                {contasBancarias.map(c => (
                  <option key={c.id} value={c.id}>{c.nome}</option>
                ))}
              </select>
            </div>
            
            <div>
              <label className="block text-sm text-dark-300 mb-2">Forma de Pagamento</label>
              <select
                value={formPagar.forma_pagamento}
                onChange={(e) => setFormPagar({ ...formPagar, forma_pagamento: e.target.value })}
                className="input w-full"
              >
                <option value="boleto">Boleto</option>
                <option value="pix">PIX</option>
                <option value="ted">TED</option>
                <option value="debito">Débito</option>
                <option value="dinheiro">Dinheiro</option>
              </select>
            </div>
            
            <div>
              <label className="block text-sm text-dark-300 mb-2">Nº Documento</label>
              <input
                type="text"
                value={formPagar.numero_documento}
                onChange={(e) => setFormPagar({ ...formPagar, numero_documento: e.target.value })}
                className="input w-full"
              />
            </div>
            
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-sm text-dark-300 mb-2">Parcela</label>
                <input
                  type="number"
                  min="1"
                  value={formPagar.parcela_atual}
                  onChange={(e) => setFormPagar({ ...formPagar, parcela_atual: Number(e.target.value) })}
                  className="input w-full"
                />
              </div>
              <div>
                <label className="block text-sm text-dark-300 mb-2">de</label>
                <input
                  type="number"
                  min="1"
                  value={formPagar.total_parcelas}
                  onChange={(e) => setFormPagar({ ...formPagar, total_parcelas: Number(e.target.value) })}
                  className="input w-full"
                />
              </div>
            </div>
          </div>
          
          <div className="flex justify-end gap-3 pt-4 border-t border-dark-700">
            <Button type="button" variant="secondary" onClick={() => setIsPagarModalOpen(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={saving}>
              {saving ? 'Salvando...' : 'Salvar'}
            </Button>
          </div>
        </form>
      </Modal>

      {/* Modal Conta a Receber */}
      <Modal
        isOpen={isReceberModalOpen}
        onClose={() => setIsReceberModalOpen(false)}
        title={editingReceber ? 'Editar Conta a Receber' : 'Nova Conta a Receber'}
        size="lg"
      >
        <form onSubmit={handleSaveReceber} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="md:col-span-2">
              <label className="block text-sm text-dark-300 mb-2">Descrição *</label>
              <input
                type="text"
                value={formReceber.descricao}
                onChange={(e) => setFormReceber({ ...formReceber, descricao: e.target.value })}
                className="input w-full"
                required
              />
            </div>
            
            <div>
              <label className="block text-sm text-dark-300 mb-2">Cliente</label>
              <select
                value={formReceber.cliente_id || ''}
                onChange={(e) => setFormReceber({ ...formReceber, cliente_id: e.target.value ? Number(e.target.value) : null })}
                className="input w-full"
              >
                <option value="">Selecione...</option>
                {clientes.map(c => (
                  <option key={c.id} value={c.id}>{c.nome || c.razao_social}</option>
                ))}
              </select>
            </div>
            
            <div>
              <label className="block text-sm text-dark-300 mb-2">Categoria</label>
              <select
                value={formReceber.categoria_id || ''}
                onChange={(e) => setFormReceber({ ...formReceber, categoria_id: e.target.value ? Number(e.target.value) : null })}
                className="input w-full"
              >
                <option value="">Selecione...</option>
                {categorias.filter(c => c.tipo === 'receita').map(c => (
                  <option key={c.id} value={c.id}>{c.nome}</option>
                ))}
              </select>
            </div>
            
            <div>
              <label className="block text-sm text-dark-300 mb-2">Valor *</label>
              <input
                type="number"
                step="0.01"
                value={formReceber.valor}
                onChange={(e) => setFormReceber({ ...formReceber, valor: Number(e.target.value) })}
                className="input w-full"
                required
              />
            </div>
            
            <div>
              <label className="block text-sm text-dark-300 mb-2">Vencimento *</label>
              <input
                type="date"
                value={formReceber.data_vencimento}
                onChange={(e) => setFormReceber({ ...formReceber, data_vencimento: e.target.value })}
                className="input w-full"
                required
              />
            </div>
            
            <div>
              <label className="block text-sm text-dark-300 mb-2">Conta Bancária</label>
              <select
                value={formReceber.conta_bancaria_id || ''}
                onChange={(e) => setFormReceber({ ...formReceber, conta_bancaria_id: e.target.value ? Number(e.target.value) : null })}
                className="input w-full"
              >
                <option value="">Selecione...</option>
                {contasBancarias.map(c => (
                  <option key={c.id} value={c.id}>{c.nome}</option>
                ))}
              </select>
            </div>
            
            <div>
              <label className="block text-sm text-dark-300 mb-2">Forma de Recebimento</label>
              <select
                value={formReceber.forma_pagamento}
                onChange={(e) => setFormReceber({ ...formReceber, forma_pagamento: e.target.value })}
                className="input w-full"
              >
                <option value="pix">PIX</option>
                <option value="boleto">Boleto</option>
                <option value="ted">TED</option>
                <option value="credito">Cartão Crédito</option>
                <option value="debito">Cartão Débito</option>
                <option value="dinheiro">Dinheiro</option>
              </select>
            </div>
          </div>
          
          <div className="flex justify-end gap-3 pt-4 border-t border-dark-700">
            <Button type="button" variant="secondary" onClick={() => setIsReceberModalOpen(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={saving}>
              {saving ? 'Salvando...' : 'Salvar'}
            </Button>
          </div>
        </form>
      </Modal>

      {/* Modal Conta Bancária */}
      <Modal
        isOpen={isContaBancariaModalOpen}
        onClose={() => setIsContaBancariaModalOpen(false)}
        title="Nova Conta Bancária"
      >
        <form onSubmit={handleSaveContaBancaria} className="space-y-4">
          <div>
            <label className="block text-sm text-dark-300 mb-2">Nome da Conta *</label>
            <input
              type="text"
              value={formContaBancaria.nome}
              onChange={(e) => setFormContaBancaria({ ...formContaBancaria, nome: e.target.value })}
              className="input w-full"
              placeholder="Ex: Conta Principal"
              required
            />
          </div>
          
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm text-dark-300 mb-2">Banco</label>
              <input
                type="text"
                value={formContaBancaria.banco}
                onChange={(e) => setFormContaBancaria({ ...formContaBancaria, banco: e.target.value })}
                className="input w-full"
                placeholder="Ex: Banco do Brasil"
              />
            </div>
            <div>
              <label className="block text-sm text-dark-300 mb-2">Tipo</label>
              <select
                value={formContaBancaria.tipo}
                onChange={(e) => setFormContaBancaria({ ...formContaBancaria, tipo: e.target.value })}
                className="input w-full"
              >
                <option value="corrente">Conta Corrente</option>
                <option value="poupanca">Poupança</option>
                <option value="caixa">Caixa</option>
              </select>
            </div>
          </div>
          
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm text-dark-300 mb-2">Agência</label>
              <input
                type="text"
                value={formContaBancaria.agencia}
                onChange={(e) => setFormContaBancaria({ ...formContaBancaria, agencia: e.target.value })}
                className="input w-full"
              />
            </div>
            <div>
              <label className="block text-sm text-dark-300 mb-2">Conta</label>
              <input
                type="text"
                value={formContaBancaria.conta}
                onChange={(e) => setFormContaBancaria({ ...formContaBancaria, conta: e.target.value })}
                className="input w-full"
              />
            </div>
          </div>
          
          <div>
            <label className="block text-sm text-dark-300 mb-2">Saldo Inicial</label>
            <input
              type="number"
              step="0.01"
              value={formContaBancaria.saldo_inicial}
              onChange={(e) => setFormContaBancaria({ ...formContaBancaria, saldo_inicial: Number(e.target.value) })}
              className="input w-full"
            />
          </div>
          
          <div className="flex justify-end gap-3 pt-4 border-t border-dark-700">
            <Button type="button" variant="secondary" onClick={() => setIsContaBancariaModalOpen(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={saving}>
              {saving ? 'Salvando...' : 'Salvar'}
            </Button>
          </div>
        </form>
      </Modal>

      {/* Modal Categoria */}
      <Modal
        isOpen={isCategoriaModalOpen}
        onClose={() => setIsCategoriaModalOpen(false)}
        title="Nova Categoria Financeira"
      >
        <form onSubmit={handleSaveCategoria} className="space-y-4">
          <div>
            <label className="block text-sm text-dark-300 mb-2">Nome *</label>
            <input
              type="text"
              value={formCategoria.nome}
              onChange={(e) => setFormCategoria({ ...formCategoria, nome: e.target.value })}
              className="input w-full"
              required
            />
          </div>
          
          <div>
            <label className="block text-sm text-dark-300 mb-2">Tipo *</label>
            <select
              value={formCategoria.tipo}
              onChange={(e) => setFormCategoria({ ...formCategoria, tipo: e.target.value as any })}
              className="input w-full"
            >
              <option value="despesa">Despesa</option>
              <option value="receita">Receita</option>
            </select>
          </div>
          
          <div>
            <label className="block text-sm text-dark-300 mb-2">Cor</label>
            <input
              type="color"
              value={formCategoria.cor}
              onChange={(e) => setFormCategoria({ ...formCategoria, cor: e.target.value })}
              className="w-full h-10 rounded-lg cursor-pointer"
            />
          </div>
          
          <div className="flex justify-end gap-3 pt-4 border-t border-dark-700">
            <Button type="button" variant="secondary" onClick={() => setIsCategoriaModalOpen(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={saving}>
              {saving ? 'Salvando...' : 'Salvar'}
            </Button>
          </div>
        </form>
      </Modal>

      {/* Modal Importação OFX */}
      <Modal
        isOpen={isOFXModalOpen}
        onClose={() => { setIsOFXModalOpen(false); setOfxData([]) }}
        title="Importar Extrato OFX"
        size="xl"
      >
        <div className="space-y-4">
          <div>
            <label className="block text-sm text-dark-300 mb-2">Conta Bancária *</label>
            <select
              value={filterContaBancaria || ''}
              onChange={(e) => setFilterContaBancaria(Number(e.target.value))}
              className="input w-full"
            >
              <option value="">Selecione a conta...</option>
              {contasBancarias.map(c => (
                <option key={c.id} value={c.id}>{c.nome}</option>
              ))}
            </select>
          </div>
          
          <div className="max-h-96 overflow-y-auto">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Data</th>
                  <th>Descrição</th>
                  <th>Tipo</th>
                  <th className="text-right">Valor</th>
                  <th>Categoria</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {ofxData.map((trn) => (
                  <tr key={trn.id} className={trn.duplicado ? 'opacity-50' : ''}>
                    <td className="text-dark-300">{formatDate(trn.data)}</td>
                    <td className="text-white">{trn.descricao}</td>
                    <td>
                      <Badge variant={trn.tipo === 'entrada' ? 'success' : 'danger'}>
                        {trn.tipo === 'entrada' ? 'Entrada' : 'Saída'}
                      </Badge>
                    </td>
                    <td className={`text-right font-medium ${trn.tipo === 'entrada' ? 'text-green-400' : 'text-red-400'}`}>
                      {formatCurrency(trn.valor)}
                    </td>
                    <td>
                      <select
                        value={ofxCategorizacao[trn.id] || ''}
                        onChange={(e) => setOfxCategorizacao({
                          ...ofxCategorizacao,
                          [trn.id]: Number(e.target.value)
                        })}
                        className="input text-sm"
                        disabled={trn.duplicado}
                      >
                        <option value="">Selecione...</option>
                        {categorias
                          .filter(c => c.tipo === (trn.tipo === 'entrada' ? 'receita' : 'despesa'))
                          .map(c => (
                            <option key={c.id} value={c.id}>{c.nome}</option>
                          ))}
                      </select>
                    </td>
                    <td>
                      {trn.duplicado ? (
                        <Badge variant="warning">Duplicado</Badge>
                      ) : (
                        <Badge variant="success">Novo</Badge>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          
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
              <Button variant="secondary" onClick={() => { setIsOFXModalOpen(false); setOfxData([]) }}>
                Cancelar
              </Button>
              <Button 
                onClick={handleImportOFX} 
                disabled={saving || !filterContaBancaria}
              >
                {saving ? 'Importando...' : 'Importar'}
              </Button>
            </div>
          </div>
        </div>
      </Modal>
    </div>
  )
}
