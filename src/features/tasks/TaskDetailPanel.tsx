import { useState, useEffect } from 'react'
import { format } from 'date-fns'
import { AddTaskInput } from './AddTaskInput'
import { SubtaskItem } from './SubtaskItem'
import { TagInput } from '../tags/TagInput'
import type { Task, Tag, Note, PomodoroSession, PomodoroStats } from '../../types'

interface TaskDetailPanelProps {
  task: Task
  subtasks: Task[]
  tags: Tag[]
  allTags: Tag[]
  linkedNotes: Note[]
  pomodoroStats: PomodoroStats | null
  sessions: PomodoroSession[]
  onClose: () => void
  onUpdate: (partial: Partial<Task> & { id: string }) => void
  onAddSubtask: (parentId: string, title: string) => void
  onTagChange: (ids: string[]) => void
  onTagCreate: (name: string) => void
}

export function TaskDetailPanel({
  task, subtasks, tags, allTags, linkedNotes, pomodoroStats, sessions,
  onClose, onUpdate, onAddSubtask, onTagChange, onTagCreate,
}: TaskDetailPanelProps) {
  const [title, setTitle] = useState(task.title)
  const [description, setDescription] = useState(task.description ?? '')

  useEffect(() => {
    setTitle(task.title)
    setDescription(task.description ?? '')
  }, [task.id])

  const workSessions = sessions.filter(s => s.type === 'work')

  return (
    <aside style={{
      width: 360, borderLeft: '1px solid var(--color-border)', background: 'var(--color-bg)',
      padding: 20, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 16,
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span style={{ fontWeight: 600, fontSize: 15 }}>Task Detail</span>
        <button type="button" aria-label="close" onClick={onClose}
          style={{ background: 'none', border: 'none', color: 'var(--color-text-muted)', cursor: 'pointer', fontSize: 18 }}>
          ×
        </button>
      </div>

      <input
        value={title}
        onChange={e => setTitle(e.target.value)}
        onBlur={() => { if (title.trim() && title !== task.title) onUpdate({ id: task.id, title: title.trim() }) }}
        style={{ fontSize: 16, fontWeight: 600, background: 'transparent', border: 'none',
          borderBottom: '1px solid var(--color-border)', color: 'var(--color-text)', outline: 'none',
          padding: '4px 0', width: '100%' }}
      />

      <textarea
        value={description}
        onChange={e => setDescription(e.target.value)}
        onBlur={() => { if (description !== (task.description ?? '')) onUpdate({ id: task.id, description }) }}
        placeholder="Add description..."
        rows={3}
        style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)', borderRadius: 6,
          color: 'var(--color-text)', padding: 8, fontSize: 13, resize: 'vertical', outline: 'none' }}
      />

      <div>
        <div style={{ fontSize: 11, color: 'var(--color-text-muted)', marginBottom: 6, textTransform: 'uppercase' }}>Tags</div>
        <TagInput allTags={allTags} selectedIds={task.tagIds} onChange={onTagChange} onTagCreate={onTagCreate} />
      </div>

      <div>
        <div style={{ fontSize: 11, color: 'var(--color-text-muted)', marginBottom: 6, textTransform: 'uppercase' }}>Scheduled Day</div>
        <input
          type="date"
          value={task.scheduledDay ?? ''}
          onChange={e => onUpdate({ id: task.id, scheduledDay: e.target.value || undefined })}
          style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)', borderRadius: 6,
            color: 'var(--color-text)', padding: '5px 8px', fontSize: 13, outline: 'none' }}
        />
      </div>

      <div>
        <div style={{ fontSize: 11, color: 'var(--color-text-muted)', marginBottom: 6, textTransform: 'uppercase' }}>Subtasks</div>
        {subtasks.map(sub => (
          <SubtaskItem key={sub.id} task={sub} onClick={() => {}} onToggle={(id) => onUpdate({ id, completed: !sub.completed })} />
        ))}
        <AddTaskInput onAdd={(t) => onAddSubtask(task.id, t)} placeholder="+ Add subtask..." />
      </div>

      {pomodoroStats && (
        <div>
          <div style={{ fontSize: 11, color: 'var(--color-text-muted)', marginBottom: 8, textTransform: 'uppercase' }}>Pomodoro Stats</div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
            {[
              ['Started', pomodoroStats.totalStarted],
              ['Completed', pomodoroStats.totalCompleted],
              ['Interrupted', pomodoroStats.totalInterrupted],
              ['Min focused', pomodoroStats.totalMinutesFocused],
            ].map(([label, val]) => (
              <div key={String(label)} style={{ background: 'var(--color-surface)', borderRadius: 6, padding: 8 }}>
                <div style={{ fontSize: 18, fontWeight: 700, color: 'var(--color-accent)' }}>{val}</div>
                <div style={{ fontSize: 11, color: 'var(--color-text-muted)' }}>{label}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {workSessions.length > 0 && (
        <div>
          <div style={{ fontSize: 11, color: 'var(--color-text-muted)', marginBottom: 6, textTransform: 'uppercase' }}>Session History</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            {workSessions.map(s => (
              <div key={s.id} style={{ background: 'var(--color-surface)', borderRadius: 6, padding: '6px 10px',
                display: 'flex', justifyContent: 'space-between', fontSize: 12 }}>
                <span style={{ color: 'var(--color-text-muted)' }}>
                  {format(new Date(s.startedAt), 'MMM d, HH:mm')}
                </span>
                <span style={{ color: s.completedAt ? 'var(--color-success)' : 'var(--color-text-muted)' }}>
                  {s.completedAt ? 'Completed' : 'Interrupted'}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {linkedNotes.length > 0 && (
        <div>
          <div style={{ fontSize: 11, color: 'var(--color-text-muted)', marginBottom: 6, textTransform: 'uppercase' }}>Referenced in Notes</div>
          {linkedNotes.map(note => (
            <div key={note.id} style={{ fontSize: 13, color: 'var(--color-accent)', padding: '4px 0' }}>{note.title}</div>
          ))}
        </div>
      )}
    </aside>
  )
}
