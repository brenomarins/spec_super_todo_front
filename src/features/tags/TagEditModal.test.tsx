import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { TagEditModal } from './TagEditModal'
import { useTagStore } from '../../store/tagStore'
import { ToastProvider } from '../../components/ToastProvider'
import type { Tag } from '../../types'

vi.mock('../../store/tagStore')

const TAG: Tag = { id: 't1', name: 'work', color: '#3b82f6' }

function renderModal(onClose = vi.fn()) {
  return render(
    <ToastProvider>
      <TagEditModal tag={TAG} onClose={onClose} />
    </ToastProvider>
  )
}

beforeEach(() => {
  vi.mocked(useTagStore).mockReturnValue({
    updateTag: vi.fn().mockResolvedValue({ ...TAG }),
    deleteTag: vi.fn().mockResolvedValue(undefined),
  } as any)
})

test('pre-fills name input with tag name', () => {
  renderModal()
  expect(screen.getByRole('textbox', { name: /tag name/i })).toHaveValue('work')
})

test('Save button is disabled when name is empty', () => {
  renderModal()
  const input = screen.getByRole('textbox', { name: /tag name/i })
  fireEvent.change(input, { target: { value: '   ' } })
  expect(screen.getByRole('button', { name: /save/i })).toBeDisabled()
})

test('Save calls updateTag with trimmed name and color then closes', async () => {
  const onClose = vi.fn()
  renderModal(onClose)
  const input = screen.getByRole('textbox', { name: /tag name/i })
  fireEvent.change(input, { target: { value: 'renamed' } })
  fireEvent.click(screen.getByRole('button', { name: /save/i }))
  await waitFor(() => {
    expect(vi.mocked(useTagStore).mock.results[0].value.updateTag)
      .toHaveBeenCalledWith('t1', { name: 'renamed', color: '#3b82f6' })
    expect(onClose).toHaveBeenCalled()
  })
})

test('Cancel closes without calling updateTag', () => {
  const onClose = vi.fn()
  renderModal(onClose)
  fireEvent.click(screen.getByRole('button', { name: /cancel/i }))
  expect(vi.mocked(useTagStore).mock.results[0].value.updateTag).not.toHaveBeenCalled()
  expect(onClose).toHaveBeenCalled()
})

test('Delete button reveals confirmation', () => {
  renderModal()
  fireEvent.click(screen.getByRole('button', { name: /^delete$/i }))
  expect(screen.getByRole('button', { name: /confirm delete/i })).toBeInTheDocument()
})

test('Confirm delete calls deleteTag and closes', async () => {
  const onClose = vi.fn()
  renderModal(onClose)
  fireEvent.click(screen.getByRole('button', { name: /^delete$/i }))
  fireEvent.click(screen.getByRole('button', { name: /confirm delete/i }))
  await waitFor(() => {
    expect(vi.mocked(useTagStore).mock.results[0].value.deleteTag)
      .toHaveBeenCalledWith('t1')
    expect(onClose).toHaveBeenCalled()
  })
})

test('API error on Save shows toast and keeps modal open', async () => {
  vi.mocked(useTagStore).mockReturnValue({
    updateTag: vi.fn().mockRejectedValue(new Error('Network error')),
    deleteTag: vi.fn(),
  } as any)
  const onClose = vi.fn()
  renderModal(onClose)
  fireEvent.click(screen.getByRole('button', { name: /save/i }))
  await waitFor(() => {
    expect(screen.getByText(/failed to save/i)).toBeInTheDocument()
    expect(onClose).not.toHaveBeenCalled()
  })
})
