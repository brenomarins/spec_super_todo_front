import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts'
import type { StatsData } from './useStatsData'
import { formatMinutes } from './useStatsData'

interface Props {
  data: StatsData
}

export function StatsOverview({ data }: Props) {
  const { totalMinutesFocused, totalCompleted, totalInterrupted, completionRate, weeklyTrend } = data
  const rateDisplay = completionRate === null
    ? '—'
    : `${Math.round(completionRate * 100)}%`

  return (
    <div style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
      {/* Summary cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '8px' }}>
        <SummaryCard label="Total focused" value={formatMinutes(totalMinutesFocused)} />
        <SummaryCard label="Completed" value={String(totalCompleted)} />
        <SummaryCard label="Interrupted" value={String(totalInterrupted)} />
        <SummaryCard label="Completion rate" value={rateDisplay} />
      </div>

      {/* Weekly trend chart */}
      <div data-testid="overview-chart" style={{ height: 160 }}>
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={weeklyTrend} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
            <XAxis dataKey="label" tick={{ fontSize: 11 }} />
            <YAxis tick={{ fontSize: 11 }} unit="h" />
            <Tooltip formatter={(v: number) => [`${v.toFixed(1)}h`, 'Focus']} />
            <Bar dataKey="hours" fill="var(--color-accent)" radius={[3, 3, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}

function SummaryCard({ label, value }: { label: string; value: string }) {
  return (
    <div style={{
      background: 'var(--color-surface)', border: '1px solid var(--color-border)',
      borderRadius: 8, padding: '12px', textAlign: 'center',
    }}>
      <div style={{ fontSize: 22, fontWeight: 700, color: 'var(--color-accent)' }}>{value}</div>
      <div style={{ fontSize: 11, color: 'var(--color-text-muted)', textTransform: 'uppercase', marginTop: 4 }}>
        {label}
      </div>
    </div>
  )
}
