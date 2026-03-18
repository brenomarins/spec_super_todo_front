import { useState } from 'react'
import type { ReactNode } from 'react'

interface TaskGroupSectionProps {
  label: string
  count: number
  defaultOpen?: boolean    // default true — destructure with = true
  isOverdue?: boolean      // when true, header text is red
  children: ReactNode
}

export function TaskGroupSection({ label, count, defaultOpen = true, isOverdue, children }: TaskGroupSectionProps) {
  const [open, setOpen] = useState(defaultOpen)

  return (
    <div>
      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        style={{
          background: 'none',
          border: 'none',
          cursor: 'pointer',
          padding: '4px 0',
          fontSize: 11,
          fontWeight: 600,
          letterSpacing: '0.05em',
          textTransform: 'uppercase',
          color: isOverdue ? 'var(--color-danger)' : 'var(--color-text-muted)',
          display: 'flex',
          alignItems: 'center',
          gap: 6,
          width: '100%',
          textAlign: 'left',
        }}
      >
        <span>{open ? '▾' : '▸'}</span>
        {label} ({count})
      </button>
      {open && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          {children}
        </div>
      )}
    </div>
  )
}
