// src/db/repositories/TaskRepository.ts
import { nanoid } from 'nanoid'
import type { TimeManagerDB } from '../db'
import type { Task } from '../../types'

type CreateInput = Omit<Task, 'id' | 'createdAt' | 'updatedAt'>

export class TaskRepository {
  constructor(private db: TimeManagerDB) {}

  async create(input: CreateInput): Promise<Task> {
    const now = new Date().toISOString()
    const task: Task = { ...input, id: nanoid(), createdAt: now, updatedAt: now }
    await this.db.tasks.add(task)
    return task
  }

  async update(id: string, changes: Partial<Omit<Task, 'id' | 'createdAt'>>): Promise<void> {
    await this.db.tasks.update(id, { ...changes, updatedAt: new Date().toISOString() })
  }

  async delete(id: string): Promise<void> {
    await this.db.transaction('rw', [this.db.tasks, this.db.pomodoroSessions, this.db.pomodoroStats], async () => {
      await this.db.tasks.delete(id)
      const sessionIds = await this.db.pomodoroSessions.where('taskId').equals(id).primaryKeys()
      await this.db.pomodoroSessions.bulkDelete(sessionIds as string[])
      await this.db.pomodoroStats.delete(id)
    })
  }

  async getAll(): Promise<Task[]> {
    return this.db.tasks.toArray()
  }

  async getById(id: string): Promise<Task | undefined> {
    return this.db.tasks.get(id)
  }

  /**
   * Reorder tasks within a group (parentId or null = top-level).
   * orderedIds is the full desired order for that group.
   * Assigns order values 1000, 2000, 3000… to avoid float collision.
   */
  async reorderGroup(parentId: string | undefined, orderedIds: string[]): Promise<void> {
    await this.db.transaction('rw', this.db.tasks, async () => {
      for (let i = 0; i < orderedIds.length; i++) {
        await this.db.tasks.update(orderedIds[i], {
          order: (i + 1) * 1000,
          updatedAt: new Date().toISOString(),
        })
      }
    })
  }
}
