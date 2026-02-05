/**
 * NFe Payload Builder
 * 
 * Funções para montar e validar o payload da NF-e
 */

import { NFeDados, NFeItem, NFeFormaPagamento, FORMAS_PAGAMENTO } from './focusnfe-server'

// ============================================
// TIPOS INTERNOS
// ============================================

export interface ConfigFiscal {
  cnpj: string
  inscricao_estadual: string
  inscricao_municipal?: string
  razao_social: string
  nome_fantasia?: string
  logradouro: string
  numero: string
  complemento?: string
  bairro: string
  codigo_municipio: string
  municipio: string
  uf: string
  cep: string
  telefone?: string
  regime_tributario: number
  natureza_operacao_padrao: string
  cfop_padrao: string
  informacoes_complementares?: string
}

export interface Venda {
  id: number
  valor_total: number
  valor_produtos: number
  valor_desconto?: number
  valor_frete?: number
  forma_pagamento?: string
  observacoes?: string
  cliente?: {
    nome?: string
    razao_social?: string
    cpf?: string
    cnpj?: string
    endereco?: string
    numero?: string
    complemento?: string
    bairro?: string
    cidade?: string
    estado?: string
    cep?: string
    email?: string
    telefone?: string
    inscricao_estadual?: string
    tipo?: 'fisica' | 'juridica'
  } | null
  itens?: Array<{
    produto_id: number | null
    tipo?: 'produto' | 'servico'
    descricao: string
    quantidade: number
    valor_unitario: number
    valor_total: number
    produto?: {
      ncm?: string
      unidade?: string
      codigo?: string
    } | null
  }>
}

export interface PayloadValidationResult {
  valid: boolean
  errors: string[]
  warnings: string[]
}

// ============================================
// VALIDAÇÕES
// ============================================

/**
 * Valida os dados antes de montar o payload
 */
export function validarDadosNfe(
  venda: Venda,
  configFiscal: ConfigFiscal,
  ambiente: 'homologacao' | 'producao'
): PayloadValidationResult {
  const errors: string[] = []
  const warnings: string[] = []

  // Validações do emitente
  if (!configFiscal.cnpj || configFiscal.cnpj.replace(/\D/g, '').length !== 14) {
    errors.push('CNPJ do emitente inválido')
  }

  if (!configFiscal.inscricao_estadual) {
    errors.push('Inscrição Estadual do emitente é obrigatória')
  }

  if (!configFiscal.razao_social) {
    errors.push('Razão Social do emitente é obrigatória')
  }

  if (!configFiscal.logradouro || !configFiscal.numero || !configFiscal.bairro) {
    errors.push('Endereço do emitente incompleto')
  }

  if (!configFiscal.municipio || !configFiscal.uf || !configFiscal.cep) {
    errors.push('Município/UF/CEP do emitente são obrigatórios')
  }

  // Validações da venda
  if (!venda.valor_total || venda.valor_total <= 0) {
    errors.push('Valor total da venda deve ser maior que zero')
  }

  if (!venda.itens || venda.itens.length === 0) {
    errors.push('Venda deve ter pelo menos um item')
  }

  // Validações dos itens
  venda.itens?.forEach((item, index) => {
    const itemNum = index + 1

    if (!item.descricao) {
      errors.push(`Item ${itemNum}: descrição é obrigatória`)
    }

    if (!item.quantidade || item.quantidade <= 0) {
      errors.push(`Item ${itemNum}: quantidade deve ser maior que zero`)
    }

    if (item.valor_unitario === undefined || item.valor_unitario < 0) {
      errors.push(`Item ${itemNum}: valor unitário inválido`)
    }

    // NCM é obrigatório em produção
    const ncm = item.produto?.ncm || ''
    if (ambiente === 'producao') {
      if (!ncm || ncm === '00000000' || ncm.length !== 8) {
        errors.push(`Item ${itemNum}: NCM inválido ou não informado (obrigatório em produção)`)
      }
    } else if (!ncm || ncm === '00000000') {
      warnings.push(`Item ${itemNum}: NCM não informado (será usado NCM padrão em homologação)`)
    }
  })

  // Validações do destinatário
  const cliente = venda.cliente
  if (cliente) {
    const cpf = cliente.cpf?.replace(/\D/g, '')
    const cnpj = cliente.cnpj?.replace(/\D/g, '')

    if (!cpf && !cnpj) {
      warnings.push('Destinatário sem CPF/CNPJ - será tratado como consumidor não identificado')
    } else if (cpf && cpf.length !== 11) {
      errors.push('CPF do destinatário inválido')
    } else if (cnpj && cnpj.length !== 14) {
      errors.push('CNPJ do destinatário inválido')
    }
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings
  }
}

/**
 * Determina o CFOP baseado na operação
 */
export function determinarCfop(
  ufEmitente: string,
  ufDestinatario: string | undefined,
  cfopPadrao: string,
  tipoOperacao: 'venda' | 'devolucao' | 'transferencia' = 'venda'
): string {
  const mesmoEstado = !ufDestinatario || ufEmitente === ufDestinatario

  // CFOPs para venda
  if (tipoOperacao === 'venda') {
    if (mesmoEstado) {
      return '5102' // Venda de mercadoria dentro do estado
    } else {
      return '6102' // Venda de mercadoria para outro estado
    }
  }

  // CFOPs para devolução
  if (tipoOperacao === 'devolucao') {
    return mesmoEstado ? '5202' : '6202'
  }

  // CFOPs para transferência
  if (tipoOperacao === 'transferencia') {
    return mesmoEstado ? '5152' : '6152'
  }

  return cfopPadrao
}

/**
 * Mapeia forma de pagamento do sistema para código NFe
 */
export function mapearFormaPagamento(formaPagamento: string | undefined): string {
  if (!formaPagamento) return '01' // Dinheiro como padrão

  const codigo = FORMAS_PAGAMENTO[formaPagamento.toLowerCase()]
  return codigo || '99' // Outros se não encontrar
}

// ============================================
// BUILDER
// ============================================

/**
 * Monta o payload completo da NF-e
 */
export function buildNfePayload(
  venda: Venda,
  configFiscal: ConfigFiscal,
  ambiente: 'homologacao' | 'producao'
): NFeDados {
  const cliente = venda.cliente
  const isHomologacao = ambiente === 'homologacao'

  // Determinar CFOP
  const cfop = determinarCfop(
    configFiscal.uf,
    cliente?.estado,
    configFiscal.cfop_padrao
  )

  // Montar itens
  const itensNFe: NFeItem[] = (venda.itens || []).map((item, index) => {
    const ncm = item.produto?.ncm || (isHomologacao ? '39172100' : '') // NCM de tubos plásticos para homologação
    const unidade = item.produto?.unidade || 'UN'
    
    // Gerar código do produto (produto_id pode ser null para serviços)
    const codigoProduto = item.produto?.codigo 
      || (item.produto_id ? item.produto_id.toString() : `ITEM-${index + 1}`)

    return {
      numero_item: index + 1,
      codigo_produto: codigoProduto,
      // A descrição dos produtos deve ser a real - apenas o DESTINATÁRIO tem msg de homologação
      descricao: item.descricao,
      codigo_ncm: ncm, // Focus NFe espera codigo_ncm
      cfop,
      unidade_comercial: unidade,
      quantidade_comercial: item.quantidade,
      valor_unitario_comercial: item.valor_unitario,
      valor_bruto: item.valor_total,
      unidade_tributavel: unidade,
      quantidade_tributavel: item.quantidade,
      valor_unitario_tributavel: item.valor_unitario,
      origem: 0, // Nacional
      icms_origem: 0, // Nacional
      icms_situacao_tributaria: configFiscal.regime_tributario === 1 ? '102' : '00',
      pis_situacao_tributaria: '07', // Operação Isenta
      cofins_situacao_tributaria: '07', // Operação Isenta
      inclui_no_total: 1
    }
  })

  // Calcular valor_produtos como soma dos itens (SEFAZ valida isso!)
  const valorProdutosCalculado = itensNFe.reduce((sum, item) => sum + item.valor_bruto, 0)
  
  // Calcular valor total = produtos - desconto + frete
  const valorDesconto = venda.valor_desconto || 0
  const valorFrete = venda.valor_frete || 0
  const valorTotalCalculado = valorProdutosCalculado - valorDesconto + valorFrete

  // Montar forma de pagamento
  const codigoPagamento = mapearFormaPagamento(venda.forma_pagamento)
  const formasPagamento: NFeFormaPagamento[] = [{
    forma_pagamento: codigoPagamento,
    valor_pagamento: valorTotalCalculado
  }]

  // Montar payload completo
  // Data de emissão com fuso horário de MT (-04:00)
  const dataEmissao = getDataEmissaoComFuso(configFiscal.uf)
  
  const payload: NFeDados = {
    // Dados gerais
    natureza_operacao: configFiscal.natureza_operacao_padrao || 'Venda',
    data_emissao: dataEmissao,
    tipo_documento: 1, // Saída
    local_destino: determinarLocalDestino(configFiscal.uf, cliente?.estado),
    finalidade_emissao: 1, // Normal
    consumidor_final: 1,
    presenca_comprador: 1, // Presencial

    // Emitente
    cnpj_emitente: configFiscal.cnpj.replace(/\D/g, ''),
    inscricao_estadual_emitente: configFiscal.inscricao_estadual.replace(/\D/g, ''),
    nome_emitente: configFiscal.razao_social,
    nome_fantasia_emitente: configFiscal.nome_fantasia || configFiscal.razao_social,
    logradouro_emitente: configFiscal.logradouro,
    numero_emitente: configFiscal.numero,
    complemento_emitente: configFiscal.complemento || '',
    bairro_emitente: configFiscal.bairro,
    codigo_municipio_emitente: configFiscal.codigo_municipio,
    municipio_emitente: configFiscal.municipio,
    uf_emitente: configFiscal.uf,
    cep_emitente: configFiscal.cep.replace(/\D/g, ''),
    telefone_emitente: configFiscal.telefone?.replace(/\D/g, '') || '',
    regime_tributario_emitente: configFiscal.regime_tributario as 1 | 2 | 3,

    // Destinatário
    nome_destinatario: isHomologacao
      ? 'NF-E EMITIDA EM AMBIENTE DE HOMOLOGACAO - SEM VALOR FISCAL'
      : (cliente?.nome || cliente?.razao_social || 'Consumidor Final'),
    cpf_destinatario: cliente?.cpf?.replace(/\D/g, '') || undefined,
    cnpj_destinatario: cliente?.cnpj?.replace(/\D/g, '') || undefined,
    inscricao_estadual_destinatario: cliente?.inscricao_estadual?.replace(/\D/g, '') || undefined,
    logradouro_destinatario: cliente?.endereco || '',
    numero_destinatario: cliente?.numero || 'S/N',
    complemento_destinatario: cliente?.complemento || '',
    bairro_destinatario: cliente?.bairro || '',
    codigo_municipio_destinatario: configFiscal.codigo_municipio, // Usa mesmo código se cliente local
    municipio_destinatario: cliente?.cidade || configFiscal.municipio,
    uf_destinatario: cliente?.estado || configFiscal.uf,
    cep_destinatario: cliente?.cep?.replace(/\D/g, '') || configFiscal.cep.replace(/\D/g, ''),
    pais_destinatario: 'Brasil',
    codigo_pais_destinatario: '1058',
    indicador_inscricao_estadual_destinatario: determinarIndicadorIE(cliente),

    // Totais (calculados a partir dos itens para garantir consistência com SEFAZ)
    valor_total: valorTotalCalculado,
    valor_produtos: valorProdutosCalculado,
    valor_desconto: valorDesconto,
    valor_frete: valorFrete,

    // Frete
    modalidade_frete: 9, // Sem frete

    // Itens
    items: itensNFe,

    // Pagamento
    formas_pagamento: formasPagamento,

    // Informações adicionais
    informacoes_adicionais_contribuinte: venda.observacoes || configFiscal.informacoes_complementares || ''
  }

  return payload
}

/**
 * Gera data de emissão com fuso horário baseado na UF
 * Formato ISO 8601: YYYY-MM-DDTHH:MM:SS-HH:00
 */
function getDataEmissaoComFuso(uf: string): string {
  const now = new Date()
  
  // Fusos horários por UF
  const fusos: Record<string, number> = {
    // UTC-3 (Brasília) - maioria dos estados
    'SP': -3, 'RJ': -3, 'MG': -3, 'ES': -3, 'PR': -3, 'SC': -3, 'RS': -3,
    'BA': -3, 'SE': -3, 'AL': -3, 'PE': -3, 'PB': -3, 'RN': -3, 'CE': -3,
    'PI': -3, 'MA': -3, 'PA': -3, 'AP': -3, 'GO': -3, 'DF': -3, 'TO': -3,
    // UTC-4 (Amazônia)
    'MT': -4, 'MS': -4, 'RO': -4, 'AM': -4, 'RR': -4,
    // UTC-5 (Acre)
    'AC': -5
  }
  
  const fuso = fusos[uf] || -3 // Padrão Brasília
  
  // Formatar fuso corretamente: -04:00, -03:00, +00:00
  const fusoAbs = Math.abs(fuso)
  const fusoStr = `${fuso < 0 ? '-' : '+'}${String(fusoAbs).padStart(2, '0')}:00`
  
  // Ajustar horário para o fuso
  const localDate = new Date(now.getTime() + (fuso * 60 + now.getTimezoneOffset()) * 60000)
  
  const ano = localDate.getFullYear()
  const mes = String(localDate.getMonth() + 1).padStart(2, '0')
  const dia = String(localDate.getDate()).padStart(2, '0')
  const hora = String(localDate.getHours()).padStart(2, '0')
  const min = String(localDate.getMinutes()).padStart(2, '0')
  const seg = String(localDate.getSeconds()).padStart(2, '0')
  
  // Formato: 2026-02-05T08:30:45-04:00
  return `${ano}-${mes}-${dia}T${hora}:${min}:${seg}${fusoStr}`
}

/**
 * Determina o local de destino da operação
 */
function determinarLocalDestino(
  ufEmitente: string,
  ufDestinatario: string | undefined
): 1 | 2 | 3 {
  if (!ufDestinatario || ufEmitente === ufDestinatario) {
    return 1 // Operação interna
  }
  return 2 // Operação interestadual
}

/**
 * Determina o indicador de IE do destinatário
 */
function determinarIndicadorIE(
  cliente: Venda['cliente']
): 1 | 2 | 9 {
  if (!cliente) return 9 // Não contribuinte

  // Se tem IE, é contribuinte
  if (cliente.inscricao_estadual) {
    return 1 // Contribuinte ICMS
  }

  // Se é pessoa jurídica sem IE
  if (cliente.cnpj || cliente.tipo === 'juridica') {
    return 2 // Isento de inscrição
  }

  return 9 // Não contribuinte
}
