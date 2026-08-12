'use client'

import { useState, useEffect, useCallback, useRef, useMemo } from 'react'
import { createClient } from '@/lib/supabase/client'
import { fetchExpensesForStats } from '@/lib/db/expenses'
import { formatEUR, buildPieData } from '@/lib/utils'
import { toISO } from '@/lib/date-utils'
import ExpensePieChart from '@/components/charts/ExpensePieChart'
import { CalendarDays, ChevronDown, Sparkles } from 'lucide-react'
import ExpenseDetailWidget from '@/components/ExpenseDetailWidget'
import BudgetsPanel from '@/components/budgets/BudgetsPanel'
import BudgetBar from '@/components/budgets/BudgetBar'
import TagBadge from '@/components/TagBadge'
import { budgetPeriodLabel, viewBudget } from '@/lib/budgets'
import { useForecast, useIncludeRecurring } from '@/lib/budget-forecast'
import type { Expense, BudgetProgress } from '@/lib/types'

// ─── Types ────────────────────────────────────────────────────────────────────

type QuickRange = {
  label:  string
  from:   string
  baseTo: string  // aujourd'hui
  fullTo: string  // fin de période complète
}

type SubPeriod = { label: string; from: string; to: string }

const MONTHS_FR      = ['jan', 'fév', 'mar', 'avr', 'mai', 'jun', 'jul', 'aoû', 'sep', 'oct', 'nov', 'déc']
const MONTHS_FR_FULL = ['janvier', 'février', 'mars', 'avril', 'mai', 'juin', 'juillet', 'août', 'septembre', 'octobre', 'novembre', 'décembre']

// ─── Helpers ──────────────────────────────────────────────────────────────────

function buildQuickRanges(): QuickRange[] {
  const now = new Date()
  const t   = toISO(now)

  const dow = now.getDay()
  const mon = new Date(now); mon.setDate(now.getDate() - (dow === 0 ? 6 : dow - 1))
  const sun = new Date(mon); sun.setDate(mon.getDate() + 6)

  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1)
  const monthEnd   = new Date(now.getFullYear(), now.getMonth() + 1, 0)

  return [
    { label: "Aujourd'hui",   from: t,                          baseTo: t, fullTo: t                              },
    { label: 'Cette semaine', from: toISO(mon),                  baseTo: t, fullTo: toISO(sun)                    },
    { label: 'Ce mois',       from: toISO(monthStart),           baseTo: t, fullTo: toISO(monthEnd)               },
    { label: 'Cette année',   from: `${now.getFullYear()}-01-01`, baseTo: t, fullTo: `${now.getFullYear()}-12-31` },
  ]
}

/** Mois de janvier jusqu'au mois précédent dans l'année courante (sans l'année dans le label) */
function buildPastMonthsCurrentYear(): SubPeriod[] {
  const now = new Date()
  const y   = now.getFullYear()
  const cur = now.getMonth() // 0-indexed
  if (cur === 0) return []
  return Array.from({ length: cur }, (_, i) => {
    const m    = i  // 0-indexed month (0 = Jan)
    const from = `${y}-${String(m + 1).padStart(2, '0')}-01`
    const last = new Date(y, m + 1, 0).getDate()
    const to   = `${y}-${String(m + 1).padStart(2, '0')}-${String(last).padStart(2, '0')}`
    return { label: MONTHS_FR_FULL[m], from, to }
  })
}

function buildPastYears(n: number): SubPeriod[] {
  const cur = new Date().getFullYear()
  return Array.from({ length: n }, (_, i) => {
    const y = cur - i - 1
    return { label: String(y), from: `${y}-01-01`, to: `${y}-12-31` }
  })
}

function formatRange(from: string, to: string): string {
  const fmt = (d: string, opts: Intl.DateTimeFormatOptions) =>
    new Date(d + 'T00:00:00').toLocaleDateString('fr-FR', opts)
  if (from === to) return fmt(from, { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })
  const f = new Date(from + 'T00:00:00')
  const t = new Date(to   + 'T00:00:00')
  const sameYear  = f.getFullYear() === t.getFullYear()
  const sameMonth = sameYear && f.getMonth() === t.getMonth()
  if (sameMonth) return `${f.getDate()} – ${fmt(to, { day: 'numeric', month: 'long', year: 'numeric' })}`
  if (sameYear)  return `${fmt(from, { day: 'numeric', month: 'long' })} – ${fmt(to, { day: 'numeric', month: 'long', year: 'numeric' })}`
  return `${fmt(from, { day: 'numeric', month: 'long', year: 'numeric' })} – ${fmt(to, { day: 'numeric', month: 'long', year: 'numeric' })}`
}

// ─── Component ────────────────────────────────────────────────────────────────

interface Props {
  initialFrom:     string
  initialTo:       string
  initialExpenses: Expense[]
  budgets?:        BudgetProgress[]
}

export default function StatsClient({ initialFrom, initialTo, initialExpenses, budgets = [] }: Props) {
  const [from, setFrom] = useState(initialFrom)
  const [to,   setTo]   = useState(initialTo)
  const [expenses, setExpenses] = useState<Expense[]>(initialExpenses)
  const [loading,  setLoading]  = useState(false)

  const [showCustom, setShowCustom] = useState(false)
  const [customFrom, setCustomFrom] = useState(initialFrom)
  const [customTo,   setCustomTo]   = useState(initialTo)

  const [categoriesOpen, setCategoriesOpen] = useState(false)

  const { isOn: forecastIsOn } = useForecast()
  const { on: includeRecurring } = useIncludeRecurring()

  const quickRanges       = useMemo(() => buildQuickRanges(),            [])
  const pastMonthsCurYear = useMemo(() => buildPastMonthsCurrentYear(),  [])
  const pastYears         = useMemo(() => buildPastYears(5),             [])

  const [activeLabel,       setActiveLabel]       = useState<string | null>(() => {
    const match = buildQuickRanges().find(q => q.from === initialFrom)
    return match?.label ?? null
  })
  const [projectionEnabled, setProjectionEnabled] = useState(false)
  const [monthPanelOpen,    setMonthPanelOpen]    = useState(false)
  const [yearPanelOpen,     setYearPanelOpen]     = useState(false)

  const fetchIdRef    = useRef(0)
  const isMounted     = useRef(false)
  const monthPanelRef = useRef<HTMLDivElement>(null)
  const yearPanelRef  = useRef<HTMLDivElement>(null)

  const fetchData = useCallback(async (f: string, t: string) => {
    const id = ++fetchIdRef.current
    setLoading(true)
    try {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user || id !== fetchIdRef.current) return
      const data = await fetchExpensesForStats(supabase, user.id, f, t)
      if (id === fetchIdRef.current) setExpenses(data)
    } finally {
      if (id === fetchIdRef.current) setLoading(false)
    }
  }, [])

  useEffect(() => {
    if (!isMounted.current) { isMounted.current = true; return }
    fetchData(from, to)
  }, [from, to, fetchData])

  useEffect(() => {
    function handleOutsideClick(e: MouseEvent) {
      if (monthPanelOpen && monthPanelRef.current && !monthPanelRef.current.contains(e.target as Node)) {
        setMonthPanelOpen(false)
      }
      if (yearPanelOpen && yearPanelRef.current && !yearPanelRef.current.contains(e.target as Node)) {
        setYearPanelOpen(false)
      }
    }
    document.addEventListener('mousedown', handleOutsideClick)
    return () => document.removeEventListener('mousedown', handleOutsideClick)
  }, [monthPanelOpen, yearPanelOpen])

  // ── Actions ────────────────────────────────────────────────────────────────

  function selectQuick(q: QuickRange) {
    setFrom(q.from); setTo(q.baseTo)
    setActiveLabel(q.label)
    setProjectionEnabled(false)
    setMonthPanelOpen(false)
    setYearPanelOpen(false)
    setShowCustom(false)
  }

  function selectPastMonth(p: SubPeriod) {
    setFrom(p.from); setTo(p.to)
    setActiveLabel('Ce mois')
    setProjectionEnabled(false)
    setMonthPanelOpen(false)
  }

  function selectPastYear(p: SubPeriod) {
    setFrom(p.from); setTo(p.to)
    setActiveLabel('Cette année')
    setProjectionEnabled(false)
    setYearPanelOpen(false)
  }

  function toggleProjection() {
    const q = quickRanges.find(r => r.label === activeLabel)
    if (!q) return
    // Prévision n'est utile que sur la période courante (baseTo = aujourd'hui ou fullTo = fin période)
    const isCurrentPeriod = to === q.baseTo || to === q.fullTo
    if (!isCurrentPeriod) return
    const next = !projectionEnabled
    setProjectionEnabled(next)
    setTo(next ? q.fullTo : q.baseTo)
  }

  // ── Derived ────────────────────────────────────────────────────────────────

  const { data: pieData, total } = useMemo(() => buildPieData(expenses), [expenses])
  const topCategory = pieData[0]

  /**
   * Objectif comparable à la période affichée : même date de début et fin
   * incluse dans la fenêtre de l'objectif. Sinon la comparaison serait fausse.
   * Clé = nom de la catégorie (les tags sont dédupliqués par nom).
   */
  const comparableBudgets = useMemo(() => {
    const map = new Map<string, BudgetProgress>()
    for (const p of budgets) {
      if (p.budget.tag_id === null || !p.budget.tags?.name) continue
      if (p.from !== from || to > p.to) continue
      map.set(p.budget.tags.name, p)
    }
    return map
  }, [budgets, from, to])

  // Prévision est disponible sur Ce mois / Cette année et seulement si on est sur la période courante
  const activeQ          = quickRanges.find(q => q.label === activeLabel)
  const isCurrentPeriod  = !!activeQ && (to === activeQ.baseTo || to === activeQ.fullTo)
  const showProjectionBtn = (activeLabel === 'Ce mois' || activeLabel === 'Cette année' || activeLabel === 'Cette semaine') && isCurrentPeriod

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <div className="max-w-3xl lg:max-w-none">
      {/* ── Filter bar ── */}
      <div className="space-y-2 mb-6">

        {/* Main buttons row */}
        <div className="flex flex-wrap gap-2 items-start">

          {/* Aujourd'hui */}
          <button
            onClick={() => selectQuick(quickRanges[0])}
            className={`px-3 py-1.5 rounded-xl text-sm font-medium border transition-colors ${
              activeLabel === "Aujourd'hui"
                ? 'bg-primary text-primary-foreground border-primary'
                : 'bg-muted border-transparent text-muted-foreground hover:text-foreground'
            }`}
          >
            Aujourd&apos;hui
          </button>

          {/* Cette semaine */}
          <button
            onClick={() => selectQuick(quickRanges[1])}
            className={`px-3 py-1.5 rounded-xl text-sm font-medium border transition-colors ${
              activeLabel === 'Cette semaine'
                ? 'bg-primary text-primary-foreground border-primary'
                : 'bg-muted border-transparent text-muted-foreground hover:text-foreground'
            }`}
          >
            Cette semaine
          </button>

          {/* Ce mois + micro-volet */}
          <div ref={monthPanelRef} className="relative flex flex-col items-center gap-0.5">
            <button
              onClick={() => selectQuick(quickRanges[2])}
              className={`px-3 py-1.5 rounded-xl text-sm font-medium border transition-colors ${
                activeLabel === 'Ce mois'
                  ? 'bg-primary text-primary-foreground border-primary'
                  : 'bg-muted border-transparent text-muted-foreground hover:text-foreground'
              }`}
            >
              Ce mois
            </button>
            {pastMonthsCurYear.length > 0 && (
              <button
                onClick={() => { setMonthPanelOpen(v => !v); setYearPanelOpen(false) }}
                className={`w-6 h-3.5 flex items-center justify-center rounded-b-md transition-colors ${
                  monthPanelOpen
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-primary/15 text-primary hover:bg-primary/25'
                }`}
              >
                <ChevronDown size={9} className={`transition-transform duration-150 ${monthPanelOpen ? 'rotate-180' : ''}`} />
              </button>
            )}
            {monthPanelOpen && (
              <div className="absolute top-[calc(100%+4px)] left-0 z-20 bg-card border border-border rounded-xl shadow-lg p-2 flex gap-1.5">
                {pastMonthsCurYear.map(p => (
                  <button
                    key={p.from}
                    onClick={() => selectPastMonth(p)}
                    className={`px-2.5 py-1 rounded-lg text-xs font-medium border transition-all whitespace-nowrap ${
                      from === p.from && to === p.to
                        ? 'bg-primary text-primary-foreground border-primary'
                        : 'bg-muted border-transparent text-muted-foreground hover:text-foreground'
                    }`}
                  >
                    {p.label}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Cette année + micro-volet */}
          <div ref={yearPanelRef} className="relative flex flex-col items-center gap-0.5">
            <button
              onClick={() => selectQuick(quickRanges[3])}
              className={`px-3 py-1.5 rounded-xl text-sm font-medium border transition-colors ${
                activeLabel === 'Cette année'
                  ? 'bg-primary text-primary-foreground border-primary'
                  : 'bg-muted border-transparent text-muted-foreground hover:text-foreground'
              }`}
            >
              Cette année
            </button>
            <button
              onClick={() => { setYearPanelOpen(v => !v); setMonthPanelOpen(false) }}
              className={`w-6 h-3.5 flex items-center justify-center rounded-b-md transition-colors ${
                yearPanelOpen
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-primary/15 text-primary hover:bg-primary/25'
              }`}
            >
              <ChevronDown size={9} className={`transition-transform duration-150 ${yearPanelOpen ? 'rotate-180' : ''}`} />
            </button>
            {yearPanelOpen && (
              <div className="absolute top-[calc(100%+4px)] left-0 z-20 bg-card border border-border rounded-xl shadow-lg p-2 flex gap-1.5">
                {pastYears.map(p => (
                  <button
                    key={p.from}
                    onClick={() => selectPastYear(p)}
                    className={`px-2.5 py-1 rounded-lg text-xs font-medium border transition-all whitespace-nowrap ${
                      from === p.from && to === p.to
                        ? 'bg-primary text-primary-foreground border-primary'
                        : 'bg-muted border-transparent text-muted-foreground hover:text-foreground'
                    }`}
                  >
                    {p.label}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Période */}
          <button
            onClick={() => { setCustomFrom(from); setCustomTo(to); setShowCustom(v => !v) }}
            className={`px-3 py-1.5 rounded-xl text-sm font-medium border transition-colors flex items-center gap-1.5 ${
              activeLabel === null
                ? 'bg-primary text-primary-foreground border-primary'
                : showCustom
                ? 'bg-primary/10 border-primary/30 text-primary'
                : 'bg-muted border-transparent text-muted-foreground hover:text-foreground'
            }`}
          >
            <CalendarDays size={14} />
            Période
          </button>

          {/* Prévision — même taille que Période, visible uniquement Cette semaine / Ce mois / Cette année */}
          {showProjectionBtn && (
            <button
              onClick={toggleProjection}
              className={`px-3 py-1.5 rounded-xl text-sm font-medium border transition-colors flex items-center gap-1.5 ${
                projectionEnabled
                  ? 'bg-primary text-primary-foreground border-primary'
                  : 'bg-muted border-transparent text-muted-foreground hover:text-foreground'
              }`}
            >
              <Sparkles size={14} />
              Prévision
            </button>
          )}
        </div>

        {/* Custom date range */}
        {showCustom && (
          <div className="bg-card rounded-xl border border-border p-4 space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <div className="flex items-center justify-between">
                  <label className="text-xs text-muted-foreground">Du</label>
                  <button type="button" onClick={() => setCustomFrom(toISO(new Date()))}
                    className="px-2 py-0.5 rounded-lg text-xs font-medium bg-muted border border-border text-muted-foreground hover:text-foreground transition-colors">
                    Aujourd&apos;hui
                  </button>
                </div>
                <input type="date" value={customFrom} max={customTo || undefined}
                  onChange={(e) => setCustomFrom(e.target.value)}
                  className="w-full px-3 py-2 text-sm rounded-lg border border-border bg-background focus:outline-none focus:ring-1 focus:ring-primary/40" />
              </div>
              <div className="space-y-1">
                <div className="flex items-center justify-between">
                  <label className="text-xs text-muted-foreground">Au</label>
                  <button type="button" onClick={() => setCustomTo(toISO(new Date()))}
                    className="px-2 py-0.5 rounded-lg text-xs font-medium bg-muted border border-border text-muted-foreground hover:text-foreground transition-colors">
                    Aujourd&apos;hui
                  </button>
                </div>
                <input type="date" value={customTo} min={customFrom || undefined}
                  onChange={(e) => setCustomTo(e.target.value)}
                  className="w-full px-3 py-2 text-sm rounded-lg border border-border bg-background focus:outline-none focus:ring-1 focus:ring-primary/40" />
              </div>
            </div>
            <button
              onClick={() => {
                if (!customFrom || !customTo) return
                const f = customFrom <= customTo ? customFrom : customTo
                const t = customFrom <= customTo ? customTo   : customFrom
                setFrom(f); setTo(t)
                setActiveLabel(null); setProjectionEnabled(false)
                setMonthPanelOpen(false); setYearPanelOpen(false)
                setShowCustom(false)
              }}
              disabled={!customFrom || !customTo}
              className="w-full py-2 rounded-lg text-sm font-medium bg-primary text-primary-foreground disabled:opacity-40 transition-opacity"
            >
              Appliquer
            </button>
          </div>
        )}

        <p className="text-sm text-muted-foreground capitalize">{formatRange(from, to)}</p>
      </div>

      {/* ── Chart + Insights ── */}
      <div className="lg:grid lg:grid-cols-[1fr_320px] lg:gap-8 lg:items-start space-y-6 lg:space-y-0">
        {/* Chart */}
        <div className={`bg-card rounded-2xl border border-border p-6 transition-opacity duration-150 ${loading ? 'opacity-50' : ''}`}>
          <h2 className="text-sm font-medium text-muted-foreground mb-4 uppercase tracking-wide">
            Répartition par catégorie
          </h2>
          {loading && expenses.length === 0 ? (
            <div className="h-64 animate-pulse bg-muted rounded-xl" />
          ) : pieData.length === 0 ? (
            <div className="py-12 text-center text-sm text-muted-foreground">
              Aucune dépense sur cette période
            </div>
          ) : (
            <>
              <ExpensePieChart data={pieData} />
              <div className="mt-4 border-t border-border">
                <button
                  onClick={() => setCategoriesOpen(v => !v)}
                  className="w-full flex items-center justify-between py-3 text-left hover:text-foreground transition-colors"
                >
                  <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                    Répartition par catégorie
                  </span>
                  <ChevronDown size={14} className={`text-muted-foreground shrink-0 transition-transform duration-200 ${categoriesOpen ? '' : '-rotate-90'}`} />
                </button>
                {categoriesOpen && (
                  <div className="space-y-3 pb-2">
                    {pieData.map((item) => {
                      const pct = total > 0 ? (item.value / total) * 100 : 0
                      const bp = comparableBudgets.get(item.name)
                      return (
                        <div key={item.name}>
                          <div className="flex items-center justify-between mb-1">
                            <TagBadge tag={{ name: item.name, color: item.color }} size="md" />
                            <div className="flex items-center gap-3 text-sm tabular-nums">
                              <span className="text-muted-foreground">{pct.toFixed(0)}%</span>
                              <span className="font-medium w-20 text-right">{formatEUR(item.value)}</span>
                            </div>
                          </div>
                          <div
                            className="h-1.5 rounded-full overflow-hidden"
                            style={{ backgroundColor: `color-mix(in srgb, ${item.color} 12%, transparent)` }}
                          >
                            <div
                              className="h-full rounded-full transition-[width] duration-500 ease-out"
                              style={{
                                width: `${pct}%`,
                                backgroundImage: `linear-gradient(90deg, color-mix(in srgb, ${item.color} 70%, transparent) 0%, ${item.color} 100%)`,
                                boxShadow: `0 0 8px -1px color-mix(in srgb, ${item.color} 50%, transparent)`,
                              }}
                            />
                          </div>
                          {bp && (() => {
                            const bv = viewBudget(bp, forecastIsOn(bp.budget.id), includeRecurring)
                            return (
                              <div className="flex items-center gap-2 mt-1.5">
                                <span className="text-[10px] text-muted-foreground shrink-0">
                                  Objectif {formatEUR(Number(bp.budget.amount))}{budgetPeriodLabel(bp)}
                                </span>
                                <div className="flex-1 min-w-0">
                                  <BudgetBar progress={bp} size="sm" showHeader={false} />
                                </div>
                                <span className={`text-[10px] tabular-nums shrink-0 ${bv.status === 'over' ? 'text-destructive font-medium' : 'text-muted-foreground'}`}>
                                  {bv.pct.toFixed(0)}%
                                </span>
                              </div>
                            )
                          })()}
                        </div>
                      )
                    })}
                  </div>
                )}
              </div>
            </>
          )}
        </div>

        {/* Insights */}
        <div className="space-y-4">
          <div className={`bg-card rounded-xl border border-border p-6 transition-opacity duration-150 ${loading ? 'opacity-50' : ''}`}>
            <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">Total</p>
            <p className="text-4xl font-semibold tabular-nums">{formatEUR(total)}</p>
          </div>

          {topCategory && (
            <div className={`bg-card rounded-xl border border-border p-6 transition-opacity duration-150 ${loading ? 'opacity-50' : ''}`}>
              <p className="text-xs text-muted-foreground uppercase tracking-wide mb-3">Catégorie principale</p>
              <div className="flex items-center gap-2.5">
                <TagBadge tag={{ name: topCategory.name, color: topCategory.color }} size="lg" />
                <span className="text-muted-foreground tabular-nums ml-auto font-medium">{formatEUR(topCategory.value)}</span>
              </div>
              {total > 0 && (
                <div
                  className="mt-3 h-2 rounded-full overflow-hidden"
                  style={{ backgroundColor: `color-mix(in srgb, ${topCategory.color} 12%, transparent)` }}
                >
                  <div
                    className="h-full rounded-full transition-[width] duration-500 ease-out"
                    style={{
                      width: `${(topCategory.value / total) * 100}%`,
                      backgroundImage: `linear-gradient(90deg, color-mix(in srgb, ${topCategory.color} 70%, transparent) 0%, ${topCategory.color} 100%)`,
                      boxShadow: `0 0 10px -2px color-mix(in srgb, ${topCategory.color} 60%, transparent)`,
                    }}
                  />
                </div>
              )}
            </div>
          )}

          {!loading && pieData.length === 0 && (
            <div className="bg-card rounded-xl border border-border p-6 text-center text-sm text-muted-foreground">
              Aucune dépense sur cette période
            </div>
          )}

          <BudgetsPanel progresses={budgets} />

          <ExpenseDetailWidget expenses={expenses} from={from} to={to} />
        </div>
      </div>
    </div>
  )
}
