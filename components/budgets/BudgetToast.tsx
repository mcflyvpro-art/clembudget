'use client'

import { useEffect } from 'react'
import { AlertTriangle, TrendingUp } from 'lucide-react'
import TagBadge from '@/components/TagBadge'
import { budgetName, budgetPeriodLabel, budgetTint, viewBudget } from '@/lib/budgets'
import { useForecast, useIncludeRecurring } from '@/lib/budget-forecast'
import { formatEUR } from '@/lib/utils'
import type { BudgetProgress } from '@/lib/types'

interface Props {
  alerts: BudgetProgress[]
  onDone: () => void
  /** Durée d'affichage en ms. */
  duration?: number
}

/** Bandeau flottant après l'ajout d'une dépense qui fait franchir un seuil. */
export default function BudgetToast({ alerts, onDone, duration = 5000 }: Props) {
  const { isOn } = useForecast()
  const { on: includeRecurring } = useIncludeRecurring()

  useEffect(() => {
    if (alerts.length === 0) return
    const t = setTimeout(onDone, duration)
    return () => clearTimeout(t)
  }, [alerts, onDone, duration])

  if (alerts.length === 0) return null

  return (
    <div className="fixed inset-x-4 bottom-24 z-40 flex flex-col gap-2 lg:inset-x-auto lg:right-8 lg:bottom-8 lg:w-80">
      {alerts.slice(0, 2).map(p => {
        const view = viewBudget(p, isOn(p.budget.id), includeRecurring)
        const over = view.status === 'over'
        return (
          <button
            key={p.budget.id}
            onClick={onDone}
            className={`w-full text-left flex items-start gap-2.5 px-4 py-3 rounded-xl border shadow-lg backdrop-blur transition-all ${
              over
                ? 'bg-destructive/10 border-destructive/40'
                : 'bg-card border-border'
            }`}
          >
            {over ? (
              <AlertTriangle size={15} className="text-destructive shrink-0 mt-0.5" />
            ) : (
              <TrendingUp size={15} className="text-muted-foreground shrink-0 mt-0.5" />
            )}
            <div className="min-w-0">
              <p className={`text-sm font-medium ${over ? 'text-destructive' : ''}`}>
                {over ? 'Objectif dépassé' : view.status === 'risk' ? 'Dépassement prévu' : 'Bientôt la limite'}
              </p>
              <p className="flex items-center gap-1.5 mt-0.5 text-[11px] text-muted-foreground min-w-0">
                <TagBadge tag={{ name: budgetName(p), color: budgetTint(p) }} />
                <span className="truncate">
                  {budgetPeriodLabel(p)} ·{' '}
                  {view.remaining < 0
                    ? `+${formatEUR(-view.remaining)}`
                    : `reste ${formatEUR(view.remaining)}`}
                </span>
              </p>
            </div>
          </button>
        )
      })}
    </div>
  )
}
