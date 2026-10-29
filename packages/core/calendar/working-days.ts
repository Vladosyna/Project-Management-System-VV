// Working-day arithmetic for SOP deadlines, e.g. intake conditions ≤ 5 working days (SOP-DEL-01 §8),
// ETA within 2 working days (domain/rules.md R18). Which person's calendar applies is decided by the rule.
import { isWorkingDay, type CalendarId } from './calendars.ts';
import { addDays, type LocalDate } from './local-date.ts';

/** The date `n` working days after `start` (n ≥ 0). `start` itself is not counted. */
export function addWorkingDays(start: LocalDate, n: number, calendar: CalendarId): LocalDate {
  if (!Number.isInteger(n) || n < 0) throw new Error(`addWorkingDays needs a whole n ≥ 0, got ${String(n)}`);
  let date = start;
  let left = n;
  while (left > 0) {
    date = addDays(date, 1);
    if (isWorkingDay(date, calendar)) left--;
  }
  return date;
}

/** Working days after `from` up to and including `to`; 0 when `to` is not after `from`. */
export function workingDaysBetween(from: LocalDate, to: LocalDate, calendar: CalendarId): number {
  let count = 0;
  for (let date = addDays(from, 1); date <= to; date = addDays(date, 1)) {
    if (isWorkingDay(date, calendar)) count++;
  }
  return count;
}
