import { render, screen, fireEvent } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { NoteEditor, extractLinkedTaskIds } from './NoteEditor'
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

test('extractLinkedTaskIds returns all taskChip node taskIds', () => {
  const doc = JSON.stringify({
    type: 'doc',
    content: [{
      type: 'paragraph',
      content: [
        { type: 'taskChip', attrs: { taskId: 't1', taskTitle: 'Task 1', completed: false } },
        { type: 'taskChip', attrs: { taskId: 't2', taskTitle: 'Task 2', completed: true } },
        { type: 'taskChip', attrs: { taskId: 't1', taskTitle: 'Task 1', completed: false } }, // duplicate
      ]
    }]
  })
  expect(extractLinkedTaskIds(doc)).toEqual(['t1', 't2'])
})

test('extractLinkedTaskIds returns empty array for doc with no chips', () => {
  expect(extractLinkedTaskIds('{"type":"doc","content":[]}')).toEqual([])
})

test('extractLinkedTaskIds returns empty array for invalid JSON', () => {
  expect(extractLinkedTaskIds('not-json')).toEqual([])
})
