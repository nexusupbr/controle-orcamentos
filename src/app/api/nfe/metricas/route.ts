/**
 * API Route: Métricas e Dashboard NFe
 * GET /api/nfe/metricas
 * 
 * Retorna métricas e estatísticas das notas fiscais.
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
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

    // 2. Parâmetros
    const searchParams = request.nextUrl.searchParams
    const dias = parseInt(searchParams.get('dias') || '30')
    const ambiente = searchParams.get('ambiente') || 'todos'

    // 3. Buscar estatísticas gerais
    let queryStats = supabase
      .from('notas_fiscais')
      .select('id, status, valor_total, tempo_autorizacao_ms, tentativas_autorizacao, ambiente, created_at')

    if (ambiente !== 'todos') {
      queryStats = queryStats.eq('ambiente', ambiente)
    }

    queryStats = queryStats.gte('created_at', new Date(Date.now() - dias * 24 * 60 * 60 * 1000).toISOString())

    const { data: notas, error: notasError } = await queryStats

    if (notasError) throw notasError

    // 4. Calcular métricas
    const total = notas?.length || 0
    const autorizadas = notas?.filter(n => n.status === 'autorizada' || n.status === 'autorizado').length || 0
    const pendentes = notas?.filter(n => ['pendente', 'processando', 'processando_autorizacao'].includes(n.status)).length || 0
    const rejeitadas = notas?.filter(n => ['rejeitada', 'erro_autorizacao', 'denegada'].includes(n.status)).length || 0
    const canceladas = notas?.filter(n => n.status === 'cancelada').length || 0

    const valorTotalAutorizado = notas
      ?.filter(n => n.status === 'autorizada' || n.status === 'autorizado')
      .reduce((acc, n) => acc + (n.valor_total || 0), 0) || 0

    const temposAutorizacao = notas
      ?.filter(n => (n.status === 'autorizada' || n.status === 'autorizado') && n.tempo_autorizacao_ms)
      .map(n => n.tempo_autorizacao_ms) || []

    const tempoMedioMs = temposAutorizacao.length > 0
      ? Math.round(temposAutorizacao.reduce((a, b) => a + b, 0) / temposAutorizacao.length)
      : 0

    const tempoMaximoMs = temposAutorizacao.length > 0
      ? Math.max(...temposAutorizacao)
      : 0

    const tempoMinimoMs = temposAutorizacao.length > 0
      ? Math.min(...temposAutorizacao)
      : 0

    const mediaTentativas = notas && notas.length > 0
      ? Math.round((notas.reduce((acc, n) => acc + (n.tentativas_autorizacao || 0), 0) / notas.length) * 100) / 100
      : 0

    // 5. Buscar dados por dia (últimos N dias)
    const porDia: Record<string, { total: number; autorizadas: number; rejeitadas: number; valor: number }> = {}
    
    notas?.forEach(nota => {
      const dia = nota.created_at.split('T')[0]
      if (!porDia[dia]) {
        porDia[dia] = { total: 0, autorizadas: 0, rejeitadas: 0, valor: 0 }
      }
      porDia[dia].total++
      if (nota.status === 'autorizada' || nota.status === 'autorizado') {
        porDia[dia].autorizadas++
        porDia[dia].valor += nota.valor_total || 0
      }
      if (['rejeitada', 'erro_autorizacao', 'denegada'].includes(nota.status)) {
        porDia[dia].rejeitadas++
      }
    })

    // 6. Buscar últimas notas
    const { data: ultimasNotas } = await supabase
      .from('notas_fiscais')
      .select('id, referencia, venda_id, status, numero, valor_total, created_at')
      .order('created_at', { ascending: false })
      .limit(10)

    // 7. Retornar métricas
    return NextResponse.json({
      success: true,
      periodo: {
        dias,
        ambiente,
        de: new Date(Date.now() - dias * 24 * 60 * 60 * 1000).toISOString(),
        ate: new Date().toISOString()
      },
      totais: {
        total,
        autorizadas,
        pendentes,
        rejeitadas,
        canceladas,
        taxa_sucesso: total > 0 ? Math.round((autorizadas / total) * 10000) / 100 : 0,
        taxa_rejeicao: total > 0 ? Math.round((rejeitadas / total) * 10000) / 100 : 0
      },
      valores: {
        total_autorizado: valorTotalAutorizado,
        ticket_medio: autorizadas > 0 ? Math.round(valorTotalAutorizado / autorizadas * 100) / 100 : 0
      },
      performance: {
        tempo_medio_autorizacao_ms: tempoMedioMs,
        tempo_maximo_autorizacao_ms: tempoMaximoMs,
        tempo_minimo_autorizacao_ms: tempoMinimoMs,
        media_tentativas: mediaTentativas
      },
      historico: Object.entries(porDia)
        .map(([data, stats]) => ({ data, ...stats }))
        .sort((a, b) => b.data.localeCompare(a.data)),
      ultimas_notas: ultimasNotas || []
    })

  } catch (error: any) {
    console.error('[NFe] Erro ao buscar métricas:', error)
    
    return NextResponse.json(
      { 
        error: error.message || 'Erro interno ao buscar métricas',
        code: 'INTERNAL_ERROR'
      },
      { status: 500 }
    )
  }
}
