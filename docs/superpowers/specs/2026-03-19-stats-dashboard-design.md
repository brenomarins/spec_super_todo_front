# Stats Dashboard Design

## Goal

Add a **Stats** tab to the app where the user can review their productivity: how many hours they focused on each task, how their focus time is distributed across days, and how often they had to stop a session. The dashboard shows all-time totals by default, with a filter to zoom into the current week or today.

## Context

The app already records every pomodoro session in `PomodoroSessions` (Dexie table) and maintains per-task aggregates in `PomodoroStats`. No new data collection is needed — the dashboard is purely a read/display layer over existing data.

Sessions have `type: 'work' | 'short_break' | 'long_break'`. Only `work` sessions are counted for all stats. A session is **completed** when `completedAt !== null`; **interrupted** when `completedAt === null` and `isOpen === 0`; **open/active** when `isOpen === 1`. "Focused time" = sum of `durationMinutes` for completed work sessions (consistent with how `totalMinutesFocused` is computed in `PomodoroStats`).

**Open sessions are excluded from all stats.** An in-progress session is neither completed nor interrupted and does not contribute to any count or focused-time total until it resolves.

---

## Navigation

A fifth tab **Stats** is added to the tab bar after Notes:

```
Home | Tasks | Schedule | Notes | Stats
```

`TabBar.tsx` and `App.tsx` are updated accordingly.

---

## Time Filter

A pill-style filter at the top of the Stats tab controls all three sub-tabs simultaneously:

```
[ All time ]  [ This week ]  [ Today ]
```

- **All time** (default) — no date restriction
- **This week** — sessions where `startedAt` falls within the current ISO week (Mon–Sun), same week as the Schedule tab uses
- **Today** — sessions where `startedAt` is today's date

State lives in `StatsTab` as `useState<'all' | 'week' | 'today'>('all')`.

---

## Sub-tabs

Three sub-tabs inside the Stats tab:

```
[ Overview ]  [ By Task ]  [ By Day ]
```

Sub-tab state lives in `StatsTab` as `useState<'overview' | 'task' | 'day'>('overview')`.

---

### Overview Sub-tab (`StatsOverview.tsx`)

#### Summary Cards

Four cards in a single row:

| Card | Value | Formula |
|---|---|---|
| Total focused | `Xh Ym` | Sum of `totalMinutesFocused` across all `PomodoroStats` records (filtered by time range) |
| Sessions completed | integer | Sum of `totalCompleted` across all `PomodoroStats` (filtered) |
| Sessions interrupted | integer | Sum of `totalInterrupted` across all `PomodoroStats` (filtered) |
| Completion rate | `X%` | `totalCompleted / (totalCompleted + totalInterrupted)`, shown as percentage; `—` if both are zero |

**Time filter note:** When the filter is "This week" or "Today", totals cannot be derived from `PomodoroStats` (which are all-time aggregates). In those cases, totals are computed directly from the `PomodoroSessions` table filtered by date range.

#### Weekly Trend Chart

A bar chart (Recharts `BarChart`) below the summary cards:

- **All time filter** → one bar per ISO week, last 8 weeks, X-axis shows week label (e.g. `Mar 10`, `Mar 17`)
- **This week filter** → one bar per day (Mon–Sun), X-axis shows day abbreviation (Mon, Tue…)
- **Today filter** → one bar per hour (0–23), X-axis shows hour

Y-axis: hours focused (decimal, e.g. 2.5h). Bars show completed work session minutes summed and converted to hours.

---

### By Task Sub-tab (`StatsByTask.tsx`)

A ranked list of all tasks that have at least one work session, sorted by `totalMinutesFocused` descending.

Each row:

| Column | Value |
|---|---|
| Task title | From task store by `taskId`; if the task is not found, skip the row (tasks are deleted alongside their sessions and stats via `deleteByTaskId`, so orphaned stats cannot occur in normal operation) |
| Focused | `Xh Ym` from `minutesFocused` |
| Completed | `completed` count |
| Interrupted | `interrupted` count |
| Stop rate | `interrupted / started` as `X%`; `—` when `started === 0` |

**Time filter:** When "This week" or "Today" is active, per-task numbers are re-computed from sessions (not from `PomodoroStats`), grouped by `taskId`. Only sessions with `type === 'work'`, `completedAt !== null` (for focused time and completed count), or `completedAt === null` and `isOpen === 0` (for interrupted count) are considered. Sessions with `taskId` undefined are excluded from the By Task list entirely; they are also excluded from Overview totals since work sessions always have a `taskId` set.

Subtasks are included — each has its own `PomodoroStats` entry and appears as a separate row with its own title.

---

### By Day Sub-tab (`StatsByDay.tsx`)

A bar chart (Recharts `BarChart`) — one bar per day.

- **All time** → last 30 calendar days, X-axis shows `MMM d` date labels
- **This week** → Mon–Sun of current week
- **Today** → hours 0–23 (hourly breakdown of today)

Y-axis: hours focused. Data source: `PomodoroSessions` table, `type === 'work'` and `completedAt !== null`, grouped by date derived from `startedAt`.

**V2 note:** This view will be replaced in a future version by a GitHub-style activity heatmap (full year at a glance) with a drill-down bar chart that appears when clicking a day or week on the heatmap.

---

## Data Hook: `useStatsData`

```typescript
// src/features/stats/useStatsData.ts

type TimeFilter = 'all' | 'week' | 'today'

interface StatsData {
  // Overview cards
  totalMinutesFocused: number
  totalCompleted: number
  totalInterrupted: number
  completionRate: number | null   // null when no sessions

  // Weekly trend (Overview chart)
  weeklyTrend: { label: string; hours: number }[]

  // By Task
  taskStats: {
    taskId: string
    title: string
    minutesFocused: number
    completed: number
    interrupted: number
    started: number
  }[]

  // By Day
  dailyFocus: { date: string; hours: number }[]   // date = YYYY-MM-DD or hour string for Today
}

function useStatsData(filter: TimeFilter): StatsData
```

**Implementation strategy:**

- For `filter === 'all'`: aggregate from `PomodoroStats` table (fast, pre-computed). Query sessions only for chart data (weekly trend, daily focus).
- For `filter === 'week'` or `'today'`: query `PomodoroSessions` directly, filter by date range, compute all aggregates in-memory. In both paths, when computing from sessions: only `type === 'work'` sessions are considered; only `completedAt !== null` sessions contribute to focused time and completed count; only `completedAt === null && isOpen === 0` sessions contribute to interrupted count; `isOpen === 1` (active) sessions are excluded entirely.
- Task titles are resolved by joining with `useTaskStore().tasks`. Tasks not found in the store are skipped (their sessions and stats are deleted alongside the task).
- The hook uses `useState` + `useEffect` with an async Dexie query. Re-runs when `filter` changes.

---

## Chart Library

**Recharts** (`recharts`) — one new dependency.

- React-native (renders SVG, no canvas)
- Tree-shakeable
- Used for: `BarChart` with `Bar`, `XAxis`, `YAxis`, `Tooltip`, `ResponsiveContainer`

Install: `npm install recharts`

---

## File Structure

```
src/
  features/
    stats/
      StatsTab.tsx          # Tab shell — time filter + sub-tab switcher
      StatsOverview.tsx     # Overview sub-tab (cards + weekly trend chart)
      StatsByTask.tsx       # By Task sub-tab (ranked task list)
      StatsByDay.tsx        # By Day sub-tab (bar chart)
      useStatsData.ts       # Data hook — queries Dexie, returns StatsData
  components/
    TabBar.tsx              # MODIFIED — add Stats tab
  App.tsx                   # MODIFIED — render StatsTab
```

No new Dexie schema changes. No new types in `src/types/index.ts`.

---

## Formatting Helper

Focused time is displayed as `Xh Ym` (e.g. `2h 5m`, `0h 25m`). A small utility function `formatMinutes(minutes: number): string` lives in `useStatsData.ts` or a shared location.

```typescript
function formatMinutes(minutes: number): string {
  const h = Math.floor(minutes / 60)
  const m = minutes % 60
  return `${h}h ${m}m`
}
```

---

## Testing Strategy

- **`useStatsData`**: unit tests with mocked Dexie — verify aggregation logic for each filter mode; verify open sessions are excluded; verify `completionRate` is `null` when no sessions; verify tasks not in the store are skipped
- **`StatsOverview`**: unit test — renders correct card values given mocked `StatsData`; chart renders without crashing (no assertions on SVG internals)
- **`StatsByTask`**: unit test — tasks sorted by minutes focused descending; stop rate shown as `—` when `started === 0`
- **`StatsByDay`**: unit test — correct number of bars for each filter mode; chart renders without crashing
- **`StatsTab`**: unit test — time filter buttons change active state; sub-tab buttons switch visible content

---

## Out of Scope

- Exporting stats (CSV, PDF)
- Push notifications or goals ("you focused X hours this week")
- Comparing two time periods side by side
- Break session tracking in the charts
- V2 heatmap (noted above as future work)
