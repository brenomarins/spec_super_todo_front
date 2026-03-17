import { render, screen, fireEvent } from '@testing-library/react'
import { TasksTab } from './TasksTab'
import { useTaskStore } from '../../store/taskStore'
import { useTagStore } from '../../store/tagStore'
import { usePomodoroStore } from '../../store/pomodoroStore'

vi.mock('../../store/taskStore')
vi.mock('../../store/tagStore')
vi.mock('../../store/pomodoroStore')

const mockTasks = [
  { id: 't1', title: 'Alpha', completed: false, order: 1, tagIds: [], createdAt: '', updatedAt: '' },
]

beforeEach(() => {
  vi.mocked(useTaskStore).mockReturnValue({
    tasks: mockTasks, addTask: vi.fn(), updateTask: vi.fn(),
    reorderTasks: vi.fn(),
  } as any)
  vi.mocked(useTagStore).mockReturnValue({ tags: [], addTag: vi.fn() } as any)
  vi.mocked(usePomodoroStore).mockReturnValue({
    activeSession: null, stats: {}, sessions: {},
  } as any)
})

test('renders task list and add input', () => {
  render(<TasksTab />)
  expect(screen.getByPlaceholderText('+ Add task...')).toBeInTheDocument()
  expect(screen.getByText('Alpha')).toBeInTheDocument()
})

test('opens detail panel when task is clicked', () => {
  render(<TasksTab />)
  fireEvent.click(screen.getByText('Alpha'))
  expect(screen.getByText('Task Detail')).toBeInTheDocument()
})

test('closes detail panel when × clicked', () => {
  render(<TasksTab />)
  fireEvent.click(screen.getByText('Alpha'))
  fireEvent.click(screen.getByRole('button', { name: /close/i }))
  expect(screen.queryByText('Task Detail')).not.toBeInTheDocument()
})
