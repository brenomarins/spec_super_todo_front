// src/features/notes/TaskChip.tsx
interface TaskChipProps {
  taskId: string
  taskTitle: string | null
  completed: boolean
  onClick: (id: string) => void
}

export function TaskChip({ taskId, taskTitle, completed, onClick }: TaskChipProps) {
  if (!taskTitle) {
    return (
      <span style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)',
        borderRadius: 4, padding: '1px 6px', fontSize: 12, color: 'var(--color-text-muted)',
        fontStyle: 'italic' }}>
        Deleted task
      </span>
    )
  }

  return (
    <span
      role="button"
      tabIndex={0}
      onClick={() => onClick(taskId)}
      onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') onClick(taskId) }}
      style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)',
        borderRadius: 4, padding: '1px 8px', fontSize: 12, cursor: 'pointer',
        color: 'var(--color-accent)', display: 'inline-flex', alignItems: 'center', gap: 4 }}
    >
      <span style={{ color: completed ? 'var(--color-success)' : 'var(--color-text-muted)' }}>
        {completed ? '✓' : '○'}
      </span>
      {taskTitle}
    </span>
  )
}
