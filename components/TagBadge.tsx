import type { Tag } from '@/lib/types'

interface Props {
  tag: Tag
  size?: 'sm' | 'md'
}

export default function TagBadge({ tag, size = 'sm' }: Props) {
  const sizeClass = size === 'md' ? 'text-xs px-2.5 py-1' : 'text-[11px] px-2 py-0.5'
  return (
    <span
      className={`inline-flex items-center rounded-full font-medium ${sizeClass}`}
      style={{
        backgroundColor: tag.color + '28',
        color: tag.color,
        border: `1px solid ${tag.color}40`,
      }}
    >
      {tag.name}
    </span>
  )
}
