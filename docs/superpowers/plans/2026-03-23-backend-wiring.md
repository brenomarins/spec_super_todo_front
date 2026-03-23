# Backend Wiring Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace all IndexedDB (Dexie) usage with HTTP API calls to the running backend, deleting the local database layer entirely.

**Architecture:** Create a typed `src/api/` layer (one file per resource) built on a shared `apiFetch` helper. Update all Zustand stores, `App.tsx`, `RecoveryScreen`, and `useStatsData` to call the API instead of repositories. Delete `src/db/` and all its tests.

**Tech Stack:** TypeScript, React, Zustand, `fetch` (native), Vitest

**References:**
- `swagger.json` (repo root) — **primary reference**: actual backend OpenAPI 3.1.0 spec, server at `http://localhost:8091`
- `docs/superpowers/specs/2026-03-23-backend-wiring-design.md` — design decisions, edge cases, intent
- `docs/superpowers/specs/2026-03-19-backend-api-design.md` — secondary: hand-written API contract

---

## File Map

| Action | Path | Responsibility |
|--------|------|----------------|
| Create | `src/api/client.ts` | `apiFetch<T>`, `ApiError`, global toast wiring |
| Create | `src/api/tasks.ts` | Task CRUD + reorder API calls |
| Create | `src/api/tags.ts` | Tag CRUD API calls |
| Create | `src/api/notes.ts` | Note CRUD API calls |
| Create | `src/api/sessions.ts` | Session lifecycle API calls |
| Create | `src/api/stats.ts` | Stats query API call |
| Modify | `src/components/ToastProvider.tsx` | Add `registerGlobalToast` / `showGlobalToast` singleton |
| Modify | `src/store/taskStore.ts` | Replace repo calls with API calls |
| Modify | `src/store/tagStore.ts` | Replace repo calls with API calls |
| Modify | `src/store/noteStore.ts` | Replace repo calls with API calls |
| Modify | `src/store/pomodoroStore.ts` | Replace repo calls with API calls; delete `recoverStaleSession` |
| Modify | `src/App.tsx` | Replace db/repo init with API calls |
| Modify | `src/components/RecoveryScreen.tsx` | Replace db export with API calls |
| Modify | `src/features/stats/useStatsData.ts` | Replace IndexedDB queries with `api.getStats` |
| Delete | `src/db/db.ts` | Dexie instance no longer needed |
| Delete | `src/db/repositories/TaskRepository.ts` | Replaced by `src/api/tasks.ts` |
| Delete | `src/db/repositories/TagRepository.ts` | Replaced by `src/api/tags.ts` |
| Delete | `src/db/repositories/NoteRepository.ts` | Replaced by `src/api/notes.ts` |
| Delete | `src/db/repositories/PomodoroRepository.ts` | Replaced by `src/api/sessions.ts` |
| Delete | `src/db/repositories/__tests__/` | Tests for deleted code |
| Delete | `src/db/__tests__/` | Tests for deleted code |

---

## Chunk 1: API Foundation

### Task 1: Add global toast singleton to ToastProvider

**Files:**
- Modify: `src/components/ToastProvider.tsx`

- [ ] **Step 1: Add module-level singleton and exports**

  Open `src/components/ToastProvider.tsx`. Add the following **before** the `ToastProvider` component function:

  ```ts
  let _showGlobalToast: (msg: string) => void = () => {}
  export function registerGlobalToast(fn: (msg: string) => void) {
    _showGlobalToast = fn
  }
  export function showGlobalToast(msg: string) {
    _showGlobalToast(msg)
  }
  ```

  Inside `ToastProvider`, call `registerGlobalToast(showToast)` immediately after the `showToast` callback is defined (before the `return`):

  ```ts
  const showToast = useCallback((message: string) => { ... }, [])
  registerGlobalToast(showToast)   // ← add this line
  ```

- [ ] **Step 2: Run tests**

  ```bash
  npm test
  ```

  Expected: all tests pass (no changes to test files).

- [ ] **Step 3: Commit**

  ```bash
  git add src/components/ToastProvider.tsx
  git commit -m "feat: add registerGlobalToast/showGlobalToast singleton to ToastProvider"
  ```

---

### Task 2: Create `src/api/client.ts`

**Files:**
- Create: `src/api/client.ts`

- [ ] **Step 1: Create the file**

  ```ts
  // src/api/client.ts
  import { showGlobalToast } from '../components/ToastProvider'

  const BASE_URL =
    (import.meta as unknown as { env: Record<string, string> }).env?.VITE_API_URL
    ?? 'http://localhost:8091/api/v1'

  export class ApiError extends Error {
    constructor(public status: number, message: string) {
      super(message)
      this.name = 'ApiError'
    }
  }

  export async function apiFetch<T>(path: string, init?: RequestInit): Promise<T> {
    let res: Response
    try {
      res = await fetch(`${BASE_URL}${path}`, {
        ...init,
        headers: {
          'Content-Type': 'application/json',
          ...init?.headers,
        },
      })
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Network error'
      showGlobalToast(msg)
      throw err
    }

    if (!res.ok) {
      let msg = res.statusText
      try {
        const body = await res.json() as { error?: string }
        if (body.error) msg = body.error
      } catch { /* ignore */ }
      const error = new ApiError(res.status, msg)
      showGlobalToast(msg)
      throw error
    }

    if (res.status === 204) return undefined as T
    return res.json() as Promise<T>
  }
  ```

  > **Note:** The base URL is `http://localhost:8091/api/v1` per `swagger.json`. To override, set `VITE_API_URL=http://localhost:8091/api/v1` (or another URL) in a `.env` file at the project root.

- [ ] **Step 2: Run tests**

  ```bash
  npm test
  ```

  Expected: all tests pass.

- [ ] **Step 3: Commit**

  ```bash
  git add src/api/client.ts
  git commit -m "feat: add apiFetch client with ApiError and global toast on failure"
  ```

---

## Chunk 2: API Resource Modules

### Task 3: Create `src/api/tasks.ts`

**Files:**
- Create: `src/api/tasks.ts`

Refer to `swagger.json` schemas: `TaskResponse`, `CreateTaskRequest`, `UpdateTaskRequest`, `ReorderRequest`.

- [ ] **Step 1: Create the file**

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

  export const listTasks = () =>
    apiFetch<Task[]>('/tasks')

  export const getTask = (id: string) =>
    apiFetch<Task>(`/tasks/${id}`)

  export const createTask = (input: CreateTaskInput) =>
    apiFetch<Task>('/tasks', {
      method: 'POST',
      body: JSON.stringify(input),
    })

  export const updateTask = (id: string, input: UpdateTaskInput) =>
    apiFetch<Task>(`/tasks/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(input),
    })

  export const deleteTask = (id: string) =>
    apiFetch<void>(`/tasks/${id}`, { method: 'DELETE' })

  export const reorderTasks = (input: ReorderInput) =>
    apiFetch<void>('/tasks/reorder', {
      method: 'POST',
      body: JSON.stringify(input),
    })
  ```

- [ ] **Step 2: Run tests**

  ```bash
  npm test
  ```

  Expected: all tests pass.

- [ ] **Step 3: Commit**

  ```bash
  git add src/api/tasks.ts
  git commit -m "feat: add tasks API module"
  ```

---

### Task 4: Create `src/api/tags.ts`

**Files:**
- Create: `src/api/tags.ts`

Refer to `swagger.json` schemas: `TagResponse`, `CreateTagRequest`, `UpdateTagRequest`.

- [ ] **Step 1: Create the file**

  ```ts
  // src/api/tags.ts
  import { apiFetch } from './client'
  import type { Tag } from '../types'

  export interface CreateTagInput {
    id?: string
    name: string
    color: string
  }

  export interface UpdateTagInput {
    name?: string
    color?: string
  }

  export const listTags = () =>
    apiFetch<Tag[]>('/tags')

  export const createTag = (input: CreateTagInput) =>
    apiFetch<Tag>('/tags', {
      method: 'POST',
      body: JSON.stringify(input),
    })

  export const updateTag = (id: string, input: UpdateTagInput) =>
    apiFetch<Tag>(`/tags/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(input),
    })

  export const deleteTag = (id: string) =>
    apiFetch<void>(`/tags/${id}`, { method: 'DELETE' })
  ```

- [ ] **Step 2: Run tests**

  ```bash
  npm test
  ```

  Expected: all tests pass.

- [ ] **Step 3: Commit**

  ```bash
  git add src/api/tags.ts
  git commit -m "feat: add tags API module"
  ```

---

### Task 5: Create `src/api/notes.ts`

**Files:**
- Create: `src/api/notes.ts`

Refer to `swagger.json` schemas: `NoteResponse`, `CreateNoteRequest`, `UpdateNoteRequest`.

- [ ] **Step 1: Create the file**

  ```ts
  // src/api/notes.ts
  import { apiFetch } from './client'
  import type { Note } from '../types'

  export interface CreateNoteInput {
    id?: string
    title: string
    content: string
    tagIds?: string[]
    linkedTaskIds?: string[]
  }

  export interface UpdateNoteInput {
    title?: string
    content?: string
    tagIds?: string[]
    linkedTaskIds?: string[]
  }

  export const listNotes = () =>
    apiFetch<Note[]>('/notes')

  export const getNote = (id: string) =>
    apiFetch<Note>(`/notes/${id}`)

  export const createNote = (input: CreateNoteInput) =>
    apiFetch<Note>('/notes', {
      method: 'POST',
      body: JSON.stringify(input),
    })

  export const updateNote = (id: string, input: UpdateNoteInput) =>
    apiFetch<Note>(`/notes/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(input),
    })

  export const deleteNote = (id: string) =>
    apiFetch<void>(`/notes/${id}`, { method: 'DELETE' })
  ```

- [ ] **Step 2: Run tests**

  ```bash
  npm test
  ```

  Expected: all tests pass.

- [ ] **Step 3: Commit**

  ```bash
  git add src/api/notes.ts
  git commit -m "feat: add notes API module"
  ```

---

### Task 6: Create `src/api/sessions.ts`

**Files:**
- Create: `src/api/sessions.ts`

Refer to `swagger.json` schemas: `SessionResponse`, `StartWorkSessionRequest`, `StartBreakSessionRequest`.

- [ ] **Step 1: Create the file**

  ```ts
  // src/api/sessions.ts
  import { apiFetch } from './client'
  import type { PomodoroSession } from '../types'

  export const listSessions = (taskId?: string) => {
    const query = taskId ? `?taskId=${taskId}` : ''
    return apiFetch<PomodoroSession[]>(`/sessions${query}`)
  }

  export const getOpenSession = () =>
    apiFetch<PomodoroSession | null>('/sessions/open')

  export const startWorkSession = (taskId: string) =>
    apiFetch<PomodoroSession>('/sessions/work', {
      method: 'POST',
      body: JSON.stringify({ taskId }),
    })

  export const startBreakSession = (type: 'short_break' | 'long_break', taskId?: string) =>
    apiFetch<PomodoroSession>('/sessions/break', {
      method: 'POST',
      body: JSON.stringify({ type, ...(taskId ? { taskId } : {}) }),
    })

  export const completeSession = (id: string) =>
    apiFetch<void>(`/sessions/${id}/complete`, { method: 'POST' })

  export const interruptSession = (id: string) =>
    apiFetch<void>(`/sessions/${id}/interrupt`, { method: 'POST' })
  ```

- [ ] **Step 2: Run tests**

  ```bash
  npm test
  ```

  Expected: all tests pass.

- [ ] **Step 3: Commit**

  ```bash
  git add src/api/sessions.ts
  git commit -m "feat: add sessions API module"
  ```

---

### Task 7: Create `src/api/stats.ts`

**Files:**
- Create: `src/api/stats.ts`

Refer to `swagger.json` schema: `StatsResponse`. The `StatsResponse` shape is structurally identical to `StatsData` from `useStatsData.ts`.

- [ ] **Step 0: Verify `completionRate` nullability before writing code**

  `swagger.json` shows `completionRate` as `double` (non-nullable), but `StatsData` uses `number | null`. Run:

  ```bash
  curl "http://localhost:8091/api/v1/stats?filter=all"
  ```

  - If the response contains `"completionRate": null` → keep `number | null` in `StatsData`. No extra changes needed.
  - If the response contains `"completionRate": 0` (or absent) → change `StatsData.completionRate` to `number` in the file below. Check the rendering component and update any `=== null` guard:
    ```bash
    grep -r "completionRate" src/ --include="*.tsx"
    ```

- [ ] **Step 1: Create the file**

  > **Important:** `StatsData` and `TimeFilter` are defined **in this file** (not imported from `useStatsData.ts`) to avoid a circular import. `useStatsData.ts` (Task 14) will import them from here instead.

  ```ts
  // src/api/stats.ts
  import { apiFetch } from './client'

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

  export const getStats = (filter: TimeFilter) =>
    apiFetch<StatsData>(`/stats?filter=${filter}`)
  ```

- [ ] **Step 2: Run tests**

  ```bash
  npm test
  ```

  Expected: all tests pass.

- [ ] **Step 3: Commit**

  ```bash
  git add src/api/stats.ts
  git commit -m "feat: add stats API module"
  ```

---

## Chunk 3: Store Migrations

### Task 8: Migrate `taskStore.ts`

**Files:**
- Modify: `src/store/taskStore.ts`

- [ ] **Step 1: Replace the file contents**

  ```ts
  // src/store/taskStore.ts
  import { create } from 'zustand'
  import type { Task } from '../types'
  import * as api from '../api/tasks'

  interface TaskStore {
    tasks: Task[]
    setTasks: (tasks: Task[]) => void
    upsertTask: (task: Task) => void
    removeTask: (id: string) => Promise<void>
    addTask: (task: Task) => Promise<Task>
    updateTask: (partial: Partial<Task> & { id: string }) => Promise<void>
    reorderTasks: (ids: string[], parentId: string | null) => Promise<void>
  }

  export const useTaskStore = create<TaskStore>(set => ({
    tasks: [],
    setTasks: tasks => set({ tasks }),
    upsertTask: task =>
      set(s => ({
        tasks: s.tasks.some(t => t.id === task.id)
          ? s.tasks.map(t => t.id === task.id ? task : t)
          : [...s.tasks, task],
      })),
    removeTask: async (id) => {
      await api.deleteTask(id)
      set(s => ({ tasks: s.tasks.filter(t => t.id !== id) }))
    },
    addTask: async (task) => {
      const { createdAt: _ca, updatedAt: _ua, ...input } = task
      const saved = await api.createTask(input)
      set(s => ({ tasks: [...s.tasks, saved] }))
      return saved
    },
    updateTask: async (partial) => {
      const { id, createdAt: _ca, updatedAt: _ua, ...changes } = partial
      await api.updateTask(id, changes)
      set(s => ({ tasks: s.tasks.map(t => t.id === id ? { ...t, ...changes } : t) }))
    },
    reorderTasks: async (ids, parentId) => {
      await api.reorderTasks({ orderedIds: ids, parentId })
      const updated = await api.listTasks()
      set({ tasks: updated })
    },
  }))
  ```

  > **Note:** `id` is kept in the `addTask` payload (not stripped). `createdAt` and `updatedAt` are stripped — they are server-assigned. The `updateTask` also strips those fields before sending to the API.

- [ ] **Step 2: Run tests**

  ```bash
  npm test
  ```

  Expected: all tests pass. Tests for `TaskRepository` will still exist at this point (not yet deleted).

- [ ] **Step 3: Commit**

  ```bash
  git add src/store/taskStore.ts
  git commit -m "feat: migrate taskStore to API client"
  ```

---

### Task 9: Migrate `tagStore.ts`

**Files:**
- Modify: `src/store/tagStore.ts`

- [ ] **Step 1: Replace the file contents**

  ```ts
  // src/store/tagStore.ts
  import { create } from 'zustand'
  import type { Tag } from '../types'
  import * as api from '../api/tags'

  interface TagStore {
    tags: Tag[]
    setTags: (tags: Tag[]) => void
    upsertTag: (tag: Tag) => void
    removeTag: (id: string) => void
    addTag: (tag: Tag) => Promise<Tag>
  }

  export const useTagStore = create<TagStore>(set => ({
    tags: [],
    setTags: tags => set({ tags }),
    upsertTag: tag =>
      set(s => ({
        tags: s.tags.some(t => t.id === tag.id)
          ? s.tags.map(t => t.id === tag.id ? tag : t)
          : [...s.tags, tag],
      })),
    removeTag: id => set(s => ({ tags: s.tags.filter(t => t.id !== id) })),
    addTag: async (tag) => {
      const saved = await api.createTag({ id: tag.id, name: tag.name, color: tag.color })
      set(s => ({ tags: [...s.tags, saved] }))
      return saved
    },
  }))
  ```

  > **Note:** `id` is included in the `createTag` payload — this is a change from the old code which stripped it. The API response object (`saved`) is returned, not the input `tag`.

- [ ] **Step 2: Run tests**

  ```bash
  npm test
  ```

  Expected: all tests pass.

- [ ] **Step 3: Commit**

  ```bash
  git add src/store/tagStore.ts
  git commit -m "feat: migrate tagStore to API client"
  ```

---

### Task 10: Migrate `noteStore.ts`

**Files:**
- Modify: `src/store/noteStore.ts`

- [ ] **Step 1: Replace the file contents**

  ```ts
  // src/store/noteStore.ts
  import { create } from 'zustand'
  import type { Note } from '../types'
  import * as api from '../api/notes'

  interface NoteStore {
    notes: Note[]
    activeNoteId: string | null
    setNotes: (notes: Note[]) => void
    upsertNote: (note: Note) => void
    removeNote: (id: string) => Promise<void>
    setActiveNoteId: (id: string | null) => void
    addNote: (note: Note) => Promise<Note>
    updateNote: (partial: Partial<Note> & { id: string }) => Promise<void>
  }

  export const useNoteStore = create<NoteStore>(set => ({
    notes: [],
    activeNoteId: null,
    setNotes: notes => set({ notes }),
    upsertNote: note =>
      set(s => ({
        notes: s.notes.some(n => n.id === note.id)
          ? s.notes.map(n => n.id === note.id ? note : n)
          : [...s.notes, note],
      })),
    removeNote: async (id) => {
      await api.deleteNote(id)
      set(s => ({ notes: s.notes.filter(n => n.id !== id) }))
    },
    setActiveNoteId: id => set({ activeNoteId: id }),
    addNote: async (note) => {
      const { createdAt: _ca, updatedAt: _ua, ...input } = note
      const saved = await api.createNote(input)
      set(s => ({ notes: [...s.notes, saved] }))
      return saved
    },
    updateNote: async (partial) => {
      const { id, createdAt: _ca, updatedAt: _ua, ...changes } = partial
      await api.updateNote(id, changes)
      set(s => ({ notes: s.notes.map(n => n.id === id ? { ...n, ...changes } : n) }))
    },
  }))
  ```

  > **Note:** Callers (e.g. `NotesTab.tsx`) pass `updatedAt` in `updateNote` partials — it is stripped here in the store before sending to the API.

- [ ] **Step 2: Run tests**

  ```bash
  npm test
  ```

  Expected: all tests pass.

- [ ] **Step 3: Commit**

  ```bash
  git add src/store/noteStore.ts
  git commit -m "feat: migrate noteStore to API client"
  ```

---

### Task 11: Migrate `pomodoroStore.ts`

**Files:**
- Modify: `src/store/pomodoroStore.ts`

- [ ] **Step 1: Replace the file contents**

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
          // break sessions use complete — interrupt is work-only per API spec
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
  }))
  ```

  > **Note:** `recoverStaleSession` is deleted entirely — stale session recovery moves to `App.tsx`.

- [ ] **Step 2: Run tests**

  ```bash
  npm test
  ```

  Expected: all tests pass.

- [ ] **Step 3: Commit**

  ```bash
  git add src/store/pomodoroStore.ts
  git commit -m "feat: migrate pomodoroStore to API client, remove recoverStaleSession"
  ```

---

## Chunk 4: App Wiring

### Task 12: Migrate `App.tsx`

**Files:**
- Modify: `src/App.tsx`

- [ ] **Step 1: Replace the file contents**

  ```tsx
  // src/App.tsx
  import { useState, useEffect } from 'react'
  import { TabBar, type Tab } from './components/TabBar'
  import { ToastProvider } from './components/ToastProvider'
  import { RecoveryScreen } from './components/RecoveryScreen'
  import { HomeTab } from './features/home/HomeTab'
  import { TasksTab } from './features/tasks/TasksTab'
  import { ScheduleTab } from './features/schedule/ScheduleTab'
  import { NotesTab } from './features/notes/NotesTab'
  import { StatsTab } from './features/stats/StatsTab'
  import { useTaskStore } from './store/taskStore'
  import { useTagStore } from './store/tagStore'
  import { useNoteStore } from './store/noteStore'
  import { usePomodoroStore } from './store/pomodoroStore'
  import * as apiTasks from './api/tasks'
  import * as apiTags from './api/tags'
  import * as apiNotes from './api/notes'
  import * as apiSessions from './api/sessions'

  const TWO_HOURS_MS = 2 * 60 * 60 * 1000

  export default function App() {
    const [tab, setTab] = useState<Tab>('home')
    const [apiError, setApiError] = useState(false)
    const [loaded, setLoaded] = useState(false)

    useEffect(() => {
      async function init() {
        try {
          const [tasks, tags, notes] = await Promise.all([
            apiTasks.listTasks(),
            apiTags.listTags(),
            apiNotes.listNotes(),
          ])
          useTaskStore.getState().setTasks(tasks)
          useTagStore.getState().setTags(tags)
          useNoteStore.getState().setNotes(notes)

          const openSession = await apiSessions.getOpenSession()
          if (openSession) {
            const age = Date.now() - Date.parse(openSession.startedAt)
            if (age > TWO_HOURS_MS) {
              // stale session — close it without restoring
              // interrupt is work-only per API spec; use complete for break sessions
              if (openSession.type === 'work') {
                await apiSessions.interruptSession(openSession.id)
              } else {
                await apiSessions.completeSession(openSession.id)
              }
            } else {
              usePomodoroStore.getState().setActiveSession({
                sessionId: openSession.id,
                taskId: openSession.taskId,
                type: openSession.type,
                startedAt: openSession.startedAt,
              })
            }
          }

          setLoaded(true)
        } catch (e) {
          console.error('API init failed', e)
          setApiError(true)
        }
      }
      init()
    }, [])

    if (apiError) {
      return (
        <ToastProvider>
          <RecoveryScreen />
        </ToastProvider>
      )
    }

    if (!loaded) {
      return (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', background: 'var(--color-bg)' }}>
          <span style={{ color: 'var(--color-text-muted)' }}>Loading…</span>
        </div>
      )
    }

    return (
      <ToastProvider>
        <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', background: 'var(--color-bg)' }}>
          <TabBar active={tab} onChange={setTab} />
          <main style={{ flex: 1, overflow: 'hidden' }}>
            {tab === 'home' && <HomeTab />}
            {tab === 'tasks' && <TasksTab />}
            {tab === 'schedule' && <ScheduleTab />}
            {tab === 'notes' && <NotesTab />}
            {tab === 'stats' && <StatsTab />}
          </main>
        </div>
      </ToastProvider>
    )
  }
  ```

  > **Note:** `dbError` renamed to `apiError`. `ToastProvider` is not mounted during `init()`, so API errors during startup show no toast — the `RecoveryScreen` is the user's feedback. The stale session age check runs before calling `setActiveSession`.

- [ ] **Step 2: Run tests**

  ```bash
  npm test
  ```

  Expected: all tests pass.

- [ ] **Step 3: Commit**

  ```bash
  git add src/App.tsx
  git commit -m "feat: migrate App.tsx init to API calls, replace recoverStaleSession"
  ```

---

### Task 13: Migrate `RecoveryScreen.tsx`

**Files:**
- Modify: `src/components/RecoveryScreen.tsx`

- [ ] **Step 1: Replace the file contents**

  ```tsx
  // src/components/RecoveryScreen.tsx
  import { downloadJSON, buildExportPayload } from '../lib/exportUtils'
  import * as apiTasks from '../api/tasks'
  import * as apiTags from '../api/tags'
  import * as apiNotes from '../api/notes'
  import * as apiSessions from '../api/sessions'

  export function RecoveryScreen() {
    async function handleExport() {
      try {
        const [tasks, tags, notes, sessions] = await Promise.all([
          apiTasks.listTasks(),
          apiTags.listTags(),
          apiNotes.listNotes(),
          apiSessions.listSessions(),
        ])
        downloadJSON(buildExportPayload(tasks, tags, notes, sessions))
      } catch {
        alert('Could not fetch data for export.')
      }
    }

    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100vh', gap: 16 }}>
        <h2>Connection Error</h2>
        <p>Could not connect to the backend. Make sure the server is running.</p>
        <button onClick={handleExport}>Export Backup (JSON)</button>
      </div>
    )
  }
  ```

- [ ] **Step 2: Run tests**

  ```bash
  npm test
  ```

  Expected: all tests pass.

- [ ] **Step 3: Commit**

  ```bash
  git add src/components/RecoveryScreen.tsx
  git commit -m "feat: migrate RecoveryScreen export to API calls"
  ```

---

### Task 14: Migrate `useStatsData.ts`

**Files:**
- Modify: `src/features/stats/useStatsData.ts`

- [ ] **Step 1: Replace `load()` body and remove db/store deps**

  Keep `StatsData`, `TimeFilter`, `formatMinutes`, `EMPTY`, and the `useState`/`useEffect` skeleton. Only replace the internals:

  ```ts
  // src/features/stats/useStatsData.ts
  import { useState, useEffect } from 'react'
  import { getStats } from '../../api/stats'
  import type { StatsData, TimeFilter } from '../../api/stats'

  export type { StatsData, TimeFilter }

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
    const [data, setData] = useState<StatsData>(EMPTY)

    useEffect(() => {
      let cancelled = false

      async function load() {
        const result = await getStats(filter)
        if (!cancelled) setData(result)
      }

      load()
      return () => { cancelled = true }
    }, [filter])

    return data
  }
  ```

  > **Note:** `StatsData` and `TimeFilter` are now defined in `src/api/stats.ts` and re-exported from here to preserve backward compatibility with any component that imports them from `useStatsData`. `useTaskStore` import and `tasks`/`taskMap` are removed. Only `filter` is in the dependency array.

- [ ] **Step 2: Run tests**

  ```bash
  npm test
  ```

  Expected: all tests pass.

- [ ] **Step 3: Commit**

  ```bash
  git add src/features/stats/useStatsData.ts
  git commit -m "feat: migrate useStatsData to api.getStats"
  ```

---

## Chunk 5: Delete db Layer

### Task 15: Delete repository tests

**Files:**
- Delete: `src/db/repositories/__tests__/TaskRepository.test.ts`
- Delete: `src/db/repositories/__tests__/TagRepository.test.ts`
- Delete: `src/db/repositories/__tests__/NoteRepository.test.ts`
- Delete: `src/db/repositories/__tests__/PomodoroRepository.test.ts`
- Delete: `src/db/__tests__/db.test.ts`

- [ ] **Step 1: Delete the test files**

  ```bash
  rm "src/db/repositories/__tests__/TaskRepository.test.ts"
  rm "src/db/repositories/__tests__/TagRepository.test.ts"
  rm "src/db/repositories/__tests__/NoteRepository.test.ts"
  rm "src/db/repositories/__tests__/PomodoroRepository.test.ts"
  rm "src/db/__tests__/db.test.ts"
  ```

- [ ] **Step 2: Run tests to verify remaining suite still passes**

  ```bash
  npm test
  ```

  Expected: all remaining tests pass (previously these db tests may have been failing anyway since their imports are now broken).

- [ ] **Step 3: Commit**

  ```bash
  git add -A
  git commit -m "test: delete repository and db tests (replaced by API layer)"
  ```

---

### Task 16: Delete repository source files and db

**Files:**
- Delete: `src/db/repositories/TaskRepository.ts`
- Delete: `src/db/repositories/TagRepository.ts`
- Delete: `src/db/repositories/NoteRepository.ts`
- Delete: `src/db/repositories/PomodoroRepository.ts`
- Delete: `src/db/db.ts`

- [ ] **Step 1: Delete the repository files and db**

  ```bash
  rm src/db/repositories/TaskRepository.ts
  rm src/db/repositories/TagRepository.ts
  rm src/db/repositories/NoteRepository.ts
  rm src/db/repositories/PomodoroRepository.ts
  rm src/db/db.ts
  ```

- [ ] **Step 2: Check for any remaining imports**

  ```bash
  grep -r "from.*db/\|from.*repositories/" src/ --include="*.ts" --include="*.tsx"
  ```

  Expected: no output. If any imports remain, fix them before proceeding.

- [ ] **Step 3: Run tests**

  ```bash
  npm test
  ```

  Expected: all tests pass.

- [ ] **Step 4: Commit**

  ```bash
  git add -A
  git commit -m "feat: delete db layer (Dexie + repositories) — fully replaced by API client"
  ```

---

### Task 17: Review `src/types/__tests__/types.test.ts`

**Files:**
- Review: `src/types/__tests__/types.test.ts`

- [ ] **Step 1: Check if the test file is still relevant**

  ```bash
  cat src/types/__tests__/types.test.ts
  ```

  If the file only tests things related to the deleted db layer (or is empty), delete it. If it tests general type utilities, keep it.

- [ ] **Step 2: Delete if irrelevant, otherwise keep**

  If deleting:
  ```bash
  rm src/types/__tests__/types.test.ts
  git add -A
  git commit -m "test: delete stale types test (no longer relevant)"
  ```

  If keeping: no action needed.

- [ ] **Step 3: Run full test suite one final time**

  ```bash
  npm test
  ```

  Expected: all tests pass, green across the board.

---
