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
