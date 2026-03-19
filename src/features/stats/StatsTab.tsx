import { useState } from 'react'
import { useStatsData, type TimeFilter } from './useStatsData'
import { StatsOverview } from './StatsOverview'
import { StatsByTask } from './StatsByTask'
import { StatsByDay } from './StatsByDay'

type SubTab = 'overview' | 'task' | 'day'

const TIME_FILTERS: { id: TimeFilter; label: string }[] = [
  { id: 'all', label: 'All time' },
  { id: 'week', label: 'This week' },
  { id: 'today', label: 'Today' },
]

const SUB_TABS: { id: SubTab; label: string }[] = [
  { id: 'overview', label: 'Overview' },
  { id: 'task', label: 'By task' },
  { id: 'day', label: 'By day' },
]

export function StatsTab() {
  const [filter, setFilter] = useState<TimeFilter>('all')
  const [subTab, setSubTab] = useState<SubTab>('overview')
  const data = useStatsData(filter)

  return (
    <div data-testid="stats-tab" style={{ display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden' }}>
      {/* Time filter pills */}
      <div style={{ display: 'flex', gap: '8px', padding: '12px 16px', borderBottom: '1px solid var(--color-border)' }}>
        {TIME_FILTERS.map(f => (
          <button
            key={f.id}
            role="button"
            aria-pressed={filter === f.id}
            onClick={() => setFilter(f.id)}
            style={{
              padding: '4px 14px', borderRadius: 20, fontSize: 13, cursor: 'pointer',
              background: filter === f.id ? 'var(--color-accent)' : 'transparent',
              color: filter === f.id ? '#fff' : 'var(--color-text-muted)',
              border: filter === f.id ? 'none' : '1px solid var(--color-border)',
            }}
          >
            {f.label}
          </button>
        ))}
      </div>

      {/* Sub-tab switcher */}
      <div style={{ display: 'flex', gap: '4px', padding: '8px 16px', borderBottom: '1px solid var(--color-border)' }}>
        {SUB_TABS.map(s => (
          <button
            key={s.id}
            role="button"
            aria-pressed={subTab === s.id}
            onClick={() => setSubTab(s.id)}
            style={{
              padding: '6px 16px', fontSize: 13, cursor: 'pointer', borderRadius: 6,
              background: subTab === s.id ? 'var(--color-accent)' : 'transparent',
              color: subTab === s.id ? '#fff' : 'var(--color-text-muted)',
              border: subTab === s.id ? 'none' : '1px solid var(--color-border)',
              fontWeight: subTab === s.id ? 600 : 400,
            }}
          >
            {s.label}
          </button>
        ))}
      </div>

      {/* Sub-tab content */}
      <div style={{ flex: 1, overflow: 'auto' }}>
        {subTab === 'overview' && <StatsOverview data={data} />}
        {subTab === 'task' && <StatsByTask data={data} />}
        {subTab === 'day' && <StatsByDay data={data} filter={filter} />}
      </div>
    </div>
  )
}
