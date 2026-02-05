/**
 * Testes de Integração - API NFe Emitir
 * 
 * Testa o endpoint POST /api/nfe/emitir com mocks da Focus NFe
 * Execute com: npm run test
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { NextRequest } from 'next/server'

// Mock do Supabase antes de importar
vi.mock('@/lib/supabase', () => ({
  supabase: {
    from: vi.fn(() => ({
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          single: vi.fn(() => Promise.resolve({ data: null, error: null })),
          maybeSingle: vi.fn(() => Promise.resolve({ data: null, error: null }))
        })),
        order: vi.fn(() => ({
          limit: vi.fn(() => Promise.resolve({ data: [], error: null }))
        }))
      })),
      insert: vi.fn(() => ({
        select: vi.fn(() => ({
          single: vi.fn(() => Promise.resolve({ 
            data: { id: 1, referencia: 'ANDRESSA-123-abc' }, 
            error: null 
          }))
        }))
      })),
      update: vi.fn(() => ({
        eq: vi.fn(() => Promise.resolve({ error: null }))
      }))
    })),
    auth: {
      getUser: vi.fn(() => Promise.resolve({
        data: { user: { id: 'user-123', email: 'test@example.com' } },
        error: null
      }))
    }
  },
  createServerSupabase: vi.fn(() => ({
    from: vi.fn(() => ({
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          single: vi.fn(() => Promise.resolve({ data: null, error: null })),
          maybeSingle: vi.fn(() => Promise.resolve({ data: null, error: null }))
        }))
      })),
      insert: vi.fn(() => ({
        select: vi.fn(() => ({
          single: vi.fn(() => Promise.resolve({ 
            data: { id: 1, referencia: 'ANDRESSA-123-abc' }, 
            error: null 
          }))
        }))
      })),
      update: vi.fn(() => ({
        eq: vi.fn(() => Promise.resolve({ error: null }))
      }))
    })),
    auth: {
      getUser: vi.fn(() => Promise.resolve({
        data: { user: { id: 'user-123' } },
        error: null
      }))
    }
  }))
}))

// Mock do focusnfe-server
vi.mock('@/lib/focusnfe-server', () => ({
  FocusNFeClient: vi.fn().mockImplementation(() => ({
    emitir: vi.fn(() => Promise.resolve({
      sucesso: true,
      dados: {
        status: 'processando_autorizacao',
        caminho_xml_nota_fiscal: null
      }
    })),
    consultar: vi.fn(() => Promise.resolve({
      sucesso: true,
      dados: {
        status: 'autorizado',
        numero: '12345',
        serie: '1',
        chave_nfe: '35240612345678000190550010000123451234567890',
        protocolo: '135240000012345',
        caminho_xml_nota_fiscal: 'https://api.focusnfe.com.br/xml/123'
      }
    })),
    registrarEvento: vi.fn(() => Promise.resolve()),
    verificarNotaExistente: vi.fn(() => Promise.resolve(null)),
    criarNota: vi.fn(() => Promise.resolve({ 
      id: 1, 
      referencia: 'ANDRESSA-123-abc' 
    })),
    atualizarNotaAposConsulta: vi.fn(() => Promise.resolve()),
    atualizarVendaAposAutorizacao: vi.fn(() => Promise.resolve())
  }))
}))

// Mock environment variables
vi.stubEnv('FOCUS_NFE_TOKEN_HOMOLOG', 'token-homolog-test')
vi.stubEnv('FOCUS_NFE_TOKEN_PROD', 'token-prod-test')
vi.stubEnv('FOCUS_NFE_AMBIENTE', 'homologacao')

// ============================================
// FIXTURES
// ============================================

const vendaMock = {
  id: 123,
  valor_total: 150.00,
  valor_produtos: 150.00,
  valor_desconto: 0,
  valor_frete: 0,
  forma_pagamento: 'pix',
  observacoes: 'Venda de teste',
  cliente: {
    nome: 'CLIENTE TESTE',
    cpf: '12345678901',
    endereco: 'RUA TESTE',
    numero: '100',
    bairro: 'CENTRO',
    cidade: 'SAO PAULO',
    estado: 'SP',
    cep: '01000000'
  },
  itens: [
    {
      produto_id: 1,
      descricao: 'PRODUTO A',
      quantidade: 3,
      valor_unitario: 50.00,
      valor_total: 150.00,
      produto: {
        ncm: '12345678',
        unidade: 'UN',
        codigo: 'PRODA'
      }
    }
  ]
}

const configFiscalMock = {
  cnpj: '12345678000190',
  inscricao_estadual: '123456789',
  razao_social: 'EMPRESA TESTE LTDA',
  nome_fantasia: 'EMPRESA TESTE',
  logradouro: 'RUA EMPRESA',
  numero: '500',
  complemento: '',
  bairro: 'INDUSTRIAL',
  codigo_municipio: '3550308',
  municipio: 'SAO PAULO',
  uf: 'SP',
  cep: '01000000',
  telefone: '1199999999',
  regime_tributario: 1,
  natureza_operacao_padrao: 'Venda',
  cfop_padrao: '5102',
  informacoes_complementares: 'Teste integração'
}

// ============================================
// HELPER: Criar Request
// ============================================

function createMockRequest(body: any, headers: Record<string, string> = {}): NextRequest {
  return new NextRequest('http://localhost:3000/api/nfe/emitir', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': 'Bearer valid-token',
      ...headers
    },
    body: JSON.stringify(body)
  })
}

// ============================================
// TESTES
// ============================================

describe('POST /api/nfe/emitir', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe('Validação de Entrada', () => {
    it('deve rejeitar requisição sem venda_id', async () => {
      // Importação dinâmica para aplicar mocks
      const { POST } = await import('@/app/api/nfe/emitir/route')
      
      const request = createMockRequest({
        config_fiscal: configFiscalMock
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toContain('venda_id')
    })

    it('deve rejeitar requisição sem config_fiscal', async () => {
      const { POST } = await import('@/app/api/nfe/emitir/route')
      
      const request = createMockRequest({
        venda_id: 123
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toContain('config_fiscal')
    })

    it('deve rejeitar CNPJ inválido', async () => {
      const { POST } = await import('@/app/api/nfe/emitir/route')
      
      const request = createMockRequest({
        venda_id: 123,
        config_fiscal: { ...configFiscalMock, cnpj: '123' }
      })

      const response = await POST(request)
      
      expect(response.status).toBe(400)
    })
  })

  describe('Idempotência', () => {
    it('deve retornar nota existente se já foi emitida', async () => {
      const { FocusNFeClient } = await import('@/lib/focusnfe-server')
      
      // Mock para retornar nota existente
      vi.mocked(FocusNFeClient).mockImplementation(() => ({
        emitir: vi.fn(),
        consultar: vi.fn(),
        registrarEvento: vi.fn(() => Promise.resolve()),
        verificarNotaExistente: vi.fn(() => Promise.resolve({
          id: 99,
          referencia: 'ANDRESSA-123-existing',
          status: 'autorizado',
          numero: '111',
          serie: '1'
        })),
        criarNota: vi.fn(),
        atualizarNotaAposConsulta: vi.fn(),
        atualizarVendaAposAutorizacao: vi.fn()
      } as any))

      const { POST } = await import('@/app/api/nfe/emitir/route')
      
      const request = createMockRequest({
        venda_id: 123,
        config_fiscal: configFiscalMock
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.existente).toBe(true)
      expect(data.nota.id).toBe(99)
    })
  })

  describe('Fluxo de Emissão', () => {
    it('deve emitir NFe com sucesso em homologação', async () => {
      const { POST } = await import('@/app/api/nfe/emitir/route')
      
      const request = createMockRequest({
        venda_id: 123,
        venda: vendaMock,
        config_fiscal: configFiscalMock,
        aguardar_autorizacao: false
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.sucesso).toBe(true)
      expect(data.nota).toBeDefined()
      expect(data.nota.referencia).toContain('ANDRESSA')
    })

    it('deve aguardar autorização quando solicitado', async () => {
      const { FocusNFeClient } = await import('@/lib/focusnfe-server')
      
      vi.mocked(FocusNFeClient).mockImplementation(() => ({
        emitir: vi.fn(() => Promise.resolve({
          sucesso: true,
          dados: { status: 'processando_autorizacao' }
        })),
        consultar: vi.fn()
          .mockResolvedValueOnce({
            sucesso: true,
            dados: { status: 'processando_autorizacao' }
          })
          .mockResolvedValueOnce({
            sucesso: true,
            dados: {
              status: 'autorizado',
              numero: '999',
              serie: '1',
              chave_nfe: '35240612345678000190550010000099991234567890'
            }
          }),
        registrarEvento: vi.fn(() => Promise.resolve()),
        verificarNotaExistente: vi.fn(() => Promise.resolve(null)),
        criarNota: vi.fn(() => Promise.resolve({ 
          id: 1, 
          referencia: 'ANDRESSA-123-new' 
        })),
        atualizarNotaAposConsulta: vi.fn(() => Promise.resolve()),
        atualizarVendaAposAutorizacao: vi.fn(() => Promise.resolve())
      } as any))

      const { POST } = await import('@/app/api/nfe/emitir/route')
      
      const request = createMockRequest({
        venda_id: 123,
        venda: vendaMock,
        config_fiscal: configFiscalMock,
        aguardar_autorizacao: true
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.sucesso).toBe(true)
    })
  })

  describe('Tratamento de Erros', () => {
    it('deve lidar com erro da API Focus NFe', async () => {
      const { FocusNFeClient } = await import('@/lib/focusnfe-server')
      
      vi.mocked(FocusNFeClient).mockImplementation(() => ({
        emitir: vi.fn(() => Promise.resolve({
          sucesso: false,
          erro: 'SEFAZ indisponível',
          codigo: 503
        })),
        registrarEvento: vi.fn(() => Promise.resolve()),
        verificarNotaExistente: vi.fn(() => Promise.resolve(null)),
        criarNota: vi.fn(() => Promise.resolve({ 
          id: 1, 
          referencia: 'ANDRESSA-123-error' 
        }))
      } as any))

      const { POST } = await import('@/app/api/nfe/emitir/route')
      
      const request = createMockRequest({
        venda_id: 123,
        venda: vendaMock,
        config_fiscal: configFiscalMock
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(502)
      expect(data.sucesso).toBe(false)
      expect(data.error).toContain('SEFAZ')
    })

    it('deve lidar com timeout gracefully', async () => {
      const { FocusNFeClient } = await import('@/lib/focusnfe-server')
      
      vi.mocked(FocusNFeClient).mockImplementation(() => ({
        emitir: vi.fn(() => Promise.reject(new Error('TIMEOUT'))),
        registrarEvento: vi.fn(() => Promise.resolve()),
        verificarNotaExistente: vi.fn(() => Promise.resolve(null)),
        criarNota: vi.fn(() => Promise.resolve({ 
          id: 1, 
          referencia: 'ANDRESSA-123-timeout' 
        }))
      } as any))

      const { POST } = await import('@/app/api/nfe/emitir/route')
      
      const request = createMockRequest({
        venda_id: 123,
        venda: vendaMock,
        config_fiscal: configFiscalMock
      })

      const response = await POST(request)

      expect(response.status).toBe(500)
    })
  })

  describe('Logging e Eventos', () => {
    it('deve registrar evento de início de emissão', async () => {
      const { FocusNFeClient } = await import('@/lib/focusnfe-server')
      
      const mockRegistrarEvento = vi.fn(() => Promise.resolve())
      
      vi.mocked(FocusNFeClient).mockImplementation(() => ({
        emitir: vi.fn(() => Promise.resolve({
          sucesso: true,
          dados: { status: 'processando_autorizacao' }
        })),
        consultar: vi.fn(),
        registrarEvento: mockRegistrarEvento,
        verificarNotaExistente: vi.fn(() => Promise.resolve(null)),
        criarNota: vi.fn(() => Promise.resolve({ 
          id: 1, 
          referencia: 'ANDRESSA-123-events' 
        })),
        atualizarNotaAposConsulta: vi.fn(),
        atualizarVendaAposAutorizacao: vi.fn()
      } as any))

      const { POST } = await import('@/app/api/nfe/emitir/route')
      
      const request = createMockRequest({
        venda_id: 123,
        venda: vendaMock,
        config_fiscal: configFiscalMock,
        aguardar_autorizacao: false
      })

      await POST(request)

      // Verifica se registrarEvento foi chamado
      expect(mockRegistrarEvento).toHaveBeenCalled()
    })
  })
})

// ============================================
// TESTES E2E SIMULADO
// ============================================

describe('E2E: Fluxo Completo Venda → NFe', () => {
  it('deve completar fluxo: criar venda → emitir NFe → autorizar', async () => {
    const { FocusNFeClient } = await import('@/lib/focusnfe-server')
    
    // Simular estados progressivos
    let consultaCount = 0
    
    vi.mocked(FocusNFeClient).mockImplementation(() => ({
      emitir: vi.fn(() => Promise.resolve({
        sucesso: true,
        dados: { 
          status: 'processando_autorizacao',
          ref: 'ANDRESSA-E2E-001'
        }
      })),
      consultar: vi.fn(() => {
        consultaCount++
        if (consultaCount < 2) {
          return Promise.resolve({
            sucesso: true,
            dados: { status: 'processando_autorizacao' }
          })
        }
        return Promise.resolve({
          sucesso: true,
          dados: {
            status: 'autorizado',
            numero: '12345',
            serie: '1',
            chave_nfe: '35240612345678000190550010000123451234567890',
            protocolo: '135240000012345',
            caminho_xml_nota_fiscal: 'https://api.focusnfe.com.br/xml/e2e'
          }
        })
      }),
      registrarEvento: vi.fn(() => Promise.resolve()),
      verificarNotaExistente: vi.fn(() => Promise.resolve(null)),
      criarNota: vi.fn(() => Promise.resolve({ 
        id: 999, 
        referencia: 'ANDRESSA-E2E-001',
        status: 'pendente'
      })),
      atualizarNotaAposConsulta: vi.fn(() => Promise.resolve()),
      atualizarVendaAposAutorizacao: vi.fn(() => Promise.resolve())
    } as any))

    const { POST } = await import('@/app/api/nfe/emitir/route')
    
    // Step 1: Emitir NFe
    const request = createMockRequest({
      venda_id: 999,
      venda: vendaMock,
      config_fiscal: configFiscalMock,
      aguardar_autorizacao: true
    })

    const response = await POST(request)
    const data = await response.json()

    // Validações
    expect(response.status).toBe(200)
    expect(data.sucesso).toBe(true)
    
    // Verify the flow completed
    expect(consultaCount).toBeGreaterThanOrEqual(1)
  })
})
