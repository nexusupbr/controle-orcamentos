'use client'

import { useEffect, useState } from 'react'
import { Plus, Edit2, Trash2, Tags, CheckCircle, XCircle, AlertTriangle } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Modal } from '@/components/ui/Modal'
import { LoadingSpinner, EmptyState, Badge } from '@/components/ui/Common'
import { 
  CategoriaFinanceira,
  fetchCategoriasFinanceiras,
  createCategoriaFinanceira,
  updateCategoriaFinanceira,
  deleteCategoriaFinanceira
} from '@/lib/database'

type TipoCategoria = 'despesa' | 'receita' | 'aplicacao'

const tiposOptions: { value: TipoCategoria; label: string; color: string }[] = [
  { value: 'despesa', label: 'Despesa', color: 'text-red-400' },
  { value: 'receita', label: 'Receita', color: 'text-green-400' },
  { value: 'aplicacao', label: 'Aplicação', color: 'text-blue-400' },
]

export default function CategoriasFinanceirasPage() {
  const [categorias, setCategorias] = useState<CategoriaFinanceira[]>([])
  const [loading, setLoading] = useState(true)
  const [filtroTipo, setFiltroTipo] = useState<TipoCategoria | 'todos'>('todos')
  
  // Modal de criação/edição
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingCategoria, setEditingCategoria] = useState<CategoriaFinanceira | null>(null)
  const [formNome, setFormNome] = useState('')
  const [formTipo, setFormTipo] = useState<TipoCategoria>('despesa')
  const [formAtivo, setFormAtivo] = useState(true)
  const [saving, setSaving] = useState(false)
  
  // Modal de exclusão
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false)
  const [deletingCategoria, setDeletingCategoria] = useState<CategoriaFinanceira | null>(null)
  const [deleting, setDeleting] = useState(false)
  const [deleteResult, setDeleteResult] = useState<{ success: boolean; message: string } | null>(null)

  useEffect(() => {
    loadCategorias()
  }, [])

  const loadCategorias = async () => {
    try {
      setLoading(true)
      const data = await fetchCategoriasFinanceiras()
      setCategorias(data)
    } catch (err) {
      console.error('Erro ao carregar categorias:', err)
    } finally {
      setLoading(false)
    }
  }

  const handleOpenModal = (categoria?: CategoriaFinanceira) => {
    if (categoria) {
      setEditingCategoria(categoria)
      setFormNome(categoria.nome)
      setFormTipo(categoria.tipo as TipoCategoria)
      setFormAtivo(categoria.ativo)
    } else {
      setEditingCategoria(null)
      setFormNome('')
      setFormTipo('despesa')
      setFormAtivo(true)
    }
    setIsModalOpen(true)
  }

  const handleCloseModal = () => {
    setIsModalOpen(false)
    setEditingCategoria(null)
    setFormNome('')
    setFormTipo('despesa')
    setFormAtivo(true)
  }

  const handleSave = async () => {
    if (!formNome.trim()) {
      alert('Nome é obrigatório')
      return
    }

    setSaving(true)
    try {
      if (editingCategoria) {
        await updateCategoriaFinanceira(editingCategoria.id, {
          nome: formNome.trim(),
          tipo: formTipo,
          ativo: formAtivo
        })
      } else {
        await createCategoriaFinanceira({
          nome: formNome.trim(),
          tipo: formTipo,
          ativo: formAtivo
        })
      }
      await loadCategorias()
      handleCloseModal()
    } catch (err) {
      console.error('Erro ao salvar:', err)
      alert('Erro ao salvar categoria: ' + (err instanceof Error ? err.message : 'Erro desconhecido'))
    } finally {
      setSaving(false)
    }
  }

  const handleOpenDeleteModal = (categoria: CategoriaFinanceira) => {
    setDeletingCategoria(categoria)
    setDeleteResult(null)
    setIsDeleteModalOpen(true)
  }

  const handleDelete = async () => {
    if (!deletingCategoria) return

    setDeleting(true)
    try {
      const result = await deleteCategoriaFinanceira(deletingCategoria.id)
      setDeleteResult(result)
      
      if (result.success) {
        setTimeout(async () => {
          await loadCategorias()
          setIsDeleteModalOpen(false)
          setDeletingCategoria(null)
          setDeleteResult(null)
        }, 1500)
      }
    } catch (err) {
      setDeleteResult({ 
        success: false, 
        message: 'Erro ao excluir: ' + (err instanceof Error ? err.message : 'Erro desconhecido') 
      })
    } finally {
      setDeleting(false)
    }
  }

  // Filtrar categorias
  const categoriasFiltradas = filtroTipo === 'todos' 
    ? categorias 
    : categorias.filter(c => c.tipo === filtroTipo)

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
            Categorias Financeiras
          </h1>
          <p className="text-dark-400 mt-1">
            Gerencie as categorias de receitas e despesas
          </p>
        </div>
        <Button onClick={() => handleOpenModal()} leftIcon={<Plus className="w-4 h-4" />}>
          Nova Categoria
        </Button>
      </div>

      {/* Filtros */}
      <div className="glass-card p-4">
        <div className="flex items-center gap-4">
          <span className="text-dark-400 text-sm">Filtrar por tipo:</span>
          <div className="flex gap-2">
            <button
              onClick={() => setFiltroTipo('todos')}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                filtroTipo === 'todos'
                  ? 'bg-primary-500 text-white'
                  : 'bg-dark-700 text-dark-300 hover:bg-dark-600'
              }`}
            >
              Todos ({categorias.length})
            </button>
            {tiposOptions.map(tipo => (
              <button
                key={tipo.value}
                onClick={() => setFiltroTipo(tipo.value)}
                className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                  filtroTipo === tipo.value
                    ? 'bg-primary-500 text-white'
                    : 'bg-dark-700 text-dark-300 hover:bg-dark-600'
                }`}
              >
                {tipo.label} ({categorias.filter(c => c.tipo === tipo.value).length})
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Lista */}
      {categoriasFiltradas.length === 0 ? (
        <EmptyState
          icon={<Tags className="w-12 h-12" />}
          title="Nenhuma categoria encontrada"
          description={filtroTipo === 'todos' 
            ? 'Crie sua primeira categoria financeira' 
            : `Nenhuma categoria do tipo "${filtroTipo}" encontrada`}
          action={
            <Button onClick={() => handleOpenModal()} leftIcon={<Plus className="w-4 h-4" />}>
              Nova Categoria
            </Button>
          }
        />
      ) : (
        <div className="glass-card overflow-hidden">
          <table className="w-full">
            <thead className="bg-dark-800/50">
              <tr>
                <th className="px-6 py-4 text-left text-xs font-medium text-dark-400 uppercase tracking-wider">
                  Nome
                </th>
                <th className="px-6 py-4 text-left text-xs font-medium text-dark-400 uppercase tracking-wider">
                  Tipo
                </th>
                <th className="px-6 py-4 text-left text-xs font-medium text-dark-400 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-4 text-right text-xs font-medium text-dark-400 uppercase tracking-wider">
                  Ações
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-dark-700">
              {categoriasFiltradas.map(categoria => {
                const tipoInfo = tiposOptions.find(t => t.value === categoria.tipo)
                return (
                  <tr key={categoria.id} className="hover:bg-dark-800/30 transition-colors">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <Tags className={`w-5 h-5 ${tipoInfo?.color || 'text-dark-400'}`} />
                        <span className="text-white font-medium">{categoria.nome}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`text-sm font-medium ${tipoInfo?.color || 'text-dark-400'}`}>
                        {tipoInfo?.label || categoria.tipo}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      {categoria.ativo ? (
                        <Badge variant="success">Ativo</Badge>
                      ) : (
                        <Badge variant="danger">Inativo</Badge>
                      )}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => handleOpenModal(categoria)}
                          className="p-2 text-dark-400 hover:text-primary-400 hover:bg-dark-700 rounded-lg transition-colors"
                          title="Editar"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleOpenDeleteModal(categoria)}
                          className="p-2 text-dark-400 hover:text-red-400 hover:bg-dark-700 rounded-lg transition-colors"
                          title="Excluir"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Modal de Criação/Edição */}
      <Modal
        isOpen={isModalOpen}
        onClose={handleCloseModal}
        title={editingCategoria ? 'Editar Categoria' : 'Nova Categoria'}
        size="md"
      >
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-dark-300 mb-2">
              Nome *
            </label>
            <input
              type="text"
              value={formNome}
              onChange={(e) => setFormNome(e.target.value)}
              placeholder="Ex: Despesa de Material"
              className="input w-full"
              autoFocus
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-dark-300 mb-2">
              Tipo *
            </label>
            <select
              value={formTipo}
              onChange={(e) => setFormTipo(e.target.value as TipoCategoria)}
              className="input w-full"
            >
              {tiposOptions.map(tipo => (
                <option key={tipo.value} value={tipo.value}>
                  {tipo.label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={formAtivo}
                onChange={(e) => setFormAtivo(e.target.checked)}
                className="w-5 h-5 rounded text-primary-500"
              />
              <span className="text-white">Categoria ativa</span>
            </label>
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-dark-700">
            <Button variant="secondary" onClick={handleCloseModal}>
              Cancelar
            </Button>
            <Button onClick={handleSave} disabled={saving}>
              {saving ? 'Salvando...' : editingCategoria ? 'Atualizar' : 'Criar'}
            </Button>
          </div>
        </div>
      </Modal>

      {/* Modal de Exclusão */}
      <Modal
        isOpen={isDeleteModalOpen}
        onClose={() => { setIsDeleteModalOpen(false); setDeletingCategoria(null); setDeleteResult(null) }}
        title="Excluir Categoria"
        size="md"
      >
        <div className="space-y-4">
          {deleteResult ? (
            <div className={`p-4 rounded-lg border ${
              deleteResult.success 
                ? 'bg-green-500/10 border-green-500/30' 
                : 'bg-red-500/10 border-red-500/30'
            }`}>
              <div className="flex items-start gap-3">
                {deleteResult.success ? (
                  <CheckCircle className="w-5 h-5 text-green-400 mt-0.5" />
                ) : (
                  <XCircle className="w-5 h-5 text-red-400 mt-0.5" />
                )}
                <div>
                  <p className={`font-medium ${deleteResult.success ? 'text-green-400' : 'text-red-400'}`}>
                    {deleteResult.success ? 'Categoria excluída' : 'Não foi possível excluir'}
                  </p>
                  <p className="text-dark-300 text-sm mt-1">{deleteResult.message}</p>
                </div>
              </div>
            </div>
          ) : (
            <>
              <div className="p-4 bg-yellow-500/10 border border-yellow-500/30 rounded-lg">
                <div className="flex items-start gap-3">
                  <AlertTriangle className="w-5 h-5 text-yellow-400 mt-0.5" />
                  <div>
                    <p className="text-yellow-400 font-medium">Atenção</p>
                    <p className="text-dark-300 text-sm mt-1">
                      Tem certeza que deseja excluir a categoria <strong className="text-white">&quot;{deletingCategoria?.nome}&quot;</strong>?
                    </p>
                    <p className="text-dark-400 text-sm mt-2">
                      A exclusão só será permitida se a categoria não estiver sendo utilizada em nenhum lançamento.
                    </p>
                  </div>
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-dark-700">
                <Button 
                  variant="secondary" 
                  onClick={() => { setIsDeleteModalOpen(false); setDeletingCategoria(null) }}
                >
                  Cancelar
                </Button>
                <Button 
                  variant="danger" 
                  onClick={handleDelete}
                  disabled={deleting}
                >
                  {deleting ? 'Excluindo...' : 'Excluir'}
                </Button>
              </div>
            </>
          )}
        </div>
      </Modal>
    </div>
  )
}
