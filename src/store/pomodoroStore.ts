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
