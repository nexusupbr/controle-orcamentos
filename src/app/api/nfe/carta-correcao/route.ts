/**
 * API Route: Carta de Correção NF-e
 * POST /api/nfe/carta-correcao
 * 
 * Emite carta de correção para uma NF-e autorizada.
 * 
 * Body: { ref: string, correcao: string }
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

export async function POST(request: NextRequest) {
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

    // 2. Obter dados do request
    const body = await request.json()
    const { ref, correcao } = body

    if (!ref) {
      return NextResponse.json(
        { error: 'Referência (ref) é obrigatória', code: 'INVALID_INPUT' },
        { status: 400 }
      )
    }

    if (!correcao || correcao.length < 15 || correcao.length > 1000) {
      return NextResponse.json(
        { error: 'Correção deve ter entre 15 e 1000 caracteres', code: 'INVALID_INPUT' },
        { status: 400 }
      )
    }

    // 3. Buscar nota no banco
    const { data: nota, error: notaError } = await supabase
      .from('notas_fiscais')
      .select('*')
      .eq('referencia', ref)
      .single()

    if (notaError || !nota) {
      return NextResponse.json(
        { error: 'Nota fiscal não encontrada', code: 'NOT_FOUND' },
        { status: 404 }
      )
    }

    // 4. Verificar se pode ter carta de correção
    if (nota.status !== 'autorizada' && nota.status !== 'autorizado') {
      return NextResponse.json(
        { error: `Nota com status '${nota.status}' não pode receber carta de correção`, code: 'INVALID_STATUS' },
        { status: 400 }
      )
    }

    // 5. Emitir carta de correção na Focus NFe
    const focusClient = getFocusNFeClient()
    const resultado = await focusClient.cartaCorrecao(ref, correcao)

    // 6. Registrar evento
    await focusClient.registrarEvento(
      nota.id,
      'carta_correcao',
      `Carta de correção: ${resultado.response.status}`,
      { correcao },
      resultado.response,
      resultado.status,
      resultado.durationMs,
      resultado.response.status !== 'autorizado' ? resultado.response.mensagem_sefaz : undefined,
      user.id
    )

    // 7. Atualizar nota no banco se autorizada
    if (resultado.response.status === 'autorizado') {
      await supabase
        .from('notas_fiscais')
        .update({
          carta_correcao_numero: resultado.response.numero_carta_correcao,
          carta_correcao_texto: correcao,
          url_carta_correcao_xml: resultado.response.caminho_xml_carta_correcao,
          url_carta_correcao_pdf: resultado.response.caminho_pdf_carta_correcao,
          dados_retorno: {
            ...nota.dados_retorno,
            carta_correcao: resultado.response
          },
          updated_at: new Date().toISOString()
        })
        .eq('id', nota.id)
    }

    // 8. Retornar resultado
    return NextResponse.json({
      success: resultado.response.status === 'autorizado',
      message: resultado.response.status === 'autorizado' 
        ? 'Carta de correção emitida com sucesso'
        : 'Erro ao emitir carta de correção',
      data: {
        nota_id: nota.id,
        referencia: ref,
        status: resultado.response.status,
        status_sefaz: resultado.response.status_sefaz,
        mensagem_sefaz: resultado.response.mensagem_sefaz,
        numero_carta_correcao: resultado.response.numero_carta_correcao,
        url_xml: resultado.response.caminho_xml_carta_correcao
          ? focusClient.getUrlXml(resultado.response.caminho_xml_carta_correcao)
          : null,
        url_pdf: resultado.response.caminho_pdf_carta_correcao
          ? focusClient.getUrlDanfe(resultado.response.caminho_pdf_carta_correcao)
          : null
      },
      duracao_ms: Date.now() - startTime
    })

  } catch (error: any) {
    console.error('[NFe] Erro ao emitir carta de correção:', error)
    
    return NextResponse.json(
      { 
        error: error.message || 'Erro interno ao emitir carta de correção',
        code: 'INTERNAL_ERROR',
        duracao_ms: Date.now() - startTime
      },
      { status: 500 }
    )
  }
}
