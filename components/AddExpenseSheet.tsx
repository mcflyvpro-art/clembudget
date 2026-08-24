'use client'

import { useEffect, useState } from 'react'
import { Plus } from 'lucide-react'
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet'
import ExpenseForm from '@/components/ExpenseForm'
import type { Tag, NewExpense } from '@/lib/types'

interface Props {
  tags: Tag[]
  onAdd?: (data: NewExpense, tag: Tag | null) => Promise<void>
}

export default function AddExpenseSheet({ tags, onAdd }: Props) {
  const [open, setOpen] = useState(false)
  const [formKey, setFormKey] = useState(0)

  function handleOpen(v: boolean) {
    setOpen(v)
    if (v) setFormKey((k) => k + 1)
  }

  // Raccourci « Ajouter une dépense » (appui long sur l'icône de l'app,
  // manifest.ts) : /?add=1 ouvre directement le formulaire.
  useEffect(() => {
    if (new URLSearchParams(window.location.search).get('add') !== '1') return
    // on nettoie l'URL pour ne pas rouvrir la feuille au retour arrière
    window.history.replaceState(null, '', window.location.pathname)
    // une frame d'attente : l'app s'affiche d'abord, la feuille glisse ensuite
    const raf = requestAnimationFrame(() => handleOpen(true))
    return () => cancelAnimationFrame(raf)
  }, [])

  return (
    <Sheet open={open} onOpenChange={handleOpen}>
      {/* FAB mobile uniquement */}
      <SheetTrigger
        className="app-fab lg:hidden fixed right-5 bottom-[calc(5rem+var(--sab))] z-40 w-14 h-14 bg-primary text-primary-foreground rounded-full shadow-lg shadow-primary/25 flex items-center justify-center hover:opacity-90 active:scale-95 transition-all cursor-pointer border-0"
        aria-label="Ajouter une dépense"
      >
        <Plus size={24} strokeWidth={2} />
      </SheetTrigger>

      <SheetContent side="bottom" className="rounded-t-2xl max-w-lg mx-auto px-4 pb-8 max-h-[92dvh] overflow-y-auto">
        <SheetHeader className="pb-4">
          <SheetTitle className="text-left">Nouvelle dépense</SheetTitle>
        </SheetHeader>
        <ExpenseForm key={formKey} tags={tags} onSuccess={() => setOpen(false)} onAdd={onAdd} />
      </SheetContent>
    </Sheet>
  )
}
