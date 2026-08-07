import { createClient, getUser } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import type { Tag } from '@/lib/types'
import { fetchExpensesForHistory } from '@/lib/db/expenses'
import ArchiveClient from '@/components/ArchiveClient'

export default async function ArchivePage() {
  const user = await getUser()
  if (!user) redirect('/login')
  const supabase = await createClient()

  const today = new Date().toISOString().split('T')[0]

  const [expenses, tagsResult] = await Promise.all([
    fetchExpensesForHistory(supabase, user.id),
    supabase.from('tags').select('*').eq('user_id', user.id).order('name'),
  ])

  const tags = (tagsResult.data ?? []) as Tag[]
  const pastCount = expenses.filter(e => e.date <= today).length

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-semibold">Historique</h1>
        <p className="text-sm text-muted-foreground mt-1">
          {pastCount} dépense{pastCount !== 1 ? 's' : ''} enregistrée{pastCount !== 1 ? 's' : ''}
        </p>
      </div>

      <ArchiveClient expenses={expenses} tags={tags} today={today} />
    </div>
  )
}
