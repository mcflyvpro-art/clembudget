import type { SupabaseClient } from '@supabase/supabase-js'
import type { Budget, BudgetProgress } from '@/lib/types'
import { computeProgress, getBudgetWindow, sortByUrgency } from '@/lib/budgets'
import { fetchExpensesForStats } from '@/lib/db/expenses'
import { todayISO } from '@/lib/date-utils'

/** Tous les objectifs de l'utilisatrice, actifs ou en pause. */
export async function fetchBudgets(
  supabase: SupabaseClient,
  userId: string
): Promise<Budget[]> {
  const { data } = await supabase
    .from('budgets')
    .select('*, tags(*)')
    .eq('user_id', userId)
    .order('created_at', { ascending: true })

  return (data ?? []) as Budget[]
}

/**
 * Objectifs actifs + leur progression.
 *
 * Une seule requête sur `expenses`, couvrant l'union des fenêtres de tous les
 * objectifs. L'expansion des récurrentes est déléguée à `fetchExpensesForStats`
 * (aucune logique dupliquée).
 */
export async function fetchBudgetsWithProgress(
  supabase: SupabaseClient,
  userId: string,
  budgetsInput?: Budget[]
): Promise<BudgetProgress[]> {
  const all = budgetsInput ?? (await fetchBudgets(supabase, userId))
  const active = all.filter(b => b.is_active)
  if (active.length === 0) return []

  const today = todayISO()
  const windows = active.map(b => getBudgetWindow(b, today))
  const from = windows.reduce((min, w) => (w.from < min ? w.from : min), windows[0].from)
  const to   = windows.reduce((max, w) => (w.to   > max ? w.to   : max), windows[0].to)

  const expenses = await fetchExpensesForStats(supabase, userId, from, to)

  return sortByUrgency(active.map(b => computeProgress(b, expenses, today)))
}
