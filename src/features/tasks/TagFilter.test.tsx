import { render, screen, fireEvent } from '@testing-library/react'
import { TagFilter } from './TagFilter'
import type { Tag } from '../../types'

const tags: Tag[] = [
  { id: 't1', name: 'work', color: '#3b82f6' },
  { id: 't2', name: 'study', color: '#8b5cf6' },
]

test('renders all tags as filter buttons', () => {
  render(<TagFilter tags={tags} selectedId={null} onSelect={() => {}} />)
  expect(screen.getByText('work')).toBeInTheDocument()
  expect(screen.getByText('study')).toBeInTheDocument()
})

test('calls onSelect with tag id when clicked', () => {
  const onSelect = vi.fn()
  render(<TagFilter tags={tags} selectedId={null} onSelect={onSelect} />)
  fireEvent.click(screen.getByText('work'))
  expect(onSelect).toHaveBeenCalledWith('t1')
})

test('calls onSelect(null) when active tag clicked again to deselect', () => {
  const onSelect = vi.fn()
  render(<TagFilter tags={tags} selectedId="t1" onSelect={onSelect} />)
  fireEvent.click(screen.getByText('work'))
  expect(onSelect).toHaveBeenCalledWith(null)
})
