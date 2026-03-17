import { render, screen } from '@testing-library/react'
import { NotesTab } from './NotesTab'
import { useNoteStore } from '../../store/noteStore'
import { useTagStore } from '../../store/tagStore'
import { useTaskStore } from '../../store/taskStore'

vi.mock('../../store/noteStore')
vi.mock('../../store/tagStore')
vi.mock('../../store/taskStore')

const mockNotes = [
  { id: 'n1', title: 'Q2 Planning', content: '{"type":"doc","content":[]}',
    tagIds: [], linkedTaskIds: [], createdAt: '', updatedAt: '' },
]

beforeEach(() => {
  vi.mocked(useNoteStore).mockReturnValue({
    notes: mockNotes, addNote: vi.fn(), updateNote: vi.fn(),
  } as any)
  vi.mocked(useTagStore).mockReturnValue({ tags: [], addTag: vi.fn() } as any)
  vi.mocked(useTaskStore).mockReturnValue({ tasks: [] } as any)
})

test('renders note list and selects first note by default', () => {
  render(<NotesTab />)
  expect(screen.getByText('Q2 Planning')).toBeInTheDocument()
  expect(screen.getByDisplayValue('Q2 Planning')).toBeInTheDocument()
})

test('renders empty state when no notes', () => {
  vi.mocked(useNoteStore).mockReturnValue({
    notes: [], addNote: vi.fn(), updateNote: vi.fn(),
  } as any)
  render(<NotesTab />)
  expect(screen.getByText(/no notes yet/i)).toBeInTheDocument()
})
