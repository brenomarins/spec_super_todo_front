interface SessionDotsProps {
  count: number
}

export function SessionDots({ count }: SessionDotsProps) {
  return (
    <div style={{ display: 'flex', gap: 6, justifyContent: 'center' }}>
      {Array.from({ length: 4 }, (_, i) => (
        <span
          key={i}
          data-testid="session-dot"
          style={{
            width: 10, height: 10, borderRadius: '50%',
            background: i < (count % 4) ? 'var(--color-warning)' : 'transparent',
            border: `1px solid var(--color-border)`,
            display: 'inline-block',
          }}
        />
      ))}
    </div>
  )
}
