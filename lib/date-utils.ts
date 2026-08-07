export type Period = 'day' | 'week' | 'month' | 'year'

/** Formate une Date en YYYY-MM-DD selon le fuseau local (pas UTC). */
export function toISO(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

export function todayISO(): string {
  return toISO(new Date())
}

function getDateRange(period: Period, anchor: string): [string, string] {
  const d = new Date(anchor + 'T00:00:00')

  switch (period) {
    case 'day':
      return [anchor, anchor]

    case 'week': {
      const day = d.getDay()
      const diffToMon = day === 0 ? -6 : 1 - day
      const mon = new Date(d)
      mon.setDate(d.getDate() + diffToMon)
      const sun = new Date(mon)
      sun.setDate(mon.getDate() + 6)
      return [toISO(mon), toISO(sun)]
    }

    case 'month': {
      const start = new Date(d.getFullYear(), d.getMonth(), 1)
      const end = new Date(d.getFullYear(), d.getMonth() + 1, 0)
      return [toISO(start), toISO(end)]
    }

    case 'year':
      return [`${d.getFullYear()}-01-01`, `${d.getFullYear()}-12-31`]
  }
}

export function shiftAnchor(period: Period, anchor: string, dir: -1 | 1): string {
  const d = new Date(anchor + 'T00:00:00')
  switch (period) {
    case 'day':   d.setDate(d.getDate() + dir); break
    case 'week':  d.setDate(d.getDate() + dir * 7); break
    case 'month': d.setMonth(d.getMonth() + dir); break
    case 'year':  d.setFullYear(d.getFullYear() + dir); break
  }
  return toISO(d)
}

export function formatPeriodLabel(period: Period, anchor: string): string {
  const d = new Date(anchor + 'T00:00:00')
  const today = todayISO()

  switch (period) {
    case 'day': {
      if (anchor === today) return "Aujourd'hui"
      const yesterday = new Date()
      yesterday.setDate(yesterday.getDate() - 1)
      if (anchor === toISO(yesterday)) return 'Hier'
      return d.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' })
    }
    case 'week': {
      const [start, end] = getDateRange('week', anchor)
      const s = new Date(start + 'T00:00:00')
      const e = new Date(end + 'T00:00:00')
      const sameYear = s.getFullYear() === e.getFullYear()
      const sLabel = s.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })
      const eLabel = e.toLocaleDateString('fr-FR', {
        day: 'numeric',
        month: 'short',
        ...(sameYear ? { year: 'numeric' } : {}),
      })
      return `${sLabel} – ${eLabel}`
    }
    case 'month':
      return d.toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' })
    case 'year':
      return `${d.getFullYear()}`
  }
}
