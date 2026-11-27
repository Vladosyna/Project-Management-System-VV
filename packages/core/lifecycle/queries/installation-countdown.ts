// Working days from today to a project's planned installation date, in the project country's calendar — shared by
// the Lifecycle tab (siteLifecycle) and the R9 alert run (readinessGaps) so both count the same way.
import { calendarIds, localDateIn, workingDaysBetween, type CalendarId } from '../../calendar/index.ts';

/** Assumption: a country without a working calendar yet counts like GB (Mon–Fri, GB holidays). */
const calendarOf = (country: string): CalendarId =>
  (calendarIds as readonly string[]).includes(country) ? (country as CalendarId) : 'GB';

/** 0 on the day, negative once the date has passed; null without a planned date. */
export function workingDaysToInstallation(planned: string | null, now: Date, country: string): number | null {
  if (planned === null) return null;
  const today = localDateIn(now, 'UTC');
  const calendar = calendarOf(country);
  return planned >= today
    ? workingDaysBetween(today, planned, calendar)
    : -workingDaysBetween(planned, today, calendar);
}
