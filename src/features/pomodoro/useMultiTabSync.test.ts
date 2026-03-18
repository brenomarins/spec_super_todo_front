import { renderHook, act } from '@testing-library/react'
import { useMultiTabSync } from './useMultiTabSync'

const LS_KEY = 'pomodoro:activeSession'

beforeEach(() => localStorage.clear())

test('writes session to localStorage when broadcasting', () => {
  const { result } = renderHook(() => useMultiTabSync())
  act(() => {
    result.current.broadcast({ sessionId: 's1', taskId: 't1', type: 'work', startedAt: '2026-01-01T00:00:00Z', status: 'active' })
  })
  const stored = JSON.parse(localStorage.getItem(LS_KEY)!)
  expect(stored.sessionId).toBe('s1')
})

test('clears localStorage on clearBroadcast', () => {
  localStorage.setItem(LS_KEY, JSON.stringify({ sessionId: 's1' }))
  const { result } = renderHook(() => useMultiTabSync())
  act(() => result.current.clearBroadcast())
  expect(localStorage.getItem(LS_KEY)).toBeNull()
})

test('returns remoteSession when storage event fires from another tab', () => {
  const { result } = renderHook(() => useMultiTabSync())
  act(() => {
    const event = new StorageEvent('storage', {
      key: LS_KEY,
      newValue: JSON.stringify({ sessionId: 's2', taskId: 't1', type: 'work', startedAt: '2026-01-01T00:00:00Z', status: 'active' }),
    })
    window.dispatchEvent(event)
  })
  expect(result.current.remoteSession?.sessionId).toBe('s2')
})
