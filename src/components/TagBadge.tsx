import type { Tag } from '../types'

interface TagBadgeProps {
  tag: Tag
  onRemove?: (id: string) => void
}

export function TagBadge({ tag, onRemove }: TagBadgeProps) {
  return (
    <span
      data-testid="tag-badge"
      style={{
        display: 'inline-flex', alignItems: 'center', gap: 3,
        background: tag.color, color: '#fff', fontSize: 11,
        padding: '2px 8px', borderRadius: 10, fontWeight: 500,
      }}
    >
      {tag.name}
      {onRemove && (
        <button
          type="button"
          aria-label={`remove ${tag.name}`}
          onClick={() => onRemove(tag.id)}
          style={{ background: 'none', border: 'none', color: '#fff',
            cursor: 'pointer', padding: 0, lineHeight: 1, fontSize: 12 }}
        >
          ×
        </button>
      )}
    </span>
  )
}
