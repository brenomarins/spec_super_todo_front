import { db } from '../../db/db'
import { recoverStaleSession } from '../pomodoroStore'

beforeEach(async () => {
  // Clear all sessions between tests using fake-indexeddb
  await db.pomodoroSessions.clear()
  await db.pomodoroStats.clear()
})

test('marks stats as interrupted when session is older than 2 hours', async () => {
  const staleStartedAt = new Date(Date.now() - 3 * 60 * 60 * 1000).toISOString()
  await db.pomodoroSessions.add({
    id: 'stale1', taskId: 't1', startedAt: staleStartedAt,
    completedAt: null, type: 'work', durationMinutes: 25, isOpen: 1,
  })

  const result = await recoverStaleSession()

  expect(result).toBe('interrupted')

  const stats = await db.pomodoroStats.get('t1')
  expect(stats?.totalInterrupted).toBe(1)
  expect(stats?.totalStarted).toBe(1)
})

test('returns active when session is recent (under 2 hours)', async () => {
  const recentStartedAt = new Date(Date.now() - 30 * 60 * 1000).toISOString()
  await db.pomodoroSessions.add({
    id: 'recent1', taskId: 't1', startedAt: recentStartedAt,
    completedAt: null, type: 'work', durationMinutes: 25, isOpen: 1,
  })

  const result = await recoverStaleSession()
  expect(result).toBe('active')
})

test('returns null when no open sessions', async () => {
  const result = await recoverStaleSession()
  expect(result).toBeNull()
})
