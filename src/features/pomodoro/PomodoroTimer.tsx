import React from 'react'
import { SessionDots } from './SessionDots'

interface PomodoroTimerProps {
  taskId: string | null
  taskTitle: string | null
  display: string
  isRunning: boolean
  sessionType: 'work' | 'short_break' | 'long_break' | null
  workSessionCount: number
  onStart: (taskId: string) => void
  onStop: () => void
  onComplete: () => void
  onShortBreak: () => void
  onLongBreak: () => void
}

const btnBase: React.CSSProperties = {
  border: '1px solid var(--color-border)',
  padding: '6px 12px',
  borderRadius: 6,
  cursor: 'pointer',
  fontSize: 13,
  transition: 'transform var(--transition-fast), box-shadow var(--transition-fast)',
}

function HoverButton({ style, ...props }: React.ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      {...props}
      style={style}
      onMouseEnter={e => {
        e.currentTarget.style.transform = 'translateY(-1px)'
        const bg = (style as React.CSSProperties)?.background
        const shadow = bg === 'var(--color-success)'
          ? '0 3px 10px rgba(63,185,80,0.3)'
          : '0 2px 6px rgba(0,0,0,0.3)'
        e.currentTarget.style.boxShadow = shadow
      }}
      onMouseLeave={e => {
        e.currentTarget.style.transform = 'translateY(0)'
        e.currentTarget.style.boxShadow = 'none'
      }}
    />
  )
}

export function PomodoroTimer({
  taskId, taskTitle, display, isRunning, sessionType, workSessionCount,
  onStart, onStop, onComplete, onShortBreak, onLongBreak,
}: PomodoroTimerProps) {
  return (
    <div style={{
      background: 'var(--color-surface)', border: '1px solid var(--color-border)',
      borderRadius: 12, padding: 20, textAlign: 'center', maxWidth: 320, margin: '0 auto',
    }}>
      {taskTitle && (
        <div style={{ fontSize: 12, color: 'var(--color-text-muted)', marginBottom: 8, textTransform: 'uppercase' }}>
          {isRunning && <span>FOCUS — </span>}
          <span>{taskTitle}</span>
        </div>
      )}

      <div style={{
        fontSize: 52, fontWeight: 700, color: 'var(--color-warning)',
        fontVariantNumeric: 'tabular-nums', marginBottom: 12,
        animation: 'breathe 3s ease-in-out infinite',
      }}>
        {display}
      </div>

      <div style={{ display: 'flex', gap: 8, justifyContent: 'center', flexWrap: 'wrap', marginBottom: 12 }}>
        {sessionType === 'work' ? (
          <>
            <HoverButton type="button" onClick={onComplete}
              style={{ ...btnBase, background: 'var(--color-success)', color: '#fff', border: 'none' }}>
              ✅ Complete
            </HoverButton>
            <HoverButton type="button" onClick={onShortBreak}
              style={{ ...btnBase, background: 'var(--color-surface-2)', color: 'var(--color-text)' }}>
              ☕ Short Break
            </HoverButton>
            <HoverButton type="button" onClick={onLongBreak}
              style={{ ...btnBase, background: 'var(--color-surface-2)', color: 'var(--color-text)' }}>
              🌙 Long Break
            </HoverButton>
            <HoverButton type="button" onClick={onStop}
              style={{ ...btnBase, background: 'var(--color-surface-2)', color: 'var(--color-text)' }}>
              ⏹ Stop
            </HoverButton>
          </>
        ) : isRunning ? (
          <HoverButton type="button" onClick={onStop}
            style={{ ...btnBase, background: 'var(--color-surface-2)', color: 'var(--color-text)' }}>
            ⏹ Stop
          </HoverButton>
        ) : (
          <HoverButton
            type="button"
            onClick={() => taskId && onStart(taskId)}
            disabled={!taskId}
            style={{
              background: 'var(--color-success)', border: 'none', color: '#fff',
              padding: '6px 16px', borderRadius: 6,
              cursor: taskId ? 'pointer' : 'default',
              fontSize: 13, opacity: taskId ? 1 : 0.5,
              transition: 'transform var(--transition-fast), box-shadow var(--transition-fast)',
            }}
          >
            ▶ Start
          </HoverButton>
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
