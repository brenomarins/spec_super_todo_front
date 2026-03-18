import type { Task, Tag } from '../../types'
import { TagBadge } from '../../components/TagBadge'

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
  const taskTags = tags.filter(t => task.tagIds.includes(t.id))

  return (
    <div style={{
      background: 'var(--color-surface)', border: `1px solid ${isActive ? 'var(--color-warning)' : 'var(--color-border)'}`,
      borderRadius: 6, padding: '8px 10px', display: 'flex', alignItems: 'flex-start', gap: 8,
    }}>
      {dragHandleProps && (
        <span {...dragHandleProps} style={{ cursor: 'grab', color: 'var(--color-text-muted)', fontSize: 16, paddingTop: 1 }}>
          ⠿
        </span>
      )}
      <input
        type="checkbox"
        checked={task.completed}
        onChange={() => onToggle(task.id)}
        style={{ marginTop: 2, cursor: 'pointer', accentColor: 'var(--color-success)' }}
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
      {onStartPomodoro && (
        <button
          type="button"
          aria-label="start pomodoro"
          onClick={(e) => { e.stopPropagation(); onStartPomodoro(task.id) }}
          title="Start Pomodoro"
          style={{ background: 'none', border: 'none', cursor: 'pointer',
            fontSize: 16, padding: '2px 4px', opacity: 0.5, lineHeight: 1 }}
          onMouseEnter={e => (e.currentTarget.style.opacity = '1')}
          onMouseLeave={e => (e.currentTarget.style.opacity = '0.5')}
        >
          🍅
        </button>
      )}
    </div>
  )
}
