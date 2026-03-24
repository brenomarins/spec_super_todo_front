# Fix: getOpenSession 404 Shows RecoveryScreen

**Date:** 2026-03-24
**Scope:** `src/api/sessions.ts` — one line change

---

## Problem

`GET /sessions/open` returns HTTP 404 when no session is active. `apiFetch` treats every non-2xx as an error and throws `ApiError`. The `init()` function in `App.tsx` catches the throw and sets `apiError = true`, rendering `RecoveryScreen` — even though all other API calls (tasks, tags, notes) succeeded.

## Fix

Add a `.catch` to `getOpenSession` that intercepts 404 and returns `null` instead of re-throwing. All other errors (network failures, 500, etc.) still propagate normally.

```ts
// src/api/sessions.ts
export const getOpenSession = () =>
  apiFetch<PomodoroSession | null>('/sessions/open')
    .then(v => v ?? null)
    .catch((err: unknown) => {
      if (err instanceof ApiError && err.status === 404) return null
      throw err
    })
```

`ApiError` is already exported from `src/api/client.ts` — add it to the import.

## What Does Not Change

- `App.tsx` — already handles `null` from `getOpenSession` correctly (`if (openSession)` check)
- All other API modules — unaffected
- Error handling for real failures — 404 is only swallowed on this specific endpoint; network errors and 5xx still trigger `RecoveryScreen`
