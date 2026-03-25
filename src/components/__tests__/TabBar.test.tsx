import { render, screen, fireEvent } from '@testing-library/react'
import { TabBar } from '../TabBar'
import { vi, beforeEach, test, expect } from 'vitest'

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
})

test('renders all tab labels', () => {
  render(<TabBar active="home" onChange={() => {}} />)
  expect(screen.getByText('Home')).toBeInTheDocument()
  expect(screen.getByText('Tasks')).toBeInTheDocument()
  expect(screen.getByText('Schedule')).toBeInTheDocument()
  expect(screen.getByText('Notes')).toBeInTheDocument()
  expect(screen.getByText('Stats')).toBeInTheDocument()
  expect(screen.getByText('Tags')).toBeInTheDocument()
})

test('active tab gets tab-active class', () => {
  render(<TabBar active="tasks" onChange={() => {}} />)
  const tasksBtn = screen.getByText('Tasks').closest('button')
  expect(tasksBtn).toHaveClass('tab-active')
  const homeBtn = screen.getByText('Home').closest('button')
  expect(homeBtn).not.toHaveClass('tab-active')
})

test('calls onChange when tab clicked', () => {
  const onChange = vi.fn()
  render(<TabBar active="home" onChange={onChange} />)
  fireEvent.click(screen.getByText('Tasks'))
  expect(onChange).toHaveBeenCalledWith('tasks')
})

test('theme toggle button is present with correct aria-label in dark mode', () => {
  render(<TabBar active="home" onChange={() => {}} />)
  expect(screen.getByRole('button', { name: /switch to light theme/i })).toBeInTheDocument()
})

test('clicking theme toggle sets data-theme to light', () => {
  render(<TabBar active="home" onChange={() => {}} />)
  fireEvent.click(screen.getByRole('button', { name: /switch to light theme/i }))
  expect(document.documentElement.getAttribute('data-theme')).toBe('light')
})

test('clicking theme toggle again removes data-theme attribute', () => {
  render(<TabBar active="home" onChange={() => {}} />)
  const btn = screen.getByRole('button', { name: /switch to light theme/i })
  fireEvent.click(btn)
  expect(document.documentElement.getAttribute('data-theme')).toBe('light')
  fireEvent.click(screen.getByRole('button', { name: /switch to dark theme/i }))
  expect(document.documentElement.getAttribute('data-theme')).toBeNull()
})
