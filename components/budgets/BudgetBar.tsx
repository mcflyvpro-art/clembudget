'use client'

import { formatEUR } from '@/lib/utils'
import { budgetColor, budgetName, budgetPeriodLabel } from '@/lib/budgets'
import type { BudgetProgress } from '@/lib/types'

/**
 * Barre de progression d'un objectif, en deux segments :
 *  - plein     → déjà dépensé à ce jour
 *  - hachuré   → récurrentes déjà prévues d'ici la fin de la période
 * Un liseré marque le plafond quand le projeté le dépasse.
 */

interface Props {
  progress: BudgetProgress
  size?: 'sm' | 'md'
  /** Affiche le nom + la période au-dessus de la barre. */
  showHeader?: boolean
  /** Affiche « reste X € » sous la barre. */
  showFooter?: boolean
  className?: string
}

const HEIGHT = { sm: 'h-1.5', md: 'h-2.5' }

export default function BudgetBar({
  progress,
  size = 'md',
  showHeader = true,
  showFooter = false,
  className = '',
}: Props) {
  const amount = Number(progress.budget.amount)
  const color = budgetColor(progress)
  const over = progress.status === 'over'

  // Largeurs relatives au plafond, écrêtées à 100 % au total.
  const spentW = Math.min(100, (progress.spent / amount) * 100)
  const upcomingW = Math.min(100 - spentW, (progress.upcoming / amount) * 100)

  return (
    <div className={className}>
      {showHeader && (
        <div className="flex items-baseline justify-between gap-2 mb-1.5">
          <div className="flex items-center gap-2 min-w-0">
            <span
              className="w-2.5 h-2.5 rounded-full shrink-0"
              style={{ backgroundColor: color }}
            />
            <span className="text-sm font-medium truncate">{budgetName(progress)}</span>
            <span className="text-[11px] text-muted-foreground shrink-0">
              {budgetPeriodLabel(progress)}
            </span>
          </div>
          <span className="text-sm tabular-nums shrink-0">
            <span className={over ? 'text-destructive font-semibold' : 'font-medium'}>
              {formatEUR(progress.spent)}
            </span>
            <span className="text-muted-foreground"> / {formatEUR(amount)}</span>
          </span>
        </div>
      )}

      <div className={`relative w-full ${HEIGHT[size]} rounded-full bg-muted overflow-hidden`}>
        {/* dépensé */}
        <div
          className="absolute inset-y-0 left-0 rounded-full transition-[width] duration-300"
          style={{ width: `${spentW}%`, backgroundColor: color }}
        />
        {/* récurrentes à venir */}
        {upcomingW > 0.5 && (
          <div
            className="absolute inset-y-0 transition-[width] duration-300"
            style={{
              left: `${spentW}%`,
              width: `${upcomingW}%`,
              backgroundImage: `repeating-linear-gradient(45deg, ${color} 0 3px, transparent 3px 6px)`,
              opacity: 0.55,
            }}
          />
        )}
      </div>

      {showFooter && (
        <div className="flex items-baseline justify-between gap-2 mt-1.5 text-[11px]">
          <span className={over ? 'text-destructive font-medium' : 'text-muted-foreground'}>
            {over
              ? `Dépassé de ${formatEUR(-progress.remaining)}`
              : `Reste ${formatEUR(progress.remaining)}`}
          </span>
          {progress.perDayRemaining !== null && progress.perDayRemaining > 0 && (
            <span className="text-muted-foreground tabular-nums">
              {formatEUR(progress.perDayRemaining)}/jour · {progress.daysLeft} j
            </span>
          )}
        </div>
      )}
    </div>
  )
}
