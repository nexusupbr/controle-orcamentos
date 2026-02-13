'use client'

import { useEffect, useState } from 'react'
import { Users, Plus, Pencil, Trash2, Search, Eye, EyeOff, AlertCircle } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Modal } from '@/components/ui/Modal'
import { LoadingSpinner, EmptyState, Badge } from '@/components/ui/Common'
import { 
  fetchUsuarios, createUsuario, updateUsuario, deleteUsuario, 
  Usuario, UsuarioInput 
} from '@/lib/supabase'

export default function UsuariosPage() {
  const [usuarios, setUsuarios] = useState<Usuario[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  
  // Modal de criar/editar
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingUser, setEditingUser] = useState<Usuario | null>(null)
  const [saving, setSaving] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [formError, setFormError] = useState('')
  
  // Form fields
  const [nome, setNome] = useState('')
  const [email, setEmail] = useState('')
  const [senha, setSenha] = useState('')
  const [tipo, setTipo] = useState<'admin' | 'funcionario'>('funcionario')

  // Modal de exclusão
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false)
  const [deletingUser, setDeletingUser] = useState<Usuario | null>(null)
  const [deleting, setDeleting] = useState(false)

  useEffect(() => {
    loadUsuarios()
  }, [])

  const loadUsuarios = async () => {
    try {
      setLoading(true)
      const data = await fetchUsuarios()
      setUsuarios(data)
    } catch (err) {
      console.error('Erro ao carregar usuários:', err)
    } finally {
      setLoading(false)
    }
  }

  const filteredUsuarios = usuarios.filter(u =>
    u.nome.toLowerCase().includes(searchTerm.toLowerCase()) ||
    u.email.toLowerCase().includes(searchTerm.toLowerCase())
  )

  const openCreateModal = () => {
    setEditingUser(null)
    setNome('')
    setEmail('')
    setSenha('')
    setTipo('funcionario')
    setFormError('')
    setShowPassword(false)
    setIsModalOpen(true)
  }

  const openEditModal = (user: Usuario) => {
    setEditingUser(user)
    setNome(user.nome)
    setEmail(user.email)
    setSenha('')
    setTipo(user.tipo)
    setFormError('')
    setShowPassword(false)
    setIsModalOpen(true)
  }

  const closeModal = () => {
    setIsModalOpen(false)
    setEditingUser(null)
    setFormError('')
  }

  const openDeleteModal = (user: Usuario) => {
    setDeletingUser(user)
    setIsDeleteModalOpen(true)
  }

  const closeDeleteModal = () => {
    setIsDeleteModalOpen(false)
    setDeletingUser(null)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setFormError('')

    // Validações
    if (!nome.trim()) {
      setFormError('Nome é obrigatório')
      return
    }
    if (!email.trim()) {
      setFormError('Email é obrigatório')
      return
    }
    if (!editingUser && !senha.trim()) {
      setFormError('Senha é obrigatória para novo usuário')
      return
    }

    // Verifica email duplicado
    const emailExists = usuarios.some(
      u => u.email.toLowerCase() === email.trim().toLowerCase() && u.id !== editingUser?.id
    )
    if (emailExists) {
      setFormError('Já existe um usuário com este email')
      return
    }

    setSaving(true)
    try {
      if (editingUser) {
        // Editar
        const updates: Partial<UsuarioInput> = {
          nome: nome.trim(),
          email: email.trim(),
          tipo
        }
        if (senha.trim()) {
          updates.senha = senha.trim()
        }
        await updateUsuario(editingUser.id, updates)
      } else {
        // Criar
        const newUser: UsuarioInput = {
          nome: nome.trim(),
          email: email.trim(),
          senha: senha.trim(),
          tipo
        }
        await createUsuario(newUser)
      }

      await loadUsuarios()
      closeModal()
    } catch (err) {
      console.error('Erro ao salvar usuário:', err)
      setFormError('Erro ao salvar usuário. Tente novamente.')
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async () => {
    if (!deletingUser) return
    
    setDeleting(true)
    try {
      await deleteUsuario(deletingUser.id)
      await loadUsuarios()
      closeDeleteModal()
    } catch (err) {
      console.error('Erro ao excluir usuário:', err)
    } finally {
      setDeleting(false)
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
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl lg:text-3xl font-bold font-heading text-white">
            Gerenciar Usuários
          </h1>
          <p className="text-dark-400 mt-1">
            Crie e gerencie os usuários que terão acesso ao sistema
          </p>
        </div>
        <Button
          onClick={openCreateModal}
          leftIcon={<Plus className="w-4 h-4" />}
        >
          Novo Usuário
        </Button>
      </div>

      {/* Search */}
      <div className="glass-card p-4">
        <div className="relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-dark-400" />
          <input
            type="text"
            placeholder="Buscar por nome ou email..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="input pl-12 w-full"
          />
        </div>
      </div>

      {/* Lista de Usuários */}
      {filteredUsuarios.length > 0 ? (
        <div className="space-y-3">
          {filteredUsuarios.map((user) => (
            <div key={user.id} className="glass-card p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-xl bg-primary-500/10 flex items-center justify-center">
                    <Users className="w-6 h-6 text-primary-400" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-white">{user.nome}</h3>
                    <p className="text-sm text-dark-400">{user.email}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <Badge variant={user.tipo === 'admin' ? 'warning' : 'info'}>
                    {user.tipo === 'admin' ? 'Administrador' : 'Funcionário'}
                  </Badge>
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => openEditModal(user)}
                      className="p-2 rounded-lg hover:bg-dark-700 text-dark-400 hover:text-primary-400 transition-colors"
                      title="Editar"
                    >
                      <Pencil className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => openDeleteModal(user)}
                      className="p-2 rounded-lg hover:bg-dark-700 text-dark-400 hover:text-red-400 transition-colors"
                      title="Excluir"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="glass-card">
          <EmptyState
            icon={<Users className="w-10 h-10 text-dark-500" />}
            title="Nenhum usuário encontrado"
            description={searchTerm ? 'Tente buscar com outros termos' : 'Clique em "Novo Usuário" para começar'}
          />
        </div>
      )}

      {/* Modal Criar/Editar */}
      <Modal
        isOpen={isModalOpen}
        onClose={closeModal}
        title={editingUser ? 'Editar Usuário' : 'Novo Usuário'}
        size="md"
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          {formError && (
            <div className="flex items-center gap-2 p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              {formError}
            </div>
          )}

          {/* Nome */}
          <div>
            <label className="block text-sm font-medium text-dark-300 mb-1.5">
              Nome *
            </label>
            <input
              type="text"
              value={nome}
              onChange={(e) => setNome(e.target.value)}
              placeholder="Nome completo"
              className="input w-full"
              required
            />
          </div>

          {/* Email */}
          <div>
            <label className="block text-sm font-medium text-dark-300 mb-1.5">
              Email *
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="email@exemplo.com"
              className="input w-full"
              required
            />
          </div>

          {/* Senha */}
          <div>
            <label className="block text-sm font-medium text-dark-300 mb-1.5">
              Senha {editingUser ? '(deixe vazio para manter a atual)' : '*'}
            </label>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                value={senha}
                onChange={(e) => setSenha(e.target.value)}
                placeholder={editingUser ? '••••••••' : 'Digite a senha'}
                className="input w-full pr-12"
                required={!editingUser}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-dark-400 hover:text-white transition-colors"
              >
                {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
              </button>
            </div>
          </div>

          {/* Tipo */}
          <div>
            <label className="block text-sm font-medium text-dark-300 mb-1.5">
              Tipo de Usuário
            </label>
            <select
              value={tipo}
              onChange={(e) => setTipo(e.target.value as 'admin' | 'funcionario')}
              className="input w-full"
            >
              <option value="funcionario">Funcionário</option>
              <option value="admin">Administrador</option>
            </select>
          </div>

          {/* Botões */}
          <div className="flex justify-end gap-3 pt-4 border-t border-dark-700">
            <Button type="button" variant="secondary" onClick={closeModal}>
              Cancelar
            </Button>
            <Button type="submit" isLoading={saving}>
              {editingUser ? 'Salvar Alterações' : 'Criar Usuário'}
            </Button>
          </div>
        </form>
      </Modal>

      {/* Modal Confirmar Exclusão */}
      <Modal
        isOpen={isDeleteModalOpen}
        onClose={closeDeleteModal}
        title="Confirmar Exclusão"
        size="sm"
      >
        <div className="space-y-4">
          <p className="text-dark-300">
            Tem certeza que deseja excluir o usuário{' '}
            <span className="font-semibold text-white">{deletingUser?.nome}</span>?
          </p>
          <p className="text-sm text-dark-400">
            Esta ação não pode ser desfeita. O usuário perderá o acesso ao sistema.
          </p>
          <div className="flex justify-end gap-3 pt-4 border-t border-dark-700">
            <Button type="button" variant="secondary" onClick={closeDeleteModal}>
              Cancelar
            </Button>
            <Button 
              onClick={handleDelete} 
              isLoading={deleting}
              className="bg-red-600 hover:bg-red-700 border-red-600"
            >
              Excluir Usuário
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  )
}
