import { create } from 'zustand'
import type { Note } from '../types'

interface NoteStore {
  notes: Note[]
  activeNoteId: string | null
  setNotes: (notes: Note[]) => void
  upsertNote: (note: Note) => void
  removeNote: (id: string) => void
  setActiveNoteId: (id: string | null) => void
  addNote: (note: Note) => Promise<Note>
  updateNote: (partial: Partial<Note> & { id: string }) => Promise<void>
}

export const useNoteStore = create<NoteStore>(set => ({
  notes: [],
  activeNoteId: null,
  setNotes: notes => set({ notes }),
  upsertNote: note =>
    set(s => ({
      notes: s.notes.some(n => n.id === note.id)
        ? s.notes.map(n => n.id === note.id ? note : n)
        : [...s.notes, note],
    })),
  removeNote: id => set(s => ({ notes: s.notes.filter(n => n.id !== id) })),
  setActiveNoteId: id => set({ activeNoteId: id }),
  addNote: async (note) => note,
  updateNote: async () => {},
}))
