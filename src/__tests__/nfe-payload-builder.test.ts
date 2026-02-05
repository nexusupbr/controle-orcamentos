/**
 * Testes Unitários - NFe Payload Builder
 * 
 * Execute com: npm run test
 */

import { describe, it, expect, beforeEach } from 'vitest'
import {
  buildNfePayload,
  validarDadosNfe,
  determinarCfop,
  mapearFormaPagamento,
  ConfigFiscal,
  Venda
} from '@/lib/nfe-payload-builder'

// ============================================
// FIXTURES
// ============================================

const configFiscalMock: ConfigFiscal = {
  cnpj: '12345678000190',
  inscricao_estadual: '123456789',
  razao_social: 'EMPRESA TESTE LTDA',
  nome_fantasia: 'EMPRESA TESTE',
  logradouro: 'RUA TESTE',
  numero: '100',
  complemento: 'SALA 1',
  bairro: 'CENTRO',
  codigo_municipio: '3550308',
  municipio: 'SAO PAULO',
  uf: 'SP',
  cep: '01000000',
  telefone: '11999999999',
  regime_tributario: 1,
  natureza_operacao_padrao: 'Venda',
  cfop_padrao: '5102',
  informacoes_complementares: 'Teste'
}

const vendaMock: Venda = {
  id: 1,
  valor_total: 100.00,
  valor_produtos: 100.00,
  valor_desconto: 0,
  valor_frete: 0,
  forma_pagamento: 'pix',
  observacoes: 'Venda teste',
  cliente: {
    nome: 'CLIENTE TESTE',
    cpf: '12345678901',
    endereco: 'RUA CLIENTE',
    numero: '200',
    bairro: 'BAIRRO CLIENTE',
    cidade: 'SAO PAULO',
    estado: 'SP',
    cep: '02000000'
  },
  itens: [
    {
      produto_id: 1,
      descricao: 'PRODUTO TESTE 1',
      quantidade: 2,
      valor_unitario: 25.00,
      valor_total: 50.00,
      produto: {
        ncm: '12345678',
        unidade: 'UN',
        codigo: 'PROD001'
      }
    },
    {
      produto_id: 2,
      descricao: 'PRODUTO TESTE 2',
      quantidade: 1,
      valor_unitario: 50.00,
      valor_total: 50.00,
      produto: {
        ncm: '87654321',
        unidade: 'PC',
        codigo: 'PROD002'
      }
    }
  ]
}

// ============================================
// TESTES: validarDadosNfe
// ============================================

describe('validarDadosNfe', () => {
  it('deve validar dados corretos em homologação', () => {
    const resultado = validarDadosNfe(vendaMock, configFiscalMock, 'homologacao')
    
    expect(resultado.valid).toBe(true)
    expect(resultado.errors).toHaveLength(0)
  })

  it('deve validar dados corretos em produção', () => {
    const resultado = validarDadosNfe(vendaMock, configFiscalMock, 'producao')
    
    expect(resultado.valid).toBe(true)
    expect(resultado.errors).toHaveLength(0)
  })

  it('deve rejeitar CNPJ inválido', () => {
    const configInvalida = { ...configFiscalMock, cnpj: '123' }
    const resultado = validarDadosNfe(vendaMock, configInvalida, 'homologacao')
    
    expect(resultado.valid).toBe(false)
    expect(resultado.errors).toContain('CNPJ do emitente inválido')
  })

  it('deve rejeitar venda sem itens', () => {
    const vendaSemItens = { ...vendaMock, itens: [] }
    const resultado = validarDadosNfe(vendaSemItens, configFiscalMock, 'homologacao')
    
    expect(resultado.valid).toBe(false)
    expect(resultado.errors).toContain('Venda deve ter pelo menos um item')
  })

  it('deve rejeitar NCM inválido em produção', () => {
    const vendaNcmInvalido: Venda = {
      ...vendaMock,
      itens: [{
        produto_id: 1,
        descricao: 'PRODUTO SEM NCM',
        quantidade: 1,
        valor_unitario: 10,
        valor_total: 10,
        produto: { ncm: '00000000', unidade: 'UN', codigo: 'X' }
      }]
    }
    
    const resultado = validarDadosNfe(vendaNcmInvalido, configFiscalMock, 'producao')
    
    expect(resultado.valid).toBe(false)
    expect(resultado.errors.some(e => e.includes('NCM'))).toBe(true)
  })

  it('deve gerar warning para NCM inválido em homologação', () => {
    const vendaNcmInvalido: Venda = {
      ...vendaMock,
      itens: [{
        produto_id: 1,
        descricao: 'PRODUTO SEM NCM',
        quantidade: 1,
        valor_unitario: 10,
        valor_total: 10,
        produto: { ncm: '', unidade: 'UN', codigo: 'X' }
      }]
    }
    
    const resultado = validarDadosNfe(vendaNcmInvalido, configFiscalMock, 'homologacao')
    
    expect(resultado.valid).toBe(true) // Em homologação é válido
    expect(resultado.warnings.some(w => w.includes('NCM'))).toBe(true)
  })

  it('deve rejeitar item com quantidade zero', () => {
    const vendaQtdZero: Venda = {
      ...vendaMock,
      itens: [{
        produto_id: 1,
        descricao: 'PRODUTO',
        quantidade: 0,
        valor_unitario: 10,
        valor_total: 0,
        produto: { ncm: '12345678', unidade: 'UN', codigo: 'X' }
      }]
    }
    
    const resultado = validarDadosNfe(vendaQtdZero, configFiscalMock, 'homologacao')
    
    expect(resultado.valid).toBe(false)
    expect(resultado.errors.some(e => e.includes('quantidade'))).toBe(true)
  })
})

// ============================================
// TESTES: determinarCfop
// ============================================

describe('determinarCfop', () => {
  it('deve retornar 5102 para venda dentro do estado', () => {
    expect(determinarCfop('SP', 'SP', '5102', 'venda')).toBe('5102')
  })

  it('deve retornar 6102 para venda interestadual', () => {
    expect(determinarCfop('SP', 'RJ', '5102', 'venda')).toBe('6102')
  })

  it('deve retornar 5102 quando UF destinatário não informada', () => {
    expect(determinarCfop('SP', undefined, '5102', 'venda')).toBe('5102')
  })

  it('deve retornar 5202 para devolução dentro do estado', () => {
    expect(determinarCfop('SP', 'SP', '5102', 'devolucao')).toBe('5202')
  })

  it('deve retornar 6202 para devolução interestadual', () => {
    expect(determinarCfop('SP', 'MG', '5102', 'devolucao')).toBe('6202')
  })
})

// ============================================
// TESTES: mapearFormaPagamento
// ============================================

describe('mapearFormaPagamento', () => {
  it('deve mapear PIX para 17', () => {
    expect(mapearFormaPagamento('pix')).toBe('17')
  })

  it('deve mapear dinheiro para 01', () => {
    expect(mapearFormaPagamento('dinheiro')).toBe('01')
  })

  it('deve mapear credito para 03', () => {
    expect(mapearFormaPagamento('credito')).toBe('03')
  })

  it('deve mapear debito para 04', () => {
    expect(mapearFormaPagamento('debito')).toBe('04')
  })

  it('deve mapear boleto para 15', () => {
    expect(mapearFormaPagamento('boleto')).toBe('15')
  })

  it('deve retornar 01 para forma não informada', () => {
    expect(mapearFormaPagamento(undefined)).toBe('01')
  })

  it('deve retornar 99 para forma desconhecida', () => {
    expect(mapearFormaPagamento('forma_inexistente')).toBe('99')
  })

  it('deve ser case-insensitive', () => {
    expect(mapearFormaPagamento('PIX')).toBe('17')
    expect(mapearFormaPagamento('Pix')).toBe('17')
  })
})

// ============================================
// TESTES: buildNfePayload
// ============================================

describe('buildNfePayload', () => {
  it('deve montar payload básico corretamente', () => {
    const payload = buildNfePayload(vendaMock, configFiscalMock, 'homologacao')
    
    expect(payload).toBeDefined()
    expect(payload.natureza_operacao).toBe('Venda')
    expect(payload.tipo_documento).toBe(1)
    expect(payload.finalidade_emissao).toBe(1)
    expect(payload.consumidor_final).toBe(1)
  })

  it('deve incluir dados do emitente', () => {
    const payload = buildNfePayload(vendaMock, configFiscalMock, 'homologacao')
    
    expect(payload.cnpj_emitente).toBe('12345678000190')
    expect(payload.inscricao_estadual_emitente).toBe('123456789')
    expect(payload.nome_emitente).toBe('EMPRESA TESTE LTDA')
    expect(payload.regime_tributario_emitente).toBe(1)
  })

  it('deve incluir dados do destinatário', () => {
    const payload = buildNfePayload(vendaMock, configFiscalMock, 'producao')
    
    expect(payload.nome_destinatario).toBe('CLIENTE TESTE')
    expect(payload.cpf_destinatario).toBe('12345678901')
    expect(payload.municipio_destinatario).toBe('SAO PAULO')
    expect(payload.uf_destinatario).toBe('SP')
  })

  it('deve usar nome de homologação em ambiente de teste', () => {
    const payload = buildNfePayload(vendaMock, configFiscalMock, 'homologacao')
    
    expect(payload.nome_destinatario).toContain('HOMOLOGACAO')
  })

  it('deve incluir itens com dados corretos', () => {
    const payload = buildNfePayload(vendaMock, configFiscalMock, 'producao')
    
    expect(payload.items).toHaveLength(2)
    expect(payload.items[0].numero_item).toBe(1)
    expect(payload.items[0].codigo_produto).toBe('PROD001')
    expect(payload.items[0].quantidade_comercial).toBe(2)
    expect(payload.items[0].valor_unitario_comercial).toBe(25)
    expect(payload.items[0].ncm).toBe('12345678')
  })

  it('deve mapear forma de pagamento corretamente', () => {
    const payload = buildNfePayload(vendaMock, configFiscalMock, 'homologacao')
    
    expect(payload.formas_pagamento).toHaveLength(1)
    expect(payload.formas_pagamento[0].forma_pagamento).toBe('17') // PIX
    expect(payload.formas_pagamento[0].valor_pagamento).toBe(100)
  })

  it('deve calcular totais corretamente', () => {
    const payload = buildNfePayload(vendaMock, configFiscalMock, 'homologacao')
    
    expect(payload.valor_total).toBe(100)
    expect(payload.valor_produtos).toBe(100)
    expect(payload.valor_desconto).toBe(0)
    expect(payload.valor_frete).toBe(0)
  })

  it('deve usar CFOP correto para operação interna', () => {
    const payload = buildNfePayload(vendaMock, configFiscalMock, 'homologacao')
    
    expect(payload.local_destino).toBe(1) // Interna
    expect(payload.items[0].cfop).toBe('5102')
  })

  it('deve usar CFOP correto para operação interestadual', () => {
    const vendaInterestadual: Venda = {
      ...vendaMock,
      cliente: {
        ...vendaMock.cliente,
        estado: 'RJ'
      }
    }
    
    const payload = buildNfePayload(vendaInterestadual, configFiscalMock, 'homologacao')
    
    expect(payload.local_destino).toBe(2) // Interestadual
    expect(payload.items[0].cfop).toBe('6102')
  })

  it('deve usar NCM genérico em homologação quando não informado', () => {
    const vendaSemNcm: Venda = {
      ...vendaMock,
      itens: [{
        produto_id: 1,
        descricao: 'PRODUTO',
        quantidade: 1,
        valor_unitario: 10,
        valor_total: 10,
        produto: { ncm: '', unidade: 'UN', codigo: 'X' }
      }]
    }
    
    const payload = buildNfePayload(vendaSemNcm, configFiscalMock, 'homologacao')
    
    expect(payload.items[0].ncm).toBe('00000000')
  })

  it('deve configurar impostos para Simples Nacional', () => {
    const payload = buildNfePayload(vendaMock, configFiscalMock, 'homologacao')
    
    expect(payload.items[0].icms_situacao_tributaria).toBe('102')
    expect(payload.items[0].pis_situacao_tributaria).toBe('07')
    expect(payload.items[0].cofins_situacao_tributaria).toBe('07')
  })

  it('deve configurar impostos para Regime Normal', () => {
    const configNormal = { ...configFiscalMock, regime_tributario: 3 }
    const payload = buildNfePayload(vendaMock, configNormal, 'homologacao')
    
    expect(payload.items[0].icms_situacao_tributaria).toBe('00')
  })

  it('deve incluir indicador IE correto para PF', () => {
    const payload = buildNfePayload(vendaMock, configFiscalMock, 'homologacao')
    
    expect(payload.indicador_inscricao_estadual_destinatario).toBe(9) // Não contribuinte
  })

  it('deve incluir indicador IE correto para PJ com IE', () => {
    const vendaPJ: Venda = {
      ...vendaMock,
      cliente: {
        ...vendaMock.cliente,
        cpf: undefined,
        cnpj: '12345678000190',
        inscricao_estadual: '123456789'
      }
    }
    
    const payload = buildNfePayload(vendaPJ, configFiscalMock, 'homologacao')
    
    expect(payload.indicador_inscricao_estadual_destinatario).toBe(1) // Contribuinte
  })
})

// ============================================
// TESTES: Snapshot
// ============================================

describe('Snapshot Tests', () => {
  it('deve gerar payload consistente', () => {
    const payload = buildNfePayload(vendaMock, configFiscalMock, 'producao')
    
    // Remove campos dinâmicos para snapshot
    const payloadParaSnapshot = {
      ...payload,
      data_emissao: 'DYNAMIC'
    }
    
    expect(payloadParaSnapshot).toMatchSnapshot()
  })
})
