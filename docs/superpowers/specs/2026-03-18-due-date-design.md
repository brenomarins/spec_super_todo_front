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

Add `dueDate` to the `tasks` table index:

```
tasks: 'id, parentId, scheduledDay, dueDate, order, *tagIds'
```

No migration is needed — Dexie handles sparse indexes; existing tasks without `dueDate` are unaffected.

---

## Components

### `DueDateBadge` (`src/components/DueDateBadge.tsx`)

A small inline badge displaying the due date.

**Props:**
```typescript
interface DueDateBadgeProps {
  dueDate: string        // ISO YYYY-MM-DD
  completed: boolean
}
```

**Behavior:**
- If `completed` → render in muted color, no urgency styling
- If `!completed && dueDate < todayISO()` → render red, prefix `!` (e.g., `! Mar 15`)
- Otherwise → render in muted color (e.g., `Mar 20`)
- Format: `MMM d` via `date-fns/format`

**Used in:** `TaskItem`, `DraggableCard` (Schedule), HomeTab task rows.

---

### `TaskGroupSection` (`src/features/tasks/TaskGroupSection.tsx`)

A collapsible section wrapping a group of tasks.

**Props:**
```typescript
interface TaskGroupSectionProps {
  label: string          // e.g. "OVERDUE"
  count: number
  defaultOpen?: boolean  // default true
  children: React.ReactNode
}
```

**Behavior:**
- Header shows `{LABEL} ({count})` in uppercase muted text
- Click header to toggle open/closed
- Collapsed state is local (not persisted)
- Overdue group header text is styled red

---

### `TaskList` (modified `src/features/tasks/TaskList.tsx`)

Restructured to render five `TaskGroupSection`s instead of a flat sorted list.

**Grouping logic** (evaluated against `todayISO()` at render time):

| Group | Condition |
|---|---|
| Overdue | `dueDate < today` and `!completed` |
| Due Today | `dueDate === today` |
| Due This Week | `dueDate > today` and `dueDate <= endOfISOWeek(today)` |
| Due Later | `dueDate > endOfISOWeek(today)` |
| No Due Date | `dueDate` is undefined |

**Sorting within groups:**
- Overdue, Due Today, Due This Week, Due Later → sorted by `dueDate` ascending
- No Due Date → sorted by existing `order` field (manual drag-and-drop preserved)

**Completed tasks:** remain in their group with strikethrough styling (consistent with current behavior).

**Drag-and-drop:** preserved within the "No Due Date" group only. Other groups are date-sorted so manual ordering does not apply.

**Tag filter interaction:** the existing tag filter narrows each group's contents independently.

**Empty groups:** hidden (not rendered).

---

### `TagFilter` (modified `src/features/tasks/TagFilter.tsx`)

Gains an **"Overdue only"** toggle chip alongside the existing tag chips.

**Behavior:**
- Toggle button styled consistently with tag filter chips
- When active: only the Overdue group is shown; all other groups are hidden
- Interacts with tag filter independently (both can be active simultaneously)

---

### `TaskDetailPanel` (modified `src/features/tasks/TaskDetailPanel.tsx`)

Gains a "Due Date" input row below the existing "Scheduled Day" row.

```
[ Scheduled Day ] [ date input ]
[ Due Date      ] [ date input ]
```

Saves immediately on change (same pattern as Scheduled Day). Clearing the input sets `dueDate` to `undefined`.

---

### Badge placement

| Location | Placement |
|---|---|
| `TaskItem` (TaskList) | Right side of card, next to pomodoro count badge |
| `DraggableCard` (Schedule kanban) | Below task title, alongside tag badges |
| HomeTab task rows | Inline after task title |

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
      TaskList.tsx                 # MODIFIED — grouped layout
      TaskList.test.tsx            # MODIFIED
      TaskItem.tsx                 # MODIFIED — add DueDateBadge
      TaskDetailPanel.tsx          # MODIFIED — add due date input
      TagFilter.tsx                # MODIFIED — add overdue chip
      TagFilter.test.tsx           # MODIFIED
    schedule/
      DayColumn.tsx                # MODIFIED — DueDateBadge in DraggableCard
    home/
      HomeTab.tsx                  # MODIFIED — DueDateBadge in task row
  types/
    index.ts                       # MODIFIED — add dueDate field
  db/
    db.ts                          # MODIFIED — add dueDate to index
```

---

## Testing Strategy

- **`DueDateBadge`**: unit tests — red+`!` when overdue, muted when future, muted when completed
- **`TaskGroupSection`**: unit tests — renders label+count, toggles on click, overdue header is red
- **`TaskList`**: unit tests — tasks routed to correct groups, empty groups hidden, No Due Date group preserves order, tag filter narrows each group
- **`TagFilter`**: unit test — overdue chip toggles, co-exists with tag filter
- Existing `TaskItem`, `TaskDetailPanel` tests extended minimally to cover the new field

---

## Out of Scope

- Due date notifications or reminders
- Sorting the Schedule kanban by due date
- Due date on subtasks (subtasks inherit no due date semantics)
- Recurring due dates
