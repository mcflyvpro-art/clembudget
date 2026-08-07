import { createClient, getUser } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { ensureDefaultTags } from '@/lib/db/tags'
import {
  fetchExpensesForStats,
  getStartOfMonth,
  getEndOfMonth,
} from '@/lib/db/expenses'
import { fetchBudgetsWithProgress } from '@/lib/db/budgets'
import DashboardClient from '@/components/DashboardClient'
import type { Expense, Tag } from '@/lib/types'

function formatMonth() {
  return new Date().toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' })
}

export default async function DashboardPage() {
  const user = await getUser()
  if (!user) redirect('/login')

  const supabase = await createClient()
  const fromDate = getStartOfMonth()
  const toDate   = getEndOfMonth()

  const [, expenses, tagsResult, budgets] = await Promise.all([
    ensureDefaultTags(supabase, user.id),
    fetchExpensesForStats(supabase, user.id, fromDate, toDate),
    supabase.from('tags').select('*').eq('user_id', user.id).order('name'),
    fetchBudgetsWithProgress(supabase, user.id),
  ])

  return (
    <DashboardClient
      initialExpenses={expenses as Expense[]}
      tags={(tagsResult.data ?? []) as Tag[]}
      month={formatMonth()}
      initialBudgets={budgets}
    />
  )
}
