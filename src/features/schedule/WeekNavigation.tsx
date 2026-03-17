// src/features/schedule/WeekNavigation.tsx
import { format, addDays } from 'date-fns'

interface WeekNavigationProps {
  weekStart: Date
  onPrev: () => void
  onNext: () => void
}

export function WeekNavigation({ weekStart, onPrev, onNext }: WeekNavigationProps) {
  // Re-interpret as local noon to avoid UTC-offset issues
  const localStart = new Date(weekStart.getUTCFullYear(), weekStart.getUTCMonth(), weekStart.getUTCDate(), 12, 0, 0)
  const weekEnd = addDays(localStart, 6)
  const label = `${format(localStart, 'MMM d')} – ${format(weekEnd, 'MMM d, yyyy')}`

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
      <button
        aria-label="previous week"
        onClick={onPrev}
        style={{ background: 'none', border: '1px solid var(--color-border)', borderRadius: 6,
          color: 'var(--color-text)', padding: '4px 10px', cursor: 'pointer' }}
      >
        ←
      </button>
      <span style={{ fontSize: 14, fontWeight: 600, minWidth: 160, textAlign: 'center' }}>{label}</span>
      <button
        aria-label="next week"
        onClick={onNext}
        style={{ background: 'none', border: '1px solid var(--color-border)', borderRadius: 6,
          color: 'var(--color-text)', padding: '4px 10px', cursor: 'pointer' }}
      >
        →
      </button>
    </div>
  )
}
