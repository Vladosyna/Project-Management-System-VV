// SOP-DEL-02 §3 — examples: parts → Project ID or refusal, with the boundaries (running number 1, 999 and
// 1000; two- and three-letter codes; lower case is not accepted here — the command upper-cases first).
import { describe, expect, it } from 'vitest';
import { projectIdOf } from '../project-id.ts';
import { projectIdRule } from '../project-id.config.ts';

const base = { shortCode: 'CLIENTA', countryCode: 'ES', cityCode: 'MAD', runningNo: 1 };
const examples = [
  { parts: base, expected: 'CLIENTA-ES-MAD-001' },
  { parts: { ...base, runningNo: 42 }, expected: 'CLIENTA-ES-MAD-042' },
  { parts: { ...base, runningNo: 999 }, expected: 'CLIENTA-ES-MAD-999' },
  {
    parts: { ...base, shortCode: 'CLIENTC', countryCode: 'PT', cityCode: 'LIS' },
    expected: 'CLIENTC-PT-LIS-001',
  },
  { parts: { ...base, runningNo: 1000 }, expected: 'blocked' },
  { parts: { ...base, runningNo: 0 }, expected: 'blocked' },
  { parts: { ...base, countryCode: 'ESP' }, expected: 'blocked' },
  { parts: { ...base, countryCode: 'es' }, expected: 'blocked' },
  { parts: { ...base, cityCode: 'MA' }, expected: 'blocked' },
  { parts: { ...base, cityCode: 'MA1' }, expected: 'blocked' },
] as const;

describe(`${projectIdRule.cite} Project ID`, () => {
  it.each(examples)('$parts → $expected', ({ parts, expected }) => {
    if (expected === 'blocked') {
      expect(() => projectIdOf(parts)).toThrow(expect.objectContaining({ clause: 'SOP-DEL-02 §3' }) as Error);
    } else {
      expect(projectIdOf(parts)).toBe(expected);
    }
  });
});
