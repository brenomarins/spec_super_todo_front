import { render, screen, fireEvent } from '@testing-library/react'
import { TaskGroupSection } from './TaskGroupSection'

test('renders label and count in header', () => {
  render(<TaskGroupSection label="OVERDUE" count={3}><div>child</div></TaskGroupSection>)
  expect(screen.getByRole('button')).toHaveTextContent('OVERDUE (3)')
})

test('renders children when open by default', () => {
  render(<TaskGroupSection label="X" count={1}><div>child content</div></TaskGroupSection>)
  expect(screen.getByText('child content')).toBeInTheDocument()
})

test('hides children after header click', () => {
  render(<TaskGroupSection label="X" count={1}><div>child content</div></TaskGroupSection>)
  fireEvent.click(screen.getByRole('button'))
  expect(screen.queryByText('child content')).not.toBeInTheDocument()
})

test('shows children again after second click', () => {
  render(<TaskGroupSection label="X" count={1}><div>child content</div></TaskGroupSection>)
  const btn = screen.getByRole('button')
  fireEvent.click(btn)
  fireEvent.click(btn)
  expect(screen.getByText('child content')).toBeInTheDocument()
})

test('header is red when isOverdue is true', () => {
  render(<TaskGroupSection label="OVERDUE" count={2} isOverdue><div /></TaskGroupSection>)
  expect(screen.getByRole('button')).toHaveStyle('color: var(--color-danger)')
})

test('header is muted when isOverdue is false', () => {
  render(<TaskGroupSection label="LATER" count={2}><div /></TaskGroupSection>)
  expect(screen.getByRole('button')).toHaveStyle('color: var(--color-text-muted)')
})

test('starts collapsed when defaultOpen is false', () => {
  render(<TaskGroupSection label="X" count={1} defaultOpen={false}><div>hidden</div></TaskGroupSection>)
  expect(screen.queryByText('hidden')).not.toBeInTheDocument()
})
