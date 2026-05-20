import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import type { Expense } from '@/lib/types'
import TagBadge from '@/components/TagBadge'
import DeleteButton from '@/components/DeleteButton'

function formatAmount(n: number) {
  return new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' }).format(n)
}

function monthKey(dateStr: string) {
  // "2025-04-15" → "2025-04"
  return dateStr.slice(0, 7)
}

function monthLabel(key: string) {
  const [y, m] = key.split('-')
  return new Date(Number(y), Number(m) - 1, 1).toLocaleDateString('fr-FR', {
    month: 'long',
    year: 'numeric',
  })
}

function groupByMonth(expenses: Expense[]) {
  const groups: Record<string, Expense[]> = {}
  for (const e of expenses) {
    const k = monthKey(e.date)
    if (!groups[k]) groups[k] = []
    groups[k].push(e)
  }
  // Sort months newest → oldest
  return Object.entries(groups).sort(([a], [b]) => b.localeCompare(a))
}

export default async function ArchivePage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data } = await supabase
    .from('expenses')
    .select('*, tags(*)')
    .eq('user_id', user.id)
    .order('date', { ascending: false })
    .order('created_at', { ascending: false })

  const expenses = (data ?? []) as Expense[]
  const grouped = groupByMonth(expenses)

  const totalAll = expenses.reduce((s, e) => s + Number(e.amount), 0)

  return (
    <div className="max-w-2xl">
      <div className="mb-6">
        <h1 className="text-2xl font-semibold">Historique</h1>
        <p className="text-sm text-muted-foreground mt-1">
          {expenses.length} dépense{expenses.length !== 1 ? 's' : ''} ·{' '}
          {formatAmount(totalAll)} au total
        </p>
      </div>

      {grouped.length === 0 ? (
        <div className="text-center py-16 text-muted-foreground text-sm">
          Aucune dépense enregistrée.
        </div>
      ) : (
        <div className="space-y-8">
          {grouped.map(([key, monthExpenses]) => {
            const monthTotal = monthExpenses.reduce((s, e) => s + Number(e.amount), 0)
            const regularTotal = monthExpenses
              .filter((e) => !e.is_exceptional)
              .reduce((s, e) => s + Number(e.amount), 0)

            return (
              <div key={key}>
                {/* Month header */}
                <div className="flex items-baseline justify-between mb-3 pb-2 border-b border-border">
                  <h2 className="font-medium capitalize">{monthLabel(key)}</h2>
                  <div className="text-right">
                    <span className="font-semibold tabular-nums">{formatAmount(monthTotal)}</span>
                    {regularTotal !== monthTotal && (
                      <span className="text-xs text-muted-foreground ml-2 tabular-nums">
                        ({formatAmount(regularTotal)} hors excep.)
                      </span>
                    )}
                  </div>
                </div>

                {/* Expenses */}
                <div className="space-y-1">
                  {monthExpenses.map((expense) => (
                    <div
                      key={expense.id}
                      className="flex items-center gap-3 bg-card rounded-xl px-3 py-2.5 border border-border/60 group"
                    >
                      <span className="tabular-nums font-medium text-sm w-16 shrink-0 text-right">
                        {formatAmount(Number(expense.amount))}
                      </span>

                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-sm truncate">{expense.label}</span>
                          {expense.is_recurring && (
                            <span className="text-[10px] text-muted-foreground bg-muted px-1.5 py-0.5 rounded-full">↻</span>
                          )}
                          {expense.is_exceptional && (
                            <span className="text-[10px] text-muted-foreground bg-muted px-1.5 py-0.5 rounded-full">excep.</span>
                          )}
                        </div>
                        <div className="flex items-center gap-2 mt-0.5">
                          {expense.tags && <TagBadge tag={expense.tags} />}
                          <span className="text-[11px] text-muted-foreground">
                            {new Date(expense.date + 'T00:00:00').toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })}
                          </span>
                        </div>
                      </div>

                      <div className="shrink-0 opacity-0 group-hover:opacity-100 focus-within:opacity-100 transition-opacity">
                        <DeleteButton id={expense.id} />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
