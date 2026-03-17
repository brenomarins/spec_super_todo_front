import { create } from 'zustand'
import type { Task } from '../types'

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
  addTask: async (task) => task,
  updateTask: async () => {},
  reorderTasks: async () => {},
}))
