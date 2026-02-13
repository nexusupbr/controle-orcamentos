'use client'

import { useEffect, useState } from 'react'
import { HardHat, Package, Search, Plus, Minus, Save, ChevronDown, ChevronUp, LogIn, User, Lock, AlertCircle } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Modal } from '@/components/ui/Modal'
import { LoadingSpinner, EmptyState, Badge } from '@/components/ui/Common'
import { 
  fetchObrasEmAndamento, fetchMateriais, 
  fetchObraMateriaisComDetalhes, upsertObraMaterial,
  Obra, Material, ObraMaterial, loginUsuario
} from '@/lib/supabase'
import { useAuth } from '@/contexts/AuthContext'
import Image from 'next/image'
import { getAssetPath } from '@/lib/utils'

export default function FuncionarioPage() {
  const { usuario, loading: authLoading, authEnabled } = useAuth()

  // Estado do login inline
  const [loginEmail, setLoginEmail] = useState('')
  const [loginSenha, setLoginSenha] = useState('')
  const [loginError, setLoginError] = useState('')
  const [loginLoading, setLoginLoading] = useState(false)
  const { login } = useAuth()

  const [obras, setObras] = useState<Obra[]>([])
  const [materiais, setMateriais] = useState<Material[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [expandedObra, setExpandedObra] = useState<number | null>(null)
  
  // Modal de materiais
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [selectedObra, setSelectedObra] = useState<Obra | null>(null)
  const [obraMateriais, setObraMateriais] = useState<ObraMaterial[]>([])
  const [loadingMateriais, setLoadingMateriais] = useState(false)
  const [saving, setSaving] = useState(false)
  const [quantidades, setQuantidades] = useState<Record<number, number>>({})

  const isLoggedIn = authEnabled && usuario !== null

  useEffect(() => {
    if (isLoggedIn) {
      loadData()
    }
  }, [isLoggedIn])

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoginError('')
    setLoginLoading(true)

    try {
      const success = await login(loginEmail, loginSenha)
      if (!success) {
        setLoginError('Email ou senha inválidos')
      }
    } catch {
      setLoginError('Erro ao fazer login. Tente novamente.')
    } finally {
      setLoginLoading(false)
    }
  }

  const loadData = async () => {
    try {
      setLoading(true)
      const [obrasData, materiaisData] = await Promise.all([
        fetchObrasEmAndamento(),
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

  const filteredObras = obras.filter(o => 
    o.nome.toLowerCase().includes(searchTerm.toLowerCase()) ||
    o.descricao?.toLowerCase().includes(searchTerm.toLowerCase())
  )

  const openMateriaisModal = async (obra: Obra) => {
    setSelectedObra(obra)
    setIsModalOpen(true)
    setLoadingMateriais(true)
    
    try {
      const materiaisObra = await fetchObraMateriaisComDetalhes(obra.id)
      setObraMateriais(materiaisObra)
      
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
      setLoadingMateriais(false)
    }
  }

  const closeModal = () => {
    setIsModalOpen(false)
    setSelectedObra(null)
    setObraMateriais([])
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
      closeModal()
    } catch (err) {
      console.error('Erro ao salvar:', err)
      alert('Erro ao salvar quantidades')
    } finally {
      setSaving(false)
    }
  }

  if (authLoading) {
    return (
      <div className="flex items-center justify-center h-[60vh]">
        <LoadingSpinner size="lg" />
      </div>
    )
  }

  // Se não está logado, mostra tela de login
  if (!isLoggedIn) {
    return (
      <div className="min-h-[80vh] flex items-center justify-center p-4">
        <div className="w-full max-w-md">
          {/* Header */}
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-20 h-20 rounded-2xl overflow-hidden shadow-glow mb-4">
              <Image
                src={getAssetPath('/images/logo.jpeg')}
                alt="Logo"
                width={80}
                height={80}
                className="w-full h-full object-cover"
              />
            </div>
            <h1 className="text-2xl font-bold text-white font-heading">Área do Funcionário</h1>
            <p className="text-dark-400 mt-1">Faça login para acessar as obras</p>
          </div>

          {/* Form */}
          <div className="glass-card p-8">
            <form onSubmit={handleLogin} className="space-y-6">
              {loginError && (
                <div className="flex items-center gap-2 p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
                  <AlertCircle className="w-4 h-4 flex-shrink-0" />
                  {loginError}
                </div>
              )}

              <div className="space-y-4">
                <div className="relative">
                  <User className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-dark-400" />
                  <input
                    type="email"
                    placeholder="Email"
                    value={loginEmail}
                    onChange={(e) => setLoginEmail(e.target.value)}
                    required
                    className="input pl-12 w-full"
                  />
                </div>

                <div className="relative">
                  <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-dark-400" />
                  <input
                    type="password"
                    placeholder="Senha"
                    value={loginSenha}
                    onChange={(e) => setLoginSenha(e.target.value)}
                    required
                    className="input pl-12 w-full"
                  />
                </div>
              </div>

              <Button
                type="submit"
                className="w-full"
                isLoading={loginLoading}
                leftIcon={<LogIn className="w-5 h-5" />}
              >
                Entrar
              </Button>
            </form>
          </div>
        </div>
      </div>
    )
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
          Obras em Andamento
        </h1>
        <p className="text-dark-400 mt-1">
          Selecione uma obra para registrar materiais utilizados
        </p>
      </div>

      {/* Search */}
      <div className="glass-card p-4">
        <div className="relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-dark-400" />
          <input
            type="text"
            placeholder="Buscar obra..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="input pl-12 w-full"
          />
        </div>
      </div>

      {/* Lista de Obras */}
      {filteredObras.length > 0 ? (
        <div className="space-y-4">
          {filteredObras.map((obra) => (
            <div key={obra.id} className="glass-card overflow-hidden">
              <div 
                className="p-4 flex items-center justify-between cursor-pointer hover:bg-dark-700/30 transition-colors"
                onClick={() => setExpandedObra(expandedObra === obra.id ? null : obra.id)}
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
                  <Badge variant="success">Em Andamento</Badge>
                  {expandedObra === obra.id ? (
                    <ChevronUp className="w-5 h-5 text-dark-400" />
                  ) : (
                    <ChevronDown className="w-5 h-5 text-dark-400" />
                  )}
                </div>
              </div>
              
              {expandedObra === obra.id && (
                <div className="px-4 pb-4 pt-2 border-t border-dark-700">
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
          ))}
        </div>
      ) : (
        <div className="glass-card">
          <EmptyState
            icon={<HardHat className="w-10 h-10 text-dark-500" />}
            title="Nenhuma obra em andamento"
            description="Não há obras ativas no momento"
          />
        </div>
      )}

      {/* Modal de Materiais */}
      <Modal
        isOpen={isModalOpen}
        onClose={closeModal}
        title={`Materiais - ${selectedObra?.nome || ''}`}
        size="lg"
      >
        {loadingMateriais ? (
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
                description="Solicite ao administrador para cadastrar materiais"
              />
            )}
          </div>
        )}
      </Modal>
    </div>
  )
}
