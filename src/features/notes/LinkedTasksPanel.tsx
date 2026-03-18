// src/features/notes/LinkedTasksPanel.tsx
import type { Task } from '../../types'

interface LinkedTasksPanelProps {
  tasks: Task[]
  onTaskClick: (id: string) => void
}

export function LinkedTasksPanel({ tasks, onTaskClick }: LinkedTasksPanelProps) {
  if (tasks.length === 0) return null

  return (
    <div style={{ borderTop: '1px solid var(--color-border)', paddingTop: 12, marginTop: 8 }}>
      <div style={{ fontSize: 11, color: 'var(--color-text-muted)', fontWeight: 600,
        textTransform: 'uppercase', marginBottom: 8 }}>
        Linked Tasks
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
        {tasks.map(task => (
          <div
            key={task.id}
            onClick={() => onTaskClick(task.id)}
            style={{
              display: 'flex', alignItems: 'center', gap: 8,
              padding: '6px 10px', borderRadius: 6, cursor: 'pointer',
              background: 'var(--color-surface)',
              fontSize: 13,
            }}
          >
            <span style={{ color: task.completed ? 'var(--color-success)' : 'var(--color-text-muted)', fontSize: 11 }}>
              {task.completed ? '✓' : '○'}
            </span>
            <span style={{ textDecoration: task.completed ? 'line-through' : 'none',
              color: task.completed ? 'var(--color-text-muted)' : 'var(--color-text)' }}>
              {task.title}
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}
