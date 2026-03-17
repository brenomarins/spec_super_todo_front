import { render, screen, fireEvent } from '@testing-library/react'
import { TaskItem } from './TaskItem'
import { SubtaskItem } from './SubtaskItem'
import type { Task, Tag } from '../../types'

const tag: Tag = { id: 'tg1', name: 'work', color: '#3b82f6' }
const task: Task = {
  id: 't1', title: 'Design Homepage', completed: false,
  order: 1, tagIds: ['tg1'], createdAt: '2026-01-01', updatedAt: '2026-01-01',
}

test('TaskItem renders title and tags', () => {
  render(<TaskItem task={task} tags={[tag]} pomodoroCount={2} onClick={() => {}} onToggle={() => {}} dragHandleProps={null} />)
  expect(screen.getByText('Design Homepage')).toBeInTheDocument()
  expect(screen.getByText('work')).toBeInTheDocument()
})

test('TaskItem shows pomodoro badge when count > 0', () => {
  render(<TaskItem task={task} tags={[tag]} pomodoroCount={3} onClick={() => {}} onToggle={() => {}} dragHandleProps={null} />)
  expect(screen.getByText('🍅 3')).toBeInTheDocument()
})

test('TaskItem calls onToggle when checkbox clicked', () => {
  const onToggle = vi.fn()
  render(<TaskItem task={task} tags={[tag]} pomodoroCount={0} onClick={() => {}} onToggle={onToggle} dragHandleProps={null} />)
  fireEvent.click(screen.getByRole('checkbox'))
  expect(onToggle).toHaveBeenCalledWith('t1')
})

test('TaskItem calls onClick when row clicked', () => {
  const onClick = vi.fn()
  render(<TaskItem task={task} tags={[tag]} pomodoroCount={0} onClick={onClick} onToggle={() => {}} dragHandleProps={null} />)
  fireEvent.click(screen.getByText('Design Homepage'))
  expect(onClick).toHaveBeenCalledWith('t1')
})

test('SubtaskItem renders with completed strikethrough', () => {
  const subtask = { ...task, id: 'st1', completed: true, parentId: 't1' }
  render(<SubtaskItem task={subtask} onClick={() => {}} onToggle={() => {}} />)
  const title = screen.getByText('Design Homepage')
  expect(title).toHaveStyle({ textDecoration: 'line-through' })
})
