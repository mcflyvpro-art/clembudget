'use client'

import { useRouter } from 'next/navigation'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { type Period, shiftAnchor, formatPeriodLabel, todayISO } from '@/lib/date-utils'

const TABS: { value: Period; label: string }[] = [
  { value: 'day',   label: "Jour" },
  { value: 'week',  label: 'Semaine' },
  { value: 'month', label: 'Mois' },
  { value: 'year',  label: 'Année' },
]

interface Props {
  period: Period
  anchor: string
}

export default function StatsPeriodNav({ period, anchor }: Props) {
  const router = useRouter()
  const today = todayISO()

  function go(newPeriod: Period, newAnchor: string) {
    router.push(`/stats?period=${newPeriod}&anchor=${newAnchor}`)
  }

  const label = formatPeriodLabel(period, anchor)
  const isOnToday = period === 'day' && anchor === today

  return (
    <div className="space-y-3 mb-6">
      {/* Period type tabs */}
      <div className="flex gap-1 bg-muted p-1 rounded-xl lg:max-w-sm">
        {TABS.map((tab) => (
          <button
            key={tab.value}
            onClick={() => go(tab.value, anchor)}
            className={`flex-1 text-center py-1.5 rounded-lg text-sm font-medium transition-all ${
              period === tab.value
                ? 'bg-card shadow-sm text-foreground'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Period navigation */}
      <div className="flex items-center gap-2">
        <button
          onClick={() => go(period, shiftAnchor(period, anchor, -1))}
          className="p-2 rounded-lg hover:bg-muted transition-colors text-muted-foreground hover:text-foreground"
          aria-label="Période précédente"
        >
          <ChevronLeft size={18} />
        </button>

        <div className="flex-1 text-center">
          <span className="text-sm font-medium capitalize">{label}</span>
        </div>

        <button
          onClick={() => go(period, shiftAnchor(period, anchor, 1))}
          className="p-2 rounded-lg hover:bg-muted transition-colors text-muted-foreground hover:text-foreground"
          aria-label="Période suivante"
        >
          <ChevronRight size={18} />
        </button>
      </div>

      {/* Quick return to today (day view only, when not already on today) */}
      {period === 'day' && !isOnToday && (
        <button
          onClick={() => go('day', today)}
          className="text-xs text-primary hover:underline underline-offset-2 w-full text-center"
        >
          Retour à aujourd&apos;hui
        </button>
      )}
    </div>
  )
}
