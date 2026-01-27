'use client'

import { useState, useEffect } from 'react'
import { 
  Plus, Search, FileText, Upload, Download, Eye, Trash2,
  CheckCircle, XCircle, AlertTriangle, Building2, Package,
  Calendar, DollarSign, Truck, ArrowUpRight, ArrowDownLeft,
  Filter, RefreshCw
} from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { 
  LoadingSpinner, EmptyState, Badge 
} from '@/components/ui/Common'
import { Modal } from '@/components/ui/Modal'
import { 
  fetchNotasFiscaisEntrada, fetchFornecedores, fetchProdutos,
  createNotaFiscalEntrada, createFornecedor, createProduto,
  createMovimentacaoEstoque, createContaPagar,
  NotaFiscalEntrada, Fornecedor, Produto
} from '@/lib/database'
import { formatCurrency, formatDate, cn } from '@/lib/utils'

interface ItemNF {
  codigo_produto_nf: string
  descricao: string
  ncm: string
  cfop: string
  unidade: string
  quantidade: number
  valor_unitario: number
  valor_total: number
  valor_desconto: number
  produto_id?: number
  acao: 'cadastrado' | 'existente' | 'substituido' | 'ignorado'
  produtoExistente?: Produto
}

interface NFData {
  numero: string
  serie: string
  chave_acesso: string
  data_emissao: string
  fornecedor: {
    cnpj: string
    razao_social: string
    nome_fantasia?: string
    endereco?: string
    cidade?: string
    estado?: string
  }
  itens: ItemNF[]
  valor_produtos: number
  valor_frete: number
  valor_seguro: number
  valor_desconto: number
  valor_ipi: number
  valor_icms: number
  valor_pis: number
  valor_cofins: number
  valor_total: number
  forma_pagamento?: string
}

export default function NotasFiscaisPage() {
  const [loading, setLoading] = useState(true)
  const [notas, setNotas] = useState<NotaFiscalEntrada[]>([])
  const [fornecedores, setFornecedores] = useState<Fornecedor[]>([])
  const [produtos, setProdutos] = useState<Produto[]>([])
  const [searchTerm, setSearchTerm] = useState('')
  const [filterTipo, setFilterTipo] = useState<'entrada' | 'saida' | 'todos'>('todos')
  const [activeTab, setActiveTab] = useState<'entrada' | 'saida'>('entrada')
  
  // Modal de importação XML
  const [isImportModalOpen, setIsImportModalOpen] = useState(false)
  const [xmlData, setXmlData] = useState<NFData | null>(null)
  const [importing, setImporting] = useState(false)
  const [importStep, setImportStep] = useState<'upload' | 'review' | 'confirm'>('upload')

  // Modal de visualização
  const [isViewModalOpen, setIsViewModalOpen] = useState(false)
  const [selectedNota, setSelectedNota] = useState<NotaFiscalEntrada | null>(null)

  // Opções para itens
  const [itemOptions, setItemOptions] = useState<Record<number, 'cadastrar' | 'substituir' | 'ignorar'>>({})
  const [itemSubstituicao, setItemSubstituicao] = useState<Record<number, number>>({})

  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    try {
      setLoading(true)
      const [notasData, fornecedoresData, produtosData] = await Promise.all([
        fetchNotasFiscaisEntrada(),
        fetchFornecedores(),
        fetchProdutos()
      ])
      setNotas(notasData)
      setFornecedores(fornecedoresData)
      setProdutos(produtosData)
    } catch (error) {
      console.error('Erro ao carregar dados:', error)
    } finally {
      setLoading(false)
    }
  }

  // Parse XML da NFe
  const parseNFeXML = (xmlString: string): NFData | null => {
    try {
      const parser = new DOMParser()
      const xml = parser.parseFromString(xmlString, 'text/xml')
      
      const getTagValue = (parent: Element | Document, tagName: string): string => {
        const element = parent.getElementsByTagName(tagName)[0]
        return element?.textContent || ''
      }

      const nfe = xml.getElementsByTagName('NFe')[0] || xml.getElementsByTagName('nfeProc')[0]
      if (!nfe) {
        throw new Error('XML inválido - não é uma NFe')
      }

      const infNFe = nfe.getElementsByTagName('infNFe')[0]
      const ide = infNFe.getElementsByTagName('ide')[0]
      const emit = infNFe.getElementsByTagName('emit')[0]
      const total = infNFe.getElementsByTagName('total')[0]
      const ICMSTot = total.getElementsByTagName('ICMSTot')[0]

      // Dados do emitente (fornecedor)
      const enderEmit = emit.getElementsByTagName('enderEmit')[0]
      const fornecedor = {
        cnpj: getTagValue(emit, 'CNPJ'),
        razao_social: getTagValue(emit, 'xNome'),
        nome_fantasia: getTagValue(emit, 'xFant'),
        endereco: `${getTagValue(enderEmit, 'xLgr')}, ${getTagValue(enderEmit, 'nro')}`,
        cidade: getTagValue(enderEmit, 'xMun'),
        estado: getTagValue(enderEmit, 'UF')
      }

      // Itens
      const dets = infNFe.getElementsByTagName('det')
      const itens: ItemNF[] = []
      
      for (let i = 0; i < dets.length; i++) {
        const det = dets[i]
        const prod = det.getElementsByTagName('prod')[0]
        
        const item: ItemNF = {
          codigo_produto_nf: getTagValue(prod, 'cProd'),
          descricao: getTagValue(prod, 'xProd'),
          ncm: getTagValue(prod, 'NCM'),
          cfop: getTagValue(prod, 'CFOP'),
          unidade: getTagValue(prod, 'uCom'),
          quantidade: parseFloat(getTagValue(prod, 'qCom')) || 0,
          valor_unitario: parseFloat(getTagValue(prod, 'vUnCom')) || 0,
          valor_total: parseFloat(getTagValue(prod, 'vProd')) || 0,
          valor_desconto: parseFloat(getTagValue(prod, 'vDesc')) || 0,
          acao: 'cadastrado'
        }

        // Verificar se produto já existe
        const produtoExistente = produtos.find(p => 
          p.nome.toLowerCase() === item.descricao.toLowerCase() ||
          p.codigo === item.codigo_produto_nf ||
          p.codigo_barras === getTagValue(prod, 'cEAN')
        )

        if (produtoExistente) {
          item.acao = 'existente'
          item.produto_id = produtoExistente.id
          item.produtoExistente = produtoExistente
        }

        itens.push(item)
      }

      // Forma de pagamento
      const pag = infNFe.getElementsByTagName('pag')[0]
      const detPag = pag?.getElementsByTagName('detPag')[0]
      const tPag = detPag ? getTagValue(detPag, 'tPag') : ''
      const formasPagamento: Record<string, string> = {
        '01': 'dinheiro',
        '02': 'cheque',
        '03': 'credito',
        '04': 'debito',
        '05': 'credito_loja',
        '10': 'vale_alimentacao',
        '11': 'vale_refeicao',
        '12': 'vale_presente',
        '13': 'vale_combustivel',
        '14': 'duplicata',
        '15': 'boleto',
        '16': 'deposito',
        '17': 'pix',
        '18': 'transferencia',
        '19': 'cashback',
        '90': 'sem_pagamento',
        '99': 'outros'
      }

      return {
        numero: getTagValue(ide, 'nNF'),
        serie: getTagValue(ide, 'serie'),
        chave_acesso: infNFe.getAttribute('Id')?.replace('NFe', '') || '',
        data_emissao: getTagValue(ide, 'dhEmi').split('T')[0],
        fornecedor,
        itens,
        valor_produtos: parseFloat(getTagValue(ICMSTot, 'vProd')) || 0,
        valor_frete: parseFloat(getTagValue(ICMSTot, 'vFrete')) || 0,
        valor_seguro: parseFloat(getTagValue(ICMSTot, 'vSeg')) || 0,
        valor_desconto: parseFloat(getTagValue(ICMSTot, 'vDesc')) || 0,
        valor_ipi: parseFloat(getTagValue(ICMSTot, 'vIPI')) || 0,
        valor_icms: parseFloat(getTagValue(ICMSTot, 'vICMS')) || 0,
        valor_pis: parseFloat(getTagValue(ICMSTot, 'vPIS')) || 0,
        valor_cofins: parseFloat(getTagValue(ICMSTot, 'vCOFINS')) || 0,
        valor_total: parseFloat(getTagValue(ICMSTot, 'vNF')) || 0,
        forma_pagamento: formasPagamento[tPag] || 'outros'
      }
    } catch (error) {
      console.error('Erro ao parsear XML:', error)
      return null
    }
  }

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    const reader = new FileReader()
    reader.onload = (event) => {
      const xmlString = event.target?.result as string
      const parsed = parseNFeXML(xmlString)
      
      if (parsed) {
        setXmlData(parsed)
        setImportStep('review')
        
        // Inicializar opções dos itens
        const options: Record<number, 'cadastrar' | 'substituir' | 'ignorar'> = {}
        parsed.itens.forEach((item, index) => {
          if (item.acao === 'existente') {
            options[index] = 'substituir'
          } else {
            options[index] = 'cadastrar'
          }
        })
        setItemOptions(options)
      } else {
        alert('Erro ao processar o XML. Verifique se é uma NFe válida.')
      }
    }
    reader.readAsText(file)
  }

  const handleImportNF = async () => {
    if (!xmlData) return

    setImporting(true)
    try {
      // 1. Verificar/Criar fornecedor
      let fornecedor = fornecedores.find(f => f.cnpj === xmlData.fornecedor.cnpj)
      
      if (!fornecedor) {
        fornecedor = await createFornecedor({
          razao_social: xmlData.fornecedor.razao_social,
          nome_fantasia: xmlData.fornecedor.nome_fantasia,
          cnpj: xmlData.fornecedor.cnpj,
          endereco: xmlData.fornecedor.endereco,
          cidade: xmlData.fornecedor.cidade,
          estado: xmlData.fornecedor.estado,
          ativo: true
        })
      }

      // 2. Processar itens
      const itensProcessados = []
      for (let i = 0; i < xmlData.itens.length; i++) {
        const item = xmlData.itens[i]
        const acao = itemOptions[i]
        let produtoId = item.produto_id

        if (acao === 'cadastrar') {
          // Criar novo produto
          const novoProduto = await createProduto({
            codigo: item.codigo_produto_nf,
            nome: item.descricao,
            ncm: item.ncm,
            cfop: item.cfop,
            unidade: item.unidade,
            valor_custo: item.valor_unitario,
            custo_ultima_compra: item.valor_unitario,
            fornecedor_id: fornecedor.id,
            ativo: true
          })
          produtoId = novoProduto.id

          // Criar movimentação de entrada
          await createMovimentacaoEstoque({
            produto_id: novoProduto.id,
            tipo: 'entrada',
            quantidade: item.quantidade,
            valor_unitario: item.valor_unitario,
            valor_total: item.valor_total,
            motivo: `NF ${xmlData.numero}`,
            observacao: `Entrada via XML - NF ${xmlData.numero}`
          })
        } else if (acao === 'substituir' && item.produto_id) {
          // Atualizar estoque do produto existente
          await createMovimentacaoEstoque({
            produto_id: item.produto_id,
            tipo: 'entrada',
            quantidade: item.quantidade,
            valor_unitario: item.valor_unitario,
            valor_total: item.valor_total,
            motivo: `NF ${xmlData.numero}`,
            observacao: `Entrada via XML - NF ${xmlData.numero}`
          })
        }
        // Se acao === 'ignorar', não faz nada

        itensProcessados.push({
          produto_id: produtoId,
          codigo_produto_nf: item.codigo_produto_nf,
          descricao: item.descricao,
          ncm: item.ncm,
          cfop: item.cfop,
          unidade: item.unidade,
          quantidade: item.quantidade,
          valor_unitario: item.valor_unitario,
          valor_total: item.valor_total,
          valor_desconto: item.valor_desconto,
          acao: acao === 'cadastrar' ? 'cadastrado' : acao === 'substituir' ? 'existente' : 'ignorado'
        })
      }

      // 3. Criar nota fiscal de entrada
      const notaFiscal = await createNotaFiscalEntrada({
        numero: xmlData.numero,
        serie: xmlData.serie,
        chave_acesso: xmlData.chave_acesso,
        data_emissao: xmlData.data_emissao,
        fornecedor_id: fornecedor.id,
        fornecedor_cnpj: xmlData.fornecedor.cnpj,
        fornecedor_razao_social: xmlData.fornecedor.razao_social,
        valor_produtos: xmlData.valor_produtos,
        valor_frete: xmlData.valor_frete,
        valor_seguro: xmlData.valor_seguro,
        valor_desconto: xmlData.valor_desconto,
        valor_ipi: xmlData.valor_ipi,
        valor_icms: xmlData.valor_icms,
        valor_pis: xmlData.valor_pis,
        valor_cofins: xmlData.valor_cofins,
        valor_total: xmlData.valor_total,
        forma_pagamento: xmlData.forma_pagamento,
        status: 'processada'
      }, itensProcessados)

      // 4. Criar conta a pagar
      await createContaPagar({
        fornecedor_id: fornecedor.id,
        descricao: `NF ${xmlData.numero} - ${xmlData.fornecedor.razao_social}`,
        valor: xmlData.valor_total,
        data_vencimento: new Date(new Date(xmlData.data_emissao).getTime() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        nota_fiscal_id: notaFiscal.id,
        status: 'pendente',
        com_nota_fiscal: true
      })

      await loadData()
      setIsImportModalOpen(false)
      setXmlData(null)
      setImportStep('upload')
      alert('Nota fiscal importada com sucesso!')
    } catch (error) {
      console.error('Erro ao importar NF:', error)
      alert('Erro ao importar nota fiscal')
    } finally {
      setImporting(false)
    }
  }

  const openViewNota = (nota: NotaFiscalEntrada) => {
    setSelectedNota(nota)
    setIsViewModalOpen(true)
  }

  const filteredNotas = notas.filter(n => {
    const matchSearch = 
      n.numero?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      n.fornecedor_razao_social?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      n.chave_acesso?.includes(searchTerm)
    
    return matchSearch
  })

  // KPIs
  const totalNotas = notas.length
  const valorTotalNotas = notas.reduce((acc, n) => acc + (n.valor_total || 0), 0)
  const notasHoje = notas.filter(n => n.data_entrada === new Date().toISOString().split('T')[0]).length

  const tabs = [
    { id: 'entrada', label: 'NF Entrada', icon: ArrowDownLeft },
    { id: 'saida', label: 'NF Saída', icon: ArrowUpRight },
  ]

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
            Notas Fiscais
          </h1>
          <p className="text-dark-400 mt-1">
            Gerencie notas fiscais de entrada e saída
          </p>
        </div>
        <div className="flex gap-2">
          <Button 
            variant="secondary"
            onClick={() => {
              setImportStep('upload')
              setXmlData(null)
              setIsImportModalOpen(true)
            }}
            leftIcon={<Upload className="w-4 h-4" />}
          >
            Importar XML
          </Button>
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="glass-card p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-primary-500/20">
              <FileText className="w-5 h-5 text-primary-400" />
            </div>
            <div>
              <p className="text-dark-400 text-sm">Total de Notas</p>
              <p className="text-xl font-bold text-white">{totalNotas}</p>
            </div>
          </div>
        </div>
        <div className="glass-card p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-green-500/20">
              <DollarSign className="w-5 h-5 text-green-400" />
            </div>
            <div>
              <p className="text-dark-400 text-sm">Valor Total</p>
              <p className="text-xl font-bold text-green-400">{formatCurrency(valorTotalNotas)}</p>
            </div>
          </div>
        </div>
        <div className="glass-card p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-blue-500/20">
              <Calendar className="w-5 h-5 text-blue-400" />
            </div>
            <div>
              <p className="text-dark-400 text-sm">Notas Hoje</p>
              <p className="text-xl font-bold text-blue-400">{notasHoje}</p>
            </div>
          </div>
        </div>
        <div className="glass-card p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-purple-500/20">
              <Package className="w-5 h-5 text-purple-400" />
            </div>
            <div>
              <p className="text-dark-400 text-sm">Produtos Cadastrados</p>
              <p className="text-xl font-bold text-purple-400">{produtos.length}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 border-b border-dark-600 pb-2">
        {tabs.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as 'entrada' | 'saida')}
            className={cn(
              'flex items-center gap-2 px-4 py-2 rounded-t-lg transition-colors',
              activeTab === tab.id
                ? 'bg-primary-500 text-white'
                : 'text-dark-400 hover:text-white hover:bg-dark-700'
            )}
          >
            <tab.icon className="w-4 h-4" />
            {tab.label}
          </button>
        ))}
      </div>

      {/* Filtros */}
      <div className="glass-card p-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="relative md:col-span-2">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-dark-400" />
            <input
              type="text"
              placeholder="Buscar por número, fornecedor ou chave..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="input pl-12 w-full"
            />
          </div>
          <Button variant="secondary" leftIcon={<RefreshCw className="w-4 h-4" />} onClick={loadData}>
            Atualizar
          </Button>
        </div>
      </div>

      {/* Lista de Notas */}
      {activeTab === 'entrada' && (
        <div className="glass-card overflow-hidden">
          {filteredNotas.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Número</th>
                    <th>Data</th>
                    <th>Fornecedor</th>
                    <th className="text-right">Valor</th>
                    <th>Status</th>
                    <th className="text-right">Ações</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredNotas.map((nota) => (
                    <tr key={nota.id} className="group">
                      <td>
                        <div>
                          <span className="font-medium text-white">{nota.numero}</span>
                          <span className="text-dark-400 text-sm block">
                            Série {nota.serie}
                          </span>
                        </div>
                      </td>
                      <td className="text-dark-300">
                        {formatDate(nota.data_emissao || '')}
                      </td>
                      <td>
                        <div>
                          <span className="text-white">{nota.fornecedor_razao_social}</span>
                          <span className="text-dark-400 text-sm block">
                            {nota.fornecedor_cnpj}
                          </span>
                        </div>
                      </td>
                      <td className="text-right font-medium text-white">
                        {formatCurrency(nota.valor_total || 0)}
                      </td>
                      <td>
                        <Badge variant={nota.status === 'processada' ? 'success' : 'warning'}>
                          {nota.status === 'processada' ? 'Processada' : 'Pendente'}
                        </Badge>
                      </td>
                      <td>
                        <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button
                            onClick={() => openViewNota(nota)}
                            className="p-2 hover:bg-dark-600 rounded-lg transition-colors"
                            title="Visualizar"
                          >
                            <Eye className="w-4 h-4 text-dark-400" />
                          </button>
                          <button
                            className="p-2 hover:bg-dark-600 rounded-lg transition-colors"
                            title="Download XML"
                          >
                            <Download className="w-4 h-4 text-dark-400" />
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
              icon={<FileText className="w-10 h-10 text-dark-500" />}
              title="Nenhuma nota fiscal encontrada"
              description="Importe XMLs de notas fiscais para começar"
              action={
                <Button 
                  onClick={() => {
                    setImportStep('upload')
                    setXmlData(null)
                    setIsImportModalOpen(true)
                  }}
                  leftIcon={<Upload className="w-4 h-4" />}
                >
                  Importar XML
                </Button>
              }
            />
          )}
        </div>
      )}

      {activeTab === 'saida' && (
        <div className="glass-card p-8">
          <EmptyState
            icon={<ArrowUpRight className="w-10 h-10 text-dark-500" />}
            title="Notas Fiscais de Saída"
            description="As notas fiscais de saída são geradas a partir das vendas. Vá em Vendas para emitir NF."
          />
        </div>
      )}

      {/* Modal Importar XML */}
      <Modal
        isOpen={isImportModalOpen}
        onClose={() => setIsImportModalOpen(false)}
        title="Importar Nota Fiscal (XML)"
        size="xl"
      >
        {importStep === 'upload' && (
          <div className="space-y-6">
            <div className="border-2 border-dashed border-dark-500 rounded-lg p-8 text-center">
              <Upload className="w-12 h-12 text-dark-400 mx-auto mb-4" />
              <p className="text-white font-medium mb-2">Arraste o arquivo XML ou clique para selecionar</p>
              <p className="text-dark-400 text-sm mb-4">Suporte para NFe (Nota Fiscal Eletrônica)</p>
              <input
                type="file"
                accept=".xml"
                onChange={handleFileUpload}
                className="hidden"
                id="xml-upload"
              />
              <label htmlFor="xml-upload">
                <span className="btn btn-primary cursor-pointer">
                  Selecionar Arquivo
                </span>
              </label>
            </div>
          </div>
        )}

        {importStep === 'review' && xmlData && (
          <div className="space-y-6 max-h-[70vh] overflow-y-auto">
            {/* Dados da NF */}
            <div className="glass-card p-4 bg-dark-700/50">
              <h3 className="text-white font-medium mb-3 flex items-center gap-2">
                <FileText className="w-5 h-5" />
                Dados da Nota Fiscal
              </h3>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div>
                  <p className="text-dark-400 text-sm">Número</p>
                  <p className="text-white font-medium">{xmlData.numero}</p>
                </div>
                <div>
                  <p className="text-dark-400 text-sm">Série</p>
                  <p className="text-white font-medium">{xmlData.serie}</p>
                </div>
                <div>
                  <p className="text-dark-400 text-sm">Data Emissão</p>
                  <p className="text-white font-medium">{formatDate(xmlData.data_emissao)}</p>
                </div>
                <div>
                  <p className="text-dark-400 text-sm">Valor Total</p>
                  <p className="text-green-400 font-bold">{formatCurrency(xmlData.valor_total)}</p>
                </div>
              </div>
            </div>

            {/* Fornecedor */}
            <div className="glass-card p-4 bg-dark-700/50">
              <h3 className="text-white font-medium mb-3 flex items-center gap-2">
                <Building2 className="w-5 h-5" />
                Fornecedor
                {!fornecedores.find(f => f.cnpj === xmlData.fornecedor.cnpj) && (
                  <Badge variant="warning">Novo</Badge>
                )}
              </h3>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-dark-400 text-sm">CNPJ</p>
                  <p className="text-white font-medium">{xmlData.fornecedor.cnpj}</p>
                </div>
                <div>
                  <p className="text-dark-400 text-sm">Razão Social</p>
                  <p className="text-white font-medium">{xmlData.fornecedor.razao_social}</p>
                </div>
              </div>
              {!fornecedores.find(f => f.cnpj === xmlData.fornecedor.cnpj) && (
                <p className="text-yellow-400 text-sm mt-2">
                  ⚠️ Este fornecedor será cadastrado automaticamente
                </p>
              )}
            </div>

            {/* Itens */}
            <div className="glass-card p-4 bg-dark-700/50">
              <h3 className="text-white font-medium mb-3 flex items-center gap-2">
                <Package className="w-5 h-5" />
                Itens ({xmlData.itens.length})
              </h3>
              <div className="space-y-3">
                {xmlData.itens.map((item, index) => (
                  <div key={index} className="p-3 bg-dark-800 rounded-lg">
                    <div className="flex justify-between items-start mb-2">
                      <div className="flex-1">
                        <p className="text-white font-medium">{item.descricao}</p>
                        <p className="text-dark-400 text-sm">
                          Código: {item.codigo_produto_nf} | NCM: {item.ncm} | {item.quantidade} {item.unidade}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-green-400 font-medium">{formatCurrency(item.valor_total)}</p>
                        <p className="text-dark-400 text-sm">{formatCurrency(item.valor_unitario)}/un</p>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-3 mt-3 pt-3 border-t border-dark-600">
                      {item.acao === 'existente' ? (
                        <>
                          <Badge variant="success">Produto existente</Badge>
                          <span className="text-dark-400 text-sm">
                            → {item.produtoExistente?.nome}
                          </span>
                        </>
                      ) : (
                        <Badge variant="warning">Novo produto</Badge>
                      )}
                      
                      <select
                        value={itemOptions[index] || 'cadastrar'}
                        onChange={(e) => setItemOptions(prev => ({ 
                          ...prev, 
                          [index]: e.target.value as 'cadastrar' | 'substituir' | 'ignorar' 
                        }))}
                        className="input text-sm ml-auto"
                      >
                        {item.acao === 'existente' ? (
                          <>
                            <option value="substituir">Atualizar estoque</option>
                            <option value="ignorar">Ignorar</option>
                          </>
                        ) : (
                          <>
                            <option value="cadastrar">Cadastrar produto</option>
                            <option value="ignorar">Ignorar</option>
                          </>
                        )}
                      </select>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Resumo Financeiro */}
            <div className="glass-card p-4 bg-dark-700/50">
              <h3 className="text-white font-medium mb-3">Resumo Financeiro</h3>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div>
                  <p className="text-dark-400 text-sm">Produtos</p>
                  <p className="text-white">{formatCurrency(xmlData.valor_produtos)}</p>
                </div>
                <div>
                  <p className="text-dark-400 text-sm">Frete</p>
                  <p className="text-white">{formatCurrency(xmlData.valor_frete)}</p>
                </div>
                <div>
                  <p className="text-dark-400 text-sm">Desconto</p>
                  <p className="text-red-400">{formatCurrency(xmlData.valor_desconto)}</p>
                </div>
                <div>
                  <p className="text-dark-400 text-sm">Total</p>
                  <p className="text-green-400 font-bold text-lg">{formatCurrency(xmlData.valor_total)}</p>
                </div>
              </div>
            </div>

            <div className="flex justify-between pt-4 border-t border-dark-600">
              <Button 
                variant="secondary" 
                onClick={() => {
                  setImportStep('upload')
                  setXmlData(null)
                }}
              >
                Voltar
              </Button>
              <Button onClick={handleImportNF} disabled={importing}>
                {importing ? <LoadingSpinner size="sm" /> : 'Importar Nota Fiscal'}
              </Button>
            </div>
          </div>
        )}
      </Modal>

      {/* Modal Visualizar NF */}
      <Modal
        isOpen={isViewModalOpen}
        onClose={() => setIsViewModalOpen(false)}
        title={`NF ${selectedNota?.numero}`}
        size="lg"
      >
        {selectedNota && (
          <div className="space-y-6">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-dark-400 text-sm">Número/Série</p>
                <p className="text-white font-medium">{selectedNota.numero} / {selectedNota.serie}</p>
              </div>
              <div>
                <p className="text-dark-400 text-sm">Data Emissão</p>
                <p className="text-white font-medium">{formatDate(selectedNota.data_emissao || '')}</p>
              </div>
              <div className="col-span-2">
                <p className="text-dark-400 text-sm">Fornecedor</p>
                <p className="text-white font-medium">{selectedNota.fornecedor_razao_social}</p>
                <p className="text-dark-400 text-sm">{selectedNota.fornecedor_cnpj}</p>
              </div>
              <div className="col-span-2">
                <p className="text-dark-400 text-sm">Chave de Acesso</p>
                <p className="text-white font-mono text-sm break-all">{selectedNota.chave_acesso}</p>
              </div>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 pt-4 border-t border-dark-600">
              <div>
                <p className="text-dark-400 text-sm">Produtos</p>
                <p className="text-white">{formatCurrency(selectedNota.valor_produtos || 0)}</p>
              </div>
              <div>
                <p className="text-dark-400 text-sm">Frete</p>
                <p className="text-white">{formatCurrency(selectedNota.valor_frete || 0)}</p>
              </div>
              <div>
                <p className="text-dark-400 text-sm">Desconto</p>
                <p className="text-red-400">{formatCurrency(selectedNota.valor_desconto || 0)}</p>
              </div>
              <div>
                <p className="text-dark-400 text-sm">Total</p>
                <p className="text-green-400 font-bold">{formatCurrency(selectedNota.valor_total || 0)}</p>
              </div>
            </div>

            <div className="flex justify-end gap-3">
              <Button variant="secondary" leftIcon={<Download className="w-4 h-4" />}>
                Download XML
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  )
}
