import type { StatsData } from './useStatsData'
import { formatMinutes } from './useStatsData'

interface Props {
  data: StatsData
}

export function StatsByTask({ data }: Props) {
  const { taskStats } = data

  if (taskStats.length === 0) {
    return (
      <div style={{ padding: '32px', textAlign: 'center', color: 'var(--color-text-muted)' }}>
        No data for this period.
      </div>
    )
  }

  return (
    <div style={{ padding: '16px', overflowX: 'auto' }}>
      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 14 }}>
        <thead>
          <tr style={{ borderBottom: '1px solid var(--color-border)' }}>
            <th style={{ textAlign: 'left', padding: '8px 4px', color: 'var(--color-text-muted)', fontWeight: 500 }}>Task</th>
            <th style={{ textAlign: 'right', padding: '8px 4px', color: 'var(--color-text-muted)', fontWeight: 500 }}>Focused</th>
            <th style={{ textAlign: 'right', padding: '8px 4px', color: 'var(--color-text-muted)', fontWeight: 500 }}>Done</th>
            <th style={{ textAlign: 'right', padding: '8px 4px', color: 'var(--color-text-muted)', fontWeight: 500 }}>Stopped</th>
            <th style={{ textAlign: 'right', padding: '8px 4px', color: 'var(--color-text-muted)', fontWeight: 500 }}>Stop rate</th>
          </tr>
        </thead>
        <tbody>
          {taskStats.map(t => (
            <tr key={t.taskId} style={{ borderBottom: '1px solid var(--color-border)' }}>
              <td style={{ padding: '10px 4px' }}>{t.title}</td>
              <td style={{ padding: '10px 4px', textAlign: 'right', color: 'var(--color-accent)' }}>
                {formatMinutes(t.minutesFocused)}
              </td>
              <td style={{ padding: '10px 4px', textAlign: 'right' }}>{t.completed}</td>
              <td style={{ padding: '10px 4px', textAlign: 'right' }}>{t.interrupted}</td>
              <td style={{ padding: '10px 4px', textAlign: 'right', color: 'var(--color-text-muted)' }}>
                {t.started === 0 ? '—' : `${Math.round((t.interrupted / t.started) * 100)}%`}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
