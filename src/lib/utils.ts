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
