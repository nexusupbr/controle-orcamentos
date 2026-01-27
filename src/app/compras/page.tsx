'use client'

import { useEffect, useState, useRef } from 'react'
import { 
  Plus, Upload, FileText, Search, Package, CheckCircle, 
  XCircle, RefreshCw, Eye, DollarSign, Truck, Building2,
  AlertTriangle, ChevronDown, ChevronUp
} from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Modal } from '@/components/ui/Modal'
import { LoadingSpinner, EmptyState, Badge } from '@/components/ui/Common'
import { 
  NotaFiscalEntrada, ItemNotaEntrada, Produto, Fornecedor, CategoriaFinanceira,
  fetchNotasFiscaisEntrada, createNotaFiscalEntrada, createItemNotaEntrada,
  fetchProdutos, createProduto, updateProduto, fetchProdutoByNome, fetchProdutoByCodigo,
  fetchFornecedores, createFornecedor, fetchFornecedorByCnpj,
  fetchCategoriasFinanceiras, createLancamentoFinanceiro, createContaPagar,
  createMovimentacaoEstoque
} from '@/lib/database'
import { formatCurrency, formatDate } from '@/lib/utils'

interface ProdutoNF {
  codigo: string
  descricao: string
  ncm: string
  cfop: string
  unidade: string
  quantidade: number
  valorUnitario: number
  valorTotal: number
  produtoExistente?: Produto | null
  acao: 'cadastrar' | 'nao' | 'substituir'
  produtoSubstituirId?: number
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
  const [margem, setMargem] = useState<number>(30)
  
  const fileInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    loadData()
  }, [])

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
    } catch (err) {
      console.error('Erro ao carregar dados:', err)
    } finally {
      setLoading(false)
    }
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
            unidade: prod.querySelector('uCom')?.textContent || 'UN',
            quantidade: parseFloat(prod.querySelector('qCom')?.textContent || '0'),
            valorUnitario: parseFloat(prod.querySelector('vUnCom')?.textContent || '0'),
            valorTotal: parseFloat(prod.querySelector('vProd')?.textContent || '0'),
            acao: 'cadastrar',
            produtoExistente: null
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
        // Verificar produtos existentes
        for (const prod of dados.produtos) {
          // Tentar encontrar por código ou nome
          let existente = await fetchProdutoByCodigo(prod.codigo)
          if (!existente) {
            existente = await fetchProdutoByNome(prod.descricao)
          }
          prod.produtoExistente = existente
          prod.acao = existente ? 'nao' : 'cadastrar'
        }
        
        // Verificar fornecedor
        const fornecedor = await fetchFornecedorByCnpj(dados.fornecedor.cnpj)
        setFornecedorExistente(fornecedor)
        
        setDadosNF(dados)
        setStep('produtos')
      } else {
        alert('Erro ao processar XML. Verifique se o arquivo é válido.')
      }
    }
    reader.readAsText(file)
  }

  // Atualizar ação do produto
  const updateProdutoAcao = (index: number, acao: 'cadastrar' | 'nao' | 'substituir', produtoId?: number) => {
    if (!dadosNF) return
    
    const novosProdutos = [...dadosNF.produtos]
    novosProdutos[index].acao = acao
    novosProdutos[index].produtoSubstituirId = produtoId
    
    setDadosNF({ ...dadosNF, produtos: novosProdutos })
  }

  // Processar importação
  const processarImportacao = async () => {
    if (!dadosNF) return
    
    setProcessing(true)
    
    try {
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

      // 3. Processar cada produto
      for (const prod of dadosNF.produtos) {
        let produtoId: number | undefined
        
        if (prod.acao === 'cadastrar') {
          // Cadastrar novo produto
          const valorVenda = prod.valorUnitario * (1 + margem / 100)
          const novoProduto = await createProduto({
            codigo: prod.codigo,
            nome: prod.descricao,
            ncm: prod.ncm,
            cfop: prod.cfop,
            unidade: prod.unidade,
            valor_custo: prod.valorUnitario,
            valor_venda: valorVenda,
            custo_medio: prod.valorUnitario,
            custo_ultima_compra: prod.valorUnitario,
            margem_lucro: margem,
            quantidade_estoque: lancarEstoque ? prod.quantidade : 0,
            fornecedor_id: fornecedorId,
            classificacao_fiscal: '07',
            ativo: true
          })
          produtoId = novoProduto.id
        } else if (prod.acao === 'substituir' && prod.produtoSubstituirId) {
          // Atualizar produto existente
          await updateProduto(prod.produtoSubstituirId, {
            codigo: prod.codigo,
            valor_custo: prod.valorUnitario,
            custo_ultima_compra: prod.valorUnitario,
          })
          produtoId = prod.produtoSubstituirId
        } else if (prod.produtoExistente) {
          produtoId = prod.produtoExistente.id
        }

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
          acao: prod.acao === 'cadastrar' ? 'cadastrado' : 
                prod.acao === 'substituir' ? 'substituido' : 'existente'
        })

        // Lançar movimentação de estoque
        if (lancarEstoque && produtoId) {
          await createMovimentacaoEstoque({
            produto_id: produtoId,
            tipo: 'entrada',
            quantidade: prod.quantidade,
            valor_unitario: prod.valorUnitario,
            valor_total: prod.valorTotal,
            nota_fiscal_id: nota.id,
            motivo: `Entrada NF ${dadosNF.numero}`,
            data_movimentacao: new Date().toISOString()
          })
        }
      }

      // 4. Lançar no caixa (se solicitado)
      if (lancarCaixa && categoriaId) {
        await createLancamentoFinanceiro({
          tipo: 'despesa',
          categoria_id: categoriaId,
          valor: dadosNF.valorTotal,
          data_lancamento: new Date().toISOString().split('T')[0],
          forma_pagamento: formaPagamento as any,
          fornecedor_id: fornecedorId,
          nota_fiscal_entrada_id: nota.id,
          descricao: `NF ${dadosNF.numero} - ${dadosNF.fornecedor.razaoSocial}`,
          com_nota_fiscal: true,
          conciliado: false
        })
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

      await loadData()
      closeImportModal()
      alert('Nota fiscal importada com sucesso!')
      
    } catch (err) {
      console.error('Erro ao processar importação:', err)
      alert('Erro ao processar importação: ' + (err instanceof Error ? err.message : 'Erro desconhecido'))
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
    setMargem(30)
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
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
                      <p className="text-sm text-dark-400">{nota.fornecedor_razao_social}</p>
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
                    <div className="flex gap-2 mt-4">
                      <Badge variant={nota.lancado_caixa ? 'success' : 'secondary'}>
                        {nota.lancado_caixa ? 'Lançado no Caixa' : 'Não lançado'}
                      </Badge>
                      {nota.forma_pagamento && (
                        <Badge variant="primary">
                          {formasPagamento.find(f => f.value === nota.forma_pagamento)?.label || nota.forma_pagamento}
                        </Badge>
                      )}
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
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-dark-400">Margem padrão:</span>
                    <input
                      type="number"
                      value={margem}
                      onChange={(e) => setMargem(Number(e.target.value))}
                      className="input w-20 text-center"
                    />
                    <span className="text-dark-400">%</span>
                  </div>
                </div>
                
                <div className="space-y-2 max-h-64 overflow-y-auto">
                  {dadosNF.produtos.map((prod, index) => (
                    <div key={index} className="glass-card p-3">
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="text-xs text-dark-400">#{prod.codigo}</span>
                            <span className="font-medium text-white text-sm">{prod.descricao}</span>
                          </div>
                          <div className="flex gap-4 text-xs text-dark-400">
                            <span>NCM: {prod.ncm}</span>
                            <span>Qtd: {prod.quantidade} {prod.unidade}</span>
                            <span>Unit: {formatCurrency(prod.valorUnitario)}</span>
                            <span className="text-primary-400 font-medium">Total: {formatCurrency(prod.valorTotal)}</span>
                          </div>
                        </div>
                        
                        <div className="flex flex-col gap-1">
                          {prod.produtoExistente ? (
                            <>
                              <Badge variant="success" className="text-xs">Produto existente</Badge>
                              <div className="flex gap-1">
                                <label className="flex items-center gap-1 text-xs cursor-pointer">
                                  <input
                                    type="radio"
                                    name={`acao-${index}`}
                                    checked={prod.acao === 'nao'}
                                    onChange={() => updateProdutoAcao(index, 'nao')}
                                    className="text-primary-500"
                                  />
                                  <span className="text-dark-300">Não adicionar</span>
                                </label>
                                <label className="flex items-center gap-1 text-xs cursor-pointer">
                                  <input
                                    type="radio"
                                    name={`acao-${index}`}
                                    checked={prod.acao === 'substituir'}
                                    onChange={() => updateProdutoAcao(index, 'substituir', prod.produtoExistente?.id)}
                                    className="text-primary-500"
                                  />
                                  <span className="text-dark-300">Substituir</span>
                                </label>
                              </div>
                            </>
                          ) : (
                            <>
                              <Badge variant="warning" className="text-xs">Novo produto</Badge>
                              <div className="flex gap-1">
                                <label className="flex items-center gap-1 text-xs cursor-pointer">
                                  <input
                                    type="radio"
                                    name={`acao-${index}`}
                                    checked={prod.acao === 'cadastrar'}
                                    onChange={() => updateProdutoAcao(index, 'cadastrar')}
                                    className="text-primary-500"
                                  />
                                  <span className="text-dark-300">Cadastrar</span>
                                </label>
                                <label className="flex items-center gap-1 text-xs cursor-pointer">
                                  <input
                                    type="radio"
                                    name={`acao-${index}`}
                                    checked={prod.acao === 'nao'}
                                    onChange={() => updateProdutoAcao(index, 'nao')}
                                    className="text-primary-500"
                                  />
                                  <span className="text-dark-300">Não</span>
                                </label>
                              </div>
                            </>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex justify-between pt-4">
                <Button variant="secondary" onClick={() => setStep('upload')}>
                  Voltar
                </Button>
                <Button onClick={() => setStep('pagamento')}>
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
                      <label className="block text-sm text-dark-300 mb-2">Categoria</label>
                      <select
                        value={categoriaId || ''}
                        onChange={(e) => setCategoriaId(Number(e.target.value))}
                        className="input w-full"
                      >
                        <option value="">Selecione...</option>
                        {categorias.map(c => (
                          <option key={c.id} value={c.id}>{c.nome}</option>
                        ))}
                      </select>
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
                <Button onClick={() => setStep('confirmar')}>
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
                      <p className="text-green-400">
                        {dadosNF.produtos.filter(p => p.acao === 'cadastrar').length} serão cadastrados
                      </p>
                      <p className="text-blue-400">
                        {dadosNF.produtos.filter(p => p.acao === 'substituir').length} serão substituídos
                      </p>
                      <p className="text-dark-300">
                        {dadosNF.produtos.filter(p => p.acao === 'nao').length} não serão adicionados
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
    </div>
  )
}
