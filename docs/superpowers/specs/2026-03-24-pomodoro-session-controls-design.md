# Feature: Pomodoro Session Controls — Complete, Short Break, Long Break

**Date:** 2026-03-24
**Scope:** `src/store/pomodoroStore.ts`, `src/features/pomodoro/usePomodoro.ts`, `src/features/pomodoro/PomodoroTimer.tsx`, `src/features/home/HomeTab.tsx`

---

## Problem

The `PomodoroTimer` on the Home tab only shows a "Stop" button while a session is running. "Stop" calls `stopSession`, which interrupts work sessions (`api.interruptSession`) — there is no way to mark a work session as completed or to start a break session from the UI.

## Solution

Add three new actions to the timer controls:

- **Complete** — marks the current work session as completed (no break follows)
- **Short Break** — completes the current work session and starts a 5-minute short break
- **Long Break** — completes the current work session and starts a 15-minute long break

The existing "Stop" (interrupt) button is kept alongside these new buttons.

---

## Changes

### `src/store/pomodoroStore.ts`

Add `startBreakSession(type: 'short_break' | 'long_break', taskId?: string)` to the store interface and implementation.

**Logic:**
1. If there is an active session, complete it via `api.completeSession`. If the active session was a work session, increment `workSessionCount`.
2. Call `api.startBreakSession(type, taskId)` to start the break.
3. Set the returned session as `activeSession`.

```ts
startBreakSession: async (type: 'short_break' | 'long_break', taskId?: string) => {
  const { activeSession, workSessionCount } = get()
  if (activeSession) {
    await api.completeSession(activeSession.sessionId)
    if (activeSession.type === 'work') {
      set({ workSessionCount: workSessionCount + 1 })
    }
  }
  const session = await api.startBreakSession(type, taskId ?? undefined)
  set({
    activeSession: {
      sessionId: session.id,
      taskId: session.taskId,
      type: session.type,
      startedAt: session.startedAt,
    },
  })
},
```

The existing `completeSession` action (used by auto-complete on timer expiry) is unchanged.

### `src/features/pomodoro/usePomodoro.ts`

Expose two additional values from the store in the return object:

```ts
return {
  display: formatTime(secondsLeft),
  secondsLeft,
  isRunning: !!activeSession,
  activeSession,
  workSessionCount,
  startSession,
  stopSession,
  completeSession,       // ← new
  startBreakSession,     // ← new
}
```

### `src/features/pomodoro/PomodoroTimer.tsx`

Add `sessionType` prop and three new callback props:

```ts
interface PomodoroTimerProps {
  taskId: string | null
  taskTitle: string | null
  display: string
  isRunning: boolean
  sessionType: 'work' | 'short_break' | 'long_break' | null  // ← new
  workSessionCount: number
  onStart: (taskId: string) => void
  onStop: () => void
  onComplete: () => void       // ← new
  onShortBreak: () => void     // ← new
  onLongBreak: () => void      // ← new
}
```

**Button rendering by state:**

| State | Buttons |
|---|---|
| `sessionType === 'work'` | ✅ Complete · ☕ Short Break · 🌙 Long Break · ⏹ Stop |
| `sessionType` is a break type | ⏹ Stop |
| `!isRunning` | ▶ Start (disabled when `taskId` is null) |

The four work-session buttons are laid out in a row using `display: flex; gap: 8px; justify-content: center`.

### `src/features/home/HomeTab.tsx`

Destructure the two new values from `usePomodoro` and pass them to `PomodoroTimer`:

```tsx
const { display, isRunning, activeSession, workSessionCount,
        startSession, stopSession, completeSession, startBreakSession } = usePomodoro()

<PomodoroTimer
  ...existing props...
  sessionType={activeSession?.type ?? null}
  onComplete={completeSession}
  onShortBreak={() => startBreakSession('short_break', timerTaskId ?? undefined)}
  onLongBreak={() => startBreakSession('long_break', timerTaskId ?? undefined)}
/>
```

---

## What Does Not Change

- `usePomodoro` timer logic (countdown, auto-complete on expiry, beep) — unchanged
- Break session "Stop" behavior — `stopSession` already calls `api.completeSession` for break sessions
- `SessionDots` and pomodoro count display — unchanged
- All other tabs and components — unaffected

---

## Error Handling

All new async actions (`startBreakSession`, `completeSession`) follow the existing pattern: `apiFetch` shows a global toast on API errors and throws. No additional error handling is needed in the store or UI.

---

## Testing

- `pomodoroStore`: `startBreakSession` completes the active work session, increments `workSessionCount`, then starts the break and sets `activeSession` to the break session.
- `pomodoroStore`: `startBreakSession` with no active session skips the complete step and goes straight to starting the break.
- `pomodoroStore`: `startBreakSession` with an active break session completes it without incrementing `workSessionCount`.
- `PomodoroTimer`: renders Complete, Short Break, Long Break, and Stop buttons when `sessionType === 'work'`.
- `PomodoroTimer`: renders only Stop button when `sessionType === 'short_break'` or `'long_break'`.
- `PomodoroTimer`: renders Start button (disabled) when not running and no taskId.
- `HomeTab`: passes `sessionType` and the three new callbacks to `PomodoroTimer`.
