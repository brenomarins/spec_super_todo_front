import { render, screen } from '@testing-library/react'
import { TaskList } from './TaskList'
import type { Task } from '../../types'

vi.mock('../../lib/dateUtils', () => ({
  todayISO: () => '2026-03-18',
  getWeekDays: () => [
    '2026-03-16', '2026-03-17', '2026-03-18',
    '2026-03-19', '2026-03-20', '2026-03-21', '2026-03-22',
  ],
}))

// Today is Wednesday 2026-03-18; endOfWeek is Sunday 2026-03-22

const base = { completed: false, tagIds: [], createdAt: '', updatedAt: '' }

test('renders group heading for No Due Date group', () => {
  const tasks: Task[] = [
    { ...base, id: 't1', title: 'Alpha', order: 1 },
  ]
  render(<TaskList tasks={tasks} subtasks={[]} tags={[]} pomodoroStats={{}} activeTaskId={null}
    onTaskClick={() => {}} onTaskToggle={() => {}} overdueOnly={false} />)
  expect(screen.getByText(/NO DUE DATE/i)).toBeInTheDocument()
  expect(screen.getByText('Alpha')).toBeInTheDocument()
})

test('routes overdue task to Overdue group', () => {
  const tasks: Task[] = [
    { ...base, id: 't1', title: 'Late task', order: 1, dueDate: '2026-03-10' },
  ]
  render(<TaskList tasks={tasks} subtasks={[]} tags={[]} pomodoroStats={{}} activeTaskId={null}
    onTaskClick={() => {}} onTaskToggle={() => {}} overdueOnly={false} />)
  expect(screen.getByText(/OVERDUE/i)).toBeInTheDocument()
  expect(screen.getByText('Late task')).toBeInTheDocument()
})

test('routes due-today task to Due Today group', () => {
  const tasks: Task[] = [
    { ...base, id: 't1', title: 'Today task', order: 1, dueDate: '2026-03-18' },
  ]
  render(<TaskList tasks={tasks} subtasks={[]} tags={[]} pomodoroStats={{}} activeTaskId={null}
    onTaskClick={() => {}} onTaskToggle={() => {}} overdueOnly={false} />)
  expect(screen.getByText(/DUE TODAY/i)).toBeInTheDocument()
})

test('routes this-week task to Due This Week group', () => {
  const tasks: Task[] = [
    { ...base, id: 't1', title: 'Week task', order: 1, dueDate: '2026-03-20' },
  ]
  render(<TaskList tasks={tasks} subtasks={[]} tags={[]} pomodoroStats={{}} activeTaskId={null}
    onTaskClick={() => {}} onTaskToggle={() => {}} overdueOnly={false} />)
  expect(screen.getByText(/DUE THIS WEEK/i)).toBeInTheDocument()
})

test('routes later task to Due Later group', () => {
  const tasks: Task[] = [
    { ...base, id: 't1', title: 'Later task', order: 1, dueDate: '2026-04-10' },
  ]
  render(<TaskList tasks={tasks} subtasks={[]} tags={[]} pomodoroStats={{}} activeTaskId={null}
    onTaskClick={() => {}} onTaskToggle={() => {}} overdueOnly={false} />)
  expect(screen.getByText(/DUE LATER/i)).toBeInTheDocument()
})

test('completed past-due task appears in Overdue group', () => {
  const tasks: Task[] = [
    { ...base, id: 't1', title: 'Done late', order: 1, dueDate: '2026-03-10', completed: true },
  ]
  render(<TaskList tasks={tasks} subtasks={[]} tags={[]} pomodoroStats={{}} activeTaskId={null}
    onTaskClick={() => {}} onTaskToggle={() => {}} overdueOnly={false} />)
  expect(screen.getByText(/OVERDUE/i)).toBeInTheDocument()
  expect(screen.getByText('Done late')).toBeInTheDocument()
})

test('empty groups are hidden', () => {
  const tasks: Task[] = [
    { ...base, id: 't1', title: 'Alpha', order: 1 },
  ]
  render(<TaskList tasks={tasks} subtasks={[]} tags={[]} pomodoroStats={{}} activeTaskId={null}
    onTaskClick={() => {}} onTaskToggle={() => {}} overdueOnly={false} />)
  expect(screen.queryByText(/OVERDUE/i)).not.toBeInTheDocument()
  expect(screen.queryByText(/DUE TODAY/i)).not.toBeInTheDocument()
})

test('renders EmptyState when all tasks filtered out', () => {
  render(<TaskList tasks={[]} subtasks={[]} tags={[]} pomodoroStats={{}} activeTaskId={null}
    onTaskClick={() => {}} onTaskToggle={() => {}} overdueOnly={false} />)
  expect(screen.getByText(/no tasks yet/i)).toBeInTheDocument()
})

test('overdueOnly renders only the Overdue group', () => {
  const tasks: Task[] = [
    { ...base, id: 't1', title: 'Late task', order: 1, dueDate: '2026-03-10' },
    { ...base, id: 't2', title: 'No date task', order: 2 },
  ]
  render(<TaskList tasks={tasks} subtasks={[]} tags={[]} pomodoroStats={{}} activeTaskId={null}
    onTaskClick={() => {}} onTaskToggle={() => {}} overdueOnly={true} />)
  expect(screen.getByText('Late task')).toBeInTheDocument()
  expect(screen.queryByText('No date task')).not.toBeInTheDocument()
  expect(screen.queryByText(/NO DUE DATE/i)).not.toBeInTheDocument()
})

test('No Due Date group sorted by order ascending', () => {
  const tasks: Task[] = [
    { ...base, id: 't1', title: 'Charlie', order: 3 },
    { ...base, id: 't2', title: 'Alpha', order: 1 },
    { ...base, id: 't3', title: 'Beta', order: 2 },
  ]
  render(<TaskList tasks={tasks} subtasks={[]} tags={[]} pomodoroStats={{}} activeTaskId={null}
    onTaskClick={() => {}} onTaskToggle={() => {}} overdueOnly={false} />)
  const titles = screen.getAllByText(/Alpha|Beta|Charlie/).map(el => el.textContent)
  expect(titles).toEqual(['Alpha', 'Beta', 'Charlie'])
})

test('renders subtasks under parent in dated group', () => {
  const tasks: Task[] = [
    { ...base, id: 't1', title: 'Parent', order: 1, dueDate: '2026-03-10' },
  ]
  const subtasks: Task[] = [
    { ...base, id: 'st1', title: 'Child', order: 1, parentId: 't1' },
  ]
  render(<TaskList tasks={tasks} subtasks={subtasks} tags={[]} pomodoroStats={{}} activeTaskId={null}
    onTaskClick={() => {}} onTaskToggle={() => {}} overdueOnly={false} />)
  expect(screen.getByText('Child')).toBeInTheDocument()
})
