import type { SupabaseClient } from '@supabase/supabase-js'

export const DEFAULT_TAGS = [
  { name: 'Food',       color: '#f59e8b' },
  { name: 'Restaurant', color: '#d4956a' },
  { name: 'Transport',  color: '#86b8d4' },
  { name: 'Shopping',   color: '#c4a5d4' },
  { name: 'Santé',      color: '#82c4a0' },
  { name: 'Loisirs',    color: '#f5c87a' },
  { name: 'Maison',     color: '#a8bfa8' },
  { name: 'Beauté',     color: '#e8a0b0' },
  { name: 'Voyage',     color: '#7ab0d4' },
  { name: 'Autre',      color: '#c0b8b0' },
]

/**
 * S'assure que les tags par défaut existent.
 * Optimisé : un seul COUNT d'abord → si déjà complets, aucune requête supplémentaire.
 */
export async function ensureDefaultTags(supabase: SupabaseClient, userId: string) {
  // Vérification rapide : si au moins autant de tags que les défauts, on skip
  const { count } = await supabase
    .from('tags')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', userId)

  if ((count ?? 0) >= DEFAULT_TAGS.length) return

  // Récupération ciblée uniquement si manque probable
  const { data: existing } = await supabase
    .from('tags')
    .select('name')
    .eq('user_id', userId)

  const existingNames = new Set(
    (existing ?? []).map((t: { name: string }) => t.name.toLowerCase())
  )
  const toInsert = DEFAULT_TAGS
    .filter((t) => !existingNames.has(t.name.toLowerCase()))
    .map((t) => ({ ...t, user_id: userId }))

  if (toInsert.length > 0) {
    await supabase.from('tags').insert(toInsert)
  }
}

/**
 * Déduplique les tags. Optimisé : détecte les doublons côté JS d'abord,
 * puis envoie les updates en parallèle (Promise.all) au lieu de séquentiels.
 */
export async function deduplicateTags(supabase: SupabaseClient, userId: string) {
  const { data: tags } = await supabase
    .from('tags')
    .select('*')
    .eq('user_id', userId)
    .order('created_at')

  if (!tags || tags.length === 0) return

  const seen     = new Map<string, string>()
  const toDelete: string[] = []
  const updates:  Array<{ dupId: string; keepId: string }> = []

  for (const tag of tags) {
    const key = tag.name.toLowerCase()
    if (seen.has(key)) {
      updates.push({ dupId: tag.id, keepId: seen.get(key)! })
      toDelete.push(tag.id)
    } else {
      seen.set(key, tag.id)
    }
  }

  if (updates.length === 0) return

  // Ré-assignation des dépenses + suppression en parallèle
  await Promise.all(
    updates.map(({ dupId, keepId }) =>
      supabase
        .from('expenses')
        .update({ tag_id: keepId })
        .eq('tag_id', dupId)
        .eq('user_id', userId)
    )
  )

  await supabase.from('tags').delete().in('id', toDelete)
}
