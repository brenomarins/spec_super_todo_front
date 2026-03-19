import { render, screen, fireEvent } from '@testing-library/react'
import { StatsTab } from './StatsTab'
import { useStatsData } from './useStatsData'

vi.mock('./useStatsData')

const emptyData = {
  totalMinutesFocused: 0, totalCompleted: 0, totalInterrupted: 0,
  completionRate: null, weeklyTrend: [], taskStats: [], dailyFocus: [],
}

beforeEach(() => {
  vi.mocked(useStatsData).mockReturnValue(emptyData)
})

// ── time filter ───────────────────────────────────────────────────────────────

test('time filter defaults to All time', () => {
  render(<StatsTab />)
  const allBtn = screen.getByRole('button', { name: /all time/i })
  expect(allBtn).toHaveAttribute('aria-pressed', 'true')
})

test('clicking This week activates it', () => {
  render(<StatsTab />)
  fireEvent.click(screen.getByRole('button', { name: /this week/i }))
  expect(screen.getByRole('button', { name: /this week/i })).toHaveAttribute('aria-pressed', 'true')
  expect(screen.getByRole('button', { name: /all time/i })).toHaveAttribute('aria-pressed', 'false')
})

test('clicking Today activates it', () => {
  render(<StatsTab />)
  fireEvent.click(screen.getByRole('button', { name: /today/i }))
  expect(screen.getByRole('button', { name: /today/i })).toHaveAttribute('aria-pressed', 'true')
})

// ── sub-tabs ──────────────────────────────────────────────────────────────────

test('sub-tab defaults to Overview', () => {
  render(<StatsTab />)
  expect(screen.getByTestId('overview-chart')).toBeInTheDocument()
})

test('clicking By Task switches content', () => {
  render(<StatsTab />)
  fireEvent.click(screen.getByRole('button', { name: /by task/i }))
  // StatsByTask renders a table (or empty state)
  expect(screen.getByText(/no data/i)).toBeInTheDocument()
  expect(screen.queryByTestId('overview-chart')).not.toBeInTheDocument()
})

test('clicking By Day switches content', () => {
  render(<StatsTab />)
  fireEvent.click(screen.getByRole('button', { name: /by day/i }))
  expect(screen.getByTestId('byday-chart')).toBeInTheDocument()
  expect(screen.queryByTestId('overview-chart')).not.toBeInTheDocument()
})

test('time filter change calls useStatsData with new filter', () => {
  render(<StatsTab />)
  fireEvent.click(screen.getByRole('button', { name: /this week/i }))
  expect(vi.mocked(useStatsData)).toHaveBeenCalledWith('week')
})
