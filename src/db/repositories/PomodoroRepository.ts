// src/db/repositories/PomodoroRepository.ts
import { nanoid } from 'nanoid'
import type { TimeManagerDB } from '../db'
import type { PomodoroSession, PomodoroStats } from '../../types'

export const WORK_DURATION = 25

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
    await this.db.transaction('rw', [this.db.pomodoroSessions, this.db.pomodoroStats], async () => {
      // completedAt stays null — already the interrupted signal per spec
      if (session.taskId) {
        await this._upsertStats(session.taskId, stats => ({
          ...stats,
          totalInterrupted: stats.totalInterrupted + 1,
          lastSessionAt: new Date().toISOString(),
        }))
      }
    })
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
    const session = await this.db.pomodoroSessions.get(id)
    if (!session || session.type === 'work') return
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
      lastSessionAt: null, updatedAt: '',
    }
    const updated = updater(base)
    await this.db.pomodoroStats.put({ ...updated, updatedAt: new Date().toISOString() })
  }
}
