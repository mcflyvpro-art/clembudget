import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { ensureDefaultTags } from '@/lib/db/tags'
import {
  fetchExpensesWithTags,
  fetchExpensesForStats,
  getStartOfMonth,
  getEndOfMonth,
} from '@/lib/db/expenses'
import ExpenseList from '@/components/ExpenseList'
import AddExpenseSheet from '@/components/AddExpenseSheet'
import ChartPanel from '@/components/ChartPanel'
import type { Expense, Tag } from '@/lib/types'

function formatMonth() {
  return new Date().toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' })
}

function formatAmount(n: number) {
  return new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' }).format(n)
}

function getDaysInCurrentMonth() {
  const now = new Date()
  return new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate()
}

function getDayOfMonth() {
  return new Date().getDate()
}

function buildPieData(expenses: Expense[]) {
  const byTag: Record<string, { name: string; value: number; color: string }> = {}
  for (const e of expenses) {
    const key = e.tag_id ?? '__none__'
    const name = e.tags?.name ?? 'Autre'
    const color = e.tags?.color ?? '#c0b8b0'
    if (!byTag[key]) byTag[key] = { name, value: 0, color }
    byTag[key].value += Number(e.amount)
  }
  return Object.values(byTag).sort((a, b) => b.value - a.value)
}

export default async function DashboardPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  await ensureDefaultTags(supabase, user.id)

  const fromDate = getStartOfMonth()
  const toDate = getEndOfMonth()

  const [listExpenses, statsExpenses, tagsResult] = await Promise.all([
    // List: actual DB entries (what the user entered)
    fetchExpensesWithTags(supabase, user.id, fromDate),
    // Stats: actual + recurring projections for this month
    fetchExpensesForStats(supabase, user.id, fromDate, toDate),
    supabase.from('tags').select('*').eq('user_id', user.id).order('name'),
  ])

  const tags = (tagsResult.data ?? []) as Tag[]
  const typedList = listExpenses as Expense[]

  // Hero stats use projected expenses (includes future recurring this month)
  const regularStats = statsExpenses.filter((e) => !e.is_exceptional)
  const totalAll = statsExpenses.reduce((s, e) => s + Number(e.amount), 0)
  const regularTotal = regularStats.reduce((s, e) => s + Number(e.amount), 0)

  const daysElapsed = getDayOfMonth()
  const avgPerDay = daysElapsed > 0 ? regularTotal / daysElapsed : 0
  const projectedTotal = avgPerDay * getDaysInCurrentMonth()

  const pieData = buildPieData(statsExpenses)
  const month = formatMonth()
  const hasExceptional = statsExpenses.some((e) => e.is_exceptional)

  return (
    <>
      <div className="lg:grid lg:grid-cols-[1fr_380px] lg:gap-8 lg:items-start">

        {/* ── Left column ─────────────────────────────────── */}
        <div>
          {/* Mobile hero */}
          <div className="mb-6 lg:hidden">
            <p className="text-sm text-muted-foreground capitalize mb-1">{month}</p>
            <p className="text-4xl font-semibold tabular-nums tracking-tight">
              {formatAmount(totalAll)}
            </p>
            <div className="flex items-center gap-3 mt-2 text-sm text-muted-foreground">
              <span>{formatAmount(avgPerDay)}/jour</span>
              <span>·</span>
              <span>→ {formatAmount(projectedTotal)} prévu</span>
            </div>
            {hasExceptional && (
              <p className="text-xs text-muted-foreground mt-1">
                dont {formatAmount(totalAll - regularTotal)} exceptionnel
              </p>
            )}
          </div>

          {/* Desktop title */}
          <div className="hidden lg:block mb-6">
            <p className="text-2xl font-semibold">
              Dépenses <span className="text-muted-foreground font-normal capitalize">{month}</span>
            </p>
            {hasExceptional && (
              <p className="text-xs text-muted-foreground mt-1">
                dont {formatAmount(totalAll - regularTotal)} exceptionnel
              </p>
            )}
          </div>

          {/* Expense list — actual DB entries */}
          <ExpenseList expenses={typedList} />
        </div>

        {/* ── Right column (desktop only) ─────────────────── */}
        <div className="hidden lg:block lg:sticky lg:top-20">
          <ChartPanel
            data={pieData}
            total={totalAll}
            avgPerDay={avgPerDay}
            projectedTotal={projectedTotal}
            daysElapsed={daysElapsed}
            month={month}
          />
        </div>
      </div>

      <AddExpenseSheet tags={tags} />
    </>
  )
}
