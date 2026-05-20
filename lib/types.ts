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
  created_at: string
  tags?: Tag | null
}

export type NewExpense = {
  amount: number
  label: string
  tag_id: string | null
  date: string
  is_recurring: boolean
  recurrence_frequency: 'daily' | 'weekly' | 'monthly' | 'yearly' | null
  is_exceptional: boolean
}
