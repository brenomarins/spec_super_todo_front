import { render, screen, fireEvent } from '@testing-library/react'
import { TagsTab } from './TagsTab'
import { useTagStore } from '../../store/tagStore'
import { ToastProvider } from '../../components/ToastProvider'
import type { Tag } from '../../types'
import { describe, test, expect, beforeEach, vi } from 'vitest'

vi.mock('../../store/tagStore')

const TAGS: Tag[] = [
  { id: 't1', name: 'work', color: '#3b82f6' },
  { id: 't2', name: 'urgent', color: '#ef4444' },
]

beforeEach(() => {
  vi.mocked(useTagStore).mockReturnValue({
    tags: TAGS,
    updateTag: vi.fn().mockResolvedValue(TAGS[0]),
    deleteTag: vi.fn().mockResolvedValue(undefined),
  } as any)
})

function renderTab() {
  return render(<ToastProvider><TagsTab /></ToastProvider>)
}

test('renders all tag names', () => {
  renderTab()
  expect(screen.getByText('work')).toBeInTheDocument()
  expect(screen.getByText('urgent')).toBeInTheDocument()
})

test('renders color swatch for each tag', () => {
  renderTab()
  expect(screen.getAllByTestId('tag-color-swatch')).toHaveLength(2)
})

test('clicking Edit button opens TagEditModal', () => {
  renderTab()
  const editButtons = screen.getAllByRole('button', { name: /edit/i })
  fireEvent.click(editButtons[0])
  expect(screen.getByRole('dialog', { name: /edit tag/i })).toBeInTheDocument()
})

test('shows empty state when no tags', () => {
  vi.mocked(useTagStore).mockReturnValue({ tags: [], updateTag: vi.fn(), deleteTag: vi.fn() } as any)
  renderTab()
  expect(screen.getByText(/no tags yet/i)).toBeInTheDocument()
})
