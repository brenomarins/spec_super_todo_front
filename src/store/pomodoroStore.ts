// src/store/pomodoroStore.ts
import { create } from 'zustand'
import * as api from '../api/sessions'

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
  startBreakSession: (type: 'short_break' | 'long_break', taskId?: string) => Promise<void>
}

export const usePomodoroStore = create<PomodoroStore>((set, get) => ({
  activeSession: null,
  workSessionCount: 0,
  setActiveSession: session => set({ activeSession: session }),
  clearActiveSession: () => set({ activeSession: null }),
  incrementWorkSessionCount: () => set(s => ({ workSessionCount: s.workSessionCount + 1 })),

  startSession: async (taskId: string) => {
    const { activeSession } = get()
    if (activeSession) {
      if (activeSession.type === 'work') {
        await api.interruptSession(activeSession.sessionId)
      } else {
        // break sessions use complete — interrupt is work-only per API spec
        await api.completeSession(activeSession.sessionId)
      }
    }
    const session = await api.startWorkSession(taskId)
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
    if (activeSession.type === 'work') {
      await api.interruptSession(activeSession.sessionId)
    } else {
      await api.completeSession(activeSession.sessionId)
    }
    set({ activeSession: null })
  },

  completeSession: async () => {
    const { activeSession, workSessionCount } = get()
    if (!activeSession) return
    await api.completeSession(activeSession.sessionId)
    if (activeSession.type === 'work') {
      set({ activeSession: null, workSessionCount: workSessionCount + 1 })
    } else {
      set({ activeSession: null })
    }
  },

  startBreakSession: async (type: 'short_break' | 'long_break', taskId?: string) => {
    const { activeSession, workSessionCount } = get()
    if (activeSession) {
      await api.completeSession(activeSession.sessionId)
      if (activeSession.type === 'work') {
        set({ workSessionCount: workSessionCount + 1 })
      }
    }
    const session = await api.startBreakSession(type, taskId)
    set({
      activeSession: {
        sessionId: session.id,
        taskId: session.taskId,
        type: session.type,
        startedAt: session.startedAt,
      },
    })
  },
}))
