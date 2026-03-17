export function getOrderBetween(before: number | null, after: number | null): number {
  if (before === null && after === null) return 1000
  if (before === null) return after! - 500
  if (after === null) return before + 1000
  return (before + after) / 2
}

export function needsReindex(orders: number[]): boolean {
  const sorted = [...orders].sort((a, b) => a - b)
  for (let i = 0; i < sorted.length - 1; i++) {
    if (sorted[i + 1] - sorted[i] < 0.001) return true
  }
  return false
}

/** Returns a new map with reassigned 1000-spaced order values in existing sort order */
export function reindexGroup(ids: string[], idToOrder: Map<string, number>): Map<string, number> {
  const sorted = [...ids].sort((a, b) => (idToOrder.get(a) ?? 0) - (idToOrder.get(b) ?? 0))
  const result = new Map<string, number>()
  sorted.forEach((id, i) => result.set(id, (i + 1) * 1000))
  return result
}
