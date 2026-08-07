'use client'

import { useOptimistic, useMemo, useState, useCallback, useEffect, useRef } from 'react'
import ExpenseList from './ExpenseList'
import AddExpenseSheet from './AddExpenseSheet'
import ChartPanel from './ChartPanel'
import BudgetsStrip from './budgets/BudgetsStrip'
import BudgetToast from './budgets/BudgetToast'
import { addExpense } from '@/app/actions'
import { createClient } from '@/lib/supabase/client'
import { fetchExpensesForStats, getStartOfMonth, getEndOfMonth } from '@/lib/db/expenses'
import { formatEUR, buildPieData } from '@/lib/utils'
import { applyExpenseToProgress, crossedThresholds } from '@/lib/budgets'
import type { Expense, Tag, NewExpense, BudgetProgress } from '@/lib/types'

interface Props {
  initialExpenses: Expense[]
  tags: Tag[]
  month: string
  initialBudgets?: BudgetProgress[]
}

export default function DashboardClient({ initialExpenses, tags, month, initialBudgets = [] }: Props) {
  const [expenses, setExpenses] = useState<Expense[]>(initialExpenses)
  const [optimisticExpenses, addOptimistic] = useOptimistic(
    expenses,
    (state: Expense[], newExpense: Expense) => [newExpense, ...state]
  )

  const [budgets, setBudgets] = useState<BudgetProgress[]>(initialBudgets)
  const [alerts, setAlerts] = useState<BudgetProgress[]>([])

  // Snapshot lisible depuis un handler sans dépendre du rendu courant
  const budgetsRef = useRef(budgets)
  useEffect(() => { budgetsRef.current = budgets }, [budgets])

  // Sync when RSC refreshes props (via revalidatePath in server actions)
  useEffect(() => { setExpenses(initialExpenses) }, [initialExpenses])

  // Resync des objectifs quand les props RSC changent (pattern « ajuster
  // l'état pendant le rendu » : pas d'effet, pas de rendu en cascade).
  const [seenBudgets, setSeenBudgets] = useState(initialBudgets)
  if (seenBudgets !== initialBudgets) {
    setSeenBudgets(initialBudgets)
    setBudgets(initialBudgets)
  }

  const { data: pieData, total } = useMemo(() => buildPieData(optimisticExpenses), [optimisticExpenses])

  const fetchData = useCallback(async () => {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    const data = await fetchExpensesForStats(supabase, user.id, getStartOfMonth(), getEndOfMonth())
    setExpenses(data as Expense[])
  }, [])

  async function handleAdd(data: NewExpense, tag: Tag | null) {
    addOptimistic({
      id: `opt_${Date.now()}`,
      user_id: '',
      amount: data.amount,
      label: data.label,
      tag_id: data.tag_id,
      date: data.date,
      is_recurring: data.is_recurring,
      recurrence_frequency: data.recurrence_frequency,
      is_exceptional: false,
      recurrence_ended_at: null,
      created_at: new Date().toISOString(),
      tags: tag,
    })

    // Mise à jour immédiate des objectifs + alerte si un seuil est franchi
    const before = budgetsRef.current
    if (before.length > 0) {
      const after = applyExpenseToProgress(before, {
        amount: data.amount,
        tag_id: data.tag_id,
        date: data.date,
      })
      setBudgets(after)
      const crossed = crossedThresholds(before, after)
      if (crossed.length > 0) setAlerts(crossed)
    }

    await addExpense(data)
    // Ne pas appeler fetchData ici : setExpenses pendant la transition optimiste
    // cause le doublon. revalidatePath dans addExpense rafraîchit les props RSC,
    // le useEffect ci-dessus synchronise automatiquement.
  }

  return (
    <>
      <div className="lg:grid lg:grid-cols-[1fr_380px] lg:gap-8 lg:items-start">
        <div>
          <div className="mb-6 lg:hidden">
            <p className="text-sm text-muted-foreground capitalize mb-1">{month}</p>
            <p className="text-4xl font-semibold tabular-nums tracking-tight">
              {formatEUR(total)}
            </p>
          </div>
          <div className="hidden lg:block mb-6">
            <p className="text-2xl font-semibold">
              Dépenses <span className="text-muted-foreground font-normal capitalize">{month}</span>
            </p>
          </div>

          {/* Objectifs — mobile uniquement, sous le total */}
          <BudgetsStrip progresses={budgets} limit={3} className="mb-6 lg:hidden" />

          <ExpenseList expenses={optimisticExpenses} tags={tags} onMutation={fetchData} />
        </div>

        <div className="hidden lg:block lg:sticky lg:top-20 space-y-6">
          <ChartPanel data={pieData} total={total} month={month} tags={tags} onAdd={handleAdd} />
          <BudgetsStrip progresses={budgets} limit={4} />
        </div>
      </div>

      <AddExpenseSheet tags={tags} onAdd={handleAdd} />

      <BudgetToast alerts={alerts} onDone={() => setAlerts([])} />
    </>
  )
}
