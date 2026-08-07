'use client'

import { useState, useTransition } from 'react'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog'
import { stopRecurring, deleteExpense } from '@/app/actions'

interface Props {
  id: string
  label: string
  isStopped: boolean
}

export default function RecurringActions({ id, label, isStopped }: Props) {
  const [, startTransition] = useTransition()
  const [hardDeleteConfirm, setHardDeleteConfirm] = useState('')

  function handleStop() {
    startTransition(async () => { await stopRecurring(id) })
  }

  function handleHardDelete() {
    startTransition(async () => { await deleteExpense(id) })
  }

  return (
    <div className="flex items-center gap-1 shrink-0">

      {/* Arrêter — seulement si encore active */}
      {!isStopped && (
        <AlertDialog>
          <AlertDialogTrigger
            className="px-2.5 py-1.5 rounded-lg text-xs font-medium text-muted-foreground hover:text-foreground hover:bg-muted transition-colors border border-border cursor-pointer"
          >
            Arrêter
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Arrêter cette récurrence ?</AlertDialogTitle>
              <AlertDialogDescription>
                {`"${label}" ne générera plus de nouvelles occurrences à partir d'aujourd'hui.`}
              </AlertDialogDescription>
            </AlertDialogHeader>
            <p className="text-sm text-muted-foreground px-1">
              {"Les occurrences passées sont conservées dans l'historique et les statistiques."}
            </p>
            <AlertDialogFooter>
              <AlertDialogCancel>Annuler</AlertDialogCancel>
              <AlertDialogAction onClick={handleStop}>
                Arrêter la récurrence
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      )}

      {/* Supprimer définitivement */}
      <AlertDialog onOpenChange={() => setHardDeleteConfirm('')}>
        <AlertDialogTrigger
          className="px-2.5 py-1.5 rounded-lg text-xs font-medium text-destructive hover:bg-destructive/10 transition-colors border border-destructive/30 cursor-pointer"
        >
          Supprimer
        </AlertDialogTrigger>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="text-destructive">
              Suppression définitive
            </AlertDialogTitle>
            <AlertDialogDescription>
              {`Cette action est irréversible. Supprimer "${label}" effacera toutes les occurrences passées de l'historique et des statistiques.`}
            </AlertDialogDescription>
          </AlertDialogHeader>

          <div className="space-y-3 text-sm">
            <p className="text-muted-foreground">
              {"Pour arrêter sans perdre l'historique, utilise le bouton "}
              <span className="font-medium text-foreground">Arrêter</span>
              {" à la place."}
            </p>
            <div>
              <p className="text-xs font-medium mb-1.5">
                {"Écris "}
                <span className="font-mono font-bold text-destructive">SUPPRIMER</span>
                {" pour confirmer"}
              </p>
              <input
                type="text"
                value={hardDeleteConfirm}
                onChange={e => setHardDeleteConfirm(e.target.value)}
                placeholder="SUPPRIMER"
                className="w-full px-3 py-2 text-sm rounded-lg border border-border bg-background focus:outline-none focus:ring-1 focus:ring-destructive/40 font-mono"
              />
            </div>
          </div>

          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleHardDelete}
              disabled={hardDeleteConfirm !== 'SUPPRIMER'}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              Supprimer définitivement
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

    </div>
  )
}
