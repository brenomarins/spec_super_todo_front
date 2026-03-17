export function Toast({ message }: { message: string }) {
  return (
    <div role="status" style={{
      background: 'var(--color-surface-2)',
      color: 'var(--color-text)',
      border: '1px solid var(--color-border)',
      borderRadius: 6,
      padding: '8px 16px',
      fontSize: 14,
      boxShadow: '0 4px 12px rgba(0,0,0,0.3)',
    }}>
      {message}
    </div>
  )
}
