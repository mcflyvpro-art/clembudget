'use client'

import { useState, useTransition } from 'react'
import { Pencil } from 'lucide-react'
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { updateExpense, updateRecurringFromNow } from '@/app/actions'
import { FREQUENCIES } from '@/lib/constants'
import type { Expense, Tag } from '@/lib/types'

interface Props {
  expense: Expense
  tags: Tag[]
}

export default function EditRecurringSheet({ expense, tags }: Props) {
  const [open, setOpen] = useState(false)
  const [, startTransition] = useTransition()

  const [amount, setAmount] = useState(String(expense.amount))
  const [label, setLabel] = useState(expense.label)
  const [tagId, setTagId] = useState<string | null>(expense.tag_id)
  const [date, setDate] = useState(expense.date)
  const [frequency, setFrequency] = useState<'daily' | 'weekly' | 'monthly' | 'yearly'>(
    expense.recurrence_frequency ?? 'monthly'
  )
  const [error, setError] = useState<string | null>(null)

  function validate(): { amount: number; label: string } | null {
    const num = parseFloat(amount.replace(',', '.'))
    if (!num || num <= 0) { setError('Montant invalide'); return null }
    if (!label.trim()) { setError('Ajoute un intitulé'); return null }
    if (!tagId) { setError('Choisis une catégorie'); return null }
    setError(null)
    return { amount: num, label: label.trim() }
  }

  function handleUpdateAll() {
    const v = validate(); if (!v) return
    startTransition(async () => {
      try {
        await updateExpense(expense.id, {
          amount: v.amount, label: v.label, tag_id: tagId!,
          date, is_recurring: true, recurrence_frequency: frequency,
        })
        setOpen(false)
      } catch { setError('Erreur lors de la modification') }
    })
  }

  function handleUpdateFromNow() {
    const v = validate(); if (!v) return
    startTransition(async () => {
      try {
        await updateRecurringFromNow(expense.id, {
          amount: v.amount, label: v.label, tag_id: tagId!,
          date, is_recurring: true, recurrence_frequency: frequency,
        })
        setOpen(false)
      } catch { setError('Erreur lors de la modification') }
    })
  }

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger
        className="p-2 rounded-lg text-muted-foreground hover:text-primary hover:bg-primary/8 transition-colors cursor-pointer border-0"
        aria-label="Modifier"
      >
        <Pencil size={15} />
      </SheetTrigger>

      <SheetContent side="bottom" className="rounded-t-2xl max-w-lg mx-auto px-4 pb-8 max-h-[92dvh] overflow-y-auto">
        <SheetHeader className="pb-4">
          <SheetTitle className="text-left">Modifier la récurrence</SheetTitle>
        </SheetHeader>

        <div className="space-y-5">
          <div className="space-y-1.5">
            <Label htmlFor="edit-amount">Montant (€)</Label>
            <div className="relative">
              <Input
                id="edit-amount"
                type="text"
                inputMode="decimal"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className="text-2xl font-light tabular-nums h-14 pr-8"
              />
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground text-lg">€</span>
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="edit-label">Intitulé</Label>
            <Input id="edit-label" value={label} onChange={(e) => setLabel(e.target.value)} />
          </div>

          <div className="space-y-2">
            <Label>Catégorie</Label>
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
            <Label htmlFor="edit-date">Date d&apos;ancrage</Label>
            <p className="text-xs text-muted-foreground">Jour où tombe la dépense dans le cycle</p>
            <Input
              id="edit-date"
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
            />
          </div>

          <div className="space-y-1.5">
            <Label>Fréquence</Label>
            <div className="flex gap-2">
              {FREQUENCIES.map((f) => (
                <button
                  key={f.value}
                  type="button"
                  onClick={() => setFrequency(f.value)}
                  className={`flex-1 py-1.5 rounded-lg text-sm font-medium border transition-all ${
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

          {error && <p className="text-sm text-destructive">{error}</p>}

          {/* Deux modes de modification */}
          <div className="grid gap-2 pt-1">
            <div className="border border-border rounded-xl p-3 space-y-2">
              <Button type="button" onClick={handleUpdateFromNow} variant="outline" className="w-full h-11">
                Modifier à partir d&apos;aujourd&apos;hui
              </Button>
              <p className="text-xs text-muted-foreground text-center leading-snug">
                Ex : loyer qui change — l&apos;historique passé reste intact
              </p>
            </div>

            <div className="border border-border rounded-xl p-3 space-y-2">
              <Button type="button" onClick={handleUpdateAll} className="w-full h-11">
                Modifier toute la récurrence
              </Button>
              <p className="text-xs text-muted-foreground text-center leading-snug">
                Corrige une erreur — met à jour toutes les occurrences
              </p>
            </div>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  )
}
