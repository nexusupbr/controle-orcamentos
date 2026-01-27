'use client'

import { useEffect, useState, useRef } from 'react'
import { 
  Plus, Edit2, Trash2, Search, User, Building2, 
  Phone, Mail, MapPin, Upload, FileText, Eye,
  RefreshCw, CheckCircle, AlertTriangle
} from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Modal } from '@/components/ui/Modal'
import { LoadingSpinner, EmptyState, Badge } from '@/components/ui/Common'
import { 
  Cliente, fetchClientes, createCliente, updateCliente, deleteCliente, consultarCNPJ
} from '@/lib/database'
import { formatCurrency } from '@/lib/utils'

// Máscaras
const maskCPF = (value: string) => {
  return value
    .replace(/\D/g, '')
    .replace(/(\d{3})(\d)/, '$1.$2')
    .replace(/(\d{3})(\d)/, '$1.$2')
    .replace(/(\d{3})(\d{1,2})$/, '$1-$2')
    .slice(0, 14)
}

const maskCNPJ = (value: string) => {
  return value
    .replace(/\D/g, '')
    .replace(/(\d{2})(\d)/, '$1.$2')
    .replace(/(\d{3})(\d)/, '$1.$2')
    .replace(/(\d{3})(\d)/, '$1/$2')
    .replace(/(\d{4})(\d{1,2})$/, '$1-$2')
    .slice(0, 18)
}

const maskCEP = (value: string) => {
  return value
    .replace(/\D/g, '')
    .replace(/(\d{5})(\d)/, '$1-$2')
    .slice(0, 9)
}

const maskPhone = (value: string) => {
  return value
    .replace(/\D/g, '')
    .replace(/(\d{2})(\d)/, '($1) $2')
    .replace(/(\d{4,5})(\d{4})$/, '$1-$2')
    .slice(0, 15)
}

export default function ClientesPage() {
  const [clientes, setClientes] = useState<Cliente[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')
  const [filterTipo, setFilterTipo] = useState<'todos' | 'PF' | 'PJ'>('todos')
  
  // Modal
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingId, setEditingId] = useState<number | null>(null)
  const [formError, setFormError] = useState<string | null>(null)
  const [consultandoCNPJ, setConsultandoCNPJ] = useState(false)
  
  // Form
  const [tipoPessoa, setTipoPessoa] = useState<'PF' | 'PJ'>('PF')
  const [formData, setFormData] = useState({
    // PF
    nome: '',
    cpf: '',
    rg: '',
    data_nascimento: '',
    // PJ
    razao_social: '',
    nome_fantasia: '',
    cnpj: '',
    inscricao_estadual: '',
    inscricao_municipal: '',
    // Endereço
    cep: '',
    endereco: '',
    numero: '',
    complemento: '',
    bairro: '',
    cidade: '',
    estado: '',
    // Contato
    telefone: '',
    celular: '',
    email: '',
    // Fiscal
    contribuinte_icms: false,
    regime_tributario: '',
    // Outros
    observacoes: '',
    limite_credito: 0,
  })
  
  // Anexos
  const [anexos, setAnexos] = useState<any[]>([])
  const fileInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    try {
      setLoading(true)
      const data = await fetchClientes()
      setClientes(data)
    } catch (err) {
      console.error('Erro ao carregar clientes:', err)
    } finally {
      setLoading(false)
    }
  }

  // Filtrar clientes
  const filteredClientes = clientes.filter(c => {
    const matchSearch = 
      c.nome?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.razao_social?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.cpf?.includes(searchTerm.replace(/\D/g, '')) ||
      c.cnpj?.includes(searchTerm.replace(/\D/g, '')) ||
      c.email?.toLowerCase().includes(searchTerm.toLowerCase())
    
    const matchTipo = filterTipo === 'todos' || c.tipo_pessoa === filterTipo
    
    return matchSearch && matchTipo
  })

  // Consultar CNPJ na Receita Federal
  const handleConsultarCNPJ = async () => {
    const cnpj = formData.cnpj.replace(/\D/g, '')
    if (cnpj.length !== 14) {
      alert('CNPJ inválido')
      return
    }
    
    setConsultandoCNPJ(true)
    try {
      const dados = await consultarCNPJ(cnpj)
      
      setFormData({
        ...formData,
        razao_social: dados.razao_social || '',
        nome_fantasia: dados.nome_fantasia || '',
        cep: dados.cep || '',
        endereco: dados.logradouro || '',
        numero: dados.numero || '',
        complemento: dados.complemento || '',
        bairro: dados.bairro || '',
        cidade: dados.municipio || '',
        estado: dados.uf || '',
        telefone: dados.ddd_telefone_1 || '',
      })
    } catch (err) {
      alert('Erro ao consultar CNPJ. Verifique se o número está correto.')
    } finally {
      setConsultandoCNPJ(false)
    }
  }

  // Consultar CEP
  const handleConsultarCEP = async () => {
    const cep = formData.cep.replace(/\D/g, '')
    if (cep.length !== 8) return
    
    try {
      const response = await fetch(`https://viacep.com.br/ws/${cep}/json/`)
      const dados = await response.json()
      
      if (!dados.erro) {
        setFormData({
          ...formData,
          endereco: dados.logradouro || '',
          bairro: dados.bairro || '',
          cidade: dados.localidade || '',
          estado: dados.uf || '',
        })
      }
    } catch (err) {
      console.error('Erro ao consultar CEP:', err)
    }
  }

  // Abrir modal
  const openModal = (cliente?: Cliente) => {
    setFormError(null)
    
    if (cliente) {
      setEditingId(cliente.id)
      setTipoPessoa(cliente.tipo_pessoa)
      setFormData({
        nome: cliente.nome || '',
        cpf: cliente.cpf || '',
        rg: cliente.rg || '',
        data_nascimento: cliente.data_nascimento || '',
        razao_social: cliente.razao_social || '',
        nome_fantasia: cliente.nome_fantasia || '',
        cnpj: cliente.cnpj || '',
        inscricao_estadual: cliente.inscricao_estadual || '',
        inscricao_municipal: cliente.inscricao_municipal || '',
        cep: cliente.cep || '',
        endereco: cliente.endereco || '',
        numero: cliente.numero || '',
        complemento: cliente.complemento || '',
        bairro: cliente.bairro || '',
        cidade: cliente.cidade || '',
        estado: cliente.estado || '',
        telefone: cliente.telefone || '',
        celular: cliente.celular || '',
        email: cliente.email || '',
        contribuinte_icms: cliente.contribuinte_icms || false,
        regime_tributario: cliente.regime_tributario || '',
        observacoes: cliente.observacoes || '',
        limite_credito: cliente.limite_credito || 0,
      })
      setAnexos(cliente.anexos || [])
    } else {
      setEditingId(null)
      setTipoPessoa('PF')
      setFormData({
        nome: '',
        cpf: '',
        rg: '',
        data_nascimento: '',
        razao_social: '',
        nome_fantasia: '',
        cnpj: '',
        inscricao_estadual: '',
        inscricao_municipal: '',
        cep: '',
        endereco: '',
        numero: '',
        complemento: '',
        bairro: '',
        cidade: '',
        estado: '',
        telefone: '',
        celular: '',
        email: '',
        contribuinte_icms: false,
        regime_tributario: '',
        observacoes: '',
        limite_credito: 0,
      })
      setAnexos([])
    }
    setIsModalOpen(true)
  }

  const closeModal = () => {
    setIsModalOpen(false)
    setEditingId(null)
    setFormError(null)
  }

  // Salvar cliente
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    setFormError(null)
    
    try {
      const clienteData = {
        tipo_pessoa: tipoPessoa,
        nome: tipoPessoa === 'PF' ? formData.nome : null,
        cpf: tipoPessoa === 'PF' ? formData.cpf.replace(/\D/g, '') : null,
        rg: tipoPessoa === 'PF' ? formData.rg : null,
        data_nascimento: tipoPessoa === 'PF' && formData.data_nascimento ? formData.data_nascimento : null,
        razao_social: tipoPessoa === 'PJ' ? formData.razao_social : null,
        nome_fantasia: tipoPessoa === 'PJ' ? formData.nome_fantasia : null,
        cnpj: tipoPessoa === 'PJ' ? formData.cnpj.replace(/\D/g, '') : null,
        inscricao_estadual: tipoPessoa === 'PJ' ? formData.inscricao_estadual : null,
        inscricao_municipal: tipoPessoa === 'PJ' ? formData.inscricao_municipal : null,
        cep: formData.cep.replace(/\D/g, ''),
        endereco: formData.endereco,
        numero: formData.numero,
        complemento: formData.complemento,
        bairro: formData.bairro,
        cidade: formData.cidade,
        estado: formData.estado,
        telefone: formData.telefone,
        celular: formData.celular,
        email: formData.email,
        contribuinte_icms: formData.contribuinte_icms,
        regime_tributario: formData.regime_tributario,
        observacoes: formData.observacoes,
        limite_credito: formData.limite_credito,
        anexos: anexos,
        ativo: true
      }
      
      if (editingId) {
        await updateCliente(editingId, clienteData)
      } else {
        await createCliente(clienteData)
      }
      
      await loadData()
      closeModal()
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Erro ao salvar cliente'
      setFormError(message)
    } finally {
      setSaving(false)
    }
  }

  // Excluir cliente
  const handleDelete = async (id: number) => {
    if (!confirm('Tem certeza que deseja excluir este cliente?')) return
    
    try {
      await deleteCliente(id)
      await loadData()
    } catch (err) {
      console.error('Erro ao excluir:', err)
      alert('Erro ao excluir cliente')
    }
  }

  // Upload de anexos (simplificado - em produção usaria storage do Supabase)
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (!files) return
    
    // Simular upload - em produção, faria upload para storage
    Array.from(files).forEach(file => {
      const reader = new FileReader()
      reader.onload = () => {
        setAnexos(prev => [...prev, {
          nome: file.name,
          tipo: file.type,
          tamanho: file.size,
          url: reader.result, // Em produção seria a URL do storage
          data: new Date().toISOString()
        }])
      }
      reader.readAsDataURL(file)
    })
    
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  const removerAnexo = (index: number) => {
    setAnexos(prev => prev.filter((_, i) => i !== index))
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
            Clientes
          </h1>
          <p className="text-dark-400 mt-1">
            Cadastre e gerencie clientes (Pessoa Física e Jurídica)
          </p>
        </div>
        <Button
          onClick={() => openModal()}
          leftIcon={<Plus className="w-5 h-5" />}
        >
          Novo Cliente
        </Button>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="glass-card p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-primary-500/20 flex items-center justify-center">
              <User className="w-5 h-5 text-primary-400" />
            </div>
            <div>
              <p className="text-dark-400 text-sm">Total de Clientes</p>
              <p className="text-xl font-bold text-white">{clientes.length}</p>
            </div>
          </div>
        </div>
        
        <div className="glass-card p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-blue-500/20 flex items-center justify-center">
              <User className="w-5 h-5 text-blue-400" />
            </div>
            <div>
              <p className="text-dark-400 text-sm">Pessoa Física</p>
              <p className="text-xl font-bold text-white">
                {clientes.filter(c => c.tipo_pessoa === 'PF').length}
              </p>
            </div>
          </div>
        </div>
        
        <div className="glass-card p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-green-500/20 flex items-center justify-center">
              <Building2 className="w-5 h-5 text-green-400" />
            </div>
            <div>
              <p className="text-dark-400 text-sm">Pessoa Jurídica</p>
              <p className="text-xl font-bold text-white">
                {clientes.filter(c => c.tipo_pessoa === 'PJ').length}
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
              <p className="text-dark-400 text-sm">Com Saldo Devedor</p>
              <p className="text-xl font-bold text-white">
                {clientes.filter(c => c.saldo_devedor > 0).length}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Filtros */}
      <div className="glass-card p-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="relative md:col-span-2">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-dark-400" />
            <input
              type="text"
              placeholder="Buscar por nome, CPF/CNPJ, email..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="input pl-12 w-full"
            />
          </div>
          
          <select
            value={filterTipo}
            onChange={(e) => setFilterTipo(e.target.value as any)}
            className="input"
          >
            <option value="todos">Todos os tipos</option>
            <option value="PF">Pessoa Física</option>
            <option value="PJ">Pessoa Jurídica</option>
          </select>
        </div>
      </div>

      {/* Lista de Clientes */}
      <div className="glass-card overflow-hidden">
        {filteredClientes.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Cliente</th>
                  <th>Tipo</th>
                  <th>Documento</th>
                  <th>Contato</th>
                  <th>Cidade/UF</th>
                  <th className="text-right">Limite</th>
                  <th className="text-right">Saldo Dev.</th>
                  <th className="text-right">Ações</th>
                </tr>
              </thead>
              <tbody>
                {filteredClientes.map((cliente) => (
                  <tr key={cliente.id} className="group">
                    <td>
                      <div className="flex items-center gap-3">
                        <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                          cliente.tipo_pessoa === 'PF' ? 'bg-blue-500/10' : 'bg-green-500/10'
                        }`}>
                          {cliente.tipo_pessoa === 'PF' ? (
                            <User className="w-5 h-5 text-blue-400" />
                          ) : (
                            <Building2 className="w-5 h-5 text-green-400" />
                          )}
                        </div>
                        <div>
                          <span className="font-medium text-white">
                            {cliente.tipo_pessoa === 'PF' ? cliente.nome : cliente.razao_social}
                          </span>
                          {cliente.tipo_pessoa === 'PJ' && cliente.nome_fantasia && (
                            <p className="text-xs text-dark-400">{cliente.nome_fantasia}</p>
                          )}
                        </div>
                      </div>
                    </td>
                    <td>
                      <Badge variant={cliente.tipo_pessoa === 'PF' ? 'primary' : 'success'}>
                        {cliente.tipo_pessoa}
                      </Badge>
                    </td>
                    <td className="text-dark-300">
                      {cliente.tipo_pessoa === 'PF' 
                        ? maskCPF(cliente.cpf || '') 
                        : maskCNPJ(cliente.cnpj || '')}
                    </td>
                    <td>
                      <div className="text-sm">
                        {cliente.email && (
                          <div className="flex items-center gap-1 text-dark-400">
                            <Mail className="w-3 h-3" />
                            <span>{cliente.email}</span>
                          </div>
                        )}
                        {(cliente.telefone || cliente.celular) && (
                          <div className="flex items-center gap-1 text-dark-400">
                            <Phone className="w-3 h-3" />
                            <span>{cliente.celular || cliente.telefone}</span>
                          </div>
                        )}
                      </div>
                    </td>
                    <td className="text-dark-300">
                      {cliente.cidade && cliente.estado 
                        ? `${cliente.cidade}/${cliente.estado}` 
                        : '-'}
                    </td>
                    <td className="text-right text-dark-300">
                      {formatCurrency(cliente.limite_credito)}
                    </td>
                    <td className="text-right">
                      <span className={cliente.saldo_devedor > 0 ? 'text-red-400 font-medium' : 'text-dark-400'}>
                        {formatCurrency(cliente.saldo_devedor)}
                      </span>
                    </td>
                    <td>
                      <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button
                          onClick={() => openModal(cliente)}
                          className="p-2 rounded-lg text-dark-400 hover:text-primary-400 hover:bg-primary-500/10 transition-colors"
                          title="Editar"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDelete(cliente.id)}
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
            icon={<User className="w-10 h-10 text-dark-500" />}
            title="Nenhum cliente encontrado"
            description="Cadastre clientes para gerenciar vendas e orçamentos"
            action={
              <Button onClick={() => openModal()} leftIcon={<Plus className="w-4 h-4" />}>
                Novo Cliente
              </Button>
            }
          />
        )}
      </div>

      {/* Modal de Cliente */}
      <Modal
        isOpen={isModalOpen}
        onClose={closeModal}
        title={editingId ? 'Editar Cliente' : 'Novo Cliente'}
        size="xl"
      >
        <form onSubmit={handleSubmit} className="space-y-6">
          {formError && (
            <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
              {formError}
            </div>
          )}

          {/* Tabs PF/PJ */}
          <div className="flex gap-2 border-b border-dark-700 pb-4">
            <button
              type="button"
              onClick={() => setTipoPessoa('PF')}
              className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                tipoPessoa === 'PF' 
                  ? 'bg-primary-500 text-white' 
                  : 'bg-dark-700 text-dark-300 hover:bg-dark-600'
              }`}
            >
              <div className="flex items-center gap-2">
                <User className="w-4 h-4" />
                Pessoa Física
              </div>
            </button>
            <button
              type="button"
              onClick={() => setTipoPessoa('PJ')}
              className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                tipoPessoa === 'PJ' 
                  ? 'bg-primary-500 text-white' 
                  : 'bg-dark-700 text-dark-300 hover:bg-dark-600'
              }`}
            >
              <div className="flex items-center gap-2">
                <Building2 className="w-4 h-4" />
                Pessoa Jurídica
              </div>
            </button>
          </div>

          {/* Dados Pessoa Física */}
          {tipoPessoa === 'PF' && (
            <div className="space-y-4">
              <h4 className="text-white font-medium">Dados Pessoais</h4>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="md:col-span-2">
                  <label className="block text-sm text-dark-300 mb-2">Nome Completo *</label>
                  <input
                    type="text"
                    value={formData.nome}
                    onChange={(e) => setFormData({ ...formData, nome: e.target.value })}
                    className="input w-full"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm text-dark-300 mb-2">Data de Nascimento</label>
                  <input
                    type="date"
                    value={formData.data_nascimento}
                    onChange={(e) => setFormData({ ...formData, data_nascimento: e.target.value })}
                    className="input w-full"
                  />
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm text-dark-300 mb-2">CPF</label>
                  <input
                    type="text"
                    value={maskCPF(formData.cpf)}
                    onChange={(e) => setFormData({ ...formData, cpf: e.target.value })}
                    className="input w-full"
                    placeholder="000.000.000-00"
                  />
                </div>
                <div>
                  <label className="block text-sm text-dark-300 mb-2">RG</label>
                  <input
                    type="text"
                    value={formData.rg}
                    onChange={(e) => setFormData({ ...formData, rg: e.target.value })}
                    className="input w-full"
                  />
                </div>
              </div>
            </div>
          )}

          {/* Dados Pessoa Jurídica */}
          {tipoPessoa === 'PJ' && (
            <div className="space-y-4">
              <h4 className="text-white font-medium">Dados da Empresa</h4>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm text-dark-300 mb-2">CNPJ *</label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={maskCNPJ(formData.cnpj)}
                      onChange={(e) => setFormData({ ...formData, cnpj: e.target.value })}
                      className="input flex-1"
                      placeholder="00.000.000/0000-00"
                      required
                    />
                    <Button
                      type="button"
                      variant="secondary"
                      onClick={handleConsultarCNPJ}
                      disabled={consultandoCNPJ}
                    >
                      {consultandoCNPJ ? (
                        <RefreshCw className="w-4 h-4 animate-spin" />
                      ) : (
                        <Search className="w-4 h-4" />
                      )}
                    </Button>
                  </div>
                </div>
                <div>
                  <label className="block text-sm text-dark-300 mb-2">Inscrição Estadual</label>
                  <input
                    type="text"
                    value={formData.inscricao_estadual}
                    onChange={(e) => setFormData({ ...formData, inscricao_estadual: e.target.value })}
                    className="input w-full"
                  />
                </div>
                <div>
                  <label className="block text-sm text-dark-300 mb-2">Inscrição Municipal</label>
                  <input
                    type="text"
                    value={formData.inscricao_municipal}
                    onChange={(e) => setFormData({ ...formData, inscricao_municipal: e.target.value })}
                    className="input w-full"
                  />
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm text-dark-300 mb-2">Razão Social *</label>
                  <input
                    type="text"
                    value={formData.razao_social}
                    onChange={(e) => setFormData({ ...formData, razao_social: e.target.value })}
                    className="input w-full"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm text-dark-300 mb-2">Nome Fantasia</label>
                  <input
                    type="text"
                    value={formData.nome_fantasia}
                    onChange={(e) => setFormData({ ...formData, nome_fantasia: e.target.value })}
                    className="input w-full"
                  />
                </div>
              </div>
            </div>
          )}

          {/* Endereço */}
          <div className="border-t border-dark-700 pt-4">
            <h4 className="text-white font-medium mb-4">Endereço</h4>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div>
                <label className="block text-sm text-dark-300 mb-2">CEP</label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={maskCEP(formData.cep)}
                    onChange={(e) => setFormData({ ...formData, cep: e.target.value })}
                    onBlur={handleConsultarCEP}
                    className="input flex-1"
                    placeholder="00000-000"
                  />
                </div>
              </div>
              <div className="md:col-span-2">
                <label className="block text-sm text-dark-300 mb-2">Endereço</label>
                <input
                  type="text"
                  value={formData.endereco}
                  onChange={(e) => setFormData({ ...formData, endereco: e.target.value })}
                  className="input w-full"
                />
              </div>
              <div>
                <label className="block text-sm text-dark-300 mb-2">Número</label>
                <input
                  type="text"
                  value={formData.numero}
                  onChange={(e) => setFormData({ ...formData, numero: e.target.value })}
                  className="input w-full"
                />
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mt-4">
              <div>
                <label className="block text-sm text-dark-300 mb-2">Complemento</label>
                <input
                  type="text"
                  value={formData.complemento}
                  onChange={(e) => setFormData({ ...formData, complemento: e.target.value })}
                  className="input w-full"
                />
              </div>
              <div>
                <label className="block text-sm text-dark-300 mb-2">Bairro</label>
                <input
                  type="text"
                  value={formData.bairro}
                  onChange={(e) => setFormData({ ...formData, bairro: e.target.value })}
                  className="input w-full"
                />
              </div>
              <div>
                <label className="block text-sm text-dark-300 mb-2">Cidade</label>
                <input
                  type="text"
                  value={formData.cidade}
                  onChange={(e) => setFormData({ ...formData, cidade: e.target.value })}
                  className="input w-full"
                />
              </div>
              <div>
                <label className="block text-sm text-dark-300 mb-2">Estado</label>
                <select
                  value={formData.estado}
                  onChange={(e) => setFormData({ ...formData, estado: e.target.value })}
                  className="input w-full"
                >
                  <option value="">Selecione...</option>
                  {['AC','AL','AP','AM','BA','CE','DF','ES','GO','MA','MT','MS','MG','PA','PB','PR','PE','PI','RJ','RN','RS','RO','RR','SC','SP','SE','TO'].map(uf => (
                    <option key={uf} value={uf}>{uf}</option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* Contato */}
          <div className="border-t border-dark-700 pt-4">
            <h4 className="text-white font-medium mb-4">Contato</h4>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm text-dark-300 mb-2">Telefone</label>
                <input
                  type="text"
                  value={maskPhone(formData.telefone)}
                  onChange={(e) => setFormData({ ...formData, telefone: e.target.value })}
                  className="input w-full"
                  placeholder="(00) 0000-0000"
                />
              </div>
              <div>
                <label className="block text-sm text-dark-300 mb-2">Celular</label>
                <input
                  type="text"
                  value={maskPhone(formData.celular)}
                  onChange={(e) => setFormData({ ...formData, celular: e.target.value })}
                  className="input w-full"
                  placeholder="(00) 00000-0000"
                />
              </div>
              <div>
                <label className="block text-sm text-dark-300 mb-2">E-mail</label>
                <input
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  className="input w-full"
                />
              </div>
            </div>
          </div>

          {/* Dados Fiscais (só para PJ) */}
          {tipoPessoa === 'PJ' && (
            <div className="border-t border-dark-700 pt-4">
              <h4 className="text-white font-medium mb-4">Dados Fiscais</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={formData.contribuinte_icms}
                      onChange={(e) => setFormData({ ...formData, contribuinte_icms: e.target.checked })}
                      className="w-5 h-5 rounded text-primary-500"
                    />
                    <span className="text-white">Contribuinte ICMS</span>
                  </label>
                </div>
                <div>
                  <label className="block text-sm text-dark-300 mb-2">Regime Tributário</label>
                  <select
                    value={formData.regime_tributario}
                    onChange={(e) => setFormData({ ...formData, regime_tributario: e.target.value })}
                    className="input w-full"
                  >
                    <option value="">Selecione...</option>
                    <option value="simples">Simples Nacional</option>
                    <option value="lucro_presumido">Lucro Presumido</option>
                    <option value="lucro_real">Lucro Real</option>
                    <option value="mei">MEI</option>
                  </select>
                </div>
              </div>
            </div>
          )}

          {/* Financeiro */}
          <div className="border-t border-dark-700 pt-4">
            <h4 className="text-white font-medium mb-4">Financeiro</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm text-dark-300 mb-2">Limite de Crédito</label>
                <input
                  type="number"
                  step="0.01"
                  value={formData.limite_credito}
                  onChange={(e) => setFormData({ ...formData, limite_credito: Number(e.target.value) })}
                  className="input w-full"
                />
              </div>
            </div>
          </div>

          {/* Anexos */}
          <div className="border-t border-dark-700 pt-4">
            <div className="flex items-center justify-between mb-4">
              <h4 className="text-white font-medium">Anexos</h4>
              <input
                ref={fileInputRef}
                type="file"
                accept=".pdf,.jpg,.jpeg,.png"
                multiple
                onChange={handleFileUpload}
                className="hidden"
              />
              <Button
                type="button"
                variant="secondary"
                size="sm"
                onClick={() => fileInputRef.current?.click()}
                leftIcon={<Upload className="w-4 h-4" />}
              >
                Adicionar Arquivo
              </Button>
            </div>
            
            {anexos.length > 0 ? (
              <div className="space-y-2">
                {anexos.map((anexo, index) => (
                  <div key={index} className="flex items-center justify-between p-3 bg-dark-800 rounded-lg">
                    <div className="flex items-center gap-3">
                      <FileText className="w-5 h-5 text-primary-400" />
                      <div>
                        <p className="text-white text-sm">{anexo.nome}</p>
                        <p className="text-xs text-dark-400">
                          {(anexo.tamanho / 1024).toFixed(1)} KB
                        </p>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => removerAnexo(index)}
                      className="p-1 hover:bg-dark-700 rounded"
                    >
                      <Trash2 className="w-4 h-4 text-red-400" />
                    </button>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-dark-400 text-sm text-center py-4">
                Nenhum anexo adicionado
              </p>
            )}
          </div>

          {/* Observações */}
          <div className="border-t border-dark-700 pt-4">
            <label className="block text-sm text-dark-300 mb-2">Observações</label>
            <textarea
              value={formData.observacoes}
              onChange={(e) => setFormData({ ...formData, observacoes: e.target.value })}
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
    </div>
  )
}
