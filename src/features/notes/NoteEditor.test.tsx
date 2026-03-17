import { render, screen, fireEvent } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { NoteEditor } from './NoteEditor'
import type { Note } from '../../types'

const note: Note = {
  id: 'n1', title: 'Q2 Planning', content: '{"type":"doc","content":[]}',
  tagIds: [], linkedTaskIds: [], createdAt: '', updatedAt: '',
}

test('renders note title in input', () => {
  render(<NoteEditor note={note} tags={[]} allTags={[]} allTasks={[]}
    onSave={() => {}} onTagChange={() => {}} onTagCreate={() => {}} onTaskClick={() => {}} />)
  expect(screen.getByDisplayValue('Q2 Planning')).toBeInTheDocument()
})

test('calls onSave with updated title on blur', async () => {
  const onSave = vi.fn()
  render(<NoteEditor note={note} tags={[]} allTags={[]} allTasks={[]}
    onSave={onSave} onTagChange={() => {}} onTagCreate={() => {}} onTaskClick={() => {}} />)
  const input = screen.getByDisplayValue('Q2 Planning')
  await userEvent.clear(input)
  await userEvent.type(input, 'New Title')
  fireEvent.blur(input)
  expect(onSave).toHaveBeenCalledWith(expect.objectContaining({ title: 'New Title' }))
})

test('shows 1MB warning when content exceeds limit', () => {
  const bigContent = JSON.stringify({ type: 'doc', content: [{ type: 'text', text: 'x'.repeat(1_100_000) }] })
  const bigNote = { ...note, content: bigContent }
  render(<NoteEditor note={bigNote} tags={[]} allTags={[]} allTasks={[]}
    onSave={() => {}} onTagChange={() => {}} onTagCreate={() => {}} onTaskClick={() => {}} />)
  expect(screen.getByText(/note is over 1mb/i)).toBeInTheDocument()
})
