'use client'

import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts'

interface DataPoint {
  name: string
  value: number
  color: string
}

interface Props {
  data: DataPoint[]
  total: number
  avgPerDay: number
  projectedTotal: number
  daysElapsed: number
  month: string
}

function formatAmount(n: number) {
  return new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' }).format(n)
}

const CustomTooltip = ({ active, payload }: { active?: boolean; payload?: { name: string; value: number; payload: DataPoint }[] }) => {
  if (!active || !payload?.length) return null
  const { name, value } = payload[0]
  return (
    <div className="bg-card border border-border rounded-xl px-3 py-2 shadow-md text-sm">
      <p className="font-medium">{name}</p>
      <p className="text-muted-foreground tabular-nums">{formatAmount(value)}</p>
    </div>
  )
}

export default function ChartPanel({ data, total, avgPerDay, projectedTotal, month }: Props) {
  const isEmpty = data.length === 0

  return (
    <div className="bg-card border border-border rounded-2xl overflow-hidden">
      {/* Header */}
      <div className="px-6 pt-5 pb-3 border-b border-border/60">
        <p className="text-xs text-muted-foreground uppercase tracking-wider font-medium capitalize">{month}</p>
        <p className="text-3xl font-semibold tabular-nums tracking-tight mt-0.5">{formatAmount(total)}</p>
        <p className="text-sm text-muted-foreground mt-1 tabular-nums">
          {formatAmount(avgPerDay)}/jour &nbsp;·&nbsp; {formatAmount(projectedTotal)} prévu
        </p>
      </div>

      {/* Donut chart */}
      <div className="px-4 pt-4">
        {isEmpty ? (
          <div className="h-52 flex items-center justify-center text-sm text-muted-foreground">
            Aucune dépense ce mois
          </div>
        ) : (
          <div className="relative h-52">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={data}
                  cx="50%"
                  cy="50%"
                  innerRadius={62}
                  outerRadius={96}
                  dataKey="value"
                  paddingAngle={2}
                  strokeWidth={0}
                  startAngle={90}
                  endAngle={-270}
                >
                  {data.map((entry, i) => (
                    <Cell key={i} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip content={<CustomTooltip />} />
              </PieChart>
            </ResponsiveContainer>
            {/* Center label */}
            <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none select-none">
              <span className="text-xl font-semibold tabular-nums">{formatAmount(total)}</span>
              <span className="text-xs text-muted-foreground">ce mois</span>
            </div>
          </div>
        )}
      </div>

      {/* Legend with bars */}
      <div className="px-6 pb-6 pt-2 space-y-3">
        {data.slice(0, 8).map((item) => {
          const pct = total > 0 ? (item.value / total) * 100 : 0
          return (
            <div key={item.name}>
              <div className="flex items-center justify-between mb-1">
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: item.color }} />
                  <span className="text-sm">{item.name}</span>
                </div>
                <div className="flex items-center gap-2 text-sm tabular-nums">
                  <span className="text-muted-foreground">{pct.toFixed(0)}%</span>
                  <span className="font-medium w-20 text-right">{formatAmount(item.value)}</span>
                </div>
              </div>
              <div className="h-1 rounded-full bg-muted overflow-hidden">
                <div
                  className="h-full rounded-full transition-all"
                  style={{ width: `${pct}%`, backgroundColor: item.color + 'cc' }}
                />
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
