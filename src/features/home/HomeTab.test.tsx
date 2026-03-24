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

// Shared mock builder — all tests use this to avoid missing new required fields
const mockPomodoro = (overrides = {}) => ({
  activeSession: null,
  workSessionCount: 0,
  startSession: vi.fn(),
  stopSession: vi.fn(),
  completeSession: vi.fn(),
  startBreakSession: vi.fn(),
  ...overrides,
})

beforeEach(() => {
  vi.setSystemTime(new Date('2026-03-16'))
  vi.mocked(useTagStore).mockReturnValue({ tags: [] } as any)
})

test('shows no-timer empty state when no active session and no tasks today', () => {
  vi.mocked(usePomodoroStore).mockReturnValue(mockPomodoro() as any)
  vi.mocked(useTaskStore).mockReturnValue({ tasks: [] } as any)

  render(<HomeTab />)
  expect(screen.getByText(/no active timer/i)).toBeInTheDocument()
})

test('shows todays tasks scheduled for today', () => {
  vi.mocked(usePomodoroStore).mockReturnValue(mockPomodoro() as any)
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
  vi.mocked(usePomodoroStore).mockReturnValue(mockPomodoro({ startSession }) as any)
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
  vi.mocked(usePomodoroStore).mockReturnValue(mockPomodoro() as any)
  vi.mocked(useTaskStore).mockReturnValue({ tasks: [] } as any)

  render(<HomeTab />)
  expect(screen.getByText(/nothing scheduled for today/i)).toBeInTheDocument()
})

test('renders DueDateBadge for a task with a due date', () => {
  vi.mocked(usePomodoroStore).mockReturnValue(mockPomodoro() as any)
  vi.mocked(useTaskStore).mockReturnValue({
    tasks: [
      { id: 't1', title: 'Morning standup', completed: false, order: 1, tagIds: [],
        scheduledDay: '2026-03-16', dueDate: '2026-03-10', createdAt: '', updatedAt: '' },
    ],
  } as any)

  render(<HomeTab />)
  expect(screen.getByText('! Mar 10')).toBeInTheDocument()
})

test('shows Complete, Short Break, Long Break buttons and fires callbacks during work session', () => {
  const completeSession = vi.fn()
  const startBreakSession = vi.fn()
  vi.mocked(usePomodoroStore).mockReturnValue(mockPomodoro({
    activeSession: {
      sessionId: 's1', taskId: 't1', type: 'work',
      startedAt: '2026-03-16T00:00:00.000Z',
    },
    completeSession,
    startBreakSession,
  }) as any)
  vi.mocked(useTaskStore).mockReturnValue({
    tasks: [
      { id: 't1', title: 'Coding', completed: false, order: 1, tagIds: [],
        scheduledDay: '2026-03-16', createdAt: '', updatedAt: '' },
    ],
  } as any)

  render(<HomeTab />)
  expect(screen.getByText(/complete/i)).toBeInTheDocument()
  expect(screen.getByText(/short break/i)).toBeInTheDocument()
  expect(screen.getByText(/long break/i)).toBeInTheDocument()

  fireEvent.click(screen.getByText(/complete/i))
  expect(completeSession).toHaveBeenCalledTimes(1)

  fireEvent.click(screen.getByText(/short break/i))
  expect(startBreakSession).toHaveBeenCalledWith('short_break', 't1')

  fireEvent.click(screen.getByText(/long break/i))
  expect(startBreakSession).toHaveBeenCalledWith('long_break', 't1')
})
