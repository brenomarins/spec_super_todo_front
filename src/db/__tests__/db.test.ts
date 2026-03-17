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
