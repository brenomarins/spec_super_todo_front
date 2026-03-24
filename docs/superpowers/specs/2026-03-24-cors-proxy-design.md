# CORS Fix — Vite Dev Proxy Design

**Date:** 2026-03-24
**Scope:** Fix CORS errors when the frontend (Vite, port 5173) calls the backend (Spring Boot, port 8091)

---

## Problem

The browser blocks cross-origin requests from `http://localhost:5173` to `http://localhost:8091`. `apiFetch` calls fail with a CORS error because no proxy or permissive CORS headers are configured.

## Solution

Configure a Vite dev proxy so the browser always makes same-origin requests to `localhost:5173/api/...`, which Vite silently forwards to `localhost:8091/api/...`. The backend never sees a cross-origin request.

## Changes

### `vite.config.ts`

Add a `server.proxy` block. The file currently imports `defineConfig` from `vitest/config`, which re-exports Vite's full `defineConfig` — `server.proxy` is supported without changing the import.

```ts
server: {
  proxy: {
    '/api': {
      target: 'http://localhost:8091',
      changeOrigin: true,
    },
  },
},
```

Any request whose path starts with `/api` is forwarded to `http://localhost:8091`. The path is preserved: `/api/v1/tasks` → `http://localhost:8091/api/v1/tasks`.

### `.env`

Create at the project root:

```
VITE_API_URL=/api/v1
```

`src/api/client.ts` already reads `import.meta.env.VITE_API_URL` with a fallback to `http://localhost:8091/api/v1`. Setting it to `/api/v1` makes every `apiFetch` call use a relative URL, routing through the Vite proxy.

This file contains no secrets and is the same for all developers — commit it. (`.env.local`, which is gitignored via `*.local`, is the right place for per-developer overrides.)

## What Does Not Change

- `src/api/client.ts` — no changes needed
- All API modules, stores, and components — untouched

## Production

For production deployments where the frontend and backend are served from different origins, set `VITE_API_URL` to the absolute backend URL in `.env.production` or as a build-time environment variable:

```
VITE_API_URL=https://api.example.com/api/v1
```

The proxy is a dev-only mechanism (`server.proxy` has no effect in production builds).

## Out of Scope

- Backend CORS configuration (`@CrossOrigin` / `WebMvcConfigurer`) — not needed for local dev with this approach
- Authentication headers — no change
