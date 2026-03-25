interface ToastProps {
  message: string
  variant?: 'success' | 'error' | 'default'
}

export function Toast({ message, variant }: ToastProps) {
  const borderLeft =
    variant === 'success' ? '3px solid var(--color-success)'
    : variant === 'error'   ? '3px solid var(--color-danger)'
    : undefined

  return (
    <div
      role="status"
      style={{
        background: 'var(--color-surface-2)',
        color: 'var(--color-text)',
        border: '1px solid var(--color-border)',
        borderRadius: 6,
        padding: '8px 16px',
        fontSize: 14,
        boxShadow: '0 4px 16px rgba(0,0,0,0.4)',
        animation: 'toast-in 250ms var(--ease-out) both',
        ...(borderLeft ? { borderLeft } : {}),
      }}
    >
      {message}
    </div>
  )
}
