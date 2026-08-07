import { createClient, getUser } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { formatEUR } from '@/lib/utils'
import { totalMonthlyEquivalent } from '@/lib/recurring-utils'
import { todayISO } from '@/lib/date-utils'
import type { Expense, Tag } from '@/lib/types'
import RecurringClient from '@/components/RecurringClient'

export default async function RecurrentsPage() {
  const user = await getUser()
  if (!user) redirect('/login')
  const supabase = await createClient()

  const today = todayISO()

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

  const all  = (expensesResult.data ?? []) as Expense[]
  const tags = (tagsResult.data  ?? []) as Tag[]

  const active  = all.filter(e => !e.recurrence_ended_at || e.recurrence_ended_at > today)
  const stopped = all.filter(e => e.recurrence_ended_at && e.recurrence_ended_at <= today)

  const monthlyEquiv = totalMonthlyEquivalent(active)

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-semibold">Dépenses récurrentes</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Automatiquement comptabilisées dans vos statistiques
        </p>
      </div>

      {active.length > 0 && (
        <div className="bg-muted/60 rounded-xl px-4 py-3 mb-6 flex items-center justify-between">
          <span className="text-sm text-muted-foreground">Équivalent mensuel total</span>
          <span className="font-semibold tabular-nums">{formatEUR(monthlyEquiv)}</span>
        </div>
      )}

      <RecurringClient active={active} stopped={stopped} tags={tags} />
    </div>
  )
}
