import { useState, useEffect } from 'react'
import { startOfISOWeek, format } from 'date-fns'
import { db } from '../../db/db'
import { useTaskStore } from '../../store/taskStore'
import { todayISO, getWeekDays, formatISODay, addWeeks, dayAbbr } from '../../lib/dateUtils'

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

export function formatMinutes(minutes: number): string {
  const h = Math.floor(minutes / 60)
  const m = minutes % 60
  return `${h}h ${m}m`
}

const EMPTY: StatsData = {
  totalMinutesFocused: 0,
  totalCompleted: 0,
  totalInterrupted: 0,
  completionRate: null,
  weeklyTrend: [],
  taskStats: [],
  dailyFocus: [],
}

export function useStatsData(filter: TimeFilter): StatsData {
  const { tasks } = useTaskStore()
  const [data, setData] = useState<StatsData>(EMPTY)

  useEffect(() => {
    let cancelled = false

    async function load() {
      const taskMap = new Map(tasks.map(t => [t.id, t.title]))

      if (filter === 'all') {
        const allStats = await db.pomodoroStats.toArray()

        const totalMinutesFocused = allStats.reduce((s, r) => s + r.totalMinutesFocused, 0)
        const totalCompleted = allStats.reduce((s, r) => s + r.totalCompleted, 0)
        const totalInterrupted = allStats.reduce((s, r) => s + r.totalInterrupted, 0)
        const total = totalCompleted + totalInterrupted
        const completionRate = total === 0 ? null : totalCompleted / total

        const taskStats = allStats
          .filter(r => taskMap.has(r.taskId))
          .map(r => ({
            taskId: r.taskId,
            title: taskMap.get(r.taskId)!,
            minutesFocused: r.totalMinutesFocused,
            completed: r.totalCompleted,
            interrupted: r.totalInterrupted,
            started: r.totalStarted,
          }))
          .sort((a, b) => b.minutesFocused - a.minutesFocused)

        // chart data: query completed work sessions
        const completedWork = await db.pomodoroSessions
          .filter(s => s.type === 'work' && s.completedAt !== null && s.isOpen === 0)
          .toArray()

        // weeklyTrend: last 8 ISO weeks (current week + 7 prior)
        interface WeekSlot { label: string; isoKey: string; minutes: number }
        const weekSlots: WeekSlot[] = []
        for (let i = 7; i >= 0; i--) {
          const weekDate = addWeeks(new Date(), -i)
          const weekStart = startOfISOWeek(weekDate)
          weekSlots.push({
            label: format(weekStart, 'MMM d'),
            isoKey: formatISODay(weekStart),
            minutes: 0,
          })
        }
        for (const s of completedWork) {
          const weekStart = startOfISOWeek(new Date(s.startedAt))
          const key = formatISODay(weekStart)
          const slot = weekSlots.find(w => w.isoKey === key)
          if (slot) slot.minutes += s.durationMinutes
        }
        const weeklyTrend = weekSlots.map(w => ({ label: w.label, hours: w.minutes / 60 }))

        // dailyFocus: last 30 calendar days
        const dailyMap = new Map<string, number>()
        for (let i = 29; i >= 0; i--) {
          const d = new Date()
          d.setDate(d.getDate() - i)
          dailyMap.set(formatISODay(d), 0)
        }
        for (const s of completedWork) {
          const date = s.startedAt.slice(0, 10)
          if (dailyMap.has(date)) {
            dailyMap.set(date, (dailyMap.get(date) ?? 0) + s.durationMinutes)
          }
        }
        const dailyFocus = Array.from(dailyMap.entries()).map(([date, mins]) => ({
          date,
          hours: mins / 60,
        }))

        if (!cancelled) {
          setData({ totalMinutesFocused, totalCompleted, totalInterrupted,
            completionRate, weeklyTrend, taskStats, dailyFocus })
        }
      } else {
        // week / today: compute from sessions (Task 4)
        if (!cancelled) setData(EMPTY)
      }
    }

    load()
    return () => { cancelled = true }
  }, [filter, tasks])

  return data
}
