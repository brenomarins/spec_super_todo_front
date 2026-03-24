# Pomodoro Session Controls Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add Complete, Short Break, and Long Break buttons to the Pomodoro timer on the Home tab alongside the existing Stop button.

**Architecture:** Four sequential changes: (1) add `startBreakSession` action to the Zustand store, (2) expose `completeSession` and `startBreakSession` from the `usePomodoro` hook, (3) extend `PomodoroTimer` with a `sessionType` prop and new buttons, (4) wire the new props in `HomeTab`.

**Tech Stack:** React, TypeScript, Zustand, Vitest, @testing-library/react

---

## Chunk 1: Store, Hook, Timer, and HomeTab

### Task 1: Add `startBreakSession` to pomodoroStore

**Files:**
- Modify: `src/store/pomodoroStore.ts`
- Test: `src/store/__tests__/pomodoroStore.test.ts`

Background: The store already has `startSession`, `stopSession`, and `completeSession`. `startBreakSession` follows the same pattern — it optionally ends the current session first, then starts a new break session via the API.

The API function `startBreakSession` lives in `src/api/sessions.ts`:
```ts
export const startBreakSession = (type: 'short_break' | 'long_break', taskId?: string) =>
  apiFetch<PomodoroSession>('/sessions/break', { method: 'POST', body: JSON.stringify({ type, ...(taskId ? { taskId } : {}) }) })
```

- [ ] **Step 1: Write the failing tests**

Replace the full contents of `src/store/__tests__/pomodoroStore.test.ts` with:

```ts
import { act } from '@testing-library/react'
import { vi, beforeEach, describe, it, expect } from 'vitest'
import { usePomodoroStore } from '../pomodoroStore'

// Mock the sessions API so no real HTTP calls are made
vi.mock('../../api/sessions', () => ({
  interruptSession: vi.fn().mockResolvedValue(undefined),
  completeSession: vi.fn().mockResolvedValue(undefined),
  startWorkSession: vi.fn().mockResolvedValue({
    id: 'w1', taskId: 't1', type: 'work', startedAt: new Date().toISOString(),
    completedAt: null, durationMinutes: 25, isOpen: 1,
  }),
  startBreakSession: vi.fn().mockResolvedValue({
    // The mock always returns short_break regardless of the type arg; tests only
    // assert on side-effects (count, completeSession calls), not the returned type.
    id: 'b1', taskId: undefined, type: 'short_break', startedAt: new Date().toISOString(),
    completedAt: null, durationMinutes: 5, isOpen: 1,
  }),
}))

import * as sessionsApi from '../../api/sessions'

describe('pomodoroStore', () => {
  beforeEach(() => {
    usePomodoroStore.setState({ activeSession: null, workSessionCount: 0 })
    vi.clearAllMocks()  // reset call counts between tests
  })

  it('setActiveSession sets active session', () => {
    act(() => {
      usePomodoroStore.getState().setActiveSession({
        taskId: 't1', sessionId: 's1',
        startedAt: new Date().toISOString(), type: 'work',
      })
    })
    expect(usePomodoroStore.getState().activeSession?.taskId).toBe('t1')
  })

  it('clearActiveSession nulls out the session', () => {
    act(() => {
      usePomodoroStore.getState().setActiveSession({
        taskId: 't1', sessionId: 's1',
        startedAt: new Date().toISOString(), type: 'work',
      })
      usePomodoroStore.getState().clearActiveSession()
    })
    expect(usePomodoroStore.getState().activeSession).toBeNull()
  })

  it('incrementWorkSessionCount increments counter', () => {
    act(() => {
      usePomodoroStore.getState().incrementWorkSessionCount()
      usePomodoroStore.getState().incrementWorkSessionCount()
    })
    expect(usePomodoroStore.getState().workSessionCount).toBe(2)
  })

  it('startBreakSession with active work session: completes work session, increments count, starts break', async () => {
    usePomodoroStore.setState({
      activeSession: { sessionId: 's1', taskId: 't1', type: 'work', startedAt: new Date().toISOString() },
      workSessionCount: 2,
    })
    await act(async () => {
      await usePomodoroStore.getState().startBreakSession('short_break', 't1')
    })
    expect(sessionsApi.completeSession).toHaveBeenCalledWith('s1')
    expect(usePomodoroStore.getState().workSessionCount).toBe(3)
    expect(usePomodoroStore.getState().activeSession?.type).toBe('short_break')
    expect(usePomodoroStore.getState().activeSession?.sessionId).toBe('b1')
  })

  it('startBreakSession with no active session: skips complete, starts break', async () => {
    usePomodoroStore.setState({ activeSession: null, workSessionCount: 0 })
    await act(async () => {
      await usePomodoroStore.getState().startBreakSession('long_break')
    })
    expect(sessionsApi.completeSession).not.toHaveBeenCalled()
    expect(usePomodoroStore.getState().workSessionCount).toBe(0)
  })

  it('startBreakSession with active break session: completes it, does NOT increment count', async () => {
    usePomodoroStore.setState({
      activeSession: { sessionId: 'b0', taskId: undefined, type: 'short_break', startedAt: new Date().toISOString() },
      workSessionCount: 1,
    })
    await act(async () => {
      await usePomodoroStore.getState().startBreakSession('long_break')
    })
    expect(sessionsApi.completeSession).toHaveBeenCalledWith('b0')
    expect(usePomodoroStore.getState().workSessionCount).toBe(1) // unchanged
  })
})
```

- [ ] **Step 2: Run the tests — verify they fail**

```bash
npx vitest run src/store/__tests__/pomodoroStore.test.ts
```

Expected: new tests FAIL with "startBreakSession is not a function" or similar.

- [ ] **Step 3: Implement `startBreakSession` in the store**

In `src/store/pomodoroStore.ts`, add `startBreakSession` to the interface and implementation.

Full updated file:

```ts
// src/store/pomodoroStore.ts
import { create } from 'zustand'
import * as api from '../api/sessions'

interface ActiveSession {
  taskId?: string
  sessionId: string
  startedAt: string
  type: 'work' | 'short_break' | 'long_break'
}

interface PomodoroStore {
  activeSession: ActiveSession | null
  workSessionCount: number        // resets on page reload; intentional
  setActiveSession: (session: ActiveSession) => void
  clearActiveSession: () => void
  incrementWorkSessionCount: () => void
  startSession: (taskId: string) => Promise<void>
  stopSession: () => Promise<void>
  completeSession: () => Promise<void>
  startBreakSession: (type: 'short_break' | 'long_break', taskId?: string) => Promise<void>
}

export const usePomodoroStore = create<PomodoroStore>((set, get) => ({
  activeSession: null,
  workSessionCount: 0,
  setActiveSession: session => set({ activeSession: session }),
  clearActiveSession: () => set({ activeSession: null }),
  incrementWorkSessionCount: () => set(s => ({ workSessionCount: s.workSessionCount + 1 })),

  startSession: async (taskId: string) => {
    const { activeSession } = get()
    if (activeSession) {
      if (activeSession.type === 'work') {
        await api.interruptSession(activeSession.sessionId)
      } else {
        await api.completeSession(activeSession.sessionId)
      }
    }
    const session = await api.startWorkSession(taskId)
    set({
      activeSession: {
        sessionId: session.id,
        taskId: session.taskId,
        type: session.type,
        startedAt: session.startedAt,
      },
    })
  },

  stopSession: async () => {
    const { activeSession } = get()
    if (!activeSession) return
    if (activeSession.type === 'work') {
      await api.interruptSession(activeSession.sessionId)
    } else {
      await api.completeSession(activeSession.sessionId)
    }
    set({ activeSession: null })
  },

  completeSession: async () => {
    const { activeSession, workSessionCount } = get()
    if (!activeSession) return
    await api.completeSession(activeSession.sessionId)
    if (activeSession.type === 'work') {
      set({ activeSession: null, workSessionCount: workSessionCount + 1 })
    } else {
      set({ activeSession: null })
    }
  },

  startBreakSession: async (type: 'short_break' | 'long_break', taskId?: string) => {
    const { activeSession, workSessionCount } = get()
    if (activeSession) {
      await api.completeSession(activeSession.sessionId)
      if (activeSession.type === 'work') {
        set({ workSessionCount: workSessionCount + 1 })
      }
    }
    const session = await api.startBreakSession(type, taskId)
    set({
      activeSession: {
        sessionId: session.id,
        taskId: session.taskId,
        type: session.type,
        startedAt: session.startedAt,
      },
    })
  },
}))
```

- [ ] **Step 4: Run the tests — verify they pass**

```bash
npx vitest run src/store/__tests__/pomodoroStore.test.ts
```

Expected: all tests PASS.

- [ ] **Step 5: Commit**

```bash
git add src/store/pomodoroStore.ts src/store/__tests__/pomodoroStore.test.ts
git commit -m "feat: add startBreakSession action to pomodoroStore"
```

---

### Task 2: Expose `completeSession` and `startBreakSession` from `usePomodoro`

**Files:**
- Modify: `src/features/pomodoro/usePomodoro.ts`
- Test: `src/features/pomodoro/usePomodoro.test.ts`

Background: `usePomodoro` currently destructures `completeSession` from the store but doesn't return it. `startBreakSession` is new. Both need to be in the return object so components can use them.

- [ ] **Step 1: Write the failing tests**

Add to `src/features/pomodoro/usePomodoro.test.ts` (after existing tests):

```ts
test('exposes completeSession from the store', () => {
  const { result } = renderHook(() => usePomodoro())
  expect(result.current.completeSession).toBe(mockStore.completeSession)
})

test('exposes startBreakSession from the store', () => {
  // Add startBreakSession to mockStore at the top of the file:
  // startBreakSession: vi.fn(),
  const { result } = renderHook(() => usePomodoro())
  expect(typeof result.current.startBreakSession).toBe('function')
})
```

Also add `startBreakSession: vi.fn()` to the `mockStore` object at the top of `usePomodoro.test.ts`.

- [ ] **Step 2: Run the tests — verify they fail**

```bash
npx vitest run src/features/pomodoro/usePomodoro.test.ts
```

Expected: the two new tests FAIL because `completeSession` and `startBreakSession` are not in the return value.

- [ ] **Step 3: Update `usePomodoro.ts` to expose both**

Full updated `src/features/pomodoro/usePomodoro.ts`:

```ts
import { useState, useEffect, useRef } from 'react'
import { usePomodoroStore } from '../../store/pomodoroStore'
import { playBeep } from '../../lib/audioUtils'

const DURATIONS: Record<string, number> = {
  work: 25 * 60,
  short_break: 5 * 60,
  long_break: 15 * 60,
}

function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60).toString().padStart(2, '0')
  const s = (seconds % 60).toString().padStart(2, '0')
  return `${m}:${s}`
}

export function usePomodoro() {
  const { activeSession, workSessionCount, startSession, stopSession, completeSession, startBreakSession } = usePomodoroStore()
  const [secondsLeft, setSecondsLeft] = useState<number>(() => {
    if (!activeSession) return DURATIONS.work
    const elapsed = Math.floor((Date.now() - Date.parse(activeSession.startedAt)) / 1000)
    return Math.max(0, DURATIONS[activeSession.type] - elapsed)
  })
  const completedRef = useRef(false)

  useEffect(() => {
    if (!activeSession) {
      setSecondsLeft(DURATIONS.work)
      completedRef.current = false
      return
    }
    const elapsed = Math.floor((Date.now() - Date.parse(activeSession.startedAt)) / 1000)
    setSecondsLeft(Math.max(0, DURATIONS[activeSession.type] - elapsed))
    completedRef.current = false
  }, [activeSession?.sessionId])

  useEffect(() => {
    if (!activeSession) return
    const interval = setInterval(() => {
      setSecondsLeft(prev => Math.max(0, prev - 1))
    }, 1000)
    return () => clearInterval(interval)
  }, [activeSession?.sessionId])

  useEffect(() => {
    if (!activeSession || secondsLeft > 0 || completedRef.current) return
    completedRef.current = true
    completeSession()
    playBeep()
    document.title = '⏰ Timer complete! — Time Manager'
  }, [secondsLeft, activeSession?.sessionId])

  return {
    display: formatTime(secondsLeft),
    secondsLeft,
    isRunning: !!activeSession,
    activeSession,
    workSessionCount,
    startSession,
    stopSession,
    completeSession,
    startBreakSession,
  }
}
```

- [ ] **Step 4: Run the tests — verify they pass**

```bash
npx vitest run src/features/pomodoro/usePomodoro.test.ts
```

Expected: all tests PASS.

- [ ] **Step 5: Commit**

```bash
git add src/features/pomodoro/usePomodoro.ts src/features/pomodoro/usePomodoro.test.ts
git commit -m "feat: expose completeSession and startBreakSession from usePomodoro"
```

---

### Task 3: Add `sessionType` prop and new buttons to PomodoroTimer

**Files:**
- Modify: `src/features/pomodoro/PomodoroTimer.tsx`
- Test: `src/features/pomodoro/PomodoroTimer.test.tsx`

Background: `PomodoroTimer` currently shows Stop when `isRunning`, Start otherwise. After this change, it shows 4 buttons during a work session (Complete, Short Break, Long Break, Stop), only Stop during a break session, and Start when idle. All existing tests need `sessionType` added since it becomes a required prop.

- [ ] **Step 1: Write new failing tests and update existing ones**

Replace the full contents of `src/features/pomodoro/PomodoroTimer.test.tsx`:

```tsx
import { render, screen, fireEvent } from '@testing-library/react'
import { PomodoroTimer } from './PomodoroTimer'

// Helper for default no-op callbacks used in every render
const noop = () => {}
const defaultCallbacks = {
  onStart: noop, onStop: noop, onComplete: noop, onShortBreak: noop, onLongBreak: noop,
}

test('renders countdown display', () => {
  render(<PomodoroTimer taskId="t1" taskTitle="Design" display="23:45"
    isRunning={false} sessionType={null} workSessionCount={2} {...defaultCallbacks} />)
  expect(screen.getByText('23:45')).toBeInTheDocument()
})

test('shows task title when running', () => {
  render(<PomodoroTimer taskId="t1" taskTitle="Design" display="23:45"
    isRunning={true} sessionType="work" workSessionCount={2} {...defaultCallbacks} />)
  expect(screen.getByText('Design')).toBeInTheDocument()
})

test('renders 4 session dots', () => {
  render(<PomodoroTimer taskId="t1" taskTitle="Design" display="25:00"
    isRunning={false} sessionType={null} workSessionCount={2} {...defaultCallbacks} />)
  expect(screen.getAllByTestId('session-dot')).toHaveLength(4)
})

test('calls onStop when Stop button clicked during active session', () => {
  const onStop = vi.fn()
  render(<PomodoroTimer taskId="t1" taskTitle="Design" display="23:45"
    isRunning={true} sessionType="work" workSessionCount={0}
    {...defaultCallbacks} onStop={onStop} />)
  fireEvent.click(screen.getByText(/stop/i))
  expect(onStop).toHaveBeenCalled()
})

test('calls onStart with taskId when Start clicked', () => {
  const onStart = vi.fn()
  render(<PomodoroTimer taskId="t1" taskTitle="Design" display="25:00"
    isRunning={false} sessionType={null} workSessionCount={0}
    {...defaultCallbacks} onStart={onStart} />)
  fireEvent.click(screen.getByText(/start/i))
  expect(onStart).toHaveBeenCalledWith('t1')
})

// NEW TESTS

test('shows Complete, Short Break, Long Break, and Stop during work session', () => {
  render(<PomodoroTimer taskId="t1" taskTitle="Design" display="20:00"
    isRunning={true} sessionType="work" workSessionCount={0} {...defaultCallbacks} />)
  expect(screen.getByText(/complete/i)).toBeInTheDocument()
  expect(screen.getByText(/short break/i)).toBeInTheDocument()
  expect(screen.getByText(/long break/i)).toBeInTheDocument()
  expect(screen.getByText(/stop/i)).toBeInTheDocument()
})

test('shows only Stop during a break session', () => {
  render(<PomodoroTimer taskId="t1" taskTitle="Design" display="04:30"
    isRunning={true} sessionType="short_break" workSessionCount={1} {...defaultCallbacks} />)
  expect(screen.queryByText(/complete/i)).not.toBeInTheDocument()
  expect(screen.queryByText(/short break/i)).not.toBeInTheDocument()
  expect(screen.queryByText(/long break/i)).not.toBeInTheDocument()
  expect(screen.getByText(/stop/i)).toBeInTheDocument()
})

test('calls onComplete when Complete button clicked', () => {
  const onComplete = vi.fn()
  render(<PomodoroTimer taskId="t1" taskTitle="Design" display="20:00"
    isRunning={true} sessionType="work" workSessionCount={0}
    {...defaultCallbacks} onComplete={onComplete} />)
  fireEvent.click(screen.getByText(/complete/i))
  expect(onComplete).toHaveBeenCalled()
})

test('calls onShortBreak when Short Break button clicked', () => {
  const onShortBreak = vi.fn()
  render(<PomodoroTimer taskId="t1" taskTitle="Design" display="20:00"
    isRunning={true} sessionType="work" workSessionCount={0}
    {...defaultCallbacks} onShortBreak={onShortBreak} />)
  fireEvent.click(screen.getByText(/short break/i))
  expect(onShortBreak).toHaveBeenCalled()
})

test('calls onLongBreak when Long Break button clicked', () => {
  const onLongBreak = vi.fn()
  render(<PomodoroTimer taskId="t1" taskTitle="Design" display="20:00"
    isRunning={true} sessionType="work" workSessionCount={0}
    {...defaultCallbacks} onLongBreak={onLongBreak} />)
  fireEvent.click(screen.getByText(/long break/i))
  expect(onLongBreak).toHaveBeenCalled()
})

test('Start button is disabled when taskId is null', () => {
  render(<PomodoroTimer taskId={null} taskTitle={null} display="25:00"
    isRunning={false} sessionType={null} workSessionCount={0} {...defaultCallbacks} />)
  expect(screen.getByText(/start/i).closest('button')).toBeDisabled()
})
```

- [ ] **Step 2: Run the tests — verify new ones fail**

```bash
npx vitest run src/features/pomodoro/PomodoroTimer.test.tsx
```

Expected: the 6 new tests FAIL (sessionType prop missing, buttons missing).

- [ ] **Step 3: Update `PomodoroTimer.tsx` with new props and buttons**

Full updated `src/features/pomodoro/PomodoroTimer.tsx`:

```tsx
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

const btnBase = {
  border: '1px solid var(--color-border)',
  padding: '6px 12px',
  borderRadius: 6,
  cursor: 'pointer' as const,
  fontSize: 13,
}

export function PomodoroTimer({
  taskId, taskTitle, display, isRunning, sessionType, workSessionCount,
  onStart, onStop, onComplete, onShortBreak, onLongBreak,
}: PomodoroTimerProps) {
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

      <div style={{ display: 'flex', gap: 8, justifyContent: 'center', flexWrap: 'wrap', marginBottom: 12 }}>
        {sessionType === 'work' ? (
          <>
            <button type="button" onClick={onComplete}
              style={{ ...btnBase, background: 'var(--color-success)', color: '#fff', border: 'none' }}>
              ✅ Complete
            </button>
            <button type="button" onClick={onShortBreak}
              style={{ ...btnBase, background: 'var(--color-surface-2)', color: 'var(--color-text)' }}>
              ☕ Short Break
            </button>
            <button type="button" onClick={onLongBreak}
              style={{ ...btnBase, background: 'var(--color-surface-2)', color: 'var(--color-text)' }}>
              🌙 Long Break
            </button>
            <button type="button" onClick={onStop}
              style={{ ...btnBase, background: 'var(--color-surface-2)', color: 'var(--color-text)' }}>
              ⏹ Stop
            </button>
          </>
        ) : isRunning ? (
          <button type="button" onClick={onStop}
            style={{ ...btnBase, background: 'var(--color-surface-2)', color: 'var(--color-text)' }}>
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
```

- [ ] **Step 4: Run the tests — verify they pass**

```bash
npx vitest run src/features/pomodoro/PomodoroTimer.test.tsx
```

Expected: all 11 tests PASS.

- [ ] **Step 5: Commit**

```bash
git add src/features/pomodoro/PomodoroTimer.tsx src/features/pomodoro/PomodoroTimer.test.tsx
git commit -m "feat: add Complete, Short Break, Long Break buttons to PomodoroTimer"
```

---

### Task 4: Wire new props in HomeTab

**Files:**
- Modify: `src/features/home/HomeTab.tsx`
- Test: `src/features/home/HomeTab.test.tsx`

Background: `HomeTab` passes props to `PomodoroTimer`. It needs to add `sessionType`, `onComplete`, `onShortBreak`, and `onLongBreak`. The `usePomodoro` hook now exposes `completeSession` and `startBreakSession`. The `HomeTab.test.tsx` mocks `usePomodoroStore` (which `usePomodoro` calls), so the mock needs `completeSession` and `startBreakSession` added.

- [ ] **Step 1: Write the failing test and update existing mocks**

Replace the full contents of `src/features/home/HomeTab.test.tsx` with:

```tsx
import { render, screen, fireEvent } from '@testing-library/react'
import { HomeTab } from './HomeTab'
import { usePomodoroStore } from '../../store/pomodoroStore'
import { useTaskStore } from '../../store/taskStore'
import { useTagStore } from '../../store/tagStore'

vi.mock('../../store/pomodoroStore')
vi.mock('../../store/taskStore')
vi.mock('../../store/tagStore')
vi.mock('../../lib/dateUtils', () => ({ todayISO: () => '2026-03-16' }))
vi.useFakeTimers()

// Shared mock builder — all tests use this to avoid missing new required fields
const mockPomodoro = (overrides = {}) => ({
  activeSession: null,
  workSessionCount: 0,
  startSession: vi.fn(),
  stopSession: vi.fn(),
  completeSession: vi.fn(),
  startBreakSession: vi.fn(),
  ...overrides,
})

beforeEach(() => {
  vi.setSystemTime(new Date('2026-03-16'))
  vi.mocked(useTagStore).mockReturnValue({ tags: [] } as any)
})

test('shows no-timer empty state when no active session and no tasks today', () => {
  vi.mocked(usePomodoroStore).mockReturnValue(mockPomodoro() as any)
  vi.mocked(useTaskStore).mockReturnValue({ tasks: [] } as any)

  render(<HomeTab />)
  expect(screen.getByText(/no active timer/i)).toBeInTheDocument()
})

test('shows todays tasks scheduled for today', () => {
  vi.mocked(usePomodoroStore).mockReturnValue(mockPomodoro() as any)
  vi.mocked(useTaskStore).mockReturnValue({
    tasks: [
      { id: 't1', title: 'Morning standup', completed: false, order: 1, tagIds: [],
        scheduledDay: '2026-03-16', createdAt: '', updatedAt: '' },
      { id: 't2', title: 'Deploy release', completed: false, order: 2, tagIds: [],
        scheduledDay: '2026-03-17', createdAt: '', updatedAt: '' },
    ],
  } as any)

  render(<HomeTab />)
  expect(screen.getByText('Morning standup')).toBeInTheDocument()
  expect(screen.queryByText('Deploy release')).not.toBeInTheDocument()
})

test('🍅 button calls startSession with task id', () => {
  const startSession = vi.fn()
  vi.mocked(usePomodoroStore).mockReturnValue(mockPomodoro({ startSession }) as any)
  vi.mocked(useTaskStore).mockReturnValue({
    tasks: [
      { id: 't1', title: 'Morning standup', completed: false, order: 1, tagIds: [],
        scheduledDay: '2026-03-16', createdAt: '', updatedAt: '' },
    ],
  } as any)

  render(<HomeTab />)
  fireEvent.click(screen.getByTitle('Start Pomodoro'))
  expect(startSession).toHaveBeenCalledWith('t1')
})

test('shows no-tasks-today empty state when no tasks scheduled for today', () => {
  vi.mocked(usePomodoroStore).mockReturnValue(mockPomodoro() as any)
  vi.mocked(useTaskStore).mockReturnValue({ tasks: [] } as any)

  render(<HomeTab />)
  expect(screen.getByText(/nothing scheduled for today/i)).toBeInTheDocument()
})

test('renders DueDateBadge for a task with a due date', () => {
  vi.mocked(usePomodoroStore).mockReturnValue(mockPomodoro() as any)
  vi.mocked(useTaskStore).mockReturnValue({
    tasks: [
      { id: 't1', title: 'Morning standup', completed: false, order: 1, tagIds: [],
        scheduledDay: '2026-03-16', dueDate: '2026-03-10', createdAt: '', updatedAt: '' },
    ],
  } as any)

  render(<HomeTab />)
  // dueDate '2026-03-10' is before today '2026-03-16' → overdue → shows '! Mar 10'
  expect(screen.getByText('! Mar 10')).toBeInTheDocument()
})

// NEW TEST
test('shows Complete button when active session is a work session', () => {
  vi.mocked(usePomodoroStore).mockReturnValue(mockPomodoro({
    activeSession: {
      sessionId: 's1', taskId: 't1', type: 'work',
      startedAt: new Date().toISOString(),
    },
  }) as any)
  vi.mocked(useTaskStore).mockReturnValue({
    tasks: [
      { id: 't1', title: 'Coding', completed: false, order: 1, tagIds: [],
        scheduledDay: '2026-03-16', createdAt: '', updatedAt: '' },
    ],
  } as any)

  render(<HomeTab />)
  expect(screen.getByText(/complete/i)).toBeInTheDocument()
  expect(screen.getByText(/short break/i)).toBeInTheDocument()
  expect(screen.getByText(/long break/i)).toBeInTheDocument()
})
```

- [ ] **Step 2: Run the tests — verify the new test fails**

```bash
npx vitest run src/features/home/HomeTab.test.tsx
```

Expected: new test FAILS (Complete button not in document); existing tests may also fail if TypeScript errors on missing props.

- [ ] **Step 3: Update `HomeTab.tsx` to wire new props**

Full updated `src/features/home/HomeTab.tsx`:

```tsx
import { useTaskStore } from '../../store/taskStore'
import { useTagStore } from '../../store/tagStore'
import { usePomodoro } from '../pomodoro/usePomodoro'
import { PomodoroTimer } from '../pomodoro/PomodoroTimer'
import { EmptyState } from '../../components/EmptyState'
import { DueDateBadge } from '../../components/DueDateBadge'
import { todayISO } from '../../lib/dateUtils'
import type { Task } from '../../types'

export function HomeTab() {
  const { tasks } = useTaskStore()
  const { tags } = useTagStore()
  const {
    display, isRunning, activeSession, workSessionCount,
    startSession, stopSession, completeSession, startBreakSession,
  } = usePomodoro()

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
          sessionType={activeSession?.type ?? null}
          workSessionCount={workSessionCount}
          onStart={startSession}
          onStop={stopSession}
          onComplete={completeSession}
          onShortBreak={() => startBreakSession('short_break', timerTaskId ?? undefined)}
          onLongBreak={() => startBreakSession('long_break', timerTaskId ?? undefined)}
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

                  <DueDateBadge dueDate={task.dueDate} completed={task.completed} />

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
```

- [ ] **Step 4: Run the tests — verify they pass**

```bash
npx vitest run src/features/home/HomeTab.test.tsx
```

Expected: all tests PASS.

- [ ] **Step 5: Run the full test suite**

```bash
npm test -- --run
```

Expected: all tests PASS.

- [ ] **Step 6: Commit**

```bash
git add src/features/home/HomeTab.tsx src/features/home/HomeTab.test.tsx
git commit -m "feat: wire Complete, Short Break, Long Break buttons in HomeTab"
```
