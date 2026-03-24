import { useState, useEffect, useRef } from 'react'
import { usePomodoroStore } from '../../store/pomodoroStore'
import { playBeep } from '../../lib/audioUtils'

const DURATIONS: Record<string, number> = {
  work: 25 * 60,
  short_break: 5 * 60,
  long_break: 15 * 60,
}

function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60).toString().padStart(2, '0')
  const s = (seconds % 60).toString().padStart(2, '0')
  return `${m}:${s}`
}

export function usePomodoro() {
  const { activeSession, workSessionCount, startSession, stopSession, completeSession, startBreakSession } = usePomodoroStore()
  const [secondsLeft, setSecondsLeft] = useState<number>(() => {
    if (!activeSession) return DURATIONS.work
    const elapsed = Math.floor((Date.now() - Date.parse(activeSession.startedAt)) / 1000)
    return Math.max(0, DURATIONS[activeSession.type] - elapsed)
  })
  const completedRef = useRef(false)

  useEffect(() => {
    if (!activeSession) {
      setSecondsLeft(DURATIONS.work)
      completedRef.current = false
      return
    }
    const elapsed = Math.floor((Date.now() - Date.parse(activeSession.startedAt)) / 1000)
    setSecondsLeft(Math.max(0, DURATIONS[activeSession.type] - elapsed))
    completedRef.current = false
  }, [activeSession?.sessionId])

  useEffect(() => {
    if (!activeSession) return
    const interval = setInterval(() => {
      setSecondsLeft(prev => Math.max(0, prev - 1))
    }, 1000)
    return () => clearInterval(interval)
  }, [activeSession?.sessionId])

  useEffect(() => {
    if (!activeSession || secondsLeft > 0 || completedRef.current) return
    completedRef.current = true
    completeSession()
    playBeep()
    document.title = '⏰ Timer complete! — Time Manager'
  }, [secondsLeft, activeSession?.sessionId])

  return {
    display: formatTime(secondsLeft),
    secondsLeft,
    isRunning: !!activeSession,
    activeSession,
    workSessionCount,
    startSession,
    stopSession,
    completeSession,
    startBreakSession,
  }
}
