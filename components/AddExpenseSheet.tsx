'use client'

import { useState, useTransition, useRef, useEffect } from 'react'
import { Plus } from 'lucide-react'
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { addExpense } from '@/app/actions'
import type { Tag } from '@/lib/types'

interface Props {
  tags: Tag[]
}

const FREQUENCIES = [
  { value: 'daily', label: 'Quotidien' },
  { value: 'weekly', label: 'Hebdo' },
  { value: 'monthly', label: 'Mensuel' },
  { value: 'yearly', label: 'Annuel' },
] as const

function todayISO() {
  return new Date().toISOString().split('T')[0]
}

export default function AddExpenseSheet({ tags }: Props) {
  const [open, setOpen] = useState(false)
  const [, startTransition] = useTransition()
  const amountRef = useRef<HTMLInputElement>(null)

  const [amount, setAmount] = useState('')
  const [label, setLabel] = useState('')
  const [tagId, setTagId] = useState<string | null>(null)
  const [date, setDate] = useState(todayISO())
  const [isRecurring, setIsRecurring] = useState(false)
  const [frequency, setFrequency] = useState<'daily' | 'weekly' | 'monthly' | 'yearly'>('monthly')
  const [isExceptional, setIsExceptional] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (open) {
      setTimeout(() => amountRef.current?.focus(), 100)
    }
  }, [open])

  function reset() {
    setAmount('')
    setLabel('')
    setTagId(null)
    setDate(todayISO())
    setIsRecurring(false)
    setFrequency('monthly')
    setIsExceptional(false)
    setError(null)
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const num = parseFloat(amount.replace(',', '.'))
    if (!num || num <= 0) { setError('Montant invalide'); return }
    if (!label.trim()) { setError('Ajoute un intitulé'); return }

    setError(null)
    startTransition(async () => {
      try {
        await addExpense({
          amount: num,
          label: label.trim(),
          tag_id: tagId,
          date,
          is_recurring: isRecurring,
          recurrence_frequency: isRecurring ? frequency : null,
          is_exceptional: isExceptional,
        })
        reset()
        setOpen(false)
      } catch {
        setError('Erreur lors de l\'ajout')
      }
    })
  }

  return (
    <Sheet open={open} onOpenChange={(v) => { setOpen(v); if (!v) reset() }}>
      <SheetTrigger
        className="fixed bottom-6 right-6 z-50 w-14 h-14 bg-primary text-primary-foreground rounded-full shadow-lg flex items-center justify-center hover:opacity-90 active:scale-95 transition-all cursor-pointer border-0"
        aria-label="Ajouter une dépense"
      >
        <Plus size={24} strokeWidth={2} />
      </SheetTrigger>

      <SheetContent side="bottom" className="rounded-t-2xl max-w-lg mx-auto px-4 pb-8 max-h-[92dvh] overflow-y-auto">
        <SheetHeader className="pb-4">
          <SheetTitle className="text-left">Nouvelle dépense</SheetTitle>
        </SheetHeader>

        <form onSubmit={handleSubmit} className="space-y-5">
          {/* Amount */}
          <div className="space-y-1.5">
            <Label htmlFor="amount">Montant (€)</Label>
            <div className="relative">
              <Input
                ref={amountRef}
                id="amount"
                type="text"
                inputMode="decimal"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="0,00"
                className="text-2xl font-light tabular-nums h-14 pr-8"
              />
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground text-lg">€</span>
            </div>
          </div>

          {/* Label */}
          <div className="space-y-1.5">
            <Label htmlFor="label">Intitulé</Label>
            <Input
              id="label"
              value={label}
              onChange={(e) => setLabel(e.target.value)}
              placeholder="Sushi, Netflix, Uber…"
            />
          </div>

          {/* Tags */}
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

          {/* Date */}
          <div className="space-y-1.5">
            <Label htmlFor="date">Date</Label>
            <Input
              id="date"
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
            />
          </div>

          {/* Toggles */}
          <div className="flex gap-3">
            <button
              type="button"
              onClick={() => setIsRecurring(!isRecurring)}
              className={`flex-1 py-2 rounded-xl text-sm font-medium border transition-all ${
                isRecurring
                  ? 'bg-primary/10 border-primary/30 text-primary'
                  : 'bg-muted border-transparent text-muted-foreground'
              }`}
            >
              ↻ Récurrente
            </button>
            <button
              type="button"
              onClick={() => setIsExceptional(!isExceptional)}
              className={`flex-1 py-2 rounded-xl text-sm font-medium border transition-all ${
                isExceptional
                  ? 'bg-amber-50 border-amber-200 text-amber-700'
                  : 'bg-muted border-transparent text-muted-foreground'
              }`}
            >
              ⚡ Exceptionnelle
            </button>
          </div>

          {/* Frequency (if recurring) */}
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

          <Button type="submit" className="w-full h-12 text-base">
            Ajouter
          </Button>
        </form>
      </SheetContent>
    </Sheet>
  )
}
