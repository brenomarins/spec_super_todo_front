# Fix: Task Optional Fields Are null From Backend (Tasks Invisible)

**Date:** 2026-03-24
**Scope:** `src/api/tasks.ts` — one new private function, four call sites

---

## Problem

Spring Boot serializes absent optional fields as JSON `null`. The frontend `Task` type declares `dueDate`, `scheduledDay`, and `parentId` as `?: string` (TypeScript `undefined`). After `listTasks()` resolves, these fields are `null` on every task that has no value set.

`TaskList.tsx` groups tasks by due date using strict equality:

```ts
const noDueDate = tasks.filter(t => t.dueDate === undefined)
```

`null === undefined` is `false`, so tasks with `dueDate: null` match none of the five groups and are never rendered. The task list appears empty even when the backend returns data.

`scheduledDay: null` causes the same invisibility in `ScheduleTab`. `parentId: null` would misclassify top-level tasks as subtasks in any strict-undefined check.

## Fix

Add a `normalizeTask` function in `src/api/tasks.ts` that converts `null` → `undefined` for the three nullable optional fields, then apply it to every endpoint that returns a `Task` or `Task[]`.

```ts
function normalizeTask(raw: Task): Task {
  return {
    ...raw,
    parentId:     raw.parentId     ?? undefined,
    scheduledDay: raw.scheduledDay ?? undefined,
    dueDate:      raw.dueDate      ?? undefined,
  }
}
```

### Call sites

| Function | Change |
|---|---|
| `listTasks` | `.then(tasks => tasks.map(normalizeTask))` |
| `getTask` | `.then(normalizeTask)` |
| `createTask` | `.then(normalizeTask)` |
| `updateTask` | `.then(normalizeTask)` |

`deleteTask` and `reorderTasks` return `void` — unchanged.

## What Does Not Change

- `src/types/index.ts` — `Task` type stays as-is
- `TaskList.tsx`, `ScheduleTab`, stores, components — no changes
- `src/api/client.ts` — normalization is task-specific, not a generic concern

## Testing

New test file `src/api/__tests__/tasks.test.ts`:

- `normalizeTask` converts `null` → `undefined` for `dueDate`, `scheduledDay`, `parentId`
- `normalizeTask` preserves string values in all three fields
- `normalizeTask` preserves all other Task fields unchanged
- `listTasks` returns normalized tasks (stub `apiFetch`)
- `createTask` returns normalized task
- `updateTask` returns normalized task
