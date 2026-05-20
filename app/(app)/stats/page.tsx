import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import {
  fetchExpensesForStats,
  getStartOfMonth, getEndOfMonth,
  getStartOfWeek, getEndOfWeek,
  getStartOfYear, getEndOfYear,
} from '@/lib/db/expenses'
import ExpensePieChart from '@/components/charts/ExpensePieChart'
import type { Expense } from '@/lib/types'

type Period = 'week' | 'month' | 'year'

function getRange(period: Period): [string, string] {
  if (period === 'week')  return [getStartOfWeek(),  getEndOfWeek()]
  if (period === 'year')  return [getStartOfYear(),  getEndOfYear()]
  return [getStartOfMonth(), getEndOfMonth()]
}

function getDaysElapsed(period: Period) {
  const [from] = getRange(period)
  const fromDate = new Date(from + 'T00:00:00')
  const now = new Date()
  return Math.max(1, Math.round((now.getTime() - fromDate.getTime()) / (1000 * 60 * 60 * 24)) + 1)
}

function formatAmount(n: number) {
  return new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' }).format(n)
}

const PERIODS: { value: Period; label: string }[] = [
  { value: 'week',  label: 'Cette semaine' },
  { value: 'month', label: 'Ce mois' },
  { value: 'year',  label: 'Cette année' },
]

interface Props {
  searchParams: Promise<{ period?: string }>
}

export default async function StatsPage({ searchParams }: Props) {
  const params = await searchParams
  const period: Period = (params.period as Period) ?? 'month'
  const [fromDate, toDate] = getRange(period)

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  // Expands recurring expenses across the full period (including future)
  const expenses = await fetchExpensesForStats(supabase, user.id, fromDate, toDate)
  const regular = expenses.filter((e: Expense) => !e.is_exceptional)

  const total = expenses.reduce((s: number, e: Expense) => s + Number(e.amount), 0)
  const regularTotal = regular.reduce((s: number, e: Expense) => s + Number(e.amount), 0)
  const days = getDaysElapsed(period)
  const avg = regularTotal / days

  const byTag: Record<string, { name: string; value: number; color: string }> = {}
  for (const e of expenses) {
    const key = e.tag_id ?? 'none'
    const name = e.tags?.name ?? 'Sans catégorie'
    const color = e.tags?.color ?? '#c0b8b0'
    if (!byTag[key]) byTag[key] = { name, value: 0, color }
    byTag[key].value += Number(e.amount)
  }
  const pieData = Object.values(byTag).sort((a, b) => b.value - a.value)
  const topCategory = pieData[0]
  const hasExceptional = expenses.some((e: Expense) => e.is_exceptional)

  return (
    <div className="max-w-3xl lg:max-w-none">
      {/* Period tabs */}
      <div className="flex gap-1 bg-muted p-1 rounded-xl mb-6 lg:max-w-sm">
        {PERIODS.map((p) => (
          <a
            key={p.value}
            href={`/stats?period=${p.value}`}
            className={`flex-1 text-center py-1.5 rounded-lg text-sm font-medium transition-all whitespace-nowrap ${
              period === p.value
                ? 'bg-card shadow-sm text-foreground'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            {p.label}
          </a>
        ))}
      </div>

      {/* Note on year view */}
      {period === 'year' && (
        <p className="text-xs text-muted-foreground mb-4 flex items-center gap-1.5">
          <span className="w-1.5 h-1.5 rounded-full bg-primary inline-block" />
          Les dépenses récurrentes incluent les occurrences futures de cette année
        </p>
      )}

      {/* Desktop: two-column / Mobile: single column */}
      <div className="lg:grid lg:grid-cols-[1fr_320px] lg:gap-8 lg:items-start space-y-6 lg:space-y-0">

        {/* Chart */}
        <div className="bg-card rounded-2xl border border-border p-6">
          <h2 className="text-sm font-medium text-muted-foreground mb-4 uppercase tracking-wide">
            Répartition par catégorie
          </h2>
          <ExpensePieChart data={pieData} />

          {pieData.length > 0 && (
            <div className="mt-6 space-y-3 border-t border-border pt-5">
              {pieData.map((item) => {
                const pct = total > 0 ? (item.value / total) * 100 : 0
                return (
                  <div key={item.name}>
                    <div className="flex items-center justify-between mb-1">
                      <div className="flex items-center gap-2">
                        <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: item.color }} />
                        <span className="text-sm">{item.name}</span>
                      </div>
                      <div className="flex items-center gap-3 text-sm tabular-nums">
                        <span className="text-muted-foreground">{pct.toFixed(0)}%</span>
                        <span className="font-medium w-20 text-right">{formatAmount(item.value)}</span>
                      </div>
                    </div>
                    <div className="h-1 rounded-full bg-muted overflow-hidden">
                      <div
                        className="h-full rounded-full"
                        style={{ width: `${pct}%`, backgroundColor: item.color + 'cc' }}
                      />
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>

        {/* Insights */}
        <div className="space-y-3">
          <div className="bg-card rounded-xl border border-border p-5">
            <p className="text-xs text-muted-foreground uppercase tracking-wide mb-0.5">Total</p>
            <p className="text-3xl font-semibold tabular-nums">{formatAmount(total)}</p>
          </div>

          <div className="bg-card rounded-xl border border-border p-5">
            <p className="text-xs text-muted-foreground uppercase tracking-wide mb-0.5">Moyenne / jour</p>
            <p className="text-3xl font-semibold tabular-nums">{formatAmount(avg)}</p>
            <p className="text-xs text-muted-foreground mt-1">sur {days} jours écoulés</p>
          </div>

          {topCategory && (
            <div className="bg-card rounded-xl border border-border p-5">
              <p className="text-xs text-muted-foreground uppercase tracking-wide mb-2">Catégorie principale</p>
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: topCategory.color }} />
                <span className="font-medium">{topCategory.name}</span>
                <span className="text-muted-foreground tabular-nums ml-auto">{formatAmount(topCategory.value)}</span>
              </div>
            </div>
          )}

          {hasExceptional && (
            <div className="bg-amber-50 rounded-xl border border-amber-100 p-5">
              <p className="text-xs text-amber-600 uppercase tracking-wide mb-0.5">Hors exceptionnel</p>
              <p className="text-3xl font-semibold tabular-nums text-amber-800">{formatAmount(regularTotal)}</p>
            </div>
          )}

          {pieData.length === 0 && (
            <div className="bg-card rounded-xl border border-border p-5 text-center text-sm text-muted-foreground">
              Aucune dépense sur cette période
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
