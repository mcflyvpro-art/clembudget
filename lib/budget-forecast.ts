'use client'

import { useSyncExternalStore, useCallback } from 'react'

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
