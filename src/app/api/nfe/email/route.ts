/**
 * API Route: Reenviar Email NF-e
 * POST /api/nfe/email
 * 
 * Reenvia os arquivos da NF-e por email.
 * 
 * Body: { ref: string, emails: string[] }
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
    const { ref, emails } = body

    if (!ref) {
      return NextResponse.json(
        { error: 'Referência (ref) é obrigatória', code: 'INVALID_INPUT' },
        { status: 400 }
      )
    }

    if (!emails || !Array.isArray(emails) || emails.length === 0) {
      return NextResponse.json(
        { error: 'Informe pelo menos um email', code: 'INVALID_INPUT' },
        { status: 400 }
      )
    }

    if (emails.length > 10) {
      return NextResponse.json(
        { error: 'Máximo de 10 emails por vez', code: 'INVALID_INPUT' },
        { status: 400 }
      )
    }

    // Validar formato dos emails
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    const emailsInvalidos = emails.filter(e => !emailRegex.test(e))
    if (emailsInvalidos.length > 0) {
      return NextResponse.json(
        { error: `Emails inválidos: ${emailsInvalidos.join(', ')}`, code: 'INVALID_INPUT' },
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

    // 4. Verificar se a nota está autorizada
    if (nota.status !== 'autorizada' && nota.status !== 'autorizado') {
      return NextResponse.json(
        { error: `Apenas notas autorizadas podem ser enviadas por email. Status atual: ${nota.status}`, code: 'INVALID_STATUS' },
        { status: 400 }
      )
    }

    // 5. Reenviar email via Focus NFe
    const focusClient = getFocusNFeClient()
    await focusClient.reenviarEmail(ref, emails)

    // 6. Registrar evento
    await focusClient.registrarEvento(
      nota.id,
      'reenvio_email',
      `Email reenviado para: ${emails.join(', ')}`,
      { emails },
      { success: true },
      200,
      Date.now() - startTime,
      null,
      user.id
    )

    // 7. Retornar sucesso
    return NextResponse.json({
      success: true,
      message: `Email enviado para ${emails.length} destinatário(s)`,
      data: {
        nota_id: nota.id,
        referencia: ref,
        emails_enviados: emails
      },
      duracao_ms: Date.now() - startTime
    })

  } catch (error: any) {
    console.error('[NFe] Erro ao reenviar email:', error)
    
    return NextResponse.json(
      { 
        error: error.message || 'Erro interno ao reenviar email',
        code: 'INTERNAL_ERROR',
        duracao_ms: Date.now() - startTime
      },
      { status: 500 }
    )
  }
}
