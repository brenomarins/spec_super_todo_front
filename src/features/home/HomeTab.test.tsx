import { render, screen, fireEvent } from '@testing-library/react'
import { HomeTab } from './HomeTab'
import { usePomodoroStore } from '../../store/pomodoroStore'
import { useTaskStore } from '../../store/taskStore'
import { useTagStore } from '../../store/tagStore'

vi.mock('../../store/pomodoroStore')
vi.mock('../../store/taskStore')
vi.mock('../../store/tagStore')
vi.mock('../../lib/dateUtils', () => ({ todayISO: () => '2026-03-16' }))
vi.useFakeTimers()

beforeEach(() => {
  vi.setSystemTime(new Date('2026-03-16'))
  vi.mocked(useTagStore).mockReturnValue({ tags: [] } as any)
})

test('shows no-timer empty state when no active session and no tasks today', () => {
  vi.mocked(usePomodoroStore).mockReturnValue({
    activeSession: null, workSessionCount: 0,
    startSession: vi.fn(), stopSession: vi.fn(),
  } as any)
  vi.mocked(useTaskStore).mockReturnValue({ tasks: [] } as any)

  render(<HomeTab />)
  expect(screen.getByText(/no active timer/i)).toBeInTheDocument()
})

test('shows todays tasks scheduled for today', () => {
  vi.mocked(usePomodoroStore).mockReturnValue({
    activeSession: null, workSessionCount: 0,
    startSession: vi.fn(), stopSession: vi.fn(),
  } as any)
  vi.mocked(useTaskStore).mockReturnValue({
    tasks: [
      { id: 't1', title: 'Morning standup', completed: false, order: 1, tagIds: [],
        scheduledDay: '2026-03-16', createdAt: '', updatedAt: '' },
      { id: 't2', title: 'Deploy release', completed: false, order: 2, tagIds: [],
        scheduledDay: '2026-03-17', createdAt: '', updatedAt: '' },
    ],
  } as any)

  render(<HomeTab />)
  expect(screen.getByText('Morning standup')).toBeInTheDocument()
  expect(screen.queryByText('Deploy release')).not.toBeInTheDocument()
})

test('🍅 button calls startSession with task id', () => {
  const startSession = vi.fn()
  vi.mocked(usePomodoroStore).mockReturnValue({
    activeSession: null, workSessionCount: 0,
    startSession, stopSession: vi.fn(),
  } as any)
  vi.mocked(useTaskStore).mockReturnValue({
    tasks: [
      { id: 't1', title: 'Morning standup', completed: false, order: 1, tagIds: [],
        scheduledDay: '2026-03-16', createdAt: '', updatedAt: '' },
    ],
  } as any)

  render(<HomeTab />)
  fireEvent.click(screen.getByTitle('Start Pomodoro'))
  expect(startSession).toHaveBeenCalledWith('t1')
})

test('shows no-tasks-today empty state when no tasks scheduled for today', () => {
  vi.mocked(usePomodoroStore).mockReturnValue({
    activeSession: null, workSessionCount: 0,
    startSession: vi.fn(), stopSession: vi.fn(),
  } as any)
  vi.mocked(useTaskStore).mockReturnValue({ tasks: [] } as any)

  render(<HomeTab />)
  expect(screen.getByText(/nothing scheduled for today/i)).toBeInTheDocument()
})
