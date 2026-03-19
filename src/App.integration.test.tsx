import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import App from './App'
import { db } from './db/db'

// Uses fake-indexeddb
test('renders all 4 tabs', async () => {
  render(<App />)
  await waitFor(() => {
    expect(screen.getByText('Home')).toBeInTheDocument()
    expect(screen.getByText('Tasks')).toBeInTheDocument()
    expect(screen.getByText('Schedule')).toBeInTheDocument()
    expect(screen.getByText('Notes')).toBeInTheDocument()
  })
})

test('switches to Tasks tab on click', async () => {
  render(<App />)
  await waitFor(() => screen.getByText('Tasks'))
  fireEvent.click(screen.getByText('Tasks'))
  await waitFor(() => {
    expect(screen.getByPlaceholderText('+ Add task...')).toBeInTheDocument()
  })
})

test('shows RecoveryScreen when DB fails to open', async () => {
  vi.spyOn(db, 'open').mockRejectedValueOnce(new Error('QuotaExceededError'))
  render(<App />)
  await waitFor(() => {
    expect(screen.getByText(/storage error/i)).toBeInTheDocument()
  })
})

test('renders Stats tab button', async () => {
  render(<App />)
  await waitFor(() => {
    expect(screen.getByText('Stats')).toBeInTheDocument()
  })
})

test('switches to Stats tab on click', async () => {
  render(<App />)
  await waitFor(() => screen.getByText('Stats'))
  fireEvent.click(screen.getByText('Stats'))
  await waitFor(() => {
    expect(screen.getByTestId('stats-tab')).toBeInTheDocument()
  })
})
