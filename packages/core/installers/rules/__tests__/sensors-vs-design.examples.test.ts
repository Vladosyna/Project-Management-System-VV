// R12 (domain/rules.md §12, P0) — examples: an open installer job whose sensor count differs from the store's current
// design (the active proposal, D-43; sensors as in the time standard, CBox not counted, D-42).
import { describe, expect, it } from 'vitest';
import { sensorsDiffer } from '../sensors-vs-design.ts';
import { sensorsVsDesignRule } from '../sensors-vs-design.config.ts';

const examples = [
  { input: { status: 'quoting', jobSensors: 12, designSensors: 12 }, flagged: false },
  { input: { status: 'quoting', jobSensors: 12, designSensors: 13 }, flagged: true },
  { input: { status: 'scheduled', jobSensors: 14, designSensors: 12 }, flagged: true },
  { input: { status: 'quoting', jobSensors: 12, designSensors: null }, flagged: false },
  { input: { status: 'done', jobSensors: 12, designSensors: 13 }, flagged: false },
  { input: { status: 'cancelled', jobSensors: 12, designSensors: 13 }, flagged: false },
] as const;

describe(`${sensorsVsDesignRule.cite} quote ≠ design`, () => {
  it.each(examples)(
    '$input.status, job $input.jobSensors vs design $input.designSensors → $flagged',
    ({ input, flagged }) => {
      expect(sensorsDiffer(input)).toBe(flagged);
    },
  );
});
