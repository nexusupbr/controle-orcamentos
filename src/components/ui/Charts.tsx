'use client'

import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend
} from 'recharts'
import { formatCurrency } from '@/lib/utils'

interface ChartCardProps {
  title: string
  children: React.ReactNode
}

export function ChartCard({ title, children }: ChartCardProps) {
  return (
    <div className="glass-card p-6 animate-slide-up">
      <h3 className="text-lg font-semibold text-white mb-6">{title}</h3>
      {children}
    </div>
  )
}

interface BarChartData {
  mes: string
  fechado: number
  analise?: number
  perdido: number
}

interface BarChartProps {
  data: BarChartData[]
}

export function MonthlyBarChart({ data }: BarChartProps) {
  return (
    <div className="h-80">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
          <XAxis 
            dataKey="mes" 
            stroke="#94a3b8" 
            fontSize={12}
            tickLine={false}
          />
          <YAxis 
            stroke="#94a3b8" 
            fontSize={12}
            tickLine={false}
            tickFormatter={(value) => `R$ ${(value / 1000).toFixed(0)}k`}
          />
          <Tooltip
            contentStyle={{
              backgroundColor: '#1e293b',
              border: '1px solid #334155',
              borderRadius: '12px',
              boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.3)',
            }}
            labelStyle={{ color: '#f8fafc', fontWeight: 600 }}
            formatter={(value: number) => [formatCurrency(value), '']}
          />
          <Bar 
            dataKey="fechado" 
            name="Fechado"
            fill="#10b981" 
            radius={[6, 6, 0, 0]}
            maxBarSize={50}
          />
          <Bar 
            dataKey="analise" 
            name="Em Análise"
            fill="#f59e0b" 
            radius={[6, 6, 0, 0]}
            maxBarSize={50}
          />
          <Bar 
            dataKey="perdido" 
            name="Perdido"
            fill="#ef4444" 
            radius={[6, 6, 0, 0]}
            maxBarSize={50}
          />
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}

interface PieChartData {
  name: string
  value: number
  color: string
}

interface DonutChartProps {
  data: PieChartData[]
}

export function StatusDonutChart({ data }: DonutChartProps) {
  const COLORS = ['#10b981', '#f59e0b', '#ef4444']
  
  return (
    <div className="h-80">
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie
            data={data}
            cx="50%"
            cy="50%"
            innerRadius={60}
            outerRadius={100}
            paddingAngle={5}
            dataKey="value"
            label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
            labelLine={false}
          >
            {data.map((entry, index) => (
              <Cell 
                key={`cell-${index}`} 
                fill={entry.color || COLORS[index % COLORS.length]}
                stroke="transparent"
              />
            ))}
          </Pie>
          <Tooltip
            contentStyle={{
              backgroundColor: '#1e293b',
              border: '1px solid #334155',
              borderRadius: '12px',
            }}
            formatter={(value: number) => [value, 'Quantidade']}
          />
          <Legend 
            verticalAlign="bottom"
            iconType="circle"
            formatter={(value) => <span className="text-dark-300">{value}</span>}
          />
        </PieChart>
      </ResponsiveContainer>
    </div>
  )
}
