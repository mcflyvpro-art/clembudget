'use client'

import Link from 'next/link'
import { Target, ChevronRight, AlertTriangle } from 'lucide-react'
import BudgetBar from './BudgetBar'
import { STATUS_TEXT, budgetName, budgetTint, alpha, viewBudget } from '@/lib/budgets'
import { useForecast } from '@/lib/budget-forecast'
import type { BudgetProgress } from '@/lib/types'

interface Props {
  progresses: BudgetProgress[]
  /** Nombre d'objectifs affichés avant le lien « voir tout ». */
  limit?: number
  className?: string
}

/** Bandeau compact du dashboard. Invisible tant qu'aucun objectif n'est défini. */
export default function BudgetsStrip({ progresses, limit = 4, className = '' }: Props) {
  const { isOn } = useForecast()

  const visible = progresses.filter(p => !p.isPast && !p.isFuture)
  if (visible.length === 0) return null

  const shown = visible.slice(0, limit)
  const alerts = visible.filter(p => {
    const s = viewBudget(p, isOn(p.budget.id)).status
    return s === 'over' || s === 'risk'
  })

  return (
    <div className={`bg-card border border-border rounded-2xl overflow-hidden ${className}`}>
      <Link
        href="/objectifs"
        className="flex items-center justify-between px-5 py-3 border-b border-border/60 hover:bg-muted/30 transition-colors"
      >
        <span className="flex items-center gap-2 text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
          <Target size={13} />
          Objectifs
        </span>
        <span className="flex items-center gap-1 text-[11px] text-muted-foreground">
          {visible.length > limit && `+${visible.length - limit}`}
          <ChevronRight size={14} />
        </span>
      </Link>

      {alerts.length > 0 && (
        <div className="flex items-start gap-2 px-5 py-2.5 bg-destructive/8 border-b border-border/40">
          <AlertTriangle size={13} className="text-destructive shrink-0 mt-0.5" />
          <p className="text-[11px] text-destructive leading-snug">
            {alerts.length === 1
              ? `${STATUS_TEXT[viewBudget(alerts[0], isOn(alerts[0].budget.id)).status]} — ${budgetName(alerts[0])}`
              : `${alerts.length} objectifs en dépassement ou à risque`}
          </p>
        </div>
      )}

      <div className="px-3 py-3 space-y-2">
        {shown.map(p => (
          // Liséré coloré : repérage instantané de la catégorie
          <div
            key={p.budget.id}
            className="flex gap-3 rounded-xl px-2.5 py-2.5"
            style={{ backgroundColor: alpha(budgetTint(p), 5) }}
          >
            <span
              className="w-1 self-stretch rounded-full shrink-0"
              style={{ backgroundColor: budgetTint(p) }}
            />
            <BudgetBar progress={p} size="sm" showFooter className="flex-1 min-w-0" />
          </div>
        ))}
      </div>
    </div>
  )
}
