'use client'

import { useEffect, useState } from 'react'
import { Plus, Edit2, Trash2, Search, HardHat, LinkIcon, Play, Pause, CheckCircle, ChevronDown, ChevronUp, Package } from 'lucide-react'
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
                              <h4 className="text-sm font-semibold text-white mb-3 flex items-center gap-2">
                                <Package className="w-4 h-4 text-primary-400" />
                                Materiais Utilizados
                              </h4>
                              
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
