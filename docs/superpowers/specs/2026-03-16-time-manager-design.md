# Time Manager App — Design Spec
**Date:** 2026-03-16
**Status:** Approved

---

## Overview

A personal time management web application combining a smart rich-text note editor, a todo list with subtasks and tags, a weekly kanban schedule, and a per-task Pomodoro timer with full session history. All data is stored locally in the browser (IndexedDB). No backend, no login, no internet required.

---

## Tech Stack

| Concern | Choice |
|---|---|
| Build | Vite + React 18 + TypeScript |
| State | Zustand (one store per domain) |
| Local DB | Dexie.js (IndexedDB) |
| Rich text | TipTap |
| Drag & drop | dnd-kit |
| Date utils | date-fns |

---

## Architecture

### State → Repository → Dexie

All app state lives in Zustand stores. Every mutation goes through a repository layer before hitting Dexie. This keeps components clean and makes the persistence layer swappable later.

```
Component → Zustand Store → Repository → Dexie (IndexedDB)
```

### Project Structure

```
src/
  features/
    tasks/        # Task list, subtasks, drag-drop, task detail panel
    schedule/     # 7-day kanban weekly view
    notes/        # TipTap rich text notes
    pomodoro/     # Timer UI + session logic
    tags/         # Tag management
  db/             # Dexie schema + repositories (TaskRepo, NoteRepo, etc.)
  store/          # Zustand stores (taskStore, noteStore, pomodoroStore, tagStore)
  components/     # Shared UI components (Toast, Badge, EmptyState, etc.)
```

### V2 Readiness

- **AI features (v2):** TipTap's extension system allows adding AI commands without rewriting the editor. The `linkedTaskIds` field on notes is the hook for AI summarization and task extraction.
- **Cloud sync (future):** The repository layer is the intended interception point. Adding Supabase sync means wrapping repositories — no component changes needed.
- **Pomodoro customization (v2):** `PomodoroSession.durationMinutes` is stored per-session, making custom durations a drop-in addition.

---

## Data Models

### Task

```typescript
{
  id: string
  title: string
  description?: string        // plain text summary (intentionally plain text in v1; rich text deferred to v2)
  completed: boolean
  parentId?: string           // set if this is a subtask
  order: number               // float, scoped per (parentId | null) group
  tagIds: string[]
  scheduledDay?: string       // ISO date YYYY-MM-DD, used by kanban
  createdAt: string
  updatedAt: string
}
```

- Subtasks are tasks with a `parentId` — same table, one level deep in v1.
- `order` is scoped per `(parentId | null)` context: top-level tasks are ordered within the null group, subtasks are ordered within their parent group. Drag-and-drop reindexing operates only within the relevant group.
- If two `order` values within the same group come within 0.001 of each other, all `order` values in that group are reindexed immediately in the same transaction.
- **Deletion cascade:** deleting a task removes all associated `PomodoroSession` rows and the `PomodoroStats` row in the same Dexie transaction.

### Tag

```typescript
{
  id: string
  name: string                // free-form text
  color: string               // hex color, e.g. "#3b82f6"
}
```

- **Deletion cascade:** deleting a tag removes its `id` from `tagIds` on all tasks and notes in the same Dexie transaction. No stale IDs are left behind.
- Color is assigned via a popover with a palette of 12 preset colors when creating or editing a tag.

### Note

```typescript
{
  id: string
  title: string               // plain text <input> rendered above the editor; defaults to "Untitled"
  content: string             // TipTap JSON (serialized)
  tagIds: string[]
  linkedTaskIds: string[]     // re-derived from TipTap document on every save
  createdAt: string
  updatedAt: string
}
```

- Notes over 1MB show a size warning (no hard limit in v1).
- The notes table has a Dexie multi-entry index on `linkedTaskIds` for performant reverse-lookup queries.
- `linkedTaskIds` is not maintained incrementally — it is re-derived from all task chip `NodeView`s in the TipTap document on every save.

### PomodoroSession

```typescript
{
  id: string
  taskId?: string             // undefined only for break sessions with no preceding work session
  startedAt: string           // ISO timestamp
  completedAt: string | null  // null = interrupted or abandoned; always present, never omitted
  type: 'work' | 'short_break' | 'long_break'
  durationMinutes: number     // 25, 5, or 15
}
```

- `completedAt` is always stored explicitly: set to the ISO timestamp on completion, or `null` when interrupted. The field is never `undefined`.
- Break sessions carry the `taskId` of the work session that immediately triggered the break (i.e., the session whose completion prompted the break). "Preceding" always means the specific work session that just completed, not a global last-session lookup.
- If no prior work session exists, `taskId` is `undefined`.
- Only `type: 'work'` sessions contribute to per-task stats.
- Break sessions with `taskId = undefined` are orphaned — acceptable in v1; they are only cleaned up when Dexie storage is fully cleared.

### PomodoroStats

```typescript
{
  taskId: string              // primary key, 1:1 with task
  totalStarted: number
  totalCompleted: number
  totalInterrupted: number
  totalMinutesFocused: number
  lastSessionAt: string | null
  updatedAt: string
}
```

**Accumulation rules (work sessions only):**
- `totalStarted` — incremented when a work session row is created (i.e., the timer starts).
- `totalCompleted` — incremented when a work session ends with `completedAt` set (full 25 min elapsed).
- `totalInterrupted` — incremented when a work session ends with `completedAt = null` (user stopped, or stale-session recovery). Stale-session recovery counts as interrupted.
- `totalMinutesFocused` — sum of `durationMinutes` for completed work sessions only (not breaks, not interrupted).
- Break sessions do not affect any `PomodoroStats` counter.
- Upsert behavior: if no `PomodoroStats` row exists for the task yet, create one with all counters at zero, then apply the increment. This is the standard upsert pattern.
- Raw sessions are kept for the full timeline view in task detail.

---

## Zustand Store Shapes (key fields)

### `pomodoroStore`

```typescript
{
  activeSession: {
    taskId?: string           // always defined for work sessions; undefined only for break sessions with no preceding work session
    sessionId: string
    startedAt: string
    type: 'work' | 'short_break' | 'long_break'
  } | null
  workSessionCount: number    // global count of completed work sessions; resets on page reload
  // ...countdown state, etc.
}
```

- `activeSession` is in-memory only (Zustand, not Dexie).
- On app load, `activeSession` is reconstructed from the open `PomodoroSession` row (any row where `completedAt = null`) **before** stale-session recovery runs. If a stale session is found and marked interrupted, `activeSession` is set to `null`.

---

## UI Layout

Four tabs: **Home**, **Tasks**, **Schedule**, **Notes**.

### Home Tab

- Active Pomodoro timer at top (large countdown, start/stop, dot indicators for session count).
- Today's tasks below — tasks with `scheduledDay` matching today's ISO date.
- Currently active task highlighted with 🍅 indicator.

### Tasks Tab

- Add task input at top.
- Filterable by tag.
- Each task row: drag handle, checkbox, title, tags, pomodoro count badge.
- Subtasks rendered indented below parent, separated by a left border.
- Click a task → opens Task Detail Panel (slides in from right).

**Task Detail Panel:**
- Title, description (plain text input), subtasks, tags, scheduled day picker.
- Pomodoro stats summary: total started / completed / interrupted / minutes focused.
- Full session history list (timestamp, type, duration, completed/interrupted).
- "Referenced in notes" section — live reverse query on the notes table via `linkedTaskIds` index.

### Schedule Tab

- Week starts on **Monday** (ISO 8601). Use `date-fns` `startOfISOWeek` for week boundary calculations.
- 7-day kanban. Columns = Mon–Sun of the displayed week.
- **Week navigation:** prev/next arrow buttons at the top navigate one week at a time. Current week is the default.
- **Unscheduled tasks panel:** a collapsible sidebar within the Schedule tab listing tasks where `scheduledDay` is `undefined`. Tasks with a `scheduledDay` outside the displayed week are **not** shown here — they appear in their own week when the user navigates to it.
- Users drag from the unscheduled panel into a day column to assign a `scheduledDay`. This avoids any cross-tab drag requirement.
- **Removing a scheduled day:** a task card in a day column has a `×` button (visible on hover). Clicking it clears `scheduledDay` (sets to `undefined`) and moves the task back to the unscheduled panel. Users can also drag a card from a day column back into the unscheduled panel to clear `scheduledDay`.
- Subtasks can have an independent `scheduledDay` — they are not required to match their parent. The scheduled day picker is available for both tasks and subtasks in the Task Detail Panel.
- Task cards and subtask cards are both shown in day columns independently. A subtask card displays its title and tags; clicking it opens the Task Detail Panel (which shows the subtask in context of its parent).
- Dragging a card between day columns updates `scheduledDay` only — it does not change `order` or `parentId`. Cards within a column are ordered by the task list `order` and are not reorderable within the kanban column.
- Empty day columns remain visible as droppable zones with dashed border.

### Notes Tab

- Left sidebar: note list + "New note" button.
- Right: plain text `<input>` for the note title, followed by the TipTap editor below it. Editor supports bold, italic, headings, bullet lists, code blocks.
- Tags displayed below the title input.
- **`@` task picker:**
  - Triggers when `@` is typed and the immediately preceding character is whitespace or the cursor is at the start of a line. Does not trigger mid-word (e.g., `email@` does not open the picker).
  - After `@`, subsequent characters filter the task list in real time (e.g., `@des` shows tasks matching "des"). The picker stays open while the user types — there is no separate search box.
  - Opens a floating picker searchable by task title.
  - Dismissed by pressing Escape or clicking outside (the `@` text remains as plain text if dismissed without selecting).
  - Inserts a TipTap inline `NodeView` chip on selection.
  - **Chip rendering:** shows task title + completion badge (○ / ✓). Clicking opens the Task Detail Panel.
  - **Chip on task deletion:** renders as tombstone ("Deleted task"). Cleaned up on next note save.
  - `linkedTaskIds` is re-derived from all chip `NodeView`s in the document on every save (not incremental).
- **Linked tasks panel:** rendered in the editor pane below the note content (not in the left sidebar). Shows all tasks linked via `@` in the current note.

### Tags Management

Tags are managed inline — no dedicated tab.

- **Creating a tag:** typing in a task or note's tag input field autocompletes existing tags or creates a new one on Enter.
- **Color assignment:** on tag creation (or edit), a popover shows 12 preset hex colors to choose from.
- **Deleting a tag:** a `×` icon appears on the tag badge when the tag input is in edit/focus mode. Clicking it triggers the deletion cascade.
- **Renaming:** click the tag name in the tag input to edit inline. Renaming is an in-place update of the `Tag` row only — no cascade to tasks or notes is required because they reference tags by `id`, not by name.

---

## Pomodoro Timer

**Standard intervals (v1):**
- Work: 25 min
- Short break: 5 min
- Long break: 15 min (after every 4 completed work sessions)

**Long break counter:**
- Global across all tasks.
- Only completed work sessions increment it (interrupted sessions do not).
- Held in Zustand (in-memory); **always resets on page reload** — this is intentional for v1. The long-break cycle does not survive navigation or refresh.

**Flow:**
1. User clicks 🍅 on any task → activates that task's pomodoro. Work sessions always have a defined `taskId` — it is not possible to start a work session without selecting a specific task.
2. If another session is already active, it is interrupted immediately and a toast is shown: "Previous session interrupted." No confirmation prompt.
3. Timer counts down. On completion → audio beep plays + browser tab title updates to "⏰ Timer complete! — Time Manager" → prompts user to start break.
4. On stop/abandon → writes interrupted session immediately.
5. Only one active pomodoro at a time.
6. Home tab always shows the active session regardless of which tab the user is on.

**Timer completion notification (no Notifications API):**
- Audio: short `AudioContext` beep (no external file required).
- Tab title: updated to "⏰ Timer complete! — Time Manager" until the user dismisses or starts the break.

**Multi-tab handling:**
- The tab that starts a session is the **controller tab** — it owns the countdown and writes to Dexie.
- On session start/stop/complete, the controller tab writes `{ sessionId, taskId, type, startedAt, status }` to `localStorage` key `"pomodoro:activeSession"`. Other tabs listen via the `storage` event and render a read-only view of the timer.
- If the controller tab is closed while a session is active, no tab takes over. The session remains open in Dexie (`completedAt = null`) and is recovered as interrupted on the next app load if it is older than 2 hours. Sessions closed within 2 hours of last activity are left open until recovered.

**Stale session recovery:**
- On app load, `activeSession` is reconstructed from any open `PomodoroSession` row (`completedAt = null`).
- The 2-hour threshold is measured from `startedAt` compared to the current wall clock at app load time (`Date.now() - Date.parse(session.startedAt) > 2 * 60 * 60 * 1000`).
- If the session exceeds the threshold, write the current ISO timestamp as `completedAt` is NOT done — `completedAt` stays `null` to signal interrupted. The Dexie row is left as-is (already `completedAt = null`), `PomodoroStats` is upserted treating it as an interrupted session, and `activeSession` is set to `null`. No write to `PomodoroSession` is needed; the row is already in the correct interrupted state.
- On app load, the `localStorage` key `"pomodoro:activeSession"` is always cleared first. Dexie is the sole source of truth for session reconstruction — `localStorage` is only used for live cross-tab broadcasting and is not trusted on load.
- Losing the pending long break on reload is an accepted v1 limitation (`workSessionCount` always resets to 0 on load).

---

## Drag & Drop

- **Task list:** drag by handle to reorder within the same group (`parentId` scope). Persists updated `order` to Dexie on drop.
- **Subtasks:** drag within their parent's group only. Cannot be promoted to top-level in v1.
- **Schedule kanban:** drag cards between day columns (updates `scheduledDay` only — no `order` or `parentId` change). Cards within a column are not reorderable in the kanban.
- **Unscheduled panel → day column:** assigns `scheduledDay`.
- **Invalid drop:** snap back (dnd-kit default).

---

## Error Handling

| Scenario | Behavior |
|---|---|
| Dexie write failure | Rollback optimistic update, show toast: "Couldn't save changes — try again" |
| Dexie fails to open (corrupt/quota) | Show recovery screen with one option: "Export backup (JSON)". Import is deferred to v2 — no import button in v1. |
| JSON backup export format | `{ version: 1, exportedAt: string, tasks: Task[], notes: Note[], tags: Tag[], pomodoroSessions: PomodoroSession[] }` — `PomodoroStats` is intentionally omitted; it is always recomputed from `pomodoroSessions` on import. |
| Note over 1MB | Show inline warning, no hard block |
| Order collision (< 0.001 apart) | Re-index all `order` values in that group immediately in the same transaction |
| Drop outside valid zone | Snap back (dnd-kit default) |
| Previous pomodoro interrupted by new start | Show toast: "Previous session interrupted" |

**Empty states:**
- Home, no active timer → "No active timer. Click 🍅 on a task to start a Pomodoro."
- Home, no tasks scheduled today → "Nothing scheduled for today. Go to the Schedule tab and drag tasks into today's column."
- No tasks → "No tasks yet. Add one above."
- Empty schedule day → dashed droppable border (no text label needed).
- No notes → "No notes yet. Create one to get started."

---

## Out of Scope (v1)

- Cloud sync / Supabase backend
- AI features (summarize, suggest tags, extract tasks)
- Custom Pomodoro durations
- Rich text for task descriptions
- Mobile / responsive layout
- OS notifications (Notifications API) for timer completion
- Recurring tasks
- Task due dates (only scheduled day)
- Long-press gestures (mobile out of scope)
