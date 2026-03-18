// src/features/schedule/ScheduleTaskCard.tsx
import { useDraggable } from '@dnd-kit/core'
import type { Task, Tag } from '../../types'
import { TagBadge } from '../../components/TagBadge'
import { DueDateBadge } from '../../components/DueDateBadge'

interface ScheduleTaskCardProps {
  task: Task
  tags: Tag[]
  onClick: (id: string) => void
  onRemoveDay: (id: string) => void
}

export function ScheduleTaskCard({ task, tags, onClick, onRemoveDay }: ScheduleTaskCardProps) {
  const { attributes, listeners, setNodeRef, transform } = useDraggable({ id: task.id })
  const taskTags = tags.filter(t => task.tagIds.includes(t.id))
  const style = transform
    ? { transform: `translate(${transform.x}px, ${transform.y}px)`, zIndex: 100, opacity: 0.9 }
    : {}

  return (
    <div
      ref={setNodeRef}
      style={{
        background: 'var(--color-surface)', border: '1px solid var(--color-border)', borderRadius: 6,
        padding: '6px 8px', marginBottom: 4, position: 'relative', ...style,
      }}
    >
      <div {...attributes} {...listeners} style={{ cursor: 'grab' }}>
        <div
          role="button"
          tabIndex={0}
          onClick={() => onClick(task.id)}
          onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') onClick(task.id) }}
          style={{ fontSize: 12, cursor: 'pointer',
            textDecoration: task.completed ? 'line-through' : 'none',
            color: task.completed ? 'var(--color-text-muted)' : 'var(--color-text)' }}
        >
          {task.title}
        </div>
        {(taskTags.length > 0 || task.dueDate) && (
          <div style={{ display: 'flex', gap: 3, marginTop: 3, flexWrap: 'wrap', alignItems: 'center' }}>
            {taskTags.map(tag => <TagBadge key={tag.id} tag={tag} />)}
            <DueDateBadge dueDate={task.dueDate} completed={task.completed} />
          </div>
        )}
      </div>
      <button
        type="button"
        aria-label="remove from day"
        onClick={(e) => { e.stopPropagation(); onRemoveDay(task.id) }}
        style={{
          position: 'absolute', top: 4, right: 4, background: 'none', border: 'none',
          color: 'var(--color-text-muted)', cursor: 'pointer', fontSize: 14, lineHeight: 1,
        }}
      >
        ×
      </button>
    </div>
  )
}
