import { render, screen, fireEvent } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { AddTaskInput } from './AddTaskInput'

test('renders input with placeholder', () => {
  render(<AddTaskInput onAdd={() => {}} />)
  expect(screen.getByPlaceholderText('+ Add task...')).toBeInTheDocument()
})

test('calls onAdd with trimmed title and clears input on Enter', async () => {
  const onAdd = vi.fn()
  render(<AddTaskInput onAdd={onAdd} />)
  const input = screen.getByPlaceholderText('+ Add task...')
  await userEvent.type(input, '  Buy milk  ')
  fireEvent.keyDown(input, { key: 'Enter' })
  expect(onAdd).toHaveBeenCalledWith('Buy milk')
  expect(input).toHaveValue('')
})

test('does not call onAdd if input is blank', async () => {
  const onAdd = vi.fn()
  render(<AddTaskInput onAdd={onAdd} />)
  const input = screen.getByPlaceholderText('+ Add task...')
  fireEvent.keyDown(input, { key: 'Enter' })
  expect(onAdd).not.toHaveBeenCalled()
})
