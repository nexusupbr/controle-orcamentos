/**
 * API Route: Worker de Processamento de Notas Pendentes
 * POST /api/nfe/worker
 * 
 * Este endpoint processa notas fiscais pendentes em lote.
 * Deve ser chamado por um cron job (ex: Vercel Cron, Supabase pg_cron).
 * 
 * Para segurança, requer um token de autorização específico.
 */

import { NextRequest, NextResponse } from 'next/server'
import { getFocusNFeClient } from '@/lib/focusnfe-server'

// Token secreto para autorizar o worker
const WORKER_SECRET = process.env.NFE_WORKER_SECRET || 'default-dev-secret'

interface ProcessamentoResultado {
  nota_id: number
  referencia: string
  status_anterior: string
  status_novo: string | undefined
  sucesso: boolean
  erro?: string
  duracao_ms: number
}

export async function POST(request: NextRequest) {
  const startTime = Date.now()
  const resultados: ProcessamentoResultado[] = []
  let processadas = 0
  let erros = 0
  let autorizadas = 0
  let rejeitadas = 0

  try {
    // 1. Verificar autorização do worker
    const authHeader = request.headers.get('authorization')
    
    if (authHeader !== `Bearer ${WORKER_SECRET}`) {
      return NextResponse.json(
        { error: 'Não autorizado', code: 'UNAUTHORIZED' },
        { status: 401 }
      )
    }

    // 2. Parâmetros opcionais
    const searchParams = request.nextUrl.searchParams
    const limite = parseInt(searchParams.get('limite') || '10')
    const maxTentativas = parseInt(searchParams.get('max_tentativas') || '10')

    console.log(`[Worker NFe] Iniciando processamento (limite: ${limite}, maxTentativas: ${maxTentativas})`)

    // 3. Buscar notas pendentes
    const focusClient = getFocusNFeClient()
    const notasPendentes = await focusClient.buscarNotasPendentes(limite)

    if (notasPendentes.length === 0) {
      return NextResponse.json({
        success: true,
        message: 'Nenhuma nota pendente para processar',
        stats: {
          processadas: 0,
          autorizadas: 0,
          rejeitadas: 0,
          erros: 0
        },
        duracao_ms: Date.now() - startTime
      })
    }

    console.log(`[Worker NFe] Encontradas ${notasPendentes.length} notas pendentes`)

    // 4. Processar cada nota
    for (const nota of notasPendentes) {
      const notaStartTime = Date.now()
      const resultado: ProcessamentoResultado = {
        nota_id: nota.id,
        referencia: nota.referencia,
        status_anterior: 'processando_autorizacao',
        status_novo: '',
        sucesso: false,
        duracao_ms: 0
      }

      try {
        // Verificar se excedeu tentativas
        if (nota.tentativas_autorizacao >= maxTentativas) {
          console.log(`[Worker NFe] Nota ${nota.referencia} excedeu máximo de tentativas`)
          
          // Marcar como erro de timeout
          await focusClient.atualizarNotaAposConsulta(
            nota.id,
            {
              status: 'erro_autorizacao',
              status_sefaz: 'TIMEOUT',
              mensagem_sefaz: `Timeout de autorização após ${nota.tentativas_autorizacao} tentativas`,
              ref: nota.referencia,
              cnpj_emitente: ''
            },
            nota.tentativas_autorizacao
          )

          await focusClient.registrarEvento(
            nota.id,
            'erro',
            `Timeout após ${nota.tentativas_autorizacao} tentativas`,
            null,
            null,
            null,
            null,
            'Máximo de tentativas excedido'
          )

          resultado.status_novo = 'erro_autorizacao'
          resultado.erro = 'Máximo de tentativas excedido'
          erros++
          rejeitadas++
        } else {
          // Consultar status na Focus NFe
          const consulta = await focusClient.consultar(nota.referencia)
          
          console.log(`[Worker NFe] Nota ${nota.referencia}: ${consulta.response.status}`)

          // Registrar evento de consulta
          await focusClient.registrarEvento(
            nota.id,
            'consulta',
            `Worker consulta #${nota.tentativas_autorizacao + 1}: ${consulta.response.status}`,
            null,
            consulta.response,
            consulta.status,
            consulta.durationMs
          )

          // Atualizar nota
          await focusClient.atualizarNotaAposConsulta(
            nota.id,
            consulta.response,
            nota.tentativas_autorizacao + 1
          )

          resultado.status_novo = consulta.response.status

          // Processar conforme status
          if (consulta.response.status === 'autorizado') {
            // Atualizar venda
            if (nota.venda_id) {
              await focusClient.atualizarVendaAposAutorizacao(
                nota.venda_id,
                consulta.response.numero || '',
                consulta.response.chave_nfe || ''
              )
            }

            await focusClient.registrarEvento(
              nota.id,
              'autorizacao',
              `NF-e autorizada pelo worker: ${consulta.response.numero}`,
              null,
              consulta.response
            )

            autorizadas++
            resultado.sucesso = true
          } else if (consulta.response.status === 'erro_autorizacao' || consulta.response.status === 'denegado') {
            await focusClient.registrarEvento(
              nota.id,
              'rejeicao',
              `NF-e rejeitada: ${consulta.response.mensagem_sefaz}`,
              null,
              consulta.response,
              null,
              null,
              consulta.response.erros ? JSON.stringify(consulta.response.erros) : consulta.response.mensagem_sefaz
            )

            rejeitadas++
            resultado.erro = consulta.response.mensagem_sefaz || 'Erro de autorização'
          } else if (consulta.response.status === 'processando_autorizacao') {
            // Ainda processando, será consultada novamente
            resultado.sucesso = true
          }
        }

        processadas++
      } catch (error: any) {
        console.error(`[Worker NFe] Erro ao processar nota ${nota.referencia}:`, error)
        
        resultado.erro = error.message
        erros++

        // Registrar erro
        await focusClient.registrarEvento(
          nota.id,
          'erro',
          'Erro no worker de processamento',
          null,
          null,
          null,
          null,
          error.message
        )
      }

      resultado.duracao_ms = Date.now() - notaStartTime
      resultados.push(resultado)
    }

    // 5. Retornar relatório
    return NextResponse.json({
      success: true,
      message: `Processadas ${processadas} notas`,
      stats: {
        total_pendentes: notasPendentes.length,
        processadas,
        autorizadas,
        rejeitadas,
        erros
      },
      resultados,
      duracao_ms: Date.now() - startTime
    })

  } catch (error: any) {
    console.error('[Worker NFe] Erro geral:', error)
    
    return NextResponse.json(
      { 
        error: error.message || 'Erro interno no worker',
        code: 'INTERNAL_ERROR',
        stats: {
          processadas,
          autorizadas,
          rejeitadas,
          erros
        },
        resultados,
        duracao_ms: Date.now() - startTime
      },
      { status: 500 }
    )
  }
}

// GET para verificar status do worker
export async function GET(request: NextRequest) {
  const authHeader = request.headers.get('authorization')
  
  if (authHeader !== `Bearer ${WORKER_SECRET}`) {
    return NextResponse.json(
      { error: 'Não autorizado', code: 'UNAUTHORIZED' },
      { status: 401 }
    )
  }

  try {
    const focusClient = getFocusNFeClient()
    const info = focusClient.getInfo()
    const config = focusClient.verificarConfiguracao()
    const notasPendentes = await focusClient.buscarNotasPendentes(100)

    return NextResponse.json({
      status: 'online',
      config: {
        ambiente: info.ambiente,
        configuracao_ok: config.ok,
        mensagem: config.mensagem
      },
      pendentes: {
        total: notasPendentes.length,
        notas: notasPendentes.map(n => ({
          id: n.id,
          referencia: n.referencia,
          tentativas: n.tentativas_autorizacao
        }))
      }
    })
  } catch (error: any) {
    return NextResponse.json(
      { 
        status: 'error',
        error: error.message 
      },
      { status: 500 }
    )
  }
}
