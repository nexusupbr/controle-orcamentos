'use client'

import { useEffect, useState, useRef } from 'react'
import { 
  Plus, Edit2, Trash2, Search, User, Building2, 
  Phone, Mail, MapPin, Upload, FileText,
  RefreshCw, AlertTriangle, Truck, Users, FileUp, CheckCircle, XCircle
} from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Modal } from '@/components/ui/Modal'
import { LoadingSpinner, EmptyState, Badge } from '@/components/ui/Common'
import { 
  Cliente, EnderecoCliente,
  fetchClientes, createCliente, updateCliente, deleteCliente, consultarCNPJ,
  fetchEnderecosCliente, createEnderecoCliente, updateEnderecoCliente, deleteEnderecoCliente
} from '@/lib/database'

// Máscaras
const maskCPF = (value: string) => {
  return value.replace(/\D/g, '').replace(/(\d{3})(\d)/, '$1.$2').replace(/(\d{3})(\d)/, '$1.$2').replace(/(\d{3})(\d{1,2})$/, '$1-$2').slice(0, 14)
}

const maskCNPJ = (value: string) => {
  return value.replace(/\D/g, '').replace(/(\d{2})(\d)/, '$1.$2').replace(/(\d{3})(\d)/, '$1.$2').replace(/(\d{3})(\d)/, '$1/$2').replace(/(\d{4})(\d{1,2})$/, '$1-$2').slice(0, 18)
}

const maskCEP = (value: string) => {
  return value.replace(/\D/g, '').replace(/(\d{5})(\d)/, '$1-$2').slice(0, 9)
}

const maskPhone = (value: string) => {
  return value.replace(/\D/g, '').replace(/(\d{2})(\d)/, '($1) $2').replace(/(\d{4,5})(\d{4})$/, '$1-$2').slice(0, 15)
}

type TipoCadastroFilter = 'todos' | 'cliente' | 'fornecedor'

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
    tipo_pessoa: 'PF' | 'PJ'
    tipo_cadastro: 'cliente' | 'fornecedor' | 'ambos'
    nome: string | null
    cpf: string | null
    rg: string | null
    data_nascimento: string | null
    razao_social: string | null
    nome_fantasia: string | null
    cnpj: string | null
    inscricao_estadual: string | null
    inscricao_municipal: string | null
    cep: string
    endereco: string
    numero: string
    complemento: string
    bairro: string
    cidade: string
    estado: string
    telefone: string
    celular: string
    email: string
    regime_tributario: string
    observacoes: string
    ativo: boolean
  }
}

export default function ClientesPage() {
  const [clientes, setClientes] = useState<Cliente[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')
  const [filterTipo, setFilterTipo] = useState<'todos' | 'PF' | 'PJ'>('todos')
  const [filterCadastro, setFilterCadastro] = useState<TipoCadastroFilter>('todos')
  
  // Estados para seleção em massa
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set())
  const [deleting, setDeleting] = useState(false)
  
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingId, setEditingId] = useState<number | null>(null)
  const [formError, setFormError] = useState<string | null>(null)
  const [consultandoCNPJ, setConsultandoCNPJ] = useState(false)
  
  // Estados para importação CSV
  const [isImportModalOpen, setIsImportModalOpen] = useState(false)
  const [importing, setImporting] = useState(false)
  const [importResult, setImportResult] = useState<ImportResult | null>(null)
  const [importPreview, setImportPreview] = useState<ImportPreviewItem[]>([])
  const [importStep, setImportStep] = useState<'select' | 'preview' | 'result'>('select')
  const csvInputRef = useRef<HTMLInputElement>(null)
  
  const [isEnderecoModalOpen, setIsEnderecoModalOpen] = useState(false)
  const [enderecos, setEnderecos] = useState<EnderecoCliente[]>([])
  const [editingEnderecoId, setEditingEnderecoId] = useState<number | null>(null)
  const [enderecoForm, setEnderecoForm] = useState({
    tipo: 'entrega' as 'padrao' | 'cobranca' | 'entrega' | 'retirada',
    descricao: '', cep: '', endereco: '', numero: '', complemento: '', bairro: '', cidade: '', estado: '', principal: false
  })
  
  const [tipoPessoa, setTipoPessoa] = useState<'PF' | 'PJ'>('PF')
  const [formData, setFormData] = useState({
    tipo_cadastro: 'cliente' as 'cliente' | 'fornecedor' | 'ambos',
    nome: '', cpf: '', rg: '', data_nascimento: '', produtor_rural: false, inscricao_produtor_rural: '',
    razao_social: '', nome_fantasia: '', cnpj: '', inscricao_estadual: '', inscricao_municipal: '',
    cep: '', endereco: '', numero: '', complemento: '', bairro: '', cidade: '', estado: '',
    telefone: '', celular: '', email: '', contribuinte_icms: false, regime_tributario: '',
    observacoes: '', limite_credito: 0,
  })
  
  const [anexos, setAnexos] = useState<any[]>([])
  const fileInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => { loadData() }, [filterCadastro])

  const loadData = async () => {
    try {
      setLoading(true)
      const tipoCadastroParam = filterCadastro === 'todos' ? undefined : filterCadastro
      const data = await fetchClientes(tipoCadastroParam)
      setClientes(data)
    } catch (err) { console.error('Erro ao carregar dados:', err) } 
    finally { setLoading(false) }
  }

  const filteredClientes = clientes.filter(c => {
    // Busca por texto - apenas por nome, razão social ou nome fantasia
    const searchLower = searchTerm.toLowerCase().trim()
    
    const matchSearch = searchTerm.trim() === '' || (
      (c.nome && c.nome.toLowerCase().includes(searchLower)) ||
      (c.razao_social && c.razao_social.toLowerCase().includes(searchLower)) ||
      (c.nome_fantasia && c.nome_fantasia.toLowerCase().includes(searchLower))
    )
    
    // Filtro por tipo pessoa (PF/PJ)
    const matchTipo = filterTipo === 'todos' || c.tipo_pessoa === filterTipo
    
    // Filtro por tipo cadastro (cliente/fornecedor)
    const matchCadastro = filterCadastro === 'todos' || 
      c.tipo_cadastro === filterCadastro || 
      c.tipo_cadastro === 'ambos'
    
    return matchSearch && matchTipo && matchCadastro
  })

  const handleConsultarCNPJ = async () => {
    const cnpj = formData.cnpj.replace(/\D/g, '')
    if (cnpj.length !== 14) { alert('CNPJ inválido'); return }
    setConsultandoCNPJ(true)
    try {
      const dados = await consultarCNPJ(cnpj)
      setFormData({ ...formData, razao_social: dados.razao_social || '', nome_fantasia: dados.nome_fantasia || '',
        cep: dados.cep || '', endereco: dados.logradouro || '', numero: dados.numero || '',
        complemento: dados.complemento || '', bairro: dados.bairro || '', cidade: dados.municipio || '',
        estado: dados.uf || '', telefone: dados.ddd_telefone_1 || '' })
    } catch { alert('Erro ao consultar CNPJ') } 
    finally { setConsultandoCNPJ(false) }
  }

  const handleConsultarCEP = async (cep: string, isEndereco = false) => {
    const cepLimpo = cep.replace(/\D/g, '')
    if (cepLimpo.length !== 8) return
    try {
      const response = await fetch(`https://viacep.com.br/ws/${cepLimpo}/json/`)
      const dados = await response.json()
      if (!dados.erro) {
        if (isEndereco) {
          setEnderecoForm({ ...enderecoForm, endereco: dados.logradouro || '', bairro: dados.bairro || '', cidade: dados.localidade || '', estado: dados.uf || '' })
        } else {
          setFormData({ ...formData, endereco: dados.logradouro || '', bairro: dados.bairro || '', cidade: dados.localidade || '', estado: dados.uf || '' })
        }
      }
    } catch (err) { console.error('Erro ao consultar CEP:', err) }
  }

  const openModal = async (cliente?: Cliente) => {
    setFormError(null)
    if (cliente) {
      setEditingId(cliente.id)
      setTipoPessoa(cliente.tipo_pessoa)
      setFormData({
        tipo_cadastro: cliente.tipo_cadastro || 'cliente', nome: cliente.nome || '', cpf: cliente.cpf || '',
        rg: cliente.rg || '', data_nascimento: cliente.data_nascimento || '', produtor_rural: cliente.produtor_rural || false,
        inscricao_produtor_rural: cliente.inscricao_produtor_rural || '', razao_social: cliente.razao_social || '',
        nome_fantasia: cliente.nome_fantasia || '', cnpj: cliente.cnpj || '', inscricao_estadual: cliente.inscricao_estadual || '',
        inscricao_municipal: cliente.inscricao_municipal || '', cep: cliente.cep || '', endereco: cliente.endereco || '',
        numero: cliente.numero || '', complemento: cliente.complemento || '', bairro: cliente.bairro || '',
        cidade: cliente.cidade || '', estado: cliente.estado || '', telefone: cliente.telefone || '',
        celular: cliente.celular || '', email: cliente.email || '', contribuinte_icms: cliente.contribuinte_icms || false,
        regime_tributario: cliente.regime_tributario || '', observacoes: cliente.observacoes || '', limite_credito: cliente.limite_credito || 0
      })
      setAnexos(cliente.anexos || [])
      try { const enderecosData = await fetchEnderecosCliente(cliente.id); setEnderecos(enderecosData) } catch { setEnderecos([]) }
    } else {
      setEditingId(null); setTipoPessoa('PF')
      setFormData({ tipo_cadastro: 'cliente', nome: '', cpf: '', rg: '', data_nascimento: '', produtor_rural: false,
        inscricao_produtor_rural: '', razao_social: '', nome_fantasia: '', cnpj: '', inscricao_estadual: '',
        inscricao_municipal: '', cep: '', endereco: '', numero: '', complemento: '', bairro: '', cidade: '', estado: '',
        telefone: '', celular: '', email: '', contribuinte_icms: false, regime_tributario: '', observacoes: '', limite_credito: 0 })
      setAnexos([]); setEnderecos([])
    }
    setIsModalOpen(true)
  }

  const closeModal = () => { setIsModalOpen(false); setEditingId(null); setFormError(null) }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault(); setSaving(true); setFormError(null)
    try {
      const clienteData = {
        tipo_pessoa: tipoPessoa, tipo_cadastro: formData.tipo_cadastro,
        nome: tipoPessoa === 'PF' ? formData.nome : null, cpf: tipoPessoa === 'PF' ? formData.cpf.replace(/\D/g, '') : null,
        rg: tipoPessoa === 'PF' ? formData.rg : null, data_nascimento: tipoPessoa === 'PF' && formData.data_nascimento ? formData.data_nascimento : null,
        produtor_rural: tipoPessoa === 'PF' ? formData.produtor_rural : false,
        inscricao_produtor_rural: tipoPessoa === 'PF' && formData.produtor_rural ? formData.inscricao_produtor_rural : null,
        razao_social: tipoPessoa === 'PJ' ? formData.razao_social : null, nome_fantasia: tipoPessoa === 'PJ' ? formData.nome_fantasia : null,
        cnpj: tipoPessoa === 'PJ' ? formData.cnpj.replace(/\D/g, '') : null, inscricao_estadual: tipoPessoa === 'PJ' ? formData.inscricao_estadual : null,
        inscricao_municipal: tipoPessoa === 'PJ' ? formData.inscricao_municipal : null,
        cep: formData.cep.replace(/\D/g, ''), endereco: formData.endereco, numero: formData.numero, complemento: formData.complemento,
        bairro: formData.bairro, cidade: formData.cidade, estado: formData.estado, telefone: formData.telefone, celular: formData.celular,
        email: formData.email, contribuinte_icms: formData.contribuinte_icms, regime_tributario: formData.regime_tributario,
        observacoes: formData.observacoes, limite_credito: formData.limite_credito, anexos: anexos, ativo: true
      }
      if (editingId) { await updateCliente(editingId, clienteData) } else { await createCliente(clienteData) }
      await loadData(); closeModal()
    } catch (err) { 
      let message = err instanceof Error ? err.message : 'Erro ao salvar'
      // Traduzir mensagens de erro do banco de dados
      if (message.includes('clientes_cpf_key')) {
        message = 'CPF já cadastrado no sistema. Se for um produtor rural com inscrição diferente, entre em contato com o suporte.'
      } else if (message.includes('clientes_cnpj_key')) {
        message = 'CNPJ já cadastrado no sistema.'
      } else if (message.includes('clientes_email_key')) {
        message = 'E-mail já cadastrado no sistema.'
      } else if (message.includes('duplicate key')) {
        message = 'Este registro já existe no sistema. Verifique CPF, CNPJ ou E-mail.'
      } else if (message.includes('foreign key')) {
        message = 'Erro de referência: este registro está vinculado a outros dados.'
      } else if (message.includes('violates check')) {
        message = 'Dados inválidos. Verifique os campos preenchidos.'
      }
      setFormError(message)
    }
    finally { setSaving(false) }
  }

  const handleDelete = async (id: number) => {
    if (!confirm('Tem certeza que deseja excluir este registro?')) return
    try { await deleteCliente(id); await loadData() } catch (err) { console.error('Erro ao excluir:', err); alert('Erro ao excluir registro') }
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

  const toggleSelectAllClientes = () => {
    if (selectedIds.size === filteredClientes.length) {
      setSelectedIds(new Set())
    } else {
      setSelectedIds(new Set(filteredClientes.map(c => c.id)))
    }
  }

  const handleDeleteSelected = async () => {
    if (selectedIds.size === 0) return
    
    const count = selectedIds.size
    if (!confirm(`Tem certeza que deseja excluir ${count} registro(s)?\n\nEsta ação não pode ser desfeita.`)) return
    
    setDeleting(true)
    let successCount = 0
    let errorCount = 0
    
    const idsArray = Array.from(selectedIds)
    for (const id of idsArray) {
      try {
        await deleteCliente(id)
        successCount++
      } catch (err) {
        console.error(`Erro ao excluir cliente ${id}:`, err)
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

  const openEnderecoModal = (endereco?: EnderecoCliente) => {
    if (endereco) {
      setEditingEnderecoId(endereco.id)
      setEnderecoForm({ tipo: endereco.tipo, descricao: endereco.descricao || '', cep: endereco.cep || '', endereco: endereco.endereco || '',
        numero: endereco.numero || '', complemento: endereco.complemento || '', bairro: endereco.bairro || '', cidade: endereco.cidade || '',
        estado: endereco.estado || '', principal: endereco.principal })
    } else {
      setEditingEnderecoId(null)
      setEnderecoForm({ tipo: 'entrega', descricao: '', cep: '', endereco: '', numero: '', complemento: '', bairro: '', cidade: '', estado: '', principal: false })
    }
    setIsEnderecoModalOpen(true)
  }

  const handleSaveEndereco = async (e: React.FormEvent) => {
    e.preventDefault(); if (!editingId) return; setSaving(true)
    try {
      if (editingEnderecoId) { await updateEnderecoCliente(editingEnderecoId, enderecoForm) }
      else { await createEnderecoCliente({ ...enderecoForm, cliente_id: editingId }) }
      const enderecosData = await fetchEnderecosCliente(editingId); setEnderecos(enderecosData); setIsEnderecoModalOpen(false)
    } catch (err) { console.error('Erro ao salvar endereço:', err) } finally { setSaving(false) }
  }

  const handleDeleteEndereco = async (id: number) => {
    if (!confirm('Excluir este endereço?')) return
    try { await deleteEnderecoCliente(id); if (editingId) { const enderecosData = await fetchEnderecosCliente(editingId); setEnderecos(enderecosData) } }
    catch (err) { console.error('Erro ao excluir endereço:', err) }
  }

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files; if (!files) return
    Array.from(files).forEach(file => {
      const reader = new FileReader()
      reader.onload = () => { setAnexos(prev => [...prev, { nome: file.name, tipo: file.type, tamanho: file.size, url: reader.result, data: new Date().toISOString() }]) }
      reader.readAsDataURL(file)
    })
    if (fileInputRef.current) { fileInputRef.current.value = '' }
  }

  const removerAnexo = (index: number) => { setAnexos(prev => prev.filter((_, i) => i !== index)) }

  // Função para importar CSV de clientes/fornecedores
  const parseCSVLine = (line: string, delimiter: string = ';'): string[] => {
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
        
        // Recarregar lista de clientes para garantir dados atualizados
        const clientesAtualizados = await fetchClientes()
        setClientes(clientesAtualizados)
        
        const previewItems: ImportPreviewItem[] = []
        const documentosNoCSV = new Map<string, number>() // Para detectar duplicados dentro do CSV

        for (let i = 0; i < dataLines.length; i++) {
          const line = dataLines[i]
          if (!line.trim()) continue
          
          const columns = parseCSVLine(line, delimiter)
          
          const tipoPessoa = columns[1]?.toUpperCase() === 'PJ' ? 'PJ' as const : 'PF' as const
          const tipoCadastro = columns[2]?.toLowerCase().includes('fornecedor') 
            ? 'fornecedor' as const
            : columns[2]?.toLowerCase().includes('ambos') 
              ? 'ambos' as const
              : 'cliente' as const
          const documento = columns[3]?.replace(/\D/g, '') || ''
          const nomeRazao = columns[4] || ''
          const fantasia = columns[5] || ''
          const endereco = columns[6] || ''
          const numero = columns[7] || ''
          const bairro = columns[8] || ''
          const complemento = columns[9] || ''
          const cep = columns[10]?.replace(/\D/g, '') || ''
          const cidade = columns[11] || ''
          const estado = columns[13] || ''
          const telefone = columns[15]?.replace(/\D/g, '') || ''
          const celular = columns[16]?.replace(/\D/g, '') || ''
          const email = columns[18] || ''
          const ieRg = columns[19] || ''
          const im = columns[20] || ''
          const observacoes = columns[22] || ''
          const dataNascimento = columns[23] || ''
          const regimeTributario = columns[26] || ''
          const situacao = columns[27]?.toLowerCase().includes('ativo') !== false

          // Verificar duplicação no banco
          let isDuplicate = false
          let duplicateReason = ''
          
          if (tipoPessoa === 'PJ' && documento) {
            const existente = clientesAtualizados.find(c => c.cnpj?.replace(/\D/g, '') === documento)
            if (existente) {
              isDuplicate = true
              duplicateReason = `CNPJ já cadastrado: ${existente.razao_social || existente.nome}`
            }
          } else if (tipoPessoa === 'PF' && documento) {
            const existente = clientesAtualizados.find(c => c.cpf?.replace(/\D/g, '') === documento)
            if (existente) {
              isDuplicate = true
              duplicateReason = `CPF já cadastrado: ${existente.nome}`
            }
          }
          
          // Verificar duplicação DENTRO do próprio CSV
          if (!isDuplicate && documento) {
            const linhaAnterior = documentosNoCSV.get(documento)
            if (linhaAnterior !== undefined) {
              isDuplicate = true
              duplicateReason = `Documento duplicado no CSV (mesmo que linha ${linhaAnterior})`
            } else {
              documentosNoCSV.set(documento, i + 2)
            }
          }

          previewItems.push({
            linha: i + 2,
            selected: !isDuplicate,
            isDuplicate,
            duplicateReason,
            data: {
              tipo_pessoa: tipoPessoa,
              tipo_cadastro: tipoCadastro,
              nome: tipoPessoa === 'PF' ? nomeRazao : null,
              cpf: tipoPessoa === 'PF' ? documento : null,
              rg: tipoPessoa === 'PF' ? ieRg : null,
              data_nascimento: tipoPessoa === 'PF' && dataNascimento && dataNascimento !== '0000-00-00' ? dataNascimento : null,
              razao_social: tipoPessoa === 'PJ' ? nomeRazao : null,
              nome_fantasia: tipoPessoa === 'PJ' ? fantasia : null,
              cnpj: tipoPessoa === 'PJ' ? documento : null,
              inscricao_estadual: tipoPessoa === 'PJ' ? ieRg : null,
              inscricao_municipal: tipoPessoa === 'PJ' ? im : null,
              cep, endereco, numero, complemento, bairro, cidade, estado,
              telefone, celular, email,
              regime_tributario: regimeTributario,
              observacoes,
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
        await createCliente({
          ...item.data,
          contribuinte_icms: !!item.data.inscricao_estadual,
          limite_credito: 0,
          anexos: []
        } as any)
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

  // Selecionar/desmarcar todos (import preview)
  const toggleSelectAllImport = (selected: boolean) => {
    setImportPreview(prev => prev.map(item => ({ ...item, selected: selected && !item.isDuplicate })))
  }

  // Resetar modal de importação
  const resetImportModal = () => {
    setIsImportModalOpen(false)
    setImportResult(null)
    setImportPreview([])
    setImportStep('select')
  }

  const getTipoEnderecoLabel = (tipo: string) => {
    const labels: Record<string, string> = { padrao: 'Padrão', cobranca: 'Cobrança', entrega: 'Entrega', retirada: 'Retirada' }
    return labels[tipo] || tipo
  }

  if (loading) { return (<div className="flex items-center justify-center h-[60vh]"><LoadingSpinner size="lg" /></div>) }

  return (
    <div className="space-y-6">
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div>
          <h1 className="text-2xl lg:text-3xl font-bold font-heading text-white">Clientes e Fornecedores</h1>
          <p className="text-dark-400 mt-1">Cadastre e gerencie clientes e fornecedores em um só lugar</p>
        </div>
        <div className="flex gap-2">
          <Button variant="secondary" onClick={() => setIsImportModalOpen(true)} leftIcon={<FileUp className="w-5 h-5" />}>
            Importar CSV
          </Button>
          <Button onClick={() => openModal()} leftIcon={<Plus className="w-5 h-5" />}>Novo Cadastro</Button>
        </div>
      </div>

      <div className="flex gap-2">
        {(['todos', 'cliente', 'fornecedor'] as const).map(tipo => (
          <button key={tipo} onClick={() => setFilterCadastro(tipo)}
            className={`px-4 py-2 rounded-lg font-medium transition-colors flex items-center gap-2 ${filterCadastro === tipo ? 'bg-primary-500 text-white' : 'bg-dark-700 text-dark-300 hover:bg-dark-600'}`}>
            {tipo === 'todos' ? <Users className="w-4 h-4" /> : tipo === 'cliente' ? <User className="w-4 h-4" /> : <Truck className="w-4 h-4" />}
            {tipo === 'todos' ? 'Todos' : tipo === 'cliente' ? 'Clientes' : 'Fornecedores'}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="glass-card p-4"><div className="flex items-center gap-3"><div className="w-10 h-10 rounded-lg bg-primary-500/20 flex items-center justify-center"><Users className="w-5 h-5 text-primary-400" /></div><div><p className="text-dark-400 text-sm">Total</p><p className="text-xl font-bold text-white">{clientes.length}</p></div></div></div>
        <div className="glass-card p-4"><div className="flex items-center gap-3"><div className="w-10 h-10 rounded-lg bg-blue-500/20 flex items-center justify-center"><User className="w-5 h-5 text-blue-400" /></div><div><p className="text-dark-400 text-sm">Pessoa Física</p><p className="text-xl font-bold text-white">{clientes.filter(c => c.tipo_pessoa === 'PF').length}</p></div></div></div>
        <div className="glass-card p-4"><div className="flex items-center gap-3"><div className="w-10 h-10 rounded-lg bg-green-500/20 flex items-center justify-center"><Building2 className="w-5 h-5 text-green-400" /></div><div><p className="text-dark-400 text-sm">Pessoa Jurídica</p><p className="text-xl font-bold text-white">{clientes.filter(c => c.tipo_pessoa === 'PJ').length}</p></div></div></div>
        <div className="glass-card p-4"><div className="flex items-center gap-3"><div className="w-10 h-10 rounded-lg bg-yellow-500/20 flex items-center justify-center"><AlertTriangle className="w-5 h-5 text-yellow-400" /></div><div><p className="text-dark-400 text-sm">Com Saldo Devedor</p><p className="text-xl font-bold text-white">{clientes.filter(c => c.saldo_devedor > 0).length}</p></div></div></div>
      </div>

      <div className="glass-card p-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="relative md:col-span-2"><Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-dark-400" /><input type="text" placeholder="Buscar por nome, razão social ou nome fantasia..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="input pl-12 w-full" /></div>
          <select value={filterTipo} onChange={(e) => setFilterTipo(e.target.value as any)} className="input"><option value="todos">Todos os tipos</option><option value="PF">Pessoa Física</option><option value="PJ">Pessoa Jurídica</option></select>
        </div>
        {selectedIds.size > 0 && (
          <div className="mt-4 p-3 bg-red-500/10 border border-red-500/30 rounded-lg flex items-center justify-between">
            <span className="text-red-400 font-medium">{selectedIds.size} item(ns) selecionado(s)</span>
            <div className="flex gap-2">
              <Button variant="secondary" size="sm" onClick={() => setSelectedIds(new Set())}>Limpar Seleção</Button>
              <Button variant="danger" size="sm" onClick={handleDeleteSelected} disabled={deleting} leftIcon={<Trash2 className="w-4 h-4" />}>
                {deleting ? 'Excluindo...' : 'Excluir Selecionados'}
              </Button>
            </div>
          </div>
        )}
      </div>

      <div className="glass-card overflow-hidden">
        {filteredClientes.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="data-table">
              <thead><tr>
                <th className="w-10">
                  <input 
                    type="checkbox" 
                    checked={selectedIds.size === filteredClientes.length && filteredClientes.length > 0}
                    onChange={toggleSelectAllClientes}
                    className="w-4 h-4 rounded text-primary-500"
                  />
                </th>
                <th>Nome</th><th>Tipo</th><th>Cadastro</th><th>Documento</th><th>Contato</th><th>Cidade/UF</th><th className="text-right">Ações</th>
              </tr></thead>
              <tbody>
                {filteredClientes.map((cliente) => (
                  <tr key={cliente.id} className={`group ${selectedIds.has(cliente.id) ? 'bg-primary-500/5' : ''}`}>
                    <td>
                      <input 
                        type="checkbox" 
                        checked={selectedIds.has(cliente.id)}
                        onChange={() => toggleSelectItem(cliente.id)}
                        className="w-4 h-4 rounded text-primary-500"
                      />
                    </td>
                    <td><div className="flex items-center gap-3"><div className={`w-10 h-10 rounded-lg flex items-center justify-center ${cliente.tipo_pessoa === 'PF' ? 'bg-blue-500/10' : 'bg-green-500/10'}`}>{cliente.tipo_pessoa === 'PF' ? <User className="w-5 h-5 text-blue-400" /> : <Building2 className="w-5 h-5 text-green-400" />}</div><div><span className="font-medium text-white">{cliente.tipo_pessoa === 'PF' ? cliente.nome : cliente.razao_social}</span>{cliente.tipo_pessoa === 'PJ' && cliente.nome_fantasia && <p className="text-xs text-dark-400">{cliente.nome_fantasia}</p>}{cliente.produtor_rural && <Badge variant="warning" size="sm" className="mt-1">Produtor Rural</Badge>}</div></div></td>
                    <td><Badge variant={cliente.tipo_pessoa === 'PF' ? 'primary' : 'success'}>{cliente.tipo_pessoa}</Badge></td>
                    <td><Badge variant={cliente.tipo_cadastro === 'cliente' ? 'info' : cliente.tipo_cadastro === 'fornecedor' ? 'warning' : 'secondary'}>{cliente.tipo_cadastro === 'ambos' ? 'Cli/Forn' : cliente.tipo_cadastro === 'cliente' ? 'Cliente' : 'Fornecedor'}</Badge></td>
                    <td className="text-dark-300">{cliente.tipo_pessoa === 'PF' ? maskCPF(cliente.cpf || '') : maskCNPJ(cliente.cnpj || '')}</td>
                    <td><div className="text-sm">{cliente.email && <div className="flex items-center gap-1 text-dark-400"><Mail className="w-3 h-3" /><span>{cliente.email}</span></div>}{(cliente.telefone || cliente.celular) && <div className="flex items-center gap-1 text-dark-400"><Phone className="w-3 h-3" /><span>{cliente.celular || cliente.telefone}</span></div>}</div></td>
                    <td className="text-dark-300">{cliente.cidade && cliente.estado ? `${cliente.cidade}/${cliente.estado}` : '-'}</td>
                    <td><div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity"><button onClick={() => openModal(cliente)} className="p-2 rounded-lg text-dark-400 hover:text-primary-400 hover:bg-primary-500/10" title="Editar"><Edit2 className="w-4 h-4" /></button><button onClick={() => handleDelete(cliente.id)} className="p-2 rounded-lg text-dark-400 hover:text-red-400 hover:bg-red-500/10" title="Excluir"><Trash2 className="w-4 h-4" /></button></div></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <EmptyState icon={<Users className="w-10 h-10 text-dark-500" />} title="Nenhum registro encontrado" description="Cadastre clientes e fornecedores" action={<Button onClick={() => openModal()} leftIcon={<Plus className="w-4 h-4" />}>Novo Cadastro</Button>} />
        )}
      </div>

      <Modal isOpen={isModalOpen} onClose={closeModal} title={editingId ? 'Editar Cadastro' : 'Novo Cadastro'} size="xl">
        <form onSubmit={handleSubmit} className="space-y-6">
          {formError && <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-sm">{formError}</div>}
          
          <div className="space-y-2"><label className="block text-sm text-dark-300">Tipo de Cadastro *</label><div className="flex gap-2">{(['cliente', 'fornecedor', 'ambos'] as const).map(tipo => (<button key={tipo} type="button" onClick={() => setFormData({ ...formData, tipo_cadastro: tipo })} className={`px-4 py-2 rounded-lg font-medium transition-colors ${formData.tipo_cadastro === tipo ? 'bg-primary-500 text-white' : 'bg-dark-700 text-dark-300 hover:bg-dark-600'}`}>{tipo === 'cliente' ? 'Cliente' : tipo === 'fornecedor' ? 'Fornecedor' : 'Ambos'}</button>))}</div></div>

          <div className="flex gap-2 border-b border-dark-700 pb-4">
            <button type="button" onClick={() => setTipoPessoa('PF')} className={`px-4 py-2 rounded-lg font-medium transition-colors ${tipoPessoa === 'PF' ? 'bg-primary-500 text-white' : 'bg-dark-700 text-dark-300 hover:bg-dark-600'}`}><div className="flex items-center gap-2"><User className="w-4 h-4" />Pessoa Física</div></button>
            <button type="button" onClick={() => setTipoPessoa('PJ')} className={`px-4 py-2 rounded-lg font-medium transition-colors ${tipoPessoa === 'PJ' ? 'bg-primary-500 text-white' : 'bg-dark-700 text-dark-300 hover:bg-dark-600'}`}><div className="flex items-center gap-2"><Building2 className="w-4 h-4" />Pessoa Jurídica</div></button>
          </div>

          {tipoPessoa === 'PF' && (
            <div className="space-y-4">
              <h4 className="text-white font-medium">Dados Pessoais</h4>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="md:col-span-2"><label className="block text-sm text-dark-300 mb-2">Nome Completo *</label><input type="text" value={formData.nome} onChange={(e) => setFormData({ ...formData, nome: e.target.value })} className="input w-full" required /></div>
                <div><label className="block text-sm text-dark-300 mb-2">Data de Nascimento</label><input type="date" value={formData.data_nascimento} onChange={(e) => setFormData({ ...formData, data_nascimento: e.target.value })} className="input w-full" /></div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div><label className="block text-sm text-dark-300 mb-2">CPF</label><input type="text" value={maskCPF(formData.cpf)} onChange={(e) => setFormData({ ...formData, cpf: e.target.value })} className="input w-full" placeholder="000.000.000-00" /></div>
                <div><label className="block text-sm text-dark-300 mb-2">RG</label><input type="text" value={formData.rg} onChange={(e) => setFormData({ ...formData, rg: e.target.value })} className="input w-full" /></div>
              </div>
              <div className="border-t border-dark-700 pt-4">
                <label className="flex items-center gap-2 cursor-pointer mb-4"><input type="checkbox" checked={formData.produtor_rural} onChange={(e) => setFormData({ ...formData, produtor_rural: e.target.checked })} className="w-5 h-5 rounded text-primary-500" /><span className="text-white font-medium">Produtor Rural</span></label>
                {formData.produtor_rural && (
                  <div className="space-y-4 pl-7">
                    <div><label className="block text-sm text-dark-300 mb-2">Inscrição de Produtor Rural</label><input type="text" value={formData.inscricao_produtor_rural} onChange={(e) => setFormData({ ...formData, inscricao_produtor_rural: e.target.value })} className="input w-full md:w-1/2" placeholder="Número da inscrição" /></div>
                    <div><label className="flex items-center gap-2 cursor-pointer"><input type="checkbox" checked={formData.contribuinte_icms} onChange={(e) => setFormData({ ...formData, contribuinte_icms: e.target.checked })} className="w-5 h-5 rounded text-primary-500" /><span className="text-white">Contribuinte do ICMS</span></label><p className="text-xs text-dark-400 mt-1 ml-7">Marque se o produtor rural for contribuinte do ICMS (afeta emissão de NF-e)</p></div>
                  </div>
                )}
              </div>
            </div>
          )}

          {tipoPessoa === 'PJ' && (
            <div className="space-y-4">
              <h4 className="text-white font-medium">Dados da Empresa</h4>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div><label className="block text-sm text-dark-300 mb-2">CNPJ *</label><div className="flex gap-2"><input type="text" value={maskCNPJ(formData.cnpj)} onChange={(e) => setFormData({ ...formData, cnpj: e.target.value })} className="input flex-1" placeholder="00.000.000/0000-00" required /><Button type="button" variant="secondary" onClick={handleConsultarCNPJ} disabled={consultandoCNPJ}>{consultandoCNPJ ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}</Button></div></div>
                <div><label className="block text-sm text-dark-300 mb-2">Inscrição Estadual</label><input type="text" value={formData.inscricao_estadual} onChange={(e) => setFormData({ ...formData, inscricao_estadual: e.target.value })} className="input w-full" /></div>
                <div><label className="block text-sm text-dark-300 mb-2">Inscrição Municipal</label><input type="text" value={formData.inscricao_municipal} onChange={(e) => setFormData({ ...formData, inscricao_municipal: e.target.value })} className="input w-full" /></div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div><label className="block text-sm text-dark-300 mb-2">Razão Social *</label><input type="text" value={formData.razao_social} onChange={(e) => setFormData({ ...formData, razao_social: e.target.value })} className="input w-full" required /></div>
                <div><label className="block text-sm text-dark-300 mb-2">Nome Fantasia</label><input type="text" value={formData.nome_fantasia} onChange={(e) => setFormData({ ...formData, nome_fantasia: e.target.value })} className="input w-full" /></div>
              </div>
            </div>
          )}

          <div className="border-t border-dark-700 pt-4">
            <h4 className="text-white font-medium mb-4">Endereço Principal</h4>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div><label className="block text-sm text-dark-300 mb-2">CEP</label><input type="text" value={maskCEP(formData.cep)} onChange={(e) => setFormData({ ...formData, cep: e.target.value })} onBlur={() => handleConsultarCEP(formData.cep)} className="input w-full" placeholder="00000-000" /></div>
              <div className="md:col-span-2"><label className="block text-sm text-dark-300 mb-2">Endereço</label><input type="text" value={formData.endereco} onChange={(e) => setFormData({ ...formData, endereco: e.target.value })} className="input w-full" /></div>
              <div><label className="block text-sm text-dark-300 mb-2">Número</label><input type="text" value={formData.numero} onChange={(e) => setFormData({ ...formData, numero: e.target.value })} className="input w-full" /></div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mt-4">
              <div><label className="block text-sm text-dark-300 mb-2">Complemento</label><input type="text" value={formData.complemento} onChange={(e) => setFormData({ ...formData, complemento: e.target.value })} className="input w-full" /></div>
              <div><label className="block text-sm text-dark-300 mb-2">Bairro</label><input type="text" value={formData.bairro} onChange={(e) => setFormData({ ...formData, bairro: e.target.value })} className="input w-full" /></div>
              <div><label className="block text-sm text-dark-300 mb-2">Cidade</label><input type="text" value={formData.cidade} onChange={(e) => setFormData({ ...formData, cidade: e.target.value })} className="input w-full" /></div>
              <div><label className="block text-sm text-dark-300 mb-2">Estado</label><select value={formData.estado} onChange={(e) => setFormData({ ...formData, estado: e.target.value })} className="input w-full"><option value="">Selecione...</option>{['AC','AL','AP','AM','BA','CE','DF','ES','GO','MA','MT','MS','MG','PA','PB','PR','PE','PI','RJ','RN','RS','RO','RR','SC','SP','SE','TO'].map(uf => (<option key={uf} value={uf}>{uf}</option>))}</select></div>
            </div>
          </div>

          {editingId && (
            <div className="border-t border-dark-700 pt-4">
              <div className="flex items-center justify-between mb-4"><h4 className="text-white font-medium">Endereços Adicionais</h4><Button type="button" variant="secondary" size="sm" onClick={() => openEnderecoModal()} leftIcon={<Plus className="w-4 h-4" />}>Novo Endereço</Button></div>
              {enderecos.length > 0 ? (
                <div className="space-y-2">{enderecos.map(end => (<div key={end.id} className="flex items-center justify-between p-3 bg-dark-800 rounded-lg"><div className="flex items-center gap-3"><MapPin className="w-5 h-5 text-primary-400" /><div><div className="flex items-center gap-2"><span className="text-white text-sm">{end.endereco}, {end.numero}</span><Badge variant="secondary" size="sm">{getTipoEnderecoLabel(end.tipo)}</Badge>{end.principal && <Badge variant="success" size="sm">Principal</Badge>}</div><p className="text-xs text-dark-400">{end.bairro} - {end.cidade}/{end.estado}</p></div></div><div className="flex gap-1"><button type="button" onClick={() => openEnderecoModal(end)} className="p-2 hover:bg-dark-700 rounded"><Edit2 className="w-4 h-4 text-dark-400" /></button><button type="button" onClick={() => handleDeleteEndereco(end.id)} className="p-1 hover:bg-dark-700 rounded"><Trash2 className="w-4 h-4 text-red-400" /></button></div></div>))}</div>
              ) : (<p className="text-dark-400 text-sm text-center py-4">Nenhum endereço adicional cadastrado</p>)}
            </div>
          )}

          <div className="border-t border-dark-700 pt-4"><h4 className="text-white font-medium mb-4">Contato</h4><div className="grid grid-cols-1 md:grid-cols-3 gap-4"><div><label className="block text-sm text-dark-300 mb-2">Telefone</label><input type="text" value={maskPhone(formData.telefone)} onChange={(e) => setFormData({ ...formData, telefone: e.target.value })} className="input w-full" placeholder="(00) 0000-0000" /></div><div><label className="block text-sm text-dark-300 mb-2">Celular</label><input type="text" value={maskPhone(formData.celular)} onChange={(e) => setFormData({ ...formData, celular: e.target.value })} className="input w-full" placeholder="(00) 00000-0000" /></div><div><label className="block text-sm text-dark-300 mb-2">E-mail</label><input type="email" value={formData.email} onChange={(e) => setFormData({ ...formData, email: e.target.value })} className="input w-full" /></div></div></div>

          {tipoPessoa === 'PJ' && (<div className="border-t border-dark-700 pt-4"><h4 className="text-white font-medium mb-4">Dados Fiscais</h4><div className="grid grid-cols-1 md:grid-cols-2 gap-4"><div><label className="flex items-center gap-2 cursor-pointer"><input type="checkbox" checked={formData.contribuinte_icms} onChange={(e) => setFormData({ ...formData, contribuinte_icms: e.target.checked })} className="w-5 h-5 rounded text-primary-500" /><span className="text-white">Contribuinte ICMS</span></label></div><div><label className="block text-sm text-dark-300 mb-2">Regime Tributário</label><select value={formData.regime_tributario} onChange={(e) => setFormData({ ...formData, regime_tributario: e.target.value })} className="input w-full"><option value="">Selecione...</option><option value="simples">Simples Nacional</option><option value="lucro_presumido">Lucro Presumido</option><option value="lucro_real">Lucro Real</option><option value="mei">MEI</option></select></div></div></div>)}

          <div className="border-t border-dark-700 pt-4"><h4 className="text-white font-medium mb-4">Financeiro</h4><div className="grid grid-cols-1 md:grid-cols-2 gap-4"><div><label className="block text-sm text-dark-300 mb-2">Limite de Crédito</label><input type="number" step="0.01" value={formData.limite_credito} onChange={(e) => setFormData({ ...formData, limite_credito: Number(e.target.value) })} className="input w-full" /></div></div></div>

          <div className="border-t border-dark-700 pt-4"><div className="flex items-center justify-between mb-4"><h4 className="text-white font-medium">Anexos</h4><input ref={fileInputRef} type="file" accept=".pdf,.jpg,.jpeg,.png" multiple onChange={handleFileUpload} className="hidden" /><Button type="button" variant="secondary" size="sm" onClick={() => fileInputRef.current?.click()} leftIcon={<Upload className="w-4 h-4" />}>Adicionar Arquivo</Button></div>{anexos.length > 0 ? (<div className="space-y-2">{anexos.map((anexo, index) => (<div key={index} className="flex items-center justify-between p-3 bg-dark-800 rounded-lg"><div className="flex items-center gap-3"><FileText className="w-5 h-5 text-primary-400" /><div><p className="text-white text-sm">{anexo.nome}</p><p className="text-xs text-dark-400">{(anexo.tamanho / 1024).toFixed(1)} KB</p></div></div><button type="button" onClick={() => removerAnexo(index)} className="p-1 hover:bg-dark-700 rounded"><Trash2 className="w-4 h-4 text-red-400" /></button></div>))}</div>) : (<p className="text-dark-400 text-sm text-center py-4">Nenhum anexo adicionado</p>)}</div>

          <div className="border-t border-dark-700 pt-4"><label className="block text-sm text-dark-300 mb-2">Observações</label><textarea value={formData.observacoes} onChange={(e) => setFormData({ ...formData, observacoes: e.target.value })} className="input w-full h-24 resize-none" /></div>

          <div className="flex justify-end gap-3 pt-4 border-t border-dark-700"><Button type="button" variant="secondary" onClick={closeModal}>Cancelar</Button><Button type="submit" disabled={saving}>{saving ? 'Salvando...' : editingId ? 'Salvar' : 'Cadastrar'}</Button></div>
        </form>
      </Modal>

      <Modal isOpen={isEnderecoModalOpen} onClose={() => setIsEnderecoModalOpen(false)} title={editingEnderecoId ? 'Editar Endereço' : 'Novo Endereço'}>
        <form onSubmit={handleSaveEndereco} className="space-y-4">
          <div className="grid grid-cols-2 gap-4"><div><label className="block text-sm text-dark-300 mb-2">Tipo *</label><select value={enderecoForm.tipo} onChange={(e) => setEnderecoForm({ ...enderecoForm, tipo: e.target.value as any })} className="input w-full" required><option value="padrao">Padrão</option><option value="cobranca">Cobrança</option><option value="entrega">Entrega</option><option value="retirada">Retirada</option></select></div><div><label className="block text-sm text-dark-300 mb-2">Descrição</label><input type="text" value={enderecoForm.descricao} onChange={(e) => setEnderecoForm({ ...enderecoForm, descricao: e.target.value })} className="input w-full" placeholder="Ex: Casa, Trabalho..." /></div></div>
          <div className="grid grid-cols-3 gap-4"><div><label className="block text-sm text-dark-300 mb-2">CEP</label><input type="text" value={maskCEP(enderecoForm.cep)} onChange={(e) => setEnderecoForm({ ...enderecoForm, cep: e.target.value })} onBlur={() => handleConsultarCEP(enderecoForm.cep, true)} className="input w-full" placeholder="00000-000" /></div><div className="col-span-2"><label className="block text-sm text-dark-300 mb-2">Endereço *</label><input type="text" value={enderecoForm.endereco} onChange={(e) => setEnderecoForm({ ...enderecoForm, endereco: e.target.value })} className="input w-full" required /></div></div>
          <div className="grid grid-cols-4 gap-4"><div><label className="block text-sm text-dark-300 mb-2">Número</label><input type="text" value={enderecoForm.numero} onChange={(e) => setEnderecoForm({ ...enderecoForm, numero: e.target.value })} className="input w-full" /></div><div><label className="block text-sm text-dark-300 mb-2">Complemento</label><input type="text" value={enderecoForm.complemento} onChange={(e) => setEnderecoForm({ ...enderecoForm, complemento: e.target.value })} className="input w-full" /></div><div><label className="block text-sm text-dark-300 mb-2">Bairro</label><input type="text" value={enderecoForm.bairro} onChange={(e) => setEnderecoForm({ ...enderecoForm, bairro: e.target.value })} className="input w-full" /></div><div><label className="block text-sm text-dark-300 mb-2">Cidade</label><input type="text" value={enderecoForm.cidade} onChange={(e) => setEnderecoForm({ ...enderecoForm, cidade: e.target.value })} className="input w-full" /></div></div>
          <div className="grid grid-cols-2 gap-4"><div><label className="block text-sm text-dark-300 mb-2">Estado</label><select value={enderecoForm.estado} onChange={(e) => setEnderecoForm({ ...enderecoForm, estado: e.target.value })} className="input w-full"><option value="">Selecione...</option>{['AC','AL','AP','AM','BA','CE','DF','ES','GO','MA','MT','MS','MG','PA','PB','PR','PE','PI','RJ','RN','RS','RO','RR','SC','SP','SE','TO'].map(uf => (<option key={uf} value={uf}>{uf}</option>))}</select></div><div className="flex items-end"><label className="flex items-center gap-2 cursor-pointer pb-2"><input type="checkbox" checked={enderecoForm.principal} onChange={(e) => setEnderecoForm({ ...enderecoForm, principal: e.target.checked })} className="w-5 h-5 rounded text-primary-500" /><span className="text-white">Endereço Principal</span></label></div></div>
          <div className="flex justify-end gap-3 pt-4 border-t border-dark-700"><Button type="button" variant="secondary" onClick={() => setIsEnderecoModalOpen(false)}>Cancelar</Button><Button type="submit" disabled={saving}>{saving ? 'Salvando...' : 'Salvar'}</Button></div>
        </form>
      </Modal>

      {/* Modal de Importação CSV */}
      <Modal isOpen={isImportModalOpen} onClose={resetImportModal} title="Importar Clientes/Fornecedores" size="xl">
        <div className="space-y-6">
          {/* Step 1: Seleção de arquivo */}
          {importStep === 'select' && (
            <>
              <div className="p-4 bg-dark-700/50 rounded-lg">
                <h4 className="text-white font-medium mb-2">Formato do arquivo CSV</h4>
                <p className="text-dark-400 text-sm mb-3">O arquivo deve conter as colunas separadas por ponto e vírgula (;) ou vírgula (,):</p>
                <div className="text-xs text-dark-500 font-mono bg-dark-800 p-3 rounded overflow-x-auto">
                  ID;Tipo Pessoa;Tipo Cadastro;CNPJ/CPF;Razao Social/Nome;Fantasia;Endereco;Numero;Bairro;Complemento;CEP;Cidade;Codigo IBGE;UF;...
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
                  <Button variant="secondary" size="sm" onClick={() => toggleSelectAllImport(true)}>Selecionar Todos</Button>
                  <Button variant="secondary" size="sm" onClick={() => toggleSelectAllImport(false)}>Desmarcar Todos</Button>
                </div>
              </div>

              <div className="max-h-96 overflow-y-auto border border-dark-700 rounded-lg">
                <table className="data-table">
                  <thead className="sticky top-0 bg-dark-800 z-10">
                    <tr>
                      <th className="w-10"></th>
                      <th>Linha</th>
                      <th>Tipo</th>
                      <th>Nome / Razão Social</th>
                      <th>Documento</th>
                      <th>Cidade/UF</th>
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
                        <td>
                          <Badge variant={item.data.tipo_cadastro === 'cliente' ? 'info' : item.data.tipo_cadastro === 'fornecedor' ? 'warning' : 'secondary'}>
                            {item.data.tipo_pessoa} - {item.data.tipo_cadastro === 'cliente' ? 'Cli' : item.data.tipo_cadastro === 'fornecedor' ? 'Forn' : 'Ambos'}
                          </Badge>
                        </td>
                        <td className="text-white">
                          {item.data.razao_social || item.data.nome || '-'}
                          {item.data.nome_fantasia && <span className="text-dark-400 text-xs ml-2">({item.data.nome_fantasia})</span>}
                        </td>
                        <td className="text-dark-300 font-mono text-sm">
                          {item.data.cnpj || item.data.cpf || '-'}
                        </td>
                        <td className="text-dark-400">
                          {item.data.cidade ? `${item.data.cidade}/${item.data.estado}` : '-'}
                        </td>
                        <td>
                          {item.isDuplicate ? (
                            <div className="flex items-center gap-1">
                              <AlertTriangle className="w-4 h-4 text-yellow-400" />
                              <span className="text-yellow-400 text-xs" title={item.duplicateReason}>Duplicado</span>
                            </div>
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
                    {importResult.errors.map((err, i) => (
                      <p key={i} className="text-red-400 text-xs mb-1">Linha {err.linha}: {err.erro}</p>
                    ))}
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
