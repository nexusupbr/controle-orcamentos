/**
 * Focus NFe API Integration
 * Documentação: https://focusnfe.com.br/doc/
 * 
 * Este módulo fornece funções para integração com a API Focus NFe
 * para emissão de NFe, NFCe e NFSe.
 */

// Configuração da API
const FOCUS_NFE_CONFIG = {
  // Token de autenticação (em produção, usar variável de ambiente)
  token: '2ULj65rWvkjqHXwopIPyDZx7jxvZqCsk',
  
  // Ambiente: 'homologacao' para testes, 'producao' para notas reais
  ambiente: 'homologacao' as 'homologacao' | 'producao',
  
  get baseUrl(): string {
    return this.ambiente === 'producao' 
      ? 'https://api.focusnfe.com.br'
      : 'https://homologacao.focusnfe.com.br';
  },
  
  get authHeader(): string {
    return 'Basic ' + Buffer.from(this.token + ':').toString('base64');
  }
};

// Tipos
export interface NFeDadosEmitente {
  cnpj_emitente: string;
  inscricao_estadual_emitente: string;
  nome_emitente: string;
  nome_fantasia_emitente?: string;
  logradouro_emitente: string;
  numero_emitente: string;
  complemento_emitente?: string;
  bairro_emitente: string;
  municipio_emitente: string;
  uf_emitente: string;
  cep_emitente: string;
  telefone_emitente?: string;
  regime_tributario_emitente: 1 | 2 | 3; // 1=Simples, 2=Excesso, 3=Normal
}

export interface NFeDadosDestinatario {
  nome_destinatario: string;
  cpf_destinatario?: string;
  cnpj_destinatario?: string;
  inscricao_estadual_destinatario?: string;
  logradouro_destinatario?: string;
  numero_destinatario?: string;
  complemento_destinatario?: string;
  bairro_destinatario?: string;
  municipio_destinatario?: string;
  uf_destinatario?: string;
  cep_destinatario?: string;
  telefone_destinatario?: string;
  email_destinatario?: string;
  indicador_inscricao_estadual_destinatario?: 1 | 2 | 9; // 1=Contribuinte, 2=Isento, 9=Não contribuinte
}

export interface NFeItem {
  numero_item: number;
  codigo_produto: string;
  descricao: string;
  ncm: string;
  cfop: string;
  unidade_comercial: string;
  quantidade_comercial: number;
  valor_unitario_comercial: number;
  valor_bruto: number;
  unidade_tributavel?: string;
  quantidade_tributavel?: number;
  valor_unitario_tributavel?: number;
  
  // Impostos
  icms_origem: 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8;
  icms_situacao_tributaria: string;
  icms_aliquota?: number;
  icms_base_calculo?: number;
  icms_valor?: number;
  
  pis_situacao_tributaria?: string;
  pis_base_calculo?: number;
  pis_aliquota?: number;
  pis_valor?: number;
  
  cofins_situacao_tributaria?: string;
  cofins_base_calculo?: number;
  cofins_aliquota?: number;
  cofins_valor?: number;
}

export interface NFeFormaPagamento {
  forma_pagamento: string; // 01=Dinheiro, 02=Cheque, 03=Cartão Crédito, 04=Cartão Débito, etc
  valor_pagamento: number;
  tipo_integracao?: 1 | 2;
  cnpj_credenciadora?: string;
  numero_autorizacao?: string;
  bandeira_operadora?: string;
}

export interface NFeDados {
  // Dados gerais
  natureza_operacao: string;
  data_emissao: string; // ISO format: "2026-01-27T12:00:00-03:00"
  data_entrada_saida?: string;
  tipo_documento: 0 | 1; // 0=Entrada, 1=Saída
  local_destino: 1 | 2 | 3; // 1=Interna, 2=Interestadual, 3=Exterior
  finalidade_emissao: 1 | 2 | 3 | 4; // 1=Normal, 2=Complementar, 3=Ajuste, 4=Devolução
  consumidor_final: 0 | 1;
  presenca_comprador: 0 | 1 | 2 | 3 | 4 | 9;
  
  // Emitente (incluído via spread)
  cnpj_emitente: string;
  inscricao_estadual_emitente: string;
  nome_emitente: string;
  nome_fantasia_emitente?: string;
  logradouro_emitente: string;
  numero_emitente: string;
  complemento_emitente?: string;
  bairro_emitente: string;
  municipio_emitente: string;
  uf_emitente: string;
  cep_emitente: string;
  telefone_emitente?: string;
  regime_tributario_emitente: 1 | 2 | 3;
  
  // Destinatário (incluído via spread)
  nome_destinatario: string;
  cpf_destinatario?: string;
  cnpj_destinatario?: string;
  inscricao_estadual_destinatario?: string;
  logradouro_destinatario?: string;
  numero_destinatario?: string;
  complemento_destinatario?: string;
  bairro_destinatario?: string;
  municipio_destinatario?: string;
  uf_destinatario?: string;
  cep_destinatario?: string;
  indicador_inscricao_estadual_destinatario?: 1 | 2 | 9;
  
  // Totais
  valor_total: number;
  valor_produtos?: number;
  valor_desconto?: number;
  valor_frete?: number;
  valor_seguro?: number;
  valor_outras_despesas?: number;
  
  // Frete
  modalidade_frete: 0 | 1 | 2 | 9; // 0=Emitente, 1=Destinatário, 2=Terceiros, 9=Sem frete
  
  // Itens
  items: NFeItem[];
  
  // Pagamento
  formas_pagamento: NFeFormaPagamento[];
  
  // Informações adicionais
  informacoes_adicionais_contribuinte?: string;
  informacoes_adicionais_fisco?: string;
}

export interface NFeResponse {
  cnpj_emitente: string;
  ref: string;
  status: 'processando_autorizacao' | 'autorizado' | 'cancelado' | 'erro_autorizacao' | 'denegado';
  status_sefaz?: string;
  mensagem_sefaz?: string;
  chave_nfe?: string;
  numero?: string;
  serie?: string;
  caminho_xml_nota_fiscal?: string;
  caminho_danfe?: string;
  caminho_xml_cancelamento?: string;
  caminho_xml_carta_correcao?: string;
  caminho_pdf_carta_correcao?: string;
  numero_carta_correcao?: number;
  erros?: Array<{
    codigo: string;
    mensagem: string;
    correcao?: string;
  }>;
}

export interface NFeCancelamentoResponse {
  status: 'cancelado' | 'erro_cancelamento';
  status_sefaz: string;
  mensagem_sefaz: string;
  caminho_xml_cancelamento?: string;
}

export interface NFeCartaCorrecaoResponse {
  status: 'autorizado' | 'erro_autorizacao';
  status_sefaz: string;
  mensagem_sefaz: string;
  caminho_xml_carta_correcao?: string;
  caminho_pdf_carta_correcao?: string;
  numero_carta_correcao?: number;
}

// ============================================
// FUNÇÕES DA API
// ============================================

/**
 * Gera uma referência única para a nota fiscal
 */
export function gerarReferenciaNFe(): string {
  const timestamp = Date.now();
  const random = Math.random().toString(36).substring(2, 8);
  return `nfe_${timestamp}_${random}`;
}

/**
 * Emite uma NFe
 * @param referencia - Referência única da nota
 * @param dados - Dados da NFe
 */
export async function emitirNFe(referencia: string, dados: NFeDados): Promise<NFeResponse> {
  try {
    const response = await fetch(`${FOCUS_NFE_CONFIG.baseUrl}/v2/nfe?ref=${referencia}`, {
      method: 'POST',
      headers: {
        'Authorization': FOCUS_NFE_CONFIG.authHeader,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(dados)
    });
    
    const result = await response.json();
    
    if (!response.ok) {
      console.error('Erro ao emitir NFe:', result);
      throw new Error(result.mensagem || `Erro HTTP ${response.status}`);
    }
    
    return result;
  } catch (error) {
    console.error('Erro na requisição de emissão NFe:', error);
    throw error;
  }
}

/**
 * Consulta o status de uma NFe
 * @param referencia - Referência da nota
 * @param completa - Se true, retorna dados completos
 */
export async function consultarNFe(referencia: string, completa: boolean = false): Promise<NFeResponse> {
  try {
    const url = `${FOCUS_NFE_CONFIG.baseUrl}/v2/nfe/${referencia}${completa ? '?completa=1' : ''}`;
    
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Authorization': FOCUS_NFE_CONFIG.authHeader
      }
    });
    
    const result = await response.json();
    
    if (!response.ok) {
      console.error('Erro ao consultar NFe:', result);
      throw new Error(result.mensagem || `Erro HTTP ${response.status}`);
    }
    
    return result;
  } catch (error) {
    console.error('Erro na requisição de consulta NFe:', error);
    throw error;
  }
}

/**
 * Aguarda a autorização de uma NFe (polling)
 * @param referencia - Referência da nota
 * @param maxTentativas - Número máximo de tentativas
 * @param intervaloMs - Intervalo entre tentativas em ms
 */
export async function aguardarAutorizacaoNFe(
  referencia: string, 
  maxTentativas: number = 30, 
  intervaloMs: number = 2000
): Promise<NFeResponse> {
  for (let i = 0; i < maxTentativas; i++) {
    const resultado = await consultarNFe(referencia);
    
    if (resultado.status !== 'processando_autorizacao') {
      return resultado;
    }
    
    // Aguarda antes da próxima tentativa
    await new Promise(resolve => setTimeout(resolve, intervaloMs));
  }
  
  throw new Error('Tempo limite excedido aguardando autorização da NFe');
}

/**
 * Cancela uma NFe
 * @param referencia - Referência da nota
 * @param justificativa - Justificativa do cancelamento (15-255 caracteres)
 */
export async function cancelarNFe(referencia: string, justificativa: string): Promise<NFeCancelamentoResponse> {
  if (justificativa.length < 15 || justificativa.length > 255) {
    throw new Error('Justificativa deve ter entre 15 e 255 caracteres');
  }
  
  try {
    const response = await fetch(`${FOCUS_NFE_CONFIG.baseUrl}/v2/nfe/${referencia}`, {
      method: 'DELETE',
      headers: {
        'Authorization': FOCUS_NFE_CONFIG.authHeader,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ justificativa })
    });
    
    const result = await response.json();
    
    if (!response.ok) {
      console.error('Erro ao cancelar NFe:', result);
      throw new Error(result.mensagem || `Erro HTTP ${response.status}`);
    }
    
    return result;
  } catch (error) {
    console.error('Erro na requisição de cancelamento NFe:', error);
    throw error;
  }
}

/**
 * Emite uma Carta de Correção para uma NFe
 * @param referencia - Referência da nota
 * @param correcao - Texto da correção (15-1000 caracteres)
 */
export async function emitirCartaCorrecao(referencia: string, correcao: string): Promise<NFeCartaCorrecaoResponse> {
  if (correcao.length < 15 || correcao.length > 1000) {
    throw new Error('Correção deve ter entre 15 e 1000 caracteres');
  }
  
  try {
    const response = await fetch(`${FOCUS_NFE_CONFIG.baseUrl}/v2/nfe/${referencia}/carta_correcao`, {
      method: 'POST',
      headers: {
        'Authorization': FOCUS_NFE_CONFIG.authHeader,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ correcao })
    });
    
    const result = await response.json();
    
    if (!response.ok) {
      console.error('Erro ao emitir carta de correção:', result);
      throw new Error(result.mensagem || `Erro HTTP ${response.status}`);
    }
    
    return result;
  } catch (error) {
    console.error('Erro na requisição de carta de correção:', error);
    throw error;
  }
}

/**
 * Reenvia a NFe por email
 * @param referencia - Referência da nota
 * @param emails - Lista de emails (máx. 10)
 */
export async function reenviarEmailNFe(referencia: string, emails: string[]): Promise<void> {
  if (emails.length > 10) {
    throw new Error('Máximo de 10 emails por vez');
  }
  
  try {
    const response = await fetch(`${FOCUS_NFE_CONFIG.baseUrl}/v2/nfe/${referencia}/email`, {
      method: 'POST',
      headers: {
        'Authorization': FOCUS_NFE_CONFIG.authHeader,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ emails })
    });
    
    if (!response.ok) {
      const result = await response.json();
      console.error('Erro ao reenviar email:', result);
      throw new Error(result.mensagem || `Erro HTTP ${response.status}`);
    }
  } catch (error) {
    console.error('Erro na requisição de reenvio de email:', error);
    throw error;
  }
}

/**
 * Baixa o XML da NFe
 * @param caminhoXml - Caminho do XML retornado pela API
 */
export async function baixarXmlNFe(caminhoXml: string): Promise<string> {
  try {
    const url = `${FOCUS_NFE_CONFIG.baseUrl}${caminhoXml}`;
    
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Authorization': FOCUS_NFE_CONFIG.authHeader
      }
    });
    
    if (!response.ok) {
      throw new Error(`Erro HTTP ${response.status}`);
    }
    
    return await response.text();
  } catch (error) {
    console.error('Erro ao baixar XML:', error);
    throw error;
  }
}

/**
 * Obtém a URL completa do DANFE
 * @param caminhoDanfe - Caminho do DANFE retornado pela API
 */
export function getUrlDanfe(caminhoDanfe: string): string {
  return `${FOCUS_NFE_CONFIG.baseUrl}${caminhoDanfe}`;
}

/**
 * Obtém a URL completa do XML
 * @param caminhoXml - Caminho do XML retornado pela API
 */
export function getUrlXml(caminhoXml: string): string {
  return `${FOCUS_NFE_CONFIG.baseUrl}${caminhoXml}`;
}

// ============================================
// FUNÇÕES AUXILIARES
// ============================================

/**
 * Mapeamento de formas de pagamento
 */
export const FORMAS_PAGAMENTO = {
  '01': 'Dinheiro',
  '02': 'Cheque',
  '03': 'Cartão de Crédito',
  '04': 'Cartão de Débito',
  '05': 'Crédito Loja',
  '10': 'Vale Alimentação',
  '11': 'Vale Refeição',
  '12': 'Vale Presente',
  '13': 'Vale Combustível',
  '14': 'Duplicata Mercantil',
  '15': 'Boleto Bancário',
  '16': 'Depósito Bancário',
  '17': 'PIX',
  '18': 'Transferência bancária',
  '19': 'Programa de fidelidade',
  '90': 'Sem pagamento',
  '99': 'Outros'
};

/**
 * Mapeamento de situações tributárias ICMS (Simples Nacional)
 */
export const ICMS_CSOSN = {
  '101': 'Tributada pelo Simples Nacional com permissão de crédito',
  '102': 'Tributada pelo Simples Nacional sem permissão de crédito',
  '103': 'Isenção do ICMS no Simples Nacional para faixa de receita bruta',
  '201': 'Tributada pelo Simples Nacional com permissão de crédito e com cobrança do ICMS por substituição tributária',
  '202': 'Tributada pelo Simples Nacional sem permissão de crédito e com cobrança do ICMS por substituição tributária',
  '203': 'Isenção do ICMS no Simples Nacional para faixa de receita bruta e com cobrança do ICMS por substituição tributária',
  '300': 'Imune',
  '400': 'Não tributada pelo Simples Nacional',
  '500': 'ICMS cobrado anteriormente por substituição tributária (substituído) ou por antecipação',
  '900': 'Outros'
};

/**
 * Mapeamento de situações tributárias ICMS (Regime Normal)
 */
export const ICMS_CST = {
  '00': 'Tributada integralmente',
  '10': 'Tributada e com cobrança do ICMS por substituição tributária',
  '20': 'Com redução de base de cálculo',
  '30': 'Isenta ou não tributada e com cobrança do ICMS por substituição tributária',
  '40': 'Isenta',
  '41': 'Não tributada',
  '50': 'Suspensão',
  '51': 'Diferimento',
  '60': 'ICMS cobrado anteriormente por substituição tributária',
  '70': 'Com redução de base de cálculo e cobrança do ICMS por substituição tributária',
  '90': 'Outros'
};

/**
 * Mapeamento de origens do produto
 */
export const ICMS_ORIGEM = {
  0: 'Nacional, exceto as indicadas nos códigos 3, 4, 5 e 8',
  1: 'Estrangeira - Importação direta, exceto a indicada no código 6',
  2: 'Estrangeira - Adquirida no mercado interno, exceto a indicada no código 7',
  3: 'Nacional, mercadoria ou bem com Conteúdo de Importação superior a 40% e inferior ou igual a 70%',
  4: 'Nacional, cuja produção tenha sido feita em conformidade com os processos produtivos básicos',
  5: 'Nacional, mercadoria ou bem com Conteúdo de Importação inferior ou igual a 40%',
  6: 'Estrangeira - Importação direta, sem similar nacional, constante em lista de Resolução CAMEX',
  7: 'Estrangeira - Adquirida no mercado interno, sem similar nacional, constante em lista de Resolução CAMEX',
  8: 'Nacional, mercadoria ou bem com Conteúdo de Importação superior a 70%'
};

/**
 * Configurações da API (para uso externo)
 */
export function getConfig() {
  return {
    ambiente: FOCUS_NFE_CONFIG.ambiente,
    baseUrl: FOCUS_NFE_CONFIG.baseUrl,
    tokenConfigurado: !!FOCUS_NFE_CONFIG.token
  };
}

/**
 * Altera o ambiente da API
 */
export function setAmbiente(ambiente: 'homologacao' | 'producao') {
  FOCUS_NFE_CONFIG.ambiente = ambiente;
}

/**
 * Verifica se a API está configurada corretamente
 */
export function verificarConfiguracao(): { ok: boolean; mensagem: string } {
  if (!FOCUS_NFE_CONFIG.token) {
    return { ok: false, mensagem: 'Token não configurado' };
  }
  
  return { ok: true, mensagem: `API configurada para ambiente de ${FOCUS_NFE_CONFIG.ambiente}` };
}
