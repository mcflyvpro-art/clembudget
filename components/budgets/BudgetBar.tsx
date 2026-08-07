'use client'

import { Repeat } from 'lucide-react'
import TagBadge from '@/components/TagBadge'
import { formatEUR } from '@/lib/utils'
import {
  alpha,
  budgetColor,
  budgetTint,
  budgetName,
  budgetPeriodLabel,
  viewBudget,
} from '@/lib/budgets'
import { useForecast } from '@/lib/budget-forecast'
import type { BudgetProgress } from '@/lib/types'

/**
 * Barre de progression d'un objectif.
 *
 * Deux lectures, commutables par l'interrupteur ↻ :
 *  - réel      → seul le dépensé compte, la barre s'arrête là
 *  - prévision → les récurrences à venir s'ajoutent en hachuré et comptent
 *
 * Le choix est mémorisé par objectif et partagé par toutes les interfaces.
 */

interface Props {
  progress: BudgetProgress
  size?: 'sm' | 'md'
  /** Affiche la pastille de catégorie + les montants au-dessus de la barre. */
  showHeader?: boolean
  /** Affiche « reste X € · Y €/jour » sous la barre. */
  showFooter?: boolean
  /** Masque l'interrupteur ↻ (ex. affichage compact dans les stats). */
  hideToggle?: boolean
  className?: string
}

const HEIGHT = { sm: 'h-2', md: 'h-3' }

export default function BudgetBar({
  progress,
  size = 'md',
  showHeader = true,
  showFooter = false,
  hideToggle = false,
  className = '',
}: Props) {
  const { isOn, toggle } = useForecast()
  const forecast = isOn(progress.budget.id)
  const view = viewBudget(progress, forecast)

  const amount = Number(progress.budget.amount)
  const tint = budgetTint(progress)
  const color = budgetColor(progress, view.status)
  const over = view.status === 'over'
  const risk = view.status === 'risk'

  // Largeurs relatives au plafond, cumul écrêté à 100 %.
  const spentW = Math.min(100, (progress.spent / amount) * 100)
  const upcomingW = forecast ? Math.min(100 - spentW, (progress.upcoming / amount) * 100) : 0

  const hasUpcoming = progress.upcoming > 0
  const canToggle = hasUpcoming && !hideToggle

  return (
    <div className={className}>
      {showHeader && (
        <div className="flex items-center justify-between gap-2 mb-2">
          <div className="flex items-center gap-1.5 min-w-0">
            <TagBadge
              tag={{ name: budgetName(progress), color: tint }}
              size={size === 'sm' ? 'sm' : 'md'}
            />
            <span className="text-[11px] text-muted-foreground shrink-0">
              {budgetPeriodLabel(progress)}
            </span>
          </div>

          <div className="flex items-center gap-1.5 shrink-0">
            {canToggle && (
              <button
                type="button"
                onClick={() => toggle(progress.budget.id)}
                title={
                  forecast
                    ? `Récurrences à venir comptées (${formatEUR(progress.upcoming)}) — cliquer pour les retirer`
                    : `Récurrences à venir ignorées (${formatEUR(progress.upcoming)}) — cliquer pour les compter`
                }
                aria-pressed={forecast}
                className={`flex items-center gap-1 pl-1 pr-1.5 py-0.5 rounded-full text-[10px] font-medium border transition-all cursor-pointer ${
                  forecast
                    ? 'border-transparent'
                    : 'bg-muted border-transparent text-muted-foreground hover:text-foreground'
                }`}
                style={
                  forecast
                    ? { backgroundColor: alpha(tint, 16), color: tint, borderColor: alpha(tint, 25) }
                    : undefined
                }
              >
                <Repeat size={10} />
                {forecast ? 'avec' : 'sans'}
              </button>
            )}
            <span className="text-sm tabular-nums">
              <span className={over ? 'text-destructive font-semibold' : 'font-semibold'}>
                {formatEUR(view.total)}
              </span>
              <span className="text-muted-foreground font-normal"> / {formatEUR(amount)}</span>
            </span>
          </div>
        </div>
      )}

      <div
        className={`relative w-full ${HEIGHT[size]} rounded-full overflow-hidden`}
        style={{ backgroundColor: alpha(tint, 12) }}
      >
        {/* dépensé — dégradé + halo de la couleur de la catégorie */}
        <div
          className="absolute inset-y-0 left-0 rounded-full transition-[width] duration-500 ease-out"
          style={{
            width: `${spentW}%`,
            backgroundImage: `linear-gradient(90deg, ${alpha(color, 70)} 0%, ${color} 100%)`,
            boxShadow: `0 0 8px -1px ${alpha(color, 50)}`,
          }}
        />
        {/* récurrences à venir — hachures dans la même teinte */}
        {upcomingW > 0.5 && (
          <div
            className="absolute inset-y-0 transition-[width] duration-500 ease-out"
            style={{
              left: `${spentW}%`,
              width: `${upcomingW}%`,
              backgroundImage: `repeating-linear-gradient(45deg, ${color} 0 3px, transparent 3px 7px)`,
              opacity: 0.6,
            }}
          />
        )}
      </div>

      {showFooter && (
        <div className="flex items-baseline justify-between gap-2 mt-1.5 text-[11px]">
          <span
            className={
              over || risk ? 'text-destructive font-medium' : 'text-muted-foreground'
            }
          >
            {view.remaining < 0
              ? `Dépassé de ${formatEUR(-view.remaining)}`
              : `Reste ${formatEUR(view.remaining)}`}
          </span>
          {view.perDayRemaining !== null && view.perDayRemaining > 0 && (
            <span className="text-muted-foreground tabular-nums">
              {formatEUR(view.perDayRemaining)}/jour · {progress.daysLeft} j
            </span>
          )}
        </div>
      )}
    </div>
  )
}
