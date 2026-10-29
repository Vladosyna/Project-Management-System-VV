// Working calendars (domain/rules.md: "working days use the CN/EU calendars of the people involved").
// European calendars hold nationwide public holidays only — regional holidays (e.g. Spanish autonomous
// communities, German Länder) are not included yet. Weekends are Saturday and Sunday everywhere.
import { CN_YEARS } from './data/cn.ts';
import { addDays, makeLocalDate, weekday, yearOf, type LocalDate } from './local-date.ts';

export const calendarIds = ['CN', 'ES', 'DE', 'PT', 'GB'] as const;
export type CalendarId = (typeof calendarIds)[number];

export class CalendarDataMissing extends Error {
  constructor(calendar: CalendarId, year: number) {
    super(
      `No official ${calendar} holiday data for ${String(year)} — add it in core/calendar/data before relying on it`,
    );
  }
}

/** Easter Sunday, Gregorian calendar (anonymous Gregorian algorithm). */
export function easterSunday(year: number): LocalDate {
  const a = year % 19;
  const b = Math.floor(year / 100);
  const c = year % 100;
  const d = Math.floor(b / 4);
  const e = b % 4;
  const f = Math.floor((b + 8) / 25);
  const g = Math.floor((b - f + 1) / 3);
  const h = (19 * a + b - d - g + 15) % 30;
  const i = Math.floor(c / 4);
  const k = c % 4;
  const l = (32 + 2 * e + 2 * i - h - k) % 7;
  const m = Math.floor((a + 11 * h + 22 * l) / 451);
  const month = Math.floor((h + l - 7 * m + 114) / 31);
  const day = ((h + l - 7 * m + 114) % 31) + 1;
  return makeLocalDate(year, month, day);
}

/** The n-th (1-based) given weekday of a month, or the last one when n = -1. */
function nthWeekday(year: number, month: number, dow: number, n: number): LocalDate {
  if (n > 0) {
    const first = makeLocalDate(year, month, 1);
    return addDays(first, ((dow - weekday(first) + 7) % 7) + (n - 1) * 7);
  }
  const last = addDays(makeLocalDate(year, month + 1, 1), -1);
  return addDays(last, -((weekday(last) - dow + 7) % 7));
}

const fixed = (year: number, md: readonly [number, number][]) =>
  md.map(([m, d]) => makeLocalDate(year, m, d));

function europeanHolidays(calendar: Exclude<CalendarId, 'CN'>, year: number): LocalDate[] {
  const easter = easterSunday(year);
  const fromEaster = (days: number) => addDays(easter, days);
  switch (calendar) {
    case 'ES': // fiestas nacionales common to all of Spain
      return [
        ...fixed(year, [
          [1, 1],
          [1, 6],
          [5, 1],
          [8, 15],
          [10, 12],
          [11, 1],
          [12, 6],
          [12, 8],
          [12, 25],
        ]),
        fromEaster(-2),
      ];
    case 'DE': // bundesweite Feiertage
      return [
        ...fixed(year, [
          [1, 1],
          [5, 1],
          [10, 3],
          [12, 25],
          [12, 26],
        ]),
        fromEaster(-2),
        fromEaster(1),
        fromEaster(39),
        fromEaster(50),
      ];
    case 'PT': // feriados nacionais obrigatórios
      return [
        ...fixed(year, [
          [1, 1],
          [4, 25],
          [5, 1],
          [6, 10],
          [8, 15],
          [10, 5],
          [11, 1],
          [12, 1],
          [12, 8],
          [12, 25],
        ]),
        fromEaster(-2),
        fromEaster(0),
        fromEaster(60),
      ];
    case 'GB': {
      // England & Wales bank holidays, with substitute days. One-off royal/state holidays are not computable.
      const substitute = (date: LocalDate, taken: Set<LocalDate>): LocalDate => {
        let d = date;
        while (weekday(d) === 0 || weekday(d) === 6 || taken.has(d)) d = addDays(d, 1);
        taken.add(d);
        return d;
      };
      const taken = new Set<LocalDate>();
      return [
        substitute(makeLocalDate(year, 1, 1), taken),
        fromEaster(-2),
        fromEaster(1),
        nthWeekday(year, 5, 1, 1),
        nthWeekday(year, 5, 1, -1),
        nthWeekday(year, 8, 1, -1),
        substitute(makeLocalDate(year, 12, 25), taken),
        substitute(makeLocalDate(year, 12, 26), taken),
      ];
    }
  }
}

const cache = new Map<string, { holidays: Set<LocalDate>; workingWeekendDays: Set<LocalDate> }>();

function yearData(calendar: CalendarId, year: number) {
  const key = `${calendar}:${String(year)}`;
  let data = cache.get(key);
  if (!data) {
    if (calendar === 'CN') {
      const cn = CN_YEARS[year];
      if (!cn) throw new CalendarDataMissing(calendar, year);
      data = { holidays: new Set(cn.holidays), workingWeekendDays: new Set(cn.workingWeekendDays) };
    } else {
      data = { holidays: new Set(europeanHolidays(calendar, year)), workingWeekendDays: new Set() };
    }
    cache.set(key, data);
  }
  return data;
}

export function isHoliday(date: LocalDate, calendar: CalendarId): boolean {
  return yearData(calendar, yearOf(date)).holidays.has(date);
}

export function isWorkingDay(date: LocalDate, calendar: CalendarId): boolean {
  const data = yearData(calendar, yearOf(date));
  if (data.workingWeekendDays.has(date)) return true;
  const dow = weekday(date);
  return dow !== 0 && dow !== 6 && !data.holidays.has(date);
}
