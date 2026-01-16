import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://yhiiupamxdjmnrktkjku.supabase.co'
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InloaWl1cGFteGRqbW5ya3Rramt1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njg0ODg2NzUsImV4cCI6MjA4NDA2NDY3NX0._QjYtYAlypJdursHe0-rPz14QOT4NNP2EklqcJ6TpkI'

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

export interface Orcamento {
  id: number
  data: string
  mes: string
  cliente: string
  valor_proposto: number
  valor_fechado: number
  entrada: number
  status: 'Fechado' | 'Perdido'
  parcelado: boolean
  parcelas: number
  created_at?: string
  updated_at?: string
}

export type OrcamentoInput = Omit<Orcamento, 'id' | 'created_at' | 'updated_at'>

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
