import { createClient, getUser } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { fetchExpensesForStats } from '@/lib/db/expenses'
import { fetchBudgetsWithProgress } from '@/lib/db/budgets'
import StatsClient from '@/components/StatsClient'
import type { Expense } from '@/lib/types'

function defaultRange() {
  const now = new Date()
  const from = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`
  const to   = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`
  return { from, to }
}

interface Props {
  searchParams: Promise<{ from?: string; to?: string }>
}

export default async function StatsPage({ searchParams }: Props) {
  const user = await getUser()
  if (!user) redirect('/login')

  const supabase = await createClient()
  const params = await searchParams
  const defaults = defaultRange()
  const from = params.from ?? defaults.from
  const to = params.to ?? defaults.to

  const [initialExpenses, budgets] = await Promise.all([
    fetchExpensesForStats(supabase, user.id, from, to),
    fetchBudgetsWithProgress(supabase, user.id),
  ])

  return (
    <StatsClient
      initialFrom={from}
      initialTo={to}
      initialExpenses={initialExpenses as Expense[]}
      budgets={budgets}
    />
  )
}
