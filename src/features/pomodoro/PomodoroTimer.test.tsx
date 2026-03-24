import { render, screen, fireEvent } from '@testing-library/react'
import { PomodoroTimer } from './PomodoroTimer'

// Helper for default no-op callbacks used in every render
const noop = () => {}
const defaultCallbacks = {
  onStart: noop, onStop: noop, onComplete: noop, onShortBreak: noop, onLongBreak: noop,
}

test('renders countdown display', () => {
  render(<PomodoroTimer taskId="t1" taskTitle="Design" display="23:45"
    isRunning={false} sessionType={null} workSessionCount={2} {...defaultCallbacks} />)
  expect(screen.getByText('23:45')).toBeInTheDocument()
})

test('shows task title when running', () => {
  render(<PomodoroTimer taskId="t1" taskTitle="Design" display="23:45"
    isRunning={true} sessionType="work" workSessionCount={2} {...defaultCallbacks} />)
  expect(screen.getByText('Design')).toBeInTheDocument()
})

test('renders 4 session dots', () => {
  render(<PomodoroTimer taskId="t1" taskTitle="Design" display="25:00"
    isRunning={false} sessionType={null} workSessionCount={2} {...defaultCallbacks} />)
  expect(screen.getAllByTestId('session-dot')).toHaveLength(4)
})

test('calls onStop when Stop button clicked during active session', () => {
  const onStop = vi.fn()
  render(<PomodoroTimer taskId="t1" taskTitle="Design" display="23:45"
    isRunning={true} sessionType="work" workSessionCount={0}
    {...defaultCallbacks} onStop={onStop} />)
  fireEvent.click(screen.getByText(/stop/i))
  expect(onStop).toHaveBeenCalled()
})

test('calls onStart with taskId when Start clicked', () => {
  const onStart = vi.fn()
  render(<PomodoroTimer taskId="t1" taskTitle="Design" display="25:00"
    isRunning={false} sessionType={null} workSessionCount={0}
    {...defaultCallbacks} onStart={onStart} />)
  fireEvent.click(screen.getByText(/start/i))
  expect(onStart).toHaveBeenCalledWith('t1')
})

// NEW TESTS

test('shows Complete, Short Break, Long Break, and Stop during work session', () => {
  render(<PomodoroTimer taskId="t1" taskTitle="Design" display="20:00"
    isRunning={true} sessionType="work" workSessionCount={0} {...defaultCallbacks} />)
  expect(screen.getByText(/complete/i)).toBeInTheDocument()
  expect(screen.getByText(/short break/i)).toBeInTheDocument()
  expect(screen.getByText(/long break/i)).toBeInTheDocument()
  expect(screen.getByText(/stop/i)).toBeInTheDocument()
})

test('shows only Stop during a break session', () => {
  render(<PomodoroTimer taskId="t1" taskTitle="Design" display="04:30"
    isRunning={true} sessionType="short_break" workSessionCount={1} {...defaultCallbacks} />)
  expect(screen.queryByText(/complete/i)).not.toBeInTheDocument()
  expect(screen.queryByText(/short break/i)).not.toBeInTheDocument()
  expect(screen.queryByText(/long break/i)).not.toBeInTheDocument()
  expect(screen.getByText(/stop/i)).toBeInTheDocument()
})

test('calls onComplete when Complete button clicked', () => {
  const onComplete = vi.fn()
  render(<PomodoroTimer taskId="t1" taskTitle="Design" display="20:00"
    isRunning={true} sessionType="work" workSessionCount={0}
    {...defaultCallbacks} onComplete={onComplete} />)
  fireEvent.click(screen.getByText(/complete/i))
  expect(onComplete).toHaveBeenCalled()
})

test('calls onShortBreak when Short Break button clicked', () => {
  const onShortBreak = vi.fn()
  render(<PomodoroTimer taskId="t1" taskTitle="Design" display="20:00"
    isRunning={true} sessionType="work" workSessionCount={0}
    {...defaultCallbacks} onShortBreak={onShortBreak} />)
  fireEvent.click(screen.getByText(/short break/i))
  expect(onShortBreak).toHaveBeenCalled()
})

test('calls onLongBreak when Long Break button clicked', () => {
  const onLongBreak = vi.fn()
  render(<PomodoroTimer taskId="t1" taskTitle="Design" display="20:00"
    isRunning={true} sessionType="work" workSessionCount={0}
    {...defaultCallbacks} onLongBreak={onLongBreak} />)
  fireEvent.click(screen.getByText(/long break/i))
  expect(onLongBreak).toHaveBeenCalled()
})

test('Start button is disabled when taskId is null', () => {
  render(<PomodoroTimer taskId={null} taskTitle={null} display="25:00"
    isRunning={false} sessionType={null} workSessionCount={0} {...defaultCallbacks} />)
  expect(screen.getByText(/start/i).closest('button')).toBeDisabled()
})
