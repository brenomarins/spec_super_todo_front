# UI/UX Redesign — Micro-transitions, Visual Polish & Light/Dark Theme

**Date:** 2026-03-25
**Status:** Approved

## Goal

Improve the app's user-friendliness by introducing consistent Whisper-level micro-transitions, visual polish across all components, and a light/dark theme toggle — without adding any new dependencies.

## Decisions

| Decision | Choice |
|---|---|
| Animation personality | **Whisper** — 150–200ms, subtle easing, barely-there |
| Task completion animation | **Pop & Shift** — checkbox springs (scale 1.15 with spring curve), title nudges right 3px and dims to 0.7 opacity, row turns green-tinted |
| Visual improvements | Yes — spacing, hierarchy, hover states, component styling across all tabs |
| Light theme | Yes — GitHub-light inspired palette |
| Theme toggle placement | Tab bar, far right — ☀️ in dark, 🌙 in light |
| Architecture | CSS token layer in `index.css`, no new libraries |

---

## Section 1 — CSS Token System

Add new tokens to the existing `:root` block in `index.css`. **The existing `--radius: 6px` and all current tokens are preserved** — new tokens are additive only. No find-and-replace of `--radius` is needed; components already using it are unchanged.

```css
/* Add to existing :root block */

/* Transition tokens */
--transition-fast: 150ms ease;
--transition-base: 200ms ease;
--ease-spring: cubic-bezier(0.34, 1.56, 0.64, 1);
--ease-out: cubic-bezier(0.16, 1, 0.3, 1);

/* New visual tokens (dark values) */
--radius-sm: 4px;
--radius-md: 6px;
--radius-lg: 10px;
--color-surface-hover: #1e242c;
--color-success-bg: #1c2a1e;
--color-success-border: #2a3f2e;
```

Add a `:root[data-theme="light"]` block with the light palette. The `data-theme="light"` attribute is set on `<html>` by the theme hook; when absent, dark is active.

```css
:root[data-theme="light"] {
  --color-bg: #f6f8fa;
  --color-surface: #ffffff;
  --color-surface-2: #f0f3f6;
  --color-surface-hover: #eaf0f7;
  --color-border: #d0d7de;
  --color-text: #1f2328;
  --color-text-muted: #656d76;
  --color-accent: #0969da;
  --color-success: #1a7f37;
  --color-success-bg: #dafbe1;
  --color-success-border: #aceebb;
  --color-warning: #bc4c00;
  --color-danger: #cf222e;
  --color-purple: #8250df;
}
```

Add body transition and `prefers-reduced-motion` block:

```css
body {
  /* existing styles... */
  transition: background-color 200ms ease, color 200ms ease;
}

@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after {
    animation-duration: 0.01ms !important;
    transition-duration: 0.01ms !important;
  }
}
```

Define shared keyframes in `index.css` (used by multiple components):

```css
@keyframes breathe {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.85; }
}

@keyframes toast-in {
  from { transform: translateY(12px); opacity: 0; }
  to { transform: translateY(0); opacity: 1; }
}

@keyframes modal-in {
  from { transform: translateY(8px) scale(0.97); opacity: 0; }
  to { transform: translateY(0) scale(1); opacity: 1; }
}
```

---

## Section 2 — Theme Hook

New file: `src/lib/useTheme.ts`

- Uses a **lazy `useState` initializer** to read the stored theme synchronously before first render, preventing any flash of the wrong theme:

```ts
function readStoredTheme(): 'dark' | 'light' {
  try {
    const stored = localStorage.getItem('theme')
    if (stored === 'dark' || stored === 'light') return stored
  } catch { /* localStorage unavailable */ }
  return window.matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark'
}

export function useTheme() {
  const [theme, setTheme] = useState<'dark' | 'light'>(() => readStoredTheme())

  useEffect(() => {
    if (theme === 'light') {
      document.documentElement.setAttribute('data-theme', 'light')
    } else {
      document.documentElement.removeAttribute('data-theme')
    }
    try { localStorage.setItem('theme', theme) } catch { /* ignore */ }
  }, [theme])

  const toggleTheme = () => setTheme(t => t === 'dark' ? 'light' : 'dark')
  return { theme, toggleTheme }
}
```

- `localStorage` key: `"theme"`
- Attribute: `data-theme="light"` on `document.documentElement`; removed for dark

---

## Section 3 — Component Changes

### `TabBar.tsx` — animated underline + theme toggle

The theme toggle button lives inside `TabBar.tsx`. The component calls `useTheme()` directly.

**Structural change:** wrap the existing `<nav>` content in a flex row with `justify-content: space-between`:
- Left side: existing tab buttons (unchanged mapping)
- Right side: new theme toggle button

**Active tab underline:** replace the current `borderBottom: active === tab.id ? '2px solid ...' : '2px solid transparent'` approach with a CSS-animated `::after` pseudo-element using a className. Use a `<style>` tag or a CSS module. The active button gets class `tab-active`; the `::after` element animates in via `animation: slide-in-tab 200ms var(--ease-spring)`:

```css
@keyframes slide-in-tab {
  from { transform: scaleX(0); opacity: 0; }
  to { transform: scaleX(1); opacity: 1; }
}
```

**Theme toggle button:** icon-only, `width: 28px`, `height: 28px`, `border-radius: var(--radius-md)`, `border: 1px solid var(--color-border)`, `background: var(--color-surface-2)`. Shows `☀️` when `theme === 'dark'` (switch to light), `🌙` when `theme === 'light'` (switch to dark). Hover: `background: var(--color-surface-hover)`, `transform: scale(1.08)`, `transition: var(--transition-fast)`.

### `index.css` — body transition

Already covered in Section 1.

### `TaskItem.tsx` — Hover + Pop & Shift completion

**Hover state:**
- Background → `var(--color-surface-hover)`
- Border → `#3d444d` (dark) / inherits from light tokens
- `box-shadow: 0 1px 4px rgba(0,0,0,0.3)`
- `transition: background var(--transition-base), border-color var(--transition-base), box-shadow var(--transition-base)`

**Completion (Pop & Shift):**
- Checkbox: `transform: scale(1.15)` with `--ease-spring`, fill `var(--color-success)`, border `var(--color-success)`, checkmark color `white`
- Task title: `translateX(3px)`, `opacity: 0.7`, `text-decoration: line-through`, `color: var(--color-text-muted)`
- Row background → `var(--color-success-bg)`, border → `var(--color-success-border)`
- All via CSS transitions referencing `var(--transition-base)` and `var(--ease-spring)`

**Pomodoro button:**
- `opacity: 0.35` default → `opacity: 1` + `transform: scale(1.15)` on hover
- `transition: opacity var(--transition-fast), transform 150ms var(--ease-spring)`

### `PomodoroTimer.tsx` — Visual polish

- Timer display: add `animation: breathe 3s ease-in-out infinite` (keyframe defined in `index.css`)
- Buttons: add `transition: transform var(--transition-fast), box-shadow var(--transition-fast)`. On hover: `translateY(-1px)` with a faint glow matching the button color (e.g., `box-shadow: 0 2px 6px rgba(0,0,0,0.3)` for neutral buttons, `0 3px 10px rgba(63,185,80,0.3)` for the green Complete button)

### `SessionDots.tsx` — Transition on filled dots

- Add `transition: background var(--transition-base), transform 200ms var(--ease-spring)` to each dot `<span>`
- Filled dots (where `i < count % 4`): add `transform: scale(1.1)` inline

### `Toast.tsx` — Slide-up entrance + variant border

**New prop signature:**

```ts
interface ToastProps {
  message: string
  variant?: 'success' | 'error' | 'default'
}
```

- Add `animation: toast-in 250ms var(--ease-out) both` (keyframe in `index.css`)
- Add `box-shadow: 0 4px 16px rgba(0,0,0,0.4)`
- Add left border based on variant:
  - `success`: `borderLeft: '3px solid var(--color-success)'`
  - `error`: `borderLeft: '3px solid var(--color-danger)'`
  - `default` / undefined: no left border

### `ToastProvider.tsx` — Pass variant through

Update `ToastItem` interface and `showToast` signature to accept and forward `variant`:

```ts
interface ToastItem { id: number; message: string; variant?: 'success' | 'error' | 'default' }

// showToast signature:
showToast: (message: string, variant?: 'success' | 'error' | 'default') => void
```

Pass `variant` when rendering `<Toast key={t.id} message={t.message} variant={t.variant} />`. Existing callers that only pass `message` continue to work unchanged (variant defaults to `undefined` → no border).

### `TagEditModal.tsx` — Slide-up modal entrance

- Modal panel: add `animation: modal-in 200ms var(--ease-out) both` (keyframe in `index.css`)
- Add `box-shadow: 0 8px 32px rgba(0,0,0,0.5)`
- Backdrop overlay: add `transition: opacity 200ms ease`

### `EmptyState.tsx` — Minor padding reduction

- Reduce vertical padding from `48px` to `32px` to avoid excessive whitespace in compact tab views (`padding: '32px 16px'`)
- Font size (14px) and color (`var(--color-text-muted)`) are already correct — no change needed

---

## Section 4 — Error Handling & Edge Cases

- Theme preference persists across reloads via `localStorage`
- `localStorage` unavailable (private browsing): `readStoredTheme()` catches the exception and falls back to `prefers-color-scheme` — no crash
- Lazy `useState` initializer ensures theme is applied before first paint — no flash of wrong theme
- All transition tokens degrade gracefully if CSS variables are unsupported: instantaneous state changes, which is acceptable
- `prefers-reduced-motion`: all durations collapse to `0.01ms` via the media query in `index.css` — fully accessible

---

## Section 5 — Testing

- `useTheme` hook: unit test that it reads/writes `localStorage` and sets/removes `data-theme` on `document.documentElement`
- `useTheme` hook: test fallback to `prefers-color-scheme` when no `localStorage` value present
- `useTheme` hook: test that `localStorage` failure is caught gracefully
- `App` / `TabBar`: integration test that the theme toggle button is present and toggles `data-theme` on click
- `Toast`: test that `variant="success"` renders the left success border, `variant="error"` renders danger border
- CSS-only animations and keyframes do not require unit tests

---

## Files Changed

| File | Change |
|---|---|
| `src/index.css` | Add transition tokens, new color tokens, light theme block, keyframes, `prefers-reduced-motion` block, body transition |
| `src/lib/useTheme.ts` | **New** — theme hook with lazy init, localStorage persistence, `data-theme` attribute management |
| `src/components/TabBar.tsx` | Add animated underline indicator, call `useTheme()`, add theme toggle button far right |
| `src/features/tasks/TaskItem.tsx` | Hover states + Pop & Shift completion animation |
| `src/features/pomodoro/PomodoroTimer.tsx` | Breathing timer animation + button hover lifts |
| `src/features/pomodoro/SessionDots.tsx` | Transition + scale on filled dots |
| `src/components/Toast.tsx` | Slide-up entrance + optional `variant` prop + colored left border |
| `src/components/ToastProvider.tsx` | Forward `variant` through `showToast` and `ToastItem` |
| `src/features/tags/TagEditModal.tsx` | Slide-up modal entrance + backdrop transition |
| `src/components/EmptyState.tsx` | Reduce vertical padding from 48px to 32px |
