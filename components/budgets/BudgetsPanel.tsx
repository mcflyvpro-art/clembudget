'use client'

import Link from 'next/link'
import { Target, ChevronRight } from 'lucide-react'
import BudgetBar from './BudgetBar'
import { STATUS_TEXT, budgetPeriodLabel } from '@/lib/budgets'
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

      <div className="px-6 py-5 space-y-5">
        {visible.map(p => {
          const over = p.status === 'over'
          return (
            <div key={p.budget.id}>
              <BudgetBar progress={p} />
              <div className="flex items-baseline justify-between gap-2 mt-2 text-[11px]">
                <span className={over || p.status === 'risk' ? 'text-destructive font-medium' : 'text-muted-foreground'}>
                  {STATUS_TEXT[p.status]}
                </span>
                <span className="text-muted-foreground tabular-nums">
                  {over
                    ? `+${formatEUR(-p.remaining)}`
                    : p.perDayRemaining !== null
                      ? `${formatEUR(p.perDayRemaining)}/jour · ${p.daysLeft} j`
                      : `reste ${formatEUR(p.remaining)}`}
                </span>
              </div>
              {p.upcoming > 0 && (
                <p className="mt-1 text-[11px] text-muted-foreground">
                  Récurrentes à venir&nbsp;: {formatEUR(p.upcoming)} → fin de période
                  estimée à <span className={p.projected > Number(p.budget.amount) ? 'text-destructive font-medium' : ''}>
                    {formatEUR(p.projected)}
                  </span>{' '}
                  <span className="opacity-60">{budgetPeriodLabel(p)}</span>
                </p>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
