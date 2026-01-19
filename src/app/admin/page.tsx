'use client'

import { useEffect, useState } from 'react'
import { KPICard } from '@/components/ui/KPICard'
import { ChartCard, MonthlyBarChart, StatusDonutChart } from '@/components/ui/Charts'
import { LoadingSpinner, EmptyState } from '@/components/ui/Common'
import { fetchOrcamentos, Orcamento } from '@/lib/supabase'
import { formatCurrency, calcConversionRate } from '@/lib/utils'
import { TrendingUp, TrendingDown, Target, DollarSign, FileText, Activity, Clock } from 'lucide-react'

interface Stats {
  totalFechado: number
  totalPerdido: number
  totalAnalise: number
  fechados: number
  perdidos: number
  emAnalise: number
  total: number
  taxaConversao: number
}

interface ResumoMensal {
  [key: string]: {
    mes: string
    totalFechado: number
    totalPerdido: number
    totalAnalise: number
    fechados: number
    perdidos: number
    emAnalise: number
  }
}

export default function AdminDashboardPage() {
  const [orcamentos, setOrcamentos] = useState<Orcamento[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    try {
      setLoading(true)
      const data = await fetchOrcamentos()
      setOrcamentos(data)
      setError(null)
    } catch (err) {
      console.error('Erro ao carregar dados:', err)
      setError('Erro ao carregar dados. Verifique a conexão com o Supabase.')
    } finally {
      setLoading(false)
    }
  }

  // Calcular estatísticas
  const stats: Stats = orcamentos.reduce(
    (acc, orc) => {
      if (orc.status === 'Fechado') {
        acc.fechados++
        acc.totalFechado += orc.valor_fechado || 0
      } else if (orc.status === 'Análise') {
        acc.emAnalise++
        acc.totalAnalise += orc.valor_proposto || 0
      } else {
        acc.perdidos++
        acc.totalPerdido += orc.valor_proposto || 0
      }
      acc.total++
      return acc
    },
    { totalFechado: 0, totalPerdido: 0, totalAnalise: 0, fechados: 0, perdidos: 0, emAnalise: 0, total: 0, taxaConversao: 0 }
  )
  stats.taxaConversao = calcConversionRate(stats.fechados, stats.total)

  // Calcular resumo mensal para gráficos
  const resumoMensal: ResumoMensal = orcamentos.reduce((acc, orc) => {
    const mes = orc.mes
    if (!acc[mes]) {
      acc[mes] = { mes, totalFechado: 0, totalPerdido: 0, totalAnalise: 0, fechados: 0, perdidos: 0, emAnalise: 0 }
    }
    if (orc.status === 'Fechado') {
      acc[mes].fechados++
      acc[mes].totalFechado += orc.valor_fechado || 0
    } else if (orc.status === 'Análise') {
      acc[mes].emAnalise++
      acc[mes].totalAnalise += orc.valor_proposto || 0
    } else {
      acc[mes].perdidos++
      acc[mes].totalPerdido += orc.valor_proposto || 0
    }
    return acc
  }, {} as ResumoMensal)

  // Dados para gráfico de barras (ordenado por mês)
  const barChartData = Object.values(resumoMensal)
    .sort((a, b) => {
      const [mA, yA] = a.mes.split('/').map(Number)
      const [mB, yB] = b.mes.split('/').map(Number)
      return yA - yB || mA - mB
    })
    .map((item) => ({
      mes: item.mes,
      fechado: item.totalFechado,
      analise: item.totalAnalise,
      perdido: item.totalPerdido,
    }))

  // Dados para gráfico de pizza
  const pieChartData = [
    { name: 'Fechados', value: stats.fechados, color: '#22c55e' },
    { name: 'Em Análise', value: stats.emAnalise, color: '#f59e0b' },
    { name: 'Perdidos', value: stats.perdidos, color: '#ef4444' },
  ]

  if (loading) {
    return (
      <div className="flex items-center justify-center h-[60vh]">
        <LoadingSpinner size="lg" />
      </div>
    )
  }

  if (error) {
    return (
      <div className="p-6 text-center">
        <EmptyState
          icon={<FileText className="w-12 h-12 text-dark-500" />}
          title="Erro ao carregar dados"
          description={error}
        />
      </div>
    )
  }

  return (
    <div className="space-y-8">
      {/* Page Header */}
      <div>
        <h1 className="text-3xl lg:text-4xl font-bold font-heading text-white">
          Dashboard <span className="text-primary-400">Administrativo</span>
        </h1>
        <p className="text-dark-400 mt-2">
          Visão geral do desempenho de orçamentos
        </p>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
        <KPICard
          title="Total Fechado"
          value={formatCurrency(stats.totalFechado)}
          icon={<DollarSign className="w-6 h-6" />}
          trend={stats.fechados > 0 ? 'up' : undefined}
          subtitle={`${stats.fechados} orçamentos`}
          variant="success"
        />
        <KPICard
          title="Em Análise"
          value={formatCurrency(stats.totalAnalise)}
          icon={<Clock className="w-6 h-6" />}
          subtitle={`${stats.emAnalise} orçamentos`}
          variant="warning"
        />
        <KPICard
          title="Total Perdido"
          value={formatCurrency(stats.totalPerdido)}
          icon={<TrendingDown className="w-6 h-6" />}
          trend={stats.perdidos > 0 ? 'down' : undefined}
          subtitle={`${stats.perdidos} orçamentos`}
          variant="danger"
        />
        <KPICard
          title="Taxa de Conversão"
          value={`${stats.taxaConversao.toFixed(1)}%`}
          icon={<Target className="w-6 h-6" />}
          trend={stats.taxaConversao >= 50 ? 'up' : 'down'}
          subtitle="Fechados / Total"
          variant={stats.taxaConversao >= 50 ? 'success' : 'warning'}
        />
        <KPICard
          title="Total de Orçamentos"
          value={stats.total}
          icon={<FileText className="w-6 h-6" />}
          subtitle="Cadastrados no sistema"
          variant="info"
        />
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <ChartCard
            title="Evolução Mensal"
          >
            {barChartData.length > 0 ? (
              <MonthlyBarChart data={barChartData} />
            ) : (
              <div className="flex items-center justify-center h-[300px]">
                <EmptyState
                  icon={<Activity className="w-8 h-8 text-dark-500" />}
                  title="Sem dados"
                  description="Adicione orçamentos para ver o gráfico"
                />
              </div>
            )}
          </ChartCard>
        </div>
        <div>
          <ChartCard
            title="Distribuição"
          >
            {stats.total > 0 ? (
              <StatusDonutChart data={pieChartData} />
            ) : (
              <div className="flex items-center justify-center h-[300px]">
                <EmptyState
                  icon={<TrendingUp className="w-8 h-8 text-dark-500" />}
                  title="Sem dados"
                  description="Adicione orçamentos para ver o gráfico"
                />
              </div>
            )}
          </ChartCard>
        </div>
      </div>

      {/* Quick Stats */}
      <div className="glass-card p-6">
        <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
          <Activity className="w-5 h-5 text-primary-400" />
          Resumo Rápido
        </h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="p-4 rounded-xl bg-dark-800/50 border border-dark-700">
            <p className="text-sm text-dark-400">Ticket Médio (Fechados)</p>
            <p className="text-xl font-bold text-white mt-1">
              {stats.fechados > 0 
                ? formatCurrency(stats.totalFechado / stats.fechados) 
                : formatCurrency(0)}
            </p>
          </div>
          <div className="p-4 rounded-xl bg-dark-800/50 border border-dark-700">
            <p className="text-sm text-dark-400">Ticket Médio (Perdidos)</p>
            <p className="text-xl font-bold text-white mt-1">
              {stats.perdidos > 0 
                ? formatCurrency(stats.totalPerdido / stats.perdidos) 
                : formatCurrency(0)}
            </p>
          </div>
          <div className="p-4 rounded-xl bg-dark-800/50 border border-dark-700">
            <p className="text-sm text-dark-400">Meses com Dados</p>
            <p className="text-xl font-bold text-white mt-1">
              {Object.keys(resumoMensal).length}
            </p>
          </div>
          <div className="p-4 rounded-xl bg-dark-800/50 border border-dark-700">
            <p className="text-sm text-dark-400">Meta de Conversão</p>
            <p className="text-xl font-bold text-white mt-1">
              {stats.taxaConversao >= 60 ? '✅ Atingida' : '🎯 60%'}
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
