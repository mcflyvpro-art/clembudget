'use client'

import { useState } from 'react'
import { Plus, X } from 'lucide-react'
import { Dialog } from '@base-ui/react/dialog'
import ExpenseForm from '@/components/ExpenseForm'
import type { Tag, NewExpense } from '@/lib/types'

interface Props {
  tags: Tag[]
  onAdd?: (data: NewExpense, tag: Tag | null) => Promise<void>
}

export default function AddExpenseDesktopForm({ tags, onAdd }: Props) {
  const [open, setOpen] = useState(false)
  const [formKey, setFormKey] = useState(0)

  function handleOpen(v: boolean) {
    setOpen(v)
    if (v) setFormKey((k) => k + 1)
  }

  return (
    <Dialog.Root open={open} onOpenChange={handleOpen}>
      <Dialog.Trigger
        className="w-full flex items-center justify-center gap-2.5 py-3.5 px-6 rounded-xl bg-primary text-primary-foreground font-semibold text-sm hover:opacity-90 active:scale-[0.98] transition-all cursor-pointer border-0 shadow-sm"
      >
        <Plus size={18} strokeWidth={2.5} />
        Ajouter une dépense
      </Dialog.Trigger>

      <Dialog.Portal>
        <Dialog.Backdrop className="fixed inset-0 z-50 bg-black/20 backdrop-blur-sm transition-opacity duration-200 data-ending-style:opacity-0 data-starting-style:opacity-0" />
        <Dialog.Popup className="fixed z-50 bottom-8 left-1/2 -translate-x-1/2 w-[480px] bg-popover rounded-2xl shadow-2xl max-h-[85dvh] overflow-y-auto transition-all duration-200 ease-out data-starting-style:translate-y-4 data-starting-style:opacity-0 data-ending-style:translate-y-4 data-ending-style:opacity-0">
          <div className="px-6 pt-5 pb-6">
            <div className="flex items-center justify-between mb-5">
              <Dialog.Title className="font-semibold text-base">Nouvelle dépense</Dialog.Title>
              <Dialog.Close className="p-1.5 text-muted-foreground hover:text-foreground rounded-lg hover:bg-muted transition-colors cursor-pointer">
                <X size={16} />
              </Dialog.Close>
            </div>
            <ExpenseForm key={formKey} tags={tags} onSuccess={() => setOpen(false)} onAdd={onAdd} />
          </div>
        </Dialog.Popup>
      </Dialog.Portal>
    </Dialog.Root>
  )
}
