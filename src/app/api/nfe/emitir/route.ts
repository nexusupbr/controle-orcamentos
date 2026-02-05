/**
 * API Route: Emitir NF-e
 * POST /api/nfe/emitir
 * 
 * Emite uma NF-e a partir de uma venda existente.
 * 
 * Body: { venda_id: number }
 * 
 * Fluxo:
 * 1. Validar autenticação
 * 2. Verificar se venda existe e não tem NF
 * 3. Buscar config fiscal
 * 4. Montar payload
 * 5. Enviar para Focus NFe
 * 6. Salvar no banco
 * 7. Retornar resultado
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { getFocusNFeClient } from '@/lib/focusnfe-server'
import { buildNfePayload, validarDadosNfe, ConfigFiscal, Venda } from '@/lib/nfe-payload-builder'
import { headers } from 'next/headers'

// Criar cliente Supabase com Service Role Key para acesso completo
function createSupabaseClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  
  console.log('[NFe API] Supabase URL:', url ? 'OK' : 'MISSING')
  console.log('[NFe API] Service Role Key:', key ? 'OK' : 'MISSING')
  
  if (!url || !key) {
    throw new Error('Variáveis de ambiente do Supabase não configuradas')
  }
  
  return createClient(url, key, {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  })
}

export async function POST(request: NextRequest) {
  const startTime = Date.now()
  let notaId: number | null = null
  // Nota: usuario_id não é usado pois o sistema usa auth customizada (tabela usuarios com ID numérico)
  // e as tabelas de NFe esperam UUID. Logs de auditoria são feitos via IP de origem.

  try {
    // 1. Obter ID do usuário do header (sistema usa auth customizado, não supabase.auth)
    const headersList = await headers()
    const userIdHeader = headersList.get('x-user-id')
    
    // Validar se há usuário autenticado
    if (!userIdHeader) {
      return NextResponse.json(
        { error: 'Não autorizado - faça login para emitir notas fiscais', code: 'UNAUTHORIZED' },
        { status: 401 }
      )
    }

    // userIdHeader é usado apenas para validar que há usuário logado
    // Não é salvo nas tabelas pois esperam UUID do Supabase Auth

    // 2. Criar cliente Supabase com Service Role
    const supabase = createSupabaseClient()

    // 3. Obter dados do request
    const body = await request.json()
    let { venda_id } = body

    // Aceitar tanto number quanto string numérica
    if (typeof venda_id === 'string') {
      venda_id = parseInt(venda_id, 10)
    }

    if (!venda_id || typeof venda_id !== 'number' || isNaN(venda_id)) {
      return NextResponse.json(
        { error: 'venda_id é obrigatório e deve ser um número válido', code: 'INVALID_INPUT' },
        { status: 400 }
      )
    }

    // 4. Inicializar cliente Focus NFe
    const focusClient = getFocusNFeClient()
    const configCheck = focusClient.verificarConfiguracao()
    
    if (!configCheck.ok) {
      return NextResponse.json(
        { error: configCheck.mensagem, code: 'CONFIG_ERROR' },
        { status: 500 }
      )
    }

    const focusInfo = focusClient.getInfo()

    // 5. Verificar se já existe nota para esta venda
    const { existe, nota: notaExistente } = await focusClient.verificarNotaExistente(venda_id)
    
    if (existe && notaExistente) {
      // Retornar a nota existente (idempotência)
      return NextResponse.json({
        success: true,
        message: 'Nota fiscal já existe para esta venda',
        idempotent: true,
        data: {
          nota_id: notaExistente.id,
          referencia: notaExistente.referencia,
          status: notaExistente.status
        }
      })
    }

    // 6. Buscar venda com itens e cliente
    console.log('[NFe API] Buscando venda ID:', venda_id)
    
    const { data: venda, error: vendaError } = await supabase
      .from('vendas')
      .select(`
        id, valor_total, valor_produtos, valor_desconto, valor_frete,
        observacoes, nota_fiscal_emitida, status,
        cliente:clientes(*),
        itens:itens_venda(
          produto_id, descricao, quantidade, valor_unitario, valor_total,
          produto:produtos(ncm, unidade, codigo)
        )
      `)
      .eq('id', venda_id)
      .single()

    console.log('[NFe API] Resultado:', { venda: venda ? 'encontrada' : 'não encontrada', error: vendaError })

    if (vendaError || !venda) {
      console.error('[NFe API] Erro ao buscar venda:', vendaError)
      return NextResponse.json(
        { error: 'Venda não encontrada', code: 'VENDA_NOT_FOUND', details: vendaError?.message },
        { status: 404 }
      )
    }

    // 7. Verificar se já foi emitida pelo campo da venda
    if (venda.nota_fiscal_emitida) {
      return NextResponse.json(
        { error: 'Esta venda já possui nota fiscal emitida', code: 'ALREADY_EMITTED' },
        { status: 400 }
      )
    }

    // 8. Buscar configuração fiscal
    const { data: configFiscal, error: configError } = await supabase
      .from('config_fiscal')
      .select('*')
      .eq('ativo', true)
      .single()

    if (configError || !configFiscal) {
      return NextResponse.json(
        { error: 'Configuração fiscal não encontrada. Acesse Configurações > Fiscal.', code: 'CONFIG_NOT_FOUND' },
        { status: 400 }
      )
    }

    // 9. Validar dados antes de montar payload
    const validacao = validarDadosNfe(
      venda as unknown as Venda,
      configFiscal as ConfigFiscal,
      focusInfo.ambiente as 'homologacao' | 'producao'
    )

    if (!validacao.valid) {
      return NextResponse.json(
        { 
          error: 'Dados inválidos para emissão', 
          code: 'VALIDATION_ERROR',
          errors: validacao.errors,
          warnings: validacao.warnings
        },
        { status: 400 }
      )
    }

    // 10. Gerar referência única
    const referencia = focusClient.gerarReferencia(venda_id)

    // 11. Montar payload
    const payloadNfe = buildNfePayload(
      venda as unknown as Venda,
      configFiscal as ConfigFiscal,
      focusInfo.ambiente as 'homologacao' | 'producao'
    )

    // 12. Criar registro da nota fiscal no banco
    const cliente = venda.cliente as any
    const { id: novaNotaId } = await focusClient.criarNota({
      referencia,
      venda_id,
      valor_total: venda.valor_total,
      valor_produtos: venda.valor_produtos || venda.valor_total,
      valor_desconto: venda.valor_desconto,
      valor_frete: venda.valor_frete,
      destinatario_nome: cliente?.nome || cliente?.razao_social || 'Consumidor Final',
      destinatario_documento: cliente?.cpf || cliente?.cnpj || '',
      dados_envio: payloadNfe,
      ambiente: focusInfo.ambiente,
      ip_origem: request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || undefined
    })

    notaId = novaNotaId

    // 13. Registrar evento de criação
    await focusClient.registrarEvento(
      notaId,
      'criacao',
      'Nota fiscal criada',
      payloadNfe,
      undefined,
      undefined,
      undefined,
      undefined,
      undefined
    )

    // 14. Enviar para Focus NFe
    const resultado = await focusClient.emitir(referencia, payloadNfe)
    
    console.log('[NFe API] Resposta Focus NFe:', JSON.stringify(resultado, null, 2))

    // 15. Registrar evento de envio
    await focusClient.registrarEvento(
      notaId,
      'envio',
      `Enviado para Focus NFe - Status: ${resultado.response.status}`,
      payloadNfe,
      resultado.response,
      resultado.status,
      resultado.durationMs,
      resultado.response.erros ? JSON.stringify(resultado.response.erros) : undefined,
      undefined
    )

    // 16. Atualizar nota com resposta
    await focusClient.atualizarNotaAposConsulta(
      notaId,
      resultado.response,
      1,
      resultado.response.status === 'autorizado' ? resultado.durationMs : undefined
    )

    // 17. Se autorizado, atualizar venda
    if (resultado.response.status === 'autorizado') {
      await focusClient.atualizarVendaAposAutorizacao(
        venda_id,
        resultado.response.numero || '',
        resultado.response.chave_nfe || ''
      )

      await focusClient.registrarEvento(
        notaId,
        'autorizacao',
        `NF-e autorizada: ${resultado.response.numero}`,
        undefined,
        resultado.response,
        undefined,
        Date.now() - startTime,
        undefined,
        undefined
      )
    }

    // 18. Se processando, agendar consulta
    if (resultado.response.status === 'processando_autorizacao') {
      // O worker vai consultar posteriormente
      console.log(`[NFe] Nota ${referencia} em processamento, aguardando autorização...`)
    }

    // 19. Retornar resultado
    return NextResponse.json({
      success: true,
      message: getMensagemStatus(resultado.response.status),
      data: {
        nota_id: notaId,
        referencia,
        status: resultado.response.status,
        status_sefaz: resultado.response.status_sefaz,
        mensagem_sefaz: resultado.response.mensagem_sefaz,
        numero: resultado.response.numero,
        serie: resultado.response.serie,
        chave_nfe: resultado.response.chave_nfe,
        url_danfe: resultado.response.caminho_danfe 
          ? focusClient.getUrlDanfe(resultado.response.caminho_danfe)
          : null,
        url_xml: resultado.response.caminho_xml_nota_fiscal
          ? focusClient.getUrlXml(resultado.response.caminho_xml_nota_fiscal)
          : null,
        erros: resultado.response.erros
      },
      warnings: validacao.warnings,
      duracao_ms: Date.now() - startTime
    })

  } catch (error: any) {
    console.error('[NFe] Erro ao emitir:', error)

    // Registrar erro se temos o ID da nota
    if (notaId) {
      try {
        const focusClient = getFocusNFeClient()
        await focusClient.registrarEvento(
          notaId,
          'erro',
          'Erro ao emitir NF-e',
          null,
          undefined,
          undefined,
          Date.now() - startTime,
          error.message,
          undefined
        )
      } catch (e) {
        console.error('[NFe] Erro ao registrar evento de erro:', e)
      }
    }

    return NextResponse.json(
      { 
        error: error.message || 'Erro interno ao emitir NF-e',
        code: 'INTERNAL_ERROR',
        duracao_ms: Date.now() - startTime
      },
      { status: 500 }
    )
  }
}

function getMensagemStatus(status: string): string {
  switch (status) {
    case 'autorizado':
      return 'NF-e autorizada com sucesso'
    case 'processando_autorizacao':
      return 'NF-e enviada, aguardando autorização da SEFAZ'
    case 'erro_autorizacao':
      return 'Erro na autorização da NF-e'
    case 'denegado':
      return 'NF-e denegada pela SEFAZ'
    case 'cancelado':
      return 'NF-e cancelada'
    default:
      return `Status: ${status}`
  }
}
