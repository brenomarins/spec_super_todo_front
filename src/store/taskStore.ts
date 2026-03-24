// src/store/taskStore.ts
import { create } from 'zustand'
import type { Task } from '../types'
import * as api from '../api/tasks'

interface TaskStore {
  tasks: Task[]
  setTasks: (tasks: Task[]) => void
  upsertTask: (task: Task) => void
  removeTask: (id: string) => Promise<void>
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
  removeTask: async (id) => {
    await api.deleteTask(id)
    set(s => ({ tasks: s.tasks.filter(t => t.id !== id) }))
  },
  addTask: async (task) => {
    const { createdAt: _ca, updatedAt: _ua, ...input } = task
    const saved = await api.createTask(input)
    set(s => ({ tasks: [...s.tasks, saved] }))
    return saved
  },
  updateTask: async (partial) => {
    const { id, createdAt: _ca, updatedAt: _ua, ...changes } = partial
    await api.updateTask(id, changes)
    set(s => ({ tasks: s.tasks.map(t => t.id === id ? { ...t, ...changes } : t) }))
  },
  reorderTasks: async (ids, parentId) => {
    await api.reorderTasks({ orderedIds: ids, parentId })
    const updated = await api.listTasks()
    set({ tasks: updated })
  },
}))
