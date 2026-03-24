# Stats Dashboard Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a Stats tab with Overview / By Task / By Day sub-tabs, a time filter (All time / This week / Today), and bar charts powered by Recharts, reading entirely from existing Dexie tables.

**Architecture:** A single `useStatsData(filter)` hook owns all Dexie queries and returns a `StatsData` object. `StatsTab` owns the filter and sub-tab state, calls the hook, and passes data as props to three pure display components (`StatsOverview`, `StatsByTask`, `StatsByDay`). This keeps components unit-testable without any Dexie mocking.

**Tech Stack:** React 18, TypeScript, Dexie.js v4, Recharts (new dependency), date-fns v4, Zustand (taskStore), Vitest + @testing-library/react, fake-indexeddb (already in devDependencies)

---

## File Structure

| File | Action | Responsibility |
|---|---|---|
| `src/features/stats/useStatsData.ts` | Create | Dexie queries + aggregation logic; exports `StatsData`, `TimeFilter`, `formatMinutes` |
| `src/features/stats/useStatsData.test.ts` | Create | Unit tests for hook — aggregation correctness, filter paths, edge cases |
| `src/features/stats/StatsOverview.tsx` | Create | Overview sub-tab — 4 summary cards + Recharts weekly trend bar chart |
| `src/features/stats/StatsOverview.test.tsx` | Create | Tests for card values; chart renders without crashing |
| `src/features/stats/StatsByTask.tsx` | Create | By Task sub-tab — ranked task list |
| `src/features/stats/StatsByTask.test.tsx` | Create | Tests for sort order, stop rate formatting |
| `src/features/stats/StatsByDay.tsx` | Create | By Day sub-tab — Recharts daily focus bar chart |
| `src/features/stats/StatsByDay.test.tsx` | Create | Tests for correct bar count per filter mode |
| `src/features/stats/StatsTab.tsx` | Create | Tab shell — time filter pills + sub-tab switcher + wires sub-components |
| `src/features/stats/StatsTab.test.tsx` | Create | Tests for filter/sub-tab state changes, sub-component visibility |
| `src/components/TabBar.tsx` | Modify | Add `'stats'` to Tab type and TABS array |
| `src/App.tsx` | Modify | Import StatsTab; add `{tab === 'stats' && <StatsTab />}` |
| `src/App.integration.test.tsx` | Modify | Add test: Stats tab renders + click switches to it |

---

## Chunk 1: Setup + Navigation

### Task 1: Install Recharts + wire Stats tab into TabBar and App

**Files:**
- Modify: `src/components/TabBar.tsx`
- Modify: `src/App.tsx`
- Modify: `src/App.integration.test.tsx`
- Create: `src/features/stats/StatsTab.tsx` (minimal placeholder)

- [ ] **Step 1: Write failing tests**

Add to `src/App.integration.test.tsx` after existing tests:

```typescript
test('renders Stats tab button', async () => {
  render(<App />)
  await waitFor(() => {
    expect(screen.getByText('Stats')).toBeInTheDocument()
  })
})

test('switches to Stats tab on click', async () => {
  render(<App />)
  await waitFor(() => screen.getByText('Stats'))
  fireEvent.click(screen.getByText('Stats'))
  await waitFor(() => {
    expect(screen.getByTestId('stats-tab')).toBeInTheDocument()
  })
})
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run src/App.integration.test.tsx`
Expected: FAIL — "Stats" text and `stats-tab` testid not found

- [ ] **Step 3: Install Recharts**

Run: `npm install recharts`
Expected: recharts added to `package.json` dependencies

- [ ] **Step 4: Create minimal StatsTab placeholder**

Create `src/features/stats/StatsTab.tsx`:

```typescript
export function StatsTab() {
  return <div data-testid="stats-tab" />
}
```

- [ ] **Step 5: Update TabBar.tsx**

In `src/components/TabBar.tsx`, change:
- `type Tab = 'home' | 'tasks' | 'schedule' | 'notes'` → `type Tab = 'home' | 'tasks' | 'schedule' | 'notes' | 'stats'`
- Add `{ id: 'stats', label: 'Stats' }` as the fifth element in `TABS`

Full updated file:

```typescript
type Tab = 'home' | 'tasks' | 'schedule' | 'notes' | 'stats'

interface Props {
  active: Tab
  onChange: (tab: Tab) => void
}

const TABS: { id: Tab; label: string }[] = [
  { id: 'home', label: 'Home' },
  { id: 'tasks', label: 'Tasks' },
  { id: 'schedule', label: 'Schedule' },
  { id: 'notes', label: 'Notes' },
  { id: 'stats', label: 'Stats' },
]

export function TabBar({ active, onChange }: Props) {
  return (
    <nav style={{
      display: 'flex', borderBottom: '1px solid var(--color-border)',
      background: 'var(--color-surface)', padding: '0 16px',
    }}>
      {TABS.map(tab => (
        <button
          key={tab.id}
          onClick={() => onChange(tab.id)}
          style={{
            padding: '12px 16px', fontSize: 14,
            color: active === tab.id ? 'var(--color-accent)' : 'var(--color-text-muted)',
            borderBottom: active === tab.id ? '2px solid var(--color-accent)' : '2px solid transparent',
            marginBottom: -1,
          }}
        >
          {tab.label}
        </button>
      ))}
    </nav>
  )
}

export type { Tab }
```

- [ ] **Step 6: Update App.tsx**

Add import after the `NotesTab` import line:
```typescript
import { StatsTab } from './features/stats/StatsTab'
```

Add render branch inside `<main>` after `{tab === 'notes' && <NotesTab />}`:
```typescript
{tab === 'stats' && <StatsTab />}
```

- [ ] **Step 7: Run tests to verify they pass**

Run: `npx vitest run src/App.integration.test.tsx`
Expected: PASS (all 5 tests including new ones)

- [ ] **Step 8: Commit**

```bash
git add src/components/TabBar.tsx src/App.tsx src/App.integration.test.tsx src/features/stats/StatsTab.tsx
git commit -m "feat: add Stats tab to navigation + install Recharts"
```

---

## Chunk 2: Data Hook

### Task 2: `useStatsData` — all-time cards and task stats

**Files:**
- Create: `src/features/stats/useStatsData.ts`
- Create: `src/features/stats/useStatsData.test.ts`

- [ ] **Step 1: Write failing tests**

Create `src/features/stats/useStatsData.test.ts`:

```typescript
import { renderHook, waitFor } from '@testing-library/react'
import { db } from '../../db/db'
import { useTaskStore } from '../../store/taskStore'
import { useStatsData } from './useStatsData'

vi.mock('../../store/taskStore')

beforeEach(async () => {
  await db.pomodoroSessions.clear()
  await db.pomodoroStats.clear()
  vi.mocked(useTaskStore).mockReturnValue({ tasks: [] } as any)
})

// ── all-time: cards ──────────────────────────────────────────────────────────

test('all-time: totalMinutesFocused sums from PomodoroStats', async () => {
  vi.mocked(useTaskStore).mockReturnValue({
    tasks: [
      { id: 't1', title: 'Task One' } as any,
      { id: 't2', title: 'Task Two' } as any,
    ],
  } as any)
  await db.pomodoroStats.bulkAdd([
    { taskId: 't1', totalStarted: 5, totalCompleted: 4, totalInterrupted: 1,
      totalMinutesFocused: 100, lastSessionAt: null, updatedAt: '' },
    { taskId: 't2', totalStarted: 3, totalCompleted: 2, totalInterrupted: 1,
      totalMinutesFocused: 50, lastSessionAt: null, updatedAt: '' },
  ])
  const { result } = renderHook(() => useStatsData('all'))
  await waitFor(() => expect(result.current.totalMinutesFocused).toBe(150))
  expect(result.current.totalCompleted).toBe(6)
  expect(result.current.totalInterrupted).toBe(2)
})

test('all-time: completionRate is null when no sessions', async () => {
  const { result } = renderHook(() => useStatsData('all'))
  await waitFor(() => expect(result.current.completionRate).toBeNull())
})

test('all-time: completionRate = completed / (completed + interrupted)', async () => {
  vi.mocked(useTaskStore).mockReturnValue({
    tasks: [{ id: 't1', title: 'T' } as any],
  } as any)
  await db.pomodoroStats.add({
    taskId: 't1', totalStarted: 10, totalCompleted: 8, totalInterrupted: 2,
    totalMinutesFocused: 200, lastSessionAt: null, updatedAt: '',
  })
  const { result } = renderHook(() => useStatsData('all'))
  await waitFor(() => expect(result.current.completionRate).toBeCloseTo(0.8))
})

// ── all-time: task stats ─────────────────────────────────────────────────────

test('all-time: taskStats sorted by minutesFocused descending', async () => {
  vi.mocked(useTaskStore).mockReturnValue({
    tasks: [
      { id: 't1', title: 'Low' } as any,
      { id: 't2', title: 'High' } as any,
    ],
  } as any)
  await db.pomodoroStats.bulkAdd([
    { taskId: 't1', totalStarted: 2, totalCompleted: 2, totalInterrupted: 0,
      totalMinutesFocused: 25, lastSessionAt: null, updatedAt: '' },
    { taskId: 't2', totalStarted: 4, totalCompleted: 4, totalInterrupted: 0,
      totalMinutesFocused: 100, lastSessionAt: null, updatedAt: '' },
  ])
  const { result } = renderHook(() => useStatsData('all'))
  await waitFor(() => expect(result.current.taskStats).toHaveLength(2))
  expect(result.current.taskStats[0].title).toBe('High')
  expect(result.current.taskStats[1].title).toBe('Low')
})

test('all-time: taskStats includes started count from PomodoroStats', async () => {
  vi.mocked(useTaskStore).mockReturnValue({
    tasks: [{ id: 't1', title: 'T' } as any],
  } as any)
  await db.pomodoroStats.add({
    taskId: 't1', totalStarted: 7, totalCompleted: 5, totalInterrupted: 2,
    totalMinutesFocused: 125, lastSessionAt: null, updatedAt: '',
  })
  const { result } = renderHook(() => useStatsData('all'))
  await waitFor(() => expect(result.current.taskStats).toHaveLength(1))
  expect(result.current.taskStats[0].started).toBe(7)
  expect(result.current.taskStats[0].completed).toBe(5)
  expect(result.current.taskStats[0].interrupted).toBe(2)
  expect(result.current.taskStats[0].minutesFocused).toBe(125)
})

test('all-time: tasks not in store are skipped', async () => {
  vi.mocked(useTaskStore).mockReturnValue({ tasks: [] } as any)
  await db.pomodoroStats.add({
    taskId: 'gone-task', totalStarted: 3, totalCompleted: 3, totalInterrupted: 0,
    totalMinutesFocused: 75, lastSessionAt: null, updatedAt: '',
  })
  const { result } = renderHook(() => useStatsData('all'))
  await waitFor(() => expect(result.current.totalMinutesFocused).toBe(75))
  expect(result.current.taskStats).toHaveLength(0)
})
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run src/features/stats/useStatsData.test.ts`
Expected: FAIL — module `./useStatsData` not found

- [ ] **Step 3: Implement useStatsData with all-time cards + task stats**

Create `src/features/stats/useStatsData.ts`:

```typescript
import { useState, useEffect } from 'react'
import { startOfISOWeek, format } from 'date-fns'
import { db } from '../../db/db'
import { useTaskStore } from '../../store/taskStore'
import { todayISO, getWeekDays, formatISODay, addWeeks, dayAbbr } from '../../lib/dateUtils'

export type TimeFilter = 'all' | 'week' | 'today'

export interface StatsData {
  totalMinutesFocused: number
  totalCompleted: number
  totalInterrupted: number
  completionRate: number | null
  weeklyTrend: { label: string; hours: number }[]
  taskStats: {
    taskId: string
    title: string
    minutesFocused: number
    completed: number
    interrupted: number
    started: number
  }[]
  dailyFocus: { date: string; hours: number }[]
}

export function formatMinutes(minutes: number): string {
  const h = Math.floor(minutes / 60)
  const m = minutes % 60
  return `${h}h ${m}m`
}

const EMPTY: StatsData = {
  totalMinutesFocused: 0,
  totalCompleted: 0,
  totalInterrupted: 0,
  completionRate: null,
  weeklyTrend: [],
  taskStats: [],
  dailyFocus: [],
}

export function useStatsData(filter: TimeFilter): StatsData {
  const { tasks } = useTaskStore()
  const [data, setData] = useState<StatsData>(EMPTY)

  useEffect(() => {
    let cancelled = false

    async function load() {
      const taskMap = new Map(tasks.map(t => [t.id, t.title]))

      if (filter === 'all') {
        const allStats = await db.pomodoroStats.toArray()

        const totalMinutesFocused = allStats.reduce((s, r) => s + r.totalMinutesFocused, 0)
        const totalCompleted = allStats.reduce((s, r) => s + r.totalCompleted, 0)
        const totalInterrupted = allStats.reduce((s, r) => s + r.totalInterrupted, 0)
        const total = totalCompleted + totalInterrupted
        const completionRate = total === 0 ? null : totalCompleted / total

        const taskStats = allStats
          .filter(r => taskMap.has(r.taskId))
          .map(r => ({
            taskId: r.taskId,
            title: taskMap.get(r.taskId)!,
            minutesFocused: r.totalMinutesFocused,
            completed: r.totalCompleted,
            interrupted: r.totalInterrupted,
            started: r.totalStarted,
          }))
          .sort((a, b) => b.minutesFocused - a.minutesFocused)

        // chart data: query completed work sessions
        const completedWork = await db.pomodoroSessions
          .where('type').equals('work')
          .filter(s => s.completedAt !== null && s.isOpen === 0)
          .toArray()

        // weeklyTrend: last 8 ISO weeks (current week + 7 prior)
        interface WeekSlot { label: string; isoKey: string; minutes: number }
        const weekSlots: WeekSlot[] = []
        for (let i = 7; i >= 0; i--) {
          const weekDate = addWeeks(new Date(), -i)
          const weekStart = startOfISOWeek(weekDate)
          weekSlots.push({
            label: format(weekStart, 'MMM d'),
            isoKey: formatISODay(weekStart),
            minutes: 0,
          })
        }
        for (const s of completedWork) {
          const weekStart = startOfISOWeek(new Date(s.startedAt))
          const key = formatISODay(weekStart)
          const slot = weekSlots.find(w => w.isoKey === key)
          if (slot) slot.minutes += s.durationMinutes
        }
        const weeklyTrend = weekSlots.map(w => ({ label: w.label, hours: w.minutes / 60 }))

        // dailyFocus: last 30 calendar days
        const dailyMap = new Map<string, number>()
        for (let i = 29; i >= 0; i--) {
          const d = new Date()
          d.setDate(d.getDate() - i)
          dailyMap.set(formatISODay(d), 0)
        }
        for (const s of completedWork) {
          const date = s.startedAt.slice(0, 10)
          if (dailyMap.has(date)) {
            dailyMap.set(date, (dailyMap.get(date) ?? 0) + s.durationMinutes)
          }
        }
        const dailyFocus = Array.from(dailyMap.entries()).map(([date, mins]) => ({
          date,
          hours: mins / 60,
        }))

        if (!cancelled) {
          setData({ totalMinutesFocused, totalCompleted, totalInterrupted,
            completionRate, weeklyTrend, taskStats, dailyFocus })
        }
      } else {
        // week / today: compute from sessions (Task 4)
        if (!cancelled) setData(EMPTY)
      }
    }

    load()
    return () => { cancelled = true }
  }, [filter, tasks])

  return data
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run src/features/stats/useStatsData.test.ts`
Expected: PASS (all 6 tests)

- [ ] **Step 5: Commit**

```bash
git add src/features/stats/useStatsData.ts src/features/stats/useStatsData.test.ts
git commit -m "feat: useStatsData hook — all-time cards + task stats"
```

---

### Task 3: `useStatsData` — verify all-time chart data shapes

**Files:**
- Modify: `src/features/stats/useStatsData.test.ts`

- [ ] **Step 1: Write failing tests**

Append to `src/features/stats/useStatsData.test.ts`:

```typescript
// ── all-time: chart data shapes ──────────────────────────────────────────────

test('all-time: weeklyTrend has 8 entries (one per ISO week)', async () => {
  const { result } = renderHook(() => useStatsData('all'))
  await waitFor(() => expect(result.current.weeklyTrend).toHaveLength(8))
})

test('all-time: dailyFocus has 30 entries (one per calendar day)', async () => {
  const { result } = renderHook(() => useStatsData('all'))
  await waitFor(() => expect(result.current.dailyFocus).toHaveLength(30))
})

test('all-time: completed work session minutes appear in weeklyTrend', async () => {
  vi.mocked(useTaskStore).mockReturnValue({ tasks: [] } as any)
  // Seed a completed work session for today
  const today = new Date()
  await db.pomodoroSessions.add({
    id: 's1', taskId: 't1',
    startedAt: today.toISOString(),
    completedAt: today.toISOString(),
    type: 'work', durationMinutes: 25, isOpen: 0,
  })
  const { result } = renderHook(() => useStatsData('all'))
  await waitFor(() => {
    const total = result.current.weeklyTrend.reduce((s, w) => s + w.hours, 0)
    expect(total).toBeCloseTo(25 / 60)
  })
})

test('all-time: open sessions (isOpen=1) excluded from charts', async () => {
  vi.mocked(useTaskStore).mockReturnValue({ tasks: [] } as any)
  const today = new Date()
  await db.pomodoroSessions.add({
    id: 's-open', taskId: 't1',
    startedAt: today.toISOString(),
    completedAt: null,
    type: 'work', durationMinutes: 25, isOpen: 1, // active session
  })
  const { result } = renderHook(() => useStatsData('all'))
  await waitFor(() => expect(result.current.weeklyTrend).toHaveLength(8))
  const total = result.current.weeklyTrend.reduce((s, w) => s + w.hours, 0)
  expect(total).toBe(0)
})
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run src/features/stats/useStatsData.test.ts`
Expected: weeklyTrend and dailyFocus length tests fail (they return `[]` until filter==='all' runs)

- [ ] **Step 3: Verify existing implementation handles these tests**

The chart data code in Task 2's implementation already computes `weeklyTrend` (8 entries) and `dailyFocus` (30 entries) for `filter === 'all'`. Run the tests — they should pass already if Step 3 of Task 2 was implemented correctly.

Run: `npx vitest run src/features/stats/useStatsData.test.ts`
Expected: PASS (all 10 tests)

If length tests fail, check:
- The `for (let i = 7; i >= 0; i--)` loop in weeklyTrend generates 8 entries (i = 7, 6, 5, 4, 3, 2, 1, 0)
- The `for (let i = 29; i >= 0; i--)` loop in dailyFocus generates 30 entries

- [ ] **Step 4: Commit**

```bash
git add src/features/stats/useStatsData.test.ts
git commit -m "test: add chart shape tests for all-time useStatsData"
```

---

### Task 4: `useStatsData` — week and today filter paths

**Files:**
- Modify: `src/features/stats/useStatsData.ts`
- Modify: `src/features/stats/useStatsData.test.ts`

- [ ] **Step 1: Write failing tests**

Append to `src/features/stats/useStatsData.test.ts`:

```typescript
// ── week filter ──────────────────────────────────────────────────────────────

test('week: weeklyTrend has 7 entries (Mon–Sun)', async () => {
  const { result } = renderHook(() => useStatsData('week'))
  await waitFor(() => expect(result.current.weeklyTrend).toHaveLength(7))
})

test('week: dailyFocus has 7 entries', async () => {
  const { result } = renderHook(() => useStatsData('week'))
  await waitFor(() => expect(result.current.dailyFocus).toHaveLength(7))
})

test('week: counts completed sessions in date range', async () => {
  vi.mocked(useTaskStore).mockReturnValue({
    tasks: [{ id: 't1', title: 'T' } as any],
  } as any)
  const { getWeekDays } = await import('../../lib/dateUtils')
  const weekDays = getWeekDays(new Date())
  const monday = weekDays[0]

  await db.pomodoroSessions.bulkAdd([
    { id: 's1', taskId: 't1', startedAt: monday + 'T10:00:00.000Z',
      completedAt: monday + 'T10:25:00.000Z', type: 'work', durationMinutes: 25, isOpen: 0 },
    { id: 's2', taskId: 't1', startedAt: monday + 'T11:00:00.000Z',
      completedAt: null, type: 'work', durationMinutes: 25, isOpen: 0 }, // interrupted
    // open session — excluded
    { id: 's3', taskId: 't1', startedAt: monday + 'T12:00:00.000Z',
      completedAt: null, type: 'work', durationMinutes: 25, isOpen: 1 },
  ])
  const { result } = renderHook(() => useStatsData('week'))
  await waitFor(() => expect(result.current.totalCompleted).toBe(1))
  expect(result.current.totalInterrupted).toBe(1)
  expect(result.current.totalMinutesFocused).toBe(25)
})

test('week: completionRate is null when no closed sessions', async () => {
  const { result } = renderHook(() => useStatsData('week'))
  await waitFor(() => expect(result.current.completionRate).toBeNull())
})

test('week: task stats computed from sessions (not PomodoroStats)', async () => {
  vi.mocked(useTaskStore).mockReturnValue({
    tasks: [{ id: 't1', title: 'Task A' } as any],
  } as any)
  const { getWeekDays } = await import('../../lib/dateUtils')
  const weekDays = getWeekDays(new Date())
  const monday = weekDays[0]

  await db.pomodoroSessions.bulkAdd([
    { id: 'w1', taskId: 't1', startedAt: monday + 'T09:00:00.000Z',
      completedAt: monday + 'T09:25:00.000Z', type: 'work', durationMinutes: 25, isOpen: 0 },
    { id: 'w2', taskId: 't1', startedAt: monday + 'T10:00:00.000Z',
      completedAt: null, type: 'work', durationMinutes: 25, isOpen: 0 },
  ])
  const { result } = renderHook(() => useStatsData('week'))
  await waitFor(() => expect(result.current.taskStats).toHaveLength(1))
  expect(result.current.taskStats[0].title).toBe('Task A')
  expect(result.current.taskStats[0].minutesFocused).toBe(25)
  expect(result.current.taskStats[0].completed).toBe(1)
  expect(result.current.taskStats[0].interrupted).toBe(1)
  expect(result.current.taskStats[0].started).toBe(2)
})

test('week: open sessions excluded entirely', async () => {
  vi.mocked(useTaskStore).mockReturnValue({ tasks: [] } as any)
  const { getWeekDays } = await import('../../lib/dateUtils')
  const weekDays = getWeekDays(new Date())
  const monday = weekDays[0]

  await db.pomodoroSessions.add({
    id: 'open1', taskId: 't1', startedAt: monday + 'T10:00:00.000Z',
    completedAt: null, type: 'work', durationMinutes: 25, isOpen: 1,
  })
  const { result } = renderHook(() => useStatsData('week'))
  await waitFor(() => expect(result.current.weeklyTrend).toHaveLength(7))
  expect(result.current.totalCompleted).toBe(0)
  expect(result.current.totalInterrupted).toBe(0)
})

// ── today filter ─────────────────────────────────────────────────────────────

test('today: weeklyTrend has 24 entries (hourly)', async () => {
  const { result } = renderHook(() => useStatsData('today'))
  await waitFor(() => expect(result.current.weeklyTrend).toHaveLength(24))
})

test('today: dailyFocus has 24 entries', async () => {
  const { result } = renderHook(() => useStatsData('today'))
  await waitFor(() => expect(result.current.dailyFocus).toHaveLength(24))
})
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run src/features/stats/useStatsData.test.ts`
Expected: FAIL — week/today tests fail (setData(EMPTY) placeholder returns empty arrays and wrong lengths)

- [ ] **Step 3: Implement week/today filter paths in useStatsData**

Replace the `else { // week / today: compute from sessions (Task 4)` block in `useStatsData.ts` with the full implementation:

```typescript
      } else {
        // filter === 'week' or 'today': query sessions directly
        const weekDays = filter === 'week'
          ? getWeekDays(new Date())
          : [todayISO()]
        const startBound = weekDays[0]
        const endBound = weekDays[weekDays.length - 1] + '\uffff'

        const sessions = await db.pomodoroSessions
          .where('startedAt')
          .between(startBound, endBound, true, true)
          .filter(s => s.type === 'work' && s.isOpen === 0)
          .toArray()

        const completed = sessions.filter(s => s.completedAt !== null)
        const interrupted = sessions.filter(s => s.completedAt === null)
        const totalMinutesFocused = completed.reduce((s, r) => s + r.durationMinutes, 0)
        const totalCompleted = completed.length
        const totalInterrupted = interrupted.length
        const total = totalCompleted + totalInterrupted
        const completionRate = total === 0 ? null : totalCompleted / total

        // taskStats grouped by taskId (only sessions with a taskId)
        const taskIds = [...new Set(sessions.filter(s => s.taskId).map(s => s.taskId!))]
        const taskStats = taskIds
          .filter(id => taskMap.has(id))
          .map(id => {
            const forTask = sessions.filter(s => s.taskId === id)
            const taskCompleted = forTask.filter(s => s.completedAt !== null)
            const taskInterrupted = forTask.filter(s => s.completedAt === null)
            return {
              taskId: id,
              title: taskMap.get(id)!,
              minutesFocused: taskCompleted.reduce((s, r) => s + r.durationMinutes, 0),
              completed: taskCompleted.length,
              interrupted: taskInterrupted.length,
              started: taskCompleted.length + taskInterrupted.length,
            }
          })
          .sort((a, b) => b.minutesFocused - a.minutesFocused)

        let weeklyTrend: { label: string; hours: number }[]
        let dailyFocus: { date: string; hours: number }[]

        if (filter === 'week') {
          // One bar per day Mon–Sun
          const fullWeek = getWeekDays(new Date())
          weeklyTrend = fullWeek.map(day => {
            const dayCompleted = completed.filter(s => s.startedAt.slice(0, 10) === day)
            return {
              label: dayAbbr(day),
              hours: dayCompleted.reduce((s, r) => s + r.durationMinutes, 0) / 60,
            }
          })
          dailyFocus = fullWeek.map(day => {
            const dayCompleted = completed.filter(s => s.startedAt.slice(0, 10) === day)
            return {
              date: day,
              hours: dayCompleted.reduce((s, r) => s + r.durationMinutes, 0) / 60,
            }
          })
        } else {
          // filter === 'today': one bar per hour 0–23
          const hourlyMinutes = Array.from({ length: 24 }, () => 0)
          for (const s of completed) {
            const hour = new Date(s.startedAt).getHours()
            hourlyMinutes[hour] += s.durationMinutes
          }
          weeklyTrend = hourlyMinutes.map((mins, h) => ({
            label: String(h),
            hours: mins / 60,
          }))
          dailyFocus = hourlyMinutes.map((mins, h) => ({
            date: String(h),
            hours: mins / 60,
          }))
        }

        if (!cancelled) {
          setData({ totalMinutesFocused, totalCompleted, totalInterrupted,
            completionRate, weeklyTrend, taskStats, dailyFocus })
        }
      }
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run src/features/stats/useStatsData.test.ts`
Expected: PASS (all 18 tests)

- [ ] **Step 5: Commit**

```bash
git add src/features/stats/useStatsData.ts src/features/stats/useStatsData.test.ts
git commit -m "feat: useStatsData hook — week/today filter paths complete"
```

---

## Chunk 3: Components

### Task 5: `StatsOverview` component

**Files:**
- Create: `src/features/stats/StatsOverview.tsx`
- Create: `src/features/stats/StatsOverview.test.tsx`

- [ ] **Step 1: Write failing tests**

Create `src/features/stats/StatsOverview.test.tsx`:

```typescript
import { render, screen } from '@testing-library/react'
import { StatsOverview } from './StatsOverview'
import type { StatsData } from './useStatsData'

const baseData: StatsData = {
  totalMinutesFocused: 120,
  totalCompleted: 10,
  totalInterrupted: 2,
  completionRate: 0.83,
  weeklyTrend: [
    { label: 'Mar 10', hours: 1.5 },
    { label: 'Mar 17', hours: 2.0 },
  ],
  taskStats: [],
  dailyFocus: [],
}

test('renders total focused as Xh Ym', () => {
  render(<StatsOverview data={baseData} />)
  expect(screen.getByText('2h 0m')).toBeInTheDocument()
})

test('renders sessions completed count', () => {
  render(<StatsOverview data={baseData} />)
  expect(screen.getByText('10')).toBeInTheDocument()
})

test('renders sessions interrupted count', () => {
  render(<StatsOverview data={baseData} />)
  expect(screen.getByText('2')).toBeInTheDocument()
})

test('renders completion rate as percentage', () => {
  render(<StatsOverview data={baseData} />)
  expect(screen.getByText('83%')).toBeInTheDocument()
})

test('renders — when completionRate is null', () => {
  render(<StatsOverview data={{ ...baseData, completionRate: null }} />)
  expect(screen.getByText('—')).toBeInTheDocument()
})

test('renders chart container without crashing', () => {
  render(<StatsOverview data={baseData} />)
  // chart renders without throwing — no SVG assertions
  expect(screen.getByTestId('overview-chart')).toBeInTheDocument()
})
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run src/features/stats/StatsOverview.test.tsx`
Expected: FAIL — module not found

- [ ] **Step 3: Implement StatsOverview**

Create `src/features/stats/StatsOverview.tsx`:

```typescript
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts'
import type { StatsData } from './useStatsData'
import { formatMinutes } from './useStatsData'

interface Props {
  data: StatsData
}

export function StatsOverview({ data }: Props) {
  const { totalMinutesFocused, totalCompleted, totalInterrupted, completionRate, weeklyTrend } = data
  const rateDisplay = completionRate === null
    ? '—'
    : `${Math.round(completionRate * 100)}%`

  return (
    <div style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
      {/* Summary cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '8px' }}>
        <SummaryCard label="Total focused" value={formatMinutes(totalMinutesFocused)} />
        <SummaryCard label="Completed" value={String(totalCompleted)} />
        <SummaryCard label="Interrupted" value={String(totalInterrupted)} />
        <SummaryCard label="Completion rate" value={rateDisplay} />
      </div>

      {/* Weekly trend chart */}
      <div data-testid="overview-chart" style={{ height: 160 }}>
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={weeklyTrend} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
            <XAxis dataKey="label" tick={{ fontSize: 11 }} />
            <YAxis tick={{ fontSize: 11 }} unit="h" />
            <Tooltip formatter={(v: number) => [`${v.toFixed(1)}h`, 'Focus']} />
            <Bar dataKey="hours" fill="var(--color-accent)" radius={[3, 3, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}

function SummaryCard({ label, value }: { label: string; value: string }) {
  return (
    <div style={{
      background: 'var(--color-surface)', border: '1px solid var(--color-border)',
      borderRadius: 8, padding: '12px', textAlign: 'center',
    }}>
      <div style={{ fontSize: 22, fontWeight: 700, color: 'var(--color-accent)' }}>{value}</div>
      <div style={{ fontSize: 11, color: 'var(--color-text-muted)', textTransform: 'uppercase', marginTop: 4 }}>
        {label}
      </div>
    </div>
  )
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run src/features/stats/StatsOverview.test.tsx`
Expected: PASS (all 6 tests)

- [ ] **Step 5: Commit**

```bash
git add src/features/stats/StatsOverview.tsx src/features/stats/StatsOverview.test.tsx
git commit -m "feat: StatsOverview component — summary cards + weekly trend chart"
```

---

### Task 6: `StatsByTask` component

**Files:**
- Create: `src/features/stats/StatsByTask.tsx`
- Create: `src/features/stats/StatsByTask.test.tsx`

- [ ] **Step 1: Write failing tests**

Create `src/features/stats/StatsByTask.test.tsx`:

```typescript
import { render, screen } from '@testing-library/react'
import { StatsByTask } from './StatsByTask'
import type { StatsData } from './useStatsData'

const makeData = (taskStats: StatsData['taskStats']): StatsData => ({
  totalMinutesFocused: 0, totalCompleted: 0, totalInterrupted: 0,
  completionRate: null, weeklyTrend: [], dailyFocus: [], taskStats,
})

test('renders task title and focused time', () => {
  render(<StatsByTask data={makeData([
    { taskId: 't1', title: 'Fix bug', minutesFocused: 50, completed: 2, interrupted: 0, started: 2 },
  ])} />)
  expect(screen.getByText('Fix bug')).toBeInTheDocument()
  expect(screen.getByText('0h 50m')).toBeInTheDocument()
})

test('tasks are shown in order (data already sorted by hook)', () => {
  render(<StatsByTask data={makeData([
    { taskId: 't1', title: 'High', minutesFocused: 100, completed: 4, interrupted: 0, started: 4 },
    { taskId: 't2', title: 'Low', minutesFocused: 25, completed: 1, interrupted: 0, started: 1 },
  ])} />)
  const rows = screen.getAllByRole('row')
  expect(rows[1]).toHaveTextContent('High')
  expect(rows[2]).toHaveTextContent('Low')
})

test('stop rate shows — when started is 0', () => {
  render(<StatsByTask data={makeData([
    { taskId: 't1', title: 'Task A', minutesFocused: 0, completed: 0, interrupted: 0, started: 0 },
  ])} />)
  expect(screen.getByText('—')).toBeInTheDocument()
})

test('stop rate shows percentage when started > 0', () => {
  render(<StatsByTask data={makeData([
    { taskId: 't1', title: 'Task B', minutesFocused: 50, completed: 3, interrupted: 1, started: 4 },
  ])} />)
  expect(screen.getByText('25%')).toBeInTheDocument()
})

test('renders empty state when no task stats', () => {
  render(<StatsByTask data={makeData([])} />)
  expect(screen.getByText(/no data/i)).toBeInTheDocument()
})
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run src/features/stats/StatsByTask.test.tsx`
Expected: FAIL — module not found

- [ ] **Step 3: Implement StatsByTask**

Create `src/features/stats/StatsByTask.tsx`:

```typescript
import type { StatsData } from './useStatsData'
import { formatMinutes } from './useStatsData'

interface Props {
  data: StatsData
}

export function StatsByTask({ data }: Props) {
  const { taskStats } = data

  if (taskStats.length === 0) {
    return (
      <div style={{ padding: '32px', textAlign: 'center', color: 'var(--color-text-muted)' }}>
        No data for this period.
      </div>
    )
  }

  return (
    <div style={{ padding: '16px', overflowX: 'auto' }}>
      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 14 }}>
        <thead>
          <tr style={{ borderBottom: '1px solid var(--color-border)' }}>
            <th style={{ textAlign: 'left', padding: '8px 4px', color: 'var(--color-text-muted)', fontWeight: 500 }}>Task</th>
            <th style={{ textAlign: 'right', padding: '8px 4px', color: 'var(--color-text-muted)', fontWeight: 500 }}>Focused</th>
            <th style={{ textAlign: 'right', padding: '8px 4px', color: 'var(--color-text-muted)', fontWeight: 500 }}>Done</th>
            <th style={{ textAlign: 'right', padding: '8px 4px', color: 'var(--color-text-muted)', fontWeight: 500 }}>Stopped</th>
            <th style={{ textAlign: 'right', padding: '8px 4px', color: 'var(--color-text-muted)', fontWeight: 500 }}>Stop rate</th>
          </tr>
        </thead>
        <tbody>
          {taskStats.map(t => (
            <tr key={t.taskId} style={{ borderBottom: '1px solid var(--color-border)' }}>
              <td style={{ padding: '10px 4px' }}>{t.title}</td>
              <td style={{ padding: '10px 4px', textAlign: 'right', color: 'var(--color-accent)' }}>
                {formatMinutes(t.minutesFocused)}
              </td>
              <td style={{ padding: '10px 4px', textAlign: 'right' }}>{t.completed}</td>
              <td style={{ padding: '10px 4px', textAlign: 'right' }}>{t.interrupted}</td>
              <td style={{ padding: '10px 4px', textAlign: 'right', color: 'var(--color-text-muted)' }}>
                {t.started === 0 ? '—' : `${Math.round((t.interrupted / t.started) * 100)}%`}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run src/features/stats/StatsByTask.test.tsx`
Expected: PASS (all 5 tests)

- [ ] **Step 5: Commit**

```bash
git add src/features/stats/StatsByTask.tsx src/features/stats/StatsByTask.test.tsx
git commit -m "feat: StatsByTask component — ranked task list with stop rate"
```

---

### Task 7: `StatsByDay` component

**Files:**
- Create: `src/features/stats/StatsByDay.tsx`
- Create: `src/features/stats/StatsByDay.test.tsx`

- [ ] **Step 1: Write failing tests**

Create `src/features/stats/StatsByDay.test.tsx`:

```typescript
import { render, screen } from '@testing-library/react'
import { StatsByDay } from './StatsByDay'
import type { StatsData } from './useStatsData'

function makeData(dailyFocus: StatsData['dailyFocus']): StatsData {
  return {
    totalMinutesFocused: 0, totalCompleted: 0, totalInterrupted: 0,
    completionRate: null, weeklyTrend: [], taskStats: [], dailyFocus,
  }
}

const thirtyDays = Array.from({ length: 30 }, (_, i) => ({
  date: `2026-03-${String(i + 1).padStart(2, '0')}`,
  hours: i * 0.1,
}))

const sevenDays = Array.from({ length: 7 }, (_, i) => ({
  date: `2026-03-${String(i + 16).padStart(2, '0')}`,
  hours: i * 0.2,
}))

const twentyFourHours = Array.from({ length: 24 }, (_, i) => ({
  date: String(i),
  hours: i * 0.05,
}))

test('all-time: renders chart with 30-day data without crashing', () => {
  render(<StatsByDay data={makeData(thirtyDays)} filter="all" />)
  expect(screen.getByTestId('byday-chart')).toBeInTheDocument()
})

test('week: renders chart with 7-day data without crashing', () => {
  render(<StatsByDay data={makeData(sevenDays)} filter="week" />)
  expect(screen.getByTestId('byday-chart')).toBeInTheDocument()
})

test('today: renders chart with 24-hour data without crashing', () => {
  render(<StatsByDay data={makeData(twentyFourHours)} filter="today" />)
  expect(screen.getByTestId('byday-chart')).toBeInTheDocument()
})
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run src/features/stats/StatsByDay.test.tsx`
Expected: FAIL — module not found

- [ ] **Step 3: Implement StatsByDay**

Create `src/features/stats/StatsByDay.tsx`:

```typescript
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts'
import { format } from 'date-fns'
import type { StatsData, TimeFilter } from './useStatsData'

interface Props {
  data: StatsData
  filter: TimeFilter
}

function formatXLabel(date: string, filter: TimeFilter): string {
  if (filter === 'today') return date // already a hour string like "9"
  if (filter === 'week') {
    // date is YYYY-MM-DD, format as EEE
    return format(new Date(date + 'T12:00:00'), 'EEE')
  }
  // all-time: YYYY-MM-DD → MMM d
  return format(new Date(date + 'T12:00:00'), 'MMM d')
}

export function StatsByDay({ data, filter }: Props) {
  const { dailyFocus } = data

  const chartData = dailyFocus.map(d => ({
    label: formatXLabel(d.date, filter),
    hours: d.hours,
  }))

  return (
    <div style={{ padding: '16px' }}>
      <div data-testid="byday-chart" style={{ height: 220 }}>
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={chartData} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
            <XAxis
              dataKey="label"
              tick={{ fontSize: 10 }}
              interval={filter === 'all' ? 4 : 0}
            />
            <YAxis tick={{ fontSize: 11 }} unit="h" />
            <Tooltip formatter={(v: number) => [`${v.toFixed(1)}h`, 'Focus']} />
            <Bar dataKey="hours" fill="var(--color-accent)" radius={[3, 3, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run src/features/stats/StatsByDay.test.tsx`
Expected: PASS (all 3 tests)

- [ ] **Step 5: Commit**

```bash
git add src/features/stats/StatsByDay.tsx src/features/stats/StatsByDay.test.tsx
git commit -m "feat: StatsByDay component — daily focus bar chart"
```

---

### Task 8: `StatsTab` shell — time filter + sub-tab switcher

**Files:**
- Modify: `src/features/stats/StatsTab.tsx` (replace placeholder)
- Create: `src/features/stats/StatsTab.test.tsx`

- [ ] **Step 1: Write failing tests**

Create `src/features/stats/StatsTab.test.tsx`:

```typescript
import { render, screen, fireEvent } from '@testing-library/react'
import { StatsTab } from './StatsTab'
import { useStatsData } from './useStatsData'

vi.mock('./useStatsData')

const emptyData = {
  totalMinutesFocused: 0, totalCompleted: 0, totalInterrupted: 0,
  completionRate: null, weeklyTrend: [], taskStats: [], dailyFocus: [],
}

beforeEach(() => {
  vi.mocked(useStatsData).mockReturnValue(emptyData)
})

// ── time filter ───────────────────────────────────────────────────────────────

test('time filter defaults to All time', () => {
  render(<StatsTab />)
  const allBtn = screen.getByRole('button', { name: /all time/i })
  expect(allBtn).toHaveAttribute('aria-pressed', 'true')
})

test('clicking This week activates it', () => {
  render(<StatsTab />)
  fireEvent.click(screen.getByRole('button', { name: /this week/i }))
  expect(screen.getByRole('button', { name: /this week/i })).toHaveAttribute('aria-pressed', 'true')
  expect(screen.getByRole('button', { name: /all time/i })).toHaveAttribute('aria-pressed', 'false')
})

test('clicking Today activates it', () => {
  render(<StatsTab />)
  fireEvent.click(screen.getByRole('button', { name: /today/i }))
  expect(screen.getByRole('button', { name: /today/i })).toHaveAttribute('aria-pressed', 'true')
})

// ── sub-tabs ──────────────────────────────────────────────────────────────────

test('sub-tab defaults to Overview', () => {
  render(<StatsTab />)
  expect(screen.getByTestId('overview-chart')).toBeInTheDocument()
})

test('clicking By Task switches content', () => {
  render(<StatsTab />)
  fireEvent.click(screen.getByRole('button', { name: /by task/i }))
  // StatsByTask renders a table (or empty state)
  expect(screen.getByText(/no data/i)).toBeInTheDocument()
  expect(screen.queryByTestId('overview-chart')).not.toBeInTheDocument()
})

test('clicking By Day switches content', () => {
  render(<StatsTab />)
  fireEvent.click(screen.getByRole('button', { name: /by day/i }))
  expect(screen.getByTestId('byday-chart')).toBeInTheDocument()
  expect(screen.queryByTestId('overview-chart')).not.toBeInTheDocument()
})

test('time filter change calls useStatsData with new filter', () => {
  render(<StatsTab />)
  fireEvent.click(screen.getByRole('button', { name: /this week/i }))
  expect(vi.mocked(useStatsData)).toHaveBeenCalledWith('week')
})
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run src/features/stats/StatsTab.test.tsx`
Expected: FAIL — module mock works but buttons/testids not found (placeholder renders empty div)

- [ ] **Step 3: Implement StatsTab shell**

Replace `src/features/stats/StatsTab.tsx` with:

```typescript
import { useState } from 'react'
import { useStatsData, type TimeFilter } from './useStatsData'
import { StatsOverview } from './StatsOverview'
import { StatsByTask } from './StatsByTask'
import { StatsByDay } from './StatsByDay'

type SubTab = 'overview' | 'task' | 'day'

const TIME_FILTERS: { id: TimeFilter; label: string }[] = [
  { id: 'all', label: 'All time' },
  { id: 'week', label: 'This week' },
  { id: 'today', label: 'Today' },
]

const SUB_TABS: { id: SubTab; label: string }[] = [
  { id: 'overview', label: 'Overview' },
  { id: 'task', label: 'By task' },
  { id: 'day', label: 'By day' },
]

export function StatsTab() {
  const [filter, setFilter] = useState<TimeFilter>('all')
  const [subTab, setSubTab] = useState<SubTab>('overview')
  const data = useStatsData(filter)

  return (
    <div data-testid="stats-tab" style={{ display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden' }}>
      {/* Time filter pills */}
      <div style={{ display: 'flex', gap: '8px', padding: '12px 16px', borderBottom: '1px solid var(--color-border)' }}>
        {TIME_FILTERS.map(f => (
          <button
            key={f.id}
            role="button"
            aria-pressed={filter === f.id}
            onClick={() => setFilter(f.id)}
            style={{
              padding: '4px 14px', borderRadius: 20, fontSize: 13, cursor: 'pointer',
              background: filter === f.id ? 'var(--color-accent)' : 'transparent',
              color: filter === f.id ? '#fff' : 'var(--color-text-muted)',
              border: filter === f.id ? 'none' : '1px solid var(--color-border)',
            }}
          >
            {f.label}
          </button>
        ))}
      </div>

      {/* Sub-tab switcher */}
      <div style={{ display: 'flex', gap: '4px', padding: '8px 16px', borderBottom: '1px solid var(--color-border)' }}>
        {SUB_TABS.map(s => (
          <button
            key={s.id}
            role="button"
            aria-pressed={subTab === s.id}
            onClick={() => setSubTab(s.id)}
            style={{
              padding: '6px 16px', fontSize: 13, cursor: 'pointer', borderRadius: 6,
              background: subTab === s.id ? 'var(--color-accent)' : 'transparent',
              color: subTab === s.id ? '#fff' : 'var(--color-text-muted)',
              border: subTab === s.id ? 'none' : '1px solid var(--color-border)',
              fontWeight: subTab === s.id ? 600 : 400,
            }}
          >
            {s.label}
          </button>
        ))}
      </div>

      {/* Sub-tab content */}
      <div style={{ flex: 1, overflow: 'auto' }}>
        {subTab === 'overview' && <StatsOverview data={data} />}
        {subTab === 'task' && <StatsByTask data={data} />}
        {subTab === 'day' && <StatsByDay data={data} filter={filter} />}
      </div>
    </div>
  )
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run src/features/stats/StatsTab.test.tsx`
Expected: PASS (all 7 tests)

- [ ] **Step 5: Run full test suite**

Run: `npm test`
Expected: PASS — all tests (≥ 165 existing + new stats tests)

- [ ] **Step 6: Commit**

```bash
git add src/features/stats/StatsTab.tsx src/features/stats/StatsTab.test.tsx
git commit -m "feat: StatsTab shell — time filter pills + sub-tab switcher + wiring complete"
```

---

> **Implementation complete.** After all tasks pass, use `superpowers:finishing-a-development-branch` to merge, create a PR, or keep the branch as-is.
