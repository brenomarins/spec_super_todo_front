import { useState, useEffect } from 'react'

const PRESET_COLORS = [
  '#3b82f6','#ef4444','#10b981','#f59e0b','#8b5cf6',
  '#ec4899','#06b6d4','#84cc16','#f97316','#6366f1','#14b8a6','#e11d48',
]

const HEX_RE = /^#?([0-9a-fA-F]{6})$/

function normalizeHex(raw: string): string | null {
  const m = raw.match(HEX_RE)
  return m ? `#${m[1].toLowerCase()}` : null
}

interface ColorPickerProps {
  selected: string
  onSelect: (color: string) => void
}

export function ColorPicker({ selected, onSelect }: ColorPickerProps) {
  const [hex, setHex] = useState(selected)

  useEffect(() => { setHex(selected) }, [selected])

  function handleHexChange(raw: string) {
    setHex(raw)
    const normalized = normalizeHex(raw)
    if (normalized) onSelect(normalized)
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8, padding: 8 }}>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
        {PRESET_COLORS.map(color => (
          <button
            key={color}
            type="button"
            aria-label={`Color ${color}`}
            aria-pressed={selected === color}
            onClick={() => onSelect(color)}
            style={{
              width: 24, height: 24, borderRadius: '50%', border: 'none',
              background: color, cursor: 'pointer',
              outline: selected === color ? '2px solid white' : 'none',
              boxShadow: selected === color ? `0 0 0 3px ${color}` : 'none',
            }}
          />
        ))}
      </div>
      <input
        type="text"
        aria-label="Custom hex color"
        value={hex}
        onChange={e => handleHexChange(e.target.value)}
        placeholder="#000000"
        style={{
          background: 'var(--color-surface)', border: '1px solid var(--color-border)',
          borderRadius: 4, color: 'var(--color-text)', fontSize: 12,
          padding: '4px 6px', outline: 'none', width: '100%', boxSizing: 'border-box',
        }}
      />
    </div>
  )
}
