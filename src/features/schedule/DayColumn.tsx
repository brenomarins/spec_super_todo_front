// src/features/schedule/DayColumn.tsx
import { useDroppable } from '@dnd-kit/core'
import { ScheduleTaskCard } from './ScheduleTaskCard'
import type { Task, Tag } from '../../types'

interface DayColumnProps {
  day: string
  label: string
  tasks: Task[]
  tags: Tag[]
  onTaskClick: (id: string) => void
  onRemoveDay: (id: string) => void
  isToday?: boolean
}

export function DayColumn({ day, label, tasks, tags, onTaskClick, onRemoveDay, isToday }: DayColumnProps) {
  const { setNodeRef, isOver } = useDroppable({ id: `day-${day}` })

  return (
    <div
      ref={setNodeRef}
      data-testid={`day-column-${day}`}
      style={{
        flex: 1, minWidth: 0,
        background: isOver ? 'var(--color-surface-2)' : 'transparent',
        borderRadius: 8, padding: 8,
        border: tasks.length === 0 ? '1px dashed var(--color-border)' : '1px solid transparent',
        minHeight: 120, transition: 'background 0.1s',
      }}
    >
      <div style={{ fontSize: 11, fontWeight: 600, marginBottom: 8, textAlign: 'center',
        color: isToday ? 'var(--color-accent)' : 'var(--color-text-muted)' }}>
        {label}
      </div>
      {tasks.map(task => (
        <ScheduleTaskCard
          key={task.id}
          task={task}
          tags={tags}
          onClick={onTaskClick}
          onRemoveDay={onRemoveDay}
        />
      ))}
    </div>
  )
}
