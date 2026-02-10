'use client'

import { useEffect, useState, useRef } from 'react'
import { 
  Upload, FileText, Search, Package, Plus,
  Eye, DollarSign, Truck, Building2,
  ChevronDown, ChevronUp, Trash2, RefreshCw, CheckCircle, AlertTriangle
} from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Modal } from '@/components/ui/Modal'
import { LoadingSpinner, EmptyState, Badge } from '@/components/ui/Common'
import { FornecedorDetailModal, ProdutoDetailModal } from '@/components/ui/DetailModals'
import { 
  NotaFiscalEntrada, Produto, Fornecedor, CategoriaFinanceira, ItemNotaEntrada,
  fetchNotasFiscaisEntrada, createNotaFiscalEntrada, createItemNotaEntrada,
  fetchProdutos, fetchFornecedores, createFornecedor, fetchFornecedorByCnpj,
  fetchCategoriasFinanceiras, createLancamentoFinanceiro, createContaPagar,
  createMovimentacaoEstoque, deleteNotaFiscalEntradaCascade,
  upsertProdutoPorImportacao, incrementarEstoqueProduto, ItemNFImportacao,
  createCategoriaFinanceira,
  buscarLancamentoParaReconciliar, reconciliarLancamentoComNF, CandidatoReconciliacao,
  fetchNotaFiscalByChave, findProdutoExistente, fetchItensNotaEntrada
} from '@/lib/database'
import { formatCurrency, formatDate, normalizeUnidade } from '@/lib/utils'
import { supabase } from '@/lib/supabase'

interface ProdutoNF {
  codigo: string
  descricao: string
  ncm: string
  cfop: string
  unidade: string
  quantidade: number
  valorUnitario: number
  valorTotal: number
  gtin: string  // código de barras do XML
  // Resultado da importação (preenchido após processar)
  resultadoImportacao?: {
    produtoId: number
    acao: 'criado' | 'atualizado'
  }
}

interface DadosNF {
  numero: string
  serie: string
  chaveAcesso: string
  dataEmissao: string
  fornecedor: {
    cnpj: string
    razaoSocial: string
    nomeFantasia: string
    inscricaoEstadual: string
    endereco: string
    numero: string
    bairro: string
    cidade: string
    estado: string
    cep: string
    telefone: string
  }
  valorProdutos: number
  valorFrete: number
  valorDesconto: number
  valorTotal: number
  produtos: ProdutoNF[]
}

const formasPagamento = [
  { value: 'dinheiro', label: 'Dinheiro' },
  { value: 'pix', label: 'PIX' },
  { value: 'debito', label: 'Cartão Débito' },
  { value: 'credito', label: 'Cartão Crédito' },
  { value: 'boleto', label: 'Boleto' },
  { value: 'transferencia', label: 'Transferência' },
]

export default function ComprasPage() {
  const [notas, setNotas] = useState<NotaFiscalEntrada[]>([])
  const [produtos, setProdutos] = useState<Produto[]>([])
  const [fornecedores, setFornecedores] = useState<Fornecedor[]>([])
  const [categorias, setCategorias] = useState<CategoriaFinanceira[]>([])
  const [loading, setLoading] = useState(true)
  const [processing, setProcessing] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')
  const [expandedNota, setExpandedNota] = useState<number | null>(null)
  
  // Modais de Detalhes
  const [fornecedorModalOpen, setFornecedorModalOpen] = useState(false)
  const [produtoModalOpen, setProdutoModalOpen] = useState(false)
  const [selectedFornecedorId, setSelectedFornecedorId] = useState<number | null>(null)
  const [selectedProdutoId, setSelectedProdutoId] = useState<number | null>(null)
  
  // Exclusão de NF
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false)
  const [selectedNotaDelete, setSelectedNotaDelete] = useState<NotaFiscalEntrada | null>(null)
  const [deleting, setDeleting] = useState(false)
  const [deleteResult, setDeleteResult] = useState<{ success: boolean; message: string } | null>(null)
  
  // Import XML
  const [isImportModalOpen, setIsImportModalOpen] = useState(false)
  const [xmlContent, setXmlContent] = useState<string>('')
  const [dadosNF, setDadosNF] = useState<DadosNF | null>(null)
  const [step, setStep] = useState<'upload' | 'produtos' | 'pagamento' | 'confirmar'>('upload')
  const [fornecedorExistente, setFornecedorExistente] = useState<Fornecedor | null>(null)
  
  // Opções de lançamento
  const [lancarCaixa, setLancarCaixa] = useState(false)
  const [formaPagamento, setFormaPagamento] = useState<string>('boleto')
  const [categoriaId, setCategoriaId] = useState<number | null>(null)
  const [lancarEstoque, setLancarEstoque] = useState(true)
  const [gerarContaPagar, setGerarContaPagar] = useState(true)
  const [dataVencimento, setDataVencimento] = useState<string>('')
  const [atualizarFormadorPreco, setAtualizarFormadorPreco] = useState(true)
  
  // Modal de nova categoria inline
  const [isNovaCategoriaModalOpen, setIsNovaCategoriaModalOpen] = useState(false)
  const [novaCategoriaName, setNovaCategoriaName] = useState('')
  const [savingCategoria, setSavingCategoria] = useState(false)
  
  // Reconciliação com lançamentos OFX existentes
  const [candidatosReconciliacao, setCandidatosReconciliacao] = useState<CandidatoReconciliacao[]>([])
  const [showReconciliacaoModal, setShowReconciliacaoModal] = useState(false)
  const [reconciliacaoSelecionada, setReconciliacaoSelecionada] = useState<number | null>(null)
  const [pendingNFData, setPendingNFData] = useState<{
    notaId: number
    numero: string
    fornecedorNome: string
    categoriaId: number | null
    formaPagamento: string
  } | null>(null)
  
  // Status dos produtos do XML (existente ou novo)
  const [produtosStatus, setProdutosStatus] = useState<Map<number, { existente: boolean; produtoDb?: Produto }>>(new Map())
  const [verificandoProdutos, setVerificandoProdutos] = useState(false)
  
  // Ações por produto e vínculos manuais
  const [itemAcoes, setItemAcoes] = useState<Record<number, 'auto' | 'vincular' | 'cadastrar' | 'ignorar'>>({})
  const [itemVinculos, setItemVinculos] = useState<Record<number, number>>({})
  
  // Busca de produto no vincular
  const [buscaProdutoVincular, setBuscaProdutoVincular] = useState<Record<number, string>>({})
  const [dropdownAberto, setDropdownAberto] = useState<number | null>(null)
  const dropdownRefs = useRef<Record<number, HTMLDivElement | null>>({})
  
  // Modal para ver produtos de uma nota já importada
  const [showProdutosNotaModal, setShowProdutosNotaModal] = useState(false)
  const [produtosNotaSelecionada, setProdutosNotaSelecionada] = useState<ItemNotaEntrada[]>([])
  const [notaSelecionadaParaProdutos, setNotaSelecionadaParaProdutos] = useState<NotaFiscalEntrada | null>(null)
  const [loadingProdutosNota, setLoadingProdutosNota] = useState(false)
  
  const fileInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    loadData()
  }, [])

  // Fechar dropdown de busca ao clicar fora
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownAberto !== null) {
        const ref = dropdownRefs.current[dropdownAberto]
        if (ref && !ref.contains(e.target as Node)) {
          setDropdownAberto(null)
        }
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [dropdownAberto])

  const loadData = async () => {
    try {
      setLoading(true)
      const [notasData, produtosData, fornecedoresData, categoriasData] = await Promise.all([
        fetchNotasFiscaisEntrada(),
        fetchProdutos(),
        fetchFornecedores(),
        fetchCategoriasFinanceiras('despesa')
      ])
      setNotas(notasData)
      setProdutos(produtosData)
      setFornecedores(fornecedoresData)
      setCategorias(categoriasData)
      
      // Selecionar "Despesa de Material" como default (se existir)
      const despesaMaterial = categoriasData.find(
        c => c.nome.toLowerCase().includes('despesa de material') || c.nome.toLowerCase().includes('material')
      )
      if (despesaMaterial && !categoriaId) {
        setCategoriaId(despesaMaterial.id)
      }
    } catch (err) {
      console.error('Erro ao carregar dados:', err)
    } finally {
      setLoading(false)
    }
  }

  // Excluir NF de entrada com cascade
  const handleDeleteNota = async () => {
    if (!selectedNotaDelete) return
    
    setDeleting(true)
    setDeleteResult(null)
    
    try {
      const result = await deleteNotaFiscalEntradaCascade(selectedNotaDelete.id)
      setDeleteResult(result)
      
      if (result.success) {
        // Aguardar um pouco para mostrar o resultado e então recarregar
        setTimeout(async () => {
          await loadData()
          setIsDeleteModalOpen(false)
          setSelectedNotaDelete(null)
          setDeleteResult(null)
          setExpandedNota(null)
        }, 1500)
      }
    } catch (err) {
      setDeleteResult({ 
        success: false, 
        message: 'Erro ao excluir: ' + (err instanceof Error ? err.message : 'Erro desconhecido') 
      })
    } finally {
      setDeleting(false)
    }
  }

  const openDeleteModal = (nota: NotaFiscalEntrada, e: React.MouseEvent) => {
    e.stopPropagation()
    setSelectedNotaDelete(nota)
    setDeleteResult(null)
    setIsDeleteModalOpen(true)
  }

  // Filtrar notas
  const filteredNotas = notas.filter(n => 
    n.numero?.includes(searchTerm) ||
    n.fornecedor_razao_social?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    n.chave_acesso?.includes(searchTerm)
  )

  // Parse XML da NF-e
  const parseXML = (xmlString: string): DadosNF | null => {
    try {
      const parser = new DOMParser()
      const xml = parser.parseFromString(xmlString, 'text/xml')
      
      // Dados da nota
      const ide = xml.querySelector('ide')
      const emit = xml.querySelector('emit')
      const total = xml.querySelector('total ICMSTot')
      
      // Produtos
      const dets = xml.querySelectorAll('det')
      const produtosNF: ProdutoNF[] = []
      
      dets.forEach(det => {
        const prod = det.querySelector('prod')
        if (prod) {
          produtosNF.push({
            codigo: prod.querySelector('cProd')?.textContent || '',
            descricao: prod.querySelector('xProd')?.textContent || '',
            ncm: prod.querySelector('NCM')?.textContent || '',
            cfop: prod.querySelector('CFOP')?.textContent || '',
            unidade: normalizeUnidade(prod.querySelector('uCom')?.textContent),
            quantidade: parseFloat(prod.querySelector('qCom')?.textContent || '0'),
            valorUnitario: parseFloat(prod.querySelector('vUnCom')?.textContent || '0'),
            valorTotal: parseFloat(prod.querySelector('vProd')?.textContent || '0'),
            gtin: prod.querySelector('cEAN')?.textContent || prod.querySelector('cEANTrib')?.textContent || ''
          })
        }
      })

      // Endereço do emitente
      const enderEmit = emit?.querySelector('enderEmit')
      
      return {
        numero: ide?.querySelector('nNF')?.textContent || '',
        serie: ide?.querySelector('serie')?.textContent || '',
        chaveAcesso: xml.querySelector('infNFe')?.getAttribute('Id')?.replace('NFe', '') || '',
        dataEmissao: ide?.querySelector('dhEmi')?.textContent?.split('T')[0] || '',
        fornecedor: {
          cnpj: emit?.querySelector('CNPJ')?.textContent || '',
          razaoSocial: emit?.querySelector('xNome')?.textContent || '',
          nomeFantasia: emit?.querySelector('xFant')?.textContent || '',
          inscricaoEstadual: emit?.querySelector('IE')?.textContent || '',
          endereco: enderEmit?.querySelector('xLgr')?.textContent || '',
          numero: enderEmit?.querySelector('nro')?.textContent || '',
          bairro: enderEmit?.querySelector('xBairro')?.textContent || '',
          cidade: enderEmit?.querySelector('xMun')?.textContent || '',
          estado: enderEmit?.querySelector('UF')?.textContent || '',
          cep: enderEmit?.querySelector('CEP')?.textContent || '',
          telefone: enderEmit?.querySelector('fone')?.textContent || '',
        },
        valorProdutos: parseFloat(total?.querySelector('vProd')?.textContent || '0'),
        valorFrete: parseFloat(total?.querySelector('vFrete')?.textContent || '0'),
        valorDesconto: parseFloat(total?.querySelector('vDesc')?.textContent || '0'),
        valorTotal: parseFloat(total?.querySelector('vNF')?.textContent || '0'),
        produtos: produtosNF
      }
    } catch (err) {
      console.error('Erro ao parsear XML:', err)
      return null
    }
  }

  // Upload do arquivo XML
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    
    const reader = new FileReader()
    reader.onload = async (event) => {
      const content = event.target?.result as string
      setXmlContent(content)
      
      const dados = parseXML(content)
      if (dados) {
        // Verificar se nota já foi importada ANTES de prosseguir
        if (dados.chaveAcesso) {
          const notaExistente = await fetchNotaFiscalByChave(dados.chaveAcesso)
          if (notaExistente) {
            alert(`⚠️ Esta nota fiscal já foi importada!

Número: ${notaExistente.numero}
Fornecedor: ${notaExistente.fornecedor_razao_social}
Data de Entrada: ${formatDate(notaExistente.data_entrada)}

A nota não pode ser importada novamente para evitar duplicação no estoque.

Se você excluiu a nota e quer importar novamente, verifique se ela foi removida completamente do sistema.`)
            // Limpar input para permitir nova seleção
            if (fileInputRef.current) {
              fileInputRef.current.value = ''
            }
            return
          }
        }
        
        // Verificar fornecedor
        const fornecedor = await fetchFornecedorByCnpj(dados.fornecedor.cnpj)
        setFornecedorExistente(fornecedor)
        
        setDadosNF(dados)
        
        // Verificar status de cada produto (existente ou novo)
        setVerificandoProdutos(true)
        const statusMap = new Map<number, { existente: boolean; produtoDb?: Produto }>()
        
        for (let i = 0; i < dados.produtos.length; i++) {
          const prod = dados.produtos[i]
          const itemNF: ItemNFImportacao = {
            codigo: prod.codigo,
            descricao: prod.descricao,
            ncm: prod.ncm,
            cfop: prod.cfop,
            unidade: prod.unidade,
            quantidade: prod.quantidade,
            valorUnitario: prod.valorUnitario,
            valorTotal: prod.valorTotal,
            gtin: prod.gtin
          }
          
          const produtoExistente = await findProdutoExistente(itemNF)
          statusMap.set(i, {
            existente: !!produtoExistente,
            produtoDb: produtoExistente || undefined
          })
        }
        
        setProdutosStatus(statusMap)
        setVerificandoProdutos(false)
        setStep('produtos')
      } else {
        alert('Erro ao processar XML. Verifique se o arquivo é válido.')
      }
    }
    reader.readAsText(file)
  }

  // Processar importação (FLUXO AUTOMÁTICO SIMPLIFICADO)
  const processarImportacao = async () => {
    if (!dadosNF) return
    
    // Validar se todos os itens com "vincular" têm um produto selecionado
    for (let i = 0; i < dadosNF.produtos.length; i++) {
      const acaoItem = itemAcoes[i] || 'auto'
      if (acaoItem === 'vincular' && !itemVinculos[i]) {
        alert(`Por favor, selecione um produto existente para vincular ao item "${dadosNF.produtos[i].descricao}" ou escolha outra opção.`)
        return
      }
    }
    
    setProcessing(true)
    
    try {
      // 0. Verificar se a nota já foi importada (evita duplicação de estoque!)
      if (dadosNF.chaveAcesso) {
        const notaExistente = await fetchNotaFiscalByChave(dadosNF.chaveAcesso)
        if (notaExistente) {
          alert(`⚠️ Esta nota fiscal já foi importada anteriormente!\n\nNúmero: ${notaExistente.numero}\nData: ${formatDate(notaExistente.data_entrada)}\n\nPara evitar duplicação de estoque, a importação foi cancelada.`)
          setProcessing(false)
          return
        }
      }

      // 1. Cadastrar/atualizar fornecedor
      let fornecedorId = fornecedorExistente?.id
      if (!fornecedorExistente) {
        const novoFornecedor = await createFornecedor({
          razao_social: dadosNF.fornecedor.razaoSocial,
          nome_fantasia: dadosNF.fornecedor.nomeFantasia,
          cnpj: dadosNF.fornecedor.cnpj,
          inscricao_estadual: dadosNF.fornecedor.inscricaoEstadual,
          endereco: dadosNF.fornecedor.endereco,
          numero: dadosNF.fornecedor.numero,
          bairro: dadosNF.fornecedor.bairro,
          cidade: dadosNF.fornecedor.cidade,
          estado: dadosNF.fornecedor.estado,
          cep: dadosNF.fornecedor.cep,
          telefone: dadosNF.fornecedor.telefone,
          ativo: true
        })
        fornecedorId = novoFornecedor.id
      }

      // 2. Criar nota fiscal
      const nota = await createNotaFiscalEntrada({
        numero: dadosNF.numero,
        serie: dadosNF.serie,
        chave_acesso: dadosNF.chaveAcesso,
        data_emissao: dadosNF.dataEmissao,
        data_entrada: new Date().toISOString().split('T')[0],
        fornecedor_id: fornecedorId,
        fornecedor_cnpj: dadosNF.fornecedor.cnpj,
        fornecedor_razao_social: dadosNF.fornecedor.razaoSocial,
        valor_produtos: dadosNF.valorProdutos,
        valor_frete: dadosNF.valorFrete,
        valor_desconto: dadosNF.valorDesconto,
        valor_total: dadosNF.valorTotal,
        forma_pagamento: formaPagamento,
        lancado_caixa: lancarCaixa,
        xml_original: xmlContent,
        status: 'processada'
      })

      // 3. Processar cada produto (respeitando ações manuais)
      const resultados: { descricao: string; acao: 'criado' | 'atualizado' | 'vinculado' | 'ignorado' }[] = []
      
      for (let idx = 0; idx < dadosNF.produtos.length; idx++) {
        const prod = dadosNF.produtos[idx]
        const acaoItem = itemAcoes[idx] || 'auto'
        
        // Se ignorar, não processar
        if (acaoItem === 'ignorar') {
          resultados.push({ descricao: prod.descricao, acao: 'ignorado' })
          continue
        }
        
        // Converter para ItemNFImportacao
        const itemNF: ItemNFImportacao = {
          codigo: prod.codigo,
          descricao: prod.descricao,
          ncm: prod.ncm,
          cfop: prod.cfop,
          unidade: prod.unidade,
          quantidade: prod.quantidade,
          valorUnitario: prod.valorUnitario,
          valorTotal: prod.valorTotal,
          gtin: prod.gtin
        }
        
        let produtoId: number
        let acaoResultado: 'criado' | 'atualizado' | 'vinculado'
        
        if (acaoItem === 'vincular' && itemVinculos[idx]) {
          // Vínculo manual: atualizar o produto selecionado pelo usuário
          const produtoSelecionado = itemVinculos[idx]
          const novoCusto = prod.valorUnitario
          
          // Atualizar custo do produto vinculado
          const updateData: any = {
            valor_custo: novoCusto,
            custo_ultima_compra: novoCusto,
            custo_medio: novoCusto,
            updated_at: new Date().toISOString()
          }
          
          if (atualizarFormadorPreco) {
            // Buscar margem do produto para recalcular venda
            const prodDb = produtos.find(p => p.id === produtoSelecionado)
            if (prodDb?.margem_lucro && prodDb.margem_lucro > 0) {
              updateData.valor_venda = novoCusto * (1 + prodDb.margem_lucro / 100)
            }
          }
          
          const { error } = await supabase
            .from('produtos')
            .update(updateData)
            .eq('id', produtoSelecionado)
          
          if (error) throw new Error(`Erro ao atualizar produto vinculado: ${error.message}`)
          
          produtoId = produtoSelecionado
          acaoResultado = 'vinculado'
        } else if (acaoItem === 'cadastrar') {
          // Forçar criação de novo produto (ignorar existência)
          const novoCusto = prod.valorUnitario
          const { data: created, error } = await supabase
            .from('produtos')
            .insert([{
              codigo: prod.codigo || null,
              nome: prod.descricao,
              ncm: prod.ncm || null,
              cfop: prod.cfop || null,
              unidade: prod.unidade,
              valor_custo: novoCusto,
              valor_venda: novoCusto,
              custo_medio: novoCusto,
              custo_ultima_compra: novoCusto,
              margem_lucro: 0,
              quantidade_estoque: 0,
              fornecedor_id: fornecedorId,
              ativo: true
            }])
            .select()
            .single()
          
          if (error) throw new Error(`Erro ao criar produto: ${error.message}`)
          produtoId = created.id
          acaoResultado = 'criado'
        } else {
          // Auto: upsert automático (comportamento original)
          const resultado = await upsertProdutoPorImportacao(
            itemNF, 
            atualizarFormadorPreco, 
            fornecedorId
          )
          produtoId = resultado.produtoId
          acaoResultado = resultado.acao === 'criado' ? 'criado' : 'atualizado'
        }
        
        resultados.push({ descricao: prod.descricao, acao: acaoResultado })
        
        // Criar item da nota
        await createItemNotaEntrada({
          nota_fiscal_id: nota.id,
          produto_id: produtoId,
          codigo_produto_nf: prod.codigo,
          descricao: prod.descricao,
          ncm: prod.ncm,
          cfop: prod.cfop,
          unidade: prod.unidade,
          quantidade: prod.quantidade,
          valor_unitario: prod.valorUnitario,
          valor_total: prod.valorTotal,
          valor_desconto: 0,
          acao: acaoResultado === 'criado' ? 'cadastrado' : 'existente'
        })

        // Lançar movimentação de estoque
        if (lancarEstoque) {
          await createMovimentacaoEstoque({
            produto_id: produtoId,
            tipo: 'entrada',
            quantidade: prod.quantidade,
            valor_unitario: prod.valorUnitario,
            valor_total: prod.valorTotal,
            nota_fiscal_id: nota.id,
            motivo: `Entrada NF ${dadosNF.numero}${acaoResultado === 'vinculado' ? ' (vinculado manualmente)' : ''}`,
            data_movimentacao: new Date().toISOString()
          })
        }
      }

      // 4. Lançar no caixa (se solicitado) - COM RECONCILIAÇÃO
      if (lancarCaixa && categoriaId) {
        // Tentar reconciliar com lançamento OFX existente
        const descricaoNF = `NF ${dadosNF.numero} - ${dadosNF.fornecedor.razaoSocial}`
        
        const { candidatos, melhorMatch } = await buscarLancamentoParaReconciliar({
          data_nf: dadosNF.dataEmissao,
          valor: dadosNF.valorTotal,
          descricao_xml: descricaoNF,
          fornecedor_nome: dadosNF.fornecedor.razaoSocial
        })
        
        if (melhorMatch) {
          // Match confiável encontrado - reconciliar automaticamente
          console.log(`✓ Match encontrado: Lançamento #${melhorMatch.id} (score: ${(melhorMatch.score * 100).toFixed(0)}%)`)
          
          const resultado = await reconciliarLancamentoComNF({
            lancamento_id: melhorMatch.id,
            nota_fiscal_entrada_id: nota.id,
            numero_nf: dadosNF.numero,
            fornecedor_nome: dadosNF.fornecedor.razaoSocial,
            categoria_id: categoriaId,
            forma_pagamento: formaPagamento
          })
          
          if (!resultado.success) {
            console.error('Erro na reconciliação:', resultado.error)
            // Fallback: criar novo lançamento
            await createLancamentoFinanceiro({
              tipo: 'despesa',
              categoria_id: categoriaId,
              valor: dadosNF.valorTotal,
              data_lancamento: new Date().toISOString().split('T')[0],
              forma_pagamento: formaPagamento as any,
              fornecedor_id: fornecedorId,
              nota_fiscal_entrada_id: nota.id,
              descricao: descricaoNF,
              com_nota_fiscal: true,
              conciliado: false
            })
          }
        } else if (candidatos.length > 1) {
          // Múltiplos candidatos - mostrar modal de seleção
          setCandidatosReconciliacao(candidatos)
          setPendingNFData({
            notaId: nota.id,
            numero: dadosNF.numero,
            fornecedorNome: dadosNF.fornecedor.razaoSocial,
            categoriaId,
            formaPagamento
          })
          setShowReconciliacaoModal(true)
          // Não finalizar aqui - esperar seleção do usuário
          // O modal vai chamar a função de conclusão
          setProcessing(false)
          return // Sair para esperar seleção
        } else {
          // Nenhum match - criar novo lançamento normalmente
          await createLancamentoFinanceiro({
            tipo: 'despesa',
            categoria_id: categoriaId,
            valor: dadosNF.valorTotal,
            data_lancamento: new Date().toISOString().split('T')[0],
            forma_pagamento: formaPagamento as any,
            fornecedor_id: fornecedorId,
            nota_fiscal_entrada_id: nota.id,
            descricao: descricaoNF,
            com_nota_fiscal: true,
            conciliado: false
          })
        }
      }

      // 5. Gerar conta a pagar (se boleto ou prazo)
      if (gerarContaPagar && (formaPagamento === 'boleto' || !lancarCaixa)) {
        await createContaPagar({
          fornecedor_id: fornecedorId,
          descricao: `NF ${dadosNF.numero} - ${dadosNF.fornecedor.razaoSocial}`,
          valor: dadosNF.valorTotal,
          valor_pago: 0,
          data_emissao: dadosNF.dataEmissao,
          data_vencimento: dataVencimento || dadosNF.dataEmissao,
          nota_fiscal_id: nota.id,
          status: 'pendente',
          forma_pagamento: formaPagamento,
          com_nota_fiscal: true
        })
      }

      // Mostrar resumo da importação
      const criados = resultados.filter(r => r.acao === 'criado').length
      const atualizados = resultados.filter(r => r.acao === 'atualizado').length
      
      await loadData()
      closeImportModal()
      alert(`Nota fiscal importada com sucesso!\n\n• ${criados} produto(s) criado(s)\n• ${atualizados} produto(s) atualizado(s)`)
      
    } catch (err) {
      console.error('Erro ao processar importação:', err)
      alert('Erro ao processar importação: ' + (err instanceof Error ? err.message : 'Erro desconhecido'))
    } finally {
      setProcessing(false)
    }
  }

  // Função para finalizar reconciliação após seleção do usuário
  const handleReconciliacaoSelecionada = async (lancamentoId: number | null) => {
    if (!pendingNFData) return
    
    setProcessing(true)
    try {
      if (lancamentoId !== null) {
        // Reconciliar com lançamento selecionado
        const resultado = await reconciliarLancamentoComNF({
          lancamento_id: lancamentoId,
          nota_fiscal_entrada_id: pendingNFData.notaId,
          numero_nf: pendingNFData.numero,
          fornecedor_nome: pendingNFData.fornecedorNome,
          categoria_id: pendingNFData.categoriaId,
          forma_pagamento: pendingNFData.formaPagamento
        })
        
        if (resultado.success) {
          alert(`Lançamento reconciliado com sucesso!\n\nO lançamento OFX existente foi atualizado com os dados da NF ${pendingNFData.numero}.`)
        } else {
          throw new Error(resultado.error || 'Erro desconhecido')
        }
      } else {
        // Criar novo lançamento (usuário escolheu "Criar novo")
        await createLancamentoFinanceiro({
          tipo: 'despesa',
          categoria_id: pendingNFData.categoriaId,
          valor: dadosNF?.valorTotal || 0,
          data_lancamento: new Date().toISOString().split('T')[0],
          forma_pagamento: pendingNFData.formaPagamento as any,
          fornecedor_id: fornecedores.find(f => 
            f.razao_social === pendingNFData.fornecedorNome || 
            f.nome_fantasia === pendingNFData.fornecedorNome
          )?.id || null,
          nota_fiscal_entrada_id: pendingNFData.notaId,
          descricao: `NF ${pendingNFData.numero} - ${pendingNFData.fornecedorNome}`,
          com_nota_fiscal: true,
          conciliado: false
        })
      }
      
      await loadData()
      setShowReconciliacaoModal(false)
      setCandidatosReconciliacao([])
      setPendingNFData(null)
      closeImportModal()
    } catch (err) {
      console.error('Erro ao processar reconciliação:', err)
      alert('Erro ao processar: ' + (err instanceof Error ? err.message : 'Erro desconhecido'))
    } finally {
      setProcessing(false)
    }
  }

  const closeImportModal = () => {
    setIsImportModalOpen(false)
    setXmlContent('')
    setDadosNF(null)
    setStep('upload')
    setFornecedorExistente(null)
    setLancarCaixa(false)
    setFormaPagamento('boleto')
    setCategoriaId(null)
    setLancarEstoque(true)
    setGerarContaPagar(true)
    setDataVencimento('')
    setAtualizarFormadorPreco(true)
    setCandidatosReconciliacao([])
    setShowReconciliacaoModal(false)
    setPendingNFData(null)
    setProdutosStatus(new Map())
    setVerificandoProdutos(false)
    setItemAcoes({})
    setItemVinculos({})
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  // Abrir modal para ver produtos de uma nota já importada
  const handleVerProdutosNota = async (nota: NotaFiscalEntrada, e: React.MouseEvent) => {
    e.stopPropagation()
    setNotaSelecionadaParaProdutos(nota)
    setLoadingProdutosNota(true)
    setShowProdutosNotaModal(true)
    
    try {
      const itens = await fetchItensNotaEntrada(nota.id)
      setProdutosNotaSelecionada(itens)
    } catch (err) {
      console.error('Erro ao buscar produtos da nota:', err)
      alert('Erro ao carregar produtos da nota')
    } finally {
      setLoadingProdutosNota(false)
    }
  }

  const closeProdutosNotaModal = () => {
    setShowProdutosNotaModal(false)
    setProdutosNotaSelecionada([])
    setNotaSelecionadaParaProdutos(null)
  }

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
            Compras / Entrada de Mercadoria
          </h1>
          <p className="text-dark-400 mt-1">
            Importe notas fiscais (XML) e gerencie entradas
          </p>
        </div>
        <Button
          onClick={() => setIsImportModalOpen(true)}
          leftIcon={<Upload className="w-5 h-5" />}
        >
          Importar XML
        </Button>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="glass-card p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-primary-500/20 flex items-center justify-center">
              <FileText className="w-5 h-5 text-primary-400" />
            </div>
            <div>
              <p className="text-dark-400 text-sm">Total de Notas</p>
              <p className="text-xl font-bold text-white">{notas.length}</p>
            </div>
          </div>
        </div>
        
        <div className="glass-card p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-green-500/20 flex items-center justify-center">
              <DollarSign className="w-5 h-5 text-green-400" />
            </div>
            <div>
              <p className="text-dark-400 text-sm">Total Compras (Mês)</p>
              <p className="text-xl font-bold text-white">
                {formatCurrency(notas
                  .filter(n => new Date(n.data_entrada).getMonth() === new Date().getMonth())
                  .reduce((acc, n) => acc + n.valor_total, 0)
                )}
              </p>
            </div>
          </div>
        </div>
        
        <div className="glass-card p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-blue-500/20 flex items-center justify-center">
              <Building2 className="w-5 h-5 text-blue-400" />
            </div>
            <div>
              <p className="text-dark-400 text-sm">Fornecedores</p>
              <p className="text-xl font-bold text-white">{fornecedores.length}</p>
            </div>
          </div>
        </div>
        
        <div className="glass-card p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-yellow-500/20 flex items-center justify-center">
              <Truck className="w-5 h-5 text-yellow-400" />
            </div>
            <div>
              <p className="text-dark-400 text-sm">Total Frete</p>
              <p className="text-xl font-bold text-white">
                {formatCurrency(notas.reduce((acc, n) => acc + n.valor_frete, 0))}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Busca */}
      <div className="glass-card p-4">
        <div className="relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-dark-400" />
          <input
            type="text"
            placeholder="Buscar por número, fornecedor ou chave de acesso..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="input pl-12 w-full"
          />
        </div>
      </div>

      {/* Lista de Notas */}
      <div className="glass-card overflow-hidden">
        {filteredNotas.length > 0 ? (
          <div className="divide-y divide-dark-700">
            {filteredNotas.map((nota) => (
              <div key={nota.id} className="p-4">
                <div 
                  className="flex items-center justify-between cursor-pointer"
                  onClick={() => setExpandedNota(expandedNota === nota.id ? null : nota.id)}
                >
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-lg bg-primary-500/10 flex items-center justify-center">
                      <FileText className="w-6 h-6 text-primary-400" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-white">NF {nota.numero}</span>
                        <Badge variant="success">Processada</Badge>
                      </div>
                      <p className="text-sm text-dark-400">
                        {nota.fornecedor_id ? (
                          <button 
                            onClick={(e) => {
                              e.stopPropagation()
                              setSelectedFornecedorId(nota.fornecedor_id)
                              setFornecedorModalOpen(true)
                            }}
                            className="text-primary-400 hover:text-primary-300 transition-colors"
                          >
                            {nota.fornecedor_razao_social}
                          </button>
                        ) : nota.fornecedor_razao_social}
                      </p>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-6">
                    <div className="text-right">
                      <p className="text-lg font-bold text-white">{formatCurrency(nota.valor_total)}</p>
                      <p className="text-xs text-dark-400">
                        {new Date(nota.data_entrada).toLocaleDateString('pt-BR')}
                      </p>
                    </div>
                    {expandedNota === nota.id ? (
                      <ChevronUp className="w-5 h-5 text-dark-400" />
                    ) : (
                      <ChevronDown className="w-5 h-5 text-dark-400" />
                    )}
                  </div>
                </div>
                
                {expandedNota === nota.id && (
                  <div className="mt-4 pt-4 border-t border-dark-700">
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                      <div>
                        <p className="text-xs text-dark-400">Série</p>
                        <p className="text-white">{nota.serie}</p>
                      </div>
                      <div>
                        <p className="text-xs text-dark-400">Data Emissão</p>
                        <p className="text-white">{nota.data_emissao ? new Date(nota.data_emissao).toLocaleDateString('pt-BR') : '-'}</p>
                      </div>
                      <div>
                        <p className="text-xs text-dark-400">Valor Produtos</p>
                        <p className="text-white">{formatCurrency(nota.valor_produtos)}</p>
                      </div>
                      <div>
                        <p className="text-xs text-dark-400">Valor Frete</p>
                        <p className="text-white">{formatCurrency(nota.valor_frete)}</p>
                      </div>
                    </div>
                    <div>
                      <p className="text-xs text-dark-400 mb-1">Chave de Acesso</p>
                      <p className="text-xs text-dark-300 font-mono break-all">{nota.chave_acesso}</p>
                    </div>
                    <div className="flex justify-between items-center mt-4">
                      <div className="flex gap-2">
                        <Badge variant={nota.lancado_caixa ? 'success' : 'secondary'}>
                          {nota.lancado_caixa ? 'Lançado no Caixa' : 'Não lançado'}
                        </Badge>
                        {nota.forma_pagamento && (
                          <Badge variant="primary">
                            {formasPagamento.find(f => f.value === nota.forma_pagamento)?.label || nota.forma_pagamento}
                          </Badge>
                        )}
                      </div>
                      <div className="flex gap-2">
                        <Button
                          variant="secondary"
                          size="sm"
                          onClick={(e) => handleVerProdutosNota(nota, e)}
                          leftIcon={<Package className="w-4 h-4" />}
                        >
                          Ver Produtos
                        </Button>
                        <Button
                          variant="danger"
                          size="sm"
                          onClick={(e) => openDeleteModal(nota, e)}
                          leftIcon={<Trash2 className="w-4 h-4" />}
                        >
                          Excluir NF
                        </Button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        ) : (
          <EmptyState
            icon={<FileText className="w-10 h-10 text-dark-500" />}
            title="Nenhuma nota fiscal"
            description="Importe arquivos XML de notas fiscais"
            action={
              <Button onClick={() => setIsImportModalOpen(true)} leftIcon={<Upload className="w-4 h-4" />}>
                Importar XML
              </Button>
            }
          />
        )}
      </div>

      {/* Modal de Importação */}
      <Modal
        isOpen={isImportModalOpen}
        onClose={closeImportModal}
        title="Importar Nota Fiscal (XML)"
        size="xl"
      >
        <div className="space-y-6">
          {/* Steps indicator */}
          <div className="flex items-center justify-center gap-2">
            {['upload', 'produtos', 'pagamento', 'confirmar'].map((s, i) => (
              <div key={s} className="flex items-center">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                  step === s ? 'bg-primary-500 text-white' : 
                  ['upload', 'produtos', 'pagamento', 'confirmar'].indexOf(step) > i ? 'bg-green-500 text-white' :
                  'bg-dark-700 text-dark-400'
                }`}>
                  {i + 1}
                </div>
                {i < 3 && <div className={`w-8 h-0.5 ${
                  ['upload', 'produtos', 'pagamento', 'confirmar'].indexOf(step) > i ? 'bg-green-500' : 'bg-dark-700'
                }`} />}
              </div>
            ))}
          </div>

          {/* Step: Upload */}
          {step === 'upload' && (
            <div className="text-center py-8">
              <input
                ref={fileInputRef}
                type="file"
                accept=".xml"
                onChange={handleFileUpload}
                className="hidden"
              />
              <div 
                onClick={() => fileInputRef.current?.click()}
                className="border-2 border-dashed border-dark-600 rounded-xl p-12 cursor-pointer hover:border-primary-500 transition-colors"
              >
                <Upload className="w-12 h-12 text-dark-400 mx-auto mb-4" />
                <p className="text-white font-medium mb-2">Clique para selecionar o arquivo XML</p>
                <p className="text-dark-400 text-sm">ou arraste e solte aqui</p>
              </div>
            </div>
          )}

          {/* Step: Produtos */}
          {step === 'produtos' && dadosNF && (
            <div className="space-y-4">
              {/* Fornecedor */}
              <div className="glass-card p-4">
                <div className="flex items-center gap-3 mb-3">
                  <Building2 className="w-5 h-5 text-primary-400" />
                  <span className="font-medium text-white">Dados do Fornecedor</span>
                  {fornecedorExistente ? (
                    <Badge variant="success">Cadastrado</Badge>
                  ) : (
                    <Badge variant="warning">Será cadastrado</Badge>
                  )}
                </div>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <p className="text-dark-400">Razão Social</p>
                    <p className="text-white">{dadosNF.fornecedor.razaoSocial}</p>
                  </div>
                  <div>
                    <p className="text-dark-400">CNPJ</p>
                    <p className="text-white">{dadosNF.fornecedor.cnpj}</p>
                  </div>
                  <div>
                    <p className="text-dark-400">Cidade/UF</p>
                    <p className="text-white">{dadosNF.fornecedor.cidade}/{dadosNF.fornecedor.estado}</p>
                  </div>
                  <div>
                    <p className="text-dark-400">Telefone</p>
                    <p className="text-white">{dadosNF.fornecedor.telefone || '-'}</p>
                  </div>
                </div>
              </div>

              {/* Produtos */}
              <div>
                <div className="flex items-center justify-between mb-3">
                  <span className="font-medium text-white">Produtos ({dadosNF.produtos.length})</span>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={atualizarFormadorPreco}
                      onChange={(e) => setAtualizarFormadorPreco(e.target.checked)}
                      className="w-4 h-4 rounded border-dark-500 bg-dark-700 text-primary-500 focus:ring-primary-500"
                    />
                    <span className="text-sm text-dark-300">Atualizar preço de venda automaticamente</span>
                  </label>
                </div>
                
                {/* Legenda e Resumo */}
                <div className="flex items-center justify-between mb-3">
                  <div className="flex gap-4 text-xs">
                    <span className="flex items-center gap-1">
                      <span className="w-2 h-2 bg-green-500 rounded-full"></span>
                      <span className="text-green-400">Existente ({Array.from(produtosStatus.values()).filter(s => s.existente).length})</span>
                    </span>
                    <span className="flex items-center gap-1">
                      <span className="w-2 h-2 bg-yellow-500 rounded-full"></span>
                      <span className="text-yellow-400">Novo ({Array.from(produtosStatus.values()).filter(s => !s.existente).length})</span>
                    </span>
                  </div>
                  {verificandoProdutos && (
                    <span className="text-xs text-dark-400 flex items-center gap-2">
                      <LoadingSpinner size="sm" /> Verificando produtos...
                    </span>
                  )}
                </div>
                
                <div className="space-y-2">
                  {dadosNF.produtos.map((prod, index) => {
                    const status = produtosStatus.get(index)
                    const isExistente = status?.existente
                    const produtoDb = status?.produtoDb
                    const acaoItem = itemAcoes[index] || 'auto'
                    const produtoVinculado = itemVinculos[index] ? produtos.find(p => p.id === itemVinculos[index]) : null
                    
                    // Determinar cor da borda
                    const borderColor = acaoItem === 'ignorar' 
                      ? 'border-l-dark-500 opacity-50' 
                      : acaoItem === 'vincular' && produtoVinculado
                        ? 'border-l-blue-500'
                        : isExistente ? 'border-l-green-500' : 'border-l-yellow-500'
                    
                    return (
                      <div 
                        key={index} 
                        className={`glass-card p-3 border-l-4 ${borderColor} ${dropdownAberto === index ? 'relative z-[60]' : 'relative z-0'}`}
                      >
                        <div className="flex items-start justify-between gap-4">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1">
                              <span className="text-xs text-dark-400">#{prod.codigo}</span>
                              <span className="font-medium text-white text-sm">{prod.descricao}</span>
                            </div>
                            
                            {/* EAN/GTIN */}
                            {prod.gtin && prod.gtin.length > 3 && !/^0+$/.test(prod.gtin) && (
                              <div className="text-xs text-dark-500 mb-1">EAN: {prod.gtin}</div>
                            )}
                            
                            {/* Info da NF */}
                            <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-dark-400 mb-2">
                              <span>NCM: {prod.ncm}</span>
                              <span className="text-primary-400 font-medium">Qtd: {prod.quantidade} {prod.unidade}</span>
                              <span>Custo NF: {formatCurrency(prod.valorUnitario)}</span>
                              <span className="text-primary-400 font-medium">Total: {formatCurrency(prod.valorTotal)}</span>
                            </div>
                            
                            {/* Info do produto existente no sistema (quando auto e encontrado) */}
                            {acaoItem === 'auto' && isExistente && produtoDb && (
                              <div className="bg-green-500/10 rounded p-2 text-xs">
                                <div className="flex items-center gap-2 text-green-400 font-medium mb-1">
                                  <CheckCircle className="w-3 h-3" />
                                  Produto encontrado no sistema
                                </div>
                                <div className="grid grid-cols-2 gap-x-4 text-dark-300">
                                  <span>Estoque atual: <span className="text-white font-medium">{produtoDb.quantidade_estoque} {produtoDb.unidade}</span></span>
                                  <span>Custo atual: <span className="text-white">{formatCurrency(produtoDb.valor_custo)}</span></span>
                                  <span>Venda atual: <span className="text-white">{formatCurrency(produtoDb.valor_venda)}</span></span>
                                  <span>Margem: <span className="text-white">{produtoDb.margem_lucro?.toFixed(1) || 0}%</span></span>
                                </div>
                                {atualizarFormadorPreco && produtoDb.margem_lucro && produtoDb.margem_lucro > 0 && (
                                  <div className="mt-1 text-dark-400">
                                    → Novo preço venda: <span className="text-primary-400 font-medium">
                                      {formatCurrency(prod.valorUnitario * (1 + (produtoDb.margem_lucro || 0) / 100))}
                                    </span>
                                    <span className="text-dark-500"> (mantém margem de {produtoDb.margem_lucro?.toFixed(0)}%)</span>
                                  </div>
                                )}
                              </div>
                            )}
                            
                            {/* Info de produto novo (quando auto e não encontrado) */}
                            {acaoItem === 'auto' && !isExistente && !verificandoProdutos && (
                              <div className="bg-yellow-500/10 rounded p-2 text-xs">
                                <div className="flex items-center gap-2 text-yellow-400 font-medium">
                                  <AlertTriangle className="w-3 h-3" />
                                  Produto será cadastrado automaticamente
                                </div>
                              </div>
                            )}
                            
                            {/* Info do produto vinculado manualmente */}
                            {acaoItem === 'vincular' && produtoVinculado && (
                              <div className="bg-blue-500/10 rounded p-2 text-xs">
                                <div className="flex items-center gap-2 text-blue-400 font-medium mb-1">
                                  <CheckCircle className="w-3 h-3" />
                                  Vinculado a: {produtoVinculado.nome}
                                </div>
                                <div className="grid grid-cols-2 gap-x-4 text-dark-300">
                                  <span>Estoque atual: <span className="text-white font-medium">{produtoVinculado.quantidade_estoque} {produtoVinculado.unidade}</span></span>
                                  <span>Custo atual: <span className="text-white">{formatCurrency(produtoVinculado.valor_custo)}</span></span>
                                </div>
                              </div>
                            )}
                          </div>
                          
                          {/* Select de ação */}
                          <div className="flex flex-col items-end gap-2 min-w-[180px]">
                            <select
                              value={acaoItem}
                              onChange={(e) => {
                                const value = e.target.value as 'auto' | 'vincular' | 'cadastrar' | 'ignorar'
                                setItemAcoes(prev => ({ ...prev, [index]: value }))
                                // Limpar vínculo se não for vincular
                                if (value !== 'vincular') {
                                  setItemVinculos(prev => {
                                    const newState = { ...prev }
                                    delete newState[index]
                                    return newState
                                  })
                                }
                              }}
                              className="input text-xs w-full"
                            >
                              {isExistente ? (
                                <>
                                  <option value="auto">Atualizar estoque</option>
                                  <option value="vincular">Vincular a outro produto</option>
                                  <option value="cadastrar">Cadastrar como novo</option>
                                  <option value="ignorar">Ignorar</option>
                                </>
                              ) : (
                                <>
                                  <option value="auto">Cadastrar novo produto</option>
                                  <option value="vincular">Vincular a existente</option>
                                  <option value="ignorar">Ignorar</option>
                                </>
                              )}
                            </select>
                          </div>
                        </div>
                        
                        {/* Seletor de produto quando "Vincular" - Com busca */}
                        {acaoItem === 'vincular' && (
                          <div className="mt-3 pt-3 border-t border-dark-600">
                            <label className="text-dark-300 text-xs block mb-2">
                              Pesquise e selecione o produto existente para vincular:
                            </label>
                            <div className="relative" ref={(el) => { dropdownRefs.current[index] = el }}>
                              {/* Produto já selecionado */}
                              {itemVinculos[index] ? (
                                <div className="flex items-center gap-2">
                                  <div className="input w-full text-sm flex items-center justify-between">
                                    <span className="truncate">
                                      {(() => {
                                        const p = produtos.find(pr => pr.id === itemVinculos[index])
                                        return p ? `${p.codigo ? `[${p.codigo}] ` : ''}${p.nome} - Estoque: ${p.quantidade_estoque} ${p.unidade}` : ''
                                      })()}
                                    </span>
                                    <button
                                      type="button"
                                      onClick={() => {
                                        setItemVinculos(prev => {
                                          const newState = { ...prev }
                                          delete newState[index]
                                          return newState
                                        })
                                        setBuscaProdutoVincular(prev => ({ ...prev, [index]: '' }))
                                        setDropdownAberto(index)
                                      }}
                                      className="text-dark-400 hover:text-red-400 ml-2 flex-shrink-0"
                                      title="Remover vínculo"
                                    >
                                      <Trash2 className="w-3.5 h-3.5" />
                                    </button>
                                  </div>
                                </div>
                              ) : (
                                <>
                                  {/* Campo de busca */}
                                  <div className="relative">
                                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-dark-400" />
                                    <input
                                      type="text"
                                      value={buscaProdutoVincular[index] || ''}
                                      onChange={(e) => {
                                        setBuscaProdutoVincular(prev => ({ ...prev, [index]: e.target.value }))
                                        setDropdownAberto(index)
                                      }}
                                      onFocus={() => setDropdownAberto(index)}
                                      placeholder="Digite para buscar produto..."
                                      className="input w-full text-sm pl-9"
                                      autoComplete="off"
                                    />
                                  </div>

                                  {/* Dropdown de resultados */}
                                  {dropdownAberto === index && (
                                    <div className="absolute z-50 w-full mt-1 bg-dark-700 border border-dark-500 rounded-lg shadow-xl max-h-60 overflow-y-auto">
                                      {(() => {
                                        const termo = (buscaProdutoVincular[index] || '').toLowerCase().trim()
                                        const filtrados = produtos
                                          .filter(p => p.ativo !== false)
                                          .filter(p => {
                                            if (!termo) return true
                                            const nomeMatch = p.nome.toLowerCase().includes(termo)
                                            const codigoMatch = p.codigo?.toLowerCase().includes(termo)
                                            return nomeMatch || codigoMatch
                                          })
                                          .sort((a, b) => a.nome.localeCompare(b.nome))
                                        
                                        if (filtrados.length === 0) {
                                          return (
                                            <div className="px-3 py-4 text-dark-400 text-sm text-center">
                                              Nenhum produto encontrado
                                            </div>
                                          )
                                        }
                                        
                                        return filtrados.map(produto => (
                                          <button
                                            key={produto.id}
                                            type="button"
                                            onClick={() => {
                                              setItemVinculos(prev => ({ ...prev, [index]: produto.id }))
                                              setDropdownAberto(null)
                                              setBuscaProdutoVincular(prev => ({ ...prev, [index]: '' }))
                                            }}
                                            className="w-full text-left px-3 py-2.5 text-sm hover:bg-dark-600 transition-colors border-b border-dark-600 last:border-0 flex flex-col gap-0.5"
                                          >
                                            <span className="text-white font-medium truncate">
                                              {produto.codigo ? `[${produto.codigo}] ` : ''}{produto.nome}
                                            </span>
                                            <span className="text-dark-300 text-xs">
                                              Estoque: {produto.quantidade_estoque} {produto.unidade} | Custo: {formatCurrency(produto.valor_custo)}
                                            </span>
                                          </button>
                                        ))
                                      })()}
                                    </div>
                                  )}
                                </>
                              )}
                            </div>

                            {!itemVinculos[index] && (
                              <p className="text-yellow-400 text-xs mt-1">
                                ⚠️ Selecione um produto para continuar
                              </p>
                            )}
                            {itemVinculos[index] && (
                              <p className="text-green-400 text-xs mt-1">
                                ✓ O estoque deste produto será atualizado com a entrada da NF
                              </p>
                            )}
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>
              </div>

              <div className="flex justify-between pt-4">
                <Button variant="secondary" onClick={() => setStep('upload')}>
                  Voltar
                </Button>
                <Button 
                  onClick={() => {
                    // Validar vínculos antes de avançar
                    if (dadosNF) {
                      for (let i = 0; i < dadosNF.produtos.length; i++) {
                        if (itemAcoes[i] === 'vincular' && !itemVinculos[i]) {
                          alert(`Selecione um produto para vincular ao item "${dadosNF.produtos[i].descricao}" ou escolha outra opção.`)
                          return
                        }
                      }
                    }
                    setStep('pagamento')
                  }} 
                  disabled={verificandoProdutos}
                >
                  Próximo
                </Button>
              </div>
            </div>
          )}

          {/* Step: Pagamento */}
          {step === 'pagamento' && dadosNF && (
            <div className="space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <div className="glass-card p-4">
                  <p className="text-dark-400 text-sm">Valor Total da Nota</p>
                  <p className="text-2xl font-bold text-white">{formatCurrency(dadosNF.valorTotal)}</p>
                </div>
                <div className="glass-card p-4">
                  <p className="text-dark-400 text-sm">Valor do Frete</p>
                  <p className="text-2xl font-bold text-white">{formatCurrency(dadosNF.valorFrete)}</p>
                </div>
              </div>

              <div className="space-y-4">
                <label className="flex items-center gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={lancarEstoque}
                    onChange={(e) => setLancarEstoque(e.target.checked)}
                    className="w-5 h-5 rounded text-primary-500"
                  />
                  <div>
                    <span className="text-white font-medium">Lançar no estoque</span>
                    <p className="text-sm text-dark-400">Atualizar quantidade dos produtos</p>
                  </div>
                </label>

                <label className="flex items-center gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={lancarCaixa}
                    onChange={(e) => setLancarCaixa(e.target.checked)}
                    className="w-5 h-5 rounded text-primary-500"
                  />
                  <div>
                    <span className="text-white font-medium">Lançar no caixa</span>
                    <p className="text-sm text-dark-400">Registrar como despesa paga</p>
                  </div>
                </label>

                {lancarCaixa && (
                  <div className="ml-8 space-y-4">
                    <div>
                      <label className="block text-sm text-dark-300 mb-2">Forma de Pagamento</label>
                      <select
                        value={formaPagamento}
                        onChange={(e) => setFormaPagamento(e.target.value)}
                        className="input w-full"
                      >
                        {formasPagamento.map(f => (
                          <option key={f.value} value={f.value}>{f.label}</option>
                        ))}
                      </select>
                    </div>
                    
                    <div>
                      <label className="block text-sm text-dark-300 mb-2">
                        Categoria da Despesa <span className="text-red-400">*</span>
                      </label>
                      <div className="flex gap-2">
                        <select
                          value={categoriaId || ''}
                          onChange={(e) => setCategoriaId(Number(e.target.value) || null)}
                          className={`input flex-1 ${!categoriaId && lancarCaixa ? 'border-red-500/50' : ''}`}
                        >
                          <option value="">Selecione uma categoria...</option>
                          {categorias.map(c => (
                            <option key={c.id} value={c.id}>{c.nome}</option>
                          ))}
                        </select>
                        <button
                          type="button"
                          onClick={() => setIsNovaCategoriaModalOpen(true)}
                          className="p-2.5 bg-dark-700 hover:bg-dark-600 text-dark-300 hover:text-primary-400 rounded-lg transition-colors"
                          title="Criar nova categoria"
                        >
                          <Plus className="w-5 h-5" />
                        </button>
                      </div>
                      {!categoriaId && lancarCaixa && (
                        <p className="text-xs text-red-400 mt-1">Selecione uma categoria para continuar</p>
                      )}
                    </div>
                  </div>
                )}

                <label className="flex items-center gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={gerarContaPagar}
                    onChange={(e) => setGerarContaPagar(e.target.checked)}
                    className="w-5 h-5 rounded text-primary-500"
                  />
                  <div>
                    <span className="text-white font-medium">Gerar conta a pagar</span>
                    <p className="text-sm text-dark-400">Para pagamento futuro (boleto)</p>
                  </div>
                </label>

                {gerarContaPagar && (
                  <div className="ml-8">
                    <label className="block text-sm text-dark-300 mb-2">Data de Vencimento</label>
                    <input
                      type="date"
                      value={dataVencimento}
                      onChange={(e) => setDataVencimento(e.target.value)}
                      className="input w-full"
                    />
                  </div>
                )}
              </div>

              <div className="flex justify-between pt-4">
                <Button variant="secondary" onClick={() => setStep('produtos')}>
                  Voltar
                </Button>
                <Button 
                  onClick={() => {
                    // Validar categoria se lançar no caixa
                    if (lancarCaixa && !categoriaId) {
                      alert('Selecione uma categoria de despesa para lançar no caixa.')
                      return
                    }
                    setStep('confirmar')
                  }}
                >
                  Próximo
                </Button>
              </div>
            </div>
          )}

          {/* Step: Confirmar */}
          {step === 'confirmar' && dadosNF && (
            <div className="space-y-6">
              <div className="glass-card p-4">
                <h4 className="font-medium text-white mb-4">Resumo da Importação</h4>
                
                <div className="space-y-3 text-sm">
                  <div className="flex justify-between">
                    <span className="text-dark-400">Nota Fiscal</span>
                    <span className="text-white">{dadosNF.numero} / Série {dadosNF.serie}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-dark-400">Fornecedor</span>
                    <span className="text-white">{dadosNF.fornecedor.razaoSocial}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-dark-400">Valor Total</span>
                    <span className="text-white font-medium">{formatCurrency(dadosNF.valorTotal)}</span>
                  </div>
                  
                  <div className="border-t border-dark-700 pt-3 mt-3">
                    <p className="text-dark-400 mb-2">Produtos:</p>
                    <div className="space-y-1">
                      <p className="text-primary-400">
                        {dadosNF.produtos.length} itens serão processados automaticamente
                      </p>
                      <p className="text-xs text-dark-400">
                        (Existentes serão atualizados, novos serão criados)
                      </p>
                    </div>
                  </div>
                  
                  <div className="border-t border-dark-700 pt-3 mt-3">
                    <p className="text-dark-400 mb-2">Ações:</p>
                    <div className="space-y-1">
                      {lancarEstoque && <p className="text-white">✓ Lançar no estoque</p>}
                      {lancarCaixa && <p className="text-white">✓ Lançar no caixa ({formaPagamento})</p>}
                      {gerarContaPagar && <p className="text-white">✓ Gerar conta a pagar</p>}
                      {!fornecedorExistente && <p className="text-white">✓ Cadastrar fornecedor</p>}
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex justify-between pt-4">
                <Button variant="secondary" onClick={() => setStep('pagamento')}>
                  Voltar
                </Button>
                <Button onClick={processarImportacao} disabled={processing}>
                  {processing ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin mr-2" />
                      Processando...
                    </>
                  ) : (
                    'Confirmar Importação'
                  )}
                </Button>
              </div>
            </div>
          )}
        </div>
      </Modal>

      {/* Modal Confirmação Exclusão NF */}
      <Modal
        isOpen={isDeleteModalOpen}
        onClose={() => { setIsDeleteModalOpen(false); setSelectedNotaDelete(null); setDeleteResult(null) }}
        title="Excluir Nota Fiscal de Entrada"
        size="md"
      >
        <div className="space-y-4">
          {deleteResult ? (
            <div className={`p-4 rounded-lg border ${
              deleteResult.success 
                ? 'bg-green-500/10 border-green-500/30' 
                : 'bg-red-500/10 border-red-500/30'
            }`}>
              <div className="flex items-start gap-3">
                {deleteResult.success ? (
                  <CheckCircle className="w-5 h-5 text-green-400 mt-0.5" />
                ) : (
                  <AlertTriangle className="w-5 h-5 text-red-400 mt-0.5" />
                )}
                <div>
                  <p className={`font-medium ${deleteResult.success ? 'text-green-400' : 'text-red-400'}`}>
                    {deleteResult.success ? 'Exclusão realizada' : 'Erro na exclusão'}
                  </p>
                  <p className="text-dark-300 text-sm mt-1">{deleteResult.message}</p>
                </div>
              </div>
            </div>
          ) : (
            <>
              <div className="p-4 bg-yellow-500/10 border border-yellow-500/30 rounded-lg">
                <div className="flex items-start gap-3">
                  <AlertTriangle className="w-5 h-5 text-yellow-400 mt-0.5" />
                  <div>
                    <p className="text-yellow-400 font-medium">Atenção - Exclusão em Cascata</p>
                    <p className="text-dark-300 text-sm mt-1">
                      Ao excluir esta nota fiscal, os seguintes registros também serão removidos:
                    </p>
                    <ul className="text-dark-400 text-sm mt-2 list-disc list-inside space-y-1">
                      <li>Movimentações de estoque vinculadas (quantidade será estornada)</li>
                      <li>Lançamentos financeiros vinculados</li>
                      <li>Contas a pagar vinculadas</li>
                      <li>Itens da nota fiscal</li>
                    </ul>
                    <p className="text-dark-300 text-sm mt-3 font-medium">
                      Esta ação não pode ser desfeita.
                    </p>
                  </div>
                </div>
              </div>
              
              {selectedNotaDelete && (
                <div className="p-3 bg-dark-700 rounded-lg">
                  <div className="flex justify-between items-start">
                    <div>
                      <p className="text-white font-medium">NF {selectedNotaDelete.numero}</p>
                      <p className="text-dark-400 text-sm">{selectedNotaDelete.fornecedor_razao_social}</p>
                    </div>
                    <p className="text-lg font-bold text-white">{formatCurrency(selectedNotaDelete.valor_total)}</p>
                  </div>
                </div>
              )}
            </>
          )}
          
          <div className="flex justify-end gap-2 pt-2">
            <Button 
              variant="secondary" 
              onClick={() => { setIsDeleteModalOpen(false); setSelectedNotaDelete(null); setDeleteResult(null) }}
            >
              {deleteResult?.success ? 'Fechar' : 'Cancelar'}
            </Button>
            {!deleteResult && (
              <Button 
                variant="danger" 
                onClick={handleDeleteNota}
                isLoading={deleting}
              >
                Confirmar Exclusão
              </Button>
            )}
          </div>
        </div>
      </Modal>

      {/* Modais de Detalhes */}
      <FornecedorDetailModal 
        isOpen={fornecedorModalOpen} 
        onClose={() => setFornecedorModalOpen(false)} 
        fornecedorId={selectedFornecedorId} 
      />
      <ProdutoDetailModal 
        isOpen={produtoModalOpen} 
        onClose={() => setProdutoModalOpen(false)} 
        produtoId={selectedProdutoId} 
      />

      {/* Modal Nova Categoria (inline na importação) */}
      <Modal
        isOpen={isNovaCategoriaModalOpen}
        onClose={() => { setIsNovaCategoriaModalOpen(false); setNovaCategoriaName('') }}
        title="Nova Categoria de Despesa"
        size="sm"
      >
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-dark-300 mb-2">
              Nome da Categoria *
            </label>
            <input
              type="text"
              value={novaCategoriaName}
              onChange={(e) => setNovaCategoriaName(e.target.value)}
              placeholder="Ex: Despesa de Material"
              className="input w-full"
              autoFocus
            />
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-dark-700">
            <Button 
              variant="secondary" 
              onClick={() => { setIsNovaCategoriaModalOpen(false); setNovaCategoriaName('') }}
            >
              Cancelar
            </Button>
            <Button 
              onClick={async () => {
                if (!novaCategoriaName.trim()) {
                  alert('Nome é obrigatório')
                  return
                }
                setSavingCategoria(true)
                try {
                  const novaCategoria = await createCategoriaFinanceira({
                    nome: novaCategoriaName.trim(),
                    tipo: 'despesa',
                    ativo: true
                  })
                  // Atualizar lista e selecionar a nova categoria
                  const novasCategorias = await fetchCategoriasFinanceiras('despesa')
                  setCategorias(novasCategorias)
                  setCategoriaId(novaCategoria.id)
                  setIsNovaCategoriaModalOpen(false)
                  setNovaCategoriaName('')
                } catch (err) {
                  console.error('Erro ao criar categoria:', err)
                  alert('Erro ao criar categoria: ' + (err instanceof Error ? err.message : 'Erro desconhecido'))
                } finally {
                  setSavingCategoria(false)
                }
              }}
              disabled={savingCategoria}
            >
              {savingCategoria ? 'Criando...' : 'Criar e Selecionar'}
            </Button>
          </div>
        </div>
      </Modal>

      {/* Modal de Seleção de Lançamento para Reconciliação */}
      <Modal
        isOpen={showReconciliacaoModal}
        onClose={() => {
          setShowReconciliacaoModal(false)
          setCandidatosReconciliacao([])
          setPendingNFData(null)
        }}
        title="Lançamentos OFX Encontrados"
        size="lg"
      >
        <div className="space-y-4">
          <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-lg p-4">
            <div className="flex items-start gap-3">
              <AlertTriangle className="w-5 h-5 text-yellow-500 flex-shrink-0 mt-0.5" />
              <div>
                <h4 className="text-yellow-500 font-medium mb-1">Possíveis Duplicados</h4>
                <p className="text-dark-300 text-sm">
                  Encontramos lançamentos no caixa que podem ser o mesmo evento desta NF.
                  Selecione um para reconciliar (atualizar) ou crie um novo lançamento.
                </p>
              </div>
            </div>
          </div>

          {pendingNFData && (
            <div className="bg-dark-700 rounded-lg p-4">
              <h5 className="text-dark-300 text-sm mb-2">Dados da NF a importar:</h5>
              <p className="text-white font-medium">NF {pendingNFData.numero} - {pendingNFData.fornecedorNome}</p>
              <p className="text-primary-400 font-bold">{formatCurrency(dadosNF?.valorTotal || 0)}</p>
            </div>
          )}

          <div className="space-y-2 max-h-64 overflow-y-auto">
            {candidatosReconciliacao.map((candidato) => (
              <div 
                key={candidato.id}
                className={`p-4 rounded-lg border-2 cursor-pointer transition-all ${
                  reconciliacaoSelecionada === candidato.id 
                    ? 'bg-primary-500/20 border-primary-500' 
                    : 'bg-dark-700 border-dark-600 hover:border-dark-500'
                }`}
                onClick={() => setReconciliacaoSelecionada(candidato.id)}
              >
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-white font-medium">{formatCurrency(candidato.valor)}</span>
                      <span className="text-dark-400">•</span>
                      <span className="text-dark-300 text-sm">{formatDate(candidato.data_lancamento)}</span>
                      {candidato.ofx_fitid && (
                        <Badge variant="secondary" size="sm">OFX</Badge>
                      )}
                    </div>
                    <p className="text-dark-300 text-sm truncate">{candidato.descricao}</p>
                    <p className="text-dark-500 text-xs mt-1">
                      Similaridade: {Math.round(candidato.score * 100)}% | 
                      Diferença: {candidato.diferencaDias} dia(s)
                    </p>
                  </div>
                  <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                    reconciliacaoSelecionada === candidato.id 
                      ? 'border-primary-500 bg-primary-500' 
                      : 'border-dark-500'
                  }`}>
                    {reconciliacaoSelecionada === candidato.id && (
                      <CheckCircle className="w-4 h-4 text-white" />
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div className="flex gap-3 pt-4 border-t border-dark-700">
            <Button
              variant="secondary"
              className="flex-1"
              onClick={() => handleReconciliacaoSelecionada(null)}
              disabled={processing}
            >
              Criar Novo Lançamento
            </Button>
            <Button
              className="flex-1"
              onClick={() => {
                if (reconciliacaoSelecionada) {
                  handleReconciliacaoSelecionada(reconciliacaoSelecionada)
                }
              }}
              disabled={!reconciliacaoSelecionada || processing}
            >
              {processing ? 'Processando...' : 'Reconciliar Selecionado'}
            </Button>
          </div>
        </div>
      </Modal>

      {/* Modal Ver Produtos da Nota */}
      <Modal
        isOpen={showProdutosNotaModal}
        onClose={closeProdutosNotaModal}
        title={`Produtos da NF ${notaSelecionadaParaProdutos?.numero || ''}`}
        size="lg"
      >
        <div className="space-y-4">
          {/* Info da Nota */}
          {notaSelecionadaParaProdutos && (
            <div className="glass-card p-4 mb-4">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                <div>
                  <p className="text-dark-400">Fornecedor</p>
                  <p className="text-white font-medium">{notaSelecionadaParaProdutos.fornecedor_razao_social}</p>
                </div>
                <div>
                  <p className="text-dark-400">Data Entrada</p>
                  <p className="text-white">{formatDate(notaSelecionadaParaProdutos.data_entrada)}</p>
                </div>
                <div>
                  <p className="text-dark-400">Valor Total</p>
                  <p className="text-white font-medium">{formatCurrency(notaSelecionadaParaProdutos.valor_total)}</p>
                </div>
                <div>
                  <p className="text-dark-400">Qtd Produtos</p>
                  <p className="text-white font-medium">{produtosNotaSelecionada.length} itens</p>
                </div>
              </div>
            </div>
          )}

          {/* Lista de Produtos */}
          {loadingProdutosNota ? (
            <div className="flex justify-center py-8">
              <LoadingSpinner size="lg" />
            </div>
          ) : produtosNotaSelecionada.length === 0 ? (
            <div className="text-center py-8 text-dark-400">
              Nenhum produto encontrado nesta nota
            </div>
          ) : (
            <div className="space-y-2 max-h-96 overflow-y-auto">
              {produtosNotaSelecionada.map((item, index) => (
                <div key={item.id || index} className="glass-card p-3 hover:bg-dark-700/50 transition-colors">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-xs text-dark-400">#{item.codigo_produto_nf}</span>
                        <span className="font-medium text-white text-sm">{item.descricao}</span>
                        {item.acao === 'cadastrado' && (
                          <Badge variant="warning" className="text-xs">Novo</Badge>
                        )}
                      </div>
                      
                      {/* Produto vinculado */}
                      {item.produto && (
                        <button
                          onClick={() => {
                            setSelectedProdutoId(item.produto_id)
                            setProdutoModalOpen(true)
                          }}
                          className="text-xs text-primary-400 hover:text-primary-300 transition-colors mb-1 block"
                        >
                          → {(item.produto as any).nome} (Cód: {(item.produto as any).codigo || 'N/A'})
                        </button>
                      )}
                      
                      <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-dark-400">
                        <span>NCM: {item.ncm || '-'}</span>
                        <span>CFOP: {item.cfop || '-'}</span>
                        <span className="text-primary-400 font-medium">
                          Qtd: {item.quantidade} {item.unidade}
                        </span>
                        <span>Custo Unit: {formatCurrency(item.valor_unitario)}</span>
                      </div>
                    </div>
                    
                    <div className="text-right">
                      <p className="text-lg font-bold text-primary-400">
                        {formatCurrency(item.valor_total)}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Totalizador */}
          {produtosNotaSelecionada.length > 0 && (
            <div className="border-t border-dark-700 pt-4 mt-4">
              <div className="flex justify-between items-center">
                <span className="text-dark-400">Total dos Produtos:</span>
                <span className="text-xl font-bold text-white">
                  {formatCurrency(produtosNotaSelecionada.reduce((acc, item) => acc + (item.valor_total || 0), 0))}
                </span>
              </div>
            </div>
          )}

          <div className="flex justify-end pt-4">
            <Button variant="secondary" onClick={closeProdutosNotaModal}>
              Fechar
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  )
}
