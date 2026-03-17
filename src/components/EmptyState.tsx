export function EmptyState({ message }: { message: string }) {
  return (
    <div style={{ textAlign: 'center', padding: '48px 16px', color: 'var(--color-text-muted)', fontSize: 14 }}>
      {message}
    </div>
  )
}
