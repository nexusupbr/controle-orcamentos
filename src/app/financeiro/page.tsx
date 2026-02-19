'use client'

import { useEffect, useState, useRef } from 'react'
import { 
  Plus, Edit2, Trash2, Search, DollarSign, TrendingUp, TrendingDown,
  Calendar, FileText, Upload, Download, CheckCircle, Clock, AlertTriangle,
  CreditCard, Wallet, Building2, RefreshCw, Filter, AlertCircle, Repeat
} from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Modal } from '@/components/ui/Modal'
import { LoadingSpinner, EmptyState, Badge } from '@/components/ui/Common'
import { 
  ClienteDetailModal, FornecedorDetailModal, VendaDetailModal 
} from '@/components/ui/DetailModals'
import { 
  ContaPagar, ContaReceber, ContaBancaria, CategoriaFinanceira, LancamentoFinanceiro,
  fetchContasPagar, createContaPagar, updateContaPagar, deleteContaPagar,
  fetchContasReceber, createContaReceber, updateContaReceber, deleteContaReceber,
  fetchContasBancarias, createContaBancaria, updateContaBancaria, fetchCategoriasFinanceiras, createCategoriaFinanceira,
  fetchLancamentosFinanceiros, createLancamentoFinanceiro,
  fetchFornecedores, fetchClientes, checkOFXDuplicado,
  checkOFXDuplicadoAvancado, ResultadoImportacaoOFX,
  createFornecedor, fetchFornecedorByCnpj, fetchFornecedorByCpf
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
  
  // Modais de Detalhes
  const [clienteModalOpen, setClienteModalOpen] = useState(false)
  const [fornecedorModalOpen, setFornecedorModalOpen] = useState(false)
  const [vendaModalOpen, setVendaModalOpen] = useState(false)
  const [selectedClienteId, setSelectedClienteId] = useState<number | null>(null)
  const [selectedFornecedorId, setSelectedFornecedorId] = useState<number | null>(null)
  const [selectedVendaId, setSelectedVendaId] = useState<number | null>(null)
  
  // Edição
  const [editingPagar, setEditingPagar] = useState<ContaPagar | null>(null)
  const [editingReceber, setEditingReceber] = useState<ContaReceber | null>(null)
  
  // Forms
  const [formPagar, setFormPagar] = useState({
    // Usa uma chave com origem para evitar colisão de IDs entre tabelas (clientes x fornecedores)
    // Formato: "fornecedores:123" | "clientes:456" | ""
    fornecedor_key: '' as string,
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
    observacoes: '',
    // Campos de recorrência
    recorrente: false,
    meses_recorrentes: 1,
    dia_vencimento: 1
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
    observacoes: '',
    // Campos de recorrência
    recorrente: false,
    meses_recorrentes: 1,
    dia_vencimento: 1
  })
  
  // Estado para edição de conta bancária
  const [editingContaBancaria, setEditingContaBancaria] = useState<ContaBancaria | null>(null)
  
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
  const [importResult, setImportResult] = useState<ResultadoImportacaoOFX | null>(null)
  
  // Validação de categorias OFX
  const [attemptedImport, setAttemptedImport] = useState(false)
  const [missingCategoryIds, setMissingCategoryIds] = useState<string[]>([])
  const [missingContaBancaria, setMissingContaBancaria] = useState(false)
  const ofxRowRefs = useRef<{[key: string]: HTMLTableRowElement | null}>({})
  const ofxSelectRefs = useRef<{[key: string]: HTMLSelectElement | null}>({})
  const contaBancariaSelectRef = useRef<HTMLSelectElement | null>(null)

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
      setClientes(clis)
      
      // Mescla fornecedores da tabela antiga + clientes cadastrados como fornecedor/ambos
      const clientesFornecedores = clis
        .filter((c: any) => c.tipo_cadastro === 'fornecedor' || c.tipo_cadastro === 'ambos')
        .map((c: any) => ({
          id: c.id,
          razao_social: c.razao_social || c.nome_fantasia || c.nome || 'Sem nome',
          cnpj: c.cnpj,
          _origem: 'clientes' as const
        }))
      
      // IDs dos fornecedores da tabela antiga
      const fornsComOrigem = forns.map((f: any) => ({ ...f, _origem: 'fornecedores' as const }))

      // Mantém disponíveis no select os fornecedores já vinculados em contas a pagar
      // (mesmo se houver duplicata por CNPJ na tabela clientes).
      const fornecedorIdsEmUso = new Set(
        (pagar || [])
          .map((c: any) => c?.fornecedor_id)
          .filter((id: any) => typeof id === 'number')
      )
      
      // Evita duplicatas por CNPJ (prioriza tabela clientes se existir nas duas)
      const cnpjsClientes = new Set(clientesFornecedores.map((c: any) => c.cnpj).filter(Boolean))
      const fornsFiltrados = fornsComOrigem.filter((f: any) => {
        if (fornecedorIdsEmUso.has(f.id)) return true
        return !f.cnpj || !cnpjsClientes.has(f.cnpj)
      })
      
      const todosFornecedores = [...clientesFornecedores, ...fornsFiltrados]
        .sort((a, b) => (a.razao_social || '').localeCompare(b.razao_social || ''))
      
      setFornecedores(todosFornecedores)
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
    const matchConta = !filterContaBancaria || c.conta_bancaria_id === filterContaBancaria
    return matchSearch && matchStatus && matchConta
  })

  // Filtrar contas a receber
  const filteredReceber = contasReceber.filter(c => {
    const matchSearch = c.descricao?.toLowerCase().includes(searchTerm.toLowerCase())
    const matchStatus = filterStatus === 'todos' || c.status === filterStatus
    const matchConta = !filterContaBancaria || c.conta_bancaria_id === filterContaBancaria
    return matchSearch && matchStatus && matchConta
  })

  // Filtrar lançamentos
  const filteredLancamentos = lancamentos.filter(l => {
    const matchSearch = l.descricao?.toLowerCase().includes(searchTerm.toLowerCase())
    const matchConta = !filterContaBancaria || l.conta_id === filterContaBancaria
    return matchSearch && matchConta
  })

  // Handlers Contas a Pagar
  const openPagarModal = (conta?: ContaPagar) => {
    if (conta) {
      setEditingPagar(conta)
      setFormPagar({
        fornecedor_key: conta.fornecedor_id ? `fornecedores:${conta.fornecedor_id}` : '',
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
        observacoes: conta.observacoes || '',
        recorrente: false,
        meses_recorrentes: 1,
        dia_vencimento: new Date(conta.data_vencimento).getDate() || 1
      })
    } else {
      setEditingPagar(null)
      setFormPagar({
        fornecedor_key: '',
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
        observacoes: '',
        recorrente: false,
        meses_recorrentes: 1,
        dia_vencimento: 1
      })
    }
    setIsPagarModalOpen(true)
  }

  const resolverFornecedorId = async (fornecedorKey: string): Promise<number | null> => {
    if (!fornecedorKey) return null

    const [origem, idStr] = fornecedorKey.split(':')
    const id = Number(idStr)
    if (!origem || !idStr || Number.isNaN(id)) return null

    if (origem === 'fornecedores') return id

    if (origem === 'clientes') {
      const cliente = clientes.find((c: any) => c.id === id)
      if (!cliente) throw new Error('Cliente/fornecedor selecionado não encontrado')

      const razaoSocial = cliente.razao_social || cliente.nome_fantasia || cliente.nome || 'Sem nome'

      // 1) Tenta vincular por CNPJ/CPF (se existir)
      if (cliente.cnpj) {
        const existente = await fetchFornecedorByCnpj(cliente.cnpj)
        if (existente?.id) return existente.id
      }
      if (cliente.cpf) {
        const existente = await fetchFornecedorByCpf(cliente.cpf)
        if (existente?.id) return existente.id
      }

      // 2) Se não existir, cria um registro em fornecedores para manter FK de contas_pagar
      const novo = await createFornecedor({
        razao_social: razaoSocial,
        nome_fantasia: cliente.nome_fantasia,
        cnpj: cliente.cnpj,
        cpf: cliente.cpf,
        inscricao_estadual: cliente.inscricao_estadual,
        endereco: cliente.endereco,
        numero: cliente.numero,
        complemento: cliente.complemento,
        bairro: cliente.bairro,
        cidade: cliente.cidade,
        estado: cliente.estado,
        cep: cliente.cep,
        telefone: cliente.telefone || cliente.celular,
        email: cliente.email,
        observacoes: cliente.observacoes,
        ativo: true
      })

      return novo.id
    }

    return null
  }

  const handleSavePagar = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    try {
      const fornecedorId = await resolverFornecedorId(formPagar.fornecedor_key)

      // Se for recorrente, criar múltiplas contas
      if (!editingPagar && formPagar.recorrente && formPagar.meses_recorrentes > 1) {
        const dataBase = new Date(formPagar.data_vencimento)
        
        for (let i = 0; i < formPagar.meses_recorrentes; i++) {
          const novaData = new Date(dataBase)
          novaData.setMonth(novaData.getMonth() + i)
          // Ajustar dia do vencimento
          novaData.setDate(Math.min(formPagar.dia_vencimento, new Date(novaData.getFullYear(), novaData.getMonth() + 1, 0).getDate()))
          
          const dataVencimentoStr = novaData.toISOString().split('T')[0]
          const statusValue: 'pendente' | 'pago' | 'vencido' = novaData < new Date() ? 'vencido' : 'pendente'
          
          const data = {
            fornecedor_id: fornecedorId,
            descricao: formPagar.descricao,
            valor: formPagar.valor,
            data_vencimento: dataVencimentoStr,
            data_pagamento: null,
            categoria_id: formPagar.categoria_id,
            conta_bancaria_id: formPagar.conta_bancaria_id,
            forma_pagamento: formPagar.forma_pagamento,
            numero_documento: formPagar.numero_documento,
            parcela_atual: i + 1,
            total_parcelas: formPagar.meses_recorrentes,
            observacoes: formPagar.observacoes ? `${formPagar.observacoes} (Recorrente ${i + 1}/${formPagar.meses_recorrentes})` : `Recorrente ${i + 1}/${formPagar.meses_recorrentes}`,
            status: statusValue
          }
          
          await createContaPagar(data)
        }
      } else {
        // Conta única (ou edição)
        const statusValue: 'pendente' | 'pago' | 'vencido' = formPagar.data_pagamento ? 'pago' : 
                  new Date(formPagar.data_vencimento) < new Date() ? 'vencido' : 'pendente'
        
        const data = {
          fornecedor_id: fornecedorId,
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
      }
      
      await loadData()
      setIsPagarModalOpen(false)
    } catch (err) {
      console.error('Erro ao salvar:', err)
      const msg = err instanceof Error ? err.message : 'Erro desconhecido'
      alert(`Erro ao salvar conta: ${msg}`)
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
          conta_id: conta.conta_bancaria_id,
          tipo: 'despesa',
          valor: conta.valor,
          data_lancamento: new Date().toISOString().split('T')[0],
          descricao: conta.descricao,
          categoria_id: conta.categoria_id,
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
        observacoes: conta.observacoes || '',
        recorrente: false,
        meses_recorrentes: 1,
        dia_vencimento: new Date(conta.data_vencimento).getDate() || 1
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
        observacoes: '',
        recorrente: false,
        meses_recorrentes: 1,
        dia_vencimento: 1
      })
    }
    setIsReceberModalOpen(true)
  }

  const handleSaveReceber = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    try {
      // Se for recorrente, criar múltiplas contas
      if (!editingReceber && formReceber.recorrente && formReceber.meses_recorrentes > 1) {
        const dataBase = new Date(formReceber.data_vencimento)
        
        for (let i = 0; i < formReceber.meses_recorrentes; i++) {
          const novaData = new Date(dataBase)
          novaData.setMonth(novaData.getMonth() + i)
          // Ajustar dia do vencimento
          novaData.setDate(Math.min(formReceber.dia_vencimento, new Date(novaData.getFullYear(), novaData.getMonth() + 1, 0).getDate()))
          
          const dataVencimentoStr = novaData.toISOString().split('T')[0]
          const statusValue: 'pendente' | 'recebido' | 'vencido' = novaData < new Date() ? 'vencido' : 'pendente'
          
          const data = {
            cliente_id: formReceber.cliente_id,
            descricao: formReceber.descricao,
            valor: formReceber.valor,
            data_vencimento: dataVencimentoStr,
            data_recebimento: null,
            categoria_id: formReceber.categoria_id,
            conta_bancaria_id: formReceber.conta_bancaria_id,
            forma_pagamento: formReceber.forma_pagamento,
            numero_documento: formReceber.numero_documento,
            parcela_atual: i + 1,
            total_parcelas: formReceber.meses_recorrentes,
            observacoes: formReceber.observacoes ? `${formReceber.observacoes} (Recorrente ${i + 1}/${formReceber.meses_recorrentes})` : `Recorrente ${i + 1}/${formReceber.meses_recorrentes}`,
            status: statusValue
          }
          
          await createContaReceber(data)
        }
      } else {
        // Conta única (ou edição)
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
          conta_id: conta.conta_bancaria_id,
          tipo: 'receita',
          valor: conta.valor,
          data_lancamento: new Date().toISOString().split('T')[0],
          descricao: conta.descricao,
          categoria_id: conta.categoria_id,
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
  const openContaBancariaModal = (conta?: ContaBancaria) => {
    if (conta) {
      setEditingContaBancaria(conta)
      setFormContaBancaria({
        nome: conta.nome,
        banco: conta.banco || '',
        agencia: conta.agencia || '',
        conta: conta.conta || '',
        tipo: conta.tipo,
        saldo_inicial: conta.saldo_inicial
      })
    } else {
      setEditingContaBancaria(null)
      setFormContaBancaria({ nome: '', banco: '', agencia: '', conta: '', tipo: 'corrente', saldo_inicial: 0 })
    }
    setIsContaBancariaModalOpen(true)
  }
  
  const handleSaveContaBancaria = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    try {
      const tipoValue: 'corrente' | 'poupanca' | 'caixa' = formContaBancaria.tipo as 'corrente' | 'poupanca' | 'caixa'
      
      if (editingContaBancaria) {
        await updateContaBancaria(editingContaBancaria.id, {
          nome: formContaBancaria.nome,
          banco: formContaBancaria.banco,
          agencia: formContaBancaria.agencia,
          conta: formContaBancaria.conta,
          tipo: tipoValue
        })
      } else {
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
      }
      await loadData()
      setIsContaBancariaModalOpen(false)
      setEditingContaBancaria(null)
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
    
    // Reset estados anteriores
    setImportResult(null)
    
    try {
      const text = await file.text()
      // Parse OFX simplificado
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
            onClick={() => openContaBancariaModal()}
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
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
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
            
            {/* Filtro de Conta Bancária - aparece em todas as abas */}
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
            
            {(activeTab === 'pagar' || activeTab === 'receber') && (
              <>
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
                
                <Button 
                  onClick={() => activeTab === 'pagar' ? openPagarModal() : openReceberModal()}
                  leftIcon={<Plus className="w-4 h-4" />}
                >
                  {activeTab === 'pagar' ? 'Nova Conta a Pagar' : 'Nova Conta a Receber'}
                </Button>
              </>
            )}
            
            {activeTab === 'extrato' && (
              <div className="relative md:col-span-2">
                <input
                  type="file"
                  accept=".ofx"
                  onChange={handleOFXUpload}
                  className="hidden"
                  id="ofx-upload"
                />
                <label htmlFor="ofx-upload" className="cursor-pointer">
                  <span className="btn btn-secondary flex items-center gap-2 w-full justify-center">
                    <Upload className="w-4 h-4" />
                    Importar OFX
                  </span>
                </label>
              </div>
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
                        {conta.fornecedor_id ? (
                          <button 
                            onClick={() => {
                              setSelectedFornecedorId(conta.fornecedor_id)
                              setFornecedorModalOpen(true)
                            }}
                            className="text-primary-400 hover:text-primary-300 transition-colors"
                          >
                            {fornecedores.find(f => f.id === conta.fornecedor_id)?.razao_social || 'Ver Fornecedor'}
                          </button>
                        ) : '-'}
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
                        {conta.cliente_id ? (
                          <button 
                            onClick={() => {
                              setSelectedClienteId(conta.cliente_id)
                              setClienteModalOpen(true)
                            }}
                            className="text-primary-400 hover:text-primary-300 transition-colors"
                          >
                            {clientes.find(c => c.id === conta.cliente_id)?.nome || 
                             clientes.find(c => c.id === conta.cliente_id)?.razao_social || 'Ver Cliente'}
                          </button>
                        ) : '-'}
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
            <div key={conta.id} className="glass-card p-6 relative group">
              {/* Botão de edição */}
              <button
                onClick={() => openContaBancariaModal(conta)}
                className="absolute top-4 right-4 p-2 rounded-lg text-dark-400 hover:text-primary-400 hover:bg-primary-500/10 transition-colors opacity-0 group-hover:opacity-100"
                title="Editar conta"
              >
                <Edit2 className="w-4 h-4" />
              </button>
              
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
                  <Button onClick={() => openContaBancariaModal()} leftIcon={<Plus className="w-4 h-4" />}>
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
                value={formPagar.fornecedor_key}
                onChange={(e) => setFormPagar({ ...formPagar, fornecedor_key: e.target.value })}
                className="input w-full"
              >
                <option value="">Selecione...</option>
                {fornecedores.map(f => (
                  <option key={`${f._origem}:${f.id}`} value={`${f._origem}:${f.id}`}>
                    {f.razao_social}{f._origem === 'clientes' ? ' (Clientes)' : ''}
                  </option>
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
            
            {/* Seção de Recorrência */}
            {!editingPagar && (
              <div className="md:col-span-2 p-4 rounded-lg bg-dark-800/50 border border-dark-700">
                <div className="flex items-center gap-3 mb-4">
                  <input
                    type="checkbox"
                    id="recorrente-pagar"
                    checked={formPagar.recorrente}
                    onChange={(e) => setFormPagar({ ...formPagar, recorrente: e.target.checked })}
                    className="w-4 h-4 rounded border-dark-600 bg-dark-800 text-primary-500 focus:ring-primary-500"
                  />
                  <label htmlFor="recorrente-pagar" className="flex items-center gap-2 text-sm text-white cursor-pointer">
                    <Repeat className="w-4 h-4 text-primary-400" />
                    Conta Recorrente (gerar múltiplos meses)
                  </label>
                </div>
                
                {formPagar.recorrente && (
                  <div className="grid grid-cols-2 gap-4 mt-4">
                    <div>
                      <label className="block text-sm text-dark-300 mb-2">Quantidade de Meses</label>
                      <input
                        type="number"
                        min="2"
                        max="24"
                        value={formPagar.meses_recorrentes}
                        onChange={(e) => setFormPagar({ ...formPagar, meses_recorrentes: Number(e.target.value) })}
                        className="input w-full"
                      />
                      <p className="text-xs text-dark-400 mt-1">Ex: 4 para gerar 4 contas mensais</p>
                    </div>
                    <div>
                      <label className="block text-sm text-dark-300 mb-2">Dia do Vencimento</label>
                      <input
                        type="number"
                        min="1"
                        max="31"
                        value={formPagar.dia_vencimento}
                        onChange={(e) => setFormPagar({ ...formPagar, dia_vencimento: Number(e.target.value) })}
                        className="input w-full"
                      />
                      <p className="text-xs text-dark-400 mt-1">Dia fixo de vencimento em cada mês</p>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
          
          <div className="flex justify-end gap-3 pt-4 border-t border-dark-700">
            <Button type="button" variant="secondary" onClick={() => setIsPagarModalOpen(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={saving}>
              {saving ? 'Salvando...' : (formPagar.recorrente && formPagar.meses_recorrentes > 1 ? `Criar ${formPagar.meses_recorrentes} Contas` : 'Salvar')}
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
            
            {/* Seção de Recorrência */}
            {!editingReceber && (
              <div className="md:col-span-2 p-4 rounded-lg bg-dark-800/50 border border-dark-700">
                <div className="flex items-center gap-3 mb-4">
                  <input
                    type="checkbox"
                    id="recorrente-receber"
                    checked={formReceber.recorrente}
                    onChange={(e) => setFormReceber({ ...formReceber, recorrente: e.target.checked })}
                    className="w-4 h-4 rounded border-dark-600 bg-dark-800 text-primary-500 focus:ring-primary-500"
                  />
                  <label htmlFor="recorrente-receber" className="flex items-center gap-2 text-sm text-white cursor-pointer">
                    <Repeat className="w-4 h-4 text-green-400" />
                    Recebimento Recorrente (gerar múltiplos meses)
                  </label>
                </div>
                
                {formReceber.recorrente && (
                  <div className="grid grid-cols-2 gap-4 mt-4">
                    <div>
                      <label className="block text-sm text-dark-300 mb-2">Quantidade de Meses</label>
                      <input
                        type="number"
                        min="2"
                        max="24"
                        value={formReceber.meses_recorrentes}
                        onChange={(e) => setFormReceber({ ...formReceber, meses_recorrentes: Number(e.target.value) })}
                        className="input w-full"
                      />
                      <p className="text-xs text-dark-400 mt-1">Ex: 3 para gerar 3 recebimentos mensais</p>
                    </div>
                    <div>
                      <label className="block text-sm text-dark-300 mb-2">Dia do Vencimento</label>
                      <input
                        type="number"
                        min="1"
                        max="31"
                        value={formReceber.dia_vencimento}
                        onChange={(e) => setFormReceber({ ...formReceber, dia_vencimento: Number(e.target.value) })}
                        className="input w-full"
                      />
                      <p className="text-xs text-dark-400 mt-1">Dia fixo de vencimento em cada mês</p>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
          
          <div className="flex justify-end gap-3 pt-4 border-t border-dark-700">
            <Button type="button" variant="secondary" onClick={() => setIsReceberModalOpen(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={saving}>
              {saving ? 'Salvando...' : (formReceber.recorrente && formReceber.meses_recorrentes > 1 ? `Criar ${formReceber.meses_recorrentes} Recebimentos` : 'Salvar')}
            </Button>
          </div>
        </form>
      </Modal>

      {/* Modal Conta Bancária */}
      <Modal
        isOpen={isContaBancariaModalOpen}
        onClose={() => {
          setIsContaBancariaModalOpen(false)
          setEditingContaBancaria(null)
          setFormContaBancaria({ nome: '', banco: '', agencia: '', conta: '', tipo: 'corrente', saldo_inicial: 0 })
        }}
        title={editingContaBancaria ? 'Editar Conta Bancária' : 'Nova Conta Bancária'}
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
          
          {!editingContaBancaria && (
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
          )}
          
          <div className="flex justify-end gap-3 pt-4 border-t border-dark-700">
            <Button type="button" variant="secondary" onClick={() => {
              setIsContaBancariaModalOpen(false)
              setEditingContaBancaria(null)
              setFormContaBancaria({ nome: '', banco: '', agencia: '', conta: '', tipo: 'corrente', saldo_inicial: 0 })
            }}>
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
                        <Badge variant={trn.tipo === 'entrada' ? 'success' : 'danger'}>
                          {trn.tipo === 'entrada' ? 'Entrada' : 'Saída'}
                        </Badge>
                      </td>
                      <td className={`text-right font-medium ${trn.tipo === 'entrada' ? 'text-green-400' : 'text-red-400'}`}>
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
                              .filter(c => c.tipo === (trn.tipo === 'entrada' ? 'receita' : 'despesa'))
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

      {/* Modais de Detalhes */}
      <ClienteDetailModal 
        isOpen={clienteModalOpen} 
        onClose={() => setClienteModalOpen(false)} 
        clienteId={selectedClienteId} 
      />
      <FornecedorDetailModal 
        isOpen={fornecedorModalOpen} 
        onClose={() => setFornecedorModalOpen(false)} 
        fornecedorId={selectedFornecedorId} 
      />
      <VendaDetailModal 
        isOpen={vendaModalOpen} 
        onClose={() => setVendaModalOpen(false)} 
        vendaId={selectedVendaId} 
      />
    </div>
  )
}
