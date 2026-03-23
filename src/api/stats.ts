// src/api/stats.ts
import { apiFetch } from './client'

export type TimeFilter = 'all' | 'week' | 'today'

export interface StatsData {
  totalMinutesFocused: number
  totalCompleted: number
  totalInterrupted: number
  completionRate: number | null
  weeklyTrend: { label: string; hours: number }[]
  taskStats: {
    taskId: string
    title: string
    minutesFocused: number
    completed: number
    interrupted: number
    started: number
  }[]
  dailyFocus: { date: string; hours: number }[]
}

export const getStats = (filter: TimeFilter) =>
  apiFetch<StatsData>(`/stats?filter=${filter}`)
