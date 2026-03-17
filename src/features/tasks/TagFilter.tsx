import type { Tag } from '../../types'

interface TagFilterProps {
  tags: Tag[]
  selectedId: string | null
  onSelect: (id: string | null) => void
}

export function TagFilter({ tags, selectedId, onSelect }: TagFilterProps) {
  if (tags.length === 0) return null

  return (
    <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
      {tags.map(tag => (
        <button
          key={tag.id}
          type="button"
          onClick={() => onSelect(selectedId === tag.id ? null : tag.id)}
          style={{
            padding: '3px 10px', borderRadius: 10, border: 'none', cursor: 'pointer',
            fontSize: 12, fontWeight: 500,
            background: selectedId === tag.id ? tag.color : 'var(--color-surface-2)',
            color: selectedId === tag.id ? '#fff' : 'var(--color-text-muted)',
            outline: selectedId === tag.id ? `2px solid ${tag.color}` : '1px solid var(--color-border)',
          }}
        >
          {tag.name}
        </button>
      ))}
    </div>
  )
}
