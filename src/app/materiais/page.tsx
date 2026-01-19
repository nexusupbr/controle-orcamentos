'use client'

import { useEffect, useState } from 'react'
import { Plus, Edit2, Trash2, Search, Package } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Form'
import { Modal } from '@/components/ui/Modal'
import { LoadingSpinner, EmptyState } from '@/components/ui/Common'
import { fetchMateriais, createMaterial, updateMaterial, deleteMaterial, Material } from '@/lib/supabase'

export default function MateriaisPage() {
  const [materiais, setMateriais] = useState<Material[]>([])
  const [filteredMateriais, setFilteredMateriais] = useState<Material[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')
  
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingId, setEditingId] = useState<number | null>(null)
  const [nomeMaterial, setNomeMaterial] = useState('')
  const [formError, setFormError] = useState<string | null>(null)

  useEffect(() => {
    loadData()
  }, [])

  useEffect(() => {
    if (searchTerm) {
      setFilteredMateriais(
        materiais.filter(m => 
          m.nome.toLowerCase().includes(searchTerm.toLowerCase())
        )
      )
    } else {
      setFilteredMateriais(materiais)
    }
  }, [materiais, searchTerm])

  const loadData = async () => {
    try {
      setLoading(true)
      const data = await fetchMateriais()
      setMateriais(data)
    } catch (err) {
      console.error('Erro ao carregar materiais:', err)
    } finally {
      setLoading(false)
    }
  }

  const openModal = (material?: Material) => {
    setFormError(null)
    if (material) {
      setEditingId(material.id)
      setNomeMaterial(material.nome)
    } else {
      setEditingId(null)
      setNomeMaterial('')
    }
    setIsModalOpen(true)
  }

  const closeModal = () => {
    setIsModalOpen(false)
    setEditingId(null)
    setNomeMaterial('')
    setFormError(null)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    setFormError(null)
    
    try {
      if (editingId) {
        await updateMaterial(editingId, { nome: nomeMaterial })
      } else {
        await createMaterial({ nome: nomeMaterial })
      }
      await loadData()
      closeModal()
    } catch (err) {
      console.error('Erro ao salvar:', err)
      const message = err instanceof Error ? err.message : 'Erro ao salvar material'
      setFormError(message)
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (id: number) => {
    if (!confirm('Tem certeza que deseja excluir este material?')) return
    
    try {
      await deleteMaterial(id)
      await loadData()
    } catch (err) {
      console.error('Erro ao excluir:', err)
      alert('Erro ao excluir material. Verifique se ele não está sendo usado em alguma obra.')
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
            Materiais
          </h1>
          <p className="text-dark-400 mt-1">
            Cadastre e gerencie os materiais disponíveis
          </p>
        </div>
        <Button
          onClick={() => openModal()}
          leftIcon={<Plus className="w-5 h-5" />}
        >
          Novo Material
        </Button>
      </div>

      {/* Search */}
      <div className="glass-card p-4">
        <div className="relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-dark-400" />
          <input
            type="text"
            placeholder="Buscar material..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="input pl-12 w-full"
          />
        </div>
      </div>

      {/* Lista de Materiais */}
      <div className="glass-card overflow-hidden">
        {filteredMateriais.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="data-table">
              <thead>
                <tr>
                  <th>ID</th>
                  <th>Nome do Material</th>
                  <th className="text-right">Ações</th>
                </tr>
              </thead>
              <tbody>
                {filteredMateriais.map((material) => (
                  <tr key={material.id} className="group">
                    <td className="text-dark-400 w-20">#{material.id}</td>
                    <td>
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-lg bg-primary-500/10 flex items-center justify-center">
                          <Package className="w-5 h-5 text-primary-400" />
                        </div>
                        <span className="font-medium text-white">{material.nome}</span>
                      </div>
                    </td>
                    <td>
                      <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button
                          onClick={() => openModal(material)}
                          className="p-2 rounded-lg text-dark-400 hover:text-primary-400 hover:bg-primary-500/10 transition-colors"
                          title="Editar"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDelete(material.id)}
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
            icon={<Package className="w-10 h-10 text-dark-500" />}
            title="Nenhum material cadastrado"
            description="Adicione materiais para usar nas obras"
            action={
              <Button onClick={() => openModal()} leftIcon={<Plus className="w-4 h-4" />}>
                Novo Material
              </Button>
            }
          />
        )}
      </div>

      {/* Total */}
      <div className="text-sm text-dark-400 text-center">
        Total: {filteredMateriais.length} {filteredMateriais.length === 1 ? 'material' : 'materiais'}
      </div>

      {/* Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={closeModal}
        title={editingId ? 'Editar Material' : 'Novo Material'}
      >
        <form onSubmit={handleSubmit} className="space-y-5">
          {formError && (
            <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-sm text-red-300">
              {formError}
            </div>
          )}
          
          <Input
            label="Nome do Material"
            placeholder="Ex: Cimento, Areia, Tijolo..."
            required
            value={nomeMaterial}
            onChange={(e) => setNomeMaterial(e.target.value)}
          />
          
          <div className="flex justify-end gap-3 pt-4 border-t border-dark-700">
            <Button type="button" variant="secondary" onClick={closeModal}>
              Cancelar
            </Button>
            <Button type="submit" isLoading={saving}>
              {editingId ? 'Salvar Alterações' : 'Cadastrar Material'}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  )
}
