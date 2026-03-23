// src/api/notes.ts
import { apiFetch } from './client'
import type { Note } from '../types'

export interface CreateNoteInput {
  id?: string
  title: string
  content: string
  tagIds?: string[]
  linkedTaskIds?: string[]
}

export interface UpdateNoteInput {
  title?: string
  content?: string
  tagIds?: string[]
  linkedTaskIds?: string[]
}

export const listNotes = () =>
  apiFetch<Note[]>('/notes')

export const getNote = (id: string) =>
  apiFetch<Note>(`/notes/${id}`)

export const createNote = (input: CreateNoteInput) =>
  apiFetch<Note>('/notes', {
    method: 'POST',
    body: JSON.stringify(input),
  })

export const updateNote = (id: string, input: UpdateNoteInput) =>
  apiFetch<Note>(`/notes/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(input),
  })

export const deleteNote = (id: string) =>
  apiFetch<void>(`/notes/${id}`, { method: 'DELETE' })
