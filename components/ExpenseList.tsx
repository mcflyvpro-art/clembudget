'use client'

import { useState, useTransition } from 'react'
import { Trash2, Pencil } from 'lucide-react'
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import { formatEUR } from '@/lib/utils'
import type { Expense, Tag } from '@/lib/types'
import TagBadge from './TagBadge'
import RecurringBadge from './RecurringBadge'
import ExpenseForm from './ExpenseForm'
import { deleteExpense } from '@/app/actions'

function formatDate(dateStr: string): string {
  const date = new Date(dateStr + 'T00:00:00')
  const today = new Date()
  const yesterday = new Date(today)
  yesterday.setDate(today.getDate() - 1)

  if (date.toDateString() === today.toDateString()) return "Aujourd'hui"
  if (date.toDateString() === yesterday.toDateString()) return 'Hier'

  return date.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' })
}

function groupByDate(expenses: Expense[]) {
  const groups: Record<string, Expense[]> = {}
  for (const e of expenses) {
    if (!groups[e.date]) groups[e.date] = []
    groups[e.date].push(e)
  }
  return groups
}

interface Props {
  expenses: Expense[]
  tags: Tag[]
  onMutation?: () => void
}

export default function ExpenseList({ expenses, tags, onMutation }: Props) {
  const [, startTransition] = useTransition()
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [editingExpense, setEditingExpense] = useState<Expense | null>(null)

  if (expenses.length === 0) {
    return (
      <div className="text-center py-12 text-muted-foreground text-sm">
        Aucune dépense ce mois-ci.<br />Commence par en ajouter une !
      </div>
    )
  }

  const grouped = groupByDate(expenses)
  const sortedDates = Object.keys(grouped).sort((a, b) => b.localeCompare(a))

  function handleDelete(id: string) {
    setDeletingId(id)
    startTransition(async () => {
      await deleteExpense(id)
      setDeletingId(null)
      onMutation?.()
    })
  }

  return (
    <>
    <div className="space-y-5">
      {sortedDates.map((date) => {
        const dayExpenses = grouped[date]
        const dayTotal = dayExpenses.reduce((s, e) => s + Number(e.amount), 0)

        return (
          <div key={date}>
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                {formatDate(date)}
              </span>
              <span className="text-xs tabular-nums text-muted-foreground">
                {formatEUR(dayTotal)}
              </span>
            </div>

            <div className="space-y-1.5">
              {dayExpenses.map((expense) => {
                const isProjection = !!expense.is_projection

                return (
                  <div
                    key={expense.id}
                    className={`flex items-center gap-3 bg-card rounded-xl border border-border/60 group transition-opacity overflow-hidden ${
                      deletingId === expense.id ? 'opacity-40' : ''
                    } ${isProjection ? 'opacity-70' : ''}`}
                  >
                    {/* Barre couleur catégorie */}
                    <div
                      className="w-1 self-stretch shrink-0 min-h-[52px]"
                      style={{ backgroundColor: expense.tags?.color ?? '#c0b8b0' }}
                    />

                    {/* Contenu principal */}
                    <div className="flex-1 min-w-0 py-3">
                      <p className="text-sm font-medium truncate leading-tight">{expense.label}</p>
                      <div className="flex items-center gap-1.5 mt-1">
                        {expense.tags && <TagBadge tag={expense.tags} />}
                        {expense.is_recurring && (
                          <RecurringBadge frequency={expense.recurrence_frequency} />
                        )}
                      </div>
                    </div>

                    {/* Montant + actions */}
                    <div className="shrink-0 flex items-center gap-1 pr-3 py-3">
                      <span className="tabular-nums font-semibold text-sm mr-1">
                        {formatEUR(Number(expense.amount))}
                      </span>
                      {!isProjection && (
                        <>
                          <button
                            onClick={() => setEditingExpense(expense)}
                            className="text-muted-foreground hover:text-primary transition-all p-1 rounded md:opacity-0 md:group-hover:opacity-100 focus:opacity-100"
                          >
                            <Pencil size={13} />
                          </button>
                          <button
                            onClick={() => handleDelete(expense.id)}
                            disabled={deletingId === expense.id}
                            className="text-muted-foreground hover:text-destructive transition-all p-1 rounded md:opacity-0 md:group-hover:opacity-100 focus:opacity-100"
                          >
                            <Trash2 size={13} />
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )
      })}
    </div>

      <Sheet open={!!editingExpense} onOpenChange={(v) => { if (!v) setEditingExpense(null) }}>
        <SheetContent side="bottom" className="rounded-t-2xl max-w-lg mx-auto px-4 pb-8 max-h-[92dvh] overflow-y-auto">
          <SheetHeader className="pb-4">
            <SheetTitle className="text-left">Modifier la dépense</SheetTitle>
          </SheetHeader>
          {editingExpense && (
            <ExpenseForm
              key={editingExpense.id}
              tags={tags}
              initialExpense={editingExpense}
              onSuccess={() => setEditingExpense(null)}
              onSaved={onMutation}
            />
          )}
        </SheetContent>
      </Sheet>
    </>
  )
}
