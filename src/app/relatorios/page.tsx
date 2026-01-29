'use client'

import { useEffect, useState } from 'react'
import { 
  BarChart3, PieChart as PieChartIcon, TrendingUp, TrendingDown, 
  Download, Calendar, Filter, DollarSign, Package, Users, FileText,
  ShoppingCart, Truck, Building2, ArrowUpRight, ArrowDownRight
} from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { LoadingSpinner } from '@/components/ui/Common'
import { 
  fetchLancamentosFinanceiros, fetchProdutos, fetchClientes, fetchFornecedores,
  fetchContasPagar, fetchContasReceber, fetchVendas, fetchCategoriasFinanceiras,
  getRelatorioInventario, getRelatorioCaixa, getRelatorioDRE
} from '@/lib/database'
import { formatCurrency, formatDate } from '@/lib/utils'
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, LineChart, Line, AreaChart, Area, Legend
} from 'recharts'

type RelatorioType = 'caixa' | 'vendas' | 'estoque' | 'clientes' | 'fornecedores' | 'dre' | 'contas'

const COLORS = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#EC4899', '#14B8A6', '#F97316']

export default function RelatoriosPage() {
  const [loading, setLoading] = useState(true)
  const [activeReport, setActiveReport] = useState<RelatorioType>('caixa')
  
  // Dados
  const [lancamentos, setLancamentos] = useState<any[]>([])
  const [produtos, setProdutos] = useState<any[]>([])
  const [clientes, setClientes] = useState<any[]>([])
  const [fornecedores, setFornecedores] = useState<any[]>([])
  const [contasPagar, setContasPagar] = useState<any[]>([])
  const [contasReceber, setContasReceber] = useState<any[]>([])
  const [vendas, setVendas] = useState<any[]>([])
  const [categorias, setCategorias] = useState<any[]>([])
  
  // Filtros
  const [periodoInicio, setPeriodoInicio] = useState(() => {
    const d = new Date()
    d.setMonth(d.getMonth() - 1)
    return d.toISOString().split('T')[0]
  })
  const [periodoFim, setPeriodoFim] = useState(() => new Date().toISOString().split('T')[0])
  const [periodoPreset, setPeriodoPreset] = useState<string>('mes')

  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    try {
      setLoading(true)
      const [lancs, prods, clis, forns, pagar, receber, vends, cats] = await Promise.all([
        fetchLancamentosFinanceiros(),
        fetchProdutos(),
        fetchClientes(),
        fetchFornecedores(),
        fetchContasPagar(),
        fetchContasReceber(),
        fetchVendas(),
        fetchCategoriasFinanceiras()
      ])
      setLancamentos(lancs)
      setProdutos(prods)
      setClientes(clis)
      setFornecedores(forns)
      setContasPagar(pagar)
      setContasReceber(receber)
      setVendas(vends)
      setCategorias(cats)
    } catch (err) {
      console.error('Erro ao carregar dados:', err)
    } finally {
      setLoading(false)
    }
  }

  // Filtrar por período
  const filterByPeriod = (data: any[], dateField: string) => {
    return data.filter(item => {
      const dateValue = item[dateField] || item.data || item.data_lancamento || item.data_venda
      if (!dateValue) return false
      const itemDate = new Date(dateValue)
      if (isNaN(itemDate.getTime())) return false
      return itemDate >= new Date(periodoInicio) && itemDate <= new Date(periodoFim + 'T23:59:59')
    })
  }

  // Definir período
  const handlePeriodoChange = (preset: string) => {
    setPeriodoPreset(preset)
    const now = new Date()
    let start = new Date()
    
    switch (preset) {
      case 'hoje':
        start = new Date(now.getFullYear(), now.getMonth(), now.getDate())
        break
      case 'semana':
        start = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 7)
        break
      case 'mes':
        start = new Date(now.getFullYear(), now.getMonth(), 1)
        break
      case 'trimestre':
        start = new Date(now.getFullYear(), now.getMonth() - 3, 1)
        break
      case 'ano':
        start = new Date(now.getFullYear(), 0, 1)
        break
    }
    
    setPeriodoInicio(start.toISOString().split('T')[0])
    setPeriodoFim(now.toISOString().split('T')[0])
  }

  // Dados para Relatório de Caixa
  const getDadosCaixa = () => {
    const lancsFiltrados = filterByPeriod(lancamentos, 'data_lancamento')
    
    // Entradas e Saídas (tipos: receita/despesa ou entrada/saida)
    const entradas = lancsFiltrados.filter(l => l.tipo === 'receita' || l.tipo === 'entrada').reduce((acc, l) => acc + (l.valor || 0), 0)
    const saidas = lancsFiltrados.filter(l => l.tipo === 'despesa' || l.tipo === 'saida').reduce((acc, l) => acc + (l.valor || 0), 0)
    
    // Por dia
    const porDia: { [key: string]: { entradas: number, saidas: number } } = {}
    lancsFiltrados.forEach(l => {
      const dataStr = l.data_lancamento || l.data || ''
      if (!dataStr) return
      const dia = dataStr.split('T')[0]
      if (!porDia[dia]) porDia[dia] = { entradas: 0, saidas: 0 }
      if (l.tipo === 'receita' || l.tipo === 'entrada') porDia[dia].entradas += (l.valor || 0)
      else porDia[dia].saidas += (l.valor || 0)
    })
    
    const dadosDiarios = Object.entries(porDia).map(([data, valores]) => ({
      data: formatDate(data),
      dataOriginal: data,
      entradas: valores.entradas,
      saidas: valores.saidas,
      saldo: valores.entradas - valores.saidas
    })).sort((a, b) => a.dataOriginal.localeCompare(b.dataOriginal))
    
    // Por categoria
    const porCategoria = categorias.map(cat => ({
      nome: cat.nome,
      cor: cat.cor,
      valor: lancsFiltrados
        .filter(l => l.categoria_id === cat.id)
        .reduce((acc, l) => acc + (l.valor || 0), 0)
    })).filter(c => c.valor > 0)
    
    // Por mês
    const porMes: { [key: string]: { entradas: number, saidas: number } } = {}
    lancsFiltrados.forEach(l => {
      const dataStr = l.data_lancamento || l.data || ''
      if (!dataStr) return
      const mes = dataStr.slice(0, 7) // YYYY-MM
      if (!porMes[mes]) porMes[mes] = { entradas: 0, saidas: 0 }
      if (l.tipo === 'receita' || l.tipo === 'entrada') porMes[mes].entradas += (l.valor || 0)
      else porMes[mes].saidas += (l.valor || 0)
    })
    
    const dadosMensais = Object.entries(porMes).map(([mes, valores]) => ({
      mes: new Date(mes + '-01').toLocaleString('pt-BR', { month: 'short', year: '2-digit' }),
      entradas: valores.entradas,
      saidas: valores.saidas,
      lucro: valores.entradas - valores.saidas
    }))
    
    return { entradas, saidas, saldo: entradas - saidas, dadosDiarios, porCategoria, dadosMensais }
  }

  // Dados para Relatório de Estoque
  const getDadosEstoque = () => {
    const valorTotal = produtos.reduce((acc, p) => {
      const custo = p.valor_custo || p.custo_medio || p.custo_unitario || 0
      const qtd = p.quantidade_estoque ?? p.quantidade_atual ?? 0
      return acc + (custo * qtd)
    }, 0)
    const qtdTotal = produtos.reduce((acc, p) => acc + (p.quantidade_estoque ?? p.quantidade_atual ?? 0), 0)
    const estoqueMinimo = produtos.filter(p => {
      const qtd = p.quantidade_estoque ?? p.quantidade_atual ?? 0
      const min = p.estoque_minimo ?? 0
      return qtd > 0 && qtd <= min
    }).length
    
    // Por categoria
    const porCategoria: { [key: string]: { qtd: number, valor: number } } = {}
    produtos.forEach(p => {
      const catNome = p.categoria?.nome || p.classificacao_fiscal || 'Sem Categoria'
      if (!porCategoria[catNome]) porCategoria[catNome] = { qtd: 0, valor: 0 }
      const custo = p.valor_custo || p.custo_medio || p.custo_unitario || 0
      const qtd = p.quantidade_estoque ?? p.quantidade_atual ?? 0
      porCategoria[catNome].qtd += qtd
      porCategoria[catNome].valor += custo * qtd
    })
    
    const dadosCategorias = Object.entries(porCategoria).map(([nome, dados]) => ({
      nome,
      quantidade: dados.qtd,
      valor: dados.valor
    }))
    
    // Mais estoque
    const maisEstoque = [...produtos]
      .sort((a, b) => (b.quantidade_estoque ?? b.quantidade_atual ?? 0) - (a.quantidade_estoque ?? a.quantidade_atual ?? 0))
      .slice(0, 10)
      .map(p => ({ nome: p.nome, quantidade: p.quantidade_estoque ?? p.quantidade_atual ?? 0 }))
    
    return { valorTotal, qtdTotal, estoqueMinimo, dadosCategorias, maisEstoque, totalProdutos: produtos.length }
  }

  // Dados para Relatório de Vendas
  const getDadosVendas = () => {
    const vendasFiltradas = filterByPeriod(vendas, 'data_venda')
    const totalVendas = vendasFiltradas.reduce((acc, v) => acc + (v.valor_total || 0), 0)
    const qtdVendas = vendasFiltradas.length
    const ticketMedio = qtdVendas > 0 ? totalVendas / qtdVendas : 0
    
    // Por dia
    const porDia: { [key: string]: number } = {}
    vendasFiltradas.forEach(v => {
      const dataStr = v.data_venda || v.data || ''
      if (!dataStr) return
      const dia = dataStr.split('T')[0]
      if (!porDia[dia]) porDia[dia] = 0
      porDia[dia] += (v.valor_total || 0)
    })
    
    const dadosDiarios = Object.entries(porDia).map(([data, valor]) => ({
      data: formatDate(data),
      valor
    }))
    
    // Por forma de pagamento
    const porFormaPgto: { [key: string]: number } = {}
    vendasFiltradas.forEach(v => {
      const forma = v.forma_pagamento || 'Outro'
      if (!porFormaPgto[forma]) porFormaPgto[forma] = 0
      porFormaPgto[forma] += (v.valor_total || 0)
    })
    
    const dadosFormaPgto = Object.entries(porFormaPgto).map(([nome, value]) => ({
      name: nome,
      value
    }))
    
    return { totalVendas, qtdVendas, ticketMedio, dadosDiarios, dadosFormaPgto }
  }

  // Dados para Relatório de Contas
  const getDadosContas = () => {
    const pagarPendente = contasPagar.filter(c => c.status === 'pendente').reduce((acc, c) => acc + (c.valor || 0), 0)
    const pagarVencido = contasPagar.filter(c => c.status === 'vencido').reduce((acc, c) => acc + (c.valor || 0), 0)
    const receberPendente = contasReceber.filter(c => c.status === 'pendente').reduce((acc, c) => acc + (c.valor || 0), 0)
    const receberVencido = contasReceber.filter(c => c.status === 'vencido').reduce((acc, c) => acc + (c.valor || 0), 0)
    
    // Vencimentos próximos
    const proximosVencimentos = [...contasPagar.map(c => ({...c, tipo_conta: 'pagar'})), ...contasReceber.map(c => ({...c, tipo_conta: 'receber'}))]
      .filter(c => c.status === 'pendente')
      .sort((a, b) => new Date(a.data_vencimento).getTime() - new Date(b.data_vencimento).getTime())
      .slice(0, 10)
    
    return { pagarPendente, pagarVencido, receberPendente, receberVencido, proximosVencimentos }
  }

  // Dados para DRE
  const getDadosDRE = () => {
    const lancsFiltrados = filterByPeriod(lancamentos, 'data_lancamento')
    
    const receitas = lancsFiltrados.filter(l => l.tipo === 'receita' || l.tipo === 'entrada').reduce((acc, l) => acc + (l.valor || 0), 0)
    const despesas = lancsFiltrados.filter(l => l.tipo === 'despesa' || l.tipo === 'saida').reduce((acc, l) => acc + (l.valor || 0), 0)
    
    // Despesas por categoria
    const despesasPorCategoria = categorias
      .filter(c => c.tipo === 'despesa')
      .map(cat => ({
        nome: cat.nome,
        valor: lancsFiltrados
          .filter(l => (l.tipo === 'despesa' || l.tipo === 'saida') && l.categoria_id === cat.id)
          .reduce((acc, l) => acc + (l.valor || 0), 0)
      }))
      .filter(d => d.valor > 0)
      .sort((a, b) => b.valor - a.valor)
    
    // Receitas por categoria
    const receitasPorCategoria = categorias
      .filter(c => c.tipo === 'receita')
      .map(cat => ({
        nome: cat.nome,
        valor: lancsFiltrados
          .filter(l => (l.tipo === 'receita' || l.tipo === 'entrada') && l.categoria_id === cat.id)
          .reduce((acc, l) => acc + (l.valor || 0), 0)
      }))
      .filter(d => d.valor > 0)
      .sort((a, b) => b.valor - a.valor)
    
    return { receitas, despesas, lucro: receitas - despesas, despesasPorCategoria, receitasPorCategoria }
  }

  // Exportar relatório
  const exportarRelatorio = () => {
    let csv = ''
    let filename = ''
    
    switch (activeReport) {
      case 'caixa':
        const caixa = getDadosCaixa()
        csv = 'Data;Entradas;Saídas;Saldo\n'
        caixa.dadosDiarios.forEach(d => {
          csv += `${d.data};${d.entradas.toFixed(2)};${d.saidas.toFixed(2)};${d.saldo.toFixed(2)}\n`
        })
        filename = 'relatorio_caixa'
        break
      case 'estoque':
        csv = 'Produto;Quantidade;Custo Unit.;Valor Total\n'
        produtos.forEach(p => {
          const qtd = p.quantidade_estoque ?? p.quantidade_atual ?? 0
          const custo = p.valor_custo || p.custo_medio || p.custo_unitario || 0
          csv += `${p.nome};${qtd};${custo.toFixed(2)};${(custo * qtd).toFixed(2)}\n`
        })
        filename = 'relatorio_estoque'
        break
      case 'vendas':
        csv = 'Data;Valor;Cliente;Forma Pgto\n'
        vendas.forEach(v => {
          csv += `${formatDate(v.data_venda || v.data)};${(v.valor_total || 0).toFixed(2)};${v.cliente_nome || v.cliente?.nome || '-'};${v.forma_pagamento || '-'}\n`
        })
        filename = 'relatorio_vendas'
        break
      default:
        csv = 'Relatório não exportável\n'
        filename = 'relatorio'
    }
    
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const link = document.createElement('a')
    link.href = URL.createObjectURL(blob)
    link.download = `${filename}_${new Date().toISOString().split('T')[0]}.csv`
    link.click()
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-[60vh]">
        <LoadingSpinner size="lg" />
      </div>
    )
  }

  const dadosCaixa = getDadosCaixa()
  const dadosEstoque = getDadosEstoque()
  const dadosVendas = getDadosVendas()
  const dadosContas = getDadosContas()
  const dadosDRE = getDadosDRE()

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div>
          <h1 className="text-2xl lg:text-3xl font-bold font-heading text-white">
            Relatórios
          </h1>
          <p className="text-dark-400 mt-1">
            Análises e gráficos do sistema
          </p>
        </div>
        <Button
          onClick={exportarRelatorio}
          leftIcon={<Download className="w-4 h-4" />}
          variant="secondary"
        >
          Exportar CSV
        </Button>
      </div>

      {/* Filtro de Período */}
      <div className="glass-card p-4">
        <div className="flex flex-wrap items-center gap-4">
          <div className="flex gap-2">
            {['hoje', 'semana', 'mes', 'trimestre', 'ano'].map(p => (
              <button
                key={p}
                onClick={() => handlePeriodoChange(p)}
                className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                  periodoPreset === p
                    ? 'bg-primary-500 text-white'
                    : 'bg-dark-700 text-dark-300 hover:bg-dark-600'
                }`}
              >
                {p === 'hoje' ? 'Hoje' :
                 p === 'semana' ? 'Semana' :
                 p === 'mes' ? 'Mês' :
                 p === 'trimestre' ? 'Trimestre' : 'Ano'}
              </button>
            ))}
          </div>
          <div className="flex items-center gap-2">
            <input
              type="date"
              value={periodoInicio}
              onChange={(e) => { setPeriodoInicio(e.target.value); setPeriodoPreset('custom') }}
              className="input text-sm"
            />
            <span className="text-dark-400">até</span>
            <input
              type="date"
              value={periodoFim}
              onChange={(e) => { setPeriodoFim(e.target.value); setPeriodoPreset('custom') }}
              className="input text-sm"
            />
          </div>
        </div>
      </div>

      {/* Tabs de Relatórios */}
      <div className="flex gap-2 overflow-x-auto pb-2">
        {[
          { id: 'caixa', label: 'Caixa', icon: DollarSign },
          { id: 'vendas', label: 'Vendas', icon: ShoppingCart },
          { id: 'estoque', label: 'Estoque', icon: Package },
          { id: 'clientes', label: 'Clientes', icon: Users },
          { id: 'fornecedores', label: 'Fornecedores', icon: Truck },
          { id: 'dre', label: 'DRE', icon: BarChart3 },
          { id: 'contas', label: 'Contas', icon: FileText }
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveReport(tab.id as RelatorioType)}
            className={`px-4 py-2 rounded-lg font-medium whitespace-nowrap transition-colors flex items-center gap-2 ${
              activeReport === tab.id 
                ? 'bg-primary-500 text-white' 
                : 'bg-dark-700 text-dark-300 hover:bg-dark-600'
            }`}
          >
            <tab.icon className="w-4 h-4" />
            {tab.label}
          </button>
        ))}
      </div>

      {/* Conteúdo dos Relatórios */}
      
      {/* RELATÓRIO DE CAIXA */}
      {activeReport === 'caixa' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="glass-card p-6">
              <div className="flex items-center gap-3 mb-2">
                <div className="w-10 h-10 rounded-lg bg-green-500/20 flex items-center justify-center">
                  <TrendingUp className="w-5 h-5 text-green-400" />
                </div>
                <p className="text-dark-400">Entradas</p>
              </div>
              <p className="text-3xl font-bold text-green-400">{formatCurrency(dadosCaixa.entradas)}</p>
            </div>
            <div className="glass-card p-6">
              <div className="flex items-center gap-3 mb-2">
                <div className="w-10 h-10 rounded-lg bg-red-500/20 flex items-center justify-center">
                  <TrendingDown className="w-5 h-5 text-red-400" />
                </div>
                <p className="text-dark-400">Saídas</p>
              </div>
              <p className="text-3xl font-bold text-red-400">{formatCurrency(dadosCaixa.saidas)}</p>
            </div>
            <div className="glass-card p-6">
              <div className="flex items-center gap-3 mb-2">
                <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                  dadosCaixa.saldo >= 0 ? 'bg-primary-500/20' : 'bg-red-500/20'
                }`}>
                  <DollarSign className={`w-5 h-5 ${dadosCaixa.saldo >= 0 ? 'text-primary-400' : 'text-red-400'}`} />
                </div>
                <p className="text-dark-400">Saldo</p>
              </div>
              <p className={`text-3xl font-bold ${dadosCaixa.saldo >= 0 ? 'text-primary-400' : 'text-red-400'}`}>
                {formatCurrency(dadosCaixa.saldo)}
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="glass-card p-6">
              <h3 className="text-lg font-semibold text-white mb-4">Fluxo Diário</h3>
              <div className="h-72">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={dadosCaixa.dadosDiarios}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                    <XAxis dataKey="data" stroke="#9CA3AF" fontSize={12} />
                    <YAxis stroke="#9CA3AF" fontSize={12} />
                    <Tooltip 
                      contentStyle={{ backgroundColor: '#1F2937', border: '1px solid #374151', borderRadius: '8px' }}
                      formatter={(value: number) => formatCurrency(value)}
                    />
                    <Area type="monotone" dataKey="entradas" stackId="1" stroke="#10B981" fill="#10B981" fillOpacity={0.6} name="Entradas" />
                    <Area type="monotone" dataKey="saidas" stackId="2" stroke="#EF4444" fill="#EF4444" fillOpacity={0.6} name="Saídas" />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div className="glass-card p-6">
              <h3 className="text-lg font-semibold text-white mb-4">Por Categoria</h3>
              <div className="h-72">
                {dadosCaixa.porCategoria.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={dadosCaixa.porCategoria}
                        cx="50%"
                        cy="50%"
                        innerRadius={60}
                        outerRadius={100}
                        paddingAngle={5}
                        dataKey="valor"
                        nameKey="nome"
                      >
                        {dadosCaixa.porCategoria.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.cor || COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip 
                        contentStyle={{ backgroundColor: '#1F2937', border: '1px solid #374151', borderRadius: '8px' }}
                        formatter={(value: number) => formatCurrency(value)}
                      />
                      <Legend />
                    </PieChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="flex items-center justify-center h-full text-dark-400">
                    Sem dados no período
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="glass-card p-6">
            <h3 className="text-lg font-semibold text-white mb-4">Evolução Mensal</h3>
            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={dadosCaixa.dadosMensais}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                  <XAxis dataKey="mes" stroke="#9CA3AF" fontSize={12} />
                  <YAxis stroke="#9CA3AF" fontSize={12} />
                  <Tooltip 
                    contentStyle={{ backgroundColor: '#1F2937', border: '1px solid #374151', borderRadius: '8px' }}
                    formatter={(value: number) => formatCurrency(value)}
                  />
                  <Legend />
                  <Bar dataKey="entradas" fill="#10B981" name="Entradas" />
                  <Bar dataKey="saidas" fill="#EF4444" name="Saídas" />
                  <Bar dataKey="lucro" fill="#3B82F6" name="Lucro" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      )}

      {/* RELATÓRIO DE VENDAS */}
      {activeReport === 'vendas' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="glass-card p-6">
              <p className="text-dark-400 mb-2">Total em Vendas</p>
              <p className="text-3xl font-bold text-green-400">{formatCurrency(dadosVendas.totalVendas)}</p>
            </div>
            <div className="glass-card p-6">
              <p className="text-dark-400 mb-2">Quantidade de Vendas</p>
              <p className="text-3xl font-bold text-white">{dadosVendas.qtdVendas}</p>
            </div>
            <div className="glass-card p-6">
              <p className="text-dark-400 mb-2">Ticket Médio</p>
              <p className="text-3xl font-bold text-primary-400">{formatCurrency(dadosVendas.ticketMedio)}</p>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="glass-card p-6">
              <h3 className="text-lg font-semibold text-white mb-4">Vendas por Dia</h3>
              <div className="h-72">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={dadosVendas.dadosDiarios}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                    <XAxis dataKey="data" stroke="#9CA3AF" fontSize={12} />
                    <YAxis stroke="#9CA3AF" fontSize={12} />
                    <Tooltip 
                      contentStyle={{ backgroundColor: '#1F2937', border: '1px solid #374151', borderRadius: '8px' }}
                      formatter={(value: number) => formatCurrency(value)}
                    />
                    <Line type="monotone" dataKey="valor" stroke="#3B82F6" strokeWidth={2} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div className="glass-card p-6">
              <h3 className="text-lg font-semibold text-white mb-4">Por Forma de Pagamento</h3>
              <div className="h-72">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={dadosVendas.dadosFormaPgto}
                      cx="50%"
                      cy="50%"
                      outerRadius={100}
                      dataKey="value"
                      label
                    >
                      {dadosVendas.dadosFormaPgto.map((_, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip 
                      contentStyle={{ backgroundColor: '#1F2937', border: '1px solid #374151', borderRadius: '8px' }}
                      formatter={(value: number) => formatCurrency(value)}
                    />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* RELATÓRIO DE ESTOQUE */}
      {activeReport === 'estoque' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="glass-card p-6">
              <p className="text-dark-400 mb-2">Valor em Estoque</p>
              <p className="text-3xl font-bold text-primary-400">{formatCurrency(dadosEstoque.valorTotal)}</p>
            </div>
            <div className="glass-card p-6">
              <p className="text-dark-400 mb-2">Total de Produtos</p>
              <p className="text-3xl font-bold text-white">{dadosEstoque.totalProdutos.toLocaleString('pt-BR')}</p>
            </div>
            <div className="glass-card p-6">
              <p className="text-dark-400 mb-2">Itens em Estoque</p>
              <p className="text-3xl font-bold text-white">{dadosEstoque.qtdTotal.toLocaleString('pt-BR', { maximumFractionDigits: 2 })}</p>
            </div>
            <div className="glass-card p-6">
              <p className="text-dark-400 mb-2">Abaixo do Mínimo</p>
              <p className="text-3xl font-bold text-yellow-400">{dadosEstoque.estoqueMinimo.toLocaleString('pt-BR')}</p>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="glass-card p-6">
              <h3 className="text-lg font-semibold text-white mb-4">Por Categoria</h3>
              <div className="h-72">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={dadosEstoque.dadosCategorias} layout="vertical">
                    <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                    <XAxis type="number" stroke="#9CA3AF" fontSize={12} />
                    <YAxis type="category" dataKey="nome" stroke="#9CA3AF" fontSize={12} width={100} />
                    <Tooltip 
                      contentStyle={{ backgroundColor: '#1F2937', border: '1px solid #374151', borderRadius: '8px' }}
                      formatter={(value: number) => formatCurrency(value)}
                    />
                    <Bar dataKey="valor" fill="#3B82F6" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div className="glass-card p-6">
              <h3 className="text-lg font-semibold text-white mb-4">Produtos com Maior Estoque</h3>
              <div className="space-y-3">
                {dadosEstoque.maisEstoque.map((p, i) => (
                  <div key={i} className="flex items-center justify-between">
                    <span className="text-dark-300 truncate">{p.nome}</span>
                    <span className="text-white font-medium ml-4">{p.quantidade} un.</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* RELATÓRIO DE CLIENTES */}
      {activeReport === 'clientes' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="glass-card p-6">
              <p className="text-dark-400 mb-2">Total de Clientes</p>
              <p className="text-3xl font-bold text-white">{clientes.length}</p>
            </div>
            <div className="glass-card p-6">
              <p className="text-dark-400 mb-2">Pessoa Física</p>
              <p className="text-3xl font-bold text-blue-400">
                {clientes.filter(c => c.tipo_pessoa === 'PF').length}
              </p>
            </div>
            <div className="glass-card p-6">
              <p className="text-dark-400 mb-2">Pessoa Jurídica</p>
              <p className="text-3xl font-bold text-green-400">
                {clientes.filter(c => c.tipo_pessoa === 'PJ').length}
              </p>
            </div>
            <div className="glass-card p-6">
              <p className="text-dark-400 mb-2">Com Saldo Devedor</p>
              <p className="text-3xl font-bold text-red-400">
                {clientes.filter(c => c.saldo_devedor > 0).length}
              </p>
            </div>
          </div>

          <div className="glass-card p-6">
            <h3 className="text-lg font-semibold text-white mb-4">Clientes por Estado</h3>
            <div className="h-72">
              {(() => {
                const porEstado: { [key: string]: number } = {}
                clientes.forEach(c => {
                  const uf = c.estado || 'N/I'
                  porEstado[uf] = (porEstado[uf] || 0) + 1
                })
                const data = Object.entries(porEstado).map(([name, value]) => ({ name, value }))
                
                return (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={data}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                      <XAxis dataKey="name" stroke="#9CA3AF" fontSize={12} />
                      <YAxis stroke="#9CA3AF" fontSize={12} />
                      <Tooltip contentStyle={{ backgroundColor: '#1F2937', border: '1px solid #374151', borderRadius: '8px' }} />
                      <Bar dataKey="value" fill="#3B82F6" />
                    </BarChart>
                  </ResponsiveContainer>
                )
              })()}
            </div>
          </div>
        </div>
      )}

      {/* RELATÓRIO DE FORNECEDORES */}
      {activeReport === 'fornecedores' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="glass-card p-6">
              <p className="text-dark-400 mb-2">Total de Fornecedores</p>
              <p className="text-3xl font-bold text-white">{fornecedores.length}</p>
            </div>
            <div className="glass-card p-6">
              <p className="text-dark-400 mb-2">Ativos</p>
              <p className="text-3xl font-bold text-green-400">
                {fornecedores.filter(f => f.ativo).length}
              </p>
            </div>
            <div className="glass-card p-6">
              <p className="text-dark-400 mb-2">Total a Pagar</p>
              <p className="text-3xl font-bold text-red-400">
                {formatCurrency(contasPagar.filter(c => c.status !== 'pago').reduce((acc, c) => acc + c.valor, 0))}
              </p>
            </div>
          </div>

          <div className="glass-card overflow-hidden">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Fornecedor</th>
                  <th>CNPJ</th>
                  <th>Cidade/UF</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {fornecedores.slice(0, 20).map(f => (
                  <tr key={f.id}>
                    <td className="text-white">{f.razao_social}</td>
                    <td className="text-dark-300">{f.cnpj}</td>
                    <td className="text-dark-300">{f.cidade}/{f.estado}</td>
                    <td>
                      <span className={`px-2 py-1 rounded text-xs ${f.ativo ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'}`}>
                        {f.ativo ? 'Ativo' : 'Inativo'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* RELATÓRIO DRE */}
      {activeReport === 'dre' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="glass-card p-6">
              <p className="text-dark-400 mb-2">Receitas</p>
              <p className="text-3xl font-bold text-green-400">{formatCurrency(dadosDRE.receitas)}</p>
            </div>
            <div className="glass-card p-6">
              <p className="text-dark-400 mb-2">Despesas</p>
              <p className="text-3xl font-bold text-red-400">{formatCurrency(dadosDRE.despesas)}</p>
            </div>
            <div className="glass-card p-6">
              <p className="text-dark-400 mb-2">Resultado</p>
              <div className="flex items-center gap-2">
                <p className={`text-3xl font-bold ${dadosDRE.lucro >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                  {formatCurrency(dadosDRE.lucro)}
                </p>
                {dadosDRE.lucro >= 0 ? (
                  <ArrowUpRight className="w-6 h-6 text-green-400" />
                ) : (
                  <ArrowDownRight className="w-6 h-6 text-red-400" />
                )}
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="glass-card p-6">
              <h3 className="text-lg font-semibold text-white mb-4">Despesas por Categoria</h3>
              <div className="space-y-3">
                {dadosDRE.despesasPorCategoria.map((d, i) => (
                  <div key={i} className="flex items-center justify-between">
                    <span className="text-dark-300">{d.nome}</span>
                    <span className="text-red-400 font-medium">{formatCurrency(d.valor)}</span>
                  </div>
                ))}
                {dadosDRE.despesasPorCategoria.length === 0 && (
                  <p className="text-dark-400 text-center py-4">Sem despesas no período</p>
                )}
              </div>
            </div>

            <div className="glass-card p-6">
              <h3 className="text-lg font-semibold text-white mb-4">Receitas por Categoria</h3>
              <div className="space-y-3">
                {dadosDRE.receitasPorCategoria.map((r, i) => (
                  <div key={i} className="flex items-center justify-between">
                    <span className="text-dark-300">{r.nome}</span>
                    <span className="text-green-400 font-medium">{formatCurrency(r.valor)}</span>
                  </div>
                ))}
                {dadosDRE.receitasPorCategoria.length === 0 && (
                  <p className="text-dark-400 text-center py-4">Sem receitas no período</p>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* RELATÓRIO DE CONTAS */}
      {activeReport === 'contas' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="glass-card p-6">
              <p className="text-dark-400 mb-2">A Pagar Pendente</p>
              <p className="text-3xl font-bold text-yellow-400">{formatCurrency(dadosContas.pagarPendente)}</p>
            </div>
            <div className="glass-card p-6">
              <p className="text-dark-400 mb-2">A Pagar Vencido</p>
              <p className="text-3xl font-bold text-red-400">{formatCurrency(dadosContas.pagarVencido)}</p>
            </div>
            <div className="glass-card p-6">
              <p className="text-dark-400 mb-2">A Receber Pendente</p>
              <p className="text-3xl font-bold text-blue-400">{formatCurrency(dadosContas.receberPendente)}</p>
            </div>
            <div className="glass-card p-6">
              <p className="text-dark-400 mb-2">A Receber Vencido</p>
              <p className="text-3xl font-bold text-orange-400">{formatCurrency(dadosContas.receberVencido)}</p>
            </div>
          </div>

          <div className="glass-card p-6">
            <h3 className="text-lg font-semibold text-white mb-4">Próximos Vencimentos</h3>
            <div className="overflow-x-auto">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Descrição</th>
                    <th>Tipo</th>
                    <th>Vencimento</th>
                    <th className="text-right">Valor</th>
                  </tr>
                </thead>
                <tbody>
                  {dadosContas.proximosVencimentos.map((c: any, i) => (
                    <tr key={i}>
                      <td className="text-white">{c.descricao}</td>
                      <td>
                        <span className={`px-2 py-1 rounded text-xs ${
                          'cliente_id' in c ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'
                        }`}>
                          {'cliente_id' in c ? 'Receber' : 'Pagar'}
                        </span>
                      </td>
                      <td className="text-dark-300">{formatDate(c.data_vencimento)}</td>
                      <td className="text-right font-medium text-white">{formatCurrency(c.valor)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
