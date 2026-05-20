import type { SupabaseClient } from '@supabase/supabase-js'
import type { Expense } from '@/lib/types'

// ── Date helpers ───────────────────────────────────────────────────────────────

export function getStartOfMonth() {
  const now = new Date()
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`
}

export function getEndOfMonth() {
  const now = new Date()
  return new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().split('T')[0]
}

export function getStartOfWeek() {
  const now = new Date()
  const day = now.getDay()
  const diff = now.getDate() - day + (day === 0 ? -6 : 1)
  return new Date(now.getFullYear(), now.getMonth(), diff).toISOString().split('T')[0]
}

export function getEndOfWeek() {
  const start = new Date(getStartOfWeek() + 'T00:00:00')
  start.setDate(start.getDate() + 6)
  return start.toISOString().split('T')[0]
}

export function getStartOfYear() {
  return `${new Date().getFullYear()}-01-01`
}

export function getEndOfYear() {
  return `${new Date().getFullYear()}-12-31`
}

// ── Recurrence expansion ───────────────────────────────────────────────────────

function generateOccurrences(expense: Expense, fromDate: Date, toDate: Date): Expense[] {
  const results: Expense[] = []
  const anchor = new Date(expense.date + 'T00:00:00')

  switch (expense.recurrence_frequency) {
    case 'daily': {
      let cur = new Date(Math.max(anchor.getTime(), fromDate.getTime()))
      while (cur <= toDate) {
        const d = cur.toISOString().split('T')[0]
        results.push({ ...expense, date: d, id: `${expense.id}__${d}` })
        cur.setDate(cur.getDate() + 1)
      }
      break
    }

    case 'weekly': {
      const targetDay = anchor.getDay()
      // Find first occurrence >= max(anchor, fromDate)
      let cur = new Date(Math.max(anchor.getTime(), fromDate.getTime()))
      const daysUntilTarget = (targetDay - cur.getDay() + 7) % 7
      cur.setDate(cur.getDate() + daysUntilTarget)
      while (cur <= toDate) {
        const d = cur.toISOString().split('T')[0]
        results.push({ ...expense, date: d, id: `${expense.id}__${d}` })
        cur.setDate(cur.getDate() + 7)
      }
      break
    }

    case 'monthly': {
      const anchorDay = anchor.getDate()
      // Start at max(anchor's month, fromDate's month)
      let y = fromDate.getFullYear()
      let m = fromDate.getMonth()
      if (anchor > fromDate) { y = anchor.getFullYear(); m = anchor.getMonth() }

      while (true) {
        const daysInM = new Date(y, m + 1, 0).getDate()
        const d = Math.min(anchorDay, daysInM)
        const occ = new Date(y, m, d)
        if (occ > toDate) break
        if (occ >= fromDate && occ >= anchor) {
          const dateStr = occ.toISOString().split('T')[0]
          results.push({ ...expense, date: dateStr, id: `${expense.id}__${dateStr}` })
        }
        m++
        if (m > 11) { m = 0; y++ }
      }
      break
    }

    case 'yearly': {
      const anchorMonth = anchor.getMonth()
      const anchorDay = anchor.getDate()
      let y = Math.max(fromDate.getFullYear(), anchor.getFullYear())
      while (true) {
        const occ = new Date(y, anchorMonth, anchorDay)
        if (occ > toDate) break
        if (occ >= fromDate && occ >= anchor) {
          const dateStr = occ.toISOString().split('T')[0]
          results.push({ ...expense, date: dateStr, id: `${expense.id}__${dateStr}` })
        }
        y++
      }
      break
    }
  }

  return results
}

// ── Queries ────────────────────────────────────────────────────────────────────

/** For the expense LIST (actual DB entries only, no projection). */
export async function fetchExpensesWithTags(
  supabase: SupabaseClient,
  userId: string,
  from: string
) {
  const { data, error } = await supabase
    .from('expenses')
    .select('*, tags(*)')
    .eq('user_id', userId)
    .gte('date', from)
    .order('date', { ascending: false })
    .order('created_at', { ascending: false })

  if (error) throw error
  return data ?? []
}

/**
 * For STATS/CHARTS — expands recurring expenses across the full period.
 * Non-recurring: actual entries within [fromDate, toDate].
 * Recurring: all that started before toDate, expanded into occurrences.
 */
export async function fetchExpensesForStats(
  supabase: SupabaseClient,
  userId: string,
  fromDate: string,
  toDate: string
): Promise<Expense[]> {
  const [nonRecResult, recResult] = await Promise.all([
    supabase
      .from('expenses')
      .select('*, tags(*)')
      .eq('user_id', userId)
      .eq('is_recurring', false)
      .gte('date', fromDate)
      .lte('date', toDate),
    supabase
      .from('expenses')
      .select('*, tags(*)')
      .eq('user_id', userId)
      .eq('is_recurring', true)
      .lte('date', toDate), // started before or during the period
  ])

  const nonRecurring = (nonRecResult.data ?? []) as Expense[]
  const recurring = (recResult.data ?? []) as Expense[]

  const from = new Date(fromDate + 'T00:00:00')
  const to = new Date(toDate + 'T23:59:59')

  const expanded: Expense[] = []
  for (const e of recurring) {
    expanded.push(...generateOccurrences(e, from, to))
  }

  return [...nonRecurring, ...expanded].sort(
    (a, b) => b.date.localeCompare(a.date) || b.created_at.localeCompare(a.created_at)
  )
}
