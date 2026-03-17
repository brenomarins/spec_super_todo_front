import { render, screen, fireEvent } from '@testing-library/react'
import { TaskChip } from './TaskChip'

test('renders task title and completion badge when task found', () => {
  render(<TaskChip taskId="t1" taskTitle="Design Homepage" completed={false} onClick={() => {}} />)
  expect(screen.getByText('Design Homepage')).toBeInTheDocument()
  expect(screen.getByText('○')).toBeInTheDocument()
})

test('renders completed badge when task is done', () => {
  render(<TaskChip taskId="t1" taskTitle="Design Homepage" completed={true} onClick={() => {}} />)
  expect(screen.getByText('✓')).toBeInTheDocument()
})

test('renders tombstone when task is deleted', () => {
  render(<TaskChip taskId="t99" taskTitle={null} completed={false} onClick={() => {}} />)
  expect(screen.getByText(/deleted task/i)).toBeInTheDocument()
})

test('calls onClick with taskId when clicked', () => {
  const onClick = vi.fn()
  render(<TaskChip taskId="t1" taskTitle="Alpha" completed={false} onClick={onClick} />)
  fireEvent.click(screen.getByText('Alpha'))
  expect(onClick).toHaveBeenCalledWith('t1')
})
