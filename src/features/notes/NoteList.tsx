// src/features/notes/NoteList.tsx
import type { Note } from '../../types'

interface NoteListProps {
  notes: Note[]
  selectedId: string | null
  onSelect: (id: string) => void
  onNew: () => void
}

export function NoteList({ notes, selectedId, onSelect, onNew }: NoteListProps) {
  return (
    <div style={{ width: 200, borderRight: '1px solid var(--color-border)', padding: '12px 8px',
      display: 'flex', flexDirection: 'column', flexShrink: 0, overflowY: 'auto' }}>
      <div style={{ fontSize: 11, color: 'var(--color-text-muted)', marginBottom: 8,
        textTransform: 'uppercase', fontWeight: 600 }}>
        Notes
      </div>

      {notes.length === 0 && (
        <div style={{ fontSize: 12, color: 'var(--color-text-muted)', padding: '8px 4px' }}>
          No notes yet.
        </div>
      )}

      {notes.map(note => (
        <div
          key={note.id}
          role="button"
          tabIndex={0}
          onClick={() => onSelect(note.id)}
          onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') onSelect(note.id) }}
          style={{
            padding: '6px 8px', borderRadius: 6, cursor: 'pointer', fontSize: 13,
            background: selectedId === note.id ? 'var(--color-surface)' : 'transparent',
            borderLeft: selectedId === note.id ? '2px solid var(--color-accent)' : '2px solid transparent',
            color: selectedId === note.id ? 'var(--color-text)' : 'var(--color-text-muted)',
            marginBottom: 2,
          }}
        >
          {note.title || 'Untitled'}
        </div>
      ))}

      <button
        type="button"
        onClick={onNew}
        style={{ marginTop: 'auto', background: 'none', border: 'none', cursor: 'pointer',
          color: 'var(--color-success)', fontSize: 13, textAlign: 'left', padding: '8px 4px' }}
      >
        + New note
      </button>
    </div>
  )
}
