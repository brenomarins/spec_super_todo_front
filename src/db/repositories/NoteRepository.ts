// src/db/repositories/NoteRepository.ts
import { nanoid } from 'nanoid'
import type { TimeManagerDB } from '../db'
import type { Note } from '../../types'

type CreateInput = Omit<Note, 'id' | 'createdAt' | 'updatedAt'>

export class NoteRepository {
  constructor(private db: TimeManagerDB) {}

  async create(input: CreateInput): Promise<Note> {
    const now = new Date().toISOString()
    const note: Note = {
      ...input,
      title: input.title.trim() || 'Untitled',
      id: nanoid(),
      createdAt: now,
      updatedAt: now,
    }
    await this.db.notes.add(note)
    return note
  }

  async update(id: string, changes: Partial<Omit<Note, 'id' | 'createdAt'>>): Promise<void> {
    await this.db.notes.update(id, { ...changes, updatedAt: new Date().toISOString() })
  }

  async delete(id: string): Promise<void> {
    await this.db.notes.delete(id)
  }

  async getAll(): Promise<Note[]> {
    return this.db.notes.toArray()
  }

  async getByLinkedTaskId(taskId: string): Promise<Note[]> {
    return this.db.notes.where('linkedTaskIds').equals(taskId).toArray()
  }
}
