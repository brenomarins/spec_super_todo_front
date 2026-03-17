import { render, screen } from '@testing-library/react'
import { TaskList } from './TaskList'
import type { Task } from '../../types'

const tasks: Task[] = [
  { id: 't1', title: 'Alpha', completed: false, order: 1, tagIds: [], createdAt: '', updatedAt: '' },
  { id: 't2', title: 'Beta', completed: false, order: 2, tagIds: [], createdAt: '', updatedAt: '' },
]

test('renders all top-level tasks', () => {
  render(<TaskList tasks={tasks} subtasks={[]} tags={[]} pomodoroStats={{}} activeTaskId={null}
    onTaskClick={() => {}} onTaskToggle={() => {}} onTaskReorder={() => {}} />)
  expect(screen.getByText('Alpha')).toBeInTheDocument()
  expect(screen.getByText('Beta')).toBeInTheDocument()
})

test('renders subtasks indented under parent', () => {
  const subtask: Task = { id: 'st1', title: 'Sub1', completed: false, order: 1,
    parentId: 't1', tagIds: [], createdAt: '', updatedAt: '' }
  render(<TaskList tasks={tasks} subtasks={[subtask]} tags={[]} pomodoroStats={{}} activeTaskId={null}
    onTaskClick={() => {}} onTaskToggle={() => {}} onTaskReorder={() => {}} />)
  expect(screen.getByText('Sub1')).toBeInTheDocument()
})

test('renders empty state when no tasks', () => {
  render(<TaskList tasks={[]} subtasks={[]} tags={[]} pomodoroStats={{}} activeTaskId={null}
    onTaskClick={() => {}} onTaskToggle={() => {}} onTaskReorder={() => {}} />)
  expect(screen.getByText(/no tasks yet/i)).toBeInTheDocument()
})
