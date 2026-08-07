import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"
import type { Expense } from '@/lib/types'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

const _eur = new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' })
export const formatEUR = (n: number) => _eur.format(n)

export type PieDataPoint = { name: string; value: number; color: string }

export function buildPieData(expenses: Expense[]): { data: PieDataPoint[]; total: number } {
  const byTag: Record<string, PieDataPoint> = {}
  let total = 0
  for (const e of expenses) {
    const key   = e.tag_id ?? '__none__'
    const name  = e.tags?.name  ?? 'Autre'
    const color = e.tags?.color ?? '#c0b8b0'
    if (!byTag[key]) byTag[key] = { name, value: 0, color }
    byTag[key].value += Number(e.amount)
    total += Number(e.amount)
  }
  return { data: Object.values(byTag).sort((a, b) => b.value - a.value), total }
}
