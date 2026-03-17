import { getOrderBetween, needsReindex, reindexGroup } from '../orderUtils'

describe('getOrderBetween', () => {
  it('returns midpoint between two values', () => {
    expect(getOrderBetween(1000, 2000)).toBe(1500)
  })
  it('returns before + 1000 when after is null', () => {
    expect(getOrderBetween(2000, null)).toBe(3000)
  })
  it('returns after - 500 when before is null', () => {
    expect(getOrderBetween(null, 1000)).toBe(500)
  })
  it('returns 1000 when both are null', () => {
    expect(getOrderBetween(null, null)).toBe(1000)
  })
})

describe('needsReindex', () => {
  it('returns true when two values are within 0.001', () => {
    expect(needsReindex([1000, 1000.0005, 2000])).toBe(true)
  })
  it('returns false when all values are spaced', () => {
    expect(needsReindex([1000, 2000, 3000])).toBe(false)
  })
})

describe('reindexGroup', () => {
  it('assigns 1000, 2000, 3000 in sorted order', () => {
    const result = reindexGroup(['a', 'b', 'c'], new Map([['a', 1000], ['c', 999], ['b', 2000]]))
    // sorted by existing order: c(999), a(1000), b(2000)
    expect(result.get('c')).toBe(1000)
    expect(result.get('a')).toBe(2000)
    expect(result.get('b')).toBe(3000)
  })
})
