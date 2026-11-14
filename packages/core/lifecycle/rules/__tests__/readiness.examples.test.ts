// R9 (domain/rules.md §9) — examples, including the boundaries (ocs-sop-rule §3).
import { describe, expect, it } from 'vitest';
import { readinessAtRisk } from '../readiness.ts';

describe('R9 readiness', () => {
  it.each([
    ['no date planned', null, [], undefined, false],
    ['8 working days, default 7', 8, [], undefined, false],
    ['7 working days, default 7', 7, [], undefined, true],
    ['confirmed in time', 3, ['readiness_confirmed'], undefined, false],
    ['template D−2: 3 days left', 3, [], 2, false],
    ['template D−2: 2 days left', 2, [], 2, true],
    ['installation day passed, never confirmed', -1, [], undefined, true],
  ] as const)('%s', (_n, days, reached, templateDays, risk) => {
    expect(readinessAtRisk({ workingDaysToInstallation: days, reached, templateDays })).toBe(risk);
  });
});
