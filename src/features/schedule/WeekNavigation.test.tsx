// src/features/schedule/WeekNavigation.test.tsx
import { render, screen, fireEvent } from '@testing-library/react'
import { WeekNavigation } from './WeekNavigation'

const weekStart = new Date('2026-03-16')

test('renders week label', () => {
  render(<WeekNavigation weekStart={weekStart} onPrev={() => {}} onNext={() => {}} />)
  expect(screen.getByText(/mar 16/i)).toBeInTheDocument()
})

test('calls onPrev when ← clicked', () => {
  const onPrev = vi.fn()
  render(<WeekNavigation weekStart={weekStart} onPrev={onPrev} onNext={() => {}} />)
  fireEvent.click(screen.getByRole('button', { name: /previous week/i }))
  expect(onPrev).toHaveBeenCalled()
})

test('calls onNext when → clicked', () => {
  const onNext = vi.fn()
  render(<WeekNavigation weekStart={weekStart} onPrev={() => {}} onNext={onNext} />)
  fireEvent.click(screen.getByRole('button', { name: /next week/i }))
  expect(onNext).toHaveBeenCalled()
})
