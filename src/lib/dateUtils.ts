import {
  startOfISOWeek,
  addDays,
  addWeeks as dateFnsAddWeeks,
  format,
  isToday as dateFnsIsToday,
} from 'date-fns'

/** Returns 7 ISO date strings (YYYY-MM-DD) for the week containing `date`, Mon–Sun.
 *  The date is interpreted as a calendar date (local noon) to avoid UTC-offset issues.
 */
export function getWeekDays(date: Date): string[] {
  // Re-interpret as local noon to avoid UTC midnight rolling back a day in negative-offset timezones
  const local = new Date(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate(), 12, 0, 0)
  const start = startOfISOWeek(local)
  return Array.from({ length: 7 }, (_, i) => formatISODay(addDays(start, i)))
}

/** Format a Date as YYYY-MM-DD */
export function formatISODay(date: Date): string {
  return format(date, 'yyyy-MM-dd')
}

/** Today's ISO date string */
export function todayISO(): string {
  return formatISODay(new Date())
}

export function isToday(isoDate: string): boolean {
  return dateFnsIsToday(new Date(isoDate + 'T00:00:00'))
}

/** Returns a new Date shifted by `weeks` weeks (negative = past) */
export function addWeeks(date: Date, weeks: number): Date {
  return dateFnsAddWeeks(date, weeks)
}

/** Day name abbreviation: Mon, Tue, … */
export function dayAbbr(isoDate: string): string {
  return format(new Date(isoDate + 'T00:00:00'), 'EEE')
}
