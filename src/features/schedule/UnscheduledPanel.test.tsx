// src/features/schedule/UnscheduledPanel.test.tsx
import { render, screen, fireEvent } from '@testing-library/react'
import { DndContext } from '@dnd-kit/core'
import { UnscheduledPanel } from './UnscheduledPanel'
import type { Task } from '../../types'

const tasks: Task[] = [
  { id: 't1', title: 'Write tests', completed: false, order: 1, tagIds: [], createdAt: '', updatedAt: '' },
  { id: 't2', title: 'Deploy app', completed: false, order: 2, tagIds: [], createdAt: '', updatedAt: '' },
]

function Wrapper({ children }: { children: React.ReactNode }) {
  return <DndContext>{children}</DndContext>
}

test('renders unscheduled task titles', () => {
  render(<UnscheduledPanel tasks={tasks} tags={[]} onTaskClick={() => {}} />, { wrapper: Wrapper })
  expect(screen.getByText('Write tests')).toBeInTheDocument()
  expect(screen.getByText('Deploy app')).toBeInTheDocument()
})

test('is collapsible', () => {
  render(<UnscheduledPanel tasks={tasks} tags={[]} onTaskClick={() => {}} />, { wrapper: Wrapper })
  expect(screen.getByText('Write tests')).toBeVisible()
  fireEvent.click(screen.getByRole('button', { name: /unscheduled/i }))
  expect(screen.queryByText('Write tests')).not.toBeInTheDocument()
})
