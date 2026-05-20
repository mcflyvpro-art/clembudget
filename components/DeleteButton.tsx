'use client'

import { useTransition } from 'react'
import { Trash2 } from 'lucide-react'
import { deleteExpense } from '@/app/actions'

export default function DeleteButton({ id }: { id: string }) {
  const [isPending, startTransition] = useTransition()

  return (
    <button
      onClick={() => startTransition(() => deleteExpense(id))}
      disabled={isPending}
      className="p-2 rounded-lg text-muted-foreground hover:text-destructive hover:bg-destructive/8 transition-colors disabled:opacity-40 cursor-pointer border-0"
      aria-label="Supprimer"
    >
      <Trash2 size={15} />
    </button>
  )
}
