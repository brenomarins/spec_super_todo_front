// src/features/notes/TaskPicker.tsx
import { useEffect } from 'react'
import type { Task } from '../../types'

interface TaskPickerProps {
  tasks: Task[]
  query: string
  position: { top: number; left: number }
  onSelect: (task: Task) => void
  onDismiss: () => void
}

export function TaskPicker({ tasks, query, position, onSelect, onDismiss }: TaskPickerProps) {
  const filtered = query
    ? tasks.filter(t => t.title.toLowerCase().includes(query.toLowerCase()))
    : tasks

  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onDismiss()
    }
    document.addEventListener('keydown', handleKey)
    return () => document.removeEventListener('keydown', handleKey)
  }, [onDismiss])

  return (
    <div
      style={{
        position: 'fixed', top: position.top, left: position.left, zIndex: 1000,
        background: 'var(--color-surface)', border: '1px solid var(--color-border)',
        borderRadius: 8, minWidth: 240, maxHeight: 240, overflowY: 'auto',
        boxShadow: '0 8px 24px rgba(0,0,0,0.4)',
      }}
      onMouseDown={e => e.preventDefault()}
    >
      {filtered.length === 0 ? (
        <div style={{ padding: '10px 14px', fontSize: 13, color: 'var(--color-text-muted)' }}>
          No tasks match "{query}"
        </div>
      ) : (
        filtered.slice(0, 10).map(task => (
          <div
            key={task.id}
            onClick={() => onSelect(task)}
            style={{
              padding: '8px 14px', cursor: 'pointer', fontSize: 13,
              display: 'flex', alignItems: 'center', gap: 8,
              borderBottom: '1px solid var(--color-border)',
            }}
          >
            <span style={{ color: task.completed ? 'var(--color-success)' : 'var(--color-text-muted)', fontSize: 11 }}>
              {task.completed ? '✓' : '○'}
            </span>
            <span style={{ textDecoration: task.completed ? 'line-through' : 'none' }}>
              {task.title}
            </span>
          </div>
        ))
      )}
    </div>
  )
}
