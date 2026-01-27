'use client'

import { useEffect, useState } from 'react'
import { 
  Plus, Search, DollarSign, TrendingUp, TrendingDown, Calendar,
  Filter, Download, Upload, CheckCircle, Clock, AlertTriangle,
  FileText, Receipt, Truck, CreditCard
} from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Modal } from '@/components/ui/Modal'
import { LoadingSpinner, EmptyState, Badge } from '@/components/ui/Common'
import { 
  LancamentoFinanceiro, CategoriaFinanceira, ContaBancaria, Venda,
  fetchLancamentosFinanceiros, createLancamentoFinanceiro,
  fetchCategoriasFinanceiras, fetchContasBancarias,
  fetchVendas, getRelatorioCaixa, checkOFXDuplicado
} from '@/lib/database'
import { formatCurrency, formatDate } from '@/lib/utils'
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, LineChart, Line
} from 'recharts'

type PeriodoType = 'dia' | 'semana' | 'mes' | 'ano' | 'personalizado'
type TipoLancamento = 'todos' | 'entrada' | 'saida'

const COLORS = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#EC4899', '#14B8A6', '#F97316']

export default function CaixaPage() {
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  
  // Dados
  const [lancamentos, setLancamentos] = useState<LancamentoFinanceiro[]>([])
  const [categorias, setCategorias] = useState<CategoriaFinanceira[]>([])
  const [contasBancarias, setContasBancarias] = useState<ContaBancaria[]>([])
  const [vendas, setVendas] = useState<Venda[]>([])
  
  // Filtros
  const [searchTerm, setSearchTerm] = useState('')
  const [filterPeriodo, setFilterPeriodo] = useState<PeriodoType>('mes')
  const [filterTipo, setFilterTipo] = useState<TipoLancamento>('todos')
  const [filterCategoria, setFilterCategoria] = useState<number | null>(null)
  const [filterContaBancaria, setFilterContaBancaria] = useState<number | null>(null)
  const [dataInicio, setDataInicio] = useState('')
  const [dataFim, setDataFim] = useState('')
  const [filterComNF, setFilterComNF] = useState<'todos' | 'com_nf' | 'sem_nf'>('todos')
  
  // Modal
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [isDCTeModalOpen, setIsDCTeModalOpen] = useState(false)
  const [isOFXModalOpen, setIsOFXModalOpen] = useState(false)
  
  // Form Lançamento
  const [formData, setFormData] = useState({
    tipo: 'entrada' as 'entrada' | 'saida',
    valor: 0,
    data: new Date().toISOString().split('T')[0],
    descricao: '',
    categoria_id: null as number | null,
    conta_bancaria_id: null as number | null,
    venda_id: null as number | null,
    numero_nf: '',
    observacoes: ''
  })
  
  // Form DCTe/Frete
  const [formDCTe, setFormDCTe] = useState({
    numero_cte: '',
    chave_cte: '',
    valor_frete: 0,
    data: new Date().toISOString().split('T')[0],
    transportadora: '',
    observacoes: '',
    categoria_id: null as number | null,
    conta_bancaria_id: null as number | null
  })
  
  // OFX Import
  const [ofxData, setOfxData] = useState<any[]>([])
  const [ofxCategorizacao, setOfxCategorizacao] = useState<{[key: string]: number}>({})

  useEffect(() => {
    loadData()
    setDefaultDates()
  }, [])

  const setDefaultDates = () => {
    const now = new Date()
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)
    setDataInicio(startOfMonth.toISOString().split('T')[0])
    setDataFim(now.toISOString().split('T')[0])
  }

  const loadData = async () => {
    try {
      setLoading(true)
      const [lancs, cats, contas, vends] = await Promise.all([
        fetchLancamentosFinanceiros(),
        fetchCategoriasFinanceiras(),
        fetchContasBancarias(),
        fetchVendas()
      ])
      setLancamentos(lancs)
      setCategorias(cats)
      setContasBancarias(contas)
      setVendas(vends)
    } catch (err) {
      console.error('Erro ao carregar dados:', err)
    } finally {
      setLoading(false)
    }
  }

  // Aplicar filtros de data
  const getDateRange = () => {
    const now = new Date()
    let start = new Date()
    let end = now
    
    switch (filterPeriodo) {
      case 'dia':
        start = new Date(now.getFullYear(), now.getMonth(), now.getDate())
        break
      case 'semana':
        start = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 7)
        break
      case 'mes':
        start = new Date(now.getFullYear(), now.getMonth(), 1)
        break
      case 'ano':
        start = new Date(now.getFullYear(), 0, 1)
        break
      case 'personalizado':
        start = dataInicio ? new Date(dataInicio) : start
        end = dataFim ? new Date(dataFim) : end
        break
    }
    
    return { start, end }
  }

  // Filtrar lançamentos
  const { start, end } = getDateRange()
  const filteredLancamentos = lancamentos.filter(l => {
    const dataLanc = new Date(l.data)
    const matchPeriodo = dataLanc >= start && dataLanc <= end
    const matchSearch = l.descricao?.toLowerCase().includes(searchTerm.toLowerCase())
    const matchTipo = filterTipo === 'todos' || l.tipo === filterTipo
    const matchCategoria = !filterCategoria || l.categoria_id === filterCategoria
    const matchConta = !filterContaBancaria || l.conta_bancaria_id === filterContaBancaria
    const matchNF = filterComNF === 'todos' || 
                   (filterComNF === 'com_nf' && l.numero_nf) || 
                   (filterComNF === 'sem_nf' && !l.numero_nf)
    
    return matchPeriodo && matchSearch && matchTipo && matchCategoria && matchConta && matchNF
  })

  // Calcular totais
  const totalEntradas = filteredLancamentos
    .filter(l => l.tipo === 'entrada')
    .reduce((acc, l) => acc + l.valor, 0)
  
  const totalSaidas = filteredLancamentos
    .filter(l => l.tipo === 'saida')
    .reduce((acc, l) => acc + l.valor, 0)
  
  const saldo = totalEntradas - totalSaidas

  // Dados para gráficos
  const dadosPorCategoria = categorias.map(cat => {
    const valor = filteredLancamentos
      .filter(l => l.categoria_id === cat.id)
      .reduce((acc, l) => acc + (l.tipo === 'saida' ? l.valor : 0), 0)
    return { name: cat.nome, value: valor, cor: cat.cor }
  }).filter(d => d.value > 0)

  const dadosPorDia = () => {
    const dados: { [key: string]: { entradas: number, saidas: number } } = {}
    
    filteredLancamentos.forEach(l => {
      const dia = l.data.split('T')[0]
      if (!dados[dia]) {
        dados[dia] = { entradas: 0, saidas: 0 }
      }
      if (l.tipo === 'entrada') {
        dados[dia].entradas += l.valor
      } else {
        dados[dia].saidas += l.valor
      }
    })
    
    return Object.entries(dados)
      .map(([data, valores]) => ({
        data: formatDate(data),
        entradas: valores.entradas,
        saidas: valores.saidas,
        saldo: valores.entradas - valores.saidas
      }))
      .slice(-10)
  }

  // Handlers
  const handleSubmitLancamento = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    
    try {
      await createLancamentoFinanceiro({
        tipo: formData.tipo,
        valor: formData.valor,
        data: formData.data,
        descricao: formData.descricao,
        categoria_id: formData.categoria_id,
        conta_bancaria_id: formData.conta_bancaria_id,
        venda_id: formData.venda_id,
        numero_nf: formData.numero_nf,
        observacoes: formData.observacoes,
        conciliado: false
      })
      
      await loadData()
      setIsModalOpen(false)
      resetForm()
    } catch (err) {
      console.error('Erro ao salvar:', err)
      alert('Erro ao salvar lançamento')
    } finally {
      setSaving(false)
    }
  }

  const handleSubmitDCTe = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    
    try {
      // Verificar duplicidade
      if (formDCTe.chave_cte) {
        const duplicado = await checkOFXDuplicado(formDCTe.chave_cte)
        if (duplicado) {
          alert('Este CT-e já foi lançado!')
          setSaving(false)
          return
        }
      }
      
      await createLancamentoFinanceiro({
        tipo: 'saida',
        valor: formDCTe.valor_frete,
        data: formDCTe.data,
        descricao: `Frete CT-e ${formDCTe.numero_cte} - ${formDCTe.transportadora}`,
        categoria_id: formDCTe.categoria_id,
        conta_bancaria_id: formDCTe.conta_bancaria_id,
        identificador_externo: formDCTe.chave_cte,
        observacoes: formDCTe.observacoes,
        conciliado: false
      })
      
      await loadData()
      setIsDCTeModalOpen(false)
      setFormDCTe({
        numero_cte: '',
        chave_cte: '',
        valor_frete: 0,
        data: new Date().toISOString().split('T')[0],
        transportadora: '',
        observacoes: '',
        categoria_id: null,
        conta_bancaria_id: null
      })
    } catch (err) {
      console.error('Erro ao salvar:', err)
      alert('Erro ao salvar lançamento de frete')
    } finally {
      setSaving(false)
    }
  }

  const resetForm = () => {
    setFormData({
      tipo: 'entrada',
      valor: 0,
      data: new Date().toISOString().split('T')[0],
      descricao: '',
      categoria_id: null,
      conta_bancaria_id: null,
      venda_id: null,
      numero_nf: '',
      observacoes: ''
    })
  }

  // Importação OFX
  const handleOFXUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    
    try {
      const text = await file.text()
      const transactions: any[] = []
      const stmttrn = text.match(/<STMTTRN>([\s\S]*?)<\/STMTTRN>/g) || []
      
      for (const trn of stmttrn) {
        const trntype = trn.match(/<TRNTYPE>(\w+)/)?.[1]
        const dtposted = trn.match(/<DTPOSTED>(\d+)/)?.[1]
        const trnamt = trn.match(/<TRNAMT>([\d.-]+)/)?.[1]
        const fitid = trn.match(/<FITID>(\S+)/)?.[1]
        const memo = trn.match(/<MEMO>([^<]+)/)?.[1]
        
        if (dtposted && trnamt && fitid) {
          const duplicado = await checkOFXDuplicado(fitid)
          
          transactions.push({
            id: fitid,
            tipo: Number(trnamt) >= 0 ? 'entrada' : 'saida',
            valor: Math.abs(Number(trnamt)),
            data: `${dtposted.slice(0,4)}-${dtposted.slice(4,6)}-${dtposted.slice(6,8)}`,
            descricao: memo || trntype,
            duplicado
          })
        }
      }
      
      setOfxData(transactions)
      setIsOFXModalOpen(true)
    } catch (err) {
      console.error('Erro ao processar OFX:', err)
      alert('Erro ao processar arquivo OFX')
    }
  }

  const handleImportOFX = async () => {
    if (!filterContaBancaria) {
      alert('Selecione uma conta bancária')
      return
    }
    
    setSaving(true)
    try {
      for (const trn of ofxData.filter(t => !t.duplicado)) {
        await createLancamentoFinanceiro({
          conta_bancaria_id: filterContaBancaria,
          tipo: trn.tipo,
          valor: trn.valor,
          data: trn.data,
          descricao: trn.descricao,
          categoria_id: ofxCategorizacao[trn.id] || null,
          identificador_externo: trn.id,
          conciliado: false
        })
      }
      
      await loadData()
      setIsOFXModalOpen(false)
      setOfxData([])
    } catch (err) {
      console.error('Erro ao importar:', err)
      alert('Erro ao importar lançamentos')
    } finally {
      setSaving(false)
    }
  }

  // Exportar Excel (simples CSV)
  const exportarExcel = () => {
    const headers = ['Data', 'Descrição', 'Categoria', 'Tipo', 'Valor', 'NF', 'Conta']
    const rows = filteredLancamentos.map(l => [
      formatDate(l.data),
      l.descricao,
      categorias.find(c => c.id === l.categoria_id)?.nome || '',
      l.tipo,
      l.valor.toFixed(2),
      l.numero_nf || '',
      contasBancarias.find(c => c.id === l.conta_bancaria_id)?.nome || ''
    ])
    
    const csv = [headers.join(';'), ...rows.map(r => r.join(';'))].join('\n')
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const link = document.createElement('a')
    link.href = URL.createObjectURL(blob)
    link.download = `caixa_${new Date().toISOString().split('T')[0]}.csv`
    link.click()
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
            Caixa
          </h1>
          <p className="text-dark-400 mt-1">
            Controle de fluxo de caixa e movimentações financeiras
          </p>
        </div>
        <div className="flex gap-2 flex-wrap">
          <Button
            variant="secondary"
            onClick={exportarExcel}
            leftIcon={<Download className="w-4 h-4" />}
          >
            Exportar
          </Button>
          <input
            type="file"
            accept=".ofx"
            onChange={handleOFXUpload}
            className="hidden"
            id="ofx-caixa"
          />
          <label htmlFor="ofx-caixa">
            <span className="btn btn-secondary flex items-center gap-2 cursor-pointer">
              <Upload className="w-4 h-4" />
              Importar OFX
            </span>
          </label>
          <Button
            variant="secondary"
            onClick={() => setIsDCTeModalOpen(true)}
            leftIcon={<Truck className="w-4 h-4" />}
          >
            Lançar Frete
          </Button>
          <Button
            onClick={() => setIsModalOpen(true)}
            leftIcon={<Plus className="w-4 h-4" />}
          >
            Novo Lançamento
          </Button>
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="glass-card p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-green-500/20 flex items-center justify-center">
              <TrendingUp className="w-5 h-5 text-green-400" />
            </div>
            <div>
              <p className="text-dark-400 text-sm">Entradas</p>
              <p className="text-xl font-bold text-green-400">{formatCurrency(totalEntradas)}</p>
            </div>
          </div>
        </div>
        
        <div className="glass-card p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-red-500/20 flex items-center justify-center">
              <TrendingDown className="w-5 h-5 text-red-400" />
            </div>
            <div>
              <p className="text-dark-400 text-sm">Saídas</p>
              <p className="text-xl font-bold text-red-400">{formatCurrency(totalSaidas)}</p>
            </div>
          </div>
        </div>
        
        <div className="glass-card p-4">
          <div className="flex items-center gap-3">
            <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
              saldo >= 0 ? 'bg-primary-500/20' : 'bg-red-500/20'
            }`}>
              <DollarSign className={`w-5 h-5 ${saldo >= 0 ? 'text-primary-400' : 'text-red-400'}`} />
            </div>
            <div>
              <p className="text-dark-400 text-sm">Saldo do Período</p>
              <p className={`text-xl font-bold ${saldo >= 0 ? 'text-primary-400' : 'text-red-400'}`}>
                {formatCurrency(saldo)}
              </p>
            </div>
          </div>
        </div>
        
        <div className="glass-card p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-blue-500/20 flex items-center justify-center">
              <FileText className="w-5 h-5 text-blue-400" />
            </div>
            <div>
              <p className="text-dark-400 text-sm">Lançamentos</p>
              <p className="text-xl font-bold text-white">{filteredLancamentos.length}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Filtros */}
      <div className="glass-card p-4">
        <div className="grid grid-cols-1 md:grid-cols-6 gap-4">
          <div className="relative md:col-span-2">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-dark-400" />
            <input
              type="text"
              placeholder="Buscar..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="input pl-12 w-full"
            />
          </div>
          
          <select
            value={filterPeriodo}
            onChange={(e) => setFilterPeriodo(e.target.value as PeriodoType)}
            className="input"
          >
            <option value="dia">Hoje</option>
            <option value="semana">Última Semana</option>
            <option value="mes">Este Mês</option>
            <option value="ano">Este Ano</option>
            <option value="personalizado">Personalizado</option>
          </select>
          
          <select
            value={filterTipo}
            onChange={(e) => setFilterTipo(e.target.value as TipoLancamento)}
            className="input"
          >
            <option value="todos">Todos os tipos</option>
            <option value="entrada">Entradas</option>
            <option value="saida">Saídas</option>
          </select>
          
          <select
            value={filterCategoria || ''}
            onChange={(e) => setFilterCategoria(e.target.value ? Number(e.target.value) : null)}
            className="input"
          >
            <option value="">Todas categorias</option>
            {categorias.map(c => (
              <option key={c.id} value={c.id}>{c.nome}</option>
            ))}
          </select>
          
          <select
            value={filterComNF}
            onChange={(e) => setFilterComNF(e.target.value as any)}
            className="input"
          >
            <option value="todos">Com/Sem NF</option>
            <option value="com_nf">Com NF</option>
            <option value="sem_nf">Sem NF</option>
          </select>
        </div>
        
        {filterPeriodo === 'personalizado' && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
            <div>
              <label className="block text-sm text-dark-300 mb-2">Data Início</label>
              <input
                type="date"
                value={dataInicio}
                onChange={(e) => setDataInicio(e.target.value)}
                className="input w-full"
              />
            </div>
            <div>
              <label className="block text-sm text-dark-300 mb-2">Data Fim</label>
              <input
                type="date"
                value={dataFim}
                onChange={(e) => setDataFim(e.target.value)}
                className="input w-full"
              />
            </div>
          </div>
        )}
      </div>

      {/* Gráficos */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Gráfico de Fluxo */}
        <div className="glass-card p-6">
          <h3 className="text-lg font-semibold text-white mb-4">Fluxo de Caixa</h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={dadosPorDia()}>
                <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                <XAxis dataKey="data" stroke="#9CA3AF" fontSize={12} />
                <YAxis stroke="#9CA3AF" fontSize={12} />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: '#1F2937', 
                    border: '1px solid #374151',
                    borderRadius: '8px'
                  }}
                  formatter={(value: number) => formatCurrency(value)}
                />
                <Bar dataKey="entradas" fill="#10B981" name="Entradas" />
                <Bar dataKey="saidas" fill="#EF4444" name="Saídas" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Gráfico por Categoria */}
        <div className="glass-card p-6">
          <h3 className="text-lg font-semibold text-white mb-4">Despesas por Categoria</h3>
          <div className="h-64">
            {dadosPorCategoria.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={dadosPorCategoria}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={80}
                    paddingAngle={5}
                    dataKey="value"
                  >
                    {dadosPorCategoria.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.cor || COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: '#1F2937', 
                      border: '1px solid #374151',
                      borderRadius: '8px'
                    }}
                    formatter={(value: number) => formatCurrency(value)}
                  />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex items-center justify-center h-full text-dark-400">
                Sem despesas no período
              </div>
            )}
          </div>
          {dadosPorCategoria.length > 0 && (
            <div className="flex flex-wrap gap-2 mt-4">
              {dadosPorCategoria.map((item, index) => (
                <div key={index} className="flex items-center gap-2 text-sm">
                  <div 
                    className="w-3 h-3 rounded-full" 
                    style={{ backgroundColor: item.cor || COLORS[index % COLORS.length] }}
                  />
                  <span className="text-dark-300">{item.name}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Lista de Lançamentos */}
      <div className="glass-card overflow-hidden">
        <div className="p-4 border-b border-dark-700">
          <h3 className="text-lg font-semibold text-white">Lançamentos</h3>
        </div>
        
        {filteredLancamentos.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Data</th>
                  <th>Descrição</th>
                  <th>Categoria</th>
                  <th>Conta</th>
                  <th>NF</th>
                  <th className="text-right">Entrada</th>
                  <th className="text-right">Saída</th>
                  <th>Conciliado</th>
                </tr>
              </thead>
              <tbody>
                {filteredLancamentos.map((lanc) => (
                  <tr key={lanc.id}>
                    <td className="text-dark-300">{formatDate(lanc.data)}</td>
                    <td>
                      <div>
                        <span className="font-medium text-white">{lanc.descricao}</span>
                        {lanc.venda_id && (
                          <span className="ml-2">
                            <Badge variant="primary" size="sm">Venda #{lanc.venda_id}</Badge>
                          </span>
                        )}
                      </div>
                    </td>
                    <td>
                      {lanc.categoria_id && (
                        <span 
                          className="px-2 py-1 rounded text-xs text-white"
                          style={{ 
                            backgroundColor: categorias.find(c => c.id === lanc.categoria_id)?.cor || '#3B82F6' 
                          }}
                        >
                          {categorias.find(c => c.id === lanc.categoria_id)?.nome}
                        </span>
                      )}
                    </td>
                    <td className="text-dark-300">
                      {contasBancarias.find(c => c.id === lanc.conta_bancaria_id)?.nome || '-'}
                    </td>
                    <td className="text-dark-300">
                      {lanc.numero_nf ? (
                        <div className="flex items-center gap-1 text-green-400">
                          <Receipt className="w-3 h-3" />
                          {lanc.numero_nf}
                        </div>
                      ) : '-'}
                    </td>
                    <td className="text-right text-green-400">
                      {lanc.tipo === 'entrada' ? formatCurrency(lanc.valor) : '-'}
                    </td>
                    <td className="text-right text-red-400">
                      {lanc.tipo === 'saida' ? formatCurrency(lanc.valor) : '-'}
                    </td>
                    <td>
                      {lanc.conciliado ? (
                        <CheckCircle className="w-4 h-4 text-green-400" />
                      ) : (
                        <Clock className="w-4 h-4 text-dark-500" />
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <EmptyState
            icon={<DollarSign className="w-10 h-10 text-dark-500" />}
            title="Nenhum lançamento"
            description="Faça lançamentos ou importe um arquivo OFX"
            action={
              <Button onClick={() => setIsModalOpen(true)} leftIcon={<Plus className="w-4 h-4" />}>
                Novo Lançamento
              </Button>
            }
          />
        )}
      </div>

      {/* Modal Novo Lançamento */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => { setIsModalOpen(false); resetForm() }}
        title="Novo Lançamento"
        size="lg"
      >
        <form onSubmit={handleSubmitLancamento} className="space-y-4">
          <div className="flex gap-2 mb-4">
            <button
              type="button"
              onClick={() => setFormData({ ...formData, tipo: 'entrada' })}
              className={`flex-1 py-3 rounded-lg font-medium transition-colors flex items-center justify-center gap-2 ${
                formData.tipo === 'entrada'
                  ? 'bg-green-500 text-white'
                  : 'bg-dark-700 text-dark-300 hover:bg-dark-600'
              }`}
            >
              <TrendingUp className="w-4 h-4" />
              Entrada
            </button>
            <button
              type="button"
              onClick={() => setFormData({ ...formData, tipo: 'saida' })}
              className={`flex-1 py-3 rounded-lg font-medium transition-colors flex items-center justify-center gap-2 ${
                formData.tipo === 'saida'
                  ? 'bg-red-500 text-white'
                  : 'bg-dark-700 text-dark-300 hover:bg-dark-600'
              }`}
            >
              <TrendingDown className="w-4 h-4" />
              Saída
            </button>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="md:col-span-2">
              <label className="block text-sm text-dark-300 mb-2">Descrição *</label>
              <input
                type="text"
                value={formData.descricao}
                onChange={(e) => setFormData({ ...formData, descricao: e.target.value })}
                className="input w-full"
                required
              />
            </div>
            
            <div>
              <label className="block text-sm text-dark-300 mb-2">Valor *</label>
              <input
                type="number"
                step="0.01"
                value={formData.valor}
                onChange={(e) => setFormData({ ...formData, valor: Number(e.target.value) })}
                className="input w-full"
                required
              />
            </div>
            
            <div>
              <label className="block text-sm text-dark-300 mb-2">Data *</label>
              <input
                type="date"
                value={formData.data}
                onChange={(e) => setFormData({ ...formData, data: e.target.value })}
                className="input w-full"
                required
              />
            </div>
            
            <div>
              <label className="block text-sm text-dark-300 mb-2">Categoria</label>
              <select
                value={formData.categoria_id || ''}
                onChange={(e) => setFormData({ ...formData, categoria_id: e.target.value ? Number(e.target.value) : null })}
                className="input w-full"
              >
                <option value="">Selecione...</option>
                {categorias
                  .filter(c => c.tipo === (formData.tipo === 'entrada' ? 'receita' : 'despesa'))
                  .map(c => (
                    <option key={c.id} value={c.id}>{c.nome}</option>
                  ))}
              </select>
            </div>
            
            <div>
              <label className="block text-sm text-dark-300 mb-2">Conta Bancária</label>
              <select
                value={formData.conta_bancaria_id || ''}
                onChange={(e) => setFormData({ ...formData, conta_bancaria_id: e.target.value ? Number(e.target.value) : null })}
                className="input w-full"
              >
                <option value="">Selecione...</option>
                {contasBancarias.map(c => (
                  <option key={c.id} value={c.id}>{c.nome}</option>
                ))}
              </select>
            </div>
            
            {formData.tipo === 'entrada' && (
              <div>
                <label className="block text-sm text-dark-300 mb-2">Vincular à Venda</label>
                <select
                  value={formData.venda_id || ''}
                  onChange={(e) => setFormData({ ...formData, venda_id: e.target.value ? Number(e.target.value) : null })}
                  className="input w-full"
                >
                  <option value="">Nenhuma</option>
                  {vendas.map(v => (
                    <option key={v.id} value={v.id}>
                      Venda #{v.id} - {formatCurrency(v.valor_total)}
                    </option>
                  ))}
                </select>
              </div>
            )}
            
            <div>
              <label className="block text-sm text-dark-300 mb-2">Nº NF</label>
              <input
                type="text"
                value={formData.numero_nf}
                onChange={(e) => setFormData({ ...formData, numero_nf: e.target.value })}
                className="input w-full"
              />
            </div>
          </div>
          
          <div className="flex justify-end gap-3 pt-4 border-t border-dark-700">
            <Button type="button" variant="secondary" onClick={() => { setIsModalOpen(false); resetForm() }}>
              Cancelar
            </Button>
            <Button type="submit" disabled={saving}>
              {saving ? 'Salvando...' : 'Salvar'}
            </Button>
          </div>
        </form>
      </Modal>

      {/* Modal DCTe/Frete */}
      <Modal
        isOpen={isDCTeModalOpen}
        onClose={() => setIsDCTeModalOpen(false)}
        title="Lançar Frete (CT-e)"
        size="lg"
      >
        <form onSubmit={handleSubmitDCTe} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm text-dark-300 mb-2">Nº CT-e</label>
              <input
                type="text"
                value={formDCTe.numero_cte}
                onChange={(e) => setFormDCTe({ ...formDCTe, numero_cte: e.target.value })}
                className="input w-full"
              />
            </div>
            
            <div>
              <label className="block text-sm text-dark-300 mb-2">Chave CT-e</label>
              <input
                type="text"
                value={formDCTe.chave_cte}
                onChange={(e) => setFormDCTe({ ...formDCTe, chave_cte: e.target.value })}
                className="input w-full"
                placeholder="44 dígitos"
              />
            </div>
            
            <div>
              <label className="block text-sm text-dark-300 mb-2">Transportadora</label>
              <input
                type="text"
                value={formDCTe.transportadora}
                onChange={(e) => setFormDCTe({ ...formDCTe, transportadora: e.target.value })}
                className="input w-full"
              />
            </div>
            
            <div>
              <label className="block text-sm text-dark-300 mb-2">Valor do Frete *</label>
              <input
                type="number"
                step="0.01"
                value={formDCTe.valor_frete}
                onChange={(e) => setFormDCTe({ ...formDCTe, valor_frete: Number(e.target.value) })}
                className="input w-full"
                required
              />
            </div>
            
            <div>
              <label className="block text-sm text-dark-300 mb-2">Data</label>
              <input
                type="date"
                value={formDCTe.data}
                onChange={(e) => setFormDCTe({ ...formDCTe, data: e.target.value })}
                className="input w-full"
              />
            </div>
            
            <div>
              <label className="block text-sm text-dark-300 mb-2">Categoria</label>
              <select
                value={formDCTe.categoria_id || ''}
                onChange={(e) => setFormDCTe({ ...formDCTe, categoria_id: e.target.value ? Number(e.target.value) : null })}
                className="input w-full"
              >
                <option value="">Selecione...</option>
                {categorias.filter(c => c.tipo === 'despesa').map(c => (
                  <option key={c.id} value={c.id}>{c.nome}</option>
                ))}
              </select>
            </div>
            
            <div>
              <label className="block text-sm text-dark-300 mb-2">Conta Bancária</label>
              <select
                value={formDCTe.conta_bancaria_id || ''}
                onChange={(e) => setFormDCTe({ ...formDCTe, conta_bancaria_id: e.target.value ? Number(e.target.value) : null })}
                className="input w-full"
              >
                <option value="">Selecione...</option>
                {contasBancarias.map(c => (
                  <option key={c.id} value={c.id}>{c.nome}</option>
                ))}
              </select>
            </div>
          </div>
          
          <div>
            <label className="block text-sm text-dark-300 mb-2">Observações</label>
            <textarea
              value={formDCTe.observacoes}
              onChange={(e) => setFormDCTe({ ...formDCTe, observacoes: e.target.value })}
              className="input w-full h-20 resize-none"
            />
          </div>
          
          <div className="flex justify-end gap-3 pt-4 border-t border-dark-700">
            <Button type="button" variant="secondary" onClick={() => setIsDCTeModalOpen(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={saving}>
              {saving ? 'Salvando...' : 'Lançar'}
            </Button>
          </div>
        </form>
      </Modal>

      {/* Modal Importação OFX */}
      <Modal
        isOpen={isOFXModalOpen}
        onClose={() => { setIsOFXModalOpen(false); setOfxData([]) }}
        title="Importar Extrato OFX"
        size="xl"
      >
        <div className="space-y-4">
          <div>
            <label className="block text-sm text-dark-300 mb-2">Conta Bancária *</label>
            <select
              value={filterContaBancaria || ''}
              onChange={(e) => setFilterContaBancaria(Number(e.target.value))}
              className="input w-full"
            >
              <option value="">Selecione a conta...</option>
              {contasBancarias.map(c => (
                <option key={c.id} value={c.id}>{c.nome}</option>
              ))}
            </select>
          </div>
          
          <div className="max-h-96 overflow-y-auto">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Data</th>
                  <th>Descrição</th>
                  <th>Tipo</th>
                  <th className="text-right">Valor</th>
                  <th>Categoria</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {ofxData.map((trn) => (
                  <tr key={trn.id} className={trn.duplicado ? 'opacity-50' : ''}>
                    <td className="text-dark-300">{formatDate(trn.data)}</td>
                    <td className="text-white">{trn.descricao}</td>
                    <td>
                      <Badge variant={trn.tipo === 'entrada' ? 'success' : 'danger'}>
                        {trn.tipo === 'entrada' ? 'Entrada' : 'Saída'}
                      </Badge>
                    </td>
                    <td className={`text-right font-medium ${trn.tipo === 'entrada' ? 'text-green-400' : 'text-red-400'}`}>
                      {formatCurrency(trn.valor)}
                    </td>
                    <td>
                      <select
                        value={ofxCategorizacao[trn.id] || ''}
                        onChange={(e) => setOfxCategorizacao({
                          ...ofxCategorizacao,
                          [trn.id]: Number(e.target.value)
                        })}
                        className="input text-sm"
                        disabled={trn.duplicado}
                      >
                        <option value="">Selecione...</option>
                        {categorias
                          .filter(c => c.tipo === (trn.tipo === 'entrada' ? 'receita' : 'despesa'))
                          .map(c => (
                            <option key={c.id} value={c.id}>{c.nome}</option>
                          ))}
                      </select>
                    </td>
                    <td>
                      {trn.duplicado ? (
                        <Badge variant="warning">Duplicado</Badge>
                      ) : (
                        <Badge variant="success">Novo</Badge>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          
          <div className="flex items-center justify-between pt-4 border-t border-dark-700">
            <div className="text-sm text-dark-400">
              {ofxData.filter(t => !t.duplicado).length} lançamentos serão importados
              {ofxData.filter(t => t.duplicado).length > 0 && (
                <span className="text-yellow-400 ml-2">
                  ({ofxData.filter(t => t.duplicado).length} duplicados ignorados)
                </span>
              )}
            </div>
            <div className="flex gap-3">
              <Button variant="secondary" onClick={() => { setIsOFXModalOpen(false); setOfxData([]) }}>
                Cancelar
              </Button>
              <Button 
                onClick={handleImportOFX} 
                disabled={saving || !filterContaBancaria}
              >
                {saving ? 'Importando...' : 'Importar'}
              </Button>
            </div>
          </div>
        </div>
      </Modal>
    </div>
  )
}
