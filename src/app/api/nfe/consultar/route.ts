/**
 * API Route: Consultar NF-e
 * GET /api/nfe/consultar?venda_id=123
 * 
 * Consulta os dados de uma NF-e pelo venda_id.
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { getFocusNFeClient, mapearStatusFocusParaBanco } from '@/lib/focusnfe-server'
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

// Monta URL completa para arquivos do Focus NFe
function montarUrlCompleta(caminho: string | null | undefined): string | null {
  if (!caminho) return null
  const baseUrl = process.env.FOCUS_NFE_AMBIENTE === 'producao'
    ? 'https://api.focusnfe.com.br'
    : 'https://homologacao.focusnfe.com.br'
  
  // Se já é URL completa, retorna
  if (caminho.startsWith('http')) return caminho
  
  // Adiciona base URL
  return `${baseUrl}${caminho.startsWith('/') ? '' : '/'}${caminho}`
}

export async function GET(request: NextRequest) {
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

    // 2. Obter venda_id da query string
    const { searchParams } = new URL(request.url)
    const vendaIdParam = searchParams.get('venda_id')

    if (!vendaIdParam) {
      return NextResponse.json(
        { error: 'venda_id é obrigatório', code: 'INVALID_INPUT' },
        { status: 400 }
      )
    }

    const venda_id = parseInt(vendaIdParam, 10)

    if (isNaN(venda_id)) {
      return NextResponse.json(
        { error: 'venda_id deve ser um número válido', code: 'INVALID_INPUT' },
        { status: 400 }
      )
    }

    const supabase = createSupabaseClient()

    // 3. Buscar nota no banco
    const { data: nota, error: notaError } = await supabase
      .from('notas_fiscais')
      .select('*')
      .eq('venda_id', venda_id)
      .order('created_at', { ascending: false })
      .limit(1)
      .single()

    if (notaError || !nota) {
      return NextResponse.json(
        { error: 'Nota fiscal não encontrada', code: 'NOT_FOUND' },
        { status: 404 }
      )
    }

    // 4. Se nota pendente ou processando, consultar status na Focus NFe
    if (['pendente', 'processando', 'processando_autorizacao'].includes(nota.status)) {
      try {
        const focusClient = getFocusNFeClient()
        const resultado = await focusClient.consultar(nota.referencia)
        
        // Mapear status do Focus para banco
        const statusBanco = mapearStatusFocusParaBanco(resultado.response.status)
        
        // Atualizar nota se o status mudou
        if (statusBanco !== nota.status) {
          await supabase
            .from('notas_fiscais')
            .update({
              status: statusBanco,
              status_sefaz: resultado.response.status_sefaz,
              mensagem_sefaz: resultado.response.mensagem_sefaz,
              numero: resultado.response.numero,
              serie: resultado.response.serie,
              chave_acesso: resultado.response.chave_nfe,
              url_danfe: resultado.response.caminho_danfe,
              url_xml: resultado.response.caminho_xml_nota_fiscal,
              dados_retorno: resultado.response,
              updated_at: new Date().toISOString()
            })
            .eq('id', nota.id)

          // Se autorizado, atualizar venda
          if (resultado.response.status === 'autorizado') {
            await supabase
              .from('vendas')
              .update({
                nota_fiscal_emitida: true
              })
              .eq('id', venda_id)
          }

          return NextResponse.json({
            success: true,
            data: {
              nota_id: nota.id,
              referencia: nota.referencia,
              venda_id: nota.venda_id,
              status: statusBanco,
              status_sefaz: resultado.response.status_sefaz,
              mensagem_sefaz: resultado.response.mensagem_sefaz,
              numero: resultado.response.numero,
              serie: resultado.response.serie,
              chave_nfe: resultado.response.chave_nfe,
              url_danfe: montarUrlCompleta(resultado.response.caminho_danfe),
              url_xml: montarUrlCompleta(resultado.response.caminho_xml_nota_fiscal),
              valor_total: nota.valor_total,
              created_at: nota.created_at
            }
          })
        }
      } catch (error) {
        console.error('[NFe] Erro ao consultar Focus NFe:', error)
        // Continua com os dados do banco
      }
    }

    // 5. Retornar dados do banco
    return NextResponse.json({
      success: true,
      data: {
        nota_id: nota.id,
        referencia: nota.referencia,
        venda_id: nota.venda_id,
        status: nota.status,
        status_sefaz: nota.status_sefaz,
        mensagem_sefaz: nota.mensagem_sefaz,
        numero: nota.numero,
        serie: nota.serie,
        chave_nfe: nota.chave_acesso,
        url_danfe: montarUrlCompleta(nota.url_danfe),
        url_xml: montarUrlCompleta(nota.url_xml),
        valor_total: nota.valor_total,
        created_at: nota.created_at,
        cancelada_em: nota.cancelada_em,
        cancelamento_justificativa: nota.cancelamento_justificativa
      }
    })

  } catch (error: any) {
    console.error('[NFe] Erro ao consultar:', error)
    
    return NextResponse.json(
      { 
        error: error.message || 'Erro interno ao consultar NF-e',
        code: 'INTERNAL_ERROR'
      },
      { status: 500 }
    )
  }
}
