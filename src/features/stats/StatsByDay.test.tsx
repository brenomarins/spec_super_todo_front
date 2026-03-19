import { render, screen } from '@testing-library/react'
import { StatsByDay } from './StatsByDay'
import type { StatsData } from './useStatsData'

function makeData(dailyFocus: StatsData['dailyFocus']): StatsData {
  return {
    totalMinutesFocused: 0, totalCompleted: 0, totalInterrupted: 0,
    completionRate: null, weeklyTrend: [], taskStats: [], dailyFocus,
  }
}

const thirtyDays = Array.from({ length: 30 }, (_, i) => ({
  date: `2026-03-${String(i + 1).padStart(2, '0')}`,
  hours: i * 0.1,
}))

const sevenDays = Array.from({ length: 7 }, (_, i) => ({
  date: `2026-03-${String(i + 16).padStart(2, '0')}`,
  hours: i * 0.2,
}))

const twentyFourHours = Array.from({ length: 24 }, (_, i) => ({
  date: String(i),
  hours: i * 0.05,
}))

test('all-time: renders chart with 30-day data without crashing', () => {
  render(<StatsByDay data={makeData(thirtyDays)} filter="all" />)
  expect(screen.getByTestId('byday-chart')).toBeInTheDocument()
})

test('week: renders chart with 7-day data without crashing', () => {
  render(<StatsByDay data={makeData(sevenDays)} filter="week" />)
  expect(screen.getByTestId('byday-chart')).toBeInTheDocument()
})

test('today: renders chart with 24-hour data without crashing', () => {
  render(<StatsByDay data={makeData(twentyFourHours)} filter="today" />)
  expect(screen.getByTestId('byday-chart')).toBeInTheDocument()
})
