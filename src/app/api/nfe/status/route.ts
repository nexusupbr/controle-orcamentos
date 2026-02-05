/**
 * API Route: Consultar Status NF-e
 * GET /api/nfe/status?ref=...
 * GET /api/nfe/status?nota_id=...
 * 
 * Consulta o status de uma NF-e na Focus NFe e atualiza o banco.
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { getFocusNFeClient } from '@/lib/focusnfe-server'
import { headers } from 'next/headers'

function createSupabaseClient(authHeader: string | null) {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      },
      global: {
        headers: authHeader ? { Authorization: authHeader } : {}
      }
    }
  )
}

export async function GET(request: NextRequest) {
  const startTime = Date.now()

  try {
    // 1. Verificar autenticação
    const headersList = await headers()
    const authHeader = headersList.get('authorization')
    
    if (!authHeader) {
      return NextResponse.json(
        { error: 'Não autorizado', code: 'UNAUTHORIZED' },
        { status: 401 }
      )
    }

    const supabase = createSupabaseClient(authHeader)
    
    const { data: { user }, error: authError } = await supabase.auth.getUser(
      authHeader.replace('Bearer ', '')
    )

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Sessão inválida', code: 'INVALID_SESSION' },
        { status: 401 }
      )
    }

    // 2. Obter parâmetros
    const searchParams = request.nextUrl.searchParams
    const ref = searchParams.get('ref')
    const notaId = searchParams.get('nota_id')
    const completa = searchParams.get('completa') === 'true'

    if (!ref && !notaId) {
      return NextResponse.json(
        { error: 'Informe ref ou nota_id', code: 'INVALID_INPUT' },
        { status: 400 }
      )
    }

    // 3. Buscar nota no banco
    let query = supabase
      .from('notas_fiscais')
      .select('*')

    if (ref) {
      query = query.eq('referencia', ref)
    } else if (notaId) {
      query = query.eq('id', parseInt(notaId))
    }

    const { data: nota, error: notaError } = await query.single()

    if (notaError || !nota) {
      return NextResponse.json(
        { error: 'Nota fiscal não encontrada', code: 'NOT_FOUND' },
        { status: 404 }
      )
    }

    // 4. Se já está em estado final, retornar do banco
    if (['autorizado', 'cancelado', 'denegado'].includes(nota.status)) {
      return NextResponse.json({
        success: true,
        source: 'database',
        data: formatarNota(nota),
        duracao_ms: Date.now() - startTime
      })
    }

    // 5. Consultar na Focus NFe
    const focusClient = getFocusNFeClient()
    const resultado = await focusClient.consultar(nota.referencia, completa)

    // 6. Registrar evento
    await focusClient.registrarEvento(
      nota.id,
      'consulta',
      `Consulta de status: ${resultado.response.status}`,
      null,
      resultado.response,
      resultado.status,
      resultado.durationMs,
      null,
      user.id
    )

    // 7. Atualizar nota se mudou de status
    if (resultado.response.status !== nota.status) {
      await focusClient.atualizarNotaAposConsulta(
        nota.id,
        resultado.response,
        nota.tentativas_autorizacao + 1
      )

      // Se autorizou, atualizar venda
      if (resultado.response.status === 'autorizado' && nota.venda_id) {
        await focusClient.atualizarVendaAposAutorizacao(
          nota.venda_id,
          resultado.response.numero || '',
          resultado.response.chave_nfe || ''
        )

        await focusClient.registrarEvento(
          nota.id,
          'autorizacao',
          `NF-e autorizada: ${resultado.response.numero}`,
          null,
          resultado.response,
          null,
          null,
          null,
          user.id
        )
      }
    }

    // 8. Retornar resultado
    return NextResponse.json({
      success: true,
      source: 'focus_nfe',
      data: {
        nota_id: nota.id,
        referencia: nota.referencia,
        venda_id: nota.venda_id,
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
        erros: resultado.response.erros,
        tentativas: nota.tentativas_autorizacao + 1
      },
      duracao_ms: Date.now() - startTime
    })

  } catch (error: any) {
    console.error('[NFe] Erro ao consultar status:', error)
    
    return NextResponse.json(
      { 
        error: error.message || 'Erro interno ao consultar status',
        code: 'INTERNAL_ERROR',
        duracao_ms: Date.now() - startTime
      },
      { status: 500 }
    )
  }
}

function formatarNota(nota: any) {
  return {
    nota_id: nota.id,
    referencia: nota.referencia,
    venda_id: nota.venda_id,
    status: nota.status,
    status_sefaz: nota.status_sefaz,
    mensagem_sefaz: nota.mensagem_sefaz,
    numero: nota.numero,
    serie: nota.serie,
    chave_nfe: nota.chave_acesso,
    url_danfe: nota.url_danfe,
    url_xml: nota.url_xml,
    valor_total: nota.valor_total,
    destinatario_nome: nota.destinatario_nome,
    emitida_em: nota.emitida_em,
    created_at: nota.created_at,
    tentativas: nota.tentativas_autorizacao
  }
}
