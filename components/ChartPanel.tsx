'use client'

import { useState } from 'react'
import { ChevronDown } from 'lucide-react'
import { PieChart, Pie, Cell, ResponsiveContainer } from 'recharts'
import AddExpenseDesktopForm from '@/components/AddExpenseDesktopForm'
import { formatEUR } from '@/lib/utils'
import type { Tag, NewExpense } from '@/lib/types'

interface DataPoint {
  name: string
  value: number
  color: string
}

interface Props {
  data: DataPoint[]
  total: number
  month: string
  tags: Tag[]
  onAdd?: (data: NewExpense, tag: Tag | null) => Promise<void>
}

export default function ChartPanel({ data, total, month, tags, onAdd }: Props) {
  const isEmpty = data.length === 0
  const [activeIndex,  setActiveIndex]  = useState<number | undefined>(undefined)
  const [legendOpen,   setLegendOpen]   = useState(false)

  return (
    <div className="bg-card border border-border rounded-2xl overflow-hidden">
      {/* Header */}
      <div className="px-6 pt-5 pb-3 border-b border-border/60">
        <p className="text-xs text-muted-foreground uppercase tracking-wider font-medium capitalize">{month}</p>
        <p className="text-3xl font-semibold tabular-nums tracking-tight mt-0.5">{formatEUR(total)}</p>
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
                  isAnimationActive={false}
                  onMouseEnter={(_: unknown, index: number) => setActiveIndex(index)}
                  onMouseLeave={() => setActiveIndex(undefined)}
                >
                  {data.map((entry, i) => (
                    <Cell
                      key={i}
                      fill={entry.color}
                      opacity={activeIndex !== undefined && activeIndex !== i ? 0.55 : 1}
                      style={{ transition: 'opacity 0.2s ease' }}
                    />
                  ))}
                </Pie>
              </PieChart>
            </ResponsiveContainer>
            {/* Center label */}
            <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none select-none">
              {activeIndex !== undefined ? (
                <>
                  <span className="text-base font-semibold tabular-nums">{formatEUR(data[activeIndex]?.value ?? 0)}</span>
                  <span className="text-xs text-muted-foreground">{data[activeIndex]?.name}</span>
                </>
              ) : (
                <>
                  <span className="text-xl font-semibold tabular-nums">{formatEUR(total)}</span>
                  <span className="text-xs text-muted-foreground">ce mois</span>
                </>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Legend accordion */}
      {!isEmpty && (
        <div className="border-t border-border/60">
          <button
            onClick={() => setLegendOpen(v => !v)}
            className="w-full flex items-center justify-between px-6 py-3 text-left hover:bg-muted/30 transition-colors"
          >
            <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
              Catégories principales de la période étudiée
            </span>
            <ChevronDown
              size={14}
              className={`text-muted-foreground shrink-0 transition-transform duration-200 ${legendOpen ? '' : '-rotate-90'}`}
            />
          </button>
          {legendOpen && (
            <div className="px-6 pb-4 space-y-3">
              {data.slice(0, 8).map((item, i) => {
                const pct = total > 0 ? (item.value / total) * 100 : 0
                return (
                  <div key={item.name} className={`transition-opacity duration-200 ${activeIndex !== undefined && activeIndex !== i ? 'opacity-40' : ''}`}>
                    <div className="flex items-center justify-between mb-1">
                      <div className="flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: item.color }} />
                        <span className="text-sm">{item.name}</span>
                      </div>
                      <div className="flex items-center gap-2 text-sm tabular-nums">
                        <span className="text-muted-foreground">{pct.toFixed(0)}%</span>
                        <span className="font-medium w-20 text-right">{formatEUR(item.value)}</span>
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
          )}
        </div>
      )}

      {/* Bouton desktop — ajouter une dépense */}
      <div className="px-6 pb-6 pt-2 border-t border-border/40">
        <AddExpenseDesktopForm tags={tags} onAdd={onAdd} />
      </div>
    </div>
  )
}
