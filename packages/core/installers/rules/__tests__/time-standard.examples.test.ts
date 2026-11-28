// R29 (domain/rules.md §29) — examples: input → expected decision, with the boundary (hours equal to the time standard
// are compliant) — ocs-sop-rule §3. Time standard: partial N + 2 h, full 2N + 2 h.
import { describe, expect, it } from 'vitest';
import { hoursOverStandard } from '../time-standard.ts';
import { timeStandardRule } from '../time-standard.config.ts';

const hours = (quantity: number) => ({ kind: 'hour', quantity });
const examples = [
  {
    name: 'full, 4 sensors: 10 h is the standard (boundary)',
    scope: 'full',
    n: 4,
    lines: [hours(10)],
    over: false,
  },
  { name: 'full, 4 sensors: 10.5 h is above', scope: 'full', n: 4, lines: [hours(10.5)], over: true },
  { name: 'partial, 4 sensors: 6 h is the standard', scope: 'partial', n: 4, lines: [hours(6)], over: false },
  { name: 'partial, 4 sensors: 8 h is above', scope: 'partial', n: 4, lines: [hours(8)], over: true },
  { name: 'hour lines add up', scope: 'partial', n: 4, lines: [hours(4), hours(3)], over: true },
  {
    name: 'per-unit, travel and extras are not hours',
    scope: 'partial',
    n: 1,
    lines: [
      { kind: 'unit', quantity: 50 },
      { kind: 'travel', quantity: 9 },
      { kind: 'extra', quantity: 9 },
    ],
    over: false,
  },
] as const;

describe(`${timeStandardRule.cite} quote above the time standard`, () => {
  it.each(examples)('$name → over $over', ({ scope, n, lines, over }) => {
    expect(hoursOverStandard({ scope, sensorCount: n, lines }).over).toBe(over);
  });

  it('reports quoted and standard hours', () => {
    expect(hoursOverStandard({ scope: 'full', sensorCount: 4, lines: [hours(12)] })).toEqual({
      quoted: 12,
      standard: 10,
      over: true,
    });
  });

  it('is P1, checked while the job is being quoted', () => {
    expect(timeStandardRule).toMatchObject({ checkWhile: ['planned', 'quoting'], level: 'P1' });
  });
});
