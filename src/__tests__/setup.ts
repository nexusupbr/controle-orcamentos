/**
 * Setup de Testes - Vitest
 * 
 * Configura ambiente de testes com mocks globais
 */

import { vi, beforeAll, afterAll, afterEach } from 'vitest'

// ============================================
// ENV MOCKS
// ============================================

beforeAll(() => {
  // Configurar variáveis de ambiente para testes
  process.env.FOCUS_NFE_TOKEN_HOMOLOG = 'test-token-homolog-12345'
  process.env.FOCUS_NFE_TOKEN_PROD = 'test-token-prod-67890'
  process.env.FOCUS_NFE_AMBIENTE = 'homologacao'
  process.env.NFE_WORKER_SECRET = 'test-worker-secret'
  process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://test.supabase.co'
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = 'test-anon-key'
  process.env.SUPABASE_SERVICE_ROLE_KEY = 'test-service-role-key'
})

afterEach(() => {
  vi.clearAllMocks()
})

afterAll(() => {
  vi.restoreAllMocks()
})

// ============================================
// GLOBAL MOCKS
// ============================================

// Mock fetch global para evitar requisições reais
const originalFetch = global.fetch

global.fetch = vi.fn((url: string | URL | Request, init?: RequestInit) => {
  const urlStr = url.toString()
  
  // Mock Focus NFe API
  if (urlStr.includes('focusnfe.com.br')) {
    return Promise.resolve(new Response(JSON.stringify({
      status: 'processando_autorizacao',
      ref: 'test-ref'
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    }))
  }
  
  // Para outras URLs, usar fetch real ou rejeitar
  console.warn(`⚠️ Fetch não mockado: ${urlStr}`)
  return Promise.reject(new Error(`Fetch não mockado: ${urlStr}`))
}) as typeof fetch

// Restaurar fetch original no cleanup
afterAll(() => {
  global.fetch = originalFetch
})

// ============================================
// CUSTOM MATCHERS (opcional)
// ============================================

// Adiciona matchers customizados se necessário
// expect.extend({
//   toBeValidCNPJ(received) {
//     const pass = /^\d{14}$/.test(received)
//     return {
//       pass,
//       message: () => `expected ${received} to be a valid CNPJ`
//     }
//   }
// })

// ============================================
// CONSOLE SILENCING (para testes limpos)
// ============================================

const originalConsole = { ...console }

beforeAll(() => {
  // Silenciar console.log e console.debug durante testes
  // Manter console.error e console.warn para debugging
  console.log = vi.fn()
  console.debug = vi.fn()
})

afterAll(() => {
  console.log = originalConsole.log
  console.debug = originalConsole.debug
})
