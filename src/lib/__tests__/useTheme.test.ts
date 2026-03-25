import { renderHook, act } from '@testing-library/react'
import { useTheme } from '../useTheme'

function mockMatchMedia(prefersLight: boolean) {
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
  mockMatchMedia(false) // default: user prefers dark
})

test('defaults to dark when no localStorage and OS prefers dark', () => {
  const { result } = renderHook(() => useTheme())
  expect(result.current.theme).toBe('dark')
  expect(document.documentElement.getAttribute('data-theme')).toBeNull()
})

test('defaults to light when no localStorage and OS prefers light', () => {
  mockMatchMedia(true)
  const { result } = renderHook(() => useTheme())
  expect(result.current.theme).toBe('light')
  expect(document.documentElement.getAttribute('data-theme')).toBe('light')
})

test('reads stored dark theme from localStorage', () => {
  localStorage.setItem('theme', 'dark')
  const { result } = renderHook(() => useTheme())
  expect(result.current.theme).toBe('dark')
  expect(document.documentElement.getAttribute('data-theme')).toBeNull()
})

test('reads stored light theme from localStorage', () => {
  localStorage.setItem('theme', 'light')
  const { result } = renderHook(() => useTheme())
  expect(result.current.theme).toBe('light')
  expect(document.documentElement.getAttribute('data-theme')).toBe('light')
})

test('toggleTheme switches from dark to light and persists', () => {
  const { result } = renderHook(() => useTheme())
  act(() => result.current.toggleTheme())
  expect(result.current.theme).toBe('light')
  expect(document.documentElement.getAttribute('data-theme')).toBe('light')
  expect(localStorage.getItem('theme')).toBe('light')
})

test('toggleTheme switches from light to dark and removes attribute', () => {
  localStorage.setItem('theme', 'light')
  const { result } = renderHook(() => useTheme())
  act(() => result.current.toggleTheme())
  expect(result.current.theme).toBe('dark')
  expect(document.documentElement.getAttribute('data-theme')).toBeNull()
  expect(localStorage.getItem('theme')).toBe('dark')
})

test('handles localStorage.getItem failure gracefully', () => {
  vi.spyOn(Storage.prototype, 'getItem').mockImplementationOnce(() => {
    throw new Error('SecurityError')
  })
  expect(() => renderHook(() => useTheme())).not.toThrow()
})
