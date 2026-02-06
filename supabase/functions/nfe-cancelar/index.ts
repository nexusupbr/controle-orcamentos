// Supabase Edge Function: nfe-cancelar
// Cancela NF-e via Focus NFe API

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-user-id',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

const FOCUS_NFE_TOKEN = Deno.env.get('FOCUS_NFE_TOKEN') || ''
const FOCUS_NFE_AMBIENTE = Deno.env.get('FOCUS_NFE_AMBIENTE') || 'homologacao'

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // Verificar autenticação
    const userId = req.headers.get('x-user-id')
    if (!userId) {
      return new Response(
        JSON.stringify({ error: 'Não autorizado', code: 'UNAUTHORIZED' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Criar cliente Supabase
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const supabase = createClient(supabaseUrl, supabaseKey)

    // Obter dados do request
    const { venda_id, justificativa } = await req.json()
    
    if (!venda_id) {
      return new Response(
        JSON.stringify({ error: 'venda_id é obrigatório', code: 'INVALID_INPUT' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    if (!justificativa || justificativa.length < 15) {
      return new Response(
        JSON.stringify({ error: 'Justificativa deve ter no mínimo 15 caracteres', code: 'INVALID_INPUT' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Buscar nota fiscal da venda
    const { data: nota, error: notaError } = await supabase
      .from('notas_fiscais')
      .select('*')
      .eq('venda_id', venda_id)
      .in('status', ['autorizada', 'autorizado'])
      .order('created_at', { ascending: false })
      .limit(1)
      .single()

    if (notaError || !nota) {
      return new Response(
        JSON.stringify({ error: 'Nota fiscal não encontrada ou não está autorizada', code: 'NOTA_NOT_FOUND' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Enviar cancelamento para Focus NFe
    const baseUrl = FOCUS_NFE_AMBIENTE === 'producao'
      ? 'https://api.focusnfe.com.br'
      : 'https://homologacao.focusnfe.com.br'

    console.log('[Edge Function] Cancelando NFe:', nota.referencia)
    
    const focusResponse = await fetch(`${baseUrl}/v2/nfe/${nota.referencia}`, {
      method: 'DELETE',
      headers: {
        'Authorization': `Basic ${btoa(FOCUS_NFE_TOKEN + ':')}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ justificativa })
    })

    const focusResult = await focusResponse.json()
    console.log('[Edge Function] Resposta Focus NFe:', focusResult)

    // Atualizar nota no banco
    if (focusResult.status === 'cancelado') {
      await supabase
        .from('notas_fiscais')
        .update({
          status: 'cancelada',
          status_sefaz: focusResult.status_sefaz,
          mensagem_sefaz: focusResult.mensagem_sefaz,
          url_xml_cancelamento: focusResult.caminho_xml_cancelamento 
            ? `${baseUrl}${focusResult.caminho_xml_cancelamento}?token=${FOCUS_NFE_TOKEN}`
            : null,
          updated_at: new Date().toISOString()
        })
        .eq('id', nota.id)

      // Atualizar venda
      await supabase
        .from('vendas')
        .update({
          nota_fiscal_emitida: false,
          numero_nf: null,
          chave_nf: null
        })
        .eq('id', venda_id)

      return new Response(
        JSON.stringify({
          success: true,
          message: 'Nota fiscal cancelada com sucesso',
          data: {
            nota_id: nota.id,
            referencia: nota.referencia,
            status: 'cancelada',
            protocolo: focusResult.numero_protocolo
          }
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    } else {
      return new Response(
        JSON.stringify({
          success: false,
          error: `Erro ao cancelar: ${focusResult.mensagem_sefaz || focusResult.mensagem || 'Erro desconhecido'}`,
          data: focusResult
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

  } catch (error: any) {
    console.error('[Edge Function] Erro:', error)
    return new Response(
      JSON.stringify({ error: error.message || 'Erro interno', code: 'INTERNAL_ERROR' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
