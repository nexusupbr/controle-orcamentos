'use client'

import { useEffect, useState } from 'react'
import { Plus, Edit2, Trash2, Search, HardHat, LinkIcon, Play, Pause, CheckCircle, ChevronDown, ChevronUp, Package, Printer } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Input, SelectChildren, TextArea } from '@/components/ui/Form'
import { Modal } from '@/components/ui/Modal'
import { LoadingSpinner, EmptyState, Badge } from '@/components/ui/Common'
import { 
  fetchObras, createObra, updateObra, deleteObra, 
  fetchOrcamentos, fetchMateriais, fetchObraMateriaisComDetalhes,
  Obra, ObraInput, Orcamento, Material, ObraMaterial
} from '@/lib/supabase'

const statusOptions = [
  { value: 'em_andamento', label: 'Em Andamento' },
  { value: 'pausada', label: 'Pausada' },
  { value: 'concluida', label: 'Concluída' },
]

const statusConfig: Record<string, { variant: 'success' | 'warning' | 'primary' | 'secondary'; icon: React.ReactNode }> = {
  em_andamento: { variant: 'success', icon: <Play className="w-3 h-3" /> },
  pausada: { variant: 'warning', icon: <Pause className="w-3 h-3" /> },
  concluida: { variant: 'primary', icon: <CheckCircle className="w-3 h-3" /> },
}

// Interface para materiais com detalhes
interface ObraMaterialComDetalhes extends ObraMaterial {
  material?: Material
}

// Interface para obras com materiais carregados
interface ObraComMateriais extends Obra {
  materiaisCarregados?: ObraMaterialComDetalhes[]
  loadingMateriais?: boolean
}

export default function ObrasPage() {
  const [obras, setObras] = useState<ObraComMateriais[]>([])
  const [orcamentos, setOrcamentos] = useState<Orcamento[]>([])
  const [filteredObras, setFilteredObras] = useState<ObraComMateriais[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')
  const [filterStatus, setFilterStatus] = useState<string>('')
  const [expandedObra, setExpandedObra] = useState<number | null>(null)
  const [materiais, setMateriais] = useState<Material[]>([])
  
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingId, setEditingId] = useState<number | null>(null)
  const [formData, setFormData] = useState<ObraInput>({
    orcamento_id: undefined,
    nome: '',
    descricao: '',
    status: 'em_andamento'
  })
  const [formError, setFormError] = useState<string | null>(null)

  useEffect(() => {
    loadData()
  }, [])

  useEffect(() => {
    let filtered = obras
    
    if (searchTerm) {
      filtered = filtered.filter(o => 
        o.nome.toLowerCase().includes(searchTerm.toLowerCase()) ||
        o.descricao?.toLowerCase().includes(searchTerm.toLowerCase())
      )
    }
    
    if (filterStatus) {
      filtered = filtered.filter(o => o.status === filterStatus)
    }
    
    setFilteredObras(filtered)
  }, [obras, searchTerm, filterStatus])

  const loadData = async () => {
    try {
      setLoading(true)
      const [obrasData, orcamentosData, materiaisData] = await Promise.all([
        fetchObras(),
        fetchOrcamentos(),
        fetchMateriais()
      ])
      setObras(obrasData)
      setOrcamentos(orcamentosData)
      setMateriais(materiaisData)
    } catch (err) {
      console.error('Erro ao carregar dados:', err)
    } finally {
      setLoading(false)
    }
  }

  // Carrega materiais ao expandir uma obra
  const handleExpandObra = async (obraId: number) => {
    if (expandedObra === obraId) {
      setExpandedObra(null)
      return
    }
    
    setExpandedObra(obraId)
    
    // Verifica se já carregou
    const obra = obras.find(o => o.id === obraId)
    if (obra?.materiaisCarregados) return
    
    // Marca como carregando
    setObras(prev => prev.map(o => 
      o.id === obraId ? { ...o, loadingMateriais: true } : o
    ))
    
    try {
      const materiaisObra = await fetchObraMateriaisComDetalhes(obraId)
      setObras(prev => prev.map(o => 
        o.id === obraId ? { ...o, materiaisCarregados: materiaisObra, loadingMateriais: false } : o
      ))
    } catch (err) {
      console.error('Erro ao carregar materiais:', err)
      setObras(prev => prev.map(o => 
        o.id === obraId ? { ...o, loadingMateriais: false } : o
      ))
    }
  }

  // Função para imprimir relatório de materiais
  const handlePrintRelatorio = async (obra: ObraComMateriais) => {
    // Carrega materiais se ainda não foram carregados
    let materiaisParaImprimir = obra.materiaisCarregados
    
    if (!materiaisParaImprimir) {
      try {
        materiaisParaImprimir = await fetchObraMateriaisComDetalhes(obra.id)
        setObras(prev => prev.map(o => 
          o.id === obra.id ? { ...o, materiaisCarregados: materiaisParaImprimir, loadingMateriais: false } : o
        ))
      } catch (err) {
        console.error('Erro ao carregar materiais para impressão:', err)
        alert('Erro ao carregar materiais para impressão')
        return
      }
    }
    
    const orcamento = getOrcamentoInfo(obra.orcamento_id)
    const materiaisUtilizados = materiaisParaImprimir?.filter(m => m.quantidade > 0) || []
    const dataAtual = new Date().toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
    
    const statusLabel = statusOptions.find(s => s.value === obra.status)?.label || obra.status
    
    // Cria o HTML para impressão
    const printWindow = window.open('', '_blank')
    if (!printWindow) {
      alert('Popup bloqueado. Permita popups para imprimir.')
      return
    }
    
    printWindow.document.write(`
      <!DOCTYPE html>
      <html lang="pt-BR">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Relatório de Materiais - ${obra.nome}</title>
        <style>
          * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
          }
          body {
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            padding: 20px;
            color: #333;
            line-height: 1.5;
          }
          .header {
            text-align: center;
            border-bottom: 2px solid #333;
            padding-bottom: 15px;
            margin-bottom: 20px;
          }
          .header h1 {
            font-size: 24px;
            margin-bottom: 5px;
            color: #1a1a1a;
          }
          .header p {
            color: #666;
            font-size: 12px;
          }
          .info-section {
            background: #f5f5f5;
            padding: 15px;
            border-radius: 8px;
            margin-bottom: 20px;
          }
          .info-grid {
            display: grid;
            grid-template-columns: repeat(2, 1fr);
            gap: 10px;
          }
          .info-item {
            margin-bottom: 8px;
          }
          .info-label {
            font-weight: 600;
            color: #555;
            font-size: 12px;
            text-transform: uppercase;
          }
          .info-value {
            color: #1a1a1a;
            font-size: 14px;
          }
          .status-badge {
            display: inline-block;
            padding: 4px 12px;
            border-radius: 20px;
            font-size: 12px;
            font-weight: 600;
          }
          .status-em_andamento { background: #dcfce7; color: #166534; }
          .status-pausada { background: #fef3c7; color: #92400e; }
          .status-concluida { background: #dbeafe; color: #1e40af; }
          
          .materials-title {
            font-size: 16px;
            font-weight: 600;
            margin-bottom: 15px;
            padding-bottom: 8px;
            border-bottom: 1px solid #ddd;
          }
          .materials-table {
            width: 100%;
            border-collapse: collapse;
            margin-bottom: 20px;
          }
          .materials-table th,
          .materials-table td {
            padding: 10px 12px;
            text-align: left;
            border-bottom: 1px solid #ddd;
          }
          .materials-table th {
            background: #f0f0f0;
            font-weight: 600;
            font-size: 12px;
            text-transform: uppercase;
            color: #555;
          }
          .materials-table tr:hover {
            background: #f9f9f9;
          }
          .materials-table .qty {
            text-align: center;
            font-weight: 600;
            color: #1a1a1a;
          }
          .materials-table .idx {
            text-align: center;
            color: #888;
            width: 40px;
          }
          .empty-message {
            text-align: center;
            padding: 30px;
            color: #888;
            font-style: italic;
          }
          .footer {
            margin-top: 30px;
            padding-top: 15px;
            border-top: 1px solid #ddd;
            display: flex;
            justify-content: space-between;
            font-size: 11px;
            color: #888;
          }
          .signature-area {
            margin-top: 50px;
            display: flex;
            justify-content: space-between;
          }
          .signature-box {
            text-align: center;
            width: 200px;
          }
          .signature-line {
            border-top: 1px solid #333;
            margin-top: 50px;
            padding-top: 5px;
            font-size: 12px;
          }
          .total-items {
            text-align: right;
            font-size: 14px;
            margin-top: 10px;
            font-weight: 600;
          }
          @media print {
            body { padding: 10px; }
            .no-print { display: none; }
          }
        </style>
      </head>
      <body>
        <div class="header">
          <h1>📋 Relatório de Materiais</h1>
          <p>Checklist de materiais utilizados na obra</p>
        </div>
        
        <div class="info-section">
          <div class="info-grid">
            <div class="info-item">
              <div class="info-label">Nome da Obra</div>
              <div class="info-value">${obra.nome}</div>
            </div>
            <div class="info-item">
              <div class="info-label">Status</div>
              <div class="info-value">
                <span class="status-badge status-${obra.status}">${statusLabel}</span>
              </div>
            </div>
            <div class="info-item">
              <div class="info-label">Cliente / Orçamento</div>
              <div class="info-value">${orcamento ? `${orcamento.cliente} (Orç. #${orcamento.id})` : 'Não vinculado'}</div>
            </div>
            <div class="info-item">
              <div class="info-label">Data do Relatório</div>
              <div class="info-value">${dataAtual}</div>
            </div>
            ${obra.descricao ? `
            <div class="info-item" style="grid-column: span 2;">
              <div class="info-label">Descrição</div>
              <div class="info-value">${obra.descricao}</div>
            </div>
            ` : ''}
          </div>
        </div>
        
        <div class="materials-title">📦 Materiais Utilizados</div>
        
        ${materiaisUtilizados.length > 0 ? `
          <table class="materials-table">
            <thead>
              <tr>
                <th class="idx">#</th>
                <th>Material</th>
                <th class="qty">Quantidade</th>
                <th>Conferido</th>
              </tr>
            </thead>
            <tbody>
              ${materiaisUtilizados.map((m, index) => `
                <tr>
                  <td class="idx">${index + 1}</td>
                  <td>${m.material?.nome || `Material #${m.material_id}`}</td>
                  <td class="qty">${m.quantidade} un</td>
                  <td style="width: 80px;">☐</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
          <div class="total-items">
            Total: ${materiaisUtilizados.length} ${materiaisUtilizados.length === 1 ? 'item' : 'itens'} | 
            ${materiaisUtilizados.reduce((acc, m) => acc + m.quantidade, 0)} unidades
          </div>
        ` : `
          <div class="empty-message">
            Nenhum material registrado para esta obra
          </div>
        `}
        
        <div class="signature-area">
          <div class="signature-box">
            <div class="signature-line">Responsável pela Obra</div>
          </div>
          <div class="signature-box">
            <div class="signature-line">Conferente</div>
          </div>
        </div>
        
        <div class="footer">
          <span>Obra #${obra.id}</span>
          <span>Gerado em: ${dataAtual}</span>
        </div>
        
        <script>
          window.onload = function() {
            window.print();
          }
        </script>
      </body>
      </html>
    `)
    
    printWindow.document.close()
  }

  const getOrcamentoInfo = (orcamentoId: number | null) => {
    if (!orcamentoId) return null
    return orcamentos.find(o => o.id === orcamentoId)
  }

  const openModal = (obra?: Obra) => {
    setFormError(null)
    if (obra) {
      setEditingId(obra.id)
      setFormData({
        orcamento_id: obra.orcamento_id,
        nome: obra.nome,
        descricao: obra.descricao || '',
        status: obra.status
      })
    } else {
      setEditingId(null)
      setFormData({
        orcamento_id: undefined,
        nome: '',
        descricao: '',
        status: 'em_andamento'
      })
    }
    setIsModalOpen(true)
  }

  const closeModal = () => {
    setIsModalOpen(false)
    setEditingId(null)
    setFormData({ orcamento_id: undefined, nome: '', descricao: '', status: 'em_andamento' })
    setFormError(null)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    setFormError(null)
    
    try {
      if (editingId) {
        await updateObra(editingId, formData)
      } else {
        await createObra(formData)
      }
      await loadData()
      closeModal()
    } catch (err) {
      console.error('Erro ao salvar:', err)
      const message = err instanceof Error ? err.message : 'Erro ao salvar obra'
      setFormError(message)
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (id: number) => {
    if (!confirm('Tem certeza que deseja excluir esta obra? Os registros de materiais associados também serão excluídos.')) return
    
    try {
      await deleteObra(id)
      await loadData()
    } catch (err) {
      console.error('Erro ao excluir:', err)
      alert('Erro ao excluir obra.')
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
      {/* Page Header */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div>
          <h1 className="text-2xl lg:text-3xl font-bold font-heading text-white">
            Obras
          </h1>
          <p className="text-dark-400 mt-1">
            Gerencie as obras vinculadas aos orçamentos
          </p>
        </div>
        <Button
          onClick={() => openModal()}
          leftIcon={<Plus className="w-5 h-5" />}
        >
          Nova Obra
        </Button>
      </div>

      {/* Filters */}
      <div className="glass-card p-4">
        <div className="flex flex-col md:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-dark-400" />
            <input
              type="text"
              placeholder="Buscar obra..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="input pl-12 w-full"
            />
          </div>
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="input w-full md:w-48"
          >
            <option value="">Todos os Status</option>
            {statusOptions.map(opt => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Lista de Obras */}
      <div className="glass-card overflow-hidden">
        {filteredObras.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="data-table">
              <thead>
                <tr>
                  <th className="w-10"></th>
                  <th>ID</th>
                  <th>Nome da Obra</th>
                  <th>Orçamento Vinculado</th>
                  <th>Status</th>
                  <th>Materiais</th>
                  <th className="text-right">Ações</th>
                </tr>
              </thead>
              <tbody>
                {filteredObras.map((obra) => {
                  const orcamento = getOrcamentoInfo(obra.orcamento_id)
                  const statusInfo = statusConfig[obra.status] || statusConfig.em_andamento
                  const isExpanded = expandedObra === obra.id
                  const totalMateriais = obra.materiaisCarregados?.filter(m => m.quantidade > 0).length || 0
                  
                  return (
                    <>
                      <tr key={obra.id} className="group">
                        <td className="w-10">
                          <button
                            onClick={() => handleExpandObra(obra.id)}
                            className="p-1.5 rounded-lg text-dark-400 hover:text-primary-400 hover:bg-primary-500/10 transition-colors"
                            title={isExpanded ? 'Ocultar materiais' : 'Ver materiais'}
                          >
                            {isExpanded ? (
                              <ChevronUp className="w-4 h-4" />
                            ) : (
                              <ChevronDown className="w-4 h-4" />
                            )}
                          </button>
                        </td>
                        <td className="text-dark-400 w-20">#{obra.id}</td>
                        <td>
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-lg bg-accent-500/10 flex items-center justify-center">
                              <HardHat className="w-5 h-5 text-accent-400" />
                            </div>
                            <div>
                              <span className="font-medium text-white block">{obra.nome}</span>
                              {obra.descricao && (
                                <span className="text-xs text-dark-400">{obra.descricao.substring(0, 50)}{obra.descricao.length > 50 ? '...' : ''}</span>
                              )}
                            </div>
                          </div>
                        </td>
                        <td>
                          {orcamento ? (
                            <div className="flex items-center gap-2 text-sm">
                              <LinkIcon className="w-4 h-4 text-primary-400" />
                              <span className="text-white">{orcamento.cliente}</span>
                            </div>
                          ) : (
                            <span className="text-dark-500 text-sm">Não vinculado</span>
                          )}
                        </td>
                        <td>
                          <Badge variant={statusInfo.variant}>
                            <span className="flex items-center gap-1.5">
                              {statusInfo.icon}
                              {statusOptions.find(s => s.value === obra.status)?.label || obra.status}
                            </span>
                          </Badge>
                        </td>
                        <td>
                          <div className="flex items-center gap-2">
                            <Package className="w-4 h-4 text-dark-400" />
                            <span className="text-sm text-dark-300">
                              {obra.materiaisCarregados ? (
                                `${totalMateriais} ${totalMateriais === 1 ? 'item' : 'itens'}`
                              ) : (
                                <span className="text-dark-500">Clique para ver</span>
                              )}
                            </span>
                          </div>
                        </td>
                        <td>
                          <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                            <button
                              onClick={() => openModal(obra)}
                              className="p-2 rounded-lg text-dark-400 hover:text-primary-400 hover:bg-primary-500/10 transition-colors"
                              title="Editar"
                            >
                              <Edit2 className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => handleDelete(obra.id)}
                              className="p-2 rounded-lg text-dark-400 hover:text-red-400 hover:bg-red-500/10 transition-colors"
                              title="Excluir"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                      
                      {/* Linha expandida com materiais */}
                      {isExpanded && (
                        <tr key={`${obra.id}-materiais`} className="bg-dark-800/50">
                          <td colSpan={7} className="p-0">
                            <div className="p-4 border-t border-dark-700">
                              <div className="flex items-center justify-between mb-3">
                                <h4 className="text-sm font-semibold text-white flex items-center gap-2">
                                  <Package className="w-4 h-4 text-primary-400" />
                                  Materiais Utilizados
                                </h4>
                                <button
                                  onClick={() => handlePrintRelatorio(obra)}
                                  className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm bg-primary-500/10 text-primary-400 hover:bg-primary-500/20 transition-colors"
                                  title="Imprimir relatório de materiais"
                                >
                                  <Printer className="w-4 h-4" />
                                  Imprimir Relatório
                                </button>
                              </div>
                              
                              {obra.loadingMateriais ? (
                                <div className="flex items-center justify-center py-4">
                                  <LoadingSpinner size="sm" />
                                  <span className="ml-2 text-sm text-dark-400">Carregando materiais...</span>
                                </div>
                              ) : obra.materiaisCarregados && obra.materiaisCarregados.filter(m => m.quantidade > 0).length > 0 ? (
                                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
                                  {obra.materiaisCarregados
                                    .filter(m => m.quantidade > 0)
                                    .map(m => (
                                      <div 
                                        key={m.material_id} 
                                        className="flex items-center justify-between p-3 rounded-lg bg-dark-700/50 border border-dark-600"
                                      >
                                        <span className="text-sm text-white">{m.material?.nome || `Material #${m.material_id}`}</span>
                                        <span className="text-sm font-semibold text-primary-400 ml-2">
                                          {m.quantidade} un
                                        </span>
                                      </div>
                                    ))
                                  }
                                </div>
                              ) : (
                                <div className="text-center py-4 text-dark-500 text-sm">
                                  Nenhum material registrado para esta obra
                                </div>
                              )}
                            </div>
                          </td>
                        </tr>
                      )}
                    </>
                  )
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <EmptyState
            icon={<HardHat className="w-10 h-10 text-dark-500" />}
            title="Nenhuma obra cadastrada"
            description="Adicione obras para gerenciar materiais"
            action={
              <Button onClick={() => openModal()} leftIcon={<Plus className="w-4 h-4" />}>
                Nova Obra
              </Button>
            }
          />
        )}
      </div>

      {/* Total */}
      <div className="text-sm text-dark-400 text-center">
        Total: {filteredObras.length} {filteredObras.length === 1 ? 'obra' : 'obras'}
      </div>

      {/* Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={closeModal}
        title={editingId ? 'Editar Obra' : 'Nova Obra'}
        size="lg"
      >
        <form onSubmit={handleSubmit} className="space-y-5">
          {formError && (
            <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-sm text-red-300">
              {formError}
            </div>
          )}
          
          <Input
            label="Nome da Obra"
            placeholder="Ex: Reforma Apartamento 302"
            required
            value={formData.nome}
            onChange={(e) => setFormData({...formData, nome: e.target.value})}
          />
          
          <SelectChildren
            label="Orçamento Vinculado"
            value={formData.orcamento_id?.toString() || ''}
            onChange={(e) => setFormData({...formData, orcamento_id: e.target.value ? Number(e.target.value) : undefined})}
          >
            <option value="">Selecione um orçamento (opcional)</option>
            {orcamentos.map(orc => (
              <option key={orc.id} value={orc.id}>
                #{orc.id} - {orc.cliente}
              </option>
            ))}
          </SelectChildren>
          
          <SelectChildren
            label="Status"
            required
            value={formData.status}
            onChange={(e) => setFormData({...formData, status: e.target.value as 'em_andamento' | 'pausada' | 'concluida'})}
          >
            {statusOptions.map(opt => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
          </SelectChildren>
          
          <TextArea
            label="Descrição"
            placeholder="Detalhes sobre a obra..."
            value={formData.descricao || ''}
            onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setFormData({...formData, descricao: e.target.value})}
            rows={3}
          />
          
          <div className="flex justify-end gap-3 pt-4 border-t border-dark-700">
            <Button type="button" variant="secondary" onClick={closeModal}>
              Cancelar
            </Button>
            <Button type="submit" isLoading={saving}>
              {editingId ? 'Salvar Alterações' : 'Cadastrar Obra'}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  )
}
