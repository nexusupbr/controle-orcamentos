/**
 * NFe API Client (Frontend)
 * 
 * Cliente para consumir as APIs de NF-e a partir do frontend.
 * Este cliente NÃO tem acesso ao token Focus NFe.
 */

import { supabase } from './supabase'

// ============================================
// TIPOS
// ============================================

export interface EmitirNfeResponse {
  success: boolean
  message: string
  idempotent?: boolean
  data?: {
    nota_id: number
    referencia: string
    status: string
    status_sefaz?: string
    mensagem_sefaz?: string
    numero?: string
    serie?: string
    chave_nfe?: string
    url_danfe?: string
    url_xml?: string
    erros?: Array<{ codigo: string; mensagem: string; correcao?: string }>
  }
  warnings?: string[]
  errors?: string[]
  duracao_ms?: number
}

export interface ConsultarNfeResponse {
  success: boolean
  source: 'database' | 'focus_nfe'
  data?: {
    nota_id: number
    referencia: string
    venda_id: number
    status: string
    status_sefaz?: string
    mensagem_sefaz?: string
    numero?: string
    serie?: string
    chave_nfe?: string
    url_danfe?: string
    url_xml?: string
    erros?: Array<{ codigo: string; mensagem: string }>
    tentativas?: number
  }
  duracao_ms?: number
}

export interface CancelarNfeResponse {
  success: boolean
  message: string
  data?: {
    nota_id: number
    referencia: string
    status: string
    status_sefaz?: string
    mensagem_sefaz?: string
    url_xml_cancelamento?: string
  }
  duracao_ms?: number
}

export interface CartaCorrecaoResponse {
  success: boolean
  message: string
  data?: {
    nota_id: number
    referencia: string
    status: string
    status_sefaz?: string
    mensagem_sefaz?: string
    numero_carta_correcao?: number
    url_xml?: string
    url_pdf?: string
  }
  duracao_ms?: number
}

export interface MetricasNfeResponse {
  success: boolean
  periodo: {
    dias: number
    ambiente: string
    de: string
    ate: string
  }
  totais: {
    total: number
    autorizadas: number
    pendentes: number
    rejeitadas: number
    canceladas: number
    taxa_sucesso: number
    taxa_rejeicao: number
  }
  valores: {
    total_autorizado: number
    ticket_medio: number
  }
  performance: {
    tempo_medio_autorizacao_ms: number
    tempo_maximo_autorizacao_ms: number
    tempo_minimo_autorizacao_ms: number
    media_tentativas: number
  }
  historico: Array<{
    data: string
    total: number
    autorizadas: number
    rejeitadas: number
    valor: number
  }>
  ultimas_notas: Array<{
    id: number
    referencia: string
    venda_id: number
    status: string
    numero: string
    valor_total: number
    created_at: string
  }>
}

// ============================================
// FUNÇÕES AUXILIARES
// ============================================

async function getAuthHeaders(): Promise<Record<string, string>> {
  const { data: { session } } = await supabase.auth.getSession()
  
  if (!session?.access_token) {
    throw new Error('Usuário não autenticado')
  }

  return {
    'Authorization': `Bearer ${session.access_token}`,
    'Content-Type': 'application/json'
  }
}

async function handleResponse<T>(response: Response): Promise<T> {
  const data = await response.json()
  
  if (!response.ok) {
    const error = new Error(data.error || 'Erro na requisição')
    ;(error as any).code = data.code
    ;(error as any).errors = data.errors
    ;(error as any).warnings = data.warnings
    throw error
  }
  
  return data as T
}

// ============================================
// API FUNCTIONS
// ============================================

/**
 * Emite uma NF-e a partir de uma venda
 */
export async function emitirNfe(vendaId: number): Promise<EmitirNfeResponse> {
  const headers = await getAuthHeaders()
  
  const response = await fetch('/api/nfe/emitir', {
    method: 'POST',
    headers,
    body: JSON.stringify({ venda_id: vendaId })
  })

  return handleResponse<EmitirNfeResponse>(response)
}

/**
 * Consulta o status de uma NF-e
 */
export async function consultarNfe(
  options: { ref?: string; notaId?: number; completa?: boolean }
): Promise<ConsultarNfeResponse> {
  const headers = await getAuthHeaders()
  
  const params = new URLSearchParams()
  if (options.ref) params.append('ref', options.ref)
  if (options.notaId) params.append('nota_id', options.notaId.toString())
  if (options.completa) params.append('completa', 'true')

  const response = await fetch(`/api/nfe/status?${params}`, {
    method: 'GET',
    headers
  })

  return handleResponse<ConsultarNfeResponse>(response)
}

/**
 * Cancela uma NF-e
 */
export async function cancelarNfe(
  ref: string,
  justificativa: string
): Promise<CancelarNfeResponse> {
  const headers = await getAuthHeaders()
  
  const response = await fetch('/api/nfe/cancelar', {
    method: 'POST',
    headers,
    body: JSON.stringify({ ref, justificativa })
  })

  return handleResponse<CancelarNfeResponse>(response)
}

/**
 * Emite carta de correção
 */
export async function emitirCartaCorrecao(
  ref: string,
  correcao: string
): Promise<CartaCorrecaoResponse> {
  const headers = await getAuthHeaders()
  
  const response = await fetch('/api/nfe/carta-correcao', {
    method: 'POST',
    headers,
    body: JSON.stringify({ ref, correcao })
  })

  return handleResponse<CartaCorrecaoResponse>(response)
}

/**
 * Reenvia NF-e por email
 */
export async function reenviarEmailNfe(
  ref: string,
  emails: string[]
): Promise<{ success: boolean; message: string }> {
  const headers = await getAuthHeaders()
  
  const response = await fetch('/api/nfe/email', {
    method: 'POST',
    headers,
    body: JSON.stringify({ ref, emails })
  })

  return handleResponse(response)
}

/**
 * Busca métricas de NF-e
 */
export async function buscarMetricasNfe(
  dias = 30,
  ambiente = 'todos'
): Promise<MetricasNfeResponse> {
  const headers = await getAuthHeaders()
  
  const params = new URLSearchParams({
    dias: dias.toString(),
    ambiente
  })

  const response = await fetch(`/api/nfe/metricas?${params}`, {
    method: 'GET',
    headers
  })

  return handleResponse<MetricasNfeResponse>(response)
}

/**
 * Polling para aguardar autorização
 * Consulta a nota periodicamente até sair de "processando"
 */
export async function aguardarAutorizacao(
  ref: string,
  options?: {
    maxTentativas?: number
    intervaloMs?: number
    onStatus?: (status: string, tentativa: number) => void
  }
): Promise<ConsultarNfeResponse> {
  const maxTentativas = options?.maxTentativas || 30
  const intervaloMs = options?.intervaloMs || 3000

  for (let i = 0; i < maxTentativas; i++) {
    const resultado = await consultarNfe({ ref })
    
    if (options?.onStatus) {
      options.onStatus(resultado.data?.status || 'unknown', i + 1)
    }

    if (resultado.data?.status !== 'processando_autorizacao' && 
        resultado.data?.status !== 'processando' &&
        resultado.data?.status !== 'pendente') {
      return resultado
    }

    await new Promise(resolve => setTimeout(resolve, intervaloMs))
  }

  throw new Error('Timeout aguardando autorização da NF-e')
}

// ============================================
// HELPERS
// ============================================

/**
 * Formata status para exibição
 */
export function formatarStatusNfe(status: string): {
  label: string
  variant: 'success' | 'warning' | 'error' | 'default'
} {
  switch (status) {
    case 'autorizado':
    case 'autorizada':
      return { label: 'Autorizada', variant: 'success' }
    case 'processando_autorizacao':
    case 'processando':
    case 'pendente':
      return { label: 'Processando', variant: 'warning' }
    case 'cancelado':
    case 'cancelada':
      return { label: 'Cancelada', variant: 'default' }
    case 'erro_autorizacao':
      return { label: 'Erro', variant: 'error' }
    case 'rejeitada':
      return { label: 'Rejeitada', variant: 'error' }
    case 'denegado':
    case 'denegada':
      return { label: 'Denegada', variant: 'error' }
    default:
      return { label: status, variant: 'default' }
  }
}

/**
 * Abre DANFE em nova aba
 */
export function abrirDanfe(urlDanfe: string): void {
  window.open(urlDanfe, '_blank')
}

/**
 * Baixa XML
 */
export function baixarXml(urlXml: string, nomeArquivo?: string): void {
  const link = document.createElement('a')
  link.href = urlXml
  link.download = nomeArquivo || 'nfe.xml'
  link.target = '_blank'
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
}
