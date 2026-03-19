import { render, screen } from '@testing-library/react'
import { StatsOverview } from './StatsOverview'
import type { StatsData } from './useStatsData'

const baseData: StatsData = {
  totalMinutesFocused: 120,
  totalCompleted: 10,
  totalInterrupted: 2,
  completionRate: 0.83,
  weeklyTrend: [
    { label: 'Mar 10', hours: 1.5 },
    { label: 'Mar 17', hours: 2.0 },
  ],
  taskStats: [],
  dailyFocus: [],
}

test('renders total focused as Xh Ym', () => {
  render(<StatsOverview data={baseData} />)
  expect(screen.getByText('2h 0m')).toBeInTheDocument()
})

test('renders sessions completed count', () => {
  render(<StatsOverview data={baseData} />)
  expect(screen.getByText('10')).toBeInTheDocument()
})

test('renders sessions interrupted count', () => {
  render(<StatsOverview data={baseData} />)
  expect(screen.getByText('2')).toBeInTheDocument()
})

test('renders completion rate as percentage', () => {
  render(<StatsOverview data={baseData} />)
  expect(screen.getByText('83%')).toBeInTheDocument()
})

test('renders — when completionRate is null', () => {
  render(<StatsOverview data={{ ...baseData, completionRate: null }} />)
  expect(screen.getByText('—')).toBeInTheDocument()
})

test('renders chart container without crashing', () => {
  render(<StatsOverview data={baseData} />)
  // chart renders without throwing — no SVG assertions
  expect(screen.getByTestId('overview-chart')).toBeInTheDocument()
})
