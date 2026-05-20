'use client'

import { useState, useTransition } from 'react'
import { Pencil } from 'lucide-react'
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { updateExpense } from '@/app/actions'
import type { Expense, Tag } from '@/lib/types'

interface Props {
  expense: Expense
  tags: Tag[]
}

const FREQUENCIES = [
  { value: 'daily',   label: 'Quotidien' },
  { value: 'weekly',  label: 'Hebdo' },
  { value: 'monthly', label: 'Mensuel' },
  { value: 'yearly',  label: 'Annuel' },
] as const

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

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const num = parseFloat(amount.replace(',', '.'))
    if (!num || num <= 0) { setError('Montant invalide'); return }
    if (!label.trim()) { setError('Ajoute un intitulé'); return }
    setError(null)

    startTransition(async () => {
      try {
        await updateExpense(expense.id, {
          amount: num,
          label: label.trim(),
          tag_id: tagId,
          date,
          is_recurring: true,
          recurrence_frequency: frequency,
        })
        setOpen(false)
      } catch {
        setError('Erreur lors de la modification')
      }
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

        <form onSubmit={handleSubmit} className="space-y-5">
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
            <Input
              id="edit-label"
              value={label}
              onChange={(e) => setLabel(e.target.value)}
            />
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
            <Label htmlFor="edit-date">Date d'ancrage</Label>
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

          <Button type="submit" className="w-full h-12 text-base">
            Enregistrer
          </Button>
        </form>
      </SheetContent>
    </Sheet>
  )
}
