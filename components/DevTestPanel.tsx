'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { FlaskConical, X, Zap, Trash2, RefreshCw, BarChart2, Loader2, ChevronUp } from 'lucide-react'
import type { Tag } from '@/lib/types'

// Active via console : localStorage.setItem('devmode', 'clem')
const DEV_KEY     = 'clem'
const TEST_PREFIX = '[TEST]'

const LABELS = [
  'Courses Carrefour', 'Restaurant Le Bouchon', 'Netflix', 'Billet SNCF',
  'Pharmacie', 'Amazon', 'Zara', 'Spotify', 'Facture EDF', 'Coiffeur',
  'Lidl', 'Monoprix', 'Uber Eats', 'Sport salle', 'Cinéma UGC',
  'Café', 'Essence Total', 'Médecin', 'Forfait Free', 'Mutuelle',
  'Parking', 'Péage', 'Livraison pizza', 'Boulangerie', 'Supermarché',
]

function randAmount(extreme = false): number {
  if (extreme) {
    const vals = [0.01, 0.50, 1.00, 9.99, 49.99, 199.99, 500, 999.99, 2500, 9999.99]
    return vals[Math.floor(Math.random() * vals.length)]
  }
  const r = Math.random()
  if (r < 0.50) return +(5  + Math.random() * 45).toFixed(2)
  if (r < 0.80) return +(50 + Math.random() * 150).toFixed(2)
  if (r < 0.95) return +(200 + Math.random() * 300).toFixed(2)
  return +(500 + Math.random() * 500).toFixed(2)
}

function randDate(fromMs: number, toMs: number): string {
  return new Date(fromMs + Math.random() * (toMs - fromMs)).toISOString().slice(0, 10)
}

type InsertPayload = {
  user_id: string; label: string; amount: number; tag_id: string | null
  date: string; is_recurring: boolean; recurrence_frequency: null; is_exceptional: boolean
}

function makeExpenses(count: number, months: number, tags: Tag[], userId: string, extreme = false): InsertPayload[] {
  const toMs   = Date.now()
  const fromMs = toMs - months * 30 * 86400000
  return Array.from({ length: count }, () => ({
    user_id:              userId,
    label:                `${TEST_PREFIX} ${LABELS[Math.floor(Math.random() * LABELS.length)]}`,
    amount:               randAmount(extreme),
    tag_id:               tags.length ? tags[Math.floor(Math.random() * tags.length)].id : null,
    date:                 randDate(fromMs, toMs),
    is_recurring:         !extreme && Math.random() < 0.08,
    recurrence_frequency: null,
    is_exceptional:       !extreme && Math.random() < 0.05,
  }))
}

const PRESETS = [
  { label: 'Mois ×50',    count: 50,   months: 1  },
  { label: 'Trim ×150',   count: 150,  months: 3  },
  { label: '1 an ×500',   count: 500,  months: 12 },
  { label: '3 ans ×1500', count: 1500, months: 36 },
  { label: 'Extrêmes',    count: 20,   months: 6,  extreme: true },
] as const

export default function DevTestPanel() {
  const [enabled,      setEnabled]      = useState(false)
  const [open,         setOpen]         = useState(false)
  const [tags,         setTags]         = useState<Tag[]>([])
  const [userId,       setUserId]       = useState<string | null>(null)
  const [testCount,    setTestCount]    = useState<number | null>(null)
  const [progress,     setProgress]     = useState<{ done: number; total: number } | null>(null)
  const [status,       setStatus]       = useState<string | null>(null)
  const [customCount,  setCustomCount]  = useState(100)
  const [customMonths, setCustomMonths] = useState(12)
  const router   = useRouter()
  const abortRef = useRef(false)

  useEffect(() => {
    try { if (localStorage.getItem('devmode') === DEV_KEY) setEnabled(true) } catch { /* noop */ }
  }, [])

  useEffect(() => {
    if (!enabled || !open) return
    const supabase = createClient()
    supabase.auth.getUser().then(async ({ data }) => {
      if (!data.user) return
      setUserId(data.user.id)
      const { data: t } = await supabase.from('tags').select('*').eq('user_id', data.user.id)
      setTags(t ?? [])
      refreshCount(data.user.id)
    })
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled, open])

  async function refreshCount(uid?: string) {
    const id = uid ?? userId
    if (!id) return
    const { count } = await createClient()
      .from('expenses').select('id', { count: 'exact', head: true })
      .eq('user_id', id).like('label', `${TEST_PREFIX}%`)
    setTestCount(count ?? 0)
  }

  const generate = useCallback(async (count: number, months: number, extreme = false) => {
    if (!userId) return
    abortRef.current = false
    setStatus(null)
    const supabase = createClient()
    const all      = makeExpenses(count, months, tags, userId, extreme)
    setProgress({ done: 0, total: count })
    for (let i = 0; i < all.length; i += 100) {
      if (abortRef.current) { setStatus('Annulé'); break }
      const { error } = await supabase.from('expenses').insert(all.slice(i, i + 100))
      if (error) { setStatus(`Erreur : ${error.message}`); break }
      setProgress({ done: Math.min(i + 100, count), total: count })
      if (i + 100 < all.length) await new Promise(r => setTimeout(r, 30))
    }
    setProgress(null)
    await refreshCount()
    setStatus(`${count} dépenses générées`)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId, tags])

  const deleteAll = useCallback(async () => {
    if (!userId || !testCount) return
    setStatus(null)
    setProgress({ done: 0, total: testCount })
    const { error } = await createClient()
      .from('expenses').delete().eq('user_id', userId).like('label', `${TEST_PREFIX}%`)
    setProgress(null)
    if (error) { setStatus(`Erreur : ${error.message}`); return }
    setTestCount(0)
    setStatus('Dépenses [TEST] supprimées')
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId, testCount])

  if (!enabled) return null

  const busy = !!progress

  return (
    // Bas-droite, style natif de l'app
    <div className="fixed bottom-4 right-4 z-50 flex flex-col items-end gap-2">

      {/* Panel dépliable */}
      {open && (
        <div className="bg-card border border-border rounded-2xl shadow-xl w-68 text-sm overflow-hidden"
          style={{ width: '17rem' }}>

          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-border bg-muted/30">
            <span className="font-semibold text-foreground flex items-center gap-1.5 text-xs uppercase tracking-wider">
              <FlaskConical size={13} className="text-muted-foreground" /> Tests
            </span>
            <button onClick={() => setOpen(false)} className="text-muted-foreground hover:text-foreground transition-colors">
              <X size={13} />
            </button>
          </div>

          <div className="p-4 space-y-4">

            {/* Presets */}
            <div>
              <p className="text-[10px] uppercase tracking-widest text-muted-foreground mb-2">Générer</p>
              <div className="grid grid-cols-2 gap-1.5">
                {PRESETS.map(p => (
                  <button
                    key={p.label}
                    onClick={() => generate(p.count, p.months, 'extreme' in p && p.extreme === true)}
                    disabled={busy || !userId}
                    className="px-2 py-1.5 rounded-lg text-xs font-medium bg-muted border border-border hover:bg-muted/60 hover:border-border/80 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    {p.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Custom */}
            <div>
              <p className="text-[10px] uppercase tracking-widest text-muted-foreground mb-2">Custom</p>
              <div className="grid grid-cols-2 gap-2 mb-2">
                <div>
                  <label className="text-[10px] text-muted-foreground">Nb dépenses</label>
                  <input
                    type="number" min={1} max={5000} value={customCount}
                    onChange={e => setCustomCount(Math.min(5000, Math.max(1, +e.target.value)))}
                    className="w-full mt-0.5 px-2 py-1 text-xs rounded-lg border border-border bg-background focus:outline-none focus:ring-1 focus:ring-primary/30"
                  />
                </div>
                <div>
                  <label className="text-[10px] text-muted-foreground">Mois en arrière</label>
                  <input
                    type="number" min={1} max={60} value={customMonths}
                    onChange={e => setCustomMonths(Math.min(60, Math.max(1, +e.target.value)))}
                    className="w-full mt-0.5 px-2 py-1 text-xs rounded-lg border border-border bg-background focus:outline-none focus:ring-1 focus:ring-primary/30"
                  />
                </div>
              </div>
              <button
                onClick={() => generate(customCount, customMonths)}
                disabled={busy || !userId}
                className="w-full py-1.5 rounded-lg text-xs font-medium bg-primary text-primary-foreground hover:bg-primary/90 transition-colors disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-1.5"
              >
                <Zap size={11} /> {customCount} dép. / {customMonths} mois
              </button>
            </div>

            {/* Progression */}
            {progress && (
              <div>
                <div className="flex items-center justify-between text-xs mb-1.5">
                  <span className="text-muted-foreground flex items-center gap-1">
                    <Loader2 size={11} className="animate-spin" /> En cours…
                  </span>
                  <span className="tabular-nums font-semibold">{progress.done}/{progress.total}</span>
                </div>
                <div className="h-1.5 rounded-full bg-muted overflow-hidden">
                  <div
                    className="h-full rounded-full bg-primary transition-all duration-150"
                    style={{ width: `${(progress.done / progress.total) * 100}%` }}
                  />
                </div>
                <button
                  onClick={() => { abortRef.current = true }}
                  className="mt-1.5 text-[10px] text-muted-foreground hover:text-destructive transition-colors"
                >
                  Annuler
                </button>
              </div>
            )}

            {status && !progress && (
              <p className="text-xs text-muted-foreground">{status}</p>
            )}

            {/* Actions */}
            <div className="border-t border-border pt-3 space-y-2">
              {testCount !== null && (
                <p className="text-xs text-muted-foreground">
                  <span className="font-semibold tabular-nums text-foreground">{testCount}</span> dép. [TEST] en base
                </p>
              )}
              <button
                onClick={deleteAll}
                disabled={busy || !testCount || !userId}
                className="w-full py-1.5 rounded-lg text-xs font-medium border border-border bg-muted hover:bg-destructive/10 hover:border-destructive/30 hover:text-destructive transition-colors disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-1.5"
              >
                <Trash2 size={11} /> Supprimer les [TEST]
              </button>
              <div className="grid grid-cols-2 gap-1.5">
                <button
                  onClick={() => { router.refresh(); setStatus('Rafraîchi') }}
                  className="py-1.5 rounded-lg text-xs font-medium bg-muted border border-border hover:bg-muted/60 transition-colors flex items-center justify-center gap-1"
                >
                  <RefreshCw size={11} /> Refresh
                </button>
                <button
                  onClick={() => router.push('/stats')}
                  className="py-1.5 rounded-lg text-xs font-medium bg-muted border border-border hover:bg-muted/60 transition-colors flex items-center justify-center gap-1"
                >
                  <BarChart2 size={11} /> Voir stats
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Bouton trigger — subtil, natif */}
      <button
        onClick={() => setOpen(v => !v)}
        className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-card border border-border shadow-md text-xs font-medium text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-all"
      >
        <FlaskConical size={13} />
        {open ? <ChevronUp size={12} /> : 'Dev'}
      </button>
    </div>
  )
}
