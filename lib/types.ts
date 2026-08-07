export type Tag = {
  id: string
  user_id: string
  name: string
  color: string
  created_at: string
}

export type Expense = {
  id: string
  user_id: string
  amount: number
  label: string
  tag_id: string | null
  date: string
  is_recurring: boolean
  recurrence_frequency: 'daily' | 'weekly' | 'monthly' | 'yearly' | null
  is_exceptional: boolean
  recurrence_ended_at: string | null
  created_at: string
  tags?: Tag | null
  is_projection?: boolean
}

export type BudgetPeriod = 'weekly' | 'monthly' | 'yearly'
export type BudgetKind = 'recurring' | 'oneshot'

export type Budget = {
  id: string
  user_id: string
  tag_id: string | null       // null = objectif global (toutes catégories)
  amount: number
  kind: BudgetKind
  period: BudgetPeriod | null // rempli si kind = 'recurring'
  start_date: string | null   // rempli si kind = 'oneshot'
  end_date: string | null     // rempli si kind = 'oneshot'
  label: string | null        // nom libre d'un objectif ponctuel
  is_active: boolean
  created_at: string
  tags?: Tag | null
}

export type NewBudget = {
  tag_id: string | null
  amount: number
  kind: BudgetKind
  period: BudgetPeriod | null
  start_date: string | null
  end_date: string | null
  label: string | null
}

export type BudgetStatus = 'ok' | 'warning' | 'risk' | 'over'

export type BudgetProgress = {
  budget: Budget
  from: string
  to: string
  spent: number       // dépensé jusqu'à aujourd'hui inclus
  upcoming: number    // récurrentes prévues d'ici la fin de la fenêtre
  projected: number   // spent + upcoming
  remaining: number   // amount - spent (peut être négatif)
  daysLeft: number    // jours restants dans la fenêtre, aujourd'hui inclus
  perDayRemaining: number | null
  pctSpent: number    // brut, peut dépasser 100
  pctProjected: number
  status: BudgetStatus
  isPast: boolean     // fenêtre entièrement terminée
  isFuture: boolean   // fenêtre pas encore commencée
}

export type NewExpense = {
  amount: number
  label: string
  tag_id: string
  date: string
  is_recurring: boolean
  recurrence_frequency: 'daily' | 'weekly' | 'monthly' | 'yearly' | null
}
