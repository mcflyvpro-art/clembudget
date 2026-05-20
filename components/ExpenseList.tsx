'use client'

import { useState, useTransition } from 'react'
import { Trash2 } from 'lucide-react'
import type { Expense } from '@/lib/types'
import TagBadge from './TagBadge'
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

function formatAmount(amount: number) {
  return new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' }).format(amount)
}

interface Props {
  expenses: Expense[]
}

export default function ExpenseList({ expenses }: Props) {
  const [, startTransition] = useTransition()
  const [deletingId, setDeletingId] = useState<string | null>(null)

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
    })
  }

  return (
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
                {formatAmount(dayTotal)}
              </span>
            </div>

            <div className="space-y-1">
              {dayExpenses.map((expense) => (
                <div
                  key={expense.id}
                  className={`flex items-center gap-3 bg-card rounded-xl px-3 py-2.5 border border-border/60 group transition-opacity ${
                    deletingId === expense.id ? 'opacity-40' : ''
                  }`}
                >
                  <span className="tabular-nums font-medium text-sm w-16 shrink-0 text-right">
                    {formatAmount(Number(expense.amount))}
                  </span>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-sm truncate">{expense.label}</span>
                      {expense.is_exceptional && (
                        <span className="text-[10px] text-muted-foreground bg-muted px-1.5 py-0.5 rounded-full">excep.</span>
                      )}
                      {expense.is_recurring && (
                        <span className="text-[10px] text-muted-foreground bg-muted px-1.5 py-0.5 rounded-full">↻</span>
                      )}
                    </div>
                    {expense.tags && <TagBadge tag={expense.tags} />}
                  </div>

                  <button
                    onClick={() => handleDelete(expense.id)}
                    disabled={deletingId === expense.id}
                    className="shrink-0 opacity-0 group-hover:opacity-100 focus:opacity-100 text-muted-foreground hover:text-destructive transition-all p-1"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              ))}
            </div>
          </div>
        )
      })}
    </div>
  )
}
