// src/api/sessions.ts
import { apiFetch } from './client'
import type { PomodoroSession } from '../types'

export const listSessions = (taskId?: string) => {
  const query = taskId ? `?taskId=${taskId}` : ''
  return apiFetch<PomodoroSession[]>(`/sessions${query}`)
}

export const getOpenSession = () =>
  apiFetch<PomodoroSession | null>('/sessions/open')

export const startWorkSession = (taskId: string) =>
  apiFetch<PomodoroSession>('/sessions/work', {
    method: 'POST',
    body: JSON.stringify({ taskId }),
  })

export const startBreakSession = (type: 'short_break' | 'long_break', taskId?: string) =>
  apiFetch<PomodoroSession>('/sessions/break', {
    method: 'POST',
    body: JSON.stringify({ type, ...(taskId ? { taskId } : {}) }),
  })

export const completeSession = (id: string) =>
  apiFetch<void>(`/sessions/${id}/complete`, { method: 'POST' })

export const interruptSession = (id: string) =>
  apiFetch<void>(`/sessions/${id}/interrupt`, { method: 'POST' })
