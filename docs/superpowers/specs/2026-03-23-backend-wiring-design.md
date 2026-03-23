# Backend Wiring Design

**Date:** 2026-03-23
**Scope:** Replace all IndexedDB (Dexie) usage with HTTP API calls to the existing backend

---

## Overview

The frontend currently reads and writes all data through a Dexie (IndexedDB) layer via repository classes. The backend REST API is built and running. This spec describes the work to wire the frontend to that API and delete the local database layer entirely.

**Approach:** API client module (`src/api/`) with per-resource files. Stores replace repository calls with API calls. IndexedDB and all repository code is deleted.

---

## Design Decisions

- **No offline fallback** — API is the sole source of truth; IndexedDB is removed entirely.
- **Global toast for errors** — `apiFetch` shows a toast via a module-level `showGlobalToast` singleton and then re-throws. Stores do not wrap calls in try/catch. Callers that `await` a store action in an event handler will receive a rejected promise; since the toast already appeared, the rejection can propagate without additional handling.
- **`VITE_API_URL` env var** — base URL defaults to `http://localhost:3000/api/v1`; overridable via `.env`.
- **`recoverStaleSession` deleted** — replaced in `App.tsx` init by a direct `GET /sessions/open` call, which returns the open session or null.
- **Tag update/delete API functions exposed but not wired** — `src/api/tags.ts` exports `updateTag` and `deleteTag` per the API spec, but no store or component calls them yet (no tag management UI exists). `tagStore.removeTag` remains an in-memory-only operation (removes the tag from the `tags` array); there is no delete-tag UI today.
- **`RecoveryScreen` repurposed** — the screen previously handled IndexedDB open failure. With the API it should handle network/API init failure. The export feature on that screen used `db` directly; it will be updated to call `GET /tasks`, `GET /tags`, `GET /notes`, `GET /sessions` instead (`listSessions` must be included in `src/api/sessions.ts`).
- **All db-layer tests deleted** — tests under `src/db/` are removed. No replacement tests are added in this pass (stores are thin; integration tests would require a running backend).
- **Client-generated IDs included on create** — when calling `api.createTask`, `api.createTag`, or `api.createNote`, the client-generated `id` (nanoid) is included in the payload. The server-assigned timestamps (`createdAt`, `updatedAt`) are omitted from the request body.

---

## Architecture

### New: `src/api/`

```
src/api/
  client.ts      shared apiFetch<T> + ApiError + showGlobalToast wiring
  tasks.ts       listTasks, createTask, updateTask, deleteTask, reorderTasks
  tags.ts        listTags, createTag, updateTag, deleteTag
  notes.ts       listNotes, createNote, updateNote, deleteNote
  sessions.ts    listSessions, getOpenSession, startWorkSession, startBreakSession,
                 completeSession, interruptSession
  stats.ts       getStats
```

### `src/api/client.ts`

- `BASE_URL` reads `import.meta.env.VITE_API_URL` with fallback `http://localhost:3000/api/v1`.
- `ApiError` extends `Error` with a `status: number` field.
- `apiFetch<T>(path, init?)`:
  - Sets `Content-Type: application/json`.
  - On non-ok response: parses `{ error }` body, throws `ApiError(status, message)`.
  - On 204: returns `undefined as T`.
  - On error (both `ApiError` and network): calls `showGlobalToast(err.message)` then re-throws.
- `showGlobalToast`: module-level variable, set by `ToastProvider` on mount via exported `registerGlobalToast(fn)`.

### `ToastProvider.tsx` change

Add and export:
```ts
let _showGlobalToast: (msg: string) => void = () => {}
export function registerGlobalToast(fn: (msg: string) => void) { _showGlobalToast = fn }
export function showGlobalToast(msg: string) { _showGlobalToast(msg) }
```
Inside `ToastProvider`, call `registerGlobalToast(showToast)` in a `useEffect` (or directly after `showToast` is defined).

---

## Changes by File

### `src/api/tasks.ts`
Wraps: `GET /tasks`, `POST /tasks`, `PATCH /tasks/{id}`, `DELETE /tasks/{id}`, `POST /tasks/reorder`.

### `src/api/tags.ts`
Wraps: `GET /tags`, `POST /tags`, `PATCH /tags/{id}`, `DELETE /tags/{id}`.

### `src/api/notes.ts`
Wraps: `GET /notes`, `POST /notes`, `PATCH /notes/{id}`, `DELETE /notes/{id}`.

### `src/api/sessions.ts`
Wraps: `GET /sessions` (listSessions), `GET /sessions/open`, `POST /sessions/work`, `POST /sessions/break`, `POST /sessions/{id}/complete`, `POST /sessions/{id}/interrupt`.

### `src/api/stats.ts`
Wraps: `GET /stats?filter=<all|week|today>`. The function is typed as returning `Promise<StatsData>`. The `StatsResponse` shape from the API is structurally identical to `StatsData` (same fields, same types), so `apiFetch<StatsData>` is the correct call — no mapping function needed.

### `src/store/taskStore.ts`
- Remove `TaskRepository` and `db` imports.
- `addTask`: strip `createdAt` and `updatedAt` from the incoming task (callers pass a full `Task` object). Do NOT strip `id` — the client-generated `id` must be included in the payload. Send `{ id, title, description, completed, parentId, order, tagIds, scheduledDay, dueDate }` to `api.createTask`. (The current repo code strips `id` — this changes.)
- `updateTask`: strip `createdAt`, `updatedAt`, and `id` from `changes` before calling `api.updateTask(id, changes)` to ensure only valid `UpdateTaskInput` fields are sent.
- `removeTask`: change signature to `async`. Call `api.deleteTask(id)`, then remove from the local store array. Update the `TaskStore` interface accordingly (`removeTask: (id: string) => Promise<void>`).
- `reorderTasks`: call `api.reorderTasks({ orderedIds: ids, parentId })`, then re-fetch with `api.listTasks()`.

### `src/store/tagStore.ts`
- Remove `TagRepository` and `db` imports.
- `addTag`: send `{ id, name, color }` to `api.createTag`. Do NOT strip `id` — the client-generated `id` must be included. (The current repo code strips `id` — this changes.) Return the `Tag` object from the API response (not the input argument) and add it to the store. The API echoes back the same `id` the client sent.
- `removeTag` stays in-memory only (removes the tag from the `tags` array in the store). There is no delete-tag UI, so no API call is made.

### `src/store/noteStore.ts`
- Remove `NoteRepository` and `db` imports.
- `addNote`: strip `createdAt` and `updatedAt` from the incoming note. Do NOT strip `id`. Send `{ id, title, content, tagIds, linkedTaskIds }` to `api.createNote`.
- `updateNote`: strip `createdAt`, `updatedAt`, and `id` from `changes` before calling `api.updateNote(id, changes)`. Callers (e.g. `NotesTab.tsx`) currently pass `updatedAt: nowISO()` in the partial — this field is not part of `UpdateNoteInput` and must be stripped in the store, not in callers.
- `removeNote`: change signature to `async`. Call `api.deleteNote(id)`, then remove from the local store array. Update the `NoteStore` interface accordingly (`removeNote: (id: string) => Promise<void>`).

### `src/store/pomodoroStore.ts`
- Remove `PomodoroRepository` and `db` imports.
- Delete `recoverStaleSession` export.
- `startSession`: if an existing `activeSession` is open:
  - If `activeSession.type === 'work'` → call `api.interruptSession(activeSession.sessionId)`.
  - If `activeSession.type` is a break → call `api.completeSession(activeSession.sessionId)` (the API's interrupt endpoint is work-only).
  Then call `api.startWorkSession(taskId)`. Set `activeSession` from the returned `PomodoroSession`: `{ sessionId: session.id, taskId: session.taskId, type: session.type, startedAt: session.startedAt }`.
- `stopSession`: if `activeSession.type === 'work'` → call `api.interruptSession`; otherwise → call `api.completeSession`. Then `set({ activeSession: null })`.
- `completeSession`: call `api.completeSession(sessionId)`. If `activeSession.type === 'work'`, also increment `workSessionCount` (`set({ activeSession: null, workSessionCount: workSessionCount + 1 })`). Otherwise `set({ activeSession: null })`.

### `src/App.tsx`
- Remove all `db`, repository, and `recoverStaleSession` imports.
- Replace `db.open()` + repository `getAll()` calls with `api.listTasks()`, `api.listTags()`, `api.listNotes()`.
- Replace `recoverStaleSession()` logic with `api.getOpenSession()`:
  1. If result is null: no active session, proceed normally.
  2. If result is non-null: check age (`Date.now() - Date.parse(openSession.startedAt)`).
     - If age > 2 hours: call `api.interruptSession(openSession.id)` and do NOT set active session.
     - If age ≤ 2 hours: call `setActiveSession` with the session data.
- On any error in `init()`: set `dbError` (now semantically "api error") to true.
- **Toast limitation during init**: `ToastProvider` is not mounted when `init()` runs, so `showGlobalToast` is a no-op during startup API failures. The `RecoveryScreen` error message is the only user feedback for init failures — this is acceptable. No change is needed.

### `src/components/RecoveryScreen.tsx`
- Remove `db` import.
- `handleExport`: replace `db.X.toArray()` calls with `Promise.all([api.listTasks(), api.listTags(), api.listNotes(), api.listSessions()])`. `listSessions()` returns `PomodoroSession[]`, which is the type `buildExportPayload` already expects as its fourth argument. The existing TypeScript `PomodoroSession` type (in `src/types/index.ts`) already uses `isOpen: 0 | 1`, matching the API schema exactly — no type changes needed.

### `src/features/stats/useStatsData.ts`
- Remove `db` import and `useTaskStore` import.
- Remove the `tasks` variable and the `taskMap` construction (the server's `StatsResponse` already includes `title` in each `taskStats` entry).
- Replace entire `load()` body with `const result = await api.getStats(filter)` and `if (!cancelled) setData(result)`. Keep the `let cancelled = false` guard and the `return () => { cancelled = true }` cleanup to prevent state updates after unmount.
- Remove `tasks` from the `useEffect` dependency array (only `filter` remains as a dependency).
- Keep `StatsData` type and `formatMinutes` export (unchanged).

---

## Deletions

| Path | Reason |
|------|--------|
| `src/db/db.ts` | Dexie instance no longer needed |
| `src/db/repositories/TaskRepository.ts` | Replaced by `src/api/tasks.ts` |
| `src/db/repositories/TagRepository.ts` | Replaced by `src/api/tags.ts` |
| `src/db/repositories/NoteRepository.ts` | Replaced by `src/api/notes.ts` |
| `src/db/repositories/PomodoroRepository.ts` | Replaced by `src/api/sessions.ts` |
| `src/db/repositories/__tests__/` | Tests for deleted code |
| `src/db/__tests__/` | Tests for deleted code |
| `src/types/__tests__/types.test.ts` | May become empty/irrelevant; review and delete if so |

---

## Error Handling

All `apiFetch` errors (network failures, 4xx, 5xx) are caught in `apiFetch` itself, shown as a toast via `showGlobalToast`, and then re-thrown. The re-throw propagates through store actions to the calling component's event handler. Since the toast already handles user feedback, callers do not need to catch or display additional UI. The rejection will bubble up through `async` event handlers silently (React does not crash on unhandled rejections in event handlers). The one exception is `addTag`: its return value (`newTag.id`) is used by callers to update a task or note; if the API call fails, the rejection propagates and the subsequent `updateTask`/`updateNote` call is skipped, which is the correct behavior.

---

## Out of Scope

- Tag update/delete UI wiring (no UI exists yet)
- Optimistic updates (stores remain pessimistic: API call first, then update cache)
- Tests for the new API client layer
