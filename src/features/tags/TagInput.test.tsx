import { render, screen, fireEvent } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { TagInput } from './TagInput'
import type { Tag } from '../../types'

const allTags: Tag[] = [
  { id: 't1', name: 'work', color: '#3b82f6' },
  { id: 't2', name: 'study', color: '#8b5cf6' },
  { id: 't3', name: 'personal', color: '#10b981' },
]

test('renders existing selected tags as badges', () => {
  render(<TagInput allTags={allTags} selectedIds={['t1','t2']} onChange={() => {}} onTagCreate={() => {}} />)
  expect(screen.getByText('work')).toBeInTheDocument()
  expect(screen.getByText('study')).toBeInTheDocument()
})

test('shows autocomplete dropdown filtered by input', async () => {
  render(<TagInput allTags={allTags} selectedIds={[]} onChange={() => {}} onTagCreate={() => {}} />)
  await userEvent.type(screen.getByRole('textbox'), 'wo')
  expect(screen.getByText('work')).toBeInTheDocument()
  expect(screen.queryByText('study')).not.toBeInTheDocument()
})

test('selects existing tag on click and calls onChange', async () => {
  const onChange = vi.fn()
  render(<TagInput allTags={allTags} selectedIds={[]} onChange={onChange} onTagCreate={() => {}} />)
  await userEvent.type(screen.getByRole('textbox'), 'wo')
  fireEvent.click(screen.getByText('work'))
  expect(onChange).toHaveBeenCalledWith(['t1'])
})

test('creates new tag on Enter when no match', async () => {
  const onTagCreate = vi.fn()
  render(<TagInput allTags={allTags} selectedIds={[]} onChange={() => {}} onTagCreate={onTagCreate} />)
  await userEvent.type(screen.getByRole('textbox'), 'newTag')
  fireEvent.keyDown(screen.getByRole('textbox'), { key: 'Enter' })
  expect(onTagCreate).toHaveBeenCalledWith('newTag')
})

test('removes tag badge when × clicked', () => {
  const onChange = vi.fn()
  render(<TagInput allTags={allTags} selectedIds={['t1']} onChange={onChange} onTagCreate={() => {}} />)
  fireEvent.click(screen.getByRole('button', { name: /remove work/i }))
  expect(onChange).toHaveBeenCalledWith([])
})
