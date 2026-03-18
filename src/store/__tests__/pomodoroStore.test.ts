import { act } from '@testing-library/react'
import { usePomodoroStore } from '../pomodoroStore'

describe('pomodoroStore', () => {
  beforeEach(() => usePomodoroStore.setState({
    activeSession: null, workSessionCount: 0,
  }))

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
})
