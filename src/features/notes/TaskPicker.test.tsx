// src/features/notes/TaskPicker.test.tsx
import { render, screen, fireEvent } from '@testing-library/react'
import { TaskPicker } from './TaskPicker'
import type { Task } from '../../types'

const tasks: Task[] = [
  { id: 't1', title: 'Design Homepage', completed: false, order: 1, tagIds: [], createdAt: '', updatedAt: '' },
  { id: 't2', title: 'Write tests', completed: false, order: 2, tagIds: [], createdAt: '', updatedAt: '' },
]

test('renders filtered task list based on query', () => {
  render(<TaskPicker tasks={tasks} query="des" position={{ top: 100, left: 50 }}
    onSelect={() => {}} onDismiss={() => {}} />)
  expect(screen.getByText('Design Homepage')).toBeInTheDocument()
  expect(screen.queryByText('Write tests')).not.toBeInTheDocument()
})

test('calls onSelect with task when clicked', () => {
  const onSelect = vi.fn()
  render(<TaskPicker tasks={tasks} query="" position={{ top: 100, left: 50 }}
    onSelect={onSelect} onDismiss={() => {}} />)
  fireEvent.click(screen.getByText('Design Homepage'))
  expect(onSelect).toHaveBeenCalledWith(tasks[0])
})

test('calls onDismiss on Escape key', () => {
  const onDismiss = vi.fn()
  render(<TaskPicker tasks={tasks} query="" position={{ top: 100, left: 50 }}
    onSelect={() => {}} onDismiss={onDismiss} />)
  fireEvent.keyDown(document, { key: 'Escape' })
  expect(onDismiss).toHaveBeenCalled()
})

test('renders empty message when no tasks match query', () => {
  render(<TaskPicker tasks={tasks} query="zzzz" position={{ top: 100, left: 50 }}
    onSelect={() => {}} onDismiss={() => {}} />)
  expect(screen.getByText(/no tasks match/i)).toBeInTheDocument()
})
