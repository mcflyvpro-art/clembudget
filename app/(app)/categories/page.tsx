import { createClient, getUser } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { deduplicateTags } from '@/lib/db/tags'
import { fetchBudgetsWithProgress } from '@/lib/db/budgets'
import TagsManager from '@/components/TagsManager'
import type { Tag } from '@/lib/types'

export default async function CategoriesPage() {
  const user = await getUser()
  if (!user) redirect('/login')

  const supabase = await createClient()
  // deduplicateTags + fetch en parallèle
  const [, { data }] = await Promise.all([
    deduplicateTags(supabase, user.id),
    supabase
      .from('tags')
      .select('*')
      .eq('user_id', user.id)
      .order('name'),
  ])

  const tags = (data ?? []) as Tag[]
  const budgets = await fetchBudgetsWithProgress(supabase, user.id)

  return (
    <div>
      <p className="text-2xl font-semibold mb-1">Catégories</p>
      <p className="text-sm text-muted-foreground mb-6">
        {tags.length} catégorie{tags.length !== 1 ? 's' : ''}
      </p>
      <TagsManager initialTags={tags} budgets={budgets} />
    </div>
  )
}
