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

Add to `:root` in `index.css`:

```css
/* Transition tokens */
--transition-fast: 150ms ease;
--transition-base: 200ms ease;
--ease-spring: cubic-bezier(0.34, 1.56, 0.64, 1);
--ease-out: cubic-bezier(0.16, 1, 0.3, 1);

/* Visual tokens */
--radius-sm: 4px;
--radius-md: 6px;
--radius-lg: 10px;
--color-surface-hover: #1e242c;
--color-success-bg: #1c2a1e;
--color-success-border: #2a3f2e;
```

Add a `:root[data-theme="light"]` block with the light palette:

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
}
```

Theme switching is achieved by setting `data-theme="light"` on the `<html>` element. Dark is the default (no attribute needed).

---

## Section 2 — Theme Hook

New file: `src/lib/useTheme.ts`

- Reads from `localStorage` key `"theme"` on mount
- Falls back to `window.matchMedia('(prefers-color-scheme: light)')` if no stored value
- Sets `document.documentElement.setAttribute('data-theme', theme)` when theme is `'light'`; removes the attribute for dark
- Persists changes to `localStorage`
- Returns `{ theme, toggleTheme }` — `theme` is `'dark' | 'light'`

---

## Section 3 — Component Changes

### `App.tsx` — Tab bar + theme toggle

- Add an animated underline indicator to the active tab: `::after` pseudo-element, 2px height, accent color, animates in with `scaleX` from 0 on tab switch
- Add the theme toggle button at the far right of the tab bar row: icon-only (☀️ dark → 🌙 light), `width/height: 28px`, border-radius `--radius-md`, transitions `opacity` on hover

### `index.css` — Body transition

Add `transition: background-color 200ms ease, color 200ms ease` to `body` so the theme switch fades smoothly instead of hard-cutting.

### `TaskItem.tsx` — Hover + Pop & Shift completion

**Hover state:**
- Background → `--color-surface-hover`
- Border → slightly lighter (`#3d444d` in dark / `#b1bac4` in light)
- Subtle `box-shadow: 0 1px 4px rgba(0,0,0,0.3)`
- All via `transition: background var(--transition-base), border-color var(--transition-base), box-shadow var(--transition-base)`

**Completion (Pop & Shift):**
- Checkbox: `transform: scale(1.15)` with `--ease-spring`, fill becomes `--color-success`
- Task title: `translateX(3px)`, `opacity: 0.7`, `text-decoration: line-through`, `color: --color-text-muted`
- Row background: `--color-success-bg`, border: `--color-success-border`

**Pomodoro button:**
- `opacity: 0.35` default → `opacity: 1` + `transform: scale(1.15)` on hover, using `--ease-spring`

### `PomodoroTimer.tsx` — Visual polish

- Timer display (`fontSize: 52px`): add `animation: breathe 3s ease-in-out infinite` — subtle opacity pulse between 1 and 0.85
- Session dots: each filled dot gets `transform: scale(1.1)` and transitions in with `--ease-spring`
- Buttons: `transition: transform var(--transition-fast), box-shadow var(--transition-fast)` + `translateY(-1px)` on hover with a faint glow matching the button color

### `Toast.tsx` — Slide-up entrance

- Add `animation: toast-in 250ms var(--ease-out) both`
- `@keyframes toast-in`: from `{ transform: translateY(12px); opacity: 0 }` to `{ transform: translateY(0); opacity: 1 }`
- Add `box-shadow: 0 4px 16px rgba(0,0,0,0.4)`
- Add colored left border (`3px solid --color-success` for success toasts, `3px solid --color-danger` for error toasts)

### `TagEditModal.tsx` (and any other modals) — Slide-up entrance

- Backdrop: `background: rgba(0,0,0,0.55)`, add `transition: opacity 200ms ease`
- Modal panel: `animation: modal-in 200ms var(--ease-out) both`
- `@keyframes modal-in`: from `{ transform: translateY(8px) scale(0.97); opacity: 0 }` to `{ transform: translateY(0) scale(1); opacity: 1 }`
- Add `box-shadow: 0 8px 32px rgba(0,0,0,0.5)`

### `EmptyState.tsx` — Warmer styling

- Increase `font-size` to `14px`
- Add a subtle icon or emoji prefix where appropriate
- Use `--color-text-muted` for color (already does this — ensure padding is consistent: `padding: 24px 0`)

---

## Section 4 — Error Handling & Edge Cases

- Theme preference persists across page reloads via `localStorage`
- If `localStorage` is unavailable (e.g., private browsing), fall back to `prefers-color-scheme` gracefully — no crash
- All transition tokens are referenced from CSS variables so they degrade gracefully if variables are unsupported (old browsers get instantaneous state changes, which is acceptable)
- `prefers-reduced-motion`: add `@media (prefers-reduced-motion: reduce)` block in `index.css` that sets all transition/animation durations to `0.01ms`

---

## Section 5 — Testing

- `useTheme` hook: unit test that it reads/writes `localStorage` and sets `data-theme` on `document.documentElement`
- `useTheme` hook: test fallback to `prefers-color-scheme` when no `localStorage` value
- `App.tsx`: integration test that the theme toggle button is present and switches `data-theme` on click
- Visual transitions are CSS-only — no additional unit tests needed for animation keyframes

---

## Files Changed

| File | Change |
|---|---|
| `src/index.css` | Add transition tokens, new color tokens, light theme block, `prefers-reduced-motion` block, body transition |
| `src/lib/useTheme.ts` | New — theme hook with localStorage persistence |
| `src/App.tsx` | Add theme toggle button to tab bar |
| `src/features/tasks/TaskItem.tsx` | Hover states + Pop & Shift completion animation |
| `src/features/pomodoro/PomodoroTimer.tsx` | Breathing timer + button hover lifts |
| `src/components/Toast.tsx` | Slide-up entrance animation + colored left border |
| `src/features/tags/TagEditModal.tsx` | Slide-up modal entrance |
| `src/components/EmptyState.tsx` | Warmer padding/sizing |
