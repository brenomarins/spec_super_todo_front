import { useState, useEffect } from 'react'

const LS_KEY = 'pomodoro:activeSession'

export interface BroadcastSession {
  sessionId: string
  taskId?: string
  type: 'work' | 'short_break' | 'long_break'
  startedAt: string
  status: 'active' | 'stopped' | 'completed'
}

export function useMultiTabSync() {
  const [remoteSession, setRemoteSession] = useState<BroadcastSession | null>(() => {
    try { return JSON.parse(localStorage.getItem(LS_KEY) ?? 'null') }
    catch { return null }
  })

  useEffect(() => {
    function handler(e: StorageEvent) {
      if (e.key !== LS_KEY) return
      try { setRemoteSession(e.newValue ? JSON.parse(e.newValue) : null) }
      catch { setRemoteSession(null) }
    }
    window.addEventListener('storage', handler)
    return () => window.removeEventListener('storage', handler)
  }, [])

  function broadcast(session: BroadcastSession) {
    localStorage.setItem(LS_KEY, JSON.stringify(session))
  }

  function clearBroadcast() {
    localStorage.removeItem(LS_KEY)
  }

  return { remoteSession, broadcast, clearBroadcast }
}
