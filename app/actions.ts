'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { toISO } from '@/lib/date-utils'
import type { NewExpense, NewBudget } from '@/lib/types'

export async function addExpense(expense: NewExpense) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Non authentifié')

  const { error } = await supabase.from('expenses').insert({
    ...expense,
    user_id: user.id,
    is_exceptional: false,
  })
  if (error) throw error

  revalidatePath('/')
  revalidatePath('/stats')
  revalidatePath('/historique')
  revalidatePath('/objectifs')
}

export async function updateExpense(id: string, data: Partial<NewExpense>) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Non authentifié')

  const { error } = await supabase
    .from('expenses')
    .update(data)
    .eq('id', id)
    .eq('user_id', user.id)
  if (error) throw error

  revalidatePath('/stats')
  revalidatePath('/recurrents')
  revalidatePath('/historique')
  revalidatePath('/objectifs')
}

export async function deleteExpense(id: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Non authentifié')

  const { error } = await supabase
    .from('expenses')
    .delete()
    .eq('id', id)
    .eq('user_id', user.id)
  if (error) throw error

  revalidatePath('/stats')
  revalidatePath('/recurrents')
  revalidatePath('/historique')
  revalidatePath('/objectifs')
}

function nextOccurrenceAfterToday(anchorDate: string, frequency: string): string {
  const today = new Date()
  const todayStr = toISO(today)
  const anchor = new Date(anchorDate + 'T00:00:00')

  switch (frequency) {
    case 'daily': {
      const d = new Date(today)
      d.setDate(d.getDate() + 1)
      return toISO(d)
    }
    case 'weekly': {
      const targetDay = anchor.getDay()
      const d = new Date(today)
      d.setDate(d.getDate() + 1)
      while (d.getDay() !== targetDay) d.setDate(d.getDate() + 1)
      return toISO(d)
    }
    case 'monthly': {
      const anchorDay = anchor.getDate()
      let y = today.getFullYear(), m = today.getMonth()
      while (true) {
        const daysInM = new Date(y, m + 1, 0).getDate()
        const d = new Date(y, m, Math.min(anchorDay, daysInM))
        if (toISO(d) > todayStr) return toISO(d)
        m++; if (m > 11) { m = 0; y++ }
      }
    }
    case 'yearly': {
      const anchorMonth = anchor.getMonth(), anchorDay = anchor.getDate()
      let y = today.getFullYear()
      while (true) {
        const d = new Date(y, anchorMonth, anchorDay)
        if (toISO(d) > todayStr) return toISO(d)
        y++
      }
    }
    default: {
      const d = new Date(today)
      d.setDate(d.getDate() + 1)
      return toISO(d)
    }
  }
}

export async function updateRecurringFromNow(id: string, data: NewExpense) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Non authentifié')

  const today = toISO(new Date())

  // Arrêter l'ancienne récurrence à aujourd'hui
  const { error: stopErr } = await supabase
    .from('expenses')
    .update({ recurrence_ended_at: today })
    .eq('id', id)
    .eq('user_id', user.id)
  if (stopErr) throw stopErr

  // Créer la nouvelle à partir de la prochaine occurrence
  const nextDate = nextOccurrenceAfterToday(data.date, data.recurrence_frequency ?? 'monthly')
  const { error: createErr } = await supabase.from('expenses').insert({
    ...data,
    date: nextDate,
    user_id: user.id,
    is_exceptional: false,
  })
  if (createErr) throw createErr

  revalidatePath('/')
  revalidatePath('/stats')
  revalidatePath('/recurrents')
  revalidatePath('/historique')
  revalidatePath('/objectifs')
}

export async function stopRecurring(id: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Non authentifié')

  const today = toISO(new Date())
  const { error } = await supabase
    .from('expenses')
    .update({ recurrence_ended_at: today })
    .eq('id', id)
    .eq('user_id', user.id)
  if (error) throw error

  revalidatePath('/')
  revalidatePath('/stats')
  revalidatePath('/recurrents')
  revalidatePath('/historique')
  revalidatePath('/objectifs')
}

// ── Objectifs ─────────────────────────────────────────────────────────────────

const BUDGET_PATHS = ['/', '/stats', '/objectifs', '/categories']

function revalidateBudgets() {
  for (const p of BUDGET_PATHS) revalidatePath(p)
}

/** Vérifie la cohérence kind / period / dates avant écriture. */
function validateBudget(b: NewBudget) {
  if (!(b.amount > 0)) throw new Error('Le montant doit être supérieur à 0')

  if (b.kind === 'recurring') {
    if (!b.period) throw new Error('Période requise pour un objectif récurrent')
    return {
      tag_id: b.tag_id,
      amount: b.amount,
      kind: 'recurring' as const,
      period: b.period,
      start_date: null,
      end_date: null,
      label: b.label?.trim() || null,
    }
  }

  if (!b.start_date || !b.end_date) throw new Error('Dates requises pour un objectif ponctuel')
  if (b.end_date < b.start_date) throw new Error('La date de fin doit suivre la date de début')
  return {
    tag_id: b.tag_id,
    amount: b.amount,
    kind: 'oneshot' as const,
    period: null,
    start_date: b.start_date,
    end_date: b.end_date,
    label: b.label?.trim() || null,
  }
}

export async function createBudget(budget: NewBudget) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Non authentifié')

  const { error } = await supabase
    .from('budgets')
    .insert({ ...validateBudget(budget), user_id: user.id })

  if (error) {
    if (error.code === '23505') throw new Error('Un objectif existe déjà pour cette catégorie')
    throw error
  }

  revalidateBudgets()
}

export async function updateBudget(id: string, budget: NewBudget) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Non authentifié')

  const { error } = await supabase
    .from('budgets')
    .update(validateBudget(budget))
    .eq('id', id)
    .eq('user_id', user.id)

  if (error) {
    if (error.code === '23505') throw new Error('Un objectif existe déjà pour cette catégorie')
    throw error
  }

  revalidateBudgets()
}

export async function toggleBudget(id: string, isActive: boolean) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Non authentifié')

  const { error } = await supabase
    .from('budgets')
    .update({ is_active: isActive })
    .eq('id', id)
    .eq('user_id', user.id)

  if (error) {
    if (error.code === '23505') throw new Error('Un objectif actif existe déjà pour cette catégorie')
    throw error
  }

  revalidateBudgets()
}

export async function deleteBudget(id: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Non authentifié')

  const { error } = await supabase
    .from('budgets')
    .delete()
    .eq('id', id)
    .eq('user_id', user.id)
  if (error) throw error

  revalidateBudgets()
}

export async function signOut() {
  const supabase = await createClient()
  await supabase.auth.signOut()
  revalidatePath('/')
}

export async function createTag(name: string, color: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Non authentifié')

  const { error } = await supabase.from('tags').insert({
    name: name.trim(),
    color,
    user_id: user.id,
  })
  if (error) throw error

  revalidatePath('/')
  revalidatePath('/categories')
  revalidatePath('/objectifs')
}

export async function updateTag(id: string, name: string, color: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Non authentifié')

  const { error } = await supabase
    .from('tags')
    .update({ name: name.trim(), color })
    .eq('id', id)
    .eq('user_id', user.id)
  if (error) throw error

  revalidatePath('/')
  revalidatePath('/categories')
  revalidatePath('/stats')
  revalidatePath('/historique')
  revalidatePath('/objectifs')
}

export async function deleteTag(id: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Non authentifié')

  await supabase
    .from('expenses')
    .update({ tag_id: null })
    .eq('tag_id', id)
    .eq('user_id', user.id)

  const { error } = await supabase
    .from('tags')
    .delete()
    .eq('id', id)
    .eq('user_id', user.id)
  if (error) throw error

  revalidatePath('/')
  revalidatePath('/categories')
  revalidatePath('/stats')
  revalidatePath('/historique')
  revalidatePath('/objectifs')
}
