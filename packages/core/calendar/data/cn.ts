// Mainland China public holidays and make-up working days (调休上班). Not computable: the State Council
// publishes them each year, usually in November for the following year. Add a year only from the
// official notice and cite it. A date in a year missing here makes the calendar throw — never guess.
import type { LocalDate } from '../local-date.ts';

export interface CnYear {
  readonly source: string;
  readonly holidays: readonly LocalDate[];
  readonly workingWeekendDays: readonly LocalDate[];
}

function range(from: LocalDate, toDay: number): LocalDate[] {
  const prefix = from.slice(0, 8);
  const start = Number(from.slice(8));
  return Array.from(
    { length: toDay - start + 1 },
    (_, i) => `${prefix}${String(start + i).padStart(2, '0')}`,
  );
}

export const CN_YEARS: Readonly<Record<number, CnYear>> = {
  2026: {
    source:
      '国务院办公厅关于2026年部分节假日安排的通知 (published 4 Nov 2025, Xinhua: https://www.news.cn/politics/20251104/88bcffd88ae249e58c699b8772548e3d/c.html)',
    holidays: [
      ...range('2026-01-01', 3), // 元旦
      ...range('2026-02-15', 23), // 春节
      ...range('2026-04-04', 6), // 清明节
      ...range('2026-05-01', 5), // 劳动节
      ...range('2026-06-19', 21), // 端午节
      ...range('2026-09-25', 27), // 中秋节
      ...range('2026-10-01', 7), // 国庆节
    ],
    workingWeekendDays: ['2026-01-04', '2026-02-14', '2026-02-28', '2026-05-09', '2026-09-20', '2026-10-10'],
  },
  // 2027: not yet published as of 29 Oct 2026. Add from the official notice when it appears.
};
