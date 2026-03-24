# Fix: apiFetch Throws on Empty 200 Body

**Date:** 2026-03-24
**Scope:** `src/api/client.ts` — two-line change

---

## Problem

`apiFetch` calls `res.json()` for all 2xx responses that are not 204. When the backend returns HTTP 200 with an empty body (Spring Boot serializing a Java `null` return value), `res.json()` throws a `SyntaxError`. This is not an `ApiError`, so it propagates through stores and up to `App.tsx`'s `catch (e)` block, setting `apiError = true` and rendering `RecoveryScreen`.

The affected endpoint is `GET /sessions/open`, which returns 200 + empty body when no session is active.

## Fix

Replace the direct `res.json()` call with a `res.text()` → conditional `JSON.parse()` pattern:

```ts
// Before
if (res.status === 204) return undefined as T
return res.json() as Promise<T>

// After
if (res.status === 204) return undefined as T
const text = await res.text()
if (!text) return undefined as T
return JSON.parse(text) as T
```

`getOpenSession` already chains `.then(v => v ?? null)`, so `undefined` from an empty body becomes `null` — handled correctly by the existing `if (openSession)` check in `App.tsx`.

## Safety

- **Endpoints returning arrays/objects:** Always return non-empty JSON (e.g. `[]`, `{}`), so `!text` is never true for them.
- **204 responses:** Still handled by the existing guard before the text check.
- **Actual JSON parse errors (malformed body):** Still throw and propagate as before.
- **No other files changed.**
