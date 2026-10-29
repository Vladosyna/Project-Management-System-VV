import { describe, expect, it } from 'vitest';
import {
  addWorkingDays,
  CalendarDataMissing,
  easterSunday,
  isHoliday,
  isWorkingDay,
  localDateIn,
  workingDaysBetween,
  type CalendarId,
} from '../index.ts';

describe('China (State Council notice for 2026)', () => {
  it('make-up Saturday 14 Feb 2026 is a working day; Spring Festival Monday 16 Feb is not', () => {
    expect(isWorkingDay('2026-02-14', 'CN')).toBe(true);
    expect(isWorkingDay('2026-02-16', 'CN')).toBe(false);
  });

  it('counts a 5-working-day intake condition across National Day and the make-up Saturday (SOP-DEL-01 §8)', () => {
    // 30 Sep → Oct 1–7 off → 8 Thu, 9 Fri, 10 Sat (make-up), 12 Mon, 13 Tue.
    expect(addWorkingDays('2026-09-30', 5, 'CN')).toBe('2026-10-13');
  });

  it('refuses to compute a year without official data instead of guessing (2027 not yet published)', () => {
    expect(() => isWorkingDay('2027-02-08', 'CN')).toThrow(CalendarDataMissing);
  });
});

describe('Europe — nationwide public holidays', () => {
  it.each([
    [2025, '2025-04-20'],
    [2026, '2026-04-05'],
    [2027, '2027-03-28'],
  ])('Easter Sunday %i is %s', (year, date) => {
    expect(easterSunday(year)).toBe(date);
  });

  const holidays: [CalendarId, string, string][] = [
    ['ES', '2026-04-03', 'Good Friday'],
    ['ES', '2026-10-12', 'Fiesta Nacional'],
    ['DE', '2026-05-14', 'Ascension'],
    ['DE', '2026-05-25', 'Whit Monday'],
    ['PT', '2026-06-04', 'Corpus Christi'],
    ['PT', '2026-04-25', 'Freedom Day'],
    ['GB', '2026-08-31', 'Summer bank holiday'],
    ['GB', '2026-12-28', 'Boxing Day substitute (26 Dec is a Saturday)'],
    ['GB', '2027-12-27', 'Christmas substitute (25 Dec is a Saturday)'],
    ['GB', '2027-12-28', 'Boxing Day substitute (26 Dec is a Sunday)'],
  ];
  it.each(holidays)('%s %s is a holiday (%s)', (calendar, date) => {
    expect(isHoliday(date, calendar)).toBe(true);
    expect(isWorkingDay(date, calendar)).toBe(false);
  });

  it('Easter Monday is a working day in Spain (not a national holiday) but not in Germany', () => {
    expect(isWorkingDay('2026-04-06', 'ES')).toBe(true);
    expect(isWorkingDay('2026-04-06', 'DE')).toBe(false);
  });

  it('weekends are never working days in Europe', () => {
    expect(isWorkingDay('2026-11-07', 'ES')).toBe(false);
    expect(isWorkingDay('2026-11-08', 'GB')).toBe(false);
  });
});

describe('working-day arithmetic', () => {
  it('2 working days after Friday 13 Feb 2026 in China land on Tuesday 24 Feb (Sat 14 counts, festival does not)', () => {
    expect(addWorkingDays('2026-02-13', 2, 'CN')).toBe('2026-02-24');
  });

  it('counts working days after `from` up to and including `to`', () => {
    // Spain, 1–7 Apr 2026: Thu 2 ✓, Fri 3 Good Friday ✗, Mon 6 ✓, Tue 7 ✓.
    expect(workingDaysBetween('2026-04-01', '2026-04-07', 'ES')).toBe(3);
    expect(workingDaysBetween('2026-04-07', '2026-04-01', 'ES')).toBe(0);
  });

  it('adding zero working days returns the start date', () => {
    expect(addWorkingDays('2026-11-07', 0, 'DE')).toBe('2026-11-07');
  });

  it('rejects malformed dates', () => {
    expect(() => isWorkingDay('2026-02-30', 'ES')).toThrow(/Not a calendar date/);
    expect(() => addWorkingDays('2026-11-02', -1, 'ES')).toThrow();
  });
});

describe('localDateIn', () => {
  it('gives the calendar date in the person’s time zone', () => {
    const instant = new Date('2026-11-02T17:30:00Z');
    expect(localDateIn(instant, 'Asia/Shanghai')).toBe('2026-11-03');
    expect(localDateIn(instant, 'Europe/Madrid')).toBe('2026-11-02');
  });
});
