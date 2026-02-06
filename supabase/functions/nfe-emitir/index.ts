// Supabase Edge Function: nfe-emitir
// Emite NF-e via Focus NFe API (substitui API Route para GitHub Pages)

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-user-id',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

// Configurações Focus NFe
const FOCUS_NFE_TOKEN = Deno.env.get('FOCUS_NFE_TOKEN') || ''
const FOCUS_NFE_AMBIENTE = Deno.env.get('FOCUS_NFE_AMBIENTE') || 'homologacao'

interface ConfigFiscal {
  cnpj: string
  inscricao_estadual: string
  razao_social: string
  nome_fantasia?: string
  logradouro: string
  numero: string
  complemento?: string
  bairro: string
  codigo_municipio: string
  municipio: string
  uf: string
  cep: string
  telefone?: string
  regime_tributario: number
  natureza_operacao_padrao: string
  cfop_padrao: string
  informacoes_complementares?: string
}

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
    const { venda_id } = await req.json()
    
    if (!venda_id) {
      return new Response(
        JSON.stringify({ error: 'venda_id é obrigatório', code: 'INVALID_INPUT' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Verificar se já existe nota para esta venda
    const { data: notaExistente } = await supabase
      .from('notas_fiscais')
      .select('*')
      .eq('venda_id', venda_id)
      .not('status', 'in', '("cancelada","erro_autorizacao")')
      .maybeSingle()

    if (notaExistente) {
      return new Response(
        JSON.stringify({
          success: true,
          message: 'Nota fiscal já existe para esta venda',
          idempotent: true,
          data: {
            nota_id: notaExistente.id,
            referencia: notaExistente.referencia,
            status: notaExistente.status,
            numero: notaExistente.numero,
            chave_nfe: notaExistente.chave_nfe
          }
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Buscar venda com itens e cliente
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

    if (vendaError || !venda) {
      return new Response(
        JSON.stringify({ error: 'Venda não encontrada', code: 'VENDA_NOT_FOUND' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Buscar configuração fiscal
    const { data: configFiscal, error: configError } = await supabase
      .from('config_fiscal')
      .select('*')
      .eq('ativo', true)
      .single()

    if (configError || !configFiscal) {
      return new Response(
        JSON.stringify({ error: 'Configuração fiscal não encontrada', code: 'CONFIG_NOT_FOUND' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Montar payload da NF-e
    const referencia = `venda-${venda_id}-${Date.now().toString(36)}`
    const isHomologacao = FOCUS_NFE_AMBIENTE === 'homologacao'
    const cliente = venda.cliente as any
    
    // Determinar CFOP
    const mesmoEstado = !cliente?.estado || configFiscal.uf === cliente.estado
    const cfop = mesmoEstado ? '5102' : '6102'

    // Montar itens
    const itens = ((venda.itens as any[]) || []).map((item: any, index: number) => {
      const ncm = item.produto?.ncm || (isHomologacao ? '39172100' : '')
      const unidade = item.produto?.unidade || 'UN'
      const codigoProduto = item.produto?.codigo || (item.produto_id ? String(item.produto_id) : `ITEM-${index + 1}`)

      return {
        numero_item: index + 1,
        codigo_produto: codigoProduto,
        descricao: item.descricao,
        codigo_ncm: ncm,
        cfop,
        unidade_comercial: unidade,
        quantidade_comercial: item.quantidade,
        valor_unitario_comercial: item.valor_unitario,
        valor_bruto: item.valor_total,
        unidade_tributavel: unidade,
        quantidade_tributavel: item.quantidade,
        valor_unitario_tributavel: item.valor_unitario,
        origem: 0,
        icms_origem: 0,
        icms_situacao_tributaria: configFiscal.regime_tributario === 1 ? '102' : '00',
        pis_situacao_tributaria: '07',
        cofins_situacao_tributaria: '07',
        inclui_no_total: 1
      }
    })

    // Calcular totais
    const valorProdutos = itens.reduce((sum: number, item: any) => sum + item.valor_bruto, 0)
    const valorDesconto = venda.valor_desconto || 0
    const valorFrete = venda.valor_frete || 0
    const valorTotal = valorProdutos - valorDesconto + valorFrete

    // Data de emissão com fuso horário
    const now = new Date()
    const fusos: Record<string, number> = {
      'SP': -3, 'RJ': -3, 'MG': -3, 'MT': -4, 'MS': -4, 'AM': -4, 'AC': -5
    }
    const fuso = fusos[configFiscal.uf] || -3
    const fusoStr = `${fuso < 0 ? '-' : '+'}${String(Math.abs(fuso)).padStart(2, '0')}:00`
    const localDate = new Date(now.getTime() + (fuso * 60 + now.getTimezoneOffset()) * 60000)
    const dataEmissao = `${localDate.getFullYear()}-${String(localDate.getMonth() + 1).padStart(2, '0')}-${String(localDate.getDate()).padStart(2, '0')}T${String(localDate.getHours()).padStart(2, '0')}:${String(localDate.getMinutes()).padStart(2, '0')}:${String(localDate.getSeconds()).padStart(2, '0')}${fusoStr}`

    const payload = {
      natureza_operacao: configFiscal.natureza_operacao_padrao || 'Venda',
      data_emissao: dataEmissao,
      tipo_documento: 1,
      local_destino: mesmoEstado ? 1 : 2,
      finalidade_emissao: 1,
      consumidor_final: 1,
      presenca_comprador: 1,
      
      // Emitente
      cnpj_emitente: configFiscal.cnpj.replace(/\D/g, ''),
      inscricao_estadual_emitente: configFiscal.inscricao_estadual.replace(/\D/g, ''),
      nome_emitente: configFiscal.razao_social,
      nome_fantasia_emitente: configFiscal.nome_fantasia || configFiscal.razao_social,
      logradouro_emitente: configFiscal.logradouro,
      numero_emitente: configFiscal.numero,
      bairro_emitente: configFiscal.bairro,
      codigo_municipio_emitente: configFiscal.codigo_municipio,
      municipio_emitente: configFiscal.municipio,
      uf_emitente: configFiscal.uf,
      cep_emitente: configFiscal.cep.replace(/\D/g, ''),
      regime_tributario_emitente: configFiscal.regime_tributario,
      
      // Destinatário
      nome_destinatario: isHomologacao
        ? 'NF-E EMITIDA EM AMBIENTE DE HOMOLOGACAO - SEM VALOR FISCAL'
        : (cliente?.nome || cliente?.razao_social || 'Consumidor Final'),
      cpf_destinatario: cliente?.cpf?.replace(/\D/g, '') || undefined,
      cnpj_destinatario: cliente?.cnpj?.replace(/\D/g, '') || undefined,
      logradouro_destinatario: cliente?.endereco || '',
      numero_destinatario: cliente?.numero || 'S/N',
      bairro_destinatario: cliente?.bairro || '',
      codigo_municipio_destinatario: configFiscal.codigo_municipio,
      municipio_destinatario: cliente?.cidade || configFiscal.municipio,
      uf_destinatario: cliente?.estado || configFiscal.uf,
      cep_destinatario: cliente?.cep?.replace(/\D/g, '') || configFiscal.cep.replace(/\D/g, ''),
      pais_destinatario: 'Brasil',
      codigo_pais_destinatario: '1058',
      indicador_inscricao_estadual_destinatario: 9,
      
      // Totais
      valor_total: valorTotal,
      valor_produtos: valorProdutos,
      valor_desconto: valorDesconto,
      valor_frete: valorFrete,
      modalidade_frete: 9,
      
      // Itens
      items: itens,
      
      // Pagamento
      formas_pagamento: [{
        forma_pagamento: '01',
        valor_pagamento: valorTotal
      }]
    }

    // Enviar para Focus NFe
    const baseUrl = FOCUS_NFE_AMBIENTE === 'producao'
      ? 'https://api.focusnfe.com.br'
      : 'https://homologacao.focusnfe.com.br'

    console.log('[Edge Function] Enviando NFe para Focus NFe:', referencia)
    
    const focusResponse = await fetch(`${baseUrl}/v2/nfe?ref=${referencia}`, {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${btoa(FOCUS_NFE_TOKEN + ':')}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload)
    })

    const focusResult = await focusResponse.json()
    console.log('[Edge Function] Resposta Focus NFe:', focusResult)

    // Mapear status do Focus para banco
    const statusMap: Record<string, string> = {
      'autorizado': 'autorizada',
      'processando_autorizacao': 'processando',
      'erro_autorizacao': 'rejeitada',
      'cancelado': 'cancelada'
    }
    const statusBanco = statusMap[focusResult.status] || focusResult.status

    // Montar URL completa do DANFE/XML
    const urlDanfe = focusResult.caminho_danfe 
      ? `${baseUrl}${focusResult.caminho_danfe}?token=${FOCUS_NFE_TOKEN}`
      : null
    const urlXml = focusResult.caminho_xml_nota_fiscal
      ? `${baseUrl}${focusResult.caminho_xml_nota_fiscal}?token=${FOCUS_NFE_TOKEN}`
      : null

    // Salvar no banco
    const { data: notaCriada, error: notaError } = await supabase
      .from('notas_fiscais')
      .insert({
        referencia,
        venda_id: venda_id,
        tipo: 'nfe',
        numero: focusResult.numero || null,
        serie: focusResult.serie || '1',
        chave_nfe: focusResult.chave_nfe || null,
        status: statusBanco,
        status_sefaz: focusResult.status_sefaz || null,
        mensagem_sefaz: focusResult.mensagem_sefaz || null,
        nome_destinatario: cliente?.nome || cliente?.razao_social || 'Consumidor Final',
        cpf_cnpj_destinatario: cliente?.cpf || cliente?.cnpj || null,
        valor_total: valorTotal,
        valor_produtos: valorProdutos,
        valor_desconto: valorDesconto,
        valor_frete: valorFrete,
        url_xml: urlXml,
        url_danfe: urlDanfe,
        ambiente: FOCUS_NFE_AMBIENTE
      })
      .select()
      .single()

    if (notaError) {
      console.error('[Edge Function] Erro ao salvar nota:', notaError)
    }

    // Atualizar venda se autorizada
    if (focusResult.status === 'autorizado') {
      await supabase
        .from('vendas')
        .update({
          nota_fiscal_emitida: true,
          numero_nf: focusResult.numero,
          chave_nf: focusResult.chave_nfe
        })
        .eq('id', venda_id)
    }

    // Retornar resultado
    if (focusResult.status === 'autorizado') {
      return new Response(
        JSON.stringify({
          success: true,
          message: 'Nota fiscal autorizada com sucesso',
          data: {
            nota_id: notaCriada?.id,
            referencia,
            status: 'autorizado',
            status_sefaz: focusResult.status_sefaz,
            mensagem_sefaz: focusResult.mensagem_sefaz,
            numero: focusResult.numero,
            serie: focusResult.serie,
            chave_nfe: focusResult.chave_nfe,
            url_danfe: urlDanfe,
            url_xml: urlXml
          }
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    } else if (focusResult.status === 'erro_autorizacao') {
      return new Response(
        JSON.stringify({
          success: false,
          error: `Erro na autorização: ${focusResult.mensagem_sefaz}`,
          data: {
            referencia,
            status: focusResult.status,
            status_sefaz: focusResult.status_sefaz,
            mensagem_sefaz: focusResult.mensagem_sefaz
          }
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    } else {
      return new Response(
        JSON.stringify({
          success: true,
          message: 'Nota fiscal em processamento',
          data: {
            nota_id: notaCriada?.id,
            referencia,
            status: focusResult.status,
            mensagem_sefaz: focusResult.mensagem_sefaz
          }
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
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
