import { render, screen } from '@testing-library/react'
import { DueDateBadge } from './DueDateBadge'

vi.mock('../lib/dateUtils', () => ({ todayISO: () => '2026-03-18' }))

test('renders nothing when dueDate is undefined', () => {
  const { container } = render(<DueDateBadge dueDate={undefined} completed={false} />)
  expect(container.firstChild).toBeNull()
})

test('renders red with ! prefix when overdue and incomplete', () => {
  render(<DueDateBadge dueDate="2026-03-10" completed={false} />)
  const badge = screen.getByText('! Mar 10')
  expect(badge).toHaveStyle('color: var(--color-danger)')
})

test('renders muted when due in the future', () => {
  render(<DueDateBadge dueDate="2026-03-25" completed={false} />)
  const badge = screen.getByText('Mar 25')
  expect(badge).toHaveStyle('color: var(--color-text-muted)')
})

test('renders muted (no !) when due today', () => {
  render(<DueDateBadge dueDate="2026-03-18" completed={false} />)
  const badge = screen.getByText('Mar 18')
  expect(badge).toHaveStyle('color: var(--color-text-muted)')
})

test('renders muted even when overdue if task is completed', () => {
  render(<DueDateBadge dueDate="2026-03-10" completed={true} />)
  const badge = screen.getByText('Mar 10')
  expect(badge).toHaveStyle('color: var(--color-text-muted)')
})
