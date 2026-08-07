import type { Expense } from '@/lib/types'

export function describeFrequency(expense: Expense): string {
  const anchor = new Date(expense.date + 'T00:00:00')
  const day = anchor.getDate()
  const weekdays = ['dimanche', 'lundi', 'mardi', 'mercredi', 'jeudi', 'vendredi', 'samedi']
  const months = ['janvier', 'février', 'mars', 'avril', 'mai', 'juin', 'juillet', 'août', 'septembre', 'octobre', 'novembre', 'décembre']

  switch (expense.recurrence_frequency) {
    case 'daily':   return 'Tous les jours'
    case 'weekly':  return `Chaque ${weekdays[anchor.getDay()]}`
    case 'monthly': return `Le ${day} de chaque mois`
    case 'yearly':  return `Le ${day} ${months[anchor.getMonth()]} chaque année`
    default:        return 'Récurrent'
  }
}

export function totalMonthlyEquivalent(expenses: Expense[]): number {
  return expenses.reduce((sum, e) => {
    const amt = Number(e.amount)
    switch (e.recurrence_frequency) {
      case 'daily':   return sum + amt * 30
      case 'weekly':  return sum + amt * 4.33
      case 'monthly': return sum + amt
      case 'yearly':  return sum + amt / 12
      default:        return sum + amt
    }
  }, 0)
}
