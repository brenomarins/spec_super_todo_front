// src/features/schedule/UnscheduledPanel.tsx
import { useState } from 'react'
import { useDraggable, useDroppable } from '@dnd-kit/core'
import type { Task, Tag } from '../../types'

function DraggableCard({ task, onTaskClick }: { task: Task; onTaskClick: (id: string) => void }) {
  const { attributes, listeners, setNodeRef, transform } = useDraggable({ id: `unscheduled-${task.id}` })
  const style = transform ? { transform: `translate(${transform.x}px, ${transform.y}px)` } : {}
  return (
    <div
      ref={setNodeRef}
      {...attributes}
      {...listeners}
      role="button"
      tabIndex={0}
      onClick={() => onTaskClick(task.id)}
      onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') onTaskClick(task.id) }}
      style={{
        background: 'var(--color-surface)', border: '1px solid var(--color-border)',
        borderRadius: 6, padding: '6px 10px', marginBottom: 4, cursor: 'grab', fontSize: 12, ...style,
      }}
    >
      {task.title}
    </div>
  )
}

interface UnscheduledPanelProps {
  tasks: Task[]
  tags: Tag[]
  onTaskClick: (id: string) => void
}

export function UnscheduledPanel({ tasks, onTaskClick }: UnscheduledPanelProps) {
  const [open, setOpen] = useState(true)
  const { setNodeRef, isOver } = useDroppable({ id: 'unscheduled' })

  return (
    <div style={{ width: 200, borderRight: '1px solid var(--color-border)', padding: '12px 8px', flexShrink: 0 }}>
      <button
        type="button"
        aria-label="unscheduled tasks"
        onClick={() => setOpen(!open)}
        style={{
          background: 'none', border: 'none', cursor: 'pointer', width: '100%',
          textAlign: 'left', display: 'flex', justifyContent: 'space-between',
          color: 'var(--color-text-muted)', fontSize: 11, fontWeight: 600,
          textTransform: 'uppercase', marginBottom: 8, padding: 0,
        }}
      >
        <span>Unscheduled ({tasks.length})</span>
        <span>{open ? '▲' : '▼'}</span>
      </button>
      {open && (
        <div
          ref={setNodeRef}
          style={{
            minHeight: 60,
            background: isOver ? 'var(--color-surface-2)' : 'transparent',
            borderRadius: 6,
          }}
        >
          {tasks.map(task => (
            <DraggableCard key={task.id} task={task} onTaskClick={onTaskClick} />
          ))}
        </div>
      )}
    </div>
  )
}
