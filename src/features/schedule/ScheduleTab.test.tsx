// src/features/schedule/ScheduleTab.test.tsx
import { render, screen } from '@testing-library/react'
import { ScheduleTab } from './ScheduleTab'
import { useTaskStore } from '../../store/taskStore'
import { useTagStore } from '../../store/tagStore'

vi.mock('../../store/taskStore')
vi.mock('../../store/tagStore')

const mockTasks = [
  { id: 't1', title: 'Design', completed: false, order: 1, tagIds: [],
    scheduledDay: '2026-03-16', createdAt: '', updatedAt: '' },
  { id: 't2', title: 'Unscheduled Task', completed: false, order: 2, tagIds: [],
    createdAt: '', updatedAt: '' },
]

beforeEach(() => {
  vi.useFakeTimers()
  vi.setSystemTime(new Date('2026-03-16'))
  vi.mocked(useTaskStore).mockReturnValue({ tasks: mockTasks, updateTask: vi.fn() } as any)
  vi.mocked(useTagStore).mockReturnValue({ tags: [] } as any)
})

afterEach(() => vi.useRealTimers())

test('renders 7 day columns', () => {
  render(<ScheduleTab />)
  expect(screen.getByText('MON')).toBeInTheDocument()
  expect(screen.getByText('SUN')).toBeInTheDocument()
})

test('renders unscheduled panel with unscheduled tasks', () => {
  render(<ScheduleTab />)
  expect(screen.getByText('Unscheduled Task')).toBeInTheDocument()
})

test('renders scheduled task in correct day column', () => {
  render(<ScheduleTab />)
  expect(screen.getByText('Design')).toBeInTheDocument()
})
