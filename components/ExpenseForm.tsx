'use client'

import { useState, useTransition, useRef } from 'react'
import { Loader2 } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { addExpense, updateExpense } from '@/app/actions'
import { todayISO } from '@/lib/date-utils'
import { FREQUENCIES } from '@/lib/constants'
import type { Tag, NewExpense, Expense } from '@/lib/types'

interface Props {
  tags: Tag[]
  onSuccess: () => void
  onAdd?: (data: NewExpense, tag: Tag | null) => Promise<void>
  onSaved?: () => void
  initialExpense?: Expense
}

export default function ExpenseForm({ tags, onSuccess, onAdd, onSaved, initialExpense }: Props) {
  const isEditing = !!initialExpense
  const [isPending, startTransition] = useTransition()
  const submittedRef = useRef(false)
  const [amount, setAmount] = useState(initialExpense ? String(initialExpense.amount) : '')
  const [label, setLabel] = useState(initialExpense?.label ?? '')
  const [tagId, setTagId] = useState<string | null>(initialExpense?.tag_id ?? null)
  const [date, setDate] = useState(initialExpense?.date ?? todayISO())
  const [isRecurring, setIsRecurring] = useState(initialExpense?.is_recurring ?? false)
  const [frequency, setFrequency] = useState<'daily' | 'weekly' | 'monthly' | 'yearly'>(
    initialExpense?.recurrence_frequency ?? 'monthly'
  )
  const [error, setError] = useState<string | null>(null)

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (submittedRef.current || isPending) return
    const num = parseFloat(amount.replace(',', '.'))
    if (!num || num <= 0) { setError('Montant invalide'); return }
    if (!label.trim()) { setError('Ajoute un intitulé'); return }
    if (!tagId) { setError('Choisis une catégorie'); return }
    setError(null)
    submittedRef.current = true

    const tag = tags.find((t) => t.id === tagId) ?? null
    const data: NewExpense = {
      amount: num,
      label: label.trim(),
      tag_id: tagId,
      date,
      is_recurring: isRecurring,
      recurrence_frequency: isRecurring ? frequency : null,
    }

    onSuccess()

    startTransition(async () => {
      try {
        if (isEditing && initialExpense) {
          await updateExpense(initialExpense.id, data)
          onSaved?.()
        } else if (onAdd) {
          await onAdd(data, tag)
        } else {
          await addExpense(data)
          onSaved?.()
        }
      } catch {
        submittedRef.current = false
      }
    })
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <div className="space-y-1.5">
        <Label htmlFor="amount">Montant (€)</Label>
        <div className="relative">
          <Input
            id="amount"
            type="text"
            inputMode="decimal"
            autoFocus
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            placeholder="0,00"
            className="text-2xl font-light tabular-nums h-14 pr-8"
          />
          <span className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground text-lg">€</span>
        </div>
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="expense-label">Intitulé</Label>
        <Input
          id="expense-label"
          value={label}
          onChange={(e) => setLabel(e.target.value)}
          placeholder="Sushi, Netflix, Uber…"
        />
      </div>

      <div className="space-y-2">
        <Label>Catégorie <span className="text-destructive">*</span></Label>
        <div className="flex flex-wrap gap-2">
          {tags.map((tag) => (
            <button
              key={tag.id}
              type="button"
              onClick={() => setTagId(tagId === tag.id ? null : tag.id)}
              className="rounded-full px-3 py-1 text-sm font-medium border transition-all"
              style={
                tagId === tag.id
                  ? { backgroundColor: tag.color, color: '#fff', borderColor: tag.color }
                  : { backgroundColor: tag.color + '20', color: tag.color, borderColor: tag.color + '40' }
              }
            >
              {tag.name}
            </button>
          ))}
        </div>
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="expense-date">Date</Label>
        <Input
          id="expense-date"
          type="date"
          value={date}
          onChange={(e) => setDate(e.target.value)}
        />
      </div>

      <div>
        <button
          type="button"
          onClick={() => setIsRecurring(!isRecurring)}
          className={`w-full py-2 rounded-xl text-sm font-medium border transition-all ${
            isRecurring
              ? 'bg-primary/10 border-primary/30 text-primary'
              : 'bg-muted border-transparent text-muted-foreground'
          }`}
        >
          ↻ Récurrente
        </button>
      </div>

      {isRecurring && (
        <div className="space-y-1.5">
          <Label>Fréquence</Label>
          <div className="flex gap-2">
            {FREQUENCIES.map((f) => (
              <button
                key={f.value}
                type="button"
                onClick={() => setFrequency(f.value)}
                className={`flex-1 py-1.5 rounded-lg text-xs font-medium border transition-all ${
                  frequency === f.value
                    ? 'bg-primary text-primary-foreground border-primary'
                    : 'bg-muted border-transparent text-muted-foreground'
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>
        </div>
      )}

      {error && <p className="text-sm text-destructive">{error}</p>}

      <Button type="submit" disabled={isPending} className="w-full h-12 text-base">
        {isPending ? (
          <span className="flex items-center gap-2">
            <Loader2 size={16} className="animate-spin" />
            {isEditing ? 'Modification…' : 'Ajout…'}
          </span>
        ) : isEditing ? 'Modifier' : 'Ajouter'}
      </Button>
    </form>
  )
}
