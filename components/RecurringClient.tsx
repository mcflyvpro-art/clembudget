'use client'

import { useState, useMemo } from 'react'
import { ChevronDown } from 'lucide-react'
import { formatEUR } from '@/lib/utils'
import { describeFrequency, totalMonthlyEquivalent } from '@/lib/recurring-utils'
import type { Expense, Tag } from '@/lib/types'
import TagBadge from '@/components/TagBadge'
import EditRecurringSheet from '@/components/EditRecurringSheet'
import RecurringActions from '@/components/RecurringActions'

const FALLBACK = '#c0b8b0'

interface Props {
  active:  Expense[]
  stopped: Expense[]
  tags:    Tag[]
}

type CategoryGroup = {
  id:       string
  name:     string
  color:    string
  expenses: Expense[]
}

export default function RecurringClient({ active, stopped, tags }: Props) {
  const groups = useMemo((): CategoryGroup[] => {
    const map: Record<string, CategoryGroup> = {}
    for (const e of active) {
      const key = e.tag_id ?? '__none__'
      if (!map[key]) {
        map[key] = {
          id:       key,
          name:     e.tags?.name  ?? 'Sans catégorie',
          color:    e.tags?.color ?? FALLBACK,
          expenses: [],
        }
      }
      map[key].expenses.push(e)
    }
    return Object.values(map).sort((a, b) => {
      if (a.id === '__none__') return 1
      if (b.id === '__none__') return -1
      return a.name.localeCompare(b.name, 'fr')
    })
  }, [active])

  // Track open groups — everything closed by default
  const [openGroups, setOpenGroups] = useState<Set<string>>(new Set())

  function toggleGroup(id: string) {
    setOpenGroups(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id); else next.add(id)
      return next
    })
  }

  if (active.length === 0 && stopped.length === 0) {
    return (
      <div className="text-center py-16 text-muted-foreground text-sm">
        <p className="text-2xl mb-2">↻</p>
        Aucune dépense récurrente.<br />
        Ajoute-en une depuis le dashboard en cochant &ldquo;Récurrente&rdquo;.
      </div>
    )
  }

  return (
    <div className="space-y-3">
      {groups.map(group => {
        const isOpen       = openGroups.has(group.id)
        const groupMonthly = totalMonthlyEquivalent(group.expenses)

        return (
          <div key={group.id} className="border border-border rounded-xl overflow-hidden">
            {/* Accordion header */}
            <button
              onClick={() => toggleGroup(group.id)}
              className="w-full flex items-center gap-3 px-4 py-3 bg-card hover:bg-muted/30 transition-colors text-left"
            >
              <span
                className="w-3 h-3 rounded-full shrink-0"
                style={{ backgroundColor: group.color }}
              />
              <span className="font-medium flex-1">{group.name}</span>
              <span className="text-xs text-muted-foreground tabular-nums">
                {group.expenses.length} · {formatEUR(groupMonthly)}/mois
              </span>
              <ChevronDown
                size={14}
                className={`text-muted-foreground shrink-0 transition-transform duration-200 ${isOpen ? '' : '-rotate-90'}`}
              />
            </button>

            {/* Accordion content */}
            {isOpen && (
              <div className="border-t border-border/50 divide-y divide-border/30">
                {group.expenses.map(expense => (
                  <div key={expense.id} className="flex items-center gap-4 px-4 py-3.5">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-0.5 flex-wrap">
                        <span className="font-medium">{expense.label}</span>
                        {expense.tags && <TagBadge tag={expense.tags} />}
                      </div>
                      <p className="text-xs text-muted-foreground">{describeFrequency(expense)}</p>
                    </div>
                    <span className="tabular-nums font-semibold text-base shrink-0">
                      {formatEUR(Number(expense.amount))}
                    </span>
                    <div className="flex items-center gap-1 shrink-0">
                      <EditRecurringSheet expense={expense} tags={tags} />
                      <RecurringActions id={expense.id} label={expense.label} isStopped={false} />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )
      })}

      {/* Arrêtées */}
      {stopped.length > 0 && (
        <div className="pt-2">
          <h2 className="text-sm font-medium text-muted-foreground mb-3">Arrêtées</h2>
          <div className="grid gap-3 lg:grid-cols-2">
            {stopped.map(expense => (
              <div
                key={expense.id}
                className="bg-muted/40 border border-border/50 rounded-xl px-4 py-3.5 flex items-center gap-4 opacity-60"
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-0.5 flex-wrap">
                    <span className="font-medium line-through">{expense.label}</span>
                    {expense.tags && <TagBadge tag={expense.tags} />}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {describeFrequency(expense)} · arrêtée le{' '}
                    {new Date(expense.recurrence_ended_at! + 'T00:00:00').toLocaleDateString('fr-FR', {
                      day: 'numeric', month: 'long', year: 'numeric',
                    })}
                  </p>
                </div>
                <span className="tabular-nums font-semibold text-base shrink-0 line-through text-muted-foreground">
                  {formatEUR(Number(expense.amount))}
                </span>
                <RecurringActions id={expense.id} label={expense.label} isStopped={true} />
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
