import { renderHook, act } from '@testing-library/react'
import { usePomodoro } from './usePomodoro'
import { usePomodoroStore } from '../../store/pomodoroStore'

vi.mock('../../store/pomodoroStore')
vi.useFakeTimers()

const mockStore = {
  activeSession: null,
  workSessionCount: 0,
  startSession: vi.fn(),
  stopSession: vi.fn(),
  completeSession: vi.fn(),
}

beforeEach(() => {
  vi.mocked(usePomodoroStore).mockReturnValue(mockStore as any)
  vi.clearAllMocks()
})

test('returns 25:00 countdown when no active session', () => {
  const { result } = renderHook(() => usePomodoro())
  expect(result.current.display).toBe('25:00')
  expect(result.current.isRunning).toBe(false)
})

test('countdown decrements every second when active', () => {
  mockStore.activeSession = {
    sessionId: 's1', taskId: 't1', type: 'work',
    startedAt: new Date().toISOString(),
  } as any
  vi.mocked(usePomodoroStore).mockReturnValue({ ...mockStore, activeSession: mockStore.activeSession } as any)

  const { result } = renderHook(() => usePomodoro())
  act(() => { vi.advanceTimersByTime(60_000) })
  expect(result.current.display).toBe('24:00')
})

test('calls completeSession when countdown reaches zero', () => {
  const startedAt = new Date(Date.now() - 24 * 60 * 1000).toISOString()
  mockStore.activeSession = { sessionId: 's1', taskId: 't1', type: 'work', startedAt } as any
  vi.mocked(usePomodoroStore).mockReturnValue({ ...mockStore, activeSession: mockStore.activeSession } as any)

  const { result } = renderHook(() => usePomodoro())
  act(() => { vi.advanceTimersByTime(61_000) })
  expect(mockStore.completeSession).toHaveBeenCalled()
})
