interface Props {
  /** N'importe quel objet porteur d'un nom et d'une couleur (un Tag convient). */
  tag: { name: string; color: string }
  size?: 'sm' | 'md' | 'lg'
  className?: string
}

const SIZES = {
  sm: 'text-[11px] px-2 py-0.5',
  md: 'text-xs px-2.5 py-1',
  lg: 'text-sm px-3 py-1',
}

/** Pastille colorée d'une catégorie — chip canonique de l'app. */
export default function TagBadge({ tag, size = 'sm', className = '' }: Props) {
  return (
    <span
      className={`inline-flex items-center rounded-full font-medium max-w-full truncate ${SIZES[size]} ${className}`}
      style={{
        // color-mix plutôt que `+ '28'` : fonctionne aussi avec var(--primary)
        backgroundColor: `color-mix(in srgb, ${tag.color} 16%, transparent)`,
        color: tag.color,
        border: `1px solid color-mix(in srgb, ${tag.color} 25%, transparent)`,
      }}
    >
      {tag.name}
    </span>
  )
}
