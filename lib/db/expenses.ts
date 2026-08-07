import type { SupabaseClient } from '@supabase/supabase-js'
import type { Expense } from '@/lib/types'
import { toISO } from '@/lib/date-utils'

// ── Date helpers ───────────────────────────────────────────────────────────────

export function getStartOfMonth() {
  const now = new Date()
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`
}

export function getEndOfMonth() {
  return toISO(new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0))
}

export function getStartOfWeek() {
  const now = new Date()
  const day = now.getDay()
  const diff = now.getDate() - day + (day === 0 ? -6 : 1)
  return toISO(new Date(now.getFullYear(), now.getMonth(), diff))
}

export function getEndOfWeek() {
  const start = new Date(getStartOfWeek() + 'T00:00:00')
  start.setDate(start.getDate() + 6)
  return toISO(start)
}

export function getStartOfYear() {
  return `${new Date().getFullYear()}-01-01`
}

export function getEndOfYear() {
  return `${new Date().getFullYear()}-12-31`
}

// ── Recurrence expansion ───────────────────────────────────────────────────────

function generateOccurrences(expense: Expense, fromDate: Date, toDateParam: Date): Expense[] {
  const results: Expense[] = []
  const anchor = new Date(expense.date + 'T00:00:00')

  // Respecter la date d'arrêt si définie — copie locale pour ne pas muter le param
  let toDate = toDateParam
  if (expense.recurrence_ended_at) {
    const ended = new Date(expense.recurrence_ended_at + 'T00:00:00')
    if (ended < toDate) toDate = ended
  }

  switch (expense.recurrence_frequency) {
    case 'daily': {
      const cur = new Date(Math.max(anchor.getTime(), fromDate.getTime()))
      while (cur <= toDate) {
        const d = toISO(cur)
        results.push({ ...expense, date: d, id: `${expense.id}__${d}`, is_projection: true })
        cur.setDate(cur.getDate() + 1)
      }
      break
    }

    case 'weekly': {
      const targetDay = anchor.getDay()
      const cur = new Date(Math.max(anchor.getTime(), fromDate.getTime()))
      const daysUntilTarget = (targetDay - cur.getDay() + 7) % 7
      cur.setDate(cur.getDate() + daysUntilTarget)
      while (cur <= toDate) {
        const d = toISO(cur)
        results.push({ ...expense, date: d, id: `${expense.id}__${d}`, is_projection: true })
        cur.setDate(cur.getDate() + 7)
      }
      break
    }

    case 'monthly': {
      const anchorDay = anchor.getDate()
      let y = fromDate.getFullYear()
      let m = fromDate.getMonth()
      if (anchor > fromDate) { y = anchor.getFullYear(); m = anchor.getMonth() }

      while (results.length < 10_000) {
        const daysInM = new Date(y, m + 1, 0).getDate()
        const d = Math.min(anchorDay, daysInM)
        const occ = new Date(y, m, d)
        if (occ > toDate) break
        if (occ >= fromDate && occ >= anchor) {
          const dateStr = toISO(occ)
          results.push({ ...expense, date: dateStr, id: `${expense.id}__${dateStr}`, is_projection: true })
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
      while (results.length < 10_000) {
        const occ = new Date(y, anchorMonth, anchorDay)
        if (occ > toDate) break
        if (occ >= fromDate && occ >= anchor) {
          const dateStr = toISO(occ)
          results.push({ ...expense, date: dateStr, id: `${expense.id}__${dateStr}`, is_projection: true })
        }
        y++
      }
      break
    }
  }

  return results
}

// ── Queries ────────────────────────────────────────────────────────────────────

/**
 * For HISTORY — expands recurring expenses from anchor date to 3 months ahead.
 * Non-recurring: all entries ever recorded.
 * Recurring: each expanded into individual occurrences (past + upcoming).
 */
export async function fetchExpensesForHistory(
  supabase: SupabaseClient,
  userId: string
): Promise<Expense[]> {
  const todayDate = new Date()
  const todayStr = toISO(todayDate)

  const [nonRecResult, recResult] = await Promise.all([
    supabase
      .from('expenses')
      .select('*, tags(*)')
      .eq('user_id', userId)
      .eq('is_recurring', false),
    supabase
      .from('expenses')
      .select('*, tags(*)')
      .eq('user_id', userId)
      .eq('is_recurring', true),
  ])

  const nonRecurring = (nonRecResult.data ?? []) as Expense[]
  const recurring = (recResult.data ?? []) as Expense[]

  const expanded: Expense[] = []

  for (const e of recurring) {
    const anchor = new Date(e.date + 'T00:00:00')

    // Toutes les occurrences passées (jusqu'à aujourd'hui inclus)
    const pastEnd = new Date(todayDate)
    pastEnd.setHours(23, 59, 59)
    expanded.push(...generateOccurrences(e, anchor, pastEnd))

    // Les 3 prochaines occurrences uniquement
    const isActive = !e.recurrence_ended_at || e.recurrence_ended_at > todayStr
    if (isActive) {
      const futureStart = new Date(todayDate)
      futureStart.setDate(futureStart.getDate() + 1)

      // Buffer assez large pour trouver 3 occurrences selon la fréquence
      const futureEnd = new Date(futureStart)
      switch (e.recurrence_frequency) {
        case 'daily':   futureEnd.setDate(futureEnd.getDate() + 6); break
        case 'weekly':  futureEnd.setDate(futureEnd.getDate() + 28); break
        case 'monthly': futureEnd.setMonth(futureEnd.getMonth() + 4); break
        case 'yearly':  futureEnd.setFullYear(futureEnd.getFullYear() + 4); break
      }

      const next3 = generateOccurrences(e, futureStart, futureEnd).slice(0, 3)
      expanded.push(...next3)
    }
  }

  return [...nonRecurring, ...expanded].sort(
    (a, b) => b.date.localeCompare(a.date) || b.created_at.localeCompare(a.created_at)
  )
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
