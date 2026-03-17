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
    expect(await repo.getOpenSession()).toBeUndefined()
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
