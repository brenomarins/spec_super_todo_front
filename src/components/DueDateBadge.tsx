import { format } from 'date-fns'
import { todayISO } from '../lib/dateUtils'

interface DueDateBadgeProps {
  dueDate?: string       // ISO YYYY-MM-DD — if undefined, renders nothing
  completed: boolean
}

export function DueDateBadge({ dueDate, completed }: DueDateBadgeProps) {
  if (!dueDate) return null
  const today = todayISO()
  const isOverdue = !completed && dueDate < today
  // Use noon anchor to avoid UTC-offset display issues (e.g. Mar 15 showing as Mar 14)
  const label = format(new Date(dueDate + 'T12:00:00'), 'MMM d')

  return (
    <span style={{
      fontSize: 11,
      color: isOverdue ? 'var(--color-danger)' : 'var(--color-text-muted)',
      whiteSpace: 'nowrap',
    }}>
      {isOverdue ? `! ${label}` : label}
    </span>
  )
}
