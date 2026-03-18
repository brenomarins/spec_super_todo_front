import { create } from 'zustand'
import type { Task } from '../types'
import { TaskRepository } from '../db/repositories/TaskRepository'
import { db } from '../db/db'

interface TaskStore {
  tasks: Task[]
  setTasks: (tasks: Task[]) => void
  upsertTask: (task: Task) => void
  removeTask: (id: string) => void
  addTask: (task: Task) => Promise<Task>
  updateTask: (partial: Partial<Task> & { id: string }) => Promise<void>
  reorderTasks: (ids: string[], parentId: string | null) => Promise<void>
}

export const useTaskStore = create<TaskStore>(set => ({
  tasks: [],
  setTasks: tasks => set({ tasks }),
  upsertTask: task =>
    set(s => ({
      tasks: s.tasks.some(t => t.id === task.id)
        ? s.tasks.map(t => t.id === task.id ? task : t)
        : [...s.tasks, task],
    })),
  removeTask: id => set(s => ({ tasks: s.tasks.filter(t => t.id !== id) })),
  addTask: async (task) => {
    const repo = new TaskRepository(db)
    const { id: _id, createdAt: _ca, updatedAt: _ua, ...input } = task
    const saved = await repo.create(input)
    set(s => ({ tasks: [...s.tasks, saved] }))
    return saved
  },
  updateTask: async (partial) => {
    const repo = new TaskRepository(db)
    const { id, ...changes } = partial
    await repo.update(id, changes)
    set(s => ({ tasks: s.tasks.map(t => t.id === id ? { ...t, ...changes } : t) }))
  },
  reorderTasks: async (ids, parentId) => {
    const repo = new TaskRepository(db)
    await repo.reorderGroup(parentId ?? undefined, ids)
    // re-fetch to get updated order values
    const updated = await repo.getAll()
    set({ tasks: updated })
  },
}))
