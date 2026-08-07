'use client'

import { useState, useEffect, useMemo } from 'react'
import { PieChart, Pie, Cell, ResponsiveContainer } from 'recharts'
import { formatEUR } from '@/lib/utils'

interface DataPoint {
  name: string
  value: number
  color: string
}

interface Props {
  data: DataPoint[]
}

const CustomLegend = ({ payload }: { payload?: { value: string; color: string }[] }) => {
  if (!payload?.length) return null
  return (
    <div className="flex flex-wrap justify-center gap-x-4 gap-y-2 mt-3">
      {payload.map((entry) => (
        <div key={entry.value} className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: entry.color }} />
          {entry.value}
        </div>
      ))}
    </div>
  )
}

export default function ExpensePieChart({ data }: Props) {
  const [activeIndex, setActiveIndex] = useState<number | undefined>(undefined)
  const [isAnimating, setIsAnimating] = useState(true)

  // Stable key basé sur le contenu — change uniquement si les données changent vraiment
  const pieKey = useMemo(
    () => data.map(d => `${d.name}:${Math.round(d.value)}`).join('|'),
    [data]
  )

  // Réinitialise l'état d'animation à chaque changement de données
  useEffect(() => {
    setActiveIndex(undefined)
    setIsAnimating(true)
  }, [pieKey])

  if (data.length === 0) {
    return (
      <div className="h-64 flex items-center justify-center text-sm text-muted-foreground">
        Pas de données
      </div>
    )
  }

  const total = data.reduce((s, d) => s + d.value, 0)

  return (
    <div>
      <div className="relative h-[280px]">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              key={pieKey}
              data={data}
              cx="50%"
              cy="45%"
              innerRadius={65}
              outerRadius={105}
              dataKey="value"
              paddingAngle={2}
              strokeWidth={0}
              startAngle={90}
              endAngle={-270}
              animationDuration={420}
              animationBegin={0}
              onAnimationEnd={() => setIsAnimating(false)}
              onMouseEnter={isAnimating ? undefined : (_: unknown, index: number) => setActiveIndex(index)}
              onMouseLeave={isAnimating ? undefined : () => setActiveIndex(undefined)}
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

        {/* Overlay invisible qui bloque la souris pendant l'animation */}
        {isAnimating && <div className="absolute inset-0 cursor-default" />}

        <div
          className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none select-none"
          style={{ top: '-10%' }}
        >
          {!isAnimating && activeIndex !== undefined && activeIndex < data.length ? (
            <>
              <span className="text-base font-semibold tabular-nums">{formatEUR(data[activeIndex].value)}</span>
              <span className="text-xs text-muted-foreground">{data[activeIndex].name}</span>
            </>
          ) : (
            <>
              <span className="text-xl font-semibold tabular-nums">{formatEUR(total)}</span>
              <span className="text-xs text-muted-foreground">Total</span>
            </>
          )}
        </div>
      </div>
      <CustomLegend payload={data.map(d => ({ value: d.name, color: d.color }))} />
    </div>
  )
}
