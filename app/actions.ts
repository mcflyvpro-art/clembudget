'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import type { NewExpense } from '@/lib/types'

export async function addExpense(expense: NewExpense) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Non authentifié')

  const { error } = await supabase.from('expenses').insert({ ...expense, user_id: user.id })
  if (error) throw error

  revalidatePath('/')
  revalidatePath('/stats')
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

  revalidatePath('/')
  revalidatePath('/stats')
  revalidatePath('/recurrents')
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

  revalidatePath('/')
  revalidatePath('/stats')
  revalidatePath('/recurrents')
  revalidatePath('/archive')
}

export async function signOut() {
  const supabase = await createClient()
  await supabase.auth.signOut()
  revalidatePath('/')
}
