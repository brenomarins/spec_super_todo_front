const PRESET_COLORS = [
  '#3b82f6','#ef4444','#10b981','#f59e0b','#8b5cf6',
  '#ec4899','#06b6d4','#84cc16','#f97316','#6366f1','#14b8a6','#e11d48',
]

interface ColorPickerProps {
  selected: string
  onSelect: (color: string) => void
}

export function ColorPicker({ selected, onSelect }: ColorPickerProps) {
  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, padding: 8 }}>
      {PRESET_COLORS.map(color => (
        <button
          key={color}
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
  )
}
