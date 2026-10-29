// Plan dates are date-only (02-architecture §7). A LocalDate is "YYYY-MM-DD" with no time zone;
// arithmetic runs in UTC so it never shifts by a day.

export type LocalDate = string;

const LOCAL_DATE = /^(\d{4})-(\d{2})-(\d{2})$/;
const DAY_MS = 86_400_000;

function toUtc(date: LocalDate): Date {
  const m = LOCAL_DATE.exec(date);
  if (!m) throw new Error(`Not a LocalDate (YYYY-MM-DD): "${date}"`);
  const d = new Date(Date.UTC(Number(m[1]), Number(m[2]) - 1, Number(m[3])));
  if (d.toISOString().slice(0, 10) !== date) throw new Error(`Not a calendar date: "${date}"`);
  return d;
}

const fromUtc = (d: Date): LocalDate => d.toISOString().slice(0, 10);

export function assertLocalDate(date: string): LocalDate {
  toUtc(date);
  return date;
}

export function addDays(date: LocalDate, days: number): LocalDate {
  return fromUtc(new Date(toUtc(date).getTime() + days * DAY_MS));
}

/** 0 = Sunday … 6 = Saturday. */
export function weekday(date: LocalDate): number {
  return toUtc(date).getUTCDay();
}

export function yearOf(date: LocalDate): number {
  return toUtc(date).getUTCFullYear();
}

export function makeLocalDate(year: number, month: number, day: number): LocalDate {
  return fromUtc(new Date(Date.UTC(year, month - 1, day)));
}

/** The calendar date of `instant` in an IANA time zone, e.g. a deadline evaluated in Beijing or Madrid time. */
export function localDateIn(instant: Date, timeZone: string): LocalDate {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(instant);
  const get = (type: string) => parts.find((p) => p.type === type)?.value ?? '';
  return assertLocalDate(`${get('year')}-${get('month')}-${get('day')}`);
}
