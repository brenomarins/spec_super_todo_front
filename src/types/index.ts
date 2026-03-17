// src/types/index.ts
export interface Task {
  id: string
  title: string
  description?: string
  completed: boolean
  parentId?: string
  order: number
  tagIds: string[]
  scheduledDay?: string       // ISO date YYYY-MM-DD
  createdAt: string
  updatedAt: string
}

export interface Tag {
  id: string
  name: string
  color: string               // hex e.g. "#3b82f6"
}

export interface Note {
  id: string
  title: string               // plain text; defaults to "Untitled"
  content: string             // TipTap JSON serialized
  tagIds: string[]
  linkedTaskIds: string[]     // re-derived from NodeViews on each save
  createdAt: string
  updatedAt: string
}

export interface PomodoroSession {
  id: string
  taskId?: string             // always set for work sessions; may be undefined for orphaned break sessions
  startedAt: string
  completedAt: string | null  // null = interrupted/abandoned; never undefined
  type: 'work' | 'short_break' | 'long_break'
  durationMinutes: number
  isOpen: 0 | 1   // 1 = active session, 0 = completed/interrupted
}

export interface PomodoroStats {
  taskId: string
  totalStarted: number
  totalCompleted: number
  totalInterrupted: number
  totalMinutesFocused: number
  lastSessionAt: string | null
  updatedAt: string
}

export type SessionType = PomodoroSession['type']
