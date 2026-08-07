'use client'

import { useState, useMemo, useEffect, useCallback, useRef } from 'react'
import {
  BarChart, Bar, XAxis,
  ResponsiveContainer,
} from 'recharts'
import { ChevronDown, ChevronLeft, Receipt, X } from 'lucide-react'
import { Dialog } from '@base-ui/react/dialog'
import { formatEUR } from '@/lib/utils'
import { toISO } from '@/lib/date-utils'
import type { Expense } from '@/lib/types'

// ─── Types ───────────────────────────────────────────────────────────────────

type Point = {
  key:             string
  label:           string
  tooltipLabel:    string
  total:           number
  color:           string
  dominantTagName: string
  expenses:        Expense[]
}

type Granularity = 'day' | 'week' | 'month' | 'quarter' | 'year'

type DrillData = {
  drillFrom:        string
  drillTo:          string
  drillLabel:       string
  drillGranularity: Granularity
  points:           Point[]
}

type HoveredBar = {
  index:     number
  point:     Point
  svgX:      number
  svgY:      number
  barHeight: number
  screenX:   number   // position écran (fixed positioning)
  screenY:   number
}

const FALLBACK  = '#c0b8b0'
const MONTHS_3  = ['jan','fév','mar','avr','mai','jun','jul','aoû','sep','oct','nov','déc']

// ─── Helpers ─────────────────────────────────────────────────────────────────

function dominantTagInfo(exps: Expense[]): { color: string; name: string } {
  const map: Record<string, { total: number; color: string; name: string }> = {}
  for (const e of exps) {
    const k = e.tag_id ?? '__none__'
    if (!map[k]) map[k] = { total: 0, color: e.tags?.color ?? FALLBACK, name: e.tags?.name ?? '' }
    map[k].total += Number(e.amount)
  }
  const entries = Object.values(map)
  if (!entries.length) return { color: FALLBACK, name: '' }
  return entries.reduce((a, b) => (b.total > a.total ? b : a))
}

function inRange(exps: Expense[], from: string, to: string) {
  return exps.filter(e => e.date >= from && e.date <= to)
}

function diffDays(from: string, to: string) {
  return Math.round(
    (new Date(to + 'T00:00:00').getTime() - new Date(from + 'T00:00:00').getTime()) / 86400000
  ) + 1
}

function granularityFor(from: string, to: string): Granularity {
  const d = diffDays(from, to)
  if (d <= 35)   return 'day'
  if (d <= 100)  return 'week'
  if (d <= 548)  return 'month'
  if (d <= 1461) return 'quarter'
  return 'year'
}

// ─── Builders ────────────────────────────────────────────────────────────────

function buildDayPoints(exps: Expense[], from: string, to: string): Point[] {
  const fromD      = new Date(from + 'T00:00:00')
  const toD        = new Date(to   + 'T00:00:00')
  const crossMonth = fromD.getFullYear() !== toD.getFullYear() || fromD.getMonth() !== toD.getMonth()
  const nDays      = diffDays(from, to)

  const map: Record<string, Expense[]> = {}
  for (let i = 0; i < nDays; i++) {
    const d = new Date(fromD); d.setDate(fromD.getDate() + i)
    map[toISO(d)] = []
  }
  for (const e of exps) if (map[e.date] !== undefined) map[e.date].push(e)

  return Object.entries(map).map(([k, bucket]) => {
    const d      = new Date(k + 'T00:00:00')
    const day    = d.getDate()
    const mon    = d.getMonth() + 1
    const tagInf = dominantTagInfo(bucket)
    return {
      key:             k,
      label:           crossMonth ? `${day}/${mon}` : String(day),
      tooltipLabel:    d.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }),
      total:           bucket.reduce((s, e) => s + Number(e.amount), 0),
      color:           tagInf.color,
      dominantTagName: tagInf.name,
      expenses:        bucket,
    }
  })
}

function buildWeekPoints(exps: Expense[], from: string, to: string): Point[] {
  const fromD = new Date(from + 'T00:00:00')
  const toD   = new Date(to   + 'T00:00:00')
  const dow   = fromD.getDay()
  const first = new Date(fromD); first.setDate(fromD.getDate() - (dow === 0 ? 6 : dow - 1))

  const map: Record<string, Expense[]> = {}
  const cur = new Date(first)
  while (cur <= toD) { map[toISO(cur)] = []; cur.setDate(cur.getDate() + 7) }

  for (const e of exps) {
    const d    = new Date(e.date + 'T00:00:00')
    const edow = d.getDay()
    const mon  = new Date(d); mon.setDate(d.getDate() - (edow === 0 ? 6 : edow - 1))
    const k    = toISO(mon)
    if (map[k] !== undefined) map[k].push(e)
  }

  return Object.entries(map).sort().map(([k, bucket]) => {
    const d      = new Date(k + 'T00:00:00')
    const tagInf = dominantTagInfo(bucket)
    return {
      key:             k,
      label:           `${d.getDate()}/${d.getMonth() + 1}`,
      tooltipLabel:    `Semaine du ${d.toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })}`,
      total:           bucket.reduce((s, e) => s + Number(e.amount), 0),
      color:           tagInf.color,
      dominantTagName: tagInf.name,
      expenses:        bucket,
    }
  })
}

function buildMonthPoints(exps: Expense[], from: string, to: string): Point[] {
  const fromM     = from.slice(0, 7)
  const toM       = to.slice(0, 7)
  const multiYear = from.slice(0, 4) !== to.slice(0, 4)

  const map: Record<string, Expense[]> = {}
  let cur = fromM
  while (cur <= toM) {
    map[cur] = []
    const [y, m] = cur.split('-').map(Number)
    const ny = m === 12 ? y + 1 : y
    const nm = m === 12 ? 1 : m + 1
    cur = `${ny}-${String(nm).padStart(2, '0')}`
  }
  for (const e of exps) {
    const k = e.date.slice(0, 7)
    if (map[k] !== undefined) map[k].push(e)
  }

  return Object.entries(map).sort().map(([k, bucket]) => {
    const [y, m] = k.split('-').map(Number)
    const label  = multiYear && m === 1 ? `jan'${String(y).slice(2)}` : MONTHS_3[m - 1]
    const tagInf = dominantTagInfo(bucket)
    return {
      key:             k,
      label,
      tooltipLabel:    new Date(y, m - 1, 1).toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' }),
      total:           bucket.reduce((s, e) => s + Number(e.amount), 0),
      color:           tagInf.color,
      dominantTagName: tagInf.name,
      expenses:        bucket,
    }
  })
}

function buildQuarterPoints(exps: Expense[], from: string, to: string): Point[] {
  const fromD = new Date(from + 'T00:00:00')
  const toD   = new Date(to   + 'T00:00:00')
  const map: Record<string, Expense[]> = {}

  let y = fromD.getFullYear()
  let q = Math.ceil((fromD.getMonth() + 1) / 3)
  for (let i = 0; i < 200; i++) {
    const qm  = (q - 1) * 3 + 1
    const key = `${y}-${String(qm).padStart(2, '0')}`
    if (new Date(y, qm - 1, 1) > toD) break
    map[key] = []
    if (++q > 4) { q = 1; y++ }
  }

  for (const e of exps) {
    const d  = new Date(e.date + 'T00:00:00')
    const ey = d.getFullYear()
    const em = d.getMonth() + 1
    const qm = (Math.ceil(em / 3) - 1) * 3 + 1
    const k  = `${ey}-${String(qm).padStart(2, '0')}`
    if (map[k] !== undefined) map[k].push(e)
  }

  return Object.entries(map).sort().map(([k, bucket]) => {
    const [ky, km] = k.split('-').map(Number)
    const qi       = Math.ceil(km / 3)
    const tagInf   = dominantTagInfo(bucket)
    return {
      key:             k,
      label:           `T${qi}'${String(ky).slice(2)}`,
      tooltipLabel:    `T${qi} ${ky}`,
      total:           bucket.reduce((s, e) => s + Number(e.amount), 0),
      color:           tagInf.color,
      dominantTagName: tagInf.name,
      expenses:        bucket,
    }
  })
}

function buildYearPoints(exps: Expense[], from: string, to: string): Point[] {
  const fromY = parseInt(from.slice(0, 4))
  const toY   = parseInt(to.slice(0, 4))
  const map: Record<string, Expense[]> = {}
  for (let y = fromY; y <= toY; y++) map[String(y)] = []
  for (const e of exps) {
    const k = e.date.slice(0, 4)
    if (map[k] !== undefined) map[k].push(e)
  }
  return Object.entries(map).sort().map(([k, bucket]) => {
    const tagInf = dominantTagInfo(bucket)
    return {
      key:             k,
      label:           k,
      tooltipLabel:    `Année ${k}`,
      total:           bucket.reduce((s, e) => s + Number(e.amount), 0),
      color:           tagInf.color,
      dominantTagName: tagInf.name,
      expenses:        bucket,
    }
  })
}

function buildOverview(exps: Expense[], from: string, to: string) {
  const g = granularityFor(from, to)
  const points =
    g === 'day'     ? buildDayPoints(exps, from, to)     :
    g === 'week'    ? buildWeekPoints(exps, from, to)    :
    g === 'month'   ? buildMonthPoints(exps, from, to)   :
    g === 'quarter' ? buildQuarterPoints(exps, from, to) :
                      buildYearPoints(exps, from, to)
  return { granularity: g, points }
}

function buildDrill(exps: Expense[], key: string, gran: Granularity): DrillData {
  if (gran === 'year') {
    const f = `${key}-01-01`, t = `${key}-12-31`
    return { drillFrom: f, drillTo: t, drillLabel: `Année ${key}`, drillGranularity: 'month',
      points: buildMonthPoints(inRange(exps, f, t), f, t) }
  }
  if (gran === 'quarter') {
    const [y, m] = key.split('-').map(Number)
    const lastM  = m + 2
    const lastD  = new Date(y, lastM, 0).getDate()
    const f = `${key}-01`
    const t = `${y}-${String(lastM).padStart(2,'0')}-${String(lastD).padStart(2,'0')}`
    const q = Math.ceil(m / 3)
    return { drillFrom: f, drillTo: t, drillLabel: `T${q} ${y}`, drillGranularity: 'month',
      points: buildMonthPoints(inRange(exps, f, t), f, t) }
  }
  if (gran === 'month') {
    const [y, m] = key.split('-').map(Number)
    const last   = new Date(y, m, 0).getDate()
    const f = `${key}-01`
    const t = `${key}-${String(last).padStart(2,'0')}`
    const label = new Date(f + 'T00:00:00').toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' })
    return { drillFrom: f, drillTo: t, drillLabel: label, drillGranularity: 'day',
      points: buildDayPoints(inRange(exps, f, t), f, t) }
  }
  const mon = new Date(key + 'T00:00:00')
  const sun = new Date(mon); sun.setDate(mon.getDate() + 6)
  const f = key, t = toISO(sun)
  const label = `Semaine du ${mon.toLocaleDateString('fr-FR', { day: 'numeric', month: 'long' })}`
  return { drillFrom: f, drillTo: t, drillLabel: label, drillGranularity: 'day',
    points: buildDayPoints(inRange(exps, f, t), f, t) }
}

// ─── Custom x-axis tick (jour) — petit + incliné ─────────────────────────────

function DayTick({ x, y, payload }: { x?: number | string; y?: number | string; payload?: { value: string } }) {
  return (
    <g transform={`translate(${x ?? 0},${y ?? 0})`}>
      <text dy={8} textAnchor="end" fill="hsl(var(--muted-foreground))" fontSize={9} transform="rotate(-40)">
        {payload?.value ?? ''}
      </text>
    </g>
  )
}

// ─── Widget ──────────────────────────────────────────────────────────────────

interface Props { expenses: Expense[]; from: string; to: string }

export default function ExpenseDetailWidget({ expenses, from, to }: Props) {
  const [open,         setOpen]         = useState(false)
  const [drillKey,     setDrillKey]     = useState<{ key: string; gran: Granularity } | null>(null)
  const [hoveredBar,   setHoveredBar]   = useState<HoveredBar | null>(null)
  const [listOpen,     setListOpen]     = useState(false)
  const [chartVisible, setChartVisible] = useState(true)

  const chartContainerRef = useRef<HTMLDivElement>(null)

  useEffect(() => { setDrillKey(null) }, [from, to])

  // Fade quand le drill change
  useEffect(() => {
    setHoveredBar(null)
    setChartVisible(false)
    const t = setTimeout(() => setChartVisible(true), 40)
    return () => clearTimeout(t)
  }, [drillKey])

  function handleOpenChange(v: boolean) {
    setOpen(v)
    if (!v) { setDrillKey(null); setListOpen(false); setHoveredBar(null) }
  }

  const sorted = useMemo(
    () => [...expenses].sort((a, b) => Number(b.amount) - Number(a.amount)),
    [expenses]
  )

  const { points: overviewPoints, granularity } = useMemo(
    () => buildOverview(expenses, from, to),
    [expenses, from, to]
  )

  const drillData = useMemo(
    () => drillKey ? buildDrill(expenses, drillKey.key, drillKey.gran) : null,
    [drillKey, expenses]
  )

  const activePoints = drillData?.points ?? overviewPoints
  const currentGran  = drillData ? drillData.drillGranularity : granularity
  const maxVal       = Math.max(...activePoints.map(p => p.total), 0.01)
  const canDrill     = currentGran !== 'day'

  const showDetailedTooltip =
    granularity === 'day' || (!!drillData && drillData.drillGranularity === 'day')

  const isDayView =
    (!drillData && granularity === 'day') ||
    (!!drillData && drillData.drillGranularity === 'day')

  const scaledPoints = useMemo(
    () => activePoints.map(p => ({ ...p, scaledTotal: Math.sqrt(p.total) })),
    [activePoints]
  )

  const xAxisInterval = useMemo(() => {
    if (isDayView) return 0
    const n = scaledPoints.length
    if (n <= 14) return 0
    if (n <= 28) return 1
    if (n <= 42) return 2
    return Math.max(Math.floor(n / 12) - 1, 2)
  }, [scaledPoints.length, isDayView])

  const listExpenses = drillData
    ? inRange(expenses, drillData.drillFrom, drillData.drillTo)
        .sort((a, b) => Number(b.amount) - Number(a.amount))
    : sorted

  const dayTickRenderer = useCallback(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (props: any) => <DayTick {...props} />,
    []
  )

  // ── Custom bar shape : mouse events exacts sur le SVG path ──────────────────
  // Résout : hover entre bougies + décalage d'index
  const BarShape = useCallback(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (props: any) => {
      const { x = 0, y = 0, width = 0, height = 0, index = 0 } = props
      const entry = activePoints[index]
      if (!entry || width <= 0) return null

      // Barre à 0 : pastille discrète, pas de hover
      if (entry.total === 0) {
        return <rect x={x} y={y + height - 2} width={width} height={2} rx={1} fill={FALLBACK} fillOpacity={0.25} />
      }

      const isHov       = hoveredBar?.index === index
      const baseOpacity = entry.total === maxVal ? 0.9 : 0.55
      const r           = Math.min(6, width / 2)
      const h           = Math.max(height, 1)

      // Path arrondi en haut uniquement
      const d = h > r
        ? `M${x+r} ${y} L${x+width-r} ${y} Q${x+width} ${y} ${x+width} ${y+r} L${x+width} ${y+h} L${x} ${y+h} L${x} ${y+r} Q${x} ${y} ${x+r} ${y}Z`
        : `M${x} ${y} L${x+width} ${y} L${x+width} ${y+h} L${x} ${y+h}Z`

      return (
        <path
          d={d}
          fill={entry.color}
          fillOpacity={isHov ? 1 : baseOpacity}
          style={{
            filter:     isHov ? `drop-shadow(0 -3px 8px ${entry.color}99)` : undefined,
            transition: 'fill-opacity 0.12s, filter 0.12s',
            cursor:     canDrill && entry.total > 0 ? 'pointer' : 'default',
          }}
          onMouseEnter={() => {
            const rect = chartContainerRef.current?.getBoundingClientRect()
            setHoveredBar({
              index, point: entry, svgX: x + width / 2, svgY: y, barHeight: h,
              screenX: (rect?.left ?? 0) + x + width / 2,
              screenY: (rect?.top  ?? 0) + y,
            })
          }}
          onMouseLeave={() => setHoveredBar(null)}
          onClick={() => { if (canDrill && entry.key) setDrillKey({ key: entry.key, gran: currentGran }) }}
        />
      )
    },
    [activePoints, maxVal, canDrill, hoveredBar?.index, setDrillKey, currentGran]
  )

  // Tooltip fixed — échappe overflow-hidden du dialog
  const tooltipFixedLeft = hoveredBar
    ? Math.max(100, Math.min((typeof window !== 'undefined' ? window.innerWidth : 600) - 100, hoveredBar.screenX))
    : 0
  const tooltipFixedAbove = hoveredBar ? hoveredBar.screenY > 120 : false

  if (expenses.length === 0) return null

  const listTitle = drillData ? `Dépenses — ${drillData.drillLabel}` : 'Classement par montant'

  return (
    <Dialog.Root open={open} onOpenChange={handleOpenChange}>
      {/* ── Trigger ── */}
      <Dialog.Trigger className="w-full flex flex-col items-center gap-2 px-5 py-5 rounded-2xl border border-primary/30 bg-primary/5 hover:bg-primary/10 hover:border-primary/50 transition-all duration-200 cursor-pointer group">
        <Receipt size={22} className="text-primary" />
        <div className="flex items-center gap-2">
          <span className="text-sm font-semibold text-foreground">Détail des dépenses</span>
          <span className="text-xs text-muted-foreground tabular-nums bg-background/70 px-1.5 py-0.5 rounded-full border border-border/50">
            {expenses.length}
          </span>
        </div>
      </Dialog.Trigger>

      <Dialog.Portal>
        <Dialog.Backdrop className="fixed inset-0 z-50 bg-black/30 backdrop-blur-[2px] transition-opacity duration-200 data-ending-style:opacity-0 data-starting-style:opacity-0" />

        <Dialog.Popup
          className="fixed inset-0 z-50 flex items-center justify-center px-4 py-6 transition-opacity duration-200 data-ending-style:opacity-0 data-starting-style:opacity-0"
          onClick={(e) => { if (e.target === e.currentTarget) handleOpenChange(false) }}
        >
          <div
            className="bg-card flex flex-col rounded-3xl border-[5px] border-primary shadow-2xl overflow-hidden"
            style={{ width: 'min(96vw, 58rem)', maxHeight: 'min(92dvh, 820px)' }}
          >
            {/* Header */}
            <div className="flex items-center justify-between px-6 pt-5 pb-4 shrink-0">
              <div className="flex items-center gap-2.5">
                <Receipt size={16} className="text-primary shrink-0" />
                <span className="text-lg font-semibold">Détail des dépenses</span>
                <span className="text-xs text-muted-foreground tabular-nums bg-muted px-1.5 py-0.5 rounded-full">
                  {expenses.length}
                </span>
              </div>
              <Dialog.Close className="flex items-center justify-center w-8 h-8 rounded-full bg-muted hover:bg-muted/70 transition-colors cursor-pointer">
                <X size={15} className="text-muted-foreground" />
              </Dialog.Close>
            </div>

            {/* Chart section */}
            {activePoints.length > 1 && (
              <div className="px-5 pb-4 shrink-0">
                <div className="flex items-center justify-between mb-3">
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                    {drillData ? drillData.drillLabel : 'Évolution sur la période'}
                  </p>
                  {drillData ? (
                    <button
                      onClick={() => setDrillKey(null)}
                      className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-medium bg-muted border border-border text-muted-foreground hover:text-foreground transition-colors"
                    >
                      <ChevronLeft size={11} /> Vue globale
                    </button>
                  ) : canDrill ? (
                    <p className="text-xs text-muted-foreground/60 italic">cliquer pour zoomer</p>
                  ) : null}
                </div>

                {/* Conteneur chart — ref pour positionner le tooltip */}
                <div
                  ref={chartContainerRef}
                  className="relative"
                  style={{ height: isDayView ? 260 : 240 }}
                >
                  {/* Chart avec fade */}
                  <div style={{ opacity: chartVisible ? 1 : 0, transition: 'opacity 0.18s ease', height: '100%' }}>
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart
                        data={scaledPoints}
                        barCategoryGap="28%"
                        margin={{ top: 6, right: 4, left: 4, bottom: isDayView ? 8 : 2 }}
                        onMouseLeave={() => setHoveredBar(null)}
                      >
                        <XAxis
                          dataKey="label"
                          tick={isDayView ? dayTickRenderer : { fontSize: 11, fill: 'hsl(var(--muted-foreground))' }}
                          axisLine={false}
                          tickLine={false}
                          interval={xAxisInterval}
                          height={isDayView ? 38 : 20}
                        />
                        {/* Pas de Recharts Tooltip — on gère le notre */}
                        <Bar
                          dataKey="scaledTotal"
                          isAnimationActive={false}
                          shape={BarShape}
                        />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>

                  {/* placeholder — tooltip rendu en fixed ci-dessous */}
                </div>

                <p className="text-xs text-muted-foreground text-center mt-1">
                  {hoveredBar && hoveredBar.point.total > 0
                    ? <span className="font-medium text-foreground">{formatEUR(hoveredBar.point.total)}</span>
                    : <>Pic : <span className="font-medium text-foreground">{formatEUR(maxVal)}</span></>
                  }
                </p>
              </div>
            )}

            {/* Tooltip fixed — invisible aux overflow-hidden parents */}
            {hoveredBar !== null && hoveredBar.point.total > 0 && (
              <div
                className="fixed z-[9999] pointer-events-none"
                style={{
                  left:      tooltipFixedLeft,
                  top:       tooltipFixedAbove
                    ? hoveredBar.screenY - 6
                    : hoveredBar.screenY + hoveredBar.barHeight + 4,
                  transform: tooltipFixedAbove
                    ? 'translateX(-50%) translateY(-100%)'
                    : 'translateX(-50%)',
                }}
              >
                <div className="bg-popover border border-border rounded-xl px-3 py-2.5 shadow-lg text-sm min-w-[160px] max-w-[260px]">
                  <p className="text-muted-foreground text-xs mb-1 capitalize leading-snug">
                    {hoveredBar.point.tooltipLabel}
                  </p>
                  <p className="font-semibold tabular-nums text-base">
                    {formatEUR(hoveredBar.point.total)}
                  </p>
                  {hoveredBar.point.dominantTagName && (
                    <div className="flex items-center gap-1.5 mt-1.5">
                      <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: hoveredBar.point.color }} />
                      <span className="text-xs text-muted-foreground">{hoveredBar.point.dominantTagName}</span>
                    </div>
                  )}
                  {showDetailedTooltip && hoveredBar.point.expenses.length > 0 && (
                    <div className="border-t border-border/50 pt-2 mt-2 space-y-1.5">
                      {hoveredBar.point.expenses.map(e => (
                        <div key={e.id} className="flex items-start justify-between gap-2">
                          <span className="text-xs text-muted-foreground leading-tight flex-1">
                            {e.label}
                            {e.is_recurring && <span className="ml-1 text-primary/60 text-[10px]">↻</span>}
                          </span>
                          <span className="text-xs font-medium tabular-nums shrink-0">
                            {formatEUR(Number(e.amount))}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Classement — collapsible toggle */}
            <div className="border-t border-border shrink-0">
              <button
                onClick={() => setListOpen(v => !v)}
                className="w-full flex items-center justify-between px-6 py-3.5 text-xs font-semibold text-muted-foreground uppercase tracking-wider hover:bg-muted/30 transition-colors"
              >
                <span>{listTitle}</span>
                <ChevronDown
                  size={14}
                  className={`transition-transform duration-200 ${listOpen ? 'rotate-180' : ''}`}
                />
              </button>
            </div>

            {/* Classement list */}
            {listOpen && (
              <div className="flex-1 overflow-y-auto px-6 pb-6 pt-3">
                {listExpenses.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-6">
                    Aucune dépense sur cette période
                  </p>
                ) : (
                  <div className="space-y-4">
                    {listExpenses.map((expense, i) => {
                      const topLocal = Number(listExpenses[0].amount)
                      const pct      = (Number(expense.amount) / topLocal) * 100
                      const color    = expense.tags?.color ?? FALLBACK
                      return (
                        <div key={expense.id}>
                          <div className="flex items-center gap-3 mb-2">
                            <span className="text-xs text-muted-foreground tabular-nums w-5 shrink-0 text-right">
                              {i + 1}
                            </span>
                            <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: color }} />
                            <div className="flex-1 min-w-0">
                              <span className="text-sm block truncate">{expense.label}</span>
                              {expense.tags?.name && (
                                <span className="text-[11px] text-muted-foreground">{expense.tags.name}</span>
                              )}
                            </div>
                            {expense.is_recurring && (
                              <span className="text-[11px] text-primary/60 shrink-0">↻</span>
                            )}
                            <span className="text-xs text-muted-foreground shrink-0">
                              {new Date(expense.date + 'T00:00:00').toLocaleDateString('fr-FR', {
                                day: 'numeric', month: 'short',
                              })}
                            </span>
                            <span className="text-sm font-semibold tabular-nums shrink-0 w-20 text-right">
                              {formatEUR(Number(expense.amount))}
                            </span>
                          </div>
                          <div className="h-1 rounded-full bg-muted overflow-hidden ml-8">
                            <div
                              className="h-full rounded-full transition-all duration-500"
                              style={{ width: `${pct}%`, backgroundColor: color, opacity: 0.7 }}
                            />
                          </div>
                        </div>
                      )
                    })}
                  </div>
                )}
              </div>
            )}
          </div>
        </Dialog.Popup>
      </Dialog.Portal>
    </Dialog.Root>
  )
}
