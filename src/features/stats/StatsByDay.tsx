import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts'
import { format } from 'date-fns'
import type { StatsData, TimeFilter } from './useStatsData'

interface Props {
  data: StatsData
  filter: TimeFilter
}

function formatXLabel(date: string, filter: TimeFilter): string {
  if (filter === 'today') return date // already a hour string like "9"
  if (filter === 'week') {
    // date is YYYY-MM-DD, format as EEE
    return format(new Date(date + 'T12:00:00'), 'EEE')
  }
  // all-time: YYYY-MM-DD → MMM d
  return format(new Date(date + 'T12:00:00'), 'MMM d')
}

export function StatsByDay({ data, filter }: Props) {
  const { dailyFocus } = data

  const chartData = dailyFocus.map(d => ({
    label: formatXLabel(d.date, filter),
    hours: d.hours,
  }))

  return (
    <div style={{ padding: '16px' }}>
      <div data-testid="byday-chart" style={{ height: 220 }}>
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={chartData} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
            <XAxis
              dataKey="label"
              tick={{ fontSize: 10 }}
              interval={filter === 'all' ? 4 : 0}
            />
            <YAxis tick={{ fontSize: 11 }} unit="h" />
            <Tooltip formatter={(v: number) => [`${v.toFixed(1)}h`, 'Focus']} />
            <Bar dataKey="hours" fill="var(--color-accent)" radius={[3, 3, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}
