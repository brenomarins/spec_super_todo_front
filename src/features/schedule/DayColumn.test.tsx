// src/features/schedule/DayColumn.test.tsx
import { render, screen, fireEvent } from '@testing-library/react'
import { DayColumn } from './DayColumn'
import type { Task } from '../../types'

// dnd-kit requires DndContext wrapper
import { DndContext } from '@dnd-kit/core'

const task: Task = {
  id: 't1', title: 'Design Homepage', completed: false, order: 1, tagIds: [],
  scheduledDay: '2026-03-16', createdAt: '', updatedAt: '',
}

function Wrapper({ children }: { children: React.ReactNode }) {
  return <DndContext>{children}</DndContext>
}

test('renders day header and task card', () => {
  render(<DayColumn day="2026-03-16" label="MON" tasks={[task]} tags={[]}
    onTaskClick={() => {}} onRemoveDay={() => {}} />, { wrapper: Wrapper })
  expect(screen.getByText('MON')).toBeInTheDocument()
  expect(screen.getByText('Design Homepage')).toBeInTheDocument()
})

test('calls onRemoveDay when × clicked on task card', () => {
  const onRemoveDay = vi.fn()
  render(<DayColumn day="2026-03-16" label="MON" tasks={[task]} tags={[]}
    onTaskClick={() => {}} onRemoveDay={onRemoveDay} />, { wrapper: Wrapper })
  fireEvent.click(screen.getByRole('button', { name: /remove from day/i }))
  expect(onRemoveDay).toHaveBeenCalledWith('t1')
})

test('shows dashed border when empty', () => {
  render(<DayColumn day="2026-03-17" label="TUE" tasks={[]} tags={[]}
    onTaskClick={() => {}} onRemoveDay={() => {}} />, { wrapper: Wrapper })
  const col = screen.getByTestId('day-column-2026-03-17')
  expect(col).toHaveStyle({ border: '1px dashed' })
})
