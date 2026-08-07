'use client'

import { useState, useMemo } from 'react'
import { Search, X, ChevronDown } from 'lucide-react'
import { formatEUR } from '@/lib/utils'
import type { Expense, Tag } from '@/lib/types'
import TagBadge from '@/components/TagBadge'
import RecurringBadge from '@/components/RecurringBadge'
import DeleteButton from '@/components/DeleteButton'

function monthLabel(key: string) {
  const [y, m] = key.split('-')
  return new Date(Number(y), Number(m) - 1, 1).toLocaleDateString('fr-FR', {
    month: 'long',
    year: 'numeric',
  })
}

const isProjection = (e: { is_projection?: boolean }) => !!e.is_projection

interface Props {
  expenses: Expense[]
  tags: Tag[]
  today: string
}

export default function ArchiveClient({ expenses, tags, today }: Props) {
  const currentMonth = today.slice(0, 7)

  const [search,        setSearch]        = useState('')
  const [selectedTagId, setSelectedTagId] = useState<string | null>(null)
  const [openMonths,    setOpenMonths]    = useState<Set<string>>(new Set())

  const usedTags = useMemo(() => {
    const used = new Set(expenses.map((e) => e.tag_id).filter(Boolean))
    return tags.filter((t) => used.has(t.id))
  }, [expenses, tags])

  const filtered = useMemo(() => {
    let list = expenses
    if (search.trim()) {
      const q = search.toLowerCase()
      list = list.filter((e) => e.label.toLowerCase().includes(q))
    }
    if (selectedTagId) {
      list = list.filter((e) => e.tag_id === selectedTagId)
    }
    return list
  }, [expenses, search, selectedTagId])

  const grouped = useMemo(() => {
    const groups: Record<string, Expense[]> = {}
    for (const e of filtered) {
      const k = e.date.slice(0, 7)
      if (!groups[k]) groups[k] = []
      groups[k].push(e)
    }
    return Object.entries(groups).sort(([a], [b]) => b.localeCompare(a))
  }, [filtered])

  const { totalPast, countPast } = useMemo(() => {
    let total = 0, count = 0
    for (const e of filtered) {
      if (e.date <= today) { total += Number(e.amount); count++ }
    }
    return { totalPast: total, countPast: count }
  }, [filtered, today])

  const isSearching = search.trim().length > 0

  function toggleMonth(key: string) {
    setOpenMonths(prev => {
      const next = new Set(prev)
      if (next.has(key)) next.delete(key); else next.add(key)
      return next
    })
  }

  function renderExpenseCard(expense: Expense) {
    const projection = isProjection(expense)
    const isFuture   = expense.date > today
    return (
      <div
        key={expense.id}
        className={`flex items-center gap-3 bg-card rounded-xl border border-border/60 group overflow-hidden ${isFuture ? 'opacity-60' : ''}`}
      >
        <div
          className="w-1 self-stretch shrink-0 min-h-[52px]"
          style={{ backgroundColor: expense.tags?.color ?? '#c0b8b0', opacity: isFuture ? 0.5 : 1 }}
        />
        <div className="flex-1 min-w-0 py-3">
          <p className="text-sm font-medium truncate leading-tight">{expense.label}</p>
          <div className="flex items-center gap-2 mt-1 flex-wrap">
            {expense.tags && <TagBadge tag={expense.tags} />}
            {expense.is_recurring && (
              <RecurringBadge frequency={expense.recurrence_frequency} />
            )}
            {isFuture && (
              <span className="text-[10px] font-semibold text-muted-foreground bg-muted px-1.5 py-0.5 rounded-full">
                À venir
              </span>
            )}
            <span className="text-[11px] text-muted-foreground">
              {new Date(expense.date + 'T00:00:00').toLocaleDateString('fr-FR', {
                day: 'numeric',
                month: 'short',
              })}
            </span>
          </div>
        </div>
        <div className="shrink-0 flex items-center gap-2 pr-3 py-3">
          <span className="tabular-nums font-semibold text-sm">
            {formatEUR(Number(expense.amount))}
          </span>
          {!projection && (
            <div className="opacity-0 group-hover:opacity-100 focus-within:opacity-100 transition-opacity">
              <DeleteButton id={expense.id} />
            </div>
          )}
        </div>
      </div>
    )
  }

  return (
    <>
      {/* Filters */}
      <div className="space-y-3 mb-6">
        <div className="relative">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Rechercher un intitulé…"
            className="w-full pl-9 pr-9 py-2 text-sm rounded-xl border border-border bg-background focus:outline-none focus:ring-1 focus:ring-primary/40"
          />
          {search && (
            <button
              onClick={() => setSearch('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
            >
              <X size={14} />
            </button>
          )}
        </div>

        {usedTags.length > 0 && (
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => setSelectedTagId(null)}
              className={`rounded-full px-3 py-1 text-xs font-medium border transition-all ${
                selectedTagId === null
                  ? 'bg-foreground text-background border-foreground'
                  : 'bg-muted text-muted-foreground border-transparent hover:text-foreground'
              }`}
            >
              Toutes
            </button>
            {usedTags.map((tag) => (
              <button
                key={tag.id}
                onClick={() => setSelectedTagId(selectedTagId === tag.id ? null : tag.id)}
                className="rounded-full px-3 py-1 text-xs font-medium border transition-all"
                style={
                  selectedTagId === tag.id
                    ? { backgroundColor: tag.color, color: '#fff', borderColor: tag.color }
                    : { backgroundColor: tag.color + '20', color: tag.color, borderColor: tag.color + '40' }
                }
              >
                {tag.name}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Result count */}
      <p className="text-sm text-muted-foreground mb-4">
        {countPast} dépense{countPast !== 1 ? 's' : ''} · {formatEUR(totalPast)}
      </p>

      {/* Search mode: flat list */}
      {isSearching ? (
        filtered.length === 0 ? (
          <div className="text-center py-16 text-muted-foreground text-sm">
            Aucune dépense correspondante
          </div>
        ) : (
          <div className="space-y-1.5">
            {[...filtered]
              .sort((a, b) => b.date.localeCompare(a.date))
              .map(expense => renderExpenseCard(expense))}
          </div>
        )
      ) : grouped.length === 0 ? (
        <div className="text-center py-16 text-muted-foreground text-sm">
          Aucune dépense correspondante
        </div>
      ) : (
        /* Accordion grouped by month */
        <div className="space-y-2">
          {grouped.map(([key, monthExpenses]) => {
            const isOpen       = openMonths.has(key)
            const isFutureMonth = key > currentMonth
            const monthTotal   = monthExpenses
              .filter(e => !isFutureMonth || e.date <= today)
              .reduce((s, e) => s + Number(e.amount), 0)

            return (
              <div key={key} className={`rounded-xl border border-border overflow-hidden ${isFutureMonth ? 'opacity-60' : ''}`}>
                {/* Accordion header */}
                <button
                  onClick={() => toggleMonth(key)}
                  className="w-full flex items-center gap-2.5 px-4 py-3 bg-card hover:bg-muted/30 transition-colors text-left"
                >
                  <ChevronDown
                    size={14}
                    className={`text-muted-foreground shrink-0 transition-transform duration-200 ${isOpen ? '' : '-rotate-90'}`}
                  />
                  <span className="font-medium capitalize flex-1">{monthLabel(key)}</span>
                  {isFutureMonth && (
                    <span className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground bg-muted px-2 py-0.5 rounded-full">
                      À venir
                    </span>
                  )}
                  <span className="text-xs text-muted-foreground tabular-nums mr-1">
                    {monthExpenses.length}
                  </span>
                  {!isFutureMonth && (
                    <span className="font-semibold tabular-nums text-sm">{formatEUR(monthTotal)}</span>
                  )}
                </button>

                {/* Accordion content */}
                {isOpen && (
                  <div className="border-t border-border/50 p-2 space-y-1.5">
                    {monthExpenses.map(expense => renderExpenseCard(expense))}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}
    </>
  )
}
