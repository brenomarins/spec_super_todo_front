// src/features/notes/NotesTab.tsx
import { useState, useEffect } from 'react'
import { nanoid } from 'nanoid'
import { NoteList } from './NoteList'
import { NoteEditor } from './NoteEditor'
import { EmptyState } from '../../components/EmptyState'
import { useNoteStore } from '../../store/noteStore'
import { useTagStore } from '../../store/tagStore'
import { useTaskStore } from '../../store/taskStore'
import type { Note } from '../../types'

function nowISO() { return new Date().toISOString() }

export function NotesTab() {
  const { notes, addNote, updateNote } = useNoteStore()
  const { tags, addTag } = useTagStore()
  const { tasks } = useTaskStore()

  const [selectedId, setSelectedId] = useState<string | null>(notes[0]?.id ?? null)

  useEffect(() => {
    if (!selectedId && notes.length > 0) setSelectedId(notes[0].id)
  }, [notes, selectedId])

  const selectedNote = notes.find(n => n.id === selectedId) ?? null

  async function handleNew() {
    const note: Note = {
      id: nanoid(), title: 'Untitled', content: JSON.stringify({ type: 'doc', content: [] }),
      tagIds: [], linkedTaskIds: [], createdAt: nowISO(), updatedAt: nowISO(),
    }
    await addNote(note)
    setSelectedId(note.id)
  }

  if (notes.length === 0) {
    return (
      <div style={{ display: 'flex', height: '100%', overflow: 'hidden' }}>
        <div style={{ display: 'flex', flexDirection: 'column', width: 200, borderRight: '1px solid var(--color-border)', padding: '12px 8px', flexShrink: 0 }}>
          <button
            type="button"
            onClick={handleNew}
            style={{ marginTop: 'auto', background: 'none', border: 'none', cursor: 'pointer',
              color: 'var(--color-success)', fontSize: 13, textAlign: 'left', padding: '8px 4px' }}
          >
            + New note
          </button>
        </div>
        <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <EmptyState message="No notes yet. Create one to get started." />
        </div>
      </div>
    )
  }

  return (
    <div style={{ display: 'flex', height: '100%', overflow: 'hidden' }}>
      <NoteList
        notes={notes}
        selectedId={selectedId}
        onSelect={setSelectedId}
        onNew={handleNew}
      />

      {selectedNote ? (
        <NoteEditor
          note={selectedNote}
          tags={tags.filter(t => selectedNote.tagIds.includes(t.id))}
          allTags={tags}
          allTasks={tasks}
          onSave={(partial) => updateNote({ ...partial, updatedAt: nowISO() })}
          onTagChange={(ids) => updateNote({ id: selectedNote.id, tagIds: ids, updatedAt: nowISO() })}
          onTagCreate={async (name) => {
            const tag = await addTag({ id: nanoid(), name, color: '#3b82f6' })
            updateNote({ id: selectedNote.id, tagIds: [...selectedNote.tagIds, tag.id], updatedAt: nowISO() })
          }}
          onTaskClick={() => {}}
        />
      ) : (
        <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <EmptyState message="Select a note to edit." />
        </div>
      )}
    </div>
  )
}
