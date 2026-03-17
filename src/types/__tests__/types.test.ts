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
