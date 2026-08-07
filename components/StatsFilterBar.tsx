'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { CalendarDays } from 'lucide-react'

function toISO(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

function getQuickRanges() {
  const today = new Date()
  const day = today.getDay()
  const mon = new Date(today)
  mon.setDate(today.getDate() + (day === 0 ? -6 : 1 - day))
  const sun = new Date(mon)
  sun.setDate(mon.getDate() + 6)
  const monthStart = new Date(today.getFullYear(), today.getMonth(), 1)
  const monthEnd = new Date(today.getFullYear(), today.getMonth() + 1, 0)
  const t = toISO(today)
  return [
    { label: "Aujourd'hui", from: t, to: t },
    { label: 'Cette semaine', from: toISO(mon), to: toISO(sun) },
    { label: 'Ce mois', from: toISO(monthStart), to: toISO(monthEnd) },
    { label: 'Cette année', from: `${today.getFullYear()}-01-01`, to: `${today.getFullYear()}-12-31` },
  ]
}

function formatRange(from: string, to: string): string {
  const fmt = (d: string, opts: Intl.DateTimeFormatOptions) =>
    new Date(d + 'T00:00:00').toLocaleDateString('fr-FR', opts)

  if (from === to) return fmt(from, { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })

  const f = new Date(from + 'T00:00:00')
  const t = new Date(to + 'T00:00:00')
  const sameYear = f.getFullYear() === t.getFullYear()
  const sameMonth = sameYear && f.getMonth() === t.getMonth()

  if (sameMonth) {
    return `${f.getDate()} – ${fmt(to, { day: 'numeric', month: 'long', year: 'numeric' })}`
  }
  if (sameYear) {
    return `${fmt(from, { day: 'numeric', month: 'long' })} – ${fmt(to, { day: 'numeric', month: 'long', year: 'numeric' })}`
  }
  return `${fmt(from, { day: 'numeric', month: 'long', year: 'numeric' })} – ${fmt(to, { day: 'numeric', month: 'long', year: 'numeric' })}`
}

interface Props {
  from: string
  to: string
}

export default function StatsFilterBar({ from, to }: Props) {
  const router = useRouter()
  const [showCustom, setShowCustom] = useState(false)
  const [customFrom, setCustomFrom] = useState(from)
  const [customTo, setCustomTo] = useState(to)

  const quickRanges = getQuickRanges()
  const activeQuick = quickRanges.find((q) => q.from === from && q.to === to)
  const isCustomActive = !activeQuick

  function navigate(f: string, t: string) {
    router.push(`/stats?from=${f}&to=${t}`)
  }

  function applyCustom() {
    if (!customFrom || !customTo) return
    const f = customFrom <= customTo ? customFrom : customTo
    const t = customFrom <= customTo ? customTo : customFrom
    navigate(f, t)
    setShowCustom(false)
  }

  return (
    <div className="space-y-3 mb-6">
      {/* Buttons row */}
      <div className="flex flex-wrap gap-2">
        {quickRanges.map((q) => (
          <button
            key={q.label}
            onClick={() => { navigate(q.from, q.to); setShowCustom(false) }}
            className={`px-3 py-1.5 rounded-xl text-sm font-medium border transition-all ${
              activeQuick?.label === q.label
                ? 'bg-primary text-primary-foreground border-primary'
                : 'bg-muted border-transparent text-muted-foreground hover:text-foreground'
            }`}
          >
            {q.label}
          </button>
        ))}

        <button
          onClick={() => {
            setCustomFrom(from)
            setCustomTo(to)
            setShowCustom((v) => !v)
          }}
          className={`px-3 py-1.5 rounded-xl text-sm font-medium border transition-all flex items-center gap-1.5 ${
            isCustomActive
              ? 'bg-primary text-primary-foreground border-primary'
              : showCustom
              ? 'bg-primary/10 border-primary/30 text-primary'
              : 'bg-muted border-transparent text-muted-foreground hover:text-foreground'
          }`}
        >
          <CalendarDays size={14} />
          Période
        </button>
      </div>

      {/* Custom picker */}
      {showCustom && (
        <div className="bg-card rounded-xl border border-border p-4 space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="text-xs text-muted-foreground">Du</label>
              <input
                type="date"
                value={customFrom}
                max={customTo || undefined}
                onChange={(e) => setCustomFrom(e.target.value)}
                className="w-full px-3 py-2 text-sm rounded-lg border border-border bg-background focus:outline-none focus:ring-1 focus:ring-primary/40"
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs text-muted-foreground">Au</label>
              <input
                type="date"
                value={customTo}
                min={customFrom || undefined}
                onChange={(e) => setCustomTo(e.target.value)}
                className="w-full px-3 py-2 text-sm rounded-lg border border-border bg-background focus:outline-none focus:ring-1 focus:ring-primary/40"
              />
            </div>
          </div>
          <button
            onClick={applyCustom}
            disabled={!customFrom || !customTo}
            className="w-full py-2 rounded-lg text-sm font-medium bg-primary text-primary-foreground disabled:opacity-40 transition-opacity"
          >
            Appliquer
          </button>
        </div>
      )}

      {/* Period label */}
      <p className="text-sm text-muted-foreground capitalize">
        {formatRange(from, to)}
      </p>
    </div>
  )
}
