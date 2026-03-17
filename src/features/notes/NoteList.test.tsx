import { render, screen, fireEvent } from '@testing-library/react'
import { NoteList } from './NoteList'
import type { Note } from '../../types'

const notes: Note[] = [
  { id: 'n1', title: 'Q2 Planning', content: '', tagIds: [], linkedTaskIds: [], createdAt: '', updatedAt: '' },
  { id: 'n2', title: 'Meeting Notes', content: '', tagIds: [], linkedTaskIds: [], createdAt: '', updatedAt: '' },
]

test('renders all note titles', () => {
  render(<NoteList notes={notes} selectedId="n1" onSelect={() => {}} onNew={() => {}} />)
  expect(screen.getByText('Q2 Planning')).toBeInTheDocument()
  expect(screen.getByText('Meeting Notes')).toBeInTheDocument()
})

test('calls onSelect when note title clicked', () => {
  const onSelect = vi.fn()
  render(<NoteList notes={notes} selectedId={null} onSelect={onSelect} onNew={() => {}} />)
  fireEvent.click(screen.getByText('Meeting Notes'))
  expect(onSelect).toHaveBeenCalledWith('n2')
})

test('calls onNew when + New note clicked', () => {
  const onNew = vi.fn()
  render(<NoteList notes={notes} selectedId={null} onSelect={() => {}} onNew={onNew} />)
  fireEvent.click(screen.getByText('+ New note'))
  expect(onNew).toHaveBeenCalled()
})

test('shows empty state when no notes', () => {
  render(<NoteList notes={[]} selectedId={null} onSelect={() => {}} onNew={() => {}} />)
  expect(screen.getByText(/no notes yet/i)).toBeInTheDocument()
})
