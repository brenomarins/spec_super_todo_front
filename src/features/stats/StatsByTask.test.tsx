import { render, screen } from '@testing-library/react'
import { StatsByTask } from './StatsByTask'
import type { StatsData } from './useStatsData'

const makeData = (taskStats: StatsData['taskStats']): StatsData => ({
  totalMinutesFocused: 0, totalCompleted: 0, totalInterrupted: 0,
  completionRate: null, weeklyTrend: [], dailyFocus: [], taskStats,
})

test('renders task title and focused time', () => {
  render(<StatsByTask data={makeData([
    { taskId: 't1', title: 'Fix bug', minutesFocused: 50, completed: 2, interrupted: 0, started: 2 },
  ])} />)
  expect(screen.getByText('Fix bug')).toBeInTheDocument()
  expect(screen.getByText('0h 50m')).toBeInTheDocument()
})

test('tasks are shown in order (data already sorted by hook)', () => {
  render(<StatsByTask data={makeData([
    { taskId: 't1', title: 'High', minutesFocused: 100, completed: 4, interrupted: 0, started: 4 },
    { taskId: 't2', title: 'Low', minutesFocused: 25, completed: 1, interrupted: 0, started: 1 },
  ])} />)
  const rows = screen.getAllByRole('row')
  expect(rows[1]).toHaveTextContent('High')
  expect(rows[2]).toHaveTextContent('Low')
})

test('stop rate shows — when started is 0', () => {
  render(<StatsByTask data={makeData([
    { taskId: 't1', title: 'Task A', minutesFocused: 0, completed: 0, interrupted: 0, started: 0 },
  ])} />)
  expect(screen.getByText('—')).toBeInTheDocument()
})

test('stop rate shows percentage when started > 0', () => {
  render(<StatsByTask data={makeData([
    { taskId: 't1', title: 'Task B', minutesFocused: 50, completed: 3, interrupted: 1, started: 4 },
  ])} />)
  expect(screen.getByText('25%')).toBeInTheDocument()
})

test('renders empty state when no task stats', () => {
  render(<StatsByTask data={makeData([])} />)
  expect(screen.getByText(/no data/i)).toBeInTheDocument()
})
