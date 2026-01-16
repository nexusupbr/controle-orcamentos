'use client'

import { useEffect, useState, useRef } from 'react'
import { Plus, Edit2, Trash2, Search, X, Check, Printer, Download } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Input, Select } from '@/components/ui/Form'
import { Modal } from '@/components/ui/Modal'
import { LoadingSpinner, EmptyState, Badge } from '@/components/ui/Common'
import { fetchOrcamentos, createOrcamento, updateOrcamento, deleteOrcamento, Orcamento, OrcamentoInput } from '@/lib/supabase'
import { formatCurrency, formatDate, formatNumberBR, parseNumberBR, maskCurrency } from '@/lib/utils'

const statusOptions = [
  { value: '', label: 'Selecione...' },
  { value: 'Fechado', label: 'Fechado' },
  { value: 'Perdido', label: 'Perdido' },
  { value: 'Análise', label: 'Análise' },
]

// Função para extrair mês/ano de uma data
const getMesAno = (dataStr: string): string => {
  const date = new Date(dataStr + 'T00:00:00')
  const mes = String(date.getMonth() + 1).padStart(2, '0')
  const ano = date.getFullYear()
  return `${mes}/${ano}`
}

const initialFormData: OrcamentoInput = {
  data: new Date().toISOString().split('T')[0],
  mes: getMesAno(new Date().toISOString().split('T')[0]),
  cliente: '',
  valor_proposto: 0,
  valor_fechado: 0,
  entrada: 0,
  status: 'Fechado',
  parcelado: false,
  parcelas: 1,
  observacoes: '',
  nota_fiscal: false,
}

export default function OrcamentosPage() {
  const [orcamentos, setOrcamentos] = useState<Orcamento[]>([])
  const [filteredOrcamentos, setFilteredOrcamentos] = useState<Orcamento[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [formError, setFormError] = useState<string | null>(null)
  
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingId, setEditingId] = useState<number | null>(null)
  const [formData, setFormData] = useState<OrcamentoInput>(initialFormData)
  
  const [searchTerm, setSearchTerm] = useState('')
  const [filterMes, setFilterMes] = useState('Todos')
  const [filterStatus, setFilterStatus] = useState('Todos')

  const tableRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    loadData()
  }, [])

  useEffect(() => {
    filterData()
  }, [orcamentos, searchTerm, filterMes, filterStatus])

  const loadData = async () => {
    try {
      setLoading(true)
      const data = await fetchOrcamentos()
      setOrcamentos(data)
      setError(null)
    } catch (err) {
      console.error('Erro ao carregar dados:', err)
      setError('Erro ao carregar dados')
    } finally {
      setLoading(false)
    }
  }

  const filterData = () => {
    let filtered = [...orcamentos]
    
    if (searchTerm) {
      filtered = filtered.filter(o => 
        o.cliente.toLowerCase().includes(searchTerm.toLowerCase())
      )
    }
    
    if (filterMes !== 'Todos') {
      filtered = filtered.filter(o => o.mes === filterMes)
    }
    
    if (filterStatus !== 'Todos') {
      filtered = filtered.filter(o => o.status === filterStatus)
    }
    
    setFilteredOrcamentos(filtered)
  }

  const openModal = (orcamento?: Orcamento) => {
    setFormError(null)
    if (orcamento) {
      setEditingId(orcamento.id)
      setFormData({
        data: orcamento.data,
        mes: orcamento.mes,
        cliente: orcamento.cliente,
        valor_proposto: orcamento.valor_proposto,
        valor_fechado: orcamento.valor_fechado,
        entrada: orcamento.entrada || 0,
        status: orcamento.status,
        parcelado: orcamento.parcelado || false,
        parcelas: orcamento.parcelas || 1,
        observacoes: orcamento.observacoes || '',
        nota_fiscal: orcamento.nota_fiscal || false,
      })
    } else {
      setEditingId(null)
      const hoje = new Date().toISOString().split('T')[0]
      setFormData({
        ...initialFormData,
        data: hoje,
        mes: getMesAno(hoje),
      })
    }
    setIsModalOpen(true)
  }

  const closeModal = () => {
    setIsModalOpen(false)
    setEditingId(null)
    setFormData(initialFormData)
    setFormError(null)
  }

  const handleDataChange = (novaData: string) => {
    setFormData({
      ...formData,
      data: novaData,
      mes: getMesAno(novaData),
    })
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    setFormError(null)
    
    try {
      if (editingId) {
        await updateOrcamento(editingId, formData)
      } else {
        await createOrcamento(formData)
      }
      await loadData()
      closeModal()
    } catch (err) {
      console.error('Erro ao salvar:', err)
      const message = err instanceof Error ? err.message : 'Erro ao salvar orçamento'
      setFormError(message)
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (id: number) => {
    if (!confirm('Tem certeza que deseja excluir este orçamento?')) return
    
    try {
      await deleteOrcamento(id)
      await loadData()
    } catch (err) {
      console.error('Erro ao excluir:', err)
      alert('Erro ao excluir orçamento')
    }
  }

  const handlePrint = () => {
    const printContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Relatório de Orçamentos</title>
        <style>
          * { margin: 0; padding: 0; box-sizing: border-box; }
          body { font-family: Arial, sans-serif; padding: 20px; color: #333; }
          h1 { text-align: center; margin-bottom: 10px; color: #059669; }
          .info { text-align: center; margin-bottom: 20px; color: #666; font-size: 12px; }
          table { width: 100%; border-collapse: collapse; margin-top: 20px; }
          th, td { border: 1px solid #ddd; padding: 10px; text-align: left; font-size: 12px; }
          th { background: #059669; color: white; }
          tr:nth-child(even) { background: #f9f9f9; }
          .status-fechado { color: #059669; font-weight: bold; }
          .status-perdido { color: #dc2626; font-weight: bold; }
          .status-analise { color: #f59e0b; font-weight: bold; }
          .totais { margin-top: 20px; padding: 15px; background: #f0fdf4; border-radius: 8px; }
          .totais h3 { color: #059669; margin-bottom: 10px; }
          .totais p { margin: 5px 0; }
          @media print {
            body { print-color-adjust: exact; -webkit-print-color-adjust: exact; }
          }
        </style>
      </head>
      <body>
        <h1>📊 Relatório de Orçamentos</h1>
        <p class="info">Gerado em ${new Date().toLocaleDateString('pt-BR')} às ${new Date().toLocaleTimeString('pt-BR')}</p>
        
        <table>
          <thead>
            <tr>
              <th>Data</th>
              <th>Mês</th>
              <th>Cliente</th>
              <th>Valor Proposto</th>
              <th>Valor Fechado</th>
              <th>Entrada</th>
              <th>Status</th>
              <th>Pagamento</th>
              <th>NF</th>
            </tr>
          </thead>
          <tbody>
            ${filteredOrcamentos.map(orc => `
              <tr>
                <td>${formatDate(orc.data)}</td>
                <td>${orc.mes}</td>
                <td>${orc.cliente}</td>
                <td>${formatCurrency(orc.valor_proposto)}</td>
                <td>${formatCurrency(orc.valor_fechado)}</td>
                <td>${formatCurrency(orc.entrada || 0)}</td>
                <td class="${orc.status === 'Fechado' ? 'status-fechado' : orc.status === 'Análise' ? 'status-analise' : 'status-perdido'}">${orc.status}</td>
                <td>${orc.parcelado ? orc.parcelas + 'x' : 'À vista'}</td>
                <td>${orc.nota_fiscal ? '✓ Sim' : '✗ Não'}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>
        
        <div class="totais">
          <h3>Resumo</h3>
          <p><strong>Total de orçamentos:</strong> ${filteredOrcamentos.length}</p>
          <p><strong>Fechados:</strong> ${filteredOrcamentos.filter(o => o.status === 'Fechado').length}</p>
          <p><strong>Em Análise:</strong> ${filteredOrcamentos.filter(o => o.status === 'Análise').length}</p>
          <p><strong>Perdidos:</strong> ${filteredOrcamentos.filter(o => o.status === 'Perdido').length}</p>
          <p><strong>Com Nota Fiscal:</strong> ${filteredOrcamentos.filter(o => o.nota_fiscal).length}</p>
          <p><strong>Valor total proposto:</strong> ${formatCurrency(filteredOrcamentos.reduce((acc, o) => acc + o.valor_proposto, 0))}</p>
          <p><strong>Valor total fechado:</strong> ${formatCurrency(filteredOrcamentos.reduce((acc, o) => acc + o.valor_fechado, 0))}</p>
          <p><strong>Valor total entrada:</strong> ${formatCurrency(filteredOrcamentos.reduce((acc, o) => acc + (o.entrada || 0), 0))}</p>
        </div>
      </body>
      </html>
    `
    
    const printWindow = window.open('', '_blank')
    if (printWindow) {
      printWindow.document.write(printContent)
      printWindow.document.close()
      printWindow.print()
    }
  }

  const handleExportCSV = () => {
    const headers = ['Data', 'Mês', 'Cliente', 'Valor Proposto', 'Valor Fechado', 'Entrada', 'Status', 'Parcelado', 'Parcelas', 'Nota Fiscal', 'Observações']
    const rows = filteredOrcamentos.map(orc => [
      orc.data,
      orc.mes,
      orc.cliente,
      orc.valor_proposto,
      orc.valor_fechado,
      orc.entrada || 0,
      orc.status,
      orc.parcelado ? 'Sim' : 'Não',
      orc.parcelas,
      orc.nota_fiscal ? 'Sim' : 'Não',
      `"${(orc.observacoes || '').replace(/"/g, '""')}"`
    ])
    
    const csvContent = [headers, ...rows].map(row => row.join(',')).join('\n')
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `orcamentos_${new Date().toISOString().split('T')[0]}.csv`
    link.click()
    URL.revokeObjectURL(url)
  }

  const meses = ['Todos', ...Array.from(new Set(orcamentos.map(o => o.mes)))]

  if (loading) {
    return (
      <div className="flex items-center justify-center h-[60vh]">
        <LoadingSpinner size="lg" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div>
          <h1 className="text-2xl lg:text-3xl font-bold font-heading text-white">
            Orçamentos
          </h1>
          <p className="text-dark-400 mt-1">
            Gerencie todos os seus orçamentos
          </p>
        </div>
        <div className="flex flex-wrap gap-3">
          <Button
            variant="secondary"
            onClick={handlePrint}
            leftIcon={<Printer className="w-4 h-4" />}
          >
            Imprimir
          </Button>
          <Button
            variant="secondary"
            onClick={handleExportCSV}
            leftIcon={<Download className="w-4 h-4" />}
          >
            Exportar CSV
          </Button>
          <Button
            onClick={() => openModal()}
            leftIcon={<Plus className="w-5 h-5" />}
          >
            Novo Orçamento
          </Button>
        </div>
      </div>

      {/* Filters */}
      <div className="glass-card p-4">
        <div className="flex flex-col lg:flex-row gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-dark-400" />
            <input
              type="text"
              placeholder="Buscar por cliente..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="input pl-12"
            />
          </div>
          <div className="flex gap-3">
            <select
              value={filterMes}
              onChange={(e) => setFilterMes(e.target.value)}
              className="select min-w-[150px]"
            >
              {meses.map(mes => (
                <option key={mes} value={mes}>{mes === 'Todos' ? 'Todos os meses' : mes}</option>
              ))}
            </select>
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="select min-w-[140px]"
            >
              <option value="Todos">Todos status</option>
              <option value="Fechado">Fechado</option>
              <option value="Análise">Análise</option>
              <option value="Perdido">Perdido</option>
            </select>
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="glass-card overflow-hidden" ref={tableRef}>
        {filteredOrcamentos.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Data</th>
                  <th>Mês</th>
                  <th>Cliente</th>
                  <th>Valor Proposto</th>
                  <th>Valor Fechado</th>
                  <th>Entrada</th>
                  <th>Status</th>
                  <th>Pagamento</th>
                  <th>NF</th>
                  <th className="text-right">Ações</th>
                </tr>
              </thead>
              <tbody>
                {filteredOrcamentos.map((orc) => (
                  <tr key={orc.id} className="group">
                    <td className="text-dark-300">{formatDate(orc.data)}</td>
                    <td>
                      <span className="px-2 py-1 rounded-lg bg-dark-800 text-dark-300 text-sm">
                        {orc.mes}
                      </span>
                    </td>
                    <td className="font-medium text-white">{orc.cliente}</td>
                    <td className="text-dark-300">{formatCurrency(orc.valor_proposto)}</td>
                    <td className="text-primary-400 font-semibold">
                      {formatCurrency(orc.valor_fechado)}
                    </td>
                    <td className="text-emerald-400">
                      {formatCurrency(orc.entrada || 0)}
                    </td>
                    <td>
                      <Badge variant={orc.status === 'Fechado' ? 'success' : orc.status === 'Análise' ? 'warning' : 'danger'}>
                        {orc.status === 'Fechado' ? <Check className="w-3 h-3" /> : orc.status === 'Análise' ? null : <X className="w-3 h-3" />}
                        {orc.status}
                      </Badge>
                    </td>
                    <td>
                      <span className={`text-sm ${orc.parcelado ? 'text-amber-400' : 'text-dark-400'}`}>
                        {orc.parcelado ? `${orc.parcelas}x` : 'À vista'}
                      </span>
                    </td>
                    <td>
                      <span className={`text-sm font-medium ${orc.nota_fiscal ? 'text-emerald-400' : 'text-red-400'}`}>
                        {orc.nota_fiscal ? '✓ Sim' : '✗ Não'}
                      </span>
                    </td>
                    <td>
                      <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button
                          onClick={() => openModal(orc)}
                          className="p-2 rounded-lg text-dark-400 hover:text-primary-400 hover:bg-primary-500/10 transition-colors"
                          title="Editar"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDelete(orc.id)}
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
            title="Nenhum orçamento encontrado"
            description={searchTerm || filterMes !== 'Todos' || filterStatus !== 'Todos' 
              ? "Tente ajustar os filtros" 
              : "Adicione seu primeiro orçamento clicando no botão acima"}
            action={
              <Button onClick={() => openModal()} leftIcon={<Plus className="w-4 h-4" />}>
                Novo Orçamento
              </Button>
            }
          />
        )}
      </div>

      {/* Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={closeModal}
        title={editingId ? 'Editar Orçamento' : 'Novo Orçamento'}
        size="lg"
      >
        <form onSubmit={handleSubmit} className="space-y-5">
          {formError && (
            <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-sm text-red-300">
              {formError}
            </div>
          )}
          
          {/* Data e Cliente */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Input
              label="Data"
              type="date"
              required
              value={formData.data}
              onChange={(e) => handleDataChange(e.target.value)}
            />
            <div className="md:col-span-2">
              <Input
                label="Cliente"
                placeholder="Nome do cliente"
                required
                value={formData.cliente}
                onChange={(e) => setFormData({ ...formData, cliente: e.target.value })}
              />
            </div>
          </div>

          {/* Valores */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-dark-300 mb-2">
                Valor Proposto <span className="text-red-400">*</span>
              </label>
              <div className="relative">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-dark-400">R$</span>
                <input
                  type="text"
                  className="input pl-12"
                  placeholder="0,00"
                  required
                  value={formData.valor_proposto ? formatNumberBR(formData.valor_proposto) : ''}
                  onChange={(e) => {
                    const masked = maskCurrency(e.target.value)
                    const numValue = parseNumberBR(masked)
                    setFormData({ ...formData, valor_proposto: numValue })
                  }}
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-dark-300 mb-2">
                Valor Fechado
              </label>
              <div className="relative">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-dark-400">R$</span>
                <input
                  type="text"
                  className="input pl-12"
                  placeholder="0,00"
                  value={formData.valor_fechado ? formatNumberBR(formData.valor_fechado) : ''}
                  onChange={(e) => {
                    const masked = maskCurrency(e.target.value)
                    const numValue = parseNumberBR(masked)
                    setFormData({ ...formData, valor_fechado: numValue })
                  }}
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-dark-300 mb-2">
                Entrada
              </label>
              <div className="relative">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-dark-400">R$</span>
                <input
                  type="text"
                  className="input pl-12"
                  placeholder="0,00"
                  value={formData.entrada ? formatNumberBR(formData.entrada) : ''}
                  onChange={(e) => {
                    const masked = maskCurrency(e.target.value)
                    const numValue = parseNumberBR(masked)
                    setFormData({ ...formData, entrada: numValue })
                  }}
                />
              </div>
            </div>
          </div>

          {/* Status e Parcelamento */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Select
              label="Status"
              required
              options={statusOptions}
              value={formData.status}
              onChange={(e) => setFormData({ ...formData, status: e.target.value as 'Fechado' | 'Perdido' | 'Análise' })}
            />
            
            {/* Parcelamento bonito */}
            <div>
              <label className="block text-sm font-medium text-dark-300 mb-2">
                Forma de Pagamento
              </label>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setFormData({ ...formData, parcelado: false, parcelas: 1 })}
                  className={`flex-1 px-4 py-3 rounded-xl text-sm font-medium transition-all ${
                    !formData.parcelado
                      ? 'bg-primary-500/20 text-primary-400 border-2 border-primary-500'
                      : 'bg-dark-800 text-dark-400 border-2 border-dark-700 hover:border-dark-600'
                  }`}
                >
                  À Vista
                </button>
                <button
                  type="button"
                  onClick={() => setFormData({ ...formData, parcelado: true, parcelas: formData.parcelas || 2 })}
                  className={`flex-1 px-4 py-3 rounded-xl text-sm font-medium transition-all ${
                    formData.parcelado
                      ? 'bg-primary-500/20 text-primary-400 border-2 border-primary-500'
                      : 'bg-dark-800 text-dark-400 border-2 border-dark-700 hover:border-dark-600'
                  }`}
                >
                  Parcelado
                </button>
              </div>
            </div>
          </div>

          {/* Número de parcelas - só aparece se parcelado */}
          {formData.parcelado && (
            <div className="animate-fade-in">
              <label className="block text-sm font-medium text-dark-300 mb-2">
                Número de Parcelas
              </label>
              <div className="flex items-center gap-3">
                <input
                  type="range"
                  min="2"
                  max="24"
                  value={formData.parcelas}
                  onChange={(e) => setFormData({ ...formData, parcelas: parseInt(e.target.value) })}
                  className="flex-1 h-2 bg-dark-700 rounded-lg appearance-none cursor-pointer accent-primary-500"
                />
                <span className="w-16 text-center py-2 px-3 rounded-lg bg-dark-800 text-primary-400 font-bold text-lg">
                  {formData.parcelas}x
                </span>
              </div>
              <p className="text-xs text-dark-500 mt-2">
                Valor por parcela: {formatCurrency((formData.valor_fechado || formData.valor_proposto) / formData.parcelas)}
              </p>
            </div>
          )}

          {/* Nota Fiscal */}
          <div>
            <label className="block text-sm font-medium text-dark-300 mb-2">
              Nota Fiscal
            </label>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setFormData({ ...formData, nota_fiscal: true })}
                className={`flex-1 px-4 py-3 rounded-xl text-sm font-medium transition-all ${
                  formData.nota_fiscal
                    ? 'bg-emerald-500/20 text-emerald-400 border-2 border-emerald-500'
                    : 'bg-dark-800 text-dark-400 border-2 border-dark-700 hover:border-dark-600'
                }`}
              >
                ✓ Com Nota Fiscal
              </button>
              <button
                type="button"
                onClick={() => setFormData({ ...formData, nota_fiscal: false })}
                className={`flex-1 px-4 py-3 rounded-xl text-sm font-medium transition-all ${
                  !formData.nota_fiscal
                    ? 'bg-red-500/20 text-red-400 border-2 border-red-500'
                    : 'bg-dark-800 text-dark-400 border-2 border-dark-700 hover:border-dark-600'
                }`}
              >
                ✗ Sem Nota Fiscal
              </button>
            </div>
          </div>

          {/* Observações */}
          <div>
            <label className="block text-sm font-medium text-dark-300 mb-2">
              Observações
            </label>
            <textarea
              placeholder="Digite observações sobre o orçamento..."
              value={formData.observacoes || ''}
              onChange={(e) => setFormData({ ...formData, observacoes: e.target.value })}
              rows={3}
              className="input resize-none"
            />
          </div>
          
          <div className="flex justify-end gap-3 pt-4 border-t border-dark-700">
            <Button type="button" variant="secondary" onClick={closeModal}>
              Cancelar
            </Button>
            <Button type="submit" isLoading={saving}>
              {editingId ? 'Salvar Alterações' : 'Criar Orçamento'}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  )
}
