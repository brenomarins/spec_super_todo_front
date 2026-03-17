// src/db/repositories/TagRepository.ts
import { nanoid } from 'nanoid'
import type { TimeManagerDB } from '../db'
import type { Tag } from '../../types'

type CreateInput = Omit<Tag, 'id'>

export class TagRepository {
  constructor(private db: TimeManagerDB) {}

  async create(input: CreateInput): Promise<Tag> {
    const tag: Tag = { ...input, id: nanoid() }
    await this.db.tags.add(tag)
    return tag
  }

  async update(id: string, changes: Partial<Omit<Tag, 'id'>>): Promise<void> {
    await this.db.tags.update(id, changes)
  }

  async delete(id: string): Promise<void> {
    await this.db.transaction('rw', [this.db.tags, this.db.tasks, this.db.notes], async () => {
      await this.db.tags.delete(id)

      // Remove tagId from all tasks
      const tasksWithTag = await this.db.tasks.where('tagIds').equals(id).toArray()
      for (const task of tasksWithTag) {
        await this.db.tasks.update(task.id, {
          tagIds: task.tagIds.filter(t => t !== id),
          updatedAt: new Date().toISOString(),
        })
      }

      // Remove tagId from all notes
      const notesWithTag = await this.db.notes.toArray()
      for (const note of notesWithTag.filter(n => n.tagIds.includes(id))) {
        await this.db.notes.update(note.id, {
          tagIds: note.tagIds.filter(t => t !== id),
          updatedAt: new Date().toISOString(),
        })
      }
    })
  }

  async getAll(): Promise<Tag[]> {
    return this.db.tags.toArray()
  }
}
