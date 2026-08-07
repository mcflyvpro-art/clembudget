import { toISO, todayISO } from '@/lib/date-utils'
import type {
  Budget,
  BudgetPeriod,
  BudgetProgress,
  BudgetStatus,
  Expense,
} from '@/lib/types'

// ── Constantes ────────────────────────────────────────────────────────────────

export const BUDGET_PERIODS = [
  { value: 'weekly',  label: 'Par semaine', short: '/sem'  },
  { value: 'monthly', label: 'Par mois',    short: '/mois' },
  { value: 'yearly',  label: 'Par an',      short: '/an'   },
] as const

/** Seuil à partir duquel on prévient que ça chauffe. */
export const WARNING_RATIO = 0.8

// ── Fenêtre de période ────────────────────────────────────────────────────────

/** Fenêtre calendaire courante d'une période récurrente, ancrée sur `today`. */
export function getRecurringWindow(period: BudgetPeriod, today = todayISO()): { from: string; to: string } {
  const d = new Date(today + 'T00:00:00')

  switch (period) {
    case 'weekly': {
      const day = d.getDay()
      const diffToMon = day === 0 ? -6 : 1 - day
      const mon = new Date(d)
      mon.setDate(d.getDate() + diffToMon)
      const sun = new Date(mon)
      sun.setDate(mon.getDate() + 6)
      return { from: toISO(mon), to: toISO(sun) }
    }
    case 'monthly': {
      const start = new Date(d.getFullYear(), d.getMonth(), 1)
      const end = new Date(d.getFullYear(), d.getMonth() + 1, 0)
      return { from: toISO(start), to: toISO(end) }
    }
    case 'yearly':
      return { from: `${d.getFullYear()}-01-01`, to: `${d.getFullYear()}-12-31` }
  }
}

/** Fenêtre d'un objectif, récurrent ou ponctuel. */
export function getBudgetWindow(budget: Budget, today = todayISO()): { from: string; to: string } {
  if (budget.kind === 'oneshot') {
    return { from: budget.start_date!, to: budget.end_date! }
  }
  return getRecurringWindow(budget.period ?? 'monthly', today)
}

/** Nombre de jours entre deux dates ISO, bornes incluses. */
export function daysBetween(from: string, to: string): number {
  const a = new Date(from + 'T00:00:00').getTime()
  const b = new Date(to + 'T00:00:00').getTime()
  return Math.floor((b - a) / 86_400_000) + 1
}

// ── Progression ───────────────────────────────────────────────────────────────

/**
 * Calcule l'état d'un objectif à partir d'une liste de dépenses déjà étalées
 * (récurrentes développées par `fetchExpensesForStats`).
 *
 * `expenses` peut couvrir une plage plus large que la fenêtre : le filtrage
 * par date et par catégorie est fait ici.
 */
export function computeProgress(
  budget: Budget,
  expenses: Expense[],
  today = todayISO()
): BudgetProgress {
  const { from, to } = getBudgetWindow(budget, today)

  let spent = 0
  let upcoming = 0

  for (const e of expenses) {
    if (e.date < from || e.date > to) continue
    if (budget.tag_id !== null && e.tag_id !== budget.tag_id) continue
    const amount = Number(e.amount)
    if (e.date <= today) spent += amount
    else upcoming += amount
  }

  return buildProgress(budget, from, to, spent, upcoming, today)
}

/** Assemble un BudgetProgress à partir de totaux déjà calculés. */
export function buildProgress(
  budget: Budget,
  from: string,
  to: string,
  spent: number,
  upcoming: number,
  today = todayISO()
): BudgetProgress {
  const amount = Number(budget.amount)
  const projected = spent + upcoming
  const remaining = amount - spent

  const isPast = to < today
  const isFuture = from > today

  // Jours restants : aujourd'hui inclus, borné à la fenêtre.
  const daysLeft = isPast ? 0 : daysBetween(isFuture ? from : today, to)

  const pctSpent = amount > 0 ? (spent / amount) * 100 : 0
  const pctProjected = amount > 0 ? (projected / amount) * 100 : 0

  let status: BudgetStatus = 'ok'
  if (spent >= amount) status = 'over'
  else if (projected >= amount) status = 'risk'
  else if (spent >= amount * WARNING_RATIO) status = 'warning'

  return {
    budget,
    from,
    to,
    spent,
    upcoming,
    projected,
    remaining,
    daysLeft,
    perDayRemaining: daysLeft > 0 ? remaining / daysLeft : null,
    pctSpent,
    pctProjected,
    status,
    isPast,
    isFuture,
  }
}

// ── Lecture : réel vs prévision ────────────────────────────────────────────────

export type BudgetView = {
  forecast: boolean
  /** Montant retenu pour la lecture : `spent` en réel, `projected` en prévision. */
  total: number
  remaining: number
  pct: number
  status: BudgetStatus
  perDayRemaining: number | null
  /** Ce que la prévision ajoute. 0 si aucune récurrence à venir. */
  upcoming: number
}

/**
 * Deux lectures d'un même objectif :
 *  - réel      → seules les dépenses déjà passées comptent
 *  - prévision → les récurrences déjà prévues d'ici la fin de la période comptent
 *
 * Exemple : objectif mensuel de 100 €, on est le 8, une récurrence de 40 € tombe
 * le 26. En réel on lit ce qui est réellement sorti ; en prévision on voit tout
 * de suite si les 100 € vont être dépassés.
 */
export function viewBudget(p: BudgetProgress, forecast: boolean): BudgetView {
  const amount = Number(p.budget.amount)
  const total = forecast ? p.projected : p.spent
  const remaining = amount - total
  const pct = amount > 0 ? (total / amount) * 100 : 0

  let status: BudgetStatus = 'ok'
  if (p.spent >= amount) status = 'over'
  else if (forecast && p.projected >= amount) status = 'risk'
  else if (total >= amount * WARNING_RATIO) status = 'warning'

  return {
    forecast,
    total,
    remaining,
    pct,
    status,
    perDayRemaining: p.daysLeft > 0 ? remaining / p.daysLeft : null,
    upcoming: p.upcoming,
  }
}

/**
 * Ajoute une dépense à des progressions déjà calculées, sans requête.
 * Utilisé pour l'ajout optimiste sur le dashboard.
 */
export function applyExpenseToProgress(
  list: BudgetProgress[],
  expense: { amount: number; tag_id: string | null; date: string },
  today = todayISO()
): BudgetProgress[] {
  return list.map(p => {
    if (expense.date < p.from || expense.date > p.to) return p
    if (p.budget.tag_id !== null && p.budget.tag_id !== expense.tag_id) return p

    const amount = Number(expense.amount)
    const spent    = p.spent    + (expense.date <= today ? amount : 0)
    const upcoming = p.upcoming + (expense.date >  today ? amount : 0)
    return buildProgress(p.budget, p.from, p.to, spent, upcoming, today)
  })
}

const STATUS_RANK: Record<BudgetStatus, number> = { ok: 0, warning: 1, risk: 2, over: 3 }

/**
 * Objectifs dont le statut s'est aggravé entre deux états.
 * `statusOf` permet de comparer selon la lecture affichée (réel ou prévision)
 * plutôt que sur le statut brut.
 */
export function crossedThresholds(
  before: BudgetProgress[],
  after: BudgetProgress[],
  statusOf: (p: BudgetProgress) => BudgetStatus = p => p.status
): BudgetProgress[] {
  const prev = new Map(before.map(p => [p.budget.id, statusOf(p)]))
  return after.filter(p => {
    const was = prev.get(p.budget.id)
    if (was === undefined) return false
    const now = statusOf(p)
    return STATUS_RANK[now] > STATUS_RANK[was] && now !== 'ok'
  })
}

// ── Présentation ──────────────────────────────────────────────────────────────

const STATUS_ORDER: Record<BudgetStatus, number> = { over: 0, risk: 1, warning: 2, ok: 3 }

/** Global d'abord, puis du plus tendu au plus tranquille. */
export function sortByUrgency(list: BudgetProgress[]): BudgetProgress[] {
  return [...list].sort((a, b) => {
    const aGlobal = a.budget.tag_id === null ? 0 : 1
    const bGlobal = b.budget.tag_id === null ? 0 : 1
    if (aGlobal !== bGlobal) return aGlobal - bGlobal
    const s = STATUS_ORDER[a.status] - STATUS_ORDER[b.status]
    if (s !== 0) return s
    return b.pctSpent - a.pctSpent
  })
}

/**
 * Applique une transparence à une couleur, y compris à une variable CSS.
 * `color + '28'` ne marche que sur un hex ; ici `var(--primary)` passe aussi.
 */
export function alpha(color: string, percent: number): string {
  return `color-mix(in srgb, ${color} ${percent}%, transparent)`
}

/** Couleur brute de l'objectif : celle du tag, ou le rose primaire pour le global. */
export function budgetTint(p: BudgetProgress): string {
  return p.budget.tags?.color ?? 'var(--primary)'
}

/** Couleur d'affichage : rouge en dépassement, couleur de la catégorie sinon. */
export function budgetColor(p: BudgetProgress, status: BudgetStatus = p.status): string {
  if (status === 'over') return 'var(--destructive)'
  return budgetTint(p)
}

export function budgetName(p: BudgetProgress): string {
  if (p.budget.kind === 'oneshot') return p.budget.label?.trim() || 'Objectif ponctuel'
  if (p.budget.tag_id === null) return 'Toutes catégories'
  return p.budget.tags?.name ?? 'Catégorie supprimée'
}

/** Libellé court de la période : « /mois », « 1 – 31 août »… */
export function budgetPeriodLabel(p: BudgetProgress): string {
  if (p.budget.kind === 'recurring') {
    return BUDGET_PERIODS.find(x => x.value === p.budget.period)?.short ?? ''
  }
  const f = new Date(p.from + 'T00:00:00')
  const t = new Date(p.to + 'T00:00:00')
  const sameMonth = f.getFullYear() === t.getFullYear() && f.getMonth() === t.getMonth()
  const fmt = (d: Date, opts: Intl.DateTimeFormatOptions) => d.toLocaleDateString('fr-FR', opts)
  if (sameMonth) return `${f.getDate()} – ${fmt(t, { day: 'numeric', month: 'short' })}`
  return `${fmt(f, { day: 'numeric', month: 'short' })} – ${fmt(t, { day: 'numeric', month: 'short' })}`
}

export const STATUS_TEXT: Record<BudgetStatus, string> = {
  ok:      'Dans les clous',
  warning: 'Bientôt la limite',
  risk:    'Dépassement prévu',
  over:    'Limite dépassée',
}
