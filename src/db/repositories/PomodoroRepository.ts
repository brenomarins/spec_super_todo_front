// src/db/repositories/PomodoroRepository.ts
import { nanoid } from 'nanoid'
import type { TimeManagerDB } from '../db'
import type { PomodoroSession, PomodoroStats } from '../../types'

export const WORK_DURATION = 25
export const SHORT_BREAK_DURATION = 5
export const LONG_BREAK_DURATION = 15

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
      isOpen: 1,
    }
    await this.db.transaction('rw', [this.db.pomodoroSessions, this.db.pomodoroStats], async () => {
      await this.db.pomodoroSessions.add(session)
      await this._upsertStats(taskId, stats => ({ ...stats, totalStarted: stats.totalStarted + 1 }))
    })
    return session
  }

  async completeWorkSession(id: string, completedAt: string): Promise<void> {
    await this.db.transaction('rw', [this.db.pomodoroSessions, this.db.pomodoroStats], async () => {
      const session = await this.db.pomodoroSessions.get(id)
      if (!session || session.type !== 'work') return
      await this.db.pomodoroSessions.update(id, { completedAt, isOpen: 0 })
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
    await this.db.transaction('rw', [this.db.pomodoroSessions, this.db.pomodoroStats], async () => {
      const session = await this.db.pomodoroSessions.get(id)
      if (!session || session.type !== 'work') return
      // completedAt stays null — null signals interrupted per spec
      await this.db.pomodoroSessions.update(id, { isOpen: 0 })
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
    const durationMinutes = type === 'short_break' ? SHORT_BREAK_DURATION : LONG_BREAK_DURATION
    const session: PomodoroSession = {
      id: nanoid(), taskId, startedAt: new Date().toISOString(),
      completedAt: null, type, durationMinutes, isOpen: 1,
    }
    await this.db.pomodoroSessions.add(session)
    return session
  }

  async completeBreakSession(id: string): Promise<void> {
    await this.db.transaction('rw', this.db.pomodoroSessions, async () => {
      const session = await this.db.pomodoroSessions.get(id)
      if (!session || session.type === 'work') return
      await this.db.pomodoroSessions.update(id, { completedAt: new Date().toISOString(), isOpen: 0 })
    })
  }

  async getOpenSession(): Promise<PomodoroSession | undefined> {
    return this.db.pomodoroSessions.where('isOpen').equals(1).first()
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

  async upsertStatsInterrupted(taskId: string): Promise<void> {
    await this._upsertStats(taskId, stats => ({
      ...stats,
      totalStarted: stats.totalStarted + 1,
      totalInterrupted: stats.totalInterrupted + 1,
      lastSessionAt: new Date().toISOString(),
    }))
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
