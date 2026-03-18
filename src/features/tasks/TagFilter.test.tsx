import { render, screen, fireEvent } from '@testing-library/react'
import { TagFilter } from './TagFilter'
import type { Tag } from '../../types'

const tags: Tag[] = [
  { id: 't1', name: 'work', color: '#3b82f6' },
  { id: 't2', name: 'study', color: '#8b5cf6' },
]

test('renders all tags as filter buttons', () => {
  render(<TagFilter tags={tags} selectedId={null} onSelect={() => {}}
    overdueOnly={false} onOverdueToggle={() => {}} />)
  expect(screen.getByText('work')).toBeInTheDocument()
  expect(screen.getByText('study')).toBeInTheDocument()
})

test('calls onSelect with tag id when clicked', () => {
  const onSelect = vi.fn()
  render(<TagFilter tags={tags} selectedId={null} onSelect={onSelect}
    overdueOnly={false} onOverdueToggle={() => {}} />)
  fireEvent.click(screen.getByText('work'))
  expect(onSelect).toHaveBeenCalledWith('t1')
})

test('calls onSelect(null) when active tag clicked again to deselect', () => {
  const onSelect = vi.fn()
  render(<TagFilter tags={tags} selectedId="t1" onSelect={onSelect}
    overdueOnly={false} onOverdueToggle={() => {}} />)
  fireEvent.click(screen.getByText('work'))
  expect(onSelect).toHaveBeenCalledWith(null)
})

test('overdue chip renders even when tags list is empty (overdueOnly=true)', () => {
  render(<TagFilter tags={[]} selectedId={null} onSelect={() => {}}
    overdueOnly={true} onOverdueToggle={() => {}} />)
  expect(screen.getByText('Overdue only')).toBeInTheDocument()
})

test('overdue chip calls onOverdueToggle when clicked', () => {
  const onOverdueToggle = vi.fn()
  render(<TagFilter tags={tags} selectedId={null} onSelect={() => {}}
    overdueOnly={false} onOverdueToggle={onOverdueToggle} />)
  fireEvent.click(screen.getByText('Overdue only'))
  expect(onOverdueToggle).toHaveBeenCalled()
})

test('overdue chip appears selected (danger color) when overdueOnly is true', () => {
  render(<TagFilter tags={[]} selectedId={null} onSelect={() => {}}
    overdueOnly={true} onOverdueToggle={() => {}} />)
  const chip = screen.getByText('Overdue only')
  expect(chip).toHaveStyle('background: var(--color-danger)')
})

test('returns null when tags empty and overdueOnly is false', () => {
  const { container } = render(<TagFilter tags={[]} selectedId={null} onSelect={() => {}}
    overdueOnly={false} onOverdueToggle={() => {}} />)
  expect(container.firstChild).toBeNull()
})

test('both overdueOnly and a selected tag can be active simultaneously', () => {
  render(<TagFilter tags={tags} selectedId="t1" onSelect={() => {}}
    overdueOnly={true} onOverdueToggle={() => {}} />)
  expect(screen.getByText('Overdue only')).toHaveStyle('background: var(--color-danger)')
  expect(screen.getByText('work')).toHaveStyle(`background: #3b82f6`)
})
