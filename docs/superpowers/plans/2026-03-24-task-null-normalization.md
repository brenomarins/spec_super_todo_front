# Task Null Normalization Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fix invisible tasks by normalizing `null` → `undefined` for `dueDate`, `scheduledDay`, and `parentId` on every Task returned from the API.

**Architecture:** Add a private `normalizeTask` function in `src/api/tasks.ts` that strips nulls from the three nullable optional fields, then pipe every Task-returning function through it. Tests mock `apiFetch` with `vi.mock` and verify the normalization happens at each call site.

**Tech Stack:** TypeScript, Vitest, `vi.mock`

---

## Chunk 1: Normalize Tasks in API Layer

### Task 1: Add normalizeTask and tests

**Files:**
- Create: `src/api/__tests__/tasks.test.ts`
- Modify: `src/api/tasks.ts`

---

- [ ] **Step 1: Create the test file with a failing test**

Create `src/api/__tests__/tasks.test.ts`:

```ts
import { vi, describe, it, expect, beforeEach } from 'vitest'
import { listTasks, getTask, createTask, updateTask } from '../tasks'

// Mock the entire client module so no real fetch happens
vi.mock('../client', () => ({
  apiFetch: vi.fn(),
}))

// Import the mock AFTER vi.mock so we get the mocked version
import { apiFetch } from '../client'
const mockApiFetch = vi.mocked(apiFetch)

// A raw task as the backend sends it — null for absent optional fields
const rawTask = {
  id: 'abc',
  title: 'Test task',
  completed: false,
  order: 1000,
  tagIds: [],
  parentId: null,
  scheduledDay: null,
  dueDate: null,
  createdAt: '2026-01-01T00:00:00Z',
  updatedAt: '2026-01-01T00:00:00Z',
}

// What we expect after normalization — nulls become undefined
const normalizedTask = {
  id: 'abc',
  title: 'Test task',
  completed: false,
  order: 1000,
  tagIds: [],
  parentId: undefined,
  scheduledDay: undefined,
  dueDate: undefined,
  createdAt: '2026-01-01T00:00:00Z',
  updatedAt: '2026-01-01T00:00:00Z',
}

beforeEach(() => {
  mockApiFetch.mockReset()
})

describe('normalizeTask (via listTasks)', () => {
  it('converts null dueDate to undefined', async () => {
    mockApiFetch.mockResolvedValue([{ ...rawTask }])
    const [task] = await listTasks()
    expect(task.dueDate).toBeUndefined()
  })

  it('converts null scheduledDay to undefined', async () => {
    mockApiFetch.mockResolvedValue([{ ...rawTask }])
    const [task] = await listTasks()
    expect(task.scheduledDay).toBeUndefined()
  })

  it('converts null parentId to undefined', async () => {
    mockApiFetch.mockResolvedValue([{ ...rawTask }])
    const [task] = await listTasks()
    expect(task.parentId).toBeUndefined()
  })

  it('preserves string dueDate', async () => {
    mockApiFetch.mockResolvedValue([{ ...rawTask, dueDate: '2026-12-31' }])
    const [task] = await listTasks()
    expect(task.dueDate).toBe('2026-12-31')
  })

  it('preserves string scheduledDay', async () => {
    mockApiFetch.mockResolvedValue([{ ...rawTask, scheduledDay: '2026-12-31' }])
    const [task] = await listTasks()
    expect(task.scheduledDay).toBe('2026-12-31')
  })

  it('preserves string parentId', async () => {
    mockApiFetch.mockResolvedValue([{ ...rawTask, parentId: 'parent-1' }])
    const [task] = await listTasks()
    expect(task.parentId).toBe('parent-1')
  })

  it('preserves all other fields unchanged', async () => {
    mockApiFetch.mockResolvedValue([{ ...rawTask }])
    const [task] = await listTasks()
    expect(task).toMatchObject({
      id: 'abc',
      title: 'Test task',
      completed: false,
      order: 1000,
      tagIds: [],
      createdAt: '2026-01-01T00:00:00Z',
      updatedAt: '2026-01-01T00:00:00Z',
    })
  })
})

describe('getTask', () => {
  it('normalizes null fields', async () => {
    mockApiFetch.mockResolvedValue({ ...rawTask })
    const task = await getTask('abc')
    expect(task.dueDate).toBeUndefined()
    expect(task.scheduledDay).toBeUndefined()
    expect(task.parentId).toBeUndefined()
  })
})

describe('createTask', () => {
  it('normalizes null fields in response', async () => {
    mockApiFetch.mockResolvedValue({ ...rawTask })
    const task = await createTask({ title: 'Test task' })
    expect(task.dueDate).toBeUndefined()
    expect(task.scheduledDay).toBeUndefined()
    expect(task.parentId).toBeUndefined()
  })
})

describe('updateTask', () => {
  it('normalizes null fields in response', async () => {
    mockApiFetch.mockResolvedValue({ ...rawTask })
    const task = await updateTask('abc', { title: 'Updated' })
    expect(task.dueDate).toBeUndefined()
    expect(task.scheduledDay).toBeUndefined()
    expect(task.parentId).toBeUndefined()
  })
})
```

- [ ] **Step 2: Run the tests — verify they fail**

```bash
npx vitest run src/api/__tests__/tasks.test.ts
```

Expected: tests fail (FAIL) because `normalizeTask` does not exist yet. You should see `dueDate` be `null` instead of `undefined`.

- [ ] **Step 3: Add `normalizeTask` to `src/api/tasks.ts` and apply it**

Open `src/api/tasks.ts`. Add the `normalizeTask` function (private — not exported) and pipe it through the four call sites.

The final file should look like this:

```ts
// src/api/tasks.ts
import { apiFetch } from './client'
import type { Task } from '../types'

export interface CreateTaskInput {
  id?: string
  title: string
  description?: string
  completed?: boolean
  parentId?: string | null
  order?: number
  tagIds?: string[]
  scheduledDay?: string | null
  dueDate?: string | null
}

export interface UpdateTaskInput {
  title?: string
  description?: string
  completed?: boolean
  parentId?: string | null
  order?: number
  tagIds?: string[]
  scheduledDay?: string | null
  dueDate?: string | null
}

// ⚠️ NOTE on nullable fields in PATCH:
// The swagger.json uses `$ref: JsonNullableString` / `$ref: JsonNullableLocalDate` for
// parentId, scheduledDay, dueDate in UpdateTaskRequest. This is a Java OpenAPI Generator
// pattern. In practice, Spring Boot serializes/deserializes these transparently as plain
// JSON null/string values — sending `"parentId": null` clears the field correctly.
// If you get 400 errors when clearing these fields, check the actual request body the
// backend expects by inspecting the Swagger UI at http://localhost:8091/swagger-ui.html.

export interface ReorderInput {
  parentId?: string | null
  orderedIds: string[]
}

// Spring Boot serializes absent optional fields as JSON null.
// The frontend Task type uses undefined for absent optional fields.
// This normalizer bridges the gap so all consumers can rely on undefined checks.
function normalizeTask(raw: Task): Task {
  return {
    ...raw,
    parentId:     raw.parentId     ?? undefined,
    scheduledDay: raw.scheduledDay ?? undefined,
    dueDate:      raw.dueDate      ?? undefined,
  }
}

export const listTasks = () =>
  apiFetch<Task[]>('/tasks').then(tasks => tasks.map(normalizeTask))

export const getTask = (id: string) =>
  apiFetch<Task>(`/tasks/${id}`).then(normalizeTask)

export const createTask = (input: CreateTaskInput) =>
  apiFetch<Task>('/tasks', {
    method: 'POST',
    body: JSON.stringify(input),
  }).then(normalizeTask)

export const updateTask = (id: string, input: UpdateTaskInput) =>
  apiFetch<Task>(`/tasks/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(input),
  }).then(normalizeTask)

export const deleteTask = (id: string) =>
  apiFetch<void>(`/tasks/${id}`, { method: 'DELETE' })

export const reorderTasks = (input: ReorderInput) =>
  apiFetch<void>('/tasks/reorder', {
    method: 'POST',
    body: JSON.stringify(input),
  })
```

- [ ] **Step 4: Run the new tests — verify they pass**

```bash
npx vitest run src/api/__tests__/tasks.test.ts
```

Expected: all tests PASS.

- [ ] **Step 5: Run the full test suite — verify no regressions**

```bash
npm test -- --run
```

Expected: all tests PASS (165 tests across 37 files, plus the new tests).

- [ ] **Step 6: Commit**

```bash
git add src/api/tasks.ts src/api/__tests__/tasks.test.ts
git commit -m "fix: normalize null -> undefined for Task optional fields from backend"
```
