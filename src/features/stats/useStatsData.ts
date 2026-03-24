// src/features/stats/useStatsData.ts
import { useState, useEffect } from 'react'
import { getStats } from '../../api/stats'
import type { StatsData, TimeFilter } from '../../api/stats'

export type { StatsData, TimeFilter }

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
  const [data, setData] = useState<StatsData>(EMPTY)

  useEffect(() => {
    let cancelled = false

    async function load() {
      const result = await getStats(filter)
      if (!cancelled) setData(result)
    }

    load()
    return () => { cancelled = true }
  }, [filter])

  return data
}
