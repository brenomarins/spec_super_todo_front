import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { Toast } from '../Toast'

test('Toast renders message', () => {
  render(<Toast message="Hello" />)
  expect(screen.getByText('Hello')).toBeInTheDocument()
})

test('Toast has slide-up animation style', () => {
  const { container } = render(<Toast message="Hello" />)
  const el = container.firstChild as HTMLElement
  expect(el.getAttribute('style')).toContain('toast-in')
})

test('Toast with success variant has green left border', () => {
  const { container } = render(<Toast message="Saved" variant="success" />)
  const el = container.firstChild as HTMLElement
  expect(el).toHaveStyle('border-left: 3px solid var(--color-success)')
})

test('Toast with error variant has red left border', () => {
  const { container } = render(<Toast message="Failed" variant="error" />)
  const el = container.firstChild as HTMLElement
  expect(el).toHaveStyle('border-left: 3px solid var(--color-danger)')
})

test('Toast with no variant has no left border override', () => {
  const { container } = render(<Toast message="Info" />)
  const el = container.firstChild as HTMLElement
  const style = el.getAttribute('style') ?? ''
  expect(style).not.toContain('border-left')
})

import { ToastProvider, useToast } from '../ToastProvider'

function ShowToastButton({ variant }: { variant?: 'success' | 'error' }) {
  const { showToast } = useToast()
  return (
    <button onClick={() => showToast('Hello toast', variant)}>Show</button>
  )
}

describe('ToastProvider', () => {
  it('shows a toast message', async () => {
    render(<ToastProvider><ShowToastButton /></ToastProvider>)
    await userEvent.click(screen.getByText('Show'))
    expect(screen.getByText('Hello toast')).toBeInTheDocument()
  })

  it('passes success variant to Toast', async () => {
    render(<ToastProvider><ShowToastButton variant="success" /></ToastProvider>)
    await userEvent.click(screen.getByText('Show'))
    const toast = screen.getByRole('status')
    expect(toast).toHaveStyle('border-left: 3px solid var(--color-success)')
  })
})
