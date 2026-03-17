# Time Manager App Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a local-first personal time management web app with tasks, notes, weekly schedule, and per-task Pomodoro timer — all stored in IndexedDB.

**Architecture:** React 18 + TypeScript + Vite frontend. All state in Zustand stores that read/write through a repository layer to Dexie.js (IndexedDB). No backend. Features are co-located under `src/features/`, shared utilities under `src/lib/`, shared components under `src/components/`.

**Tech Stack:** React 18, TypeScript, Vite, Zustand, Dexie.js 4, TipTap 2, dnd-kit, date-fns, Vitest, React Testing Library, fake-indexeddb

---

## File Map

```
src/
  types/index.ts                        # All TS interfaces (Task, Tag, Note, PomodoroSession, PomodoroStats)
  db/
    db.ts                               # Dexie class + singleton export
    repositories/
      TaskRepository.ts                 # Task CRUD + cascade delete + order reindex
      TagRepository.ts                  # Tag CRUD + cascade (removes tagId from tasks/notes)
      NoteRepository.ts                 # Note CRUD + reverse lookup by linkedTaskId
      PomodoroRepository.ts             # Session CRUD + stats upsert + stale recovery
  store/
    taskStore.ts                        # Zustand: tasks list + optimistic updates
    tagStore.ts                         # Zustand: tags list
    noteStore.ts                        # Zustand: notes list + active note id
    pomodoroStore.ts                    # Zustand: activeSession + workSessionCount + countdown
  lib/
    orderUtils.ts                       # Float order math: getOrderBetween, needsReindex, reindex
    dateUtils.ts                        # date-fns wrappers: weekDays, formatISODay, isToday
    audioUtils.ts                       # AudioContext beep for timer completion
    exportUtils.ts                      # JSON backup export
  components/
    Toast.tsx                           # Single toast UI
    ToastProvider.tsx                   # Toast context + useToast hook
    EmptyState.tsx                      # Reusable empty state
    TabBar.tsx                          # Tab navigation (Home/Tasks/Schedule/Notes)
    RecoveryScreen.tsx                  # Shown when Dexie fails to open
  features/
    tags/components/
      TagBadge.tsx                      # Colored chip with × in edit mode
      TagInput.tsx                      # Autocomplete input to add/create/delete tags
      ColorPicker.tsx                   # 12-color popover
    tasks/
      components/
        AddTaskInput.tsx                # "Add task…" input bar
        TaskItem.tsx                    # Single task row (handle, checkbox, title, tags, 🍅)
        SubtaskItem.tsx                 # Single subtask row
        SubtaskList.tsx                 # Sortable group of subtasks for one parent
        TaskList.tsx                    # DndContext + top-level sortable list
        TagFilter.tsx                   # Tag filter chips bar
        TaskDetailPanel.tsx             # Slide-in panel: title, desc, subtasks, tags, day, stats, history
      TasksTab.tsx                      # Tasks tab root
    schedule/
      components/
        WeekNavigation.tsx              # Prev/next arrows + week label
        ScheduleTaskCard.tsx            # Task card in kanban (title, tags, × button)
        DayColumn.tsx                   # One droppable day column
        UnscheduledPanel.tsx            # Collapsible sidebar of unscheduled tasks
        WeekKanban.tsx                  # Full 7-day kanban with drag context
      ScheduleTab.tsx                   # Schedule tab root
    notes/
      extensions/TaskMentionExtension.ts  # TipTap @ extension: trigger, NodeView, linkedTaskIds
      components/
        TaskChip.tsx                    # TipTap NodeView rendered chip (title + badge / tombstone)
        TaskPicker.tsx                  # Floating picker for @ mentions
        NoteList.tsx                    # Left sidebar note list + New button
        NoteEditor.tsx                  # Title <input> + TipTap editor
        LinkedTasksPanel.tsx            # Below-editor linked tasks list
      NotesTab.tsx                      # Notes tab root
    pomodoro/
      hooks/
        usePomodoro.ts                  # Timer logic, session writes, stats upsert
        useMultiTabSync.ts              # localStorage broadcast + storage event listener
      components/
        SessionDots.tsx                 # 4-dot work session progress indicator
        PomodoroStats.tsx               # Stats summary card
        SessionHistory.tsx              # Timeline of PomodoroSession rows
        PomodoroTimer.tsx               # Full timer UI: countdown + controls + dots
    home/HomeTab.tsx                    # Active timer + today's task list
  App.tsx                               # Tab router
  main.tsx                              # ReactDOM entry + Dexie init guard
  index.css                             # CSS variables, reset, base styles
  test/setup.ts                         # Vitest + RTL + fake-indexeddb setup
```

---

## Chunk 1: Foundation

### Task 1: Scaffold project + install dependencies

**Files:**
- Create: `vite.config.ts`
- Create: `src/test/setup.ts`
- Create: `package.json` (modified by npm commands)

- [ ] **Step 1: Scaffold Vite project**

```bash
cd E:/codigos/spec_super_todo_front
npm create vite@latest . -- --template react-ts
```

Expected: project files created (`src/App.tsx`, `src/main.tsx`, `index.html`, `vite.config.ts`, `tsconfig.json`)

- [ ] **Step 2: Install runtime dependencies**

```bash
npm install dexie zustand @tiptap/react @tiptap/pm @tiptap/starter-kit @tiptap/extension-placeholder @dnd-kit/core @dnd-kit/sortable @dnd-kit/utilities date-fns nanoid
```

- [ ] **Step 3: Install dev dependencies**

```bash
npm install --save-dev vitest @vitest/ui @testing-library/react @testing-library/jest-dom @testing-library/user-event jsdom fake-indexeddb
```

- [ ] **Step 4: Configure Vitest in vite.config.ts**

Replace the entire file:

```typescript
// vite.config.ts
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: './src/test/setup.ts',
  },
})
```

- [ ] **Step 5: Create test setup file**

```typescript
// src/test/setup.ts
import '@testing-library/jest-dom'
import 'fake-indexeddb/auto'
```

- [ ] **Step 6: Add test script to package.json**

In `package.json`, ensure the `scripts` section includes:
```json
"test": "vitest run",
"test:watch": "vitest",
"test:ui": "vitest --ui"
```

- [ ] **Step 7: Verify setup compiles**

```bash
npm run build
```

Expected: build succeeds with no TypeScript errors.

- [ ] **Step 8: Commit**

```bash
git init
git add .
git commit -m "chore: scaffold Vite React TS project with Vitest"
```

---

### Task 2: TypeScript types

**Files:**
- Create: `src/types/index.ts`
- Create: `src/types/__tests__/types.test.ts`

- [ ] **Step 1: Write type validation test**

```typescript
// src/types/__tests__/types.test.ts
import type { Task, Tag, Note, PomodoroSession, PomodoroStats } from '../index'

describe('types', () => {
  it('Task has required fields', () => {
    const task: Task = {
      id: '1',
      title: 'Test',
      completed: false,
      order: 1000,
      tagIds: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }
    expect(task.id).toBe('1')
    expect(task.parentId).toBeUndefined()
    expect(task.scheduledDay).toBeUndefined()
  })

  it('PomodoroSession completedAt is string | null (never undefined)', () => {
    const session: PomodoroSession = {
      id: '1',
      startedAt: new Date().toISOString(),
      completedAt: null,
      type: 'work',
      durationMinutes: 25,
    }
    expect(session.completedAt).toBeNull()
  })

  it('PomodoroStats has all counter fields', () => {
    const stats: PomodoroStats = {
      taskId: '1',
      totalStarted: 0,
      totalCompleted: 0,
      totalInterrupted: 0,
      totalMinutesFocused: 0,
      lastSessionAt: null,
      updatedAt: new Date().toISOString(),
    }
    expect(stats.totalStarted).toBe(0)
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

```bash
npm test -- src/types/__tests__/types.test.ts
```

Expected: FAIL — `Cannot find module '../index'`

- [ ] **Step 3: Create types**

```typescript
// src/types/index.ts
export interface Task {
  id: string
  title: string
  description?: string
  completed: boolean
  parentId?: string
  order: number
  tagIds: string[]
  scheduledDay?: string       // ISO date YYYY-MM-DD
  createdAt: string
  updatedAt: string
}

export interface Tag {
  id: string
  name: string
  color: string               // hex e.g. "#3b82f6"
}

export interface Note {
  id: string
  title: string               // plain text; defaults to "Untitled"
  content: string             // TipTap JSON serialized
  tagIds: string[]
  linkedTaskIds: string[]     // re-derived from NodeViews on each save
  createdAt: string
  updatedAt: string
}

export interface PomodoroSession {
  id: string
  taskId?: string             // always set for work sessions; may be undefined for orphaned break sessions
  startedAt: string
  completedAt: string | null  // null = interrupted/abandoned; never undefined
  type: 'work' | 'short_break' | 'long_break'
  durationMinutes: number
}

export interface PomodoroStats {
  taskId: string
  totalStarted: number
  totalCompleted: number
  totalInterrupted: number
  totalMinutesFocused: number
  lastSessionAt: string | null
  updatedAt: string
}

export type SessionType = PomodoroSession['type']
```

- [ ] **Step 4: Run test to verify it passes**

```bash
npm test -- src/types/__tests__/types.test.ts
```

Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/types/
git commit -m "feat: define TypeScript data model interfaces"
```

---

### Task 3: Dexie database

**Files:**
- Create: `src/db/db.ts`
- Create: `src/db/__tests__/db.test.ts`

- [ ] **Step 1: Write DB test**

```typescript
// src/db/__tests__/db.test.ts
import { db } from '../db'

describe('TimeManagerDB', () => {
  beforeEach(async () => {
    await db.tasks.clear()
    await db.tags.clear()
    await db.notes.clear()
    await db.pomodoroSessions.clear()
    await db.pomodoroStats.clear()
  })

  it('can write and read a task', async () => {
    await db.tasks.add({
      id: 't1', title: 'Hello', completed: false, order: 1000,
      tagIds: [], createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(),
    })
    const task = await db.tasks.get('t1')
    expect(task?.title).toBe('Hello')
  })

  it('can write and read a note with linkedTaskIds index', async () => {
    await db.notes.add({
      id: 'n1', title: 'Note', content: '{}', tagIds: [],
      linkedTaskIds: ['t1', 't2'],
      createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(),
    })
    const notes = await db.notes.where('linkedTaskIds').equals('t1').toArray()
    expect(notes).toHaveLength(1)
    expect(notes[0].id).toBe('n1')
  })

  it('can write and read pomodoroStats', async () => {
    await db.pomodoroStats.put({
      taskId: 't1', totalStarted: 1, totalCompleted: 0,
      totalInterrupted: 1, totalMinutesFocused: 0,
      lastSessionAt: null, updatedAt: new Date().toISOString(),
    })
    const stats = await db.pomodoroStats.get('t1')
    expect(stats?.totalStarted).toBe(1)
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

```bash
npm test -- src/db/__tests__/db.test.ts
```

Expected: FAIL — `Cannot find module '../db'`

- [ ] **Step 3: Create Dexie database**

```typescript
// src/db/db.ts
import Dexie, { type EntityTable } from 'dexie'
import type { Task, Tag, Note, PomodoroSession, PomodoroStats } from '../types'

export class TimeManagerDB extends Dexie {
  tasks!: EntityTable<Task, 'id'>
  tags!: EntityTable<Tag, 'id'>
  notes!: EntityTable<Note, 'id'>
  pomodoroSessions!: EntityTable<PomodoroSession, 'id'>
  pomodoroStats!: EntityTable<PomodoroStats, 'taskId'>

  constructor() {
    super('TimeManagerDB')
    this.version(1).stores({
      // indexed fields only — Dexie stores all object fields regardless
      tasks: 'id, parentId, scheduledDay, order, *tagIds',
      tags: 'id',
      notes: 'id, *linkedTaskIds',
      pomodoroSessions: 'id, taskId, startedAt, completedAt',
      pomodoroStats: 'taskId',
    })
  }
}

export const db = new TimeManagerDB()
```

- [ ] **Step 4: Run test to verify it passes**

```bash
npm test -- src/db/__tests__/db.test.ts
```

Expected: PASS (3 passing)

- [ ] **Step 5: Commit**

```bash
git add src/db/db.ts src/db/__tests__/
git commit -m "feat: create Dexie IndexedDB schema"
```

---

### Task 4: TaskRepository

**Files:**
- Create: `src/db/repositories/TaskRepository.ts`
- Create: `src/db/repositories/__tests__/TaskRepository.test.ts`

- [ ] **Step 1: Write failing tests**

```typescript
// src/db/repositories/__tests__/TaskRepository.test.ts
import { db } from '../../db'
import { TaskRepository } from '../TaskRepository'

const repo = new TaskRepository(db)

beforeEach(async () => {
  await db.tasks.clear()
  await db.pomodoroSessions.clear()
  await db.pomodoroStats.clear()
})

describe('TaskRepository.create', () => {
  it('creates a task with generated id and timestamps', async () => {
    const task = await repo.create({ title: 'Buy milk', completed: false, order: 1000, tagIds: [] })
    expect(task.id).toBeTruthy()
    expect(task.title).toBe('Buy milk')
    expect(task.createdAt).toBeTruthy()
    const found = await db.tasks.get(task.id)
    expect(found).toBeTruthy()
  })
})

describe('TaskRepository.update', () => {
  it('updates task fields and bumps updatedAt', async () => {
    const task = await repo.create({ title: 'Old', completed: false, order: 1000, tagIds: [] })
    await new Promise(r => setTimeout(r, 5)) // ensure timestamp differs
    await repo.update(task.id, { title: 'New' })
    const updated = await db.tasks.get(task.id)
    expect(updated?.title).toBe('New')
    expect(updated?.updatedAt).not.toBe(task.updatedAt)
  })
})

describe('TaskRepository.delete', () => {
  it('deletes task and cascades to pomodoroSessions and pomodoroStats', async () => {
    const task = await repo.create({ title: 'T', completed: false, order: 1000, tagIds: [] })
    await db.pomodoroSessions.add({
      id: 's1', taskId: task.id, startedAt: new Date().toISOString(),
      completedAt: null, type: 'work', durationMinutes: 25,
    })
    await db.pomodoroStats.put({
      taskId: task.id, totalStarted: 1, totalCompleted: 0,
      totalInterrupted: 1, totalMinutesFocused: 0,
      lastSessionAt: null, updatedAt: new Date().toISOString(),
    })
    await repo.delete(task.id)
    expect(await db.tasks.get(task.id)).toBeUndefined()
    expect(await db.pomodoroSessions.get('s1')).toBeUndefined()
    expect(await db.pomodoroStats.get(task.id)).toBeUndefined()
  })
})

describe('TaskRepository.reorderGroup', () => {
  it('assigns sequential order values to a group of task ids', async () => {
    const t1 = await repo.create({ title: 'A', completed: false, order: 1000, tagIds: [] })
    const t2 = await repo.create({ title: 'B', completed: false, order: 2000, tagIds: [] })
    await repo.reorderGroup(undefined, [t2.id, t1.id]) // reverse order
    const a = await db.tasks.get(t1.id)
    const b = await db.tasks.get(t2.id)
    expect(b!.order).toBeLessThan(a!.order)
  })
})
```

- [ ] **Step 2: Run to verify failure**

```bash
npm test -- src/db/repositories/__tests__/TaskRepository.test.ts
```

Expected: FAIL — `Cannot find module '../TaskRepository'`

- [ ] **Step 3: Implement TaskRepository**

```typescript
// src/db/repositories/TaskRepository.ts
import { nanoid } from 'nanoid'
import type { TimeManagerDB } from '../db'
import type { Task } from '../../types'

type CreateInput = Omit<Task, 'id' | 'createdAt' | 'updatedAt'>

export class TaskRepository {
  constructor(private db: TimeManagerDB) {}

  async create(input: CreateInput): Promise<Task> {
    const now = new Date().toISOString()
    const task: Task = { ...input, id: nanoid(), createdAt: now, updatedAt: now }
    await this.db.tasks.add(task)
    return task
  }

  async update(id: string, changes: Partial<Omit<Task, 'id' | 'createdAt'>>): Promise<void> {
    await this.db.tasks.update(id, { ...changes, updatedAt: new Date().toISOString() })
  }

  async delete(id: string): Promise<void> {
    await this.db.transaction('rw', [this.db.tasks, this.db.pomodoroSessions, this.db.pomodoroStats], async () => {
      await this.db.tasks.delete(id)
      const sessionIds = await this.db.pomodoroSessions.where('taskId').equals(id).primaryKeys()
      await this.db.pomodoroSessions.bulkDelete(sessionIds as string[])
      await this.db.pomodoroStats.delete(id)
    })
  }

  async getAll(): Promise<Task[]> {
    return this.db.tasks.toArray()
  }

  async getById(id: string): Promise<Task | undefined> {
    return this.db.tasks.get(id)
  }

  /**
   * Reorder tasks within a group (parentId or null = top-level).
   * orderedIds is the full desired order for that group.
   * Assigns order values 1000, 2000, 3000… to avoid float collision.
   */
  async reorderGroup(parentId: string | undefined, orderedIds: string[]): Promise<void> {
    await this.db.transaction('rw', this.db.tasks, async () => {
      for (let i = 0; i < orderedIds.length; i++) {
        await this.db.tasks.update(orderedIds[i], {
          order: (i + 1) * 1000,
          updatedAt: new Date().toISOString(),
        })
      }
    })
  }
}
```

- [ ] **Step 4: Run test to verify it passes**

```bash
npm test -- src/db/repositories/__tests__/TaskRepository.test.ts
```

Expected: PASS (4 passing)

- [ ] **Step 5: Commit**

```bash
git add src/db/repositories/TaskRepository.ts src/db/repositories/__tests__/TaskRepository.test.ts
git commit -m "feat: add TaskRepository with cascade delete and reorder"
```

---

### Task 5: TagRepository

**Files:**
- Create: `src/db/repositories/TagRepository.ts`
- Create: `src/db/repositories/__tests__/TagRepository.test.ts`

- [ ] **Step 1: Write failing tests**

```typescript
// src/db/repositories/__tests__/TagRepository.test.ts
import { db } from '../../db'
import { TagRepository } from '../TagRepository'

const repo = new TagRepository(db)

beforeEach(async () => {
  await db.tags.clear()
  await db.tasks.clear()
  await db.notes.clear()
})

describe('TagRepository.create', () => {
  it('creates a tag with id', async () => {
    const tag = await repo.create({ name: 'work', color: '#3b82f6' })
    expect(tag.id).toBeTruthy()
    expect(tag.name).toBe('work')
  })
})

describe('TagRepository.delete cascade', () => {
  it('removes tagId from all tasks and notes in same transaction', async () => {
    const tag = await repo.create({ name: 'work', color: '#3b82f6' })
    await db.tasks.add({
      id: 't1', title: 'T', completed: false, order: 1000, tagIds: [tag.id],
      createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(),
    })
    await db.notes.add({
      id: 'n1', title: 'N', content: '{}', tagIds: [tag.id], linkedTaskIds: [],
      createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(),
    })
    await repo.delete(tag.id)
    expect(await db.tags.get(tag.id)).toBeUndefined()
    const task = await db.tasks.get('t1')
    expect(task?.tagIds).not.toContain(tag.id)
    const note = await db.notes.get('n1')
    expect(note?.tagIds).not.toContain(tag.id)
  })
})

describe('TagRepository.update', () => {
  it('renames a tag in-place without affecting task/note tagIds', async () => {
    const tag = await repo.create({ name: 'old', color: '#000' })
    await db.tasks.add({
      id: 't1', title: 'T', completed: false, order: 1000, tagIds: [tag.id],
      createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(),
    })
    await repo.update(tag.id, { name: 'new' })
    const updated = await db.tags.get(tag.id)
    expect(updated?.name).toBe('new')
    // tagIds in task unchanged — still references same id
    const task = await db.tasks.get('t1')
    expect(task?.tagIds).toContain(tag.id)
  })
})
```

- [ ] **Step 2: Run to verify failure**

```bash
npm test -- src/db/repositories/__tests__/TagRepository.test.ts
```

- [ ] **Step 3: Implement TagRepository**

```typescript
// src/db/repositories/TagRepository.ts
import { nanoid } from 'nanoid'
import type { TimeManagerDB } from '../db'
import type { Tag } from '../../types'

type CreateInput = Omit<Tag, 'id'>

export class TagRepository {
  constructor(private db: TimeManagerDB) {}

  async create(input: CreateInput): Promise<Tag> {
    const tag: Tag = { ...input, id: nanoid() }
    await this.db.tags.add(tag)
    return tag
  }

  async update(id: string, changes: Partial<Omit<Tag, 'id'>>): Promise<void> {
    await this.db.tags.update(id, changes)
  }

  async delete(id: string): Promise<void> {
    await this.db.transaction('rw', [this.db.tags, this.db.tasks, this.db.notes], async () => {
      await this.db.tags.delete(id)

      // Remove tagId from all tasks
      const tasksWithTag = await this.db.tasks.where('tagIds').equals(id).toArray()
      for (const task of tasksWithTag) {
        await this.db.tasks.update(task.id, {
          tagIds: task.tagIds.filter(t => t !== id),
          updatedAt: new Date().toISOString(),
        })
      }

      // Remove tagId from all notes
      const notesWithTag = await this.db.notes.toArray()
      for (const note of notesWithTag.filter(n => n.tagIds.includes(id))) {
        await this.db.notes.update(note.id, {
          tagIds: note.tagIds.filter(t => t !== id),
          updatedAt: new Date().toISOString(),
        })
      }
    })
  }

  async getAll(): Promise<Tag[]> {
    return this.db.tags.toArray()
  }
}
```

- [ ] **Step 4: Run tests**

```bash
npm test -- src/db/repositories/__tests__/TagRepository.test.ts
```

Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/db/repositories/TagRepository.ts src/db/repositories/__tests__/TagRepository.test.ts
git commit -m "feat: add TagRepository with cascade tag deletion"
```

---

### Task 6: NoteRepository

**Files:**
- Create: `src/db/repositories/NoteRepository.ts`
- Create: `src/db/repositories/__tests__/NoteRepository.test.ts`

- [ ] **Step 1: Write failing tests**

```typescript
// src/db/repositories/__tests__/NoteRepository.test.ts
import { db } from '../../db'
import { NoteRepository } from '../NoteRepository'

const repo = new NoteRepository(db)

beforeEach(async () => { await db.notes.clear() })

describe('NoteRepository.create', () => {
  it('creates a note with id and timestamps, defaulting title to "Untitled"', async () => {
    const note = await repo.create({ title: '', content: '{}', tagIds: [], linkedTaskIds: [] })
    expect(note.id).toBeTruthy()
    expect(note.title).toBe('Untitled')
  })
})

describe('NoteRepository.getByLinkedTaskId', () => {
  it('returns notes that link to the given taskId', async () => {
    await repo.create({ title: 'N1', content: '{}', tagIds: [], linkedTaskIds: ['t1'] })
    await repo.create({ title: 'N2', content: '{}', tagIds: [], linkedTaskIds: ['t2'] })
    const results = await repo.getByLinkedTaskId('t1')
    expect(results).toHaveLength(1)
    expect(results[0].title).toBe('N1')
  })
})

describe('NoteRepository.delete', () => {
  it('removes the note', async () => {
    const note = await repo.create({ title: 'X', content: '{}', tagIds: [], linkedTaskIds: [] })
    await repo.delete(note.id)
    expect(await db.notes.get(note.id)).toBeUndefined()
  })
})
```

- [ ] **Step 2: Run to verify failure**

```bash
npm test -- src/db/repositories/__tests__/NoteRepository.test.ts
```

- [ ] **Step 3: Implement NoteRepository**

```typescript
// src/db/repositories/NoteRepository.ts
import { nanoid } from 'nanoid'
import type { TimeManagerDB } from '../db'
import type { Note } from '../../types'

type CreateInput = Omit<Note, 'id' | 'createdAt' | 'updatedAt'>

export class NoteRepository {
  constructor(private db: TimeManagerDB) {}

  async create(input: CreateInput): Promise<Note> {
    const now = new Date().toISOString()
    const note: Note = {
      ...input,
      title: input.title.trim() || 'Untitled',
      id: nanoid(),
      createdAt: now,
      updatedAt: now,
    }
    await this.db.notes.add(note)
    return note
  }

  async update(id: string, changes: Partial<Omit<Note, 'id' | 'createdAt'>>): Promise<void> {
    await this.db.notes.update(id, { ...changes, updatedAt: new Date().toISOString() })
  }

  async delete(id: string): Promise<void> {
    await this.db.notes.delete(id)
  }

  async getAll(): Promise<Note[]> {
    return this.db.notes.toArray()
  }

  async getByLinkedTaskId(taskId: string): Promise<Note[]> {
    return this.db.notes.where('linkedTaskIds').equals(taskId).toArray()
  }
}
```

- [ ] **Step 4: Run tests**

```bash
npm test -- src/db/repositories/__tests__/NoteRepository.test.ts
```

Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/db/repositories/NoteRepository.ts src/db/repositories/__tests__/NoteRepository.test.ts
git commit -m "feat: add NoteRepository"
```

---

### Task 7: PomodoroRepository

**Files:**
- Create: `src/db/repositories/PomodoroRepository.ts`
- Create: `src/db/repositories/__tests__/PomodoroRepository.test.ts`

- [ ] **Step 1: Write failing tests**

```typescript
// src/db/repositories/__tests__/PomodoroRepository.test.ts
import { db } from '../../db'
import { PomodoroRepository } from '../PomodoroRepository'

const repo = new PomodoroRepository(db)

beforeEach(async () => {
  await db.pomodoroSessions.clear()
  await db.pomodoroStats.clear()
})

describe('PomodoroRepository.createWorkSession', () => {
  it('creates session and upserts stats (increments totalStarted)', async () => {
    const session = await repo.createWorkSession('task1')
    expect(session.type).toBe('work')
    expect(session.completedAt).toBeNull()
    expect(session.taskId).toBe('task1')
    const stats = await db.pomodoroStats.get('task1')
    expect(stats?.totalStarted).toBe(1)
    expect(stats?.totalCompleted).toBe(0)
  })

  it('increments totalStarted on second session', async () => {
    await repo.createWorkSession('task1')
    await repo.createWorkSession('task1')
    const stats = await db.pomodoroStats.get('task1')
    expect(stats?.totalStarted).toBe(2)
  })
})

describe('PomodoroRepository.completeWorkSession', () => {
  it('sets completedAt and increments totalCompleted + totalMinutesFocused', async () => {
    const session = await repo.createWorkSession('task1')
    const completedAt = new Date().toISOString()
    await repo.completeWorkSession(session.id, completedAt)
    const updated = await db.pomodoroSessions.get(session.id)
    expect(updated?.completedAt).toBe(completedAt)
    const stats = await db.pomodoroStats.get('task1')
    expect(stats?.totalCompleted).toBe(1)
    expect(stats?.totalMinutesFocused).toBe(25)
  })
})

describe('PomodoroRepository.interruptWorkSession', () => {
  it('leaves completedAt null and increments totalInterrupted', async () => {
    const session = await repo.createWorkSession('task1')
    await repo.interruptWorkSession(session.id)
    const updated = await db.pomodoroSessions.get(session.id)
    expect(updated?.completedAt).toBeNull()
    const stats = await db.pomodoroStats.get('task1')
    expect(stats?.totalInterrupted).toBe(1)
    expect(stats?.totalCompleted).toBe(0)
  })
})

describe('PomodoroRepository.getOpenSession', () => {
  it('returns the session with completedAt = null', async () => {
    const session = await repo.createWorkSession('task1')
    const found = await repo.getOpenSession()
    expect(found?.id).toBe(session.id)
  })

  it('returns undefined after session is completed', async () => {
    const session = await repo.createWorkSession('task1')
    await repo.completeWorkSession(session.id, new Date().toISOString())
    expect(await repo.getOpenSession()).toBeUndefined()
  })
})

describe('PomodoroRepository.deleteByTaskId', () => {
  it('removes all sessions and stats for a task', async () => {
    const s = await repo.createWorkSession('task1')
    await repo.deleteByTaskId('task1')
    expect(await db.pomodoroSessions.get(s.id)).toBeUndefined()
    expect(await db.pomodoroStats.get('task1')).toBeUndefined()
  })
})
```

- [ ] **Step 2: Run to verify failure**

```bash
npm test -- src/db/repositories/__tests__/PomodoroRepository.test.ts
```

- [ ] **Step 3: Implement PomodoroRepository**

```typescript
// src/db/repositories/PomodoroRepository.ts
import { nanoid } from 'nanoid'
import type { TimeManagerDB } from '../db'
import type { PomodoroSession, PomodoroStats } from '../../types'

const WORK_DURATION = 25

export class PomodoroRepository {
  constructor(private db: TimeManagerDB) {}

  async createWorkSession(taskId: string): Promise<PomodoroSession> {
    const session: PomodoroSession = {
      id: nanoid(),
      taskId,
      startedAt: new Date().toISOString(),
      completedAt: null,
      type: 'work',
      durationMinutes: WORK_DURATION,
    }
    await this.db.transaction('rw', [this.db.pomodoroSessions, this.db.pomodoroStats], async () => {
      await this.db.pomodoroSessions.add(session)
      await this._upsertStats(taskId, stats => ({ ...stats, totalStarted: stats.totalStarted + 1 }))
    })
    return session
  }

  async completeWorkSession(id: string, completedAt: string): Promise<void> {
    const session = await this.db.pomodoroSessions.get(id)
    if (!session || session.type !== 'work') return
    await this.db.transaction('rw', [this.db.pomodoroSessions, this.db.pomodoroStats], async () => {
      await this.db.pomodoroSessions.update(id, { completedAt })
      if (session.taskId) {
        await this._upsertStats(session.taskId, stats => ({
          ...stats,
          totalCompleted: stats.totalCompleted + 1,
          totalMinutesFocused: stats.totalMinutesFocused + session.durationMinutes,
          lastSessionAt: completedAt,
        }))
      }
    })
  }

  async interruptWorkSession(id: string): Promise<void> {
    const session = await this.db.pomodoroSessions.get(id)
    if (!session || session.type !== 'work') return
    // completedAt stays null — already the interrupted signal per spec
    if (session.taskId) {
      await this._upsertStats(session.taskId, stats => ({
        ...stats,
        totalInterrupted: stats.totalInterrupted + 1,
        lastSessionAt: new Date().toISOString(),
      }))
    }
  }

  async createBreakSession(taskId: string | undefined, type: 'short_break' | 'long_break'): Promise<PomodoroSession> {
    const durationMinutes = type === 'short_break' ? 5 : 15
    const session: PomodoroSession = {
      id: nanoid(), taskId, startedAt: new Date().toISOString(),
      completedAt: null, type, durationMinutes,
    }
    await this.db.pomodoroSessions.add(session)
    return session
  }

  async completeBreakSession(id: string): Promise<void> {
    await this.db.pomodoroSessions.update(id, { completedAt: new Date().toISOString() })
  }

  async getOpenSession(): Promise<PomodoroSession | undefined> {
    // completedAt is stored as null (not the string "null"), so use filter()
    return this.db.pomodoroSessions.filter(s => s.completedAt === null).first()
  }

  async getSessionsByTaskId(taskId: string): Promise<PomodoroSession[]> {
    return this.db.pomodoroSessions.where('taskId').equals(taskId).sortBy('startedAt')
  }

  async getStatsByTaskId(taskId: string): Promise<PomodoroStats | undefined> {
    return this.db.pomodoroStats.get(taskId)
  }

  async deleteByTaskId(taskId: string): Promise<void> {
    await this.db.transaction('rw', [this.db.pomodoroSessions, this.db.pomodoroStats], async () => {
      const sessionIds = await this.db.pomodoroSessions.where('taskId').equals(taskId).primaryKeys()
      await this.db.pomodoroSessions.bulkDelete(sessionIds as string[])
      await this.db.pomodoroStats.delete(taskId)
    })
  }

  private async _upsertStats(taskId: string, updater: (s: PomodoroStats) => PomodoroStats): Promise<void> {
    const existing = await this.db.pomodoroStats.get(taskId)
    const base: PomodoroStats = existing ?? {
      taskId, totalStarted: 0, totalCompleted: 0,
      totalInterrupted: 0, totalMinutesFocused: 0,
      lastSessionAt: null, updatedAt: new Date().toISOString(),
    }
    const updated = updater(base)
    await this.db.pomodoroStats.put({ ...updated, updatedAt: new Date().toISOString() })
  }
}
```

**Note on `getOpenSession`:** Dexie's null indexing can be tricky. The fallback `toArray().find()` ensures correctness even if the index doesn't match null directly.

- [ ] **Step 4: Run tests**

```bash
npm test -- src/db/repositories/__tests__/PomodoroRepository.test.ts
```

Expected: PASS (8 passing)

- [ ] **Step 5: Commit**

```bash
git add src/db/repositories/PomodoroRepository.ts src/db/repositories/__tests__/PomodoroRepository.test.ts
git commit -m "feat: add PomodoroRepository with session tracking and stats upsert"
```

---

## Chunk 2: Lib Utilities + Zustand Stores + Shared Components

### Task 8: orderUtils

**Files:**
- Create: `src/lib/orderUtils.ts`
- Create: `src/lib/__tests__/orderUtils.test.ts`

- [ ] **Step 1: Write failing tests**

```typescript
// src/lib/__tests__/orderUtils.test.ts
import { getOrderBetween, needsReindex, reindexGroup } from '../orderUtils'

describe('getOrderBetween', () => {
  it('returns midpoint between two values', () => {
    expect(getOrderBetween(1000, 2000)).toBe(1500)
  })
  it('returns before + 1000 when after is null', () => {
    expect(getOrderBetween(2000, null)).toBe(3000)
  })
  it('returns after - 500 when before is null', () => {
    expect(getOrderBetween(null, 1000)).toBe(500)
  })
  it('returns 1000 when both are null', () => {
    expect(getOrderBetween(null, null)).toBe(1000)
  })
})

describe('needsReindex', () => {
  it('returns true when two values are within 0.001', () => {
    expect(needsReindex([1000, 1000.0005, 2000])).toBe(true)
  })
  it('returns false when all values are spaced', () => {
    expect(needsReindex([1000, 2000, 3000])).toBe(false)
  })
})

describe('reindexGroup', () => {
  it('assigns 1000, 2000, 3000 in sorted order', () => {
    const result = reindexGroup(['a', 'b', 'c'], new Map([['a', 1000], ['c', 999], ['b', 2000]]))
    // sorted by existing order: c(999), a(1000), b(2000)
    expect(result.get('c')).toBe(1000)
    expect(result.get('a')).toBe(2000)
    expect(result.get('b')).toBe(3000)
  })
})
```

- [ ] **Step 2: Run to verify failure**

```bash
npm test -- src/lib/__tests__/orderUtils.test.ts
```

- [ ] **Step 3: Implement orderUtils**

```typescript
// src/lib/orderUtils.ts
export function getOrderBetween(before: number | null, after: number | null): number {
  if (before === null && after === null) return 1000
  if (before === null) return after! - 500
  if (after === null) return before + 1000
  return (before + after) / 2
}

export function needsReindex(orders: number[]): boolean {
  const sorted = [...orders].sort((a, b) => a - b)
  for (let i = 0; i < sorted.length - 1; i++) {
    if (sorted[i + 1] - sorted[i] < 0.001) return true
  }
  return false
}

/** Returns a new map with reassigned 1000-spaced order values in existing sort order */
export function reindexGroup(ids: string[], idToOrder: Map<string, number>): Map<string, number> {
  const sorted = [...ids].sort((a, b) => (idToOrder.get(a) ?? 0) - (idToOrder.get(b) ?? 0))
  const result = new Map<string, number>()
  sorted.forEach((id, i) => result.set(id, (i + 1) * 1000))
  return result
}
```

- [ ] **Step 4: Run tests**

```bash
npm test -- src/lib/__tests__/orderUtils.test.ts
```

Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/lib/orderUtils.ts src/lib/__tests__/orderUtils.test.ts
git commit -m "feat: add orderUtils for float-order management"
```

---

### Task 9: dateUtils

**Files:**
- Create: `src/lib/dateUtils.ts`
- Create: `src/lib/__tests__/dateUtils.test.ts`

- [ ] **Step 1: Write failing tests**

```typescript
// src/lib/__tests__/dateUtils.test.ts
import { getWeekDays, formatISODay, isToday, addWeeks } from '../dateUtils'

describe('getWeekDays', () => {
  it('returns 7 days starting from Monday', () => {
    const days = getWeekDays(new Date('2026-03-16')) // Monday
    expect(days).toHaveLength(7)
    expect(days[0]).toBe('2026-03-16') // Mon
    expect(days[6]).toBe('2026-03-22') // Sun
  })

  it('week containing Wednesday also starts on Monday', () => {
    const days = getWeekDays(new Date('2026-03-18')) // Wednesday
    expect(days[0]).toBe('2026-03-16')
  })
})

describe('formatISODay', () => {
  it('formats date as YYYY-MM-DD', () => {
    expect(formatISODay(new Date('2026-03-16T12:00:00Z'))).toMatch(/^\d{4}-\d{2}-\d{2}$/)
  })
})

describe('addWeeks', () => {
  it('adds positive weeks', () => {
    const days = addWeeks(new Date('2026-03-16'), 1)
    expect(getWeekDays(days)[0]).toBe('2026-03-23')
  })
  it('subtracts weeks with negative value', () => {
    const days = addWeeks(new Date('2026-03-16'), -1)
    expect(getWeekDays(days)[0]).toBe('2026-03-09')
  })
})
```

- [ ] **Step 2: Run to verify failure**

```bash
npm test -- src/lib/__tests__/dateUtils.test.ts
```

- [ ] **Step 3: Implement dateUtils**

```typescript
// src/lib/dateUtils.ts
import {
  startOfISOWeek,
  addDays,
  addWeeks as dateFnsAddWeeks,
  format,
  isToday as dateFnsIsToday,
} from 'date-fns'

/** Returns 7 ISO date strings (YYYY-MM-DD) for the week containing `date`, Mon–Sun */
export function getWeekDays(date: Date): string[] {
  const start = startOfISOWeek(date)
  return Array.from({ length: 7 }, (_, i) => formatISODay(addDays(start, i)))
}

/** Format a Date as YYYY-MM-DD */
export function formatISODay(date: Date): string {
  return format(date, 'yyyy-MM-dd')
}

/** Today's ISO date string */
export function todayISO(): string {
  return formatISODay(new Date())
}

export function isToday(isoDate: string): boolean {
  return dateFnsIsToday(new Date(isoDate + 'T00:00:00'))
}

/** Returns a new Date shifted by `weeks` weeks (negative = past) */
export function addWeeks(date: Date, weeks: number): Date {
  return dateFnsAddWeeks(date, weeks)
}

/** Day name abbreviation: Mon, Tue, … */
export function dayAbbr(isoDate: string): string {
  return format(new Date(isoDate + 'T00:00:00'), 'EEE')
}
```

- [ ] **Step 4: Run tests**

```bash
npm test -- src/lib/__tests__/dateUtils.test.ts
```

Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/lib/dateUtils.ts src/lib/__tests__/dateUtils.test.ts
git commit -m "feat: add dateUtils (ISO week helpers using date-fns)"
```

---

### Task 10: audioUtils + exportUtils

**Files:**
- Create: `src/lib/audioUtils.ts`
- Create: `src/lib/exportUtils.ts`
- Create: `src/lib/__tests__/exportUtils.test.ts`

- [ ] **Step 1: Write failing export test**

```typescript
// src/lib/__tests__/exportUtils.test.ts
import { buildExportPayload, downloadJSON } from '../exportUtils'
import type { Task, Tag, Note, PomodoroSession } from '../../types'

describe('buildExportPayload', () => {
  it('produces correct envelope with version 1', () => {
    const payload = buildExportPayload([], [], [], [])
    expect(payload.version).toBe(1)
    expect(payload.tasks).toEqual([])
    expect(payload.exportedAt).toBeTruthy()
  })

  it('includes all provided data', () => {
    const task = { id: 't1' } as Task
    const payload = buildExportPayload([task], [], [], [])
    expect(payload.tasks).toHaveLength(1)
  })
})
```

- [ ] **Step 2: Run to verify failure**

```bash
npm test -- src/lib/__tests__/exportUtils.test.ts
```

- [ ] **Step 3: Implement audioUtils**

```typescript
// src/lib/audioUtils.ts
/** Play a short beep using the Web Audio API. No external file needed. */
export function playBeep(frequencyHz = 880, durationMs = 300, volume = 0.3): void {
  try {
    const ctx = new AudioContext()
    const oscillator = ctx.createOscillator()
    const gainNode = ctx.createGain()
    oscillator.connect(gainNode)
    gainNode.connect(ctx.destination)
    oscillator.type = 'sine'
    oscillator.frequency.setValueAtTime(frequencyHz, ctx.currentTime)
    gainNode.gain.setValueAtTime(volume, ctx.currentTime)
    gainNode.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + durationMs / 1000)
    oscillator.start(ctx.currentTime)
    oscillator.stop(ctx.currentTime + durationMs / 1000)
    oscillator.onended = () => ctx.close()
  } catch {
    // AudioContext may be blocked in test environment — silently ignore
  }
}
```

- [ ] **Step 4: Implement exportUtils**

```typescript
// src/lib/exportUtils.ts
import type { Task, Tag, Note, PomodoroSession } from '../types'

export interface ExportPayload {
  version: 1
  exportedAt: string
  tasks: Task[]
  tags: Tag[]
  notes: Note[]
  pomodoroSessions: PomodoroSession[]
}

export function buildExportPayload(
  tasks: Task[],
  tags: Tag[],
  notes: Note[],
  pomodoroSessions: PomodoroSession[],
): ExportPayload {
  return { version: 1, exportedAt: new Date().toISOString(), tasks, tags, notes, pomodoroSessions }
}

export function downloadJSON(payload: ExportPayload): void {
  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `time-manager-backup-${payload.exportedAt.slice(0, 10)}.json`
  a.click()
  URL.revokeObjectURL(url)
}
```

- [ ] **Step 5: Run tests**

```bash
npm test -- src/lib/__tests__/exportUtils.test.ts
```

Expected: PASS

- [ ] **Step 6: Commit**

```bash
git add src/lib/audioUtils.ts src/lib/exportUtils.ts src/lib/__tests__/exportUtils.test.ts
git commit -m "feat: add audioUtils (beep) and exportUtils (JSON backup)"
```

---

### Task 11: Zustand stores

**Files:**
- Create: `src/store/taskStore.ts`
- Create: `src/store/tagStore.ts`
- Create: `src/store/noteStore.ts`
- Create: `src/store/pomodoroStore.ts`
- Create: `src/store/__tests__/pomodoroStore.test.ts`

- [ ] **Step 1: Write pomodoroStore test**

```typescript
// src/store/__tests__/pomodoroStore.test.ts
import { act } from '@testing-library/react'
import { usePomodoroStore } from '../pomodoroStore'

describe('pomodoroStore', () => {
  beforeEach(() => usePomodoroStore.setState({
    activeSession: null, workSessionCount: 0,
    secondsRemaining: 0, isRunning: false,
  }))

  it('setActiveSession sets active session', () => {
    act(() => {
      usePomodoroStore.getState().setActiveSession({
        taskId: 't1', sessionId: 's1',
        startedAt: new Date().toISOString(), type: 'work',
      })
    })
    expect(usePomodoroStore.getState().activeSession?.taskId).toBe('t1')
  })

  it('clearActiveSession nulls out the session', () => {
    act(() => {
      usePomodoroStore.getState().setActiveSession({
        taskId: 't1', sessionId: 's1',
        startedAt: new Date().toISOString(), type: 'work',
      })
      usePomodoroStore.getState().clearActiveSession()
    })
    expect(usePomodoroStore.getState().activeSession).toBeNull()
  })

  it('incrementWorkSessionCount increments counter', () => {
    act(() => {
      usePomodoroStore.getState().incrementWorkSessionCount()
      usePomodoroStore.getState().incrementWorkSessionCount()
    })
    expect(usePomodoroStore.getState().workSessionCount).toBe(2)
  })
})
```

- [ ] **Step 2: Run to verify failure**

```bash
npm test -- src/store/__tests__/pomodoroStore.test.ts
```

- [ ] **Step 3: Implement all four stores**

```typescript
// src/store/taskStore.ts
import { create } from 'zustand'
import type { Task } from '../types'

interface TaskStore {
  tasks: Task[]
  setTasks: (tasks: Task[]) => void
  upsertTask: (task: Task) => void
  removeTask: (id: string) => void
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
  removeTask: id => set(s => ({ tasks: s.tasks.filter(t => t.id !== id) })),
}))
```

```typescript
// src/store/tagStore.ts
import { create } from 'zustand'
import type { Tag } from '../types'

interface TagStore {
  tags: Tag[]
  setTags: (tags: Tag[]) => void
  upsertTag: (tag: Tag) => void
  removeTag: (id: string) => void
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
}))
```

```typescript
// src/store/noteStore.ts
import { create } from 'zustand'
import type { Note } from '../types'

interface NoteStore {
  notes: Note[]
  activeNoteId: string | null
  setNotes: (notes: Note[]) => void
  upsertNote: (note: Note) => void
  removeNote: (id: string) => void
  setActiveNoteId: (id: string | null) => void
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
  removeNote: id => set(s => ({ notes: s.notes.filter(n => n.id !== id) })),
  setActiveNoteId: id => set({ activeNoteId: id }),
}))
```

```typescript
// src/store/pomodoroStore.ts
import { create } from 'zustand'

interface ActiveSession {
  taskId?: string
  sessionId: string
  startedAt: string
  type: 'work' | 'short_break' | 'long_break'
}

interface PomodoroStore {
  activeSession: ActiveSession | null
  workSessionCount: number        // resets on page reload; intentional
  secondsRemaining: number
  isRunning: boolean
  setActiveSession: (session: ActiveSession) => void
  clearActiveSession: () => void
  incrementWorkSessionCount: () => void
  setSecondsRemaining: (s: number) => void
  setIsRunning: (v: boolean) => void
}

export const usePomodoroStore = create<PomodoroStore>(set => ({
  activeSession: null,
  workSessionCount: 0,
  secondsRemaining: 0,
  isRunning: false,
  setActiveSession: session => set({ activeSession: session }),
  clearActiveSession: () => set({ activeSession: null, isRunning: false }),
  incrementWorkSessionCount: () => set(s => ({ workSessionCount: s.workSessionCount + 1 })),
  setSecondsRemaining: secondsRemaining => set({ secondsRemaining }),
  setIsRunning: isRunning => set({ isRunning }),
}))
```

- [ ] **Step 4: Run pomodoroStore tests**

```bash
npm test -- src/store/__tests__/pomodoroStore.test.ts
```

Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/store/
git commit -m "feat: add Zustand stores (task, tag, note, pomodoro)"
```

---

### Task 12: Toast component + shared UI

**Files:**
- Create: `src/components/ToastProvider.tsx`
- Create: `src/components/Toast.tsx`
- Create: `src/components/EmptyState.tsx`
- Create: `src/components/RecoveryScreen.tsx`
- Create: `src/components/__tests__/Toast.test.tsx`

- [ ] **Step 1: Write Toast test**

```typescript
// src/components/__tests__/Toast.test.tsx
import { render, screen, act } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { ToastProvider, useToast } from '../ToastProvider'

function ShowToastButton() {
  const { showToast } = useToast()
  return <button onClick={() => showToast('Hello toast')}>Show</button>
}

describe('ToastProvider', () => {
  it('shows a toast message', async () => {
    render(<ToastProvider><ShowToastButton /></ToastProvider>)
    await userEvent.click(screen.getByText('Show'))
    expect(screen.getByText('Hello toast')).toBeInTheDocument()
  })
})
```

- [ ] **Step 2: Run to verify failure**

```bash
npm test -- src/components/__tests__/Toast.test.tsx
```

- [ ] **Step 3: Implement ToastProvider and Toast**

```typescript
// src/components/ToastProvider.tsx
import React, { createContext, useContext, useState, useCallback, useRef } from 'react'
import { Toast } from './Toast'

interface ToastCtx {
  showToast: (message: string) => void
}

const ToastContext = createContext<ToastCtx>({ showToast: () => {} })

export function useToast() {
  return useContext(ToastContext)
}

interface ToastItem { id: number; message: string }

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([])
  const nextId = useRef(0)

  const showToast = useCallback((message: string) => {
    const id = nextId.current++
    setToasts(t => [...t, { id, message }])
    setTimeout(() => setToasts(t => t.filter(x => x.id !== id)), 3000)
  }, [])

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      <div style={{ position: 'fixed', bottom: 24, left: '50%', transform: 'translateX(-50%)', zIndex: 9999, display: 'flex', flexDirection: 'column', gap: 8 }}>
        {toasts.map(t => <Toast key={t.id} message={t.message} />)}
      </div>
    </ToastContext.Provider>
  )
}
```

```typescript
// src/components/Toast.tsx
export function Toast({ message }: { message: string }) {
  return (
    <div role="status" style={{
      background: 'var(--color-surface-2)',
      color: 'var(--color-text)',
      border: '1px solid var(--color-border)',
      borderRadius: 6,
      padding: '8px 16px',
      fontSize: 14,
      boxShadow: '0 4px 12px rgba(0,0,0,0.3)',
    }}>
      {message}
    </div>
  )
}
```

```typescript
// src/components/EmptyState.tsx
export function EmptyState({ message }: { message: string }) {
  return (
    <div style={{ textAlign: 'center', padding: '48px 16px', color: 'var(--color-text-muted)', fontSize: 14 }}>
      {message}
    </div>
  )
}
```

```typescript
// src/components/RecoveryScreen.tsx
import { downloadJSON, buildExportPayload } from '../lib/exportUtils'
import { db } from '../db/db'

export function RecoveryScreen() {
  async function handleExport() {
    try {
      const [tasks, tags, notes, sessions] = await Promise.all([
        db.tasks.toArray(), db.tags.toArray(),
        db.notes.toArray(), db.pomodoroSessions.toArray(),
      ])
      downloadJSON(buildExportPayload(tasks, tags, notes, sessions))
    } catch {
      alert('Could not read data for export.')
    }
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100vh', gap: 16 }}>
      <h2>Storage Error</h2>
      <p>The local database could not be opened. Your data may be corrupted or storage is full.</p>
      <button onClick={handleExport}>Export Backup (JSON)</button>
    </div>
  )
}
```

- [ ] **Step 4: Run tests**

```bash
npm test -- src/components/__tests__/Toast.test.tsx
```

Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/components/
git commit -m "feat: add Toast, EmptyState, RecoveryScreen shared components"
```

---

### Task 13: TabBar + index.css + App skeleton

**Files:**
- Create: `src/components/TabBar.tsx`
- Modify: `src/index.css`
- Modify: `src/App.tsx`
- Modify: `src/main.tsx`

- [ ] **Step 1: Create index.css with CSS variables**

```css
/* src/index.css */
*, *::before, *::after { box-sizing: border-box; }
body { margin: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; background: var(--color-bg); color: var(--color-text); }

:root {
  --color-bg: #0d1117;
  --color-surface: #161b22;
  --color-surface-2: #21262d;
  --color-border: #30363d;
  --color-text: #c9d1d9;
  --color-text-muted: #8b949e;
  --color-accent: #58a6ff;
  --color-success: #3fb950;
  --color-warning: #f0883e;
  --color-danger: #f85149;
  --color-purple: #d2a8ff;
  --radius: 6px;
}

button { cursor: pointer; border: none; background: none; color: inherit; font: inherit; }
input { font: inherit; color: inherit; }
```

- [ ] **Step 2: Create TabBar**

```typescript
// src/components/TabBar.tsx
type Tab = 'home' | 'tasks' | 'schedule' | 'notes'

interface Props {
  active: Tab
  onChange: (tab: Tab) => void
}

const TABS: { id: Tab; label: string }[] = [
  { id: 'home', label: 'Home' },
  { id: 'tasks', label: 'Tasks' },
  { id: 'schedule', label: 'Schedule' },
  { id: 'notes', label: 'Notes' },
]

export function TabBar({ active, onChange }: Props) {
  return (
    <nav style={{
      display: 'flex', borderBottom: '1px solid var(--color-border)',
      background: 'var(--color-surface)', padding: '0 16px',
    }}>
      {TABS.map(tab => (
        <button
          key={tab.id}
          onClick={() => onChange(tab.id)}
          style={{
            padding: '12px 16px', fontSize: 14,
            color: active === tab.id ? 'var(--color-accent)' : 'var(--color-text-muted)',
            borderBottom: active === tab.id ? '2px solid var(--color-accent)' : '2px solid transparent',
            marginBottom: -1,
          }}
        >
          {tab.label}
        </button>
      ))}
    </nav>
  )
}

export type { Tab }
```

- [ ] **Step 3: Create App skeleton**

```typescript
// src/App.tsx
import { useState, useEffect } from 'react'
import { TabBar, type Tab } from './components/TabBar'
import { ToastProvider } from './components/ToastProvider'
import { RecoveryScreen } from './components/RecoveryScreen'
import { db } from './db/db'

export default function App() {
  const [tab, setTab] = useState<Tab>('home')
  const [dbError, setDbError] = useState(false)

  useEffect(() => {
    db.open().catch(() => setDbError(true))
  }, [])

  if (dbError) return <RecoveryScreen />

  return (
    <ToastProvider>
      <div style={{ display: 'flex', flexDirection: 'column', height: '100vh' }}>
        <TabBar active={tab} onChange={setTab} />
        <main style={{ flex: 1, overflow: 'auto', padding: 16 }}>
          {tab === 'home' && <div>Home tab — coming soon</div>}
          {tab === 'tasks' && <div>Tasks tab — coming soon</div>}
          {tab === 'schedule' && <div>Schedule tab — coming soon</div>}
          {tab === 'notes' && <div>Notes tab — coming soon</div>}
        </main>
      </div>
    </ToastProvider>
  )
}
```

- [ ] **Step 4: Update main.tsx**

```typescript
// src/main.tsx
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
```

- [ ] **Step 5: Verify app runs**

```bash
npm run dev
```

Expected: browser opens, tab bar visible with four tabs, no console errors.

- [ ] **Step 6: Run all tests**

```bash
npm test
```

Expected: all tests pass.

- [ ] **Step 7: Commit**

```bash
git add src/components/TabBar.tsx src/index.css src/App.tsx src/main.tsx
git commit -m "feat: add TabBar, CSS variables, and App skeleton"
```

---

## Chunk 3: Tags Feature

### Task 14: ColorPicker component

**Files:**
- Create: `src/components/ColorPicker.tsx`
- Test: `src/components/ColorPicker.test.tsx`

- [ ] **Step 1: Write the failing test**

```typescript
// src/components/ColorPicker.test.tsx
import { render, screen, fireEvent } from '@testing-library/react'
import { ColorPicker } from './ColorPicker'

const COLORS = ['#3b82f6','#ef4444','#10b981','#f59e0b','#8b5cf6',
  '#ec4899','#06b6d4','#84cc16','#f97316','#6366f1','#14b8a6','#e11d48']

test('renders 12 color swatches', () => {
  render(<ColorPicker selected="#3b82f6" onSelect={() => {}} />)
  expect(screen.getAllByRole('button')).toHaveLength(12)
})

test('calls onSelect with hex when swatch clicked', () => {
  const onSelect = vi.fn()
  render(<ColorPicker selected="#3b82f6" onSelect={onSelect} />)
  fireEvent.click(screen.getAllByRole('button')[1])
  expect(onSelect).toHaveBeenCalledWith(COLORS[1])
})

test('selected swatch has aria-pressed=true', () => {
  render(<ColorPicker selected="#3b82f6" onSelect={() => {}} />)
  const buttons = screen.getAllByRole('button')
  expect(buttons[0]).toHaveAttribute('aria-pressed', 'true')
  expect(buttons[1]).toHaveAttribute('aria-pressed', 'false')
})
```

- [ ] **Step 2: Run test to verify it fails**

```bash
npm test -- ColorPicker
```

Expected: FAIL — module not found.

- [ ] **Step 3: Implement ColorPicker**

```typescript
// src/components/ColorPicker.tsx
const PRESET_COLORS = [
  '#3b82f6','#ef4444','#10b981','#f59e0b','#8b5cf6',
  '#ec4899','#06b6d4','#84cc16','#f97316','#6366f1','#14b8a6','#e11d48',
]

interface ColorPickerProps {
  selected: string
  onSelect: (color: string) => void
}

export function ColorPicker({ selected, onSelect }: ColorPickerProps) {
  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, padding: 8 }}>
      {PRESET_COLORS.map(color => (
        <button
          key={color}
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
  )
}
```

- [ ] **Step 4: Run test to verify it passes**

```bash
npm test -- ColorPicker
```

Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/components/ColorPicker.tsx src/components/ColorPicker.test.tsx
git commit -m "feat: add ColorPicker component with 12 preset colors"
```

---

### Task 15: TagBadge component

**Files:**
- Create: `src/components/TagBadge.tsx`
- Test: `src/components/TagBadge.test.tsx`

- [ ] **Step 1: Write the failing test**

```typescript
// src/components/TagBadge.test.tsx
import { render, screen, fireEvent } from '@testing-library/react'
import { TagBadge } from './TagBadge'

const tag = { id: 't1', name: 'work', color: '#3b82f6' }

test('renders tag name', () => {
  render(<TagBadge tag={tag} />)
  expect(screen.getByText('work')).toBeInTheDocument()
})

test('applies background color from tag', () => {
  render(<TagBadge tag={tag} />)
  const badge = screen.getByText('work').closest('[data-testid="tag-badge"]')!
  expect(badge).toHaveStyle({ background: '#3b82f6' })
})

test('shows × button when onRemove provided and calls it', () => {
  const onRemove = vi.fn()
  render(<TagBadge tag={tag} onRemove={onRemove} />)
  const removeBtn = screen.getByRole('button', { name: /remove work/i })
  fireEvent.click(removeBtn)
  expect(onRemove).toHaveBeenCalledWith('t1')
})

test('hides × button when onRemove not provided', () => {
  render(<TagBadge tag={tag} />)
  expect(screen.queryByRole('button')).not.toBeInTheDocument()
})
```

- [ ] **Step 2: Run test to verify it fails**

```bash
npm test -- TagBadge
```

Expected: FAIL

- [ ] **Step 3: Implement TagBadge**

```typescript
// src/components/TagBadge.tsx
import type { Tag } from '../types'

interface TagBadgeProps {
  tag: Tag
  onRemove?: (id: string) => void
}

export function TagBadge({ tag, onRemove }: TagBadgeProps) {
  return (
    <span
      data-testid="tag-badge"
      style={{
        display: 'inline-flex', alignItems: 'center', gap: 3,
        background: tag.color, color: '#fff', fontSize: 11,
        padding: '2px 8px', borderRadius: 10, fontWeight: 500,
      }}
    >
      {tag.name}
      {onRemove && (
        <button
          aria-label={`remove ${tag.name}`}
          onClick={() => onRemove(tag.id)}
          style={{ background: 'none', border: 'none', color: '#fff',
            cursor: 'pointer', padding: 0, lineHeight: 1, fontSize: 12 }}
        >
          ×
        </button>
      )}
    </span>
  )
}
```

- [ ] **Step 4: Run test to verify it passes**

```bash
npm test -- TagBadge
```

Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/components/TagBadge.tsx src/components/TagBadge.test.tsx
git commit -m "feat: add TagBadge component with optional remove button"
```

---

### Task 16: TagInput component

**Files:**
- Create: `src/features/tags/TagInput.tsx`
- Test: `src/features/tags/TagInput.test.tsx`

- [ ] **Step 1: Write the failing test**

```typescript
// src/features/tags/TagInput.test.tsx
import { render, screen, fireEvent } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { TagInput } from './TagInput'
import type { Tag } from '../../types'

const allTags: Tag[] = [
  { id: 't1', name: 'work', color: '#3b82f6' },
  { id: 't2', name: 'study', color: '#8b5cf6' },
  { id: 't3', name: 'personal', color: '#10b981' },
]

test('renders existing selected tags as badges', () => {
  render(<TagInput allTags={allTags} selectedIds={['t1','t2']} onChange={() => {}} onTagCreate={() => {}} />)
  expect(screen.getByText('work')).toBeInTheDocument()
  expect(screen.getByText('study')).toBeInTheDocument()
})

test('shows autocomplete dropdown filtered by input', async () => {
  render(<TagInput allTags={allTags} selectedIds={[]} onChange={() => {}} onTagCreate={() => {}} />)
  await userEvent.type(screen.getByRole('textbox'), 'wo')
  expect(screen.getByText('work')).toBeInTheDocument()
  expect(screen.queryByText('study')).not.toBeInTheDocument()
})

test('selects existing tag on click and calls onChange', async () => {
  const onChange = vi.fn()
  render(<TagInput allTags={allTags} selectedIds={[]} onChange={onChange} onTagCreate={() => {}} />)
  await userEvent.type(screen.getByRole('textbox'), 'wo')
  fireEvent.click(screen.getByText('work'))
  expect(onChange).toHaveBeenCalledWith(['t1'])
})

test('creates new tag on Enter when no match', async () => {
  const onTagCreate = vi.fn()
  render(<TagInput allTags={allTags} selectedIds={[]} onChange={() => {}} onTagCreate={onTagCreate} />)
  await userEvent.type(screen.getByRole('textbox'), 'newTag')
  fireEvent.keyDown(screen.getByRole('textbox'), { key: 'Enter' })
  expect(onTagCreate).toHaveBeenCalledWith('newTag')
})

test('removes tag badge when × clicked', () => {
  const onChange = vi.fn()
  render(<TagInput allTags={allTags} selectedIds={['t1']} onChange={onChange} onTagCreate={() => {}} />)
  fireEvent.click(screen.getByRole('button', { name: /remove work/i }))
  expect(onChange).toHaveBeenCalledWith([])
})
```

- [ ] **Step 2: Run test to verify it fails**

```bash
npm test -- TagInput
```

Expected: FAIL

- [ ] **Step 3: Implement TagInput**

```typescript
// src/features/tags/TagInput.tsx
import { useState, useRef, useEffect } from 'react'
import { TagBadge } from '../../components/TagBadge'
import type { Tag } from '../../types'

interface TagInputProps {
  allTags: Tag[]
  selectedIds: string[]
  onChange: (ids: string[]) => void
  onTagCreate: (name: string) => void
}

export function TagInput({ allTags, selectedIds, onChange, onTagCreate }: TagInputProps) {
  const [query, setQuery] = useState('')
  const [open, setOpen] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  const selectedTags = allTags.filter(t => selectedIds.includes(t.id))
  const available = allTags.filter(
    t => !selectedIds.includes(t.id) && t.name.toLowerCase().includes(query.toLowerCase())
  )

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Enter' && query.trim()) {
      e.preventDefault()
      const exact = allTags.find(t => t.name.toLowerCase() === query.trim().toLowerCase())
      if (exact) {
        onChange([...selectedIds, exact.id])
      } else {
        onTagCreate(query.trim())
      }
      setQuery('')
      setOpen(false)
    } else if (e.key === 'Escape') {
      setOpen(false)
    }
  }

  function selectTag(tag: Tag) {
    onChange([...selectedIds, tag.id])
    setQuery('')
    setOpen(false)
    inputRef.current?.focus()
  }

  function removeTag(id: string) {
    onChange(selectedIds.filter(i => i !== id))
  }

  return (
    <div style={{ position: 'relative', display: 'flex', flexWrap: 'wrap', gap: 4, alignItems: 'center' }}>
      {selectedTags.map(tag => (
        <TagBadge key={tag.id} tag={tag} onRemove={removeTag} />
      ))}
      <input
        ref={inputRef}
        value={query}
        onChange={e => { setQuery(e.target.value); setOpen(true) }}
        onFocus={() => setOpen(true)}
        onBlur={() => setTimeout(() => setOpen(false), 150)}
        onKeyDown={handleKeyDown}
        placeholder="Add tag..."
        style={{ border: 'none', background: 'transparent', outline: 'none',
          fontSize: 12, color: 'var(--text-primary)', minWidth: 80 }}
      />
      {open && (available.length > 0) && (
        <div style={{
          position: 'absolute', top: '100%', left: 0, zIndex: 50,
          background: 'var(--bg-secondary)', border: '1px solid var(--border)',
          borderRadius: 6, minWidth: 160, boxShadow: '0 4px 12px rgba(0,0,0,0.3)',
        }}>
          {available.map(tag => (
            <div
              key={tag.id}
              onMouseDown={() => selectTag(tag)}
              style={{ padding: '6px 10px', cursor: 'pointer', display: 'flex',
                alignItems: 'center', gap: 6 }}
            >
              <span style={{ width: 10, height: 10, borderRadius: '50%',
                background: tag.color, flexShrink: 0 }} />
              <span style={{ fontSize: 13 }}>{tag.name}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
```

- [ ] **Step 4: Run test to verify it passes**

```bash
npm test -- TagInput
```

Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/features/tags/ src/components/TagBadge.tsx src/components/TagBadge.test.tsx
git commit -m "feat: add TagInput with autocomplete, tag creation, and color picker integration"
```

---

## Chunk 4: Tasks Feature

### Task 17: AddTaskInput component

**Files:**
- Create: `src/features/tasks/AddTaskInput.tsx`
- Test: `src/features/tasks/AddTaskInput.test.tsx`

- [ ] **Step 1: Write the failing test**

```typescript
// src/features/tasks/AddTaskInput.test.tsx
import { render, screen, fireEvent } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { AddTaskInput } from './AddTaskInput'

test('renders input with placeholder', () => {
  render(<AddTaskInput onAdd={() => {}} />)
  expect(screen.getByPlaceholderText('+ Add task...')).toBeInTheDocument()
})

test('calls onAdd with trimmed title and clears input on Enter', async () => {
  const onAdd = vi.fn()
  render(<AddTaskInput onAdd={onAdd} />)
  const input = screen.getByPlaceholderText('+ Add task...')
  await userEvent.type(input, '  Buy milk  ')
  fireEvent.keyDown(input, { key: 'Enter' })
  expect(onAdd).toHaveBeenCalledWith('Buy milk')
  expect(input).toHaveValue('')
})

test('does not call onAdd if input is blank', async () => {
  const onAdd = vi.fn()
  render(<AddTaskInput onAdd={onAdd} />)
  const input = screen.getByPlaceholderText('+ Add task...')
  fireEvent.keyDown(input, { key: 'Enter' })
  expect(onAdd).not.toHaveBeenCalled()
})
```

- [ ] **Step 2: Run test to verify it fails**

```bash
npm test -- AddTaskInput
```

- [ ] **Step 3: Implement AddTaskInput**

```typescript
// src/features/tasks/AddTaskInput.tsx
import { useState } from 'react'

interface AddTaskInputProps {
  onAdd: (title: string) => void
  placeholder?: string
}

export function AddTaskInput({ onAdd, placeholder = '+ Add task...' }: AddTaskInputProps) {
  const [value, setValue] = useState('')

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Enter') {
      const title = value.trim()
      if (title) {
        onAdd(title)
        setValue('')
      }
    }
  }

  return (
    <input
      value={value}
      onChange={e => setValue(e.target.value)}
      onKeyDown={handleKeyDown}
      placeholder={placeholder}
      style={{
        width: '100%', padding: '8px 12px', background: 'var(--bg-secondary)',
        border: '1px solid var(--border)', borderRadius: 6, color: 'var(--text-primary)',
        fontSize: 14, outline: 'none', boxSizing: 'border-box',
      }}
    />
  )
}
```

- [ ] **Step 4: Run test to verify it passes**

```bash
npm test -- AddTaskInput
```

Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/features/tasks/AddTaskInput.tsx src/features/tasks/AddTaskInput.test.tsx
git commit -m "feat: add AddTaskInput component"
```

---

### Task 18: TaskItem and SubtaskItem components

**Files:**
- Create: `src/features/tasks/TaskItem.tsx`
- Create: `src/features/tasks/SubtaskItem.tsx`
- Test: `src/features/tasks/TaskItem.test.tsx`

- [ ] **Step 1: Write the failing test**

```typescript
// src/features/tasks/TaskItem.test.tsx
import { render, screen, fireEvent } from '@testing-library/react'
import { TaskItem } from './TaskItem'
import { SubtaskItem } from './SubtaskItem'
import type { Task, Tag } from '../../types'

const tag: Tag = { id: 'tg1', name: 'work', color: '#3b82f6' }
const task: Task = {
  id: 't1', title: 'Design Homepage', completed: false,
  order: 1, tagIds: ['tg1'], createdAt: '2026-01-01', updatedAt: '2026-01-01',
}

test('TaskItem renders title and tags', () => {
  render(<TaskItem task={task} tags={[tag]} pomodoroCount={2} onClick={() => {}} onToggle={() => {}} dragHandleProps={null} />)
  expect(screen.getByText('Design Homepage')).toBeInTheDocument()
  expect(screen.getByText('work')).toBeInTheDocument()
})

test('TaskItem shows pomodoro badge when count > 0', () => {
  render(<TaskItem task={task} tags={[tag]} pomodoroCount={3} onClick={() => {}} onToggle={() => {}} dragHandleProps={null} />)
  expect(screen.getByText('🍅 3')).toBeInTheDocument()
})

test('TaskItem calls onToggle when checkbox clicked', () => {
  const onToggle = vi.fn()
  render(<TaskItem task={task} tags={[tag]} pomodoroCount={0} onClick={() => {}} onToggle={onToggle} dragHandleProps={null} />)
  fireEvent.click(screen.getByRole('checkbox'))
  expect(onToggle).toHaveBeenCalledWith('t1')
})

test('TaskItem calls onClick when row clicked', () => {
  const onClick = vi.fn()
  render(<TaskItem task={task} tags={[tag]} pomodoroCount={0} onClick={onClick} onToggle={() => {}} dragHandleProps={null} />)
  fireEvent.click(screen.getByText('Design Homepage'))
  expect(onClick).toHaveBeenCalledWith('t1')
})

test('SubtaskItem renders with completed strikethrough', () => {
  const subtask = { ...task, id: 'st1', completed: true, parentId: 't1' }
  render(<SubtaskItem task={subtask} onClick={() => {}} onToggle={() => {}} />)
  const title = screen.getByText('Design Homepage')
  expect(title).toHaveStyle({ textDecoration: 'line-through' })
})
```

- [ ] **Step 2: Run test to verify it fails**

```bash
npm test -- TaskItem
```

- [ ] **Step 3: Implement TaskItem and SubtaskItem**

```typescript
// src/features/tasks/TaskItem.tsx
import type { Task, Tag } from '../../types'
import { TagBadge } from '../../components/TagBadge'

interface TaskItemProps {
  task: Task
  tags: Tag[]
  pomodoroCount: number
  isActive?: boolean      // has active pomodoro session
  onClick: (id: string) => void
  onToggle: (id: string) => void
  dragHandleProps: Record<string, unknown> | null
}

export function TaskItem({ task, tags, pomodoroCount, isActive, onClick, onToggle, dragHandleProps }: TaskItemProps) {
  const taskTags = tags.filter(t => task.tagIds.includes(t.id))

  return (
    <div
      style={{
        background: 'var(--bg-secondary)', border: `1px solid ${isActive ? 'var(--accent)' : 'var(--border)'}`,
        borderRadius: 6, padding: '8px 10px', display: 'flex',
        alignItems: 'flex-start', gap: 8,
      }}
    >
      {dragHandleProps && (
        <span {...dragHandleProps} style={{ cursor: 'grab', color: 'var(--text-muted)', fontSize: 16, paddingTop: 1 }}>
          ⠿
        </span>
      )}
      <input
        type="checkbox"
        checked={task.completed}
        onChange={() => onToggle(task.id)}
        style={{ marginTop: 2, cursor: 'pointer', accentColor: 'var(--success)' }}
      />
      <div style={{ flex: 1, cursor: 'pointer' }} onClick={() => onClick(task.id)}>
        <span style={{
          textDecoration: task.completed ? 'line-through' : 'none',
          color: task.completed ? 'var(--text-muted)' : 'var(--text-primary)',
          fontSize: 14,
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
        <span style={{ fontSize: 12, color: 'var(--accent)', whiteSpace: 'nowrap' }}>
          🍅 {pomodoroCount}
        </span>
      )}
    </div>
  )
}
```

```typescript
// src/features/tasks/SubtaskItem.tsx
import type { Task } from '../../types'

interface SubtaskItemProps {
  task: Task
  onClick: (id: string) => void
  onToggle: (id: string) => void
}

export function SubtaskItem({ task, onClick, onToggle }: SubtaskItemProps) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '4px 0' }}>
      <input
        type="checkbox"
        checked={task.completed}
        onChange={() => onToggle(task.id)}
        style={{ cursor: 'pointer', accentColor: 'var(--success)' }}
      />
      <span
        onClick={() => onClick(task.id)}
        style={{
          cursor: 'pointer', fontSize: 13,
          textDecoration: task.completed ? 'line-through' : 'none',
          color: task.completed ? 'var(--text-muted)' : 'var(--text-primary)',
        }}
      >
        {task.title}
      </span>
    </div>
  )
}
```

- [ ] **Step 4: Run test to verify it passes**

```bash
npm test -- TaskItem
```

Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/features/tasks/TaskItem.tsx src/features/tasks/SubtaskItem.tsx src/features/tasks/TaskItem.test.tsx
git commit -m "feat: add TaskItem and SubtaskItem components"
```

---

### Task 19: TaskList with drag-and-drop reorder

**Files:**
- Create: `src/features/tasks/TaskList.tsx`
- Test: `src/features/tasks/TaskList.test.tsx`

- [ ] **Step 1: Write the failing test**

```typescript
// src/features/tasks/TaskList.test.tsx
import { render, screen } from '@testing-library/react'
import { TaskList } from './TaskList'
import type { Task, Tag } from '../../types'

const tasks: Task[] = [
  { id: 't1', title: 'Alpha', completed: false, order: 1, tagIds: [], createdAt: '', updatedAt: '' },
  { id: 't2', title: 'Beta', completed: false, order: 2, tagIds: [], createdAt: '', updatedAt: '' },
]

test('renders all top-level tasks', () => {
  render(<TaskList tasks={tasks} subtasks={[]} tags={[]} pomodoroStats={{}} activeTaskId={null}
    onTaskClick={() => {}} onTaskToggle={() => {}} onTaskReorder={() => {}} />)
  expect(screen.getByText('Alpha')).toBeInTheDocument()
  expect(screen.getByText('Beta')).toBeInTheDocument()
})

test('renders subtasks indented under parent', () => {
  const subtask: Task = { id: 'st1', title: 'Sub1', completed: false, order: 1,
    parentId: 't1', tagIds: [], createdAt: '', updatedAt: '' }
  render(<TaskList tasks={tasks} subtasks={[subtask]} tags={[]} pomodoroStats={{}} activeTaskId={null}
    onTaskClick={() => {}} onTaskToggle={() => {}} onTaskReorder={() => {}} />)
  expect(screen.getByText('Sub1')).toBeInTheDocument()
})

test('renders empty state when no tasks', () => {
  render(<TaskList tasks={[]} subtasks={[]} tags={[]} pomodoroStats={{}} activeTaskId={null}
    onTaskClick={() => {}} onTaskToggle={() => {}} onTaskReorder={() => {}} />)
  expect(screen.getByText(/no tasks yet/i)).toBeInTheDocument()
})
```

- [ ] **Step 2: Run test to verify it fails**

```bash
npm test -- TaskList
```

- [ ] **Step 3: Implement TaskList**

```typescript
// src/features/tasks/TaskList.tsx
import {
  DndContext, closestCenter, PointerSensor, useSensor, useSensors,
  type DragEndEvent,
} from '@dnd-kit/core'
import {
  SortableContext, verticalListSortingStrategy, useSortable,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { TaskItem } from './TaskItem'
import { SubtaskItem } from './SubtaskItem'
import { EmptyState } from '../../components/EmptyState'
import type { Task, Tag, PomodoroStats } from '../../types'

interface TaskListProps {
  tasks: Task[]           // top-level tasks only
  subtasks: Task[]        // all subtasks (any parentId)
  tags: Tag[]
  pomodoroStats: Record<string, PomodoroStats>
  activeTaskId: string | null
  onTaskClick: (id: string) => void
  onTaskToggle: (id: string) => void
  onTaskReorder: (ids: string[]) => void
}

function SortableTaskItem(props: { task: Task; tags: Tag[]; pomodoroCount: number;
  isActive: boolean; subtasks: Task[];
  onTaskClick: (id: string) => void; onTaskToggle: (id: string) => void }) {
  const { attributes, listeners, setNodeRef, transform, transition } = useSortable({ id: props.task.id })
  const style = { transform: CSS.Transform.toString(transform), transition }
  const taskSubtasks = props.subtasks.filter(s => s.parentId === props.task.id)
    .sort((a, b) => a.order - b.order)

  return (
    <div ref={setNodeRef} style={style}>
      <TaskItem
        task={props.task}
        tags={props.tags}
        pomodoroCount={props.pomodoroCount}
        isActive={props.isActive}
        onClick={props.onTaskClick}
        onToggle={props.onTaskToggle}
        dragHandleProps={{ ...attributes, ...listeners }}
      />
      {taskSubtasks.length > 0 && (
        <div style={{ marginLeft: 24, borderLeft: '2px solid var(--border)', paddingLeft: 12, marginTop: 4 }}>
          {taskSubtasks.map(sub => (
            <SubtaskItem key={sub.id} task={sub} onClick={props.onTaskClick} onToggle={props.onTaskToggle} />
          ))}
        </div>
      )}
    </div>
  )
}

export function TaskList({ tasks, subtasks, tags, pomodoroStats, activeTaskId,
  onTaskClick, onTaskToggle, onTaskReorder }: TaskListProps) {
  const sensors = useSensors(useSensor(PointerSensor))
  const sorted = [...tasks].sort((a, b) => a.order - b.order)

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event
    if (!over || active.id === over.id) return
    const oldIndex = sorted.findIndex(t => t.id === active.id)
    const newIndex = sorted.findIndex(t => t.id === over.id)
    const reordered = [...sorted]
    const [moved] = reordered.splice(oldIndex, 1)
    reordered.splice(newIndex, 0, moved)
    onTaskReorder(reordered.map(t => t.id))
  }

  if (tasks.length === 0) {
    return <EmptyState message="No tasks yet. Add one above." />
  }

  return (
    <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
      <SortableContext items={sorted.map(t => t.id)} strategy={verticalListSortingStrategy}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          {sorted.map(task => (
            <SortableTaskItem
              key={task.id}
              task={task}
              tags={tags}
              pomodoroCount={pomodoroStats[task.id]?.totalCompleted ?? 0}
              isActive={activeTaskId === task.id}
              subtasks={subtasks}
              onTaskClick={onTaskClick}
              onTaskToggle={onTaskToggle}
            />
          ))}
        </div>
      </SortableContext>
    </DndContext>
  )
}
```

- [ ] **Step 4: Run test to verify it passes**

```bash
npm test -- TaskList
```

Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/features/tasks/TaskList.tsx src/features/tasks/TaskList.test.tsx
git commit -m "feat: add TaskList with dnd-kit drag-to-reorder and subtask rendering"
```

---

### Task 20: TagFilter component

**Files:**
- Create: `src/features/tasks/TagFilter.tsx`
- Test: `src/features/tasks/TagFilter.test.tsx`

- [ ] **Step 1: Write the failing test**

```typescript
// src/features/tasks/TagFilter.test.tsx
import { render, screen, fireEvent } from '@testing-library/react'
import { TagFilter } from './TagFilter'
import type { Tag } from '../../types'

const tags: Tag[] = [
  { id: 't1', name: 'work', color: '#3b82f6' },
  { id: 't2', name: 'study', color: '#8b5cf6' },
]

test('renders all tags as filter buttons', () => {
  render(<TagFilter tags={tags} selectedId={null} onSelect={() => {}} />)
  expect(screen.getByText('work')).toBeInTheDocument()
  expect(screen.getByText('study')).toBeInTheDocument()
})

test('calls onSelect with tag id when clicked', () => {
  const onSelect = vi.fn()
  render(<TagFilter tags={tags} selectedId={null} onSelect={onSelect} />)
  fireEvent.click(screen.getByText('work'))
  expect(onSelect).toHaveBeenCalledWith('t1')
})

test('calls onSelect(null) when active tag clicked again to deselect', () => {
  const onSelect = vi.fn()
  render(<TagFilter tags={tags} selectedId="t1" onSelect={onSelect} />)
  fireEvent.click(screen.getByText('work'))
  expect(onSelect).toHaveBeenCalledWith(null)
})
```

- [ ] **Step 2: Run test to verify it fails**

```bash
npm test -- TagFilter
```

- [ ] **Step 3: Implement TagFilter**

```typescript
// src/features/tasks/TagFilter.tsx
import type { Tag } from '../../types'

interface TagFilterProps {
  tags: Tag[]
  selectedId: string | null
  onSelect: (id: string | null) => void
}

export function TagFilter({ tags, selectedId, onSelect }: TagFilterProps) {
  if (tags.length === 0) return null

  return (
    <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
      {tags.map(tag => (
        <button
          key={tag.id}
          onClick={() => onSelect(selectedId === tag.id ? null : tag.id)}
          style={{
            padding: '3px 10px', borderRadius: 10, border: 'none', cursor: 'pointer',
            fontSize: 12, fontWeight: 500,
            background: selectedId === tag.id ? tag.color : 'var(--bg-secondary)',
            color: selectedId === tag.id ? '#fff' : 'var(--text-secondary)',
            outline: selectedId === tag.id ? `2px solid ${tag.color}` : '1px solid var(--border)',
          }}
        >
          {tag.name}
        </button>
      ))}
    </div>
  )
}
```

- [ ] **Step 4: Run test to verify it passes**

```bash
npm test -- TagFilter
```

Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/features/tasks/TagFilter.tsx src/features/tasks/TagFilter.test.tsx
git commit -m "feat: add TagFilter component"
```

---

### Task 21: TaskDetailPanel

**Files:**
- Create: `src/features/tasks/TaskDetailPanel.tsx`
- Test: `src/features/tasks/TaskDetailPanel.test.tsx`

- [ ] **Step 1: Write the failing test**

```typescript
// src/features/tasks/TaskDetailPanel.test.tsx
import { render, screen, fireEvent } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { TaskDetailPanel } from './TaskDetailPanel'
import type { Task, Tag, PomodoroSession, PomodoroStats } from '../../types'

const task: Task = {
  id: 't1', title: 'Design Homepage', description: 'Build the UI',
  completed: false, order: 1, tagIds: [], createdAt: '2026-01-01T00:00:00Z', updatedAt: '2026-01-01T00:00:00Z',
}
const stats: PomodoroStats = {
  taskId: 't1', totalStarted: 3, totalCompleted: 2,
  totalInterrupted: 1, totalMinutesFocused: 50,
  lastSessionAt: '2026-01-01T12:00:00Z', updatedAt: '2026-01-01T12:00:00Z',
}
const sessions: PomodoroSession[] = [
  { id: 's1', taskId: 't1', startedAt: '2026-01-01T10:00:00Z',
    completedAt: '2026-01-01T10:25:00Z', type: 'work', durationMinutes: 25 },
  { id: 's2', taskId: 't1', startedAt: '2026-01-01T11:00:00Z',
    completedAt: null, type: 'work', durationMinutes: 25 },
]

test('renders task title', () => {
  render(<TaskDetailPanel task={task} subtasks={[]} tags={[]} allTags={[]} linkedNotes={[]}
    pomodoroStats={stats} sessions={sessions}
    onClose={() => {}} onUpdate={() => {}} onAddSubtask={() => {}} onTagChange={() => {}} onTagCreate={() => {}} />)
  expect(screen.getByDisplayValue('Design Homepage')).toBeInTheDocument()
})

test('renders pomodoro summary', () => {
  render(<TaskDetailPanel task={task} subtasks={[]} tags={[]} allTags={[]} linkedNotes={[]}
    pomodoroStats={stats} sessions={sessions}
    onClose={() => {}} onUpdate={() => {}} onAddSubtask={() => {}} onTagChange={() => {}} onTagCreate={() => {}} />)
  expect(screen.getByText('Completed')).toBeInTheDocument()
  expect(screen.getByText('50')).toBeInTheDocument() // totalMinutesFocused value
})

test('renders session history with completed and interrupted labels', () => {
  render(<TaskDetailPanel task={task} subtasks={[]} tags={[]} allTags={[]} linkedNotes={[]}
    pomodoroStats={stats} sessions={sessions}
    onClose={() => {}} onUpdate={() => {}} onAddSubtask={() => {}} onTagChange={() => {}} onTagCreate={() => {}} />)
  expect(screen.getByText(/completed/i)).toBeInTheDocument()
  expect(screen.getByText(/interrupted/i)).toBeInTheDocument()
})

test('calls onClose when × button clicked', () => {
  const onClose = vi.fn()
  render(<TaskDetailPanel task={task} subtasks={[]} tags={[]} allTags={[]} linkedNotes={[]}
    pomodoroStats={stats} sessions={sessions}
    onClose={onClose} onUpdate={() => {}} onAddSubtask={() => {}} onTagChange={() => {}} onTagCreate={() => {}} />)
  fireEvent.click(screen.getByRole('button', { name: /close/i }))
  expect(onClose).toHaveBeenCalled()
})

test('calls onUpdate with new title on blur', async () => {
  const onUpdate = vi.fn()
  render(<TaskDetailPanel task={task} subtasks={[]} tags={[]} allTags={[]} linkedNotes={[]}
    pomodoroStats={stats} sessions={sessions}
    onClose={() => {}} onUpdate={onUpdate} onAddSubtask={() => {}} onTagChange={() => {}} onTagCreate={() => {}} />)
  const titleInput = screen.getByDisplayValue('Design Homepage')
  await userEvent.clear(titleInput)
  await userEvent.type(titleInput, 'New Title')
  fireEvent.blur(titleInput)
  expect(onUpdate).toHaveBeenCalledWith(expect.objectContaining({ title: 'New Title' }))
})
```

- [ ] **Step 2: Run test to verify it fails**

```bash
npm test -- TaskDetailPanel
```

- [ ] **Step 3: Implement TaskDetailPanel**

```typescript
// src/features/tasks/TaskDetailPanel.tsx
import { useState, useEffect } from 'react'
import { format } from 'date-fns'
import { AddTaskInput } from './AddTaskInput'
import { SubtaskItem } from './SubtaskItem'
import { TagInput } from '../tags/TagInput'
import type { Task, Tag, Note, PomodoroSession, PomodoroStats } from '../../types'

interface TaskDetailPanelProps {
  task: Task
  subtasks: Task[]
  tags: Tag[]
  allTags: Tag[]
  linkedNotes: Note[]
  pomodoroStats: PomodoroStats | null
  sessions: PomodoroSession[]
  onClose: () => void
  onUpdate: (partial: Partial<Task> & { id: string }) => void
  onAddSubtask: (parentId: string, title: string) => void
  onTagChange: (ids: string[]) => void
  onTagCreate: (name: string) => void
}

export function TaskDetailPanel({
  task, subtasks, tags, allTags, linkedNotes, pomodoroStats, sessions,
  onClose, onUpdate, onAddSubtask, onTagChange, onTagCreate,
}: TaskDetailPanelProps) {
  const [title, setTitle] = useState(task.title)
  const [description, setDescription] = useState(task.description ?? '')

  useEffect(() => {
    setTitle(task.title)
    setDescription(task.description ?? '')
  }, [task.id])

  const workSessions = sessions.filter(s => s.type === 'work')

  return (
    <aside style={{
      width: 360, borderLeft: '1px solid var(--border)', background: 'var(--bg-primary)',
      padding: 20, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 16,
    }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span style={{ fontWeight: 600, fontSize: 15 }}>Task Detail</span>
        <button aria-label="close" onClick={onClose}
          style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', fontSize: 18 }}>
          ×
        </button>
      </div>

      {/* Title */}
      <input
        value={title}
        onChange={e => setTitle(e.target.value)}
        onBlur={() => { if (title.trim() && title !== task.title) onUpdate({ id: task.id, title: title.trim() }) }}
        style={{ fontSize: 16, fontWeight: 600, background: 'transparent', border: 'none',
          borderBottom: '1px solid var(--border)', color: 'var(--text-primary)', outline: 'none',
          padding: '4px 0', width: '100%' }}
      />

      {/* Description */}
      <textarea
        value={description}
        onChange={e => setDescription(e.target.value)}
        onBlur={() => { if (description !== (task.description ?? '')) onUpdate({ id: task.id, description }) }}
        placeholder="Add description..."
        rows={3}
        style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border)', borderRadius: 6,
          color: 'var(--text-primary)', padding: 8, fontSize: 13, resize: 'vertical', outline: 'none' }}
      />

      {/* Tags */}
      <div>
        <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 6, textTransform: 'uppercase' }}>Tags</div>
        <TagInput allTags={allTags} selectedIds={task.tagIds} onChange={onTagChange} onTagCreate={onTagCreate} />
      </div>

      {/* Scheduled day */}
      <div>
        <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 6, textTransform: 'uppercase' }}>Scheduled Day</div>
        <input
          type="date"
          value={task.scheduledDay ?? ''}
          onChange={e => onUpdate({ id: task.id, scheduledDay: e.target.value || undefined })}
          style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border)', borderRadius: 6,
            color: 'var(--text-primary)', padding: '5px 8px', fontSize: 13, outline: 'none' }}
        />
      </div>

      {/* Subtasks */}
      <div>
        <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 6, textTransform: 'uppercase' }}>Subtasks</div>
        {subtasks.map(sub => (
          <SubtaskItem key={sub.id} task={sub} onClick={() => {}} onToggle={(id) => onUpdate({ id, completed: !sub.completed })} />
        ))}
        <AddTaskInput onAdd={(title) => onAddSubtask(task.id, title)} placeholder="+ Add subtask..." />
      </div>

      {/* Pomodoro stats */}
      {pomodoroStats && (
        <div>
          <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 8, textTransform: 'uppercase' }}>Pomodoro Stats</div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
            {[
              ['Started', pomodoroStats.totalStarted],
              ['Completed', pomodoroStats.totalCompleted],
              ['Interrupted', pomodoroStats.totalInterrupted],
              ['Min focused', pomodoroStats.totalMinutesFocused],
            ].map(([label, val]) => (
              <div key={String(label)} style={{ background: 'var(--bg-secondary)', borderRadius: 6, padding: 8 }}>
                <div style={{ fontSize: 18, fontWeight: 700, color: 'var(--accent)' }}>{val}</div>
                <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{label}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Session history */}
      {workSessions.length > 0 && (
        <div>
          <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 6, textTransform: 'uppercase' }}>Session History</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            {workSessions.map(s => (
              <div key={s.id} style={{ background: 'var(--bg-secondary)', borderRadius: 6, padding: '6px 10px',
                display: 'flex', justifyContent: 'space-between', fontSize: 12 }}>
                <span style={{ color: 'var(--text-muted)' }}>
                  {format(new Date(s.startedAt), 'MMM d, HH:mm')}
                </span>
                <span style={{ color: s.completedAt ? 'var(--success)' : 'var(--text-muted)' }}>
                  {s.completedAt ? 'Completed' : 'Interrupted'}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Linked notes */}
      {linkedNotes.length > 0 && (
        <div>
          <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 6, textTransform: 'uppercase' }}>Referenced in Notes</div>
          {linkedNotes.map(note => (
            <div key={note.id} style={{ fontSize: 13, color: 'var(--accent)', padding: '4px 0' }}>{note.title}</div>
          ))}
        </div>
      )}
    </aside>
  )
}
```

- [ ] **Step 4: Run test to verify it passes**

```bash
npm test -- TaskDetailPanel
```

Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/features/tasks/TaskDetailPanel.tsx src/features/tasks/TaskDetailPanel.test.tsx
git commit -m "feat: add TaskDetailPanel with pomodoro stats, session history, subtasks, and linked notes"
```

---

### Task 22: TasksTab — wire everything together

**Files:**
- Create: `src/features/tasks/TasksTab.tsx`
- Test: `src/features/tasks/TasksTab.test.tsx`

- [ ] **Step 1: Write the failing test**

```typescript
// src/features/tasks/TasksTab.test.tsx
import { render, screen, fireEvent } from '@testing-library/react'
import { TasksTab } from './TasksTab'
import { useTaskStore } from '../../store/taskStore'
import { useTagStore } from '../../store/tagStore'
import { usePomodoroStore } from '../../store/pomodoroStore'

vi.mock('../../store/taskStore')
vi.mock('../../store/tagStore')
vi.mock('../../store/pomodoroStore')

const mockTasks = [
  { id: 't1', title: 'Alpha', completed: false, order: 1, tagIds: [], createdAt: '', updatedAt: '' },
]

beforeEach(() => {
  vi.mocked(useTaskStore).mockReturnValue({
    tasks: mockTasks, addTask: vi.fn(), updateTask: vi.fn(),
    reorderTasks: vi.fn(), loading: false,
  } as any)
  vi.mocked(useTagStore).mockReturnValue({ tags: [], addTag: vi.fn() } as any)
  vi.mocked(usePomodoroStore).mockReturnValue({
    activeSession: null, stats: {}, sessions: {},
  } as any)
})

test('renders task list and add input', () => {
  render(<TasksTab />)
  expect(screen.getByPlaceholderText('+ Add task...')).toBeInTheDocument()
  expect(screen.getByText('Alpha')).toBeInTheDocument()
})

test('opens detail panel when task is clicked', () => {
  render(<TasksTab />)
  fireEvent.click(screen.getByText('Alpha'))
  expect(screen.getByText('Task Detail')).toBeInTheDocument()
})

test('closes detail panel when × clicked', () => {
  render(<TasksTab />)
  fireEvent.click(screen.getByText('Alpha'))
  fireEvent.click(screen.getByRole('button', { name: /close/i }))
  expect(screen.queryByText('Task Detail')).not.toBeInTheDocument()
})
```

- [ ] **Step 2: Run test to verify it fails**

```bash
npm test -- TasksTab
```

- [ ] **Step 3: Implement TasksTab**

```typescript
// src/features/tasks/TasksTab.tsx
import { useState } from 'react'
import { nanoid } from 'nanoid'
import { AddTaskInput } from './AddTaskInput'
import { TaskList } from './TaskList'
import { TagFilter } from './TagFilter'
import { TaskDetailPanel } from './TaskDetailPanel'
import { useTaskStore } from '../../store/taskStore'
import { useTagStore } from '../../store/tagStore'
import { usePomodoroStore } from '../../store/pomodoroStore'
import { getOrderBetween, needsReindex, reindexGroup } from '../../lib/orderUtils'
import type { Task } from '../../types'

export function TasksTab() {
  const { tasks, addTask, updateTask, reorderTasks } = useTaskStore()
  const { tags, addTag } = useTagStore()
  const { activeSession, stats, sessions } = usePomodoroStore()

  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null)
  const [filterTagId, setFilterTagId] = useState<string | null>(null)

  const topLevelTasks = tasks.filter(t => !t.parentId)
  const subtasks = tasks.filter(t => !!t.parentId)

  const filteredTopLevel = filterTagId
    ? topLevelTasks.filter(t => t.tagIds.includes(filterTagId))
    : topLevelTasks

  const selectedTask = tasks.find(t => t.id === selectedTaskId) ?? null
  const selectedSubtasks = selectedTask ? subtasks.filter(s => s.parentId === selectedTask.id) : []
  const selectedSessions = selectedTask ? (sessions[selectedTask.id] ?? []) : []
  const selectedStats = selectedTask ? (stats[selectedTask.id] ?? null) : null

  async function handleAddTask(title: string) {
    const lastOrder = topLevelTasks.length > 0 ? Math.max(...topLevelTasks.map(t => t.order)) : 0
    const order = getOrderBetween(lastOrder, null)
    const ts = new Date().toISOString()
    const task: Task = {
      id: nanoid(), title, completed: false, order, tagIds: [],
      createdAt: ts, updatedAt: ts,
    }
    await addTask(task)
  }

  async function handleAddSubtask(parentId: string, title: string) {
    const siblings = subtasks.filter(s => s.parentId === parentId)
    const lastOrder = siblings.length > 0 ? Math.max(...siblings.map(s => s.order)) : 0
    const order = getOrderBetween(lastOrder, null)
    const ts = new Date().toISOString()
    const task: Task = {
      id: nanoid(), title, completed: false, order, tagIds: [],
      parentId, createdAt: ts, updatedAt: ts,
    }
    await addTask(task)
  }

  async function handleReorder(orderedIds: string[]) {
    // After reorder, check for order collision and re-index if needed
    await reorderTasks(orderedIds, null)
    const updatedTasks = topLevelTasks.filter(t => orderedIds.includes(t.id))
    const orders = updatedTasks.map(t => t.order)
    if (needsReindex(orders)) {
      const idToOrder = new Map(updatedTasks.map(t => [t.id, t.order]))
      const reindexed = reindexGroup(orderedIds, idToOrder)
      await Promise.all([...reindexed.entries()].map(([id, order]) => updateTask({ id, order })))
    }
  }

  async function handleTagCreate(name: string) {
    const newTag = await addTag({ id: nanoid(), name, color: '#3b82f6' })
    if (selectedTask) {
      await updateTask({ id: selectedTask.id, tagIds: [...selectedTask.tagIds, newTag.id] })
    }
  }

  return (
    <div style={{ display: 'flex', height: '100%', overflow: 'hidden' }}>
      <div style={{ flex: 1, padding: 16, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 12 }}>
        <AddTaskInput onAdd={handleAddTask} />
        <TagFilter tags={tags} selectedId={filterTagId} onSelect={setFilterTagId} />
        <TaskList
          tasks={filteredTopLevel}
          subtasks={subtasks}
          tags={tags}
          pomodoroStats={stats}
          activeTaskId={activeSession?.taskId ?? null}
          onTaskClick={setSelectedTaskId}
          onTaskToggle={(id) => {
            const t = tasks.find(x => x.id === id)
            if (t) updateTask({ id, completed: !t.completed })
          }}
          onTaskReorder={handleReorder}
        />
      </div>

      {selectedTask && (
        <TaskDetailPanel
          task={selectedTask}
          subtasks={selectedSubtasks}
          tags={tags.filter(tg => selectedTask.tagIds.includes(tg.id))}
          allTags={tags}
          linkedNotes={[]}
          pomodoroStats={selectedStats}
          sessions={selectedSessions}
          onClose={() => setSelectedTaskId(null)}
          onUpdate={updateTask}
          onAddSubtask={handleAddSubtask}
          onTagChange={(ids) => updateTask({ id: selectedTask.id, tagIds: ids })}
          onTagCreate={handleTagCreate}
        />
      )}
    </div>
  )
}
```

- [ ] **Step 4: Run test to verify it passes**

```bash
npm test -- TasksTab
```

Expected: PASS

- [ ] **Step 5: Run full test suite**

```bash
npm test
```

Expected: all tests pass.

- [ ] **Step 6: Commit**

```bash
git add src/features/tasks/
git commit -m "feat: add TasksTab — full task management with filtering, detail panel, and subtasks"
```

---

## Chunk 5: Schedule Feature

### Task 23: WeekNavigation component

**Files:**
- Create: `src/features/schedule/WeekNavigation.tsx`
- Test: `src/features/schedule/WeekNavigation.test.tsx`

- [ ] **Step 1: Write the failing test**

```typescript
// src/features/schedule/WeekNavigation.test.tsx
import { render, screen, fireEvent } from '@testing-library/react'
import { WeekNavigation } from './WeekNavigation'

// Week of 2026-03-16 (Mon) → 2026-03-22 (Sun)
const weekStart = new Date('2026-03-16')

test('renders week label', () => {
  render(<WeekNavigation weekStart={weekStart} onPrev={() => {}} onNext={() => {}} />)
  expect(screen.getByText(/mar 16/i)).toBeInTheDocument()
})

test('calls onPrev when ← clicked', () => {
  const onPrev = vi.fn()
  render(<WeekNavigation weekStart={weekStart} onPrev={onPrev} onNext={() => {}} />)
  fireEvent.click(screen.getByRole('button', { name: /previous week/i }))
  expect(onPrev).toHaveBeenCalled()
})

test('calls onNext when → clicked', () => {
  const onNext = vi.fn()
  render(<WeekNavigation weekStart={weekStart} onPrev={() => {}} onNext={onNext} />)
  fireEvent.click(screen.getByRole('button', { name: /next week/i }))
  expect(onNext).toHaveBeenCalled()
})
```

- [ ] **Step 2: Run test to verify it fails**

```bash
npm test -- WeekNavigation
```

- [ ] **Step 3: Implement WeekNavigation**

```typescript
// src/features/schedule/WeekNavigation.tsx
import { format, addDays } from 'date-fns'

interface WeekNavigationProps {
  weekStart: Date
  onPrev: () => void
  onNext: () => void
}

export function WeekNavigation({ weekStart, onPrev, onNext }: WeekNavigationProps) {
  const weekEnd = addDays(weekStart, 6)
  const label = `${format(weekStart, 'MMM d')} – ${format(weekEnd, 'MMM d, yyyy')}`

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
      <button
        aria-label="previous week"
        onClick={onPrev}
        style={{ background: 'none', border: '1px solid var(--border)', borderRadius: 6,
          color: 'var(--text-primary)', padding: '4px 10px', cursor: 'pointer' }}
      >
        ←
      </button>
      <span style={{ fontSize: 14, fontWeight: 600, minWidth: 160, textAlign: 'center' }}>{label}</span>
      <button
        aria-label="next week"
        onClick={onNext}
        style={{ background: 'none', border: '1px solid var(--border)', borderRadius: 6,
          color: 'var(--text-primary)', padding: '4px 10px', cursor: 'pointer' }}
      >
        →
      </button>
    </div>
  )
}
```

- [ ] **Step 4: Run test to verify it passes**

```bash
npm test -- WeekNavigation
```

Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/features/schedule/WeekNavigation.tsx src/features/schedule/WeekNavigation.test.tsx
git commit -m "feat: add WeekNavigation component"
```

---

### Task 24: ScheduleTaskCard and DayColumn

**Files:**
- Create: `src/features/schedule/ScheduleTaskCard.tsx`
- Create: `src/features/schedule/DayColumn.tsx`
- Test: `src/features/schedule/DayColumn.test.tsx`

- [ ] **Step 1: Write the failing test**

```typescript
// src/features/schedule/DayColumn.test.tsx
import { render, screen, fireEvent } from '@testing-library/react'
import { DayColumn } from './DayColumn'
import type { Task } from '../../types'

const task: Task = {
  id: 't1', title: 'Design Homepage', completed: false, order: 1, tagIds: [],
  scheduledDay: '2026-03-16', createdAt: '', updatedAt: '',
}

test('renders day header and task card', () => {
  render(<DayColumn day="2026-03-16" label="MON" tasks={[task]} tags={[]}
    onTaskClick={() => {}} onRemoveDay={() => {}} />)
  expect(screen.getByText('MON')).toBeInTheDocument()
  expect(screen.getByText('Design Homepage')).toBeInTheDocument()
})

test('calls onRemoveDay when × clicked on task card', () => {
  const onRemoveDay = vi.fn()
  render(<DayColumn day="2026-03-16" label="MON" tasks={[task]} tags={[]}
    onTaskClick={() => {}} onRemoveDay={onRemoveDay} />)
  fireEvent.click(screen.getByRole('button', { name: /remove from day/i }))
  expect(onRemoveDay).toHaveBeenCalledWith('t1')
})

test('shows dashed border when empty', () => {
  render(<DayColumn day="2026-03-17" label="TUE" tasks={[]} tags={[]}
    onTaskClick={() => {}} onRemoveDay={() => {}} />)
  const col = screen.getByTestId('day-column-2026-03-17')
  expect(col).toHaveStyle({ border: '1px dashed' })
})
```

- [ ] **Step 2: Run test to verify it fails**

```bash
npm test -- DayColumn
```

- [ ] **Step 3: Implement ScheduleTaskCard and DayColumn**

```typescript
// src/features/schedule/ScheduleTaskCard.tsx
import { useDroppable } from '@dnd-kit/core'
import { useDraggable } from '@dnd-kit/core'
import type { Task, Tag } from '../../types'
import { TagBadge } from '../../components/TagBadge'

interface ScheduleTaskCardProps {
  task: Task
  tags: Tag[]
  onClick: (id: string) => void
  onRemoveDay: (id: string) => void
}

export function ScheduleTaskCard({ task, tags, onClick, onRemoveDay }: ScheduleTaskCardProps) {
  const { attributes, listeners, setNodeRef, transform } = useDraggable({ id: task.id })
  const taskTags = tags.filter(t => task.tagIds.includes(t.id))
  const style = transform
    ? { transform: `translate(${transform.x}px, ${transform.y}px)`, zIndex: 100, opacity: 0.9 }
    : {}

  return (
    <div
      ref={setNodeRef}
      style={{
        background: 'var(--bg-primary)', border: '1px solid var(--border)', borderRadius: 6,
        padding: '6px 8px', marginBottom: 4, position: 'relative', ...style,
      }}
    >
      <div {...attributes} {...listeners} style={{ cursor: 'grab' }}>
        <div
          onClick={() => onClick(task.id)}
          style={{ fontSize: 12, cursor: 'pointer',
            textDecoration: task.completed ? 'line-through' : 'none',
            color: task.completed ? 'var(--text-muted)' : 'var(--text-primary)' }}
        >
          {task.title}
        </div>
        {taskTags.length > 0 && (
          <div style={{ display: 'flex', gap: 3, marginTop: 3, flexWrap: 'wrap' }}>
            {taskTags.map(tag => <TagBadge key={tag.id} tag={tag} />)}
          </div>
        )}
      </div>
      <button
        aria-label="remove from day"
        onClick={(e) => { e.stopPropagation(); onRemoveDay(task.id) }}
        style={{
          position: 'absolute', top: 4, right: 4, background: 'none', border: 'none',
          color: 'var(--text-muted)', cursor: 'pointer', fontSize: 14, lineHeight: 1,
          opacity: 0, transition: 'opacity 0.1s',
        }}
        onMouseEnter={e => (e.currentTarget.style.opacity = '1')}
        onMouseLeave={e => (e.currentTarget.style.opacity = '0')}
      >
        ×
      </button>
    </div>
  )
}
```

```typescript
// src/features/schedule/DayColumn.tsx
import { useDroppable } from '@dnd-kit/core'
import { ScheduleTaskCard } from './ScheduleTaskCard'
import type { Task, Tag } from '../../types'

interface DayColumnProps {
  day: string    // YYYY-MM-DD
  label: string  // e.g. "MON"
  tasks: Task[]
  tags: Tag[]
  onTaskClick: (id: string) => void
  onRemoveDay: (id: string) => void
  isToday?: boolean
}

export function DayColumn({ day, label, tasks, tags, onTaskClick, onRemoveDay, isToday }: DayColumnProps) {
  const { setNodeRef, isOver } = useDroppable({ id: `day-${day}` })

  return (
    <div
      ref={setNodeRef}
      data-testid={`day-column-${day}`}
      style={{
        flex: 1, minWidth: 0, background: isOver ? 'var(--bg-secondary)' : 'transparent',
        borderRadius: 8, padding: 8,
        border: tasks.length === 0 ? '1px dashed var(--border)' : '1px solid transparent',
        minHeight: 120, transition: 'background 0.1s',
      }}
    >
      <div style={{ fontSize: 11, fontWeight: 600, marginBottom: 8, textAlign: 'center',
        color: isToday ? 'var(--accent)' : 'var(--text-muted)' }}>
        {label}
      </div>
      {tasks.map(task => (
        <ScheduleTaskCard
          key={task.id}
          task={task}
          tags={tags}
          onClick={onTaskClick}
          onRemoveDay={onRemoveDay}
        />
      ))}
    </div>
  )
}
```

- [ ] **Step 4: Run test to verify it passes**

```bash
npm test -- DayColumn
```

Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/features/schedule/ScheduleTaskCard.tsx src/features/schedule/DayColumn.tsx src/features/schedule/DayColumn.test.tsx
git commit -m "feat: add ScheduleTaskCard and DayColumn with dnd-kit droppable zones"
```

---

### Task 25: UnscheduledPanel

**Files:**
- Create: `src/features/schedule/UnscheduledPanel.tsx`
- Test: `src/features/schedule/UnscheduledPanel.test.tsx`

- [ ] **Step 1: Write the failing test**

```typescript
// src/features/schedule/UnscheduledPanel.test.tsx
import { render, screen, fireEvent } from '@testing-library/react'
import { UnscheduledPanel } from './UnscheduledPanel'
import type { Task } from '../../types'

const tasks: Task[] = [
  { id: 't1', title: 'Write tests', completed: false, order: 1, tagIds: [], createdAt: '', updatedAt: '' },
  { id: 't2', title: 'Deploy app', completed: false, order: 2, tagIds: [], createdAt: '', updatedAt: '' },
]

test('renders unscheduled task titles', () => {
  render(<UnscheduledPanel tasks={tasks} tags={[]} onTaskClick={() => {}} />)
  expect(screen.getByText('Write tests')).toBeInTheDocument()
  expect(screen.getByText('Deploy app')).toBeInTheDocument()
})

test('is collapsible', () => {
  render(<UnscheduledPanel tasks={tasks} tags={[]} onTaskClick={() => {}} />)
  // Initially expanded
  expect(screen.getByText('Write tests')).toBeVisible()
  // Collapse
  fireEvent.click(screen.getByRole('button', { name: /unscheduled/i }))
  expect(screen.queryByText('Write tests')).not.toBeInTheDocument()
})
```

- [ ] **Step 2: Run test to verify it fails**

```bash
npm test -- UnscheduledPanel
```

- [ ] **Step 3: Implement UnscheduledPanel**

```typescript
// src/features/schedule/UnscheduledPanel.tsx
import { useState } from 'react'
import { useDraggable, useDroppable } from '@dnd-kit/core'
import type { Task, Tag } from '../../types'

function DraggableCard({ task, onTaskClick }: { task: Task; onTaskClick: (id: string) => void }) {
  const { attributes, listeners, setNodeRef, transform } = useDraggable({ id: `unscheduled-${task.id}` })
  const style = transform ? { transform: `translate(${transform.x}px, ${transform.y}px)` } : {}
  return (
    <div ref={setNodeRef} {...attributes} {...listeners} onClick={() => onTaskClick(task.id)}
      style={{ background: 'var(--bg-primary)', border: '1px solid var(--border)',
        borderRadius: 6, padding: '6px 10px', marginBottom: 4, cursor: 'grab', fontSize: 12, ...style }}>
      {task.title}
    </div>
  )
}

interface UnscheduledPanelProps {
  tasks: Task[]
  tags: Tag[]
  onTaskClick: (id: string) => void
}

export function UnscheduledPanel({ tasks, tags, onTaskClick }: UnscheduledPanelProps) {
  const [open, setOpen] = useState(true)
  const { setNodeRef, isOver } = useDroppable({ id: 'unscheduled' })

  return (
    <div style={{ width: 200, borderRight: '1px solid var(--border)', padding: '12px 8px', flexShrink: 0 }}>
      <button
        aria-label="unscheduled tasks"
        onClick={() => setOpen(!open)}
        style={{ background: 'none', border: 'none', cursor: 'pointer', width: '100%',
          textAlign: 'left', display: 'flex', justifyContent: 'space-between',
          color: 'var(--text-muted)', fontSize: 11, fontWeight: 600,
          textTransform: 'uppercase', marginBottom: 8, padding: 0 }}
      >
        <span>Unscheduled ({tasks.length})</span>
        <span>{open ? '▲' : '▼'}</span>
      </button>
      {open && (
        <div ref={setNodeRef} style={{ minHeight: 60,
          background: isOver ? 'var(--bg-secondary)' : 'transparent', borderRadius: 6 }}>
          {tasks.map(task => (
            <DraggableCard key={task.id} task={task} onTaskClick={onTaskClick} />
          ))}
        </div>
      )}
    </div>
  )
}
```

- [ ] **Step 4: Run test to verify it passes**

```bash
npm test -- UnscheduledPanel
```

Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/features/schedule/UnscheduledPanel.tsx src/features/schedule/UnscheduledPanel.test.tsx
git commit -m "feat: add UnscheduledPanel with drag source and collapsible state"
```

---

### Task 26: ScheduleTab — wire kanban together

**Files:**
- Create: `src/features/schedule/ScheduleTab.tsx`
- Test: `src/features/schedule/ScheduleTab.test.tsx`

- [ ] **Step 1: Write the failing test**

```typescript
// src/features/schedule/ScheduleTab.test.tsx
import { render, screen } from '@testing-library/react'
import { ScheduleTab } from './ScheduleTab'
import { useTaskStore } from '../../store/taskStore'
import { useTagStore } from '../../store/tagStore'

vi.mock('../../store/taskStore')
vi.mock('../../store/tagStore')

const mockTasks = [
  { id: 't1', title: 'Design', completed: false, order: 1, tagIds: [],
    scheduledDay: '2026-03-16', createdAt: '', updatedAt: '' },
  { id: 't2', title: 'Unscheduled Task', completed: false, order: 2, tagIds: [],
    createdAt: '', updatedAt: '' },
]

beforeEach(() => {
  vi.mocked(useTaskStore).mockReturnValue({ tasks: mockTasks, updateTask: vi.fn(), loading: false } as any)
  vi.mocked(useTagStore).mockReturnValue({ tags: [] } as any)
  // Mock date to be 2026-03-16 (Monday)
  vi.setSystemTime(new Date('2026-03-16'))
})

afterEach(() => vi.useRealTimers())

test('renders 7 day columns', () => {
  render(<ScheduleTab />)
  expect(screen.getByText('MON')).toBeInTheDocument()
  expect(screen.getByText('SUN')).toBeInTheDocument()
})

test('renders unscheduled panel with unscheduled tasks', () => {
  render(<ScheduleTab />)
  expect(screen.getByText('Unscheduled Task')).toBeInTheDocument()
})

test('renders scheduled task in correct day column', () => {
  render(<ScheduleTab />)
  expect(screen.getByText('Design')).toBeInTheDocument()
})
```

- [ ] **Step 2: Run test to verify it fails**

```bash
npm test -- ScheduleTab
```

- [ ] **Step 3: Implement ScheduleTab**

```typescript
// src/features/schedule/ScheduleTab.tsx
import { useState, useCallback } from 'react'
import { DndContext, type DragEndEvent, PointerSensor, useSensor, useSensors } from '@dnd-kit/core'
import { startOfISOWeek, addWeeks, addDays, format, isToday } from 'date-fns'
import { WeekNavigation } from './WeekNavigation'
import { DayColumn } from './DayColumn'
import { UnscheduledPanel } from './UnscheduledPanel'
import { useTaskStore } from '../../store/taskStore'
import { useTagStore } from '../../store/tagStore'

const DAY_LABELS = ['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT', 'SUN']

export function ScheduleTab() {
  const { tasks, updateTask } = useTaskStore()
  const { tags } = useTagStore()
  const sensors = useSensors(useSensor(PointerSensor))

  const [weekOffset, setWeekOffset] = useState(0)
  const weekStart = addWeeks(startOfISOWeek(new Date()), weekOffset)

  const days = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i))
  const dayStrings = days.map(d => format(d, 'yyyy-MM-dd'))

  const scheduledThisWeek = tasks.filter(t => t.scheduledDay && dayStrings.includes(t.scheduledDay))
  const unscheduled = tasks.filter(t => !t.scheduledDay && !t.parentId)

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event
    if (!over) return

    const taskId = String(active.id).replace('unscheduled-', '')
    const overId = String(over.id)

    if (overId.startsWith('day-')) {
      const day = overId.replace('day-', '')
      updateTask({ id: taskId, scheduledDay: day })
    } else if (overId === 'unscheduled') {
      updateTask({ id: taskId, scheduledDay: undefined })
    }
  }

  return (
    <DndContext sensors={sensors} onDragEnd={handleDragEnd}>
      <div style={{ display: 'flex', flexDirection: 'column', height: '100%', padding: 16, gap: 12 }}>
        <WeekNavigation
          weekStart={weekStart}
          onPrev={() => setWeekOffset(o => o - 1)}
          onNext={() => setWeekOffset(o => o + 1)}
        />
        <div style={{ display: 'flex', flex: 1, gap: 0, overflow: 'hidden' }}>
          <UnscheduledPanel tasks={unscheduled} tags={tags} onTaskClick={() => {}} />
          <div style={{ flex: 1, display: 'flex', gap: 4, overflowX: 'auto', padding: '0 8px' }}>
            {days.map((day, i) => (
              <DayColumn
                key={dayStrings[i]}
                day={dayStrings[i]}
                label={DAY_LABELS[i]}
                tasks={scheduledThisWeek.filter(t => t.scheduledDay === dayStrings[i])}
                tags={tags}
                isToday={isToday(day)}
                onTaskClick={() => {}}
                onRemoveDay={(id) => updateTask({ id, scheduledDay: undefined })}
              />
            ))}
          </div>
        </div>
      </div>
    </DndContext>
  )
}
```

- [ ] **Step 4: Run test to verify it passes**

```bash
npm test -- ScheduleTab
```

Expected: PASS

- [ ] **Step 5: Run full test suite**

```bash
npm test
```

Expected: all tests pass.

- [ ] **Step 6: Commit**

```bash
git add src/features/schedule/
git commit -m "feat: add ScheduleTab — 7-day kanban with drag-and-drop scheduling"
```

---

## Chunk 6: Notes Feature

### Task 27: TaskMentionExtension (TipTap @-mention)

**Files:**
- Create: `src/features/notes/TaskMentionExtension.ts`
- Test: `src/features/notes/TaskMentionExtension.test.ts`

- [ ] **Step 1: Write the failing test**

```typescript
// src/features/notes/TaskMentionExtension.test.ts
import { shouldOpenPicker } from './TaskMentionExtension'

test('returns true when @ follows whitespace', () => {
  expect(shouldOpenPicker('hello @', '@')).toBe(true)
})

test('returns true when @ is at start of line', () => {
  expect(shouldOpenPicker('@', '@')).toBe(true)
})

test('returns false when @ is mid-word (e.g. email@)', () => {
  expect(shouldOpenPicker('email@', '@')).toBe(false)
})

test('returns false when triggered character is not @', () => {
  expect(shouldOpenPicker('hello ', 'a')).toBe(false)
})
```

- [ ] **Step 2: Run test to verify it fails**

```bash
npm test -- TaskMentionExtension
```

- [ ] **Step 3: Implement TaskMentionExtension**

```typescript
// src/features/notes/TaskMentionExtension.ts
import { Extension } from '@tiptap/core'
import { PluginKey } from '@tiptap/pm/state'
import Suggestion from '@tiptap/suggestion'

export const TASK_MENTION_PLUGIN_KEY = new PluginKey('taskMention')

/**
 * Returns true if the @ character should trigger the task picker.
 * Rules: @ must be at start of text OR immediately follow whitespace.
 */
export function shouldOpenPicker(textBeforeCursor: string, char: string): boolean {
  if (char !== '@') return false
  if (textBeforeCursor === '@') return true
  const beforeAt = textBeforeCursor.slice(0, -1)
  return beforeAt.length === 0 || /\s$/.test(beforeAt)
}

export interface TaskMentionOptions {
  // Injected by the NotesTab — returns suggestion items matching query
  suggestion: {
    items: (params: { query: string }) => { id: string; title: string }[]
    render: () => {
      onStart: (props: unknown) => void
      onUpdate: (props: unknown) => void
      onKeyDown: (props: { event: KeyboardEvent }) => boolean
      onExit: () => void
    }
    command: (props: { editor: unknown; range: unknown; props: unknown }) => void
  }
}

export const TaskMentionExtension = Extension.create<TaskMentionOptions>({
  name: 'taskMention',

  addOptions() {
    return {
      suggestion: {
        items: () => [],
        render: () => ({ onStart: () => {}, onUpdate: () => {}, onKeyDown: () => false, onExit: () => {} }),
        command: () => {},
      },
    }
  },

  addProseMirrorPlugins() {
    return [
      Suggestion({
        editor: this.editor,
        char: '@',
        pluginKey: TASK_MENTION_PLUGIN_KEY,
        allow: ({ state, range }) => {
          const $from = state.doc.resolve(range.from)
          const textBefore = $from.parent.textContent.slice(0, $from.parentOffset)
          return shouldOpenPicker(textBefore + '@', '@')
        },
        ...this.options.suggestion,
      }),
    ]
  },
})
```

- [ ] **Step 4: Run test to verify it passes**

```bash
npm test -- TaskMentionExtension
```

Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/features/notes/TaskMentionExtension.ts src/features/notes/TaskMentionExtension.test.ts
git commit -m "feat: add TaskMentionExtension with @ trigger logic"
```

---

### Task 28: TaskChip NodeView

**Files:**
- Create: `src/features/notes/TaskChipNode.ts`
- Create: `src/features/notes/TaskChip.tsx`
- Test: `src/features/notes/TaskChip.test.tsx`

- [ ] **Step 1: Write the failing test**

```typescript
// src/features/notes/TaskChip.test.tsx
import { render, screen, fireEvent } from '@testing-library/react'
import { TaskChip } from './TaskChip'

test('renders task title and completion badge when task found', () => {
  render(<TaskChip taskId="t1" taskTitle="Design Homepage" completed={false} onClick={() => {}} />)
  expect(screen.getByText('Design Homepage')).toBeInTheDocument()
  expect(screen.getByText('○')).toBeInTheDocument()
})

test('renders completed badge when task is done', () => {
  render(<TaskChip taskId="t1" taskTitle="Design Homepage" completed={true} onClick={() => {}} />)
  expect(screen.getByText('✓')).toBeInTheDocument()
})

test('renders tombstone when task is deleted', () => {
  render(<TaskChip taskId="t99" taskTitle={null} completed={false} onClick={() => {}} />)
  expect(screen.getByText(/deleted task/i)).toBeInTheDocument()
})

test('calls onClick with taskId when clicked', () => {
  const onClick = vi.fn()
  render(<TaskChip taskId="t1" taskTitle="Alpha" completed={false} onClick={onClick} />)
  fireEvent.click(screen.getByText('Alpha'))
  expect(onClick).toHaveBeenCalledWith('t1')
})
```

- [ ] **Step 2: Run test to verify it fails**

```bash
npm test -- TaskChip
```

- [ ] **Step 3: Implement TaskChip and TaskChipNode**

```typescript
// src/features/notes/TaskChip.tsx
interface TaskChipProps {
  taskId: string
  taskTitle: string | null   // null = deleted task
  completed: boolean
  onClick: (id: string) => void
}

export function TaskChip({ taskId, taskTitle, completed, onClick }: TaskChipProps) {
  if (!taskTitle) {
    return (
      <span style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border)',
        borderRadius: 4, padding: '1px 6px', fontSize: 12, color: 'var(--text-muted)',
        fontStyle: 'italic' }}>
        Deleted task
      </span>
    )
  }

  return (
    <span
      onClick={() => onClick(taskId)}
      style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border)',
        borderRadius: 4, padding: '1px 8px', fontSize: 12, cursor: 'pointer',
        color: 'var(--accent)', display: 'inline-flex', alignItems: 'center', gap: 4 }}
    >
      <span style={{ color: completed ? 'var(--success)' : 'var(--text-muted)' }}>
        {completed ? '✓' : '○'}
      </span>
      {taskTitle}
    </span>
  )
}
```

```typescript
// src/features/notes/TaskChipNode.ts
import { Node, mergeAttributes } from '@tiptap/core'
import { ReactNodeViewRenderer } from '@tiptap/react'

export const TaskChipNode = Node.create({
  name: 'taskChip',
  group: 'inline',
  inline: true,
  atom: true,

  addAttributes() {
    return {
      taskId: { default: null },
      taskTitle: { default: null },
      completed: { default: false },
    }
  },

  parseHTML() {
    return [{ tag: 'span[data-task-chip]' }]
  },

  renderHTML({ HTMLAttributes }) {
    return ['span', mergeAttributes(HTMLAttributes, { 'data-task-chip': '' })]
  },

  // NodeView renderer is injected at editor level with access to task store
})
```

- [ ] **Step 4: Run test to verify it passes**

```bash
npm test -- TaskChip
```

Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/features/notes/TaskChip.tsx src/features/notes/TaskChipNode.ts src/features/notes/TaskChip.test.tsx
git commit -m "feat: add TaskChip component and TaskChipNode TipTap extension"
```

---

### Task 29: NoteList sidebar

**Files:**
- Create: `src/features/notes/NoteList.tsx`
- Test: `src/features/notes/NoteList.test.tsx`

- [ ] **Step 1: Write the failing test**

```typescript
// src/features/notes/NoteList.test.tsx
import { render, screen, fireEvent } from '@testing-library/react'
import { NoteList } from './NoteList'
import type { Note } from '../../types'

const notes: Note[] = [
  { id: 'n1', title: 'Q2 Planning', content: '', tagIds: [], linkedTaskIds: [], createdAt: '', updatedAt: '' },
  { id: 'n2', title: 'Meeting Notes', content: '', tagIds: [], linkedTaskIds: [], createdAt: '', updatedAt: '' },
]

test('renders all note titles', () => {
  render(<NoteList notes={notes} selectedId="n1" onSelect={() => {}} onNew={() => {}} />)
  expect(screen.getByText('Q2 Planning')).toBeInTheDocument()
  expect(screen.getByText('Meeting Notes')).toBeInTheDocument()
})

test('calls onSelect when note title clicked', () => {
  const onSelect = vi.fn()
  render(<NoteList notes={notes} selectedId={null} onSelect={onSelect} onNew={() => {}} />)
  fireEvent.click(screen.getByText('Meeting Notes'))
  expect(onSelect).toHaveBeenCalledWith('n2')
})

test('calls onNew when + New note clicked', () => {
  const onNew = vi.fn()
  render(<NoteList notes={notes} selectedId={null} onSelect={() => {}} onNew={onNew} />)
  fireEvent.click(screen.getByText('+ New note'))
  expect(onNew).toHaveBeenCalled()
})

test('shows empty state when no notes', () => {
  render(<NoteList notes={[]} selectedId={null} onSelect={() => {}} onNew={() => {}} />)
  expect(screen.getByText(/no notes yet/i)).toBeInTheDocument()
})
```

- [ ] **Step 2: Run test to verify it fails**

```bash
npm test -- NoteList
```

- [ ] **Step 3: Implement NoteList**

```typescript
// src/features/notes/NoteList.tsx
import type { Note } from '../../types'

interface NoteListProps {
  notes: Note[]
  selectedId: string | null
  onSelect: (id: string) => void
  onNew: () => void
}

export function NoteList({ notes, selectedId, onSelect, onNew }: NoteListProps) {
  return (
    <div style={{ width: 200, borderRight: '1px solid var(--border)', padding: '12px 8px',
      display: 'flex', flexDirection: 'column', flexShrink: 0, overflowY: 'auto' }}>
      <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 8,
        textTransform: 'uppercase', fontWeight: 600 }}>
        Notes
      </div>

      {notes.length === 0 && (
        <div style={{ fontSize: 12, color: 'var(--text-muted)', padding: '8px 4px' }}>
          No notes yet.
        </div>
      )}

      {notes.map(note => (
        <div
          key={note.id}
          onClick={() => onSelect(note.id)}
          style={{
            padding: '6px 8px', borderRadius: 6, cursor: 'pointer', fontSize: 13,
            background: selectedId === note.id ? 'var(--bg-secondary)' : 'transparent',
            borderLeft: selectedId === note.id ? '2px solid var(--accent)' : '2px solid transparent',
            color: selectedId === note.id ? 'var(--text-primary)' : 'var(--text-secondary)',
            marginBottom: 2,
          }}
        >
          {note.title || 'Untitled'}
        </div>
      ))}

      <button
        onClick={onNew}
        style={{ marginTop: 'auto', background: 'none', border: 'none', cursor: 'pointer',
          color: 'var(--success)', fontSize: 13, textAlign: 'left', padding: '8px 4px' }}
      >
        + New note
      </button>
    </div>
  )
}
```

- [ ] **Step 4: Run test to verify it passes**

```bash
npm test -- NoteList
```

Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/features/notes/NoteList.tsx src/features/notes/NoteList.test.tsx
git commit -m "feat: add NoteList sidebar component"
```

---

### Task 30: NoteEditor with TipTap

**Files:**
- Create: `src/features/notes/NoteEditor.tsx`
- Test: `src/features/notes/NoteEditor.test.tsx`

- [ ] **Step 1: Write the failing test**

```typescript
// src/features/notes/NoteEditor.test.tsx
import { render, screen, fireEvent } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { NoteEditor } from './NoteEditor'
import type { Note, Tag } from '../../types'

const note: Note = {
  id: 'n1', title: 'Q2 Planning', content: '{"type":"doc","content":[]}',
  tagIds: [], linkedTaskIds: [], createdAt: '', updatedAt: '',
}

test('renders note title in input', () => {
  render(<NoteEditor note={note} tags={[]} allTags={[]} allTasks={[]}
    onSave={() => {}} onTagChange={() => {}} onTagCreate={() => {}} onTaskClick={() => {}} />)
  expect(screen.getByDisplayValue('Q2 Planning')).toBeInTheDocument()
})

test('calls onSave with updated title on blur', async () => {
  const onSave = vi.fn()
  render(<NoteEditor note={note} tags={[]} allTags={[]} allTasks={[]}
    onSave={onSave} onTagChange={() => {}} onTagCreate={() => {}} onTaskClick={() => {}} />)
  const input = screen.getByDisplayValue('Q2 Planning')
  await userEvent.clear(input)
  await userEvent.type(input, 'New Title')
  fireEvent.blur(input)
  expect(onSave).toHaveBeenCalledWith(expect.objectContaining({ title: 'New Title' }))
})

test('shows 1MB warning when content exceeds limit', () => {
  const bigContent = JSON.stringify({ type: 'doc', content: [{ type: 'text', text: 'x'.repeat(1_100_000) }] })
  const bigNote = { ...note, content: bigContent }
  render(<NoteEditor note={bigNote} tags={[]} allTags={[]} allTasks={[]}
    onSave={() => {}} onTagChange={() => {}} onTagCreate={() => {}} onTaskClick={() => {}} />)
  expect(screen.getByText(/note is over 1mb/i)).toBeInTheDocument()
})
```

- [ ] **Step 2: Run test to verify it fails**

```bash
npm test -- NoteEditor
```

- [ ] **Step 3: Implement NoteEditor**

```typescript
// src/features/notes/NoteEditor.tsx
import { useState, useCallback, useEffect } from 'react'
import { useEditor, EditorContent } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import { TagInput } from '../tags/TagInput'
import { TaskChipNode } from './TaskChipNode'
import { TaskMentionExtension } from './TaskMentionExtension'
import type { Note, Tag, Task } from '../../types'

const ONE_MB = 1_000_000

interface NoteEditorProps {
  note: Note
  tags: Tag[]
  allTags: Tag[]
  allTasks: Task[]
  onSave: (partial: Partial<Note> & { id: string }) => void
  onTagChange: (ids: string[]) => void
  onTagCreate: (name: string) => void
  onTaskClick: (id: string) => void
}

function extractLinkedTaskIds(json: string): string[] {
  try {
    const doc = JSON.parse(json)
    const ids: string[] = []
    function walk(node: { type?: string; attrs?: { taskId?: string }; content?: unknown[] }) {
      if (node.type === 'taskChip' && node.attrs?.taskId) ids.push(node.attrs.taskId)
      node.content?.forEach(c => walk(c as typeof node))
    }
    walk(doc)
    return [...new Set(ids)]
  } catch { return [] }
}

export function NoteEditor({ note, tags, allTags, allTasks, onSave, onTagChange, onTagCreate, onTaskClick }: NoteEditorProps) {
  const [title, setTitle] = useState(note.title)

  useEffect(() => setTitle(note.title), [note.id])

  const isBig = note.content.length > ONE_MB

  const editor = useEditor({
    extensions: [
      StarterKit,
      TaskChipNode,
      TaskMentionExtension.configure({
        suggestion: {
          items: ({ query }) =>
            allTasks.filter(t => t.title.toLowerCase().includes(query.toLowerCase())).slice(0, 10),
          render: () => {
            // Floating picker handled by separate TaskPicker component via ref
            return { onStart: () => {}, onUpdate: () => {}, onKeyDown: () => false, onExit: () => {} }
          },
          command: ({ editor, range, props }: any) => {
            editor.chain().focus().deleteRange(range).insertContent({
              type: 'taskChip',
              attrs: { taskId: props.id, taskTitle: props.title, completed: props.completed },
            }).run()
          },
        },
      }),
    ],
    content: note.content ? JSON.parse(note.content) : undefined,
    onBlur: ({ editor }) => {
      const json = JSON.stringify(editor.getJSON())
      const linkedTaskIds = extractLinkedTaskIds(json)
      onSave({ id: note.id, content: json, linkedTaskIds })
    },
  }, [note.id])

  return (
    <div style={{ flex: 1, padding: 20, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 12 }}>
      <input
        value={title}
        onChange={e => setTitle(e.target.value)}
        onBlur={() => { if (title !== note.title) onSave({ id: note.id, title }) }}
        placeholder="Untitled"
        style={{ fontSize: 20, fontWeight: 700, background: 'transparent', border: 'none',
          borderBottom: '1px solid var(--border)', color: 'var(--text-primary)',
          outline: 'none', padding: '4px 0', width: '100%' }}
      />

      <TagInput allTags={allTags} selectedIds={note.tagIds} onChange={onTagChange} onTagCreate={onTagCreate} />

      {isBig && (
        <div style={{ background: '#3d2314', border: '1px solid #f0883e', borderRadius: 6,
          padding: '8px 12px', fontSize: 12, color: '#f0883e' }}>
          ⚠ Note is over 1MB — consider splitting it.
        </div>
      )}

      <EditorContent
        editor={editor}
        style={{ flex: 1, minHeight: 300, fontSize: 14, lineHeight: 1.6 }}
      />
    </div>
  )
}
```

- [ ] **Step 4: Run test to verify it passes**

```bash
npm test -- NoteEditor
```

Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/features/notes/NoteEditor.tsx src/features/notes/NoteEditor.test.tsx
git commit -m "feat: add NoteEditor with TipTap, @-mention extension, and size warning"
```

---

### Task 31: NotesTab — wire sidebar + editor

**Files:**
- Create: `src/features/notes/NotesTab.tsx`
- Test: `src/features/notes/NotesTab.test.tsx`

- [ ] **Step 1: Write the failing test**

```typescript
// src/features/notes/NotesTab.test.tsx
import { render, screen, fireEvent } from '@testing-library/react'
import { NotesTab } from './NotesTab'
import { useNoteStore } from '../../store/noteStore'
import { useTagStore } from '../../store/tagStore'
import { useTaskStore } from '../../store/taskStore'

vi.mock('../../store/noteStore')
vi.mock('../../store/tagStore')
vi.mock('../../store/taskStore')

const mockNotes = [
  { id: 'n1', title: 'Q2 Planning', content: '{"type":"doc","content":[]}',
    tagIds: [], linkedTaskIds: [], createdAt: '', updatedAt: '' },
]

beforeEach(() => {
  vi.mocked(useNoteStore).mockReturnValue({
    notes: mockNotes, addNote: vi.fn(), updateNote: vi.fn(), loading: false,
  } as any)
  vi.mocked(useTagStore).mockReturnValue({ tags: [], addTag: vi.fn() } as any)
  vi.mocked(useTaskStore).mockReturnValue({ tasks: [] } as any)
})

test('renders note list and empty state when no note selected', () => {
  render(<NotesTab />)
  expect(screen.getByText('Q2 Planning')).toBeInTheDocument()
  expect(screen.getByText(/no notes yet/i)).not.toBeInTheDocument()
})

test('selects first note by default', () => {
  render(<NotesTab />)
  // NoteEditor title input should be visible
  expect(screen.getByDisplayValue('Q2 Planning')).toBeInTheDocument()
})
```

- [ ] **Step 2: Run test to verify it fails**

```bash
npm test -- NotesTab
```

- [ ] **Step 3: Implement NotesTab**

```typescript
// src/features/notes/NotesTab.tsx
import { useState, useEffect } from 'react'
import { nanoid } from 'nanoid'
import { NoteList } from './NoteList'
import { NoteEditor } from './NoteEditor'
import { EmptyState } from '../../components/EmptyState'
import { useNoteStore } from '../../store/noteStore'
import { useTagStore } from '../../store/tagStore'
import { useTaskStore } from '../../store/taskStore'
import type { Note } from '../../types'

function nowISO() { return new Date().toISOString() }

export function NotesTab() {
  const { notes, addNote, updateNote } = useNoteStore()
  const { tags, addTag } = useTagStore()
  const { tasks } = useTaskStore()

  const [selectedId, setSelectedId] = useState<string | null>(notes[0]?.id ?? null)

  useEffect(() => {
    if (!selectedId && notes.length > 0) setSelectedId(notes[0].id)
  }, [notes.length])

  const selectedNote = notes.find(n => n.id === selectedId) ?? null

  async function handleNew() {
    const note: Note = {
      id: nanoid(), title: 'Untitled', content: JSON.stringify({ type: 'doc', content: [] }),
      tagIds: [], linkedTaskIds: [], createdAt: nowISO(), updatedAt: nowISO(),
    }
    await addNote(note)
    setSelectedId(note.id)
  }

  return (
    <div style={{ display: 'flex', height: '100%', overflow: 'hidden' }}>
      <NoteList
        notes={notes}
        selectedId={selectedId}
        onSelect={setSelectedId}
        onNew={handleNew}
      />

      {selectedNote ? (
        <NoteEditor
          note={selectedNote}
          tags={tags.filter(t => selectedNote.tagIds.includes(t.id))}
          allTags={tags}
          allTasks={tasks}
          onSave={(partial) => updateNote({ ...partial, updatedAt: nowISO() })}
          onTagChange={(ids) => updateNote({ id: selectedNote.id, tagIds: ids, updatedAt: nowISO() })}
          onTagCreate={async (name) => {
            const tag = await addTag({ id: nanoid(), name, color: '#3b82f6' })
            updateNote({ id: selectedNote.id, tagIds: [...selectedNote.tagIds, tag.id], updatedAt: nowISO() })
          }}
          onTaskClick={() => {}}
        />
      ) : (
        <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <EmptyState message="No notes yet. Create one to get started." />
        </div>
      )}
    </div>
  )
}
```

- [ ] **Step 4: Run test to verify it passes**

```bash
npm test -- NotesTab
```

Expected: PASS

- [ ] **Step 5: Run full test suite**

```bash
npm test
```

Expected: all tests pass.

- [ ] **Step 6: Commit**

```bash
git add src/features/notes/
git commit -m "feat: add NotesTab — note list, TipTap editor with @-mention and tag support"
```

---

## Chunk 7: Pomodoro Feature

### Task 32: usePomodoro hook

**Files:**
- Create: `src/features/pomodoro/usePomodoro.ts`
- Test: `src/features/pomodoro/usePomodoro.test.ts`

- [ ] **Step 1: Write the failing test**

```typescript
// src/features/pomodoro/usePomodoro.test.ts
import { renderHook, act } from '@testing-library/react'
import { usePomodoro } from './usePomodoro'
import { usePomodoroStore } from '../../store/pomodoroStore'

vi.mock('../../store/pomodoroStore')
vi.useFakeTimers()

const mockStore = {
  activeSession: null,
  workSessionCount: 0,
  startSession: vi.fn(),
  stopSession: vi.fn(),
  completeSession: vi.fn(),
}

beforeEach(() => {
  vi.mocked(usePomodoroStore).mockReturnValue(mockStore as any)
  vi.clearAllMocks()
})

test('returns 25:00 countdown when no active session', () => {
  const { result } = renderHook(() => usePomodoro())
  expect(result.current.display).toBe('25:00')
  expect(result.current.isRunning).toBe(false)
})

test('countdown decrements every second when active', () => {
  mockStore.activeSession = {
    sessionId: 's1', taskId: 't1', type: 'work',
    startedAt: new Date().toISOString(),
  } as any
  vi.mocked(usePomodoroStore).mockReturnValue({ ...mockStore, activeSession: mockStore.activeSession } as any)

  const { result } = renderHook(() => usePomodoro())
  act(() => { vi.advanceTimersByTime(60_000) }) // 60 seconds
  expect(result.current.display).toBe('24:00')
})

test('calls completeSession when countdown reaches zero', () => {
  const startedAt = new Date(Date.now() - 24 * 60 * 1000).toISOString() // 24 min ago
  mockStore.activeSession = { sessionId: 's1', taskId: 't1', type: 'work', startedAt } as any
  vi.mocked(usePomodoroStore).mockReturnValue({ ...mockStore, activeSession: mockStore.activeSession } as any)

  const { result } = renderHook(() => usePomodoro())
  act(() => { vi.advanceTimersByTime(61_000) }) // push past 25 min
  expect(mockStore.completeSession).toHaveBeenCalled()
})
```

- [ ] **Step 2: Run test to verify it fails**

```bash
npm test -- usePomodoro
```

- [ ] **Step 3: Implement usePomodoro**

```typescript
// src/features/pomodoro/usePomodoro.ts
import { useState, useEffect, useRef } from 'react'
import { usePomodoroStore } from '../../store/pomodoroStore'
import { playBeep } from '../../lib/audioUtils'

const DURATIONS: Record<string, number> = {
  work: 25 * 60,
  short_break: 5 * 60,
  long_break: 15 * 60,
}

function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60).toString().padStart(2, '0')
  const s = (seconds % 60).toString().padStart(2, '0')
  return `${m}:${s}`
}

export function usePomodoro() {
  const { activeSession, workSessionCount, startSession, stopSession, completeSession } = usePomodoroStore()
  const [secondsLeft, setSecondsLeft] = useState<number>(() => {
    if (!activeSession) return DURATIONS.work
    const elapsed = Math.floor((Date.now() - Date.parse(activeSession.startedAt)) / 1000)
    return Math.max(0, DURATIONS[activeSession.type] - elapsed)
  })
  const completedRef = useRef(false)

  useEffect(() => {
    if (!activeSession) {
      setSecondsLeft(DURATIONS.work)
      completedRef.current = false
      return
    }
    const elapsed = Math.floor((Date.now() - Date.parse(activeSession.startedAt)) / 1000)
    setSecondsLeft(Math.max(0, DURATIONS[activeSession.type] - elapsed))
    completedRef.current = false
  }, [activeSession?.sessionId])

  useEffect(() => {
    if (!activeSession) return

    const interval = setInterval(() => {
      setSecondsLeft(prev => Math.max(0, prev - 1))
    }, 1000)

    return () => clearInterval(interval)
  }, [activeSession?.sessionId])

  // Watch for countdown reaching zero — side effects outside state updater
  useEffect(() => {
    if (!activeSession || secondsLeft > 0 || completedRef.current) return
    completedRef.current = true
    completeSession()
    playBeep()
    document.title = '⏰ Timer complete! — Time Manager'
  }, [secondsLeft, activeSession?.sessionId])

  return {
    display: formatTime(secondsLeft),
    secondsLeft,
    isRunning: !!activeSession,
    activeSession,
    workSessionCount,
    startSession,
    stopSession,
  }
}
```

- [ ] **Step 4: Run test to verify it passes**

```bash
npm test -- usePomodoro
```

Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/features/pomodoro/usePomodoro.ts src/features/pomodoro/usePomodoro.test.ts
git commit -m "feat: add usePomodoro hook with countdown and session completion"
```

---

### Task 33: useMultiTabSync hook

**Files:**
- Create: `src/features/pomodoro/useMultiTabSync.ts`
- Test: `src/features/pomodoro/useMultiTabSync.test.ts`

- [ ] **Step 1: Write the failing test**

```typescript
// src/features/pomodoro/useMultiTabSync.test.ts
import { renderHook, act } from '@testing-library/react'
import { useMultiTabSync } from './useMultiTabSync'

const LS_KEY = 'pomodoro:activeSession'

beforeEach(() => localStorage.clear())

test('writes session to localStorage when broadcasting', () => {
  const { result } = renderHook(() => useMultiTabSync())
  act(() => {
    result.current.broadcast({ sessionId: 's1', taskId: 't1', type: 'work', startedAt: '2026-01-01T00:00:00Z', status: 'active' })
  })
  const stored = JSON.parse(localStorage.getItem(LS_KEY)!)
  expect(stored.sessionId).toBe('s1')
})

test('clears localStorage on clearBroadcast', () => {
  localStorage.setItem(LS_KEY, JSON.stringify({ sessionId: 's1' }))
  const { result } = renderHook(() => useMultiTabSync())
  act(() => result.current.clearBroadcast())
  expect(localStorage.getItem(LS_KEY)).toBeNull()
})

test('returns remoteSession when storage event fires from another tab', () => {
  const { result } = renderHook(() => useMultiTabSync())
  act(() => {
    const event = new StorageEvent('storage', {
      key: LS_KEY,
      newValue: JSON.stringify({ sessionId: 's2', taskId: 't1', type: 'work', startedAt: '2026-01-01T00:00:00Z', status: 'active' }),
    })
    window.dispatchEvent(event)
  })
  expect(result.current.remoteSession?.sessionId).toBe('s2')
})
```

- [ ] **Step 2: Run test to verify it fails**

```bash
npm test -- useMultiTabSync
```

- [ ] **Step 3: Implement useMultiTabSync**

```typescript
// src/features/pomodoro/useMultiTabSync.ts
import { useState, useEffect } from 'react'

const LS_KEY = 'pomodoro:activeSession'

export interface BroadcastSession {
  sessionId: string
  taskId?: string
  type: 'work' | 'short_break' | 'long_break'
  startedAt: string
  status: 'active' | 'stopped' | 'completed'
}

export function useMultiTabSync() {
  const [remoteSession, setRemoteSession] = useState<BroadcastSession | null>(() => {
    try { return JSON.parse(localStorage.getItem(LS_KEY) ?? 'null') }
    catch { return null }
  })

  useEffect(() => {
    function handler(e: StorageEvent) {
      if (e.key !== LS_KEY) return
      try { setRemoteSession(e.newValue ? JSON.parse(e.newValue) : null) }
      catch { setRemoteSession(null) }
    }
    window.addEventListener('storage', handler)
    return () => window.removeEventListener('storage', handler)
  }, [])

  function broadcast(session: BroadcastSession) {
    localStorage.setItem(LS_KEY, JSON.stringify(session))
  }

  function clearBroadcast() {
    localStorage.removeItem(LS_KEY)
  }

  return { remoteSession, broadcast, clearBroadcast }
}
```

- [ ] **Step 4: Run test to verify it passes**

```bash
npm test -- useMultiTabSync
```

Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/features/pomodoro/useMultiTabSync.ts src/features/pomodoro/useMultiTabSync.test.ts
git commit -m "feat: add useMultiTabSync for cross-tab localStorage broadcasting"
```

---

### Task 34: SessionDots and PomodoroTimer components

**Files:**
- Create: `src/features/pomodoro/SessionDots.tsx`
- Create: `src/features/pomodoro/PomodoroTimer.tsx`
- Test: `src/features/pomodoro/PomodoroTimer.test.tsx`

- [ ] **Step 1: Write the failing test**

```typescript
// src/features/pomodoro/PomodoroTimer.test.tsx
import { render, screen, fireEvent } from '@testing-library/react'
import { PomodoroTimer } from './PomodoroTimer'

test('renders countdown display', () => {
  render(<PomodoroTimer taskId="t1" taskTitle="Design" display="23:45"
    isRunning={false} workSessionCount={2} onStart={() => {}} onStop={() => {}} />)
  expect(screen.getByText('23:45')).toBeInTheDocument()
})

test('shows task title when running', () => {
  render(<PomodoroTimer taskId="t1" taskTitle="Design" display="23:45"
    isRunning={true} workSessionCount={2} onStart={() => {}} onStop={() => {}} />)
  expect(screen.getByText('Design')).toBeInTheDocument()
})

test('renders 4 session dots', () => {
  render(<PomodoroTimer taskId="t1" taskTitle="Design" display="25:00"
    isRunning={false} workSessionCount={2} onStart={() => {}} onStop={() => {}} />)
  expect(screen.getAllByTestId('session-dot')).toHaveLength(4)
})

test('calls onStop when Stop button clicked during active session', () => {
  const onStop = vi.fn()
  render(<PomodoroTimer taskId="t1" taskTitle="Design" display="23:45"
    isRunning={true} workSessionCount={0} onStart={() => {}} onStop={onStop} />)
  fireEvent.click(screen.getByText(/stop/i))
  expect(onStop).toHaveBeenCalled()
})

test('calls onStart with taskId when Start clicked', () => {
  const onStart = vi.fn()
  render(<PomodoroTimer taskId="t1" taskTitle="Design" display="25:00"
    isRunning={false} workSessionCount={0} onStart={onStart} onStop={() => {}} />)
  fireEvent.click(screen.getByText(/start/i))
  expect(onStart).toHaveBeenCalledWith('t1')
})
```

- [ ] **Step 2: Run test to verify it fails**

```bash
npm test -- PomodoroTimer
```

- [ ] **Step 3: Implement SessionDots and PomodoroTimer**

```typescript
// src/features/pomodoro/SessionDots.tsx
interface SessionDotsProps {
  count: number   // completed work sessions (0-4 within cycle)
}

export function SessionDots({ count }: SessionDotsProps) {
  return (
    <div style={{ display: 'flex', gap: 6, justifyContent: 'center' }}>
      {Array.from({ length: 4 }, (_, i) => (
        <span
          key={i}
          data-testid="session-dot"
          style={{
            width: 10, height: 10, borderRadius: '50%',
            background: i < (count % 4) ? 'var(--accent)' : 'transparent',
            border: '1px solid var(--border)',
          }}
        />
      ))}
    </div>
  )
}
```

```typescript
// src/features/pomodoro/PomodoroTimer.tsx
import { SessionDots } from './SessionDots'

interface PomodoroTimerProps {
  taskId: string | null
  taskTitle: string | null
  display: string
  isRunning: boolean
  workSessionCount: number
  onStart: (taskId: string) => void
  onStop: () => void
}

export function PomodoroTimer({ taskId, taskTitle, display, isRunning, workSessionCount, onStart, onStop }: PomodoroTimerProps) {
  return (
    <div style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border)',
      borderRadius: 12, padding: 20, textAlign: 'center', maxWidth: 320, margin: '0 auto' }}>

      {taskTitle && (
        <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 8, textTransform: 'uppercase' }}>
          {isRunning ? 'FOCUS —' : ''} {taskTitle}
        </div>
      )}

      <div style={{ fontSize: 52, fontWeight: 700, color: 'var(--accent)',
        fontVariantNumeric: 'tabular-nums', marginBottom: 12 }}>
        {display}
      </div>

      <div style={{ display: 'flex', gap: 8, justifyContent: 'center', marginBottom: 12 }}>
        {isRunning ? (
          <button
            onClick={onStop}
            style={{ background: '#21262d', border: '1px solid var(--border)', color: 'var(--text-primary)',
              padding: '6px 16px', borderRadius: 6, cursor: 'pointer', fontSize: 13 }}
          >
            ⏹ Stop
          </button>
        ) : (
          <button
            onClick={() => taskId && onStart(taskId)}
            disabled={!taskId}
            style={{ background: 'var(--success)', border: 'none', color: '#fff',
              padding: '6px 16px', borderRadius: 6, cursor: taskId ? 'pointer' : 'default',
              fontSize: 13, opacity: taskId ? 1 : 0.5 }}
          >
            ▶ Start
          </button>
        )}
      </div>

      <SessionDots count={workSessionCount} />

      {workSessionCount > 0 && (
        <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 6 }}>
          {workSessionCount % 4} of 4 pomodoros
        </div>
      )}
    </div>
  )
}
```

- [ ] **Step 4: Run test to verify it passes**

```bash
npm test -- PomodoroTimer
```

Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/features/pomodoro/SessionDots.tsx src/features/pomodoro/PomodoroTimer.tsx src/features/pomodoro/PomodoroTimer.test.tsx
git commit -m "feat: add SessionDots and PomodoroTimer components"
```

---

## Chunk 8: Home Tab + App Integration

### Task 35: HomeTab component

**Files:**
- Create: `src/features/home/HomeTab.tsx`
- Test: `src/features/home/HomeTab.test.tsx`

- [ ] **Step 1: Write the failing test**

```typescript
// src/features/home/HomeTab.test.tsx
import { render, screen } from '@testing-library/react'
import { HomeTab } from './HomeTab'
import { usePomodoroStore } from '../../store/pomodoroStore'
import { useTaskStore } from '../../store/taskStore'
import { useTagStore } from '../../store/tagStore'

vi.mock('../../store/pomodoroStore')
vi.mock('../../store/taskStore')
vi.mock('../../store/tagStore')

beforeEach(() => {
  vi.setSystemTime(new Date('2026-03-16'))
  vi.mocked(useTagStore).mockReturnValue({ tags: [] } as any)
})

test('shows no-timer empty state when no active session and no active task selected', () => {
  vi.mocked(usePomodoroStore).mockReturnValue({
    activeSession: null, workSessionCount: 0, stats: {}, sessions: {},
    startSession: vi.fn(), stopSession: vi.fn(),
  } as any)
  vi.mocked(useTaskStore).mockReturnValue({ tasks: [] } as any)

  render(<HomeTab />)
  expect(screen.getByText(/no active timer/i)).toBeInTheDocument()
})

test('shows todays tasks scheduled for today', () => {
  vi.mocked(usePomodoroStore).mockReturnValue({
    activeSession: null, workSessionCount: 0, stats: {}, sessions: {},
    startSession: vi.fn(), stopSession: vi.fn(),
  } as any)
  vi.mocked(useTaskStore).mockReturnValue({
    tasks: [
      { id: 't1', title: 'Morning standup', completed: false, order: 1, tagIds: [],
        scheduledDay: '2026-03-16', createdAt: '', updatedAt: '' },
      { id: 't2', title: 'Deploy release', completed: false, order: 2, tagIds: [],
        scheduledDay: '2026-03-17', createdAt: '', updatedAt: '' }, // different day
    ],
  } as any)

  render(<HomeTab />)
  expect(screen.getByText('Morning standup')).toBeInTheDocument()
  expect(screen.queryByText('Deploy release')).not.toBeInTheDocument()
})

test('shows no-tasks-today empty state when no tasks scheduled for today', () => {
  vi.mocked(usePomodoroStore).mockReturnValue({
    activeSession: null, workSessionCount: 0, stats: {}, sessions: {},
    startSession: vi.fn(), stopSession: vi.fn(),
  } as any)
  vi.mocked(useTaskStore).mockReturnValue({ tasks: [] } as any)

  render(<HomeTab />)
  expect(screen.getByText(/nothing scheduled for today/i)).toBeInTheDocument()
})
```

- [ ] **Step 2: Run test to verify it fails**

```bash
npm test -- HomeTab
```

- [ ] **Step 3: Implement HomeTab**

```typescript
// src/features/home/HomeTab.tsx
import { useState } from 'react'
import { format } from 'date-fns'
import { PomodoroTimer } from '../pomodoro/PomodoroTimer'
import { TaskItem } from '../tasks/TaskItem'
import { EmptyState } from '../../components/EmptyState'
import { usePomodoro } from '../pomodoro/usePomodoro'
import { useTaskStore } from '../../store/taskStore'
import { useTagStore } from '../../store/tagStore'
import { todayISO } from '../../lib/dateUtils'

export function HomeTab() {
  const { display, isRunning, activeSession, workSessionCount, startSession, stopSession } = usePomodoro()
  const { tasks } = useTaskStore()
  const { tags } = useTagStore()

  const today = todayISO()
  const todaysTasks = tasks.filter(t => t.scheduledDay === today && !t.parentId)

  // Active task for the timer: the task from the active session
  const activeTask = activeSession?.taskId
    ? tasks.find(t => t.id === activeSession.taskId) ?? null
    : null

  // First task from today's list if no active session (to pre-select for start)
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null)
  const timerTaskId = activeSession?.taskId ?? selectedTaskId ?? todaysTasks[0]?.id ?? null
  const timerTask = tasks.find(t => t.id === timerTaskId) ?? null

  return (
    <div style={{ padding: 20, maxWidth: 560, margin: '0 auto', display: 'flex', flexDirection: 'column', gap: 24 }}>
      {/* Pomodoro timer */}
      {isRunning || timerTaskId ? (
        <PomodoroTimer
          taskId={timerTaskId}
          taskTitle={timerTask?.title ?? null}
          display={display}
          isRunning={isRunning}
          workSessionCount={workSessionCount}
          onStart={startSession}
          onStop={stopSession}
        />
      ) : (
        <div style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border)',
          borderRadius: 12, padding: 20, textAlign: 'center' }}>
          <EmptyState message="No active timer. Click 🍅 on a task to start a Pomodoro." />
        </div>
      )}

      {/* Today's tasks */}
      <div>
        <div style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 600,
          textTransform: 'uppercase', marginBottom: 10 }}>
          Today's Tasks — {format(new Date(), 'EEE, MMM d')}
        </div>

        {todaysTasks.length === 0 ? (
          <EmptyState message="Nothing scheduled for today. Go to the Schedule tab and drag tasks into today's column." />
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {todaysTasks.map(task => (
              <div key={task.id} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <TaskItem
                  task={task}
                  tags={tags}
                  pomodoroCount={0}
                  isActive={activeSession?.taskId === task.id}
                  onClick={setSelectedTaskId}
                  onToggle={() => {}}
                  dragHandleProps={null}
                />
                <button
                  onClick={() => startSession(task.id)}
                  title="Start Pomodoro"
                  style={{ background: 'none', border: 'none', cursor: 'pointer',
                    fontSize: 18, padding: '2px 4px', opacity: 0.7 }}
                >
                  🍅
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
```

- [ ] **Step 4: Run test to verify it passes**

```bash
npm test -- HomeTab
```

Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/features/home/HomeTab.tsx src/features/home/HomeTab.test.tsx
git commit -m "feat: add HomeTab with active pomodoro timer and today's tasks"
```

---

### Task 36: Stale session recovery on app load

**Files:**
- Modify: `src/store/pomodoroStore.ts` (add `recoverStaleSession` action)
- Test: `src/store/pomodoroStore.stale.test.ts`

- [ ] **Step 1: Write the failing test**

```typescript
// src/store/pomodoroStore.stale.test.ts
import { db } from '../db/db'
import { recoverStaleSession } from '../store/pomodoroStore'

// Uses fake-indexeddb from setup
test('marks session as interrupted in stats when older than 2 hours', async () => {
  const staleStartedAt = new Date(Date.now() - 3 * 60 * 60 * 1000).toISOString()
  await db.pomodoroSessions.add({
    id: 'stale1', taskId: 't1', startedAt: staleStartedAt,
    completedAt: null, type: 'work', durationMinutes: 25,
  })

  const result = await recoverStaleSession()

  expect(result).toBe('interrupted')

  const stats = await db.pomodoroStats.get('t1')
  expect(stats?.totalInterrupted).toBe(1)
  expect(stats?.totalStarted).toBe(1)

  // Session row stays with completedAt = null (already interrupted state)
  const session = await db.pomodoroSessions.get('stale1')
  expect(session?.completedAt).toBeNull()
})

test('returns active when session is recent (under 2 hours)', async () => {
  const recentStartedAt = new Date(Date.now() - 30 * 60 * 1000).toISOString()
  await db.pomodoroSessions.add({
    id: 'recent1', taskId: 't1', startedAt: recentStartedAt,
    completedAt: null, type: 'work', durationMinutes: 25,
  })

  const result = await recoverStaleSession()
  expect(result).toBe('active')
})

test('returns null when no open sessions', async () => {
  const result = await recoverStaleSession()
  expect(result).toBeNull()
})
```

- [ ] **Step 2: Run test to verify it fails**

```bash
npm test -- pomodoroStore.stale
```

- [ ] **Step 3: Implement recoverStaleSession**

Add to `src/store/pomodoroStore.ts`:

```typescript
// Add this export to pomodoroStore.ts alongside the store
// Note: import pomodoroRepo from '../db/pomodoroRepository' at top of file

const TWO_HOURS_MS = 2 * 60 * 60 * 1000

/**
 * Called once on app load. Finds any open PomodoroSession (completedAt = null)
 * and either returns it as active (< 2h old) or marks stats as interrupted (>= 2h old).
 * Returns: 'active' | 'interrupted' | null
 *
 * Spec rules:
 * - Only work sessions affect PomodoroStats (break sessions ignored)
 * - Session row stays untouched (completedAt = null = interrupted state)
 */
export async function recoverStaleSession(): Promise<'active' | 'interrupted' | null> {
  // Clear localStorage first — Dexie is sole truth on load
  localStorage.removeItem('pomodoro:activeSession')

  const openSession = await pomodoroRepo.getOpenSession()

  if (!openSession) return null

  const age = Date.now() - Date.parse(openSession.startedAt)

  if (age < TWO_HOURS_MS) {
    return 'active'
  }

  // Stale — only work sessions update stats; break sessions are skipped
  if (openSession.type === 'work' && openSession.taskId) {
    await pomodoroRepo.upsertStatsInterrupted(openSession.taskId)
  }

  return 'interrupted'
}
```

Also add `upsertStatsInterrupted` to `PomodoroRepository` (`src/db/pomodoroRepository.ts`):

```typescript
async upsertStatsInterrupted(taskId: string): Promise<void> {
  await this.db.transaction('rw', this.db.pomodoroStats, async () => {
    const existing = await this.db.pomodoroStats.get(taskId)
    if (existing) {
      await this.db.pomodoroStats.update(taskId, {
        totalInterrupted: existing.totalInterrupted + 1,
        updatedAt: new Date().toISOString(),
      })
    } else {
      await this.db.pomodoroStats.add({
        taskId, totalStarted: 1, totalCompleted: 0,
        totalInterrupted: 1, totalMinutesFocused: 0,
        lastSessionAt: null, updatedAt: new Date().toISOString(),
      })
    }
  })
}
```

- [ ] **Step 4: Run test to verify it passes**

```bash
npm test -- pomodoroStore.stale
```

Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/store/pomodoroStore.ts src/store/pomodoroStore.stale.test.ts
git commit -m "feat: add stale session recovery on app load (>2h threshold)"
```

---

### Task 37: Wire App.tsx with stale recovery and tab routing

**Files:**
- Modify: `src/App.tsx`
- Modify: `src/main.tsx`
- Test: `src/App.integration.test.tsx`

- [ ] **Step 1: Write the failing test**

```typescript
// src/App.integration.test.tsx
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { App } from './App'
import { db } from './db/db'

// Uses fake-indexeddb
test('renders all 4 tabs', async () => {
  render(<App />)
  await waitFor(() => {
    expect(screen.getByText('Home')).toBeInTheDocument()
    expect(screen.getByText('Tasks')).toBeInTheDocument()
    expect(screen.getByText('Schedule')).toBeInTheDocument()
    expect(screen.getByText('Notes')).toBeInTheDocument()
  })
})

test('switches to Tasks tab on click', async () => {
  render(<App />)
  await waitFor(() => screen.getByText('Tasks'))
  fireEvent.click(screen.getByText('Tasks'))
  expect(screen.getByPlaceholderText('+ Add task...')).toBeInTheDocument()
})

test('shows RecoveryScreen when DB fails to open', async () => {
  // Simulate DB failure by mocking
  vi.spyOn(db, 'open').mockRejectedValueOnce(new Error('QuotaExceededError'))
  render(<App />)
  await waitFor(() => {
    expect(screen.getByText(/storage error/i)).toBeInTheDocument()
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

```bash
npm test -- App.integration
```

- [ ] **Step 3: Implement complete App.tsx**

```typescript
// src/App.tsx
import { useState, useEffect } from 'react'
import { TabBar } from './components/TabBar'
import { HomeTab } from './features/home/HomeTab'
import { TasksTab } from './features/tasks/TasksTab'
import { ScheduleTab } from './features/schedule/ScheduleTab'
import { NotesTab } from './features/notes/NotesTab'
import { RecoveryScreen } from './components/RecoveryScreen'
import { Toast } from './components/Toast'
import { useTaskStore } from './store/taskStore'
import { useTagStore } from './store/tagStore'
import { useNoteStore } from './store/noteStore'
import { usePomodoroStore } from './store/pomodoroStore'
import { recoverStaleSession } from './store/pomodoroStore'
import { pomodoroRepo } from './db/pomodoroRepository'
import { db } from './db/db'

type Tab = 'home' | 'tasks' | 'schedule' | 'notes'

export function App() {
  const [tab, setTab] = useState<Tab>('home')
  const [dbError, setDbError] = useState(false)
  const [loaded, setLoaded] = useState(false)

  const { loadTasks } = useTaskStore()
  const { loadTags } = useTagStore()
  const { loadNotes } = useNoteStore()
  const { loadStats, setActiveSession } = usePomodoroStore()

  useEffect(() => {
    async function init() {
      try {
        await db.open()
        await Promise.all([loadTasks(), loadTags(), loadNotes(), loadStats()])

        const recovery = await recoverStaleSession()
        if (recovery === 'active') {
          // recoverStaleSession already cleared localStorage; use repo to fetch the open session
          const openSession = await pomodoroRepo.getOpenSession()
          if (openSession) {
            setActiveSession({
              sessionId: openSession.id,
              taskId: openSession.taskId,
              type: openSession.type,
              startedAt: openSession.startedAt,
            })
          }
        }

        setLoaded(true)
      } catch (e) {
        console.error('DB init failed', e)
        setDbError(true)
      }
    }
    init()
  }, [])

  if (dbError) return <RecoveryScreen />
  if (!loaded) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh' }}>
      <span style={{ color: 'var(--text-muted)' }}>Loading…</span>
    </div>
  )

  const tabs = [
    { id: 'home' as Tab, label: 'Home' },
    { id: 'tasks' as Tab, label: 'Tasks' },
    { id: 'schedule' as Tab, label: 'Schedule' },
    { id: 'notes' as Tab, label: 'Notes' },
  ]

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', background: 'var(--bg-primary)' }}>
      <TabBar tabs={tabs} activeTab={tab} onTabChange={setTab} />
      <main style={{ flex: 1, overflow: 'hidden' }}>
        {tab === 'home' && <HomeTab />}
        {tab === 'tasks' && <TasksTab />}
        {tab === 'schedule' && <ScheduleTab />}
        {tab === 'notes' && <NotesTab />}
      </main>
    </div>
  )
}
```

- [ ] **Step 4: Run the integration test**

```bash
npm test -- App.integration
```

Expected: PASS

- [ ] **Step 5: Run the full test suite**

```bash
npm test
```

Expected: all tests pass (or clearly explainable failures only).

- [ ] **Step 6: Run the dev server manually to verify the UI**

```bash
npm run dev
```

Open `http://localhost:5173`. Verify:
- All 4 tabs render and switch
- Tasks can be added, toggled, reordered
- Tags can be created with color picker
- Schedule shows 7-day kanban, drag tasks between days
- Notes open with TipTap editor, `@` picker shows tasks
- Pomodoro timer starts, counts down on a task
- Page reload clears active timer (no stale sessions under 2h)

- [ ] **Step 7: Final commit**

```bash
git add src/App.tsx src/main.tsx src/App.integration.test.tsx
git commit -m "feat: wire App.tsx with DB init, stale session recovery, and tab routing"
```

---


## Chunk 9: Missing Components (TaskPicker, LinkedTasksPanel, Pomodoro on TaskItem)

### Task 38: TaskPicker floating picker for @-mention

**Files:**
- Create: `src/features/notes/TaskPicker.tsx`
- Test: `src/features/notes/TaskPicker.test.tsx`

- [ ] **Step 1: Write the failing test**

```typescript
// src/features/notes/TaskPicker.test.tsx
import { render, screen, fireEvent } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { TaskPicker } from './TaskPicker'
import type { Task } from '../../types'

const tasks: Task[] = [
  { id: 't1', title: 'Design Homepage', completed: false, order: 1, tagIds: [], createdAt: '', updatedAt: '' },
  { id: 't2', title: 'Write tests', completed: false, order: 2, tagIds: [], createdAt: '', updatedAt: '' },
]

test('renders filtered task list based on query', () => {
  render(<TaskPicker tasks={tasks} query="des" position={{ top: 100, left: 50 }}
    onSelect={() => {}} onDismiss={() => {}} />)
  expect(screen.getByText('Design Homepage')).toBeInTheDocument()
  expect(screen.queryByText('Write tests')).not.toBeInTheDocument()
})

test('calls onSelect with task when clicked', () => {
  const onSelect = vi.fn()
  render(<TaskPicker tasks={tasks} query="" position={{ top: 100, left: 50 }}
    onSelect={onSelect} onDismiss={() => {}} />)
  fireEvent.click(screen.getByText('Design Homepage'))
  expect(onSelect).toHaveBeenCalledWith(tasks[0])
})

test('calls onDismiss on Escape key', () => {
  const onDismiss = vi.fn()
  render(<TaskPicker tasks={tasks} query="" position={{ top: 100, left: 50 }}
    onSelect={() => {}} onDismiss={onDismiss} />)
  fireEvent.keyDown(document, { key: 'Escape' })
  expect(onDismiss).toHaveBeenCalled()
})

test('renders empty message when no tasks match query', () => {
  render(<TaskPicker tasks={tasks} query="zzzz" position={{ top: 100, left: 50 }}
    onSelect={() => {}} onDismiss={() => {}} />)
  expect(screen.getByText(/no tasks match/i)).toBeInTheDocument()
})
```

- [ ] **Step 2: Run test to verify it fails**

```bash
npm test -- TaskPicker
```

Expected: FAIL

- [ ] **Step 3: Implement TaskPicker**

```typescript
// src/features/notes/TaskPicker.tsx
import { useEffect } from 'react'
import type { Task } from '../../types'

interface TaskPickerProps {
  tasks: Task[]
  query: string
  position: { top: number; left: number }
  onSelect: (task: Task) => void
  onDismiss: () => void
}

export function TaskPicker({ tasks, query, position, onSelect, onDismiss }: TaskPickerProps) {
  const filtered = query
    ? tasks.filter(t => t.title.toLowerCase().includes(query.toLowerCase()))
    : tasks

  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onDismiss()
    }
    document.addEventListener('keydown', handleKey)
    return () => document.removeEventListener('keydown', handleKey)
  }, [onDismiss])

  return (
    <div
      style={{
        position: 'fixed', top: position.top, left: position.left, zIndex: 1000,
        background: 'var(--bg-secondary)', border: '1px solid var(--border)',
        borderRadius: 8, minWidth: 240, maxHeight: 240, overflowY: 'auto',
        boxShadow: '0 8px 24px rgba(0,0,0,0.4)',
      }}
      onMouseDown={e => e.preventDefault()} // Prevent editor blur
    >
      {filtered.length === 0 ? (
        <div style={{ padding: '10px 14px', fontSize: 13, color: 'var(--text-muted)' }}>
          No tasks match "{query}"
        </div>
      ) : (
        filtered.slice(0, 10).map(task => (
          <div
            key={task.id}
            onClick={() => onSelect(task)}
            style={{
              padding: '8px 14px', cursor: 'pointer', fontSize: 13,
              display: 'flex', alignItems: 'center', gap: 8,
              borderBottom: '1px solid var(--border)',
            }}
          >
            <span style={{ color: task.completed ? 'var(--success)' : 'var(--text-muted)', fontSize: 11 }}>
              {task.completed ? '✓' : '○'}
            </span>
            <span style={{ textDecoration: task.completed ? 'line-through' : 'none' }}>
              {task.title}
            </span>
          </div>
        ))
      )}
    </div>
  )
}
```

- [ ] **Step 4: Run test to verify it passes**

```bash
npm test -- TaskPicker
```

Expected: PASS

- [ ] **Step 5: Wire TaskPicker into NoteEditor**

Update `src/features/notes/NoteEditor.tsx` to:
1. Track `pickerState: { query: string; position: { top, left }; range: Range } | null` in state
2. Replace the `TaskMentionExtension.configure` render stub with a real render that calls `setPickerState`
3. Render `<TaskPicker>` when `pickerState` is set, calling `editor.commands.insertTaskChip` on selection and `setPickerState(null)` on dismiss

This wires the floating picker to the TipTap suggestion plugin.

- [ ] **Step 6: Commit**

```bash
git add src/features/notes/TaskPicker.tsx src/features/notes/TaskPicker.test.tsx
git commit -m "feat: add TaskPicker floating @-mention picker for note editor"
```

---

### Task 39: LinkedTasksPanel

**Files:**
- Create: `src/features/notes/LinkedTasksPanel.tsx`
- Test: `src/features/notes/LinkedTasksPanel.test.tsx`

- [ ] **Step 1: Write the failing test**

```typescript
// src/features/notes/LinkedTasksPanel.test.tsx
import { render, screen, fireEvent } from '@testing-library/react'
import { LinkedTasksPanel } from './LinkedTasksPanel'
import type { Task } from '../../types'

const tasks: Task[] = [
  { id: 't1', title: 'Design Homepage', completed: false, order: 1, tagIds: [], createdAt: '', updatedAt: '' },
  { id: 't2', title: 'Write tests', completed: true, order: 2, tagIds: [], createdAt: '', updatedAt: '' },
]

test('renders linked task titles', () => {
  render(<LinkedTasksPanel tasks={tasks} onTaskClick={() => {}} />)
  expect(screen.getByText('Design Homepage')).toBeInTheDocument()
  expect(screen.getByText('Write tests')).toBeInTheDocument()
})

test('renders nothing when no linked tasks', () => {
  const { container } = render(<LinkedTasksPanel tasks={[]} onTaskClick={() => {}} />)
  expect(container).toBeEmptyDOMElement()
})

test('calls onTaskClick when task clicked', () => {
  const onTaskClick = vi.fn()
  render(<LinkedTasksPanel tasks={tasks} onTaskClick={onTaskClick} />)
  fireEvent.click(screen.getByText('Design Homepage'))
  expect(onTaskClick).toHaveBeenCalledWith('t1')
})

test('shows completion indicator', () => {
  render(<LinkedTasksPanel tasks={tasks} onTaskClick={() => {}} />)
  expect(screen.getByText('✓')).toBeInTheDocument() // completed task
  expect(screen.getByText('○')).toBeInTheDocument() // incomplete task
})
```

- [ ] **Step 2: Run test to verify it fails**

```bash
npm test -- LinkedTasksPanel
```

Expected: FAIL

- [ ] **Step 3: Implement LinkedTasksPanel**

```typescript
// src/features/notes/LinkedTasksPanel.tsx
import type { Task } from '../../types'

interface LinkedTasksPanelProps {
  tasks: Task[]
  onTaskClick: (id: string) => void
}

export function LinkedTasksPanel({ tasks, onTaskClick }: LinkedTasksPanelProps) {
  if (tasks.length === 0) return null

  return (
    <div style={{ borderTop: '1px solid var(--border)', paddingTop: 12, marginTop: 16 }}>
      <div style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 600,
        textTransform: 'uppercase', marginBottom: 8 }}>
        Linked Tasks
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
        {tasks.map(task => (
          <div
            key={task.id}
            onClick={() => onTaskClick(task.id)}
            style={{
              display: 'flex', alignItems: 'center', gap: 8,
              padding: '6px 10px', borderRadius: 6, cursor: 'pointer',
              background: 'var(--bg-secondary)',
              fontSize: 13,
            }}
          >
            <span style={{ color: task.completed ? 'var(--success)' : 'var(--text-muted)', fontSize: 11 }}>
              {task.completed ? '✓' : '○'}
            </span>
            <span style={{ textDecoration: task.completed ? 'line-through' : 'none',
              color: task.completed ? 'var(--text-muted)' : 'var(--text-primary)' }}>
              {task.title}
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}
```

- [ ] **Step 4: Wire LinkedTasksPanel into NoteEditor**

In `src/features/notes/NoteEditor.tsx`, after `<EditorContent>`, add:

```typescript
import { LinkedTasksPanel } from './LinkedTasksPanel'
// ...
// After EditorContent:
{linkedTasks.length > 0 && (
  <LinkedTasksPanel tasks={linkedTasks} onTaskClick={onTaskClick} />
)}
```

Where `linkedTasks` is derived from `note.linkedTaskIds` mapped through `allTasks`.

- [ ] **Step 5: Run test to verify it passes**

```bash
npm test -- LinkedTasksPanel
```

Expected: PASS

- [ ] **Step 6: Commit**

```bash
git add src/features/notes/LinkedTasksPanel.tsx src/features/notes/LinkedTasksPanel.test.tsx
git commit -m "feat: add LinkedTasksPanel rendered below note content"
```

---

### Task 40: 🍅 Pomodoro start button on TaskItem and TasksTab

**Files:**
- Modify: `src/features/tasks/TaskItem.tsx`
- Modify: `src/features/tasks/TaskItem.test.tsx`
- Modify: `src/features/tasks/TasksTab.tsx`

- [ ] **Step 1: Add failing test for 🍅 button**

Add to `src/features/tasks/TaskItem.test.tsx`:

```typescript
test('renders 🍅 start button and calls onStartPomodoro when clicked', () => {
  const onStartPomodoro = vi.fn()
  render(<TaskItem task={task} tags={[tag]} pomodoroCount={0} onClick={() => {}} onToggle={() => {}}
    onStartPomodoro={onStartPomodoro} dragHandleProps={null} />)
  const btn = screen.getByRole('button', { name: /start pomodoro/i })
  fireEvent.click(btn)
  expect(onStartPomodoro).toHaveBeenCalledWith(task.id)
})
```

- [ ] **Step 2: Run test to verify it fails**

```bash
npm test -- TaskItem
```

- [ ] **Step 3: Update TaskItem to include 🍅 button**

Update `TaskItemProps` to add `onStartPomodoro?: (id: string) => void`.

Add the button after the pomodoro badge:

```typescript
{onStartPomodoro && (
  <button
    aria-label="start pomodoro"
    onClick={(e) => { e.stopPropagation(); onStartPomodoro(task.id) }}
    title="Start Pomodoro"
    style={{ background: 'none', border: 'none', cursor: 'pointer',
      fontSize: 16, padding: '2px 4px', opacity: 0.5, lineHeight: 1 }}
    onMouseEnter={e => (e.currentTarget.style.opacity = '1')}
    onMouseLeave={e => (e.currentTarget.style.opacity = '0.5')}
  >
    🍅
  </button>
)}
```

- [ ] **Step 4: Wire onStartPomodoro in TasksTab**

In `TasksTab.tsx`, pass `onStartPomodoro` to `TaskList` and then to each `TaskItem`:

```typescript
// In TasksTab, pass startSession down:
onStartPomodoro={(id) => startSession(id)}
```

Update `TaskList` props to accept and pass through `onStartPomodoro`.

- [ ] **Step 5: Run tests**

```bash
npm test -- TaskItem TaskList TasksTab
```

Expected: PASS

- [ ] **Step 6: Commit**

```bash
git add src/features/tasks/TaskItem.tsx src/features/tasks/TaskItem.test.tsx src/features/tasks/TaskList.tsx src/features/tasks/TasksTab.tsx
git commit -m "feat: add 🍅 Pomodoro start button to TaskItem and wire through TasksTab"
```

---

## Final Checklist

Before handing off or declaring done:

- [ ] `npm test` — all tests pass
- [ ] `npm run build` — TypeScript compiles with zero errors
- [ ] Manual smoke test in browser (see Task 37, Step 6)
- [ ] No `console.error` in browser dev tools on page load
- [ ] Pomodoro timer counts down and plays beep on completion
- [ ] Export backup JSON downloads correctly from RecoveryScreen (or test via browser console)

---
