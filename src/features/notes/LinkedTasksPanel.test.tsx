// src/features/notes/LinkedTasksPanel.test.tsx
import { render, screen, fireEvent } from '@testing-library/react'
import { LinkedTasksPanel } from './LinkedTasksPanel'
import type { Task } from '../../types'

const tasks: Task[] = [
  { id: 't1', title: 'Design Homepage', completed: false, order: 1, tagIds: [], createdAt: '', updatedAt: '' },
  { id: 't2', title: 'Write tests', completed: true, order: 2, tagIds: [], createdAt: '', updatedAt: '' },
]

test('renders linked task titles', () => {
  render(<LinkedTasksPanel tasks={tasks} onTaskClick={() => {}} />)
  expect(screen.getByText('Design Homepage')).toBeInTheDocument()
  expect(screen.getByText('Write tests')).toBeInTheDocument()
})

test('renders nothing when no linked tasks', () => {
  const { container } = render(<LinkedTasksPanel tasks={[]} onTaskClick={() => {}} />)
  expect(container).toBeEmptyDOMElement()
})

test('calls onTaskClick when task clicked', () => {
  const onTaskClick = vi.fn()
  render(<LinkedTasksPanel tasks={tasks} onTaskClick={onTaskClick} />)
  fireEvent.click(screen.getByText('Design Homepage'))
  expect(onTaskClick).toHaveBeenCalledWith('t1')
})

test('shows completion indicator', () => {
  render(<LinkedTasksPanel tasks={tasks} onTaskClick={() => {}} />)
  expect(screen.getByText('✓')).toBeInTheDocument()
  expect(screen.getByText('○')).toBeInTheDocument()
})
