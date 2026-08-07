import { createClient, getUser } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { fetchBudgets, fetchBudgetsWithProgress } from '@/lib/db/budgets'
import BudgetsManager from '@/components/budgets/BudgetsManager'
import type { Tag } from '@/lib/types'

export default async function ObjectifsPage() {
  const user = await getUser()
  if (!user) redirect('/login')

  const supabase = await createClient()

  const [budgets, tagsResult] = await Promise.all([
    fetchBudgets(supabase, user.id),
    supabase.from('tags').select('*').eq('user_id', user.id).order('name'),
  ])

  // Réutilise les budgets déjà chargés : une seule requête sur `expenses`.
  const progresses = await fetchBudgetsWithProgress(supabase, user.id, budgets)

  const activeCount = budgets.filter(b => b.is_active).length

  return (
    <div>
      <p className="text-2xl font-semibold mb-1">Objectifs</p>
      <p className="text-sm text-muted-foreground mb-6">
        {activeCount === 0
          ? 'Fixe un montant à ne pas dépasser'
          : `${activeCount} objectif${activeCount > 1 ? 's' : ''} en cours`}
      </p>
      <BudgetsManager
        budgets={budgets}
        progresses={progresses}
        tags={(tagsResult.data ?? []) as Tag[]}
      />
    </div>
  )
}
