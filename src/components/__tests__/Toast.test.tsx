import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { ToastProvider, useToast } from '../ToastProvider'

function ShowToastButton() {
  const { showToast } = useToast()
  return <button onClick={() => showToast('Hello toast')}>Show</button>
}

describe('ToastProvider', () => {
  it('shows a toast message', async () => {
    render(<ToastProvider><ShowToastButton /></ToastProvider>)
    await userEvent.click(screen.getByText('Show'))
    expect(screen.getByText('Hello toast')).toBeInTheDocument()
  })
})
