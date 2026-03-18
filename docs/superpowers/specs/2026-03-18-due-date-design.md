# Due Date Feature Design

## Goal

Add a due date (deadline) field to tasks. Tasks are grouped in TaskList by urgency — Overdue, Due Today, Due This Week, Due Later, No Due Date. An overdue badge renders in red on task cards everywhere they appear.

## Context

The app already has `scheduledDay` on tasks — the day a task is assigned to work on in the weekly Schedule kanban. Due date is a separate concept: a deadline indicating when the task must be done. The two fields coexist independently.

---

## Data Model

### Task type (`src/types/index.ts`)

Add one optional field:

```typescript
dueDate?: string   // ISO date YYYY-MM-DD — deadline, independent of scheduledDay
```

### Dexie schema (`src/db/db.ts`)

Add a new `version(2)` block. Do NOT modify `version(1)` — existing users' databases must upgrade gracefully. Only the `tasks` index changes; other tables are not listed (Dexie carries them over automatically from the previous version):

```typescript
this.version(2).stores({
  tasks: 'id, parentId, scheduledDay, dueDate, order, *tagIds',
})
```

Dexie handles the schema upgrade automatically when the user next opens the app. Existing tasks without `dueDate` are unaffected (sparse index). No `upgrade()` callback is needed since adding a new index requires no data migration.

**Note on subtasks:** Subtasks share the `Task` type and may technically carry a `dueDate` value, but it is ignored for all grouping and badge purposes. Only top-level tasks are grouped by due date. `TaskList` already receives top-level `tasks` and `subtasks` as separate props, so no additional guard is needed — subtasks are never iterated through the grouping logic.

---

## Components

### `DueDateBadge` (`src/components/DueDateBadge.tsx`)

A small inline badge displaying the due date.

**Props:**
```typescript
interface DueDateBadgeProps {
  dueDate?: string       // ISO YYYY-MM-DD — if undefined, renders nothing
  completed: boolean
}
```

**Behavior:**
- If `dueDate` is `undefined` → renders `null` (no output)
- If `!completed && dueDate < todayISO()` → render red (`color: var(--color-danger)`) with `!` prefix (e.g., `! Mar 15`). String comparison is correct here because both `dueDate` and `todayISO()` are YYYY-MM-DD strings, which sort lexicographically as dates.
- Otherwise (future date, due today, or completed regardless of date) → render in muted color (`color: var(--color-text-muted)`) (e.g., `Mar 20`)
- "Due today" has no special urgency styling — muted color, no `!` prefix. Urgency for today is conveyed by the group heading in `TaskList`; the badge's only urgency signal is the red `!` for overdue incomplete tasks.
- Completed tasks always render muted, even if their due date is in the past
- Format: `MMM d` via `date-fns/format`

**Call sites:** Since `dueDate` is optional with an internal null-return guard, callers can simply pass `dueDate={task.dueDate}` directly without a conditional wrapper. Used in: `TaskItem`, `ScheduleTaskCard` (`src/features/schedule/ScheduleTaskCard.tsx`), HomeTab task rows.

---

### `TaskGroupSection` (`src/features/tasks/TaskGroupSection.tsx`)

A collapsible section wrapping a group of tasks.

**Props:**
```typescript
interface TaskGroupSectionProps {
  label: string          // e.g. "OVERDUE"
  count: number          // number of top-level tasks in this group (subtasks not counted)
  defaultOpen?: boolean  // default true
  isOverdue?: boolean    // when true, header text is red
  children: React.ReactNode
}
```

**Behavior:**
- Header shows `{LABEL} ({count})` in uppercase text
- Click header to toggle open/closed
- Collapsed state is local (not persisted)
- When `isOverdue` is true, header text is styled red (`color: var(--color-danger)`) instead of muted
- `count` is passed as the length of the top-level task array for that group (e.g., `overdueGroup.length`), not the number of rendered DOM children. Subtasks rendered inside `TaskItem` are not counted.
- `defaultOpen` defaults to `true` — destructure as `{ defaultOpen = true, ... }` in the implementation.

---

### `TaskList` (modified `src/features/tasks/TaskList.tsx`)

Restructured to render five `TaskGroupSection`s instead of a flat sorted list.

**New props added to `TaskListProps`:**
```typescript
overdueOnly: boolean    // when true, render only the Overdue group
```

**`onTaskReorder` prop:** Becomes optional (`onTaskReorder?: (ids: string[]) => void`) since it is scoped to the No Due Date group after the refactor. Making it optional avoids forcing callers that don't use drag-and-drop (tests, future uses) to supply a no-op handler. It is wired only into the `handleDragEnd` callback inside the No Due Date group's `DndContext`. Tasks in other groups do not trigger reordering. Callers that do supply `onTaskReorder` (such as `TasksTab`) continue to pass it unchanged — it is forwarded only to the No Due Date group's `handleDragEnd`.

**End-of-week computation:**

To avoid UTC offset issues (consistent with the rest of the codebase), compute today using `todayISO()` and construct the Date with a noon anchor:

```typescript
const today = todayISO()
const weekDays = getWeekDays(new Date())   // getWeekDays applies its own noon anchor internally
const endOfWeek = weekDays[6]  // Sunday — last element of the 7-day ISO week
```

Note: Use `new Date()` (not `new Date(today + 'T12:00:00')`) to stay consistent with every other `getWeekDays` call in the codebase (`WeekNavigation`, `ScheduleTab`). `getWeekDays` re-anchors its input using UTC accessors, so passing `new Date()` is safe. `today` is still derived independently via `todayISO()` for the grouping string comparisons.

**Grouping logic** (evaluated at render time):

| Group | Condition |
|---|---|
| Overdue | `dueDate !== undefined && dueDate < today` |
| Due Today | `dueDate === today` |
| Due This Week | `dueDate !== undefined && dueDate > today && dueDate <= endOfWeek` |
| Due Later | `dueDate !== undefined && dueDate > endOfWeek` |
| No Due Date | `dueDate === undefined` |

All tasks (completed and incomplete) are placed in the group matching their `dueDate`. Completed tasks appear in their natural group with strikethrough styling. A completed task with a past due date appears in the Overdue group (rendered with strikethrough + muted badge, not red — the `DueDateBadge` handles this automatically via its `completed` prop).

**Sorting within groups:**
- Overdue, Due Today, Due This Week, Due Later → sorted by `dueDate` ascending
- No Due Date → sorted by existing `order` field (manual drag-and-drop preserved)

**Drag-and-drop restructuring:**
- The `DndContext` is always rendered (at the top level of `TaskList`'s return), regardless of which groups are visible. When the No Due Date group is hidden (e.g., `overdueOnly` mode), the `SortableContext` simply has an empty `items` array and no drag interaction occurs — this is safe with dnd-kit.
- The `SortableContext` and `SortableTaskItem` wrapper are used only for the No Due Date group's task list.
- Tasks in the Overdue, Due Today, Due This Week, and Due Later groups are rendered without `useSortable`. Extract a named internal component `NonSortableTaskItem` inside `TaskList.tsx` accepting the same props as `SortableTaskItem` minus the `useSortable` wiring. It renders a plain `<div>` container, filters `subtasks` by `parentId`, and renders them exactly as `SortableTaskItem` does — this avoids duplicating the subtask-rendering logic. `TaskItem` receives `dragHandleProps={null}` (which causes `TaskItem` to hide the drag handle). Because `NonSortableTaskItem` uses a plain `<div>` with no `setNodeRef` or `useDraggable`, dnd-kit does not register it as a drag source — `handleDragEnd` will only ever fire for tasks in the No Due Date group. Strikethrough for completed tasks is handled entirely within `TaskItem` (existing behavior), so `NonSortableTaskItem` needs no additional completed-state styling.

**`overdueOnly` mode:** `TaskList` filters groups internally — when `overdueOnly` is true, only the Overdue group is rendered. This filtering happens inside `TaskList`, not as a pre-filter in `TasksTab`.

**Tag filter interaction:** `TasksTab` pre-filters tasks by `filterTagId` before passing to `TaskList` (existing behavior). The tag filter and `overdueOnly` can be active simultaneously. Tag filtering stays in `TasksTab` because it was already there. `overdueOnly` filtering is kept inside `TaskList` because it operates on the groups that `TaskList` now owns — collocating group-level filtering with the grouping logic avoids threading an additional derived array through props.

**Empty groups:** Hidden (not rendered). If all five groups are empty (e.g., the tag filter eliminates every task), render `<EmptyState message="No tasks yet. Add one above." />` as before.

---

### `TagFilter` (modified `src/features/tasks/TagFilter.tsx`)

Gains an **"Overdue only"** toggle chip alongside the existing tag chips.

**Updated props:**
```typescript
interface TagFilterProps {
  tags: Tag[]
  selectedId: string | null
  onSelect: (id: string | null) => void
  overdueOnly: boolean                  // NEW
  onOverdueToggle: () => void           // NEW
}
```

**Early-return guard:** The existing `if (tags.length === 0) return null` must be updated to:

```typescript
if (tags.length === 0 && !overdueOnly) return null
```

This ensures the "Overdue only" chip is always visible even when no tags exist.

**Behavior:**
- "Overdue only" toggle chip renders before the tag chips
- When active: chip uses `background: var(--color-danger)` and `color: #fff`, consistent with its urgency semantic
- Both `selectedId` and `overdueOnly` can be active simultaneously

**State ownership:** `overdueOnly` boolean state lives in `TasksTab` (alongside `filterTagId`), passed down to both `TagFilter` and `TaskList`.

---

### `TaskDetailPanel` (modified `src/features/tasks/TaskDetailPanel.tsx`)

Gains a "Due Date" input row below the existing "Scheduled Day" row.

```
[ Scheduled Day ] [ date input ]
[ Due Date      ] [ date input ]
```

Saves immediately on change (same pattern as Scheduled Day). Clearing the input sets `dueDate` to `undefined`. The due date input reads directly from `task.dueDate ?? ''` and calls `onUpdate` on every `onChange` — no additional `useState` is needed for this field.

---

### `TasksTab` (modified `src/features/tasks/TasksTab.tsx`)

Adds `overdueOnly` state:

```typescript
const [overdueOnly, setOverdueOnly] = useState(false)
```

Passes `overdueOnly` and `onOverdueToggle={() => setOverdueOnly(o => !o)}` to `TagFilter`.
Passes `overdueOnly` to `TaskList`.

---

### Badge placement

| Location | Placement |
|---|---|
| `TaskItem` (TaskList) | Right side of card — after the pomodoro count `<span>`, before the start-pomodoro `<button>` (order: count → due date → start button) |
| `ScheduleTaskCard` (`src/features/schedule/ScheduleTaskCard.tsx`) | Inside a tag flex `div` below the title, as a last sibling after the `TagBadge` elements |
| HomeTab task rows | Right side of the row, outside the `flex: 1` title span, immediately before the `<button>` element that renders 🍅 |

**HomeTab note:** Each task row in HomeTab is a `display: flex` container. The title `<span>` has `flex: 1`. `DueDateBadge` is placed after the title span and before the 🍅 `<button>` element (not inside it), so it aligns on the right side of the row alongside the other right-side elements.

**ScheduleTaskCard note:** The existing tag `div` only renders when `taskTags.length > 0`. If a task has a `dueDate` but no tags, always render the wrapper `div` when either `taskTags.length > 0` or `task.dueDate` is defined — so the badge has a container regardless.

---

## File Structure

```
src/
  components/
    DueDateBadge.tsx               # NEW — badge with overdue logic
    DueDateBadge.test.tsx          # NEW
  features/
    tasks/
      TaskGroupSection.tsx         # NEW — collapsible section
      TaskGroupSection.test.tsx    # NEW
      TaskList.tsx                 # MODIFIED — grouped layout + overdueOnly prop
      TaskList.test.tsx            # MODIFIED
      TaskItem.tsx                 # MODIFIED — add DueDateBadge
      TaskDetailPanel.tsx          # MODIFIED — add due date input
      TagFilter.tsx                # MODIFIED — add overdueOnly props + fix early-return guard
      TagFilter.test.tsx           # MODIFIED
      TasksTab.tsx                 # MODIFIED — add overdueOnly state
    schedule/
      ScheduleTaskCard.tsx         # MODIFIED — add DueDateBadge
    home/
      HomeTab.tsx                  # MODIFIED — add DueDateBadge in task row
  types/
    index.ts                       # MODIFIED — add dueDate field
  db/
    db.ts                          # MODIFIED — add version(2) with dueDate index
```

---

## Testing Strategy

- **`DueDateBadge`**: unit tests — red+`!` when overdue and incomplete; muted when future; muted when due today; muted when completed even if past due; renders nothing when `dueDate` is undefined
- **`TaskGroupSection`**: unit tests — renders label+count (top-level only), toggles on click, red header when `isOverdue`, normal header otherwise
- **`TaskList`**: unit tests — tasks routed to correct groups; completed past-due task appears in Overdue group; empty groups hidden; all-groups-empty renders EmptyState; No Due Date group sorted by `order` ascending (verify by querying all task title elements and asserting their `textContent` order matches ascending `order` values — dnd-kit drag simulation is not reliable in jsdom); tag filter (pre-applied) narrows each group; `overdueOnly` renders only the Overdue group. Existing tests that render tasks without `dueDate` continue to work (those tasks route to the No Due Date group), but tests asserting on the full rendered output should account for the group heading (e.g., "NO DUE DATE") now appearing in the DOM.
- **`TagFilter`**: unit test — overdue chip renders even with empty tags list; chip toggles `onOverdueToggle`; active chip has `var(--color-danger)` background; can be active alongside a selected tag
- **`TaskDetailPanel`**: extend existing test — due date input renders and clearing it calls `onUpdate` without a `dueDate` key. Since `e.target.value || undefined` produces `{ id }` (no `dueDate` key) when cleared, assert with `expect.not.objectContaining({ dueDate: expect.anything() })` rather than checking `dueDate: undefined` directly.
- **`HomeTab`**: extend existing test — `DueDateBadge` renders for a task with a due date

---

## Out of Scope

- Due date notifications or reminders
- Sorting the Schedule kanban by due date
- Due date on subtasks (subtasks inherit no due date semantics)
- Recurring due dates
