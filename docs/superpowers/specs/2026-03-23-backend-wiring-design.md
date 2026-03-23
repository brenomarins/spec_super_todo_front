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
- **Global toast for errors** — `apiFetch` surfaces errors via a module-level `showGlobalToast` singleton registered by `ToastProvider` on mount. Stores do not need to handle errors explicitly.
- **`VITE_API_URL` env var** — base URL defaults to `http://localhost:3000/api/v1`; overridable via `.env`.
- **`recoverStaleSession` deleted** — replaced in `App.tsx` init by a direct `GET /sessions/open` call, which returns the open session or null.
- **Tag update/delete API functions exposed but not wired** — `src/api/tags.ts` exports `updateTag` and `deleteTag` per the API spec, but no store or component calls them yet (no tag management UI exists).
- **`RecoveryScreen` repurposed** — the screen previously handled IndexedDB open failure. With the API it should handle network/API init failure. The export feature on that screen used `db` directly; it will be updated to call `GET /tasks`, `GET /tags`, `GET /notes`, `GET /sessions` instead.
- **All db-layer tests deleted** — tests under `src/db/` are removed. No replacement tests are added in this pass (stores are thin; integration tests would require a running backend).

---

## Architecture

### New: `src/api/`

```
src/api/
  client.ts      shared apiFetch<T> + ApiError + showGlobalToast wiring
  tasks.ts       listTasks, createTask, updateTask, deleteTask, reorderTasks
  tags.ts        listTags, createTag, updateTag, deleteTag
  notes.ts       listNotes, createNote, updateNote, deleteNote
  sessions.ts    getOpenSession, startWorkSession, startBreakSession,
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
Wraps: `GET /sessions/open`, `POST /sessions/work`, `POST /sessions/break`, `POST /sessions/{id}/complete`, `POST /sessions/{id}/interrupt`.

### `src/api/stats.ts`
Wraps: `GET /stats?filter=<all|week|today>` → returns `StatsData`.

### `src/store/taskStore.ts`
- Remove `TaskRepository` and `db` imports.
- `addTask`: call `api.createTask(task)` (sends full task object including client-generated `id`).
- `updateTask`: call `api.updateTask(id, changes)`.
- `reorderTasks`: call `api.reorderTasks({ orderedIds: ids, parentId })`, then re-fetch with `api.listTasks()`.

### `src/store/tagStore.ts`
- Remove `TagRepository` and `db` imports.
- `addTag`: call `api.createTag(tag)`.
- `removeTag` stays in-memory only (no API call — removes tag from task's local tagIds list).

### `src/store/noteStore.ts`
- Remove `NoteRepository` and `db` imports.
- `addNote`: call `api.createNote(note)`.
- `updateNote`: call `api.updateNote(id, changes)`.

### `src/store/pomodoroStore.ts`
- Remove `PomodoroRepository` and `db` imports.
- Delete `recoverStaleSession` export.
- `startSession`: call `api.interruptSession` / `api.completeSession` for the existing session (if any), then `api.startWorkSession(taskId)`.
- `stopSession`: call `api.interruptSession` or `api.completeSession` (break) depending on type.
- `completeSession`: call `api.completeSession(sessionId)`.

### `src/App.tsx`
- Remove all `db`, repository, and `recoverStaleSession` imports.
- Replace `db.open()` + repository `getAll()` calls with `api.listTasks()`, `api.listTags()`, `api.listNotes()`.
- Replace `recoverStaleSession()` logic with `api.getOpenSession()`:
  - If result is non-null and `isOpen === 1`: call `setActiveSession`.
  - Check age (>2h): call `api.interruptSession` and skip setting active session.
- On any error in `init()`: set `dbError` (now semantically "api error") to true.

### `src/components/RecoveryScreen.tsx`
- Remove `db` import.
- `handleExport`: replace `db.X.toArray()` calls with `Promise.all([api.listTasks(), api.listTags(), api.listNotes(), api.listSessions()])`.

### `src/features/stats/useStatsData.ts`
- Remove `db` import.
- Replace entire `load()` body with `const result = await api.getStats(filter)`.
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

All `apiFetch` errors (network failures, 4xx, 5xx) are caught in `apiFetch` itself, shown as a toast via `showGlobalToast`, and re-thrown. Store actions do not need individual try/catch blocks. The calling component may catch if it needs to do additional UI work (e.g. revert optimistic state), but this is not required in this pass.

---

## Out of Scope

- Tag update/delete UI wiring (no UI exists yet)
- Optimistic updates (stores remain pessimistic: API call first, then update cache)
- Tests for the new API client layer
