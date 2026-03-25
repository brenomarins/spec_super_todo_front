import { useTheme } from '../lib/useTheme'

type Tab = 'home' | 'tasks' | 'schedule' | 'notes' | 'stats' | 'tags'

interface Props {
  active: Tab
  onChange: (tab: Tab) => void
}

const TABS: { id: Tab; label: string }[] = [
  { id: 'home',     label: 'Home' },
  { id: 'tasks',    label: 'Tasks' },
  { id: 'schedule', label: 'Schedule' },
  { id: 'notes',    label: 'Notes' },
  { id: 'stats',    label: 'Stats' },
  { id: 'tags',     label: 'Tags' },
]

export function TabBar({ active, onChange }: Props) {
  const { theme, toggleTheme } = useTheme()

  return (
    <nav style={{
      display: 'flex', alignItems: 'center',
      borderBottom: '1px solid var(--color-border)',
      background: 'var(--color-surface)', padding: '0 12px',
    }}>
      {TABS.map(tab => (
        <button
          key={tab.id}
          onClick={() => onChange(tab.id)}
          className={active === tab.id ? 'tab-active' : undefined}
          style={{
            padding: '12px 14px', fontSize: 14,
            color: active === tab.id ? 'var(--color-text)' : 'var(--color-text-muted)',
            transition: 'color var(--transition-base)',
          }}
        >
          {tab.label}
        </button>
      ))}

      <button
        type="button"
        aria-label={theme === 'dark' ? 'Switch to light theme' : 'Switch to dark theme'}
        onClick={toggleTheme}
        style={{
          marginLeft: 'auto',
          width: 28, height: 28,
          borderRadius: 'var(--radius-md)',
          border: '1px solid var(--color-border)',
          background: 'var(--color-surface-2)',
          fontSize: 14, cursor: 'pointer', lineHeight: 1,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          transition: `background var(--transition-fast), transform 150ms var(--ease-spring)`,
        }}
        onMouseEnter={e => {
          e.currentTarget.style.background = 'var(--color-surface-hover)'
          e.currentTarget.style.transform = 'scale(1.08)'
        }}
        onMouseLeave={e => {
          e.currentTarget.style.background = 'var(--color-surface-2)'
          e.currentTarget.style.transform = 'scale(1)'
        }}
      >
        {theme === 'dark' ? '☀️' : '🌙'}
      </button>
    </nav>
  )
}

export type { Tab }
