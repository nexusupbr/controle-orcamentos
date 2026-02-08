/**
 * API Route: Cancelar NF-e
 * POST /api/nfe/cancelar
 * 
 * Cancela uma NF-e autorizada.
 * 
 * Body: { venda_id: number, justificativa: string }
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { getFocusNFeClient } from '@/lib/focusnfe-server'
import { headers } from 'next/headers'

function createSupabaseClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    }
  )
}

export async function POST(request: NextRequest) {
  const startTime = Date.now()

  try {
    // 1. Verificar autenticação (X-User-Id header)
    const headersList = await headers()
    const userIdHeader = headersList.get('x-user-id')
    
    if (!userIdHeader) {
      return NextResponse.json(
        { error: 'Não autorizado - faça login', code: 'UNAUTHORIZED' },
        { status: 401 }
      )
    }

    const supabase = createSupabaseClient()

    // 2. Obter dados do request
    const body = await request.json()
    let { venda_id, justificativa } = body

    // Aceitar tanto number quanto string
    if (typeof venda_id === 'string') {
      venda_id = parseInt(venda_id, 10)
    }

    if (!venda_id || isNaN(venda_id)) {
      return NextResponse.json(
        { error: 'venda_id é obrigatório', code: 'INVALID_INPUT' },
        { status: 400 }
      )
    }

    if (!justificativa || justificativa.length < 15 || justificativa.length > 255) {
      return NextResponse.json(
        { error: 'Justificativa deve ter entre 15 e 255 caracteres', code: 'INVALID_INPUT' },
        { status: 400 }
      )
    }

    // 3. Buscar nota no banco pela venda_id
    const { data: nota, error: notaError } = await supabase
      .from('notas_fiscais')
      .select('*')
      .eq('venda_id', venda_id)
      .order('created_at', { ascending: false })
      .limit(1)
      .single()

    if (notaError || !nota) {
      console.log('[NFe] Nota não encontrada:', { venda_id, error: notaError })
      return NextResponse.json(
        { 
          error: 'Nota fiscal não encontrada para esta venda', 
          code: 'NOT_FOUND',
          details: notaError?.message || 'Nenhuma nota fiscal vinculada a esta venda'
        },
        { status: 404 }
      )
    }

    // 4. Verificar se pode ser cancelada
    if (nota.status !== 'autorizada' && nota.status !== 'autorizado') {
      return NextResponse.json(
        { error: `Nota com status '${nota.status}' não pode ser cancelada`, code: 'INVALID_STATUS' },
        { status: 400 }
      )
    }

    // 5. Verificar prazo de cancelamento (24h)
    const emitidaEm = new Date(nota.emitida_em || nota.created_at)
    const agora = new Date()
    const horasDesdeEmissao = (agora.getTime() - emitidaEm.getTime()) / (1000 * 60 * 60)

    if (horasDesdeEmissao > 24) {
      return NextResponse.json(
        { 
          error: 'Prazo para cancelamento expirado (máximo 24 horas após emissão)',
          code: 'DEADLINE_EXPIRED',
          horas_desde_emissao: Math.floor(horasDesdeEmissao)
        },
        { status: 400 }
      )
    }

    // 6. Cancelar na Focus NFe
    const focusClient = getFocusNFeClient()
    const resultado = await focusClient.cancelar(nota.referencia, justificativa)

    console.log('[NFe] Resultado cancelamento:', resultado)

    // 7. Registrar evento
    await focusClient.registrarEvento(
      nota.id,
      'cancelamento',
      `Cancelamento: ${resultado.response.status}`,
      { justificativa },
      resultado.response,
      resultado.status,
      resultado.durationMs,
      resultado.response.status !== 'cancelado' ? resultado.response.mensagem_sefaz : undefined,
      undefined
    )

    // 8. Atualizar nota no banco
    if (resultado.response.status === 'cancelado') {
      await supabase
        .from('notas_fiscais')
        .update({
          status: 'cancelada',
          status_sefaz: resultado.response.status_sefaz,
          mensagem_sefaz: resultado.response.mensagem_sefaz,
          url_xml_cancelamento: resultado.response.caminho_xml_cancelamento,
          cancelada_em: new Date().toISOString(),
          cancelamento_justificativa: justificativa,
          dados_retorno: resultado.response,
          updated_at: new Date().toISOString()
        })
        .eq('id', nota.id)

      // 9. Atualizar venda - limpar dados da NF
      await supabase
        .from('vendas')
        .update({
          nota_fiscal_emitida: false,
          numero_nf: null,
          chave_nf: null,
          nota_fiscal_status: 'cancelada'
        })
        .eq('id', venda_id)

      return NextResponse.json({
        success: true,
        message: 'NF-e cancelada com sucesso',
        data: {
          nota_id: nota.id,
          referencia: nota.referencia,
          status: 'cancelada',
          status_sefaz: resultado.response.status_sefaz,
          mensagem_sefaz: resultado.response.mensagem_sefaz
        },
        duracao_ms: Date.now() - startTime
      })
    } else {
      // Cancelamento falhou
      return NextResponse.json({
        success: false,
        message: resultado.response.mensagem_sefaz || 'Erro ao cancelar NF-e',
        data: {
          nota_id: nota.id,
          referencia: nota.referencia,
          status: resultado.response.status,
          status_sefaz: resultado.response.status_sefaz,
          mensagem_sefaz: resultado.response.mensagem_sefaz
        },
        duracao_ms: Date.now() - startTime
      }, { status: 400 })
    }

  } catch (error: any) {
    console.error('[NFe] Erro ao cancelar:', error)
    
    return NextResponse.json(
      { 
        error: error.message || 'Erro interno ao cancelar NF-e',
        code: 'INTERNAL_ERROR',
        duracao_ms: Date.now() - startTime
      },
      { status: 500 }
    )
  }
}
