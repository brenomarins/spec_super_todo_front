import { render, screen, fireEvent } from '@testing-library/react'
import { TagBadge } from './TagBadge'

const tag = { id: 't1', name: 'work', color: '#3b82f6' }

test('renders tag name', () => {
  render(<TagBadge tag={tag} />)
  expect(screen.getByText('work')).toBeInTheDocument()
})

test('applies background color from tag', () => {
  render(<TagBadge tag={tag} />)
  const badge = screen.getByText('work').closest('[data-testid="tag-badge"]')!
  expect(badge).toHaveStyle({ background: '#3b82f6' })
})

test('shows × button when onRemove provided and calls it', () => {
  const onRemove = vi.fn()
  render(<TagBadge tag={tag} onRemove={onRemove} />)
  const removeBtn = screen.getByRole('button', { name: /remove work/i })
  fireEvent.click(removeBtn)
  expect(onRemove).toHaveBeenCalledWith('t1')
})

test('hides × button when onRemove not provided', () => {
  render(<TagBadge tag={tag} />)
  expect(screen.queryByRole('button')).not.toBeInTheDocument()
})
