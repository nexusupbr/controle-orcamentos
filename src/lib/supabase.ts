import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://yhiiupamxdjmnrktkjku.supabase.co'
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InloaWl1cGFteGRqbW5ya3Rramt1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njg0ODg2NzUsImV4cCI6MjA4NDA2NDY3NX0._QjYtYAlypJdursHe0-rPz14QOT4NNP2EklqcJ6TpkI'

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

// ==================== TIPOS ====================

export interface Orcamento {
  id: number
  data: string
  mes: string
  cliente: string
  valor_proposto: number
  valor_fechado: number
  entrada: number
  status: 'Fechado' | 'Perdido' | 'Análise'
  parcelado: boolean
  parcelas: number
  observacoes: string
  nota_fiscal: boolean
  created_at?: string
  updated_at?: string
}

export type OrcamentoInput = Omit<Orcamento, 'id' | 'created_at' | 'updated_at'>

export interface Material {
  id: number
  nome: string
  created_at?: string
}

export type MaterialInput = Omit<Material, 'id' | 'created_at'>

export interface Obra {
  id: number
  orcamento_id: number | null
  nome: string
  descricao: string | null
  status: 'em_andamento' | 'concluida' | 'pausada'
  created_at?: string
  updated_at?: string
  // Relacionamentos
  orcamento?: Orcamento
}

export type ObraInput = {
  orcamento_id?: number | null
  nome: string
  descricao?: string | null
  status: 'em_andamento' | 'concluida' | 'pausada'
}

export interface ObraMaterial {
  id: number
  obra_id: number
  material_id: number
  quantidade: number
  created_at?: string
  updated_at?: string
  // Relacionamentos
  material?: Material
}

export interface ObraMaterialComDetalhes extends ObraMaterial {
  material: Material
}

export type ObraMaterialInput = Omit<ObraMaterial, 'id' | 'created_at' | 'updated_at' | 'material'>

export interface Usuario {
  id: number
  nome: string
  email: string
  senha: string
  tipo: 'admin' | 'funcionario'
  created_at?: string
}

// ==================== ORÇAMENTOS ====================

export async function fetchOrcamentos(): Promise<Orcamento[]> {
  const { data, error } = await supabase
    .from('orcamentos')
    .select('*')
    .order('data', { ascending: false })

  if (error) {
    console.error('Erro ao buscar orçamentos:', error)
    throw error
  }

  return data || []
}

export async function createOrcamento(orcamento: OrcamentoInput): Promise<Orcamento> {
  const { data, error } = await supabase
    .from('orcamentos')
    .insert([orcamento])
    .select()
    .single()

  if (error) {
    console.error('Erro ao criar orçamento:', error)
    throw new Error(error.message)
  }

  return data
}

export async function updateOrcamento(id: number, updates: Partial<OrcamentoInput>): Promise<Orcamento> {
  const { data, error } = await supabase
    .from('orcamentos')
    .update(updates)
    .eq('id', id)
    .select()
    .single()

  if (error) {
    console.error('Erro ao atualizar orçamento:', error)
    throw new Error(error.message)
  }

  return data
}

export async function deleteOrcamento(id: number): Promise<void> {
  const { error } = await supabase
    .from('orcamentos')
    .delete()
    .eq('id', id)

  if (error) {
    console.error('Erro ao excluir orçamento:', error)
    throw new Error(error.message)
  }
}

// ==================== MATERIAIS ====================

export async function fetchMateriais(): Promise<Material[]> {
  const { data, error } = await supabase
    .from('materiais')
    .select('*')
    .order('nome', { ascending: true })

  if (error) {
    console.error('Erro ao buscar materiais:', error)
    throw error
  }

  return data || []
}

export async function createMaterial(material: MaterialInput): Promise<Material> {
  const { data, error } = await supabase
    .from('materiais')
    .insert([material])
    .select()
    .single()

  if (error) {
    console.error('Erro ao criar material:', error)
    throw new Error(error.message)
  }

  return data
}

export async function updateMaterial(id: number, updates: Partial<MaterialInput>): Promise<Material> {
  const { data, error } = await supabase
    .from('materiais')
    .update(updates)
    .eq('id', id)
    .select()
    .single()

  if (error) {
    console.error('Erro ao atualizar material:', error)
    throw new Error(error.message)
  }

  return data
}

export async function deleteMaterial(id: number): Promise<void> {
  const { error } = await supabase
    .from('materiais')
    .delete()
    .eq('id', id)

  if (error) {
    console.error('Erro ao excluir material:', error)
    throw new Error(error.message)
  }
}

// ==================== OBRAS ====================

export async function fetchObras(): Promise<Obra[]> {
  const { data, error } = await supabase
    .from('obras')
    .select(`
      *,
      orcamento:orcamentos(id, cliente, status)
    `)
    .order('created_at', { ascending: false })

  if (error) {
    console.error('Erro ao buscar obras:', error)
    throw error
  }

  return data || []
}

export async function fetchObrasEmAndamento(): Promise<Obra[]> {
  const { data, error } = await supabase
    .from('obras')
    .select(`
      *,
      orcamento:orcamentos(id, cliente)
    `)
    .eq('status', 'em_andamento')
    .order('created_at', { ascending: false })

  if (error) {
    console.error('Erro ao buscar obras em andamento:', error)
    throw error
  }

  return data || []
}

export async function createObra(obra: ObraInput): Promise<Obra> {
  const { data, error } = await supabase
    .from('obras')
    .insert([obra])
    .select()
    .single()

  if (error) {
    console.error('Erro ao criar obra:', error)
    throw new Error(error.message)
  }

  return data
}

export async function updateObra(id: number, updates: Partial<ObraInput>): Promise<Obra> {
  const { data, error } = await supabase
    .from('obras')
    .update(updates)
    .eq('id', id)
    .select()
    .single()

  if (error) {
    console.error('Erro ao atualizar obra:', error)
    throw new Error(error.message)
  }

  return data
}

export async function deleteObra(id: number): Promise<void> {
  const { error } = await supabase
    .from('obras')
    .delete()
    .eq('id', id)

  if (error) {
    console.error('Erro ao excluir obra:', error)
    throw new Error(error.message)
  }
}

// ==================== MATERIAIS DA OBRA ====================

export async function fetchObraMateriaisComDetalhes(obraId: number): Promise<ObraMaterial[]> {
  const { data, error } = await supabase
    .from('obra_materiais')
    .select(`
      *,
      material:materiais(id, nome)
    `)
    .eq('obra_id', obraId)

  if (error) {
    console.error('Erro ao buscar materiais da obra:', error)
    throw error
  }

  return data || []
}

export async function upsertObraMaterial(obraMaterial: ObraMaterialInput): Promise<ObraMaterial> {
  // Verifica se já existe
  const { data: existing } = await supabase
    .from('obra_materiais')
    .select('id')
    .eq('obra_id', obraMaterial.obra_id)
    .eq('material_id', obraMaterial.material_id)
    .single()

  if (existing) {
    // Atualiza
    const { data, error } = await supabase
      .from('obra_materiais')
      .update({ quantidade: obraMaterial.quantidade })
      .eq('id', existing.id)
      .select()
      .single()

    if (error) throw new Error(error.message)
    return data
  } else {
    // Insere
    const { data, error } = await supabase
      .from('obra_materiais')
      .insert([obraMaterial])
      .select()
      .single()

    if (error) throw new Error(error.message)
    return data
  }
}

export async function deleteObraMaterial(id: number): Promise<void> {
  const { error } = await supabase
    .from('obra_materiais')
    .delete()
    .eq('id', id)

  if (error) {
    console.error('Erro ao excluir material da obra:', error)
    throw new Error(error.message)
  }
}

// ==================== USUÁRIOS / AUTENTICAÇÃO ====================

export async function loginUsuario(email: string, senha: string): Promise<Usuario | null> {
  const { data, error } = await supabase
    .from('usuarios')
    .select('*')
    .eq('email', email)
    .eq('senha', senha)
    .single()

  if (error) {
    console.error('Erro no login:', error)
    return null
  }

  return data
}

// Verifica se a tabela de usuários existe
export async function checkTabelaUsuarios(): Promise<boolean> {
  try {
    const { error } = await supabase
      .from('usuarios')
      .select('id')
      .limit(1)
    
    // Se não houver erro, a tabela existe
    return !error
  } catch {
    return false
  }
}

export async function fetchUsuarios(): Promise<Usuario[]> {
  const { data, error } = await supabase
    .from('usuarios')
    .select('*')
    .order('nome', { ascending: true })

  if (error) {
    console.error('Erro ao buscar usuários:', error)
    throw error
  }

  return data || []
}
