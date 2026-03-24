import { useState } from 'react'
import { useTagStore } from '../../store/tagStore'
import { TagEditModal } from './TagEditModal'
import type { Tag } from '../../types'

export function TagsTab() {
  const { tags } = useTagStore()
  const [editing, setEditing] = useState<Tag | null>(null)

  return (
    <div style={{ padding: 24, maxWidth: 600, margin: '0 auto', height: '100%', overflowY: 'auto', boxSizing: 'border-box' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between',
        alignItems: 'center', marginBottom: 16 }}>
        <h2 style={{ fontSize: 18, fontWeight: 600, margin: 0 }}>Tags</h2>
      </div>

      {tags.length === 0 ? (
        <p style={{ color: 'var(--color-text-muted)', fontSize: 14 }}>
          No tags yet. Create tags from the task detail panel.
        </p>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          {tags.map(tag => (
            <div
              key={tag.id}
              style={{
                display: 'flex', alignItems: 'center', gap: 10,
                background: 'var(--color-surface)', borderRadius: 6,
                padding: '8px 12px', border: '1px solid var(--color-border)',
              }}
            >
              <span
                data-testid="tag-color-swatch"
                aria-hidden="true"
                style={{
                  width: 14, height: 14, borderRadius: '50%',
                  background: tag.color, flexShrink: 0,
                }}
              />
              <span style={{ flex: 1, fontSize: 14 }}>{tag.name}</span>
              <button
                type="button"
                aria-label={`Edit ${tag.name}`}
                onClick={() => setEditing(tag)}
                style={{
                  background: 'none', border: '1px solid var(--color-border)',
                  borderRadius: 4, color: 'var(--color-text-muted)',
                  cursor: 'pointer', fontSize: 12, padding: '3px 10px',
                }}
              >
                Edit
              </button>
            </div>
          ))}
        </div>
      )}

      {editing && (
        <TagEditModal tag={editing} onClose={() => setEditing(null)} />
      )}
    </div>
  )
}
