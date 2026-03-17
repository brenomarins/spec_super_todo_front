import { useState } from 'react'

interface AddTaskInputProps {
  onAdd: (title: string) => void
  placeholder?: string
}

export function AddTaskInput({ onAdd, placeholder = '+ Add task...' }: AddTaskInputProps) {
  const [value, setValue] = useState('')

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Enter') {
      const title = value.trim()
      if (title) {
        onAdd(title)
        setValue('')
      }
    }
  }

  return (
    <input
      value={value}
      onChange={e => setValue(e.target.value)}
      onKeyDown={handleKeyDown}
      placeholder={placeholder}
      style={{
        width: '100%', padding: '8px 12px', background: 'var(--color-surface)',
        border: '1px solid var(--color-border)', borderRadius: 6, color: 'var(--color-text)',
        fontSize: 14, outline: 'none', boxSizing: 'border-box',
      }}
    />
  )
}
