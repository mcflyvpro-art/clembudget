'use client'

import { useSyncExternalStore, useCallback } from 'react'

// ─────────────────────────────────────────────────────────────────────────────
// Réglage global : prendre en compte les dépenses récurrentes dans les objectifs
//
// Indépendant de la prévision « récurrences à venir ». Désactivé, AUCUNE dépense
// récurrente (passée ou future) ne compte dans les objectifs — seules les
// dépenses ponctuelles pèsent. Partagé et persisté comme la préférence forecast.
// ─────────────────────────────────────────────────────────────────────────────

const REC_KEY = 'budgetclem:include-recurring'
export const INCLUDE_RECURRING_DEFAULT = true

let includeRecurring = INCLUDE_RECURRING_DEFAULT
let recLoaded = false
const recListeners = new Set<() => void>()

function recEmit() { for (const l of recListeners) l() }

function recLoad() {
  if (recLoaded || typeof window === 'undefined') return
  recLoaded = true
  try {
    const raw = window.localStorage.getItem(REC_KEY)
    if (raw !== null) { includeRecurring = raw === '1'; recEmit() }
  } catch {
    // localStorage indisponible : on garde le défaut
  }
}

function recSubscribe(cb: () => void) {
  recListeners.add(cb)
  recLoad()
  return () => { recListeners.delete(cb) }
}

const recGetSnapshot = () => includeRecurring
const recGetServerSnapshot = () => INCLUDE_RECURRING_DEFAULT

export function setIncludeRecurring(on: boolean) {
  includeRecurring = on
  try { window.localStorage.setItem(REC_KEY, on ? '1' : '0') } catch { /* ignore */ }
  recEmit()
}

/** `on` = les récurrences comptent dans les objectifs. `toggle()` bascule. */
export function useIncludeRecurring() {
  const on = useSyncExternalStore(recSubscribe, recGetSnapshot, recGetServerSnapshot)
  const toggle = useCallback(() => setIncludeRecurring(!on), [on])
  return { on, toggle }
}

/**
 * Préférence « compter les récurrences à venir » — une par objectif.
 *
 * Store partagé au niveau module : tous les composants d'une page (bandeau du
 * dashboard, carte des stats, page Objectifs) restent synchronisés sans passer
 * par un contexte. Persisté dans localStorage, donc retenu d'une visite à
 * l'autre sur le même appareil.
 */

const KEY = 'budgetclem:forecast'

/** Prévision activée par défaut : on voit venir un dépassement avant qu'il arrive. */
export const FORECAST_DEFAULT = true

const EMPTY: Record<string, boolean> = {}

let state: Record<string, boolean> = EMPTY
let loaded = false
const listeners = new Set<() => void>()

function emit() {
  for (const l of listeners) l()
}

function load() {
  if (loaded || typeof window === 'undefined') return
  loaded = true
  try {
    const raw = window.localStorage.getItem(KEY)
    if (raw) {
      const parsed = JSON.parse(raw) as Record<string, boolean>
      if (parsed && typeof parsed === 'object') {
        state = parsed
        emit()
      }
    }
  } catch {
    // localStorage indisponible (mode privé, quota) : on reste sur les défauts
  }
}

function persist() {
  try {
    window.localStorage.setItem(KEY, JSON.stringify(state))
  } catch {
    // ignore
  }
}

function subscribe(cb: () => void) {
  listeners.add(cb)
  // Chargement différé au premier abonnement : évite tout écart d'hydratation.
  load()
  return () => { listeners.delete(cb) }
}

const getSnapshot = () => state
const getServerSnapshot = () => EMPTY

export function setForecast(budgetId: string, on: boolean) {
  state = { ...state, [budgetId]: on }
  persist()
  emit()
}

/** Applique la même préférence à plusieurs objectifs d'un coup (contrôle global). */
export function setForecastMany(budgetIds: string[], on: boolean) {
  if (budgetIds.length === 0) return
  const next = { ...state }
  for (const id of budgetIds) next[id] = on
  state = next
  persist()
  emit()
}

/**
 * `isOn(id)` → la préférence de cet objectif (true par défaut).
 * `toggle(id)` → bascule et mémorise.
 */
export function useForecast() {
  const prefs = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot)

  const isOn = useCallback(
    (budgetId: string) => prefs[budgetId] ?? FORECAST_DEFAULT,
    [prefs]
  )

  const toggle = useCallback(
    (budgetId: string) => setForecast(budgetId, !(prefs[budgetId] ?? FORECAST_DEFAULT)),
    [prefs]
  )

  return { isOn, toggle }
}
