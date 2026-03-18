import { render, screen, fireEvent } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { TaskDetailPanel } from './TaskDetailPanel'
import type { Task, PomodoroSession, PomodoroStats } from '../../types'

const task: Task = {
  id: 't1', title: 'Design Homepage', description: 'Build the UI',
  completed: false, order: 1, tagIds: [], createdAt: '2026-01-01T00:00:00Z', updatedAt: '2026-01-01T00:00:00Z',
}
const stats: PomodoroStats = {
  taskId: 't1', totalStarted: 3, totalCompleted: 2,
  totalInterrupted: 1, totalMinutesFocused: 50,
  lastSessionAt: '2026-01-01T12:00:00Z', updatedAt: '2026-01-01T12:00:00Z',
}
const sessions: PomodoroSession[] = [
  { id: 's1', taskId: 't1', startedAt: '2026-01-01T10:00:00Z',
    completedAt: '2026-01-01T10:25:00Z', type: 'work', durationMinutes: 25, isOpen: 0 },
  { id: 's2', taskId: 't1', startedAt: '2026-01-01T11:00:00Z',
    completedAt: null, type: 'work', durationMinutes: 25, isOpen: 0 },
]

test('renders task title', () => {
  render(<TaskDetailPanel task={task} subtasks={[]} tags={[]} allTags={[]} linkedNotes={[]}
    pomodoroStats={stats} sessions={sessions}
    onClose={() => {}} onUpdate={() => {}} onAddSubtask={() => {}} onTagChange={() => {}} onTagCreate={() => {}} />)
  expect(screen.getByDisplayValue('Design Homepage')).toBeInTheDocument()
})

test('renders pomodoro summary', () => {
  render(<TaskDetailPanel task={task} subtasks={[]} tags={[]} allTags={[]} linkedNotes={[]}
    pomodoroStats={stats} sessions={sessions}
    onClose={() => {}} onUpdate={() => {}} onAddSubtask={() => {}} onTagChange={() => {}} onTagCreate={() => {}} />)
  expect(screen.getAllByText('Completed').length).toBeGreaterThanOrEqual(1)
  expect(screen.getByText('50')).toBeInTheDocument()
})

test('renders session history with completed and interrupted labels', () => {
  render(<TaskDetailPanel task={task} subtasks={[]} tags={[]} allTags={[]} linkedNotes={[]}
    pomodoroStats={stats} sessions={sessions}
    onClose={() => {}} onUpdate={() => {}} onAddSubtask={() => {}} onTagChange={() => {}} onTagCreate={() => {}} />)
  expect(screen.getAllByText(/completed/i).length).toBeGreaterThanOrEqual(1)
  expect(screen.getAllByText(/interrupted/i).length).toBeGreaterThanOrEqual(1)
})

test('calls onClose when × button clicked', () => {
  const onClose = vi.fn()
  render(<TaskDetailPanel task={task} subtasks={[]} tags={[]} allTags={[]} linkedNotes={[]}
    pomodoroStats={stats} sessions={sessions}
    onClose={onClose} onUpdate={() => {}} onAddSubtask={() => {}} onTagChange={() => {}} onTagCreate={() => {}} />)
  fireEvent.click(screen.getByRole('button', { name: /close/i }))
  expect(onClose).toHaveBeenCalled()
})

test('calls onUpdate with new title on blur', async () => {
  const onUpdate = vi.fn()
  render(<TaskDetailPanel task={task} subtasks={[]} tags={[]} allTags={[]} linkedNotes={[]}
    pomodoroStats={stats} sessions={sessions}
    onClose={() => {}} onUpdate={onUpdate} onAddSubtask={() => {}} onTagChange={() => {}} onTagCreate={() => {}} />)
  const titleInput = screen.getByDisplayValue('Design Homepage')
  await userEvent.clear(titleInput)
  await userEvent.type(titleInput, 'New Title')
  fireEvent.blur(titleInput)
  expect(onUpdate).toHaveBeenCalledWith(expect.objectContaining({ title: 'New Title' }))
})

test('renders due date input with task value', () => {
  const taskWithDueDate: Task = { ...task, dueDate: '2026-03-25' }
  render(<TaskDetailPanel task={taskWithDueDate} subtasks={[]} tags={[]} allTags={[]} linkedNotes={[]}
    pomodoroStats={null} sessions={[]}
    onClose={() => {}} onUpdate={() => {}} onAddSubtask={() => {}} onTagChange={() => {}} onTagCreate={() => {}} />)
  expect(screen.getByDisplayValue('2026-03-25')).toBeInTheDocument()
})

test('clearing due date calls onUpdate without dueDate key', () => {
  const onUpdate = vi.fn()
  const taskWithDueDate: Task = { ...task, dueDate: '2026-03-25' }
  render(<TaskDetailPanel task={taskWithDueDate} subtasks={[]} tags={[]} allTags={[]} linkedNotes={[]}
    pomodoroStats={null} sessions={[]}
    onClose={() => {}} onUpdate={onUpdate} onAddSubtask={() => {}} onTagChange={() => {}} onTagCreate={() => {}} />)
  const dueDateInput = screen.getByDisplayValue('2026-03-25')
  fireEvent.change(dueDateInput, { target: { value: '' } })
  expect(onUpdate).toHaveBeenCalledWith(
    expect.not.objectContaining({ dueDate: expect.anything() })
  )
})
