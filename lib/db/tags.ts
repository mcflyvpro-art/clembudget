import type { SupabaseClient } from '@supabase/supabase-js'

export const DEFAULT_TAGS = [
  { name: 'Food', color: '#f59e8b' },
  { name: 'Restaurant', color: '#d4956a' },
  { name: 'Transport', color: '#86b8d4' },
  { name: 'Shopping', color: '#c4a5d4' },
  { name: 'Santé', color: '#82c4a0' },
  { name: 'Loisirs', color: '#f5c87a' },
  { name: 'Maison', color: '#a8bfa8' },
  { name: 'Beauté', color: '#e8a0b0' },
  { name: 'Voyage', color: '#7ab0d4' },
  { name: 'Autre', color: '#c0b8b0' },
]

export async function ensureDefaultTags(supabase: SupabaseClient, userId: string) {
  const { data: existing } = await supabase
    .from('tags')
    .select('id')
    .eq('user_id', userId)
    .limit(1)

  if (existing && existing.length > 0) return

  await supabase.from('tags').insert(
    DEFAULT_TAGS.map((t) => ({ ...t, user_id: userId }))
  )
}
