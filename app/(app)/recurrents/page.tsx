import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import type { Expense, Tag } from '@/lib/types'
import TagBadge from '@/components/TagBadge'
import EditRecurringSheet from '@/components/EditRecurringSheet'
import DeleteButton from '@/components/DeleteButton'

function formatAmount(n: number) {
  return new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' }).format(n)
}

function describeFrequency(expense: Expense): string {
  const anchor = new Date(expense.date + 'T00:00:00')
  const day = anchor.getDate()
  const weekdays = ['dimanche', 'lundi', 'mardi', 'mercredi', 'jeudi', 'vendredi', 'samedi']
  const months = ['janvier', 'février', 'mars', 'avril', 'mai', 'juin', 'juillet', 'août', 'septembre', 'octobre', 'novembre', 'décembre']

  switch (expense.recurrence_frequency) {
    case 'daily':   return 'Tous les jours'
    case 'weekly':  return `Chaque ${weekdays[anchor.getDay()]}`
    case 'monthly': return `Le ${day} de chaque mois`
    case 'yearly':  return `Le ${day} ${months[anchor.getMonth()]} chaque année`
    default:        return 'Récurrent'
  }
}

function totalMonthly(expenses: Expense[]): number {
  return expenses.reduce((sum, e) => {
    const amt = Number(e.amount)
    switch (e.recurrence_frequency) {
      case 'daily':   return sum + amt * 30
      case 'weekly':  return sum + amt * 4.33
      case 'monthly': return sum + amt
      case 'yearly':  return sum + amt / 12
      default:        return sum + amt
    }
  }, 0)
}

export default async function RecurrentsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const [expensesResult, tagsResult] = await Promise.all([
    supabase
      .from('expenses')
      .select('*, tags(*)')
      .eq('user_id', user.id)
      .eq('is_recurring', true)
      .order('label'),
    supabase
      .from('tags')
      .select('*')
      .eq('user_id', user.id)
      .order('name'),
  ])

  const expenses = (expensesResult.data ?? []) as Expense[]
  const tags = (tagsResult.data ?? []) as Tag[]

  const monthlyEquiv = totalMonthly(expenses)

  return (
    <div className="max-w-2xl">
      <div className="mb-6">
        <h1 className="text-2xl font-semibold">Dépenses récurrentes</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Automatiquement comptabilisées dans vos statistiques
        </p>
      </div>

      {expenses.length > 0 && (
        <div className="bg-muted/60 rounded-xl px-4 py-3 mb-6 flex items-center justify-between">
          <span className="text-sm text-muted-foreground">Équivalent mensuel total</span>
          <span className="font-semibold tabular-nums">{formatAmount(monthlyEquiv)}</span>
        </div>
      )}

      {expenses.length === 0 ? (
        <div className="text-center py-16 text-muted-foreground text-sm">
          <p className="text-2xl mb-2">↻</p>
          Aucune dépense récurrente.<br />
          Ajoute-en une depuis le dashboard en cochant &ldquo;Récurrente&rdquo;.
        </div>
      ) : (
        <div className="space-y-2">
          {expenses.map((expense) => (
            <div
              key={expense.id}
              className="bg-card border border-border rounded-xl px-4 py-3.5 flex items-center gap-4"
            >
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-0.5 flex-wrap">
                  <span className="font-medium">{expense.label}</span>
                  {expense.tags && <TagBadge tag={expense.tags} />}
                </div>
                <p className="text-xs text-muted-foreground">{describeFrequency(expense)}</p>
              </div>

              <span className="tabular-nums font-semibold text-base shrink-0">
                {formatAmount(Number(expense.amount))}
              </span>

              <div className="flex items-center gap-1 shrink-0">
                <EditRecurringSheet expense={expense} tags={tags} />
                <DeleteButton id={expense.id} />
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
