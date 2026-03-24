import { act } from '@testing-library/react'
import { vi, beforeEach, describe, it, expect } from 'vitest'
import { usePomodoroStore } from '../pomodoroStore'

// Mock the sessions API so no real HTTP calls are made
vi.mock('../../api/sessions', () => ({
  interruptSession: vi.fn().mockResolvedValue(undefined),
  completeSession: vi.fn().mockResolvedValue(undefined),
  startWorkSession: vi.fn().mockResolvedValue({
    id: 'w1', taskId: 't1', type: 'work', startedAt: new Date().toISOString(),
    completedAt: null, durationMinutes: 25, isOpen: 1,
  }),
  startBreakSession: vi.fn().mockResolvedValue({
    // The mock always returns short_break regardless of the type arg; tests only
    // assert on side-effects (count, completeSession calls), not the returned type.
    id: 'b1', taskId: undefined, type: 'short_break', startedAt: new Date().toISOString(),
    completedAt: null, durationMinutes: 5, isOpen: 1,
  }),
}))

import * as sessionsApi from '../../api/sessions'

describe('pomodoroStore', () => {
  beforeEach(() => {
    usePomodoroStore.setState({ activeSession: null, workSessionCount: 0 })
    vi.clearAllMocks()  // reset call counts between tests
  })

  it('setActiveSession sets active session', () => {
    act(() => {
      usePomodoroStore.getState().setActiveSession({
        taskId: 't1', sessionId: 's1',
        startedAt: new Date().toISOString(), type: 'work',
      })
    })
    expect(usePomodoroStore.getState().activeSession?.taskId).toBe('t1')
  })

  it('clearActiveSession nulls out the session', () => {
    act(() => {
      usePomodoroStore.getState().setActiveSession({
        taskId: 't1', sessionId: 's1',
        startedAt: new Date().toISOString(), type: 'work',
      })
      usePomodoroStore.getState().clearActiveSession()
    })
    expect(usePomodoroStore.getState().activeSession).toBeNull()
  })

  it('incrementWorkSessionCount increments counter', () => {
    act(() => {
      usePomodoroStore.getState().incrementWorkSessionCount()
      usePomodoroStore.getState().incrementWorkSessionCount()
    })
    expect(usePomodoroStore.getState().workSessionCount).toBe(2)
  })

  it('startBreakSession with active work session: completes work session, increments count, starts break', async () => {
    usePomodoroStore.setState({
      activeSession: { sessionId: 's1', taskId: 't1', type: 'work', startedAt: new Date().toISOString() },
      workSessionCount: 2,
    })
    await act(async () => {
      await usePomodoroStore.getState().startBreakSession('short_break', 't1')
    })
    expect(sessionsApi.completeSession).toHaveBeenCalledWith('s1')
    expect(usePomodoroStore.getState().workSessionCount).toBe(3)
    expect(usePomodoroStore.getState().activeSession?.type).toBe('short_break')
    expect(usePomodoroStore.getState().activeSession?.sessionId).toBe('b1')
  })

  it('startBreakSession with no active session: skips complete, starts break', async () => {
    usePomodoroStore.setState({ activeSession: null, workSessionCount: 0 })
    await act(async () => {
      await usePomodoroStore.getState().startBreakSession('long_break')
    })
    expect(sessionsApi.completeSession).not.toHaveBeenCalled()
    expect(usePomodoroStore.getState().workSessionCount).toBe(0)
  })

  it('startBreakSession with active break session: completes it, does NOT increment count', async () => {
    usePomodoroStore.setState({
      activeSession: { sessionId: 'b0', taskId: undefined, type: 'short_break', startedAt: new Date().toISOString() },
      workSessionCount: 1,
    })
    await act(async () => {
      await usePomodoroStore.getState().startBreakSession('long_break')
    })
    expect(sessionsApi.completeSession).toHaveBeenCalledWith('b0')
    expect(usePomodoroStore.getState().workSessionCount).toBe(1) // unchanged
  })
})
