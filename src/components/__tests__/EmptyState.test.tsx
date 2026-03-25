import { render } from '@testing-library/react'
import { EmptyState } from '../EmptyState'

test('EmptyState renders with 32px vertical padding', () => {
  const { container } = render(<EmptyState message="Nothing here" />)
  const el = container.firstChild as HTMLElement
  expect(el).toHaveStyle({ padding: '32px 16px' })
})
