'use client'

import Link from 'next/link'
import { Target, ChevronRight } from 'lucide-react'
import BudgetBar from './BudgetBar'
import { STATUS_TEXT, budgetTint, alpha, viewBudget } from '@/lib/budgets'
import { useForecast, useIncludeRecurring } from '@/lib/budget-forecast'
import { formatEUR } from '@/lib/utils'
import type { BudgetProgress } from '@/lib/types'

interface Props {
  progresses: BudgetProgress[]
  className?: string
}

/**
 * Carte détaillée de la page Stats.
 * Affiche toujours l'état de la période EN COURS de chaque objectif,
 * indépendamment du filtre de dates (le libellé le dit explicitement).
 */
export default function BudgetsPanel({ progresses, className = '' }: Props) {
  const { isOn } = useForecast()
  const { on: includeRecurring } = useIncludeRecurring()

  const visible = progresses.filter(p => !p.isPast && !p.isFuture)
  if (visible.length === 0) return null

  return (
    <div className={`bg-card rounded-xl border border-border overflow-hidden ${className}`}>
      <Link
        href="/objectifs"
        className="flex items-center justify-between px-6 py-4 border-b border-border/60 hover:bg-muted/30 transition-colors"
      >
        <span className="flex items-center gap-2 text-xs text-muted-foreground uppercase tracking-wide">
          <Target size={13} />
          Objectifs — période en cours
        </span>
        <ChevronRight size={14} className="text-muted-foreground" />
      </Link>

      <div className="p-3 space-y-2">
        {visible.map(p => {
          const forecast = isOn(p.budget.id)
          const view = viewBudget(p, forecast, includeRecurring)
          const tint = budgetTint(p)
          const alert = view.status === 'over' || view.status === 'risk'
          const effUpcoming = includeRecurring ? p.upcoming : p.upcoming - p.upcomingRecurring
          const effProjected = view.total + (forecast ? 0 : effUpcoming)

          return (
            <div
              key={p.budget.id}
              className="flex gap-3 rounded-xl px-3 py-3"
              style={{ backgroundColor: alpha(tint, 5) }}
            >
              <span
                className="w-1 self-stretch rounded-full shrink-0"
                style={{ backgroundColor: tint }}
              />
              <div className="flex-1 min-w-0">
                <BudgetBar progress={p} />

                <div className="flex items-baseline justify-between gap-2 mt-2 text-[11px]">
                  <span className={alert ? 'text-destructive font-medium' : 'text-muted-foreground'}>
                    {STATUS_TEXT[view.status]}
                  </span>
                  <span className="text-muted-foreground tabular-nums">
                    {view.remaining < 0
                      ? `+${formatEUR(-view.remaining)}`
                      : view.perDayRemaining !== null
                        ? `${formatEUR(view.perDayRemaining)}/jour · ${p.daysLeft} j`
                        : `reste ${formatEUR(view.remaining)}`}
                  </span>
                </div>

                {includeRecurring && effUpcoming > 0 && (
                  <p className="mt-1.5 text-[11px] text-muted-foreground leading-snug">
                    {forecast ? (
                      <>
                        Récurrences comptées&nbsp;: {formatEUR(effUpcoming)} — fin de période
                        estimée à{' '}
                        <span className={effProjected > Number(p.budget.amount) ? 'text-destructive font-medium' : 'font-medium'}>
                          {formatEUR(effProjected)}
                        </span>
                      </>
                    ) : (
                      <>
                        {formatEUR(effUpcoming)} de récurrences à venir ne sont pas comptés
                      </>
                    )}
                  </p>
                )}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
