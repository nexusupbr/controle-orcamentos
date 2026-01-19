'use client'

import { useEffect, useState } from 'react'
import { HardHat, Package, Search, ChevronDown, ChevronUp, Play, Pause, Plus, Minus, Save } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Modal } from '@/components/ui/Modal'
import { LoadingSpinner, EmptyState, Badge } from '@/components/ui/Common'
import { 
  fetchObras, fetchMateriais, 
  fetchObraMateriaisComDetalhes, upsertObraMaterial,
  Obra, Material, ObraMaterial
} from '@/lib/supabase'

// Status disponíveis para funcionário (sem concluída)
const statusOptions = [
  { value: 'em_andamento', label: 'Em Andamento' },
  { value: 'pausada', label: 'Pausada' },
]

const statusConfig: Record<string, { variant: 'success' | 'warning' | 'primary' | 'secondary'; icon: React.ReactNode }> = {
  em_andamento: { variant: 'success', icon: <Play className="w-3 h-3" /> },
  pausada: { variant: 'warning', icon: <Pause className="w-3 h-3" /> },
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
  const [materiais, setMateriais] = useState<Material[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [filterStatus, setFilterStatus] = useState<string>('')
  const [expandedObra, setExpandedObra] = useState<number | null>(null)
  
  // Modal de materiais
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [selectedObra, setSelectedObra] = useState<Obra | null>(null)
  const [loadingModal, setLoadingModal] = useState(false)
  const [saving, setSaving] = useState(false)
  const [quantidades, setQuantidades] = useState<Record<number, number>>({})

  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    try {
      setLoading(true)
      const [obrasData, materiaisData] = await Promise.all([
        fetchObras(),
        fetchMateriais()
      ])
      setObras(obrasData)
      setMateriais(materiaisData)
    } catch (err) {
      console.error('Erro ao carregar dados:', err)
    } finally {
      setLoading(false)
    }
  }

  // Filtra obras (não mostra concluídas para funcionários)
  const filteredObras = obras.filter(o => {
    // Obras concluídas não aparecem para funcionários
    if (o.status === 'concluida') return false
    
    const matchSearch = o.nome.toLowerCase().includes(searchTerm.toLowerCase()) ||
      o.descricao?.toLowerCase().includes(searchTerm.toLowerCase())
    const matchStatus = !filterStatus || o.status === filterStatus
    return matchSearch && matchStatus
  })

  // Carrega materiais ao expandir
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

  // Abre modal para editar materiais
  const openMateriaisModal = async (obra: Obra) => {
    setSelectedObra(obra)
    setIsModalOpen(true)
    setLoadingModal(true)
    
    try {
      const materiaisObra = await fetchObraMateriaisComDetalhes(obra.id)
      
      // Inicializa quantidades
      const qtds: Record<number, number> = {}
      materiaisObra.forEach(m => {
        qtds[m.material_id] = m.quantidade
      })
      // Adiciona materiais que ainda não estão na obra
      materiais.forEach(m => {
        if (!(m.id in qtds)) {
          qtds[m.id] = 0
        }
      })
      setQuantidades(qtds)
    } catch (err) {
      console.error('Erro ao carregar materiais da obra:', err)
    } finally {
      setLoadingModal(false)
    }
  }

  const closeModal = () => {
    setIsModalOpen(false)
    setSelectedObra(null)
    setQuantidades({})
  }

  const handleQuantidadeChange = (materialId: number, delta: number) => {
    setQuantidades(prev => ({
      ...prev,
      [materialId]: Math.max(0, (prev[materialId] || 0) + delta)
    }))
  }

  const handleQuantidadeInput = (materialId: number, value: string) => {
    const num = parseInt(value) || 0
    setQuantidades(prev => ({
      ...prev,
      [materialId]: Math.max(0, num)
    }))
  }

  const handleSave = async () => {
    if (!selectedObra) return
    
    setSaving(true)
    try {
      // Salva todas as quantidades
      const promises = Object.entries(quantidades).map(([materialId, quantidade]) => 
        upsertObraMaterial({
          obra_id: selectedObra.id,
          material_id: Number(materialId),
          quantidade
        })
      )
      await Promise.all(promises)
      
      // Recarrega materiais da obra expandida
      const materiaisObra = await fetchObraMateriaisComDetalhes(selectedObra.id)
      setObras(prev => prev.map(o => 
        o.id === selectedObra.id ? { ...o, materiaisCarregados: materiaisObra } : o
      ))
      
      closeModal()
    } catch (err) {
      console.error('Erro ao salvar:', err)
      alert('Erro ao salvar quantidades')
    } finally {
      setSaving(false)
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
      <div>
        <h1 className="text-2xl lg:text-3xl font-bold font-heading text-white">
          Obras
        </h1>
        <p className="text-dark-400 mt-1">
          Visualize as obras e os materiais utilizados
        </p>
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
      {filteredObras.length > 0 ? (
        <div className="space-y-4">
          {filteredObras.map((obra) => {
            const statusInfo = statusConfig[obra.status] || statusConfig.em_andamento
            const isExpanded = expandedObra === obra.id
            const materiaisUtilizados = obra.materiaisCarregados?.filter(m => m.quantidade > 0) || []
            
            return (
              <div key={obra.id} className="glass-card overflow-hidden">
                {/* Header da Obra */}
                <div 
                  className="p-4 flex items-center justify-between cursor-pointer hover:bg-dark-700/30 transition-colors"
                  onClick={() => handleExpandObra(obra.id)}
                >
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-xl bg-accent-500/10 flex items-center justify-center">
                      <HardHat className="w-6 h-6 text-accent-400" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-white">{obra.nome}</h3>
                      {obra.descricao && (
                        <p className="text-sm text-dark-400 mt-0.5">{obra.descricao}</p>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <Badge variant={statusInfo.variant}>
                      <span className="flex items-center gap-1.5">
                        {statusInfo.icon}
                        {statusOptions.find(s => s.value === obra.status)?.label || obra.status}
                      </span>
                    </Badge>
                    {isExpanded ? (
                      <ChevronUp className="w-5 h-5 text-dark-400" />
                    ) : (
                      <ChevronDown className="w-5 h-5 text-dark-400" />
                    )}
                  </div>
                </div>
                
                {/* Conteúdo Expandido */}
                {isExpanded && (
                  <div className="px-4 pb-4 pt-2 border-t border-dark-700">
                    {/* Lista de Materiais */}
                    <div className="mb-4">
                      <h4 className="text-sm font-semibold text-dark-300 mb-3 flex items-center gap-2">
                        <Package className="w-4 h-4 text-primary-400" />
                        Materiais Utilizados
                      </h4>
                      
                      {obra.loadingMateriais ? (
                        <div className="flex items-center justify-center py-6">
                          <LoadingSpinner size="sm" />
                        </div>
                      ) : materiaisUtilizados.length > 0 ? (
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                          {materiaisUtilizados.map((m) => (
                            <div 
                              key={m.id}
                              className="flex items-center justify-between p-3 rounded-lg bg-dark-700/50 border border-dark-600"
                            >
                              <div className="flex items-center gap-2">
                                <div className="w-8 h-8 rounded-lg bg-primary-500/10 flex items-center justify-center">
                                  <Package className="w-4 h-4 text-primary-400" />
                                </div>
                                <span className="text-sm text-white">{m.material?.nome || `Material #${m.material_id}`}</span>
                              </div>
                              <span className="text-sm font-semibold text-primary-400 bg-primary-500/10 px-2 py-1 rounded">
                                {m.quantidade}x
                              </span>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p className="text-sm text-dark-500 py-4 text-center bg-dark-800/30 rounded-lg">
                          Nenhum material registrado nesta obra
                        </p>
                      )}
                    </div>
                    
                    {/* Botão para editar materiais */}
                    <Button
                      onClick={(e) => {
                        e.stopPropagation()
                        openMateriaisModal(obra)
                      }}
                      leftIcon={<Package className="w-4 h-4" />}
                      className="w-full sm:w-auto"
                    >
                      Registrar Materiais
                    </Button>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      ) : (
        <div className="glass-card">
          <EmptyState
            icon={<HardHat className="w-10 h-10 text-dark-500" />}
            title="Nenhuma obra encontrada"
            description={searchTerm || filterStatus ? "Tente ajustar os filtros" : "Não há obras cadastradas"}
          />
        </div>
      )}

      {/* Total */}
      <div className="text-sm text-dark-400 text-center">
        Total: {filteredObras.length} {filteredObras.length === 1 ? 'obra' : 'obras'}
      </div>

      {/* Modal de Materiais */}
      <Modal
        isOpen={isModalOpen}
        onClose={closeModal}
        title={`Materiais - ${selectedObra?.nome || ''}`}
        size="lg"
      >
        {loadingModal ? (
          <div className="flex items-center justify-center py-12">
            <LoadingSpinner size="lg" />
          </div>
        ) : (
          <div className="space-y-4">
            {materiais.length > 0 ? (
              <>
                <div className="max-h-96 overflow-y-auto space-y-3 pr-2">
                  {materiais.map((material) => (
                    <div 
                      key={material.id}
                      className="flex items-center justify-between p-3 rounded-lg bg-dark-700/50 border border-dark-600"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-lg bg-primary-500/10 flex items-center justify-center">
                          <Package className="w-5 h-5 text-primary-400" />
                        </div>
                        <span className="font-medium text-white">{material.nome}</span>
                      </div>
                      
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => handleQuantidadeChange(material.id, -1)}
                          className="w-8 h-8 rounded-lg bg-dark-600 hover:bg-dark-500 flex items-center justify-center text-white transition-colors"
                        >
                          <Minus className="w-4 h-4" />
                        </button>
                        
                        <input
                          type="number"
                          min="0"
                          value={quantidades[material.id] || 0}
                          onChange={(e) => handleQuantidadeInput(material.id, e.target.value)}
                          className="w-16 h-8 text-center rounded-lg bg-dark-600 border border-dark-500 text-white text-sm focus:outline-none focus:border-primary-500"
                        />
                        
                        <button
                          type="button"
                          onClick={() => handleQuantidadeChange(material.id, 1)}
                          className="w-8 h-8 rounded-lg bg-dark-600 hover:bg-dark-500 flex items-center justify-center text-white transition-colors"
                        >
                          <Plus className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
                
                <div className="flex justify-end gap-3 pt-4 border-t border-dark-700">
                  <Button type="button" variant="secondary" onClick={closeModal}>
                    Cancelar
                  </Button>
                  <Button 
                    onClick={handleSave} 
                    isLoading={saving}
                    leftIcon={<Save className="w-4 h-4" />}
                  >
                    Salvar Quantidades
                  </Button>
                </div>
              </>
            ) : (
              <EmptyState
                icon={<Package className="w-10 h-10 text-dark-500" />}
                title="Nenhum material cadastrado"
                description="Acesse a área administrativa para cadastrar materiais"
              />
            )}
          </div>
        )}
      </Modal>
    </div>
  )
}
