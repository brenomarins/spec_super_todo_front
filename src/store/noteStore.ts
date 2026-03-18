import { create } from 'zustand'
import type { Note } from '../types'
import { NoteRepository } from '../db/repositories/NoteRepository'
import { db } from '../db/db'

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
  addNote: async (note) => {
    const repo = new NoteRepository(db)
    const { id: _id, createdAt: _ca, updatedAt: _ua, ...input } = note
    const saved = await repo.create(input)
    set(s => ({ notes: [...s.notes, saved] }))
    return saved
  },
  updateNote: async (partial) => {
    const repo = new NoteRepository(db)
    const { id, ...changes } = partial
    await repo.update(id, changes)
    set(s => ({ notes: s.notes.map(n => n.id === id ? { ...n, ...changes } : n) }))
  },
}))
