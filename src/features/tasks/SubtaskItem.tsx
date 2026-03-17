import type { Task } from '../../types'

interface SubtaskItemProps {
  task: Task
  onClick: (id: string) => void
  onToggle: (id: string) => void
}

export function SubtaskItem({ task, onClick, onToggle }: SubtaskItemProps) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '4px 0' }}>
      <input
        type="checkbox"
        checked={task.completed}
        onChange={() => onToggle(task.id)}
        style={{ cursor: 'pointer', accentColor: 'var(--color-success)' }}
      />
      <span
        role="button"
        tabIndex={0}
        onClick={() => onClick(task.id)}
        onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') onClick(task.id) }}
        style={{
          cursor: 'pointer', fontSize: 13,
          textDecoration: task.completed ? 'line-through' : 'none',
          color: task.completed ? 'var(--color-text-muted)' : 'var(--color-text)',
        }}
      >
        {task.title}
      </span>
    </div>
  )
}
