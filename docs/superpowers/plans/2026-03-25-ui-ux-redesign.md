# UI/UX Redesign Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add Whisper-level micro-transitions (150–200ms), Pop & Shift task completion animation, visual hover polish, and a persistent light/dark theme toggle across all app components — with no new dependencies.

**Architecture:** Add CSS design tokens and keyframes to `index.css`; create a `useTheme` hook for theme persistence via `localStorage`; apply transitions via inline styles (keyframes referenced by name from `index.css`) and a single CSS class (`.tab-active`) for the tab underline indicator that requires `::after`.

**Tech Stack:** React 18, TypeScript, Vite, Zustand, Vitest + React Testing Library, jsdom (no new deps)

**Spec:** `docs/superpowers/specs/2026-03-25-ui-ux-redesign-design.md`

**Run tests:** `npm test`
**Watch tests:** `npm run test:watch`

---

## Chunk 1: Foundation — CSS Tokens + useTheme Hook

### Task 1: Add CSS tokens, keyframes, and theme variables to `index.css`

**Files:**
- Modify: `src/index.css`

No unit tests for CSS-only changes. Run the full suite after to verify no regressions.

- [ ] **Step 1: Add new tokens to the existing `:root` block**

Open `src/index.css`. After the existing `--radius: 6px;` line, add:

```css
  /* Transition tokens */
  --transition-fast: 150ms ease;
  --transition-base: 200ms ease;
  --ease-spring: cubic-bezier(0.34, 1.56, 0.64, 1);
  --ease-out: cubic-bezier(0.16, 1, 0.3, 1);
  /* New visual tokens */
  --radius-sm: 4px;
  --radius-md: 6px;
  --radius-lg: 10px;
  --color-surface-hover: #1e242c;
  --color-success-bg: #1c2a1e;
  --color-success-border: #2a3f2e;
```

- [ ] **Step 2: Add the light theme block after the `:root` block**

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

- [ ] **Step 3: Add body transition, after the existing `body { ... }` rule**

Change the existing `body` rule to add the transition:

```css
body {
  margin: 0;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
  background: var(--color-bg);
  color: var(--color-text);
  transition: background-color 200ms ease, color 200ms ease;
}
```

- [ ] **Step 4: Add keyframes and the `.tab-active` CSS class at the end of `index.css`**

```css
/* ── Keyframes ───────────────────────────── */
@keyframes breathe {
  0%, 100% { opacity: 1; }
  50%       { opacity: 0.85; }
}

@keyframes toast-in {
  from { transform: translateY(12px); opacity: 0; }
  to   { transform: translateY(0);    opacity: 1; }
}

@keyframes modal-in {
  from { transform: translateY(8px) scale(0.97); opacity: 0; }
  to   { transform: translateY(0)   scale(1);    opacity: 1; }
}

@keyframes tab-indicator-in {
  from { transform: scaleX(0); opacity: 0; }
  to   { transform: scaleX(1); opacity: 1; }
}

/* ── Tab active underline ────────────────── */
.tab-active {
  position: relative;
}
.tab-active::after {
  content: '';
  position: absolute;
  bottom: -1px;
  left: 8px;
  right: 8px;
  height: 2px;
  background: var(--color-accent);
  border-radius: 2px 2px 0 0;
  animation: tab-indicator-in 200ms var(--ease-spring) both;
}

/* ── Accessibility ───────────────────────── */
@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after {
    animation-duration: 0.01ms !important;
    transition-duration: 0.01ms !important;
  }
}
```

- [ ] **Step 5: Run the full test suite — all tests must pass**

```bash
npm test
```

Expected: all existing tests pass (no regressions from CSS changes).

- [ ] **Step 6: Commit**

```bash
git add src/index.css
git commit -m "feat: add CSS design tokens, light theme, keyframes, tab-active class"
```

---

### Task 2: Create `useTheme` hook with tests

**Files:**
- Create: `src/lib/useTheme.ts`
- Create: `src/lib/__tests__/useTheme.test.ts`

- [ ] **Step 1: Write the failing tests first**

Create `src/lib/__tests__/useTheme.test.ts`:

```ts
import { renderHook, act } from '@testing-library/react'
import { useTheme } from '../useTheme'

function mockMatchMedia(prefersLight: boolean) {
  Object.defineProperty(window, 'matchMedia', {
    writable: true,
    value: vi.fn().mockImplementation((query: string) => ({
      matches: query === '(prefers-color-scheme: light)' ? prefersLight : false,
      media: query,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    })),
  })
}

beforeEach(() => {
  localStorage.clear()
  document.documentElement.removeAttribute('data-theme')
  mockMatchMedia(false) // default: user prefers dark
})

test('defaults to dark when no localStorage and OS prefers dark', () => {
  const { result } = renderHook(() => useTheme())
  expect(result.current.theme).toBe('dark')
  expect(document.documentElement.getAttribute('data-theme')).toBeNull()
})

test('defaults to light when no localStorage and OS prefers light', () => {
  mockMatchMedia(true)
  const { result } = renderHook(() => useTheme())
  expect(result.current.theme).toBe('light')
  expect(document.documentElement.getAttribute('data-theme')).toBe('light')
})

test('reads stored dark theme from localStorage', () => {
  localStorage.setItem('theme', 'dark')
  const { result } = renderHook(() => useTheme())
  expect(result.current.theme).toBe('dark')
  expect(document.documentElement.getAttribute('data-theme')).toBeNull()
})

test('reads stored light theme from localStorage', () => {
  localStorage.setItem('theme', 'light')
  const { result } = renderHook(() => useTheme())
  expect(result.current.theme).toBe('light')
  expect(document.documentElement.getAttribute('data-theme')).toBe('light')
})

test('toggleTheme switches from dark to light and persists', () => {
  const { result } = renderHook(() => useTheme())
  act(() => result.current.toggleTheme())
  expect(result.current.theme).toBe('light')
  expect(document.documentElement.getAttribute('data-theme')).toBe('light')
  expect(localStorage.getItem('theme')).toBe('light')
})

test('toggleTheme switches from light to dark and removes attribute', () => {
  localStorage.setItem('theme', 'light')
  const { result } = renderHook(() => useTheme())
  act(() => result.current.toggleTheme())
  expect(result.current.theme).toBe('dark')
  expect(document.documentElement.getAttribute('data-theme')).toBeNull()
  expect(localStorage.getItem('theme')).toBe('dark')
})

test('handles localStorage.getItem failure gracefully', () => {
  vi.spyOn(Storage.prototype, 'getItem').mockImplementationOnce(() => {
    throw new Error('SecurityError')
  })
  expect(() => renderHook(() => useTheme())).not.toThrow()
})
```

- [ ] **Step 2: Run tests to confirm they fail**

```bash
npm test -- useTheme
```

Expected: FAIL — `Cannot find module '../useTheme'`

- [ ] **Step 3: Implement the hook**

Create `src/lib/useTheme.ts`:

```ts
import { useState, useEffect } from 'react'

type Theme = 'dark' | 'light'

function readStoredTheme(): Theme {
  try {
    const stored = localStorage.getItem('theme')
    if (stored === 'dark' || stored === 'light') return stored
  } catch {
    // localStorage unavailable (private browsing, etc.)
  }
  return window.matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark'
}

export function useTheme() {
  const [theme, setTheme] = useState<Theme>(() => readStoredTheme())

  useEffect(() => {
    if (theme === 'light') {
      document.documentElement.setAttribute('data-theme', 'light')
    } else {
      document.documentElement.removeAttribute('data-theme')
    }
    try {
      localStorage.setItem('theme', theme)
    } catch {
      // ignore write failure
    }
  }, [theme])

  const toggleTheme = () => setTheme(t => (t === 'dark' ? 'light' : 'dark'))
  return { theme, toggleTheme }
}
```

- [ ] **Step 4: Run tests — all 7 must pass**

```bash
npm test -- useTheme
```

Expected: 7 passing.

- [ ] **Step 5: Commit**

```bash
git add src/lib/useTheme.ts src/lib/__tests__/useTheme.test.ts
git commit -m "feat: add useTheme hook with localStorage persistence and OS preference fallback"
```

---

## Chunk 2: Navigation — TabBar Theme Toggle + Animated Underline

### Task 3: Update `TabBar` with animated underline and theme toggle

**Files:**
- Modify: `src/components/TabBar.tsx`
- Create: `src/components/__tests__/TabBar.test.tsx`

- [ ] **Step 1: Write the failing tests**

Create `src/components/__tests__/TabBar.test.tsx`:

```tsx
import { render, screen, fireEvent } from '@testing-library/react'
import { TabBar } from '../TabBar'

function mockMatchMedia(prefersLight = false) {
  Object.defineProperty(window, 'matchMedia', {
    writable: true,
    value: vi.fn().mockImplementation((query: string) => ({
      matches: query === '(prefers-color-scheme: light)' ? prefersLight : false,
      media: query,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    })),
  })
}

beforeEach(() => {
  localStorage.clear()
  document.documentElement.removeAttribute('data-theme')
  mockMatchMedia(false)
})

test('renders all tab labels', () => {
  render(<TabBar active="home" onChange={() => {}} />)
  expect(screen.getByText('Home')).toBeInTheDocument()
  expect(screen.getByText('Tasks')).toBeInTheDocument()
  expect(screen.getByText('Schedule')).toBeInTheDocument()
  expect(screen.getByText('Notes')).toBeInTheDocument()
  expect(screen.getByText('Stats')).toBeInTheDocument()
  expect(screen.getByText('Tags')).toBeInTheDocument()
})

test('active tab gets tab-active class', () => {
  render(<TabBar active="tasks" onChange={() => {}} />)
  const tasksBtn = screen.getByText('Tasks').closest('button')
  expect(tasksBtn).toHaveClass('tab-active')
  const homeBtn = screen.getByText('Home').closest('button')
  expect(homeBtn).not.toHaveClass('tab-active')
})

test('calls onChange when tab clicked', () => {
  const onChange = vi.fn()
  render(<TabBar active="home" onChange={onChange} />)
  fireEvent.click(screen.getByText('Tasks'))
  expect(onChange).toHaveBeenCalledWith('tasks')
})

test('theme toggle button is present with correct aria-label in dark mode', () => {
  render(<TabBar active="home" onChange={() => {}} />)
  expect(screen.getByRole('button', { name: /switch to light theme/i })).toBeInTheDocument()
})

test('clicking theme toggle sets data-theme to light', () => {
  render(<TabBar active="home" onChange={() => {}} />)
  fireEvent.click(screen.getByRole('button', { name: /switch to light theme/i }))
  expect(document.documentElement.getAttribute('data-theme')).toBe('light')
})

test('clicking theme toggle again removes data-theme attribute', () => {
  render(<TabBar active="home" onChange={() => {}} />)
  const btn = screen.getByRole('button', { name: /switch to light theme/i })
  fireEvent.click(btn)
  expect(document.documentElement.getAttribute('data-theme')).toBe('light')
  fireEvent.click(screen.getByRole('button', { name: /switch to dark theme/i }))
  expect(document.documentElement.getAttribute('data-theme')).toBeNull()
})
```

- [ ] **Step 2: Run tests to confirm they fail**

```bash
npm test -- TabBar.test
```

Expected: FAIL — theme toggle button not found.

- [ ] **Step 3: Update `TabBar.tsx`**

Replace `src/components/TabBar.tsx` entirely:

```tsx
import { useTheme } from '../lib/useTheme'

type Tab = 'home' | 'tasks' | 'schedule' | 'notes' | 'stats' | 'tags'

interface Props {
  active: Tab
  onChange: (tab: Tab) => void
}

const TABS: { id: Tab; label: string }[] = [
  { id: 'home',     label: 'Home' },
  { id: 'tasks',    label: 'Tasks' },
  { id: 'schedule', label: 'Schedule' },
  { id: 'notes',    label: 'Notes' },
  { id: 'stats',    label: 'Stats' },
  { id: 'tags',     label: 'Tags' },
]

export function TabBar({ active, onChange }: Props) {
  const { theme, toggleTheme } = useTheme()

  return (
    <nav style={{
      display: 'flex', alignItems: 'center',
      borderBottom: '1px solid var(--color-border)',
      background: 'var(--color-surface)', padding: '0 12px',
    }}>
      {TABS.map(tab => (
        <button
          key={tab.id}
          onClick={() => onChange(tab.id)}
          className={active === tab.id ? 'tab-active' : undefined}
          style={{
            padding: '12px 14px', fontSize: 14,
            color: active === tab.id ? 'var(--color-text)' : 'var(--color-text-muted)',
            transition: 'color var(--transition-base)',
          }}
        >
          {tab.label}
        </button>
      ))}

      <button
        type="button"
        aria-label={theme === 'dark' ? 'Switch to light theme' : 'Switch to dark theme'}
        onClick={toggleTheme}
        style={{
          marginLeft: 'auto',
          width: 28, height: 28,
          borderRadius: 'var(--radius-md)',
          border: '1px solid var(--color-border)',
          background: 'var(--color-surface-2)',
          fontSize: 14, cursor: 'pointer', lineHeight: 1,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          transition: `background var(--transition-fast), transform 150ms var(--ease-spring)`,
        }}
        onMouseEnter={e => {
          e.currentTarget.style.background = 'var(--color-surface-hover)'
          e.currentTarget.style.transform = 'scale(1.08)'
        }}
        onMouseLeave={e => {
          e.currentTarget.style.background = 'var(--color-surface-2)'
          e.currentTarget.style.transform = 'scale(1)'
        }}
      >
        {theme === 'dark' ? '☀️' : '🌙'}
      </button>
    </nav>
  )
}

export type { Tab }
```

- [ ] **Step 4: Run tests — all must pass**

```bash
npm test -- TabBar.test
```

Expected: 6 passing.

- [ ] **Step 5: Run full suite to check for regressions**

```bash
npm test
```

Expected: all tests pass.

- [ ] **Step 6: Commit**

```bash
git add src/components/TabBar.tsx src/components/__tests__/TabBar.test.tsx
git commit -m "feat: add theme toggle and animated tab underline to TabBar"
```

---

## Chunk 3: Task Completion — TaskItem Polish

### Task 4: Add hover states and Pop & Shift completion to `TaskItem`

**Files:**
- Modify: `src/features/tasks/TaskItem.tsx`
- Modify: `src/features/tasks/TaskItem.test.tsx`

- [ ] **Step 1: Add completion style test**

Add this test to `src/features/tasks/TaskItem.test.tsx`:

```tsx
test('TaskItem applies completed styles to title when done', () => {
  const completedTask = { ...task, completed: true }
  render(<TaskItem task={completedTask} tags={[]} pomodoroCount={0}
    onClick={() => {}} onToggle={() => {}} dragHandleProps={null} />)
  const title = screen.getByText('Design Homepage')
  expect(title).toHaveStyle({ textDecoration: 'line-through' })
})

test('TaskItem row has green tint background when completed', () => {
  const completedTask = { ...task, completed: true }
  const { container } = render(<TaskItem task={completedTask} tags={[]} pomodoroCount={0}
    onClick={() => {}} onToggle={() => {}} dragHandleProps={null} />)
  const row = container.firstChild as HTMLElement
  expect(row).toHaveStyle({ background: 'var(--color-success-bg)' })
})
```

> **Note on `toHaveStyle({ background: ... })`:** The custom matcher in `setup.ts` falls back to checking the raw `style` attribute string. If this assertion fails in practice (jsdom shorthand expansion), replace it with:
> ```tsx
> expect(row.getAttribute('style')).toContain('var(--color-success-bg)')
> ```

- [ ] **Step 2: Run new tests — the first should pass (existing code), the second should fail**

```bash
npm test -- TaskItem.test
```

Expected: 6 pass, 1 fail (`row has green tint`).

- [ ] **Step 3: Update `TaskItem.tsx`**

Replace `src/features/tasks/TaskItem.tsx`:

```tsx
import { useState } from 'react'
import type { Task, Tag } from '../../types'
import { TagBadge } from '../../components/TagBadge'
import { DueDateBadge } from '../../components/DueDateBadge'

interface TaskItemProps {
  task: Task
  tags: Tag[]
  pomodoroCount: number
  isActive?: boolean
  onClick: (id: string) => void
  onToggle: (id: string) => void
  onStartPomodoro?: (id: string) => void
  dragHandleProps: Record<string, unknown> | null
}

export function TaskItem({ task, tags, pomodoroCount, isActive, onClick, onToggle, onStartPomodoro, dragHandleProps }: TaskItemProps) {
  const [hovered, setHovered] = useState(false)
  const taskTags = tags.filter(t => task.tagIds.includes(t.id))

  return (
    <div
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        background: task.completed ? 'var(--color-success-bg)' : hovered ? 'var(--color-surface-hover)' : 'var(--color-surface)',
        border: `1px solid ${
          isActive ? 'var(--color-warning)'
          : task.completed ? 'var(--color-success-border)'
          : hovered ? '#3d444d'
          : 'var(--color-border)'
        }`,
        borderRadius: 6, padding: '8px 10px', display: 'flex', alignItems: 'flex-start', gap: 8,
        boxShadow: hovered && !task.completed ? '0 1px 4px rgba(0,0,0,0.3)' : 'none',
        transition: 'background var(--transition-base), border-color var(--transition-base), box-shadow var(--transition-base)',
      }}
    >
      {dragHandleProps && (
        <span {...dragHandleProps} style={{ cursor: 'grab', color: 'var(--color-text-muted)', fontSize: 16, paddingTop: 1 }}>
          ⠿
        </span>
      )}
      <input
        type="checkbox"
        checked={task.completed}
        onChange={() => onToggle(task.id)}
        style={{
          marginTop: 2, cursor: 'pointer', accentColor: 'var(--color-success)',
          transition: `transform 200ms var(--ease-spring)`,
          transform: task.completed ? 'scale(1.15)' : 'scale(1)',
        }}
      />
      <div
        role="button"
        tabIndex={0}
        style={{ flex: 1, cursor: 'pointer' }}
        onClick={() => onClick(task.id)}
        onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') onClick(task.id) }}
      >
        <span style={{
          textDecoration: task.completed ? 'line-through' : 'none',
          color: task.completed ? 'var(--color-text-muted)' : 'var(--color-text)',
          fontSize: 14,
          display: 'block',
          transition: 'color var(--transition-base), opacity var(--transition-base), transform var(--transition-base)',
          opacity: task.completed ? 0.7 : 1,
          transform: task.completed ? 'translateX(3px)' : 'translateX(0)',
        }}>
          {isActive && <span style={{ marginRight: 4 }}>🍅</span>}
          {task.title}
        </span>
        {taskTags.length > 0 && (
          <div style={{ display: 'flex', gap: 4, marginTop: 4, flexWrap: 'wrap' }}>
            {taskTags.map(tag => <TagBadge key={tag.id} tag={tag} />)}
          </div>
        )}
      </div>
      {pomodoroCount > 0 && (
        <span style={{ fontSize: 12, color: 'var(--color-warning)', whiteSpace: 'nowrap' }}>
          🍅 {pomodoroCount}
        </span>
      )}
      <DueDateBadge dueDate={task.dueDate} completed={task.completed} />
      {onStartPomodoro && (
        <button
          type="button"
          aria-label="start pomodoro"
          onClick={(e) => { e.stopPropagation(); onStartPomodoro(task.id) }}
          title="Start Pomodoro"
          style={{
            background: 'none', border: 'none', cursor: 'pointer',
            fontSize: 16, padding: '2px 4px', lineHeight: 1,
            opacity: 0.35,
            transition: `opacity var(--transition-fast), transform 150ms var(--ease-spring)`,
          }}
          onMouseEnter={e => {
            e.currentTarget.style.opacity = '1'
            e.currentTarget.style.transform = 'scale(1.15)'
          }}
          onMouseLeave={e => {
            e.currentTarget.style.opacity = '0.35'
            e.currentTarget.style.transform = 'scale(1)'
          }}
        >
          🍅
        </button>
      )}
    </div>
  )
}
```

- [ ] **Step 4: Run all TaskItem tests — all 8 must pass**

```bash
npm test -- TaskItem.test
```

Expected: 8 passing.

- [ ] **Step 5: Run full suite**

```bash
npm test
```

Expected: all tests pass.

- [ ] **Step 6: Commit**

```bash
git add src/features/tasks/TaskItem.tsx src/features/tasks/TaskItem.test.tsx
git commit -m "feat: add hover states and Pop & Shift completion animation to TaskItem"
```

---

## Chunk 4: Pomodoro — Timer Polish + Session Dots

### Task 5: Add breathing animation and button hover lifts to `PomodoroTimer`

**Files:**
- Modify: `src/features/pomodoro/PomodoroTimer.tsx`

CSS-only changes — no new tests needed. Existing tests must still pass.

- [ ] **Step 1: Update `PomodoroTimer.tsx`**

Replace the file with:

```tsx
import React from 'react'
import { SessionDots } from './SessionDots'

interface PomodoroTimerProps {
  taskId: string | null
  taskTitle: string | null
  display: string
  isRunning: boolean
  sessionType: 'work' | 'short_break' | 'long_break' | null
  workSessionCount: number
  onStart: (taskId: string) => void
  onStop: () => void
  onComplete: () => void
  onShortBreak: () => void
  onLongBreak: () => void
}

const btnBase: React.CSSProperties = {
  border: '1px solid var(--color-border)',
  padding: '6px 12px',
  borderRadius: 6,
  cursor: 'pointer',
  fontSize: 13,
  transition: 'transform var(--transition-fast), box-shadow var(--transition-fast)',
}

function HoverButton({ style, ...props }: React.ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      {...props}
      style={style}
      onMouseEnter={e => {
        e.currentTarget.style.transform = 'translateY(-1px)'
        const shadow = (style as React.CSSProperties)?.background === 'var(--color-success)'
          ? '0 3px 10px rgba(63,185,80,0.3)'
          : '0 2px 6px rgba(0,0,0,0.3)'
        e.currentTarget.style.boxShadow = shadow
      }}
      onMouseLeave={e => {
        e.currentTarget.style.transform = 'translateY(0)'
        e.currentTarget.style.boxShadow = 'none'
      }}
    />
  )
}

export function PomodoroTimer({
  taskId, taskTitle, display, isRunning, sessionType, workSessionCount,
  onStart, onStop, onComplete, onShortBreak, onLongBreak,
}: PomodoroTimerProps) {
  return (
    <div style={{
      background: 'var(--color-surface)', border: '1px solid var(--color-border)',
      borderRadius: 12, padding: 20, textAlign: 'center', maxWidth: 320, margin: '0 auto',
    }}>
      {taskTitle && (
        <div style={{ fontSize: 12, color: 'var(--color-text-muted)', marginBottom: 8, textTransform: 'uppercase' }}>
          {isRunning && <span>FOCUS — </span>}
          <span>{taskTitle}</span>
        </div>
      )}

      <div style={{
        fontSize: 52, fontWeight: 700, color: 'var(--color-warning)',
        fontVariantNumeric: 'tabular-nums', marginBottom: 12,
        animation: 'breathe 3s ease-in-out infinite',
      }}>
        {display}
      </div>

      <div style={{ display: 'flex', gap: 8, justifyContent: 'center', flexWrap: 'wrap', marginBottom: 12 }}>
        {sessionType === 'work' ? (
          <>
            <HoverButton type="button" onClick={onComplete}
              style={{ ...btnBase, background: 'var(--color-success)', color: '#fff', border: 'none' }}>
              ✅ Complete
            </HoverButton>
            <HoverButton type="button" onClick={onShortBreak}
              style={{ ...btnBase, background: 'var(--color-surface-2)', color: 'var(--color-text)' }}>
              ☕ Short Break
            </HoverButton>
            <HoverButton type="button" onClick={onLongBreak}
              style={{ ...btnBase, background: 'var(--color-surface-2)', color: 'var(--color-text)' }}>
              🌙 Long Break
            </HoverButton>
            <HoverButton type="button" onClick={onStop}
              style={{ ...btnBase, background: 'var(--color-surface-2)', color: 'var(--color-text)' }}>
              ⏹ Stop
            </HoverButton>
          </>
        ) : isRunning ? (
          <HoverButton type="button" onClick={onStop}
            style={{ ...btnBase, background: 'var(--color-surface-2)', color: 'var(--color-text)' }}>
            ⏹ Stop
          </HoverButton>
        ) : (
          <HoverButton
            type="button"
            onClick={() => taskId && onStart(taskId)}
            disabled={!taskId}
            style={{
              background: 'var(--color-success)', border: 'none', color: '#fff',
              padding: '6px 16px', borderRadius: 6,
              cursor: taskId ? 'pointer' : 'default',
              fontSize: 13, opacity: taskId ? 1 : 0.5,
              transition: 'transform var(--transition-fast), box-shadow var(--transition-fast)',
            }}
          >
            ▶ Start
          </HoverButton>
        )}
      </div>

      <SessionDots count={workSessionCount} />

      {workSessionCount > 0 && (
        <div style={{ fontSize: 11, color: 'var(--color-text-muted)', marginTop: 6 }}>
          {workSessionCount % 4} of 4 pomodoros
        </div>
      )}
    </div>
  )
}
```

- [ ] **Step 2: Run tests — all must pass**

```bash
npm test -- PomodoroTimer
```

Expected: all existing tests pass.

- [ ] **Step 3: Commit**

```bash
git add src/features/pomodoro/PomodoroTimer.tsx
git commit -m "feat: add breathing timer animation and hover lifts to PomodoroTimer"
```

---

### Task 6: Add transition and scale to filled `SessionDots`

**Files:**
- Modify: `src/features/pomodoro/SessionDots.tsx`

CSS-only change — no new tests needed.

- [ ] **Step 1: Update `SessionDots.tsx`**

Replace `src/features/pomodoro/SessionDots.tsx`:

```tsx
interface SessionDotsProps {
  count: number
}

export function SessionDots({ count }: SessionDotsProps) {
  return (
    <div style={{ display: 'flex', gap: 6, justifyContent: 'center' }}>
      {Array.from({ length: 4 }, (_, i) => {
        const filled = i < (count % 4)
        return (
          <span
            key={i}
            data-testid="session-dot"
            style={{
              width: 10, height: 10, borderRadius: '50%',
              background: filled ? 'var(--color-warning)' : 'transparent',
              border: `1px solid var(--color-border)`,
              display: 'inline-block',
              transform: filled ? 'scale(1.1)' : 'scale(1)',
              transition: `background var(--transition-base), transform 200ms var(--ease-spring)`,
            }}
          />
        )
      })}
    </div>
  )
}
```

- [ ] **Step 2: Run tests**

```bash
npm test -- SessionDots
```

Expected: all existing tests pass.

- [ ] **Step 3: Commit**

```bash
git add src/features/pomodoro/SessionDots.tsx
git commit -m "feat: add scale transition to filled session dots"
```

---

## Chunk 5: Notifications — Toast + ToastProvider

### Task 7: Add variant prop and slide-up entrance to `Toast`

**Files:**
- Modify: `src/components/Toast.tsx`
- Modify: `src/components/__tests__/Toast.test.tsx`

- [ ] **Step 1: Replace `src/components/__tests__/Toast.test.tsx` entirely**

> **Replace the entire file** (the existing file only tests `ToastProvider` — we are reorganising so that `Toast` component tests come first, and the `ToastProvider` describe block is added back in Task 8). Include the `userEvent` import now so Task 8 can use it.

```tsx
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { Toast } from '../Toast'

test('Toast renders message', () => {
  render(<Toast message="Hello" />)
  expect(screen.getByText('Hello')).toBeInTheDocument()
})

test('Toast has slide-up animation style', () => {
  const { container } = render(<Toast message="Hello" />)
  const el = container.firstChild as HTMLElement
  expect(el.getAttribute('style')).toContain('toast-in')
})

test('Toast with success variant has green left border', () => {
  const { container } = render(<Toast message="Saved" variant="success" />)
  const el = container.firstChild as HTMLElement
  expect(el).toHaveStyle({ borderLeft: '3px solid var(--color-success)' })
})

test('Toast with error variant has red left border', () => {
  const { container } = render(<Toast message="Failed" variant="error" />)
  const el = container.firstChild as HTMLElement
  expect(el).toHaveStyle({ borderLeft: '3px solid var(--color-danger)' })
})

test('Toast with no variant has no left border override', () => {
  const { container } = render(<Toast message="Info" />)
  const el = container.firstChild as HTMLElement
  const style = el.getAttribute('style') ?? ''
  expect(style).not.toContain('border-left')
})
```

- [ ] **Step 2: Run tests to see failures**

```bash
npm test -- Toast.test
```

Expected: variant-related tests fail.

- [ ] **Step 3: Update `Toast.tsx`**

Replace `src/components/Toast.tsx`:

```tsx
interface ToastProps {
  message: string
  variant?: 'success' | 'error' | 'default'
}

export function Toast({ message, variant }: ToastProps) {
  const borderLeft =
    variant === 'success' ? '3px solid var(--color-success)'
    : variant === 'error'   ? '3px solid var(--color-danger)'
    : undefined

  return (
    <div
      role="status"
      style={{
        background: 'var(--color-surface-2)',
        color: 'var(--color-text)',
        border: '1px solid var(--color-border)',
        borderRadius: 6,
        padding: '8px 16px',
        fontSize: 14,
        boxShadow: '0 4px 16px rgba(0,0,0,0.4)',
        animation: 'toast-in 250ms var(--ease-out) both',
        ...(borderLeft ? { borderLeft } : {}),
      }}
    >
      {message}
    </div>
  )
}
```

- [ ] **Step 4: Run all Toast tests — all 5 must pass**

```bash
npm test -- Toast.test
```

Expected: 5 passing.

- [ ] **Step 5: Commit**

```bash
git add src/components/Toast.tsx src/components/__tests__/Toast.test.tsx
git commit -m "feat: add variant prop and slide-up animation to Toast"
```

---

### Task 8: Forward `variant` through `ToastProvider`

**Files:**
- Modify: `src/components/ToastProvider.tsx`
- Modify: `src/components/__tests__/Toast.test.tsx`

- [ ] **Step 1: Add variant forwarding test**

**Append** the following `describe` block to the end of `src/components/__tests__/Toast.test.tsx` (do not replace the file — just add after the last existing test):

```tsx
// Append to the end of src/components/__tests__/Toast.test.tsx
// (imports for render, screen, userEvent are already at the top of the file from Task 7)
import { ToastProvider, useToast } from '../ToastProvider'

function ShowToastButton({ variant }: { variant?: 'success' | 'error' }) {
  const { showToast } = useToast()
  return (
    <button onClick={() => showToast('Hello toast', variant)}>Show</button>
  )
}

describe('ToastProvider', () => {
  it('shows a toast message', async () => {
    render(<ToastProvider><ShowToastButton /></ToastProvider>)
    await userEvent.click(screen.getByText('Show'))
    expect(screen.getByText('Hello toast')).toBeInTheDocument()
  })

  it('passes success variant to Toast', async () => {
    render(<ToastProvider><ShowToastButton variant="success" /></ToastProvider>)
    await userEvent.click(screen.getByText('Show'))
    const toast = screen.getByRole('status')
    expect(toast).toHaveStyle({ borderLeft: '3px solid var(--color-success)' })
  })
})
```

- [ ] **Step 2: Run tests — variant forwarding test should fail**

```bash
npm test -- Toast.test
```

Expected: `passes success variant` fails (showToast doesn't accept variant yet).

- [ ] **Step 3: Update `ToastProvider.tsx`**

Replace `src/components/ToastProvider.tsx`:

```tsx
import React, { createContext, useContext, useState, useCallback, useRef, useEffect } from 'react'
import { Toast } from './Toast'

type ToastVariant = 'success' | 'error' | 'default'

interface ToastCtx {
  showToast: (message: string, variant?: ToastVariant) => void
}

const ToastContext = createContext<ToastCtx>({ showToast: () => {} })

export function useToast() {
  return useContext(ToastContext)
}

let _showGlobalToast: (msg: string, variant?: ToastVariant) => void = () => {}
export function registerGlobalToast(fn: (msg: string, variant?: ToastVariant) => void) {
  _showGlobalToast = fn
}
export function showGlobalToast(msg: string, variant?: ToastVariant) {
  _showGlobalToast(msg, variant)
}

interface ToastItem { id: number; message: string; variant?: ToastVariant }

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([])
  const nextId = useRef(0)

  const showToast = useCallback((message: string, variant?: ToastVariant) => {
    const id = nextId.current++
    setToasts(t => [...t, { id, message, variant }])
    setTimeout(() => setToasts(t => t.filter(x => x.id !== id)), 3000)
  }, [])

  useEffect(() => {
    registerGlobalToast(showToast)
  }, [showToast])

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      <div style={{
        position: 'fixed', bottom: 24, left: '50%', transform: 'translateX(-50%)',
        zIndex: 9999, display: 'flex', flexDirection: 'column', gap: 8,
      }}>
        {toasts.map(t => <Toast key={t.id} message={t.message} variant={t.variant} />)}
      </div>
    </ToastContext.Provider>
  )
}
```

- [ ] **Step 4: Run all Toast tests — all must pass**

```bash
npm test -- Toast.test
```

Expected: all passing.

- [ ] **Step 5: Run full suite**

```bash
npm test
```

Expected: all tests pass.

- [ ] **Step 6: Commit**

```bash
git add src/components/ToastProvider.tsx src/components/__tests__/Toast.test.tsx
git commit -m "feat: forward variant through ToastProvider to Toast"
```

---

## Chunk 6: Remaining Components

### Task 9: Add slide-up entrance animation to `TagEditModal`

**Files:**
- Modify: `src/features/tags/TagEditModal.tsx`

CSS animation change — existing tests must pass.

- [ ] **Step 1: Update `TagEditModal.tsx`**

In `src/features/tags/TagEditModal.tsx`, update only the two `style` objects:

**Backdrop div** (the outer `role="dialog"` div) — add `transition: 'opacity 200ms ease'`:

```tsx
style={{
  position: 'fixed', inset: 0, zIndex: 100,
  display: 'flex', alignItems: 'center', justifyContent: 'center',
  background: 'rgba(0,0,0,0.55)',
  transition: 'opacity 200ms ease',
}}
```

**Modal panel** (the inner div) — add `animation` and `boxShadow`:

```tsx
style={{
  background: 'var(--color-bg)', border: '1px solid var(--color-border)',
  borderRadius: 8, padding: 20, width: 300, display: 'flex',
  flexDirection: 'column', gap: 14,
  animation: 'modal-in 200ms var(--ease-out) both',
  boxShadow: '0 8px 32px rgba(0,0,0,0.5)',
}}
```

- [ ] **Step 2: Run TagEditModal tests — all must pass**

```bash
npm test -- TagEditModal
```

Expected: all existing tests pass.

- [ ] **Step 3: Commit**

```bash
git add src/features/tags/TagEditModal.tsx
git commit -m "feat: add slide-up entrance animation to TagEditModal"
```

---

### Task 10: Reduce `EmptyState` vertical padding

**Files:**
- Modify: `src/components/EmptyState.tsx`

- [ ] **Step 1: Write a failing test for the padding**

In `src/components/EmptyState.tsx` there is no test file yet. Check if one exists:

```bash
ls src/components/__tests__/
```

If no `EmptyState.test.tsx`, create it. Add:

```tsx
import { render } from '@testing-library/react'
import { EmptyState } from '../EmptyState'

test('EmptyState renders with 32px vertical padding', () => {
  const { container } = render(<EmptyState message="Nothing here" />)
  const el = container.firstChild as HTMLElement
  expect(el).toHaveStyle({ padding: '32px 16px' })
})
```

- [ ] **Step 2: Run test — it should fail (current padding is 48px)**

```bash
npm test -- EmptyState
```

Expected: FAIL — got `48px 16px`.

- [ ] **Step 3: Update `EmptyState.tsx`**

Replace `src/components/EmptyState.tsx`:

```tsx
export function EmptyState({ message }: { message: string }) {
  return (
    <div style={{ textAlign: 'center', padding: '32px 16px', color: 'var(--color-text-muted)', fontSize: 14 }}>
      {message}
    </div>
  )
}
```

- [ ] **Step 4: Run test — must pass**

```bash
npm test -- EmptyState
```

Expected: PASS.

- [ ] **Step 5: Run full suite — all tests must pass**

```bash
npm test
```

Expected: all tests pass.

- [ ] **Step 6: Commit**

```bash
git add src/components/EmptyState.tsx src/components/__tests__/EmptyState.test.tsx
git commit -m "feat: reduce EmptyState vertical padding to 32px for compact views"
```

---

## Final Step: Verify Everything

- [ ] **Run full test suite one last time**

```bash
npm test
```

Expected: all tests pass with zero failures.

- [ ] **Check `.gitignore` includes `.superpowers/`**

```bash
grep superpowers .gitignore || echo "NOT in gitignore — add it"
```

If missing, add `.superpowers/` to `.gitignore` and commit:

```bash
echo ".superpowers/" >> .gitignore
git add .gitignore
git commit -m "chore: ignore .superpowers/ brainstorm artifacts"
```
