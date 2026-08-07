'use client'

import Link from 'next/link'
import { Target, ChevronRight, AlertTriangle } from 'lucide-react'
import BudgetBar from './BudgetBar'
import { STATUS_TEXT } from '@/lib/budgets'
import type { BudgetProgress } from '@/lib/types'

interface Props {
  progresses: BudgetProgress[]
  /** Nombre d'objectifs affichés avant le lien « voir tout ». */
  limit?: number
  className?: string
}

/** Bandeau compact du dashboard. Invisible tant qu'aucun objectif n'est défini. */
export default function BudgetsStrip({ progresses, limit = 4, className = '' }: Props) {
  const visible = progresses.filter(p => !p.isPast && !p.isFuture)
  if (visible.length === 0) return null

  const shown = visible.slice(0, limit)
  const alerts = visible.filter(p => p.status === 'over' || p.status === 'risk')

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
              ? `${STATUS_TEXT[alerts[0].status]} — ${alerts[0].budget.tags?.name ?? 'toutes catégories'}`
              : `${alerts.length} objectifs en dépassement ou à risque`}
          </p>
        </div>
      )}

      <div className="px-5 py-4 space-y-4">
        {shown.map(p => (
          <BudgetBar key={p.budget.id} progress={p} size="sm" showFooter />
        ))}
      </div>
    </div>
  )
}
