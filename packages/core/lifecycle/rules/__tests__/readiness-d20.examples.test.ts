// R32 (domain/rules.md §32, D-47) — examples: a planned installation 20 working days away or closer (D−20, the
// project country's calendar) with readiness not confirmed → alert to the PM. Boundaries: exactly D−20 → alert;
// D−21 → none; readiness confirmed → none; no planned date → none.
import { describe, expect, it } from 'vitest';
import { readinessMissingAtD20 } from '../readiness-d20.ts';
import { readinessD20Rule } from '../readiness-d20.config.ts';

const examples = [
  { input: { workingDaysToInstallation: 20, reached: [] }, alert: true },
  { input: { workingDaysToInstallation: 21, reached: [] }, alert: false },
  { input: { workingDaysToInstallation: 5, reached: [] }, alert: true },
  { input: { workingDaysToInstallation: 20, reached: ['readiness_confirmed'] }, alert: false },
  { input: { workingDaysToInstallation: null, reached: [] }, alert: false },
  { input: { workingDaysToInstallation: -1, reached: ['installed'] }, alert: false },
] as const;

describe(`${readinessD20Rule.cite} readiness not confirmed at D−20`, () => {
  it.each(examples)(
    '$input.workingDaysToInstallation days, reached $input.reached → $alert',
    ({ input, alert }) => {
      expect(readinessMissingAtD20(input)).toBe(alert);
    },
  );
});
