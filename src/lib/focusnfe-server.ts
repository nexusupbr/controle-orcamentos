/**
 * Focus NFe Server-Side Client
 * 
 * Cliente robusto para integração com API Focus NFe.
 * Este arquivo deve ser usado APENAS no servidor (API Routes, Server Components).
 * 
 * NUNCA importe este arquivo em componentes client-side!
 */

import { createClient } from '@supabase/supabase-js'

// ============================================
// TIPOS
// ============================================

export interface FocusNFeConfig {
  token: string
  ambiente: 'homologacao' | 'producao'
  baseUrl: string
  timeout: number
  maxRetries: number
  retryDelayMs: number
}

export interface NFeDadosEmitente {
  cnpj_emitente: string
  inscricao_estadual_emitente: string
  nome_emitente: string
  nome_fantasia_emitente?: string
  logradouro_emitente: string
  numero_emitente: string
  complemento_emitente?: string
  bairro_emitente: string
  municipio_emitente: string
  uf_emitente: string
  cep_emitente: string
  telefone_emitente?: string
  regime_tributario_emitente: 1 | 2 | 3
}

export interface NFeDadosDestinatario {
  nome_destinatario: string
  cpf_destinatario?: string
  cnpj_destinatario?: string
  inscricao_estadual_destinatario?: string
  logradouro_destinatario?: string
  numero_destinatario?: string
  complemento_destinatario?: string
  bairro_destinatario?: string
  municipio_destinatario?: string
  uf_destinatario?: string
  cep_destinatario?: string
  telefone_destinatario?: string
  email_destinatario?: string
  indicador_inscricao_estadual_destinatario?: 1 | 2 | 9
}

export interface NFeItem {
  numero_item: number
  codigo_produto: string
  descricao: string
  codigo_ncm: string  // Focus NFe espera codigo_ncm
  cfop: string
  unidade_comercial: string
  quantidade_comercial: number
  valor_unitario_comercial: number
  valor_bruto: number
  unidade_tributavel?: string
  quantidade_tributavel?: number
  valor_unitario_tributavel?: number
  origem?: 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8  // Origem da mercadoria
  icms_origem: 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8
  icms_situacao_tributaria: string
  icms_aliquota?: number
  icms_base_calculo?: number
  icms_valor?: number
  pis_situacao_tributaria?: string
  pis_base_calculo?: number
  pis_aliquota?: number
  pis_valor?: number
  cofins_situacao_tributaria?: string
  cofins_base_calculo?: number
  cofins_aliquota?: number
  cofins_valor?: number
  inclui_no_total?: 0 | 1
}

export interface NFeFormaPagamento {
  forma_pagamento: string
  valor_pagamento: number
  tipo_integracao?: 1 | 2
  cnpj_credenciadora?: string
  numero_autorizacao?: string
  bandeira_operadora?: string
}

export interface NFeDados {
  natureza_operacao: string
  data_emissao: string
  data_entrada_saida?: string
  tipo_documento: 0 | 1
  local_destino: 1 | 2 | 3
  finalidade_emissao: 1 | 2 | 3 | 4
  consumidor_final: 0 | 1
  presenca_comprador: 0 | 1 | 2 | 3 | 4 | 9
  modalidade_frete?: 0 | 1 | 2 | 3 | 4 | 9  // 9 = Sem frete
  cnpj_emitente: string
  inscricao_estadual_emitente: string
  nome_emitente: string
  nome_fantasia_emitente?: string
  logradouro_emitente: string
  numero_emitente: string
  complemento_emitente?: string
  bairro_emitente: string
  codigo_municipio_emitente?: string  // Código IBGE
  municipio_emitente: string
  uf_emitente: string
  cep_emitente: string
  telefone_emitente?: string
  regime_tributario_emitente: 1 | 2 | 3
  nome_destinatario: string
  cpf_destinatario?: string
  cnpj_destinatario?: string
  inscricao_estadual_destinatario?: string
  logradouro_destinatario?: string
  numero_destinatario?: string
  complemento_destinatario?: string
  bairro_destinatario?: string
  codigo_municipio_destinatario?: string  // Código IBGE
  municipio_destinatario?: string
  uf_destinatario?: string
  cep_destinatario?: string
  pais_destinatario?: string
  codigo_pais_destinatario?: string  // 1058 = Brasil
  indicador_inscricao_estadual_destinatario?: 1 | 2 | 9
  valor_total: number
  valor_produtos?: number
  valor_desconto?: number
  valor_frete?: number
  valor_seguro?: number
  valor_outras_despesas?: number
  items: NFeItem[]
  formas_pagamento: NFeFormaPagamento[]
  informacoes_adicionais_contribuinte?: string
  informacoes_adicionais_fisco?: string
}

export interface NFeResponse {
  cnpj_emitente?: string
  ref?: string
  status?: 'processando_autorizacao' | 'autorizado' | 'cancelado' | 'erro_autorizacao' | 'denegado'
  status_sefaz?: string
  mensagem_sefaz?: string
  chave_nfe?: string
  numero?: string
  serie?: string
  caminho_xml_nota_fiscal?: string
  caminho_danfe?: string
  caminho_xml_cancelamento?: string
  caminho_xml_carta_correcao?: string
  caminho_pdf_carta_correcao?: string
  numero_carta_correcao?: number
  erros?: Array<{
    codigo: string
    mensagem: string
    correcao?: string
  }>
  // Campos de erro da API Focus
  codigo?: string
  mensagem?: string
}

// Mapeia status do Focus NFe para status do banco de dados
// Focus NFe: processando_autorizacao, autorizado, cancelado, erro_autorizacao, denegado
// Banco: pendente, processando, autorizada, cancelada, rejeitada, denegada
export type StatusBanco = 'pendente' | 'processando' | 'autorizada' | 'cancelada' | 'rejeitada' | 'denegada'

export function mapearStatusFocusParaBanco(statusFocus: string | undefined): StatusBanco {
  const mapeamento: Record<string, StatusBanco> = {
    'processando_autorizacao': 'processando',
    'autorizado': 'autorizada',
    'cancelado': 'cancelada',
    'erro_autorizacao': 'rejeitada',
    'denegado': 'denegada'
  }
  return mapeamento[statusFocus || ''] || 'pendente'
}

export interface NFeCancelamentoResponse {
  status: 'cancelado' | 'erro_cancelamento'
  status_sefaz: string
  mensagem_sefaz: string
  caminho_xml_cancelamento?: string
}

export interface NFeCartaCorrecaoResponse {
  status: 'autorizado' | 'erro_autorizacao'
  status_sefaz: string
  mensagem_sefaz: string
  caminho_xml_carta_correcao?: string
  caminho_pdf_carta_correcao?: string
  numero_carta_correcao?: number
}

export interface FocusNFeError {
  codigo: string
  mensagem: string
  correcao?: string
}

// ============================================
// CONSTANTES
// ============================================

export const FORMAS_PAGAMENTO: Record<string, string> = {
  'dinheiro': '01',
  'cheque': '02',
  'credito': '03',
  'debito': '04',
  'credito_loja': '05',
  'vale_alimentacao': '10',
  'vale_refeicao': '11',
  'vale_presente': '12',
  'vale_combustivel': '13',
  'duplicata': '14',
  'boleto': '15',
  'deposito': '16',
  'pix': '17',
  'transferencia': '18',
  'cashback': '19',
  'sem_pagamento': '90',
  'outros': '99'
}

export const ICMS_CSOSN: Record<string, string> = {
  '101': 'Tributada pelo Simples Nacional com permissão de crédito',
  '102': 'Tributada pelo Simples Nacional sem permissão de crédito',
  '103': 'Isenção do ICMS no Simples Nacional para faixa de receita bruta',
  '201': 'Tributada pelo Simples com permissão de crédito e ICMS por ST',
  '202': 'Tributada pelo Simples sem permissão de crédito e ICMS por ST',
  '203': 'Isenção no Simples para faixa de receita bruta e ICMS por ST',
  '300': 'Imune',
  '400': 'Não tributada pelo Simples Nacional',
  '500': 'ICMS cobrado anteriormente por substituição tributária',
  '900': 'Outros'
}

export const ICMS_CST: Record<string, string> = {
  '00': 'Tributada integralmente',
  '10': 'Tributada e com cobrança do ICMS por substituição tributária',
  '20': 'Com redução de base de cálculo',
  '30': 'Isenta ou não tributada e com cobrança do ICMS por ST',
  '40': 'Isenta',
  '41': 'Não tributada',
  '50': 'Suspensão',
  '51': 'Diferimento',
  '60': 'ICMS cobrado anteriormente por substituição tributária',
  '70': 'Com redução de base de cálculo e cobrança do ICMS por ST',
  '90': 'Outros'
}

// ============================================
// CLASSE PRINCIPAL
// ============================================

export class FocusNFeClient {
  private config: FocusNFeConfig
  private supabase: ReturnType<typeof createClient>

  constructor() {
    // Validar variáveis de ambiente obrigatórias
    this.validateEnvVars()

    const ambiente = (process.env.FOCUS_NFE_AMBIENTE || 'homologacao') as 'homologacao' | 'producao'
    const token = ambiente === 'producao'
      ? process.env.FOCUS_NFE_TOKEN_PROD!
      : process.env.FOCUS_NFE_TOKEN_HOMOLOG!

    this.config = {
      token,
      ambiente,
      baseUrl: process.env.FOCUS_NFE_BASE_URL || (
        ambiente === 'producao'
          ? 'https://api.focusnfe.com.br'
          : 'https://homologacao.focusnfe.com.br'
      ),
      timeout: parseInt(process.env.FOCUS_NFE_TIMEOUT || '30000'),
      maxRetries: parseInt(process.env.FOCUS_NFE_MAX_RETRIES || '3'),
      retryDelayMs: parseInt(process.env.FOCUS_NFE_RETRY_DELAY || '1000')
    }

    // Criar cliente Supabase com service role para operações server-side
    this.supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      }
    )
  }

  private validateEnvVars(): void {
    const ambiente = process.env.FOCUS_NFE_AMBIENTE || 'homologacao'
    
    if (ambiente === 'producao' && !process.env.FOCUS_NFE_TOKEN_PROD) {
      throw new Error('FOCUS_NFE_TOKEN_PROD é obrigatório em ambiente de produção')
    }
    
    if (ambiente === 'homologacao' && !process.env.FOCUS_NFE_TOKEN_HOMOLOG) {
      throw new Error('FOCUS_NFE_TOKEN_HOMOLOG é obrigatório em ambiente de homologação')
    }

    if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
      throw new Error('Variáveis do Supabase não configuradas')
    }
  }

  private getAuthHeader(): string {
    return 'Basic ' + Buffer.from(this.config.token + ':').toString('base64')
  }

  /**
   * Gera uma referência única para a nota fiscal
   */
  gerarReferencia(vendaId: number): string {
    const timestamp = Date.now().toString(36)
    return `venda-${vendaId}-${timestamp}`
  }

  /**
   * Faz requisição HTTP com retry automático
   */
  private async fetchWithRetry<T>(
    url: string,
    options: RequestInit,
    retries = this.config.maxRetries
  ): Promise<{ data: T; status: number; durationMs: number }> {
    const startTime = Date.now()
    let lastError: Error | null = null

    for (let attempt = 0; attempt <= retries; attempt++) {
      try {
        const controller = new AbortController()
        const timeoutId = setTimeout(() => controller.abort(), this.config.timeout)

        const response = await fetch(url, {
          ...options,
          signal: controller.signal,
          headers: {
            'Authorization': this.getAuthHeader(),
            'Content-Type': 'application/json',
            ...options.headers
          }
        })

        clearTimeout(timeoutId)

        const data = await response.json()
        const durationMs = Date.now() - startTime

        if (!response.ok && response.status >= 500 && attempt < retries) {
          // Retry para erros 5xx
          await this.delay(this.config.retryDelayMs * Math.pow(2, attempt))
          continue
        }

        return { data, status: response.status, durationMs }
      } catch (error) {
        lastError = error as Error
        
        if (attempt < retries) {
          await this.delay(this.config.retryDelayMs * Math.pow(2, attempt))
        }
      }
    }

    throw lastError || new Error('Erro desconhecido após retries')
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms))
  }

  /**
   * Emite uma NF-e
   */
  async emitir(referencia: string, dados: NFeDados): Promise<{
    response: NFeResponse
    status: number
    durationMs: number
  }> {
    const url = `${this.config.baseUrl}/v2/nfe?ref=${referencia}`
    
    const result = await this.fetchWithRetry<NFeResponse>(url, {
      method: 'POST',
      body: JSON.stringify(dados)
    })

    // Normalizar resposta de erro da API Focus
    // A API pode retornar { codigo: "erro_...", mensagem: "..." } ao invés de { status: "..." }
    if (result.data.codigo && !result.data.status) {
      result.data.status = 'erro_autorizacao'
      result.data.mensagem_sefaz = result.data.mensagem
      result.data.erros = [{
        codigo: result.data.codigo,
        mensagem: result.data.mensagem || 'Erro desconhecido'
      }]
    }

    return {
      response: result.data,
      status: result.status,
      durationMs: result.durationMs
    }
  }

  /**
   * Consulta o status de uma NF-e
   */
  async consultar(referencia: string, completa = false): Promise<{
    response: NFeResponse
    status: number
    durationMs: number
  }> {
    const url = `${this.config.baseUrl}/v2/nfe/${referencia}${completa ? '?completa=1' : ''}`
    
    const result = await this.fetchWithRetry<NFeResponse>(url, {
      method: 'GET'
    })

    return {
      response: result.data,
      status: result.status,
      durationMs: result.durationMs
    }
  }

  /**
   * Cancela uma NF-e
   */
  async cancelar(referencia: string, justificativa: string): Promise<{
    response: NFeCancelamentoResponse
    status: number
    durationMs: number
  }> {
    if (justificativa.length < 15 || justificativa.length > 255) {
      throw new Error('Justificativa deve ter entre 15 e 255 caracteres')
    }

    const url = `${this.config.baseUrl}/v2/nfe/${referencia}`
    
    const result = await this.fetchWithRetry<NFeCancelamentoResponse>(url, {
      method: 'DELETE',
      body: JSON.stringify({ justificativa })
    })

    return {
      response: result.data,
      status: result.status,
      durationMs: result.durationMs
    }
  }

  /**
   * Emite carta de correção
   */
  async cartaCorrecao(referencia: string, correcao: string): Promise<{
    response: NFeCartaCorrecaoResponse
    status: number
    durationMs: number
  }> {
    if (correcao.length < 15 || correcao.length > 1000) {
      throw new Error('Correção deve ter entre 15 e 1000 caracteres')
    }

    const url = `${this.config.baseUrl}/v2/nfe/${referencia}/carta_correcao`
    
    const result = await this.fetchWithRetry<NFeCartaCorrecaoResponse>(url, {
      method: 'POST',
      body: JSON.stringify({ correcao })
    })

    return {
      response: result.data,
      status: result.status,
      durationMs: result.durationMs
    }
  }

  /**
   * Reenvia email da NF-e
   */
  async reenviarEmail(referencia: string, emails: string[]): Promise<void> {
    if (emails.length === 0 || emails.length > 10) {
      throw new Error('Informe entre 1 e 10 emails')
    }

    const url = `${this.config.baseUrl}/v2/nfe/${referencia}/email`
    
    await this.fetchWithRetry(url, {
      method: 'POST',
      body: JSON.stringify({ emails })
    })
  }

  /**
   * Baixa o XML da NF-e
   */
  async baixarXml(caminhoXml: string): Promise<string> {
    const url = `${this.config.baseUrl}${caminhoXml}`
    
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), this.config.timeout)

    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Authorization': this.getAuthHeader()
      },
      signal: controller.signal
    })

    clearTimeout(timeoutId)

    if (!response.ok) {
      throw new Error(`Erro ao baixar XML: ${response.status}`)
    }

    return await response.text()
  }

  /**
   * Retorna URL completa do DANFE
   */
  getUrlDanfe(caminhoDanfe: string): string {
    return `${this.config.baseUrl}${caminhoDanfe}`
  }

  /**
   * Retorna URL completa do XML
   */
  getUrlXml(caminhoXml: string): string {
    return `${this.config.baseUrl}${caminhoXml}`
  }

  /**
   * Retorna informações de configuração (sem dados sensíveis)
   */
  getInfo(): { ambiente: string; baseUrl: string } {
    return {
      ambiente: this.config.ambiente,
      baseUrl: this.config.baseUrl
    }
  }

  /**
   * Verifica se a configuração está válida
   */
  verificarConfiguracao(): { ok: boolean; mensagem: string } {
    if (!this.config.token) {
      return { ok: false, mensagem: 'Token não configurado' }
    }

    return { 
      ok: true, 
      mensagem: `API configurada para ambiente de ${this.config.ambiente}` 
    }
  }

  // ============================================
  // MÉTODOS DE BANCO DE DADOS
  // ============================================

  /**
   * Registra evento de uma nota fiscal
   */
  async registrarEvento(
    notaId: number,
    tipoEvento: string,
    descricao?: string | null,
    payloadEnvio?: unknown,
    payloadRetorno?: unknown,
    statusHttp?: number | null,
    duracaoMs?: number | null,
    erro?: string | null,
    usuarioId?: string | number | null
  ): Promise<void> {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (this.supabase as any).from('notas_fiscais_eventos').insert({
      nota_fiscal_id: notaId,
      tipo_evento: tipoEvento,
      descricao: descricao || null,
      payload_envio: payloadEnvio || null,
      payload_retorno: payloadRetorno || null,
      status_http: statusHttp || null,
      duracao_ms: duracaoMs || null,
      erro_mensagem: erro || null,
      usuario_id: usuarioId ? String(usuarioId) : null
    })
  }

  /**
   * Busca notas pendentes para processamento
   */
  async buscarNotasPendentes(limite = 10): Promise<Array<{
    id: number
    referencia: string
    venda_id: number
    tentativas_autorizacao: number
  }>> {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data, error } = await (this.supabase as any)
      .from('notas_fiscais')
      .select('id, referencia, venda_id, tentativas_autorizacao')
      .in('status', ['pendente', 'processando', 'processando_autorizacao'])
      .or(`proxima_consulta_em.is.null,proxima_consulta_em.lte.${new Date().toISOString()}`)
      .order('created_at', { ascending: true })
      .limit(limite)

    if (error) throw error
    return data || []
  }

  /**
   * Atualiza status da nota após consulta
   */
  async atualizarNotaAposConsulta(
    notaId: number,
    response: NFeResponse,
    tentativas: number,
    tempoAutorizacaoMs?: number
  ): Promise<void> {
    // Normalizar status - se não houver status, usar erro_autorizacao
    const statusFocus = response.status || 'erro_autorizacao'
    // Mapear status do Focus NFe para status válido do banco de dados
    const statusBanco = mapearStatusFocusParaBanco(statusFocus)
    
    const updateData: Record<string, unknown> = {
      status: statusBanco,
      status_sefaz: response.status_sefaz || response.codigo,
      mensagem_sefaz: response.mensagem_sefaz || response.mensagem,
      ultimo_status_focus: statusFocus,
      tentativas_autorizacao: tentativas,
      dados_retorno: response,
      updated_at: new Date().toISOString()
    }

    if (statusFocus === 'autorizado') {
      updateData.numero = response.numero
      updateData.serie = response.serie
      updateData.chave_acesso = response.chave_nfe
      updateData.url_xml = response.caminho_xml_nota_fiscal
      updateData.url_danfe = response.caminho_danfe
      updateData.emitida_em = new Date().toISOString()
      updateData.proxima_consulta_em = null
      if (tempoAutorizacaoMs) {
        updateData.tempo_autorizacao_ms = tempoAutorizacaoMs
      }
    } else if (statusFocus === 'erro_autorizacao' || statusFocus === 'denegado') {
      updateData.erro_detalhado = response.erros || (response.mensagem ? [{ codigo: response.codigo || 'erro', mensagem: response.mensagem }] : null)
      updateData.proxima_consulta_em = null
    } else if (statusFocus === 'processando_autorizacao') {
      // Calcular próximo retry com backoff exponencial
      const delayMs = Math.min(10000 * Math.pow(2, tentativas), 300000) // Max 5 min
      updateData.proxima_consulta_em = new Date(Date.now() + delayMs).toISOString()
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error } = await (this.supabase as any)
      .from('notas_fiscais')
      .update(updateData)
      .eq('id', notaId)

    if (error) throw error
  }

  /**
   * Atualiza venda após autorização da NF-e
   */
  async atualizarVendaAposAutorizacao(
    vendaId: number,
    numero: string,
    chave: string
  ): Promise<void> {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error } = await (this.supabase as any)
      .from('vendas')
      .update({
        nota_fiscal_emitida: true,
        numero_nf: numero,
        chave_nf: chave
      })
      .eq('id', vendaId)

    if (error) throw error
  }

  /**
   * Verifica se já existe nota não-cancelada para a venda
   */
  async verificarNotaExistente(vendaId: number): Promise<{
    existe: boolean
    nota?: { id: number; referencia: string; status: string }
  }> {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data, error } = await (this.supabase as any)
      .from('notas_fiscais')
      .select('id, referencia, status')
      .eq('venda_id', vendaId)
      .not('status', 'in', '(cancelada,rejeitada,erro_autorizacao)')
      .single()

    if (error && error.code !== 'PGRST116') { // PGRST116 = no rows
      throw error
    }

    return {
      existe: !!data,
      nota: data || undefined
    }
  }

  /**
   * Cria registro de nota fiscal
   */
  async criarNota(dados: {
    referencia: string
    venda_id: number
    tipo?: string
    valor_total: number
    valor_produtos: number
    valor_desconto?: number
    valor_frete?: number
    destinatario_nome: string
    destinatario_documento: string
    dados_envio: unknown
    ambiente: string
    usuario_id?: string
    ip_origem?: string
  }): Promise<{ id: number }> {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data, error } = await (this.supabase as any)
      .from('notas_fiscais')
      .insert({
        ...dados,
        tipo: dados.tipo || 'nfe',
        status: 'pendente',
        tentativas_autorizacao: 0,
        created_at: new Date().toISOString()
      })
      .select('id')
      .single()

    if (error) throw error
    return { id: data.id }
  }
}

// Singleton para reutilização
let clientInstance: FocusNFeClient | null = null

export function getFocusNFeClient(): FocusNFeClient {
  if (!clientInstance) {
    clientInstance = new FocusNFeClient()
  }
  return clientInstance
}
