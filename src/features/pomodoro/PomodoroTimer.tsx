import { SessionDots } from './SessionDots'

interface PomodoroTimerProps {
  taskId: string | null
  taskTitle: string | null
  display: string
  isRunning: boolean
  workSessionCount: number
  onStart: (taskId: string) => void
  onStop: () => void
}

export function PomodoroTimer({ taskId, taskTitle, display, isRunning, workSessionCount, onStart, onStop }: PomodoroTimerProps) {
  return (
    <div style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)',
      borderRadius: 12, padding: 20, textAlign: 'center', maxWidth: 320, margin: '0 auto' }}>

      {taskTitle && (
        <div style={{ fontSize: 12, color: 'var(--color-text-muted)', marginBottom: 8, textTransform: 'uppercase' }}>
          {isRunning && <span>FOCUS — </span>}
          <span>{taskTitle}</span>
        </div>
      )}

      <div style={{ fontSize: 52, fontWeight: 700, color: 'var(--color-warning)',
        fontVariantNumeric: 'tabular-nums', marginBottom: 12 }}>
        {display}
      </div>

      <div style={{ display: 'flex', gap: 8, justifyContent: 'center', marginBottom: 12 }}>
        {isRunning ? (
          <button
            type="button"
            onClick={onStop}
            style={{ background: 'var(--color-surface-2)', border: '1px solid var(--color-border)',
              color: 'var(--color-text)', padding: '6px 16px', borderRadius: 6,
              cursor: 'pointer', fontSize: 13 }}
          >
            ⏹ Stop
          </button>
        ) : (
          <button
            type="button"
            onClick={() => taskId && onStart(taskId)}
            disabled={!taskId}
            style={{ background: 'var(--color-success)', border: 'none', color: '#fff',
              padding: '6px 16px', borderRadius: 6,
              cursor: taskId ? 'pointer' : 'default',
              fontSize: 13, opacity: taskId ? 1 : 0.5 }}
          >
            ▶ Start
          </button>
        )}
      </div>

      <SessionDots count={workSessionCount} />

      {workSessionCount > 0 && (
        <div style={{ fontSize: 11, color: 'var(--color-text-muted)', marginTop: 6 }}>
          {workSessionCount % 4} of 4 pomodoros
        </div>
      )}
    </div>
  )
}
