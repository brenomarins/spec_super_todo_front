import { useState } from 'react'
import type { Task, Tag } from '../../types'
import { TagBadge } from '../../components/TagBadge'
import { DueDateBadge } from '../../components/DueDateBadge'

interface TaskItemProps {
  task: Task
  tags: Tag[]
  pomodoroCount: number
  isActive?: boolean
  onClick: (id: string) => void
  onToggle: (id: string) => void
  onStartPomodoro?: (id: string) => void
  dragHandleProps: Record<string, unknown> | null
}

export function TaskItem({ task, tags, pomodoroCount, isActive, onClick, onToggle, onStartPomodoro, dragHandleProps }: TaskItemProps) {
  const [hovered, setHovered] = useState(false)
  const taskTags = tags.filter(t => task.tagIds.includes(t.id))

  return (
    <div
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        background: task.completed ? 'var(--color-success-bg)' : hovered ? 'var(--color-surface-hover)' : 'var(--color-surface)',
        border: `1px solid ${
          isActive ? 'var(--color-warning)'
          : task.completed ? 'var(--color-success-border)'
          : hovered ? 'var(--color-border-hover)'
          : 'var(--color-border)'
        }`,
        borderRadius: 6, padding: '8px 10px', display: 'flex', alignItems: 'flex-start', gap: 8,
        boxShadow: hovered && !task.completed ? '0 1px 4px rgba(0,0,0,0.3)' : 'none',
        transition: 'background var(--transition-base), border-color var(--transition-base), box-shadow var(--transition-base)',
      }}
    >
      {dragHandleProps && (
        <span {...dragHandleProps} style={{ cursor: 'grab', color: 'var(--color-text-muted)', fontSize: 16, paddingTop: 1 }}>
          ⠿
        </span>
      )}
      <input
        type="checkbox"
        checked={task.completed}
        onChange={() => onToggle(task.id)}
        style={{
          marginTop: 2, cursor: 'pointer', accentColor: 'var(--color-success)',
          transition: `transform 200ms var(--ease-spring)`,
          transform: task.completed ? 'scale(1.15)' : 'scale(1)',
        }}
      />
      <div
        role="button"
        tabIndex={0}
        style={{ flex: 1, cursor: 'pointer' }}
        onClick={() => onClick(task.id)}
        onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') onClick(task.id) }}
      >
        <span style={{
          textDecoration: task.completed ? 'line-through' : 'none',
          color: task.completed ? 'var(--color-text-muted)' : 'var(--color-text)',
          fontSize: 14,
          display: 'block',
          transition: 'color var(--transition-base), opacity var(--transition-base), transform var(--transition-base)',
          opacity: task.completed ? 0.7 : 1,
          transform: task.completed ? 'translateX(3px)' : 'translateX(0)',
        }}>
          {isActive && <span style={{ marginRight: 4 }}>🍅</span>}
          {task.title}
        </span>
        {taskTags.length > 0 && (
          <div style={{ display: 'flex', gap: 4, marginTop: 4, flexWrap: 'wrap' }}>
            {taskTags.map(tag => <TagBadge key={tag.id} tag={tag} />)}
          </div>
        )}
      </div>
      {pomodoroCount > 0 && (
        <span style={{ fontSize: 12, color: 'var(--color-warning)', whiteSpace: 'nowrap' }}>
          🍅 {pomodoroCount}
        </span>
      )}
      <DueDateBadge dueDate={task.dueDate} completed={task.completed} />
      {onStartPomodoro && (
        <button
          type="button"
          aria-label="start pomodoro"
          onClick={(e) => { e.stopPropagation(); onStartPomodoro(task.id) }}
          title="Start Pomodoro"
          style={{
            background: 'none', border: 'none', cursor: 'pointer',
            fontSize: 16, padding: '2px 4px', lineHeight: 1,
            opacity: 0.35,
            transition: `opacity var(--transition-fast), transform 150ms var(--ease-spring)`,
          }}
          onMouseEnter={e => {
            e.currentTarget.style.opacity = '1'
            e.currentTarget.style.transform = 'scale(1.15)'
          }}
          onMouseLeave={e => {
            e.currentTarget.style.opacity = '0.35'
            e.currentTarget.style.transform = 'scale(1)'
          }}
        >
          🍅
        </button>
      )}
    </div>
  )
}
