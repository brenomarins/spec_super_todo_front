import { create } from 'zustand'
import { PomodoroRepository } from '../db/repositories/PomodoroRepository'
import { db } from '../db/db'

interface ActiveSession {
  taskId?: string
  sessionId: string
  startedAt: string
  type: 'work' | 'short_break' | 'long_break'
}

interface PomodoroStore {
  activeSession: ActiveSession | null
  workSessionCount: number        // resets on page reload; intentional
  setActiveSession: (session: ActiveSession) => void
  clearActiveSession: () => void
  incrementWorkSessionCount: () => void
  startSession: (taskId: string) => Promise<void>
  stopSession: () => Promise<void>
  completeSession: () => Promise<void>
}

export const usePomodoroStore = create<PomodoroStore>((set, get) => ({
  activeSession: null,
  workSessionCount: 0,
  setActiveSession: session => set({ activeSession: session }),
  clearActiveSession: () => set({ activeSession: null }),
  incrementWorkSessionCount: () => set(s => ({ workSessionCount: s.workSessionCount + 1 })),

  startSession: async (taskId: string) => {
    const { activeSession } = get()
    const repo = new PomodoroRepository(db)
    if (activeSession) {
      if (activeSession.type === 'work') {
        await repo.interruptWorkSession(activeSession.sessionId)
      } else {
        // end break session without stats
        await repo.completeBreakSession(activeSession.sessionId)
      }
    }
    const session = await repo.createWorkSession(taskId)
    set({
      activeSession: {
        sessionId: session.id,
        taskId: session.taskId,
        type: session.type,
        startedAt: session.startedAt,
      },
    })
  },

  stopSession: async () => {
    const { activeSession } = get()
    if (!activeSession) return
    const repo = new PomodoroRepository(db)
    if (activeSession.type === 'work') {
      await repo.interruptWorkSession(activeSession.sessionId)
    } else {
      await repo.completeBreakSession(activeSession.sessionId)
    }
    set({ activeSession: null })
  },

  completeSession: async () => {
    const { activeSession, workSessionCount } = get()
    if (!activeSession) return
    const repo = new PomodoroRepository(db)
    if (activeSession.type === 'work') {
      await repo.completeWorkSession(activeSession.sessionId, new Date().toISOString())
      set({ activeSession: null, workSessionCount: workSessionCount + 1 })
    } else {
      await repo.completeBreakSession(activeSession.sessionId)
      set({ activeSession: null })
    }
  },
}))
