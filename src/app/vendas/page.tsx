'use client'

import { useState, useEffect } from 'react'
import { 
  Plus, Search, ShoppingCart, Package, User, Trash2, 
  FileText, Check, X, Edit2, Eye, Printer, Download,
  Calculator, Receipt, TrendingUp, RefreshCw, AlertCircle
} from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { 
  LoadingSpinner, EmptyState, Badge 
} from '@/components/ui/Common'
import { Modal } from '@/components/ui/Modal'
import { 
  fetchClientes, fetchProdutos, createVenda, fetchVendas,
  updateVenda, deleteVenda, createLancamentoFinanceiro,
  createContaReceber, Cliente, Produto, Venda
} from '@/lib/database'
import { formatCurrency, formatDate, cn } from '@/lib/utils'
import { supabase } from '@/lib/supabase'
import { 
  emitirNFe, consultarNFe, aguardarAutorizacaoNFe, 
  gerarReferenciaNFe, getUrlDanfe, getUrlXml,
  NFeDados, NFeItem, NFeFormaPagamento,
  getConfig, verificarConfiguracao
} from '@/lib/focusnfe'

interface ItemVenda {
  produto_id: number
  produto?: Produto
  descricao: string
  quantidade: number
  valor_unitario: number
  valor_desconto: number
  valor_total: number
  custo_unitario: number
}

interface VendaForm {
  cliente_id: number | null
  data_venda: string
  valor_desconto: number
  valor_frete: number
  forma_pagamento: string
  condicao_pagamento: string
  parcelas: number
  observacoes: string
  itens: ItemVenda[]
}

const formasPagamento = [
  { value: 'dinheiro', label: 'Dinheiro' },
  { value: 'pix', label: 'PIX' },
  { value: 'debito', label: 'Cartão Débito' },
  { value: 'credito', label: 'Cartão Crédito' },
  { value: 'boleto', label: 'Boleto' },
  { value: 'transferencia', label: 'Transferência' },
  { value: 'cheque', label: 'Cheque' },
]

const condicoesPagamento = [
  { value: 'vista', label: 'À Vista' },
  { value: 'prazo', label: 'A Prazo' },
  { value: 'parcelado', label: 'Parcelado' },
]

export default function VendasPage() {
  const [loading, setLoading] = useState(true)
  const [vendas, setVendas] = useState<Venda[]>([])
  const [clientes, setClientes] = useState<Cliente[]>([])
  const [produtos, setProdutos] = useState<Produto[]>([])
  const [searchTerm, setSearchTerm] = useState('')
  const [filterStatus, setFilterStatus] = useState('todos')
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [isViewModalOpen, setIsViewModalOpen] = useState(false)
  const [isPrintModalOpen, setIsPrintModalOpen] = useState(false)
  const [selectedVenda, setSelectedVenda] = useState<Venda | null>(null)
  const [saving, setSaving] = useState(false)
  const [generatingNF, setGeneratingNF] = useState(false)

  // Form state
  const [form, setForm] = useState<VendaForm>({
    cliente_id: null,
    data_venda: new Date().toISOString().split('T')[0],
    valor_desconto: 0,
    valor_frete: 0,
    forma_pagamento: 'dinheiro',
    condicao_pagamento: 'vista',
    parcelas: 1,
    observacoes: '',
    itens: []
  })

  // Produto selecionado para adicionar
  const [produtoSearch, setProdutoSearch] = useState('')
  const [showProdutoDropdown, setShowProdutoDropdown] = useState(false)
  const [itemForm, setItemForm] = useState({
    produto_id: 0,
    quantidade: 1,
    valor_unitario: 0,
    valor_desconto: 0
  })

  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    try {
      setLoading(true)
      const [vendasData, clientesData, produtosData] = await Promise.all([
        fetchVendas(),
        fetchClientes(),
        fetchProdutos()
      ])
      setVendas(vendasData)
      setClientes(clientesData)
      setProdutos(produtosData)
    } catch (error) {
      console.error('Erro ao carregar dados:', error)
    } finally {
      setLoading(false)
    }
  }

  const resetForm = () => {
    setForm({
      cliente_id: null,
      data_venda: new Date().toISOString().split('T')[0],
      valor_desconto: 0,
      valor_frete: 0,
      forma_pagamento: 'dinheiro',
      condicao_pagamento: 'vista',
      parcelas: 1,
      observacoes: '',
      itens: []
    })
    setItemForm({ produto_id: 0, quantidade: 1, valor_unitario: 0, valor_desconto: 0 })
    setProdutoSearch('')
  }

  const openNewVenda = () => {
    resetForm()
    setSelectedVenda(null)
    setIsModalOpen(true)
  }

  const openEditVenda = (venda: Venda) => {
    setSelectedVenda(venda)
    setForm({
      cliente_id: venda.cliente_id || null,
      data_venda: venda.data_venda,
      valor_desconto: venda.valor_desconto || 0,
      valor_frete: venda.valor_frete || 0,
      forma_pagamento: 'dinheiro',
      condicao_pagamento: 'vista',
      parcelas: 1,
      observacoes: venda.observacoes || '',
      itens: (venda.itens || []).map((item: any) => ({
        produto_id: item.produto_id,
        produto: produtos.find(p => p.id === item.produto_id),
        descricao: item.descricao,
        quantidade: item.quantidade,
        valor_unitario: item.valor_unitario,
        valor_desconto: item.valor_desconto || 0,
        valor_total: item.valor_total,
        custo_unitario: item.custo_unitario || 0
      }))
    })
    setIsModalOpen(true)
  }

  const openViewVenda = (venda: Venda) => {
    setSelectedVenda(venda)
    setIsViewModalOpen(true)
  }

  // Adicionar produto à venda
  const addProduto = (produto: Produto) => {
    const novoItem: ItemVenda = {
      produto_id: produto.id,
      produto: produto,
      descricao: produto.nome,
      quantidade: itemForm.quantidade || 1,
      valor_unitario: produto.valor_venda || 0,
      valor_desconto: 0,
      valor_total: (itemForm.quantidade || 1) * (produto.valor_venda || 0),
      custo_unitario: produto.custo_medio || produto.valor_custo || 0
    }

    setForm(prev => ({
      ...prev,
      itens: [...prev.itens, novoItem]
    }))

    setProdutoSearch('')
    setShowProdutoDropdown(false)
    setItemForm({ produto_id: 0, quantidade: 1, valor_unitario: 0, valor_desconto: 0 })
  }

  // Remover item
  const removeItem = (index: number) => {
    setForm(prev => ({
      ...prev,
      itens: prev.itens.filter((_, i) => i !== index)
    }))
  }

  // Atualizar item
  const updateItem = (index: number, field: keyof ItemVenda, value: number) => {
    setForm(prev => {
      const itens = [...prev.itens]
      itens[index] = {
        ...itens[index],
        [field]: value,
        valor_total: field === 'quantidade' 
          ? value * itens[index].valor_unitario - itens[index].valor_desconto
          : field === 'valor_unitario'
          ? itens[index].quantidade * value - itens[index].valor_desconto
          : field === 'valor_desconto'
          ? itens[index].quantidade * itens[index].valor_unitario - value
          : itens[index].valor_total
      }
      return { ...prev, itens }
    })
  }

  // Calcular totais
  const calcularTotais = () => {
    const subtotal = form.itens.reduce((acc, item) => acc + item.valor_total, 0)
    const custoTotal = form.itens.reduce((acc, item) => acc + (item.custo_unitario * item.quantidade), 0)
    const total = subtotal - form.valor_desconto + form.valor_frete
    const lucro = total - custoTotal
    const margem = total > 0 ? (lucro / total) * 100 : 0

    return { subtotal, custoTotal, total, lucro, margem }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (form.itens.length === 0) {
      alert('Adicione pelo menos um produto à venda')
      return
    }

    setSaving(true)
    try {
      const totais = calcularTotais()
      
      const vendaData = {
        cliente_id: form.cliente_id,
        data_venda: form.data_venda,
        valor_produtos: totais.subtotal,
        valor_desconto: form.valor_desconto,
        valor_frete: form.valor_frete,
        valor_total: totais.total,
        custo_total: totais.custoTotal,
        lucro_bruto: totais.lucro,
        margem_lucro: totais.margem,
        observacoes: form.observacoes,
        status: 'concluida'
      }

      let vendaId: number

      if (selectedVenda) {
        await updateVenda(selectedVenda.id, vendaData)
        vendaId = selectedVenda.id
      } else {
        const novaVenda = await createVenda(vendaData, form.itens.map(item => ({
          produto_id: item.produto_id,
          tipo: 'produto' as const,
          descricao: item.descricao,
          quantidade: item.quantidade,
          valor_unitario: item.valor_unitario,
          valor_desconto: item.valor_desconto,
          valor_total: item.valor_total,
          custo_unitario: item.custo_unitario
        })))
        vendaId = novaVenda.id

        // Se for à vista, criar lançamento financeiro
        if (form.condicao_pagamento === 'vista') {
          await createLancamentoFinanceiro({
            tipo: 'receita',
            valor: totais.total,
            data_lancamento: form.data_venda,
            descricao: `Venda #${vendaId}`,
            cliente_id: form.cliente_id || undefined,
            venda_id: vendaId,
            forma_pagamento: form.forma_pagamento as any,
            conciliado: false
          })
        } else if (form.condicao_pagamento === 'prazo' || form.condicao_pagamento === 'parcelado') {
          // Criar contas a receber
          const numParcelas = form.condicao_pagamento === 'parcelado' ? form.parcelas : 1
          const valorParcela = totais.total / numParcelas

          for (let i = 0; i < numParcelas; i++) {
            const dataVencimento = new Date(form.data_venda)
            dataVencimento.setMonth(dataVencimento.getMonth() + i + 1)

            await createContaReceber({
              cliente_id: form.cliente_id || undefined,
              descricao: `Venda #${vendaId} - Parcela ${i + 1}/${numParcelas}`,
              valor: valorParcela,
              data_vencimento: dataVencimento.toISOString().split('T')[0],
              venda_id: vendaId,
              status: 'pendente'
            })
          }
        }
      }

      await loadData()
      setIsModalOpen(false)
      resetForm()
    } catch (error) {
      console.error('Erro ao salvar venda:', error)
      alert('Erro ao salvar venda')
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (id: number) => {
    if (!confirm('Tem certeza que deseja excluir esta venda?')) return

    try {
      await deleteVenda(id)
      await loadData()
    } catch (error) {
      console.error('Erro ao excluir:', error)
    }
  }

  // Gerar Nota Fiscal via Focus NFe
  const handleGerarNota = async (venda: Venda) => {
    if (venda.nota_fiscal_emitida) {
      alert('Esta venda já possui nota fiscal emitida!')
      return
    }

    // Verificar configuração da API
    const configCheck = verificarConfiguracao()
    if (!configCheck.ok) {
      alert(`Erro de configuração: ${configCheck.mensagem}. Configure em Configurações > Fiscal.`)
      return
    }

    if (!confirm('Deseja gerar a Nota Fiscal para esta venda?\n\nAmbiente: ' + getConfig().ambiente.toUpperCase())) return

    setGeneratingNF(true)
    try {
      // Buscar configurações fiscais do banco
      const { data: configFiscal, error: configError } = await supabase
        .from('config_fiscal')
        .select('*')
        .eq('ativo', true)
        .single()

      if (configError || !configFiscal) {
        throw new Error('Configuração fiscal não encontrada. Acesse Configurações > Fiscal para configurar.')
      }

      // Dados do cliente
      const cliente = venda.cliente
      const itensVenda = venda.itens || []

      if (itensVenda.length === 0) {
        throw new Error('Venda sem itens não pode gerar nota fiscal')
      }

      // Gerar referência única
      const referencia = gerarReferenciaNFe()
      
      // Montar itens da NFe
      const itensNFe: NFeItem[] = itensVenda.map((item: any, index: number) => ({
        numero_item: index + 1,
        codigo_produto: item.produto_id?.toString() || (index + 1).toString(),
        descricao: getConfig().ambiente === 'homologacao' 
          ? 'NOTA FISCAL EMITIDA EM AMBIENTE DE HOMOLOGACAO - SEM VALOR FISCAL'
          : item.descricao || 'Produto',
        ncm: item.produto?.ncm || '00000000', // NCM do produto ou genérico
        cfop: configFiscal.cfop_padrao || '5102',
        unidade_comercial: item.produto?.unidade || 'UN',
        quantidade_comercial: item.quantidade,
        valor_unitario_comercial: item.valor_unitario,
        valor_bruto: item.valor_total,
        unidade_tributavel: item.produto?.unidade || 'UN',
        quantidade_tributavel: item.quantidade,
        valor_unitario_tributavel: item.valor_unitario,
        icms_origem: 0, // Nacional
        icms_situacao_tributaria: configFiscal.regime_tributario === 1 ? '102' : '00', // Simples Nacional ou Tributada
        pis_situacao_tributaria: '07', // Operação Isenta
        cofins_situacao_tributaria: '07' // Operação Isenta
      }))

      // Montar forma de pagamento
      const formasPgto: NFeFormaPagamento[] = [{
        forma_pagamento: '01', // Dinheiro por padrão
        valor_pagamento: venda.valor_total || 0
      }]

      // Montar dados da NFe
      const dadosNFe: NFeDados = {
        // Dados gerais
        natureza_operacao: configFiscal.natureza_operacao_padrao || 'Venda',
        data_emissao: new Date().toISOString(),
        tipo_documento: 1, // Saída
        local_destino: 1, // Operação interna
        finalidade_emissao: 1, // Normal
        consumidor_final: 1, // Consumidor final
        presenca_comprador: 1, // Presencial
        
        // Emitente
        cnpj_emitente: configFiscal.cnpj,
        inscricao_estadual_emitente: configFiscal.inscricao_estadual || '',
        nome_emitente: configFiscal.razao_social,
        nome_fantasia_emitente: configFiscal.nome_fantasia || configFiscal.razao_social,
        logradouro_emitente: configFiscal.logradouro,
        numero_emitente: configFiscal.numero,
        complemento_emitente: configFiscal.complemento || '',
        bairro_emitente: configFiscal.bairro,
        municipio_emitente: configFiscal.municipio,
        uf_emitente: configFiscal.uf,
        cep_emitente: configFiscal.cep,
        telefone_emitente: configFiscal.telefone || '',
        regime_tributario_emitente: configFiscal.regime_tributario as 1 | 2 | 3,
        
        // Destinatário
        nome_destinatario: getConfig().ambiente === 'homologacao'
          ? 'NF-E EMITIDA EM AMBIENTE DE HOMOLOGACAO - SEM VALOR FISCAL'
          : (cliente?.nome || cliente?.razao_social || 'Consumidor Final'),
        cpf_destinatario: cliente?.cpf?.replace(/\D/g, '') || undefined,
        cnpj_destinatario: cliente?.cnpj?.replace(/\D/g, '') || undefined,
        logradouro_destinatario: cliente?.endereco || '',
        numero_destinatario: cliente?.numero || 'S/N',
        bairro_destinatario: cliente?.bairro || '',
        municipio_destinatario: cliente?.cidade || configFiscal.municipio,
        uf_destinatario: cliente?.estado || configFiscal.uf,
        cep_destinatario: cliente?.cep?.replace(/\D/g, '') || '',
        indicador_inscricao_estadual_destinatario: 9, // Não contribuinte
        
        // Totais
        valor_total: venda.valor_total || 0,
        valor_produtos: venda.valor_produtos || venda.valor_total || 0,
        valor_desconto: venda.valor_desconto || 0,
        valor_frete: venda.valor_frete || 0,
        
        // Frete
        modalidade_frete: 9, // Sem frete
        
        // Itens
        items: itensNFe,
        
        // Pagamento
        formas_pagamento: formasPgto,
        
        // Informações adicionais
        informacoes_adicionais_contribuinte: configFiscal.informacoes_complementares || ''
      }

      console.log('Enviando NFe para Focus NFe:', { referencia, ambiente: getConfig().ambiente })

      // Emitir NFe
      const resultadoEmissao = await emitirNFe(referencia, dadosNFe)
      console.log('Resultado emissão:', resultadoEmissao)

      // Se está processando, aguardar autorização
      let resultadoFinal = resultadoEmissao
      if (resultadoEmissao.status === 'processando_autorizacao') {
        console.log('Aguardando autorização...')
        resultadoFinal = await aguardarAutorizacaoNFe(referencia)
        console.log('Resultado final:', resultadoFinal)
      }

      // Verificar resultado
      if (resultadoFinal.status === 'autorizado') {
        // Sucesso! Atualizar venda com dados da NF
        await updateVenda(venda.id, {
          nota_fiscal_emitida: true,
          numero_nf: resultadoFinal.numero || '',
          chave_nf: resultadoFinal.chave_nfe || ''
        })

        // Salvar na tabela de notas fiscais
        await supabase.from('notas_fiscais').insert([{
          referencia: referencia,
          venda_id: venda.id,
          tipo: 'nfe',
          numero: resultadoFinal.numero,
          serie: resultadoFinal.serie,
          chave_acesso: resultadoFinal.chave_nfe,
          status: 'autorizada',
          status_sefaz: resultadoFinal.status_sefaz,
          mensagem_sefaz: resultadoFinal.mensagem_sefaz,
          destinatario_nome: cliente?.nome || cliente?.razao_social || 'Consumidor Final',
          destinatario_documento: cliente?.cpf || cliente?.cnpj || '',
          valor_total: venda.valor_total,
          valor_produtos: venda.valor_produtos,
          url_xml: resultadoFinal.caminho_xml_nota_fiscal,
          url_danfe: resultadoFinal.caminho_danfe,
          dados_envio: dadosNFe,
          dados_retorno: resultadoFinal,
          emitida_em: new Date().toISOString()
        }])

        await loadData()
        
        // Atualizar selectedVenda
        setSelectedVenda(prev => prev ? {
          ...prev,
          nota_fiscal_emitida: true,
          numero_nf: resultadoFinal.numero || '',
          chave_nf: resultadoFinal.chave_nfe || ''
        } : null)

        alert(`✅ Nota Fiscal autorizada com sucesso!\n\nNúmero: ${resultadoFinal.numero}\nChave: ${resultadoFinal.chave_nfe}`)
      } else if (resultadoFinal.status === 'erro_autorizacao') {
        const erros = resultadoFinal.erros?.map(e => `${e.codigo}: ${e.mensagem}`).join('\n') || resultadoFinal.mensagem_sefaz
        throw new Error(`Erro na autorização:\n${erros}`)
      } else {
        throw new Error(`Status inesperado: ${resultadoFinal.status}\n${resultadoFinal.mensagem_sefaz || ''}`)
      }

    } catch (error: any) {
      console.error('Erro ao gerar nota fiscal:', error)
      alert(`❌ Erro ao gerar nota fiscal:\n\n${error.message || error}`)
    } finally {
      setGeneratingNF(false)
    }
  }

  // Imprimir Venda/Cupom
  const handleImprimir = (venda: Venda) => {
    setSelectedVenda(venda)
    setIsPrintModalOpen(true)
  }

  // Gerar conteúdo para impressão
  const gerarConteudoImpressao = (venda: Venda, tipo: 'cupom' | 'venda' | 'nf') => {
    const cliente = venda.cliente
    const itens = venda.itens || []
    const dataFormatada = formatDate(venda.data_venda)
    
    let html = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <title>${tipo === 'cupom' ? 'Cupom' : tipo === 'nf' ? 'Nota Fiscal' : 'Venda'} #${venda.numero || venda.id}</title>
        <style>
          * { margin: 0; padding: 0; box-sizing: border-box; }
          body { 
            font-family: ${tipo === 'cupom' ? "'Courier New', monospace" : "Arial, sans-serif"};
            font-size: ${tipo === 'cupom' ? '12px' : '14px'};
            line-height: 1.4;
            padding: ${tipo === 'cupom' ? '10px' : '40px'};
            max-width: ${tipo === 'cupom' ? '300px' : '800px'};
            margin: 0 auto;
          }
          .header { text-align: center; margin-bottom: 20px; border-bottom: ${tipo === 'cupom' ? '1px dashed #000' : '2px solid #333'}; padding-bottom: 15px; }
          .header h1 { font-size: ${tipo === 'cupom' ? '16px' : '24px'}; margin-bottom: 5px; }
          .header p { font-size: ${tipo === 'cupom' ? '10px' : '12px'}; color: #666; }
          .info { margin-bottom: 15px; }
          .info-row { display: flex; justify-content: space-between; margin-bottom: 5px; }
          .info-label { font-weight: bold; color: #333; }
          table { width: 100%; border-collapse: collapse; margin: 15px 0; }
          th, td { padding: ${tipo === 'cupom' ? '3px 0' : '8px'}; text-align: left; border-bottom: 1px solid #ddd; }
          th { font-weight: bold; background: #f5f5f5; }
          .text-right { text-align: right; }
          .totais { margin-top: 15px; border-top: ${tipo === 'cupom' ? '1px dashed #000' : '2px solid #333'}; padding-top: 10px; }
          .total-row { display: flex; justify-content: space-between; margin-bottom: 5px; }
          .total-final { font-size: ${tipo === 'cupom' ? '14px' : '18px'}; font-weight: bold; margin-top: 10px; }
          .footer { margin-top: 30px; text-align: center; font-size: 10px; color: #999; border-top: 1px solid #eee; padding-top: 15px; }
          .nf-info { background: #f9f9f9; padding: 15px; margin: 15px 0; border-radius: 4px; }
          .chave { font-family: monospace; font-size: 10px; word-break: break-all; }
          @media print { body { padding: 10px; } }
        </style>
      </head>
      <body>
        <div class="header">
          <h1>${tipo === 'cupom' ? 'CUPOM NÃO FISCAL' : tipo === 'nf' ? 'DANFE SIMPLIFICADO' : 'COMPROVANTE DE VENDA'}</h1>
          <p>Sistema de Gestão Empresarial</p>
          ${tipo === 'nf' && venda.numero_nf ? `<p style="margin-top:10px"><strong>NF-e Nº: ${venda.numero_nf}</strong></p>` : ''}
        </div>
        
        <div class="info">
          <div class="info-row">
            <span class="info-label">Venda:</span>
            <span>#${venda.numero || venda.id}</span>
          </div>
          <div class="info-row">
            <span class="info-label">Data:</span>
            <span>${dataFormatada}</span>
          </div>
          <div class="info-row">
            <span class="info-label">Cliente:</span>
            <span>${cliente?.nome || cliente?.razao_social || 'Consumidor Final'}</span>
          </div>
          ${(cliente?.cpf || cliente?.cnpj) ? `
          <div class="info-row">
            <span class="info-label">CPF/CNPJ:</span>
            <span>${cliente?.cpf || cliente?.cnpj}</span>
          </div>` : ''}
        </div>

        ${tipo === 'nf' && venda.chave_nf ? `
        <div class="nf-info">
          <strong>Chave de Acesso:</strong>
          <p class="chave">${venda.chave_nf}</p>
        </div>` : ''}

        <table>
          <thead>
            <tr>
              <th>Produto</th>
              <th class="text-right">Qtd</th>
              <th class="text-right">Unit.</th>
              <th class="text-right">Total</th>
            </tr>
          </thead>
          <tbody>
            ${itens.map(item => `
              <tr>
                <td>${item.descricao || 'Produto'}</td>
                <td class="text-right">${item.quantidade}</td>
                <td class="text-right">${formatCurrency(item.valor_unitario)}</td>
                <td class="text-right">${formatCurrency(item.valor_total)}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>

        <div class="totais">
          <div class="total-row">
            <span>Subtotal:</span>
            <span>${formatCurrency(venda.valor_produtos || 0)}</span>
          </div>
          ${(venda.valor_desconto || 0) > 0 ? `
          <div class="total-row">
            <span>Desconto:</span>
            <span>-${formatCurrency(venda.valor_desconto || 0)}</span>
          </div>` : ''}
          ${(venda.valor_frete || 0) > 0 ? `
          <div class="total-row">
            <span>Frete:</span>
            <span>${formatCurrency(venda.valor_frete || 0)}</span>
          </div>` : ''}
          ${tipo === 'nf' && (venda.valor_impostos || 0) > 0 ? `
          <div class="total-row">
            <span>Impostos:</span>
            <span>${formatCurrency(venda.valor_impostos || 0)}</span>
          </div>` : ''}
          <div class="total-row total-final">
            <span>TOTAL:</span>
            <span>${formatCurrency(venda.valor_total || 0)}</span>
          </div>
        </div>

        <div class="footer">
          <p>Documento gerado em ${new Date().toLocaleString('pt-BR')}</p>
          ${tipo === 'cupom' ? '<p>DOCUMENTO SEM VALOR FISCAL</p>' : ''}
          ${tipo === 'nf' ? '<p>Consulte a autenticidade no portal da NF-e</p>' : ''}
        </div>
      </body>
      </html>
    `

    return html
  }

  // Executar impressão
  const executarImpressao = (tipo: 'cupom' | 'venda' | 'nf') => {
    if (!selectedVenda) return

    if (tipo === 'nf' && !selectedVenda.nota_fiscal_emitida) {
      alert('Esta venda ainda não possui nota fiscal. Gere a NF primeiro.')
      return
    }

    const conteudo = gerarConteudoImpressao(selectedVenda, tipo)
    const janela = window.open('', '_blank', 'width=800,height=600')
    
    if (janela) {
      janela.document.write(conteudo)
      janela.document.close()
      janela.focus()
      
      // Aguardar carregamento e imprimir
      setTimeout(() => {
        janela.print()
      }, 500)
    }

    setIsPrintModalOpen(false)
  }

  // Filtros
  const filteredVendas = vendas.filter(v => {
    const matchSearch = 
      v.numero?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      v.cliente?.nome?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      v.cliente?.razao_social?.toLowerCase().includes(searchTerm.toLowerCase())
    
    const matchStatus = filterStatus === 'todos' || v.status === filterStatus

    return matchSearch && matchStatus
  })

  const filteredProdutos = produtos.filter(p => 
    p.nome.toLowerCase().includes(produtoSearch.toLowerCase()) ||
    p.codigo?.toLowerCase().includes(produtoSearch.toLowerCase())
  )

  const totais = calcularTotais()

  // KPIs
  const totalVendas = vendas.reduce((acc, v) => acc + (v.valor_total || 0), 0)
  const totalLucro = vendas.reduce((acc, v) => acc + (v.lucro_bruto || 0), 0)
  const ticketMedio = vendas.length > 0 ? totalVendas / vendas.length : 0

  if (loading) {
    return (
      <div className="flex items-center justify-center h-[60vh]">
        <LoadingSpinner size="lg" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div>
          <h1 className="text-2xl lg:text-3xl font-bold font-heading text-white">
            Vendas
          </h1>
          <p className="text-dark-400 mt-1">
            Gerencie suas vendas e pedidos
          </p>
        </div>
        <Button onClick={openNewVenda} leftIcon={<Plus className="w-4 h-4" />}>
          Nova Venda
        </Button>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="glass-card p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-primary-500/20">
              <ShoppingCart className="w-5 h-5 text-primary-400" />
            </div>
            <div>
              <p className="text-dark-400 text-sm">Total de Vendas</p>
              <p className="text-xl font-bold text-white">{vendas.length}</p>
            </div>
          </div>
        </div>
        <div className="glass-card p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-green-500/20">
              <Receipt className="w-5 h-5 text-green-400" />
            </div>
            <div>
              <p className="text-dark-400 text-sm">Faturamento</p>
              <p className="text-xl font-bold text-green-400">{formatCurrency(totalVendas)}</p>
            </div>
          </div>
        </div>
        <div className="glass-card p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-blue-500/20">
              <TrendingUp className="w-5 h-5 text-blue-400" />
            </div>
            <div>
              <p className="text-dark-400 text-sm">Lucro Total</p>
              <p className="text-xl font-bold text-blue-400">{formatCurrency(totalLucro)}</p>
            </div>
          </div>
        </div>
        <div className="glass-card p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-purple-500/20">
              <Calculator className="w-5 h-5 text-purple-400" />
            </div>
            <div>
              <p className="text-dark-400 text-sm">Ticket Médio</p>
              <p className="text-xl font-bold text-purple-400">{formatCurrency(ticketMedio)}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Filtros */}
      <div className="glass-card p-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="relative md:col-span-2">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-dark-400" />
            <input
              type="text"
              placeholder="Buscar por número ou cliente..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="input pl-12 w-full"
            />
          </div>
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="input"
          >
            <option value="todos">Todos os status</option>
            <option value="concluida">Concluída</option>
            <option value="pendente">Pendente</option>
            <option value="cancelada">Cancelada</option>
          </select>
        </div>
      </div>

      {/* Lista de Vendas */}
      <div className="glass-card overflow-hidden">
        {filteredVendas.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Número</th>
                  <th>Data</th>
                  <th>Cliente</th>
                  <th className="text-right">Valor</th>
                  <th className="text-right">Lucro</th>
                  <th>Status</th>
                  <th>NF</th>
                  <th className="text-right">Ações</th>
                </tr>
              </thead>
              <tbody>
                {filteredVendas.map((venda) => (
                  <tr key={venda.id} className="group">
                    <td className="font-medium text-white">
                      #{venda.numero || venda.id}
                    </td>
                    <td className="text-dark-300">
                      {formatDate(venda.data_venda)}
                    </td>
                    <td className="text-dark-300">
                      {venda.cliente?.nome || venda.cliente?.razao_social || 'Cliente não informado'}
                    </td>
                    <td className="text-right font-medium text-white">
                      {formatCurrency(venda.valor_total || 0)}
                    </td>
                    <td className="text-right">
                      <span className={cn(
                        'font-medium',
                        (venda.lucro_bruto || 0) >= 0 ? 'text-green-400' : 'text-red-400'
                      )}>
                        {formatCurrency(venda.lucro_bruto || 0)}
                      </span>
                    </td>
                    <td>
                      <Badge variant={
                        venda.status === 'concluida' ? 'success' :
                        venda.status === 'pendente' ? 'warning' : 'danger'
                      }>
                        {venda.status === 'concluida' ? 'Concluída' :
                         venda.status === 'pendente' ? 'Pendente' : 'Cancelada'}
                      </Badge>
                    </td>
                    <td>
                      {venda.nota_fiscal_emitida ? (
                        <Badge variant="success">Emitida</Badge>
                      ) : (
                        <button
                          onClick={() => handleGerarNota(venda)}
                          className="text-xs px-2 py-1 bg-primary-500/20 text-primary-400 rounded hover:bg-primary-500/30 transition-colors"
                          title="Gerar Nota Fiscal"
                        >
                          Gerar NF
                        </button>
                      )}
                    </td>
                    <td>
                      <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button
                          onClick={() => handleImprimir(venda)}
                          className="p-2 hover:bg-dark-600 rounded-lg transition-colors"
                          title="Imprimir"
                        >
                          <Printer className="w-4 h-4 text-dark-400" />
                        </button>
                        <button
                          onClick={() => openViewVenda(venda)}
                          className="p-2 hover:bg-dark-600 rounded-lg transition-colors"
                          title="Visualizar"
                        >
                          <Eye className="w-4 h-4 text-dark-400" />
                        </button>
                        <button
                          onClick={() => openEditVenda(venda)}
                          className="p-2 hover:bg-dark-600 rounded-lg transition-colors"
                          title="Editar"
                        >
                          <Edit2 className="w-4 h-4 text-dark-400" />
                        </button>
                        <button
                          onClick={() => handleDelete(venda.id)}
                          className="p-2 hover:bg-red-500/20 rounded-lg transition-colors"
                          title="Excluir"
                        >
                          <Trash2 className="w-4 h-4 text-red-400" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <EmptyState
            icon={<ShoppingCart className="w-10 h-10 text-dark-500" />}
            title="Nenhuma venda encontrada"
            description="Comece criando sua primeira venda"
            action={
              <Button onClick={openNewVenda} leftIcon={<Plus className="w-4 h-4" />}>
                Nova Venda
              </Button>
            }
          />
        )}
      </div>

      {/* Modal Nova/Editar Venda */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={selectedVenda ? 'Editar Venda' : 'Nova Venda'}
        size="xl"
      >
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Dados da Venda */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-dark-300 mb-2">
                Cliente
              </label>
              <select
                value={form.cliente_id || ''}
                onChange={(e) => setForm(prev => ({ ...prev, cliente_id: e.target.value ? Number(e.target.value) : null }))}
                className="input w-full"
              >
                <option value="">Selecione um cliente</option>
                {clientes.map(cliente => (
                  <option key={cliente.id} value={cliente.id}>
                    {cliente.nome || cliente.razao_social} {cliente.cpf || cliente.cnpj ? `- ${cliente.cpf || cliente.cnpj}` : ''}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-dark-300 mb-2">
                Data da Venda
              </label>
              <input
                type="date"
                value={form.data_venda}
                onChange={(e) => setForm(prev => ({ ...prev, data_venda: e.target.value }))}
                className="input w-full"
                required
              />
            </div>
          </div>

          {/* Adicionar Produto */}
          <div className="glass-card p-4 bg-dark-700/50">
            <h3 className="text-white font-medium mb-4 flex items-center gap-2">
              <Package className="w-5 h-5" />
              Adicionar Produto
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="md:col-span-3 relative">
                <input
                  type="text"
                  placeholder="Buscar produto por nome ou código..."
                  value={produtoSearch}
                  onChange={(e) => {
                    setProdutoSearch(e.target.value)
                    setShowProdutoDropdown(true)
                  }}
                  onFocus={() => setShowProdutoDropdown(true)}
                  className="input w-full"
                />
                {showProdutoDropdown && produtoSearch && (
                  <div className="absolute top-full left-0 right-0 mt-1 bg-dark-700 border border-dark-600 rounded-lg shadow-lg max-h-60 overflow-y-auto z-50">
                    {filteredProdutos.length > 0 ? (
                      filteredProdutos.slice(0, 10).map(produto => (
                        <button
                          key={produto.id}
                          type="button"
                          onClick={() => addProduto(produto)}
                          className="w-full px-4 py-3 text-left hover:bg-dark-600 flex justify-between items-center"
                        >
                          <div>
                            <span className="text-white font-medium">{produto.nome}</span>
                            {produto.codigo && (
                              <span className="text-dark-400 text-sm ml-2">({produto.codigo})</span>
                            )}
                          </div>
                          <div className="text-right">
                            <span className="text-green-400 font-medium">
                              {formatCurrency(produto.valor_venda || 0)}
                            </span>
                            <span className="text-dark-400 text-sm block">
                              Estoque: {produto.quantidade_estoque}
                            </span>
                          </div>
                        </button>
                      ))
                    ) : (
                      <div className="px-4 py-3 text-dark-400">
                        Nenhum produto encontrado
                      </div>
                    )}
                  </div>
                )}
              </div>
              <div>
                <input
                  type="number"
                  placeholder="Qtd"
                  value={itemForm.quantidade}
                  onChange={(e) => setItemForm(prev => ({ ...prev, quantidade: Number(e.target.value) }))}
                  min="1"
                  className="input w-full"
                />
              </div>
            </div>
          </div>

          {/* Lista de Itens */}
          {form.itens.length > 0 && (
            <div className="overflow-x-auto">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Produto</th>
                    <th className="text-right">Qtd</th>
                    <th className="text-right">Valor Unit.</th>
                    <th className="text-right">Desconto</th>
                    <th className="text-right">Total</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {form.itens.map((item, index) => (
                    <tr key={index}>
                      <td className="font-medium text-white">{item.descricao}</td>
                      <td className="text-right">
                        <input
                          type="number"
                          value={item.quantidade}
                          onChange={(e) => updateItem(index, 'quantidade', Number(e.target.value))}
                          min="1"
                          className="input w-20 text-right"
                        />
                      </td>
                      <td className="text-right">
                        <input
                          type="number"
                          value={item.valor_unitario}
                          onChange={(e) => updateItem(index, 'valor_unitario', Number(e.target.value))}
                          min="0"
                          step="0.01"
                          className="input w-28 text-right"
                        />
                      </td>
                      <td className="text-right">
                        <input
                          type="number"
                          value={item.valor_desconto}
                          onChange={(e) => updateItem(index, 'valor_desconto', Number(e.target.value))}
                          min="0"
                          step="0.01"
                          className="input w-24 text-right"
                        />
                      </td>
                      <td className="text-right font-medium text-green-400">
                        {formatCurrency(item.valor_total)}
                      </td>
                      <td>
                        <button
                          type="button"
                          onClick={() => removeItem(index)}
                          className="p-2 hover:bg-red-500/20 rounded-lg"
                        >
                          <Trash2 className="w-4 h-4 text-red-400" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Condições de Pagamento */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <label className="block text-sm font-medium text-dark-300 mb-2">
                Forma de Pagamento
              </label>
              <select
                value={form.forma_pagamento}
                onChange={(e) => setForm(prev => ({ ...prev, forma_pagamento: e.target.value }))}
                className="input w-full"
              >
                {formasPagamento.map(fp => (
                  <option key={fp.value} value={fp.value}>{fp.label}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-dark-300 mb-2">
                Condição
              </label>
              <select
                value={form.condicao_pagamento}
                onChange={(e) => setForm(prev => ({ ...prev, condicao_pagamento: e.target.value }))}
                className="input w-full"
              >
                {condicoesPagamento.map(cp => (
                  <option key={cp.value} value={cp.value}>{cp.label}</option>
                ))}
              </select>
            </div>
            {form.condicao_pagamento === 'parcelado' && (
              <div>
                <label className="block text-sm font-medium text-dark-300 mb-2">
                  Parcelas
                </label>
                <select
                  value={form.parcelas}
                  onChange={(e) => setForm(prev => ({ ...prev, parcelas: Number(e.target.value) }))}
                  className="input w-full"
                >
                  {[2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map(n => (
                    <option key={n} value={n}>{n}x</option>
                  ))}
                </select>
              </div>
            )}
            <div>
              <label className="block text-sm font-medium text-dark-300 mb-2">
                Frete
              </label>
              <input
                type="number"
                value={form.valor_frete}
                onChange={(e) => setForm(prev => ({ ...prev, valor_frete: Number(e.target.value) }))}
                min="0"
                step="0.01"
                className="input w-full"
              />
            </div>
          </div>

          {/* Resumo */}
          <div className="glass-card p-4 bg-dark-700/50">
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4 text-center">
              <div>
                <p className="text-dark-400 text-sm">Subtotal</p>
                <p className="text-xl font-bold text-white">{formatCurrency(totais.subtotal)}</p>
              </div>
              <div>
                <p className="text-dark-400 text-sm">Desconto</p>
                <input
                  type="number"
                  value={form.valor_desconto}
                  onChange={(e) => setForm(prev => ({ ...prev, valor_desconto: Number(e.target.value) }))}
                  min="0"
                  step="0.01"
                  className="input text-center mt-1"
                />
              </div>
              <div>
                <p className="text-dark-400 text-sm">Frete</p>
                <p className="text-xl font-bold text-white">{formatCurrency(form.valor_frete)}</p>
              </div>
              <div>
                <p className="text-dark-400 text-sm">Total</p>
                <p className="text-2xl font-bold text-green-400">{formatCurrency(totais.total)}</p>
              </div>
              <div>
                <p className="text-dark-400 text-sm">Lucro ({totais.margem.toFixed(1)}%)</p>
                <p className={cn(
                  'text-xl font-bold',
                  totais.lucro >= 0 ? 'text-blue-400' : 'text-red-400'
                )}>
                  {formatCurrency(totais.lucro)}
                </p>
              </div>
            </div>
          </div>

          {/* Observações */}
          <div>
            <label className="block text-sm font-medium text-dark-300 mb-2">
              Observações
            </label>
            <textarea
              value={form.observacoes}
              onChange={(e) => setForm(prev => ({ ...prev, observacoes: e.target.value }))}
              rows={3}
              className="input w-full"
            />
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-dark-600">
            <Button type="button" variant="secondary" onClick={() => setIsModalOpen(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={saving || form.itens.length === 0}>
              {saving ? <LoadingSpinner size="sm" /> : (selectedVenda ? 'Salvar' : 'Finalizar Venda')}
            </Button>
          </div>
        </form>
      </Modal>

      {/* Modal Visualizar Venda */}
      <Modal
        isOpen={isViewModalOpen}
        onClose={() => setIsViewModalOpen(false)}
        title={`Venda #${selectedVenda?.numero || selectedVenda?.id}`}
        size="lg"
      >
        {selectedVenda && (
          <div className="space-y-6">
            {/* Status da NF */}
            {selectedVenda.nota_fiscal_emitida && (
              <div className="p-4 bg-green-500/10 border border-green-500/30 rounded-lg">
                <div className="flex items-center gap-3">
                  <Check className="w-5 h-5 text-green-400" />
                  <div>
                    <p className="text-green-400 font-medium">Nota Fiscal Emitida</p>
                    <p className="text-dark-400 text-sm">NF-e Nº: {selectedVenda.numero_nf}</p>
                    {selectedVenda.chave_nf && (
                      <p className="text-dark-500 text-xs mt-1 font-mono break-all">
                        Chave: {selectedVenda.chave_nf}
                      </p>
                    )}
                  </div>
                </div>
              </div>
            )}

            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-dark-400 text-sm">Cliente</p>
                <p className="text-white font-medium">
                  {selectedVenda.cliente?.nome || selectedVenda.cliente?.razao_social || 'Não informado'}
                </p>
              </div>
              <div>
                <p className="text-dark-400 text-sm">Data</p>
                <p className="text-white font-medium">{formatDate(selectedVenda.data_venda)}</p>
              </div>
            </div>

            <div>
              <h4 className="text-white font-medium mb-3">Itens</h4>
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Produto</th>
                    <th className="text-right">Qtd</th>
                    <th className="text-right">Valor</th>
                    <th className="text-right">Total</th>
                  </tr>
                </thead>
                <tbody>
                  {(selectedVenda.itens || []).map((item: any) => (
                    <tr key={item.id}>
                      <td className="text-white">{item.descricao}</td>
                      <td className="text-right text-dark-300">{item.quantidade}</td>
                      <td className="text-right text-dark-300">{formatCurrency(item.valor_unitario)}</td>
                      <td className="text-right text-green-400">{formatCurrency(item.valor_total)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="grid grid-cols-3 gap-4 pt-4 border-t border-dark-600">
              <div className="text-center">
                <p className="text-dark-400 text-sm">Total</p>
                <p className="text-2xl font-bold text-green-400">
                  {formatCurrency(selectedVenda.valor_total || 0)}
                </p>
              </div>
              <div className="text-center">
                <p className="text-dark-400 text-sm">Custo</p>
                <p className="text-xl font-bold text-white">
                  {formatCurrency(selectedVenda.custo_total || 0)}
                </p>
              </div>
              <div className="text-center">
                <p className="text-dark-400 text-sm">Lucro</p>
                <p className={cn(
                  'text-xl font-bold',
                  (selectedVenda.lucro_bruto || 0) >= 0 ? 'text-blue-400' : 'text-red-400'
                )}>
                  {formatCurrency(selectedVenda.lucro_bruto || 0)}
                </p>
              </div>
            </div>

            {selectedVenda.nota_fiscal_emitida && selectedVenda.valor_impostos && (
              <div className="text-center text-dark-400 text-sm">
                Impostos aproximados: {formatCurrency(selectedVenda.valor_impostos)}
              </div>
            )}

            <div className="flex flex-wrap justify-end gap-3">
              <Button 
                variant="secondary" 
                leftIcon={<Printer className="w-4 h-4" />}
                onClick={() => handleImprimir(selectedVenda)}
              >
                Imprimir
              </Button>
              {selectedVenda.nota_fiscal_emitida ? (
                <Button 
                  variant="secondary" 
                  leftIcon={<Download className="w-4 h-4" />}
                  onClick={() => executarImpressao('nf')}
                >
                  Imprimir DANFE
                </Button>
              ) : (
                <Button 
                  leftIcon={<FileText className="w-4 h-4" />}
                  onClick={() => handleGerarNota(selectedVenda)}
                  disabled={generatingNF}
                >
                  {generatingNF ? <LoadingSpinner size="sm" /> : 'Gerar NF'}
                </Button>
              )}
            </div>
          </div>
        )}
      </Modal>

      {/* Modal Opções de Impressão */}
      <Modal
        isOpen={isPrintModalOpen}
        onClose={() => setIsPrintModalOpen(false)}
        title="Opções de Impressão"
        size="sm"
      >
        <div className="space-y-4">
          <p className="text-dark-400">Selecione o tipo de documento para imprimir:</p>
          
          <div className="grid gap-3">
            <button
              onClick={() => executarImpressao('cupom')}
              className="flex items-center gap-4 p-4 bg-dark-700 hover:bg-dark-600 rounded-lg transition-colors text-left"
            >
              <div className="p-3 bg-purple-500/20 rounded-lg">
                <Receipt className="w-6 h-6 text-purple-400" />
              </div>
              <div>
                <p className="text-white font-medium">Cupom Não Fiscal</p>
                <p className="text-dark-400 text-sm">Formato 80mm para impressora térmica</p>
              </div>
            </button>

            <button
              onClick={() => executarImpressao('venda')}
              className="flex items-center gap-4 p-4 bg-dark-700 hover:bg-dark-600 rounded-lg transition-colors text-left"
            >
              <div className="p-3 bg-blue-500/20 rounded-lg">
                <FileText className="w-6 h-6 text-blue-400" />
              </div>
              <div>
                <p className="text-white font-medium">Comprovante de Venda</p>
                <p className="text-dark-400 text-sm">Formato A4 completo</p>
              </div>
            </button>

            {selectedVenda?.nota_fiscal_emitida && (
              <button
                onClick={() => executarImpressao('nf')}
                className="flex items-center gap-4 p-4 bg-dark-700 hover:bg-dark-600 rounded-lg transition-colors text-left"
              >
                <div className="p-3 bg-green-500/20 rounded-lg">
                  <Download className="w-6 h-6 text-green-400" />
                </div>
                <div>
                  <p className="text-white font-medium">DANFE Simplificado</p>
                  <p className="text-dark-400 text-sm">Documento Auxiliar da NF-e</p>
                </div>
              </button>
            )}
          </div>

          <div className="flex justify-end pt-4 border-t border-dark-600">
            <Button variant="secondary" onClick={() => setIsPrintModalOpen(false)}>
              Cancelar
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  )
}
