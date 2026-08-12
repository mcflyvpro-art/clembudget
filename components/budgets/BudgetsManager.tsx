'use client'

import { useState, useTransition, useMemo } from 'react'
import { Pencil, Trash2, Plus, X, Check, Pause, Play, Target, CalendarRange, Layers, Repeat } from 'lucide-react'
import { createBudget, updateBudget, deleteBudget, toggleBudget } from '@/app/actions'
import {
  BUDGET_PERIODS,
  STATUS_TEXT,
  alpha,
  budgetName,
  budgetPeriodLabel,
  budgetTint,
  viewBudget,
} from '@/lib/budgets'
import { useForecast, setForecastMany, useIncludeRecurring } from '@/lib/budget-forecast'
import { formatEUR } from '@/lib/utils'
import { todayISO } from '@/lib/date-utils'
import BudgetBar from './BudgetBar'
import TagBadge from '@/components/TagBadge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import type { Budget, BudgetKind, BudgetPeriod, BudgetProgress, Tag } from '@/lib/types'

// ── Form state ────────────────────────────────────────────────────────────────

type FormMode = 'category' | 'global' | 'oneshot'

type FormState = {
  mode: FormMode
  tagId: string
  amount: string
  period: BudgetPeriod
  label: string
  startDate: string
  endDate: string
}

function emptyForm(): FormState {
  const today = todayISO()
  const endOfMonth = (() => {
    const d = new Date(today + 'T00:00:00')
    const last = new Date(d.getFullYear(), d.getMonth() + 1, 0)
    return `${last.getFullYear()}-${String(last.getMonth() + 1).padStart(2, '0')}-${String(last.getDate()).padStart(2, '0')}`
  })()
  return {
    mode: 'category',
    tagId: '',
    amount: '',
    period: 'monthly',
    label: '',
    startDate: today,
    endDate: endOfMonth,
  }
}

function formFromBudget(b: Budget): FormState {
  const base = emptyForm()
  if (b.kind === 'oneshot') {
    return {
      ...base,
      mode: 'oneshot',
      tagId: b.tag_id ?? '',
      amount: String(b.amount),
      label: b.label ?? '',
      startDate: b.start_date ?? base.startDate,
      endDate: b.end_date ?? base.endDate,
    }
  }
  return {
    ...base,
    mode: b.tag_id === null ? 'global' : 'category',
    tagId: b.tag_id ?? '',
    amount: String(b.amount),
    period: (b.period ?? 'monthly') as BudgetPeriod,
  }
}

// ── Sous-composants ───────────────────────────────────────────────────────────

const inputClass =
  'w-full px-3 py-2 text-sm rounded-lg border border-border bg-background focus:outline-none focus:ring-1 focus:ring-primary/40'

function Pill({
  active,
  onClick,
  children,
}: {
  active: boolean
  onClick: () => void
  children: React.ReactNode
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`px-3 py-1.5 rounded-xl text-sm font-medium border transition-colors ${
        active
          ? 'bg-primary text-primary-foreground border-primary'
          : 'bg-muted border-transparent text-muted-foreground hover:text-foreground'
      }`}
    >
      {children}
    </button>
  )
}

function BudgetRow({
  progress,
  onEdit,
  onDelete,
  onToggle,
  disabled,
}: {
  progress: BudgetProgress
  onEdit: () => void
  onDelete: () => void
  onToggle: () => void
  disabled: boolean
}) {
  const { isOn } = useForecast()
  const { on: includeRecurring } = useIncludeRecurring()
  const b = progress.budget
  const paused = !b.is_active
  const view = viewBudget(progress, isOn(b.id), includeRecurring)
  const tint = budgetTint(progress)
  const alert = view.status === 'over' || view.status === 'risk'

  return (
    <div
      className={`flex gap-3 rounded-xl border border-border/60 pl-2.5 pr-4 py-3.5 transition-colors ${
        paused ? 'opacity-50' : 'hover:brightness-[0.99]'
      }`}
      style={{ backgroundColor: alpha(tint, 6) }}
    >
      {/* Liséré : la couleur de la catégorie, repérable au premier coup d'œil */}
      <span
        className="w-1 self-stretch rounded-full shrink-0"
        style={{ backgroundColor: tint }}
      />

      <div className="flex-1 min-w-0">
        <BudgetBar progress={progress} showFooter={!paused} />

        <div className="flex items-center justify-between gap-2 mt-2.5">
          <span className={`text-[11px] font-medium ${alert && !paused ? 'text-destructive' : 'text-muted-foreground'}`}>
            {paused
              ? 'En pause'
              : progress.isPast
                ? 'Terminé'
                : progress.isFuture
                  ? 'À venir'
                  : STATUS_TEXT[view.status]}
          </span>

          <div className="flex items-center -mr-1.5">
            <button
              onClick={onToggle}
              disabled={disabled}
              className="p-1.5 text-muted-foreground hover:text-foreground transition-colors"
              title={paused ? 'Réactiver' : 'Mettre en pause'}
              type="button"
            >
              {paused ? <Play size={14} /> : <Pause size={14} />}
            </button>
            <button
              onClick={onEdit}
              className="p-1.5 text-muted-foreground hover:text-foreground transition-colors"
              title="Modifier"
              type="button"
            >
              <Pencil size={14} />
            </button>
            <button
              onClick={onDelete}
              disabled={disabled}
              className="p-1.5 text-muted-foreground hover:text-destructive transition-colors"
              title="Supprimer"
              type="button"
            >
              <Trash2 size={14} />
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

function Section({
  icon: Icon,
  title,
  hint,
  children,
}: {
  icon: React.ElementType
  title: string
  hint?: string
  children: React.ReactNode
}) {
  return (
    <div className="space-y-2">
      <div className="flex items-baseline gap-2 px-1">
        <Icon size={13} className="text-muted-foreground translate-y-0.5" />
        <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">{title}</p>
        {hint && <p className="text-[11px] text-muted-foreground/70">{hint}</p>}
      </div>
      {children}
    </div>
  )
}

/** Petit sélecteur segmenté à deux options (on / off). */
function Segmented({
  leftLabel,
  rightLabel,
  right,
  onLeft,
  onRight,
  disabled = false,
}: {
  leftLabel: string
  rightLabel: string
  right: boolean
  onLeft: () => void
  onRight: () => void
  disabled?: boolean
}) {
  return (
    <div
      className={`grid grid-cols-2 gap-1 rounded-xl bg-muted p-1 shrink-0 w-[136px] ${
        disabled ? 'opacity-40 pointer-events-none' : ''
      }`}
      role="group"
    >
      <button
        type="button"
        onClick={onLeft}
        aria-pressed={!right}
        className={`px-2 py-1.5 rounded-lg text-[13px] font-medium transition-colors ${
          !right ? 'bg-background text-foreground shadow-sm' : 'text-muted-foreground'
        }`}
      >
        {leftLabel}
      </button>
      <button
        type="button"
        onClick={onRight}
        aria-pressed={right}
        className={`px-2 py-1.5 rounded-lg text-[13px] font-medium transition-colors ${
          right ? 'bg-background text-foreground shadow-sm' : 'text-muted-foreground'
        }`}
      >
        {rightLabel}
      </button>
    </div>
  )
}

/**
 * Contrôles des récurrences — toujours visibles en tête de la page Objectifs.
 *
 * Deux réglages indépendants, faciles à trouver sur mobile :
 *  1. Récurrences prises en compte ou non (passées ET futures).
 *  2. Récurrences à venir ajoutées ou non (prévision), quand elles sont prises
 *     en compte.
 */
function RecurrenceControls({
  forecastIds,
  allForecastOn,
  upcomingTotal,
}: {
  forecastIds: string[]
  allForecastOn: boolean
  upcomingTotal: number
}) {
  const { on: includeRecurring, toggle: toggleInclude } = useIncludeRecurring()
  const hasForecast = forecastIds.length > 0

  return (
    <div className="rounded-2xl border border-border/60 bg-card divide-y divide-border/50">
      {/* 1 · Prise en compte totale des récurrences */}
      <div className="flex items-center justify-between gap-3 px-3 py-3">
        <div className="flex items-center gap-2 min-w-0 px-1">
          <Repeat size={14} className="text-muted-foreground shrink-0" />
          <div className="min-w-0">
            <p className="text-[13px] font-medium leading-tight">Récurrences</p>
            <p className="text-[11px] text-muted-foreground leading-tight">
              {includeRecurring
                ? 'Comptées dans les objectifs'
                : 'Ignorées — seules les dépenses ponctuelles comptent'}
            </p>
          </div>
        </div>
        <Segmented
          leftLabel="Non"
          rightLabel="Oui"
          right={includeRecurring}
          onLeft={() => { if (includeRecurring) toggleInclude() }}
          onRight={() => { if (!includeRecurring) toggleInclude() }}
        />
      </div>

      {/* 2 · Récurrences à venir (prévision) */}
      <div className="flex items-center justify-between gap-3 px-3 py-3">
        <div className="flex items-center gap-2 min-w-0 px-1">
          <CalendarRange size={14} className="text-muted-foreground shrink-0" />
          <div className="min-w-0">
            <p className={`text-[13px] font-medium leading-tight ${includeRecurring ? '' : 'text-muted-foreground'}`}>
              Récurrences à venir
            </p>
            <p className="text-[11px] text-muted-foreground leading-tight">
              {!includeRecurring
                ? 'Indisponible (récurrences ignorées)'
                : hasForecast
                  ? `${formatEUR(upcomingTotal)} prévus d’ici la fin de la période`
                  : 'Aucune récurrence à venir pour l’instant'}
            </p>
          </div>
        </div>
        <Segmented
          leftLabel="Sans"
          rightLabel="Avec"
          right={allForecastOn}
          onLeft={() => setForecastMany(forecastIds, false)}
          onRight={() => setForecastMany(forecastIds, true)}
          disabled={!includeRecurring || !hasForecast}
        />
      </div>
    </div>
  )
}

// ── Composant principal ───────────────────────────────────────────────────────

interface Props {
  budgets: Budget[]
  progresses: BudgetProgress[]
  tags: Tag[]
}

export default function BudgetsManager({ budgets, progresses, tags }: Props) {
  const { isOn } = useForecast()
  const { on: includeRecurring } = useIncludeRecurring()
  const [form, setForm] = useState<FormState>(emptyForm)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  // Les objectifs en pause n'ont pas de progression calculée côté serveur :
  // on les rend avec une progression neutre pour garder une ligne cohérente.
  const progressById = useMemo(
    () => new Map(progresses.map(p => [p.budget.id, p])),
    [progresses]
  )

  const rows = useMemo(() => {
    return budgets.map(b => {
      const p = progressById.get(b.id)
      if (p) return p
      return {
        budget: b,
        from: b.start_date ?? '',
        to: b.end_date ?? '',
        spent: 0, spentRecurring: 0, upcoming: 0, upcomingRecurring: 0, projected: 0,
        remaining: Number(b.amount),
        daysLeft: 0, perDayRemaining: null,
        pctSpent: 0, pctProjected: 0,
        status: 'ok' as const,
        isPast: false, isFuture: false,
      } satisfies BudgetProgress
    })
  }, [budgets, progressById])

  const globalRows   = rows.filter(r => r.budget.kind === 'recurring' && r.budget.tag_id === null)
  const categoryRows = rows.filter(r => r.budget.kind === 'recurring' && r.budget.tag_id !== null)
  const oneshotRows  = rows.filter(r => r.budget.kind === 'oneshot')

  // Objectifs en cours ayant des récurrences à venir : cibles du contrôle global.
  const forecastable = rows.filter(r => !r.isPast && !r.isFuture && r.upcoming > 0)
  const forecastIds = forecastable.map(r => r.budget.id)
  const upcomingTotal = forecastable.reduce((sum, r) => sum + r.upcoming, 0)
  const allForecastOn = forecastIds.length > 0 && forecastIds.every(id => isOn(id))

  // Catégories déjà pourvues d'un objectif récurrent actif (hors celui en édition)
  const takenTagIds = useMemo(
    () =>
      new Set(
        budgets
          .filter(b => b.kind === 'recurring' && b.is_active && b.id !== editingId && b.tag_id)
          .map(b => b.tag_id as string)
      ),
    [budgets, editingId]
  )
  const hasGlobal = budgets.some(
    b => b.kind === 'recurring' && b.is_active && b.tag_id === null && b.id !== editingId
  )

  const availableTags = tags.filter(t => !takenTagIds.has(t.id))

  // Sélection effective : première catégorie disponible tant que rien n'est choisi.
  const selectableTags = form.mode === 'oneshot' ? tags : availableTags
  const effectiveTagId =
    form.tagId ||
    (form.mode === 'category' ? selectableTags[0]?.id ?? '' : '')

  function resetForm() {
    setForm(emptyForm())
    setEditingId(null)
    setError(null)
  }

  function startEdit(b: Budget) {
    setForm(formFromBudget(b))
    setEditingId(b.id)
    setError(null)
    if (typeof window !== 'undefined' && window.innerWidth < 1024) {
      window.scrollTo({ top: document.body.scrollHeight, behavior: 'smooth' })
    }
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)

    const amount = Number(form.amount.replace(',', '.'))
    if (!(amount > 0)) { setError('Montant invalide'); return }

    if (form.mode === 'category' && !effectiveTagId) { setError('Choisis une catégorie'); return }
    if (form.mode === 'global' && hasGlobal) { setError('Un objectif global existe déjà'); return }
    if (form.mode === 'oneshot') {
      if (!form.label.trim()) { setError('Donne un nom à cet objectif'); return }
      if (form.endDate < form.startDate) { setError('La date de fin doit suivre la date de début'); return }
    }

    const kind: BudgetKind = form.mode === 'oneshot' ? 'oneshot' : 'recurring'
    const payload = {
      tag_id: form.mode === 'global' ? null : effectiveTagId || null,
      amount,
      kind,
      period: kind === 'recurring' ? form.period : null,
      start_date: kind === 'oneshot' ? form.startDate : null,
      end_date: kind === 'oneshot' ? form.endDate : null,
      label: kind === 'oneshot' ? form.label : null,
    }

    startTransition(async () => {
      try {
        if (editingId) await updateBudget(editingId, payload)
        else await createBudget(payload)
        resetForm()
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Une erreur est survenue')
      }
    })
  }

  function handleDelete(id: string) {
    startTransition(async () => {
      await deleteBudget(id)
      if (editingId === id) resetForm()
    })
  }

  function handleToggle(b: Budget) {
    startTransition(async () => {
      try {
        await toggleBudget(b.id, !b.is_active)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Une erreur est survenue')
      }
    })
  }

  const rowProps = (p: BudgetProgress) => ({
    progress: p,
    onEdit: () => startEdit(p.budget),
    onDelete: () => handleDelete(p.budget.id),
    onToggle: () => handleToggle(p.budget),
    disabled: isPending,
  })

  return (
    <div className="lg:grid lg:grid-cols-[1fr_360px] lg:gap-8 lg:items-start">
      {/* ── Liste ── */}
      <div className="space-y-6 mb-8 lg:mb-0">
        {rows.length > 0 && (
          <RecurrenceControls
            forecastIds={forecastIds}
            allForecastOn={allForecastOn}
            upcomingTotal={upcomingTotal}
          />
        )}

        {rows.length === 0 && (
          <div className="rounded-2xl border border-dashed border-border p-8 text-center">
            <Target size={22} className="mx-auto mb-3 text-muted-foreground" />
            <p className="text-sm font-medium mb-1">Aucun objectif pour le moment</p>
            <p className="text-xs text-muted-foreground">
              Fixe un plafond par catégorie pour voir où tu en es d&apos;un coup d&apos;œil.
            </p>
          </div>
        )}

        {globalRows.length > 0 && (
          <Section icon={Layers} title="Objectif global" hint="toutes catégories">
            {globalRows.map(p => <BudgetRow key={p.budget.id} {...rowProps(p)} />)}
          </Section>
        )}

        {categoryRows.length > 0 && (
          <Section icon={Target} title="Par catégorie">
            <div className="space-y-2">
              {categoryRows.map(p => <BudgetRow key={p.budget.id} {...rowProps(p)} />)}
            </div>
          </Section>
        )}

        {oneshotRows.length > 0 && (
          <Section icon={CalendarRange} title="Objectifs ponctuels">
            <div className="space-y-2">
              {oneshotRows.map(p => <BudgetRow key={p.budget.id} {...rowProps(p)} />)}
            </div>
          </Section>
        )}
      </div>

      {/* ── Formulaire ── */}
      <div className="bg-card rounded-2xl border border-border p-6 lg:sticky lg:top-24">
        <div className="flex items-center justify-between mb-4">
          <p className="text-sm font-semibold">
            {editingId ? 'Modifier l’objectif' : 'Nouvel objectif'}
          </p>
          {editingId && (
            <button
              type="button"
              onClick={resetForm}
              className="p-1 text-muted-foreground hover:text-foreground transition-colors"
              title="Annuler"
            >
              <X size={15} />
            </button>
          )}
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Type */}
          <div className="space-y-1.5">
            <Label>Type</Label>
            <div className="flex flex-wrap gap-2">
              <Pill active={form.mode === 'category'} onClick={() => setForm(f => ({ ...f, mode: 'category' }))}>
                Catégorie
              </Pill>
              <Pill active={form.mode === 'global'} onClick={() => setForm(f => ({ ...f, mode: 'global' }))}>
                Global
              </Pill>
              <Pill active={form.mode === 'oneshot'} onClick={() => setForm(f => ({ ...f, mode: 'oneshot' }))}>
                Ponctuel
              </Pill>
            </div>
          </div>

          {/* Catégorie */}
          {form.mode !== 'global' && (
            <div className="space-y-1.5">
              <Label>
                Catégorie {form.mode === 'oneshot' && <span className="text-muted-foreground font-normal">(optionnel)</span>}
              </Label>
              {/* Chips colorés — même grammaire visuelle que l'ajout de dépense */}
              <div className="flex flex-wrap gap-1.5" id="budget-tag">
                {form.mode === 'oneshot' && (
                  <button
                    type="button"
                    onClick={() => setForm(f => ({ ...f, tagId: '' }))}
                    className={`rounded-full px-3 py-1 text-sm font-medium border transition-all ${
                      effectiveTagId === ''
                        ? 'bg-primary text-primary-foreground border-primary'
                        : 'bg-muted border-transparent text-muted-foreground hover:text-foreground'
                    }`}
                  >
                    Toutes
                  </button>
                )}
                {selectableTags.map(t => {
                  const selected = effectiveTagId === t.id
                  return (
                    <button
                      key={t.id}
                      type="button"
                      onClick={() => setForm(f => ({ ...f, tagId: t.id }))}
                      className="rounded-full px-3 py-1 text-sm font-medium border transition-all"
                      style={
                        selected
                          ? { backgroundColor: t.color, color: '#fff', borderColor: t.color }
                          : {
                              backgroundColor: alpha(t.color, 14),
                              color: t.color,
                              borderColor: alpha(t.color, 25),
                            }
                      }
                    >
                      {t.name}
                    </button>
                  )
                })}
              </div>
              {form.mode === 'category' && availableTags.length === 0 && (
                <p className="text-[11px] text-muted-foreground">
                  Toutes les catégories ont déjà un objectif.
                </p>
              )}
            </div>
          )}

          {/* Nom (ponctuel) */}
          {form.mode === 'oneshot' && (
            <div className="space-y-1.5">
              <Label htmlFor="budget-label">Nom</Label>
              <Input
                id="budget-label"
                value={form.label}
                onChange={e => setForm(f => ({ ...f, label: e.target.value }))}
                placeholder="Ex: Vacances août, Noël…"
              />
            </div>
          )}

          {/* Montant */}
          <div className="space-y-1.5">
            <Label htmlFor="budget-amount">Plafond (€)</Label>
            <Input
              id="budget-amount"
              type="text"
              inputMode="decimal"
              value={form.amount}
              onChange={e => setForm(f => ({ ...f, amount: e.target.value }))}
              placeholder="300"
            />
          </div>

          {/* Période */}
          {form.mode !== 'oneshot' ? (
            <div className="space-y-1.5">
              <Label>Période</Label>
              <div className="flex flex-wrap gap-2">
                {BUDGET_PERIODS.map(p => (
                  <Pill
                    key={p.value}
                    active={form.period === p.value}
                    onClick={() => setForm(f => ({ ...f, period: p.value }))}
                  >
                    {p.label}
                  </Pill>
                ))}
              </div>
              <p className="text-[11px] text-muted-foreground">
                Le compteur repart à zéro à chaque nouvelle période.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="budget-from">Du</Label>
                <input
                  id="budget-from"
                  type="date"
                  value={form.startDate}
                  max={form.endDate || undefined}
                  onChange={e => setForm(f => ({ ...f, startDate: e.target.value }))}
                  className={inputClass}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="budget-to">Au</Label>
                <input
                  id="budget-to"
                  type="date"
                  value={form.endDate}
                  min={form.startDate || undefined}
                  onChange={e => setForm(f => ({ ...f, endDate: e.target.value }))}
                  className={inputClass}
                />
              </div>
            </div>
          )}

          {error && <p className="text-sm text-destructive">{error}</p>}

          <Button type="submit" disabled={isPending} className="w-full">
            {editingId ? (
              <><Check size={16} className="mr-1" />Enregistrer</>
            ) : (
              <><Plus size={16} className="mr-1" />Créer l&apos;objectif</>
            )}
          </Button>
        </form>

        {/* Récap discret */}
        {rows.length > 0 && (
          <div className="mt-5 pt-4 border-t border-border/60 space-y-2">
            {progresses.filter(p => !p.isPast && !p.isFuture).slice(0, 3).map(p => {
              const view = viewBudget(p, isOn(p.budget.id), includeRecurring)
              return (
                <div key={p.budget.id} className="flex items-center justify-between gap-2 text-[11px]">
                  <span className="flex items-center gap-1.5 min-w-0">
                    <TagBadge tag={{ name: budgetName(p), color: budgetTint(p) }} />
                    <span className="text-muted-foreground/70 shrink-0">{budgetPeriodLabel(p)}</span>
                  </span>
                  <span className={`tabular-nums shrink-0 ${view.remaining < 0 ? 'text-destructive font-medium' : 'text-muted-foreground'}`}>
                    {formatEUR(view.remaining)}
                  </span>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
