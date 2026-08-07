'use client'

import { useState, useTransition, useMemo } from 'react'
import Link from 'next/link'
import { Pencil, Trash2, Check, X, Plus, Target } from 'lucide-react'
import { createTag, updateTag, deleteTag } from '@/app/actions'
import TagBadge from '@/components/TagBadge'
import { budgetPeriodLabel } from '@/lib/budgets'
import { formatEUR } from '@/lib/utils'
import type { Tag, BudgetProgress } from '@/lib/types'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'

const PRESET_COLORS = [
  '#f59e8b', '#d4956a', '#f5c87a', '#f87171', '#fb923c',
  '#4ade80', '#82c4a0', '#a8bfa8', '#86b8d4', '#7ab0d4',
  '#60a5fa', '#818cf8', '#c4a5d4', '#e8a0b0', '#e879f9',
  '#f472b6', '#94a3b8', '#c0b8b0',
]

function ColorPicker({ value, onChange }: { value: string; onChange: (c: string) => void }) {
  const isPreset = PRESET_COLORS.includes(value)

  return (
    <div className="flex flex-wrap gap-2 items-center">
      {PRESET_COLORS.map((c) => (
        <button
          key={c}
          type="button"
          onClick={() => onChange(c)}
          className="w-7 h-7 rounded-full transition-all"
          style={{
            backgroundColor: c,
            outline: value === c ? `2px solid ${c}` : 'none',
            outlineOffset: '2px',
            opacity: value !== c ? 0.7 : 1,
            transform: value === c ? 'scale(1.15)' : 'scale(1)',
          }}
        />
      ))}
      <label
        className="w-7 h-7 rounded-full cursor-pointer relative overflow-hidden flex items-center justify-center transition-all"
        style={{
          backgroundColor: isPreset ? 'transparent' : value,
          border: isPreset ? '2px dashed var(--border)' : `2px solid ${value}`,
          outline: !isPreset ? `2px solid ${value}` : 'none',
          outlineOffset: '2px',
        }}
        title="Couleur personnalisée"
      >
        <input
          type="color"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
        />
        {isPreset && <span className="text-[11px] text-muted-foreground select-none">+</span>}
      </label>
    </div>
  )
}

interface Props {
  initialTags: Tag[]
  budgets?: BudgetProgress[]
}

export default function TagsManager({ initialTags, budgets = [] }: Props) {
  const budgetByTag = useMemo(() => {
    const map = new Map<string, BudgetProgress>()
    for (const p of budgets) {
      if (p.budget.kind !== 'recurring' || !p.budget.tag_id) continue
      map.set(p.budget.tag_id, p)
    }
    return map
  }, [budgets])

  const [editingId, setEditingId] = useState<string | null>(null)
  const [editName, setEditName] = useState('')
  const [editColor, setEditColor] = useState('')
  const [newName, setNewName] = useState('')
  const [newColor, setNewColor] = useState(PRESET_COLORS[0])
  const [createError, setCreateError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  function startEdit(tag: Tag) {
    setEditingId(tag.id)
    setEditName(tag.name)
    setEditColor(tag.color)
  }

  function cancelEdit() {
    setEditingId(null)
    setEditName('')
    setEditColor('')
  }

  function handleSaveEdit(id: string) {
    if (!editName.trim()) return
    startTransition(async () => {
      await updateTag(id, editName, editColor)
      cancelEdit()
    })
  }

  function handleDelete(id: string) {
    startTransition(async () => {
      await deleteTag(id)
    })
  }

  function handleCreate(e: React.FormEvent) {
    e.preventDefault()
    if (!newName.trim()) { setCreateError('Nom requis'); return }
    setCreateError(null)
    startTransition(async () => {
      await createTag(newName, newColor)
      setNewName('')
      setNewColor(PRESET_COLORS[0])
    })
  }

  return (
    <div className="lg:grid lg:grid-cols-[1fr_360px] lg:gap-8 lg:items-start">
      {/* Liste existante */}
      <div className="space-y-2 mb-8 lg:mb-0">
        {initialTags.length === 0 && (
          <p className="text-sm text-muted-foreground py-4 text-center">Aucune catégorie</p>
        )}
        {initialTags.map((tag) =>
          editingId === tag.id ? (
            <div key={tag.id} className="rounded-xl border border-border p-4 space-y-3 bg-muted/20">
              <div className="space-y-1.5">
                <Label>Nom</Label>
                <Input
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  autoFocus
                  onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); handleSaveEdit(tag.id) } }}
                />
              </div>
              <div className="space-y-1.5">
                <Label>Couleur</Label>
                <ColorPicker value={editColor} onChange={setEditColor} />
              </div>
              <div className="flex gap-2">
                <Button size="sm" onClick={() => handleSaveEdit(tag.id)} disabled={isPending}>
                  <Check size={14} className="mr-1" />Enregistrer
                </Button>
                <Button size="sm" variant="ghost" onClick={cancelEdit} type="button">
                  <X size={14} className="mr-1" />Annuler
                </Button>
              </div>
            </div>
          ) : (
            <div
              key={tag.id}
              className="flex items-center gap-3 pl-2.5 pr-4 py-3 rounded-xl border border-border/50 transition-colors hover:brightness-[0.99]"
              style={{ backgroundColor: `color-mix(in srgb, ${tag.color} 6%, transparent)` }}
            >
              <span
                className="w-1 self-stretch min-h-[24px] rounded-full shrink-0"
                style={{ backgroundColor: tag.color }}
              />
              <span className="flex-1 min-w-0">
                <TagBadge tag={tag} size="md" />
              </span>
              {(() => {
                const bp = budgetByTag.get(tag.id)
                return (
                  <Link
                    href="/objectifs"
                    title={bp ? 'Modifier l’objectif' : 'Définir un objectif'}
                    className={`flex items-center gap-1 px-2 py-0.5 rounded-lg text-[11px] font-medium tabular-nums transition-colors ${
                      bp
                        ? bp.status === 'over'
                          ? 'bg-destructive/10 text-destructive'
                          : 'bg-primary/10 text-primary'
                        : 'text-muted-foreground/50 hover:text-muted-foreground'
                    }`}
                  >
                    <Target size={11} />
                    {bp ? `${formatEUR(Number(bp.budget.amount))}${budgetPeriodLabel(bp)}` : 'Objectif'}
                  </Link>
                )
              })()}
              <button
                onClick={() => startEdit(tag)}
                className="p-1.5 text-muted-foreground hover:text-foreground transition-colors"
                title="Modifier"
                type="button"
              >
                <Pencil size={14} />
              </button>
              <button
                onClick={() => handleDelete(tag.id)}
                className="p-1.5 text-muted-foreground hover:text-destructive transition-colors"
                title="Supprimer"
                type="button"
                disabled={isPending}
              >
                <Trash2 size={14} />
              </button>
            </div>
          )
        )}
      </div>

      {/* Formulaire de création */}
      <div className="bg-card rounded-2xl border border-border p-6 lg:sticky lg:top-24">
        <p className="text-sm font-semibold mb-4">Nouvelle catégorie</p>
        <form onSubmit={handleCreate} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="new-name">Nom</Label>
            <Input
              id="new-name"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              placeholder="Ex: Abonnements, Sport…"
            />
          </div>
          <div className="space-y-1.5">
            <Label>Couleur</Label>
            <ColorPicker value={newColor} onChange={setNewColor} />
            <div className="flex items-center gap-2 mt-1">
              <div className="w-3.5 h-3.5 rounded-full" style={{ backgroundColor: newColor }} />
              <span className="text-xs text-muted-foreground">{newColor}</span>
            </div>
          </div>
          {createError && <p className="text-sm text-destructive">{createError}</p>}
          <Button type="submit" disabled={isPending} className="w-full">
            <Plus size={16} className="mr-1" />Ajouter
          </Button>
        </form>
      </div>
    </div>
  )
}
