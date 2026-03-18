import { useTaskStore } from '../../store/taskStore'
import { useTagStore } from '../../store/tagStore'
import { usePomodoro } from '../pomodoro/usePomodoro'
import { PomodoroTimer } from '../pomodoro/PomodoroTimer'
import { EmptyState } from '../../components/EmptyState'
import { todayISO } from '../../lib/dateUtils'
import type { Task } from '../../types'

export function HomeTab() {
  const { tasks } = useTaskStore()
  const { tags } = useTagStore()
  const { display, isRunning, activeSession, workSessionCount, startSession, stopSession } = usePomodoro()

  const today = todayISO()
  const todayTasks = tasks.filter((t: Task) => t.scheduledDay === today && !t.parentId)

  const timerTaskId = activeSession?.taskId ?? null
  const timerTask = timerTaskId ? tasks.find((t: Task) => t.id === timerTaskId) ?? null : null

  return (
    <div style={{ padding: 16, overflowY: 'auto', height: '100%', display: 'flex', flexDirection: 'column', gap: 16 }}>

      <section>
        <PomodoroTimer
          taskId={timerTaskId}
          taskTitle={timerTask?.title ?? null}
          display={display}
          isRunning={isRunning}
          workSessionCount={workSessionCount}
          onStart={startSession}
          onStop={stopSession}
        />

        {!isRunning && !timerTaskId && (
          <div style={{ marginTop: 8 }}>
            <EmptyState message="No active timer — pick a task below to start a Pomodoro session." />
          </div>
        )}
      </section>

      <section>
        <h2 style={{ fontSize: 14, fontWeight: 600, color: 'var(--color-text-muted)', marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
          Today
        </h2>

        {todayTasks.length === 0 ? (
          <EmptyState message="Nothing scheduled for today — assign tasks a date in the Schedule tab." />
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            {todayTasks.map((task: Task) => {
              const taskTags = tags.filter(tg => task.tagIds.includes(tg.id))
              return (
                <div
                  key={task.id}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 8,
                    padding: '8px 12px',
                    background: 'var(--color-surface)',
                    border: '1px solid var(--color-border)',
                    borderRadius: 8,
                  }}
                >
                  <span
                    style={{
                      fontSize: 13,
                      color: task.completed ? 'var(--color-text-muted)' : 'var(--color-text)',
                      textDecoration: task.completed ? 'line-through' : 'none',
                      flex: 1,
                    }}
                  >
                    {task.title}
                  </span>

                  {taskTags.map(tag => (
                    <span
                      key={tag.id}
                      style={{
                        fontSize: 11,
                        padding: '2px 6px',
                        borderRadius: 4,
                        background: tag.color + '22',
                        color: tag.color,
                      }}
                    >
                      {tag.name}
                    </span>
                  ))}

                  <button
                    type="button"
                    title="Start Pomodoro"
                    onClick={() => startSession(task.id)}
                    style={{
                      background: 'none',
                      border: 'none',
                      cursor: 'pointer',
                      fontSize: 16,
                      padding: '2px 4px',
                      lineHeight: 1,
                    }}
                  >
                    🍅
                  </button>
                </div>
              )
            })}
          </div>
        )}
      </section>
    </div>
  )
}
