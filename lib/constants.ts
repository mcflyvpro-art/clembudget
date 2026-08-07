export const FREQUENCIES = [
  { value: 'daily',   label: 'Quotidien' },
  { value: 'weekly',  label: 'Hebdo' },
  { value: 'monthly', label: 'Mensuel' },
  { value: 'yearly',  label: 'Annuel' },
] as const

export type Frequency = typeof FREQUENCIES[number]['value']
