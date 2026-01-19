'use client'

import { useEffect, useState } from 'react'
import { HardHat, Package, Search, ChevronDown, ChevronUp, Play, Pause, Plus, Minus, Save, Printer } from 'lucide-react'
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
    
    const materiaisUtilizados = materiaisParaImprimir?.filter(m => m.quantidade > 0) || []
    const dataAtual = new Date().toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
    
    const statusLabel = [...statusOptions, { value: 'concluida', label: 'Concluída' }].find(s => s.value === obra.status)?.label || obra.status
    
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
              <div class="info-label">Data do Relatório</div>
              <div class="info-value">${dataAtual}</div>
            </div>
            ${obra.descricao ? `
            <div class="info-item">
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
                      <div className="flex items-center justify-between mb-3">
                        <h4 className="text-sm font-semibold text-dark-300 flex items-center gap-2">
                          <Package className="w-4 h-4 text-primary-400" />
                          Materiais Utilizados
                        </h4>
                        <button
                          onClick={(e) => {
                            e.stopPropagation()
                            handlePrintRelatorio(obra)
                          }}
                          className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm bg-primary-500/10 text-primary-400 hover:bg-primary-500/20 transition-colors"
                          title="Imprimir relatório de materiais"
                        >
                          <Printer className="w-4 h-4" />
                          Imprimir
                        </button>
                      </div>
                      
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
