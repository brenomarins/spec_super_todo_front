import { render, screen, fireEvent } from '@testing-library/react'
import { ColorPicker } from './ColorPicker'

const COLORS = ['#3b82f6','#ef4444','#10b981','#f59e0b','#8b5cf6',
  '#ec4899','#06b6d4','#84cc16','#f97316','#6366f1','#14b8a6','#e11d48']

test('renders 12 color swatches', () => {
  render(<ColorPicker selected="#3b82f6" onSelect={() => {}} />)
  expect(screen.getAllByRole('button')).toHaveLength(12)
})

test('calls onSelect with hex when swatch clicked', () => {
  const onSelect = vi.fn()
  render(<ColorPicker selected="#3b82f6" onSelect={onSelect} />)
  fireEvent.click(screen.getAllByRole('button')[1])
  expect(onSelect).toHaveBeenCalledWith(COLORS[1])
})

test('selected swatch has aria-pressed=true', () => {
  render(<ColorPicker selected="#3b82f6" onSelect={() => {}} />)
  const buttons = screen.getAllByRole('button')
  expect(buttons[0]).toHaveAttribute('aria-pressed', 'true')
  expect(buttons[1]).toHaveAttribute('aria-pressed', 'false')
})

test('renders hex input with current selected color', () => {
  render(<ColorPicker selected="#3b82f6" onSelect={() => {}} />)
  const input = screen.getByRole('textbox')
  expect(input).toHaveValue('#3b82f6')
})

test('typing a valid 6-digit hex calls onSelect', () => {
  const onSelect = vi.fn()
  render(<ColorPicker selected="#3b82f6" onSelect={onSelect} />)
  const input = screen.getByRole('textbox')
  fireEvent.change(input, { target: { value: '#aabbcc' } })
  expect(onSelect).toHaveBeenCalledWith('#aabbcc')
})

test('typing a valid hex without # prefix calls onSelect with # prepended', () => {
  const onSelect = vi.fn()
  render(<ColorPicker selected="#3b82f6" onSelect={onSelect} />)
  const input = screen.getByRole('textbox')
  fireEvent.change(input, { target: { value: 'aabbcc' } })
  expect(onSelect).toHaveBeenCalledWith('#aabbcc')
})

test('typing an invalid hex does not call onSelect', () => {
  const onSelect = vi.fn()
  render(<ColorPicker selected="#3b82f6" onSelect={onSelect} />)
  const input = screen.getByRole('textbox')
  fireEvent.change(input, { target: { value: '#gg0000' } })
  expect(onSelect).not.toHaveBeenCalled()
})

test('typing a partial hex (3 chars) does not call onSelect', () => {
  const onSelect = vi.fn()
  render(<ColorPicker selected="#3b82f6" onSelect={onSelect} />)
  const input = screen.getByRole('textbox')
  fireEvent.change(input, { target: { value: '#3b8' } })
  expect(onSelect).not.toHaveBeenCalled()
})

test('preset swatch has aria-pressed=true when hex matches preset', () => {
  render(<ColorPicker selected="#ef4444" onSelect={() => {}} />)
  const buttons = screen.getAllByRole('button')
  // #ef4444 is the 2nd preset color
  expect(buttons[1]).toHaveAttribute('aria-pressed', 'true')
})
