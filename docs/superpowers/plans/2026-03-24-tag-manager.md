# Tag Manager Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a Tags tab where users can view all tags and, for each one, rename it, change its color (preset or custom hex), or delete it.

**Architecture:** Extend `tagStore` with `updateTag` and `deleteTag` actions that call the existing API. Extend `ColorPicker` with a hex input. Add a new `TagsTab` and `TagEditModal` under `src/features/tags/`. Wire the new tab into `TabBar` and `App`.

**Tech Stack:** React, TypeScript, Zustand (`tagStore`), Vitest + Testing Library, existing `api/tags.ts`

---

## Chunk 1: Foundation — tagStore actions + ColorPicker hex input

### Task 1: Add `updateTag` and `deleteTag` to `tagStore`

**Files:**
- Modify: `src/store/tagStore.ts`
- Test: `src/store/__tests__/tagStore.test.ts` (create)

- [ ] **Step 1: Create the test file with failing tests**

```typescript
// src/store/__tests__/tagStore.test.ts
import { act } from '@testing-library/react'
import { useTagStore } from '../tagStore'

vi.mock('../../api/tags', () => ({
  createTag: vi.fn(),
  updateTag: vi.fn(),
  deleteTag: vi.fn(),
}))

import * as tagsApi from '../../api/tags'

const TAG = { id: 'tag1', name: 'work', color: '#3b82f6' }

beforeEach(() => {
  useTagStore.setState({ tags: [TAG] })
  vi.clearAllMocks()
})

it('updateTag calls api.updateTag and upserts result', async () => {
  const updated = { ...TAG, name: 'Work Updated', color: '#ef4444' }
  vi.mocked(tagsApi.updateTag).mockResolvedValue(updated)

  await act(async () => {
    await useTagStore.getState().updateTag('tag1', { name: 'Work Updated', color: '#ef4444' })
  })

  expect(tagsApi.updateTag).toHaveBeenCalledWith('tag1', { name: 'Work Updated', color: '#ef4444' })
  expect(useTagStore.getState().tags[0]).toEqual(updated)
})

it('deleteTag calls api.deleteTag and removes tag from store', async () => {
  vi.mocked(tagsApi.deleteTag).mockResolvedValue(undefined)

  await act(async () => {
    await useTagStore.getState().deleteTag('tag1')
  })

  expect(tagsApi.deleteTag).toHaveBeenCalledWith('tag1')
  expect(useTagStore.getState().tags).toHaveLength(0)
})
```

- [ ] **Step 2: Run tests to confirm they fail**

```
npx vitest run src/store/__tests__/tagStore.test.ts
```
Expected: FAIL — `updateTag` and `deleteTag` do not exist on store yet.

- [ ] **Step 3: Add the two actions to `tagStore.ts`**

Open `src/store/tagStore.ts`. The current interface and store are:

```typescript
// Current interface (lines 6-12):
interface TagStore {
  tags: Tag[]
  setTags: (tags: Tag[]) => void
  upsertTag: (tag: Tag) => void
  removeTag: (id: string) => void
  addTag: (tag: Tag) => Promise<Tag>
}
```

Replace the interface and store with:

```typescript
import { create } from 'zustand'
import type { Tag } from '../types'
import * as api from '../api/tags'

interface TagStore {
  tags: Tag[]
  setTags: (tags: Tag[]) => void
  upsertTag: (tag: Tag) => void
  removeTag: (id: string) => void
  addTag: (tag: Tag) => Promise<Tag>
  updateTag: (id: string, patch: { name?: string; color?: string }) => Promise<Tag>
  deleteTag: (id: string) => Promise<void>
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
  updateTag: async (id, patch) => {
    const updated = await api.updateTag(id, patch)
    set(s => ({
      tags: s.tags.map(t => t.id === id ? updated : t),
    }))
    return updated
  },
  deleteTag: async (id) => {
    await api.deleteTag(id)
    set(s => ({ tags: s.tags.filter(t => t.id !== id) }))
  },
}))
```

- [ ] **Step 4: Run tests to confirm they pass**

```
npx vitest run src/store/__tests__/tagStore.test.ts
```
Expected: PASS (2 tests).

- [ ] **Step 5: Commit**

```bash
git add src/store/tagStore.ts src/store/__tests__/tagStore.test.ts
git commit -m "feat: add updateTag and deleteTag actions to tagStore"
```

---

### Task 2: Add hex input to ColorPicker

**Files:**
- Modify: `src/components/ColorPicker.tsx`
- Modify: `src/components/ColorPicker.test.tsx`

- [ ] **Step 1: Write failing tests for the hex input**

Append these tests to `src/components/ColorPicker.test.tsx`:

```typescript
test('renders hex input with current selected color', () => {
  render(<ColorPicker selected="#3b82f6" onSelect={() => {}} />)
  const input = screen.getByRole('textbox')
  expect(input).toHaveValue('#3b82f6')
})

test('typing a valid 6-digit hex calls onSelect', () => {
  const onSelect = vi.fn()
  render(<ColorPicker selected="#3b82f6" onSelect={onSelect} />)
  const input = screen.getByRole('textbox')
  fireEvent.change(input, { target: { value: '#aabbcc' } })
  expect(onSelect).toHaveBeenCalledWith('#aabbcc')
})

test('typing a valid hex without # prefix calls onSelect with # prepended', () => {
  const onSelect = vi.fn()
  render(<ColorPicker selected="#3b82f6" onSelect={onSelect} />)
  const input = screen.getByRole('textbox')
  fireEvent.change(input, { target: { value: 'aabbcc' } })
  expect(onSelect).toHaveBeenCalledWith('#aabbcc')
})

test('typing an invalid hex does not call onSelect', () => {
  const onSelect = vi.fn()
  render(<ColorPicker selected="#3b82f6" onSelect={onSelect} />)
  const input = screen.getByRole('textbox')
  fireEvent.change(input, { target: { value: '#gg0000' } })
  expect(onSelect).not.toHaveBeenCalled()
})

test('typing a partial hex (3 chars) does not call onSelect', () => {
  const onSelect = vi.fn()
  render(<ColorPicker selected="#3b82f6" onSelect={onSelect} />)
  const input = screen.getByRole('textbox')
  fireEvent.change(input, { target: { value: '#3b8' } })
  expect(onSelect).not.toHaveBeenCalled()
})

test('preset swatch has aria-pressed=true when hex matches preset', () => {
  render(<ColorPicker selected="#ef4444" onSelect={() => {}} />)
  const buttons = screen.getAllByRole('button')
  // #ef4444 is the 2nd preset color
  expect(buttons[1]).toHaveAttribute('aria-pressed', 'true')
})
```

- [ ] **Step 2: Run new tests to confirm they fail**

```
npx vitest run src/components/ColorPicker.test.tsx
```
Expected: new tests FAIL — no `textbox` found.

- [ ] **Step 3: Update ColorPicker to add hex input**

Replace `src/components/ColorPicker.tsx` with:

```typescript
import { useState, useEffect } from 'react'

const PRESET_COLORS = [
  '#3b82f6','#ef4444','#10b981','#f59e0b','#8b5cf6',
  '#ec4899','#06b6d4','#84cc16','#f97316','#6366f1','#14b8a6','#e11d48',
]

const HEX_RE = /^#?([0-9a-fA-F]{6})$/

function normalizeHex(raw: string): string | null {
  const m = raw.match(HEX_RE)
  return m ? `#${m[1].toLowerCase()}` : null
}

interface ColorPickerProps {
  selected: string
  onSelect: (color: string) => void
}

export function ColorPicker({ selected, onSelect }: ColorPickerProps) {
  const [hex, setHex] = useState(selected)

  useEffect(() => { setHex(selected) }, [selected])

  function handleHexChange(raw: string) {
    setHex(raw)
    const normalized = normalizeHex(raw)
    if (normalized) onSelect(normalized)
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8, padding: 8 }}>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
        {PRESET_COLORS.map(color => (
          <button
            key={color}
            type="button"
            aria-label={`Color ${color}`}
            aria-pressed={selected === color}
            onClick={() => onSelect(color)}
            style={{
              width: 24, height: 24, borderRadius: '50%', border: 'none',
              background: color, cursor: 'pointer',
              outline: selected === color ? '2px solid white' : 'none',
              boxShadow: selected === color ? `0 0 0 3px ${color}` : 'none',
            }}
          />
        ))}
      </div>
      <input
        type="text"
        aria-label="Custom hex color"
        value={hex}
        onChange={e => handleHexChange(e.target.value)}
        placeholder="#000000"
        style={{
          background: 'var(--color-surface)', border: '1px solid var(--color-border)',
          borderRadius: 4, color: 'var(--color-text)', fontSize: 12,
          padding: '4px 6px', outline: 'none', width: '100%', boxSizing: 'border-box',
        }}
      />
    </div>
  )
}
```

- [ ] **Step 4: Run all ColorPicker tests**

```
npx vitest run src/components/ColorPicker.test.tsx
```
Expected: all 9 tests PASS. Note: the existing `renders 12 color swatches` test uses `getAllByRole('button')` which only selects `<button>` elements — the new `<input type="text">` is not a button so that count remains 12.

- [ ] **Step 5: Commit**

```bash
git add src/components/ColorPicker.tsx src/components/ColorPicker.test.tsx
git commit -m "feat: add hex color input to ColorPicker"
```

---

## Chunk 2: UI — TagEditModal + TagsTab + wiring

### Task 3: Build TagEditModal

**Files:**
- Create: `src/features/tags/TagEditModal.tsx`
- Create: `src/features/tags/TagEditModal.test.tsx`

- [ ] **Step 1: Write the failing tests**

```typescript
// src/features/tags/TagEditModal.test.tsx
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { TagEditModal } from './TagEditModal'
import { useTagStore } from '../../store/tagStore'
import { ToastProvider } from '../../components/ToastProvider'
import type { Tag } from '../../types'

vi.mock('../../store/tagStore')

const TAG: Tag = { id: 't1', name: 'work', color: '#3b82f6' }

function renderModal(onClose = vi.fn()) {
  return render(
    <ToastProvider>
      <TagEditModal tag={TAG} onClose={onClose} />
    </ToastProvider>
  )
}

beforeEach(() => {
  vi.mocked(useTagStore).mockReturnValue({
    updateTag: vi.fn().mockResolvedValue({ ...TAG }),
    deleteTag: vi.fn().mockResolvedValue(undefined),
  } as any)
})

test('pre-fills name input with tag name', () => {
  renderModal()
  expect(screen.getByRole('textbox', { name: /tag name/i })).toHaveValue('work')
})

test('Save button is disabled when name is empty', () => {
  renderModal()
  const input = screen.getByRole('textbox', { name: /tag name/i })
  fireEvent.change(input, { target: { value: '   ' } })
  expect(screen.getByRole('button', { name: /save/i })).toBeDisabled()
})

test('Save calls updateTag with trimmed name and color then closes', async () => {
  const onClose = vi.fn()
  renderModal(onClose)
  const input = screen.getByRole('textbox', { name: /tag name/i })
  fireEvent.change(input, { target: { value: 'renamed' } })
  fireEvent.click(screen.getByRole('button', { name: /save/i }))
  await waitFor(() => {
    expect(vi.mocked(useTagStore).mock.results[0].value.updateTag)
      .toHaveBeenCalledWith('t1', { name: 'renamed', color: '#3b82f6' })
    expect(onClose).toHaveBeenCalled()
  })
})

test('Cancel closes without calling updateTag', () => {
  const onClose = vi.fn()
  renderModal(onClose)
  fireEvent.click(screen.getByRole('button', { name: /cancel/i }))
  expect(vi.mocked(useTagStore).mock.results[0].value.updateTag).not.toHaveBeenCalled()
  expect(onClose).toHaveBeenCalled()
})

test('Delete button reveals confirmation', () => {
  renderModal()
  fireEvent.click(screen.getByRole('button', { name: /^delete$/i }))
  expect(screen.getByRole('button', { name: /confirm delete/i })).toBeInTheDocument()
})

test('Confirm delete calls deleteTag and closes', async () => {
  const onClose = vi.fn()
  renderModal(onClose)
  fireEvent.click(screen.getByRole('button', { name: /^delete$/i }))
  fireEvent.click(screen.getByRole('button', { name: /confirm delete/i }))
  await waitFor(() => {
    expect(vi.mocked(useTagStore).mock.results[0].value.deleteTag)
      .toHaveBeenCalledWith('t1')
    expect(onClose).toHaveBeenCalled()
  })
})

test('API error on Save shows toast and keeps modal open', async () => {
  vi.mocked(useTagStore).mockReturnValue({
    updateTag: vi.fn().mockRejectedValue(new Error('Network error')),
    deleteTag: vi.fn(),
  } as any)
  const onClose = vi.fn()
  renderModal(onClose)
  fireEvent.click(screen.getByRole('button', { name: /save/i }))
  await waitFor(() => {
    expect(screen.getByText(/failed to save/i)).toBeInTheDocument()
    expect(onClose).not.toHaveBeenCalled()
  })
})
```

- [ ] **Step 2: Run tests to confirm they fail**

```
npx vitest run src/features/tags/TagEditModal.test.tsx
```
Expected: FAIL — module not found.

- [ ] **Step 3: Implement TagEditModal**

```typescript
// src/features/tags/TagEditModal.tsx
import { useState } from 'react'
import { ColorPicker } from '../../components/ColorPicker'
import { useTagStore } from '../../store/tagStore'
import { useToast } from '../../components/ToastProvider'
import type { Tag } from '../../types'

interface TagEditModalProps {
  tag: Tag
  onClose: () => void
}

export function TagEditModal({ tag, onClose }: TagEditModalProps) {
  const [name, setName] = useState(tag.name)
  const [color, setColor] = useState(tag.color)
  const [confirming, setConfirming] = useState(false)
  const [saving, setSaving] = useState(false)
  const { updateTag, deleteTag } = useTagStore()
  const { showToast } = useToast()

  async function handleSave() {
    if (!name.trim()) return
    setSaving(true)
    try {
      await updateTag(tag.id, { name: name.trim(), color })
      onClose()
    } catch {
      showToast('Failed to save tag. Please try again.')
    } finally {
      setSaving(false)
    }
  }

  async function handleConfirmDelete() {
    setSaving(true)
    try {
      await deleteTag(tag.id)
      onClose()
    } catch {
      showToast('Failed to delete tag. Please try again.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Edit tag"
      style={{
        position: 'fixed', inset: 0, zIndex: 100,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        background: 'rgba(0,0,0,0.5)',
      }}
      onClick={e => { if (e.target === e.currentTarget) onClose() }}
    >
      <div style={{
        background: 'var(--color-bg)', border: '1px solid var(--color-border)',
        borderRadius: 8, padding: 20, width: 300, display: 'flex',
        flexDirection: 'column', gap: 14,
      }}>
        <div style={{ fontWeight: 600, fontSize: 15 }}>Edit Tag</div>

        <div>
          <label
            htmlFor="tag-name-input"
            style={{ fontSize: 11, color: 'var(--color-text-muted)',
              textTransform: 'uppercase', display: 'block', marginBottom: 4 }}
          >
            Tag Name
          </label>
          <input
            id="tag-name-input"
            aria-label="Tag name"
            value={name}
            onChange={e => setName(e.target.value)}
            style={{
              width: '100%', boxSizing: 'border-box',
              background: 'var(--color-surface)', border: '1px solid var(--color-border)',
              borderRadius: 6, color: 'var(--color-text)', padding: '6px 8px',
              fontSize: 13, outline: 'none',
            }}
          />
        </div>

        <div>
          <div style={{ fontSize: 11, color: 'var(--color-text-muted)',
            textTransform: 'uppercase', marginBottom: 4 }}>
            Color
          </div>
          <ColorPicker selected={color} onSelect={setColor} />
        </div>

        <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
          <button
            type="button"
            onClick={onClose}
            style={{
              background: 'none', border: '1px solid var(--color-border)',
              borderRadius: 6, color: 'var(--color-text)', padding: '6px 14px',
              fontSize: 13, cursor: 'pointer',
            }}
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={!name.trim() || saving}
            style={{
              background: 'var(--color-accent)', border: 'none',
              borderRadius: 6, color: '#fff', padding: '6px 14px',
              fontSize: 13, cursor: 'pointer', opacity: !name.trim() || saving ? 0.5 : 1,
            }}
          >
            Save
          </button>
        </div>

        <div style={{ borderTop: '1px solid var(--color-border)', paddingTop: 10 }}>
          {!confirming ? (
            <button
              type="button"
              onClick={() => setConfirming(true)}
              style={{
                background: 'none', border: 'none', color: 'var(--color-danger, #ef4444)',
                fontSize: 13, cursor: 'pointer', padding: 0,
              }}
            >
              Delete
            </button>
          ) : (
            <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
              <span style={{ fontSize: 12, color: 'var(--color-text-muted)' }}>
                Delete this tag?
              </span>
              <button
                type="button"
                onClick={handleConfirmDelete}
                disabled={saving}
                style={{
                  background: 'var(--color-danger, #ef4444)', border: 'none',
                  borderRadius: 6, color: '#fff', padding: '4px 10px',
                  fontSize: 12, cursor: 'pointer',
                }}
              >
                Confirm delete
              </button>
              <button
                type="button"
                onClick={() => setConfirming(false)}
                style={{
                  background: 'none', border: 'none', color: 'var(--color-text-muted)',
                  fontSize: 12, cursor: 'pointer', padding: 0,
                }}
              >
                Cancel
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
```

- [ ] **Step 4: Run tests to confirm they pass**

```
npx vitest run src/features/tags/TagEditModal.test.tsx
```
Expected: all 7 tests PASS.

- [ ] **Step 5: Commit**

```bash
git add src/features/tags/TagEditModal.tsx src/features/tags/TagEditModal.test.tsx
git commit -m "feat: add TagEditModal with rename, color, and delete"
```

---

### Task 4: Build TagsTab

**Files:**
- Create: `src/features/tags/TagsTab.tsx`
- Create: `src/features/tags/TagsTab.test.tsx`

- [ ] **Step 1: Write the failing tests**

```typescript
// src/features/tags/TagsTab.test.tsx
import { render, screen, fireEvent } from '@testing-library/react'
import { TagsTab } from './TagsTab'
import { useTagStore } from '../../store/tagStore'
import { ToastProvider } from '../../components/ToastProvider'
import type { Tag } from '../../types'

vi.mock('../../store/tagStore')

const TAGS: Tag[] = [
  { id: 't1', name: 'work', color: '#3b82f6' },
  { id: 't2', name: 'urgent', color: '#ef4444' },
]

beforeEach(() => {
  vi.mocked(useTagStore).mockReturnValue({
    tags: TAGS,
    updateTag: vi.fn().mockResolvedValue(TAGS[0]),
    deleteTag: vi.fn().mockResolvedValue(undefined),
  } as any)
})

function renderTab() {
  return render(<ToastProvider><TagsTab /></ToastProvider>)
}

test('renders all tag names', () => {
  renderTab()
  expect(screen.getByText('work')).toBeInTheDocument()
  expect(screen.getByText('urgent')).toBeInTheDocument()
})

test('renders color swatch for each tag', () => {
  renderTab()
  expect(screen.getAllByTestId('tag-color-swatch')).toHaveLength(2)
})

test('clicking Edit button opens TagEditModal', () => {
  renderTab()
  const editButtons = screen.getAllByRole('button', { name: /edit/i })
  fireEvent.click(editButtons[0])
  expect(screen.getByRole('dialog', { name: /edit tag/i })).toBeInTheDocument()
})

test('shows empty state when no tags', () => {
  vi.mocked(useTagStore).mockReturnValue({ tags: [], updateTag: vi.fn(), deleteTag: vi.fn() } as any)
  renderTab()
  expect(screen.getByText(/no tags yet/i)).toBeInTheDocument()
})
```

- [ ] **Step 2: Run tests to confirm they fail**

```
npx vitest run src/features/tags/TagsTab.test.tsx
```
Expected: FAIL — module not found.

- [ ] **Step 3: Implement TagsTab**

```typescript
// src/features/tags/TagsTab.tsx
import { useState } from 'react'
import { useTagStore } from '../../store/tagStore'
import { TagEditModal } from './TagEditModal'
import type { Tag } from '../../types'

export function TagsTab() {
  const { tags } = useTagStore()
  const [editing, setEditing] = useState<Tag | null>(null)

  return (
    <div style={{ padding: 24, maxWidth: 600, margin: '0 auto' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between',
        alignItems: 'center', marginBottom: 16 }}>
        <h2 style={{ fontSize: 18, fontWeight: 600, margin: 0 }}>Tags</h2>
      </div>

      {tags.length === 0 ? (
        <p style={{ color: 'var(--color-text-muted)', fontSize: 14 }}>
          No tags yet. Create tags from the task detail panel.
        </p>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          {tags.map(tag => (
            <div
              key={tag.id}
              style={{
                display: 'flex', alignItems: 'center', gap: 10,
                background: 'var(--color-surface)', borderRadius: 6,
                padding: '8px 12px', border: '1px solid var(--color-border)',
              }}
            >
              <span
                data-testid="tag-color-swatch"
                aria-hidden="true"
                style={{
                  width: 14, height: 14, borderRadius: '50%',
                  background: tag.color, flexShrink: 0,
                }}
              />
              <span style={{ flex: 1, fontSize: 14 }}>{tag.name}</span>
              <button
                type="button"
                aria-label={`Edit ${tag.name}`}
                onClick={() => setEditing(tag)}
                style={{
                  background: 'none', border: '1px solid var(--color-border)',
                  borderRadius: 4, color: 'var(--color-text-muted)',
                  cursor: 'pointer', fontSize: 12, padding: '3px 10px',
                }}
              >
                Edit
              </button>
            </div>
          ))}
        </div>
      )}

      {editing && (
        <TagEditModal tag={editing} onClose={() => setEditing(null)} />
      )}
    </div>
  )
}
```

- [ ] **Step 4: Run tests to confirm they pass**

```
npx vitest run src/features/tags/TagsTab.test.tsx
```
Expected: all 4 tests PASS.

- [ ] **Step 5: Commit**

```bash
git add src/features/tags/TagsTab.tsx src/features/tags/TagsTab.test.tsx
git commit -m "feat: add TagsTab listing all tags with edit capability"
```

---

### Task 5: Wire Tags tab into TabBar and App

**Files:**
- Modify: `src/components/TabBar.tsx`
- Modify: `src/App.tsx`

- [ ] **Step 1: Update TabBar**

In `src/components/TabBar.tsx`:

1. Change the `Tab` type on line 1:
```typescript
type Tab = 'home' | 'tasks' | 'schedule' | 'notes' | 'stats' | 'tags'
```

2. Add `{ id: 'tags', label: 'Tags' }` to the TABS array (after `stats`):
```typescript
const TABS: { id: Tab; label: string }[] = [
  { id: 'home', label: 'Home' },
  { id: 'tasks', label: 'Tasks' },
  { id: 'schedule', label: 'Schedule' },
  { id: 'notes', label: 'Notes' },
  { id: 'stats', label: 'Stats' },
  { id: 'tags', label: 'Tags' },
]
```

- [ ] **Step 2: Update App.tsx**

In `src/App.tsx`:

1. Add the import after the `StatsTab` import:
```typescript
import { TagsTab } from './features/tags/TagsTab'
```

2. Add the tab render after `{tab === 'stats' && <StatsTab />}`:
```typescript
{tab === 'tags' && <TagsTab />}
```

- [ ] **Step 3: Run full test suite**

```
npx vitest run
```
Expected: all tests PASS. No regressions.

- [ ] **Step 4: Commit**

```bash
git add src/components/TabBar.tsx src/App.tsx
git commit -m "feat: wire Tags tab into TabBar and App"
```
