import { type ClassValue, clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatCurrency(value: number): string {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value)
}

export function formatDate(date: string | Date): string {
  if (!date) return '-'
  const d = new Date(date)
  if (isNaN(d.getTime())) return '-'
  return d.toLocaleDateString('pt-BR')
}

export function formatPercent(value: number): string {
  return `${value.toFixed(1)}%`
}

export function calcConversionRate(fechados: number, total: number): number {
  if (!total || total === 0) return 0
  return (fechados / total) * 100
}

// Formata número para o padrão brasileiro (1.480,90)
export function formatNumberBR(value: number | string): string {
  const num = typeof value === 'string' ? parseFloat(value) || 0 : value
  return num.toLocaleString('pt-BR', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })
}

// Converte string formatada (1.480,90) para número
export function parseNumberBR(value: string): number {
  if (!value) return 0
  // Remove pontos (separador de milhar) e troca vírgula por ponto
  const cleaned = value.replace(/\./g, '').replace(',', '.')
  return parseFloat(cleaned) || 0
}

// Arredonda valor para 2 casas decimais (evita erros de ponto flutuante)
export function round2(value: number): number {
  return Math.round(value * 100) / 100
}

// Máscara de input para valores monetários
export function maskCurrency(value: string): string {
  // Remove tudo exceto números
  let numbers = value.replace(/\D/g, '')
  
  // Se vazio, retorna vazio
  if (!numbers) return ''
  
  // Converte para número e divide por 100 para ter 2 casas decimais
  const num = parseInt(numbers) / 100
  
  // Formata para pt-BR
  return num.toLocaleString('pt-BR', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })
}

// Base path para assets em produção (GitHub Pages)
export const basePath = process.env.NODE_ENV === 'production' ? '/controle-orcamentos' : ''

// Helper para gerar URLs de assets com basePath
export function getAssetPath(path: string): string {
  return `${basePath}${path}`
}

// ==================== NORMALIZAÇÃO DE UNIDADE ====================

// Lista de unidades válidas (códigos fiscais padrão)
export const UNIDADES_VALIDAS = [
  'UN', 'PC', 'KG', 'G', 'L', 'ML', 'M', 'CM', 'M2', 'M3',
  'CX', 'PAR', 'SC', 'FD', 'PCT', 'RL', 'TON', 'DZ', 'CT',
  'BD', 'JG', 'KIT', 'AMPOLA', 'UNID', 'PECA', 'METRO',
  'LITRO', 'QUILO', 'CAIXA', 'SACO', 'FARDO', 'PACOTE',
  'ROLO', 'DUZIA', 'CARTELA', 'BALDE', 'JOGO'
] as const

// Mapa de sinônimos para normalização
const SINONIMOS_UNIDADE: Record<string, string> = {
  'UNID': 'UN',
  'UNIDADE': 'UN',
  'UNIDADES': 'UN',
  'PECA': 'PC',
  'PEÇA': 'PC',
  'PECAS': 'PC',
  'PEÇAS': 'PC',
  'METRO': 'M',
  'METROS': 'M',
  'LITRO': 'L',
  'LITROS': 'L',
  'QUILO': 'KG',
  'QUILOS': 'KG',
  'QUILOGRAMA': 'KG',
  'QUILOGRAMAS': 'KG',
  'GRAMA': 'G',
  'GRAMAS': 'G',
  'MILILITRO': 'ML',
  'MILILITROS': 'ML',
  'CENTIMETRO': 'CM',
  'CENTIMETROS': 'CM',
  'CENTÍMETRO': 'CM',
  'CENTÍMETROS': 'CM',
  'CAIXA': 'CX',
  'CAIXAS': 'CX',
  'SACO': 'SC',
  'SACOS': 'SC',
  'FARDO': 'FD',
  'FARDOS': 'FD',
  'PACOTE': 'PCT',
  'PACOTES': 'PCT',
  'ROLO': 'RL',
  'ROLOS': 'RL',
  'TONELADA': 'TON',
  'TONELADAS': 'TON',
  'DUZIA': 'DZ',
  'DÚZIA': 'DZ',
  'DUZIAS': 'DZ',
  'CARTELA': 'CT',
  'CARTELAS': 'CT',
  'BALDE': 'BD',
  'BALDES': 'BD',
  'JOGO': 'JG',
  'JOGOS': 'JG',
}

/**
 * Normaliza a unidade do produto para um código válido.
 * 
 * @param unidade - Valor da unidade (pode ser string, número, null, undefined)
 * @param defaultUnidade - Unidade padrão caso inválido (default: 'UN')
 * @returns Código de unidade válido em uppercase
 * 
 * @example
 * normalizeUnidade('1')       // 'UN' (número como string = inválido)
 * normalizeUnidade(1)         // 'UN' (número = inválido)
 * normalizeUnidade('unidade') // 'UN' (sinônimo)
 * normalizeUnidade('kg')      // 'KG' (uppercase)
 * normalizeUnidade('')        // 'UN' (vazio)
 * normalizeUnidade(null)      // 'UN' (null)
 */
export function normalizeUnidade(unidade: unknown, defaultUnidade: string = 'UN'): string {
  // Se for null, undefined ou vazio
  if (unidade === null || unidade === undefined) {
    return defaultUnidade
  }
  
  // Se for número, é inválido (provavelmente erro de mapeamento)
  if (typeof unidade === 'number') {
    console.warn(`[normalizeUnidade] Valor numérico recebido: ${unidade}. Usando default: ${defaultUnidade}`)
    return defaultUnidade
  }
  
  // Converter para string e limpar
  const unidadeStr = String(unidade).trim().toUpperCase()
  
  // Se vazio após trim
  if (!unidadeStr) {
    return defaultUnidade
  }
  
  // Se for apenas números (ex: "1", "0", "123"), é inválido
  if (/^\d+$/.test(unidadeStr)) {
    console.warn(`[normalizeUnidade] String numérica recebida: "${unidade}". Usando default: ${defaultUnidade}`)
    return defaultUnidade
  }
  
  // Verificar sinônimos
  if (SINONIMOS_UNIDADE[unidadeStr]) {
    return SINONIMOS_UNIDADE[unidadeStr]
  }
  
  // Se já é uma unidade válida, retornar
  if (UNIDADES_VALIDAS.includes(unidadeStr as any)) {
    return unidadeStr
  }
  
  // Se começar com uma unidade válida seguida de descrição, extrair
  // Ex: "UN UNIDADE" -> "UN", "KG QUILOGRAMA" -> "KG"
  const primeiroToken = unidadeStr.split(/\s+/)[0]
  if (UNIDADES_VALIDAS.includes(primeiroToken as any)) {
    return primeiroToken
  }
  if (SINONIMOS_UNIDADE[primeiroToken]) {
    return SINONIMOS_UNIDADE[primeiroToken]
  }
  
  // Se nada funcionar, usar default
  console.warn(`[normalizeUnidade] Unidade desconhecida: "${unidade}". Usando default: ${defaultUnidade}`)
  return defaultUnidade
}
