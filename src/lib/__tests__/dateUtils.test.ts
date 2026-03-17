import { getWeekDays, formatISODay, isToday, addWeeks } from '../dateUtils'

describe('getWeekDays', () => {
  it('returns 7 days starting from Monday', () => {
    const days = getWeekDays(new Date('2026-03-16')) // Monday
    expect(days).toHaveLength(7)
    expect(days[0]).toBe('2026-03-16') // Mon
    expect(days[6]).toBe('2026-03-22') // Sun
  })

  it('week containing Wednesday also starts on Monday', () => {
    const days = getWeekDays(new Date('2026-03-18')) // Wednesday
    expect(days[0]).toBe('2026-03-16')
  })
})

describe('formatISODay', () => {
  it('formats date as YYYY-MM-DD', () => {
    expect(formatISODay(new Date('2026-03-16T12:00:00Z'))).toMatch(/^\d{4}-\d{2}-\d{2}$/)
  })
})

describe('addWeeks', () => {
  it('adds positive weeks', () => {
    const days = addWeeks(new Date('2026-03-16'), 1)
    expect(getWeekDays(days)[0]).toBe('2026-03-23')
  })
  it('subtracts weeks with negative value', () => {
    const days = addWeeks(new Date('2026-03-16'), -1)
    expect(getWeekDays(days)[0]).toBe('2026-03-09')
  })
})
