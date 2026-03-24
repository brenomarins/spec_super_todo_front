// src/store/noteStore.ts
import { create } from 'zustand'
import type { Note } from '../types'
import * as api from '../api/notes'

interface NoteStore {
  notes: Note[]
  activeNoteId: string | null
  setNotes: (notes: Note[]) => void
  upsertNote: (note: Note) => void
  removeNote: (id: string) => Promise<void>
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
  removeNote: async (id) => {
    await api.deleteNote(id)
    set(s => ({ notes: s.notes.filter(n => n.id !== id) }))
  },
  setActiveNoteId: id => set({ activeNoteId: id }),
  addNote: async (note) => {
    const { createdAt: _ca, updatedAt: _ua, ...input } = note
    const saved = await api.createNote(input)
    set(s => ({ notes: [...s.notes, saved] }))
    return saved
  },
  updateNote: async (partial) => {
    const { id, createdAt: _ca, updatedAt: _ua, ...changes } = partial
    await api.updateNote(id, changes)
    set(s => ({ notes: s.notes.map(n => n.id === id ? { ...n, ...changes } : n) }))
  },
}))
