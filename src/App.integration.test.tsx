import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import App from './App'
import * as apiTasks from './api/tasks'
import * as apiTags from './api/tags'
import * as apiNotes from './api/notes'
import * as apiSessions from './api/sessions'

vi.mock('./api/tasks')
vi.mock('./api/tags')
vi.mock('./api/notes')
vi.mock('./api/sessions')

function mockMatchMedia(prefersLight = false) {
  Object.defineProperty(window, 'matchMedia', {
    writable: true,
    value: vi.fn().mockImplementation((query: string) => ({
      matches: query === '(prefers-color-scheme: light)' ? prefersLight : false,
      media: query,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    })),
  })
}

beforeEach(() => {
  localStorage.clear()
  document.documentElement.removeAttribute('data-theme')
  mockMatchMedia(false)
  vi.mocked(apiTasks.listTasks).mockResolvedValue([])
  vi.mocked(apiTags.listTags).mockResolvedValue([])
  vi.mocked(apiNotes.listNotes).mockResolvedValue([])
  vi.mocked(apiSessions.getOpenSession).mockResolvedValue(null)
})

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

test('shows RecoveryScreen when API fails', async () => {
  vi.mocked(apiTasks.listTasks).mockRejectedValueOnce(new Error('Network Error'))
  render(<App />)
  await waitFor(() => {
    expect(screen.getByText(/connection error/i)).toBeInTheDocument()
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
