interface SessionDotsProps {
  count: number
}

export function SessionDots({ count }: SessionDotsProps) {
  return (
    <div style={{ display: 'flex', gap: 6, justifyContent: 'center' }}>
      {Array.from({ length: 4 }, (_, i) => {
        const filled = i < (count % 4)
        return (
          <span
            key={i}
            data-testid="session-dot"
            style={{
              width: 10, height: 10, borderRadius: '50%',
              background: filled ? 'var(--color-warning)' : 'transparent',
              border: `1px solid var(--color-border)`,
              display: 'inline-block',
              transform: filled ? 'scale(1.1)' : 'scale(1)',
              transition: `background var(--transition-base), transform 200ms var(--ease-spring)`,
            }}
          />
        )
      })}
    </div>
  )
}
