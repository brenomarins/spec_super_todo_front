import { useState, useRef } from 'react'
import { TagBadge } from '../../components/TagBadge'
import type { Tag } from '../../types'

interface TagInputProps {
  allTags: Tag[]
  selectedIds: string[]
  onChange: (ids: string[]) => void
  onTagCreate: (name: string) => void
}

export function TagInput({ allTags, selectedIds, onChange, onTagCreate }: TagInputProps) {
  const [query, setQuery] = useState('')
  const [open, setOpen] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  const selectedTags = allTags.filter(t => selectedIds.includes(t.id))
  const available = allTags.filter(
    t => !selectedIds.includes(t.id) && t.name.toLowerCase().includes(query.toLowerCase())
  )

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Enter' && query.trim()) {
      e.preventDefault()
      const exact = allTags.find(t => t.name.toLowerCase() === query.trim().toLowerCase())
      if (exact) {
        onChange([...selectedIds, exact.id])
      } else {
        onTagCreate(query.trim())
      }
      setQuery('')
      setOpen(false)
    } else if (e.key === 'Escape') {
      setOpen(false)
    }
  }

  function selectTag(tag: Tag) {
    onChange([...selectedIds, tag.id])
    setQuery('')
    setOpen(false)
    inputRef.current?.focus()
  }

  function removeTag(id: string) {
    onChange(selectedIds.filter(i => i !== id))
  }

  return (
    <div style={{ position: 'relative', display: 'flex', flexWrap: 'wrap', gap: 4, alignItems: 'center' }}>
      {selectedTags.map(tag => (
        <TagBadge key={tag.id} tag={tag} onRemove={removeTag} />
      ))}
      <input
        ref={inputRef}
        value={query}
        onChange={e => { setQuery(e.target.value); setOpen(true) }}
        onFocus={() => setOpen(true)}
        onBlur={() => setTimeout(() => setOpen(false), 150)}
        onKeyDown={handleKeyDown}
        placeholder="Add tag..."
        style={{ border: 'none', background: 'transparent', outline: 'none',
          fontSize: 12, color: 'var(--color-text)', minWidth: 80 }}
      />
      {open && available.length > 0 && (
        <div style={{
          position: 'absolute', top: '100%', left: 0, zIndex: 50,
          background: 'var(--color-surface)', border: '1px solid var(--color-border)',
          borderRadius: 6, minWidth: 160, boxShadow: '0 4px 12px rgba(0,0,0,0.3)',
        }}>
          {available.map(tag => (
            <div
              key={tag.id}
              onMouseDown={e => { e.preventDefault(); selectTag(tag) }}
              onClick={() => selectTag(tag)}
              style={{ padding: '6px 10px', cursor: 'pointer', display: 'flex',
                alignItems: 'center', gap: 6 }}
            >
              <span style={{ width: 10, height: 10, borderRadius: '50%',
                background: tag.color, flexShrink: 0 }} />
              <span style={{ fontSize: 13 }}>{tag.name}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
