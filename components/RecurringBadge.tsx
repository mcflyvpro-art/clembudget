import { RefreshCw } from 'lucide-react'

type Frequency = 'daily' | 'weekly' | 'monthly' | 'yearly' | null

function label(f: Frequency) {
  switch (f) {
    case 'daily':   return 'Quotidien'
    case 'weekly':  return 'Hebdo'
    case 'monthly': return 'Mensuel'
    case 'yearly':  return 'Annuel'
    default:        return 'Récurrent'
  }
}

interface Props {
  frequency: Frequency
  size?: 'sm' | 'md'
}

export default function RecurringBadge({ frequency, size = 'sm' }: Props) {
  if (size === 'md') {
    return (
      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-primary/15 text-primary border border-primary/25 text-xs font-semibold">
        <RefreshCw size={11} />
        {label(frequency)}
      </span>
    )
  }

  return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-primary/12 text-primary border border-primary/20 text-[11px] font-semibold">
      <RefreshCw size={9} />
      {label(frequency)}
    </span>
  )
}
