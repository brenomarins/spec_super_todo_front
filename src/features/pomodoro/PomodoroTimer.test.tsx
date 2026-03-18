import { render, screen, fireEvent } from '@testing-library/react'
import { PomodoroTimer } from './PomodoroTimer'

test('renders countdown display', () => {
  render(<PomodoroTimer taskId="t1" taskTitle="Design" display="23:45"
    isRunning={false} workSessionCount={2} onStart={() => {}} onStop={() => {}} />)
  expect(screen.getByText('23:45')).toBeInTheDocument()
})

test('shows task title when running', () => {
  render(<PomodoroTimer taskId="t1" taskTitle="Design" display="23:45"
    isRunning={true} workSessionCount={2} onStart={() => {}} onStop={() => {}} />)
  expect(screen.getByText('Design')).toBeInTheDocument()
})

test('renders 4 session dots', () => {
  render(<PomodoroTimer taskId="t1" taskTitle="Design" display="25:00"
    isRunning={false} workSessionCount={2} onStart={() => {}} onStop={() => {}} />)
  expect(screen.getAllByTestId('session-dot')).toHaveLength(4)
})

test('calls onStop when Stop button clicked during active session', () => {
  const onStop = vi.fn()
  render(<PomodoroTimer taskId="t1" taskTitle="Design" display="23:45"
    isRunning={true} workSessionCount={0} onStart={() => {}} onStop={onStop} />)
  fireEvent.click(screen.getByText(/stop/i))
  expect(onStop).toHaveBeenCalled()
})

test('calls onStart with taskId when Start clicked', () => {
  const onStart = vi.fn()
  render(<PomodoroTimer taskId="t1" taskTitle="Design" display="25:00"
    isRunning={false} workSessionCount={0} onStart={onStart} onStop={() => {}} />)
  fireEvent.click(screen.getByText(/start/i))
  expect(onStart).toHaveBeenCalledWith('t1')
})
