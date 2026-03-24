type Tab = 'home' | 'tasks' | 'schedule' | 'notes' | 'stats' | 'tags'

interface Props {
  active: Tab
  onChange: (tab: Tab) => void
}

const TABS: { id: Tab; label: string }[] = [
  { id: 'home', label: 'Home' },
  { id: 'tasks', label: 'Tasks' },
  { id: 'schedule', label: 'Schedule' },
  { id: 'notes', label: 'Notes' },
  { id: 'stats', label: 'Stats' },
  { id: 'tags', label: 'Tags' },
]

export function TabBar({ active, onChange }: Props) {
  return (
    <nav style={{
      display: 'flex', borderBottom: '1px solid var(--color-border)',
      background: 'var(--color-surface)', padding: '0 16px',
    }}>
      {TABS.map(tab => (
        <button
          key={tab.id}
          onClick={() => onChange(tab.id)}
          style={{
            padding: '12px 16px', fontSize: 14,
            color: active === tab.id ? 'var(--color-accent)' : 'var(--color-text-muted)',
            borderBottom: active === tab.id ? '2px solid var(--color-accent)' : '2px solid transparent',
            marginBottom: -1,
          }}
        >
          {tab.label}
        </button>
      ))}
    </nav>
  )
}

export type { Tab }
