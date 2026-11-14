// SOP-DEL-04 §1, E3 AC1/AC4 — examples (ocs-sop-rule §3).
import { describe, expect, it } from 'vitest';
import { RuleViolation } from '../../../kernel/index.ts';
import { checkInstallationPlan, checkStep } from '../installation-plan.ts';

describe('SOP-DEL-04 §1 installation date', () => {
  it.each([
    ['card complete → allowed', ['card_received', 'card_complete'], true],
    ['card only received → refused', ['card_received'], false],
    ['nothing yet → refused', [], false],
  ] as const)('%s', (_n, reached, ok) => {
    const run = () => {
      checkInstallationPlan({ reached });
    };
    if (ok) expect(run).not.toThrow();
    else expect(run).toThrow(RuleViolation);
  });
});

describe('E3 AC1/AC4 steps', () => {
  const all = ['card_received', 'card_complete', 'readiness_confirmed', 'go_no_go', 'installed'];
  it.each([
    ['first step', 'card_received', [], 'S', null, true],
    ['skips card complete', 'readiness_confirmed', ['card_received'], 'S', null, false],
    ['a gate is free-standing', 'g2', [], 'L', null, true],
    ['accepted with the form (S)', 'accepted', all, 'S', '02/Installation Acceptance Form.pdf', true],
    ['accepted without evidence', 'accepted', all, 'L', null, false],
  ] as const)('%s', (_n, step, reached, standard, evidence, ok) => {
    const run = () => {
      checkStep({ step, reached, standard, evidence });
    };
    if (ok) expect(run).not.toThrow();
    else expect(run).toThrow(RuleViolation);
  });
});
